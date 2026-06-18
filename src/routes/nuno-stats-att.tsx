import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Flame } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NUNO_ROLES, type WeightedItem } from "@/lib/nuno-roles";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/nuno-stats-att")({
  head: () => ({
    meta: [
      { title: "Nuno Stats+Att — Pesos por Role" },
      { name: "description", content: "Pesos de atributos e métricas por role, segundo o sistema Nuno (Stats+Att)." },
    ],
  }),
  component: NunoPage,
});

function Row({ it, color }: { it: WeightedItem; color: "att" | "stat" }) {
  const grad = color === "att"
    ? "from-primary/70 to-primary"
    : "from-warning/70 to-warning";
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-foreground">
          {it.name}
          {it.note && <span className="ml-1 text-xs text-muted-foreground">({it.note})</span>}
        </span>
        <span className="shrink-0 text-[11px] font-bold tabular-nums text-muted-foreground">{it.pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
        <div className={`h-full rounded-full bg-gradient-to-r ${grad}`} style={{ width: `${it.pct}%` }} />
      </div>
    </div>
  );
}

function NunoPage() {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return NUNO_ROLES;
    return NUNO_ROLES.filter((r) =>
      r.name.toLowerCase().includes(n) ||
      (r.subtitle ?? "").toLowerCase().includes(n) ||
      r.attributes.some((a) => a.name.toLowerCase().includes(n)) ||
      r.metrics.some((m) => m.name.toLowerCase().includes(n))
    );
  }, [q]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-[1400px] px-6 py-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-warning">
              <Flame className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-widest">Nuno · Stats + Att</span>
            </div>
            <h1 className="mt-2 text-4xl font-bold text-foreground">Pesos por Role</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Combinação de atributos FM e métricas de jogo reais. Cada role lista a % de importância de cada
              atributo e de cada métrica para avaliar adequação tática.
            </p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Procurar role, atributo ou métrica…"
              className="pl-9"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {filtered.map((r, i) => (
            <article key={`${r.name}-${i}`} className="rounded-xl border border-border bg-card p-6 transition hover:border-primary/40 hover:shadow-[0_0_30px_-10px_hsl(var(--primary)/0.5)]">
              <header className="mb-5 flex items-start gap-3 border-b border-border pb-4">
                <span className="text-3xl leading-none">{r.emoji}</span>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{r.name}</h3>
                  {r.subtitle && <p className="text-xs uppercase tracking-wider text-muted-foreground">{r.subtitle}</p>}
                </div>
              </header>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                    <span className="h-2 w-2 rounded-full bg-primary" /> Atributos
                  </h4>
                  <div className="space-y-3">
                    {r.attributes.map((a) => <Row key={a.name} it={a} color="att" />)}
                  </div>
                </div>
                <div>
                  <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-warning">
                    <span className="h-2 w-2 rounded-full bg-warning" /> Métricas
                  </h4>
                  <div className="space-y-3">
                    {r.metrics.map((m) => <Row key={m.name} it={m} color="stat" />)}
                  </div>
                </div>
              </div>

              {r.note && (
                <p className="mt-5 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs italic leading-relaxed text-foreground">
                  👉 {r.note}
                </p>
              )}
            </article>
          ))}
          {!filtered.length && (
            <div className="col-span-full rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
              Nenhum role corresponde a “{q}”.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
