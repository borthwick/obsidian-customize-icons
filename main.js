var y = Object.defineProperty;
var V = Object.getOwnPropertyDescriptor;
var B = Object.getOwnPropertyNames;
var M = Object.prototype.hasOwnProperty;
var N = (a, i) => { for (var t in i) y(a, t, { get: i[t], enumerable: true }); };
var O = (a, i, t, e) => {
  if (i && typeof i == "object" || typeof i == "function")
    for (let n of B(i)) if (!M.call(a, n) && n !== t)
      y(a, n, { get: () => i[n], enumerable: !(e = V(i, n)) || e.enumerable });
  return a;
};
var H = (a) => O(y({}, "__esModule", { value: true }), a);
var I = {};
N(I, { default: () => CustomizeIconsPlugin });
module.exports = H(I);

var obsidian = require("obsidian");

// ─── Icon Pack Prefixes ───
var PACK_PREFIXES = {
  "lucide-icons": "Li",
  "octicons": "Oc",
  "tabler-icons": "Ti",
  "coolicons": "Co",
  "simple-icons": "Si",
  "boxicons": "Bx",
  "feather-icons": "Fe",
  "font-awesome-solid": "Fa",
  "icon-brew": "Ib",
  "remix-icons": "Ri",
  "rpg-awesome": "Rp",
  "boxicons-solid": "Bo"
};

var PREFIX_TO_PACK = {};
for (var pack in PACK_PREFIXES) {
  PREFIX_TO_PACK[PACK_PREFIXES[pack]] = pack;
}
// Bo alias: resolve to boxicons (solid variants live in same folder)
PREFIX_TO_PACK["Bo"] = "boxicons";

// ─── Default Settings ───
var DEFAULT_SETTINGS = {
  showInTabs: true,
  showAboveTitle: true,
  enableQualityColoring: true,
  defaultIconColor: "#878787",
  qualityExistsColor: "#4a9eff",
  qualityHighColor: "#22c55e",
  qualityHighThreshold: 7,
  folderIcons: {},
  iconPacksPath: ".obsidian/icons"
};

// ─── Default folder icon mappings (migrated from Iconize) ───
var DEFAULT_FOLDER_ICONS = {
  "6. Readwise": { icon: "LiBookDown", color: "#878787" },
  "screenshots": { icon: "LiImage", color: "#878787" },
  "3. Evergreen & fleeting Notes": { icon: "TiNote", color: "#878787" },
  "0. Beliefs": { icon: "\u27B0", color: "" },
  "botwick projects & model chats": { icon: "RiChatNewLine", color: "#878787" },
  "4. Meetings": { icon: "OcPeople16", color: "#878787" },
  "2. Day Planners": { icon: "LiCalendarDays", color: "" },
  "Templates": { icon: "OcProjectTemplate24", color: "#878787" },
  "Companies": { icon: "LiRocket", color: "#858585" },
  "1. Pondering": { icon: "OcLightBulb24", color: "#858585" },
  "5. People pages": { icon: "OcPerson24", color: "#858585" },
  "Drawings": { icon: "SiExcalidraw", color: "#a9b1ac" },
  "6. Readwise/Podcasts": { icon: "TiEar", color: "#878787" },
  "6. Readwise/Podcasts/Data": { icon: "LiEar", color: "#878787" },
  "6. Readwise/Books": { icon: "LiBook", color: "#878787" },
  "6. Readwise/Articles": { icon: "OcBook24", color: "#878787" },
  "6. Readwise/Tweets": { icon: "IbTwitter", color: "#878787" },
  "6. Readwise/Movies and theatre, opera": { icon: "BoBxsFilm", color: "#a7a5a5" },
  "0. Claims": { icon: "\u27B0", color: "" },
  "Granola notes": { icon: "OcPeople16", color: "#878787" },
  "7. Posts": { icon: "OcPencil24", color: "#878787" }
};

// ─── SVG Icon Cache ───
var iconCache = new Map();
var iconIndex = []; // [{id, pack, name, svg}]
var iconIndexBuilt = false;

function isEmoji(str) {
  if (!str) return false;
  // Simple check: if it's 1-4 chars and doesn't start with a letter prefix
  return str.length <= 4 && !/^[A-Z][a-z]/.test(str);
}

