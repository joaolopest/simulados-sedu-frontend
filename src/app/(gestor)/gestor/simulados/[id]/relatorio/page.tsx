"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpDown,
  Award,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Sparkles,
  Target,
  TrendingDown,
  type LucideIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import jsPDF from "jspdf";
import Papa from "papaparse";
import { toast } from "sonner";

import { useRelatorioSimulado } from "@/hooks/api/use-gestor";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BannerInsightIA } from "@/components/ia/banner-insight-ia";
import {
  cn,
  formatarDataBR,
  formatarMinutosSegundos,
  formatarNota,
  formatarPorcentagem,
  gerarIniciais,
} from "@/lib/utils";
import {
  obterNomeAdaptacao,
  obterNomeMaterias,
  obterNomeSerie,
} from "@/lib/displays";
import type { AdaptacaoCognitiva } from "@/types";

// ============================================================
// Tipos locais
// ============================================================

type OrdemTabela = "nota_desc" | "nota_asc" | "nome_asc" | "nome_desc";

interface AlunoTabelaItem {
  alunoId: string;
  alunoNome: string;
  fotoUrl?: string;
  adaptacoes: AdaptacaoCognitiva[];
  notaFinal: number;
  acertos: number;
  erros: number;
  emBranco: number;
  tempoTotalSegundos: number;
  emRisco: boolean;
}

interface SugestaoItem {
  competencia?: string;
  conteudo?: string;
  descricao?: string;
  tipoMaterial?: string;
}

// ============================================================
// Página
// ============================================================

