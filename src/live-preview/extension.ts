// Live-Preview link-icon extension — wraps the resolver in the plugin's own
// icon resolution pipeline (folder icon + quality/connectivity + cached SVG).

import { Extension } from "@codemirror/state";
import type CustomizeIconsPlugin from "../main";
import { IconResolution } from "./link-icon-widget";
import { createLinkIconField } from "./link-icon-field";
import { resolveIconForPath, parseIconId } from "../icons/index";
import { getSvgSync, isEmojiCached } from "./svg-cache";

export function createLivePreviewExtension(plugin: CustomizeIconsPlugin): Extension {
  const resolve = (linkpath: string): IconResolution | null => {
    if (!plugin.settings.enableLivePreviewLinkIcons) return null;
    if (!plugin.settings.showInLinks) return null;

    const active = plugin.app.workspace.getActiveFile();
    const sourcePath = active ? active.path : "";
    const file = plugin.app.metadataCache.getFirstLinkpathDest(linkpath, sourcePath);
    if (!file) return null;

    const iconConfig = resolveIconForPath(file.path, plugin.settings.folderIcons);
    if (!iconConfig) return null;

    const parsed = parseIconId(iconConfig.icon);
    if (!parsed) return null;

    const qualityInfo = plugin.getQualityColorInfo(file.path, "links");
    const color = qualityInfo.color || iconConfig.color || plugin.settings.defaultIconColor;

    // Emoji rendered as SVG text is easy — build a tiny inline SVG that draws it.
    if (parsed.type === "emoji") {
      const emoji = parsed.emoji;
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14">' +
        '<text x="0" y="12" font-size="12">' +
        escapeXml(emoji) +
        "</text></svg>";
      return { svg, color: null, qualityClass: qualityInfo.cssClass, linkpath };
    }

    // SVG path — must be synchronously available (cached during onload).
    const svg = getSvgSync(parsed.pack, parsed.name);
    if (!svg) return null;

    return { svg, color, qualityClass: qualityInfo.cssClass, linkpath };
  };

  return createLinkIconField(resolve);
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// isEmojiCached is imported for lint suppression; keeps the surface stable.
void isEmojiCached;
