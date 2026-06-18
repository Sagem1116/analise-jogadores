// Build a compact textual dataset from the loaded stores for the AI Scout.
import { getSAStats, getSAAtt, isNumericColumn } from "@/lib/stats-att-store";
import { getAttPlayers } from "@/lib/att-store";
import { getPlayers as getStatsPlayers } from "@/lib/stats-store";
import { joinPlayers } from "@/lib/player-join";
import type { PlayerRow } from "@/lib/stats-att-store";

const MAX_ROWS = 300;
const KEY_COLS = ["UID", "IDU", "Nome", "Name", "Clube", "Club", "Idade", "Age", "Posição", "Posicao", "Position", "Pos", "Valor", "Value", "Salário", "Salario", "Wage"];

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

function classifyCols(rows: PlayerRow[]): { keys: string[]; numeric: string[] } {
  if (!rows.length) return { keys: [], numeric: [] };
  const allKeys = Object.keys(rows[0]);
  const keys = KEY_COLS.filter((k) => allKeys.includes(k));
  const numeric = pickNumericCols(rows).filter((c) => !keys.includes(c));
  return { keys, numeric };
}

export function buildScoutContext(): string {
  const sa_stats = getSAStats();
  const sa_att = getSAAtt();
  const statsOnly = getStatsPlayers();
  const attOnly = getAttPlayers();

  const sections: string[] = [];

  // Prefer combined Stats+Att view: explicitly merge att + stats with clear prefixes.
  if (sa_att.length && sa_stats.length) {
    const join = joinPlayers(sa_att, sa_stats);
    const attCls = classifyCols(sa_att);
    const statsCls = classifyCols(sa_stats);

    const merged: PlayerRow[] = sa_att.map((row, i) => {
      const out: PlayerRow = {};
      // identifiers (no prefix)
      for (const k of attCls.keys) out[k] = row[k];
      // attributes -> att_*
      for (const k of attCls.numeric) out[`att_${k}`] = row[k];
      // stats -> stats_*
      const s = join.attToStats.get(i);
      if (s) {
        for (const k of statsCls.numeric) out[`stats_${k}`] = s[k];
      }
      return out;
    });

    const matched = join.attToStats.size;
    sections.push(
      `### Stats+Att (combinado) — ${merged.length} jogadores, ${matched} com stats associadas\n` +
      `Estratégia de junção: ${join.strategy}${join.warning ? ` — ${join.warning}` : ""}\n` +
      `**Atributos (att_*)**: ${attCls.numeric.join(", ") || "(nenhum)"}\n` +
      `**Métricas / Stats (stats_*)**: ${statsCls.numeric.join(", ") || "(nenhuma)"}\n\n` +
      "```csv\n" + toCSV(merged, [...attCls.keys, ...attCls.numeric.map((c) => `att_${c}`), ...statsCls.numeric.map((c) => `stats_${c}`)]) + "\n```\n"
    );
  } else {
    if (sa_att.length) {
      const c = classifyCols(sa_att);
      sections.push(
        `### Stats+Att — apenas ficheiro de Att carregado (${sa_att.length} jogadores)\n` +
        `**Atributos**: ${c.numeric.join(", ")}\n\n` +
        "```csv\n" + toCSV(sa_att, [...c.keys, ...c.numeric]) + "\n```\n"
      );
    }
    if (sa_stats.length) {
      const c = classifyCols(sa_stats);
      sections.push(
        `### Stats+Att — apenas ficheiro de Stats/Métricas carregado (${sa_stats.length} jogadores)\n` +
        `**Métricas**: ${c.numeric.join(", ")}\n\n` +
        "```csv\n" + toCSV(sa_stats, [...c.keys, ...c.numeric]) + "\n```\n"
      );
    }
  }

  if (statsOnly.length) {
    const c = classifyCols(statsOnly);
    sections.push(
      `### Stats (página Stats) — ${statsOnly.length} jogadores — MÉTRICAS DE JOGO\n` +
      `**Métricas**: ${c.numeric.join(", ")}\n\n` +
      "```csv\n" + toCSV(statsOnly, [...c.keys, ...c.numeric]) + "\n```\n"
    );
  }
  if (attOnly.length) {
    const c = classifyCols(attOnly);
    sections.push(
      `### Att (página Att) — ${attOnly.length} jogadores — ATRIBUTOS\n` +
      `**Atributos**: ${c.numeric.join(", ")}\n\n` +
      "```csv\n" + toCSV(attOnly, [...c.keys, ...c.numeric]) + "\n```\n"
    );
  }

  if (!sections.length) return "(Nenhum ficheiro carregado. Pede ao utilizador para fazer upload de Stats ou Att primeiro.)";
  return sections.join("\n");
}

export function hasAnyData(): boolean {
  return !!(getSAStats().length || getSAAtt().length || getStatsPlayers().length || getAttPlayers().length);
}
