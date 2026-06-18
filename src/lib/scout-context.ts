// Build a compact textual dataset from the loaded stores for the AI Scout.
import { getSAStats, getSAAtt, isNumericColumn } from "@/lib/stats-att-store";
import { getAttPlayers } from "@/lib/att-store";
import { getPlayers as getStatsPlayers } from "@/lib/stats-store";
import { joinPlayers, findCol } from "@/lib/player-join";
import type { PlayerRow } from "@/lib/stats-att-store";

const MAX_ROWS = 250;
const KEY_COLS = ["Nome", "Name", "Clube", "Club", "Idade", "Age", "Posição", "Posicao", "Position", "Pos", "Valor", "Value", "Salário", "Salario", "Wage"];

function pickNumericCols(rows: PlayerRow[]): string[] {
  if (!rows.length) return [];
  return Object.keys(rows[0]).filter((c) => isNumericColumn(rows, c));
}

function toCSV(rows: PlayerRow[], cols: string[]): string {
  const header = cols.join(",");
  const body = rows.slice(0, MAX_ROWS).map((r) =>
    cols.map((c) => {
      const v = r[c];
      if (v === null || v === undefined) return "";
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    }).join(",")
  ).join("\n");
  return `${header}\n${body}`;
}

function summarize(rows: PlayerRow[], label: string): string {
  if (!rows.length) return `### ${label}\n(sem dados carregados)\n`;
  const keys = Object.keys(rows[0]);
  const keyCols = KEY_COLS.filter((k) => keys.includes(k));
  const numCols = pickNumericCols(rows).filter((c) => !keyCols.includes(c));
  const cols = [...keyCols, ...numCols];
  const note = rows.length > MAX_ROWS ? `\n(mostrando ${MAX_ROWS} de ${rows.length} jogadores)` : "";
  return `### ${label} (${rows.length} jogadores)${note}\n\`\`\`csv\n${toCSV(rows, cols)}\n\`\`\`\n`;
}

export function buildScoutContext(): string {
  const sa_stats = getSAStats();
  const sa_att = getSAAtt();
  const statsOnly = getStatsPlayers();
  const attOnly = getAttPlayers();

  const sections: string[] = [];

  if (sa_att.length && sa_stats.length) {
    const join = joinPlayers(sa_att, sa_stats);
    const merged: PlayerRow[] = sa_att.map((row, i) => {
      const s = join.attToStats.get(i);
      if (!s) return row;
      const out: PlayerRow = { ...row };
      for (const [k, v] of Object.entries(s)) {
        if (!(k in out)) out[`stats_${k}`] = v;
      }
      return out;
    });
    sections.push(summarize(merged, "Stats+Att (combinado)"));
    sections.push(`Estratégia de junção: ${join.strategy}${join.warning ? ` — ${join.warning}` : ""}\n`);
  } else if (sa_att.length) {
    sections.push(summarize(sa_att, "Stats+Att (apenas Att carregado)"));
  } else if (sa_stats.length) {
    sections.push(summarize(sa_stats, "Stats+Att (apenas Stats carregado)"));
  }

  if (statsOnly.length) sections.push(summarize(statsOnly, "Stats (página Stats)"));
  if (attOnly.length) sections.push(summarize(attOnly, "Att (página Att)"));

  if (!sections.length) return "(Nenhum ficheiro carregado. Pede ao utilizador para fazer upload de Stats ou Att primeiro.)";
  return sections.join("\n");
}

export function hasAnyData(): boolean {
  return !!(getSAStats().length || getSAAtt().length || getStatsPlayers().length || getAttPlayers().length);
}
