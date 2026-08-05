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
import { buildIconIndex, getBundledIcons, parseIconId, setBundledIcons } from "./icons/index";
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
import { syncColorGroupsToGraphPlugin } from "./graph-banner/color-groups";
import { GraphBannerPlaceholder } from "./graph-banner/placeholder";
import { ErrorLogger } from "./logger";
import { CustomizeIconsSettingTab } from "./settings";

export default class CustomizeIconsPlugin extends Plugin {
  settings: CustomizeIconsSettings = DEFAULT_SETTINGS;
  _explorerTimer: ReturnType<typeof setTimeout> | null = null;
  _decorating: boolean = false;
  _basesObservers: Map<Element, MutationObserver> = new Map();
  graphBannerManager: GraphBannerManager | null = null;
  errorLogger: ErrorLogger | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();

    // Persistent error logger — installs FIRST so it catches errors from all
    // other subsystem loads. Writes to `debug.log` at vault root; rotates at
    // 2 MB. See src/logger.ts.
    this.errorLogger = new ErrorLogger(this.app);
    await this.errorLogger.install();

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

    // Sync color groups into the internal graph plugin once at load.
    // Both global and local graphs pick them up. Cheap: only writes to
    // disk if something changed.
    this.app.workspace.onLayoutReady(() => {
      syncColorGroupsToGraphPlugin(this.app, this.settings);
    });

