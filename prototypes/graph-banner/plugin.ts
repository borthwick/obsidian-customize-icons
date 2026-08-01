// Minimal Obsidian Plugin wiring the graph-banner port.
// Load into a scratch vault to smoke-test.

import { MarkdownView, Plugin, TFile } from "obsidian";
import { DEFAULT_GRAPH_BANNER_SETTINGS, GraphBannerSettingTab, GraphBannerSettings } from "./settings";
import { GraphBannerManager } from "./banner-manager";
import { IgnoreMatcher } from "./ignore-matcher";

export default class CustomizeIconsGraphBannerPrototype extends Plugin {
  settings: GraphBannerSettings = DEFAULT_GRAPH_BANNER_SETTINGS;
  private manager: GraphBannerManager | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.manager = new GraphBannerManager(this.settings.timeToRemoveLeaf);

    this.addSettingTab(new GraphBannerSettingTab(this.app, this));
    (this.app.workspace as any).trigger("parse-style-settings");

    this.registerEvent(
      this.app.workspace.on("file-open", async (file: TFile | null) => {
        if (!file || file.extension !== "md") return;
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view || view.file !== file) return;
        await this.placeGraphView(view);
      }),
    );

    this.registerEvent(
      this.app.workspace.on("layout-change", async () => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (view) await this.placeGraphView(view);
      }),
    );

    const markdownLeaves = this.app.workspace.getLeavesOfType("markdown");
    for (const leaf of markdownLeaves) {
      await this.placeGraphView(leaf.view as MarkdownView);
    }
  }

  onunload(): void {
    if (this.manager) this.manager.detachAll();
    this.manager = null;
  }

  private async placeGraphView(view: MarkdownView): Promise<void> {
    if (!this.manager) return;
    const matcher = new IgnoreMatcher().add(this.settings.ignore);
    await this.manager.placeGraphView(this.app, view, matcher);
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_GRAPH_BANNER_SETTINGS, await this.loadData());
  }
}
