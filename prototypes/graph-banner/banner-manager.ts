// GraphBannerManager — tracks the pool of GraphBannerView instances and
// finds/reclaims/creates one for each MarkdownView.

import { App, MarkdownView } from "obsidian";
import { GraphBannerView } from "./banner-view";
import { IgnoreMatcher } from "./ignore-matcher";

export class GraphBannerManager {
  private graphViews: GraphBannerView[] = [];
  private timeToRemoveLeaf: number;

  constructor(timeToRemoveLeaf: number) {
    this.timeToRemoveLeaf = timeToRemoveLeaf;
  }

  async placeGraphView(app: App, view: MarkdownView, ignoreMatcher: IgnoreMatcher): Promise<void> {
    const filePath = view.file?.path;
    if (!filePath) return;
    const ignored = ignoreMatcher.test(filePath);
    const bannerView = this.findAvailableGraphView(app, view);
    bannerView.setVisibility(!ignored);
    await bannerView.placeTo(view);
  }

  findAvailableGraphView(app: App, view: MarkdownView): GraphBannerView {
    // Reuse the view already living inside this markdown container.
    const existing = this.graphViews.find((v) => v.isDescendantOf(view.containerEl));
    if (existing) return existing;

    // Reclaim any orphan whose container no longer holds a markdown view.
    const markdownContainers = app.workspace
      .getLeavesOfType("markdown")
      .map((l) => (l.view as any).containerEl as HTMLElement);
    for (const bannerView of this.graphViews) {
      if (!markdownContainers.some((c) => bannerView.isDescendantOf(c))) {
        return bannerView;
      }
    }

    const fresh = new GraphBannerView(app, this.timeToRemoveLeaf);
    this.graphViews.push(fresh);
    return fresh;
  }

  detachAll(): void {
    for (const v of this.graphViews) v.detach();
    this.graphViews = [];
  }
}
