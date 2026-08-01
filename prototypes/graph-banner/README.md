# Customize Icons — Graph Banner prototype

Standalone port of `ras0q/obsidian-graph-banner` v2.3.3 into TypeScript, plus a
draft of per-surface connectivity toggle settings.

## What was ported

- `banner-view.ts` — `GraphBannerView` (was the `l` / `v` class in the v2.3.3
  minified bundle). Owns a temporary `localgraph` leaf and the DOM node
  reparented under the note's `.inline-title`.
- `banner-manager.ts` — `GraphBannerManager` (was the pool in v2.3.3's
  `graphViews`). Reuses / reclaims / creates a `GraphBannerView` for each
  `MarkdownView`.
- `settings.ts` — `GraphBannerSettings` (`ignore: string[]`, `timeToRemoveLeaf: number`) and `GraphBannerSettingTab`.
- `ignore-matcher.ts` — thin wrapper around the `ignore` npm package.
- `plugin.ts` — minimal `Plugin` subclass wiring file-open + layout-change
  events + onunload cleanup.
- `styles.css` — copied verbatim from v2.3.3 (banner height variable + hide +
  `data-interactive` accent border + layout-shift-prevention selector).

## What deliberately diverges

- Source is ASCII-only (em-dashes and non-ASCII characters in `settings.ts`
  descriptions have burned us before).
- `IgnoreMatcher` is a class wrapper instead of raw `ignore()` calls — makes
  the "add patterns per placement" flow clearer at the call site.
- `GraphBannerManager` takes `timeToRemoveLeaf` at construction time; original
  passed the whole settings object every call. Cleaner separation for the
  integration path.
- `banner-view.ts` uses `insertBefore(node, inlineTitle.nextSibling)` instead
  of the custom `insertAfter` helper Obsidian ships (behavior identical, one
  less non-standard API to depend on).

## Hooking into MarkdownView

`file-open` + `layout-change` handlers both call
`placeGraphView(view: MarkdownView)`, which:
1. Builds an `IgnoreMatcher` from settings.
2. Finds/reclaims/creates a `GraphBannerView` for the target markdown view.
3. Sets visibility based on the ignore matcher.
4. Calls `placeTo(view)` which awaits the leaf setup, sets file state +
   group, and inserts the node just after the `.inline-title`.

## Build

```
cd /Users/johnb/clawd/plugin-rewrites/customize-icons
node prototypes/graph-banner/esbuild.prototype.mjs
```

Copy `main.js` + `manifest.json` + `styles.css` into
`<vault>/.obsidian/plugins/customize-icons-graph-banner-prototype/` to smoke
test. Disable the standalone `graph-banner` plugin first to avoid two banners
fighting over the same DOM node.

## Part B: connectivity toggles

See `connectivity-toggles.ts` + `CONNECTIVITY_TOGGLES.md` for the design.
Short version: `enableConnectivityColoring` today is all-or-nothing across five
surfaces; splitting into per-surface toggles lets users apply it only where it
adds signal.

## Integration into `../src/`

1. Move `settings.ts` fields into `CustomizeIconsSettings` under a
   `graphBanner: GraphBannerSettings` key.
2. Move `banner-view.ts` + `banner-manager.ts` + `ignore-matcher.ts` under
   `src/graph-banner/`.
3. In `src/main.ts` `onload`, instantiate a `GraphBannerManager` and register
   `file-open` + `layout-change` handlers alongside the existing decoration
   handlers.
4. Merge `styles.css` into the top-level `styles.css`.
5. Bump `manifest.json` to `1.7.0` and update the description to include the
   graph-banner subsystem.
