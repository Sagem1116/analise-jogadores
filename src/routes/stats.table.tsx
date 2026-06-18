import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { usePlayers, computePercentiles, isNumericColumn, type PlayerRow } from "@/lib/stats-store";
import { useMemo, useState } from "react";
import { Copy, Download, Eye, EyeOff, Filter, Percent, Settings2, Search, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { ALL_ROLES, loadWeights } from "@/lib/roles";

export const Route = createFileRoute("/stats/table")({
  head: () => ({ meta: [{ title: "Stats Table | FMDataLab" }] }),
  component: StatsTable,
});

const PLAYER_INFO = ["Name", "Position", "Age", "Club", "Division", "Wage", "Transfer Value"];

function colorForPct(pct: number): string {
  if (pct >= 70) return "border-success/60 text-success";
  if (pct >= 40) return "border-warning/60 text-warning";
  return "border-danger/60 text-danger";
}

function formatNum(n: number): string {
  if (Math.abs(n) >= 1000) return n.toLocaleString();
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function StatsTable() {
  const navigate = useNavigate();
  const players = usePlayers();
  const [search, setSearch] = useState("");
  const [showPercentiles, setShowPercentiles] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [viewOpen, setViewOpen] = useState(false);
  const [roleSelectOpen, setRoleSelectOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<{ col: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 50;
  const [colFilters, setColFilters] = useState<Record<string, { min?: string; max?: string; text?: string }>>({});

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

  const allColumns = useMemo(() => Object.keys(players[0] ?? {}), [players]);
  const numericCols = useMemo(() => allColumns.filter((c) => isNumericColumn(players, c)), [allColumns, players]);
  const percentilesMap = useMemo(() => computePercentiles(players, numericCols), [players, numericCols]);

  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const visibleCols = allColumns.filter((c) => !hidden.has(c));

  // Compute role scores for selected roles
  const weights = useMemo(() => loadWeights(), [roleSelectOpen]);
  const roleScores = useMemo(() => {
    const result = new Map<number, Record<string, number>>();
    if (!selectedRoles.length) return result;
    players.forEach((p, idx) => {
      const scores: Record<string, number> = {};
      for (const role of selectedRoles) {
        const w = weights[role] || {};
        let totalW = 0, sum = 0;
        for (const [stat, info] of Object.entries(w)) {
          const pctMap = percentilesMap.get(stat); if (!pctMap) continue;
          const v = p[stat]; const num = typeof v === "number" ? v : parseFloat(String(v ?? ""));
          if (Number.isNaN(num)) continue;
          let pct = pctMap.get(num) ?? 0;
          if (info.invert) pct = 100 - pct;
          sum += pct * info.weight;
          totalW += info.weight;
        }
        scores[role] = totalW ? Math.round(sum / totalW) : 0;
      }
      result.set(idx, scores);
    });
    return result;
  }, [players, selectedRoles, weights, percentilesMap]);

  // Filter + sort
  const filtered = useMemo(() => {
    let rows = players.map((p, i) => ({ p, i }));
    const q = search.toLowerCase();
    if (q) rows = rows.filter(({ p }) => String(p.Name ?? "").toLowerCase().includes(q));
    for (const [col, f] of Object.entries(colFilters)) {
      if (f.text) {
        const t = f.text.toLowerCase();
        rows = rows.filter(({ p }) => String(p[col] ?? "").toLowerCase().includes(t));
      }
      if (f.min !== undefined && f.min !== "") {
        const min = parseFloat(f.min);
        rows = rows.filter(({ p }) => {
          const v = p[col]; const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
          return !Number.isNaN(n) && n >= min;
        });
      }
      if (f.max !== undefined && f.max !== "") {
        const max = parseFloat(f.max);
        rows = rows.filter(({ p }) => {
          const v = p[col]; const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
          return !Number.isNaN(n) && n <= max;
        });
      }
    }
    if (sortBy) {
      const { col, dir } = sortBy;
      const isRole = selectedRoles.includes(col);
      rows.sort((a, b) => {
        const av = isRole ? (roleScores.get(a.i)?.[col] ?? 0) : a.p[col];
        const bv = isRole ? (roleScores.get(b.i)?.[col] ?? 0) : b.p[col];
        const an = typeof av === "number" ? av : parseFloat(String(av ?? ""));
        const bn = typeof bv === "number" ? bv : parseFloat(String(bv ?? ""));
        if (!Number.isNaN(an) && !Number.isNaN(bn)) return dir === "asc" ? an - bn : bn - an;
        return dir === "asc" ? String(av ?? "").localeCompare(String(bv ?? "")) : String(bv ?? "").localeCompare(String(av ?? ""));
      });
    }
    return rows;
  }, [players, search, colFilters, sortBy, selectedRoles, roleScores]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage);

  function exportExcel() {
    const data = filtered.map(({ p, i }) => {
      const row: Record<string, any> = {};
      for (const c of visibleCols) row[c] = p[c];
      for (const r of selectedRoles) row[r] = roleScores.get(i)?.[r] ?? 0;
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

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-[1800px] px-4 py-6">
        {/* Toolbar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{visibleCols.length - PLAYER_INFO.length} stats</h1>
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
                        const n = new Set(hidden); e.target.checked ? n.delete(c) : n.add(c); setHidden(n);
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

        {/* Global search */}
        <div className="mb-3 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Pesquisar nome..."
              className="w-full rounded-md border border-border bg-input pl-9 pr-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border">
                {visibleCols.map((c) => (
                  <th key={c} className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                    <button onClick={() => toggleSort(c)} className="inline-flex items-center gap-1 hover:text-primary">
                      {c}
                      {sortBy?.col === c && (sortBy.dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                    </button>
                  </th>
                ))}
                {selectedRoles.map((r) => (
                  <th key={r} className="px-3 py-2 text-left font-semibold whitespace-nowrap text-primary">
                    <button onClick={() => toggleSort(r)} className="inline-flex items-center gap-1">
                      {r}
                      {sortBy?.col === r && (sortBy.dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                    </button>
                  </th>
                ))}
              </tr>
              {showFilters && (
                <tr className="border-b border-border bg-background/40">
                  {visibleCols.map((c) => (
                    <th key={c} className="px-2 py-1.5">
                      {numericCols.includes(c) ? (
                        <div className="flex gap-1">
                          <input type="number" placeholder="Min" className="w-16 rounded border border-border bg-input px-1.5 py-1 text-xs"
                            value={colFilters[c]?.min ?? ""} onChange={(e) => setColFilters({ ...colFilters, [c]: { ...colFilters[c], min: e.target.value } })} />
                          <input type="number" placeholder="Max" className="w-16 rounded border border-border bg-input px-1.5 py-1 text-xs"
                            value={colFilters[c]?.max ?? ""} onChange={(e) => setColFilters({ ...colFilters, [c]: { ...colFilters[c], max: e.target.value } })} />
                        </div>
                      ) : (
                        <input placeholder="Search…" className="w-full rounded border border-border bg-input px-2 py-1 text-xs"
                          value={colFilters[c]?.text ?? ""} onChange={(e) => setColFilters({ ...colFilters, [c]: { ...colFilters[c], text: e.target.value } })} />
                      )}
                    </th>
                  ))}
                  {selectedRoles.map((r) => <th key={r} />)}
                </tr>
              )}
            </thead>
            <tbody>
              {pageRows.map(({ p, i }) => (
                <tr key={i} className="border-b border-border/50 hover:bg-secondary/40">
                  {visibleCols.map((c) => {
                    const v = p[c];
                    const isNum = numericCols.includes(c);
                    const num = typeof v === "number" ? v : parseFloat(String(v ?? ""));
                    const pct = isNum && !Number.isNaN(num) ? percentilesMap.get(c)?.get(num) ?? 50 : null;
                    const display = showPercentiles && pct !== null ? `${pct}` : (isNum && !Number.isNaN(num) ? formatNum(num) : (v ?? ""));
                    return (
                      <td key={c} className="px-3 py-2 whitespace-nowrap">
                        {c === "Name" ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="font-medium">{v}</span>
                            <button onClick={() => { navigator.clipboard.writeText(String(v)); toast.success("Copiado"); }}
                              className="text-muted-foreground hover:text-primary" title="Copiar nome">
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        ) : isNum && pct !== null ? (
                          <span className={`inline-block min-w-[3rem] rounded-full border px-2 py-0.5 text-center text-xs font-semibold ${colorForPct(pct)}`}>
                            {display}
                          </span>
                        ) : String(display)}
                      </td>
                    );
                  })}
                  {selectedRoles.map((r) => {
                    const s = roleScores.get(i)?.[r] ?? 0;
                    return (
                      <td key={r} className="px-3 py-2">
                        <span className={`inline-block min-w-[3rem] rounded-full border px-2 py-0.5 text-center text-xs font-bold ${colorForPct(s)}`}>{s}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="text-muted-foreground">{filtered.length.toLocaleString()} Results</div>
          <div className="flex items-center gap-3">
            <span>Page {page} of {totalPages}</span>
            <button disabled={page === 1} onClick={() => setPage(1)} className="rounded border border-border px-2 py-1 disabled:opacity-40">«</button>
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="rounded border border-border px-2 py-1 disabled:opacity-40">‹</button>
            <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="rounded border border-border px-2 py-1 disabled:opacity-40">›</button>
            <button disabled={page === totalPages} onClick={() => setPage(totalPages)} className="rounded border border-border px-2 py-1 disabled:opacity-40">»</button>
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
