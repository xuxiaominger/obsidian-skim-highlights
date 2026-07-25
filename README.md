# Skim Highlights

**Highlight in Skim → auto-copied to clipboard → paste anywhere in your notes. Zero clicks.**

## How It Works

The plugin polls Skim from within your note-taking app every 1.5 seconds, detecting new highlights. When you highlight text in Skim:

1. A markdown card is auto-copied to your clipboard
2. Paste with `Cmd+V` into any note
3. Click the `📖 pXX` link to jump back to the exact PDF page

## Card Format

```markdown
> [!quote]+ Page 187
> One advantage of functions is the way they separate...
>
> 📖 [p187](file:///tmp/skim_links/p187.command)
```

## Installation

### From Community Plugins (Recommended)

1. Open Settings → Community Plugins
2. Turn off Restricted Mode if prompted
3. Click Browse and search for "Skim Highlights"
4. Install and Enable

### Manual Installation

1. Download `main.js`, `manifest.json`, and `versions.json` from the latest release
2. Create a folder: `.obsidian/plugins/skim-highlights/`
3. Copy the three files into that folder
4. Enable the plugin in Settings → Community Plugins
5. You should see a 🟢 indicator in the status bar

### Requirements

- macOS (uses AppleScript to communicate with Skim)
- [Skim PDF Reader](https://skim-app.sourceforge.io/) installed
- Desktop app (not compatible with mobile)

## Usage

| Control | Action |
|---------|--------|
| Status bar | 🟢 Listening / ⚫ Stopped — click to toggle |
| Ribbon icon | Highlight pen icon — click to toggle |
| Command palette | `Skim Highlights: Toggle` |

Once enabled, just highlight text in Skim as you normally would. Each new highlight is automatically copied to your clipboard as a formatted markdown card.

## First-Time Setup

The first time you click a `📖 pXX` link, macOS may prompt you to allow opening the file. Click "Open" to confirm.

## License

MIT