export default function PaginaRelatorioSimulado({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading, isError, refetch } = useRelatorioSimulado(id);
  const [ordem, setOrdem] = useState<OrdemTabela>("nota_desc");

  // ----------------------------------------------
  // Derivações
  // ----------------------------------------------

  const tabelaOrdenada = useMemo<AlunoTabelaItem[]>(() => {
    if (!data?.tabela) return [];
    const copia = [...data.tabela];
    switch (ordem) {
      case "nota_asc":
        return copia.sort((a, b) => a.notaFinal - b.notaFinal);
      case "nota_desc":
        return copia.sort((a, b) => b.notaFinal - a.notaFinal);
      case "nome_asc":
        return copia.sort((a, b) =>
          a.alunoNome.localeCompare(b.alunoNome, "pt-BR"),
        );
      case "nome_desc":
        return copia.sort((a, b) =>
          b.alunoNome.localeCompare(a.alunoNome, "pt-BR"),
        );
    }
  }, [data, ordem]);

  const dadosGrafico = useMemo(() => {
    if (!data?.competencias) return [];
    return data.competencias.map((competencia) => {
      const taxaAcerto = competencia.taxaAcerto * 100;
      const mediaEstadual = competencia.mediaEstadual * 100;
      const diferenca = taxaAcerto - mediaEstadual;
      let tom: "acima" | "abaixo" | "igual";
      if (Math.abs(diferenca) <= 5) tom = "igual";
      else if (diferenca > 0) tom = "acima";
      else tom = "abaixo";
      return {
        competencia: competencia.competencia,
        taxaAcerto,
        mediaEstadual,
        tom,
        totalQuestoes: competencia.totalQuestoes,
      };
    });
  }, [data]);

  const bulletsDiagnostico = useMemo(() => {
    if (!data?.diagnostico) return [];
    const { resumoExecutivo, pontosFortes, pontosAtencao, recomendacoesPedagogicas } =
      data.diagnostico;
    const bullets: string[] = [];
    if (resumoExecutivo) bullets.push(resumoExecutivo);
    if (pontosFortes[0]) bullets.push(`Ponto forte: ${pontosFortes[0]}`);
    if (pontosAtencao[0]) bullets.push(`Atenção: ${pontosAtencao[0]}`);
    if (recomendacoesPedagogicas[0])
      bullets.push(`Recomendação: ${recomendacoesPedagogicas[0]}`);
    return bullets.slice(0, 4);
  }, [data]);

  // ----------------------------------------------
  // Exportações
  // ----------------------------------------------

  function exportarCsv(): void {
    if (!data) return;
    try {
      const linhas = data.tabela.map((linha) => ({
        aluno: linha.alunoNome,
        nota_final: formatarNota(linha.notaFinal),
        acertos: linha.acertos,
        erros: linha.erros,
        em_branco: linha.emBranco,
        tempo_total_segundos: linha.tempoTotalSegundos,
        em_risco: linha.emRisco ? "sim" : "nao",
      }));
      const csv = Papa.unparse(linhas, { delimiter: ";" });
      const nomeArquivo = `relatorio-${data.simulado.parametros.nome
        .toLowerCase()
        .replace(/\s+/g, "-")}.csv`;
      const blob = new Blob([`﻿${csv}`], {
        type: "text/csv;charset=utf-8;",
      });
      baixarBlob(blob, nomeArquivo);
      toast.success("CSV exportado.");
    } catch {
      toast.error("Falha ao exportar CSV.");
    }
  }

  function exportarPdf(): void {
    if (!data) return;
    try {
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const margem = 40;
      let y = margem;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.text(`Relatório · ${data.simulado.parametros.nome}`, margem, y);
      y += 22;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(
        `${obterNomeMaterias(data.simulado.parametros.materias)} · ${obterNomeSerie(data.simulado.parametros.serie)}`,
        margem,
        y,
      );
      y += 24;

      pdf.setFontSize(11);
      pdf.text(`Média geral: ${formatarNota(data.panorama.media)}`, margem, y);
      y += 14;
      pdf.text(`Maior nota: ${formatarNota(data.panorama.maior)}`, margem, y);
      y += 14;
      pdf.text(`Menor nota: ${formatarNota(data.panorama.menor)}`, margem, y);
      y += 14;
      pdf.text(
        `Taxa de conclusão: ${formatarPorcentagem(data.panorama.taxaConclusao * 100)}`,
        margem,
        y,
      );
      y += 24;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text("Alunos", margem, y);
      y += 16;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text("Nome", margem, y);
      pdf.text("Nota", margem + 240, y);
      pdf.text("Acertos", margem + 290, y);
      pdf.text("Erros", margem + 350, y);
      pdf.text("Branco", margem + 400, y);
      pdf.text("Tempo", margem + 460, y);
      y += 12;

      const limitePagina = pdf.internal.pageSize.getHeight() - margem;
      for (const linha of data.tabela) {
        if (y > limitePagina) {
          pdf.addPage();
          y = margem;
        }
        const nome =
          linha.alunoNome.length > 32
            ? `${linha.alunoNome.slice(0, 31)}…`
            : linha.alunoNome;
        pdf.text(nome, margem, y);
        pdf.text(formatarNota(linha.notaFinal), margem + 240, y);
        pdf.text(String(linha.acertos), margem + 290, y);
        pdf.text(String(linha.erros), margem + 350, y);
        pdf.text(String(linha.emBranco), margem + 400, y);
        pdf.text(formatarMinutosSegundos(linha.tempoTotalSegundos), margem + 460, y);
        y += 12;
      }

      const nomeArquivo = `relatorio-${data.simulado.parametros.nome
        .toLowerCase()
        .replace(/\s+/g, "-")}.pdf`;
      pdf.save(nomeArquivo);
      toast.success("PDF exportado.");
    } catch {
      toast.error("Falha ao exportar PDF.");
    }
  }

  // ----------------------------------------------
  // Estados de carregamento / erro
  // ----------------------------------------------

  if (isLoading || !data) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-10">
        {isError ? (
          <CardErroRelatorio onRetry={() => refetch()} />
        ) : (
          <div className="space-y-6">
            <Skeleton className="h-12 w-2/3" />
            <div className="grid gap-3 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-44 rounded-xl" />
            <Skeleton className="h-80 rounded-xl" />
            <Skeleton className="h-96 rounded-xl" />
          </div>
        )}
      </div>
    );
  }

  const { simulado, panorama, diagnostico, sugestoes } = data;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-10">
      {/* Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" asChild className="mt-1">
            <Link href="/gestor/simulados" aria-label="Voltar para lista de simulados">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Relatório do simulado
            </p>
            <h1
              className="mt-2 font-serif text-3xl tracking-tight md:text-4xl"
            >
              {simulado.parametros.nome}
            </h1>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground tabular-nums">
              {obterNomeMaterias(simulado.parametros.materias)}
              <span aria-hidden className="mx-2">·</span>
              {obterNomeSerie(simulado.parametros.serie)}
              <span aria-hidden className="mx-2">·</span>
              {panorama.totalRespostas} respostas
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2" role="group" aria-label="Exportar relatório">
          <Button variant="outline" size="sm" onClick={exportarPdf}>
            <FileText className="size-3.5" aria-hidden />
            Exportar PDF
          </Button>
          <Button variant="outline" size="sm" onClick={exportarCsv}>
            <FileSpreadsheet className="size-3.5" aria-hidden />
            Exportar CSV
          </Button>
        </div>
      </header>

      {/* Panorama: 4 cards */}
      <section
        className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
        aria-labelledby="panorama-titulo"
        role="region"
      >
        <h2 id="panorama-titulo" className="sr-only">
          Panorama do simulado
        </h2>
        <CardPanorama
          icone={Target}
          rotulo="Média geral"
          valor={formatarNota(panorama.media)}
          tom="primario"
        />
        <CardPanorama
          icone={Award}
          rotulo="Maior nota"
          valor={formatarNota(panorama.maior)}
          tom="success"
        />
        <CardPanorama
          icone={TrendingDown}
          rotulo="Menor nota"
          valor={formatarNota(panorama.menor)}
          tom="destructive"
        />
        <CardPanorama
          icone={CheckCircle2}
          rotulo="Taxa de conclusão"
          valor={formatarPorcentagem(panorama.taxaConclusao * 100)}
          tom="neutro"
        />
      </section>

      {/* Insight IA */}
      <section className="mt-10" aria-labelledby="insight-titulo">
        <h2 id="insight-titulo" className="sr-only">
          Diagnóstico pedagógico
        </h2>
        <BannerInsightIA
          titulo="Diagnóstico pedagógico"
          bullets={bulletsDiagnostico}
          modeloUsado={diagnostico.modeloUsado}
          geradoEm={formatarDataBR(diagnostico.geradoEm, "dd/MM/yyyy · HH:mm")}
        />
      </section>

      {/* Gráfico de competências */}
      <section className="mt-10" aria-labelledby="competencias-titulo" role="region">
        <header className="mb-4">
          <h2
            id="competencias-titulo"
            className="font-serif text-xl tracking-tight md:text-2xl"
          >
            Taxa de acerto por competência
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Comparativo entre o desempenho da turma e a média estadual de referência.
          </p>
        </header>
        <GraficoCompetencias dados={dadosGrafico} />
      </section>

      {/* Tabela de alunos */}
      <section className="mt-10" aria-labelledby="alunos-titulo" role="region">
        <header className="mb-4 flex items-center justify-between gap-4">
          <h2
            id="alunos-titulo"
            className="font-serif text-xl tracking-tight md:text-2xl"
          >
            Alunos
          </h2>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground tabular-nums">
            {tabelaOrdenada.length} {tabelaOrdenada.length === 1 ? "aluno" : "alunos"}
          </p>
        </header>
        <TabelaAlunos
          alunos={tabelaOrdenada}
          ordem={ordem}
          onAlternarOrdem={(novaOrdem) => setOrdem(novaOrdem)}
        />
      </section>

      {/* Sugestões IA */}
      {sugestoes.length > 0 && (
        <section className="mt-10" aria-labelledby="sugestoes-titulo" role="region">
          <CardSugestoes sugestoes={sugestoes as SugestaoItem[]} />
        </section>
      )}
    </div>
  );
}

