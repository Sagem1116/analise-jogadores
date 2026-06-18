import { Link } from "@tanstack/react-router";
import { FlaskConical } from "lucide-react";

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/stats", label: "Stats", badge: "UPDATE" },
  { to: "/att", label: "Att" },
  { to: "/stats-att", label: "Stats+Att" },
];

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="grid h-9 w-9 place-items-center rounded-full border border-primary/60 bg-primary/10">
            <FlaskConical className="h-5 w-5 text-primary" />
          </span>
          <span>FMDataLab</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((it) => (
            <Link
              key={it.to}
              to={it.to as any}
              className="group flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-primary/15 text-foreground" }}
            >
              {it.label}
              {it.badge && (
                <span className="rounded bg-success/20 px-1.5 py-0.5 text-[10px] font-bold text-success">
                  {it.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/30 text-sm font-bold">N</div>
      </div>
    </header>
  );
}
