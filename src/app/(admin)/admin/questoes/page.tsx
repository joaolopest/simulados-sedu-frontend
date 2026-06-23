"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  AlertTriangle,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Download,
  FileQuestion,
  Filter,
  MoreHorizontal,
  Search,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  useAdminQuestoes,
  useAtualizarQuestao,
  useMetricasQuestoes,
  useRemoverQuestao,
  type FiltrosQuestao,
  type MetricasQuestao,
} from "@/hooks/api/use-admin";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  NOMES_ADAPTACAO,
  NOMES_MATERIA,
  NOMES_NIVEL,
  NOMES_SERIE,
  obterNomeMateria,
  obterNomeSerie,
} from "@/lib/displays";
import { cn, truncar } from "@/lib/utils";
import type {
  AdaptacaoCognitiva,
  Materia,
  NivelDificuldade,
  SerieEscolar,
  StatusQuestao,
} from "@/types";

const STATUS_OPCOES: { valor: StatusQuestao; rotulo: string }[] = [
  { valor: "rascunho", rotulo: "Rascunho" },
  { valor: "em_revisao", rotulo: "Em revisão" },
  { valor: "publicada", rotulo: "Publicada" },
  { valor: "arquivada", rotulo: "Arquivada" },
];

const SERIES = Object.entries(NOMES_SERIE) as [SerieEscolar, string][];
const MATERIAS = Object.entries(NOMES_MATERIA) as [Materia, string][];
const NIVEIS = Object.entries(NOMES_NIVEL) as [NivelDificuldade, string][];
const ADAPTACOES = Object.entries(NOMES_ADAPTACAO) as [
  AdaptacaoCognitiva,
  string,
][];

const POR_PAGINA = 20;

type EscopoQuestao = NonNullable<FiltrosQuestao["escopo"]>;

const ESCOPOS: { valor: EscopoQuestao; rotulo: string }[] = [
  { valor: "permitidas", rotulo: "Permitidas" },
  { valor: "minhas", rotulo: "Minhas" },
  { valor: "escola", rotulo: "Minha escola" },
  { valor: "rede", rotulo: "Rede" },
];

const TOM_NIVEL: Record<
  NivelDificuldade,
  { bg: string; texto: string; ponto: string }
> = {
  facil: {
    bg: "bg-success-muted",
    texto: "text-success",
    ponto: "bg-success",
  },
  medio: {
    bg: "bg-warning-muted",
    texto: "text-warning",
    ponto: "bg-warning",
  },
  dificil: {
    bg: "bg-destructive-muted",
    texto: "text-destructive",
    ponto: "bg-destructive",
  },
};

const TOM_STATUS: Record<StatusQuestao, string> = {
  rascunho: "bg-muted text-muted-foreground",
  em_revisao: "bg-warning-muted text-warning",
  publicada: "bg-success-muted text-success",
  arquivada: "bg-destructive-muted text-destructive",
};

