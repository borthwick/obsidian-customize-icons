// GraphBannerView — wraps a temporary localgraph leaf and its DOM node.
// Ported from ras0q/obsidian-graph-banner v2.3.3.

import { App, MarkdownView, WorkspaceLeaf } from "obsidian";

export class GraphBannerView {
  static readonly nodeClass = "graph-banner-content";
  static readonly overlayNodeClass = "graph-banner-overlay";

  leaf: WorkspaceLeaf;
  node: HTMLElement;
  setupLeafPromise: Promise<void>;

  constructor(app: App, timeToRemoveLeaf: number) {
    this.leaf = app.workspace.getLeaf("tab");
    this.setupLeafPromise = this.setupLeaf(timeToRemoveLeaf);
    const content = (this.leaf.view as any).containerEl.find(".view-content") as HTMLElement;
    this.node = content;
    this.setupNode();
  }

  private async setupLeaf(timeToRemoveLeaf: number): Promise<void> {
    await this.leaf.setViewState({ type: "localgraph" });
    const removeChild = () => (this.leaf.parent as any).removeChild(this.leaf);
    if (timeToRemoveLeaf > 0) {
      setTimeout(removeChild, timeToRemoveLeaf);
    } else {
      removeChild();
    }
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

  isActive(): boolean {
    return this.node.dataset.interactive === "true";
  }

  setActive(active: boolean): void {
    this.node.dataset.interactive = active ? "true" : "false";
  }

  async placeTo(view: MarkdownView): Promise<void> {
    await this.setupLeafPromise;
    await this.leaf.setViewState({
      type: "localgraph",
      state: { file: view.file?.path },
    });
    (this.leaf as any).setGroup(view.file?.path);
    const mode = view.getMode();
    const container = (view.containerEl as any).find(`.markdown-${mode}-view`) as HTMLElement | null;
    if (!container) return;
    if (this.isDescendantOf(container)) return;

    const inlineTitle = container.querySelector(".inline-title") as HTMLElement | null;
    if (!inlineTitle) return;
    const parent = inlineTitle.parentElement;
    if (!parent) throw new Error("Failed to get note header");
    parent.insertBefore(this.node, inlineTitle.nextSibling);
  }

  isDescendantOf(el: Element): boolean {
    return el.contains(this.node);
  }

  setVisibility(visible: boolean): void {
    this.node.toggleClass("hidden", !visible);
  }

  detach(): void {
    this.leaf.detach();
    this.node.removeClass(GraphBannerView.nodeClass);
  }
}
