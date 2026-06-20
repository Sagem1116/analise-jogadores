import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, X, Plus, Search, ChevronDown, ChevronUp } from "lucide-react";
import { useSAData, isNumericColumn, computePercentiles, computeNormalized, type PlayerRow } from "@/lib/stats-att-store";
import { ALL_ROLES, loadWeightsSync, fetchWeightsFromDB, type AllRoleWeights } from "@/lib/roles";
import { loadAttWeightsSync, fetchAttWeightsFromDB, type AllAttWeights } from "@/lib/att-roles";
import { joinPlayers, scoreToTone, findCol } from "@/lib/player-join";
import { useFormula, attComponent, combineTotal, findMoneyCol, computeMoneyPercentiles, applyFinancialAdjust, MARKET_COL_CANDIDATES, WAGE_COL_CANDIDATES } from "@/lib/score-formula";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";

export const Route = createFileRoute("/stats-att/player/$key")({
  head: () => ({ meta: [{ title: "Player Profile | FMDataLab" }] }),
  component: PlayerProfile,
});

const SERIES_COLORS = ["oklch(0.75 0.32 300)", "oklch(0.72 0.25 200)", "oklch(0.75 0.25 140)", "oklch(0.75 0.25 50)", "oklch(0.7 0.28 25)"];
const MAX_COMPARE = 4;

function fmt(v: any): string {
  if (v == null || v === "") return "—";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(2);
  return String(v);
}
function field(row: PlayerRow | undefined | null, candidates: string[]): any {
  if (!row) return null;
  for (const c of candidates) if (row[c] != null && row[c] !== "") return row[c];
  return null;
}

