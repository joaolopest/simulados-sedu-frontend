"use client";

import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  Clock,
  Inbox,
  LineChart as LineChartIcon,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useAlunoHome, type PontoEvolucao } from "@/hooks/api/use-aluno-home";
import { Button } from "@/components/ui/button";
import { CategoryBadge } from "@/components/ui/category-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { GraficoLinha } from "@/components/graficos/grafico-linha";
import { Skeleton } from "@/components/ui/skeleton";
import {
  obterNomeMaterias,
  obterNomeSerie,
  saudacaoDoMomento,
} from "@/lib/displays";
import {
  formatarDataBR,
  formatarNota,
  formatarTempoRelativo,
} from "@/lib/utils";
import type { ResultadoSimulado, Simulado } from "@/types";
import { cn } from "@/lib/utils";

export default function PaginaHomeAluno() {
  const { usuario } = useAuth();
  const { data, isLoading, isError, refetch } = useAlunoHome();

  const primeiroNome = usuario?.nome.split(" ")[0] ?? "";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6 md:py-10">
      {/* saudação */}
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {formatarDataBR(new Date(), "EEEE',' d 'de' MMMM")}
        </p>
        <h1
          className="mt-2 font-serif text-3xl tracking-tight md:text-4xl"
        >
          {saudacaoDoMomento()},{" "}
          <span className="text-primary-text">{primeiroNome || "—"}</span>.
        </h1>
        {data?.mensagemBoasVindas && (
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {data.mensagemBoasVindas.texto}
          </p>
        )}
      </header>

      {/* card destaque do próximo simulado */}
      <section
        className="mt-8"
        aria-labelledby="proximo-simulado-titulo"
      >
        <h2 id="proximo-simulado-titulo" className="sr-only">
          Próximo simulado
        </h2>

        {isLoading ? (
          <Skeleton className="h-44 w-full rounded-xl" />
        ) : isError ? (
          <ErroCard aoTentarDeNovo={() => refetch()} />
        ) : data?.proximoSimulado ? (
          <CardProximoSimulado simulado={data.proximoSimulado} />
        ) : (
          <CardSemSimulado />
        )}
      </section>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {/* últimos resultados */}
        <section aria-labelledby="resultados-titulo">
          <header className="mb-4 flex items-center justify-between">
            <h2
              id="resultados-titulo"
              className="font-serif text-xl tracking-tight md:text-2xl"
            >
              Resultados recentes
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/aluno/historico" className="gap-1">
                Ver tudo
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </Button>
          </header>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          ) : !data || data.ultimosResultados.length === 0 ? (
            <EmptyState
              icone={Inbox}
              tomIcone="neutro"
              variante="compacto"
              titulo="Sem resultados ainda"
              descricao="Quando você finalizar um simulado, ele aparece aqui."
            />
          ) : (
            <ul className="space-y-2">
              {data.ultimosResultados.map((r) => (
                <li key={r.id}>
                  <CardResultado resultado={r} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* evolução */}
        <section aria-labelledby="evolucao-titulo">
          <header className="mb-4 flex items-center gap-2">
            <TrendingUp className="size-4 text-primary-text" aria-hidden />
            <h2
              id="evolucao-titulo"
              className="font-serif text-xl tracking-tight md:text-2xl"
            >
              Sua evolução
            </h2>
          </header>

          {isLoading ? (
            <Skeleton className="h-64 w-full rounded-lg" />
          ) : !data || data.evolucao.length === 0 ? (
            <EmptyState
              icone={LineChartIcon}
              tomIcone="autoridade"
              titulo="Sua curva aparece aqui"
              descricao="Faça pelo menos 2 simulados pra ver a evolução."
            />
          ) : (
            <GraficoEvolucao serie={data.evolucao} />
          )}
        </section>
      </div>
    </div>
  );
}

function CardProximoSimulado({ simulado }: { simulado: Simulado }) {
  const liberadoEm = simulado.liberadoEm ?? simulado.parametros.liberadoEm;
  const agora = Date.now();
  const liberadoTimestamp = liberadoEm ? new Date(liberadoEm).getTime() : agora;
  const disponivel = liberadoTimestamp <= agora;
  const diasFalta = disponivel
    ? 0
    : Math.ceil((liberadoTimestamp - agora) / (1000 * 60 * 60 * 24));

  const tempoMin = simulado.parametros.tempoLimiteMinutos;
  const tempoFormatado =
    tempoMin >= 60
      ? `${Math.floor(tempoMin / 60)}h${tempoMin % 60 > 0 ? ` ${tempoMin % 60}min` : ""}`
      : `${tempoMin} min`;

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-xl border border-primary/20 bg-card",
        "p-6 md:p-8",
        "shadow-[0_24px_48px_rgba(30,64,175,0.08),inset_0_1px_0_oklch(1_0_0/0.6)]",
      )}
    >
      {/* gradient ambient sutil do azul */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_92%_30%,oklch(0.404_0.171_263/0.10)_0%,transparent_60%)]"
        aria-hidden
      />

      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary-text">
            ● Próximo simulado
          </p>
          <h3
            className="mt-2 font-serif text-2xl leading-tight tracking-tight md:text-3xl"
          >
            {simulado.parametros.nome}
          </h3>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="font-mono text-[10px] uppercase tracking-wider">
              {obterNomeMaterias(simulado.parametros.materias)}
            </span>
            <span aria-hidden>·</span>
            <span className="font-mono text-[10px] uppercase tracking-wider">
              {obterNomeSerie(simulado.parametros.serie)}
            </span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider">
              <Clock className="size-3" aria-hidden />
              {tempoFormatado}
            </span>
            <span aria-hidden>·</span>
            <span className="font-mono text-[10px] uppercase tracking-wider">
              {simulado.parametros.quantidadeQuestoes} questões
            </span>
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-2 md:items-end">
          {disponivel ? (
            <Button size="lg" asChild>
              <Link
                href={`/aluno/simulado/${simulado.id}/instrucoes`}
                className="gap-2"
              >
                Iniciar agora
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
          ) : (
            <div className="rounded-lg border border-border bg-background px-4 py-3 text-center md:text-right">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Disponível em
              </p>
              <p className="mt-1 font-serif text-lg font-medium text-foreground">
                {diasFalta === 1 ? "1 dia" : `${diasFalta} dias`}
              </p>
            </div>
          )}
          {liberadoEm && (
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              <Calendar className="mr-1 inline size-3" aria-hidden />
              {formatarDataBR(liberadoEm)}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function CardSemSimulado() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        ● Tudo em dia
      </p>
      <h3
        className="mt-2 font-serif text-xl tracking-tight"
      >
        Nenhum simulado liberado no momento.
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Quando seu coordenador liberar o próximo, ele vai aparecer aqui em
        destaque.
      </p>
    </div>
  );
}

