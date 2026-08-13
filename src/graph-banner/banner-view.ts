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
    // Snapshot the active leaf BEFORE creating our transient tab. Recent
    // Obsidian versions make the leaf returned by getLeaf("tab") active,
    // which hides the user's markdown pane and promotes the next tab to
    // the viewport — the "click placeholder → jumps to next tab, come
    // back to an empty banner box" bug.
    //
    // Restoring focus needs three fires (sync + microtask + next frame)
    // because Obsidian's own tab-activation runs asynchronously AFTER
    // getLeaf() returns — a single sync setActiveLeaf gets clobbered
    // by whatever Obsidian schedules next.
    const previouslyActive = (app.workspace as any).activeLeaf as WorkspaceLeaf | null;
    this.leaf = app.workspace.getLeaf("tab");
    this.hideTransientTab();
    if (previouslyActive && previouslyActive !== this.leaf) {
      const restore = () => {
        try {
          const stillOurs = (app.workspace as any).activeLeaf === this.leaf;
          if (stillOurs) {
            (app.workspace as any).setActiveLeaf?.(previouslyActive, { focus: true });
          }
        } catch (e) {}
      };
      restore();
      queueMicrotask(restore);
      requestAnimationFrame(restore);
      // Belt-and-suspenders: also revert during a short window if Obsidian
      // schedules the activation later than a single frame (varies by
      // vault size + workspace complexity).
      setTimeout(restore, 32);
      setTimeout(restore, 128);
    }
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
          this.scheduleAutoRecenter();
          return;
        }
        const inlineTitle = container.querySelector(".inline-title") as HTMLElement | null;
        if (inlineTitle && inlineTitle.parentElement) {
          inlineTitle.parentElement.insertBefore(this.node, inlineTitle.nextSibling);
          this.installRecenterButton();
          this.kickCanvas();
          this.scheduleAutoRecenter();
          return;
        }
      }
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  private scheduleAutoRecenter(): void {
    // Recenter three times as the graph settles. Big vaults can take >600ms
    // for the renderer to have real nodes; a single fire lands too early and
    // leaves the graph off-center. 200ms / 900ms / 2200ms covers small notes,
    // medium graphs, and the initial cold-render on a 36k-file vault.
    for (const delay of [200, 900, 2200]) {
      setTimeout(() => {
        this.recenter();
      }, delay);
    }
    setTimeout(() => {
      this.recoverIfEmpty(0);
    }, 900);
  }

  // If the renderer has zero nodes after settling, the setViewState / retarget
  // silently failed (happens on large graphs, or wiki source pages that
  // Obsidian's metadata cache hasn't indexed yet). Recycle the leaf and
  // retry with backoff — up to 3 attempts spaced 500/1200/2500ms out.
  private recoverIfEmpty(attempt: number): void {
    const view = this.leaf.view as any;
    const nodes = view?.renderer?.nodes;
    if (nodes && nodes.length > 0) return; // healthy
    const filePath = view?.file?.path;
    if (!filePath) return;
    if (attempt >= 3) return;
    (async () => {
      try {
        await this.leaf.setViewState({ type: "empty" });
        await this.leaf.setViewState({
          type: "localgraph",
          state: { file: filePath },
        });
        this.kickCanvas();
        setTimeout(() => {
          this.recenter();
          this.recoverIfEmpty(attempt + 1);
        }, 500 + attempt * 700);
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
