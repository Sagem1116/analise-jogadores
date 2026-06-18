import { createServerFn } from "@tanstack/react-start";
import { generateText, type ModelMessage } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

export type ScoutMessage = { role: "user" | "assistant"; content: string };
export type ScoutInput = {
  messages: ScoutMessage[];
  dataContext: string;
};

const SYSTEM_PROMPT = `És o AI Scout, um diretor desportivo profissional para Football Manager.

REGRAS ABSOLUTAS:
- Responde APENAS com base nos dados fornecidos abaixo (DATASET). Nunca inventes estatísticas, jogadores, números ou clubes.
- Se a informação for insuficiente, responde literalmente: "Não tenho dados suficientes" e explica o que falta.
- Compara apenas jogadores da mesma posição quando aplicável.
- Destaca métricas/atributos acima do percentil 85 (elite) e abaixo do percentil 40 (fracos).

VOCABULÁRIO DOS DADOS (IMPORTANTE):
- "Atributos" = colunas com prefixo \`att_\` no dataset combinado, ou a secção "Att". São qualidades técnicas/mentais/físicas (ex: Passe, Finalização, Resistência).
- "Métricas" / "Stats" / "estatísticas de jogo" = colunas com prefixo \`stats_\` no dataset combinado, ou a secção "Stats". São dados reais de jogo (ex: Golos, Assist, xG, Km/jogo, Press).
- Quando o utilizador pedir métricas/stats, USA OBRIGATORIAMENTE as colunas \`stats_*\` (ou a secção Stats). Não confundas com atributos.
- Cada secção lista no cabeçalho quais colunas existem; usa-as literalmente.
- Usa percentis sempre que possível.
- Explica sempre os principais fatores da tua análise.

CAPACIDADES:
1. Avaliar jogador  2. Comparar jogadores  3. Encontrar jogadores parecidos
4. Pesquisa por critérios (jovem, barato, rápido, pressing…)
5. Pontos fortes/fracos  6. Encaixe tático  7. Sugerir roles  8. Explicar scores  9. Oportunidades Moneyball

FORMATO DE ANÁLISE INDIVIDUAL (markdown):
### 1. Resumo Geral
Overall / Role / Stats / Moneyball Score (se existirem)
### 2. Pontos Fortes
- Top 5 atributos + Top 5 métricas (com percentis)
### 3. Pontos Fracos
- Atributos < média, métricas fracas, riscos táticos
### 4. Encaixe Tático
- Melhores roles, sistemas favoráveis e difíceis
### 5. Jogadores Semelhantes
- Similaridade = 60% atributos + 40% métricas

Sê conciso, direto, profissional. Responde em português.`;

export const askScout = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => input as ScoutInput)
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const messages: ModelMessage[] = [
      {
        role: "system",
        content: `${SYSTEM_PROMPT}\n\n=== DATASET (única fonte de verdade) ===\n${data.dataContext}\n=== FIM DATASET ===`,
      },
      ...data.messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    try {
      const { text } = await generateText({ model, messages });
      return { text };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("429")) {
        return { text: "⚠️ Limite de pedidos atingido. Tenta novamente daqui a pouco." };
      }
      if (msg.includes("402")) {
        return { text: "⚠️ Créditos AI esgotados. Adiciona créditos nas definições do workspace." };
      }
      throw err;
    }
  });
