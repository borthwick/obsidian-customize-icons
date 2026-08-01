// Icon-pack parsing, SVG loading, index building, and folder-path resolution.

import { DataAdapter } from "obsidian";
import {
  BundledIcons,
  FolderIcon,
  IconIndexEntry,
  PACK_PREFIXES,
  PREFIX_TO_PACK,
  ParsedIconId,
} from "../types";
import { isEmoji } from "./render";

// Module-level caches — match v1.6.5 baseline shape.
const iconCache: Map<string, string | null> = new Map();
let iconIndex: IconIndexEntry[] = [];
let iconIndexBuilt = false;

let BUNDLED_ICONS: BundledIcons = null;

export function setBundledIcons(icons: BundledIcons): void {
  BUNDLED_ICONS = icons;
}

export function getBundledIcons(): BundledIcons {
  return BUNDLED_ICONS;
}

export function getIconIndex(): IconIndexEntry[] {
  return iconIndex;
}

export function parseIconId(id: string): ParsedIconId | null {
  if (!id) return null;
  if (isEmoji(id)) return { type: "emoji", emoji: id };
  const prefix = id.substring(0, 2);
  const name = id.substring(2);
  const pack = PREFIX_TO_PACK[prefix];
  if (pack) return { type: "svg", pack, name, prefix };
  // No recognized prefix — try as raw bundle key
  if (BUNDLED_ICONS && BUNDLED_ICONS[id]) return { type: "svg", pack: "_raw", name: id, prefix: "" };
  return null;
}

export async function loadSvg(
  adapter: DataAdapter,
  iconsPath: string,
  pack: string,
  name: string,
): Promise<string | null> {
  // Build the full icon ID from prefix+name
  let prefix = "";
  for (const p in PREFIX_TO_PACK) {
    if (PREFIX_TO_PACK[p] === pack) {
      prefix = p;
      break;
    }
  }
  const iconId = prefix + name;
  if (iconCache.has(iconId)) return iconCache.get(iconId) ?? null;

  // Try bundled icons first (by full ID, then by raw name)
  if (BUNDLED_ICONS) {
    if (BUNDLED_ICONS[iconId]) {
      iconCache.set(iconId, BUNDLED_ICONS[iconId]);
      return BUNDLED_ICONS[iconId];
    }
    if (BUNDLED_ICONS[name]) {
      iconCache.set(iconId, BUNDLED_ICONS[name]);
      return BUNDLED_ICONS[name];
    }
  }

  // Try flat folder (customize-icons/IconId.svg)
  const flatPath = iconsPath + "/customize-icons/" + iconId + ".svg";
  try {
    if (await adapter.exists(flatPath)) {
      const svg = await adapter.read(flatPath);
      iconCache.set(iconId, svg);
      return svg;
    }
  } catch (e) {}

  // Fallback to pack subfolder (pack/Name.svg)
  const packPath = iconsPath + "/" + pack + "/" + name + ".svg";
  try {
    if (await adapter.exists(packPath)) {
      const svg = await adapter.read(packPath);
      iconCache.set(iconId, svg);
      return svg;
    }
  } catch (e) {}

  iconCache.set(iconId, null);
  return null;
}

export async function buildIconIndex(adapter: DataAdapter, iconsPath: string): Promise<void> {
  if (iconIndexBuilt) return;
  iconIndex = [];

  for (const pack in PACK_PREFIXES) {
    const prefix = PACK_PREFIXES[pack];
    const dirPath = iconsPath + "/" + pack;
    try {
      if (!(await adapter.exists(dirPath))) continue;
      const files = await adapter.list(dirPath);
      if (files && files.files) {
        for (const file of files.files) {
          if (file.endsWith(".svg")) {
            const name = (file.split("/").pop() as string).replace(".svg", "");
            const id = prefix + name;
            iconIndex.push({ id, pack, name, prefix });
          }
        }
      }
    } catch (e) {}
  }
  iconIndexBuilt = true;
}

export function resolveIconForPath(
  filePath: string,
  folderIcons: Record<string, FolderIcon>,
): FolderIcon | null {
  const parts = filePath.split("/");
  parts.pop(); // remove filename

  // Try from deepest subfolder to root
  for (let i = parts.length; i > 0; i--) {
    const folderPath = parts.slice(0, i).join("/");
    if (folderIcons[folderPath]) return folderIcons[folderPath];
  }
  return null;
}
