// Customize Icons — v1.6.5 baseline, modular TS.

import { MarkdownView, Notice, Plugin, TFile } from "obsidian";
import {
  BundledIcons,
  ConnectivitySurface,
  CustomizeIconsSettings,
  DEFAULT_FOLDER_ICONS,
  DEFAULT_SETTINGS,
  QualityColorInfo,
} from "./types";
import { buildIconIndex, parseIconId, setBundledIcons } from "./icons/index";
import { getQualityScore, invalidateQualityFor } from "./scoring/quality";
import {
  buildConnectivityScores,
  getConnectivityScore,
  invalidateConnectivity,
  isConnectivityBuilt,
} from "./scoring/connectivity";
import { processReadingModeLinks } from "./decorators/reading-links";
import { decorateFileExplorer } from "./decorators/file-explorer";
import { decorateOpenTabs } from "./decorators/tabs";
import { addTitleIcon } from "./decorators/title";
import { decorateBases } from "./decorators/bases";
import { createEditorExtension } from "./decorators/editor-links";
import { createLivePreviewExtension } from "./live-preview/extension";
import { warmSvg } from "./live-preview/svg-cache";
import { GraphBannerManager } from "./graph-banner/banner-manager";
import { IgnoreMatcher } from "./graph-banner/ignore-matcher";
import { CustomizeIconsSettingTab } from "./settings";

export default class CustomizeIconsPlugin extends Plugin {
  settings: CustomizeIconsSettings = DEFAULT_SETTINGS;
  _explorerTimer: ReturnType<typeof setTimeout> | null = null;
  _decorating: boolean = false;
  _basesObservers: Map<Element, MutationObserver> = new Map();
  graphBannerManager: GraphBannerManager | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();

    // Load bundled icons and expose them to icons/index.ts
    setBundledIcons(await this.loadBundledIcons());

    // If no folder icons configured, seed with defaults
    if (Object.keys(this.settings.folderIcons).length === 0) {
      this.settings.folderIcons = Object.assign({}, DEFAULT_FOLDER_ICONS);
      await this.saveSettings();
    }

    // Build icon index
    await buildIconIndex(this.app.vault.adapter, this.settings.iconPacksPath);

    // Warm SVG cache for the Live Preview widget path (sync resolver).
    if (this.settings.enableLivePreviewLinkIcons) {
      await this.warmLivePreviewCache();
    }

    // Settings tab
    this.addSettingTab(new CustomizeIconsSettingTab(this.app, this));

    // Reading mode post-processor for internal links
    this.registerMarkdownPostProcessor((el, ctx) => {
      processReadingModeLinks(this, el, ctx);
    });

    // First layout: decorate everything
    this.app.workspace.onLayoutReady(() => {
      this.decorateFileExplorer();
      this.decorateOpenTabs();
      this.decorateBases();
    });

