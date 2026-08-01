// Per-surface connectivity coloring toggles.
// Part B of Milestone 4. Designed to fold into src/settings.ts.

import { Setting } from "obsidian";

export interface ConnectivitySurfaceToggles {
  fileExplorer: boolean;
  tabs: boolean;
  title: boolean;
  links: boolean;
  bases: boolean;
}

export const DEFAULT_CONNECTIVITY_TOGGLES: ConnectivitySurfaceToggles = {
  fileExplorer: true,
  tabs: true,
  title: true,
  links: true,
  bases: true,
};

export type ConnectivitySurface = keyof ConnectivitySurfaceToggles;

export function shouldColorConnectivity(
  surface: ConnectivitySurface,
  toggles: ConnectivitySurfaceToggles,
): boolean {
  return toggles[surface] === true;
}

const SURFACE_META: Array<{
  key: ConnectivitySurface;
  name: string;
  desc: string;
}> = [
  {
    key: "fileExplorer",
    name: "Color file explorer icons",
    desc: "Apply connectivity color to icons in the left sidebar file explorer.",
  },
  {
    key: "tabs",
    name: "Color tab-bar icons",
    desc: "Apply connectivity color to icons in workspace tab headers.",
  },
  {
    key: "title",
    name: "Color note-title icon",
    desc: "Apply connectivity color to the icon above the inline note title.",
  },
  {
    key: "links",
    name: "Color inline-link icons",
    desc: "Apply connectivity color to icons on internal wikilinks in note body.",
  },
  {
    key: "bases",
    name: "Color Bases-view icons",
    desc: "Apply connectivity color to icons in Bases tables, lists, and cards.",
  },
];

export function renderConnectivityTogglesSection(
  containerEl: HTMLElement,
  get: () => ConnectivitySurfaceToggles,
  set: (t: ConnectivitySurfaceToggles) => Promise<void>,
): void {
  containerEl.createEl("h4", { text: "Apply connectivity color to..." });

  for (const meta of SURFACE_META) {
    new Setting(containerEl)
      .setName(meta.name)
      .setDesc(meta.desc)
      .addToggle((toggle) =>
        toggle.setValue(get()[meta.key]).onChange(async (val) => {
          const next = { ...get(), [meta.key]: val };
          await set(next);
        }),
      );
  }
}
