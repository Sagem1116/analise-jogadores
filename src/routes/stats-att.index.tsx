import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { useCallback, useState } from "react";
import { Upload as UploadIcon, FileText, Check } from "lucide-react";
import Papa from "papaparse";
import { setSAStats, setSAAtt, useSAData, type PlayerRow } from "@/lib/stats-att-store";
import { toast } from "sonner";

export const Route = createFileRoute("/stats-att/")({
  head: () => ({ meta: [{ title: "Stats+Att Upload | FMDataLab" }] }),
  component: SAUpload,
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

async function parseFile(file: File): Promise<PlayerRow[]> {
  const text = await file.text();
  if (file.name.toLowerCase().endsWith(".html") || file.name.toLowerCase().endsWith(".htm") || text.trim().startsWith("<")) {
    return parseHtmlTable(text);
  }
  const parsed = Papa.parse<PlayerRow>(text, { header: true, dynamicTyping: true, skipEmptyLines: true });
  return parsed.data as PlayerRow[];
}

function DropZone({ label, count, onFile, loading }: { label: string; count: number; onFile: (f: File) => void; loading: boolean }) {
  const [dragOver, setDragOver] = useState(false);
  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
      className={`relative flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition ${
        dragOver ? "border-primary bg-primary/10 btn-glow" : count > 0 ? "border-success/60 bg-success/5" : "border-border bg-card/40 hover:border-primary/60"
      }`}
    >
      <input type="file" accept=".csv,.html,.htm,text/csv,text/html" className="absolute inset-0 cursor-pointer opacity-0"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/15 text-primary">
        {loading ? <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          : count > 0 ? <Check className="h-7 w-7 text-success" /> : <UploadIcon className="h-7 w-7" />}
      </div>
      <p className="mt-3 text-lg font-semibold">{label}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {loading ? "A processar…" : count > 0 ? `${count} jogadores carregados` : "Arrasta ou clica para escolher"}
      </p>
      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><FileText className="h-4 w-4" /> .html ou .csv</div>
    </label>
  );
}

function SAUpload() {
  const navigate = useNavigate();
  const { stats, att } = useSAData();
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingAtt, setLoadingAtt] = useState(false);

  const handleStats = useCallback(async (f: File) => {
    setLoadingStats(true);
    try { const rows = await parseFile(f); if (!rows.length) { toast.error("Ficheiro Stats vazio"); return; } setSAStats(rows); toast.success(`Stats: ${rows.length} jogadores`); }
    catch (e: any) { toast.error("Erro Stats: " + e.message); } finally { setLoadingStats(false); }
  }, []);
  const handleAtt = useCallback(async (f: File) => {
    setLoadingAtt(true);
    try { const rows = await parseFile(f); if (!rows.length) { toast.error("Ficheiro Att vazio"); return; } setSAAtt(rows); toast.success(`Att: ${rows.length} jogadores`); }
    catch (e: any) { toast.error("Erro Att: " + e.message); } finally { setLoadingAtt(false); }
  }, []);

  const canContinue = stats.length > 0 && att.length > 0;

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-[1200px] px-6 py-10">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold">Stats + Att</h1>
            <p className="mt-1 text-muted-foreground">Faça upload dos dois ficheiros (Stats e Att)</p>
          </div>
          <Link to="/stats-att/weights" className="rounded-md border border-border bg-card px-4 py-2 text-sm hover:border-primary">
            Stats+Att Score Weight
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <DropZone label="Ficheiro Stats" count={stats.length} onFile={handleStats} loading={loadingStats} />
          <DropZone label="Ficheiro Att" count={att.length} onFile={handleAtt} loading={loadingAtt} />
        </div>

        <div className="mt-6 flex justify-end">
          <button disabled={!canContinue} onClick={() => navigate({ to: "/stats-att/table" })}
            className="rounded-md bg-primary px-6 py-2.5 text-sm font-semibold btn-glow disabled:opacity-40">
            Continuar para tabela →
          </button>
        </div>
      </main>
    </div>
  );
}
