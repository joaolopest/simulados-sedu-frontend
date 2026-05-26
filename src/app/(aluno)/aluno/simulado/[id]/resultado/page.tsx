"use client";

import { use, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  Sparkles,
  Target,
  Trophy,
  XCircle,
} from "lucide-react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { BadgeIA } from "@/components/ia/badge-ia";
import { useResultadoAluno } from "@/hooks/api/use-resultado-aluno";
import {
  formatarMinutosSegundos,
  formatarNota,
  formatarPorcentagem,
  cn,
} from "@/lib/utils";
import { obterNomeMaterias, obterNomeSerie } from "@/lib/displays";
import type { Questao, RespostaQuestao } from "@/types";

const LETRAS_ALT = ["A", "B", "C", "D", "E"] as const;

export default function PaginaResultadoSimulado({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading, isError } = useResultadoAluno(id);

  // dispara confete quando nota >= 7
  useEffect(() => {
    if (!data) return;
    if (data.resultado.notaFinal < 7) return;
    const reduzido = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduzido) return;

    const timeout = setTimeout(() => {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.35 },
        colors: ["#047857", "#6D28D9", "#1E40AF"],
        gravity: 0.8,
        ticks: 200,
      });
    }, 350);
    return () => clearTimeout(timeout);
  }, [data]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6">
        <Skeleton className="mx-auto h-48 w-48 rounded-full" />
        <Skeleton className="mx-auto mt-6 h-8 w-72" />
        <Skeleton className="mt-12 h-32 w-full rounded-xl" />
        <Skeleton className="mt-6 h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-12 md:px-6">
        <div className="rounded-xl border border-destructive/30 bg-destructive-muted p-8 text-center text-destructive">
          <p className="font-mono text-[10px] uppercase tracking-wider">
            Resultado indisponível
          </p>
          <p className="mt-3 font-serif text-lg">
            Ainda não consegui buscar o resultado deste simulado.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/aluno/home">Voltar pra Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { simulado, resultado, questoes, mensagem, sugestoes } = data;
  const respostasPorQuestao: Record<string, RespostaQuestao> = useMemo(
    () =>
      Object.fromEntries(resultado.respostas.map((r) => [r.questaoId, r])),
    [resultado.respostas],
  );

  const corNota =
    resultado.notaFinal >= 7
      ? "success"
      : resultado.notaFinal >= 5
        ? "warning"
        : "destructive";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6 md:py-12">
      {/* HERO — círculo grande da nota */}
      <header className="text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {obterNomeMaterias(simulado.parametros.materias)} ·{" "}
          {obterNomeSerie(simulado.parametros.serie)}
        </p>
        <h1
          className="mt-3 font-serif text-2xl tracking-tight md:text-3xl"
        >
          {simulado.parametros.nome}
        </h1>

        <CirculoNota nota={resultado.notaFinal} cor={corNota} />

        {mensagem && (
          <div className="mx-auto mt-6 max-w-xl">
            <BadgeIA tamanho="sm" className="mb-3" />
            <p className="font-serif text-lg leading-relaxed text-foreground md:text-xl">
              {mensagem.texto}
            </p>
          </div>
        )}
      </header>

      {/* BREAKDOWN cards */}
      <section className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-4">
        <CardBreakdown
          icone={CheckCircle2}
          rotulo="Acertos"
          valor={resultado.acertos}
          cor="success"
        />
        <CardBreakdown
          icone={XCircle}
          rotulo="Erros"
          valor={resultado.erros}
          cor="destructive"
        />
        <CardBreakdown
          icone={Circle}
          rotulo="Em branco"
          valor={resultado.emBranco}
          cor="muted"
        />
        <CardBreakdown
          icone={Clock}
          rotulo="Tempo"
          valor={formatarMinutosSegundos(resultado.tempoTotalSegundos)}
          cor="muted"
          mono
        />
      </section>

      {/* DESEMPENHO POR COMPETÊNCIA */}
      {resultado.desempenhoPorCompetencia.length > 0 && (
        <section className="mt-12">
          <header className="mb-4 flex items-center gap-2">
            <Target className="size-4 text-primary-text" aria-hidden />
            <h2
              className="font-serif text-xl tracking-tight md:text-2xl"
            >
              Desempenho por competência
            </h2>
          </header>
          <ul className="space-y-3 rounded-xl border border-border bg-card p-5">
            {resultado.desempenhoPorCompetencia.map((c) => (
              <li key={c.competencia}>
                <BarraCompetencia desempenho={c} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* SUGESTÕES DE REFORÇO */}
      {sugestoes.length > 0 && (
        <section className="mt-12">
          <div
            className={cn(
              "relative overflow-hidden rounded-xl border border-ia/20 bg-ia-muted p-6 md:p-8",
              "shadow-[0_1px_2px_rgba(109,40,217,0.06)]",
            )}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_85%_30%,oklch(0.456_0.247_296/0.08)_0%,transparent_70%)]"
            />
            <div className="relative">
              <div className="flex items-center gap-3">
                <span
                  className="flex size-9 items-center justify-center rounded-md bg-ia/12 text-ia-text"
                  aria-hidden
                >
                  <Sparkles className="size-4" />
                </span>
                <div>
                  <h2
                    className="font-serif text-xl tracking-tight md:text-2xl"
                  >
                    Para reforçar
                  </h2>
                  <BadgeIA tamanho="sm" className="mt-1" />
                </div>
              </div>
              <ul className="mt-5 grid gap-3 md:grid-cols-3">
                {sugestoes.map((s, i) => (
                  <li key={i}>
                    <CardSugestao sugestao={s} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* LISTA DE QUESTÕES (accordion) */}
      <section className="mt-12">
        <header className="mb-4 flex items-center gap-2">
          <BookOpen className="size-4 text-primary-text" aria-hidden />
          <h2
            className="font-serif text-xl tracking-tight md:text-2xl"
          >
            Revisão das questões
          </h2>
        </header>
        <Accordion type="multiple" className="space-y-2">
          {questoes.map((q, i) => (
            <ItemRevisaoQuestao
              key={q.id}
              questao={q}
              numero={i + 1}
              resposta={respostasPorQuestao[q.id]}
            />
          ))}
        </Accordion>
      </section>

      <footer className="mt-16 flex justify-center">
        <Button asChild size="lg" className="gap-2">
          <Link href="/aluno/home">
            <Trophy className="size-4" aria-hidden />
            Voltar pra Home
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Button>
      </footer>
    </div>
  );
}

function CirculoNota({
  nota,
  cor,
}: {
  nota: number;
  cor: "success" | "warning" | "destructive";
}) {
  const valor = Math.max(0, Math.min(10, nota));
  const raio = 90;
  const circ = 2 * Math.PI * raio;
  const offset = circ * (1 - valor / 10);

  const corPista = {
    success: "stroke-success/15",
    warning: "stroke-warning/15",
    destructive: "stroke-destructive/15",
  }[cor];
  const corRing = {
    success: "stroke-success",
    warning: "stroke-warning",
    destructive: "stroke-destructive",
  }[cor];
  const corTexto = {
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
  }[cor];

  return (
    <div className="relative mx-auto mt-8 size-56 md:size-64">
      <svg viewBox="0 0 200 200" className="absolute inset-0 -rotate-90">
        <circle
          cx="100"
          cy="100"
          r={raio}
          fill="none"
          strokeWidth="10"
          className={corPista}
        />
        <circle
          cx="100"
          cy="100"
          r={raio}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className={cn(
            corRing,
            "transition-[stroke-dashoffset] duration-1500 [transition-timing-function:var(--ease-quint)]",
          )}
          style={{ animation: "stat-grow 1.2s var(--ease-quart) both" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Nota final
        </span>
        <span
          className={cn(
            "mt-3 font-serif text-7xl font-medium tabular-nums md:text-8xl",
            corTexto,
          )}
        >
          {formatarNota(valor)}
        </span>
        <span className="mt-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">
          de 10
        </span>
      </div>
    </div>
  );
}

function CardBreakdown({
  icone: Icone,
  rotulo,
  valor,
  cor,
  mono = false,
}: {
  icone: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  rotulo: string;
  valor: number | string;
  cor: "success" | "destructive" | "muted";
  mono?: boolean;
}) {
  const corClasses = {
    success: "text-success",
    destructive: "text-destructive",
    muted: "text-foreground",
  }[cor];
  return (
    <div className="bg-card p-4 md:p-5">
      <div className="flex items-center gap-2">
        <Icone className={cn("size-3.5", corClasses)} aria-hidden />
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {rotulo}
        </span>
      </div>
      <p
        className={cn(
          "mt-2 font-serif text-3xl tabular-nums",
          corClasses,
          mono && "font-mono text-2xl",
        )}
      >
        {valor}
      </p>
    </div>
  );
}

function BarraCompetencia({
  desempenho,
}: {
  desempenho: {
    competencia: string;
    totalQuestoes: number;
    acertos: number;
    taxaAcerto: number;
    mediaEstadual?: number;
  };
}) {
  const pct = Math.round(desempenho.taxaAcerto * 100);
  const cor =
    desempenho.taxaAcerto >= 0.7
      ? "bg-success"
      : desempenho.taxaAcerto >= 0.5
        ? "bg-warning"
        : "bg-destructive";

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
        <span className="truncate font-mono text-xs text-foreground">
          {desempenho.competencia}
        </span>
        <span className="font-mono text-xs tabular-nums text-foreground">
          {desempenho.acertos}/{desempenho.totalQuestoes}{" "}
          <span className="text-muted-foreground">·</span>{" "}
          {formatarPorcentagem(desempenho.taxaAcerto)}
        </span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-muted">
        {desempenho.mediaEstadual !== undefined && (
          <div
            className="absolute top-0 bottom-0 w-px bg-foreground/40"
            style={{ left: `${desempenho.mediaEstadual * 100}%` }}
            aria-label={`Média estadual: ${formatarPorcentagem(desempenho.mediaEstadual)}`}
          />
        )}
        <div
          className={cn("h-full rounded-full transition-all duration-1000", cor)}
          style={{
            width: `${pct}%`,
            animation: "stat-grow 1s var(--ease-quart) both",
          }}
        />
      </div>
    </div>
  );
}

function CardSugestao({
  sugestao,
}: {
  sugestao: {
    competencia: string;
    conteudo: string;
    tipoMaterial: "video" | "texto" | "exercicio" | "atividade";
    url?: string;
    descricao: string;
  };
}) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-ia/20 bg-card p-4">
      <span className="font-mono text-[10px] uppercase tracking-wider text-ia-text">
        {sugestao.tipoMaterial}
      </span>
      <p className="mt-2 text-sm font-medium text-foreground">
        {sugestao.conteudo}
      </p>
      <p className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">
        {sugestao.descricao}
      </p>
      {sugestao.url && (
        <a
          href={sugestao.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-ia-text hover:underline"
        >
          Acessar material
          <ExternalLink className="size-3" aria-hidden />
        </a>
      )}
    </div>
  );
}

function ItemRevisaoQuestao({
  questao,
  numero,
  resposta,
}: {
  questao: Questao;
  numero: number;
  resposta?: RespostaQuestao;
}) {
  const alternativas = [...questao.alternativas].sort(
    (a, b) => a.ordem - b.ordem,
  );
  const alternativaCorreta = alternativas.find((a) => a.correta);
  const alternativaSelecionada = alternativas.find(
    (a) => a.id === resposta?.alternativaId,
  );
  const acertou =
    resposta?.alternativaId &&
    alternativaCorreta &&
    resposta.alternativaId === alternativaCorreta.id;
  const emBranco = !resposta?.alternativaId;

  return (
    <AccordionItem
      value={questao.id}
      className="rounded-lg border border-border bg-card data-[state=open]:border-primary/30"
    >
      <AccordionTrigger className="px-4 py-3 hover:no-underline">
        <div className="flex w-full items-center gap-3 text-left">
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full font-mono text-xs font-medium",
              acertou && "bg-success-muted text-success",
              !acertou && !emBranco && "bg-destructive-muted text-destructive",
              emBranco && "bg-muted text-muted-foreground",
            )}
            aria-hidden
          >
            {numero}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{questao.enunciado}</p>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {emBranco
                ? "Em branco"
                : acertou
                  ? "Acertou"
                  : "Errou"}
            </p>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pt-2 pb-5">
        <p className="text-base leading-relaxed text-foreground">
          {questao.enunciado}
        </p>
        <ul className="mt-4 space-y-2">
          {alternativas.map((alt, i) => {
            const ehSelecionada = alt.id === alternativaSelecionada?.id;
            const ehCorreta = alt.correta;
            return (
              <li
                key={alt.id}
                className={cn(
                  "flex gap-3 rounded-md border p-3",
                  ehCorreta &&
                    "border-success/40 bg-success-muted text-success",
                  ehSelecionada &&
                    !ehCorreta &&
                    "border-destructive/40 bg-destructive-muted text-destructive",
                  !ehCorreta &&
                    !ehSelecionada &&
                    "border-border text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-xs font-medium",
                    ehCorreta && "bg-success text-success-foreground",
                    ehSelecionada &&
                      !ehCorreta &&
                      "bg-destructive text-destructive-foreground",
                    !ehCorreta && !ehSelecionada && "border border-border",
                  )}
                  aria-hidden
                >
                  {LETRAS_ALT[i]}
                </span>
                <span className="flex-1 text-sm leading-relaxed">
                  {alt.texto}
                </span>
                {ehSelecionada && (
                  <span className="font-mono text-[9px] uppercase tracking-wider">
                    Sua resposta
                  </span>
                )}
                {ehCorreta && !ehSelecionada && (
                  <span className="font-mono text-[9px] uppercase tracking-wider">
                    Correta
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        {questao.explicacao && (
          <div className="mt-5 rounded-lg border border-primary/20 bg-primary-muted p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-primary-text">
              Explicação
            </p>
            <p className="mt-2 text-sm leading-relaxed text-foreground">
              {questao.explicacao}
            </p>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}
