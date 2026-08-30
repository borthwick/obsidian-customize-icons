// Reading-mode + shared link-icon insertion (also used by Bases + editor extension).

import { MarkdownPostProcessorContext } from "obsidian";
import type CustomizeIconsPlugin from "../main";
import { ConnectivitySurface, FolderIcon } from "../types";
import { applyBothHighRing, createEmojiElement, createIconElement } from "../icons/render";
import { loadSvg, parseIconId, resolveIconForPath } from "../icons/index";

export function processReadingModeLinks(
  plugin: CustomizeIconsPlugin,
  el: HTMLElement,
  ctx: MarkdownPostProcessorContext,
): void {
  if (!plugin.settings.showInLinks) return;
  const lpWidgetActive = plugin.settings.enableLivePreviewLinkIcons;
  const links = el.querySelectorAll("a.internal-link");
  for (const link of Array.from(links)) {
    if (link.querySelector(".customize-icons-link-icon")) continue;

    // When the CM6 widget path is on, callouts / embeds / other inline
    // renders inside a Live Preview pane fire this post-processor AND
    // are already decorated by the widget — resulting in two icons on
    // the same wikilink. Skip if a widget span already sits immediately
    // before this <a>, which is exactly the LP widget's position
    // (Decoration.widget side:-1 renders as the previous sibling).
    if (lpWidgetActive) {
      const prev = (link as HTMLElement).previousElementSibling;
      if (prev && prev.classList.contains("ci-live-preview-widget")) continue;
    }

    const href = link.getAttribute("data-href");
    if (!href) continue;

    const file = plugin.app.metadataCache.getFirstLinkpathDest(href, ctx.sourcePath || "");
    if (!file) continue;

    const iconConfig = resolveIconForPath(file.path, plugin.settings.folderIcons);
    if (!iconConfig) continue;

    insertLinkIcon(plugin, link as HTMLElement, file.path, iconConfig, "links");
  }
}

export async function insertLinkIcon(
  plugin: CustomizeIconsPlugin,
  link: HTMLElement,
  filePath: string,
  iconConfig: FolderIcon,
  surface: ConnectivitySurface = "links",
): Promise<void> {
  // Idempotency check + synchronous claim BEFORE any await. Post-processors
  // can fire the same element twice in rapid succession; without a synchronous
  // marker both calls pass the DOM check while loadSvg awaits, then both
  // insert — doubled icons on the link.
  if (link.querySelector(":scope > .customize-icons-link-icon")) return;
  if (link.dataset.ciProcessed === "1") return;
  link.dataset.ciProcessed = "1";

  const parsed = parseIconId(iconConfig.icon);
  if (!parsed) {
    delete link.dataset.ciProcessed;
    return;
  }

  const span = document.createElement("span");
  span.classList.add("customize-icons-link-icon");

  const qualityInfo = plugin.getQualityColorInfo(filePath, surface);

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
    const color = qualityInfo.color || iconConfig.color || plugin.settings.defaultIconColor;
    const iconEl = createIconElement(svg, color, qualityInfo.cssClass);
    span.appendChild(iconEl);
    applyBothHighRing(span, qualityInfo.ringColor || null);
  }

  link.insertBefore(span, link.firstChild);
  // Word joiner (U+2060): tells the layout engine "do not break between icon
  // and the following text". Without this, the link can wrap between the
  // icon and the first character, leaving a stray icon on its own line.
  link.insertBefore(document.createTextNode("⁠"), span.nextSibling);
}
