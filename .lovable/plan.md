## Plano de implementação

### 1. Junção de jogadores por UID/IDU (Stats+Att)
- Em `src/routes/stats-att.table.tsx` (e no novo perfil), substituir o cruzamento atual por Nome.
- Detectar coluna de ID: procurar `UID`, `IDU`, `Uid`, `Id` (case-insensitive) em ambos ficheiros.
- Estratégia:
  1. Se ambos ficheiros têm coluna ID **e** os valores são únicos em ambos → join por ID.
  2. Caso contrário (coluna ausente num dos ficheiros, ou valores duplicados/em falta) → fallback para `Nome + Clube`.
  3. Mostrar `toast.warning` (sonner) a explicar qual estratégia foi usada e porquê (ex.: "UID com 3 duplicados — a juntar por Nome+Clube").

### 2. Colunas Stats visíveis na tabela Stats+Att
- A tabela atualmente só mostra colunas Att + 3 scores. Passar a mostrar também todas as colunas do ficheiro Stats (prefixadas para evitar colisões, ex.: `Stats: Mins`, `Stats: Golos`).
- Manter coluna Nome fixa, os 3 scores (Score Att / Score Stats / Score Total) imediatamente após Nome, depois colunas Att, depois colunas Stats.
- Filtros Min/Max e visibilidade aplicam-se a todas.

### 3. Persistência de filtros de colunas em "View"
- Aplicar nas três tabelas (`stats.table`, `att.table`, `stats-att.table`).
- Guardar em `localStorage` por página: visibilidade de colunas + filtros min/max + monetários + ordenação. Chaves: `fmdatalab_view_stats`, `fmdatalab_view_att`, `fmdatalab_view_sa`.
- Restaurar no mount; gravar em cada alteração.

### 4. Perfil de jogador (Stats+Att)
Nova rota: `src/routes/stats-att.player.$key.tsx` (key = UID ou `Nome|Clube`). Click numa linha da tabela navega para esta rota.

Layout (mobile-first, grid responsivo):

```
┌────────────────────────────────────────────────────────────┐
│ ← Voltar              [Nome do Jogador]      [Comparar +]  │
├──────────────────┬───────────────────┬─────────────────────┤
│ Info Geral       │ Clube             │ Personalidade       │
│ Idade Altura Peso│ Divisão           │ Prós / Contras      │
│ Nac 2ªNac Intl   │ Valor Salário     │ Pos / Pos Sec       │
│ Golos            │                   │ Mins Jogos Golos    │
└──────────────────┴───────────────────┴─────────────────────┘

[Role: dropdown ▼]        [● Bruto  ○ Percentil]

┌───────────── Atributos (role) ─────────────┐
│ Lista atributos com peso > 0, ordenados    │
│ por peso. Cada um: nome | valor (badge cor)│
└────────────────────────────────────────────┘

┌───────────── Stats (role) ─────────────────┐
│ Idem, para stats do role                   │
└────────────────────────────────────────────┘
```

- Badges de cor: reutilizar os thresholds das tabelas (verde ≥ X, amarelo, vermelho).
- Toggle Bruto/Percentil controla o valor mostrado (badge cor baseia-se sempre no percentil).
- Dropdown role: lista `ALL_ROLES`.

### 5. Comparação de jogadores
- Botão "Comparar" abre `Dialog` com `Input` de pesquisa e auto-sugestões (lista de nomes filtrada). Suporta adicionar vários (até 3 comparações = 4 jogadores no total).
- Vista comparativa:
  - Cabeçalho por coluna: Nome + Clube de cada jogador.
  - Tabela lado-a-lado dos att/stats relevantes do role escolhido com badges de cor por jogador.
  - **Dois gráficos radar** (`recharts` `RadarChart`):
    - Radar 1: atributos do role.
    - Radar 2: stats do role.
    - Cada jogador é uma série/cor distinta.
- Mantém os dados na mesma página (não navega).

### Detalhes técnicos

**Novos ficheiros:**
- `src/lib/player-join.ts` — função `joinPlayers(stats, att)` que devolve `{ joined, strategy, warning }`.
- `src/lib/view-prefs.ts` — helper `useViewPrefs(key)` com `localStorage`.
- `src/lib/score-color.ts` — função `scoreToTone(score) → 'good'|'mid'|'bad'` (thresholds existentes).
- `src/routes/stats-att.player.$key.tsx` — perfil + comparação.
- `src/components/PlayerRadar.tsx` — wrapper recharts.

**Ficheiros alterados:**
- `src/lib/stats-att-store.ts` — expor join helper, adicionar `getPlayerByKey`.
- `src/routes/stats-att.table.tsx` — incluir colunas Stats, click→perfil, persistência view.
- `src/routes/stats.table.tsx` e `src/routes/att.table.tsx` — persistência view.
- `src/routeTree.gen.ts` — registar nova rota.

**Dependências:** `recharts` já deve estar instalado (shadcn chart). Confirmar.

**Sem alterações a BD/migrações.**
