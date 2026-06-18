// Player join helpers + view persistence + color tone.
import { useEffect, useState } from "react";
import type { PlayerRow } from "@/lib/stats-att-store";

const ID_CANDIDATES = ["UID", "IDU", "Uid", "Id", "ID", "uid", "idu", "id"];
const NAME_CANDIDATES = ["Nome", "Name"];
const CLUB_CANDIDATES = ["Clube", "Club"];

export function findCol(rows: PlayerRow[], candidates: string[]): string | null {
  if (!rows.length) return null;
  const keys = Object.keys(rows[0]);
  for (const c of candidates) if (keys.includes(c)) return c;
  const lower = new Map(keys.map((k) => [k.toLowerCase(), k]));
  for (const c of candidates) { const hit = lower.get(c.toLowerCase()); if (hit) return hit; }
  return null;
}

export type JoinResult = {
  attToStats: Map<number, PlayerRow>;
  keyFor: (row: PlayerRow) => string;
  strategy: "id" | "name-club";
  warning: string | null;
  idCol: string | null;
  unmatched: { name: string; club: string }[];
  duplicates: { name: string; club: string; id?: string }[];
};

export function joinPlayers(att: PlayerRow[], stats: PlayerRow[]): JoinResult {
  const idA = findCol(att, ID_CANDIDATES);
  const idS = findCol(stats, ID_CANDIDATES);
  const nameA = findCol(att, NAME_CANDIDATES);
  const nameS = findCol(stats, NAME_CANDIDATES);
  const clubA = findCol(att, CLUB_CANDIDATES);
  const clubS = findCol(stats, CLUB_CANDIDATES);

  let warning: string | null = null;
  const attToStats = new Map<number, PlayerRow>();
  const duplicates: { name: string; club: string; id?: string }[] = [];

  const nameOf = (r: PlayerRow) => String(nameA ? r[nameA] ?? "" : "").trim();
  const clubOf = (r: PlayerRow) => String(clubA ? r[clubA] ?? "" : "").trim();

  // Try ID join
  if (idA && idS) {
    const seenA = new Map<string, number>(); const dupAList: typeof duplicates = [];
    for (let i = 0; i < att.length; i++) {
      const v = String(att[i][idA] ?? "").trim(); if (!v) continue;
      if (seenA.has(v)) dupAList.push({ name: nameOf(att[i]), club: clubOf(att[i]), id: v });
      else seenA.set(v, i);
    }
    const sMap = new Map<string, PlayerRow>(); const dupSList: typeof duplicates = [];
    for (const r of stats) {
      const v = String(r[idS] ?? "").trim(); if (!v) continue;
      if (sMap.has(v)) dupSList.push({ name: String(nameS ? r[nameS] ?? "" : "").trim(), club: String(clubS ? r[clubS] ?? "" : "").trim(), id: v });
      else sMap.set(v, r);
    }
    if (!dupAList.length && !dupSList.length) {
      const unmatched: { name: string; club: string }[] = [];
      for (let i = 0; i < att.length; i++) {
        const v = String(att[i][idA] ?? "").trim();
        const m = sMap.get(v);
        if (m) attToStats.set(i, m);
        else unmatched.push({ name: nameOf(att[i]), club: clubOf(att[i]) });
      }
      return {
        attToStats, strategy: "id", warning: null, idCol: idA, unmatched, duplicates: [],
        keyFor: (row) => `id:${String(row[idA] ?? "").trim()}`,
      };
    }
    duplicates.push(...dupAList, ...dupSList);
    warning = `Coluna ${idA}/${idS} tem ${duplicates.length} duplicado(s). A juntar por Nome+Clube.`;
  } else {
    warning = `Sem coluna UID/IDU em ${!idA && !idS ? "ambos os ficheiros" : !idA ? "Att" : "Stats"}. A juntar por Nome+Clube.`;
  }

  // Fallback: Name + Club
  const unmatched: { name: string; club: string }[] = [];
  if (nameA && nameS) {
    const sMap = new Map<string, PlayerRow>();
    for (const r of stats) {
      const k = `${String(r[nameS] ?? "").trim().toLowerCase()}|${String(clubS ? r[clubS] ?? "" : "").trim().toLowerCase()}`;
      sMap.set(k, r);
    }
    for (let i = 0; i < att.length; i++) {
      const r = att[i];
      const k = `${nameOf(r).toLowerCase()}|${clubOf(r).toLowerCase()}`;
      const m = sMap.get(k);
      if (m) attToStats.set(i, m);
      else unmatched.push({ name: nameOf(r), club: clubOf(r) });
    }
  }
  return {
    attToStats, strategy: "name-club", warning, idCol: null, unmatched, duplicates,
    keyFor: (row) => `nc:${nameOf(row)}|${clubOf(row)}`,
  };
}

export function scoreToTone(pct: number): string {
  if (pct >= 70) return "border-success/60 bg-success/10 text-success";
  if (pct >= 40) return "border-warning/60 bg-warning/10 text-warning";
  return "border-danger/60 bg-danger/10 text-danger";
}

// View prefs (per-page persistence)
export type ViewPrefs = {
  hidden: string[];
  colFilters: Record<string, { min?: string; max?: string; text?: string }>;
  sortBy: { col: string; dir: "asc" | "desc" } | null;
};

export function useViewPrefs(key: string) {
  const [prefs, setPrefs] = useState<ViewPrefs>(() => {
    if (typeof localStorage === "undefined") return { hidden: [], colFilters: {}, sortBy: null };
    try {
      const raw = localStorage.getItem(`fmdatalab_view_${key}`);
      return raw ? JSON.parse(raw) : { hidden: [], colFilters: {}, sortBy: null };
    } catch { return { hidden: [], colFilters: {}, sortBy: null }; }
  });
  useEffect(() => {
    try { localStorage.setItem(`fmdatalab_view_${key}`, JSON.stringify(prefs)); } catch {}
  }, [key, prefs]);
  return [prefs, setPrefs] as const;
}
