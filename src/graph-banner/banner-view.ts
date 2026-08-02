// GraphBannerView — temporary localgraph leaf + reparented DOM node.
// Structure matches ras0q/obsidian-graph-banner v2.3.3; adds a CSS-hidden
// transient tab header (prevents tab-bar shift + click misfires) and a
// retarget-in-place path so navigating within a pane doesn't stack banners.

import { App, MarkdownView, WorkspaceLeaf } from "obsidian";

export class GraphBannerView {
  static readonly nodeClass = "graph-banner-content";
  static readonly overlayNodeClass = "graph-banner-overlay";

  leaf: WorkspaceLeaf;
  node: HTMLElement;
  setupLeafPromise: Promise<void>;

  constructor(app: App, timeToRemoveLeaf: number) {
    this.leaf = app.workspace.getLeaf("tab");
    this.hideTransientTab();
    this.setupLeafPromise = this.setupLeaf(timeToRemoveLeaf);
    const content = (this.leaf.view as any).containerEl.find(".view-content") as HTMLElement;
    this.node = content;
    this.setupNode();
  }

  private async setupLeaf(timeToRemoveLeaf: number): Promise<void> {
    await this.leaf.setViewState({ type: "localgraph" });
    const removeChild = () => {
      try {
        (this.leaf.parent as any)?.removeChild?.(this.leaf);
      } catch (e) {}
    };
    if (timeToRemoveLeaf > 0) setTimeout(removeChild, timeToRemoveLeaf);
    else removeChild();
  }

  // Hide the transient tab header via CSS so the tab bar doesn't briefly
  // shift right when the banner leaf is created — that was making tab
  // clicks land on the wrong tab.
  private hideTransientTab(): void {
    try {
      const tabHeader = (this.leaf as any).tabHeaderEl as HTMLElement | undefined;
      if (tabHeader) {
        tabHeader.style.display = "none";
        tabHeader.setAttribute("data-ci-transient", "1");
      }
      const container = (this.leaf as any).containerEl as HTMLElement | undefined;
      if (container) container.setAttribute("data-ci-transient", "1");
    } catch (e) {}
  }

  private setupNode(): void {
    this.node.addClass(GraphBannerView.nodeClass);
    const controls = (this.node as any).find(".graph-controls") as HTMLElement | null;
    if (controls) controls.toggleClass("is-close", true);

    const overlay = document.createElement("div");
    overlay.addClass(GraphBannerView.overlayNodeClass);
    const canvas = this.node.querySelector("canvas");
    this.node.insertBefore(overlay, canvas);

    overlay.addEventListener("pointerup", () => {
      if (this.isActive()) return;
      this.setActive(true);
      // Run a continuous render loop while interactive so native graph
      // controls (center force, node repel, filters) update the canvas
      // in real time. Detached leaves pause their own rAF loop, so we
      // supply one from outside.
      this.startInteractiveRenderLoop();
      const controller = new AbortController();
      document.addEventListener(
        "pointerdown",
        (ev) => {
          if (!this.isActive()) return;
          const target = ev.target as Node | null;
          if (target && this.node.contains(target)) return;
          this.setActive(false);
          controller.abort();
        },
        { signal: controller.signal },
      );
    });
  }

