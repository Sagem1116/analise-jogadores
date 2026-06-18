import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { GEMINI_CATALOG, type GeminiMetric } from "@/lib/gemini-roles";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/metricas-gemini")({
  head: () => ({
    meta: [
      { title: "Métricas Gemini — Roles FM24" },
      { name: "description", content: "Catálogo de métricas críticas por role no Football Manager 24, com pesos de importância tática." },
    ],
  }),
  component: MetricasGemini,
});

function weightTone(w: number): string {
  if (w >= 9) return "bg-success/80 text-success-foreground";
  if (w >= 7) return "bg-warning/80 text-warning-foreground";
  return "bg-muted text-muted-foreground";
}

function MetricBar({ m }: { m: GeminiMetric }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-foreground">{m.name}</span>
        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${weightTone(m.weight)}`}>{m.weight}/10</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
        <div className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary" style={{ width: `${m.weight * 10}%` }} />
      </div>
      {m.note && <p className="text-xs text-muted-foreground leading-snug">{m.note}</p>}
    </div>
  );
}

function MetricasGemini() {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return GEMINI_CATALOG;
    return GEMINI_CATALOG.map((cat) => ({
      ...cat,
      roles: cat.roles.filter((r) =>
        r.name.toLowerCase().includes(needle) ||
        r.description.toLowerCase().includes(needle) ||
        r.metrics.some((m) => m.name.toLowerCase().includes(needle))
      ),
    })).filter((cat) => cat.roles.length > 0);
  }, [q]);

  const totalRoles = filtered.reduce((s, c) => s + c.roles.length, 0);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-[1400px] px-6 py-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-widest">Gemini · Análise FM24</span>
            </div>
            <h1 className="mt-2 text-4xl font-bold text-foreground">Métricas por Role</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Para cada função, as métricas mais críticas que o motor de jogo usa. Os pesos (1–10) refletem
              a importância para o sucesso tático: <strong className="text-foreground">10</strong> = falha total se a métrica estiver baixa.
            </p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Procurar role ou métrica…"
              className="pl-9"
            />
          </div>
        </div>

        {q && (
          <p className="mb-4 text-xs text-muted-foreground">
            {totalRoles} role{totalRoles === 1 ? "" : "s"} encontrad{totalRoles === 1 ? "o" : "os"}.
          </p>
        )}

        <div className="space-y-12">
          {filtered.map((cat) => (
            <section key={cat.title}>
              <h2 className="mb-4 border-b border-border pb-2 text-xl font-bold text-foreground">{cat.title}</h2>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {cat.roles.map((r) => (
                  <article key={r.name} className="rounded-xl border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-[0_0_25px_-10px_hsl(var(--primary)/0.5)]">
                    <h3 className="text-base font-bold text-primary">{r.name}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{r.description}</p>
                    <div className="mt-4 space-y-3">
                      {r.metrics.map((m) => <MetricBar key={m.name} m={m} />)}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
          {!filtered.length && (
            <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
              Nenhum role corresponde a “{q}”.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
