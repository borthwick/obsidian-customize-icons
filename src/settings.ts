// Settings tab: display toggles, quality/connectivity coloring, folder icon assignments.

import { App, Notice, PluginSettingTab, Setting, TFolder } from "obsidian";
import type CustomizeIconsPlugin from "./main";
import { ConnectivitySurface } from "./types";
import { createEmojiElement, createIconElement } from "./icons/render";
import { loadSvg, parseIconId } from "./icons/index";
import {
  buildConnectivityScores,
  getAllConnectivityScores,
  invalidateConnectivity,
} from "./scoring/connectivity";
import { IconPickerModal } from "./icon-picker-modal";

function pct(scores: number[], p: number): number {
  if (scores.length === 0) return 0;
  const idx = Math.min(scores.length - 1, Math.floor((scores.length * p) / 100));
  return scores[idx];
}

function renderConnectivityStats(
  el: HTMLElement,
  scores: number[],
  currentThreshold: number,
): void {
  if (scores.length === 0) {
    el.createEl("p", {
      text: "No connectivity scores computed — vault may have no resolved links.",
      cls: "setting-item-description",
    });
    return;
  }
  const total = scores.length;
  const nonZero = scores.filter((s) => s > 0).length;
  const max = scores[scores.length - 1];

  const summary = el.createDiv({ cls: "ci-stats-summary" });
  summary.createEl("p", {
    text: `Scored ${total.toLocaleString()} files (${nonZero.toLocaleString()} non-zero). Max score: ${max}.`,
    cls: "setting-item-description",
  });

  const grid = el.createDiv({ cls: "ci-stats-grid" });
  const percentiles: Array<[string, number]> = [
    ["Median", 50],
    ["P75", 75],
    ["P80", 80],
    ["P90", 90],
    ["P95", 95],
    ["P99", 99],
  ];
  for (const [label, p] of percentiles) {
    const row = grid.createDiv({ cls: "ci-stats-row" });
    row.createSpan({ text: label, cls: "ci-stats-label" });
    row.createSpan({ text: String(pct(scores, p)), cls: "ci-stats-val" });
  }

  el.createEl("h4", { text: "Files above threshold" });
  const table = el.createDiv({ cls: "ci-stats-thresholds" });
  const candidateThresholds = [5, 7, 9, 10, 12, 15, 20, 30, 50];
  if (!candidateThresholds.includes(currentThreshold)) candidateThresholds.push(currentThreshold);
  candidateThresholds.sort((a, b) => a - b);
  for (const t of candidateThresholds) {
    const above = scores.filter((s) => s >= t).length;
    const pctAbove = ((above * 100) / total).toFixed(1);
    const row = table.createDiv({ cls: "ci-stats-row" });
    const label = row.createSpan({
      text: `≥ ${t}${t === currentThreshold ? " (current)" : ""}`,
      cls: "ci-stats-label",
    });
    if (t === currentThreshold) label.style.fontWeight = "bold";
    row.createSpan({
      text: `${above.toLocaleString()} files (${pctAbove}%)`,
      cls: "ci-stats-val",
    });
  }
}

const CONNECTIVITY_SURFACES: Array<{
  key: ConnectivitySurface;
  name: string;
  desc: string;
}> = [
  { key: "fileExplorer", name: "  File explorer", desc: "Left-sidebar file tree" },
  { key: "tabs", name: "  Tab bar", desc: "Workspace tab headers" },
  { key: "title", name: "  Above note title", desc: "Icon above the inline title" },
  { key: "links", name: "  Inline wikilinks", desc: "Icons on [[wikilinks]] in the note body" },
  { key: "bases", name: "  Bases views", desc: "Icons in Bases tables, lists, and cards" },
];

export class CustomizeIconsSettingTab extends PluginSettingTab {
  plugin: CustomizeIconsPlugin;

