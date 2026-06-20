## Problema

O perfil do jogador agora abre numa nova aba (`window.open(..., "_blank")`), mas os dados Stats+Att estão guardados em `sessionStorage`, que é **isolado por aba**. A nova aba não vê os dados carregados, por isso mostra "Faltam dados. Faça upload dos dois ficheiros primeiro."

## Solução

### 1. Trocar sessionStorage por localStorage

Substituir `sessionStorage` por `localStorage` nos 3 stores para que os dados persistam entre abas e sessões. As APIs são idênticas — alteração direta.

**Ficheiros:**
- `src/lib/stats-att-store.ts` — setters, getters, clear
- `src/lib/stats-store.ts` — idem
- `src/lib/att-store.ts` — idem

> Quem já tiver dados em sessionStorage terá de re-fazer upload uma vez (namespaces separados).

### 2. Adicionar botão "Limpar dados"

Na página de upload (`/stats-att/`), entre as drop-zones e o botão "Continuar", adicionar um botão secundário de cor destrutiva (ex: `text-red-400` ou `border-red-400`) que:
- Chama uma função `clearSAData()` (a adicionar no store) que remove todas as chaves de localStorage e limpa a cache em memória.
- Mostra confirmação com `confirm()` antes de limpar.

**Ficheiros:**
- `src/lib/stats-att-store.ts` — adicionar `clearSAData()`
- `src/routes/stats-att.index.tsx` — botão "Limpar dados" + handler

### 3. Consistência

A mesma lógica de `localStorage` e `clearData()` aplica-se aos stores irmãos (`stats-store.ts`, `att-store.ts`). Se o utilizador carrega dados nas secções Stats ou Att puras, também devem ser persistentes entre abas.

**Ficheiros:**
- `src/lib/stats-store.ts` — adicionar `clearStatsData()`
- `src/lib/att-store.ts` — adicionar `clearAttData()`