import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle, X, Send, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askScout, type ScoutMessage } from "@/lib/scout.functions";
import { buildScoutContext, hasAnyData } from "@/lib/scout-context";
import { toast } from "sonner";

const STORAGE_KEY = "fmdatalab_scout_chat_v1";

function loadMessages(): ScoutMessage[] {
  if (typeof localStorage === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}

function renderMarkdown(text: string): string {
  // very small markdown -> html: headings, bold, lists, code fences
  let html = text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-black/40 border border-primary/30 rounded p-2 my-2 text-xs overflow-auto">$1</pre>')
    .replace(/`([^`]+)`/g, '<code class="bg-black/40 px-1 rounded text-primary">$1</code>')
    .replace(/^### (.*)$/gm, '<h3 class="text-primary font-semibold mt-3 mb-1">$1</h3>')
    .replace(/^## (.*)$/gm, '<h2 class="text-primary font-bold mt-3 mb-1 text-base">$1</h2>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-foreground">$1</strong>')
    .replace(/^- (.*)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\n/g, "<br/>");
  return html;
}

export function ScoutChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ScoutMessage[]>(() => loadMessages());
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const ask = useServerFn(askScout);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch {}
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading, open]);

  useEffect(() => {
    if (open && !loading) textareaRef.current?.focus();
  }, [open, loading, messages.length]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    if (!hasAnyData()) {
      toast.warning("Carrega primeiro um ficheiro de Stats ou Att para o Scout analisar.");
      return;
    }
    const next: ScoutMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const dataContext = buildScoutContext();
      const res = await ask({ data: { messages: next, dataContext } });
      setMessages([...next, { role: "assistant", content: res.text }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      toast.error(`Scout falhou: ${msg}`);
      setMessages([...next, { role: "assistant", content: `⚠️ Erro: ${msg}` }]);
    } finally {
      setLoading(false);
    }
  }

  function clear() {
    if (!messages.length) return;
    if (!confirm("Limpar toda a conversa?")) return;
    setMessages([]);
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-[0_0_30px_hsl(var(--primary)/0.6)] hover:shadow-[0_0_45px_hsl(var(--primary)/0.9)] hover:scale-105 transition-all flex items-center justify-center border-2 border-primary/60"
          aria-label="Abrir AI Scout"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[min(440px,calc(100vw-2rem))] h-[min(640px,calc(100vh-3rem))] bg-card border-2 border-primary/60 rounded-xl shadow-[0_0_40px_hsl(var(--primary)/0.5)] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-primary/30 bg-gradient-to-r from-primary/20 to-transparent">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <h3 className="font-semibold text-foreground">AI Scout</h3>
              <span className="text-xs text-muted-foreground">Diretor desportivo</span>
            </div>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" onClick={clear} title="Limpar conversa">
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setOpen(false)} title="Fechar">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
            {messages.length === 0 && (
              <div className="text-muted-foreground space-y-2">
                <p>👋 Pergunta-me sobre os teus jogadores. Exemplos:</p>
                <ul className="text-xs space-y-1 list-disc ml-5">
                  <li>"Analisa o João Neves"</li>
                  <li>"Compara Yamal vs Saka"</li>
                  <li>"Médio defensivo sub-21 com bom passe"</li>
                  <li>"Melhores Moneyball para avançado"</li>
                </ul>
                {!hasAnyData() && (
                  <p className="text-warning text-xs mt-3">⚠️ Carrega primeiro um ficheiro em Stats, Att ou Stats+Att.</p>
                )}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                {m.role === "user" ? (
                  <div className="bg-primary text-primary-foreground rounded-lg rounded-br-sm px-3 py-2 max-w-[85%] whitespace-pre-wrap">
                    {m.content}
                  </div>
                ) : (
                  <div
                    className="text-foreground leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                  />
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Scout a analisar os dados…
              </div>
            )}
          </div>

          <div className="border-t border-primary/30 p-3 bg-background/50">
            <div className="flex gap-2 items-end">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); }
                }}
                placeholder="Pergunta ao Scout…"
                className="min-h-[42px] max-h-32 resize-none focus-visible:ring-primary border-primary/30"
                disabled={loading}
              />
              <Button onClick={send} disabled={loading || !input.trim()} size="icon" className="shrink-0">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
