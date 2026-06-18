import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/stats-att")({
  head: () => ({ meta: [{ title: "Stats+Att | FMDataLab" }] }),
  component: () => (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-[1200px] px-6 py-20 text-center">
        <h1 className="text-3xl font-bold">Stats + Att</h1>
        <p className="mt-2 text-muted-foreground">Em breve.</p>
      </main>
    </div>
  ),
});