// ============================================================
// Card de panorama
// ============================================================

interface CardPanoramaProps {
  icone: LucideIcon;
  rotulo: string;
  valor: string;
  tom: "primario" | "success" | "destructive" | "neutro";
}

function CardPanorama({ icone: Icone, rotulo, valor, tom }: CardPanoramaProps) {
  const tons = {
    primario: {
      borda: "border-primary/20",
      iconeBg: "bg-primary-muted text-primary-text",
      cardBg: "bg-card",
    },
    success: {
      borda: "border-success/20",
      iconeBg: "bg-success-muted text-success",
      cardBg: "bg-success-muted/40",
    },
    destructive: {
      borda: "border-destructive/20",
      iconeBg: "bg-destructive-muted text-destructive",
      cardBg: "bg-destructive-muted/40",
    },
    neutro: {
      borda: "border-border",
      iconeBg: "bg-muted text-muted-foreground",
      cardBg: "bg-card",
    },
  }[tom];

  return (
    <article
      className={cn(
        "rounded-xl border p-5 transition-all duration-200 [transition-timing-function:var(--ease-quart)] hover:-translate-y-0.5",
        tons.borda,
        tons.cardBg,
      )}
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-md",
          tons.iconeBg,
        )}
        aria-hidden
      >
        <Icone className="size-4" />
      </div>
      <p
        className="mt-4 font-serif text-3xl leading-none tabular-nums md:text-4xl"
      >
        {valor}
      </p>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {rotulo}
      </p>
    </article>
  );
}

