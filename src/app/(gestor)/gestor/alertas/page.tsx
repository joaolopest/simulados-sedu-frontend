"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Minus,
  Save,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  useGestorAlertas,
  type AlertaRisco,
} from "@/hooks/api/use-gestor";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { BadgeIA } from "@/components/ia/badge-ia";
import {
  cn,
  formatarNota,
  formatarPorcentagem,
  formatarTempoRelativo,
  gerarIniciais,
} from "@/lib/utils";
import { criar } from "@/lib/api";
import { obterNomeAdaptacao } from "@/lib/displays";

type FiltroFaixa = "todos" | "alta" | "media" | "baixa";

const FAIXAS: { valor: FiltroFaixa; rotulo: string }[] = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "alta", rotulo: "Alta (≥70%)" },
  { valor: "media", rotulo: "Média (40–70%)" },
  { valor: "baixa", rotulo: "Baixa (<40%)" },
];

// ============================================================
// Página
// ============================================================

export default function PaginaGestorAlertas() {
  const { data, isLoading, isError, refetch } = useGestorAlertas();
  const [faixa, setFaixa] = useState<FiltroFaixa>("todos");
  const [alertaSelecionado, setAlertaSelecionado] = useState<AlertaRisco | null>(
    null,
  );

  const alertasFiltrados = useMemo(() => {
    if (!data?.dados) return [];
    const ordenados = [...data.dados].sort(
      (a, b) => b.probabilidadeRisco - a.probabilidadeRisco,
    );
    if (faixa === "todos") return ordenados;
    return ordenados.filter((alerta) => {
      const probabilidade = alerta.probabilidadeRisco;
      if (faixa === "alta") return probabilidade >= 0.7;
      if (faixa === "media") return probabilidade >= 0.4 && probabilidade < 0.7;
      return probabilidade < 0.4;
    });
  }, [data, faixa]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-10">
      {/* Header */}
      <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Painel do gestor
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1
              className="font-serif text-3xl tracking-tight md:text-4xl"
            >
              Alertas de IA
            </h1>
            <BadgeIA
              tamanho="md"
              descricao="Predições geradas pela IA com base em padrões de desempenho, frequência e engajamento."
            />
          </div>
          <p className="mt-3 max-w-2xl text-base text-muted-foreground">
            Alunos com maior probabilidade de risco pedagógico, ordenados pela
            previsão da IA.
          </p>
        </div>

        {/* Stats inline */}
        <dl className="grid grid-cols-3 gap-3" aria-label="Resumo de alertas por severidade">
          <CardStat
            rotulo="Alta"
            valor={data?.contagens.alta ?? 0}
            isLoading={isLoading}
            tom="destructive"
          />
          <CardStat
            rotulo="Média"
            valor={data?.contagens.media ?? 0}
            isLoading={isLoading}
            tom="warning"
          />
          <CardStat
            rotulo="Baixa"
            valor={data?.contagens.baixa ?? 0}
            isLoading={isLoading}
            tom="success"
          />
        </dl>
      </header>

      {/* Filtros pills */}
      <div
        className="mt-8 flex flex-wrap gap-2"
        role="group"
        aria-label="Filtrar por faixa de risco"
      >
        {FAIXAS.map((opcao) => {
          const ativo = faixa === opcao.valor;
          return (
            <button
              key={opcao.valor}
              type="button"
              onClick={() => setFaixa(opcao.valor)}
              aria-pressed={ativo}
              className={cn(
                "inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium",
                "transition-colors duration-150 [transition-timing-function:var(--ease-quart)]",
                ativo
                  ? "border-primary/30 bg-primary-muted text-primary-text"
                  : "border-border bg-card text-foreground/70 hover:border-primary/20 hover:text-foreground",
              )}
            >
              {opcao.rotulo}
            </button>
          );
        })}
      </div>

      {/* Erro */}
      {isError && (
        <div
          className="mt-8 flex items-start justify-between gap-4 rounded-xl border border-destructive/30 bg-destructive-muted p-5 text-destructive"
          role="alert"
        >
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider">
              Erro ao carregar alertas
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

      {/* Lista */}
      <section
        className="mt-6 space-y-2"
        role="region"
        aria-label="Lista de alunos em risco"
        aria-busy={isLoading}
      >
        {isLoading || !data ? (
          Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))
        ) : alertasFiltrados.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Sem alertas nesta faixa
            </p>
            <p
              className="mt-3 font-serif text-lg tracking-tight"
            >
              Nenhum aluno corresponde ao filtro selecionado.
            </p>
          </div>
        ) : (
          alertasFiltrados.map((alerta) => (
            <ItemAlerta
              key={alerta.aluno.id}
              alerta={alerta}
              onAbrirDetalhes={() => setAlertaSelecionado(alerta)}
            />
          ))
        )}
      </section>

      {/* Sheet de detalhes */}
      <Sheet
        open={alertaSelecionado !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setAlertaSelecionado(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-lg"
        >
          {alertaSelecionado && (
            <DetalhesAlerta alerta={alertaSelecionado} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ============================================================
// Card stat
// ============================================================

interface CardStatProps {
  rotulo: string;
  valor: number;
  isLoading: boolean;
  tom: "destructive" | "warning" | "success";
}

function CardStat({ rotulo, valor, isLoading, tom }: CardStatProps) {
  const tomClasses = {
    destructive: {
      borda: "border-destructive/30",
      bg: "bg-destructive-muted/40",
      texto: "text-destructive",
    },
    warning: {
      borda: "border-warning/30",
      bg: "bg-warning-muted/40",
      texto: "text-warning",
    },
    success: {
      borda: "border-success/30",
      bg: "bg-success-muted/40",
      texto: "text-success",
    },
  }[tom];

  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 text-center",
        tomClasses.borda,
        tomClasses.bg,
      )}
    >
      <dd
        className={cn(
          "font-serif text-2xl leading-none tabular-nums",
          tomClasses.texto,
        )}
      >
        {isLoading ? "—" : valor}
      </dd>
      <dt className="mt-1.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        {rotulo}
      </dt>
    </div>
  );
}

// ============================================================
// Item da lista
// ============================================================

function classificarFaixa(probabilidade: number): "alta" | "media" | "baixa" {
  if (probabilidade >= 0.7) return "alta";
  if (probabilidade >= 0.4) return "media";
  return "baixa";
}

const COR_FAIXA: Record<
  "alta" | "media" | "baixa",
  { texto: string; barra: string; ring: string }
> = {
  alta: {
    texto: "text-destructive",
    barra: "bg-destructive",
    ring: "ring-destructive/20",
  },
  media: { texto: "text-warning", barra: "bg-warning", ring: "ring-warning/20" },
  baixa: { texto: "text-success", barra: "bg-success", ring: "ring-success/20" },
};

function ItemAlerta({
  alerta,
  onAbrirDetalhes,
}: {
  alerta: AlertaRisco;
  onAbrirDetalhes: () => void;
}) {
  const { aluno, probabilidadeRisco, tendencia, ultimaAtualizacao, turmaNome } =
    alerta;
  const pct = Math.round(probabilidadeRisco * 100);
  const faixa = classificarFaixa(probabilidadeRisco);
  const cor = COR_FAIXA[faixa];

  const TendenciaIcone =
    tendencia === "subindo" ? ArrowUp : tendencia === "caindo" ? ArrowDown : Minus;
  const tendenciaCor =
    tendencia === "subindo"
      ? "text-destructive"
      : tendencia === "caindo"
        ? "text-success"
        : "text-muted-foreground";

  return (
    <button
      type="button"
      onClick={onAbrirDetalhes}
      aria-label={`Abrir detalhes de ${aluno.nome}`}
      className={cn(
        "group flex w-full items-center gap-4 rounded-lg border border-border bg-card p-4 text-left",
        "transition-all duration-200 [transition-timing-function:var(--ease-quart)]",
        "hover:-translate-y-0.5 hover:border-primary/30 hover:bg-accent/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <Avatar className="size-10 shrink-0">
        <AvatarImage src={aluno.fotoUrl} alt={aluno.nome} />
        <AvatarFallback className="bg-ia/15 font-mono text-[10px] uppercase text-ia-text">
          {gerarIniciais(aluno.nome)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-sm font-medium text-foreground">
            {aluno.nome}
          </p>
          <span
            className={cn(
              "shrink-0 font-mono text-sm font-semibold tabular-nums",
              cor.texto,
            )}
          >
            {formatarPorcentagem(pct)}
          </span>
        </div>

        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted/60"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label={`Probabilidade de risco: ${pct} por cento`}
        >
          <div
            className={cn(
              "h-full transition-[width] duration-700 [transition-timing-function:var(--ease-quart)]",
              cor.barra,
            )}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground tabular-nums">
          <span className="truncate">{turmaNome}</span>
          <span className="inline-flex items-center gap-1">
            <TendenciaIcone className={cn("size-3", tendenciaCor)} aria-hidden />
            <span className={tendenciaCor}>
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
    </button>
  );
}

// ============================================================
// Detalhes (Sheet)
// ============================================================

function DetalhesAlerta({ alerta }: { alerta: AlertaRisco }) {
  const [acao, setAcao] = useState<string>("");
  const [salvando, setSalvando] = useState<boolean>(false);

  const serie = useMemo(() => {
    if (alerta.historicoNotas?.length) return alerta.historicoNotas;
    return [{ rodada: 1, nota: alerta.ultimaNota }];
  }, [alerta.historicoNotas, alerta.ultimaNota]);

  const pct = Math.round(alerta.probabilidadeRisco * 100);
  const faixa = classificarFaixa(alerta.probabilidadeRisco);
  const cor = COR_FAIXA[faixa];

  async function salvar(): Promise<void> {
    if (acao.trim().length < 5) {
      toast.error("Descreva a ação com pelo menos 5 caracteres.");
      return;
    }
    setSalvando(true);
    try {
      await criar(`/suporte/aluno/${alerta.aluno.id}/nota`, { texto: acao.trim() });
      toast.success("Ação pedagógica registrada.");
      setAcao("");
    } catch {
      toast.error("Falha ao salvar. Tenta de novo.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <SheetHeader className="border-b border-border px-6 py-5">
        <div className="flex items-start gap-4">
          <Avatar className="size-12 shrink-0">
            <AvatarImage src={alerta.aluno.fotoUrl} alt={alerta.aluno.nome} />
            <AvatarFallback className="bg-ia/15 font-mono text-xs uppercase text-ia-text">
              {gerarIniciais(alerta.aluno.nome)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <SheetTitle
              className="font-serif text-xl tracking-tight"
            >
              {alerta.aluno.nome}
            </SheetTitle>
            <SheetDescription className="mt-0.5 font-mono text-[10px] uppercase tracking-wider tabular-nums">
              {alerta.turmaNome}
              <span aria-hidden className="mx-2">·</span>
              última nota: {formatarNota(alerta.ultimaNota)}
            </SheetDescription>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-md px-2 py-1 font-mono text-xs tabular-nums",
              "bg-card ring-1",
              cor.ring,
              cor.texto,
            )}
          >
            {formatarPorcentagem(pct)}
          </span>
        </div>
      </SheetHeader>

      <div className="space-y-6 px-6 py-6">
        {/* Adaptações */}
        {(alerta.aluno.adaptacoes ?? []).length > 0 && (
          <section aria-labelledby="adaptacoes-titulo">
            <h3
              id="adaptacoes-titulo"
              className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
            >
              Adaptações cognitivas
            </h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(alerta.aluno.adaptacoes ?? []).map((a) => (
                <span
                  key={a}
                  className="inline-flex items-center rounded-full bg-warning-muted px-2.5 py-1 text-[11px] font-medium text-warning"
                >
                  {obterNomeAdaptacao(a)}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Mini-gráfico de evolução */}
        <section aria-labelledby="evolucao-titulo">
          <h3
            id="evolucao-titulo"
            className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
          >
            Evolução das últimas 6 notas
          </h3>
          <div className="mt-3 h-32 rounded-lg border border-border bg-card p-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={serie}
                margin={{ top: 6, right: 8, bottom: 0, left: 0 }}
              >
                <XAxis
                  dataKey="rodada"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 9,
                    fontFamily: "var(--font-mono)",
                    fill: "var(--muted-foreground)",
                  }}
                />
                <YAxis
                  domain={[0, 10]}
                  axisLine={false}
                  tickLine={false}
                  width={20}
                  tick={{
                    fontSize: 9,
                    fontFamily: "var(--font-mono)",
                    fill: "var(--muted-foreground)",
                  }}
                />
                <RechartsTooltip
                  cursor={{ stroke: "var(--accent)" }}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    padding: "6px 8px",
                  }}
                  formatter={(valor) => [
                    typeof valor === "number" ? formatarNota(valor) : String(valor),
                    "Nota",
                  ]}
                  labelFormatter={(label) => `Rodada ${String(label)}`}
                />
                <Line
                  type="monotone"
                  dataKey="nota"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--primary)" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Competências fracas */}
        {alerta.competenciasFracas.length > 0 && (
          <section aria-labelledby="competencias-fracas-titulo">
            <h3
              id="competencias-fracas-titulo"
              className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
            >
              Competências mais fracas
            </h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {alerta.competenciasFracas.map((competencia) => (
                <span
                  key={competencia}
                  className="inline-flex items-center rounded-full border border-destructive/30 bg-destructive-muted px-2.5 py-1 text-[11px] font-medium text-destructive"
                >
                  {competencia}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Insight IA inline */}
        <section
          className="rounded-lg border border-ia/20 bg-ia-muted p-4"
          aria-labelledby="recomendacao-titulo"
        >
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-ia-text" aria-hidden />
            <div>
              <h3
                id="recomendacao-titulo"
                className="font-mono text-[10px] uppercase tracking-[0.16em] text-ia-text"
              >
                Recomendação da IA
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground/85">
                Aluno demonstra tendência{" "}
                <strong className={cn("font-semibold", "text-ia-text")}>
                  {alerta.tendencia === "subindo"
                    ? "de piora"
                    : alerta.tendencia === "caindo"
                      ? "de recuperação"
                      : "estável"}
                </strong>
                . Considere uma intervenção pedagógica focada nas competências
                fracas listadas acima.
              </p>
            </div>
          </div>
        </section>

        {/* Registrar ação */}
        <section aria-labelledby="acao-titulo">
          <label
            htmlFor="campo-acao"
            id="acao-titulo"
            className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
          >
            Registrar ação pedagógica
          </label>
          <textarea
            id="campo-acao"
            value={acao}
            onChange={(evento) => setAcao(evento.target.value.slice(0, 500))}
            maxLength={500}
            rows={4}
            placeholder="Descreva a ação tomada (ex: reunião com responsáveis agendada para 12/05)..."
            className={cn(
              "mt-2 flex w-full resize-none rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground shadow-xs transition-colors outline-none",
              "placeholder:text-muted-foreground",
              "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
              "dark:bg-input/30",
            )}
            aria-describedby="acao-contador"
          />
          <div className="mt-1 flex items-center justify-between">
            <span
              id="acao-contador"
              className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground tabular-nums"
            >
              {acao.length}/500
            </span>
          </div>
          <Button
            type="button"
            onClick={salvar}
            disabled={salvando || acao.trim().length < 5}
            className="mt-3 w-full"
          >
            {salvando ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Save className="size-3.5" aria-hidden />
            )}
            Salvar ação
          </Button>
        </section>
      </div>
    </>
  );
}
