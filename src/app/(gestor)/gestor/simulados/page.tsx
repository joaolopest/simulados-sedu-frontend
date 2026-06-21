"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Ban,
  BarChart3,
  Calendar,
  Clock,
  Eye,
  FileText,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  useRemoverSimulado,
  useGestorSimulados,
  useLiberarSimulado,
} from "@/hooks/api/use-gestor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatarDataBR } from "@/lib/utils";
import { obterNomeMaterias, obterNomeSerie } from "@/lib/displays";
import { baseProvasPorPerfil, novaProvaPorPerfil } from "@/lib/rotas-provas";
import { useAuthStore } from "@/stores/auth-store";
import type { Simulado, StatusSimulado } from "@/types";

// ============================================================
// Filtro de status
// ============================================================

type FiltroStatus = "todos" | "historico" | StatusSimulado;

const FILTROS: { id: FiltroStatus; rotulo: string }[] = [
  { id: "todos", rotulo: "Todos" },
  { id: "historico", rotulo: "Historico" },
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
  const perfil = useAuthStore((s) => s.usuario?.perfil);
  const pathname = usePathname();
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");
  const [buscaInput, setBuscaInput] = useState("");
  const [buscaDebounced, setBuscaDebounced] = useState("");
  const baseProvas = baseProvasPorPerfil(perfil, pathname);
  const novaProva = novaProvaPorPerfil(perfil, undefined, pathname);

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

  // A aba "Todos" não lista cancelados — eles aparecem em "Histórico".
  const visiveis = (data ?? []).filter((s) =>
    filtroStatus === "todos" ? s.status !== "cancelado" : true,
  );

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
          <Link href={novaProva}>
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
        ) : visiveis.length === 0 ? (
          <EstadoVazio
            comFiltro={filtroStatus !== "todos" || buscaDebounced.length > 0}
            novaProvaHref={novaProva}
          />
        ) : (
          <ul className="space-y-3">
            {visiveis.map((simulado) => (
              <li key={simulado.id}>
                <CardSimulado
                  simulado={simulado}
                  baseProvas={baseProvas}
                  novaProvaHref={novaProvaPorPerfil(perfil, simulado.id, pathname)}
                />
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

function acaoSecundaria(
  simulado: Simulado,
  baseProvas: string,
  novaProvaHref: string,
): AcaoSecundaria | null {
  switch (simulado.status) {
    case "rascunho":
    case "em_curadoria":
      return {
        rotulo: "Editar",
        href: novaProvaHref,
      };
    case "liberado":
    case "em_andamento":
      return {
        rotulo: "Acompanhar",
        href: `${baseProvas}/${simulado.id}/acompanhar`,
      };
    case "finalizado":
      return {
        rotulo: "Relatório",
        href: `${baseProvas}/${simulado.id}/relatorio`,
      };
    case "cancelado":
      return null;
  }
}

function CardSimulado({
  simulado,
  baseProvas,
  novaProvaHref,
}: {
  simulado: Simulado;
  baseProvas: string;
  novaProvaHref: string;
}) {
  const { parametros, status } = simulado;
  const [confirmacaoRemocaoAberta, setConfirmacaoRemocaoAberta] =
    useState(false);
  const [modoRemocao, setModoRemocao] = useState<
    "cancelar" | "remover" | "excluir"
  >("remover");
  const cores = classesStatus(status);
  const acao = acaoSecundaria(simulado, baseProvas, novaProvaHref);
  const liberar = useLiberarSimulado();
  const remover = useRemoverSimulado();
  const podeLiberar = status === "em_curadoria";
  const preservaResultado =
    status === "liberado" ||
    status === "em_andamento" ||
    status === "finalizado";

  const nome = parametros.nome?.trim() || `Simulado ${simulado.id}`;
  const materias = parametros.materias ?? [];
  const quantidadeQuestoes =
    parametros.quantidadeQuestoes ?? simulado.questaoIds.length ?? 0;
  const tempoMin = parametros.tempoLimiteMinutos ?? 60;
  const tempoFormatado =
    tempoMin >= 60
      ? `${Math.floor(tempoMin / 60)}h${tempoMin % 60 > 0 ? ` ${tempoMin % 60}min` : ""}`
      : `${tempoMin} min`;

  // Progresso derivado até a rota de acompanhamento retornar eventos em tempo real.
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

  function abrirRemocao(modo: "cancelar" | "remover" | "excluir") {
    setModoRemocao(modo);
    setConfirmacaoRemocaoAberta(true);
  }

  async function removerSimulado() {
    const forcar = modoRemocao === "excluir";
    try {
      const resultado = await remover.mutateAsync({ id: simulado.id, forcar });
      toast.success(
        resultado.cancelado
          ? "Simulado cancelado — resultados preservados no histórico."
          : "Simulado excluído.",
      );
      setConfirmacaoRemocaoAberta(false);
    } catch {
      toast.error("Não foi possível concluir a ação.");
    }
  }

  return (
    <>
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
            {nome}
          </h2>

          {/* metadados */}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground tabular-nums">
            <Metadado>{obterNomeMaterias(materias)}</Metadado>
            <Sep />
            <Metadado>{obterNomeSerie(parametros.serie)}</Metadado>
            <Sep />
            <Metadado icone={FileText}>
              {quantidadeQuestoes} questões
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
        <div className="flex shrink-0 items-center gap-2">
          {podeLiberar && (
            <Button
              size="sm"
              onClick={() => liberar.mutate(simulado.id)}
              disabled={liberar.isPending}
            >
              {liberar.isPending ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Send className="size-3.5" aria-hidden />
              )}
              Liberar
            </Button>
          )}
          {acao && (
            <Button variant="outline" size="sm" asChild>
              <Link href={acao.href} className="gap-1">
                {acao.rotulo}
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Mais ações de ${nome}`}
                disabled={remover.isPending}
              >
                {remover.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <MoreHorizontal className="size-4" aria-hidden />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link href={`${baseProvas}/${simulado.id}`}>
                  <Eye className="size-4" aria-hidden />
                  Ver detalhes
                </Link>
              </DropdownMenuItem>
              {(status === "rascunho" || status === "em_curadoria") && (
                <DropdownMenuItem asChild>
                  <Link href={novaProvaHref}>
                    <Pencil className="size-4" aria-hidden />
                    Editar
                  </Link>
                </DropdownMenuItem>
              )}
              {podeLiberar && (
                <DropdownMenuItem
                  onClick={() => liberar.mutate(simulado.id)}
                  disabled={liberar.isPending}
                >
                  <Send className="size-4" aria-hidden />
                  Liberar
                </DropdownMenuItem>
              )}
              {(status === "liberado" || status === "em_andamento") && (
                <DropdownMenuItem asChild>
                  <Link href={`${baseProvas}/${simulado.id}/acompanhar`}>
                    <Activity className="size-4" aria-hidden />
                    Acompanhar
                  </Link>
                </DropdownMenuItem>
              )}
              {(status === "liberado" ||
                status === "em_andamento" ||
                status === "finalizado") && (
                <DropdownMenuItem asChild>
                  <Link href={`${baseProvas}/${simulado.id}/relatorio`}>
                    <BarChart3 className="size-4" aria-hidden />
                    Relatório
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {status === "cancelado" ? (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => abrirRemocao("excluir")}
                >
                  <Trash2 className="size-4" aria-hidden />
                  Excluir definitivamente
                </DropdownMenuItem>
              ) : preservaResultado ? (
                <>
                  <DropdownMenuItem onClick={() => abrirRemocao("cancelar")}>
                    <Ban className="size-4" aria-hidden />
                    Cancelar simulado
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => abrirRemocao("excluir")}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    Excluir definitivamente
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => abrirRemocao("remover")}
                >
                  <Trash2 className="size-4" aria-hidden />
                  Remover
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </article>
    <Dialog
      open={confirmacaoRemocaoAberta}
      onOpenChange={(aberto) => {
        if (!remover.isPending) setConfirmacaoRemocaoAberta(aberto);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {modoRemocao === "excluir"
              ? "Excluir definitivamente?"
              : modoRemocao === "cancelar"
                ? "Cancelar simulado?"
                : "Remover simulado?"}
          </DialogTitle>
          <DialogDescription>
            {modoRemocao === "excluir"
              ? "Isso apaga o simulado e TODOS os resultados/respostas vinculados. Não dá pra desfazer."
              : modoRemocao === "cancelar"
                ? "O simulado será cancelado e os resultados ficam preservados no histórico."
                : "Este simulado ainda não tem respostas vinculadas. A remoção não pode ser desfeita."}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <p className="line-clamp-2 text-sm font-medium text-foreground">
            {nome}
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {ROTULOS_STATUS[status]} · {quantidadeQuestoes} questoes
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <DialogClose asChild>
            <Button variant="outline" disabled={remover.isPending}>
              Manter
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={removerSimulado}
            disabled={remover.isPending}
          >
            {remover.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="size-4" aria-hidden />
            )}
            {modoRemocao === "excluir"
              ? "Excluir tudo"
              : modoRemocao === "cancelar"
                ? "Cancelar simulado"
                : "Remover"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
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

function EstadoVazio({
  comFiltro,
  novaProvaHref,
}: {
  comFiltro: boolean;
  novaProvaHref: string;
}) {
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
          <Link href={novaProvaHref}>
            <Plus className="size-4" aria-hidden />
            Criar primeiro simulado
          </Link>
        </Button>
      </div>
    </div>
  );
}
