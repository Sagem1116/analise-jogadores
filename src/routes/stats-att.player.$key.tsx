import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, X, Plus, Search } from "lucide-react";
import { useSAData, isNumericColumn, computePercentiles, computeNormalized, type PlayerRow } from "@/lib/stats-att-store";
import { ALL_ROLES, loadWeightsSync, fetchWeightsFromDB, type AllRoleWeights } from "@/lib/roles";
import { loadAttWeightsSync, fetchAttWeightsFromDB, type AllAttWeights } from "@/lib/att-roles";
import { joinPlayers, scoreToTone, findCol } from "@/lib/player-join";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";

export const Route = createFileRoute("/stats-att/player/$key")({
  head: () => ({ meta: [{ title: "Player Profile | FMDataLab" }] }),
  component: PlayerProfile,
});

const SERIES_COLORS = ["oklch(0.75 0.32 300)", "oklch(0.72 0.25 200)", "oklch(0.75 0.25 140)", "oklch(0.75 0.25 50)"];

function pct(map: Map<string, Map<number, number>>, col: string, v: any): number | null {
  const num = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  if (Number.isNaN(num)) return null;
  return map.get(col)?.get(num) ?? null;
}
function fmt(v: any): string {
  if (v == null || v === "") return "—";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(2);
  return String(v);
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

  const nameCol = findCol(att, ["Nome", "Name"]) ?? "Nome";
  const clubCol = findCol(att, ["Clube", "Club"]) ?? "Clube";

  // Build a map key -> { att row index }
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

  function getCell(idx: number, side: "att" | "stats", col: string): any {
    if (side === "att") return att[idx][col];
    const sr = join.attToStats.get(idx);
    return sr ? sr[col] : null;
  }

  // Compute scores for one player + role
  function scoresFor(idx: number, role: string): { att: number; stats: number; total: number } {
    const aw = aWeights[role] || {};
    let aSum = 0, aTot = 0;
    for (const stat in aw) {
      const info = aw[stat];
      const v = att[idx][stat]; const num = typeof v === "number" ? v : parseFloat(String(v ?? ""));
      if (Number.isNaN(num)) continue;
      let p = attPct.get(stat)?.get(num) ?? 0; let n = attNorm.get(stat)?.get(num) ?? 0;
      if (info.invert) { p = 100 - p; n = 100 - n; }
      aSum += (n * 0.6 + p * 0.4) * info.weight; aTot += info.weight;
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
      sSum += p * info.weight; sTot += info.weight;
    }
    const s = sTot ? Math.round(sSum / sTot) : 0;
    return { att: a, stats: s, total: Math.round(Math.sqrt(a * s)) };
  }

  const player = att[mainIdx];
  const statsRow = join.attToStats.get(mainIdx);

  function field(row: PlayerRow | undefined, candidates: string[]): any {
    if (!row) return null;
    for (const c of candidates) if (row[c] != null && row[c] !== "") return row[c];
    return null;
  }

  // Role-specific weighted attribute & stat lists
  const roleAttList = Object.entries(aWeights[selectedRole] || {})
    .filter(([, w]) => (w as any).weight > 0)
    .sort((a, b) => (b[1] as any).weight - (a[1] as any).weight);
  const roleStatList = Object.entries(sWeights[selectedRole] || {})
    .filter(([, w]) => (w as any).weight > 0)
    .sort((a, b) => (b[1] as any).weight - (a[1] as any).weight);

  // Search candidates for compare
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

  const mainScores = scoresFor(mainIdx, selectedRole);

  // Build radar data
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

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-[1400px] px-4 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link to="/stats-att/table" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Voltar à tabela
          </Link>
          <button onClick={() => setCompareOpen(true)} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold btn-glow">
            <Plus className="h-4 w-4" /> Comparar jogador
          </button>
        </div>

        <h1 className="mb-1 text-3xl font-bold">{String(player[nameCol] ?? "")}</h1>
        <p className="mb-5 text-sm text-muted-foreground">{String(player[clubCol] ?? "")}</p>

        {/* Info Boxes */}
        <div className="grid gap-4 md:grid-cols-3">
          <InfoBox title="Info Geral">
            <Row k="Idade" v={fmt(field(player, ["Idade", "Age"]))} />
            <Row k="Altura" v={fmt(field(player, ["Altura", "Height"]))} />
            <Row k="Peso" v={fmt(field(player, ["Peso", "Weight"]))} />
            <Row k="Nac" v={fmt(field(player, ["Nac", "Nationality"]))} />
            <Row k="2ª Nac" v={fmt(field(player, ["2ª Nac", "Second Nat"]))} />
            <Row k="Internacionalizações" v={fmt(field(player, ["Internacionalizações", "Caps"]))} />
            <Row k="Golos Intl" v={fmt(field(player, ["Golos", "Intl Goals"]))} />
          </InfoBox>
          <InfoBox title="Clube">
            <Row k="Clube" v={fmt(field(player, ["Clube", "Club"]))} />
            <Row k="Divisão" v={fmt(field(player, ["Divisão", "Division"]))} />
            <Row k="Preço" v={fmt(field(player, ["Valor Estimado", "Transfer Value"]))} />
            <Row k="Salário" v={fmt(field(player, ["Salário", "Wage"]))} />
            <Row k="Pé Esq." v={fmt(field(player, ["Pé Esquerdo", "Left Foot"]))} />
            <Row k="Pé Dir." v={fmt(field(player, ["Pé Direito", "Right Foot"]))} />
          </InfoBox>
          <InfoBox title="Perfil">
            <Row k="Posição" v={fmt(field(player, ["Posição", "Position"]))} />
            <Row k="Pos. Sec." v={fmt(field(player, ["Posição Sec.", "Sec Position"]))} />
            <Row k="Personalidade" v={fmt(field(player, ["Personalidade", "Personality"]))} />
            <Row k="Mins" v={fmt(field(statsRow, ["Mins", "Minutes Played", "Min"]))} />
            <Row k="Jogos" v={fmt(field(statsRow, ["Apps", "Starts", "Jogos"]))} />
            <Row k="Golos" v={fmt(field(statsRow, ["Gls", "Goals", "Golos"]))} />
          </InfoBox>
        </div>

        {(field(player, ["Prós"]) || field(player, ["Contras"])) && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {field(player, ["Prós"]) && (
              <div className="rounded-lg border border-success/40 bg-success/5 p-4">
                <h3 className="mb-2 text-sm font-bold text-success">Prós</h3>
                <p className="text-sm text-foreground/90">{String(field(player, ["Prós"]))}</p>
              </div>
            )}
            {field(player, ["Contras"]) && (
              <div className="rounded-lg border border-danger/40 bg-danger/5 p-4">
                <h3 className="mb-2 text-sm font-bold text-danger">Contras</h3>
                <p className="text-sm text-foreground/90">{String(field(player, ["Contras"]))}</p>
              </div>
            )}
          </div>
        )}

        {/* Role selector + mode + score badges */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
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
          <div className="flex gap-3">
            <ScoreBadge label="Att" value={mainScores.att} />
            <ScoreBadge label="Stats" value={mainScores.stats} />
            <ScoreBadge label="Total" value={mainScores.total} highlight />
          </div>
        </div>

        {/* Compared players summary */}
        {compareKeys.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {compareKeys.map((k, i) => {
              const idx = playerByKey.get(k); if (idx === undefined) return null;
              const sc = scoresFor(idx, selectedRole);
              return (
                <div key={k} className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: SERIES_COLORS[i + 1] }} />
                  <span className="font-semibold">{String(att[idx][nameCol] ?? "")}</span>
                  <span className="text-muted-foreground">· Att {sc.att} · Stats {sc.stats} · Total {sc.total}</span>
                  <button onClick={() => setCompareKeys(compareKeys.filter((x) => x !== k))} className="ml-1 opacity-60 hover:opacity-100"><X className="h-3 w-3" /></button>
                </div>
              );
            })}
          </div>
        )}

        {/* Att + Stats lists */}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <AttList
            title={`Atributos (${selectedRole})`}
            items={roleAttList}
            playerIdxs={playerIdxs}
            getCell={(idx, col) => getCell(idx, "att", col)}
            pctMap={attPct}
            mode={mode}
            mainName={String(player[nameCol] ?? "")}
            otherNames={compareKeys.map((k) => { const idx = playerByKey.get(k); return idx !== undefined ? String(att[idx][nameCol] ?? "") : ""; })}
          />
          <AttList
            title={`Stats (${selectedRole})`}
            items={roleStatList}
            playerIdxs={playerIdxs}
            getCell={(idx, col) => getCell(idx, "stats", col)}
            pctMap={statsPct}
            mode={mode}
            mainName={String(player[nameCol] ?? "")}
            otherNames={compareKeys.map((k) => { const idx = playerByKey.get(k); return idx !== undefined ? String(att[idx][nameCol] ?? "") : ""; })}
          />
        </div>

        {/* Radar charts */}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <RadarPanel title="Radar Atributos" data={attRadarData} playerIdxs={playerIdxs} att={att} nameCol={nameCol} />
          <RadarPanel title="Radar Stats" data={statsRadarData} playerIdxs={playerIdxs} att={att} nameCol={nameCol} />
        </div>
      </main>

      {/* Compare dialog */}
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
                <button key={c.key} onClick={() => { setCompareKeys([...compareKeys, c.key].slice(0, 3)); setCompareSearch(""); setCompareOpen(false); }}
                  className="flex w-full items-center justify-between rounded px-3 py-2 text-sm hover:bg-secondary">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c.club}</span>
                </button>
              ))}
              {!candidates.length && compareSearch && <p className="px-3 py-2 text-sm text-muted-foreground">Sem resultados</p>}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Máx. 3 comparações.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-primary">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/30 py-1 text-sm last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-foreground">{v}</span>
    </div>
  );
}
function ScoreBadge({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`flex flex-col items-center rounded-md border px-4 py-2 ${highlight ? "border-primary/60 bg-primary/15" : "border-border bg-card"}`}>
      <span className="text-xs uppercase text-muted-foreground">{label}</span>
      <span className={`text-2xl font-bold ${scoreToTone(value).split(" ").find((c) => c.startsWith("text-"))}`}>{value}</span>
    </div>
  );
}

function AttList({ title, items, playerIdxs, getCell, pctMap, mode, mainName, otherNames }: {
  title: string;
  items: [string, { weight: number; invert?: boolean }][];
  playerIdxs: number[];
  getCell: (idx: number, col: string) => any;
  pctMap: Map<string, Map<number, number>>;
  mode: "raw" | "pct";
  mainName: string;
  otherNames: string[];
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
              <th className="py-1 text-center">{mainName}</th>
              {otherNames.map((n, i) => <th key={i} className="py-1 text-center" style={{ color: SERIES_COLORS[i + 1] }}>{n}</th>)}
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

function RadarPanel({ title, data, playerIdxs, att, nameCol }: { title: string; data: any[]; playerIdxs: number[]; att: PlayerRow[]; nameCol: string }) {
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
          {playerIdxs.map((idx, i) => (
            <Radar key={i} name={String(att[idx][nameCol] ?? "")} dataKey={`p${i}`}
              stroke={SERIES_COLORS[i]} fill={SERIES_COLORS[i]} fillOpacity={0.25} />
          ))}
          <Tooltip contentStyle={{ background: "oklch(0.18 0.03 285)", border: "1px solid oklch(0.3 0.04 285)", borderRadius: 8 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