function ConteudoAdminQuestoes() {
  const { usuario } = useAuth();
  const searchParams = useSearchParams();
  const statusInicial = useMemo(() => {
    const valor = searchParams.get("status");
    if (!valor) return [];
    const validos = ["rascunho", "em_revisao", "publicada", "arquivada"] as const;
    const itens = valor.split(",").filter((v): v is StatusQuestao =>
      (validos as readonly string[]).includes(v),
    );
    return itens;
  }, [searchParams]);

  const [busca, setBusca] = useState<string>("");
  const [buscaDebounced, setBuscaDebounced] = useState<string>("");
  const [escopo, setEscopo] = useState<EscopoQuestao>("permitidas");
  const [series, setSeries] = useState<SerieEscolar[]>([]);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [niveis, setNiveis] = useState<NivelDificuldade[]>([]);
  const [adaptacoes, setAdaptacoes] = useState<AdaptacaoCognitiva[]>([]);
  const [statuses, setStatuses] = useState<StatusQuestao[]>(statusInicial);
  const [pagina, setPagina] = useState<number>(1);
  const [questaoRemovendo, setQuestaoRemovendo] = useState<{
    id: string;
    enunciado: string;
  } | null>(null);

  // Debounce 300ms
  useEffect(() => {
    const id = setTimeout(() => {
      setBuscaDebounced(busca);
      setPagina(1);
    }, 300);
    return () => clearTimeout(id);
  }, [busca]);

  // Reset página quando filtros mudam
  const filtros = useMemo<FiltrosQuestao>(
    () => ({
      escopo,
      busca: buscaDebounced || undefined,
      serie: series.length > 0 ? series : undefined,
      materia: materias.length > 0 ? materias : undefined,
      nivel: niveis.length > 0 ? niveis : undefined,
      adaptacao: adaptacoes.length > 0 ? adaptacoes : undefined,
      status: statuses.length > 0 ? statuses : undefined,
      pagina,
      porPagina: POR_PAGINA,
    }),
    [escopo, buscaDebounced, series, materias, niveis, adaptacoes, statuses, pagina],
  );

  const { data, isLoading, isError, refetch } = useAdminQuestoes(filtros);
  const { data: metricasData, isLoading: metricasLoading } =
    useMetricasQuestoes(filtros);
  const atualizar = useAtualizarQuestao();
  const remover = useRemoverQuestao();

  const metricasPorQuestao = useMemo(() => {
    return new Map(
      (metricasData?.dados ?? []).map((item) => [
        item.questao.id,
        item.metricas,
      ]),
    );
  }, [metricasData]);

  const resumoMetricas = useMemo(() => {
    const metricas = metricasData?.dados.map((item) => item.metricas) ?? [];
    const total = metricas.length;
    const comAlertas = metricas.filter((m) => m.alertas.length > 0).length;
    const semRespostas = metricas.filter((m) => m.totalRespostas === 0).length;
    const taxaMedia =
      total > 0
        ? metricas.reduce((acc, m) => acc + m.taxaAcerto, 0) / total
        : 0;
    return { total, comAlertas, semRespostas, taxaMedia };
  }, [metricasData]);

  const escoposVisiveis = useMemo(() => {
    return ESCOPOS.filter(
      (opcao) => opcao.valor !== "escola" || Boolean(usuario?.escolaId),
    );
  }, [usuario?.escolaId]);

  function alterarStatusQuestao(id: string, novoStatus: StatusQuestao) {
    atualizar.mutate(
      { id, dados: { status: novoStatus } },
      {
        onSuccess: () => {
          const labels: Record<StatusQuestao, string> = {
            rascunho: "marcada como rascunho",
            em_revisao: "marcada como em revisão",
            publicada: "publicada",
            arquivada: "arquivada",
          };
          toast.success(`Questão ${labels[novoStatus]}`);
        },
        onError: () => toast.error("Falha ao alterar status"),
      },
    );
  }

  const totalFiltros =
    (escopo !== "permitidas" ? 1 : 0) +
    series.length +
    materias.length +
    niveis.length +
    adaptacoes.length +
    statuses.length;

  function limparFiltros() {
    setEscopo("permitidas");
    setSeries([]);
    setMaterias([]);
    setNiveis([]);
    setAdaptacoes([]);
    setStatuses([]);
    setPagina(1);
  }

  function alternar<T>(lista: T[], item: T, setter: (l: T[]) => void): void {
    if (lista.includes(item)) setter(lista.filter((i) => i !== item));
    else setter([...lista, item]);
    setPagina(1);
  }

  const meta = data?.meta;
  const inicioFaixa = meta ? (meta.pagina - 1) * meta.porPagina + 1 : 0;
  const fimFaixa = meta
    ? Math.min(meta.pagina * meta.porPagina, meta.total)
    : 0;

  function urlExportacao(formato: "csv" | "json"): string {
    const params = new URLSearchParams();
    params.set("formato", formato);
    params.set("limite", "10000");
    params.set("escopo", escopo);
    if (buscaDebounced) params.set("busca", buscaDebounced);
    for (const item of series) params.append("serie", item);
    for (const item of materias) params.append("materia", item);
    for (const item of niveis) params.append("nivel", item);
    for (const item of adaptacoes) params.append("adaptacao", item);
    for (const item of statuses) params.append("status", item);
    return `/api/admin/questoes/exportar?${params.toString()}`;
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-10">
      {/* Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Painel administrativo
          </p>
          <h1
            className="mt-2 font-serif text-3xl tracking-tight md:text-4xl"
          >
            Banco de questões
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
            Curadoria editorial das questões do ecossistema. Filtra por série,
            matéria, nível e adaptações cognitivas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={urlExportacao("csv")}>
              <Download data-icon="inline-start" />
              Exportar CSV
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={urlExportacao("json")}>
              <Download data-icon="inline-start" />
              Exportar JSON
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/questoes/importar">
              <Upload data-icon="inline-start" />
              Importar JSON
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/admin/questoes/novo">Nova questão</Link>
          </Button>
        </div>
      </header>

      {/* Busca */}
      <section
        className="mt-8"
        role="region"
        aria-label="Busca por enunciado"
      >
        <div className="relative max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por enunciado..."
            aria-label="Buscar questões"
            className="pl-9"
          />
        </div>
      </section>

      {/* Filtros chips */}
      <section
        className="mt-6 space-y-4"
        role="region"
        aria-label="Filtros"
      >
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            <Filter className="mr-1.5 inline size-3" aria-hidden />
            Filtros {totalFiltros > 0 ? `(${totalFiltros})` : ""}
          </p>
          {totalFiltros > 0 && (
            <Button variant="ghost" size="xs" onClick={limparFiltros}>
              <X data-icon="inline-start" />
              Limpar filtros
            </Button>
          )}
        </div>

        <GrupoChips rotulo="Escopo">
          {escoposVisiveis.map(({ valor, rotulo }) => (
            <Chip
              key={valor}
              ativo={escopo === valor}
              onClick={() => {
                setEscopo(valor);
                setPagina(1);
              }}
            >
              {rotulo}
            </Chip>
          ))}
        </GrupoChips>

        <GrupoChips rotulo="Série">
          {SERIES.map(([valor, rotulo]) => (
            <Chip
              key={valor}
              ativo={series.includes(valor)}
              onClick={() => alternar(series, valor, setSeries)}
            >
              {rotulo}
            </Chip>
          ))}
        </GrupoChips>

        <GrupoChips rotulo="Matéria">
          {MATERIAS.map(([valor, rotulo]) => (
            <Chip
              key={valor}
              ativo={materias.includes(valor)}
              onClick={() => alternar(materias, valor, setMaterias)}
            >
              {rotulo}
            </Chip>
          ))}
        </GrupoChips>

        <GrupoChips rotulo="Nível">
          {NIVEIS.map(([valor, rotulo]) => (
            <Chip
              key={valor}
              ativo={niveis.includes(valor)}
              onClick={() => alternar(niveis, valor, setNiveis)}
              tom={TOM_NIVEL[valor]}
            >
              {rotulo}
            </Chip>
          ))}
        </GrupoChips>

        <GrupoChips rotulo="Adaptações">
          {ADAPTACOES.map(([valor, rotulo]) => (
            <Chip
              key={valor}
              ativo={adaptacoes.includes(valor)}
              onClick={() => alternar(adaptacoes, valor, setAdaptacoes)}
            >
              {rotulo}
            </Chip>
          ))}
        </GrupoChips>

        <GrupoChips rotulo="Status">
          {STATUS_OPCOES.map(({ valor, rotulo }) => (
            <Chip
              key={valor}
              ativo={statuses.includes(valor)}
              onClick={() => alternar(statuses, valor, setStatuses)}
            >
              {rotulo}
            </Chip>
          ))}
        </GrupoChips>
      </section>

      {resumoMetricas.total > 0 && (
        <section
          className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          aria-label="Resumo de qualidade das questões"
        >
          <CartaoMetrica
            rotulo="Página analisada"
            valor={`${resumoMetricas.total}`}
            detalhe="questões nesta página"
          />
          <CartaoMetrica
            rotulo="Taxa média"
            valor={formatarPercentual(resumoMetricas.taxaMedia)}
            detalhe="acerto nas respostas"
          />
          <CartaoMetrica
            rotulo="Com alerta"
            valor={`${resumoMetricas.comAlertas}`}
            detalhe="exigem curadoria"
            alerta={resumoMetricas.comAlertas > 0}
          />
          <CartaoMetrica
            rotulo="Sem respostas"
            valor={`${resumoMetricas.semRespostas}`}
            detalhe="sem amostra real"
          />
        </section>
      )}

      {/* Erro */}
      {isError && (
        <div
          className="mt-8 flex items-start justify-between gap-4 rounded-xl border border-destructive/30 bg-destructive-muted p-5 text-destructive"
          role="alert"
        >
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider">
              Erro ao carregar questões
            </p>
            <p className="mt-1 text-sm">Tenta de novo?</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Tentar de novo
          </Button>
        </div>
      )}

      {/* Tabela / lista */}
      <section
        className="mt-8"
        role="region"
        aria-label="Lista de questões"
        aria-busy={isLoading}
      >
        {isLoading || !data ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : data.dados.length === 0 ? (
          <EstadoVazio />
        ) : (
          <>
            {/* Desktop: tabela */}
            <div className="hidden rounded-xl border border-border bg-card md:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border">
                    <TableHead className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      ID
                    </TableHead>
                    <TableHead className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Enunciado
                    </TableHead>
                    <TableHead className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Série
                    </TableHead>
                    <TableHead className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Matéria
                    </TableHead>
                    <TableHead className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Nível
                    </TableHead>
                    <TableHead className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Status
                    </TableHead>
                    <TableHead className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Qualidade
                    </TableHead>
                    <TableHead className="w-[1%] font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.dados.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground tabular-nums">
                        {q.id}
                      </TableCell>
                      <TableCell className="max-w-md whitespace-normal text-sm">
                        {truncar(q.enunciado, 80)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {obterNomeSerie(q.serie)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {obterNomeMateria(q.materia)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs",
                            TOM_NIVEL[q.nivel].bg,
                            TOM_NIVEL[q.nivel].texto,
                          )}
                        >
                          <span
                            className={cn(
                              "size-1.5 rounded-full",
                              TOM_NIVEL[q.nivel].ponto,
                            )}
                            aria-hidden
                          />
                          {NOMES_NIVEL[q.nivel]}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                            TOM_STATUS[q.status],
                          )}
                        >
                          {q.status}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-48">
                        <ResumoQualidadeQuestao
                          metricas={metricasPorQuestao.get(q.id)}
                          carregando={metricasLoading}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button asChild variant="ghost" size="xs">
                            <Link href={`/admin/questoes/${q.id}`}>Editar</Link>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                aria-label="Mais ações"
                              >
                                <MoreHorizontal />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {q.status !== "publicada" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    alterarStatusQuestao(q.id, "publicada")
                                  }
                                >
                                  Publicar
                                </DropdownMenuItem>
                              )}
                              {q.status !== "rascunho" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    alterarStatusQuestao(q.id, "rascunho")
                                  }
                                >
                                  Voltar para rascunho
                                </DropdownMenuItem>
                              )}
                              {q.status !== "arquivada" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    alterarStatusQuestao(q.id, "arquivada")
                                  }
                                >
                                  Arquivar
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() =>
                                  setQuestaoRemovendo({
                                    id: q.id,
                                    enunciado: q.enunciado,
                                  })
                                }
                              >
                                Remover
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile: lista de cards */}
            <div className="space-y-3 md:hidden">
              {data.dados.map((q) => (
                <Link
                  key={q.id}
                  href={`/admin/questoes/${q.id}`}
                  className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {q.id}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                        TOM_STATUS[q.status],
                      )}
                    >
                      {q.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm">{truncar(q.enunciado, 100)}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="font-normal">
                      {obterNomeSerie(q.serie)}
                    </Badge>
                    <Badge variant="outline" className="font-normal">
                      {obterNomeMateria(q.materia)}
                    </Badge>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs",
                        TOM_NIVEL[q.nivel].bg,
                        TOM_NIVEL[q.nivel].texto,
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          TOM_NIVEL[q.nivel].ponto,
                        )}
                        aria-hidden
                      />
                      {NOMES_NIVEL[q.nivel]}
                    </span>
                  </div>
                  <ResumoQualidadeQuestao
                    metricas={metricasPorQuestao.get(q.id)}
                    carregando={metricasLoading}
                    compacto
                  />
                </Link>
              ))}
            </div>

            {/* Paginação */}
            {meta && meta.totalPaginas > 1 && (
              <footer className="mt-6 flex items-center justify-between gap-4 border-t border-border pt-4">
                <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground tabular-nums">
                  Mostrando {inicioFaixa}–{fimFaixa} de {meta.total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagina((p) => Math.max(1, p - 1))}
                    disabled={pagina <= 1}
                  >
                    <ChevronLeft data-icon="inline-start" />
                    Anterior
                  </Button>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {pagina} / {meta.totalPaginas}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPagina((p) => Math.min(meta.totalPaginas, p + 1))
                    }
                    disabled={pagina >= meta.totalPaginas}
                  >
                    Próxima
                    <ChevronRight data-icon="inline-end" />
                  </Button>
                </div>
              </footer>
            )}
          </>
        )}
      </section>

      {/* Dialog: confirmar remoção */}
      <Dialog
        open={questaoRemovendo !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setQuestaoRemovendo(null);
        }}
      >
        {questaoRemovendo && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Remover questão</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Tem certeza que quer remover a questão{" "}
                <span className="font-mono text-foreground">
                  {questaoRemovendo.id}
                </span>
                ? Esta ação não pode ser desfeita.
              </p>
              <blockquote className="border-l-2 border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                {truncar(questaoRemovendo.enunciado, 180)}
              </blockquote>
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setQuestaoRemovendo(null)}
                disabled={remover.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={remover.isPending}
                onClick={() => {
                  const alvo = questaoRemovendo;
                  remover.mutate(alvo.id, {
                    onSuccess: () => {
                      toast.success("Questão removida");
                      setQuestaoRemovendo(null);
                    },
                    onError: () => toast.error("Falha ao remover"),
                  });
                }}
              >
                {remover.isPending ? "Removendo..." : "Remover"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

export default function PaginaAdminQuestoes() {
  return (
    <Suspense fallback={<div className="h-[500px]" aria-hidden />}>
      <ConteudoAdminQuestoes />
    </Suspense>
  );
}

function CartaoMetrica({
  rotulo,
  valor,
  detalhe,
  alerta = false,
}: {
  rotulo: string;
  valor: string;
  detalhe: string;
  alerta?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4",
        alerta ? "border-warning/40" : "border-border",
      )}
    >
      <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {alerta ? (
          <AlertTriangle className="size-3 text-warning" aria-hidden />
        ) : (
          <BarChart3 className="size-3" aria-hidden />
        )}
        {rotulo}
      </p>
      <p className="mt-2 font-serif text-2xl tracking-tight">{valor}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detalhe}</p>
    </div>
  );
}

