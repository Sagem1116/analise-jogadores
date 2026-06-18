import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { usePlayers } from "@/lib/stats-store";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard | FMDataLab" }] }),
  component: Dashboard,
});

function Dashboard() {
  const players = usePlayers();
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-[1600px] px-6 py-10">
        <h1 className="text-3xl font-bold">My Shortlist</h1>
        <p className="mt-1 text-muted-foreground">{players.length.toLocaleString()} Total Players</p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Card title="Stats" desc="Upload e analise os dados dos jogadores" to="/stats" />
          <Card title="Att" desc="Em breve" to="/att" />
          <Card title="Stats+Att" desc="Em breve" to="/stats-att" />
        </div>
      </main>
    </div>
  );
}

function Card({ title, desc, to }: { title: string; desc: string; to: string }) {
  return (
    <Link to={to as any} className="block rounded-xl border border-border bg-card p-6 transition hover:border-primary hover:btn-glow">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </Link>
  );
}
