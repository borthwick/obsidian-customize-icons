# Customize Icons — CM6 Widget prototype

Standalone prototype proving out a CodeMirror 6 `StateField<DecorationSet>` +
`WidgetType` approach to injecting folder-mapped icons before internal-link
tokens in Obsidian Live Preview.

## Why this exists

v1.6.1–v1.6.4 tried three variants of direct DOM injection into CM6 content
spans (`.cm-underline`, then `.cm-hmd-internal-link`) and reverted all of them.
The failure modes were the same:

1. CM6 owns the content DOM. Anything we insert gets nuked or duplicated on the
   next viewport update.
2. Selector-based mutation runs *after* CM6 has drawn — cursor and selection
   ranges drift by the width of the injected node.
3. SVGs with `<title>` bled tooltips into surrounding tokens (v1.6.3 fix).

v1.6.5 kept the ViewPlugin but scoped it back to `<a class="internal-link">` —
the legacy DOM path that lives outside CM6 content, so mutations there are
safe.

This prototype takes the correct path: a `StateField<DecorationSet>` that
emits `Decoration.widget({widget, side: -1})` before each internal-link token.
CM6 owns the widget lifecycle: `eq()` decides when a widget can be reused, and
the field is only rebuilt on doc / selection / effect changes.

## Files

- `types.ts` — `IconResolution` (svg + color + qualityClass + linkpath)
- `link-icon-widget.ts` — `WidgetType` subclass; strips `<title>` in `toDOM`
- `link-icon-field.ts` — `StateField<DecorationSet>` factory; walks syntax
  tree, skips widgets whose range overlaps the selection
- `extension.ts` — `createLinkIconExtension(resolve)` — returns an
  `Extension[]` to pass to `plugin.registerEditorExtension`
- `demo-plugin.ts` — a minimal `Plugin` that wires the extension with a stub
  resolver that always renders a blue circle
- `esbuild.prototype.mjs` — bundles to `main.js` in this directory
- `manifest.json` — `customize-icons-cm6-prototype`, v0.1.0

## Build + smoke test

```
cd /Users/johnb/clawd/plugin-rewrites/customize-icons
node prototypes/cm6-widget/esbuild.prototype.mjs
# copy main.js + manifest.json into <vault>/.obsidian/plugins/customize-icons-cm6-prototype/
```

Every `[[wikilink]]` in an open note in Live Preview should get a blue circle
in front of it. Cursor movement into the link range should hide the widget on
that specific link and show the raw `[[...]]` syntax.

## Cursor-overlap rule

The field skips widgets whose range intersects any selection range. Rationale:
- Widgets flicker if they re-render every keystroke.
- Users expect to see the raw syntax while editing the link they're inside.
- Skip logic lives in `overlapsSelection` in `link-icon-field.ts`.

## Known risks

- **Grammar drift**: the code matches syntax-tree nodes whose name contains
  `hmd-internal-link`. If Obsidian ships a grammar rename, the widget vanishes
  silently. Mitigation: log unmatched-but-plausible nodes behind a debug flag.
- **Nested link ranges**: mixed embed / alias syntax (`![[foo|bar]]`) may report
  multiple candidate nodes. Current impl deduplicates by taking the outermost
  match (first `enter`). If we start seeing double icons, add a `from` set to
  suppress duplicates.
- **Undo history**: `Decoration.widget` doesn't participate in undo, but the
  field rebuild on every doc change means widgets briefly disappear during
  rapid undo/redo. Acceptable — matches how Obsidian's own live-preview
  decorations behave.

## Integration into `../src/`

When this graduates:

1. Add a new module `src/decorators/live-preview-links.ts` that re-exports
   these files with `resolve` wired up to the plugin's own icon resolver
   (`resolveIconForPath` + `loadSvg` + `getQualityColorInfo`).
2. Replace `createEditorExtension` in `src/main.ts` with a combined extension
   that provides both the current legacy-anchor decorator AND this
   StateField-based widget path.
3. Gate on a new `enableLivePreviewLinkIcons` setting (default `false` for the
   first release — opt-in during smoke testing).
4. The synchronous `resolve` will need an SVG cache that's warm before the
   editor extension is created; the plugin already builds `iconIndex` at
   startup, so warm the SVGs the same way.
