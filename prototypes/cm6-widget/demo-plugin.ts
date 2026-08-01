// Minimal Obsidian Plugin that wires the CM6 link-icon extension with a stub
// resolver that always returns a static circle SVG. Load this as a plugin in a
// scratch vault to smoke-test the decoration behavior.

import { Plugin } from "obsidian";
import { createLinkIconExtension } from "./extension";
import { IconResolution } from "./types";

const STUB_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14">' +
  '<circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';

function stubResolve(linkpath: string): IconResolution | null {
  if (!linkpath) return null;
  return {
    svg: STUB_SVG,
    color: "#4a9eff",
    qualityClass: null,
    linkpath,
  };
}

export default class CustomizeIconsCm6Prototype extends Plugin {
  async onload(): Promise<void> {
    this.registerEditorExtension(createLinkIconExtension(stubResolve));
    console.log("Customize Icons CM6 prototype loaded");
  }

  onunload(): void {
    console.log("Customize Icons CM6 prototype unloaded");
  }
}