    // Re-decorate on layout / leaf changes
    this.registerEvent(
      this.app.workspace.on("layout-change", () => {
        this.decorateOpenTabs();
        this.decorateBases();
      }),
    );

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", (leaf) => {
        this.decorateOpenTabs();
        this.addTitleIcon(leaf);
        this.decorateBases();
      }),
    );

    // Explorer re-decorate on file create/delete/rename (debounced)
    this.registerEvent(this.app.vault.on("create", () => this.debouncedDecorate()));
    this.registerEvent(this.app.vault.on("delete", () => this.debouncedDecorate()));
    this.registerEvent(this.app.vault.on("rename", () => this.debouncedDecorate()));

    // Clear quality cache on metadata change (debounced)
    this.registerEvent(
      this.app.metadataCache.on("changed", (file) => {
        invalidateQualityFor(file.path);
        invalidateConnectivity();
        this.debouncedDecorate();
      }),
    );

    // Editor extension for Live Preview:
    // - editor-links: legacy <a class="internal-link"> DOM path (safe, always on)
    // - live-preview: CM6 Widget path for wikilink tokens (opt-in via
    //   enableLivePreviewLinkIcons; the resolver returns null when disabled).
    this.registerEditorExtension([
      createEditorExtension(this),
      createLivePreviewExtension(this),
    ]);

    // Graph banner subsystem — opt-in via graphBanner.enable.
    if (this.settings.graphBanner.enable) {
      this.graphBannerManager = new GraphBannerManager(this.settings.graphBanner.timeToRemoveLeaf);

      this.registerEvent(
        this.app.workspace.on("file-open", async (file: TFile | null) => {
          if (!file || file.extension !== "md") return;
          const view = this.app.workspace.getActiveViewOfType(MarkdownView);
          if (!view || view.file !== file) return;
          await this.placeGraphBanner(view);
        }),
      );

      this.registerEvent(
        this.app.workspace.on("layout-change", async () => {
          const view = this.app.workspace.getActiveViewOfType(MarkdownView);
          if (view) await this.placeGraphBanner(view);
        }),
      );

      this.app.workspace.onLayoutReady(async () => {
        for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
          await this.placeGraphBanner(leaf.view as MarkdownView);
        }
      });
    }

    new Notice("Customize Icons v1.7.0 loaded");
  }

  onunload(): void {
    // Detach graph-banner views
    if (this.graphBannerManager) {
      this.graphBannerManager.detachAll();
      this.graphBannerManager = null;
    }
    // Disconnect Bases observers
    if (this._basesObservers) {
      this._basesObservers.forEach((obs) => obs.disconnect());
      this._basesObservers.clear();
    }
    // Clean up injected icons
    document
      .querySelectorAll(
        ".customize-icons-explorer-icon, .customize-icons-tab-icon, .customize-icons-title-icon, .customize-icons-link-icon",
      )
      .forEach((el) => el.remove());
    // Reset the dataset marker
    document
      .querySelectorAll(".internal-link[data-ci-processed]")
      .forEach((el) => el.removeAttribute("data-ci-processed"));
  }

  getQualityColorInfo(filePath: string, surface: ConnectivitySurface = "links"): QualityColorInfo {
    // Quality high overrides everything
    if (this.settings.enableQualityColoring) {
      const score = getQualityScore(this.app, filePath);
      if (score !== null && score >= this.settings.qualityHighThreshold) {
        return { color: this.settings.qualityHighColor, cssClass: "ci-quality-high" };
      }
    }

    // Connectivity (skip files in penalty folders + surfaces disabled by toggle)
    if (
      this.settings.enableConnectivityColoring &&
      this.settings.connectivityToggles[surface] !== false
    ) {
      const penaltyList = this.settings.connectivityPenaltyFolders
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const inPenalty = penaltyList.some((p) => filePath.startsWith(p));
      if (!inPenalty) {
        if (!isConnectivityBuilt()) buildConnectivityScores(this.app, this.settings);
        const conn = getConnectivityScore(filePath);
        if (conn >= this.settings.connectivityThreshold) {
          return { color: this.settings.connectivityColor, cssClass: "ci-connectivity" };
        }
      }
    }

    // Quality exists (any value)
    if (this.settings.enableQualityColoring) {
      const score = getQualityScore(this.app, filePath);
      if (score !== null) {
        return { color: this.settings.qualityExistsColor, cssClass: "ci-quality-exists" };
      }
    }

    return { color: null, cssClass: null };
  }

  // Thin instance-method wrappers so decorator modules can call plugin.decorateX()
  // matching the v1.6.5 shape.
  decorateFileExplorer(): Promise<void> {
    return decorateFileExplorer(this);
  }

  decorateOpenTabs(): Promise<void> {
    return decorateOpenTabs(this);
  }

  addTitleIcon(leaf: any): Promise<void> {
    return addTitleIcon(this, leaf);
  }

  decorateBases(): void {
    return decorateBases(this);
  }

  debouncedDecorate(): void {
    if (this._explorerTimer) clearTimeout(this._explorerTimer);
    this._explorerTimer = setTimeout(() => {
      this.decorateFileExplorer();
      this.decorateOpenTabs();
      // Clear ci-processed markers so stale links pick up the new icon/color
      document
        .querySelectorAll(".internal-link[data-ci-processed]")
        .forEach((el) => el.removeAttribute("data-ci-processed"));
      // Remove and re-inject icons inside Bases
      document
        .querySelectorAll(".bases-view .customize-icons-link-icon")
        .forEach((el) => el.remove());
      this.decorateBases();
    }, 500);
  }

  async loadBundledIcons(): Promise<BundledIcons> {
    const bundlePath = ".obsidian/plugins/customize-icons/icons-bundle.json";
    try {
      if (await this.app.vault.adapter.exists(bundlePath)) {
        const data = await this.app.vault.adapter.read(bundlePath);
        return JSON.parse(data);
      }
    } catch (e) {}

    // Fallback: scan the icons folder and build bundle
    const bundle: Record<string, string> = {};
    const iconsPath = this.settings.iconPacksPath + "/customize-icons";
    try {
      const listing = await this.app.vault.adapter.list(iconsPath);
      if (listing && listing.files) {
        for (const filePath of listing.files) {
          if (filePath.endsWith(".svg")) {
            const id = (filePath.split("/").pop() as string).replace(".svg", "");
            const svg = await this.app.vault.adapter.read(filePath);
            if (svg && svg.length > 50) bundle[id] = svg;
          }
        }
      }
    } catch (e) {}

    if (Object.keys(bundle).length > 0) {
      try {
        await this.app.vault.adapter.write(bundlePath, JSON.stringify(bundle));
      } catch (e) {}
    }
    return bundle;
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async warmLivePreviewCache(): Promise<void> {
    const seen = new Set<string>();
    for (const key in this.settings.folderIcons) {
      const parsed = parseIconId(this.settings.folderIcons[key].icon);
      if (!parsed || parsed.type !== "svg") continue;
      const dedup = parsed.pack + "/" + parsed.name;
      if (seen.has(dedup)) continue;
      seen.add(dedup);
      await warmSvg(
        this.app.vault.adapter,
        this.settings.iconPacksPath,
        parsed.pack,
        parsed.name,
      );
    }
  }

  async placeGraphBanner(view: MarkdownView): Promise<void> {
    if (!this.graphBannerManager) return;
    const matcher = new IgnoreMatcher().add(this.settings.graphBanner.ignore);
    await this.graphBannerManager.placeGraphView(this.app, view, matcher);
  }
}
