// Shared types for the Customize Icons plugin.

export interface FolderIcon {
  icon: string;
  color: string;
}

export interface ConnectivitySurfaceToggles {
  fileExplorer: boolean;
  tabs: boolean;
  title: boolean;
  links: boolean;
  bases: boolean;
}

export type ConnectivitySurface = keyof ConnectivitySurfaceToggles;

export interface GraphBannerSubsettings {
  enable: boolean;
  ignore: string[];
  timeToRemoveLeaf: number;
  // When true (default), banner is not rendered on file-open. A small "Show
  // graph" button appears in the note header instead; clicking it mounts the
  // banner for that file. Reduces per-open cost on large vaults.
  lazyRender: boolean;
}

export interface CustomizeIconsSettings {
  showInTabs: boolean;
  showAboveTitle: boolean;
  enableQualityColoring: boolean;
  defaultIconColor: string;
  qualityExistsColor: string;
  qualityHighColor: string;
  qualityHighThreshold: number;
  showInLinks: boolean;
  showInEditor: boolean;
  showInBases: boolean;
  enableLivePreviewLinkIcons: boolean;
  enableConnectivityColoring: boolean;
  connectivityColor: string;
  connectivityThreshold: number;
  connectivityPenaltyFolders: string;
  connectivityToggles: ConnectivitySurfaceToggles;
  folderIcons: Record<string, FolderIcon>;
  iconPacksPath: string;
  graphBanner: GraphBannerSubsettings;
}

export type ParsedIconId =
  | { type: "emoji"; emoji: string }
  | { type: "svg"; pack: string; name: string; prefix: string };

export interface IconIndexEntry {
  id: string;
  pack: string;
  name: string;
  prefix: string;
}

export interface QualityColorInfo {
  color: string | null;
  cssClass: string | null;
  // When quality-high AND connectivity-high both apply on a surface, the
  // fill color reflects the winning signal (quality) and this holds the
  // secondary color used for the ring/halo. Null in every other case.
  ringColor?: string | null;
}

// Map from icon id (e.g. "LiRocket") to raw SVG string.
export type BundledIcons = Record<string, string> | null;

// Icon pack prefix mapping — pack folder name → 2-char prefix.
export const PACK_PREFIXES: Record<string, string> = {
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
  "boxicons-solid": "Bo",
};

export const PREFIX_TO_PACK: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const pack in PACK_PREFIXES) {
    map[PACK_PREFIXES[pack]] = pack;
  }
  // Bo alias: resolve to boxicons (solid variants live in same folder)
  map["Bo"] = "boxicons";
  return map;
})();

export const DEFAULT_CONNECTIVITY_TOGGLES: ConnectivitySurfaceToggles = {
  fileExplorer: true,
  tabs: true,
  title: true,
  links: true,
  bases: true,
};

export const DEFAULT_GRAPH_BANNER: GraphBannerSubsettings = {
  enable: false,
  ignore: [],
  timeToRemoveLeaf: 100,
  lazyRender: true,
};

export const DEFAULT_SETTINGS: CustomizeIconsSettings = {
  showInTabs: true,
  showAboveTitle: true,
  enableQualityColoring: true,
  defaultIconColor: "#878787",
  qualityExistsColor: "#4a9eff",
  qualityHighColor: "#22c55e",
  qualityHighThreshold: 7,
  showInLinks: true,
  showInEditor: true,
  showInBases: true,
  enableLivePreviewLinkIcons: false,
  enableConnectivityColoring: true,
  connectivityColor: "#e8a838",
  connectivityThreshold: 10,
  connectivityPenaltyFolders: "2. Day Planners, Templates, Week",
  connectivityToggles: DEFAULT_CONNECTIVITY_TOGGLES,
  folderIcons: {},
  iconPacksPath: ".obsidian/icons",
  graphBanner: DEFAULT_GRAPH_BANNER,
};

// Default folder icon mappings (migrated from Iconize).
export const DEFAULT_FOLDER_ICONS: Record<string, FolderIcon> = {
  "6. Readwise": { icon: "LiBookDown", color: "#878787" },
  "screenshots": { icon: "LiImage", color: "#878787" },
  "3. Evergreen & fleeting Notes": { icon: "TiNote", color: "#878787" },
  "0. Beliefs": { icon: "➰", color: "" },
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
  "0. Claims": { icon: "➰", color: "" },
  "Granola notes": { icon: "OcPeople16", color: "#878787" },
  "7. Posts": { icon: "OcPencil24", color: "#878787" },
};
