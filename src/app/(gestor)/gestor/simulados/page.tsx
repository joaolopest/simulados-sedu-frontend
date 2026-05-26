"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Calendar,
  Clock,
  FileText,
  Loader2,
  Plus,
  Search,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import {
  useGestorSimulados,
  useLiberarSimulado,
} from "@/hooks/api/use-gestor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatarDataBR } from "@/lib/utils";
import { obterNomeMaterias, obterNomeSerie } from "@/lib/displays";
import type { Simulado, StatusSimulado } from "@/types";

// ============================================================
// Filtro de status
// ============================================================

type FiltroStatus = "todos" | StatusSimulado;

const FILTROS: { id: FiltroStatus; rotulo: string }[] = [
  { id: "todos", rotulo: "Todos" },
  { id: "rascunho", rotulo: "Rascunho" },
  { id: "em_curadoria", rotulo: "Em curadoria" },
  { id: "liberado", rotulo: "Liberado" },
  { id: "em_andamento", rotulo: "Em andamento" },
  { id: "finalizado", rotulo: "Finalizado" },
];

// ============================================================
// Página
// ============================================================

export default function PaginaListaSimulados() {
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");
  const [buscaInput, setBuscaInput] = useState("");
  const [buscaDebounced, setBuscaDebounced] = useState("");

  // debounce de 300ms na busca
  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(buscaInput.trim()), 300);
    return () => clearTimeout(t);
  }, [buscaInput]);

  const filtros = useMemo(
    () => ({
      status: filtroStatus === "todos" ? undefined : filtroStatus,
      busca: buscaDebounced.length > 0 ? buscaDebounced : undefined,
    }),
    [filtroStatus, buscaDebounced],
  );

  const { data, isLoading, isError, refetch, isFetching } =
    useGestorSimulados(filtros);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-10">
      {/* header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Coordenação
          </p>
          <h1
            className="mt-2 font-serif text-3xl tracking-tight md:text-4xl"
          >
            Simulados
          </h1>
          <p className="mt-2 max-w-2xl text-base text-muted-foreground">
            Gerencie todos os simulados criados pra suas turmas — do rascunho à
            análise de resultados.
          </p>
        </div>
        <Button asChild size="lg" className="gap-2 self-start md:self-end">
          <Link href="/gestor/simulados/novo">
            <Plus className="size-4" aria-hidden />
            Novo simulado
          </Link>
        </Button>
      </header>

      {/* busca + tabs filtro */}
      <div className="mt-8 flex flex-col gap-4">
        <div className="relative max-w-md">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={buscaInput}
            onChange={(e) => setBuscaInput(e.target.value)}
            placeholder="Buscar por nome do simulado…"
            className="pl-9"
            aria-label="Buscar simulado"
          />
          {isFetching && buscaInput.length > 0 && (
            <Loader2
              className="absolute top-1/2 right-3 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground"
              aria-hidden
            />
          )}
        </div>

        {/* pills custom de filtro */}
        <div
          className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-card p-1"
          role="tablist"
          aria-label="Filtrar por status"
        >
          {FILTROS.map((f) => {
            const ativo = filtroStatus === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={ativo}
                onClick={() => setFiltroStatus(f.id)}
                className={cn(
                  "rounded-md px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-wider transition-colors duration-200",
                  "[transition-timing-function:var(--ease-quart)]",
                  ativo
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                {f.rotulo}
              </button>
            );
          })}
        </div>
      </div>

      {/* conteúdo */}
      <section className="mt-8" aria-label="Lista de simulados">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive-muted p-6 text-destructive">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider">
                  Erro ao carregar
                </p>
                <p className="mt-1 text-sm">
                  Não consegui buscar os simulados agora.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Tentar de novo
              </Button>
            </div>
          </div>
        ) : !data || data.length === 0 ? (
          <EstadoVazio
            comFiltro={filtroStatus !== "todos" || buscaDebounced.length > 0}
          />
        ) : (
          <ul className="space-y-3">
            {data.map((simulado) => (
              <li key={simulado.id}>
                <CardSimulado simulado={simulado} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ============================================================
// Card de simulado
// ============================================================

const ROTULOS_STATUS: Record<StatusSimulado, string> = {
  rascunho: "Rascunho",
  em_curadoria: "Em curadoria",
  liberado: "Liberado",
  em_andamento: "Em andamento",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

interface ClassesStatus {
  pillBg: string;
  pillTexto: string;
  ponto?: string;
  pulse?: boolean;
  spinner?: boolean;
}

function classesStatus(status: StatusSimulado): ClassesStatus {
  switch (status) {
    case "rascunho":
      return {
        pillBg: "bg-muted",
        pillTexto: "text-muted-foreground",
        ponto: "bg-muted-foreground/60",
      };
    case "em_curadoria":
      return {
        pillBg: "bg-warning-muted",
        pillTexto: "text-warning",
        spinner: true,
      };
    case "liberado":
      return {
        pillBg: "bg-primary-muted",
        pillTexto: "text-primary-text",
        ponto: "bg-primary-text",
      };
    case "em_andamento":
      return {
        pillBg: "bg-success-muted",
        pillTexto: "text-success",
        ponto: "bg-success",
        pulse: true,
      };
    case "finalizado":
      return {
        pillBg: "bg-muted",
        pillTexto: "text-muted-foreground",
        ponto: "bg-muted-foreground/40",
      };
    case "cancelado":
      return {
        pillBg: "bg-destructive-muted",
        pillTexto: "text-destructive",
        ponto: "bg-destructive",
      };
  }
}

interface AcaoSecundaria {
  rotulo: string;
  href: string;
}

function acaoSecundaria(simulado: Simulado): AcaoSecundaria | null {
  switch (simulado.status) {
    case "rascunho":
    case "em_curadoria":
      return {
        rotulo: "Editar",
        href: `/gestor/simulados/novo?id=${simulado.id}`,
      };
    case "liberado":
    case "em_andamento":
      return {
        rotulo: "Acompanhar",
        href: `/gestor/simulados/${simulado.id}/acompanhar`,
      };
    case "finalizado":
      return {
        rotulo: "Relatório",
        href: `/gestor/simulados/${simulado.id}/relatorio`,
      };
    case "cancelado":
      return null;
  }
}

function CardSimulado({ simulado }: { simulado: Simulado }) {
  const { parametros, status } = simulado;
  const cores = classesStatus(status);
  const acao = acaoSecundaria(simulado);
  const liberar = useLiberarSimulado();
  const podeLiberar = status === "em_curadoria";

  const tempoMin = parametros.tempoLimiteMinutos;
  const tempoFormatado =
    tempoMin >= 60
      ? `${Math.floor(tempoMin / 60)}h${tempoMin % 60 > 0 ? ` ${tempoMin % 60}min` : ""}`
      : `${tempoMin} min`;

  // progresso fake-derivado (mock real virá do backend de acompanhamento)
  // pra status em_andamento podemos exibir uma barra leve baseada em criadoEm/encerraEm
  const progresso = useMemo(() => {
    if (status !== "em_andamento") return null;
    const inicio = simulado.liberadoEm
      ? new Date(simulado.liberadoEm).getTime()
      : new Date(simulado.criadoEm).getTime();
    const fim = parametros.encerraEm
      ? new Date(parametros.encerraEm).getTime()
      : inicio + tempoMin * 60 * 1000;
    const agora = Date.now();
    if (fim <= inicio) return null;
    const pct = Math.max(0, Math.min(100, ((agora - inicio) / (fim - inicio)) * 100));
    return Math.round(pct);
  }, [status, simulado.liberadoEm, simulado.criadoEm, parametros.encerraEm, tempoMin]);

  return (
    <article
      className={cn(
        "group rounded-xl border border-border bg-card p-5",
        "transition-all duration-200 [transition-timing-function:var(--ease-quart)]",
        "hover:-translate-y-0.5 hover:border-primary/30 hover:ring-1 hover:ring-primary/15",
      )}
      data-status={status}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          {/* topo: status + nome */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-wider",
                cores.pillBg,
                cores.pillTexto,
              )}
            >
              {cores.spinner ? (
                <Loader2 className="size-3 animate-spin" aria-hidden />
              ) : (
                <span
                  aria-hidden
                  className={cn(
                    "size-1.5 rounded-full",
                    cores.ponto,
                    cores.pulse && "motion-pulse-ambient",
                  )}
                />
              )}
              {ROTULOS_STATUS[status]}
            </span>
            {simulado.curadoria && (
              <span className="inline-flex items-center gap-1 rounded-md bg-ia-muted px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ia-text">
                <Sparkles className="size-3" aria-hidden />
                Curado por IA
              </span>
            )}
          </div>

          <h2
            className="mt-2.5 font-serif text-lg leading-tight tracking-tight md:text-xl"
          >
            {parametros.nome}
          </h2>

          {/* metadados */}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground tabular-nums">
            <Metadado>{obterNomeMaterias(parametros.materias)}</Metadado>
            <Sep />
            <Metadado>{obterNomeSerie(parametros.serie)}</Metadado>
            <Sep />
            <Metadado icone={FileText}>
              {parametros.quantidadeQuestoes} questões
            </Metadado>
            <Sep />
            <Metadado icone={Clock}>{tempoFormatado}</Metadado>
            {parametros.liberadoEm && (
              <>
                <Sep />
                <Metadado icone={Calendar}>
                  {formatarDataBR(parametros.liberadoEm)}
                </Metadado>
              </>
            )}
          </div>

          {/* progresso (em andamento) */}
          {progresso !== null && (
            <div className="mt-4 flex items-center gap-3">
              <div
                className="h-1 flex-1 overflow-hidden rounded-full bg-muted/60"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progresso}
                aria-label={`Progresso do simulado: ${progresso}%`}
              >
                <div
                  className="h-full bg-success transition-all duration-700 [transition-timing-function:var(--ease-quart)]"
                  style={{ width: `${progresso}%` }}
                />
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider tabular-nums text-success">
                {progresso}%
              </span>
            </div>
          )}
        </div>

        {/* ações */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 md:flex-nowrap">
          {podeLiberar && (
            <Button
              size="sm"
              onClick={() => liberar.mutate(simulado.id)}
              disabled={liberar.isPending}
            >
              {liberar.isPending && liberar.variables === simulado.id ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : null}
              Liberar
            </Button>
          )}
          <Button variant="ghost" size="sm" asChild>
            <Link
              href={`/gestor/simulados/${simulado.id}`}
              aria-label={`Ver detalhes de ${parametros.nome}`}
            >
              Ver
            </Link>
          </Button>
          {acao && (
            <Button variant="outline" size="sm" asChild>
              <Link href={acao.href} className="gap-1">
                {acao.rotulo}
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

function Metadado({
  icone: Icone,
  children,
}: {
  icone?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      {Icone && <Icone className="size-3" aria-hidden />}
      {children}
    </span>
  );
}

function Sep() {
  return (
    <span aria-hidden className="opacity-40">
      ·
    </span>
  );
}

// ============================================================
// Estado vazio
// ============================================================

function EstadoVazio({ comFiltro }: { comFiltro: boolean }) {
  if (comFiltro) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Nada encontrado
        </p>
        <p
          className="mt-3 font-serif text-lg tracking-tight"
        >
          Nenhum simulado bate com os filtros.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Tenta limpar a busca ou trocar o status.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-dashed border-border bg-card">
      {/* ilustração editorial: linhas-de-livro estilizadas */}
      <div className="relative h-32 border-b border-border bg-muted/20">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col gap-1.5 opacity-60">
            <span className="block h-1 w-32 rounded-full bg-primary/30" />
            <span className="block h-1 w-44 rounded-full bg-primary/40" />
            <span className="block h-1 w-24 rounded-full bg-primary/30" />
            <span className="block h-1 w-40 rounded-full bg-primary/50" />
            <span className="block h-1 w-28 rounded-full bg-primary/30" />
          </div>
        </div>
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_50%,oklch(0.404_0.171_263/0.08)_0%,transparent_60%)]"
          aria-hidden
        />
      </div>
      <div className="p-8 text-center">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Tudo limpo por aqui
        </p>
        <p
          className="mt-3 font-serif text-xl tracking-tight"
        >
          Você ainda não criou nenhum simulado.
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Comece pelo primeiro — a IA monta o ensaio em segundos a partir dos
          parâmetros que você definir.
        </p>
        <Button asChild className="mt-5 gap-2">
          <Link href="/gestor/simulados/novo">
            <Plus className="size-4" aria-hidden />
            Criar primeiro simulado
          </Link>
        </Button>
      </div>
    </div>
  );
}
