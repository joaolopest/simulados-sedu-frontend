"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSwipeable } from "react-swipeable";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Flag,
  Loader2,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CardQuestao } from "@/components/simulado/card-questao";
import { CronometroSimulado } from "@/components/simulado/cronometro-simulado";
import { IndicadorAutosave } from "@/components/simulado/indicador-autosave";
import { GridProgressoQuestoes } from "@/components/simulado/grid-progresso-questoes";
import { useSimuladoAluno } from "@/hooks/api/use-simulado-aluno";
import { useSimuladoStore } from "@/stores/simulado-store";
import { useTimer } from "@/hooks/use-timer";
import { useAutosave } from "@/hooks/use-autosave";
import { useConexaoOnline } from "@/hooks/use-conexao-online";
import { useAtalhosTeclado } from "@/hooks/use-atalhos-teclado";
import { atualizar, criar } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { RespostaQuestao } from "@/types";

export default function PaginaExecutarSimulado({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading, isError } = useSimuladoAluno(id);
  const { online } = useConexaoOnline();

  const {
    simuladoAtual,
    questaoAtualIndice,
    respostas,
    modoFoco,
    iniciarSimulado,
    responderQuestao,
    marcarRevisao,
    proximaQuestao,
    questaoAnterior,
    irParaQuestao,
    alternarModoFoco,
    finalizarSimulado,
    adicionarAFila,
    obterRespostasDaFila,
    limparFila,
    limpar,
  } = useSimuladoStore();

  const [modalGridAberta, setModalGridAberta] = useState(false);
  const [modalFinalizarAberta, setModalFinalizarAberta] = useState(false);
  const [modalOfflineAberta, setModalOfflineAberta] = useState(false);
  const [enviandoFinal, setEnviandoFinal] = useState(false);

  // inicializa o simulado no store quando os dados chegam
  useEffect(() => {
    if (data?.simulado && simuladoAtual?.id !== data.simulado.id) {
      iniciarSimulado(data.simulado);
    }
  }, [data, simuladoAtual?.id, iniciarSimulado]);

  // detecta queda de conexão
  useEffect(() => {
    if (!online) {
      setModalOfflineAberta(true);
    }
  }, [online]);

  // sincroniza fila pendente quando volta online
  useEffect(() => {
    if (online) {
      const fila = obterRespostasDaFila();
      if (fila.length > 0) {
        void sincronizarFila(id, fila, limparFila);
      }
    }
  }, [online, id, obterRespostasDaFila, limparFila]);

  const questoes = data?.questoes ?? [];
  const totalQuestoes = questoes.length;
  const questaoAtual = questoes[questaoAtualIndice];
  const respostaAtual: RespostaQuestao | undefined = questaoAtual
    ? respostas[questaoAtual.id]
    : undefined;

  // cronômetro
  const duracaoSegundos = useMemo(
    () => (data?.simulado.parametros.tempoLimiteMinutos ?? 60) * 60,
    [data?.simulado.parametros.tempoLimiteMinutos],
  );

  const aoAvisar = useCallback((segundos: number) => {
    if (segundos === 300) {
      toast.warning("5 minutos restantes", {
        description: "Reveja questões marcadas e finalize com calma.",
      });
    } else if (segundos === 60) {
      toast.warning("1 minuto restante", {
        description: "Tempo final — finalize agora.",
      });
    } else if (segundos === 30) {
      toast.error("30 segundos!", {
        description: "Suas respostas atuais serão enviadas automaticamente.",
      });
    }
  }, []);

  const aoTerminarTempo = useCallback(async () => {
    toast.error("Tempo esgotado", {
      description: "Enviando suas respostas...",
    });
    await enviarFinal(id, respostas, true);
    finalizarSimulado();
    router.push(`/aluno/simulado/${id}/resultado`);
  }, [id, respostas, finalizarSimulado, router]);

  const { segundosRestantes } = useTimer({
    duracaoSegundos,
    iniciar: Boolean(data),
    avisos: [300, 60, 30],
    aoAvisar,
    aoTerminar: () => void aoTerminarTempo(),
    persistirEm: `timer-simulado-${id}`,
  });

  // autosave da resposta atual
  const valorAutosave = respostaAtual ?? null;
  const aoSalvar = useCallback(
    async (resposta: RespostaQuestao | null) => {
      if (!resposta || !resposta.alternativaId) return;
      if (!online) {
        adicionarAFila(resposta);
        return;
      }
      try {
        await atualizar(`/simulados/${id}/responder`, {
          questaoId: resposta.questaoId,
          alternativaId: resposta.alternativaId,
        });
      } catch {
        // se falhar online, vai pra fila e tenta depois
        adicionarAFila(resposta);
      }
    },
    [id, online, adicionarAFila],
  );

  const { estado: estadoAutosave, ultimoSalvoEm } = useAutosave({
    valor: valorAutosave,
    aoSalvar,
    debounceMs: 500,
    habilitado:
      Boolean(valorAutosave) && valorAutosave?.alternativaId !== undefined,
  });

  const respostasPendentes = obterRespostasDaFila().length;

  // atalhos teclado
  useAtalhosTeclado(
    [
      {
        tecla: "ArrowLeft",
        acao: () => questaoAnterior(),
        descricao: "Questão anterior",
      },
      {
        tecla: "ArrowRight",
        acao: () => proximaQuestao(),
        descricao: "Próxima questão",
      },
      {
        tecla: "1",
        acao: () => selecionarAlternativaPorIndice(0),
        descricao: "Alternativa A",
      },
      {
        tecla: "2",
        acao: () => selecionarAlternativaPorIndice(1),
        descricao: "Alternativa B",
      },
      {
        tecla: "3",
        acao: () => selecionarAlternativaPorIndice(2),
        descricao: "Alternativa C",
      },
      {
        tecla: "4",
        acao: () => selecionarAlternativaPorIndice(3),
        descricao: "Alternativa D",
      },
      {
        tecla: "f",
        acao: () => alternarModoFoco(),
        descricao: "Alternar modo foco",
      },
      {
        tecla: "r",
        acao: () => questaoAtual && marcarRevisao(questaoAtual.id),
        descricao: "Marcar para revisão",
      },
    ],
    Boolean(data),
  );

  function selecionarAlternativaPorIndice(indice: number) {
    if (!questaoAtual) return;
    const alts = [...questaoAtual.alternativas].sort(
      (a, b) => a.ordem - b.ordem,
    );
    const alt = alts[indice];
    if (alt) responderQuestao(questaoAtual.id, alt.id);
  }

  // swipe lateral (mobile)
  const handlersSwipe = useSwipeable({
    onSwipedLeft: () => proximaQuestao(),
    onSwipedRight: () => questaoAnterior(),
    trackMouse: false,
    delta: 50,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="border-b border-border bg-background/85 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-8 w-32" />
          </div>
        </div>
        <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !data || !questaoAtual) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="rounded-xl border border-destructive/30 bg-destructive-muted p-6 text-center text-destructive">
          <AlertTriangle className="mx-auto size-8" aria-hidden />
          <p className="mt-3 font-serif text-lg">Não foi possível carregar.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push("/aluno/home")}
          >
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  const questaoIds = questoes.map((q) => q.id);

  return (
    <div
      className={cn(
        "flex min-h-screen flex-col bg-background",
        modoFoco && "[&_[data-aux]]:hidden",
      )}
      data-modo-foco={modoFoco}
    >
      {/* barra fina topo mobile (cronômetro) */}
      <div className="md:hidden">
        <CronometroSimulado
          variante="mobile"
          segundosRestantes={segundosRestantes}
          duracaoTotalSegundos={duracaoSegundos}
        />
      </div>

      {/* HEADER desktop + título mobile */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4 md:h-16">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="size-9 shrink-0 md:hidden"
              onClick={() => setModalGridAberta(true)}
              aria-label="Abrir lista de questões"
              data-aux
            >
              <Flag className="size-4" />
            </Button>
            <div className="min-w-0">
              <p className="truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {data.simulado.parametros.nome}
              </p>
              <p className="font-mono text-xs font-medium tabular-nums text-foreground md:hidden">
                <span className="text-primary-text">
                  {questaoAtualIndice + 1}
                </span>
                <span className="text-muted-foreground">
                  /{totalQuestoes}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <CronometroSimulado
              segundosRestantes={segundosRestantes}
              duracaoTotalSegundos={duracaoSegundos}
              className="hidden md:inline-flex"
            />
            <IndicadorAutosave
              estado={estadoAutosave}
              ultimoSalvoEm={ultimoSalvoEm}
              online={online}
              pendentes={respostasPendentes}
              className="hidden sm:inline-flex"
            />
            <Button
              variant="ghost"
              size="icon"
              className="size-9 shrink-0"
              onClick={alternarModoFoco}
              aria-label={modoFoco ? "Sair do modo foco" : "Entrar no modo foco"}
              aria-pressed={modoFoco}
              data-aux
            >
              {modoFoco ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* CONTEÚDO */}
      <div
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6 md:py-10"
        {...handlersSwipe}
      >
        <CardQuestao
          questao={questaoAtual}
          numero={questaoAtualIndice + 1}
          total={totalQuestoes}
          alternativaSelecionadaId={respostaAtual?.alternativaId ?? null}
          aoSelecionar={(altId) => responderQuestao(questaoAtual.id, altId)}
        />

        {/* indicador autosave mobile (após card) */}
        <div className="mt-4 flex justify-center sm:hidden">
          <IndicadorAutosave
            estado={estadoAutosave}
            ultimoSalvoEm={ultimoSalvoEm}
            online={online}
            pendentes={respostasPendentes}
          />
        </div>

        {/* botão revisão */}
        <div className="mt-4 flex justify-center" data-aux>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => marcarRevisao(questaoAtual.id)}
            className={cn(
              "gap-2",
              respostaAtual?.status === "marcada_revisao" &&
                "text-warning hover:text-warning",
            )}
          >
            <Flag className="size-3.5" aria-hidden />
            {respostaAtual?.status === "marcada_revisao"
              ? "Marcada para revisão"
              : "Marcar para revisão"}
          </Button>
        </div>

        {/* desktop: grid de bolinhas */}
        <div className="mt-8 hidden md:block" data-aux>
          <GridProgressoQuestoes
            totalQuestoes={totalQuestoes}
            questaoAtualIndice={questaoAtualIndice}
            respostas={respostas}
            questaoIds={questaoIds}
            aoNavegar={(i) => irParaQuestao(i)}
            variante="rodape"
          />
        </div>
      </div>

      {/* RODAPÉ navegação */}
      <footer
        className="sticky bottom-0 z-10 border-t border-border bg-background/95 backdrop-blur-xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-2 px-4">
          <Button
            variant="ghost"
            onClick={questaoAnterior}
            disabled={questaoAtualIndice === 0}
            className="gap-2"
          >
            <ArrowLeft className="size-4" aria-hidden />
            <span className="hidden sm:inline">Anterior</span>
          </Button>

          {/* mobile: contador clicável que abre grid */}
          <button
            type="button"
            onClick={() => setModalGridAberta(true)}
            className="flex items-center gap-2 rounded-md px-3 py-2 font-mono text-sm font-medium tabular-nums hover:bg-accent md:hidden"
            aria-label="Ver lista de questões"
          >
            <span className="text-primary-text">{questaoAtualIndice + 1}</span>
            <span className="text-muted-foreground">/ {totalQuestoes}</span>
          </button>

          {questaoAtualIndice === totalQuestoes - 1 ? (
            <Button
              onClick={() => setModalFinalizarAberta(true)}
              className="gap-2"
            >
              Finalizar
              <Flag className="size-4" aria-hidden />
            </Button>
          ) : (
            <Button onClick={proximaQuestao} className="gap-2">
              <span className="hidden sm:inline">Próxima</span>
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          )}
        </div>
      </footer>

      {/* MODAL grid de questões */}
      <Dialog open={modalGridAberta} onOpenChange={setModalGridAberta}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Questões</DialogTitle>
            <DialogDescription>
              Toque numa questão pra navegar diretamente.
            </DialogDescription>
          </DialogHeader>
          <GridProgressoQuestoes
            totalQuestoes={totalQuestoes}
            questaoAtualIndice={questaoAtualIndice}
            respostas={respostas}
            questaoIds={questaoIds}
            aoNavegar={(i) => {
              irParaQuestao(i);
              setModalGridAberta(false);
            }}
            variante="grid"
          />
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <Legenda cor="bg-success" rotulo="Respondida" />
            <Legenda cor="bg-primary" rotulo="Atual" />
            <Legenda cor="bg-warning" rotulo="Revisão" />
            <Legenda cor="bg-border" rotulo="Não iniciada" />
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL offline */}
      <Dialog open={modalOfflineAberta} onOpenChange={setModalOfflineAberta}>
        <DialogContent>
          <DialogHeader>
            <div className="flex size-10 items-center justify-center rounded-full bg-warning-muted text-warning">
              <WifiOff className="size-5" />
            </div>
            <DialogTitle>Sem conexão com a internet</DialogTitle>
            <DialogDescription>
              Pode continuar respondendo. Suas respostas estão sendo guardadas
              localmente e vão sincronizar quando a conexão voltar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setModalOfflineAberta(false)}>
              Continuar respondendo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL finalizar */}
      <Dialog
        open={modalFinalizarAberta}
        onOpenChange={setModalFinalizarAberta}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar simulado?</DialogTitle>
            <DialogDescription>
              {(() => {
                const respondidas = Object.values(respostas).filter(
                  (r) => r.status === "respondida",
                ).length;
                const emBranco = totalQuestoes - respondidas;
                if (emBranco === 0) {
                  return "Você respondeu todas as questões. Após confirmar, não dá pra voltar.";
                }
                return `Você ainda tem ${emBranco} ${emBranco === 1 ? "questão" : "questões"} em branco. Após confirmar, não dá pra voltar.`;
              })()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setModalFinalizarAberta(false)}
            >
              Voltar e revisar
            </Button>
            <Button
              onClick={async () => {
                setEnviandoFinal(true);
                await enviarFinal(id, respostas, false);
                finalizarSimulado();
                limpar();
                router.push(`/aluno/simulado/${id}/resultado`);
              }}
              disabled={enviandoFinal}
              className="gap-2"
            >
              {enviandoFinal ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Enviando…
                </>
              ) : (
                <>
                  Finalizar agora
                  <Flag className="size-4" aria-hidden />
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* badge online discreto quando volta */}
      {online && respostasPendentes === 0 && (
        <span className="sr-only" role="status" aria-live="polite">
          <Wifi className="size-3" /> Conexão ativa
        </span>
      )}

      {/* botão sair (canto superior direito mobile, escondido em foco) */}
      <button
        type="button"
        onClick={() => router.push("/aluno/home")}
        className="fixed top-3 right-3 z-30 flex size-8 items-center justify-center rounded-full bg-card/80 text-muted-foreground backdrop-blur-md transition-colors hover:bg-card hover:text-foreground md:hidden"
        aria-label="Sair do simulado"
        data-aux
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

