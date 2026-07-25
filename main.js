const { Plugin, Notice } = require('obsidian');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const LOG = '/tmp/skim_plugin_debug.log';
function dlog(msg) {
  try { fs.appendFileSync(LOG, new Date().toISOString() + ' ' + msg + '\n'); } catch(e) {}
}
dlog('=== MODULE LOADED ===');

module.exports = class SkimHighlightsPlugin extends Plugin {
  async onload() {
    dlog('ONLOAD_START');
    
    // Ribbon icon (always visible, clickable)
    this.addRibbonIcon('highlighter', 'Import Skim highlights', () => {
      dlog('RIBBON_CLICKED');
      this.importHighlights();
    });
    dlog('RIBBON_ADDED');
    
    // Status bar item
    this.statusBarItem = this.addStatusBarItem();
    this.statusBarItem.setText('Skim');
    this.statusBarItem.onClickEvent(() => {
      dlog('STATUSBAR_CLICKED');
      this.importHighlights();
    });
    dlog('STATUSBAR_ADDED');

    // Command palette command  
    this.addCommand({
      id: 'import-skim-highlights',
      name: 'Import Skim highlights',
      hotkeys: [{ modifiers: ['Mod', 'Alt', 'Shift'], key: 'K' }],
      callback: () => {
        dlog('COMMAND_CALLED');
        this.importHighlights();
      }
    });
    dlog('COMMAND_REGISTERED');
    
    new Notice('Skim Highlights ready', 2000);
    dlog('ONLOAD_DONE');
  }

  onunload() { dlog('UNLOAD'); }

  importHighlights() {
    dlog('IMPORT_START');
    new Notice('Reading Skim...');

    // Build AppleScript
    var script = '';
    script += 'tell application "Skim"\n';
    script += '  if (count of documents) is 0 then\n';
    script += '    return "ERROR:NO_DOCUMENT"\n';
    script += '  end if\n';
    script += '  set theDoc to front document\n';
    script += '  set docPath to path of theDoc\n';
    script += '  set docName to name of theDoc\n';
    script += '  set theNotes to notes of theDoc\n';
    script += '  set output to "PATH:" & docPath & "|NAME:" & docName\n';
    script += '  repeat with i from 1 to count of theNotes\n';
    script += '    set theNote to item i of theNotes\n';
    script += '    set noteType to type of theNote as string\n';
    script += '    if noteType contains "highlight" or noteType contains "underline" then\n';
    script += '      set noteText to text of theNote as string\n';
    script += '      set notePage to index of page of theNote as string\n';
    script += '      set output to output & "||NOTE|TYPE:" & noteType & "|PAGE:" & notePage & "|TEXT:" & noteText\n';
    script += '    end if\n';
    script += '  end repeat\n';
    script += '  return output\n';
    script += 'end tell\n';

    var tmpFile = path.join(os.tmpdir(), 'skim_obsidian_export.scpt');
    
    try {
      fs.writeFileSync(tmpFile, script, 'utf8');
      dlog('SCRIPT_WRITTEN');
    } catch(e) {
      dlog('WRITE_ERROR: ' + e.message);
      new Notice('Error: ' + e.message);
      return;
    }

    var raw = '';
    try {
      dlog('EXEC_OSASCRIPT');
      raw = execSync('osascript "' + tmpFile + '"', {
        encoding: 'utf8',
        timeout: 20000,
        maxBuffer: 50 * 1024 * 1024
      });
      raw = raw.trim();
      dlog('OSASCRIPT_OK, len=' + raw.length);
    } catch(e) {
      dlog('OSASCRIPT_FAIL: ' + e.message);
      try { fs.unlinkSync(tmpFile); } catch(_) {}
      new Notice('Skim error: ' + e.message);
      return;
    }

    try { fs.unlinkSync(tmpFile); } catch(_) {}

    if (!raw || raw.startsWith('ERROR:')) {
      var err = raw || 'no output';
      dlog('EMPTY_OR_ERROR: ' + err);
      new Notice(err.includes('NO_DOCUMENT') ? 'No PDF open in Skim' : 'Error: ' + err);
      return;
    }

    // Parse
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

    dlog('PARSED: ' + highlights.length + ' highlights');

    if (highlights.length === 0) {
      new Notice('No highlights found');
      return;
    }

    // Generate markdown
    var pdfPath = headerKV.PATH || '';
    var pdfName = headerKV.NAME || 'Unknown';
    var today = new Date().toISOString().slice(0, 10);

    // URL-encode path so Obsidian renders skim:// link correctly
    var encodedPath = encodeURI(pdfPath);
    // Short display name (filename only, max 20 chars)
    var shortName = pdfName.replace(/\.pdf$/i, '');
    if (shortName.length > 20) shortName = shortName.substring(0, 18) + '..';

    var lines = [];

    lines.push('---');
    lines.push('pdf: "' + pdfPath + '"');
    lines.push('source: Skim');
    lines.push('created: ' + today);
    lines.push('---');
    lines.push('');
    lines.push('# ' + pdfName.replace(/\.pdf$/i, ''));
    lines.push('');
    lines.push('> [!info] PDF 信息');
    lines.push('> 文件: ' + pdfName);
    lines.push('> 高亮数: ' + highlights.length);
    lines.push('> [📖 全文](skim://' + encodedPath + '?page=1)');
    lines.push('');
    lines.push('---');
    lines.push('');

    var groups = {};
    highlights.forEach(function(h) {
      if (!groups[h.page]) groups[h.page] = [];
      groups[h.page].push(h);
    });

    Object.keys(groups).sort(function(a,b){return a-b;}).forEach(function(pg) {
      lines.push('## 📍 第 ' + pg + ' 页');
      lines.push('');
      groups[pg].forEach(function(h) {
        lines.push('> [!quote]+ 第 ' + h.page + ' 页 · ' + today);
        lines.push('> ' + h.text);
        lines.push('> ');
        lines.push('> 📖 [p' + h.page + '](skim://' + encodedPath + '?page=' + h.page + ')');
        lines.push('');
      });
    });

    var content = lines.join('\n');

    var self = this;
    var folderPath = 'Skim Highlights';
    var noteName = pdfName.replace(/\.pdf$/i, '') + ' - 高亮笔记.md';
    var fullPath = folderPath + '/' + noteName;

    (async function() {
      try {
        var folder = self.app.vault.getAbstractFileByPath(folderPath);
        if (!folder) {
          folder = await self.app.vault.createFolder(folderPath);
        }
        var existing = self.app.vault.getAbstractFileByPath(fullPath);
        if (existing) {
          await self.app.vault.modify(existing, content);
        } else {
          await self.app.vault.create(fullPath, content);
        }
        dlog('SAVED_OK');
        new Notice('Saved: ' + noteName + ' (' + highlights.length + ' highlights)');

        var file = self.app.vault.getAbstractFileByPath(fullPath);
        if (file) {
          await self.app.workspace.getLeaf(false).openFile(file);
        }
      } catch(e) {
        dlog('SAVE_ERROR: ' + e.message);
        new Notice('Save error: ' + e.message);
      }
    })();
  }
};
