"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  Accessibility,
  AlertTriangle,
  ArrowLeft,
  Brain,
  Calculator,
  Eye,
  HandHeart,
  Send,
  Type,
  Volume2,
  Wifi,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { GridProgressoQuestoes } from "@/components/simulado/grid-progresso-questoes";
import {
  useSuporteAluno,
  useEspelhamentoAluno,
} from "@/hooks/api/use-suporte-aluno";
import { criar } from "@/lib/api";
import {
  cn,
  formatarNota,
  formatarTempoRelativo,
  gerarIniciais,
} from "@/lib/utils";
import { obterNomeAdaptacao, obterNomeMaterias, obterNomeSerie } from "@/lib/displays";
import type { AdaptacaoCognitiva } from "@/types";
import { toast } from "sonner";

const ICONES_ADAPTACAO: Record<AdaptacaoCognitiva, LucideIcon> = {
  tdah: Brain,
  dislexia: Type,
  discalculia: Calculator,
  autismo: Accessibility,
  deficiencia_visual: Eye,
  deficiencia_auditiva: Volume2,
};

export default function PaginaSuporteAluno({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading, isError } = useSuporteAluno(id);
  const respondendo = Boolean(data?.emAndamento);
  const { data: espelho } = useEspelhamentoAluno(id, respondendo);

  const [nota, setNota] = useState("");
  const [salvandoNota, setSalvandoNota] = useState(false);
  const [modalApoio, setModalApoio] = useState(false);
  const [motivoApoio, setMotivoApoio] = useState("");
  const [enviandoApoio, setEnviandoApoio] = useState(false);

  async function salvarNota() {
    if (nota.trim().length < 3) {
      toast.error("Escreva pelo menos 3 caracteres.");
      return;
    }
    setSalvandoNota(true);
    try {
      await criar(`/suporte/aluno/${id}/nota`, { texto: nota });
      toast.success("Nota pedagógica registrada.");
      setNota("");
    } catch {
      toast.error("Falha ao salvar. Tenta de novo.");
    } finally {
      setSalvandoNota(false);
    }
  }

  async function solicitarApoio() {
    setEnviandoApoio(true);
    try {
      await criar(`/suporte/aluno/${id}/apoio-presencial`, {
        motivo: motivoApoio.trim() || undefined,
      });
      toast.success("Apoio presencial solicitado.", {
        description: "A coordenação foi notificada.",
      });
      setModalApoio(false);
      setMotivoApoio("");
    } catch {
      toast.error("Falha ao solicitar apoio.");
    } finally {
      setEnviandoApoio(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6">
        <Skeleton className="h-10 w-48" />
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <Skeleton className="h-96 lg:col-span-7" />
          <Skeleton className="h-96 lg:col-span-5" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-12 md:px-6">
        <div className="rounded-xl border border-destructive/30 bg-destructive-muted p-6 text-center text-destructive">
          <AlertTriangle className="mx-auto size-8" aria-hidden />
          <p
            className="mt-3 font-serif text-lg"
          >
            Não consegui carregar os dados deste aluno.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/suporte/dashboard">Voltar ao dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { aluno, turma, escola, simuladoAtivo, questoesAtivas, ultimosResultados } = data;
  const questaoAtual =
    espelho?.ativo && espelho.questaoAtualIndice < questoesAtivas.length
      ? questoesAtivas[espelho.questaoAtualIndice]
      : null;
  const respostaAtualEspelhada = questaoAtual
    ? espelho?.respostas[questaoAtual.id]
    : undefined;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
      {/* topo: voltar + identidade do aluno */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild className="mt-1">
            <Link href="/suporte/dashboard" aria-label="Voltar ao dashboard">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <Avatar className="size-14 shrink-0">
            <AvatarImage src={aluno.fotoUrl} alt={aluno.nome} />
            <AvatarFallback className="bg-primary-muted font-mono text-sm uppercase text-primary-text">
              {gerarIniciais(aluno.nome)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1
              className="font-serif text-2xl tracking-tight md:text-3xl"
            >
              {aluno.nome}
            </h1>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {turma?.nome ?? "—"} {escola && `· ${escola.nome}`}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(aluno.adaptacoes ?? []).map((a) => {
                const Icone = ICONES_ADAPTACAO[a];
                return (
                  <span
                    key={a}
                    className="inline-flex items-center gap-1 rounded-full bg-warning-muted px-2.5 py-1 text-[10px] font-medium text-warning"
                  >
                    <Icone className="size-3" aria-hidden />
                    {obterNomeAdaptacao(a)}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* status ao vivo */}
        {respondendo && (
          <div className="inline-flex items-center gap-3 rounded-lg border border-success/40 bg-success-muted px-4 py-2.5">
            <span
              aria-hidden
              className="size-2 rounded-full bg-success motion-pulse-ambient"
            />
            <div className="flex flex-col leading-none">
              <span className="font-mono text-[10px] uppercase tracking-wider text-success">
                Espelhamento ao vivo
              </span>
              <span className="mt-0.5 font-mono text-[10px] tracking-wider text-muted-foreground">
                Atualiza a cada 2s
              </span>
            </div>
          </div>
        )}
      </div>

      {/* split: esquerda espelho · direita ações */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* COLUNA ESQUERDA — espelhamento read-only */}
        <section
          className="space-y-5 lg:col-span-7"
          aria-label="Espelhamento do aluno respondendo"
        >
          {respondendo && simuladoAtivo && questaoAtual ? (
            <>
              {/* header espelho */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {obterNomeMaterias(simuladoAtivo.parametros.materias)} ·{" "}
                    {obterNomeSerie(simuladoAtivo.parametros.serie)}
                  </p>
                  <p className="mt-1 text-base font-medium text-foreground">
                    {simuladoAtivo.parametros.nome}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <CronometroSimulado
                    segundosRestantes={espelho?.tempoRestanteSegundos ?? 0}
                    duracaoTotalSegundos={
                      simuladoAtivo.parametros.tempoLimiteMinutos * 60
                    }
                  />
                  {espelho?.conexaoOk === false ? (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-destructive-muted px-2 py-1 text-xs text-destructive">
                      <WifiOff className="size-3" aria-hidden /> Aluno offline
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-success-muted px-2 py-1 text-xs text-success">
                      <Wifi className="size-3" aria-hidden /> Conectado
                    </span>
                  )}
                </div>
              </div>

              {/* card questão atual em modo READ-ONLY */}
              <div
                className="relative rounded-xl"
                aria-label="Visualização read-only da questão atual"
              >
                <CardQuestao
                  questao={questaoAtual}
                  numero={(espelho?.questaoAtualIndice ?? 0) + 1}
                  total={questoesAtivas.length}
                  alternativaSelecionadaId={
                    respostaAtualEspelhada?.alternativaId ?? null
                  }
                  aoSelecionar={() => {
                    /* read-only — ignora */
                  }}
                  className="pointer-events-none opacity-95 select-none [&_input]:cursor-default [&_label]:cursor-default"
                />
                <span className="absolute top-4 right-4 inline-flex items-center gap-1.5 rounded-md bg-shade px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-wider text-marble">
                  <Eye className="size-3" aria-hidden /> Read-only
                </span>
              </div>

              {/* progresso */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Progresso
                  </p>
                  <p className="font-mono text-xs tabular-nums text-foreground">
                    <span className="font-medium text-primary-text">
                      {(espelho?.questaoAtualIndice ?? 0) + 1}
                    </span>
                    <span className="text-muted-foreground">
                      {" "}/ {questoesAtivas.length}
                    </span>
                  </p>
                </div>
                <GridProgressoQuestoes
                  totalQuestoes={questoesAtivas.length}
                  questaoAtualIndice={espelho?.questaoAtualIndice ?? 0}
                  respostas={espelho?.respostas ?? {}}
                  questaoIds={questoesAtivas.map((q) => q.id)}
                  aoNavegar={() => {
                    /* read-only */
                  }}
                  variante="rodape"
                  className="pointer-events-none"
                />
              </div>
            </>
          ) : (
            <SemSimuladoAtivo
              ultimaAtividadeEm={
                ultimosResultados[0]?.finalizadoEm ?? aluno.ultimoAcesso ?? null
              }
            />
          )}

          {/* últimos resultados */}
          {ultimosResultados.length > 0 && (
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Últimos simulados
              </h2>
              <ul className="space-y-2">
                {ultimosResultados.slice(0, 3).map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {r.acertos}/{r.acertos + r.erros + r.emBranco} acertos
                      </p>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {formatarTempoRelativo(r.finalizadoEm)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 font-mono text-xs font-bold tabular-nums",
                        r.notaFinal >= 7
                          ? "bg-success-muted text-success"
                          : r.notaFinal >= 5
                            ? "bg-warning-muted text-warning"
                            : "bg-destructive-muted text-destructive",
                      )}
                    >
                      {formatarNota(r.notaFinal)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </section>

        {/* COLUNA DIREITA — ações */}
        <aside className="space-y-5 lg:col-span-5">
          {/* nota pedagógica */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2
              className="font-serif text-lg tracking-tight"
            >
              Nota pedagógica
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Registre observações pedagógicas sobre este aluno. Só você e a
              coordenação leem.
            </p>
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ex: Aluno demonstrou dificuldade em seguir o enunciado quando tem mais de 3 linhas. Sugiro reescrita simplificada para próximo simulado."
              rows={5}
              className="mt-4 w-full resize-y rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              maxLength={1000}
            />
            <div className="mt-3 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {nota.length}/1000
              </p>
              <Button
                onClick={salvarNota}
                disabled={salvandoNota || nota.trim().length < 3}
                size="sm"
                className="gap-2"
              >
                <Send className="size-3.5" aria-hidden />
                {salvandoNota ? "Salvando…" : "Registrar"}
              </Button>
            </div>
          </div>

          {/* solicitar apoio presencial */}
          <div className="rounded-xl border border-warning/30 bg-warning-muted p-5">
            <div className="flex items-start gap-3">
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-md bg-warning/15 text-warning"
                aria-hidden
              >
                <HandHeart className="size-5" />
              </span>
              <div className="flex-1">
                <h2
                  className="font-serif text-lg tracking-tight text-foreground"
                >
                  Apoio presencial
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Solicite intervenção presencial imediata se o aluno
                  precisar. A coordenação é notificada.
                </p>
                <Button
                  onClick={() => setModalApoio(true)}
                  size="sm"
                  className="mt-4 bg-warning text-warning-foreground hover:bg-warning/90"
                >
                  Solicitar apoio
                </Button>
              </div>
            </div>
          </div>

          {/* meta info */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Informações
            </h2>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="truncate text-foreground">{aluno.email}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Cadastrado em</dt>
                <dd className="text-foreground">
                  {formatarTempoRelativo(aluno.criadoEm)}
                </dd>
              </div>
              {aluno.ultimoAcesso && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Último acesso</dt>
                  <dd className="text-foreground">
                    {formatarTempoRelativo(aluno.ultimoAcesso)}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </aside>
      </div>

      {/* modal apoio */}
      <Dialog open={modalApoio} onOpenChange={setModalApoio}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar apoio presencial</DialogTitle>
            <DialogDescription>
              Descreva brevemente o motivo. A coordenação pedagógica receberá
              uma notificação imediata.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={motivoApoio}
            onChange={(e) => setMotivoApoio(e.target.value)}
            placeholder="Ex: Aluno em crise, precisa de ambiente mais silencioso."
            rows={4}
            className="w-full resize-y rounded-md border border-border bg-background px-3 py-2.5 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            maxLength={500}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalApoio(false)}
              disabled={enviandoApoio}
            >
              Cancelar
            </Button>
            <Button
              onClick={solicitarApoio}
              disabled={enviandoApoio}
              className="gap-2 bg-warning text-warning-foreground hover:bg-warning/90"
            >
              <HandHeart className="size-4" aria-hidden />
              {enviandoApoio ? "Enviando…" : "Solicitar apoio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SemSimuladoAtivo({
  ultimaAtividadeEm,
}: {
  ultimaAtividadeEm: string | null;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        Aluno não está respondendo agora
      </p>
      <p
        className="mt-3 font-serif text-xl tracking-tight"
      >
        Sem simulado ativo no momento.
      </p>
      {ultimaAtividadeEm && (
        <p className="mt-2 text-sm text-muted-foreground">
          Última atividade {formatarTempoRelativo(ultimaAtividadeEm)}
        </p>
      )}
      <p className="mx-auto mt-4 max-w-sm text-sm text-muted-foreground">
        O espelhamento ao vivo aparece automaticamente quando o aluno iniciar
        um simulado.
      </p>
    </div>
  );
}

