import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { useEffect, useMemo, useState } from "react";
import { Copy, Download, Eye, Filter, Percent, Settings2, Search, ChevronUp, ChevronDown, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useSAData, isNumericColumn, computePercentiles, computeNormalized } from "@/lib/stats-att-store";
import { ALL_ROLES, loadWeightsSync, fetchWeightsFromDB, subscribeWeights, type AllRoleWeights } from "@/lib/roles";
import { loadAttWeightsSync, fetchAttWeightsFromDB, subscribeAttWeights, type AllAttWeights } from "@/lib/att-roles";
import { joinPlayers, scoreToTone } from "@/lib/player-join";

export const Route = createFileRoute("/stats-att/table")({
  head: () => ({ meta: [{ title: "Stats+Att Table | FMDataLab" }] }),
  component: SATable,
});

const STATS_PREFIX = "Stats: ";
const RAW_ONLY = new Set([
  "IDU", "Nome", "Posição", "Posição Sec.", "Idade", "Altura", "Peso", "Inf",
  "Clube", "Divisão", "Nac", "2ª Nac", "Internacionalizações", "Golos",
  "Personalidade", "Relação com Imprensa", "Salário", "Valor Estimado",
  "Pé Esquerdo", "Pé Direito", "Prós", "Contras",
  "UID", "Name", "Age", "Wage", "Transfer Value", "Starts", "Minutes Played",
]);
const MONEY_COLS = new Set(["Salário", "Valor Estimado", "Wage", "Transfer Value", "Stats: Wage", "Stats: Transfer Value"]);
const PER_PAGE = 15;
const VIEW_KEY = "fmdatalab_view_sa";

function parseMoney(raw: unknown): [number, number] | null {
  if (raw == null || raw === "") return null;
  const s = String(raw).replace(/\u00A0/g, " ");
  const re = /(-?\d[\d.,]*)\s*([kKmMbB])?/g;
  const nums: number[] = []; let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    const n = parseFloat(m[1].replace(/,/g, ""));
    if (Number.isNaN(n)) continue;
    const mult = m[2] ? ({ k: 1e3, m: 1e6, b: 1e9 } as Record<string, number>)[m[2].toLowerCase()] : 1;
    nums.push(n * mult);
  }
  if (!nums.length) return null;
  return [Math.min(...nums), Math.max(...nums)];
}

