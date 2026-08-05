// Lightweight "Show graph" button that stands in for the graph banner until
// the user asks for it. Costs nothing to render (single button, no leaf, no
// canvas, no metadata queries). Insert right where the real banner would go
// so the layout is stable if the user chooses to reveal.

import { MarkdownView } from "obsidian";

// VyStar icon — spoked star with dots, matches John's custom pack. Inlined
// here so the placeholder button doesn't need the async icon-bundle resolver.
const VY_STAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><circle cx="12" cy="12" r="3"/><path d="M12 3 c 0 3 0 5 0 6"/><path d="M12 15 c 0 3 0 5 0 6"/><path d="M3 12 c 3 0 5 0 6 0"/><path d="M15 12 c 3 0 5 0 6 0"/><path d="M6 6 c 1.5 1.5 3 3 4 4"/><path d="M14 14 c 1.5 1.5 3 3 4 4"/><path d="M18 6 c -1.5 1.5 -3 3 -4 4"/><path d="M10 14 c -1.5 1.5 -3 3 -4 4"/><circle cx="12" cy="3" r="0.6" fill="currentColor" stroke="none"/><circle cx="12" cy="21" r="0.6" fill="currentColor" stroke="none"/><circle cx="3" cy="12" r="0.6" fill="currentColor" stroke="none"/><circle cx="21" cy="12" r="0.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="0.7" fill="currentColor" stroke="none"/></svg>`;

export class GraphBannerPlaceholder {
  static readonly nodeClass = "graph-banner-placeholder";

  /**
   * Idempotent: insert (or update) a placeholder button in the view's header.
   * If a real banner is already mounted in this view, do nothing — the user
   * has already opted in for this file.
   */
  static async ensureIn(view: MarkdownView, onReveal: () => void): Promise<void> {
    const mode = view.getMode();
    // Retry for up to ~1s — mirrors banner-view's own retry loop, since
    // .inline-title isn't always in the DOM the instant file-open fires.
    for (let attempt = 0; attempt < 20; attempt++) {
      const container = (view.containerEl as any).find(
        `.markdown-${mode}-view`,
      ) as HTMLElement | null;
      if (container) {
        // If a real banner is already here, don't insert a placeholder.
        if (container.querySelector(".graph-banner-content")) return;

        // If a placeholder is already here, just rewire the click handler
        // (the file may have changed under us).
        const existing = container.querySelector(
          "." + GraphBannerPlaceholder.nodeClass,
        ) as HTMLButtonElement | null;
        if (existing) {
          existing.onclick = (ev) => {
            ev.stopPropagation();
            existing.remove();
            onReveal();
          };
          return;
        }

        const inlineTitle = container.querySelector(".inline-title") as HTMLElement | null;
        if (inlineTitle) {
          const btn = document.createElement("button");
          btn.classList.add(GraphBannerPlaceholder.nodeClass);
          btn.setAttribute("type", "button");
          btn.setAttribute("aria-label", "Show local graph for this note");
          btn.innerHTML = VY_STAR_SVG;
          btn.onclick = (ev) => {
            ev.stopPropagation();
            btn.remove();
            onReveal();
          };
          // Append INSIDE the inline-title itself. CSS pins it top-right so it
          // takes no layout space and doesn't push the title around.
          inlineTitle.appendChild(btn);
          return;
        }
      }
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  /** Remove any placeholder inside this view (used when detaching). */
  static removeFrom(view: MarkdownView): void {
    const nodes = view.containerEl.querySelectorAll(
      "." + GraphBannerPlaceholder.nodeClass,
    );
    nodes.forEach((n) => n.parentElement?.removeChild(n));
  }

  /** Sweep every placeholder in the document. Used on plugin unload. */
  static removeAll(): void {
    document
      .querySelectorAll("." + GraphBannerPlaceholder.nodeClass)
      .forEach((n) => n.parentElement?.removeChild(n));
  }
}
