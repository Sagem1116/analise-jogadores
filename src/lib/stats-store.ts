// Simple in-memory + sessionStorage store for uploaded player data.
import { useEffect, useState } from "react";

export type PlayerRow = Record<string, string | number | null>;

const KEY = "fmdatalab_players_v1";
const listeners = new Set<() => void>();

let cache: PlayerRow[] | null = null;

function emit() { listeners.forEach((l) => l()); }

export function setPlayers(rows: PlayerRow[]) {
  cache = rows;
  try { sessionStorage.setItem(KEY, JSON.stringify(rows)); } catch {}
  emit();
}

export function getPlayers(): PlayerRow[] {
  if (cache) return cache;
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(KEY);
    cache = raw ? JSON.parse(raw) : [];
    return cache!;
  } catch { return []; }
}

export function usePlayers() {
  const [rows, setRows] = useState<PlayerRow[]>(() => getPlayers());
  useEffect(() => {
    const l = () => setRows([...getPlayers()]);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return rows;
}

// Percentile helper: for each numeric column, compute percentile (0-100) per row.
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
      // percentile = (rank / n) * 100
      const idx = sorted.findIndex((x) => x >= v);
      const pct = ((idx === -1 ? sorted.length : idx) / sorted.length) * 100;
      map.set(v, Math.round(pct));
    }
    result.set(col, map);
  }
  return result;
}

export function isNumericColumn(rows: PlayerRow[], col: string): boolean {
  let hits = 0, total = 0;
  for (let i = 0; i < Math.min(rows.length, 50); i++) {
    const v = rows[i][col];
    if (v === null || v === undefined || v === "") continue;
    total++;
    const n = typeof v === "number" ? v : parseFloat(String(v));
    if (!Number.isNaN(n) && Number.isFinite(n)) hits++;
  }
  return total > 0 && hits / total > 0.7;
}