    // Graph banner subsystem — opt-in via graphBanner.enable.
    if (this.settings.graphBanner.enable) {
      // Sweep any orphan banner + placeholder nodes left by a previous plugin
      // instance or Obsidian reload. Prevents the "N stacked gears on reload"
      // bug (banners) and stale button leftovers (placeholders).
      document
        .querySelectorAll(".graph-banner-content, .graph-banner-placeholder")
        .forEach((el) => el.parentElement?.removeChild(el));
      this.graphBannerManager = new GraphBannerManager(this.settings.graphBanner.timeToRemoveLeaf);

      // In lazy mode we insert a "Show graph" button per note instead of
      // rendering the banner up front. Same event wiring; different action.
      const handleView = async (view: MarkdownView | null | undefined) => {
        if (!view || !view.file || view.file.extension !== "md") return;
        if (this.settings.graphBanner.lazyRender) {
          await this.showGraphPlaceholder(view);
        } else {
          // Eager mode preserved for users who want the old behavior.
          await this.placeGraphBanner(view);
        }
      };

      this.registerEvent(
        this.app.workspace.on("file-open", async (file: TFile | null) => {
          if (!file || file.extension !== "md") return;
          const view = this.app.workspace.getActiveViewOfType(MarkdownView);
          if (!view || view.file !== file) return;
          await handleView(view);
        }),
      );

      // Layout change: only place on the ACTIVE view. Iterating all markdown
      // leaves here causes a placement storm — the banner's own getLeaf("tab")
      // fires layout-change, which then re-enters and creates duplicate
      // banners. Background panes get their banner via active-leaf-change
      // when they come forward.
      this.registerEvent(
        this.app.workspace.on("layout-change", async () => {
          const v = this.app.workspace.getActiveViewOfType(MarkdownView);
          await handleView(v);
        }),
      );

      // Switching which pane is active also needs a re-place — a background
      // pane that came forward may never have had a banner attached.
      this.registerEvent(
        this.app.workspace.on("active-leaf-change", async (leaf) => {
          if (!leaf) return;
          const v = leaf.view as MarkdownView;
          await handleView(v);
        }),
      );

      this.app.workspace.onLayoutReady(async () => {
        for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
          const v = leaf.view as MarkdownView;
          await handleView(v);
        }
      });
    }

    new Notice("Customize Icons v1.7.10 loaded (icon+text no-wrap glue)");
  }

  onunload(): void {
    // Uninstall error logger first so it stops holding references.
    if (this.errorLogger) {
      this.errorLogger.uninstall();
      this.errorLogger = null;
    }
    // Detach graph-banner views (removes their DOM nodes)
    if (this.graphBannerManager) {
      this.graphBannerManager.detachAll();
      this.graphBannerManager = null;
    }
    // Belt-and-suspenders: nuke every .graph-banner-content still in the DOM.
    // Handles the case where previous plugin versions left orphans behind or
    // manager state got out of sync with the DOM.
    document
      .querySelectorAll(".graph-banner-content")
      .forEach((el) => el.parentElement?.removeChild(el));
    // Also sweep any placeholder buttons.
    GraphBannerPlaceholder.removeAll();
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

  async placeGraphBanner(view: MarkdownView, opts: { forceFresh?: boolean } = {}): Promise<void> {
    if (!this.graphBannerManager) return;
    const matcher = new IgnoreMatcher().add(this.settings.graphBanner.ignore);
    // Idempotent — no-op if color groups haven't changed since last sync.
    // Returns the merged group array so we can push it into the banner's
    // detached leaf directly (workspace.getLeavesOfType misses detached leaves).
    const colorGroups = syncColorGroupsToGraphPlugin(this.app, this.settings);
    await this.graphBannerManager.placeGraphView(this.app, view, matcher, {
      ...opts,
      colorGroups,
    });
  }

  /**
   * Lazy-mode entry point. Behavior by state:
   *   - Ignored path: remove both placeholder and any banner in the pane.
   *   - Banner already mounted FOR THIS FILE: leave it alone (user revealed
   *     it; a follow-up layout-change must not stomp their choice).
   *   - Banner mounted for a DIFFERENT file: detach it (previous file), then
   *     insert placeholder for the new file.
   *   - No banner: ensure placeholder is present.
   */
  async showGraphPlaceholder(view: MarkdownView): Promise<void> {
    if (!this.graphBannerManager) return;
    const paneEl = view.containerEl;
    const filePath = view.file?.path;
    if (!filePath) return;
    // Skip files matching the user's ignore list — same policy as the banner.
    const matcher = new IgnoreMatcher().add(this.settings.graphBanner.ignore);
    if (matcher.test(filePath)) {
      GraphBannerPlaceholder.removeFrom(view);
      this.graphBannerManager.detachInPane(paneEl);
      return;
    }
    // If the banner in this pane already matches this file, the user has
    // already revealed it — don't touch it. Follow-up layout-change events
    // otherwise cause the placeholder to reappear and stomp the graph.
    if (this.graphBannerManager.paneShowsFile(paneEl, filePath)) {
      GraphBannerPlaceholder.removeFrom(view);
      return;
    }
    // Banner exists but for a different file — tear it down before inserting
    // a fresh placeholder for this file.
    if (paneEl.querySelector(".graph-banner-content")) {
      this.graphBannerManager.detachInPane(paneEl);
    }
    await GraphBannerPlaceholder.ensureIn(view, () => {
      // Reveal: fire the existing placement path. forceFresh so any stale
      // banner state in the manager is rebuilt for this file specifically.
      void this.placeGraphBanner(view, { forceFresh: true });
    });
  }

  async rebuildIconBundle(): Promise<number> {
    const bundlePath = ".obsidian/plugins/customize-icons/icons-bundle.json";
    const bundle: Record<string, string> = {};
    const iconsPath = this.settings.iconPacksPath + "/customize-icons";
    try {
      const listing = await this.app.vault.adapter.list(iconsPath);
      if (listing && listing.files) {
        for (const filePath of listing.files) {
          if (!filePath.endsWith(".svg")) continue;
          const id = (filePath.split("/").pop() as string).replace(".svg", "");
          const svg = await this.app.vault.adapter.read(filePath);
          if (svg && svg.length > 50) bundle[id] = svg;
        }
      }
    } catch (e) {
      console.error("[customize-icons] rebuildIconBundle scan failed", e);
      throw e;
    }
    await this.app.vault.adapter.write(bundlePath, JSON.stringify(bundle));
    setBundledIcons(bundle);
    // Also warm live-preview cache in case the new bundle unlocked icons
    // referenced by folder assignments.
    if (this.settings.enableLivePreviewLinkIcons) await this.warmLivePreviewCache();
    return Object.keys(bundle).length;
  }
}

// Silences unused-import lint for getBundledIcons which we may reference in
// future settings/UX flows without a compile change.
void getBundledIcons;
