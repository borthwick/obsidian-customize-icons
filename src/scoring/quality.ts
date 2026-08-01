// Quality-score lookup (per-file frontmatter "Quality score" field).

import { App, TFile } from "obsidian";

const qualityCache: Map<string, number> = new Map();

export function getQualityScore(app: App, filePath: string): number | null {
  if (qualityCache.has(filePath)) return qualityCache.get(filePath) as number;
  const file = app.vault.getAbstractFileByPath(filePath);
  if (!file || !(file instanceof TFile)) return null;
  const cache = app.metadataCache.getFileCache(file);
  if (!cache || !cache.frontmatter) return null;
  const score = cache.frontmatter["Quality score"];
  if (score === undefined || score === null || score === "") return null;
  const num = parseFloat(String(score).replace(/"/g, ""));
  if (isNaN(num)) return 0; // Has field but not a number
  qualityCache.set(filePath, num);
  return num;
}

export function invalidateQualityFor(filePath: string): void {
  qualityCache.delete(filePath);
}
