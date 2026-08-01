// Obsidian Bases view decoration.
// Bases lazy-renders rows on scroll/sort/filter/grouping, so we attach a
// MutationObserver to each .bases-view container we find. File-name cells
// use `<span class="internal-link" data-href="...">`, NOT anchors.

import type CustomizeIconsPlugin from "../main";
import { resolveIconForPath } from "../icons/index";
import { insertLinkIcon } from "./reading-links";

export function decorateBases(plugin: CustomizeIconsPlugin): void {
  if (!plugin.settings.showInBases) return;

  // Anchor on .bases-view — the top-level wrapper present in every Bases
  // layout (table, list, cards) and every grouping mode. Earlier selectors
  // (.bases-tbody / .bases-list-container / .bases-cards-container) miss
  // grouped list views, which nest rows under .bases-list-group-list.
  const containers = document.querySelectorAll(".bases-view");

  // Drop observers for containers that have left the DOM
  plugin._basesObservers.forEach((obs, el) => {
    if (!el.isConnected) {
      obs.disconnect();
      plugin._basesObservers.delete(el);
    }
  });

  for (const container of Array.from(containers)) {
    processBasesAnchors(plugin, container as HTMLElement);
    setupBasesObserver(plugin, container as HTMLElement);
  }
}

export function processBasesAnchors(plugin: CustomizeIconsPlugin, root: HTMLElement): void {
  if (!plugin.settings.showInBases) return;
  const anchors = root.querySelectorAll(".internal-link[data-href]");
  for (const link of Array.from(anchors)) {
    const el = link as HTMLElement;
    // Skip if already injected or already enqueued
    if (el.dataset.ciProcessed === "1") continue;
    if (el.querySelector(".customize-icons-link-icon")) {
      el.dataset.ciProcessed = "1";
      continue;
    }

    const href = el.getAttribute("data-href");
    if (!href) continue;

    const file = plugin.app.metadataCache.getFirstLinkpathDest(href, "");
    if (!file) continue;

    const iconConfig = resolveIconForPath(file.path, plugin.settings.folderIcons);
    if (!iconConfig) continue;

    el.dataset.ciProcessed = "1";
    insertLinkIcon(plugin, el, file.path, iconConfig, "bases");
  }
}

function setupBasesObserver(plugin: CustomizeIconsPlugin, container: HTMLElement): void {
  if (plugin._basesObservers.has(container)) return;

  let pending: ReturnType<typeof setTimeout> | null = null;
  const observer = new MutationObserver(() => {
    // Debounce — Bases can churn the DOM dozens of times per scroll tick
    if (pending) return;
    pending = setTimeout(() => {
      pending = null;
      processBasesAnchors(plugin, container);
    }, 50);
  });
  observer.observe(container, { childList: true, subtree: true });
  plugin._basesObservers.set(container, observer);
}
