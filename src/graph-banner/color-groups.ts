// Build graph color-groups from plugin settings + live connectivity cache,
// and push them ONCE into the internal graph plugin's options so both global
// and local graphs pick them up. Called at plugin onload + when settings
// change; NOT per file navigation (that was the lag source).

import type { App } from "obsidian";
import type { CustomizeIconsSettings } from "../types";
import {
  buildConnectivityScores,
  getConnectivityCacheEntries,
  getHighConnectivityPaths,
  isConnectivityBuilt,
} from "../scoring/connectivity";

const CI_TAG = "__ci_managed__";

function hexToRgbInt(hex: string): number {
  const cleaned = (hex || "").replace(/^#/, "").trim();
  if (!/^[0-9a-f]{6}$/i.test(cleaned)) return 0;
  return parseInt(cleaned, 16);
}

// Blend a hex color toward white by factor t (0 = original, 1 = white).
// Returns the resulting rgb as an integer.
function lighten(hex: string, t: number): number {
  const int = hexToRgbInt(hex);
  const r = (int >> 16) & 0xff;
  const g = (int >> 8) & 0xff;
  const b = int & 0xff;
  const lr = Math.round(r + (255 - r) * t);
  const lg = Math.round(g + (255 - g) * t);
  const lb = Math.round(b + (255 - b) * t);
  return (lr << 16) | (lg << 8) | lb;
}

function pathsToQueries(paths: string[]): string[] {
  const chunks: string[][] = [];
  for (let i = 0; i < paths.length; i += 100) {
    chunks.push(paths.slice(i, i + 100));
  }
  return chunks.map((chunk) =>
    chunk.map((p) => `path:"${p.replace(/"/g, '\\"')}"`).join(" OR "),
  );
}

export function buildLocalGraphColorGroups(
  app: App,
  settings: CustomizeIconsSettings,
): any[] {
  const groups: any[] = [];

  if (settings.enableQualityColoring) {
    groups.push({
      color: { a: 1, rgb: hexToRgbInt(settings.qualityHighColor) },
      query: `["Quality score":>=${settings.qualityHighThreshold}]`,
    });
    groups.push({
      color: { a: 1, rgb: hexToRgbInt(settings.qualityExistsColor) },
      query: '["Quality score":true]',
    });
  }

  if (settings.enableConnectivityColoring) {
    if (!isConnectivityBuilt()) buildConnectivityScores(app, settings);
    // Tiered gradient: split high-connectivity files into three bands, each
    // colored a different shade of connectivityColor. Higher score = darker.
    // Tiers are computed from the actual score distribution above threshold,
    // so they self-adjust as the vault grows.
    const entries = getConnectivityCacheEntries()
      .filter(([, s]) => s >= settings.connectivityThreshold)
      .sort((a, b) => b[1] - a[1]); // descending by score

    if (entries.length > 0) {
      const tier1Idx = Math.max(1, Math.floor(entries.length * 0.1));  // top 10% of "high"
      const tier2Idx = Math.max(tier1Idx + 1, Math.floor(entries.length * 0.35)); // next 25%
      const tier1 = entries.slice(0, tier1Idx).map((e) => e[0]);
      const tier2 = entries.slice(tier1Idx, tier2Idx).map((e) => e[0]);
      const tier3 = entries.slice(tier2Idx).map((e) => e[0]);

      const baseHex = settings.connectivityColor;
      const tierColors: Array<[string[], number]> = [
        [tier1, lighten(baseHex, 0)],    // full color — strongest hubs
        [tier2, lighten(baseHex, 0.35)], // medium — solid hubs
        [tier3, lighten(baseHex, 0.65)], // lightest — moderately connected
      ];

      for (const [paths, rgb] of tierColors) {
        for (const query of pathsToQueries(paths)) {
          if (!query) continue;
          groups.push({ color: { a: 1, rgb }, query });
        }
      }
    }
  }

  return groups;
}

// Merge our groups (tagged with __ci_managed__) into the graph plugin's
// existing groups, preserving anything the user set manually. Idempotent —
// safe to call repeatedly; only writes to disk if something actually changed.
// Also nudges any live graph leaves to re-render so they pick up the new
// colors immediately.
// Returns the final merged groups array so callers can push them directly
// into their detached banner leaves' renderers (workspace.getLeavesOfType
// doesn't include detached leaves).
export function syncColorGroupsToGraphPlugin(
  app: App,
  settings: CustomizeIconsSettings,
): any[] {
  const ours = buildLocalGraphColorGroups(app, settings).map((g) => ({
    ...g,
    [CI_TAG]: true,
  }));

  try {
    const gp = (app as any)?.internalPlugins?.plugins?.graph?.instance;
    if (!gp || !gp.options) return ours;

    const existing: any[] = Array.isArray(gp.options.colorGroups)
      ? gp.options.colorGroups.filter((g: any) => !g[CI_TAG])
      : [];

    const merged = [...ours, ...existing];

    const changed =
      JSON.stringify(gp.options.colorGroups) !== JSON.stringify(merged);

    if (changed) {
      gp.options.colorGroups = merged;
      if (typeof gp.saveOptions === "function") gp.saveOptions();
      // Refresh every live graph leaf so they pick up the new groups.
      const refresh = (leafType: string) => {
        (app as any).workspace.getLeavesOfType(leafType).forEach((l: any) => {
          try {
            const view = l.view;
            if (view?.options) view.options.colorGroups = merged;
            if (view?.renderer) {
              view.renderer.colorGroupOptions = merged;
              if (typeof view.renderer.onOptionsChange === "function") {
                view.renderer.onOptionsChange();
              }
              if (typeof view.renderer.render === "function") view.renderer.render();
            }
          } catch (e) {}
        });
      };
      refresh("graph");
      refresh("localgraph");
    }
    return merged;
  } catch (e) {}
  return ours;
}