  constructor(app: App, plugin: CustomizeIconsPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const el = this.containerEl;
    el.empty();
    el.createEl("h2", { text: "Customize Icons" });

    el.createEl("h3", { text: "Display" });

    new Setting(el)
      .setName("Show icon in tab bar")
      .setDesc("Display file icon in the tab header")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.showInTabs).onChange(async (val) => {
          this.plugin.settings.showInTabs = val;
          await this.plugin.saveSettings();
          this.plugin.decorateOpenTabs();
        }),
      );

    new Setting(el)
      .setName("Show icons in page body")
      .setDesc(
        "Show folder icons next to inline [[wikilinks]] in the note body (reading mode + live preview). Makes it visible at a glance which folder each linked file lives in — e.g. a red circle for elevated claims in 0. Claims/, no icon for candidates still in wiki/claims/.",
      )
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.showInLinks).onChange(async (val) => {
          this.plugin.settings.showInLinks = val;
          await this.plugin.saveSettings();
          if (val) {
            this.plugin.app.workspace.trigger("layout-change");
          } else {
            document
              .querySelectorAll(
                ".markdown-preview-view .customize-icons-link-icon, .markdown-source-view .customize-icons-link-icon",
              )
              .forEach((el) => el.remove());
          }
        }),
      );

    new Setting(el)
      .setName("Live Preview link icons (experimental)")
      .setDesc(
        "Inject folder icons on [[wikilinks]] in the editor while writing, using a proper CM6 Widget decoration. Off by default — first release opt-in.",
      )
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.enableLivePreviewLinkIcons).onChange(async (val) => {
          this.plugin.settings.enableLivePreviewLinkIcons = val;
          await this.plugin.saveSettings();
          if (val) await this.plugin.warmLivePreviewCache();
          this.plugin.app.workspace.trigger("layout-change");
          new Notice(
            val
              ? "Live Preview link icons ON — reload the editor if icons don't appear."
              : "Live Preview link icons OFF.",
          );
        }),
      );

    new Setting(el)
      .setName("Toggle icons while editing notes")
      .setDesc("Show icons in the editor (e.g., :LiSofa: rendered as an icon in your notes)")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.showInEditor).onChange(async (val) => {
          this.plugin.settings.showInEditor = val;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(el)
      .setName("Show icons in Bases views")
      .setDesc("Display file icons next to note names in Bases tables, lists, and cards")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.showInBases).onChange(async (val) => {
          this.plugin.settings.showInBases = val;
          await this.plugin.saveSettings();
          if (val) {
            this.plugin.decorateBases();
          } else {
            this.plugin._basesObservers.forEach((obs) => obs.disconnect());
            this.plugin._basesObservers.clear();
            document
              .querySelectorAll(".bases-view .customize-icons-link-icon")
              .forEach((el) => el.remove());
            document
              .querySelectorAll(".bases-view .internal-link[data-ci-processed]")
              .forEach((el) => el.removeAttribute("data-ci-processed"));
          }
        }),
      );

    new Setting(el)
      .setName("Show icon above title")
      .setDesc("Display file icon above the note title")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.showAboveTitle).onChange(async (val) => {
          this.plugin.settings.showAboveTitle = val;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(el)
      .setName("Default icon color")
      .setDesc("Default color for SVG icons")
      .addColorPicker((picker) =>
        picker.setValue(this.plugin.settings.defaultIconColor).onChange(async (val) => {
          this.plugin.settings.defaultIconColor = val;
          await this.plugin.saveSettings();
          this.plugin.decorateFileExplorer();
          this.plugin.decorateOpenTabs();
        }),
      );

    el.createEl("h3", { text: "Quality Score Coloring" });

    new Setting(el)
      .setName("Enable quality score coloring")
      .setDesc("Tint icons based on the note's Quality score frontmatter field")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.enableQualityColoring).onChange(async (val) => {
          this.plugin.settings.enableQualityColoring = val;
          await this.plugin.saveSettings();
          this.plugin.decorateFileExplorer();
          this.plugin.decorateOpenTabs();
        }),
      );

    new Setting(el)
      .setName("Quality exists color")
      .setDesc("Icon color when a Quality score exists (any value)")
      .addColorPicker((picker) =>
        picker.setValue(this.plugin.settings.qualityExistsColor).onChange(async (val) => {
          this.plugin.settings.qualityExistsColor = val;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(el)
      .setName("Quality high color")
      .setDesc("Icon color when Quality score is >= threshold")
      .addColorPicker((picker) =>
        picker.setValue(this.plugin.settings.qualityHighColor).onChange(async (val) => {
          this.plugin.settings.qualityHighColor = val;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(el)
      .setName("Quality high threshold")
      .setDesc("Score at or above which the 'high' color is used")
      .addText((text) =>
        text.setValue(String(this.plugin.settings.qualityHighThreshold)).onChange(async (val) => {
          const num = parseInt(val);
          if (!isNaN(num)) {
            this.plugin.settings.qualityHighThreshold = num;
            await this.plugin.saveSettings();
          }
        }),
      );

    el.createEl("h3", { text: "Connectivity Coloring" });

    new Setting(el)
      .setName("Enable connectivity coloring")
      .setDesc("Tint icons for notes with many inbound + bidirectional links")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.enableConnectivityColoring).onChange(async (val) => {
          this.plugin.settings.enableConnectivityColoring = val;
          await this.plugin.saveSettings();
          invalidateConnectivity();
          this.plugin.decorateFileExplorer();
          this.plugin.decorateOpenTabs();
        }),
      );

    new Setting(el)
      .setName("Connectivity color")
      .setDesc("Icon color when connectivity score meets threshold")
      .addColorPicker((picker) =>
        picker.setValue(this.plugin.settings.connectivityColor).onChange(async (val) => {
          this.plugin.settings.connectivityColor = val;
          await this.plugin.saveSettings();
          this.plugin.decorateFileExplorer();
          this.plugin.decorateOpenTabs();
        }),
      );

    new Setting(el)
      .setName("Connectivity threshold")
      .setDesc(
        "Score at or above which the high color is used. Score = (inbound links * 2) + (bidirectional links * 3). Click 'Show vault stats' below for your current vault's distribution.",
      )
      .addText((text) =>
        text.setValue(String(this.plugin.settings.connectivityThreshold)).onChange(async (val) => {
          const num = parseInt(val);
          if (!isNaN(num)) {
            this.plugin.settings.connectivityThreshold = num;
            await this.plugin.saveSettings();
            invalidateConnectivity();
          }
        }),
      );

    const statsBox = el.createDiv({ cls: "ci-connectivity-stats" });
    new Setting(el)
      .setName("Vault connectivity distribution")
      .setDesc(
        "Compute live percentiles and how many files land above common thresholds. Uses the same scoring logic as the icon coloring.",
      )
      .addButton((btn) =>
        btn
          .setButtonText("Show vault stats")
          .setCta()
          .onClick(async () => {
            btn.setDisabled(true).setButtonText("Computing...");
            try {
              statsBox.empty();
              invalidateConnectivity();
              buildConnectivityScores(this.plugin.app, this.plugin.settings);
              const scores = getAllConnectivityScores().sort((a, b) => a - b);
              renderConnectivityStats(statsBox, scores, this.plugin.settings.connectivityThreshold);
            } finally {
              btn.setDisabled(false).setButtonText("Show vault stats");
            }
          }),
      );

    new Setting(el)
      .setName("Penalty folders")
      .setDesc("Comma-separated folder names whose links don't count toward connectivity")
      .addText((text) =>
        text
          .setValue(this.plugin.settings.connectivityPenaltyFolders)
          .onChange(async (val) => {
            this.plugin.settings.connectivityPenaltyFolders = val;
            await this.plugin.saveSettings();
            invalidateConnectivity();
          }),
      );

    el.createEl("h4", { text: "Apply connectivity color to..." });
    el.createEl("p", {
      text: "Per-surface toggles let you keep connectivity coloring where it's ambient (file explorer) and drop it where it competes (note title).",
      cls: "setting-item-description",
    });

    for (const meta of CONNECTIVITY_SURFACES) {
      new Setting(el)
        .setName(meta.name)
        .setDesc(meta.desc)
        .addToggle((toggle) =>
          toggle
            .setValue(this.plugin.settings.connectivityToggles[meta.key])
            .onChange(async (val) => {
              this.plugin.settings.connectivityToggles = {
                ...this.plugin.settings.connectivityToggles,
                [meta.key]: val,
              };
              await this.plugin.saveSettings();
              this.plugin.decorateFileExplorer();
              this.plugin.decorateOpenTabs();
            }),
        );
    }

    el.createEl("h3", { text: "Graph Banner" });
    el.createEl("p", {
      text: "Display a local-graph view at the top of each note (ported from ras0q/obsidian-graph-banner). Reload the app after toggling.",
      cls: "setting-item-description",
    });

    new Setting(el)
      .setName("Enable graph banner")
      .setDesc("When on, each note gets a local-graph banner just under its title.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.graphBanner.enable).onChange(async (val) => {
          this.plugin.settings.graphBanner = { ...this.plugin.settings.graphBanner, enable: val };
          await this.plugin.saveSettings();
          new Notice("Graph banner toggled — reload the app to apply.");
        }),
      );

    new Setting(el)
      .setName("Ignored path pattern")
      .setDesc(
        "Manage notes which do not display the graph banner. This pattern follows .gitignore spec.",
      )
      .addTextArea((ta) =>
        ta
          .setPlaceholder("ignored-path.md\n/ignored-dir\n!/ignored-dir/not-ignored-path.md")
          .setValue(this.plugin.settings.graphBanner.ignore.join("\n"))
          .onChange(async (val) => {
            this.plugin.settings.graphBanner = {
              ...this.plugin.settings.graphBanner,
              ignore: val.split("\n"),
            };
            await this.plugin.saveSettings();
          }),
      );

    new Setting(el)
      .setName("Advanced: Time [ms] to remove the graph leaf for the banner")
      .setDesc(
        "This plugin temporarily creates a local graph leaf to display in the banner. If set to 0ms, the leaf is immediately erased. Reload the app to apply.",
      )
      .addText((text) =>
        text
          .setPlaceholder("100")
          .setValue(String(this.plugin.settings.graphBanner.timeToRemoveLeaf))
          .onChange(async (val) => {
            const n = Number(val);
            if (val === "" || Number.isNaN(n) || n < 0) {
              new Notice("Please specify a valid number.");
              return;
            }
            this.plugin.settings.graphBanner = {
              ...this.plugin.settings.graphBanner,
              timeToRemoveLeaf: n,
            };
            await this.plugin.saveSettings();
          }),
      );

    el.createEl("h3", { text: "Icon Library" });
    new Setting(el)
      .setName("Rebuild icon bundle")
      .setDesc(
        "Rescan .obsidian/icons/customize-icons/ and regenerate icons-bundle.json. Run this after dropping new SVGs into the icons folder (or after Dropbox syncs new icons from another machine).",
      )
      .addButton((btn) =>
        btn
          .setButtonText("Rebuild")
          .setCta()
          .onClick(async () => {
            btn.setDisabled(true).setButtonText("Rebuilding...");
            try {
              const count = await this.plugin.rebuildIconBundle();
              new Notice(`Icon bundle rebuilt (${count} icons).`);
            } catch (e) {
              new Notice("Rebuild failed — check console.");
              console.error(e);
            } finally {
              btn.setDisabled(false).setButtonText("Rebuild");
            }
          }),
      );

    el.createEl("h3", { text: "Folder Icon Assignments" });
    el.createEl("p", {
      text: "Set an icon for each folder. Files inside inherit the icon. Subfolders can override.",
      cls: "setting-item-description",
    });

    this.renderFolderList(el);
  }

  async renderFolderList(containerEl: HTMLElement): Promise<void> {
    const foldersDiv = containerEl.createDiv({ cls: "ci-folder-list" });

    // Collect folders
    const allFolders: { path: string; name: string; depth: number }[] = [];
    const rootFolder = this.app.vault.getRoot();

    const walkFolders = (folder: TFolder, depth: number): void => {
      if (folder.path === "/") {
        for (const child of folder.children || []) {
          if (child instanceof TFolder) walkFolders(child, 0);
        }
        return;
      }
      allFolders.push({ path: folder.path, name: folder.name, depth });
      for (const child of folder.children || []) {
        if (child instanceof TFolder) walkFolders(child, depth + 1);
      }
    };
    walkFolders(rootFolder, 0);

    allFolders.sort((a, b) => a.path.localeCompare(b.path));

    // Only show top-level and one level of subfolders to keep it manageable
    const displayFolders = allFolders.filter((f) => f.depth <= 1 && !f.path.startsWith("."));

    for (const folder of displayFolders) {
      const row = foldersDiv.createDiv({ cls: "ci-folder-assignment" });

      const nameEl = row.createDiv({
        cls: "ci-folder-name" + (folder.depth > 0 ? " ci-subfolder" : ""),
      });
      nameEl.textContent = folder.depth > 0 ? "  └ " + folder.name : folder.name;

      const currentIcon = this.plugin.settings.folderIcons[folder.path];
      const previewEl = row.createDiv({ cls: "ci-folder-icon-preview" });

      if (currentIcon) {
        await this.renderIconPreview(previewEl, currentIcon.icon, currentIcon.color);
      }

      // Icon input
      const iconInput = row.createEl("input", {
        type: "text",
        placeholder: "Icon ID or emoji",
        value: currentIcon ? currentIcon.icon : "",
        cls: "ci-icon-input",
      });
      iconInput.style.width = "120px";
      iconInput.style.fontSize = "12px";

      // Browse button
      const browseBtn = row.createEl("button", { text: "🔍" });
      browseBtn.style.fontSize = "14px";
      browseBtn.style.padding = "2px 6px";
      browseBtn.style.cursor = "pointer";
      browseBtn.setAttribute("title", "Browse icons");

      // Color input
      const colorInput = row.createEl("input", {
        type: "color",
        value: currentIcon
          ? currentIcon.color || this.plugin.settings.defaultIconColor
          : this.plugin.settings.defaultIconColor,
      });
      colorInput.style.width = "32px";
      colorInput.style.height = "28px";
      colorInput.style.padding = "0";
      colorInput.style.border = "none";
      colorInput.style.cursor = "pointer";

      // Clear button
      const clearBtn = row.createEl("button", { text: "✕" });
      clearBtn.style.fontSize = "11px";
      clearBtn.style.padding = "2px 6px";
      clearBtn.style.cursor = "pointer";

      const folderPath = folder.path;
      const plugin = this.plugin;
      const self = this;

      browseBtn.addEventListener("click", () => {
        const modal = new IconPickerModal(plugin.app, plugin, async (selectedIcon: string) => {
          iconInput.value = selectedIcon;
          const colorVal = colorInput.value;
          plugin.settings.folderIcons[folderPath] = { icon: selectedIcon, color: colorVal };
          await plugin.saveSettings();
          previewEl.empty();
          await self.renderIconPreview(previewEl, selectedIcon, colorVal);
          plugin.decorateFileExplorer();
          plugin.decorateOpenTabs();
        });
        modal.open();
      });

      const saveIcon = async (): Promise<void> => {
        const iconVal = iconInput.value.trim();
        const colorVal = colorInput.value;
        if (iconVal) {
          plugin.settings.folderIcons[folderPath] = { icon: iconVal, color: colorVal };
        } else {
          delete plugin.settings.folderIcons[folderPath];
        }
        await plugin.saveSettings();
        previewEl.empty();
        if (iconVal) {
          await self.renderIconPreview(previewEl, iconVal, colorVal);
        }
        plugin.decorateFileExplorer();
        plugin.decorateOpenTabs();
      };

      iconInput.addEventListener("change", saveIcon);
      colorInput.addEventListener("input", saveIcon);
      clearBtn.addEventListener("click", async () => {
        iconInput.value = "";
        delete plugin.settings.folderIcons[folderPath];
        await plugin.saveSettings();
        previewEl.empty();
        plugin.decorateFileExplorer();
        plugin.decorateOpenTabs();
      });
    }
  }

  async renderIconPreview(container: HTMLElement, iconId: string, color: string): Promise<void> {
    const parsed = parseIconId(iconId);
    if (!parsed) return;

    if (parsed.type === "emoji") {
      container.appendChild(createEmojiElement(parsed.emoji));
    } else {
      const svg = await loadSvg(
        this.app.vault.adapter,
        this.plugin.settings.iconPacksPath,
        parsed.pack,
        parsed.name,
      );
      if (svg) {
        container.appendChild(
          createIconElement(svg, color || this.plugin.settings.defaultIconColor, null),
        );
      }
    }
  }
}
