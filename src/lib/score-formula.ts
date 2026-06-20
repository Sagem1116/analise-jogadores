// Configurable scoring formulas. Persisted in localStorage.
import { useEffect, useState } from "react";

export type ScoreFormula = {
  // Att component: blend of normalized 0..100 and percentile 0..100
  attNormBlend: number;   // 0..1, default 0.6
  attPctBlend: number;    // 0..1, default 0.4 (kept explicit so user can sum != 1)
  // Stats uses only percentile (we don't have a global "max" baseline for derived stats)
  statsPctBlend: number;  // default 1.0
  // Total combine method
  totalMethod: "geomean" | "weighted";
  totalAttRatio: number;  // 0..1, only used when totalMethod === "weighted". default 0.5
  // Financial adjustment
  marketMode: "ignore" | "boost" | "discount" | "efficiency";
  marketBlend: number;    // 0..1
  wageMode: "ignore" | "boost" | "discount" | "efficiency";
  wageBlend: number;      // 0..1
};

export const DEFAULT_FORMULA: ScoreFormula = {
  attNormBlend: 0.6,
  attPctBlend: 0.4,
  statsPctBlend: 1.0,
  totalMethod: "geomean",
  totalAttRatio: 0.5,
  marketMode: "ignore",
  marketBlend: 0,
  wageMode: "ignore",
  wageBlend: 0,
};

const KEY = "fmdatalab_score_formula_v1";
const listeners = new Set<() => void>();
let cache: ScoreFormula | null = null;

function emit() { listeners.forEach((l) => l()); }

export function loadFormula(): ScoreFormula {
  if (cache) return cache;
  if (typeof localStorage === "undefined") return { ...DEFAULT_FORMULA };
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? { ...DEFAULT_FORMULA, ...JSON.parse(raw) } : { ...DEFAULT_FORMULA };
  } catch { cache = { ...DEFAULT_FORMULA }; }
  return cache!;
}

export function saveFormula(f: ScoreFormula) {
  cache = { ...f };
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch {}
  emit();
}

export function resetFormula() {
  saveFormula({ ...DEFAULT_FORMULA });
}

export function subscribeFormula(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export function useFormula(): ScoreFormula {
  const [f, setF] = useState<ScoreFormula>(() => loadFormula());
  useEffect(() => subscribeFormula(() => setF({ ...loadFormula() })), []);
  return f;
}

// Pure compute helpers — used everywhere we need scores
export function attComponent(norm: number, pct: number, f: ScoreFormula): number {
  return norm * f.attNormBlend + pct * f.attPctBlend;
}

export function combineTotal(att: number, stats: number, f: ScoreFormula): number {
  if (f.totalMethod === "weighted") {
    const r = Math.max(0, Math.min(1, f.totalAttRatio));
    return Math.round(att * r + stats * (1 - r));
  }
  return Math.round(Math.sqrt(att * stats));
}

// ── Financial helpers ──
export const MARKET_COL_CANDIDATES = ["V.P.", "VP", "Valor Estimado", "Transfer Value", "Preço", "Value", "Market Value", "Valor de Mercado"];
export const WAGE_COL_CANDIDATES = ["Salário", "Wage", "Salary", "Weekly Wage"];

export function parseMoneyValue(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const s = String(raw).replace(/[\s\u00A0]/g, " ").replace(/[€$£]/g, "").trim();
  const m = s.match(/^(-?[\d.,]+)\s*([kKmMbB]?)$/);
  if (!m) {
    // try looser pattern with comma as thousand separator
    const m2 = s.match(/^(-?[\d,]+(?:\.\d+)?)\s*([kKmMbB]?)$/);
    if (!m2) return null;
    const n2 = parseFloat(m2[1].replace(/,/g, ""));
    if (Number.isNaN(n2)) return null;
    const mult2 = m2[2] ? ({ k: 1e3, m: 1e6, b: 1e9 } as Record<string, number>)[m2[2].toLowerCase()] : 1;
    return n2 * mult2;
  }
  const n = parseFloat(m[1].replace(/,/g, ""));
  if (Number.isNaN(n)) return null;
  const mult = m[2] ? ({ k: 1e3, m: 1e6, b: 1e9 } as Record<string, number>)[m[2].toLowerCase()] : 1;
  return n * mult;
}

export function findMoneyCol(rows: Record<string, unknown>[], candidates: string[]): string | null {
  if (!rows.length) return null;
  const keys = Object.keys(rows[0]);
  for (const c of candidates) if (keys.includes(c)) return c;
  const lower = new Map(keys.map((k) => [k.toLowerCase(), k]));
  for (const c of candidates) { const hit = lower.get(c.toLowerCase()); if (hit) return hit; }
  return null;
}

export function computeMoneyPercentiles(rows: Record<string, unknown>[], col: string | null): Map<number, number> {
  const result = new Map<number, number>();
  if (!col) return result;
  const entries: { idx: number; val: number }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const v = parseMoneyValue(rows[i][col]);
    if (v !== null) entries.push({ idx: i, val: v });
  }
  const n = entries.length;
  if (!n) return result;
  entries.sort((a, b) => a.val - b.val);
  let i = 0;
  while (i < n) {
    let j = i;
    while (j < n && entries[j].val === entries[i].val) j++;
    const pct = Math.round(((i + (j - i) / 2) / n) * 100);
    for (let k = i; k < j; k++) {
      result.set(entries[k].idx, pct);
    }
    i = j;
  }
  return result;
}

export function applyFinancialAdjust(
  total: number,
  marketPct: number | null,
  wagePct: number | null,
  f: ScoreFormula
): number {
  let score = total;
  // Market
  if (f.marketMode !== "ignore" && marketPct !== null && f.marketBlend > 0) {
    const b = f.marketBlend;
    if (f.marketMode === "boost") {
      score = score + marketPct * 0.25 * b; // up to +25 pts
    } else if (f.marketMode === "discount") {
      score = score + (100 - marketPct) * 0.25 * b; // up to +25 pts for cheap
    } else if (f.marketMode === "efficiency") {
      // cheap gets boost, expensive gets penalty
      score = score * (1 + (50 - marketPct) * 0.006 * b);
    }
  }
  // Wage
  if (f.wageMode !== "ignore" && wagePct !== null && f.wageBlend > 0) {
    const b = f.wageBlend;
    if (f.wageMode === "boost") {
      score = score + wagePct * 0.20 * b;
    } else if (f.wageMode === "discount") {
      score = score + (100 - wagePct) * 0.20 * b;
    } else if (f.wageMode === "efficiency") {
      score = score * (1 + (50 - wagePct) * 0.005 * b);
    }
  }
  return Math.round(score);
}
