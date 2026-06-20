import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Flame, Plus, Trash2, Pencil, ChevronDown, ChevronRight, RotateCcw, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AppHeader } from "@/components/AppHeader";
import {
  LEAK_GROUPS,
  loadLeakRoles,
  saveLeakRoles,
  resetLeakRoles,
  newId,
  type LeakRole,
  type WeightedItem,
} from "@/lib/leak-roles";

export const Route = createFileRoute("/stat-att-leak")({
  head: () => ({
    meta: [
      { title: "Stat+Att Leak — Pesos por Role" },
      { name: "description", content: "Roles editáveis baseados no leak de eventos do FM. Adiciona, edita, remove roles e respetivos atributos e métricas." },
    ],
  }),
  component: LeakPage,
});

function WeightRow({ it, color, onChange, onRemove }: {
  it: WeightedItem; color: "att" | "stat";
  onChange: (next: WeightedItem) => void; onRemove: () => void;
}) {
  const grad = color === "att" ? "from-primary/70 to-primary" : "from-warning/70 to-warning";
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <input
          value={it.name}
          onChange={(e) => onChange({ ...it, name: e.target.value })}
          className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm font-medium text-foreground hover:border-border focus:border-primary focus:bg-input focus:outline-none"
        />
        <input
          type="number" min={0} max={100}
          value={it.pct}
          onChange={(e) => onChange({ ...it, pct: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
          className="w-14 rounded border border-border bg-input px-1.5 py-0.5 text-right text-xs font-bold tabular-nums"
        />
        <span className="text-[11px] font-bold text-muted-foreground">%</span>
        <button onClick={onRemove} className="rounded p-1 text-muted-foreground hover:bg-destructive/15 hover:text-destructive" aria-label="Remover">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
        <div className={`h-full rounded-full bg-gradient-to-r ${grad}`} style={{ width: `${it.pct}%` }} />
      </div>
    </div>
  );
}

function RoleCard({ role, onChange, onDelete }: {
  role: LeakRole; onChange: (next: LeakRole) => void; onDelete: () => void;
}) {
  const [newAtt, setNewAtt] = useState("");
  const [newMet, setNewMet] = useState("");

  const updateAtt = (i: number, next: WeightedItem) => {
    const arr = role.attributes.slice(); arr[i] = next; onChange({ ...role, attributes: arr });
  };
  const removeAtt = (i: number) => onChange({ ...role, attributes: role.attributes.filter((_, j) => j !== i) });
  const addAtt = () => {
    if (!newAtt.trim()) return;
    onChange({ ...role, attributes: [...role.attributes, { name: newAtt.trim(), pct: 5 }] });
    setNewAtt("");
  };
  const updateMet = (i: number, next: WeightedItem) => {
    const arr = role.metrics.slice(); arr[i] = next; onChange({ ...role, metrics: arr });
  };
  const removeMet = (i: number) => onChange({ ...role, metrics: role.metrics.filter((_, j) => j !== i) });
  const addMet = () => {
    if (!newMet.trim()) return;
    onChange({ ...role, metrics: [...role.metrics, { name: newMet.trim(), pct: 5 }] });
    setNewMet("");
  };

  const attTotal = role.attributes.reduce((s, x) => s + x.pct, 0);
  const metTotal = role.metrics.reduce((s, x) => s + x.pct, 0);

  return (
    <article className="rounded-xl border border-border bg-card p-5 transition hover:border-primary/40">
      <header className="mb-4 flex items-start gap-3 border-b border-border pb-3">
        <input
          value={role.emoji}
          onChange={(e) => onChange({ ...role, emoji: e.target.value })}
          className="w-12 rounded border border-transparent bg-transparent text-center text-2xl hover:border-border focus:border-primary focus:bg-input focus:outline-none"
        />
        <div className="min-w-0 flex-1">
          <input
            value={role.name}
            onChange={(e) => onChange({ ...role, name: e.target.value })}
            className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-base font-bold text-foreground hover:border-border focus:border-primary focus:bg-input focus:outline-none"
          />
          <input
            value={role.subtitle ?? ""}
            onChange={(e) => onChange({ ...role, subtitle: e.target.value })}
            placeholder="Subtítulo..."
            className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-xs uppercase tracking-wider text-muted-foreground hover:border-border focus:border-primary focus:bg-input focus:outline-none"
          />
        </div>
        <select
          value={role.group}
          onChange={(e) => onChange({ ...role, group: e.target.value })}
          className="rounded border border-border bg-input px-2 py-1 text-xs"
        >
          {LEAK_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <button onClick={onDelete} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive" aria-label="Apagar role">
          <Trash2 className="h-4 w-4" />
        </button>
      </header>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <h4 className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-primary">
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary" /> Atributos</span>
            <span className={`tabular-nums ${attTotal === 100 ? "text-success" : "text-muted-foreground"}`}>Σ {attTotal}%</span>
          </h4>
          <div className="space-y-2.5">
            {role.attributes.map((a, i) => (
              <WeightRow key={i} it={a} color="att" onChange={(n) => updateAtt(i, n)} onRemove={() => removeAtt(i)} />
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={newAtt} onChange={(e) => setNewAtt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addAtt()}
              placeholder="Novo atributo..."
              className="flex-1 rounded border border-border bg-input px-2 py-1 text-xs"
            />
            <button onClick={addAtt} className="rounded bg-primary/15 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/25">
              <Plus className="inline h-3 w-3" /> Add
            </button>
          </div>
        </div>

        <div>
          <h4 className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-warning">
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-warning" /> Métricas</span>
            <span className={`tabular-nums ${metTotal === 100 ? "text-success" : "text-muted-foreground"}`}>Σ {metTotal}%</span>
          </h4>
          <div className="space-y-2.5">
            {role.metrics.map((m, i) => (
              <WeightRow key={i} it={m} color="stat" onChange={(n) => updateMet(i, n)} onRemove={() => removeMet(i)} />
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={newMet} onChange={(e) => setNewMet(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addMet()}
              placeholder="Nova métrica..."
              className="flex-1 rounded border border-border bg-input px-2 py-1 text-xs"
            />
            <button onClick={addMet} className="rounded bg-warning/15 px-2 py-1 text-xs font-semibold text-warning hover:bg-warning/25">
              <Plus className="inline h-3 w-3" /> Add
            </button>
          </div>
        </div>
      </div>

      <textarea
        value={role.note ?? ""}
        onChange={(e) => onChange({ ...role, note: e.target.value })}
        placeholder="Nota / insight (opcional)..."
        rows={2}
        className="mt-4 w-full rounded border border-border bg-input/50 px-2 py-1.5 text-xs italic text-foreground focus:border-primary focus:outline-none"
      />
    </article>
  );
}

function LeakPage() {
  const [roles, setRoles] = useState<LeakRole[]>([]);
  const [q, setQ] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [openRoles, setOpenRoles] = useState<Record<string, boolean>>({});

  useEffect(() => { setRoles(loadLeakRoles()); }, []);
  useEffect(() => { if (roles.length) saveLeakRoles(roles); }, [roles]);

  const updateRole = (id: string, next: LeakRole) =>
    setRoles((rs) => rs.map((r) => r.id === id ? next : r));
  const deleteRole = (id: string) => {
    if (!confirm("Apagar este role?")) return;
    setRoles((rs) => rs.filter((r) => r.id !== id));
  };
  const addRole = (group: string) => {
    const r: LeakRole = { id: newId(), emoji: "⭐", name: "Novo Role", group, attributes: [], metrics: [] };
    setRoles((rs) => [...rs, r]);
    setOpenGroups((g) => ({ ...g, [group]: true }));
    setOpenRoles((o) => ({ ...o, [r.id]: true }));
  };
  const reset = () => {
    if (!confirm("Repor todos os roles aos valores originais do leak? Perdes as tuas edições.")) return;
    resetLeakRoles();
    setRoles(loadLeakRoles());
  };

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return roles;
    return roles.filter((r) =>
      r.name.toLowerCase().includes(n) ||
      (r.subtitle ?? "").toLowerCase().includes(n) ||
      r.group.toLowerCase().includes(n) ||
      r.attributes.some((a) => a.name.toLowerCase().includes(n)) ||
      r.metrics.some((m) => m.name.toLowerCase().includes(n))
    );
  }, [q, roles]);

  // Custom group list = predefined + any extras coming from role data
  const allGroups = useMemo(() => {
    const set = new Set<string>(LEAK_GROUPS);
    roles.forEach((r) => set.add(r.group));
    return [...set];
  }, [roles]);

  const byGroup = useMemo(() => {
    const map: Record<string, LeakRole[]> = {};
    for (const g of allGroups) map[g] = [];
    for (const r of filtered) {
      if (!map[r.group]) map[r.group] = [];
      map[r.group].push(r);
    }
    return map;
  }, [filtered, allGroups]);

  // Auto-expand all groups while searching
  useEffect(() => {
    if (q.trim()) {
      const all: Record<string, boolean> = {};
      for (const g of allGroups) all[g] = true;
      setOpenGroups(all);
    }
  }, [q, allGroups]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-[1400px] px-6 py-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-warning">
              <Flame className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-widest">Stat+Att Leak</span>
            </div>
            <h1 className="mt-2 text-4xl font-bold text-foreground">Pesos por Role (Leak)</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Roles totalmente editáveis. Adiciona, remove, ajusta pesos e cria novos. Tudo guardado no navegador.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Procurar role..." className="pl-9" />
            </div>
            <button onClick={reset} title="Repor defaults" className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-secondary">
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {allGroups.map((group) => {
            const items = byGroup[group] ?? [];
            const open = !!openGroups[group];
            if (q.trim() && !items.length) return null;
            return (
              <section key={group} className="rounded-xl border border-border bg-card/30">
                <div className="flex items-center justify-between px-5 py-3">
                  <button
                    onClick={() => setOpenGroups((g) => ({ ...g, [group]: !open }))}
                    className="flex items-center gap-2 font-bold hover:text-primary"
                  >
                    {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="text-base">{group}</span>
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{items.length}</span>
                  </button>
                  <button
                    onClick={() => addRole(group)}
                    className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/25"
                  >
                    <Plus className="h-3 w-3" /> Novo role
                  </button>
                </div>

                {open && (
                  <div className="border-t border-border px-4 py-4 space-y-3">
                    {!items.length && (
                      <p className="px-2 py-4 text-sm text-muted-foreground">Sem roles neste grupo.</p>
                    )}
                    {items.map((r) => {
                      const expanded = !!openRoles[r.id];
                      return (
                        <div key={r.id} className="rounded-lg border border-border bg-background/40">
                          <button
                            onClick={() => setOpenRoles((o) => ({ ...o, [r.id]: !expanded }))}
                            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-secondary/40"
                          >
                            <span className="flex items-center gap-3 min-w-0">
                              {expanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                              <span className="text-xl">{r.emoji}</span>
                              <span className="truncate">
                                <span className="font-semibold">{r.name}</span>
                                {r.subtitle && <span className="ml-2 text-xs text-muted-foreground">{r.subtitle}</span>}
                              </span>
                            </span>
                            <span className="flex shrink-0 items-center gap-1.5">
                              <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">{r.attributes.length} att</span>
                              <span className="rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-bold text-warning">{r.metrics.length} met</span>
                            </span>
                          </button>
                          {expanded && (
                            <div className="border-t border-border p-4">
                              <RoleCard role={r} onChange={(n) => updateRole(r.id, n)} onDelete={() => deleteRole(r.id)} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {!filtered.length && q.trim() && (
          <div className="mt-6 rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
            Nenhum role corresponde a "{q}".
          </div>
        )}
      </main>
    </div>
  );
}
