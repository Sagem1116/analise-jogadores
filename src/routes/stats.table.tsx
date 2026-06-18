import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { usePlayers, computePercentiles, isNumericColumn } from "@/lib/stats-store";
import { useEffect, useMemo, useState } from "react";
import { Copy, Download, Eye, Filter, Percent, Settings2, Search, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { ALL_ROLES, loadWeightsSync, fetchWeightsFromDB, subscribeWeights, type AllRoleWeights } from "@/lib/roles";

export const Route = createFileRoute("/stats/table")({
  head: () => ({ meta: [{ title: "Stats Table | FMDataLab" }] }),
  component: StatsTable,
});

// Columns that should NEVER show as percentile cards (always raw values)
const RAW_ONLY = new Set(["UID", "Age", "Wage", "Transfer Value", "Starts", "Minutes Played", "Mins", "Min"]);
// Columns whose values are monetary strings — filtered with min/max numeric inputs
const MONEY_COLS = new Set(["Wage", "Transfer Value"]);
const PER_PAGE = 15;

// Parse monetary strings like "3,355,000 €", "1M", "6.8M", "1M - 6.8M", "850K", "$1,200,000".
// Returns [min, max] (equal when single value). null if no number found.
function parseMoney(raw: unknown): [number, number] | null {
  if (raw == null || raw === "") return null;
  const s = String(raw).replace(/\u00A0/g, " ");
  const re = /(-?\d[\d.,]*)\s*([kKmMbB])?/g;
  const nums: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    const numStr = m[1].replace(/,/g, "");
    const n = parseFloat(numStr);
    if (Number.isNaN(n)) continue;
    const mult = m[2] ? ({ k: 1e3, m: 1e6, b: 1e9 } as Record<string, number>)[m[2].toLowerCase()] : 1;
    nums.push(n * mult);
  }
  if (!nums.length) return null;
  return [Math.min(...nums), Math.max(...nums)];
}

function colorForPct(pct: number): string {
  if (pct >= 70) return "border-success/60 bg-success/10 text-success";
  if (pct >= 40) return "border-warning/60 bg-warning/10 text-warning";
  return "border-danger/60 bg-danger/10 text-danger";
}

