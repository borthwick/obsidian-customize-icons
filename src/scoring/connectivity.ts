// Connectivity score: (inbound * 2) + (bidirectional * 3), penalty-folder aware.

import { App } from "obsidian";
import { CustomizeIconsSettings } from "../types";

const connectivityCache: Map<string, number> = new Map();
const state = { built: false };

export function isConnectivityBuilt(): boolean {
  return state.built;
}

export function invalidateConnectivity(): void {
  state.built = false;
}

export function getConnectivityScore(filePath: string): number {
  return connectivityCache.get(filePath) || 0;
}

export function getAllConnectivityScores(): number[] {
  return Array.from(connectivityCache.values());
}

export function getHighConnectivityPaths(threshold: number): string[] {
  const out: string[] = [];
  connectivityCache.forEach((score, path) => {
    if (score >= threshold) out.push(path);
  });
  return out;
}

export function getConnectivityCacheEntries(): Array<[string, number]> {
  return Array.from(connectivityCache.entries());
}

export function buildConnectivityScores(app: App, settings: CustomizeIconsSettings): void {
  connectivityCache.clear();
  const resolved = (app.metadataCache as any).resolvedLinks as Record<string, Record<string, number>>;
  if (!resolved) return;

  const penaltyFolders = settings.connectivityPenaltyFolders
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // Build inbound map
  const inbound: Record<string, string[]> = {};
  for (const src in resolved) {
    const links = resolved[src];
    for (const target in links) {
      if (!inbound[target]) inbound[target] = [];
      inbound[target].push(src);
    }
  }

  for (const file in resolved) {
    computeFileConnectivity(file, resolved, inbound, penaltyFolders);
  }
  for (const file in inbound) {
    if (!connectivityCache.has(file)) {
      computeFileConnectivity(file, resolved, inbound, penaltyFolders);
    }
  }
  state.built = true;
}

function computeFileConnectivity(
  file: string,
  resolved: Record<string, Record<string, number>>,
  inbound: Record<string, string[]>,
  penaltyFolders: string[],
): void {
  const ib = (inbound[file] || []).filter(
    (src) => !penaltyFolders.some((p) => src.startsWith(p)),
  );
  const outLinks = resolved[file] || {};
  const outSet = new Set(Object.keys(outLinks));
  const bidir = ib.filter((s) => outSet.has(s)).length;
  const score = ib.length * 2 + bidir * 3;
  connectivityCache.set(file, score);
}