function PlayerProfile() {
  const { key: rawKey } = useParams({ from: "/stats-att/player/$key" });
  const targetKey = decodeURIComponent(rawKey);
  const { stats, att } = useSAData();
  const [sWeights, setSWeights] = useState<AllRoleWeights>(() => loadWeightsSync());
  const [aWeights, setAWeights] = useState<AllAttWeights>(() => loadAttWeightsSync());
  const [selectedRole, setSelectedRole] = useState<string>(ALL_ROLES[0] ?? "");
  const [mode, setMode] = useState<"raw" | "pct">("raw");
  const [compareKeys, setCompareKeys] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareSearch, setCompareSearch] = useState("");
  const [showAllAtts, setShowAllAtts] = useState(false);
  const [showAllStats, setShowAllStats] = useState(false);
  const [allAttsMode, setAllAttsMode] = useState<"raw" | "pct">("raw");
  const [allStatsMode, setAllStatsMode] = useState<"raw" | "pct">("raw");
  const formula = useFormula();

  useEffect(() => {
    fetchWeightsFromDB().then(setSWeights).catch(() => {});
    fetchAttWeightsFromDB().then(setAWeights).catch(() => {});
  }, []);

  const join = useMemo(() => joinPlayers(att, stats), [att, stats]);
  const attCols = useMemo(() => (att[0] ? Object.keys(att[0]) : []), [att]);
  const statsCols = useMemo(() => (stats[0] ? Object.keys(stats[0]) : []), [stats]);
  const attNumeric = useMemo(() => new Set(attCols.filter((c) => isNumericColumn(att, c))), [attCols, att]);
  const statsNumeric = useMemo(() => new Set(statsCols.filter((c) => isNumericColumn(stats, c))), [statsCols, stats]);
  const attPct = useMemo(() => computePercentiles(att, [...attNumeric]), [att, attNumeric]);
  const attNorm = useMemo(() => computeNormalized(att, [...attNumeric]), [att, attNumeric]);
  const statsPct = useMemo(() => computePercentiles(stats, [...statsNumeric]), [stats, statsNumeric]);
  const marketCol = useMemo(() => findMoneyCol(att, MARKET_COL_CANDIDATES), [att]);
  const wageCol = useMemo(() => findMoneyCol(att, WAGE_COL_CANDIDATES), [att]);
  const marketPctMap = useMemo(() => computeMoneyPercentiles(att, marketCol), [att, marketCol]);
  const wagePctMap = useMemo(() => computeMoneyPercentiles(att, wageCol), [att, wageCol]);

  const nameCol = findCol(att, ["Nome", "Name"]) ?? "Nome";
  const clubCol = findCol(att, ["Clube", "Club"]) ?? "Clube";

  const playerByKey = useMemo(() => {
    const m = new Map<string, number>();
    for (let i = 0; i < att.length; i++) m.set(join.keyFor(att[i]), i);
    return m;
  }, [att, join]);

  const mainIdx = playerByKey.get(targetKey);
  if (!att.length || !stats.length || mainIdx === undefined) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <main className="mx-auto max-w-[1200px] px-6 py-20 text-center">
          <p className="text-muted-foreground">Jogador não encontrado. Faça upload dos ficheiros primeiro.</p>
          <Link to="/stats-att/table" className="mt-4 inline-block rounded bg-primary px-4 py-2 text-sm">Voltar à tabela</Link>
        </main>
      </div>
    );
  }

  const playerIdxs = [mainIdx, ...compareKeys.map((k) => playerByKey.get(k)).filter((x): x is number => x !== undefined)];

  function getAtt(idx: number, col: string): any { return att[idx][col]; }
  function getStat(idx: number, col: string): any {
    const sr = join.attToStats.get(idx);
    return sr ? sr[col] : null;
  }

  function scoresFor(idx: number, role: string): { att: number; stats: number; total: number } {
    const aw = aWeights[role] || {};
    let aSum = 0, aTot = 0;
    for (const stat in aw) {
      const info = aw[stat];
      const v = att[idx][stat]; const num = typeof v === "number" ? v : parseFloat(String(v ?? ""));
      if (Number.isNaN(num)) continue;
      let p = attPct.get(stat)?.get(num) ?? 0; let n = attNorm.get(stat)?.get(num) ?? 0;
      if (info.invert) { p = 100 - p; n = 100 - n; }
      aSum += attComponent(n, p, formula) * info.weight; aTot += info.weight;
    }
    const a = aTot ? Math.round(aSum / aTot) : 0;
    const sw = sWeights[role] || {};
    let sSum = 0, sTot = 0;
    const sr = join.attToStats.get(idx);
    if (sr) for (const stat in sw) {
      const info = sw[stat];
      const v = sr[stat]; const num = typeof v === "number" ? v : parseFloat(String(v ?? ""));
      if (Number.isNaN(num)) continue;
      let p = statsPct.get(stat)?.get(num) ?? 0;
      if (info.invert) p = 100 - p;
      sSum += p * formula.statsPctBlend * info.weight; sTot += info.weight;
    }
    const s = sTot ? Math.round(sSum / sTot) : 0;
    const rawTotal = combineTotal(a, s, formula);
    const total = applyFinancialAdjust(rawTotal, marketPctMap.get(idx) ?? null, wagePctMap.get(idx) ?? null, formula);
    return { att: a, stats: s, total };
  }

  const player = att[mainIdx];

  const roleAttList = Object.entries(aWeights[selectedRole] || {})
    .filter(([, w]) => (w as any).weight > 0)
    .sort((a, b) => (b[1] as any).weight - (a[1] as any).weight);
  const roleStatList = Object.entries(sWeights[selectedRole] || {})
    .filter(([, w]) => (w as any).weight > 0)
    .sort((a, b) => (b[1] as any).weight - (a[1] as any).weight);

  const candidates = useMemo(() => {
    const q = compareSearch.toLowerCase().trim();
    if (!q) return [];
    const out: { key: string; name: string; club: string }[] = [];
    for (let i = 0; i < att.length && out.length < 20; i++) {
      const name = String(att[i][nameCol] ?? "");
      if (!name.toLowerCase().includes(q)) continue;
      const k = join.keyFor(att[i]);
      if (k === targetKey || compareKeys.includes(k)) continue;
      out.push({ key: k, name, club: String(att[i][clubCol] ?? "") });
    }
    return out;
  }, [compareSearch, att, nameCol, clubCol, join, targetKey, compareKeys]);

  // All numeric attribute columns (for "Todos os Atributos" panel)
  const allAttCols = useMemo(() => [...attNumeric].sort(), [attNumeric]);
  const allStatCols = useMemo(() => [...statsNumeric].sort(), [statsNumeric]);

  const playerNames = playerIdxs.map((idx) => String(att[idx][nameCol] ?? ""));

  // Radar data
  const attRadarData = roleAttList.slice(0, 12).map(([stat]) => {
    const row: any = { stat };
    playerIdxs.forEach((idx, i) => {
      const v = att[idx][stat]; const num = typeof v === "number" ? v : parseFloat(String(v ?? ""));
      const p = Number.isNaN(num) ? 0 : (attPct.get(stat)?.get(num) ?? 0);
      row[`p${i}`] = p;
    });
    return row;
  });
  const statsRadarData = roleStatList.slice(0, 12).map(([stat]) => {
    const row: any = { stat };
    playerIdxs.forEach((idx, i) => {
      const sr = join.attToStats.get(idx);
      const v = sr ? sr[stat] : null;
      const num = typeof v === "number" ? v : parseFloat(String(v ?? ""));
      const p = Number.isNaN(num) ? 0 : (statsPct.get(stat)?.get(num) ?? 0);
      row[`p${i}`] = p;
    });
    return row;
  });

  const isCompare = playerIdxs.length > 1;

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-[1400px] px-4 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link to="/stats-att/table" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Voltar à tabela
          </Link>
          <button onClick={() => setCompareOpen(true)} disabled={compareKeys.length >= MAX_COMPARE}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold btn-glow disabled:opacity-40">
            <Plus className="h-4 w-4" /> Comparar jogador {compareKeys.length > 0 && `(${compareKeys.length}/${MAX_COMPARE})`}
          </button>
        </div>

        <h1 className="mb-1 text-3xl font-bold">{String(player[nameCol] ?? "")}</h1>
        <p className="mb-5 text-sm text-muted-foreground">{String(player[clubCol] ?? "")}</p>

        {/* Compared player chips */}
        {compareKeys.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {compareKeys.map((k, i) => {
              const idx = playerByKey.get(k); if (idx === undefined) return null;
              return (
                <div key={k} className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: SERIES_COLORS[i + 1] }} />
                  <span className="font-semibold">{String(att[idx][nameCol] ?? "")}</span>
                  <button onClick={() => setCompareKeys(compareKeys.filter((x) => x !== k))} className="ml-1 opacity-60 hover:opacity-100"><X className="h-3 w-3" /></button>
                </div>
              );
            })}
          </div>
        )}




        <InfoMatrix
          playerIdxs={playerIdxs}
          playerNames={playerNames}
          att={att}
          join={join}
          isCompare={isCompare}
        />

        {/* Prós/Contras for main only */}
        {(field(player, ["Prós"]) || field(player, ["Contras"])) && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {field(player, ["Prós"]) && (
              <div className="rounded-lg border border-success/40 bg-success/5 p-4">
                <h3 className="mb-2 text-sm font-bold text-success">Prós ({String(player[nameCol] ?? "")})</h3>
                <p className="text-sm text-foreground/90">{String(field(player, ["Prós"]))}</p>
              </div>
            )}
            {field(player, ["Contras"]) && (
              <div className="rounded-lg border border-danger/40 bg-danger/5 p-4">
                <h3 className="mb-2 text-sm font-bold text-danger">Contras ({String(player[nameCol] ?? "")})</h3>
                <p className="text-sm text-foreground/90">{String(field(player, ["Contras"]))}</p>
              </div>
            )}
          </div>
        )}

        {/* Role + mode + scores */}
        <div className="mt-6 rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-semibold">Role:</label>
            <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="rounded border border-border bg-input px-3 py-2 text-sm">
              {ALL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <div className="ml-2 inline-flex rounded-md border border-border bg-input p-0.5 text-xs">
              <button onClick={() => setMode("raw")} className={`rounded px-3 py-1 ${mode === "raw" ? "bg-primary text-primary-foreground" : ""}`}>Bruto</button>
              <button onClick={() => setMode("pct")} className={`rounded px-3 py-1 ${mode === "pct" ? "bg-primary text-primary-foreground" : ""}`}>Percentil</button>
            </div>
          </div>
          <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${playerIdxs.length}, minmax(0, 1fr))` }}>
            {playerIdxs.map((idx, i) => {
              const sc = scoresFor(idx, selectedRole);
              return (
                <div key={i} className="flex items-center justify-between rounded border border-border bg-background/40 px-3 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: SERIES_COLORS[i] }} />
                    <span className="font-semibold truncate">{playerNames[i]}</span>
                  </div>
                  <div className="flex gap-2">
                    <ScoreBadge label="Att" value={sc.att} />
                    <ScoreBadge label="Stats" value={sc.stats} />
                    <ScoreBadge label="Total" value={sc.total} highlight />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Role attribute / stats lists */}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <AttList title={`Atributos (${selectedRole})`} items={roleAttList} playerIdxs={playerIdxs}
            getCell={(idx, col) => getAtt(idx, col)} pctMap={attPct} mode={mode} playerNames={playerNames} />
          <AttList title={`Stats (${selectedRole})`} items={roleStatList} playerIdxs={playerIdxs}
            getCell={(idx, col) => getStat(idx, col)} pctMap={statsPct} mode={mode} playerNames={playerNames} />
        </div>

        {/* Radars */}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <RadarPanel title="Radar Atributos" data={attRadarData} playerNames={playerNames} />
          <RadarPanel title="Radar Stats" data={statsRadarData} playerNames={playerNames} />
        </div>

        {/* Toggle panels: all attributes / all stats */}
        <div className="mt-6 space-y-4">
          <TogglePanel
            title="Todos os Atributos"
            open={showAllAtts}
            onToggle={() => setShowAllAtts((v) => !v)}
            mode={allAttsMode}
            setMode={setAllAttsMode}
          >
            <FullList
              cols={allAttCols}
              playerIdxs={playerIdxs}
              playerNames={playerNames}
              getCell={(idx, col) => getAtt(idx, col)}
              pctMap={attPct}
              mode={allAttsMode}
            />
          </TogglePanel>

          <TogglePanel
            title="Todas as Métricas"
            open={showAllStats}
            onToggle={() => setShowAllStats((v) => !v)}
            mode={allStatsMode}
            setMode={setAllStatsMode}
          >
            <FullList
              cols={allStatCols}
              playerIdxs={playerIdxs}
              playerNames={playerNames}
              getCell={(idx, col) => getStat(idx, col)}
              pctMap={statsPct}
              mode={allStatsMode}
            />
          </TogglePanel>
        </div>
      </main>

      {compareOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setCompareOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold">Adicionar jogador para comparar</h3>
              <button onClick={() => setCompareOpen(false)} className="opacity-60 hover:opacity-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input autoFocus value={compareSearch} onChange={(e) => setCompareSearch(e.target.value)} placeholder="Nome..."
                className="w-full rounded-md border border-border bg-input pl-9 pr-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div className="mt-3 max-h-72 overflow-y-auto">
              {candidates.map((c) => (
                <button key={c.key} onClick={() => { setCompareKeys([...compareKeys, c.key].slice(0, MAX_COMPARE)); setCompareSearch(""); setCompareOpen(false); }}
                  className="flex w-full items-center justify-between rounded px-3 py-2 text-sm hover:bg-secondary">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c.club}</span>
                </button>
              ))}
              {!candidates.length && compareSearch && <p className="px-3 py-2 text-sm text-muted-foreground">Sem resultados</p>}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Máx. {MAX_COMPARE} comparações.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Info Matrix (per-player columns) =====
function InfoMatrix({ playerIdxs, playerNames, att, join, isCompare }: {
  playerIdxs: number[]; playerNames: string[]; att: PlayerRow[]; join: ReturnType<typeof joinPlayers>; isCompare: boolean;
}) {
  const groups: { title: string; compact?: boolean; rows: { label: string; getter: (a: PlayerRow, s: PlayerRow | undefined | null) => any }[] }[] = [
    {
      title: "Info Geral",
      rows: [
        { label: "Idade", getter: (a) => field(a, ["Idade", "Age"]) },
        { label: "Altura", getter: (a) => field(a, ["Altura", "Height"]) },
        { label: "Peso", getter: (a) => field(a, ["Peso", "Weight"]) },
        { label: "Nac", getter: (a) => field(a, ["Nac", "Nationality"]) },
        { label: "2ª Nac", getter: (a) => field(a, ["2ª Nac", "Second Nat"]) },
        { label: "Internacionalizações", getter: (a) => field(a, ["Internacionalizações", "Caps"]) },
        { label: "Golos Intl", getter: (a) => field(a, ["Golos", "Intl Goals"]) },
      ],
    },
    {
      title: "Clube",
      rows: [
        { label: "Clube", getter: (a) => field(a, ["Clube", "Club"]) },
        { label: "Divisão", getter: (a) => field(a, ["Divisão", "Division"]) },
        { label: "Preço", getter: (a) => field(a, ["Valor Estimado", "Transfer Value"]) },
        { label: "V.P.", getter: (a) => field(a, ["V.P.", "VP", "Valor Pedido", "Asking Price"]) },
        { label: "Salário", getter: (a) => field(a, ["Salário", "Wage"]) },
        { label: "Expira", getter: (a) => field(a, ["Expira", "Expires", "Contract Expires"]) },
        { label: "Pé Esq.", getter: (a) => field(a, ["Pé Esquerdo", "Left Foot"]) },
        { label: "Pé Dir.", getter: (a) => field(a, ["Pé Direito", "Right Foot"]) },
      ],
    },
    {
      title: "Perfil",
      rows: [
        { label: "Posição", getter: (a) => field(a, ["Posição", "Position"]) },
        { label: "Pos. Sec.", getter: (a) => field(a, ["Posição Sec.", "Sec Position"]) },
        { label: "Personalidade", getter: (a) => field(a, ["Personalidade", "Personality"]) },
        { label: "Mins", getter: (_a, s) => field(s, ["Mins", "Minutes Played", "Min"]) },
        { label: "Jogos", getter: (_a, s) => field(s, ["Apps", "Starts", "Jogos"]) },
        { label: "Golos", getter: (_a, s) => field(s, ["Gls", "Goals", "Golos"]) },
      ],
    },
    {
      title: "Att Escondidos",
      compact: true,
      rows: [
        { label: "C.A.", getter: (a) => field(a, ["C.A.", "CA", "Current Ability"]) },
        { label: "C.P.", getter: (a) => field(a, ["C.P.", "PA", "Potential Ability"]) },
        { label: "Ada", getter: (a) => field(a, ["Ada", "Adaptability"]) },
        { label: "Amb", getter: (a) => field(a, ["Amb", "Ambition"]) },
        { label: "Cons", getter: (a) => field(a, ["Cons", "Consistency"]) },
        { label: "Cont", getter: (a) => field(a, ["Cont", "Controversy"]) },
        { label: "Desp", getter: (a) => field(a, ["Desp", "Sportsmanship"]) },
        { label: "Mald", getter: (a) => field(a, ["Mald", "Dirtiness"]) },
        { label: "J Imp", getter: (a) => field(a, ["J Imp", "JImp", "Important Matches"]) },
        { label: "Lea", getter: (a) => field(a, ["Lea", "Loyalty"]) },
        { label: "Pres", getter: (a) => field(a, ["Pres", "Pressure"]) },
        { label: "Prof", getter: (a) => field(a, ["Prof", "Professionalism"]) },
        { label: "Prob Les", getter: (a) => field(a, ["Prob Les", "Injury Proneness"]) },
        { label: "Temp", getter: (a) => field(a, ["Temp", "Temperament"]) },
        { label: "R.A.", getter: (a) => field(a, ["R.A.", "RA", "Versatility"]) },
        { label: "RM", getter: (a) => field(a, ["RM", "Reckless"]) },
      ],
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {groups.map((g) => (
        <div key={g.title} className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-primary">{g.title}</h3>
          <div className="overflow-x-auto">
            <table className={`w-full ${g.compact ? "text-[11px]" : "text-sm"}`}>
              {isCompare && (
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th className="py-1 text-left font-normal"></th>
                    {playerNames.map((n, i) => (
                      <th key={i} className="py-1 text-right font-semibold" style={{ color: SERIES_COLORS[i] }}>{n}</th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {g.rows.map((r) => (
                  <tr key={r.label} className="border-b border-border/30 last:border-0">
                    <td className={`${g.compact ? "py-0.5" : "py-1.5"} text-muted-foreground`}>{r.label}</td>
                    {playerIdxs.map((idx, i) => {
                      const a = att[idx];
                      const s = join.attToStats.get(idx);
                      return <td key={i} className={`${g.compact ? "py-0.5" : "py-1.5"} text-right font-medium`}>{fmt(r.getter(a, s))}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function ScoreBadge({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`flex flex-col items-center rounded-md border px-3 py-1 ${highlight ? "border-primary/60 bg-primary/15" : "border-border bg-card"}`}>
      <span className="text-[10px] uppercase text-muted-foreground">{label}</span>
      <span className={`text-lg font-bold ${scoreToTone(value).split(" ").find((c) => c.startsWith("text-"))}`}>{value}</span>
    </div>
  );
}

function AttList({ title, items, playerIdxs, getCell, pctMap, mode, playerNames }: {
  title: string;
  items: [string, { weight: number; invert?: boolean }][];
  playerIdxs: number[];
  getCell: (idx: number, col: string) => any;
  pctMap: Map<string, Map<number, number>>;
  mode: "raw" | "pct";
  playerNames: string[];
}) {
  if (!items.length) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-2 font-bold">{title}</h3>
        <p className="text-sm text-muted-foreground">Define pesos para este role.</p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 font-bold">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1">Stat</th>
              {playerNames.map((n, i) => <th key={i} className="py-1 text-center" style={{ color: SERIES_COLORS[i] }}>{n}</th>)}
            </tr>
          </thead>
          <tbody>
            {items.map(([stat, info]) => (
              <tr key={stat} className="border-t border-border/30">
                <td className="py-1.5 text-foreground/90">{stat} <span className="text-muted-foreground">×{info.weight}</span></td>
                {playerIdxs.map((idx, i) => {
                  const v = getCell(idx, stat);
                  const num = typeof v === "number" ? v : parseFloat(String(v ?? ""));
                  let p = Number.isNaN(num) ? null : (pctMap.get(stat)?.get(num) ?? null);
                  if (p !== null && info.invert) p = 100 - p;
                  const display = mode === "pct" ? (p ?? "—") : (Number.isNaN(num) ? "—" : fmt(num));
                  return (
                    <td key={i} className="py-1.5 text-center">
                      {p !== null ? (
                        <span className={`inline-block min-w-[3rem] rounded-full border px-2 py-0.5 text-xs font-bold ${scoreToTone(p)}`}>{display}</span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RadarPanel({ title, data, playerNames }: { title: string; data: any[]; playerNames: string[] }) {
  if (!data.length) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-2 font-bold">{title}</h3>
        <p className="text-sm text-muted-foreground">Sem dados para este role.</p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 font-bold">{title}</h3>
      <ResponsiveContainer width="100%" height={340}>
        <RadarChart data={data}>
          <PolarGrid stroke="oklch(0.3 0.04 285)" />
          <PolarAngleAxis dataKey="stat" tick={{ fill: "oklch(0.8 0.02 285)", fontSize: 11 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={{ fill: "oklch(0.6 0.02 285)", fontSize: 10 }} />
          {playerNames.map((name, i) => (
            <Radar key={i} name={name} dataKey={`p${i}`} stroke={SERIES_COLORS[i]} fill={SERIES_COLORS[i]} fillOpacity={0.25} />
          ))}
          <Tooltip contentStyle={{ background: "oklch(0.18 0.03 285)", border: "1px solid oklch(0.3 0.04 285)", borderRadius: 8 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TogglePanel({ title, open, onToggle, mode, setMode, children }: {
  title: string; open: boolean; onToggle: () => void; mode: "raw" | "pct"; setMode: (m: "raw" | "pct") => void; children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between p-4">
        <button onClick={onToggle} className="flex items-center gap-2 font-bold hover:text-primary">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {title}
        </button>
        {open && (
          <div className="inline-flex rounded-md border border-border bg-input p-0.5 text-xs">
            <button onClick={() => setMode("raw")} className={`rounded px-3 py-1 ${mode === "raw" ? "bg-primary text-primary-foreground" : ""}`}>Bruto</button>
            <button onClick={() => setMode("pct")} className={`rounded px-3 py-1 ${mode === "pct" ? "bg-primary text-primary-foreground" : ""}`}>Percentil</button>
          </div>
        )}
      </div>
      {open && <div className="border-t border-border p-4">{children}</div>}
    </div>
  );
}

function FullList({ cols, playerIdxs, playerNames, getCell, pctMap, mode }: {
  cols: string[]; playerIdxs: number[]; playerNames: string[];
  getCell: (idx: number, col: string) => any;
  pctMap: Map<string, Map<number, number>>;
  mode: "raw" | "pct";
}) {
  if (!cols.length) return <p className="text-sm text-muted-foreground">Sem dados.</p>;
  return (
    <div className="max-h-[600px] overflow-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-card">
          <tr className="text-left text-muted-foreground">
            <th className="py-1 pr-2">Stat</th>
            {playerNames.map((n, i) => <th key={i} className="py-1 px-2 text-center" style={{ color: SERIES_COLORS[i] }}>{n}</th>)}
          </tr>
        </thead>
        <tbody>
          {cols.map((c) => (
            <tr key={c} className="border-t border-border/30">
              <td className="py-1 pr-2 text-foreground/90">{c}</td>
              {playerIdxs.map((idx, i) => {
                const v = getCell(idx, c);
                const num = typeof v === "number" ? v : parseFloat(String(v ?? ""));
                const p = Number.isNaN(num) ? null : (pctMap.get(c)?.get(num) ?? null);
                const display = mode === "pct" ? p : (Number.isNaN(num) ? null : fmt(num));
                return (
                  <td key={i} className="py-1 px-2 text-center">
                    {display !== null && p !== null ? (
                      <span className={`inline-block min-w-[2.5rem] rounded-full border px-2 py-0.5 font-bold ${scoreToTone(p)}`}>{display}</span>
                    ) : Number.isNaN(num) ? (
                      <span className="text-muted-foreground">{v == null || v === "" ? "—" : String(v)}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
