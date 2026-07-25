const { Plugin, Notice, FuzzySuggestModal } = require('obsidian');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const LOG = '/tmp/skim_plugin_debug.log';
function dlog(msg) {
  try { fs.appendFileSync(LOG, new Date().toISOString() + ' ' + msg + '\n'); } catch(e) {}
}

// ========== Highlight selection modal ==========
class HighlightModal extends FuzzySuggestModal {
  constructor(app, highlights, linkDir) {
    super(app);
    this.highlights = highlights;
    this.linkDir = linkDir;
    this.setPlaceholder('搜索高亮内容，回车复制到剪贴板...');
  }

  getItems() { return this.highlights; }

  getItemText(h) {
    // Show: "[p187] First 60 chars of text..."
    var t = h.text.length > 60 ? h.text.substring(0, 60) + '...' : h.text;
    return '[p' + h.page + '] ' + t;
  }

  onChooseItem(h) {
    var card = buildCard(h, this.linkDir);
    copyToClipboard(card);
    new Notice('📋 p' + h.page + ' 卡片已复制到剪贴板');
  }
}

// ========== Card builder ==========
function buildCard(h, linkDir) {
  var linkPath = path.join(linkDir, 'p' + h.page + '.command');
  return '> [!quote]+ 第 ' + h.page + ' 页\n' +
    '> ' + h.text + '\n' +
    '> \n' +
    '> 📖 [p' + h.page + '](file://' + linkPath + ')';
}

// ========== Clipboard (macOS pbcopy) ==========
function copyToClipboard(text) {
  try {
    execSync('pbcopy', { input: text, timeout: 3000 });
    return true;
  } catch(e) {
    dlog('CLIPBOARD_FAIL: ' + e.message);
    return false;
  }
}

// ========== AppleScript runner ==========
function runAppleScript(scriptContent) {
  var tmpFile = path.join(os.tmpdir(), 'skim_obsidian_export.scpt');
  fs.writeFileSync(tmpFile, scriptContent, 'utf8');
  try {
    var result = execSync('osascript "' + tmpFile + '"', {
      encoding: 'utf8', timeout: 15000, maxBuffer: 50 * 1024 * 1024
    });
    return result.trim();
  } finally {
    try { fs.unlinkSync(tmpFile); } catch(_) {}
  }
}

// ========== Parser ==========
function parseSkimOutput(raw) {
  if (!raw || raw.startsWith('ERROR:')) {
    return { error: raw || 'empty', highlights: [] };
  }
  var segments = raw.split('||NOTE|');
  var headerKV = {};
  segments[0].split('|').forEach(function(kv) {
    var ci = kv.indexOf(':');
    if (ci > 0) headerKV[kv.slice(0, ci).trim()] = kv.slice(ci + 1).trim();
  });

  var highlights = [];
  for (var i = 1; i < segments.length; i++) {
    var f = {};
    segments[i].split('|').forEach(function(kv) {
      var ci = kv.indexOf(':');
      if (ci > 0) f[kv.slice(0, ci).trim()] = kv.slice(ci + 1).trim();
    });
    if (f.TEXT && f.PAGE) {
      highlights.push({ text: f.TEXT, page: parseInt(f.PAGE), type: f.TYPE || 'highlight' });
    }
  }
  return { pdfPath: headerKV.PATH || '', pdfName: headerKV.NAME || '', highlights: highlights };
}

