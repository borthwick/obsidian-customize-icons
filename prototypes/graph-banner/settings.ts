// Settings for the graph-banner subsystem.
// Mirrors ras0q/obsidian-graph-banner v2.3.3 (ignore + timeToRemoveLeaf).

import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type CustomizeIconsGraphBannerPrototype from "./plugin";

export interface GraphBannerSettings {
  ignore: string[];
  timeToRemoveLeaf: number;
}

export const DEFAULT_GRAPH_BANNER_SETTINGS: GraphBannerSettings = {
  ignore: [],
  timeToRemoveLeaf: 100,
};

export class GraphBannerSettingTab extends PluginSettingTab {
  plugin: CustomizeIconsGraphBannerPrototype;

  constructor(app: App, plugin: CustomizeIconsGraphBannerPrototype) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Ignored path pattern")
      .setDesc(
        "Manage notes which do not display the graph banner. This pattern follows .gitignore spec.",
      )
      .addTextArea((ta) =>
        ta
          .setPlaceholder("ignored-path.md\n/ignored-dir\n!/ignored-dir/not-ignored-path.md")
          .setValue(this.plugin.settings.ignore.join("\n"))
          .onChange(async (val) => {
            this.plugin.settings.ignore = val.split("\n");
            await this.plugin.saveData(this.plugin.settings);
          }),
      );

    new Setting(containerEl)
      .setName("Advanced: Time [ms] to remove the graph leaf for the banner")
      .setDesc(
        "This plugin temporarily creates a local graph leaf to display in the banner of the notes. " +
          'If you want to do something when the local graph opened, for example by using the "Sync Graph Settings" plugin, set this time settings. ' +
          "If set to 0ms, the leaf is immediately erased. " +
          "To reflect this setting, please reload the app.",
      )
      .addText((text) =>
        text
          .setPlaceholder("100")
          .setValue(String(this.plugin.settings.timeToRemoveLeaf))
          .onChange(async (val) => {
            const n = Number(val);
            if (val === "" || Number.isNaN(n) || n < 0) {
              new Notice("Please specify a valid number.");
            }
            this.plugin.settings.timeToRemoveLeaf = n;
            await this.plugin.saveData(this.plugin.settings);
          }),
      );
  }
}
