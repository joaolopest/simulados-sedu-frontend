"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSwipeable } from "react-swipeable";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  CaseSensitive,
  Contrast,
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
import { useAcessibilidade } from "@/hooks/use-acessibilidade";
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
    preferencias,
    atualizar: atualizarAcessibilidade,
  } = useAcessibilidade();

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
    limpar,
  } = useSimuladoStore();

  const [modalGridAberta, setModalGridAberta] = useState(false);
  const [modalFinalizarAberta, setModalFinalizarAberta] = useState(false);
  const [modalOfflineAberta, setModalOfflineAberta] = useState(false);
  const [enviandoFinal, setEnviandoFinal] = useState(false);

  // inicializa o simulado no store quando os dados chegam
  useEffect(() => {
    if (data?.simulado && simuladoAtual?.id !== data.simulado.id) {
      iniciarSimulado(data.simulado, data.respostas ?? []);
    }
  }, [data, simuladoAtual?.id, iniciarSimulado]);

  // detecta queda de conexão
  const questoes = data?.questoes ?? [];
  const totalQuestoes = questoes.length;
  const questaoAtual = questoes[questaoAtualIndice];
  const respostaAtual: RespostaQuestao | undefined = questaoAtual
    ? respostas[questaoAtual.id]
    : undefined;

  // cronômetro
  const duracaoSegundos = useMemo(
    () =>
      data?.acessibilidade?.tempoTotalSegundos ??
      (data?.simulado.parametros.tempoLimiteMinutos ?? 60) * 60,
    [
      data?.acessibilidade?.tempoTotalSegundos,
      data?.simulado.parametros.tempoLimiteMinutos,
    ],
  );

  const recursosAcessibilidade = data?.acessibilidade?.recursos;
  const temControlesAcessibilidade = Boolean(
    recursosAcessibilidade?.fonteMaior ||
      recursosAcessibilidade?.altoContraste ||
      recursosAcessibilidade?.leituraSimplificada,
  );
  const tempoExtraMinutos = Math.round(
    (data?.acessibilidade?.tempoExtraAplicado ?? 0) / 60,
  );

  const alternarTamanhoFonte = useCallback(() => {
    const proximo =
      preferencias.tamanhoFonte === "padrao"
        ? "grande"
        : preferencias.tamanhoFonte === "grande"
          ? "extra-grande"
          : "padrao";
    atualizarAcessibilidade({ tamanhoFonte: proximo });
  }, [atualizarAcessibilidade, preferencias.tamanhoFonte]);

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
    const finalizacao = await enviarFinal(id, respostas, true);
    finalizarSimulado();
    if (finalizacao.resultadoDisponivel === false) {
      toast.success(finalizacao.mensagem ?? "Respostas enviadas.");
      router.push("/aluno/home");
      return;
    }
    router.push(`/aluno/simulado/${id}/resultado`);
  }, [id, respostas, finalizarSimulado, router]);

  const { segundosRestantes } = useTimer({
    duracaoSegundos,
    iniciar: Boolean(data),
    avisos: [300, 60, 30],
    aoAvisar,
    aoTerminar: () => void aoTerminarTempo(),
  });

  // autosave da resposta atual
  const valorAutosave = respostaAtual ?? null;
  const aoSalvar = useCallback(
    async (resposta: RespostaQuestao | null) => {
      if (!resposta || !resposta.alternativaId) return;
      if (!online) {
        toast.error("Sem conexao com o backend. A resposta ainda nao foi salva.");
        return;
      }
      try {
        await atualizar(`/simulados/${id}/responder`, {
          questaoId: resposta.questaoId,
          alternativaId: resposta.alternativaId,
          tempoGastoSegundos: resposta.tempoGastoSegundos,
        });
      } catch {
        toast.error("Nao foi possivel salvar a resposta no banco.");
      }
    },
    [id, online],
  );

  const { estado: estadoAutosave, ultimoSalvoEm } = useAutosave({
    valor: valorAutosave,
    aoSalvar,
    debounceMs: 500,
    habilitado:
      Boolean(valorAutosave) && valorAutosave?.alternativaId !== undefined,
  });

  const respostasPendentes = 0;

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
            {tempoExtraMinutos > 0 && (
              <span
                className="hidden rounded-md border border-primary/20 bg-primary-muted px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-primary-text sm:inline-flex"
                data-aux
              >
                +{tempoExtraMinutos} min
              </span>
            )}
            {temControlesAcessibilidade && (
              <div
                className="hidden items-center gap-1 rounded-lg border border-border bg-card/80 p-1 shadow-sm lg:flex"
                data-aux
              >
                {recursosAcessibilidade?.fonteMaior && (
                  <Button
                    variant={
                      preferencias.tamanhoFonte !== "padrao" ? "secondary" : "ghost"
                    }
                    size="icon"
                    className="size-8"
                    onClick={alternarTamanhoFonte}
                    aria-label="Alternar tamanho da fonte"
                  >
                    <CaseSensitive className="size-4" aria-hidden />
                  </Button>
                )}
                {recursosAcessibilidade?.altoContraste && (
                  <Button
                    variant={preferencias.altoContraste ? "secondary" : "ghost"}
                    size="icon"
                    className="size-8"
                    onClick={() =>
                      atualizarAcessibilidade({
                        altoContraste: !preferencias.altoContraste,
                      })
                    }
                    aria-label="Alternar alto contraste"
                    aria-pressed={preferencias.altoContraste}
                  >
                    <Contrast className="size-4" aria-hidden />
                  </Button>
                )}
                {recursosAcessibilidade?.leituraSimplificada && (
                  <Button
                    variant={preferencias.fonteDislexia ? "secondary" : "ghost"}
                    size="icon"
                    className="size-8"
                    onClick={() =>
                      atualizarAcessibilidade({
                        fonteDislexia: !preferencias.fonteDislexia,
                      })
                    }
                    aria-label="Alternar fonte de leitura"
                    aria-pressed={preferencias.fonteDislexia}
                  >
                    <BookOpenText className="size-4" aria-hidden />
                  </Button>
                )}
              </div>
            )}
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
      <Dialog
        open={modalOfflineAberta || !online}
        onOpenChange={setModalOfflineAberta}
      >
        <DialogContent>
          <DialogHeader>
            <div className="flex size-10 items-center justify-center rounded-full bg-warning-muted text-warning">
              <WifiOff className="size-5" />
            </div>
            <DialogTitle>Sem conexão com a internet</DialogTitle>
            <DialogDescription>
              As respostas precisam ser salvas no banco. Aguarde a conexão
              voltar antes de finalizar o simulado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              disabled={!online}
              onClick={() => setModalOfflineAberta(false)}
            >
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
                  (r) => Boolean(r.alternativaId),
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
                try {
                  const finalizacao = await enviarFinal(id, respostas, false);
                  finalizarSimulado();
                  limpar();
                  if (finalizacao.resultadoDisponivel === false) {
                    toast.success(finalizacao.mensagem ?? "Respostas enviadas.");
                    router.push("/aluno/home");
                    return;
                  }
                  router.push(`/aluno/simulado/${id}/resultado`);
                } finally {
                  setEnviandoFinal(false);
                }
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

async function enviarFinal(
  simuladoId: string,
  respostas: Record<string, RespostaQuestao>,
  porTempoEsgotado: boolean,
): Promise<{ resultadoDisponivel?: boolean; mensagem?: string }> {
  try {
    return await criar<{ resultadoDisponivel?: boolean; mensagem?: string }>(
      `/simulados/${simuladoId}/finalizar`,
      {
      respostas: Object.values(respostas),
      porTempoEsgotado,
      },
    );
  } catch (erro) {
    toast.error("Falha ao enviar respostas para o banco.");
    throw erro;
  }
}