// ========== .command file generator ==========
function createLinkFiles(pdfPath, pages) {
  var linkDir = path.join(os.tmpdir(), 'skim_links');
  try { fs.mkdirSync(linkDir, { recursive: true }); } catch(_) {}

  var encodedPath = encodeURI(pdfPath);
  fs.writeFileSync(path.join(linkDir, '.pdfpath'), encodedPath, 'utf8');

  // Write _goto.py (only once)
  var gotoPy = '#!/usr/bin/env python3\n' +
    'import sys, os, urllib.parse, subprocess\n' +
    'page = sys.argv[1]\n' +
    'with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".pdfpath")) as f:\n' +
    '    filepath = urllib.parse.unquote(f.read().strip())\n' +
    'asc = "tell application \\\"Skim\\\"\\n" + \\\n' +
    '  "  repeat with d in documents\\n" + \\\n' +
    '  "    if (path of d) is \\\"" + filepath + "\\\" then\\n" + \\\n' +
    '  "      tell d to go to page " + page + "\\n" + \\\n' +
    '  "      activate\\n" + \\\n' +
    '  "      exit repeat\\n" + \\\n' +
    '  "    end if\\n" + \\\n' +
    '  "  end repeat\\n" + \\\n' +
    '  "end tell"\n' +
    'with open("/tmp/_skim_goto.scpt", "w") as f: f.write(asc)\n' +
    'subprocess.Popen(["osascript", "/tmp/_skim_goto.scpt"])\n';
  fs.writeFileSync(path.join(linkDir, '_goto.py'), gotoPy, 'utf8');
  fs.chmodSync(path.join(linkDir, '_goto.py'), '755');

  var tmpl = '#!/bin/bash\nPAGE=$(basename "$0" .command | sed "s/^p//")\npython3 "$(dirname "$0")/_goto.py" "$PAGE"\n';
  fs.writeFileSync(path.join(linkDir, '_template.command'), tmpl, 'utf8');
  fs.chmodSync(path.join(linkDir, '_template.command'), '755');

  pages.forEach(function(pg) {
    var tgt = path.join(linkDir, 'p' + pg + '.command');
    try {
      fs.copyFileSync(path.join(linkDir, '_template.command'), tgt);
      fs.chmodSync(tgt, '755');
    } catch(e) { dlog('CMD_FAIL: ' + e.message); }
  });

  return linkDir;
}

// ========== AppleScript ==========
var SKIM_SCRIPT = '';
SKIM_SCRIPT += 'tell application "Skim"\n';
SKIM_SCRIPT += '  if (count of documents) is 0 then\n';
SKIM_SCRIPT += '    return "ERROR:NO_DOCUMENT"\n';
SKIM_SCRIPT += '  end if\n';
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

// ========== Plugin ==========
module.exports = class SkimHighlightsPlugin extends Plugin {
  async onload() {
    dlog('PLUGIN_LOADED');

    this.addRibbonIcon('highlighter', 'Skim 高亮 → 剪贴板', () => this.pickHighlight());
    this.addStatusBarItem().setText('Skim');

    this.addCommand({
      id: 'pick-skim-highlight',
      name: 'Skim 高亮 → 选择复制到剪贴板',
      hotkeys: [{ modifiers: ['Mod', 'Alt', 'Shift'], key: 'K' }],
      callback: () => this.pickHighlight()
    });

    this.addCommand({
      id: 'copy-all-skim-highlights',
      name: 'Skim 高亮 → 全部复制到剪贴板',
      callback: () => this.copyAllHighlights()
    });
  }

  onunload() { dlog('UNLOAD'); }

  /** Read highlights from Skim, return {pdfPath, highlights, linkDir} */
  readSkim() {
    var raw = runAppleScript(SKIM_SCRIPT);
    var parsed = parseSkimOutput(raw);

    if (parsed.error) {
      new Notice(parsed.error.includes('NO_DOCUMENT') ? 'Skim 中没有打开的 PDF' : '读取失败');
      return null;
    }
    if (parsed.highlights.length === 0) {
      new Notice('当前 PDF 没有高亮标注');
      return null;
    }

    // Get unique pages and create link files
    var pages = [];
    var seen = {};
    parsed.highlights.forEach(function(h) {
      if (!seen[h.page]) { seen[h.page] = true; pages.push(h.page); }
    });

    var linkDir = createLinkFiles(parsed.pdfPath, pages);
    dlog('READ: ' + parsed.highlights.length + ' highlights, ' + pages.length + ' pages');

    return { pdfPath: parsed.pdfPath, pdfName: parsed.pdfName, highlights: parsed.highlights, linkDir: linkDir };
  }

  /** Show modal to pick one highlight */
  pickHighlight() {
    new Notice('正在读取 Skim...');
    var data = this.readSkim();
    if (!data) return;

    new HighlightModal(this.app, data.highlights, data.linkDir).open();
  }

  /** Copy all highlights at once */
  copyAllHighlights() {
    new Notice('正在读取 Skim...');
    var data = this.readSkim();
    if (!data) return;

    var cards = data.highlights.map(function(h) {
      return buildCard(h, data.linkDir);
    });

    var all = cards.join('\n\n---\n\n');
    if (copyToClipboard(all)) {
      new Notice('📋 已复制 ' + data.highlights.length + ' 张卡片 (' + data.pdfName + ')');
    } else {
      new Notice('❌ 剪贴板写入失败');
    }
  }
};
