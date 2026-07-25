const { Plugin, Notice } = require('obsidian');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const LINK_DIR = '/tmp/skim_links';
const STATE_FILE = path.join(os.homedir(), '.skim_watch_state.json');

// ========== AppleScript ==========
var SKIM_SCRIPT = '';
SKIM_SCRIPT += 'tell application "Skim"\n';
SKIM_SCRIPT += '  if (count of documents) is 0 then return "{}"\n';
SKIM_SCRIPT += '  set theDoc to front document\n';
SKIM_SCRIPT += '  set docPath to path of theDoc\n';
SKIM_SCRIPT += '  set docName to name of theDoc\n';
SKIM_SCRIPT += '  set theNotes to notes of theDoc\n';
SKIM_SCRIPT += '  set output to "PATH:" & docPath & "|NAME:" & docName\n';
SKIM_SCRIPT += '  repeat with i from 1 to count of theNotes\n';
SKIM_SCRIPT += '    set theNote to item i of theNotes\n';
SKIM_SCRIPT += '    set noteType to type of theNote as string\n';
SKIM_SCRIPT += '    if noteType contains "highlight" or noteType contains "underline" then\n';
SKIM_SCRIPT += '      set noteText to text of theNote as string\n';
SKIM_SCRIPT += '      set notePage to index of page of theNote as string\n';
SKIM_SCRIPT += '      set output to output & "||NOTE|TYPE:" & noteType & "|PAGE:" & notePage & "|TEXT:" & noteText\n';
SKIM_SCRIPT += '    end if\n';
SKIM_SCRIPT += '  end repeat\n';
SKIM_SCRIPT += '  return output\n';
SKIM_SCRIPT += 'end tell\n';

