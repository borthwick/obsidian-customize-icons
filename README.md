# Obsidian Customize Icons

Folder-based icon assignment with quality score coloring, connectivity density scoring, and visual icon picker for Obsidian. Built as a simpler, more focused replacement for Iconize.

## Features

### Folder-Based Icons
- Assign an icon to any folder — all files inside inherit it
- Subfolders can override with their own icon
- Icons appear in the file explorer, tabs, note titles, and internal links (both reading and live preview modes)

### Visual Icon Picker
- Browse and search all available SVG icons in a modal
- Emoji support — type any emoji directly
- Icons bundled with the plugin for cross-machine sync via BRAT

### Quality Score Coloring
- Notes with a `Quality score` frontmatter field get tinted icons
- **Blue** — quality score exists (any value)
- **Green** — quality score ≥ threshold (default 7)
- Configurable colors and threshold

### Connectivity Density Scoring
- Notes with dense inbound + bidirectional links get a distinct icon color
- Score = (inbound links × 2) + (bidirectional links × 3)
- **Amber** by default — separate from quality coloring so you can see both
- Penalty folders excluded (Day Planners, Templates, Beliefs, etc.) — configurable
- Uses Obsidian's `resolvedLinks` for real-time graph data

### Display Toggles
- Show/hide icon in tab bar
- Show/hide icon above note title
- Toggle icons in internal links
- Toggle icons in editor

## Settings
- Color pickers for default, quality exists, quality high, and connectivity
- Connectivity threshold with configurable penalty folders
- Per-folder icon assignment with visual picker and color per folder

## Install via BRAT
1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat)
2. Add beta plugin: `borthwick/obsidian-customize-icons`

## Icon Packs
Icons are bundled in `icons-bundle.json` and ship with the plugin. To add new icons, place SVGs in `.obsidian/icons/customize-icons/` — the plugin will pick them up and auto-bundle for future syncs.

Supported icon pack prefixes: Li (Lucide), Oc (Octicons), Ti (Tabler), Co (Coolicons), Si (Simple Icons), Bx (Boxicons), Fe (Feather), Fa (Font Awesome), Ib (Icon Brew), Ri (Remix), Rp (RPG Awesome).

## License
MIT
