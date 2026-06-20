// Combined Stats+Att store: holds both uploaded files.
import { useEffect, useState } from "react";

export type PlayerRow = Record<string, string | number | null>;

const KEY_STATS = "fmdatalab_sa_stats_v1";
const KEY_ATT = "fmdatalab_sa_att_v1";
const listeners = new Set<() => void>();
let statsCache: PlayerRow[] | null = null;
let attCache: PlayerRow[] | null = null;

function emit() { listeners.forEach((l) => l()); }

export function setSAStats(rows: PlayerRow[]) {
  statsCache = rows;
  try { localStorage.setItem(KEY_STATS, JSON.stringify(rows)); } catch {}
  emit();
}
export function setSAAtt(rows: PlayerRow[]) {
  attCache = rows;
  try { localStorage.setItem(KEY_ATT, JSON.stringify(rows)); } catch {}
  emit();
}

export function getSAStats(): PlayerRow[] {
  if (statsCache) return statsCache;
  if (typeof localStorage === "undefined") return [];
  try { const raw = localStorage.getItem(KEY_STATS); statsCache = raw ? JSON.parse(raw) : []; return statsCache!; } catch { return []; }
}
export function getSAAtt(): PlayerRow[] {
  if (attCache) return attCache;
  if (typeof localStorage === "undefined") return [];
  try { const raw = localStorage.getItem(KEY_ATT); attCache = raw ? JSON.parse(raw) : []; return attCache!; } catch { return []; }
}

export function clearSAData() {
  statsCache = null;
  attCache = null;
  try { localStorage.removeItem(KEY_STATS); localStorage.removeItem(KEY_ATT); } catch {}
  // Clean up legacy sessionStorage too
  try { sessionStorage.removeItem(KEY_STATS); sessionStorage.removeItem(KEY_ATT); } catch {}
  emit();
}

// Migrate from sessionStorage (legacy) to localStorage if needed
if (typeof window !== "undefined") {
  try {
    for (const k of [KEY_STATS, KEY_ATT]) {
      if (!localStorage.getItem(k)) {
        const legacy = sessionStorage.getItem(k);
        if (legacy) localStorage.setItem(k, legacy);
      }
    }
  } catch {}
}

export function useSAData() {
  const [stats, setStats] = useState<PlayerRow[]>(() => getSAStats());
  const [att, setAtt] = useState<PlayerRow[]>(() => getSAAtt());
  useEffect(() => {
    const l = () => { setStats([...getSAStats()]); setAtt([...getSAAtt()]); };
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return { stats, att };
}

const PURE_NUM_RE = /^-?\d+(?:[.,]\d+)?$/;
export function isNumericColumn(rows: PlayerRow[], col: string): boolean {
  let hits = 0, total = 0;
  for (let i = 0; i < Math.min(rows.length, 80); i++) {
    const v = rows[i][col];
    if (v === null || v === undefined || v === "") continue;
    total++;
    if (typeof v === "number" && Number.isFinite(v)) { hits++; continue; }
    const s = String(v).trim();
    if (PURE_NUM_RE.test(s)) hits++;
  }
  return total > 0 && hits / total > 0.9;
}

// Fast percentile rank: O(n log n) using sort + run-length scan.
// pct = (countBelow + 0.5 * countEqual) / n * 100 — gives 50 to median player.
export function computePercentiles(rows: PlayerRow[], columns: string[]): Map<string, Map<number, number>> {
  const result = new Map<string, Map<number, number>>();
  for (const col of columns) {
    const values: number[] = [];
    for (const r of rows) {
      const v = r[col];
      const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
      if (!Number.isNaN(n) && Number.isFinite(n)) values.push(n);
    }
    const n = values.length;
    if (!n) continue;
    values.sort((a, b) => a - b);
    const map = new Map<number, number>();
    let i = 0;
    while (i < n) {
      let j = i;
      while (j < n && values[j] === values[i]) j++;
      const pct = ((i + (j - i) / 2) / n) * 100;
      map.set(values[i], Math.round(pct));
      i = j;
    }
    result.set(col, map);
  }
  return result;
}

export function computeNormalized(rows: PlayerRow[], columns: string[]): Map<string, Map<number, number>> {
  const result = new Map<string, Map<number, number>>();
  for (const col of columns) {
    let min = Infinity, max = -Infinity, has = false;
    const seen: number[] = [];
    for (const r of rows) {
      const v = r[col];
      const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
      if (Number.isNaN(n) || !Number.isFinite(n)) continue;
      has = true;
      if (n < min) min = n;
      if (n > max) max = n;
      seen.push(n);
    }
    if (!has) continue;
    const range = max - min;
    const map = new Map<number, number>();
    for (const v of seen) {
      if (map.has(v)) continue;
      map.set(v, range === 0 ? 100 : Math.round(((v - min) / range) * 100));
    }
    result.set(col, map);
  }
  return result;
}
