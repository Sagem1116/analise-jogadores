import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { useMemo, useState } from "react";
import { ALL_ROLES, ROLE_GROUPS, loadWeights, saveWeights, type AllRoleWeights } from "@/lib/roles";
import { usePlayers } from "@/lib/stats-store";
import { Plus, Trash2, Save, RotateCcw, ArrowLeftRight, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/stats/weights")({
  head: () => ({ meta: [{ title: "Stats Score Weight | FMDataLab" }] }),
  component: WeightsPage,
});

function WeightsPage() {
  const players = usePlayers();
  const allStats = useMemo(() => (players[0] ? Object.keys(players[0]) : []), [players]);
  const [weights, setWeights] = useState<AllRoleWeights>(() => loadWeights());
  const [activeRole, setActiveRole] = useState<string>(ALL_ROLES[0]);
  const [roleQuery, setRoleQuery] = useState("");
  const [statQuery, setStatQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const current = weights[activeRole] || {};
  const usedStats = Object.keys(current);
  const availableStats = allStats.filter((s) => !usedStats.includes(s) && s.toLowerCase().includes(statQuery.toLowerCase()));

  function update(stat: string, patch: Partial<{ weight: number; invert: boolean }>) {
    setWeights((w) => {
      const prev = w[activeRole]?.[stat] ?? { weight: 50, invert: false };
      return { ...w, [activeRole]: { ...w[activeRole], [stat]: { ...prev, ...patch } } };
    });
  }
  function remove(stat: string) {
    setWeights((w) => {
      const next = { ...(w[activeRole] || {}) }; delete next[stat];
      return { ...w, [activeRole]: next };
    });
  }
  function addStat(stat: string) {
    update(stat, { weight: 50, invert: false });
    setAddOpen(false); setStatQuery("");
  }
  function persist() { saveWeights(weights); toast.success("Pesos guardados"); }
  function resetRole() {
    setWeights((w) => { const n = { ...w }; delete n[activeRole]; return n; });
    toast.success("Role limpo");
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-[1600px] px-6 py-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Stats Score Weight</h1>
            <p className="text-sm text-muted-foreground">Defina o peso de cada stat (0-100) para cada role. Pode marcar stats negativas como invertidas.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/stats/table" className="rounded border border-border bg-card px-4 py-2 text-sm hover:border-primary">Voltar à tabela</Link>
            <button onClick={persist} className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-semibold btn-glow">
              <Save className="h-4 w-4" /> Guardar
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[320px_1fr]">
          {/* Roles sidebar */}
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
                      const count = Object.keys(weights[r] || {}).length;
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

          {/* Editor */}
          <section className="rounded-lg border border-border bg-card p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{activeRole}</h2>
              <div className="flex gap-2">
                <button onClick={resetRole} className="inline-flex items-center gap-2 rounded border border-border px-3 py-1.5 text-xs hover:border-danger hover:text-danger">
                  <RotateCcw className="h-3.5 w-3.5" /> Limpar
                </button>
                <button onClick={() => setAddOpen((v) => !v)} className="inline-flex items-center gap-2 rounded bg-primary px-3 py-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5" /> Adicionar stat
                </button>
              </div>
            </div>

            {addOpen && (
              <div className="mb-4 rounded border border-border bg-background p-3">
                <input value={statQuery} onChange={(e) => setStatQuery(e.target.value)} placeholder="Pesquisar stat para adicionar..." className="mb-2 w-full rounded border border-border bg-input px-2 py-1.5 text-sm" autoFocus />
                <div className="grid max-h-60 grid-cols-2 gap-1 overflow-y-auto md:grid-cols-3">
                  {availableStats.slice(0, 60).map((s) => (
                    <button key={s} onClick={() => addStat(s)} className="rounded px-2 py-1 text-left text-xs hover:bg-primary/20">{s}</button>
                  ))}
                </div>
              </div>
            )}

            {!allStats.length && (
              <p className="rounded border border-warning/50 bg-warning/10 p-3 text-sm">
                Faça upload de dados em <Link to="/stats" className="underline">/stats</Link> para listar as stats disponíveis.
              </p>
            )}

            <div className="space-y-2">
              {usedStats.length === 0 && allStats.length > 0 && (
                <p className="text-sm text-muted-foreground">Sem stats configuradas para este role. Clica em "Adicionar stat".</p>
              )}
              {usedStats.map((stat) => {
                const info = current[stat];
                return (
                  <div key={stat} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-3 rounded border border-border bg-background/50 px-3 py-2">
                    <div className="truncate text-sm font-medium">{stat}</div>
                    <input type="range" min={0} max={100} value={info.weight}
                      onChange={(e) => update(stat, { weight: Number(e.target.value) })}
                      className="w-48 accent-[oklch(0.58_0.25_295)]" />
                    <input type="number" min={0} max={100} value={info.weight}
                      onChange={(e) => update(stat, { weight: Math.max(0, Math.min(100, Number(e.target.value))) })}
                      className="w-16 rounded border border-border bg-input px-2 py-1 text-sm text-center" />
                    <button onClick={() => update(stat, { invert: !info.invert })}
                      className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs ${info.invert ? "border-warning text-warning" : "border-border text-muted-foreground"}`}
                      title="Inverter (stats em que menos é melhor)">
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
