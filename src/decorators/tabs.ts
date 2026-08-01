// Tab-header icon injection.

import type CustomizeIconsPlugin from "../main";
import { createEmojiElement, createIconElement } from "../icons/render";
import { loadSvg, parseIconId, resolveIconForPath } from "../icons/index";

export async function decorateOpenTabs(plugin: CustomizeIconsPlugin): Promise<void> {
  if (!plugin.settings.showInTabs) return;

  // Remove old tab icons
  document.querySelectorAll(".customize-icons-tab-icon").forEach((el) => el.remove());

  const leaves = plugin.app.workspace.getLeavesOfType("markdown");
  for (const leaf of leaves) {
    const view = leaf.view as any;
    const file = view && view.file;
    if (!file) continue;

    const iconConfig = resolveIconForPath(file.path, plugin.settings.folderIcons);
    if (!iconConfig) continue;

    const parsed = parseIconId(iconConfig.icon);
    if (!parsed) continue;

    const tabHeader = (leaf as any).tabHeaderEl as HTMLElement | undefined;
    if (!tabHeader) continue;

    const titleEl = tabHeader.querySelector(".workspace-tab-header-inner-title");
    if (!titleEl || !titleEl.parentElement) continue;

    const span = document.createElement("span");
    span.classList.add("customize-icons-tab-icon");

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
      const qualityInfo = plugin.getQualityColorInfo(file.path, "tabs");
      const color = qualityInfo.color || iconConfig.color || plugin.settings.defaultIconColor;
      span.appendChild(createIconElement(svg, color, qualityInfo.cssClass));
    }

    titleEl.parentElement.insertBefore(span, titleEl);
  }
}
