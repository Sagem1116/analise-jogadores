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
  try { sessionStorage.setItem(KEY_STATS, JSON.stringify(rows)); } catch {}
  emit();
}
export function setSAAtt(rows: PlayerRow[]) {
  attCache = rows;
  try { sessionStorage.setItem(KEY_ATT, JSON.stringify(rows)); } catch {}
  emit();
}

export function getSAStats(): PlayerRow[] {
  if (statsCache) return statsCache;
  if (typeof sessionStorage === "undefined") return [];
  try { const raw = sessionStorage.getItem(KEY_STATS); statsCache = raw ? JSON.parse(raw) : []; return statsCache!; } catch { return []; }
}
export function getSAAtt(): PlayerRow[] {
  if (attCache) return attCache;
  if (typeof sessionStorage === "undefined") return [];
  try { const raw = sessionStorage.getItem(KEY_ATT); attCache = raw ? JSON.parse(raw) : []; return attCache!; } catch { return []; }
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

export function computePercentiles(rows: PlayerRow[], columns: string[]): Map<string, Map<number, number>> {
  const result = new Map<string, Map<number, number>>();
  for (const col of columns) {
    const values: number[] = [];
    for (const r of rows) {
      const v = r[col];
      const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
      if (!Number.isNaN(n) && Number.isFinite(n)) values.push(n);
    }
    if (!values.length) continue;
    const sorted = [...values].sort((a, b) => a - b);
    const map = new Map<number, number>();
    for (const v of values) {
      const idx = sorted.findIndex((x) => x >= v);
      const pct = ((idx === -1 ? sorted.length : idx) / sorted.length) * 100;
      map.set(v, Math.round(pct));
    }
    result.set(col, map);
  }
  return result;
}

export function computeNormalized(rows: PlayerRow[], columns: string[]): Map<string, Map<number, number>> {
  const result = new Map<string, Map<number, number>>();
  for (const col of columns) {
    const values: number[] = [];
    for (const r of rows) {
      const v = r[col];
      const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
      if (!Number.isNaN(n) && Number.isFinite(n)) values.push(n);
    }
    if (!values.length) continue;
    const min = Math.min(...values), max = Math.max(...values);
    const range = max - min;
    const map = new Map<number, number>();
    for (const v of values) {
      map.set(v, range === 0 ? 100 : Math.round(((v - min) / range) * 100));
    }
    result.set(col, map);
  }
  return result;
}
