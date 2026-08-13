// Inline note title icon (above .inline-title).

import { WorkspaceLeaf } from "obsidian";
import type CustomizeIconsPlugin from "../main";
import { applyBothHighRing, createEmojiElement, createIconElement } from "../icons/render";
import { loadSvg, parseIconId, resolveIconForPath } from "../icons/index";

export async function addTitleIcon(
  plugin: CustomizeIconsPlugin,
  leaf: WorkspaceLeaf | null,
): Promise<void> {
  // Remove old title icons
  document.querySelectorAll(".customize-icons-title-icon").forEach((el) => el.remove());

  if (!plugin.settings.showAboveTitle) return;
  if (!leaf) return;

  const view = leaf.view as any;
  if (!view || !view.file) return;

  const iconConfig = resolveIconForPath(view.file.path, plugin.settings.folderIcons);
  if (!iconConfig) return;

  const parsed = parseIconId(iconConfig.icon);
  if (!parsed) return;

  const titleContainer = view.containerEl.querySelector(".inline-title");
  if (!titleContainer || !titleContainer.parentElement) return;

  const span = document.createElement("div");
  span.classList.add("customize-icons-title-icon");

  if (parsed.type === "emoji") {
    span.appendChild(createEmojiElement(parsed.emoji));
  } else {
    const svg = await loadSvg(
      plugin.app.vault.adapter,
      plugin.settings.iconPacksPath,
      parsed.pack,
      parsed.name,
    );
    if (!svg) return;
    const qualityInfo = plugin.getQualityColorInfo(view.file.path, "title");
    const color = qualityInfo.color || iconConfig.color || plugin.settings.defaultIconColor;
    span.appendChild(createIconElement(svg, color, qualityInfo.cssClass));
    applyBothHighRing(span, qualityInfo.ringColor || null);
  }

  titleContainer.parentElement.insertBefore(span, titleContainer);
}
