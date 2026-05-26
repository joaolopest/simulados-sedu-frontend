"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  Loader2,
  Minus,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  useGestorDashboard,
  useLiberarSimulado,
  type AlunoEmRiscoResumo,
} from "@/hooks/api/use-gestor";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Skeleton } from "@/components/ui/skeleton";
import { BadgeIA } from "@/components/ia/badge-ia";
import { CardKpi } from "@/components/graficos/card-kpi";
import { CategoryBadge } from "@/components/ui/category-badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  cn,
  formatarDataBR,
  formatarNota,
  formatarPorcentagem,
  formatarTempoRelativo,
  gerarIniciais,
} from "@/lib/utils";
import {
  obterNomeMaterias,
  obterNomeSerie,
  saudacaoDoMomento,
} from "@/lib/displays";
import type { Simulado, StatusSimulado } from "@/types";

type SimuladoComContagem = Simulado & { totalAlunos: number };

// ============================================================
// Página
// ============================================================

export default function PaginaDashboardGestor() {
  const { usuario } = useAuth();
  const { data, isLoading, isError, refetch } = useGestorDashboard();

  const primeiroNome = usuario?.nome.split(" ")[0] ?? "";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-10">
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {formatarDataBR(new Date(), "EEEE',' d 'de' MMMM")}
        </p>
        <h1
          className="mt-2 font-serif text-3xl tracking-tight md:text-4xl"
        >
          {saudacaoDoMomento()},{" "}
          <span className="text-primary-text">{primeiroNome || "—"}</span>.
        </h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          Visão geral da escola, simulados em curso e alertas pedagógicos
          gerados pela IA.
        </p>
      </header>

      {/* Estado de erro global */}
      {isError && (
        <div
          className="mt-8 flex items-start justify-between gap-4 rounded-xl border border-destructive/30 bg-destructive-muted p-5 text-destructive"
          role="alert"
        >
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider">
              Erro ao carregar dashboard
            </p>
            <p className="mt-1 text-sm">
              Não consegui buscar os dados agora. Tenta de novo?
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Tentar de novo
          </Button>
        </div>
      )}

      {/* KPIs */}
      <section className="mt-8" aria-labelledby="kpis-titulo">
        <h2 id="kpis-titulo" className="sr-only">
          Indicadores principais
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading || !data
            ? Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))
            : (
              <>
                <CardKpi
                  icone={Users}
                  rotulo="Alunos da escola"
                  valor={data.kpis.totalAlunos.toLocaleString("pt-BR")}
                  tom="neutro"
                  delayReveal={0}
                />
                <CardKpi
                  icone={Activity}
                  rotulo="Simulados em andamento"
                  valor={data.kpis.simuladosEmAndamento.toString()}
                  tom={data.kpis.simuladosEmAndamento > 0 ? "vivo" : "neutro"}
                  delayReveal={0.08}
                />
                <CardKpi
                  icone={TrendingUp}
                  rotulo="Média geral"
                  valor={formatarNota(data.kpis.mediaGeral)}
                  tom="primario"
                  delta={{ valor: "+0.4", direcao: "subindo" }}
                  delayReveal={0.16}
                />
                <CardKpi
                  icone={AlertTriangle}
                  rotulo="Alertas de IA"
                  valor={data.kpis.alertasIA.toString()}
                  tom={data.kpis.alertasIA > 0 ? "alerta" : "neutro"}
                  delayReveal={0.24}
                />
              </>
            )}
        </div>
      </section>

      {/* Grid principal: simulados + alertas */}
      <div className="mt-10 grid gap-8 lg:grid-cols-3">
        {/* Meus simulados */}
        <section
          className="lg:col-span-2"
          aria-labelledby="meus-simulados-titulo"
        >
          <header className="mb-4 flex items-center justify-between">
            <h2
              id="meus-simulados-titulo"
              className="font-serif text-xl tracking-tight md:text-2xl"
            >
              Meus simulados
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/gestor/simulados" className="gap-1">
                Ver todos
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </Button>
          </header>

          {isLoading || !data ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : data.meusSimulados.length === 0 ? (
            <EmptyState
              icone={Activity}
              tomIcone="neutro"
              titulo="Crie seu primeiro simulado."
              descricao="Nada por aqui ainda"
              acao={
                <Button className="mt-4" asChild>
                  <Link href="/gestor/simulados/novo">+ Novo simulado</Link>
                </Button>
              }
            />
          ) : (
            <ul className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {data.meusSimulados.map((simulado) => (
                <li key={simulado.id}>
                  <ItemSimulado simulado={simulado} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Alertas IA */}
        <section aria-labelledby="alertas-ia-titulo">
          <header className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2
                id="alertas-ia-titulo"
                className="font-serif text-xl tracking-tight md:text-2xl"
              >
                Alertas
              </h2>
              <BadgeIA tamanho="sm" descricao="Predição gerada pela IA com base em padrões de desempenho e engajamento dos alunos." />
            </div>
          </header>

          {isLoading || !data ? (
            <Skeleton className="h-72 w-full rounded-xl" />
          ) : (
            <BlocoAlertasIA alunos={data.alunosEmRisco.slice(0, 3)} />
          )}
        </section>
      </div>

      {/* Gráfico médias por turma */}
      <section className="mt-10" aria-labelledby="medias-turma-titulo">
        <header className="mb-4">
          <h2
            id="medias-turma-titulo"
            className="font-serif text-xl tracking-tight md:text-2xl"
          >
            Média por turma
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Comparativo entre turmas com base nos simulados finalizados.
          </p>
        </header>

        {isLoading || !data ? (
          <Skeleton className="h-80 w-full rounded-xl" />
        ) : data.mediasPorTurma.length === 0 ? (
          <EmptyState
            icone={TrendingUp}
            tomIcone="neutro"
            titulo="Nenhuma turma com simulado finalizado ainda."
            variante="compacto"
          />
        ) : (
          <GraficoMediasTurma dados={data.mediasPorTurma} />
        )}
      </section>
    </div>
  );
}

// ============================================================
// Item de simulado
// ============================================================

const ROTULOS_STATUS: Record<StatusSimulado, string> = {
  rascunho: "Rascunho",
  em_curadoria: "Em curadoria",
  liberado: "Liberado",
  em_andamento: "Em andamento",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

function obterCategoriaStatus(status: StatusSimulado): "neutro" | "missao" | "autoridade" | "aprendizado" | "destrutivo" {
  switch (status) {
    case "rascunho":
    case "finalizado":
      return "neutro";
    case "em_curadoria":
      return "missao";
    case "liberado":
      return "autoridade";
    case "em_andamento":
      return "aprendizado";
    case "cancelado":
      return "destrutivo";
    default:
      return "neutro";
  }
}

function destinoSimulado(simulado: Simulado): string {
  switch (simulado.status) {
    case "em_andamento":
      return `/gestor/simulados/${simulado.id}/acompanhar`;
    case "finalizado":
      return `/gestor/simulados/${simulado.id}/relatorio`;
    case "rascunho":
    case "em_curadoria":
      return `/gestor/simulados/novo?id=${simulado.id}`;
    default:
      return `/gestor/simulados/${simulado.id}`;
  }
}

function ItemSimulado({ simulado }: { simulado: SimuladoComContagem }) {
  const { status, parametros } = simulado;
  const categoria = obterCategoriaStatus(status);
  const podeLiberar = status === "em_curadoria";
  const [confirmaAberto, setConfirmaAberto] = useState(false);
  const liberar = useLiberarSimulado();

  const tempoMin = parametros.tempoLimiteMinutos;
  const tempoFormatado =
    tempoMin >= 60
      ? `${Math.floor(tempoMin / 60)}h${tempoMin % 60 > 0 ? ` ${tempoMin % 60}min` : ""}`
      : `${tempoMin} min`;

  return (
    <article
      className={cn(
        "group flex items-center gap-4 rounded-lg border border-border bg-card p-4",
        "transition-all duration-200 [transition-timing-function:var(--ease-quart)]",
        "hover:bg-accent/40 hover:border-primary/20",
      )}
    >
      <CategoryBadge categoria={categoria} tamanho="sm">
        {status === "em_curadoria" && <Loader2 className="mr-1 size-3 animate-spin" aria-hidden />}
        {status === "em_andamento" && (
          <span
            aria-hidden
            className="mr-1.5 size-1.5 rounded-full bg-success motion-pulse-ambient"
          />
        )}
        {ROTULOS_STATUS[status]}
      </CategoryBadge>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {parametros.nome}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground tabular-nums">
          <span>{obterNomeMaterias(parametros.materias)}</span>
          <span aria-hidden>·</span>
          <span>{obterNomeSerie(parametros.serie)}</span>
          <span aria-hidden>·</span>
          <span>{simulado.totalAlunos} alunos</span>
          <span aria-hidden>·</span>
          <span>{tempoFormatado}</span>
          <span aria-hidden>·</span>
          <span>{parametros.quantidadeQuestoes}q</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {podeLiberar && (
          <Button
            size="sm"
            variant="default"
            onClick={() => setConfirmaAberto(true)}
            disabled={liberar.isPending}
          >
            <CheckCircle2 className="size-3.5" aria-hidden />
            Liberar
          </Button>
        )}
        <Button variant="ghost" size="sm" asChild>
          <Link
            href={destinoSimulado(simulado)}
            className="gap-1"
            aria-label={`Ver detalhes de ${parametros.nome}`}
          >
            Ver
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </Button>
      </div>

      {podeLiberar && (
        <Dialog open={confirmaAberto} onOpenChange={setConfirmaAberto}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Liberar simulado?</DialogTitle>
              <DialogDescription>
                Os alunos da turma vão receber notificação e poderão iniciar
                <strong> {parametros.nome}</strong> imediatamente. Essa ação
                não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button
                onClick={() => {
                  liberar.mutate(simulado.id, {
                    onSuccess: () => setConfirmaAberto(false),
                  });
                }}
                disabled={liberar.isPending}
              >
                {liberar.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <CheckCircle2 className="size-3.5" aria-hidden />
                )}
                Confirmar liberação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </article>
  );
}

// ============================================================
// Bloco de alertas IA
// ============================================================

function BlocoAlertasIA({ alunos }: { alunos: AlunoEmRiscoResumo[] }) {
  if (alunos.length === 0) {
    return (
      <EmptyState
        icone={Sparkles}
        tomIcone="ia"
        titulo="Nenhum aluno em risco no momento."
        descricao="A IA continua monitorando os padrões de desempenho."
        variante="compacto"
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-ia/20 bg-ia-muted">
      <ul className="divide-y divide-ia/15">
        {alunos.map((item) => (
          <li key={item.aluno.id}>
            <ItemAlertaAluno item={item} />
          </li>
        ))}
      </ul>
      <div className="border-t border-ia/15 bg-card/50 px-4 py-3">
        <Link
          href="/gestor/alertas"
          className="inline-flex items-center gap-1 text-sm font-medium text-ia-text transition-colors hover:text-ia"
        >
          Ver todos os alertas
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

function ItemAlertaAluno({ item }: { item: AlunoEmRiscoResumo }) {
  const { aluno, probabilidadeRisco, tendencia, ultimaAtualizacao } = item;
  const pct = Math.round(probabilidadeRisco * 100);

  const categoria = pct >= 70 ? "destrutivo" : pct >= 40 ? "missao" : "aprendizado";
  
  const corBarra = {
    destrutivo: "bg-destructive",
    missao: "bg-warning",
    aprendizado: "bg-success",
  }[categoria];

  const tendenciaClasse =
    tendencia === "subindo"
      ? "text-destructive"
      : tendencia === "caindo"
        ? "text-success"
        : "text-muted-foreground";

  const TendenciaIcone =
    tendencia === "subindo"
      ? ArrowUp
      : tendencia === "caindo"
        ? ArrowDown
        : Minus;

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Avatar className="size-9 shrink-0">
        <AvatarImage src={aluno.fotoUrl} alt={aluno.nome} />
        <AvatarFallback className="bg-ia/15 font-mono text-[10px] uppercase text-ia-text">
          {gerarIniciais(aluno.nome)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {aluno.nome}
          </p>
          <CategoryBadge categoria={categoria} tamanho="xs">
            {formatarPorcentagem(pct)}
          </CategoryBadge>
        </div>

        <div
          className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted/60"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label={`Probabilidade de risco: ${pct}%`}
        >
          <div
            className={cn(
              "h-full transition-all duration-700",
              "[transition-timing-function:var(--ease-quart)]",
              corBarra,
            )}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="mt-1.5 flex items-center justify-between gap-2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          <span className="truncate">
            {aluno.turmaIds?.[0] ?? "Sem turma"}
          </span>
          <span className="inline-flex items-center gap-1">
            <TendenciaIcone className={cn("size-3", tendenciaClasse)} aria-hidden />
            <span className={tendenciaClasse}>
              {tendencia === "subindo"
                ? "subindo"
                : tendencia === "caindo"
                  ? "caindo"
                  : "estável"}
            </span>
            <span aria-hidden>·</span>
            <span>{formatarTempoRelativo(ultimaAtualizacao)}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Gráfico médias por turma
// ============================================================

interface DadoTurma {
  turmaId: string;
  turmaNome: string;
  media: number;
}

function GraficoMediasTurma({ dados }: { dados: DadoTurma[] }) {
  const ordenado = useMemo(
    () => [...dados].sort((a, b) => b.media - a.media),
    [dados],
  );
  const altura = Math.max(220, ordenado.length * 44);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div style={{ width: "100%", height: altura }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={ordenado}
            layout="vertical"
            margin={{ top: 4, right: 24, bottom: 4, left: 4 }}
            barSize={18}
          >
            <CartesianGrid
              horizontal={false}
              stroke="var(--border)"
              strokeDasharray="3 3"
            />
            <XAxis
              type="number"
              domain={[0, 10]}
              axisLine={false}
              tickLine={false}
              tick={{
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                fill: "var(--muted-foreground)",
              }}
            />
            <YAxis
              type="category"
              dataKey="turmaNome"
              axisLine={false}
              tickLine={false}
              width={120}
              tick={{
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                fill: "var(--foreground)",
              }}
            />
            <Tooltip
              cursor={{ fill: "var(--accent)", opacity: 0.4 }}
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
                fontFamily: "var(--font-mono)",
                padding: "8px 10px",
              }}
              labelStyle={{
                color: "var(--muted-foreground)",
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
              formatter={(valor) => [
                typeof valor === "number" ? formatarNota(valor) : String(valor),
                "Média",
              ]}
            />
            <Bar
              dataKey="media"
              fill="var(--chart-1)"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
