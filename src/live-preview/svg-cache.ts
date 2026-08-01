// Synchronous SVG cache for the Live Preview widget path.
//
// The CM6 StateField must resolve icons synchronously in `buildDecorations`.
// The rest of the plugin loads SVGs from disk on demand and caches them; here
// we mirror that cache with a warm-up call from the main plugin's onload.

import { DataAdapter } from "obsidian";
import { getBundledIcons } from "../icons/index";
import { PREFIX_TO_PACK } from "../types";

const svgCache: Map<string, string | null> = new Map();

// Kept for potential future emoji-cache use; exported so extension.ts can
// reference it without triggering unused-import lint noise.
export function isEmojiCached(_key: string): boolean {
  return false;
}

function keyFor(pack: string, name: string): string {
  return pack + "/" + name;
}

function prefixFor(pack: string): string {
  for (const p in PREFIX_TO_PACK) {
    if (PREFIX_TO_PACK[p] === pack) return p;
  }
  return "";
}

export function getSvgSync(pack: string, name: string): string | null {
  const key = keyFor(pack, name);
  if (svgCache.has(key)) return svgCache.get(key) ?? null;

  const bundled = getBundledIcons();
  if (bundled) {
    const iconId = prefixFor(pack) + name;
    if (bundled[iconId]) {
      svgCache.set(key, bundled[iconId]);
      return bundled[iconId];
    }
    if (bundled[name]) {
      svgCache.set(key, bundled[name]);
      return bundled[name];
    }
  }
  // Not in bundle and we can't do sync disk reads — return null and let the
  // async warmup path fill it in for next redraw.
  return null;
}

export async function warmSvg(
  adapter: DataAdapter,
  iconsPath: string,
  pack: string,
  name: string,
): Promise<void> {
  const key = keyFor(pack, name);
  if (svgCache.has(key)) return;

  const bundled = getBundledIcons();
  if (bundled) {
    const iconId = prefixFor(pack) + name;
    if (bundled[iconId]) {
      svgCache.set(key, bundled[iconId]);
      return;
    }
    if (bundled[name]) {
      svgCache.set(key, bundled[name]);
      return;
    }
  }

  const iconId = prefixFor(pack) + name;
  const flatPath = iconsPath + "/customize-icons/" + iconId + ".svg";
  try {
    if (await adapter.exists(flatPath)) {
      svgCache.set(key, await adapter.read(flatPath));
      return;
    }
  } catch (e) {}

  const packPath = iconsPath + "/" + pack + "/" + name + ".svg";
  try {
    if (await adapter.exists(packPath)) {
      svgCache.set(key, await adapter.read(packPath));
      return;
    }
  } catch (e) {}

  svgCache.set(key, null);
}
