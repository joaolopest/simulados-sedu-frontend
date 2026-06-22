"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Calculator,
  FlaskConical,
  Globe,
  History,
  Languages,
  Landmark,
  type LucideIcon,
} from "lucide-react";
import {
  useAlunoHistorico,
  type ResultadoEnriquecido,
} from "@/hooks/api/use-aluno-historico";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatarDataBR,
  formatarMinutosSegundos,
  formatarNota,
} from "@/lib/utils";
import { obterNomeMateria } from "@/lib/displays";
import type { Materia } from "@/types";
import { cn } from "@/lib/utils";

const ICONES_MATERIA: Partial<Record<Materia, LucideIcon>> = {
  portugues: BookOpen,
  matematica: Calculator,
  ciencias: FlaskConical,
  fisica: FlaskConical,
  quimica: FlaskConical,
  biologia: FlaskConical,
  geografia: Globe,
  ingles: Languages,
  historia: Landmark,
};

export default function PaginaHistoricoAluno() {
  const { data, isLoading, isError, refetch } = useAlunoHistorico();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-6 md:py-10">
      <header className="flex items-center gap-3">
        <History className="size-5 text-primary-text" aria-hidden />
        <h1
          className="font-serif text-3xl tracking-tight md:text-4xl"
        >
          Histórico
        </h1>
      </header>
      <p className="mt-2 text-base text-muted-foreground">
        Todos os simulados que você finalizou, do mais recente ao mais antigo.
      </p>

      {isLoading ? (
        <div className="mt-10 space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <div className="mt-10 rounded-xl border border-destructive/30 bg-destructive-muted p-6 text-destructive">
          <p className="font-mono text-[10px] uppercase tracking-wider">
            Erro ao carregar histórico
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-2 text-sm underline underline-offset-2"
          >
            Tentar de novo
          </button>
        </div>
      ) : !data || data.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Nada por aqui ainda
          </p>
          <p
            className="mt-3 font-serif text-xl tracking-tight"
          >
            Você ainda não fez nenhum simulado.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Quando finalizar o primeiro, o histórico vai aparecer aqui.
          </p>
        </div>
      ) : (
        <Timeline resultados={data} />
      )}
    </div>
  );
}

function Timeline({ resultados }: { resultados: ResultadoEnriquecido[] }) {
  // agrupa por mês
  const grupos = agruparPorMes(resultados);

  return (
    <div className="mt-10 space-y-10">
      {grupos.map((grupo) => (
        <section
          key={grupo.chave}
          aria-labelledby={`mes-${grupo.chave}`}
        >
          <h2
            id={`mes-${grupo.chave}`}
            className="mb-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
          >
            {grupo.rotulo}
          </h2>
          <ol
            className="relative space-y-3 border-l border-border pl-6"
            data-slot="timeline-mes"
          >
            {grupo.itens.map((r) => (
              <li key={r.id} className="relative">
                {/* dot da timeline */}
                <span
                  aria-hidden
                  className="absolute -left-[1.55rem] top-5 size-2.5 rounded-full border-2 border-background bg-primary"
                />
                <ItemHistorico resultado={r} />
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function ItemHistorico({ resultado }: { resultado: ResultadoEnriquecido }) {
  const Icone = resultado.simuladoMateria
    ? (ICONES_MATERIA[resultado.simuladoMateria] ?? BookOpen)
    : BookOpen;

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
        "hover:border-primary/30 hover:bg-accent/40",
      )}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icone className="size-4" aria-hidden />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {resultado.simuladoNome}
        </p>
        <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>{obterNomeMateria(resultado.simuladoMateria)}</span>
          <span aria-hidden>·</span>
          {resultado.tentativaNumero ? (
            <>
              <span>Tentativa {resultado.tentativaNumero}</span>
              <span aria-hidden>·</span>
            </>
          ) : null}
          <span>{formatarDataBR(resultado.finalizadoEm)}</span>
          <span aria-hidden>·</span>
          <span>{formatarMinutosSegundos(resultado.tempoTotalSegundos)}</span>
        </div>
      </div>

      <div
        className={cn(
          "flex size-12 shrink-0 flex-col items-center justify-center rounded-md border font-mono tabular-nums",
          corClasse[cor],
        )}
      >
        <span className="text-base font-semibold leading-none">
          {formatarNota(resultado.notaFinal)}
        </span>
      </div>

      <ArrowRight
        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  );
}

interface GrupoMes {
  chave: string;
  rotulo: string;
  itens: ResultadoEnriquecido[];
}

const MESES_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function agruparPorMes(resultados: ResultadoEnriquecido[]): GrupoMes[] {
  const mapa = new Map<string, ResultadoEnriquecido[]>();
  for (const r of resultados) {
    const data = new Date(r.finalizadoEm);
    const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
    if (!mapa.has(chave)) mapa.set(chave, []);
    mapa.get(chave)!.push(r);
  }
  return Array.from(mapa.entries()).map(([chave, itens]) => {
    const [ano, mes] = chave.split("-");
    const rotulo = `${MESES_PT[Number(mes) - 1]} de ${ano}`;
    return { chave, rotulo, itens };
  });
}