function formatNum(n: number): string {
  if (Math.abs(n) >= 1000) return n.toLocaleString();
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function StatsTable() {
  const players = usePlayers();
  const [search, setSearch] = useState("");
  const [showPercentiles, setShowPercentiles] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [viewOpen, setViewOpen] = useState(false);
  const [roleSelectOpen, setRoleSelectOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<{ col: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);
  const [colFilters, setColFilters] = useState<Record<string, { min?: string; max?: string; text?: string }>>({});
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [weights, setWeights] = useState<AllRoleWeights>(() => loadWeightsSync());

  useEffect(() => {
    fetchWeightsFromDB().then(setWeights).catch(() => {});
    return subscribeWeights(() => setWeights(loadWeightsSync()));
  }, []);

  const allColumns = useMemo(() => (players[0] ? Object.keys(players[0]) : []), [players]);
  const numericCols = useMemo(() => new Set(allColumns.filter((c) => isNumericColumn(players, c))), [allColumns, players]);
  const percentilesMap = useMemo(() => computePercentiles(players, [...numericCols]), [players, numericCols]);

  // Autofill suggestions for text columns — capped to keep 100k fast
  const filterSuggestions = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const c of allColumns) {
      if (numericCols.has(c)) continue;
      const set = new Set<string>();
      for (let i = 0; i < players.length && set.size < 200; i++) {
        const v = players[i][c];
        if (v != null && v !== "") set.add(String(v));
      }
      map.set(c, [...set].sort());
    }
    return map;
  }, [players, allColumns, numericCols]);

  const visibleCols = useMemo(() => allColumns.filter((c) => !hidden.has(c)), [allColumns, hidden]);
  const nameIdx = visibleCols.indexOf("Name");
  const colsBeforeRoles = nameIdx >= 0 ? visibleCols.slice(0, nameIdx + 1) : [];
  const colsAfterRoles = nameIdx >= 0 ? visibleCols.slice(nameIdx + 1) : visibleCols;

  const roleScores = useMemo(() => {
    const result = new Map<number, Record<string, number>>();
    if (!selectedRoles.length || !players.length) return result;
    for (let idx = 0; idx < players.length; idx++) {
      const p = players[idx];
      const scores: Record<string, number> = {};
      for (const role of selectedRoles) {
        const w = weights[role] || {};
        let totalW = 0, sum = 0;
        for (const stat in w) {
          const info = w[stat];
          const pctMap = percentilesMap.get(stat); if (!pctMap) continue;
          const v = p[stat]; const num = typeof v === "number" ? v : parseFloat(String(v ?? ""));
          if (Number.isNaN(num)) continue;
          let pct = pctMap.get(num) ?? 0;
          if (info.invert) pct = 100 - pct;
          sum += pct * info.weight; totalW += info.weight;
        }
        scores[role] = totalW ? Math.round(sum / totalW) : 0;
      }
      result.set(idx, scores);
    }
    return result;
  }, [players, selectedRoles, weights, percentilesMap]);

  const filtered = useMemo(() => {
    if (!players.length) return [] as { p: any; i: number }[];
    const q = search.toLowerCase().trim();
    const entries = Object.entries(colFilters).filter(([, f]) =>
      f && ((f.text && f.text.trim()) || (f.min !== undefined && f.min !== "") || (f.max !== undefined && f.max !== ""))
    );
    const out: { p: any; i: number }[] = [];
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (q && !String(p.Name ?? "").toLowerCase().includes(q)) continue;
      let ok = true;
      for (const [col, f] of entries) {
        const isRoleCol = selectedRoles.includes(col);
        const rawVal = isRoleCol ? (roleScores.get(i)?.[col] ?? 0) : p[col];
        if (f.text && f.text.trim()) {
          if (!String(rawVal ?? "").toLowerCase().includes(f.text.toLowerCase())) { ok = false; break; }
        }
        if (f.min !== undefined && f.min !== "") {
          const n = typeof rawVal === "number" ? rawVal : parseFloat(String(rawVal ?? ""));
          if (Number.isNaN(n) || n < parseFloat(f.min)) { ok = false; break; }
        }
        if (f.max !== undefined && f.max !== "") {
          const n = typeof rawVal === "number" ? rawVal : parseFloat(String(rawVal ?? ""));
          if (Number.isNaN(n) || n > parseFloat(f.max)) { ok = false; break; }
        }
      }
      if (ok) out.push({ p, i });
    }
    if (sortBy) {
      const { col, dir } = sortBy;
      const isRole = selectedRoles.includes(col);
      const sign = dir === "asc" ? 1 : -1;
      out.sort((a, b) => {
        const av = isRole ? (roleScores.get(a.i)?.[col] ?? 0) : a.p[col];
        const bv = isRole ? (roleScores.get(b.i)?.[col] ?? 0) : b.p[col];
        const an = typeof av === "number" ? av : parseFloat(String(av ?? ""));
        const bn = typeof bv === "number" ? bv : parseFloat(String(bv ?? ""));
        if (!Number.isNaN(an) && !Number.isNaN(bn)) return (an - bn) * sign;
        return String(av ?? "").localeCompare(String(bv ?? "")) * sign;
      });
    }
    return out;
  }, [players, search, colFilters, sortBy, selectedRoles, roleScores]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageRows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  useEffect(() => { setPage(1); }, [search, colFilters, sortBy]);

  function exportExcel() {
    const data = filtered.map(({ p, i }) => {
      const row: Record<string, any> = {};
      for (const c of colsBeforeRoles) row[c] = p[c];
      for (const r of selectedRoles) row[r] = roleScores.get(i)?.[r] ?? 0;
      for (const c of colsAfterRoles) row[c] = p[c];
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stats");
    XLSX.writeFile(wb, "fmdatalab-stats.xlsx");
  }

  function toggleSort(col: string) {
    setSortBy((s) => s?.col === col ? (s.dir === "desc" ? { col, dir: "asc" } : null) : { col, dir: "desc" });
  }

  if (!players.length) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <main className="mx-auto max-w-[1200px] px-6 py-20 text-center">
          <p className="text-muted-foreground">Sem dados. Faça upload primeiro.</p>
          <Link to="/stats" className="mt-4 inline-block rounded bg-primary px-4 py-2 text-sm font-medium">Ir para upload</Link>
        </main>
      </div>
    );
  }

  const renderHeaderCell = (c: string, sticky = false) => (
    <th key={c} className={`px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap border-r border-border/40 ${sticky ? "sticky left-0 z-30 bg-gradient-to-r from-[oklch(0.22_0.05_290)] to-[oklch(0.2_0.04_285)] shadow-[2px_0_8px_oklch(0_0_0/0.4)]" : "bg-[oklch(0.2_0.04_285)]"}`}>
      <button onClick={() => toggleSort(c)} className="inline-flex items-center gap-1 hover:text-primary">
        {c}
        {sortBy?.col === c && (sortBy.dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </button>
    </th>
  );

  const renderFilterCell = (c: string, sticky = false) => {
    const isNum = numericCols.has(c);
    const listId = `dl-${c.replace(/\s+/g, "-")}`;
    return (
      <th key={c} className={`px-2 py-1.5 border-r border-border/40 ${sticky ? "sticky left-0 z-30 bg-[oklch(0.17_0.03_285)] shadow-[2px_0_8px_oklch(0_0_0/0.4)]" : "bg-[oklch(0.17_0.03_285)]"}`}>
        {isNum ? (
          <div className="flex gap-1">
            <input type="number" placeholder="Min" className="w-14 rounded border border-border/60 bg-input px-1.5 py-1 text-xs"
              value={colFilters[c]?.min ?? ""} onChange={(e) => setColFilters({ ...colFilters, [c]: { ...colFilters[c], min: e.target.value } })} />
            <input type="number" placeholder="Max" className="w-14 rounded border border-border/60 bg-input px-1.5 py-1 text-xs"
              value={colFilters[c]?.max ?? ""} onChange={(e) => setColFilters({ ...colFilters, [c]: { ...colFilters[c], max: e.target.value } })} />
          </div>
        ) : (
          <>
            <input
              list={listId}
              placeholder="Filtrar..."
              className="w-full min-w-[100px] rounded border border-border/60 bg-input px-2 py-1 text-xs"
              value={colFilters[c]?.text ?? ""}
              onChange={(e) => setColFilters({ ...colFilters, [c]: { ...colFilters[c], text: e.target.value } })}
            />
            <datalist id={listId}>
              {(filterSuggestions.get(c) ?? []).map((v) => <option key={v} value={v} />)}
            </datalist>
          </>
        )}
      </th>
    );
  };

  const renderBodyCell = (c: string, v: any, sticky = false) => {
    const isNum = numericCols.has(c);
    const num = typeof v === "number" ? v : parseFloat(String(v ?? ""));
    const isRaw = RAW_ONLY.has(c);
    const pct = isNum && !isRaw && !Number.isNaN(num) ? percentilesMap.get(c)?.get(num) ?? 50 : null;
    const display = showPercentiles && pct !== null
      ? `${pct}`
      : (isNum && !Number.isNaN(num) ? formatNum(num) : (v ?? ""));
    return (
      <td key={c} className={`px-3 py-2 whitespace-nowrap border-r border-border/30 ${sticky ? "sticky left-0 z-20 bg-[oklch(0.18_0.03_285)] shadow-[2px_0_8px_oklch(0_0_0/0.4)] font-medium" : ""}`}>
        {c === "Name" ? (
          <span className="inline-flex items-center gap-2">
            <span className="font-semibold text-foreground">{v}</span>
            <button onClick={() => { navigator.clipboard.writeText(String(v)); toast.success("Copiado"); }}
              className="opacity-60 hover:opacity-100 hover:text-primary transition" title="Copiar nome">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </span>
        ) : isNum && !isRaw && pct !== null ? (
          <span className={`inline-block min-w-[3rem] rounded-full border px-2 py-0.5 text-center text-xs font-bold ${colorForPct(pct)}`}>
            {display}
          </span>
        ) : (
          <span className="text-sm text-foreground/90">{String(display)}</span>
        )}
      </td>
    );
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-[1800px] px-4 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{numericCols.size} stats</h1>
            <p className="text-sm text-muted-foreground">{players.length.toLocaleString()} Total Players</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/stats" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold btn-glow">
              <Download className="h-4 w-4 rotate-180" /> Upload
            </Link>
            <Link to="/stats/weights" className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm hover:border-primary">
              <Settings2 className="h-4 w-4" /> Stats Score Weight
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
                <div className="absolute right-0 top-full z-50 mt-2 max-h-[70vh] w-72 overflow-y-auto rounded-md border border-border bg-popover p-3 shadow-2xl">
                  <div className="mb-2 flex gap-2 text-xs">
                    <button className="flex-1 rounded bg-secondary px-2 py-1" onClick={() => setHidden(new Set())}>View All</button>
                    <button className="flex-1 rounded bg-secondary px-2 py-1" onClick={() => setHidden(new Set(allColumns))}>Hide All</button>
                  </div>
                  {allColumns.map((c) => (
                    <label key={c} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-secondary">
                      <input type="checkbox" checked={!hidden.has(c)} onChange={(e) => {
                        const n = new Set(hidden); if (e.target.checked) n.delete(c); else n.add(c); setHidden(n);
                      }} />
                      <span className="truncate">{c}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {roleSelectOpen && (
          <RoleSelector selected={selectedRoles} onChange={setSelectedRoles} onClose={() => setRoleSelectOpen(false)} />
        )}

        <div className="mb-3 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar nome..."
              className="w-full rounded-md border border-border bg-input pl-9 pr-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="overflow-auto rounded-xl table-shell">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead className="sticky top-0 z-20">
              <tr>
                {colsBeforeRoles.map((c) => renderHeaderCell(c, c === "Name"))}
                {selectedRoles.map((r) => (
                  <th key={r} className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide whitespace-nowrap border-r border-border/40 bg-gradient-to-b from-primary/40 to-primary/20 text-foreground">
                    <button onClick={() => toggleSort(r)} className="inline-flex items-center gap-1">
                      {r}
                      {sortBy?.col === r && (sortBy.dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                    </button>
                  </th>
                ))}
                {colsAfterRoles.map((c) => renderHeaderCell(c))}
              </tr>
              {showFilters && (
                <tr>
                  {colsBeforeRoles.map((c) => renderFilterCell(c, c === "Name"))}
                  {selectedRoles.map((r) => (
                    <th key={r} className="px-2 py-1.5 bg-[oklch(0.17_0.03_285)] border-r border-border/40">
                      <div className="flex gap-1">
                        <input type="number" placeholder="Min" className="w-14 rounded border border-border/60 bg-input px-1.5 py-1 text-xs"
                          value={colFilters[r]?.min ?? ""} onChange={(e) => setColFilters({ ...colFilters, [r]: { ...colFilters[r], min: e.target.value } })} />
                        <input type="number" placeholder="Max" className="w-14 rounded border border-border/60 bg-input px-1.5 py-1 text-xs"
                          value={colFilters[r]?.max ?? ""} onChange={(e) => setColFilters({ ...colFilters, [r]: { ...colFilters[r], max: e.target.value } })} />
                      </div>
                    </th>
                  ))}
                  {colsAfterRoles.map((c) => renderFilterCell(c))}
                </tr>
              )}
            </thead>
            <tbody>
              {pageRows.map(({ p, i }, rowIdx) => (
                <tr key={i} className={`${rowIdx % 2 === 0 ? "bg-[oklch(0.18_0.03_285)]" : "bg-[oklch(0.16_0.03_285)]"} hover:bg-primary/10 transition-colors`}>
                  {colsBeforeRoles.map((c) => renderBodyCell(c, p[c], c === "Name"))}
                  {selectedRoles.map((r) => {
                    const s = roleScores.get(i)?.[r] ?? 0;
                    return (
                      <td key={r} className="px-3 py-2 border-r border-border/30">
                        <span className={`inline-block min-w-[3rem] rounded-full border px-2 py-0.5 text-center text-xs font-bold ${colorForPct(s)}`}>{s}</span>
                      </td>
                    );
                  })}
                  {colsAfterRoles.map((c) => renderBodyCell(c, p[c]))}
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
