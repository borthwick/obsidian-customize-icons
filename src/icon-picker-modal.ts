// Icon picker modal — search + emoji entry + grid of bundled icons.

import { App, Modal } from "obsidian";
import type CustomizeIconsPlugin from "./main";
import { getBundledIcons } from "./icons/index";

type IconEntry = { id: string; svg: string };

export class IconPickerModal extends Modal {
  plugin: CustomizeIconsPlugin;
  onSelect: (id: string) => void;
  allIcons: IconEntry[];

  constructor(app: App, plugin: CustomizeIconsPlugin, onSelect: (id: string) => void) {
    super(app);
    this.plugin = plugin;
    this.onSelect = onSelect;
    this.allIcons = [];
  }

  async onOpen(): Promise<void> {
    const contentEl = this.contentEl;
    contentEl.empty();
    contentEl.createEl("h3", { text: "Pick an Icon" });

    // Search input
    const searchInput = contentEl.createEl("input", {
      type: "text",
      placeholder: "Search icons...",
      cls: "ci-icon-picker-search",
    });
    searchInput.style.width = "100%";
    searchInput.style.marginBottom = "12px";
    searchInput.style.padding = "8px";
    searchInput.style.fontSize = "14px";

    // Emoji input row
    const emojiRow = contentEl.createDiv();
    emojiRow.style.marginBottom = "12px";
    emojiRow.style.display = "flex";
    emojiRow.style.gap = "8px";
    emojiRow.style.alignItems = "center";
    emojiRow.createEl("span", { text: "Or type emoji: " });
    const emojiInput = emojiRow.createEl("input", {
      type: "text",
      placeholder: "➰",
    });
    emojiInput.style.width = "60px";
    emojiInput.style.fontSize = "18px";
    emojiInput.style.textAlign = "center";
    const emojiBtn = emojiRow.createEl("button", { text: "Use Emoji" });
    emojiBtn.addEventListener("click", () => {
      const val = emojiInput.value.trim();
      if (val) {
        this.onSelect(val);
        this.close();
      }
    });

    // Grid container
    const gridContainer = contentEl.createDiv({ cls: "ci-icon-picker-container" });

    // Load icons from bundle first, then folder as fallback
    const bundled = getBundledIcons();
    if (bundled) {
      for (const id in bundled) {
        this.allIcons.push({ id, svg: bundled[id] });
      }
    } else {
      const iconsPath = this.plugin.settings.iconPacksPath + "/customize-icons";
      try {
        const listing = await this.app.vault.adapter.list(iconsPath);
        if (listing && listing.files) {
          for (const filePath of listing.files) {
            if (filePath.endsWith(".svg")) {
              const fileName = (filePath.split("/").pop() as string).replace(".svg", "");
              const svgContent = await this.app.vault.adapter.read(filePath);
              if (svgContent && svgContent.length > 50) {
                this.allIcons.push({ id: fileName, svg: svgContent });
              }
            }
          }
        }
      } catch (e) {}
    }

    this.renderGrid(gridContainer, this.allIcons);

    // Search filtering
    searchInput.addEventListener("input", () => {
      const query = searchInput.value.toLowerCase();
      const filtered = this.allIcons.filter((icon) => icon.id.toLowerCase().includes(query));
      this.renderGrid(gridContainer, filtered);
    });

    searchInput.focus();
  }

  renderGrid(container: HTMLElement, icons: IconEntry[]): void {
    container.empty();

    if (icons.length === 0) {
      container.createEl("p", { text: "No icons found", cls: "setting-item-description" });
      return;
    }

    const grid = container.createDiv({ cls: "ci-icon-picker-grid" });
    for (const icon of icons) {
      const item = grid.createDiv({ cls: "ci-icon-picker-item" });
      item.setAttribute("title", icon.id);
      item.innerHTML = icon.svg;
      const svg = item.querySelector("svg");
      if (svg) {
        (svg as SVGElement).style.width = "20px";
        (svg as SVGElement).style.height = "20px";
        (svg as SVGElement).style.stroke = "currentColor";
      }

      const iconId = icon.id;
      item.addEventListener("click", () => {
        this.onSelect(iconId);
        this.close();
      });
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
