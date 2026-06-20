// Att players store (separate from stats players).
import { useEffect, useState } from "react";

export type PlayerRow = Record<string, string | number | null>;

const KEY = "fmdatalab_att_v1";
const listeners = new Set<() => void>();
let cache: PlayerRow[] | null = null;

function emit() { listeners.forEach((l) => l()); }

export function setAttPlayers(rows: PlayerRow[]) {
  cache = rows;
  try { localStorage.setItem(KEY, JSON.stringify(rows)); } catch {}
  emit();
}

export function getAttPlayers(): PlayerRow[] {
  if (cache) return cache;
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? JSON.parse(raw) : [];
    return cache!;
  } catch { return []; }
}

export function clearAttData() {
  cache = null;
  try { localStorage.removeItem(KEY); } catch {}
  try { sessionStorage.removeItem(KEY); } catch {}
  emit();
}

if (typeof window !== "undefined") {
  try {
    if (!localStorage.getItem(KEY)) {
      const legacy = sessionStorage.getItem(KEY);
      if (legacy) localStorage.setItem(KEY, legacy);
    }
  } catch {}
}

export function useAttPlayers() {
  const [rows, setRows] = useState<PlayerRow[]>(() => getAttPlayers());
  useEffect(() => {
    const l = () => setRows([...getAttPlayers()]);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return rows;
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