function parseIconId(id) {
  if (!id) return null;
  if (isEmoji(id)) return { type: "emoji", emoji: id };
  // Extract prefix (2 chars) and name
  var prefix = id.substring(0, 2);
  var name = id.substring(2);
  var pack = PREFIX_TO_PACK[prefix];
  if (!pack) return null;
  return { type: "svg", pack: pack, name: name, prefix: prefix };
}

async function loadSvg(adapter, iconsPath, pack, name) {
  // Build the full icon ID from prefix+name
  var prefix = "";
  for (var p in PREFIX_TO_PACK) {
    if (PREFIX_TO_PACK[p] === pack) { prefix = p; break; }
  }
  var iconId = prefix + name;
  if (iconCache.has(iconId)) return iconCache.get(iconId);

  // Try flat folder first (customize-icons/IconId.svg)
  var flatPath = iconsPath + "/customize-icons/" + iconId + ".svg";
  try {
    var exists = await adapter.exists(flatPath);
    if (exists) {
      var svg = await adapter.read(flatPath);
      iconCache.set(iconId, svg);
      return svg;
    }
  } catch (e) {}

  // Fallback to pack subfolder (pack/Name.svg)
  var packPath = iconsPath + "/" + pack + "/" + name + ".svg";
  try {
    var exists2 = await adapter.exists(packPath);
    if (exists2) {
      var svg2 = await adapter.read(packPath);
      iconCache.set(iconId, svg2);
      return svg2;
    }
  } catch (e) {}

  iconCache.set(iconId, null);
  return null;
}

async function buildIconIndex(adapter, iconsPath) {
  if (iconIndexBuilt) return;
  iconIndex = [];

  for (var pack in PACK_PREFIXES) {
    var prefix = PACK_PREFIXES[pack];
    var dirPath = iconsPath + "/" + pack;
    try {
      var exists = await adapter.exists(dirPath);
      if (!exists) continue;
      var files = await adapter.list(dirPath);
      if (files && files.files) {
        for (var file of files.files) {
          if (file.endsWith(".svg")) {
            var name = file.split("/").pop().replace(".svg", "");
            var id = prefix + name;
            iconIndex.push({ id: id, pack: pack, name: name, prefix: prefix });
          }
        }
      }
    } catch (e) {}
  }
  iconIndexBuilt = true;
}

function createIconElement(svgString, color, qualityClass) {
  var span = document.createElement("span");
  if (svgString) {
    span.innerHTML = svgString;
    var svg = span.querySelector("svg");
    if (svg) {
      if (color) {
        svg.style.stroke = color;
        svg.style.color = color;
      }
      if (qualityClass) svg.classList.add(qualityClass);
    }
  }
  return span;
}

function createEmojiElement(emoji) {
  var span = document.createElement("span");
  span.classList.add("ci-emoji");
  span.textContent = emoji;
  return span;
}

// ─── Resolve icon for a file path ───
function resolveIconForPath(filePath, folderIcons) {
  // Walk from most specific path to least
  var parts = filePath.split("/");
  // Remove filename
  parts.pop();

  // Try from deepest subfolder to root
  for (var i = parts.length; i > 0; i--) {
    var folderPath = parts.slice(0, i).join("/");
    if (folderIcons[folderPath]) return folderIcons[folderPath];
  }
  return null;
}

// ─── Get quality score from cache ───
var qualityCache = new Map();