// ============================================================
// Gráfico de competências (barras horizontais)
// ============================================================

interface DadoGrafico {
  competencia: string;
  taxaAcerto: number;
  mediaEstadual: number;
  tom: "acima" | "abaixo" | "igual";
  totalQuestoes: number;
}

const COR_TOM: Record<DadoGrafico["tom"], string> = {
  acima: "var(--success)",
  abaixo: "var(--destructive)",
  igual: "var(--warning)",
};

function GraficoCompetencias({ dados }: { dados: DadoGrafico[] }) {
  if (dados.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-border bg-card text-center text-sm text-muted-foreground">
        Nenhuma competência avaliada neste simulado.
      </div>
    );
  }

  const altura = Math.max(260, dados.length * 56);
  const mediaEstadualAgregada =
    dados.reduce((acumulador, d) => acumulador + d.mediaEstadual, 0) / dados.length;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div style={{ width: "100%", height: altura }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={dados}
            layout="vertical"
            margin={{ top: 8, right: 32, bottom: 8, left: 8 }}
            barSize={20}
          >
            <XAxis
              type="number"
              domain={[0, 100]}
              axisLine={false}
              tickLine={false}
              tickFormatter={(valor: number) => `${valor}%`}
              tick={{
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                fill: "var(--muted-foreground)",
              }}
            />
            <YAxis
              type="category"
              dataKey="competencia"
              axisLine={false}
              tickLine={false}
              width={160}
              tick={{
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                fill: "var(--foreground)",
              }}
            />
            <ReferenceLine
              x={mediaEstadualAgregada}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 4"
              strokeOpacity={0.6}
              label={{
                value: "média estadual",
                position: "insideTopRight",
                fill: "var(--muted-foreground)",
                fontSize: 9,
                fontFamily: "var(--font-mono)",
              }}
            />
            <RechartsTooltip
              cursor={{ fill: "var(--accent)", opacity: 0.4 }}
              content={<TooltipCompetencia />}
            />
            <Bar dataKey="taxaAcerto" radius={[0, 4, 4, 0]}>
              {dados.map((entrada, indice) => (
                <Cell key={indice} fill={COR_TOM[entrada.tom]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-sm bg-success" />
          Acima da média estadual
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-sm bg-warning" />
          Próximo (±5%)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-sm bg-destructive" />
          Abaixo da média
        </span>
      </div>
    </div>
  );
}

interface TooltipPayloadItem {
  payload: DadoGrafico;
}

function TooltipCompetencia({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const dado = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-card p-3 font-mono text-[11px] tabular-nums shadow-md">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {dado.competencia}
      </p>
      <p className="mt-2 flex items-center justify-between gap-4 text-foreground">
        <span>Turma</span>
        <span className="font-semibold">{formatarPorcentagem(dado.taxaAcerto)}</span>
      </p>
      <p className="mt-1 flex items-center justify-between gap-4 text-muted-foreground">
        <span>Média estadual</span>
        <span>{formatarPorcentagem(dado.mediaEstadual)}</span>
      </p>
      <p className="mt-1 flex items-center justify-between gap-4 text-muted-foreground">
        <span>Questões</span>
        <span>{dado.totalQuestoes}</span>
      </p>
    </div>
  );
}

// ============================================================
// Tabela de alunos
// ============================================================

function classeNota(nota: number): string {
  if (nota >= 7) return "text-success";
  if (nota >= 5) return "text-warning";
  return "text-destructive";
}

function TabelaAlunos({
  alunos,
  ordem,
  onAlternarOrdem,
}: {
  alunos: AlunoTabelaItem[];
  ordem: OrdemTabela;
  onAlternarOrdem: (novaOrdem: OrdemTabela) => void;
}) {
  if (alunos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Ninguém respondeu este simulado ainda.
      </div>
    );
  }

  function alternarNota(): void {
    onAlternarOrdem(ordem === "nota_desc" ? "nota_asc" : "nota_desc");
  }

  function alternarNome(): void {
    onAlternarOrdem(ordem === "nome_asc" ? "nome_desc" : "nome_asc");
  }

  return (
    <>
      {/* Tabela desktop */}
      <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="px-4">
                <button
                  type="button"
                  onClick={alternarNome}
                  className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                >
                  Aluno
                  <ArrowUpDown className="size-3" aria-hidden />
                </button>
              </TableHead>
              <TableHead className="text-right">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Acertos
                </span>
              </TableHead>
              <TableHead className="text-right">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Erros
                </span>
              </TableHead>
              <TableHead className="text-right">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Branco
                </span>
              </TableHead>
              <TableHead className="text-right">
                <button
                  type="button"
                  onClick={alternarNota}
                  className="ml-auto inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                >
                  Nota
                  <ArrowUpDown className="size-3" aria-hidden />
                </button>
              </TableHead>
              <TableHead className="text-right">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Tempo
                </span>
              </TableHead>
              <TableHead className="w-10 px-4 text-center">
                <span className="sr-only">Risco</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alunos.map((aluno) => (
              <TableRow
                key={aluno.alunoId}
                className="transition-colors duration-150"
              >
                <TableCell className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9 shrink-0">
                      <AvatarImage src={aluno.fotoUrl} alt={aluno.alunoNome} />
                      <AvatarFallback className="bg-primary-muted font-mono text-[10px] uppercase text-primary-text">
                        {gerarIniciais(aluno.alunoNome)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {aluno.alunoNome}
                      </p>
                      {aluno.adaptacoes.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {aluno.adaptacoes.slice(0, 3).map((a) => (
                            <span
                              key={a}
                              className="inline-flex items-center rounded-full bg-warning-muted px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-warning"
                            >
                              {obterNomeAdaptacao(a)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums">
                  {aluno.acertos}
                </TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums">
                  {aluno.erros}
                </TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums text-muted-foreground">
                  {aluno.emBranco}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-serif text-base tabular-nums",
                    classeNota(aluno.notaFinal),
                  )}
                >
                  {formatarNota(aluno.notaFinal)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums text-muted-foreground">
                  {formatarMinutosSegundos(aluno.tempoTotalSegundos)}
                </TableCell>
                <TableCell className="px-4 text-center">
                  {aluno.emRisco && (
                    <span
                      aria-label="Aluno em risco"
                      className="inline-flex size-6 items-center justify-center rounded-full bg-destructive-muted text-destructive"
                    >
                      <TrendingDown className="size-3" aria-hidden />
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Lista mobile */}
      <ul className="space-y-2 md:hidden">
        {alunos.map((aluno) => (
          <li
            key={aluno.alunoId}
            className={cn(
              "rounded-lg border bg-card p-4",
              aluno.emRisco ? "border-destructive/30" : "border-border",
            )}
          >
            <div className="flex items-start gap-3">
              <Avatar className="size-9 shrink-0">
                <AvatarImage src={aluno.fotoUrl} alt={aluno.alunoNome} />
                <AvatarFallback className="bg-primary-muted font-mono text-[10px] uppercase text-primary-text">
                  {gerarIniciais(aluno.alunoNome)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-foreground">
                    {aluno.alunoNome}
                  </p>
                  <span
                    className={cn(
                      "shrink-0 font-serif text-lg tabular-nums",
                      classeNota(aluno.notaFinal),
                    )}
                  >
                    {formatarNota(aluno.notaFinal)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground tabular-nums">
                  <span>{aluno.acertos} ac.</span>
                  <span>{aluno.erros} er.</span>
                  <span>{aluno.emBranco} br.</span>
                  <span>{formatarMinutosSegundos(aluno.tempoTotalSegundos)}</span>
                </div>
                {aluno.adaptacoes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {aluno.adaptacoes.slice(0, 3).map((a) => (
                      <span
                        key={a}
                        className="inline-flex items-center rounded-full bg-warning-muted px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-warning"
                      >
                        {obterNomeAdaptacao(a)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

// ============================================================
// Card de sugestões (IA)
// ============================================================

function CardSugestoes({ sugestoes }: { sugestoes: SugestaoItem[] }) {
  return (
    <article className="rounded-xl border border-ia/20 bg-ia-muted p-6 md:p-8">
      <header className="flex items-center gap-3">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-ia/12 text-ia-text"
          aria-hidden
        >
          <Sparkles className="size-4" />
        </div>
        <div>
          <h2
            id="sugestoes-titulo"
            className="font-serif text-xl tracking-tight text-foreground md:text-2xl"
          >
            Sugestões de reforço
          </h2>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Geradas pela IA com base no diagnóstico desta turma
          </p>
        </div>
      </header>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {sugestoes.slice(0, 4).map((sugestao, indice) => (
          <article
            key={indice}
            className="rounded-lg border border-ia/15 bg-card p-4 transition-colors duration-200 hover:border-ia/30"
          >
            <div className="flex items-start gap-2">
              <span
                className="mt-1 inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-ia/10 font-mono text-[10px] tabular-nums text-ia-text"
                aria-hidden
              >
                {String(indice + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-wider text-ia-text">
                  {sugestao.competencia ?? sugestao.tipoMaterial ?? "Reforço"}
                </p>
                <p className="mt-1.5 text-sm font-medium leading-snug text-foreground">
                  {sugestao.conteudo ?? "Conteúdo sugerido"}
                </p>
                {sugestao.descricao && (
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {sugestao.descricao}
                  </p>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </article>
  );
}

// ============================================================
// Erro
// ============================================================

function CardErroRelatorio({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      className="flex items-start justify-between gap-4 rounded-xl border border-destructive/30 bg-destructive-muted p-5 text-destructive"
      role="alert"
    >
      <div>
        <p className="font-mono text-[10px] uppercase tracking-wider">
          Erro ao carregar relatório
        </p>
        <p className="mt-1 text-sm">
          Não consegui buscar os dados agora. Tenta de novo?
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Tentar de novo
      </Button>
    </div>
  );
}

// ============================================================
// Helpers de exportação
// ============================================================

function baixarBlob(blob: Blob, nomeArquivo: string): void {
  const url = URL.createObjectURL(blob);
  const ancora = document.createElement("a");
  ancora.href = url;
  ancora.download = nomeArquivo;
  document.body.appendChild(ancora);
  ancora.click();
  document.body.removeChild(ancora);
  URL.revokeObjectURL(url);
}

