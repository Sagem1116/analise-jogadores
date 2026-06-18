import { createFileRoute, Link } from "@tanstack/react-router";
import { FlaskConical, BarChart3, Layers, Upload, LayoutDashboard } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FMDataLab — Enhance Your Football Manager Player Recruitment" },
      { name: "description", content: "Calculate role scores, discover hidden talents, streamline transfers." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-[1200px] px-6 py-20 text-center">
        <div className="mx-auto mb-6 grid h-24 w-24 place-items-center rounded-full border border-primary/40 bg-card">
          <FlaskConical className="h-12 w-12 text-foreground" />
        </div>
        <h2 className="text-4xl font-bold tracking-tight">FMDataLab</h2>

        <h1 className="mt-10 text-5xl md:text-6xl font-extrabold tracking-tight">
          <span className="text-gradient-purple">ENHANCE YOUR FOOTBALL MANAGER<br />PLAYER RECRUITMENT</span>
        </h1>

        <p className="mx-auto mt-10 max-w-3xl text-lg text-muted-foreground">
          <span className="text-gradient-purple font-semibold">FMDataLab</span> calculates scores for players' proficiency in every playable role within Football Manager.
        </p>
        <p className="mx-auto mt-4 max-w-3xl text-lg text-muted-foreground">
          Use these role scores to <span className="text-primary font-medium">discover hidden talents</span>, <span className="text-primary font-medium">streamline squad & transfer decisions</span>, and <span className="text-primary font-medium">revolutionise your scouting</span>.
        </p>
        <p className="mt-6 text-lg">Your next star player is just a click away!</p>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <FeatureBtn to="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" />
          <FeatureBtn to="/stats" icon={<BarChart3 className="h-4 w-4" />} label="Stats" />
          <FeatureBtn to="/att" icon={<Layers className="h-4 w-4" />} label="Att" />
          <FeatureBtn to="/stats-att" icon={<Upload className="h-4 w-4" />} label="Stats+Att" />
        </div>
      </main>
    </div>
  );
}

function FeatureBtn({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to as any}
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/60 px-5 py-3 text-sm font-medium transition hover:border-primary hover:bg-primary/10"
    >
      {icon} {label}
    </Link>
  );
}