function getQualityScore(app, filePath) {
  if (qualityCache.has(filePath)) return qualityCache.get(filePath);
  var file = app.vault.getAbstractFileByPath(filePath);
  if (!file || !(file instanceof obsidian.TFile)) return null;
  var cache = app.metadataCache.getFileCache(file);
  if (!cache || !cache.frontmatter) return null;
  var score = cache.frontmatter["Quality score"];
  if (score === undefined || score === null || score === "") return null;
  var num = parseFloat(String(score).replace(/"/g, ""));
  if (isNaN(num)) return 0; // Has field but not a number
  qualityCache.set(filePath, num);
  return num;
}

// ─── Main Plugin ───
var CustomizeIconsPlugin = class extends obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
    this._explorerTimer = null;
    this._decorating = false;
  }

  async onload() {
    await this.loadSettings();

    // If no folder icons configured, use defaults
    if (Object.keys(this.settings.folderIcons).length === 0) {
      this.settings.folderIcons = Object.assign({}, DEFAULT_FOLDER_ICONS);
      await this.saveSettings();
    }

    // Build icon index
    await buildIconIndex(this.app.vault.adapter, this.settings.iconPacksPath);

    // Add settings tab
    this.addSettingTab(new CustomizeIconsSettingTab(this.app, this));

    // Register reading mode post-processor for internal links
    this.registerMarkdownPostProcessor((el, ctx) => {
      this.processReadingModeLinks(el, ctx);
    });

    // Decorate file explorer
    this.app.workspace.onLayoutReady(() => {
      this.decorateFileExplorer();
      this.decorateOpenTabs();
    });

    // Re-decorate on layout changes
    this.registerEvent(this.app.workspace.on("layout-change", () => {
      this.decorateOpenTabs();
    }));

    // Re-decorate on file open
    this.registerEvent(this.app.workspace.on("active-leaf-change", (leaf) => {
      this.decorateOpenTabs();
      this.addTitleIcon(leaf);
    }));

    // Re-decorate explorer on file create/delete/rename (debounced)
    this.registerEvent(this.app.vault.on("create", () => this.debouncedDecorate()));
    this.registerEvent(this.app.vault.on("delete", () => this.debouncedDecorate()));
    this.registerEvent(this.app.vault.on("rename", () => this.debouncedDecorate()));

    // Clear quality cache on metadata change (debounced)
    this.registerEvent(this.app.metadataCache.on("changed", (file) => {
      qualityCache.delete(file.path);
      this.debouncedDecorate();
    }));

    // Register editor extension for live preview links
    this.registerEditorExtension([this.createEditorExtension()]);

    new obsidian.Notice("Customize Icons v1.1.1 loaded");
  }

  onunload() {
    // Clean up injected icons
    document.querySelectorAll(".customize-icons-explorer-icon, .customize-icons-tab-icon, .customize-icons-title-icon, .customize-icons-link-icon").forEach(el => el.remove());
  }

  // ─── Reading Mode: Decorate internal links ───
  processReadingModeLinks(el, ctx) {
    var links = el.querySelectorAll("a.internal-link");
    for (var link of links) {
      if (link.querySelector(".customize-icons-link-icon")) continue;

      var href = link.getAttribute("data-href");
      if (!href) continue;

      // Resolve the file
      var file = this.app.metadataCache.getFirstLinkpathDest(href, ctx.sourcePath || "");
      if (!file) continue;

      var iconConfig = resolveIconForPath(file.path, this.settings.folderIcons);
      if (!iconConfig) continue;

      this.insertLinkIcon(link, file.path, iconConfig);
    }
  }

  async insertLinkIcon(link, filePath, iconConfig) {
    var parsed = parseIconId(iconConfig.icon);
    if (!parsed) return;

    var span = document.createElement("span");
    span.classList.add("customize-icons-link-icon");

    var qualityInfo = this.getQualityColorInfo(filePath);

    if (parsed.type === "emoji") {
      span.appendChild(createEmojiElement(parsed.emoji));
    } else {
      var svg = await loadSvg(this.app.vault.adapter, this.settings.iconPacksPath, parsed.pack, parsed.name);
      if (!svg) return;
      var color = qualityInfo.color || iconConfig.color || this.settings.defaultIconColor;
      var iconEl = createIconElement(svg, color, qualityInfo.cssClass);
      span.appendChild(iconEl);
    }

    link.insertBefore(span, link.firstChild);
  }

  getQualityColorInfo(filePath) {
    if (!this.settings.enableQualityColoring) return { color: null, cssClass: null };
    var score = getQualityScore(this.app, filePath);
    if (score === null) return { color: null, cssClass: null };
    if (score >= this.settings.qualityHighThreshold) {
      return { color: this.settings.qualityHighColor, cssClass: "ci-quality-high" };
    }
    return { color: this.settings.qualityExistsColor, cssClass: "ci-quality-exists" };
  }

  // ─── File Explorer Decoration ───
  async decorateFileExplorer() {
    // Prevent concurrent runs
    if (this._decorating) return;
    this._decorating = true;

    // Remove old icons
    document.querySelectorAll(".customize-icons-explorer-icon").forEach(el => el.remove());

    var fileExplorer = this.app.workspace.getLeavesOfType("file-explorer")[0];
    if (!fileExplorer) { this._decorating = false; return; }

    var view = fileExplorer.view;
    if (!view || !view.fileItems) { this._decorating = false; return; }

    for (var path in view.fileItems) {
      var item = view.fileItems[path];
      if (!item || !item.selfEl) continue;

      // Get the direct title row — NOT nested descendants
      var titleRowEl = null;
      if (item.file instanceof obsidian.TFolder) {
        titleRowEl = item.selfEl.querySelector(":scope > .nav-folder-title");
      } else if (item.file instanceof obsidian.TFile) {
        titleRowEl = item.selfEl.classList.contains("nav-file-title") ? item.selfEl : item.selfEl.querySelector(":scope > .nav-file-title");
      }
      if (!titleRowEl) continue;

      var titleEl = titleRowEl.querySelector(".nav-file-title-content, .nav-folder-title-content");
      if (!titleEl) continue;

      // Skip if already has icon
      if (titleRowEl.querySelector(".customize-icons-explorer-icon")) continue;

      var iconConfig = null;

      // For folders: check if this folder itself has an icon
      if (item.file instanceof obsidian.TFolder) {
        iconConfig = this.settings.folderIcons[item.file.path];
      }
      // For files: resolve from parent folder
      else if (item.file instanceof obsidian.TFile) {
        iconConfig = resolveIconForPath(item.file.path, this.settings.folderIcons);
      }

      if (!iconConfig) continue;

      var parsed = parseIconId(iconConfig.icon);
      if (!parsed) continue;

      var span = document.createElement("span");
      span.classList.add("customize-icons-explorer-icon");

      if (parsed.type === "emoji") {
        span.appendChild(createEmojiElement(parsed.emoji));
      } else {
        var svg = await loadSvg(this.app.vault.adapter, this.settings.iconPacksPath, parsed.pack, parsed.name);
        if (!svg) continue;
        var qualityInfo = (item.file instanceof obsidian.TFile) ? this.getQualityColorInfo(item.file.path) : { color: null, cssClass: null };
        var color = qualityInfo.color || iconConfig.color || this.settings.defaultIconColor;
        span.appendChild(createIconElement(svg, color, qualityInfo.cssClass));
      }

      titleRowEl.insertBefore(span, titleEl);
    }
    this._decorating = false;
  }

  // ─── Tab Decoration ───
  async decorateOpenTabs() {
    if (!this.settings.showInTabs) return;

    // Remove old tab icons
    document.querySelectorAll(".customize-icons-tab-icon").forEach(el => el.remove());

    var leaves = this.app.workspace.getLeavesOfType("markdown");
    for (var leaf of leaves) {
      var file = leaf.view && leaf.view.file;
      if (!file) continue;

      var iconConfig = resolveIconForPath(file.path, this.settings.folderIcons);
      if (!iconConfig) continue;

      var parsed = parseIconId(iconConfig.icon);
      if (!parsed) continue;

      var tabHeader = leaf.tabHeaderEl;
      if (!tabHeader) continue;

      var titleEl = tabHeader.querySelector(".workspace-tab-header-inner-title");
      if (!titleEl) continue;

      var span = document.createElement("span");
      span.classList.add("customize-icons-tab-icon");

      if (parsed.type === "emoji") {
        span.appendChild(createEmojiElement(parsed.emoji));
      } else {
        var svg = await loadSvg(this.app.vault.adapter, this.settings.iconPacksPath, parsed.pack, parsed.name);
        if (!svg) continue;
        var qualityInfo = this.getQualityColorInfo(file.path);
        var color = qualityInfo.color || iconConfig.color || this.settings.defaultIconColor;
        span.appendChild(createIconElement(svg, color, qualityInfo.cssClass));
      }

      titleEl.parentElement.insertBefore(span, titleEl);
    }
  }

  // ─── Title Icon (above file title) ───
  async addTitleIcon(leaf) {
    // Remove old title icons
    document.querySelectorAll(".customize-icons-title-icon").forEach(el => el.remove());

    if (!this.settings.showAboveTitle) return;
    if (!leaf) return;

    var view = leaf.view;
    if (!view || !view.file) return;

    var iconConfig = resolveIconForPath(view.file.path, this.settings.folderIcons);
    if (!iconConfig) return;

    var parsed = parseIconId(iconConfig.icon);
    if (!parsed) return;

    // Find the title container
    var titleContainer = view.containerEl.querySelector(".inline-title");
    if (!titleContainer) return;

    var span = document.createElement("div");
    span.classList.add("customize-icons-title-icon");

    if (parsed.type === "emoji") {
      span.appendChild(createEmojiElement(parsed.emoji));
    } else {
      var svg = await loadSvg(this.app.vault.adapter, this.settings.iconPacksPath, parsed.pack, parsed.name);
      if (!svg) return;
      var qualityInfo = this.getQualityColorInfo(view.file.path);
      var color = qualityInfo.color || iconConfig.color || this.settings.defaultIconColor;
      span.appendChild(createIconElement(svg, color, qualityInfo.cssClass));
    }

    titleContainer.parentElement.insertBefore(span, titleContainer);
  }

  // ─── Editor Extension for Live Preview ───
  createEditorExtension() {
    var plugin = this;
    var cmView = require("@codemirror/view");

    return cmView.ViewPlugin.fromClass(class {
      constructor(view) {
        this.decorations = cmView.Decoration.none;
        this.view = view;
        this.buildDecorations();
      }

      update(update) {
        if (update.docChanged || update.viewportChanged) {
          this.buildDecorations();
        }
      }

      buildDecorations() {
        // We handle link icons via post-processor and DOM manipulation
        // This is a placeholder for future CM6 widget decorations
        this.decorations = cmView.Decoration.none;
      }
    }, {
      decorations: v => v.decorations
    });
  }

  debouncedDecorate() {
    if (this._explorerTimer) clearTimeout(this._explorerTimer);
    this._explorerTimer = setTimeout(() => {
      this.decorateFileExplorer();
      this.decorateOpenTabs();
    }, 500);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
};

// ─── Icon Picker Modal ───
var IconPickerModal = class extends obsidian.Modal {
  constructor(app, plugin, onSelect) {
    super(app);
    this.plugin = plugin;
    this.onSelect = onSelect;
    this.allIcons = [];
  }

  async onOpen() {
    var self = this;
    var contentEl = this.contentEl;
    contentEl.empty();
    contentEl.createEl("h3", { text: "Pick an Icon" });

    // Search input
    var searchInput = contentEl.createEl("input", {
      type: "text",
      placeholder: "Search icons...",
      cls: "ci-icon-picker-search"
    });
    searchInput.style.width = "100%";
    searchInput.style.marginBottom = "12px";
    searchInput.style.padding = "8px";
    searchInput.style.fontSize = "14px";

    // Emoji input row
    var emojiRow = contentEl.createDiv();
    emojiRow.style.marginBottom = "12px";
    emojiRow.style.display = "flex";
    emojiRow.style.gap = "8px";
    emojiRow.style.alignItems = "center";
    emojiRow.createEl("span", { text: "Or type emoji: " });
    var emojiInput = emojiRow.createEl("input", {
      type: "text",
      placeholder: "\u27B0",
    });
    emojiInput.style.width = "60px";
    emojiInput.style.fontSize = "18px";
    emojiInput.style.textAlign = "center";
    var emojiBtn = emojiRow.createEl("button", { text: "Use Emoji" });
    emojiBtn.addEventListener("click", function() {
      var val = emojiInput.value.trim();
      if (val) {
        self.onSelect(val);
        self.close();
      }
    });

    // Grid container
    var gridContainer = contentEl.createDiv({ cls: "ci-icon-picker-container" });

    // Load all icons from the flat folder
    var iconsPath = this.plugin.settings.iconPacksPath + "/customize-icons";
    try {
      var listing = await this.app.vault.adapter.list(iconsPath);
      if (listing && listing.files) {
        for (var filePath of listing.files) {
          if (filePath.endsWith(".svg")) {
            var fileName = filePath.split("/").pop().replace(".svg", "");
            var svgContent = await this.app.vault.adapter.read(filePath);
            if (svgContent && svgContent.length > 50) {
              this.allIcons.push({ id: fileName, svg: svgContent });
            }
          }
        }
      }
    } catch (e) {}

    this.renderGrid(gridContainer, this.allIcons);

    // Search filtering
    searchInput.addEventListener("input", function() {
      var query = searchInput.value.toLowerCase();
      var filtered = self.allIcons.filter(function(icon) {
        return icon.id.toLowerCase().includes(query);
      });
      self.renderGrid(gridContainer, filtered);
    });

    searchInput.focus();
  }

  renderGrid(container, icons) {
    var self = this;
    container.empty();

    if (icons.length === 0) {
      container.createEl("p", { text: "No icons found", cls: "setting-item-description" });
      return;
    }

    var grid = container.createDiv({ cls: "ci-icon-picker-grid" });
    for (var icon of icons) {
      var item = grid.createDiv({ cls: "ci-icon-picker-item" });
      item.setAttribute("title", icon.id);
      item.innerHTML = icon.svg;
      var svg = item.querySelector("svg");
      if (svg) {
        svg.style.width = "20px";
        svg.style.height = "20px";
        svg.style.stroke = "currentColor";
      }

      (function(iconId) {
        item.addEventListener("click", function() {
          self.onSelect(iconId);
          self.close();
        });
      })(icon.id);
    }
  }

  onClose() {
    this.contentEl.empty();
  }
};

// ─── Settings Tab ───
var CustomizeIconsSettingTab = class extends obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    var el = this.containerEl;
    el.empty();
    el.createEl("h2", { text: "Customize Icons" });

    // ─── General Settings ───
    el.createEl("h3", { text: "Display" });

    new obsidian.Setting(el)
      .setName("Show icon in tab bar")
      .setDesc("Display file icon in the tab header")
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showInTabs)
        .onChange(async (val) => {
          this.plugin.settings.showInTabs = val;
          await this.plugin.saveSettings();
          this.plugin.decorateOpenTabs();
        }));

    new obsidian.Setting(el)
      .setName("Show icon above title")
      .setDesc("Display file icon above the note title")
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showAboveTitle)
        .onChange(async (val) => {
          this.plugin.settings.showAboveTitle = val;
          await this.plugin.saveSettings();
        }));

    new obsidian.Setting(el)
      .setName("Default icon color")
      .setDesc("Default color for SVG icons")
      .addColorPicker(picker => picker
        .setValue(this.plugin.settings.defaultIconColor)
        .onChange(async (val) => {
          this.plugin.settings.defaultIconColor = val;
          await this.plugin.saveSettings();
          this.plugin.decorateFileExplorer();
          this.plugin.decorateOpenTabs();
        }));

    // ─── Quality Score Settings ───
    el.createEl("h3", { text: "Quality Score Coloring" });

    new obsidian.Setting(el)
      .setName("Enable quality score coloring")
      .setDesc("Tint icons based on the note's Quality score frontmatter field")
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enableQualityColoring)
        .onChange(async (val) => {
          this.plugin.settings.enableQualityColoring = val;
          await this.plugin.saveSettings();
          this.plugin.decorateFileExplorer();
          this.plugin.decorateOpenTabs();
        }));

    new obsidian.Setting(el)
      .setName("Quality exists color")
      .setDesc("Icon color when a Quality score exists (any value)")
      .addColorPicker(picker => picker
        .setValue(this.plugin.settings.qualityExistsColor)
        .onChange(async (val) => {
          this.plugin.settings.qualityExistsColor = val;
          await this.plugin.saveSettings();
        }));

    new obsidian.Setting(el)
      .setName("Quality high color")
      .setDesc("Icon color when Quality score is >= threshold")
      .addColorPicker(picker => picker
        .setValue(this.plugin.settings.qualityHighColor)
        .onChange(async (val) => {
          this.plugin.settings.qualityHighColor = val;
          await this.plugin.saveSettings();
        }));

    new obsidian.Setting(el)
      .setName("Quality high threshold")
      .setDesc("Score at or above which the 'high' color is used")
      .addText(text => text
        .setValue(String(this.plugin.settings.qualityHighThreshold))
        .onChange(async (val) => {
          var num = parseInt(val);
          if (!isNaN(num)) {
            this.plugin.settings.qualityHighThreshold = num;
            await this.plugin.saveSettings();
          }
        }));

    // ─── Folder Icon Assignments ───
    el.createEl("h3", { text: "Folder Icon Assignments" });
    el.createEl("p", { text: "Set an icon for each folder. Files inside inherit the icon. Subfolders can override.", cls: "setting-item-description" });

    this.renderFolderList(el);
  }

  async renderFolderList(containerEl) {
    var foldersDiv = containerEl.createDiv({ cls: "ci-folder-list" });

    // Get all folders
    var allFolders = [];
    var rootFolder = this.app.vault.getRoot();

    function walkFolders(folder, depth) {
      if (folder.path === "/") {
        for (var child of folder.children || []) {
          if (child instanceof obsidian.TFolder) {
            walkFolders(child, 0);
          }
        }
        return;
      }
      allFolders.push({ path: folder.path, name: folder.name, depth: depth });
      for (var child of folder.children || []) {
        if (child instanceof obsidian.TFolder) {
          walkFolders(child, depth + 1);
        }
      }
    }
    walkFolders(rootFolder, 0);

    // Sort by path
    allFolders.sort((a, b) => a.path.localeCompare(b.path));

    // Only show top-level and one level of subfolders to keep it manageable
    var displayFolders = allFolders.filter(f => f.depth <= 1 && !f.path.startsWith("."));

    for (var folder of displayFolders) {
      var row = foldersDiv.createDiv({ cls: "ci-folder-assignment" });

      var nameEl = row.createDiv({ cls: "ci-folder-name" + (folder.depth > 0 ? " ci-subfolder" : "") });
      nameEl.textContent = folder.depth > 0 ? "  └ " + folder.name : folder.name;

      var currentIcon = this.plugin.settings.folderIcons[folder.path];
      var previewEl = row.createDiv({ cls: "ci-folder-icon-preview" });

      if (currentIcon) {
        await this.renderIconPreview(previewEl, currentIcon.icon, currentIcon.color);
      }

      // Icon input
      var iconInput = row.createEl("input", {
        type: "text",
        placeholder: "Icon ID or emoji",
        value: currentIcon ? currentIcon.icon : "",
        cls: "ci-icon-input"
      });
      iconInput.style.width = "120px";
      iconInput.style.fontSize = "12px";

      // Browse button to open icon picker
      var browseBtn = row.createEl("button", { text: "\uD83D\uDD0D" });
      browseBtn.style.fontSize = "14px";
      browseBtn.style.padding = "2px 6px";
      browseBtn.style.cursor = "pointer";
      browseBtn.setAttribute("title", "Browse icons");

      // Color input
      var colorInput = row.createEl("input", {
        type: "color",
        value: currentIcon ? (currentIcon.color || this.plugin.settings.defaultIconColor) : this.plugin.settings.defaultIconColor
      });
      colorInput.style.width = "32px";
      colorInput.style.height = "28px";
      colorInput.style.padding = "0";
      colorInput.style.border = "none";
      colorInput.style.cursor = "pointer";

      // Clear button
      var clearBtn = row.createEl("button", { text: "✕" });
      clearBtn.style.fontSize = "11px";
      clearBtn.style.padding = "2px 6px";
      clearBtn.style.cursor = "pointer";

      // Event handlers using closures
      (function(folderPath, iInput, cInput, preview, plugin, self, bBtn) {
        // Browse button opens icon picker modal
        bBtn.addEventListener("click", function() {
          var modal = new IconPickerModal(plugin.app, plugin, async function(selectedIcon) {
            iInput.value = selectedIcon;
            var colorVal = cInput.value;
            plugin.settings.folderIcons[folderPath] = { icon: selectedIcon, color: colorVal };
            await plugin.saveSettings();
            preview.empty();
            await self.renderIconPreview(preview, selectedIcon, colorVal);
            plugin.decorateFileExplorer();
            plugin.decorateOpenTabs();
          });
          modal.open();
        });

        var saveIcon = async function() {
          var iconVal = iInput.value.trim();
          var colorVal = cInput.value;
          if (iconVal) {
            plugin.settings.folderIcons[folderPath] = { icon: iconVal, color: colorVal };
          } else {
            delete plugin.settings.folderIcons[folderPath];
          }
          await plugin.saveSettings();
          preview.empty();
          if (iconVal) {
            await self.renderIconPreview(preview, iconVal, colorVal);
          }
          plugin.decorateFileExplorer();
          plugin.decorateOpenTabs();
        };

        iInput.addEventListener("change", saveIcon);
        cInput.addEventListener("input", saveIcon);
        clearBtn.addEventListener("click", async function() {
          iInput.value = "";
          delete plugin.settings.folderIcons[folderPath];
          await plugin.saveSettings();
          preview.empty();
          plugin.decorateFileExplorer();
          plugin.decorateOpenTabs();
        });
      })(folder.path, iconInput, colorInput, previewEl, this.plugin, this, browseBtn);
    }
  }

  async renderIconPreview(container, iconId, color) {
    var parsed = parseIconId(iconId);
    if (!parsed) return;

    if (parsed.type === "emoji") {
      container.appendChild(createEmojiElement(parsed.emoji));
    } else {
      var svg = await loadSvg(this.app.vault.adapter, this.plugin.settings.iconPacksPath, parsed.pack, parsed.name);
      if (svg) {
        container.appendChild(createIconElement(svg, color || this.plugin.settings.defaultIconColor, null));
      }
    }
  }
};