function ResumoQualidadeQuestao({
  metricas,
  carregando,
  compacto = false,
}: {
  metricas?: MetricasQuestao;
  carregando: boolean;
  compacto?: boolean;
}) {
  if (carregando && !metricas) {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-1.5",
          compacto ? "mt-3" : "",
        )}
      >
        <span className="h-5 w-20 animate-pulse rounded-full bg-muted" />
        <span className="h-5 w-16 animate-pulse rounded-full bg-muted" />
      </div>
    );
  }

  if (!metricas) {
    return (
      <p
        className={cn(
          "font-mono text-[10px] uppercase tracking-wider text-muted-foreground",
          compacto ? "mt-3" : "",
        )}
      >
        Sem métrica
      </p>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5",
        compacto ? "mt-3" : "",
      )}
    >
      <span
        className={cn(
          "rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
          tomTaxa(metricas.taxaAcerto),
        )}
      >
        {formatarPercentual(metricas.taxaAcerto)} acerto
      </span>
      <Badge variant="outline" className="font-mono text-[10px] font-normal">
        {metricas.totalRespostas} resp.
      </Badge>
      <Badge variant="outline" className="font-mono text-[10px] font-normal">
        {metricas.totalUsos} usos
      </Badge>
      {metricas.alertas.length > 0 && (
        <span className="rounded-full bg-warning-muted px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-warning">
          {metricas.alertas.length} alerta
          {metricas.alertas.length > 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}

function formatarPercentual(taxa: number): string {
  return `${Math.round((Number.isFinite(taxa) ? taxa : 0) * 100)}%`;
}

function tomTaxa(taxa: number): string {
  if (taxa >= 0.7) return "bg-success-muted text-success";
  if (taxa >= 0.4) return "bg-warning-muted text-warning";
  return "bg-destructive-muted text-destructive";
}

// ============================================================
// Subcomponentes
// ============================================================

function GrupoChips({
  rotulo,
  children,
}: {
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
      <p className="w-24 shrink-0 pt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {rotulo}
      </p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

interface ChipProps {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tom?: { bg: string; texto: string; ponto: string };
}

function Chip({ ativo, onClick, children, tom }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
        "[transition-timing-function:var(--ease-snap)]",
        ativo
          ? tom
            ? cn(tom.bg, tom.texto, "border-transparent")
            : "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground",
      )}
    >
      {tom && (
        <span
          className={cn("size-1.5 rounded-full", tom.ponto)}
          aria-hidden
        />
      )}
      {children}
    </button>
  );
}

function EstadoVazio() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-primary-muted text-primary-text">
        <FileQuestion className="size-6" aria-hidden />
      </div>
      <p
        className="mt-4 font-serif text-xl tracking-tight"
      >
        Banco vazio
      </p>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Nenhuma questão por aqui ainda. Importa um lote em JSON pra começar a
        montar simulados.
      </p>
      <Button asChild size="sm" className="mt-6">
        <Link href="/admin/questoes/importar">
          Importar primeiro lote
          <ArrowRight data-icon="inline-end" />
        </Link>
      </Button>
    </div>
  );
}