function formatNum(n: number): string {
  if (Math.abs(n) >= 1000) return n.toLocaleString();
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

type ViewState = {
  hidden: string[];
  colFilters: Record<string, { min?: string; max?: string; text?: string }>;
  sortBy: { col: string; dir: "asc" | "desc" } | null;
};
function loadView(): ViewState {
  if (typeof localStorage === "undefined") return { hidden: [], colFilters: {}, sortBy: null };
  try { return JSON.parse(localStorage.getItem(VIEW_KEY) || "null") ?? { hidden: [], colFilters: {}, sortBy: null }; }
  catch { return { hidden: [], colFilters: {}, sortBy: null }; }
}

function SATable() {
  const { stats, att } = useSAData();
  const navigate = useNavigate();
  const players = att;
  const initView = loadView();
  const [search, setSearch] = useState("");
  const [showPercentiles, setShowPercentiles] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [viewOpen, setViewOpen] = useState(false);
  const [roleSelectOpen, setRoleSelectOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<ViewState["sortBy"]>(initView.sortBy);
  const [page, setPage] = useState(1);
  const [colFilters, setColFilters] = useState<ViewState["colFilters"]>(initView.colFilters || {});
  const [hidden, setHidden] = useState<Set<string>>(() => new Set(initView.hidden || []));
  const [sWeights, setSWeights] = useState<AllRoleWeights>(() => loadWeightsSync());
  const [aWeights, setAWeights] = useState<AllAttWeights>(() => loadAttWeightsSync());

  // Persist view prefs
  useEffect(() => {
    try { localStorage.setItem(VIEW_KEY, JSON.stringify({ hidden: [...hidden], colFilters, sortBy })); } catch {}
  }, [hidden, colFilters, sortBy]);

  useEffect(() => {
    fetchWeightsFromDB().then(setSWeights).catch(() => {});
    fetchAttWeightsFromDB().then(setAWeights).catch(() => {});
    const u1 = subscribeWeights(() => setSWeights(loadWeightsSync()));
    const u2 = subscribeAttWeights(() => setAWeights(loadAttWeightsSync()));
    return () => { u1(); u2(); };
  }, []);

  // Join players (UID first, fallback name+club). Warn user once.
  const join = useMemo(() => joinPlayers(att, stats), [att, stats]);
  useEffect(() => {
    if (!att.length || !stats.length) return;
    if (join.warning) toast.warning(join.warning, { duration: 6000, id: "sa-join-warn" });
    else if (join.strategy === "id") toast.success(`Jogadores unidos por ${join.idCol}`, { duration: 3000, id: "sa-join-ok" });
  }, [join, att.length, stats.length]);

  const attCols = useMemo(() => (players[0] ? Object.keys(players[0]) : []), [players]);
  const nameCol = useMemo(() => attCols.find((c) => c === "Nome" || c === "Name") ?? attCols[0] ?? "", [attCols]);
  const attNumeric = useMemo(() => new Set(attCols.filter((c) => isNumericColumn(players, c))), [attCols, players]);
  const attPercentiles = useMemo(() => computePercentiles(players, [...attNumeric]), [players, attNumeric]);
  const attNormalized = useMemo(() => computeNormalized(players, [...attNumeric]), [players, attNumeric]);

  // Stats columns (raw names) + numeric + percentiles (shared)
  const statsCols = useMemo(() => (stats[0] ? Object.keys(stats[0]) : []), [stats]);
  const statsNumeric = useMemo(() => new Set(statsCols.filter((c) => isNumericColumn(stats, c))), [statsCols, stats]);
  const statsPercentiles = useMemo(() => computePercentiles(stats, [...statsNumeric]), [stats, statsNumeric]);

  // Prefixed stats columns shown in the table
  const statsColsPrefixed = useMemo(() => statsCols.map((c) => `${STATS_PREFIX}${c}`), [statsCols]);

  // All columns union for visibility toggle
  const allColumns = useMemo(() => [...attCols, ...statsColsPrefixed], [attCols, statsColsPrefixed]);

  const filterSuggestions = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const c of attCols) {
      if (attNumeric.has(c)) continue;
      const set = new Set<string>();
      for (let i = 0; i < players.length && set.size < 200; i++) {
        const v = players[i][c]; if (v != null && v !== "") set.add(String(v));
      }
      map.set(c, [...set].sort());
    }
    return map;
  }, [players, attCols, attNumeric]);

  const visibleCols = useMemo(() => allColumns.filter((c) => !hidden.has(c)), [allColumns, hidden]);
  const visibleAtt = visibleCols.filter((c) => !c.startsWith(STATS_PREFIX));
  const visibleStats = visibleCols.filter((c) => c.startsWith(STATS_PREFIX));
  const nameIdx = visibleAtt.indexOf(nameCol);
  const attBefore = nameIdx >= 0 ? visibleAtt.slice(0, nameIdx + 1) : [];
  const attAfter = nameIdx >= 0 ? visibleAtt.slice(nameIdx + 1) : visibleAtt;

  const roleColumns = useMemo(() => {
    const out: { key: string; label: string; kind: "att" | "stats" | "total"; role: string }[] = [];
    for (const r of selectedRoles) {
      out.push({ key: `__att__${r}`, label: `Att (${r})`, kind: "att", role: r });
      out.push({ key: `__stats__${r}`, label: `Stats (${r})`, kind: "stats", role: r });
      out.push({ key: `__total__${r}`, label: `Total (${r})`, kind: "total", role: r });
    }
    return out;
  }, [selectedRoles]);

  // Compute scores per row using join
  const roleScores = useMemo(() => {
    const result = new Map<number, Record<string, number>>();
    if (!selectedRoles.length || !players.length) return result;
    for (let idx = 0; idx < players.length; idx++) {
      const p = players[idx];
      const statsRow = join.attToStats.get(idx);
      const scores: Record<string, number> = {};
      for (const role of selectedRoles) {
        const aw = aWeights[role] || {};
        let aSum = 0, aTot = 0;
        for (const stat in aw) {
          const info = aw[stat];
          const pctMap = attPercentiles.get(stat); const normMap = attNormalized.get(stat);
          if (!pctMap || !normMap) continue;
          const v = p[stat]; const num = typeof v === "number" ? v : parseFloat(String(v ?? ""));
          if (Number.isNaN(num)) continue;
          let pct = pctMap.get(num) ?? 0; let norm = normMap.get(num) ?? 0;
          if (info.invert) { pct = 100 - pct; norm = 100 - norm; }
          aSum += (norm * 0.6 + pct * 0.4) * info.weight; aTot += info.weight;
        }
        const attScore = aTot ? Math.round(aSum / aTot) : 0;
        const sw = sWeights[role] || {};
        let sSum = 0, sTot = 0;
        if (statsRow) {
          for (const stat in sw) {
            const info = sw[stat];
            const pctMap = statsPercentiles.get(stat); if (!pctMap) continue;
            const v = statsRow[stat]; const num = typeof v === "number" ? v : parseFloat(String(v ?? ""));
            if (Number.isNaN(num)) continue;
            let pct = pctMap.get(num) ?? 0;
            if (info.invert) pct = 100 - pct;
            sSum += pct * info.weight; sTot += info.weight;
          }
        }
        const statsScore = sTot ? Math.round(sSum / sTot) : 0;
        const total = Math.round(Math.sqrt(attScore * statsScore));
        scores[`__att__${role}`] = attScore;
        scores[`__stats__${role}`] = statsScore;
        scores[`__total__${role}`] = total;
      }
      result.set(idx, scores);
    }
    return result;
  }, [players, selectedRoles, aWeights, sWeights, attPercentiles, attNormalized, statsPercentiles, join]);

  const roleKeys = useMemo(() => new Set(roleColumns.map((c) => c.key)), [roleColumns]);

  // Get cell value for any column (att raw, stats prefixed, role-score)
  function cellValue(rowIdx: number, p: any, col: string): any {
    if (roleKeys.has(col)) return roleScores.get(rowIdx)?.[col] ?? 0;
    if (col.startsWith(STATS_PREFIX)) {
      const sr = join.attToStats.get(rowIdx);
      return sr ? sr[col.slice(STATS_PREFIX.length)] : null;
    }
    return p[col];
  }

  const filtered = useMemo(() => {
    if (!players.length) return [] as { p: any; i: number }[];
    const q = search.toLowerCase().trim();
    const entries = Object.entries(colFilters).filter(([, f]) =>
      f && ((f.text && f.text.trim()) || (f.min !== undefined && f.min !== "") || (f.max !== undefined && f.max !== ""))
    );
    const out: { p: any; i: number }[] = [];
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (q && !String(p[nameCol] ?? "").toLowerCase().includes(q)) continue;
      let ok = true;
      for (const [col, f] of entries) {
        const isMoney = MONEY_COLS.has(col);
        const rawVal = cellValue(i, p, col);
        if (f.text && f.text.trim()) {
          if (!String(rawVal ?? "").toLowerCase().includes(f.text.toLowerCase())) { ok = false; break; }
        }
        if (f.min !== undefined && f.min !== "") {
          const minF = parseFloat(f.min);
          if (isMoney) { const rng = parseMoney(rawVal); if (!rng || rng[1] < minF) { ok = false; break; } }
          else { const n = typeof rawVal === "number" ? rawVal : parseFloat(String(rawVal ?? "")); if (Number.isNaN(n) || n < minF) { ok = false; break; } }
        }
        if (f.max !== undefined && f.max !== "") {
          const maxF = parseFloat(f.max);
          if (isMoney) { const rng = parseMoney(rawVal); if (!rng || rng[0] > maxF) { ok = false; break; } }
          else { const n = typeof rawVal === "number" ? rawVal : parseFloat(String(rawVal ?? "")); if (Number.isNaN(n) || n > maxF) { ok = false; break; } }
        }
      }
      if (ok) out.push({ p, i });
    }
    if (sortBy) {
      const { col, dir } = sortBy;
      const sign = dir === "asc" ? 1 : -1;
      out.sort((a, b) => {
        const av = cellValue(a.i, a.p, col);
        const bv = cellValue(b.i, b.p, col);
        const an = typeof av === "number" ? av : parseFloat(String(av ?? ""));
        const bn = typeof bv === "number" ? bv : parseFloat(String(bv ?? ""));
        if (!Number.isNaN(an) && !Number.isNaN(bn)) return (an - bn) * sign;
        return String(av ?? "").localeCompare(String(bv ?? "")) * sign;
      });
    }
    return out;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players, search, colFilters, sortBy, roleScores, roleKeys, nameCol, join]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageRows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  useEffect(() => { setPage(1); }, [search, colFilters, sortBy]);

  function exportExcel() {
    const data = filtered.map(({ p, i }) => {
      const row: Record<string, any> = {};
      for (const c of attBefore) row[c] = p[c];
      for (const rc of roleColumns) row[rc.label] = roleScores.get(i)?.[rc.key] ?? 0;
      for (const c of attAfter) row[c] = p[c];
      for (const c of visibleStats) row[c] = cellValue(i, p, c);
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stats+Att");
    XLSX.writeFile(wb, "fmdatalab-stats-att.xlsx");
  }

  function toggleSort(col: string) {
    setSortBy((s) => s?.col === col ? (s.dir === "desc" ? { col, dir: "asc" } : null) : { col, dir: "desc" });
  }

  function goToPlayer(p: any) {
    const k = join.keyFor(p);
    navigate({ to: "/stats-att/player/$key", params: { key: encodeURIComponent(k) } });
  }

  if (!players.length || !stats.length) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <main className="mx-auto max-w-[1200px] px-6 py-20 text-center">
          <p className="text-muted-foreground">Faltam dados. Faça upload dos dois ficheiros primeiro.</p>
          <Link to="/stats-att" className="mt-4 inline-block rounded bg-primary px-4 py-2 text-sm font-medium">Ir para upload</Link>
        </main>
      </div>
    );
  }

  const renderHeaderCell = (c: string, sticky = false) => {
    const isStats = c.startsWith(STATS_PREFIX);
    return (
      <th key={c} className={`px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap border-r border-border/40 ${sticky ? "sticky left-0 z-30 bg-gradient-to-r from-[oklch(0.22_0.05_290)] to-[oklch(0.2_0.04_285)] shadow-[2px_0_8px_oklch(0_0_0/0.4)]" : isStats ? "bg-[oklch(0.2_0.06_200)]" : "bg-[oklch(0.2_0.04_285)]"}`}>
        <button onClick={() => toggleSort(c)} className="inline-flex items-center gap-1 hover:text-primary">
          {c}
          {sortBy?.col === c && (sortBy.dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
        </button>
      </th>
    );
  };

  const renderFilterCell = (c: string, sticky = false) => {
    const baseCol = c.startsWith(STATS_PREFIX) ? c.slice(STATS_PREFIX.length) : c;
    const isNum = c.startsWith(STATS_PREFIX) ? statsNumeric.has(baseCol) : attNumeric.has(c);
    const isMoney = MONEY_COLS.has(c) || MONEY_COLS.has(baseCol);
    const listId = `dl-${c.replace(/\s+|:/g, "-")}`;
    return (
      <th key={c} className={`px-2 py-1.5 border-r border-border/40 ${sticky ? "sticky left-0 z-30 bg-[oklch(0.17_0.03_285)] shadow-[2px_0_8px_oklch(0_0_0/0.4)]" : "bg-[oklch(0.17_0.03_285)]"}`}>
        {isNum || isMoney ? (
          <div className="flex gap-1">
            <input type="number" placeholder={isMoney ? "Min €" : "Min"} className={`${isMoney ? "w-20" : "w-14"} rounded border border-border/60 bg-input px-1.5 py-1 text-xs`}
              value={colFilters[c]?.min ?? ""} onChange={(e) => setColFilters({ ...colFilters, [c]: { ...colFilters[c], min: e.target.value } })} />
            <input type="number" placeholder={isMoney ? "Max €" : "Max"} className={`${isMoney ? "w-20" : "w-14"} rounded border border-border/60 bg-input px-1.5 py-1 text-xs`}
              value={colFilters[c]?.max ?? ""} onChange={(e) => setColFilters({ ...colFilters, [c]: { ...colFilters[c], max: e.target.value } })} />
          </div>
        ) : (
          <>
            <input list={listId} placeholder="Filtrar..." className="w-full min-w-[100px] rounded border border-border/60 bg-input px-2 py-1 text-xs"
              value={colFilters[c]?.text ?? ""} onChange={(e) => setColFilters({ ...colFilters, [c]: { ...colFilters[c], text: e.target.value } })} />
            <datalist id={listId}>{(filterSuggestions.get(c) ?? []).map((v) => <option key={v} value={v} />)}</datalist>
          </>
        )}
      </th>
    );
  };

  const renderBodyCell = (i: number, p: any, c: string, sticky = false) => {
    const isStats = c.startsWith(STATS_PREFIX);
    const baseCol = isStats ? c.slice(STATS_PREFIX.length) : c;
    const v = cellValue(i, p, c);
    const isNum = isStats ? statsNumeric.has(baseCol) : attNumeric.has(c);
    const num = typeof v === "number" ? v : parseFloat(String(v ?? ""));
    const isRaw = RAW_ONLY.has(baseCol);
    const pctMap = isStats ? statsPercentiles.get(baseCol) : attPercentiles.get(c);
    const pct = isNum && !isRaw && !Number.isNaN(num) ? pctMap?.get(num) ?? 50 : null;
    const display = showPercentiles && pct !== null ? `${pct}` : (isNum && !Number.isNaN(num) ? formatNum(num) : (v ?? ""));
    return (
      <td key={c} className={`px-3 py-2 whitespace-nowrap border-r border-border/30 ${sticky ? "sticky left-0 z-20 bg-[oklch(0.18_0.03_285)] shadow-[2px_0_8px_oklch(0_0_0/0.4)] font-medium" : ""}`}>
        {c === nameCol ? (
          <span className="inline-flex items-center gap-2">
            <button onClick={(e) => { e.stopPropagation(); goToPlayer(p); }} className="font-semibold text-foreground hover:text-primary hover:underline">{String(v ?? "")}</button>
            <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(String(v)); toast.success("Copiado"); }}
              className="opacity-60 hover:opacity-100 hover:text-primary transition" title="Copiar nome">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </span>
        ) : isNum && !isRaw && pct !== null ? (
          <span className={`inline-block min-w-[3rem] rounded-full border px-2 py-0.5 text-center text-xs font-bold ${scoreToTone(pct)}`}>{display}</span>
        ) : (
          <span className="text-sm text-foreground/90">{String(display)}</span>
        )}
      </td>
    );
  };

  const matchedCount = join.attToStats.size;

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-[1800px] px-4 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Stats + Att</h1>
            <p className="text-sm text-muted-foreground">
              {players.length.toLocaleString()} att · {stats.length.toLocaleString()} stats · {matchedCount.toLocaleString()} unidos ({join.strategy === "id" ? `por ${join.idCol}` : "Nome+Clube"})
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/stats-att" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold btn-glow">
              <Download className="h-4 w-4 rotate-180" /> Upload
            </Link>
            <Link to="/stats-att/weights" className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm hover:border-primary">
              <Settings2 className="h-4 w-4" /> Stats+Att Score Weight
            </Link>
            <button onClick={() => setRoleSelectOpen((v) => !v)} className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm hover:border-primary">
              Role Select {selectedRoles.length > 0 && <span className="rounded bg-primary px-1.5 py-0.5 text-xs">{selectedRoles.length}</span>}
            </button>
            <button onClick={() => setShowPercentiles((v) => !v)} className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm ${showPercentiles ? "border-primary bg-primary/15" : "border-border bg-card hover:border-primary"}`}>
              <Percent className="h-4 w-4" /> Show Percentiles
            </button>
            <button onClick={() => setShowFilters((v) => !v)} className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm hover:border-primary">
              <Filter className="h-4 w-4" /> {showFilters ? "Hide" : "Show"} Filters
            </button>
            <button onClick={exportExcel} className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm hover:border-primary">
              <Download className="h-4 w-4" /> Export to Excel
            </button>
            <div className="relative">
              <button onClick={() => setViewOpen((v) => !v)} className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm hover:border-primary">
                <Eye className="h-4 w-4" /> View
              </button>
              {viewOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 max-h-[70vh] w-80 overflow-y-auto rounded-md border border-border bg-popover p-3 shadow-2xl">
                  <div className="mb-2 flex gap-2 text-xs">
                    <button className="flex-1 rounded bg-secondary px-2 py-1" onClick={() => setHidden(new Set())}>View All</button>
                    <button className="flex-1 rounded bg-secondary px-2 py-1" onClick={() => setHidden(new Set(allColumns))}>Hide All</button>
                  </div>
                  <div className="text-xs font-semibold text-muted-foreground mt-2 mb-1">Atributos</div>
                  {attCols.map((c) => (
                    <label key={c} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-secondary">
                      <input type="checkbox" checked={!hidden.has(c)} onChange={(e) => {
                        const n = new Set(hidden); if (e.target.checked) n.delete(c); else n.add(c); setHidden(n);
                      }} />
                      <span className="truncate">{c}</span>
                    </label>
                  ))}
                  <div className="text-xs font-semibold text-muted-foreground mt-3 mb-1">Stats</div>
                  {statsColsPrefixed.map((c) => (
                    <label key={c} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-secondary">
                      <input type="checkbox" checked={!hidden.has(c)} onChange={(e) => {
                        const n = new Set(hidden); if (e.target.checked) n.delete(c); else n.add(c); setHidden(n);
                      }} />
                      <span className="truncate">{c.slice(STATS_PREFIX.length)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {(join.warning || join.unmatched.length > 0) && (
          <JoinWarning
            warning={join.warning}
            strategy={join.strategy}
            unmatched={join.unmatched}
            duplicates={join.duplicates}
            totalAtt={players.length}
          />
        )}

        {roleSelectOpen && (
          <RoleSelector selected={selectedRoles} onChange={setSelectedRoles} onClose={() => setRoleSelectOpen(false)} />
        )}

        <div className="mb-3 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar nome..."
              className="w-full rounded-md border border-border bg-input pl-9 pr-3 py-2 text-sm outline-none focus:border-primary" />
          </div>
        </div>

        <div className="overflow-auto rounded-xl table-shell">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead className="sticky top-0 z-20">
              <tr>
                {attBefore.map((c) => renderHeaderCell(c, c === nameCol))}
                {roleColumns.map((rc) => (
                  <th key={rc.key} className={`px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide whitespace-nowrap border-r border-border/40 text-foreground ${
                    rc.kind === "total" ? "bg-gradient-to-b from-[oklch(0.5_0.3_320)] to-[oklch(0.4_0.28_320)]"
                    : rc.kind === "att" ? "bg-gradient-to-b from-primary/50 to-primary/25"
                    : "bg-gradient-to-b from-[oklch(0.45_0.25_200)] to-[oklch(0.35_0.2_200)]"
                  }`}>
                    <button onClick={() => toggleSort(rc.key)} className="inline-flex items-center gap-1">
                      {rc.label}
                      {sortBy?.col === rc.key && (sortBy.dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                    </button>
                  </th>
                ))}
                {attAfter.map((c) => renderHeaderCell(c))}
                {visibleStats.map((c) => renderHeaderCell(c))}
              </tr>
              {showFilters && (
                <tr>
                  {attBefore.map((c) => renderFilterCell(c, c === nameCol))}
                  {roleColumns.map((rc) => (
                    <th key={rc.key} className="px-2 py-1.5 bg-[oklch(0.17_0.03_285)] border-r border-border/40">
                      <div className="flex gap-1">
                        <input type="number" placeholder="Min" className="w-14 rounded border border-border/60 bg-input px-1.5 py-1 text-xs"
                          value={colFilters[rc.key]?.min ?? ""} onChange={(e) => setColFilters({ ...colFilters, [rc.key]: { ...colFilters[rc.key], min: e.target.value } })} />
                        <input type="number" placeholder="Max" className="w-14 rounded border border-border/60 bg-input px-1.5 py-1 text-xs"
                          value={colFilters[rc.key]?.max ?? ""} onChange={(e) => setColFilters({ ...colFilters, [rc.key]: { ...colFilters[rc.key], max: e.target.value } })} />
                      </div>
                    </th>
                  ))}
                  {attAfter.map((c) => renderFilterCell(c))}
                  {visibleStats.map((c) => renderFilterCell(c))}
                </tr>
              )}
            </thead>
            <tbody>
              {pageRows.map(({ p, i }, rowIdx) => (
                <tr key={i} onClick={() => goToPlayer(p)} className={`cursor-pointer ${rowIdx % 2 === 0 ? "bg-[oklch(0.18_0.03_285)]" : "bg-[oklch(0.16_0.03_285)]"} hover:bg-primary/10 transition-colors`}>
                  {attBefore.map((c) => renderBodyCell(i, p, c, c === nameCol))}
                  {roleColumns.map((rc) => {
                    const s = roleScores.get(i)?.[rc.key] ?? 0;
                    return (
                      <td key={rc.key} className="px-3 py-2 border-r border-border/30">
                        <span className={`inline-block min-w-[3rem] rounded-full border px-2 py-0.5 text-center text-xs font-bold ${scoreToTone(s)}`}>{s}</span>
                      </td>
                    );
                  })}
                  {attAfter.map((c) => renderBodyCell(i, p, c))}
                  {visibleStats.map((c) => renderBodyCell(i, p, c))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="text-muted-foreground">{filtered.length.toLocaleString()} Results · {PER_PAGE}/página</div>
          <div className="flex items-center gap-3">
            <span>Page {page} of {totalPages}</span>
            <button disabled={page === 1} onClick={() => setPage(1)} className="rounded border border-border px-2 py-1 hover:border-primary disabled:opacity-40">«</button>
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="rounded border border-border px-2 py-1 hover:border-primary disabled:opacity-40">‹</button>
            <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="rounded border border-border px-2 py-1 hover:border-primary disabled:opacity-40">›</button>
            <button disabled={page === totalPages} onClick={() => setPage(totalPages)} className="rounded border border-border px-2 py-1 hover:border-primary disabled:opacity-40">»</button>
          </div>
        </div>
      </main>
    </div>
  );
}

function RoleSelector({ selected, onChange, onClose }: { selected: string[]; onChange: (r: string[]) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const filtered = ALL_ROLES.filter((r) => r.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="mb-4 rounded-lg border border-primary/40 bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">Selecionar Roles ({selected.length})</h3>
        <div className="flex gap-2">
          <button onClick={() => onChange([])} className="rounded border border-border px-2 py-1 text-xs">Limpar</button>
          <button onClick={onClose} className="rounded bg-primary px-3 py-1 text-xs">Fechar</button>
        </div>
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar role..." className="mb-3 w-full rounded border border-border bg-input px-3 py-1.5 text-sm" />
      <div className="grid max-h-60 grid-cols-2 gap-1 overflow-y-auto md:grid-cols-4">
        {filtered.map((r) => (
          <label key={r} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-secondary">
            <input type="checkbox" checked={selected.includes(r)} onChange={(e) => onChange(e.target.checked ? [...selected, r] : selected.filter((x) => x !== r))} />
            <span className="truncate">{r}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function JoinWarning({ warning, strategy, unmatched, duplicates, totalAtt }: {
  warning: string | null;
  strategy: "id" | "name-club";
  unmatched: { name: string; club: string }[];
  duplicates: { name: string; club: string; id?: string }[];
  totalAtt: number;
}) {
  const [open, setOpen] = useState(false);
  const tone = strategy === "name-club"
    ? "border-warning/50 bg-warning/10 text-warning"
    : "border-primary/40 bg-primary/10 text-primary";
  const headline = warning
    ? warning
    : `${unmatched.length} jogador(es) sem correspondência no ficheiro Stats.`;
  const hasDetail = unmatched.length > 0 || duplicates.length > 0;
  return (
    <div className={`mb-3 rounded-md border px-3 py-2 text-xs ${tone}`}>
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="flex-1">
          {headline}
          {unmatched.length > 0 && (
            <span className="opacity-90"> · {unmatched.length} sem match ({Math.round((unmatched.length / Math.max(totalAtt, 1)) * 100)}%)</span>
          )}
        </span>
        {hasDetail && (
          <button onClick={() => setOpen((v) => !v)} className="rounded border border-current/30 px-2 py-0.5 hover:bg-current/10">
            {open ? "Esconder" : "Ver detalhes"}
          </button>
        )}
      </div>
      {open && (
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          {unmatched.length > 0 && (
            <div className="rounded border border-current/20 bg-background/40 p-2">
              <div className="mb-1 font-semibold">Sem match no Stats ({unmatched.length})</div>
              <ul className="max-h-48 overflow-y-auto space-y-0.5 font-mono text-[11px] text-foreground/80">
                {unmatched.slice(0, 200).map((u, i) => (
                  <li key={i}>{u.name}{u.club ? ` — ${u.club}` : ""}</li>
                ))}
                {unmatched.length > 200 && <li className="opacity-60">… +{unmatched.length - 200}</li>}
              </ul>
            </div>
          )}
          {duplicates.length > 0 && (
            <div className="rounded border border-current/20 bg-background/40 p-2">
              <div className="mb-1 font-semibold">UID duplicado ({duplicates.length})</div>
              <ul className="max-h-48 overflow-y-auto space-y-0.5 font-mono text-[11px] text-foreground/80">
                {duplicates.slice(0, 200).map((d, i) => (
                  <li key={i}>{d.id ? `[${d.id}] ` : ""}{d.name}{d.club ? ` — ${d.club}` : ""}</li>
                ))}
                {duplicates.length > 200 && <li className="opacity-60">… +{duplicates.length - 200}</li>}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
