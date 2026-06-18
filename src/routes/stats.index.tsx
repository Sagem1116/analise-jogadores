import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { useCallback, useState } from "react";
import { Upload as UploadIcon, FileText } from "lucide-react";
import Papa from "papaparse";
import { setPlayers, type PlayerRow } from "@/lib/stats-store";
import { toast } from "sonner";

export const Route = createFileRoute("/stats")({
  head: () => ({ meta: [{ title: "Stats Upload | FMDataLab" }] }),
  component: StatsUpload,
});

function parseHtmlTable(html: string): PlayerRow[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const table = doc.querySelector("table");
  if (!table) return [];
  const headerCells = Array.from(table.querySelectorAll("thead th, tr:first-child th, tr:first-child td"));
  const headers = headerCells.map((c) => (c.textContent || "").trim());
  const bodyRows = Array.from(table.querySelectorAll("tbody tr"));
  const rowsSource = bodyRows.length ? bodyRows : Array.from(table.querySelectorAll("tr")).slice(1);
  return rowsSource.map((tr) => {
    const cells = Array.from(tr.querySelectorAll("td"));
    const row: PlayerRow = {};
    headers.forEach((h, i) => {
      const raw = (cells[i]?.textContent || "").trim();
      const num = parseFloat(raw.replace(/,/g, ""));
      row[h] = raw === "" ? null : !Number.isNaN(num) && /^-?[\d.,]+%?$/.test(raw) ? num : raw;
    });
    return row;
  });
}

function StatsUpload() {
  const navigate = useNavigate();
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setLoading(true);
    try {
      const text = await file.text();
      let rows: PlayerRow[] = [];
      if (file.name.toLowerCase().endsWith(".html") || file.name.toLowerCase().endsWith(".htm") || text.trim().startsWith("<")) {
        rows = parseHtmlTable(text);
      } else {
        const parsed = Papa.parse<PlayerRow>(text, { header: true, dynamicTyping: true, skipEmptyLines: true });
        rows = parsed.data as PlayerRow[];
      }
      if (!rows.length) { toast.error("Ficheiro vazio ou inválido"); return; }
      setPlayers(rows);
      toast.success(`${rows.length} jogadores importados`);
      navigate({ to: "/stats/table" });
    } catch (e: any) {
      toast.error("Erro ao processar: " + e.message);
    } finally { setLoading(false); }
  }, [navigate]);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-[1200px] px-6 py-10">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold">Stats <span className="ml-2 rounded bg-success/20 px-2 py-1 text-xs font-bold text-success">UPDATE</span></h1>
            <p className="mt-1 text-muted-foreground">Faça upload do seu ficheiro de dados (.html ou .csv)</p>
          </div>
          <Link to="/stats/weights" className="rounded-md border border-border bg-card px-4 py-2 text-sm hover:border-primary">
            Stats Score Weight
          </Link>
        </div>

        <label
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault(); setDragOver(false);
            const f = e.dataTransfer.files?.[0]; if (f) handleFile(f);
          }}
          className={`relative flex min-h-[320px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition ${
            dragOver ? "border-primary bg-primary/10 btn-glow" : "border-border bg-card/40 hover:border-primary/60"
          }`}
        >
          <input
            type="file"
            accept=".csv,.html,.htm,text/csv,text/html"
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/15 text-primary">
            {loading ? (
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <UploadIcon className="h-8 w-8" />
            )}
          </div>
          <p className="mt-4 text-lg font-medium">
            {loading ? "A processar…" : dragOver ? "Solta o ficheiro aqui" : "Arrasta o ficheiro ou clica para procurar"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Aceita .html ou .csv exportado do Football Manager</p>
          <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="h-4 w-4" /> Os dados ficam no teu browser
          </div>
        </label>
      </main>
    </div>
  );
}
