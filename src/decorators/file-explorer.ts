// File-explorer icon injection (nav-file-title / nav-folder-title).

import { TFile, TFolder } from "obsidian";
import type CustomizeIconsPlugin from "../main";
import { applyBothHighRing, createEmojiElement, createIconElement } from "../icons/render";
import { loadSvg, parseIconId, resolveIconForPath } from "../icons/index";

export async function decorateFileExplorer(plugin: CustomizeIconsPlugin): Promise<void> {
  // Prevent concurrent runs
  if (plugin._decorating) return;
  plugin._decorating = true;

  try {
    // Remove old icons
    document.querySelectorAll(".customize-icons-explorer-icon").forEach((el) => el.remove());

    const fileExplorer = plugin.app.workspace.getLeavesOfType("file-explorer")[0];
    if (!fileExplorer) return;

    const view = fileExplorer.view as any;
    if (!view || !view.fileItems) return;

    for (const path in view.fileItems) {
      const item = view.fileItems[path];
      if (!item || !item.selfEl) continue;

      // Get the direct title row — NOT nested descendants
      let titleRowEl: Element | null = null;
      if (item.file instanceof TFolder) {
        titleRowEl = item.selfEl.querySelector(":scope > .nav-folder-title");
      } else if (item.file instanceof TFile) {
        titleRowEl = item.selfEl.classList.contains("nav-file-title")
          ? item.selfEl
          : item.selfEl.querySelector(":scope > .nav-file-title");
      }
      if (!titleRowEl) continue;

      const titleEl = titleRowEl.querySelector(".nav-file-title-content, .nav-folder-title-content");
      if (!titleEl) continue;

      // Skip if already has icon
      if (titleRowEl.querySelector(".customize-icons-explorer-icon")) continue;

      let iconConfig = null;

      // For folders: check if this folder itself has an icon
      if (item.file instanceof TFolder) {
        iconConfig = plugin.settings.folderIcons[item.file.path];
      } else if (item.file instanceof TFile) {
        // For files: resolve from parent folder
        iconConfig = resolveIconForPath(item.file.path, plugin.settings.folderIcons);
      }

      if (!iconConfig) continue;

      const parsed = parseIconId(iconConfig.icon);
      if (!parsed) continue;

      const span = document.createElement("span");
      span.classList.add("customize-icons-explorer-icon");

      if (parsed.type === "emoji") {
        span.appendChild(createEmojiElement(parsed.emoji));
      } else {
        const svg = await loadSvg(
          plugin.app.vault.adapter,
          plugin.settings.iconPacksPath,
          parsed.pack,
          parsed.name,
        );
        if (!svg) continue;
        const qualityInfo =
          item.file instanceof TFile
            ? plugin.getQualityColorInfo(item.file.path, "fileExplorer")
            : { color: null, cssClass: null, ringColor: null };
        const color = qualityInfo.color || iconConfig.color || plugin.settings.defaultIconColor;
        span.appendChild(createIconElement(svg, color, qualityInfo.cssClass));
        applyBothHighRing(span, qualityInfo.ringColor || null);
      }

      titleRowEl.insertBefore(span, titleEl);
    }
  } finally {
    plugin._decorating = false;
  }
}