  private startInteractiveRenderLoop(): void {
    const view = this.leaf.view as any;
    const renderer = view?.renderer;
    if (!renderer || typeof renderer.render !== "function") return;
    const loop = () => {
      if (!this.isActive() || !this.node.isConnected) return;
      try { renderer.render(); } catch (e) {}
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  isActive(): boolean {
    return this.node.dataset.interactive === "true";
  }

  setActive(active: boolean): void {
    this.node.dataset.interactive = active ? "true" : "false";
  }

  async placeTo(view: MarkdownView, colorGroups?: any[]): Promise<void> {
    await this.setupLeafPromise;
    await this.leaf.setViewState({
      type: "localgraph",
      state: {
        file: view.file?.path,
        // Some Obsidian versions read colorGroups from state.colorGroups,
        // others from state.options.colorGroups — send both to be safe.
        colorGroups: colorGroups || [],
        options: { colorGroups: colorGroups || [] },
      },
    });
    this.applyColorGroupsToRenderer(colorGroups || []);
    (this.leaf as any).setGroup?.(view.file?.path);

    // Race guard: on some notes .inline-title isn't in the DOM yet when
    // file-open fires. Retry for up to ~1s.
    for (let attempt = 0; attempt < 20; attempt++) {
      const mode = view.getMode();
      const container = (view.containerEl as any).find(
        `.markdown-${mode}-view`,
      ) as HTMLElement | null;
      if (container) {
        if (this.isDescendantOf(container)) {
          this.kickCanvas();
          setTimeout(() => this.recenter(), 600);
          return;
        }
        const inlineTitle = container.querySelector(".inline-title") as HTMLElement | null;
        if (inlineTitle && inlineTitle.parentElement) {
          inlineTitle.parentElement.insertBefore(this.node, inlineTitle.nextSibling);
          this.installRecenterButton();
          this.kickCanvas();
          // Auto-recenter after force layout has time to settle. Fixes
          // large graphs (Camp Demo Day etc.) that render off-viewport.
          setTimeout(() => this.recenter(), 600);
          return;
        }
      }
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  private scheduleAutoRecenter(): void {
    setTimeout(() => {
      this.recenter();
      this.recoverIfEmpty();
    }, 600);
  }

  // If the renderer has zero nodes after settling, the setViewState / retarget
  // silently failed (happens on very large local graphs). Recycle the leaf:
  // set to empty view, then back to localgraph with the target file. This
  // rebuilds the view fresh.
  private recoverIfEmpty(): void {
    const view = this.leaf.view as any;
    const nodes = view?.renderer?.nodes;
    if (nodes && nodes.length > 0) return; // healthy
    const filePath = view?.file?.path;
    if (!filePath) return;
    (async () => {
      try {
        await this.leaf.setViewState({ type: "empty" });
        await this.leaf.setViewState({
          type: "localgraph",
          state: { file: filePath },
        });
        this.kickCanvas();
        setTimeout(() => this.recenter(), 500);
      } catch (e) {}
    })();
  }

  async retargetTo(view: MarkdownView, colorGroups?: any[]): Promise<void> {
    await this.setupLeafPromise;
    await this.leaf.setViewState({
      type: "localgraph",
      state: {
        file: view.file?.path,
        // Some Obsidian versions read colorGroups from state.colorGroups,
        // others from state.options.colorGroups — send both to be safe.
        colorGroups: colorGroups || [],
        options: { colorGroups: colorGroups || [] },
      },
    });
    this.applyColorGroupsToRenderer(colorGroups || []);
    (this.leaf as any).setGroup?.(view.file?.path);
    try {
      (this.leaf as any).rebuildView?.();
    } catch (e) {}
    this.kickCanvas();
    this.scheduleAutoRecenter();
  }

  // Push color groups into THIS banner's renderer. The banner's leaf is
  // detached from the tab bar, so it's not in workspace.getLeavesOfType and
  // won't be refreshed by the global sync's broadcast — we have to poke it
  // directly. Called from placeTo/retargetTo with the groups the manager
  // just synced.
  applyColorGroups(groups: any[]): void {
    if (!Array.isArray(groups) || groups.length === 0) return;
    const view = this.leaf.view as any;
    const renderer = view?.renderer;
    if (!renderer) return;
    let attempts = 0;
    const tick = () => {
      try {
        renderer.colorGroupOptions = groups;
        if (view.options) view.options.colorGroups = groups;
        if (typeof renderer.onOptionsChange === "function") renderer.onOptionsChange();
        if (typeof renderer.render === "function") renderer.render();
      } catch (e) {}
      attempts++;
      if (attempts < 3) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // Legacy — kept so old callers don't break.
  private applyColorGroupsToRenderer(_groups: any[]): void {}

  // Force the graph renderer to draw. Obsidian's local-graph pauses its
  // rAF loop when the leaf isn't the active leaf.
  private kickCanvas(): void {
    const view = this.leaf.view as any;
    const renderer = view?.renderer;
    if (!renderer) return;
    let attempts = 0;
    const tick = () => {
      try {
        if (typeof renderer.onResize === "function") renderer.onResize();
        if (typeof renderer.render === "function") renderer.render();
      } catch (e) {}
      attempts++;
      if (attempts < 6) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  private installRecenterButton(): void {
    if (this.node.querySelector(".graph-banner-recenter")) return;
    const btn = document.createElement("button");
    btn.classList.add("graph-banner-recenter");
    btn.setAttribute("aria-label", "Re-center graph");
    btn.textContent = "⌖";
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      this.recenter();
    });
    this.node.appendChild(btn);
  }

  recenter(): void {
    const view = this.leaf.view as any;
    const renderer = view?.renderer;
    if (!renderer) return;
    try {
      if (typeof renderer.reset === "function") renderer.reset();
      if (typeof renderer.centerAndZoom === "function") renderer.centerAndZoom(1);
      if (typeof renderer.setPan === "function") renderer.setPan(0, 0);
      if (typeof renderer.zoomTo === "function") renderer.zoomTo(1);
      if (typeof renderer.scale === "number") renderer.scale = 1;
      if (typeof renderer.px === "number") renderer.px = 0;
      if (typeof renderer.py === "number") renderer.py = 0;
      if (typeof renderer.targetScale === "number") renderer.targetScale = 1;
      if (typeof renderer.targetPx === "number") renderer.targetPx = 0;
      if (typeof renderer.targetPy === "number") renderer.targetPy = 0;
      if (typeof renderer.onResize === "function") renderer.onResize();
      if (typeof renderer.render === "function") renderer.render();
    } catch (e) {}
    // Draw for a burst of frames so pan/zoom lands visibly.
    this.pumpRenderer(30);
  }

  private pumpRenderer(frames: number): void {
    const view = this.leaf.view as any;
    const renderer = view?.renderer;
    if (!renderer || typeof renderer.render !== "function") return;
    let n = 0;
    const tick = () => {
      try { renderer.render(); } catch (e) {}
      n++;
      if (n < frames && this.node.isConnected) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  isDescendantOf(el: Element): boolean {
    return el.contains(this.node);
  }

  setVisibility(visible: boolean): void {
    this.node.toggleClass("hidden", !visible);
  }

  detach(): void {
    try {
      this.leaf.detach();
    } catch (e) {}
    this.node.removeClass(GraphBannerView.nodeClass);
    if (this.node.parentElement) {
      this.node.parentElement.removeChild(this.node);
    }
  }
}
