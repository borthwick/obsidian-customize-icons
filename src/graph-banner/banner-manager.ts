// Pool of GraphBannerView instances; finds/reclaims/creates one per MarkdownView.

import { App, MarkdownView } from "obsidian";
import { GraphBannerView } from "./banner-view";
import { IgnoreMatcher } from "./ignore-matcher";

export class GraphBannerManager {
  private graphViews: GraphBannerView[] = [];
  private timeToRemoveLeaf: number;
  // Per-pane in-flight placement lock. file-open, active-leaf-change, and
  // layout-change can all fire in rapid succession for the same pane; without
  // this lock, they race and create multiple stacked banners.
  private inFlight: Map<Element, Promise<void>> = new Map();
  // Track which file each pane's banner is showing, so if a duplicate call
  // comes in for the same file we can skip work entirely.
  private paneFile: Map<Element, string> = new Map();

  constructor(timeToRemoveLeaf: number) {
    this.timeToRemoveLeaf = timeToRemoveLeaf;
  }

  async placeGraphView(
    app: App,
    view: MarkdownView,
    ignoreMatcher: IgnoreMatcher,
    opts: { forceFresh?: boolean; colorGroups?: any[] } = {},
  ): Promise<void> {
    const filePath = view.file?.path;
    if (!filePath) return;

    const paneEl = view.containerEl;

    // If a placement is already in flight for this pane, wait for it.
    const pending = this.inFlight.get(paneEl);
    if (pending) {
      await pending;
      // If the pending placement was for the same file, we're done.
      if (this.paneFile.get(paneEl) === filePath && !opts.forceFresh) return;
    }

    // Same-file no-op unless forceFresh — avoids redundant work when
    // layout-change fires without a real file change.
    if (!opts.forceFresh && this.paneFile.get(paneEl) === filePath) return;

    const run = this.doPlace(app, view, ignoreMatcher, opts, paneEl, filePath);
    this.inFlight.set(paneEl, run);
    try {
      await run;
    } finally {
      if (this.inFlight.get(paneEl) === run) this.inFlight.delete(paneEl);
    }
  }

  private async doPlace(
    app: App,
    view: MarkdownView,
    ignoreMatcher: IgnoreMatcher,
    opts: { forceFresh?: boolean; colorGroups?: any[] },
    paneEl: Element,
    filePath: string,
  ): Promise<void> {
    const ignored = ignoreMatcher.test(filePath);

    // Try to REUSE an existing banner in this pane. If found, just retarget
    // it to the new file (setViewState + rebuildView). Cheap, non-focus-
    // stealing, and doesn't stack banners.
    const existing = this.graphViews.find((v) => v.isDescendantOf(paneEl));
    if (existing && !opts.forceFresh) {
      existing.setVisibility(!ignored);
      await existing.retargetTo(view, opts.colorGroups);
      if (opts.colorGroups) existing.applyColorGroups(opts.colorGroups);
      this.paneFile.set(paneEl, filePath);
      return;
    }

    if (opts.forceFresh && existing) {
      const staleIdx = this.graphViews.indexOf(existing);
      existing.detach();
      if (staleIdx >= 0) this.graphViews.splice(staleIdx, 1);
    }

    const bannerView = this.findAvailableGraphView(app, view);
    bannerView.setVisibility(!ignored);
    await bannerView.placeTo(view, opts.colorGroups);
    if (opts.colorGroups) bannerView.applyColorGroups(opts.colorGroups);
    this.paneFile.set(paneEl, filePath);
  }

  findAvailableGraphView(app: App, view: MarkdownView): GraphBannerView {
    const existing = this.graphViews.find((v) => v.isDescendantOf(view.containerEl));
    if (existing) return existing;

    const markdownContainers = app.workspace
      .getLeavesOfType("markdown")
      .map((l) => (l.view as any).containerEl as HTMLElement);
    for (const bannerView of this.graphViews) {
      if (!markdownContainers.some((c) => bannerView.isDescendantOf(c))) return bannerView;
    }

    const fresh = new GraphBannerView(app, this.timeToRemoveLeaf);
    this.graphViews.push(fresh);
    return fresh;
  }

  detachAll(): void {
    for (const v of this.graphViews) v.detach();
    this.graphViews = [];
    this.inFlight.clear();
    this.paneFile.clear();
  }
}
