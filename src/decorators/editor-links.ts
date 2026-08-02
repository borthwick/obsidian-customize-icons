// CM6 ViewPlugin that decorates the legacy `<a class="internal-link">` DOM
// path in Live Preview.
//
// Preserved from v1.6.5: this deliberately does NOT touch CM6's own
// `.cm-hmd-internal-link` / `.cm-underline` spans. Direct DOM insertion inside
// CodeMirror 6 content spans broke the editor's rendering in v1.6.1-1.6.4
// (wikilinks fell back to raw `[[...]]` syntax after the next update). For
// icons on wikilinks in the note body, use Reading Mode.

import type CustomizeIconsPlugin from "../main";
import { resolveIconForPath } from "../icons/index";
import { insertLinkIcon } from "./reading-links";

// We reach into @codemirror/view via require to avoid an ES import that would
// bundle types we don't need. The module is marked external in esbuild.
declare const require: (id: string) => any;

export function createEditorExtension(plugin: CustomizeIconsPlugin): any {
  const cmView = require("@codemirror/view");

  return cmView.ViewPlugin.fromClass(
    class {
      view: any;
      decorations: any;
      decorateTimer: ReturnType<typeof setTimeout> | null;

      constructor(view: any) {
        this.view = view;
        this.decorations = cmView.Decoration.none;
        this.decorateTimer = null;
        this.decorateLinks();
      }

      update(update: any) {
        if (update.docChanged || update.viewportChanged || update.transactions.length > 0) {
          if (this.decorateTimer) clearTimeout(this.decorateTimer);
          this.decorateTimer = setTimeout(() => this.decorateLinks(), 100);
        }
      }

      decorateLinks() {
        if (!plugin.settings.showInLinks) return;
        // When the CM6 widget path is on, it owns Live Preview link icons.
        // Skipping here prevents doubled icons on each wikilink.
        if (plugin.settings.enableLivePreviewLinkIcons) return;
        const dom = this.view.dom as HTMLElement;
        // Only target rendered <a class="internal-link"> elements (the legacy Obsidian path).
        const links = dom.querySelectorAll("a.internal-link");
        const activeFile = plugin.app.workspace.getActiveFile();
        const sourcePath = activeFile ? activeFile.path : "";
        for (const link of Array.from(links)) {
          if (link.querySelector(".customize-icons-link-icon")) continue;
          const href = link.getAttribute("data-href");
          if (!href) continue;
          const file = plugin.app.metadataCache.getFirstLinkpathDest(href, sourcePath);
          if (!file) continue;
          const iconConfig = resolveIconForPath(file.path, plugin.settings.folderIcons);
          if (!iconConfig) continue;
          insertLinkIcon(plugin, link as HTMLElement, file.path, iconConfig, "links");
        }
      }

      destroy() {
        if (this.decorateTimer) clearTimeout(this.decorateTimer);
      }
    },
    {
      decorations: (v: any) => v.decorations,
    },
  );
}