function Legenda({ cor, rotulo }: { cor: string; rotulo: string }) {
  return (
    <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
      <span className={cn("size-2.5 rounded-full", cor)} aria-hidden />
      {rotulo}
    </span>
  );
}

async function sincronizarFila(
  simuladoId: string,
  fila: RespostaQuestao[],
  aoLimpar: () => void,
): Promise<void> {
  try {
    for (const resposta of fila) {
      if (!resposta.alternativaId) continue;
      await atualizar(`/simulados/${simuladoId}/responder`, {
        questaoId: resposta.questaoId,
        alternativaId: resposta.alternativaId,
      });
    }
    aoLimpar();
    toast.success(`${fila.length} ${fila.length === 1 ? "resposta enviada" : "respostas enviadas"}`);
  } catch {
    toast.error("Não consegui sincronizar tudo. Tentando de novo em segundos.");
  }
}

async function enviarFinal(
  simuladoId: string,
  respostas: Record<string, RespostaQuestao>,
  porTempoEsgotado: boolean,
): Promise<void> {
  try {
    await criar(`/simulados/${simuladoId}/finalizar`, {
      respostas: Object.values(respostas),
      porTempoEsgotado,
    });
  } catch {
    toast.error("Falha ao enviar — tentando novamente em segundo plano.");
  }
}
