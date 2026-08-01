# Per-surface connectivity coloring toggles

## Why 5 surfaces

The plugin injects icons into five distinct DOM contexts:

1. **File explorer** (`.nav-file-title`) — always visible in sidebar; dense
2. **Tab bar** (`.workspace-tab-header-inner-title`) — visible for open notes
3. **Above title** (`.inline-title`) — visible only when a note is open
4. **Inline body links** (`a.internal-link` + `span.internal-link`) — high-density
5. **Bases views** (`.bases-view`) — table/list/cards; can be very dense

Today, `enableConnectivityColoring` is all-or-nothing. That means a user who
wants a subtle "which folder does this link go to" hint in the file explorer
can't have it without ALSO getting amber-tinted inline-link icons across every
note. That's a UI-noise problem: connectivity color competes with quality
color for attention on high-signal surfaces (title, tabs) but wants to fade
into ambient signal on low-signal ones (explorer, Bases).

Splitting into 5 surface toggles lets each user land their own tradeoff.

## Data model

`src/types.ts` gains:

```ts
export interface ConnectivitySurfaceToggles {
  fileExplorer: boolean;
  tabs: boolean;
  title: boolean;
  links: boolean;
  bases: boolean;
}
```

`CustomizeIconsSettings` gains `connectivityToggles: ConnectivitySurfaceToggles`
with `DEFAULT_CONNECTIVITY_TOGGLES` (all `true` — preserves current v1.6.5
behavior).

## How `getQualityColorInfo` splits

Currently `getQualityColorInfo(filePath)` returns one `QualityColorInfo`
regardless of surface. It needs a surface parameter:

```ts
getQualityColorInfo(filePath: string, surface: ConnectivitySurface): QualityColorInfo
```

The connectivity branch (lines around `if (this.settings.enableConnectivityColoring)`
in `src/main.ts`) becomes:

```ts
if (
  this.settings.enableConnectivityColoring &&
  shouldColorConnectivity(surface, this.settings.connectivityToggles)
) {
  // ...existing connectivity logic
}
```

Quality-high and quality-exists branches are unchanged — those apply
uniformly across surfaces.

## Integration touch-points

Each decorator needs to pass its surface identifier:

- `src/decorators/file-explorer.ts` — `getQualityColorInfo(path, "fileExplorer")`
- `src/decorators/tabs.ts` — `getQualityColorInfo(path, "tabs")`
- `src/decorators/title.ts` — `getQualityColorInfo(path, "title")`
- `src/decorators/reading-links.ts` — `getQualityColorInfo(path, "links")` (used by both reading + Bases via `insertLinkIcon`)
- `src/decorators/bases.ts` — pass `"bases"` when it calls `insertLinkIcon`

That means `insertLinkIcon` also gains a surface parameter (default `"links"`),
and Bases-view decoration overrides it to `"bases"`.

## UI

`src/settings.ts` — inside the existing "Connectivity Coloring" section,
after the master `enableConnectivityColoring` toggle, insert
`renderConnectivityTogglesSection(el, get, set)`. The section is disabled
(gray + not clickable) when the master switch is off.
