import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ALL_ROLES, ROLE_GROUPS,
  loadWeightsSync, fetchWeightsFromDB, saveRoleWeights, deleteRoleWeights, subscribeWeights, type AllRoleWeights,
} from "@/lib/roles";
import {
  loadAttWeightsSync, fetchAttWeightsFromDB, saveAttWeights, deleteAttWeights, subscribeAttWeights, type AllAttWeights,
} from "@/lib/att-roles";
import { useSAData } from "@/lib/stats-att-store";
import { loadFormula, saveFormula, resetFormula, useFormula, DEFAULT_FORMULA, type ScoreFormula } from "@/lib/score-formula";
import { Plus, Trash2, Save, RotateCcw, ArrowLeftRight, Search, Cloud, Download, Upload, Calculator } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/stats-att/weights")({
  head: () => ({ meta: [{ title: "Stats+Att Score Weight | FMDataLab" }] }),
  component: SAWeightsPage,
});

type Tab = "stats" | "att";

function SAWeightsPage() {
  const { stats, att } = useSAData();
  const [tab, setTab] = useState<Tab>("stats");
  const statsCols = useMemo(() => (stats[0] ? Object.keys(stats[0]) : []), [stats]);
  const attCols = useMemo(() => (att[0] ? Object.keys(att[0]) : []), [att]);

  const [sWeights, setSWeights] = useState<AllRoleWeights>(() => loadWeightsSync());
  const [aWeights, setAWeights] = useState<AllAttWeights>(() => loadAttWeightsSync());
  const [activeRole, setActiveRole] = useState<string>(ALL_ROLES[0]);
  const [roleQuery, setRoleQuery] = useState("");
  const [statQuery, setStatQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formulaOpen, setFormulaOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const formula = useFormula();

  useEffect(() => {
    fetchWeightsFromDB().then(setSWeights).catch(() => {});
    fetchAttWeightsFromDB().then(setAWeights).catch(() => {});
    const u1 = subscribeWeights(() => setSWeights(loadWeightsSync()));
    const u2 = subscribeAttWeights(() => setAWeights(loadAttWeightsSync()));
    return () => { u1(); u2(); };
  }, []);

  const allCols = tab === "stats" ? statsCols : attCols;
  const weights = tab === "stats" ? sWeights : aWeights;
  const setWeights = (w: any) => tab === "stats" ? setSWeights(w) : setAWeights(w);
  const current = (weights[activeRole] || {}) as Record<string, { weight: number; invert?: boolean }>;
  const usedStats = Object.keys(current);
  const availableStats = allCols.filter((s) => !usedStats.includes(s) && s.toLowerCase().includes(statQuery.toLowerCase()));

  function update(stat: string, patch: Partial<{ weight: number; invert: boolean }>) {
    setWeights((w: any) => {
      const prev = w[activeRole]?.[stat] ?? { weight: 50, invert: false };
      return { ...w, [activeRole]: { ...w[activeRole], [stat]: { ...prev, ...patch } } };
    });
  }
  function remove(stat: string) {
    setWeights((w: any) => { const next = { ...(w[activeRole] || {}) }; delete next[stat]; return { ...w, [activeRole]: next }; });
  }
  function addStat(stat: string) { update(stat, { weight: 50, invert: false }); setAddOpen(false); setStatQuery(""); }

  async function persist() {
    setSaving(true);
    try {
      if (tab === "stats") await saveRoleWeights(activeRole, sWeights[activeRole] || {});
      else await saveAttWeights(activeRole, aWeights[activeRole] || {});
      toast.success("Pesos guardados na cloud");
    } catch (e: any) { toast.error("Erro: " + e.message); } finally { setSaving(false); }
  }
  async function resetRole() {
    if (tab === "stats") {
      setSWeights((w) => { const n = { ...w }; delete n[activeRole]; return n; });
      try { await deleteRoleWeights(activeRole); toast.success("Role limpo"); } catch (e: any) { toast.error(e.message); }
    } else {
      setAWeights((w) => { const n = { ...w }; delete n[activeRole]; return n; });
      try { await deleteAttWeights(activeRole); toast.success("Role limpo"); } catch (e: any) { toast.error(e.message); }
    }
  }

  function exportJSON() {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      formula: loadFormula(),
      statsWeights: sWeights,
      attWeights: aWeights,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `fmdatalab-weights-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast.success("Pesos exportados");
  }

  async function importJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.formula) saveFormula({ ...DEFAULT_FORMULA, ...data.formula });
      const sIn: AllRoleWeights = data.statsWeights || data.stats || {};
      const aIn: AllAttWeights = data.attWeights || data.att || {};
      // Apply locally first
      setSWeights((curr) => ({ ...curr, ...sIn }));
      setAWeights((curr) => ({ ...curr, ...aIn }));
      // Persist to cloud
      const tasks: Promise<unknown>[] = [];
      for (const [role, w] of Object.entries(sIn)) tasks.push(saveRoleWeights(role, w as any));
      for (const [role, w] of Object.entries(aIn)) tasks.push(saveAttWeights(role, w as any));
      await Promise.allSettled(tasks);
      toast.success(`Importados ${Object.keys(sIn).length} stats + ${Object.keys(aIn).length} att roles`);
    } catch (err: any) {
      toast.error("Ficheiro inválido: " + err.message);
    }
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-[1600px] px-6 py-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Stats+Att Score Weight</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Cloud className="h-3.5 w-3.5 text-primary" /> Pesos partilhados entre páginas · sincronizado.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/stats-att/table" className="rounded border border-border bg-card px-4 py-2 text-sm hover:border-primary">Voltar à tabela</Link>
            <button onClick={() => setFormulaOpen((v) => !v)} className="inline-flex items-center gap-2 rounded border border-border bg-card px-4 py-2 text-sm hover:border-primary">
              <Calculator className="h-4 w-4" /> Fórmula
            </button>
            <button onClick={exportJSON} className="inline-flex items-center gap-2 rounded border border-border bg-card px-4 py-2 text-sm hover:border-primary">
              <Download className="h-4 w-4" /> Exportar JSON
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 rounded border border-border bg-card px-4 py-2 text-sm hover:border-primary">
              <Upload className="h-4 w-4" /> Importar JSON
            </button>
            <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={importJSON} />
            <button onClick={persist} disabled={saving} className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-semibold btn-glow disabled:opacity-60">
              <Save className="h-4 w-4" /> {saving ? "A guardar..." : `Guardar ${tab === "stats" ? "Stats" : "Att"} role`}
            </button>
          </div>
        </div>

        {formulaOpen && <FormulaEditor formula={formula} onClose={() => setFormulaOpen(false)} />}

        <div className="mb-4 inline-flex rounded-lg border border-border bg-card p-1">
          <button onClick={() => { setTab("stats"); setAddOpen(false); }} className={`rounded px-4 py-1.5 text-sm font-semibold ${tab === "stats" ? "bg-primary text-primary-foreground btn-glow" : "text-muted-foreground hover:text-foreground"}`}>Stats</button>
          <button onClick={() => { setTab("att"); setAddOpen(false); }} className={`rounded px-4 py-1.5 text-sm font-semibold ${tab === "att" ? "bg-primary text-primary-foreground btn-glow" : "text-muted-foreground hover:text-foreground"}`}>Att</button>
        </div>

        <div className="grid gap-4 md:grid-cols-[320px_1fr]">
          <aside className="rounded-lg border border-border bg-card p-3">
            <div className="relative mb-3">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={roleQuery} onChange={(e) => setRoleQuery(e.target.value)} placeholder="Pesquisar role..." className="w-full rounded border border-border bg-input pl-8 pr-2 py-1.5 text-sm" />
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              {Object.entries(ROLE_GROUPS).map(([group, roles]) => {
                const visible = roles.filter((r) => r.toLowerCase().includes(roleQuery.toLowerCase()));
                if (!visible.length) return null;
                return (
                  <div key={group} className="mb-3">
                    <div className="mb-1 px-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{group}</div>
                    {visible.map((r) => {
                      const count = Object.keys((weights as any)[r] || {}).length;
                      return (
                        <button key={r} onClick={() => setActiveRole(r)}
                          className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm ${activeRole === r ? "bg-primary/20 text-foreground" : "hover:bg-secondary"}`}>
                          <span className="truncate">{r}</span>
                          {count > 0 && <span className="ml-2 rounded bg-primary/30 px-1.5 text-xs">{count}</span>}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </aside>

          <section className="rounded-lg border border-border bg-card p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{activeRole} <span className="ml-2 text-xs text-muted-foreground">({tab.toUpperCase()})</span></h2>
              <div className="flex gap-2">
                <button onClick={resetRole} className="inline-flex items-center gap-2 rounded border border-border px-3 py-1.5 text-xs hover:border-danger hover:text-danger">
                  <RotateCcw className="h-3.5 w-3.5" /> Limpar
                </button>
                <button onClick={() => setAddOpen((v) => !v)} className="inline-flex items-center gap-2 rounded bg-primary px-3 py-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5" /> Adicionar {tab === "stats" ? "stat" : "atributo"}
                </button>
              </div>
            </div>

            {addOpen && (
              <div className="mb-4 rounded border border-border bg-background p-3">
                <input value={statQuery} onChange={(e) => setStatQuery(e.target.value)} placeholder="Pesquisar..." className="mb-2 w-full rounded border border-border bg-input px-2 py-1.5 text-sm" autoFocus />
                <div className="grid max-h-60 grid-cols-2 gap-1 overflow-y-auto md:grid-cols-3">
                  {availableStats.slice(0, 80).map((s) => (
                    <button key={s} onClick={() => addStat(s)} className="rounded px-2 py-1 text-left text-xs hover:bg-primary/20">{s}</button>
                  ))}
                </div>
              </div>
            )}

            {!allCols.length && (
              <p className="rounded border border-warning/50 bg-warning/10 p-3 text-sm">
                Faça upload em <Link to="/stats-att" className="underline">/stats-att</Link> para listar as colunas disponíveis.
              </p>
            )}

            <div className="space-y-2">
              {usedStats.length === 0 && allCols.length > 0 && (
                <p className="text-sm text-muted-foreground">Sem {tab === "stats" ? "stats" : "atributos"} configurados.</p>
              )}
              {usedStats.map((stat) => {
                const info = current[stat];
                return (
                  <div key={stat} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-3 rounded border border-border bg-background/50 px-3 py-2">
                    <div className="truncate text-sm font-medium">{stat}</div>
                    <input type="range" min={0} max={100} value={info.weight}
                      onChange={(e) => update(stat, { weight: Number(e.target.value) })} className="w-48" />
                    <input type="number" min={0} max={100} value={info.weight}
                      onChange={(e) => update(stat, { weight: Math.max(0, Math.min(100, Number(e.target.value))) })}
                      className="w-16 rounded border border-border bg-input px-2 py-1 text-sm text-center" />
                    <button onClick={() => update(stat, { invert: !info.invert })}
                      className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs ${info.invert ? "border-warning text-warning" : "border-border text-muted-foreground"}`}>
                      <ArrowLeftRight className="h-3 w-3" /> {info.invert ? "Invertida" : "Normal"}
                    </button>
                    <button onClick={() => remove(stat)} className="rounded p-1 text-muted-foreground hover:text-danger">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

const FORMULA_PRESETS: { id: string; name: string; desc: string; formula: ScoreFormula }[] = [
  {
    id: "balanced",
    name: "Equilibrado (default)",
    desc: "Mistura atributos FM e dados reais de forma equilibrada. Bom ponto de partida.",
    formula: { attNormBlend: 0.6, attPctBlend: 0.4, statsPctBlend: 1.0, totalMethod: "geomean", totalAttRatio: 0.5, marketMode: "ignore", marketBlend: 0, wageMode: "ignore", wageBlend: 0 },
  },
  {
    id: "scout",
    name: "Scout Tradicional (Att-first)",
    desc: "Confia sobretudo nos atributos do FM. Útil para jovens/poucos minutos onde stats são ruidosas.",
    formula: { attNormBlend: 0.85, attPctBlend: 0.15, statsPctBlend: 0.8, totalMethod: "weighted", totalAttRatio: 0.75, marketMode: "ignore", marketBlend: 0, wageMode: "ignore", wageBlend: 0 },
  },
  {
    id: "performance",
    name: "Performance (Stats-first)",
    desc: "Privilegia desempenho real em jogo (percentis e stats). Ideal para titulares com muitos minutos.",
    formula: { attNormBlend: 0.3, attPctBlend: 0.7, statsPctBlend: 1.2, totalMethod: "weighted", totalAttRatio: 0.3, marketMode: "ignore", marketBlend: 0, wageMode: "ignore", wageBlend: 0 },
  },
  {
    id: "market-steal",
    name: "Oportunidade de Mercado",
    desc: "Favorece jogadores baratos e mal pagos que performam bem. Ideal para scouting em ligas menores e diamantes brutos.",
    formula: { attNormBlend: 0.5, attPctBlend: 0.5, statsPctBlend: 1.0, totalMethod: "geomean", totalAttRatio: 0.5, marketMode: "discount", marketBlend: 0.9, wageMode: "discount", wageBlend: 0.6 },
  },
  {
    id: "star-premium",
    name: "Elite Confirmada",
    desc: "Premia jogadores valiosos e bem pagos. Reflete o reconhecimento do mercado — estrelas sobem no ranking.",
    formula: { attNormBlend: 0.5, attPctBlend: 0.5, statsPctBlend: 1.0, totalMethod: "geomean", totalAttRatio: 0.5, marketMode: "boost", marketBlend: 0.7, wageMode: "boost", wageBlend: 0.5 },
  },
  {
    id: "financial-efficiency",
    name: "Eficiência Financeira",
    desc: "Maximiza o rendimento por euro. Performance é ajustada pelo custo: baratos sobem, caros descem.",
    formula: { attNormBlend: 0.5, attPctBlend: 0.5, statsPctBlend: 1.0, totalMethod: "geomean", totalAttRatio: 0.5, marketMode: "efficiency", marketBlend: 1.0, wageMode: "efficiency", wageBlend: 1.0 },
  },
];

function FormulaEditor({ formula, onClose }: { formula: ScoreFormula; onClose: () => void }) {
  const [draft, setDraft] = useState<ScoreFormula>(formula);
  const [helpOpen, setHelpOpen] = useState(false);
  useEffect(() => setDraft(formula), [formula]);
  function apply() { saveFormula(draft); toast.success("Fórmula atualizada"); }
  function reset() { resetFormula(); setDraft(DEFAULT_FORMULA); toast.success("Fórmula reposta"); }
  function applyPreset(p: ScoreFormula) { setDraft(p); }
  const activePreset = FORMULA_PRESETS.find((p) =>
    p.formula.attNormBlend === draft.attNormBlend &&
    p.formula.attPctBlend === draft.attPctBlend &&
    p.formula.statsPctBlend === draft.statsPctBlend &&
    p.formula.totalMethod === draft.totalMethod &&
    (draft.totalMethod !== "weighted" || p.formula.totalAttRatio === draft.totalAttRatio) &&
    p.formula.marketMode === draft.marketMode &&
    p.formula.marketBlend === draft.marketBlend &&
    p.formula.wageMode === draft.wageMode &&
    p.formula.wageBlend === draft.wageBlend
  );
  return (
    <div className="mb-4 rounded-lg border border-primary/40 bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">Fórmula dos scores</h3>
        <div className="flex gap-2">
          <button onClick={() => setHelpOpen((v) => !v)} className="rounded border border-border px-3 py-1 text-xs hover:border-primary">{helpOpen ? "Ocultar ajuda" : "Como é calculado?"}</button>
          <button onClick={reset} className="rounded border border-border px-3 py-1 text-xs hover:border-warning">Repor</button>
          <button onClick={apply} className="rounded bg-primary px-3 py-1 text-xs font-semibold">Aplicar</button>
          <button onClick={onClose} className="rounded border border-border px-3 py-1 text-xs">Fechar</button>
        </div>
      </div>

      <div className="mb-4 rounded border border-border bg-background/50 p-3">
        <div className="mb-2 text-sm font-semibold">Presets</div>
        <div className="grid gap-2 md:grid-cols-3">
          {FORMULA_PRESETS.map((p) => {
            const active = activePreset?.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => applyPreset(p.formula)}
                className={`rounded border p-2 text-left text-xs transition ${active ? "border-primary bg-primary/10" : "border-border hover:border-primary/60"}`}
              >
                <div className="mb-1 font-semibold">{p.name}{active && <span className="ml-1 text-primary">●</span>}</div>
                <div className="text-[11px] text-muted-foreground">{p.desc}</div>
              </button>
            );
          })}
        </div>
        <div className="mt-2 text-[11px] text-muted-foreground">Carrega "Aplicar" para guardar o preset escolhido.</div>
      </div>

      {helpOpen && (
        <div className="mb-4 rounded border border-primary/30 bg-background/50 p-3 text-xs leading-relaxed">
          <div className="mb-2 text-sm font-semibold">Como cada score é calculado</div>
          <div className="space-y-2 text-foreground/85">
            <p><b className="text-primary">1. Att Score (por role).</b> Para cada atributo do role calculamos dois sinais: <i>normalizado</i> (valor 1–20 do FM escalado para 0–100) e <i>percentil</i> (posição do jogador face aos outros, 0–100). Combinamos: <code>component = norm × wN + pct × wP</code>. Depois média ponderada pelos pesos do role: <code>attScore = Σ(component × peso) / Σ(peso)</code>.</p>
            <p><b className="text-primary">2. Stats Score (por role).</b> Só usa percentis (não há "máx absoluto" universal para stats derivadas). Para cada stat: <code>statsScore = Σ(percentil × mult × peso) / Σ(peso)</code>. O multiplicador permite amplificar/atenuar o peso global das stats.</p>
            <p><b className="text-primary">3. Total Score.</b> Combina os dois acima. <i>Média geométrica</i> (<code>√(att × stats)</code>) penaliza desequilíbrios — um 90/30 dá ~52, não 60. <i>Ponderada</i> (<code>att × r + stats × (1−r)</code>) é linear: escolhe-se quanto pesa cada lado.</p>
            <p><b className="text-primary">4. Ajuste Financeiro.</b> O score total pode ser ajustado pelo <i>Valor de Mercado (V.P.)</i> e <i>Salário</i> do jogador. Para cada um existem 4 modos:
            <br/>• <b>Ignorar</b> — não afeta o score.
            <br/>• <b>Boost</b> — jogadores mais caros/bem pagos ganham pontos extra (até +25 pts para V.P., +20 para salário).
            <br/>• <b>Discount</b> — jogadores baratos/mal pagos ganham pontos extra. Ideal para descobrir diamantes brutos.
            <br/>• <b>Eficiência</b> — o score é multiplicado por um fator que beneficia quem tem melhor performance/custo. Quem é caro desce, quem é barato sobe.</p>
            <p className="text-muted-foreground">Tudo é recalculado em tempo real quando mudas pesos do role ou a fórmula. Os percentis são por posição quando o filtro está ativo.</p>
          </div>
        </div>
      )}


      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded border border-border bg-background/50 p-3">
          <div className="mb-2 text-sm font-semibold">Att Score (por atributo)</div>
          <pre className="mb-3 overflow-x-auto rounded bg-background p-2 text-[11px] text-foreground/80">
{`component = (normalizado × ${draft.attNormBlend.toFixed(2)}) + (percentil × ${draft.attPctBlend.toFixed(2)})
attScore   = Σ(component × peso) / Σ(peso)`}
          </pre>
          <label className="block text-xs">
            Peso do normalizado: <b>{draft.attNormBlend.toFixed(2)}</b>
            <input type="range" min={0} max={1} step={0.05} value={draft.attNormBlend}
              onChange={(e) => { const v = Number(e.target.value); setDraft({ ...draft, attNormBlend: v, attPctBlend: Math.round((1 - v) * 100) / 100 }); }}
              className="w-full" />
          </label>
          <label className="mt-2 block text-xs">
            Peso do percentil: <b>{draft.attPctBlend.toFixed(2)}</b>
            <input type="range" min={0} max={1} step={0.05} value={draft.attPctBlend}
              onChange={(e) => setDraft({ ...draft, attPctBlend: Number(e.target.value) })} className="w-full" />
          </label>
        </div>

        <div className="rounded border border-border bg-background/50 p-3">
          <div className="mb-2 text-sm font-semibold">Stats Score</div>
          <pre className="mb-3 overflow-x-auto rounded bg-background p-2 text-[11px] text-foreground/80">
{`statsScore = Σ(percentil × ${draft.statsPctBlend.toFixed(2)} × peso) / Σ(peso)`}
          </pre>
          <label className="block text-xs">
            Multiplicador do percentil: <b>{draft.statsPctBlend.toFixed(2)}</b>
            <input type="range" min={0} max={1.5} step={0.05} value={draft.statsPctBlend}
              onChange={(e) => setDraft({ ...draft, statsPctBlend: Number(e.target.value) })} className="w-full" />
          </label>
        </div>

        <div className="rounded border border-border bg-background/50 p-3 md:col-span-2">
          <div className="mb-2 text-sm font-semibold">Total Score</div>
          <pre className="mb-3 overflow-x-auto rounded bg-background p-2 text-[11px] text-foreground/80">
{draft.totalMethod === "geomean"
  ? `total = round( sqrt(attScore × statsScore) )    — média geométrica`
  : `total = round( attScore × ${draft.totalAttRatio.toFixed(2)} + statsScore × ${(1 - draft.totalAttRatio).toFixed(2)} )`}
          </pre>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <label className="flex items-center gap-2">
              <input type="radio" checked={draft.totalMethod === "geomean"} onChange={() => setDraft({ ...draft, totalMethod: "geomean" })} />
              Média geométrica (sqrt)
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={draft.totalMethod === "weighted"} onChange={() => setDraft({ ...draft, totalMethod: "weighted" })} />
              Ponderada
            </label>
            {draft.totalMethod === "weighted" && (
              <label className="flex items-center gap-2">
                <span>Peso Att: <b>{draft.totalAttRatio.toFixed(2)}</b></span>
                <input type="range" min={0} max={1} step={0.05} value={draft.totalAttRatio}
                  onChange={(e) => setDraft({ ...draft, totalAttRatio: Number(e.target.value) })} className="w-40" />
                <span className="text-muted-foreground">(Stats: {(1 - draft.totalAttRatio).toFixed(2)})</span>
              </label>
            )}
          </div>
        </div>

        <div className="rounded border border-border bg-background/50 p-3 md:col-span-2">
          <div className="mb-2 text-sm font-semibold">Ajuste Financeiro (V.P. e Salário)</div>
          <div className="grid gap-4 md:grid-cols-2 text-xs">
            <div>
              <div className="mb-1 font-semibold">Valor de Mercado (V.P.)</div>
              <label className="block mb-1">
                Modo:
                <select value={draft.marketMode} onChange={(e) => setDraft({ ...draft, marketMode: e.target.value as ScoreFormula["marketMode"] })} className="ml-2 rounded border border-border bg-input px-1 py-0.5 text-[11px]">
                  <option value="ignore">Ignorar</option>
                  <option value="boost">Boost (caro sobe)</option>
                  <option value="discount">Discount (barato sobe)</option>
                  <option value="efficiency">Eficiência (perf/custo)</option>
                </select>
              </label>
              {draft.marketMode !== "ignore" && (
                <label className="block">
                  Intensidade: <b>{(draft.marketBlend * 100).toFixed(0)}%</b>
                  <input type="range" min={0} max={1} step={0.05} value={draft.marketBlend}
                    onChange={(e) => setDraft({ ...draft, marketBlend: Number(e.target.value) })} className="w-full" />
                </label>
              )}
            </div>
            <div>
              <div className="mb-1 font-semibold">Salário</div>
              <label className="block mb-1">
                Modo:
                <select value={draft.wageMode} onChange={(e) => setDraft({ ...draft, wageMode: e.target.value as ScoreFormula["wageMode"] })} className="ml-2 rounded border border-border bg-input px-1 py-0.5 text-[11px]">
                  <option value="ignore">Ignorar</option>
                  <option value="boost">Boost (bem pago sobe)</option>
                  <option value="discount">Discount (mal pago sobe)</option>
                  <option value="efficiency">Eficiência (perf/custo)</option>
                </select>
              </label>
              {draft.wageMode !== "ignore" && (
                <label className="block">
                  Intensidade: <b>{(draft.wageBlend * 100).toFixed(0)}%</b>
                  <input type="range" min={0} max={1} step={0.05} value={draft.wageBlend}
                    onChange={(e) => setDraft({ ...draft, wageBlend: Number(e.target.value) })} className="w-full" />
                </label>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