function CardResultado({ resultado }: { resultado: ResultadoSimulado }) {
  const cor =
    resultado.notaFinal >= 7
      ? "success"
      : resultado.notaFinal >= 5
        ? "warning"
        : "destructive";
  const corClasse = {
    success: "text-success bg-success-muted border-success/20",
    warning: "text-warning bg-warning-muted border-warning/20",
    destructive: "text-destructive bg-destructive-muted border-destructive/20",
  } as const;

  return (
    <Link
      href={`/aluno/simulado/${resultado.simuladoId}/resultado`}
      className={cn(
        "group flex items-center gap-4 rounded-lg border border-border bg-card p-4",
        "transition-all duration-200 [transition-timing-function:var(--ease-quart)]",
        "hover:bg-accent/40 hover:border-primary/20",
      )}
    >
      <div
        className={cn(
          "flex size-12 shrink-0 flex-col items-center justify-center rounded-md border font-mono tabular-nums",
          corClasse[cor],
        )}
      >
        <span
          className="text-base leading-none"
        >
          {formatarNota(resultado.notaFinal)}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {resultado.acertos} acertos · {resultado.erros} erros
          {resultado.emBranco > 0 && ` · ${resultado.emBranco} em branco`}
        </p>
        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {formatarTempoRelativo(resultado.finalizadoEm)}
        </p>
      </div>

      <ArrowRight
        className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  );
}

function GraficoEvolucao({ serie }: { serie: PontoEvolucao[] }) {
  const dados = serie.map((ponto, indice) => ({
    rotulo: `S${indice + 1}`,
    nota: ponto.nota,
    data: ponto.data,
  }));
  const ultima = serie[serie.length - 1];
  const anterior = serie[serie.length - 2];
  const tendencia =
    ultima && anterior ? ultima.nota - anterior.nota : 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Última nota
          </p>
          <p
            className="mt-1 font-serif text-3xl tabular-nums"
          >
            {ultima ? formatarNota(ultima.nota) : "—"}
          </p>
        </div>
        {tendencia !== 0 && (
          <CategoryBadge
            categoria={tendencia > 0 ? "aprendizado" : "destrutivo"}
            tamanho="xs"
          >
            {tendencia > 0 ? "↑" : "↓"} {formatarNota(Math.abs(tendencia))}
          </CategoryBadge>
        )}
      </div>

      <GraficoLinha
        className="mt-4"
        altura={160}
        dados={dados}
        chaveX="rotulo"
        dominioY={[0, 10]}
        linhas={[{ chave: "nota", rotulo: "Nota", tom: "autoridade" }]}
        formatadorValor={(valor) => formatarNota(valor)}
        ariaLabel="Curva de evolução das notas"
      />
    </div>
  );
}

function ErroCard({ aoTentarDeNovo }: { aoTentarDeNovo: () => void }) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive-muted p-6 text-destructive">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider">
            Erro ao carregar
          </p>
          <p className="mt-1 text-sm">
            Não consegui buscar seus dados agora. Tenta de novo?
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={aoTentarDeNovo}>
          Tentar de novo
        </Button>
      </div>
    </div>
  );
}