module.exports = class SkimHighlightsPlugin extends Plugin {
  async onload() {
    console.log('[SkimWatch] Plugin loaded');

    this.watching = true;
    this.state = this.loadState();
    this.interval = null;

    // Ribbon + commands
    this.addRibbonIcon('highlighter', 'Skim 高亮监听', () => this.toggle());
    this.addStatusBarItem().setText('🟢 Skim监听');

    this.addCommand({
      id: 'toggle-skim-watch',
      name: 'Skim 高亮监听: 启停',
      callback: () => this.toggle()
    });

    // Start polling
    this.startPolling();
  }

  onunload() {
    this.watching = false;
    if (this.interval) clearInterval(this.interval);
    console.log('[SkimWatch] Plugin unloaded');
  }

  // ========== Polling ==========
  startPolling() {
    this.interval = setInterval(() => {
      if (!this.watching) return;
      this.poll();
    }, 1500);
  }

  poll() {
    try {
      // Run AppleScript
      var tmpFile = path.join(os.tmpdir(), '_skim_poll.scpt');
      fs.writeFileSync(tmpFile, SKIM_SCRIPT, 'utf8');
      var raw = execSync('osascript "' + tmpFile + '"', {
        encoding: 'utf8', timeout: 8000, maxBuffer: 10 * 1024 * 1024
      }).trim();
      try { fs.unlinkSync(tmpFile); } catch(_) {}

      if (!raw || raw === '{}' || raw.startsWith('ERROR:')) return;

      // Parse
      var parts = raw.split('||NOTE|');
      var headerKV = {};
      parts[0].split('|').forEach(function(kv) {
        var ci = kv.indexOf(':');
        if (ci > 0) headerKV[kv.slice(0, ci).trim()] = kv.slice(ci + 1).trim();
      });

      var pdfPath = headerKV.PATH || '';
      var highlights = [];

      for (var i = 1; i < parts.length; i++) {
        var f = {};
        parts[i].split('|').forEach(function(kv) {
          var ci = kv.indexOf(':');
          if (ci > 0) f[kv.slice(0, ci).trim()] = kv.slice(ci + 1).trim();
        });
        if (f.TEXT && f.PAGE) {
          highlights.push({ text: f.TEXT, page: parseInt(f.PAGE) });
        }
      }

      if (!pdfPath || highlights.length === 0) return;

      // Check for new highlights
      if (!this.state[pdfPath]) this.state[pdfPath] = [];
      var seen = this.state[pdfPath];

      var newHighlights = [];
      var pages = [];
      var pageSet = {};

      highlights.forEach(function(h) {
        var id = h.page + '|' + h.text.substring(0, 60);
        if (seen.indexOf(id) === -1) {
          newHighlights.push(h);
          seen.push(id);
        }
        if (!pageSet[h.page]) { pageSet[h.page] = true; pages.push(h.page); }
      });

      // Save state
      this.state[pdfPath] = seen;
      this.saveState();

      if (newHighlights.length === 0) return;

      // Create link files
      this.ensureLinks(pdfPath, pages);

      // Copy cards to clipboard
      var cards = newHighlights.map((function(h) {
        return '> [!quote]+ 第 ' + h.page + ' 页\n' +
          '> ' + h.text + '\n' +
          '> \n' +
          '> 📖 [p' + h.page + '](file://' + LINK_DIR + '/p' + h.page + '.command)';
      }).bind(this));

      var text = cards.join('\n\n');
      execSync('pbcopy', { input: text, timeout: 2000 });

      console.log('[SkimWatch] Copied ' + newHighlights.length + ' new highlight(s)');
      new Notice('📋 ' + newHighlights.length + ' 张新卡片已复制到剪贴板');

    } catch(e) {
      // Silently skip errors (Skim might be closed, PDF not open, etc.)
    }
  }

  // ========== Link files ==========
  ensureLinks(pdfPath, pages) {
    try { fs.mkdirSync(LINK_DIR, { recursive: true }); } catch(_) {}

    var encoded = encodeURI(pdfPath);
    fs.writeFileSync(path.join(LINK_DIR, '.pdfpath'), encoded, 'utf8');

    var gotoPy = '#!/usr/bin/env python3\n' +
      'import sys, os, urllib.parse, subprocess\n' +
      'page = sys.argv[1]\n' +
      'with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".pdfpath")) as f:\n' +
      '    filepath = urllib.parse.unquote(f.read().strip())\n' +
      'asc = "tell application \\\"Skim\\\"\\n" + \\\n' +
      '  "  set found to false\\n" + \\\n' +
      '  "  repeat with d in documents\\n" + \\\n' +
      '  "    if (path of d) is \\\"" + filepath + "\\\" then\\n" + \\\n' +
      '  "      set found to true\\n" + \\\n' +
      '  "      tell d to go to page " + page + "\\n" + \\\n' +
      '  "      exit repeat\\n" + \\\n' +
      '  "    end if\\n" + \\\n' +
      '  "  end repeat\\n" + \\\n' +
      '  "  if not found then\\n" + \\\n' +
      '  "    open \\\"" + filepath + "\\\"\\n" + \\\n' +
      '  "    delay 0.3\\n" + \\\n' +
      '  "    tell front document to go to page " + page + "\\n" + \\\n' +
      '  "  end if\\n" + \\\n' +
      '  "  activate\\n" + \\\n' +
      '  "end tell"\n' +
      'with open("/tmp/_skim_goto.scpt", "w") as f: f.write(asc)\n' +
      'subprocess.Popen(["osascript", "/tmp/_skim_goto.scpt"])\n';
    fs.writeFileSync(path.join(LINK_DIR, '_goto.py'), gotoPy, 'utf8');
    fs.chmodSync(path.join(LINK_DIR, '_goto.py'), '755');

    var tmpl = '#!/bin/bash\nPAGE=$(basename "$0" .command | sed "s/^p//")\npython3 "$(dirname "$0")/_goto.py" "$PAGE"\n';
    fs.writeFileSync(path.join(LINK_DIR, '_template.command'), tmpl, 'utf8');
    fs.chmodSync(path.join(LINK_DIR, '_template.command'), '755');

    pages.forEach(function(pg) {
      var tgt = path.join(LINK_DIR, 'p' + pg + '.command');
      if (!fs.existsSync(tgt)) {
        fs.copyFileSync(path.join(LINK_DIR, '_template.command'), tgt);
        fs.chmodSync(tgt, '755');
      }
    });
  }

  // ========== State persistence ==========
  loadState() {
    try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
    catch(e) { return {}; }
  }

  saveState() {
    try { fs.writeFileSync(STATE_FILE, JSON.stringify(this.state), 'utf8'); }
    catch(e) {}
  }

  // ========== Toggle ==========
  toggle() {
    this.watching = !this.watching;
    var s = this.watching ? '🟢 Skim监听' : '⚫ Skim监听';
    this.addStatusBarItem().setText(s);
    new Notice(s);
  }
};
