"use client";

import { Activity, AlertTriangle, Building2, FileQuestion, Sparkles } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAdminDashboard, useAdminDiagnostico } from "@/hooks/api/use-admin";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BadgeIA } from "@/components/ia/badge-ia";
import { CardKpi } from "@/components/graficos/card-kpi";
import { EmptyState } from "@/components/ui/empty-state";
import { DataAtualCliente } from "@/components/ui/texto-temporal-cliente";
import { cn, formatarPorcentagem, gerarIniciais } from "@/lib/utils";

interface InsightCurto { id?: string; titulo?: string; texto?: string; }
interface PontoTendencia { semana: string; questoes: number; simulados: number; importacoes: number; }
interface QualidadeAcervo {
  totalQuestoes: number;
  publicadas: number;
  rascunhos: number;
  emRevisao: number;
  arquivadas: number;
  comAlertas: number;
  semRespostas: number;
  taxaMediaAcerto: number;
  principaisAlertas: { codigo: string; total: number }[];
}
interface DiagnosticoOperacional {
  status: string;
  checadoEm: string;
  ambiente: {
    tipoBanco: string;
    dialeto: string;
    hostClassificado: string;
    driver: string;
    python?: string;
    plataforma?: string;
  };
  operacional: {
    banco: { status: string; latenciaMs: number; erro?: string | null };
    schema: {
      tabelasEsperadas: number;
      tabelasEncontradas: number;
      tabelasAusentes: string[];
      ok: boolean;
    };
    atividade: {
      ultimaAuditoriaEm?: string | null;
      ultimaRespostaEm?: string | null;
      ultimaTentativaEm?: string | null;
    };
  };
  pendencias: {
    criticas: { codigo: string; mensagem: string; total?: number }[];
    avisos: { codigo: string; mensagem: string; total?: number }[];
  };
  recomendacoes: string[];
}

export default function PaginaDashboardAdmin() {
  const { data, isLoading, isError, refetch } = useAdminDashboard();
  const { data: diagnostico, isLoading: carregandoDiagnostico } =
    useAdminDiagnostico();

  return (
    <div className="shell-pagina">
      <header>
        <p className="texto-rotulo">
          <DataAtualCliente formato="EEEE',' d 'de' MMMM yyyy" />
        </p>
        <h1 className="titulo-pagina mt-2">Painel administrativo</h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">Saúde da rede SEDU em um relance: acervo, escolas conectadas, atividade semanal e sinais pedagógicos detectados pela IA.</p>
      </header>

      {isError && (
        <div className="mt-8 flex items-start justify-between gap-4 rounded-xl border border-destructive/30 bg-destructive-muted p-5 text-destructive" role="alert">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider">Erro ao carregar dashboard</p>
            <p className="mt-1 text-sm">Não consegui buscar os dados agora. Tenta de novo?</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Tentar de novo</Button>
        </div>
      )}

      <section className="mt-8" aria-labelledby="kpis-titulo">
        <h2 id="kpis-titulo" className="sr-only">Indicadores principais</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading || !data ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />) : (
            <>
              <CardKpi icone={FileQuestion} rotulo="Total de questões" valor={data.kpis.totalQuestoes} tom="primario" delayReveal={0.1} delta={{ valor: Math.abs(data.kpis.deltaQuestoes).toString(), direcao: data.kpis.deltaQuestoes > 0 ? "subindo" : data.kpis.deltaQuestoes < 0 ? "caindo" : "estavel" }} />
              <CardKpi icone={Building2} rotulo="Escolas ativas" valor={data.kpis.totalEscolas} tom="neutro" delayReveal={0.2} delta={{ valor: Math.abs(data.kpis.deltaEscolas).toString(), direcao: data.kpis.deltaEscolas > 0 ? "subindo" : data.kpis.deltaEscolas < 0 ? "caindo" : "estavel" }} />
              <CardKpi icone={Activity} rotulo="Simulados no mês" valor={data.kpis.simuladosNoMes} tom="vivo" delayReveal={0.3} delta={{ valor: Math.abs(data.kpis.deltaSimulados).toString(), direcao: data.kpis.deltaSimulados > 0 ? "subindo" : data.kpis.deltaSimulados < 0 ? "caindo" : "estavel" }} />
              <CardKpi icone={AlertTriangle} rotulo="Alunos em risco" valor={data.kpis.alunosEmRisco} tom={data.kpis.alunosEmRisco > 0 ? "alerta" : "neutro"} delayReveal={0.4} delta={{ valor: Math.abs(data.kpis.deltaRisco).toString(), direcao: data.kpis.deltaRisco > 0 ? "caindo" : data.kpis.deltaRisco < 0 ? "subindo" : "estavel" }} />
            </>
          )}
        </div>
      </section>

      <section className="mt-10" aria-labelledby="tendencia-titulo">
        <header className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="texto-rotulo">Atividade da rede</p>
            <h2 id="tendencia-titulo" className="titulo-secao mt-1">Atividade nas últimas 12 semanas</h2>
          </div>
        </header>
        {isLoading || !data ? <Skeleton className="h-80 w-full rounded-xl" /> : <GraficoTendencia dados={data.tendenciaSemanal} />}
      </section>

      {isLoading || !data ? (
        <Skeleton className="mt-10 h-52 w-full rounded-xl" />
      ) : data.qualidadeAcervo ? (
        <section className="mt-10" aria-labelledby="qualidade-acervo-titulo">
          <header className="mb-4">
            <p className="texto-rotulo">Curadoria pedagógica</p>
            <h2 id="qualidade-acervo-titulo" className="titulo-secao mt-1">
              Qualidade do acervo
            </h2>
          </header>
          <CardQualidadeAcervo qualidade={data.qualidadeAcervo} />
        </section>
      ) : null}

      {carregandoDiagnostico ? (
        <Skeleton className="mt-6 h-36 w-full rounded-xl" />
      ) : diagnostico ? (
        <section className="mt-6" aria-labelledby="diagnostico-operacional-titulo">
          <CardDiagnosticoOperacional diagnostico={diagnostico} />
        </section>
      ) : null}

      <div className="mt-10 grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-2" aria-labelledby="insights-titulo">
          <header className="mb-4">
            <p className="texto-rotulo">Sinais detectados</p>
            <h2 id="insights-titulo" className="titulo-secao mt-1">Insights da IA</h2>
          </header>
          {isLoading || !data ? <Skeleton className="h-72 w-full rounded-xl" /> : <CardInsights insights={(data.insights as InsightCurto[]).slice(0, 3)} />}
        </section>
        <section className="lg:col-span-3" aria-labelledby="top-escolas-titulo">
          <header className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="texto-rotulo">Engajamento por escola</p>
              <h2 id="top-escolas-titulo" className="titulo-secao mt-1">Top 10 escolas</h2>
            </div>
          </header>
          {isLoading || !data ? <div className="space-y-2">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div> : <ListaTopEscolas escolas={data.topEscolas} />}
        </section>
      </div>
    </div>
  );
}

function CardQualidadeAcervo({ qualidade }: { qualidade: QualidadeAcervo }) {
  const status = [
    { rotulo: "Publicadas", valor: qualidade.publicadas, classe: "bg-success" },
    { rotulo: "Rascunhos", valor: qualidade.rascunhos, classe: "bg-muted-foreground" },
    { rotulo: "Em revisão", valor: qualidade.emRevisao, classe: "bg-warning" },
    { rotulo: "Arquivadas", valor: qualidade.arquivadas, classe: "bg-destructive" },
  ];
  const principais = qualidade.principaisAlertas.slice(0, 4);

  return (
    <div className="superficie-card grid gap-5 p-5 lg:grid-cols-[1.2fr_1fr]">
      <div>
        <div className="grid gap-3 sm:grid-cols-3">
          <IndicadorQualidade
            rotulo="Taxa média"
            valor={formatarPorcentagem(qualidade.taxaMediaAcerto * 100)}
            detalhe="acerto no acervo"
          />
          <IndicadorQualidade
            rotulo="Com alerta"
            valor={qualidade.comAlertas.toString()}
            detalhe="pedem curadoria"
            alerta={qualidade.comAlertas > 0}
          />
          <IndicadorQualidade
            rotulo="Sem respostas"
            valor={qualidade.semRespostas.toString()}
            detalhe="sem amostra real"
          />
        </div>
        <div className="mt-5 space-y-2">
          {status.map((item) => {
            const percentual =
              qualidade.totalQuestoes > 0
                ? Math.round((item.valor / qualidade.totalQuestoes) * 100)
                : 0;
            return (
              <div key={item.rotulo}>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">{item.rotulo}</span>
                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                    {item.valor} · {percentual}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full", item.classe)} style={{ width: `${percentual}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="rounded-lg border border-border bg-background/50 p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Principais alertas
        </p>
        {principais.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Nenhum alerta crítico de curadoria na página atual do acervo.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {principais.map((alerta) => (
              <li key={alerta.codigo} className="flex items-center justify-between gap-3 rounded-md bg-muted/50 px-3 py-2">
                <span className="text-sm text-foreground">{rotuloAlertaQuestao(alerta.codigo)}</span>
                <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                  {alerta.total}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function CardDiagnosticoOperacional({
  diagnostico,
}: {
  diagnostico: DiagnosticoOperacional;
}) {
  const totalPendencias =
    diagnostico.pendencias.criticas.length + diagnostico.pendencias.avisos.length;
  const statusOk = diagnostico.status === "ok";

  return (
    <div
      className={cn(
        "superficie-card grid gap-4 p-5 lg:grid-cols-[1fr_1.2fr]",
        !statusOk && "border-warning/40",
      )}
    >
      <div>
        <p className="texto-rotulo">Operação</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h2
            id="diagnostico-operacional-titulo"
            className="titulo-secao"
          >
            Diagnóstico técnico
          </h2>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider",
              statusOk
                ? "bg-success-muted text-success"
                : diagnostico.status === "critico"
                  ? "bg-destructive-muted text-destructive"
                  : "bg-warning-muted text-warning",
            )}
          >
            {diagnostico.status}
          </span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <MiniDiagnostico
            rotulo="Banco"
            valor={diagnostico.operacional.banco.status}
            detalhe={`${diagnostico.operacional.banco.latenciaMs} ms`}
            alerta={diagnostico.operacional.banco.status !== "online"}
          />
          <MiniDiagnostico
            rotulo="Schema"
            valor={diagnostico.operacional.schema.ok ? "ok" : "falha"}
            detalhe={`${diagnostico.operacional.schema.tabelasEncontradas}/${diagnostico.operacional.schema.tabelasEsperadas} tabelas`}
            alerta={!diagnostico.operacional.schema.ok}
          />
          <MiniDiagnostico
            rotulo="Pendências"
            valor={String(totalPendencias)}
            detalhe={`${diagnostico.pendencias.criticas.length} críticas`}
            alerta={totalPendencias > 0}
          />
        </div>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {diagnostico.ambiente.tipoBanco} · {diagnostico.ambiente.dialeto} ·{" "}
          {diagnostico.ambiente.driver}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-background/50 p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Ações recomendadas
        </p>
        {diagnostico.recomendacoes.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Nenhuma recomendação operacional no momento.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {diagnostico.recomendacoes.slice(0, 4).map((recomendacao, i) => (
              <li key={`${recomendacao}-${i}`} className="flex gap-2 text-sm text-muted-foreground">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                <span>{recomendacao}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function MiniDiagnostico({
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
        "rounded-lg border p-3",
        alerta ? "border-warning/40 bg-warning-muted/30" : "border-border bg-background/50",
      )}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {rotulo}
      </p>
      <p className="mt-1 font-serif text-xl tracking-tight text-foreground">
        {valor}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{detalhe}</p>
    </div>
  );
}

function IndicadorQualidade({
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
    <div className={cn("rounded-lg border p-4", alerta ? "border-warning/40 bg-warning-muted/40" : "border-border bg-background/50")}>
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{rotulo}</p>
      <p className="mt-2 font-serif text-2xl tracking-tight">{valor}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detalhe}</p>
    </div>
  );
}

function rotuloAlertaQuestao(codigo: string): string {
  const mapa: Record<string, string> = {
    alternativas_insuficientes: "Alternativas insuficientes",
    gabarito_invalido: "Gabarito inválido",
    nunca_usada: "Nunca usada",
    sem_respostas: "Sem respostas",
    baixa_taxa_acerto: "Baixa taxa de acerto",
    alta_taxa_acerto: "Alta taxa de acerto",
    muitos_brancos: "Muitos brancos",
    tempo_medio_alto: "Tempo médio alto",
    distrator_nunca_escolhido: "Distrator nunca escolhido",
    imagem_url_suspeita: "Imagem suspeita",
  };
  return mapa[codigo] ?? codigo.replaceAll("_", " ");
}

function GraficoTendencia({ dados }: { dados: PontoTendencia[] }) {
  return (
    <div className="superficie-card min-w-0 p-5">
      <div className="h-80 min-h-80 min-w-0 w-full">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={dados} margin={{ top: 8, right: 16, bottom: 8, left: -8 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="semana" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontFamily: "var(--font-mono)", fill: "var(--muted-foreground)" }} />
            <YAxis axisLine={false} tickLine={false} width={40} tick={{ fontSize: 10, fontFamily: "var(--font-mono)", fill: "var(--muted-foreground)" }} />
            <Tooltip cursor={{ stroke: "var(--accent)", strokeWidth: 1 }} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, fontFamily: "var(--font-mono)", padding: "8px 10px" }} labelStyle={{ color: "var(--muted-foreground)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }} itemStyle={{ fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }} />
            <Legend iconType="circle" wrapperStyle={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", paddingTop: 12 }} />
            <Line type="monotone" dataKey="questoes" name="Questões" stroke="var(--chart-1)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="simulados" name="Simulados" stroke="var(--chart-2)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="importacoes" name="Importações" stroke="var(--chart-3)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function CardInsights({ insights }: { insights: InsightCurto[] }) {
  const itens = insights.length > 0 ? insights : [{ titulo: "Sem insights novos", texto: "A IA continua observando padrões de desempenho na rede." }];
  return (
    <div className="rounded-xl border border-ia/20 bg-ia-muted p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-ia/12 text-ia-text" aria-hidden><Sparkles className="size-4" /></div>
          <p className="font-serif text-base tracking-tight text-foreground">Sinais da semana</p>
        </div>
        <BadgeIA tamanho="sm" descricao="Insights gerados pela IA a partir de padrões na rede SEDU." />
      </div>
      <ul className="mt-5 space-y-4">
        {itens.map((insight, i) => (
          <li key={insight.id ?? `insight-${i}`} className="flex gap-3">
            <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-ia" />
            <div className="min-w-0">
              {insight.titulo && <p className="font-serif text-sm tracking-tight text-foreground">{insight.titulo}</p>}
              {insight.texto && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{insight.texto}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface ItemEscola { escola: { id: string; nome: string; municipio: string }; simuladosAplicados: number; totalAlunos: number; taxaParticipacao: number; }

function ListaTopEscolas({ escolas }: { escolas: ItemEscola[] }) {
  if (escolas.length === 0) return <EmptyState icone={Building2} titulo="Sem atividade" descricao="Nenhuma escola com atividade registrada." variante="compacto" />;
  return (
    <ol className="superficie-card overflow-hidden">
      {escolas.map((item, i) => (
        <li key={item.escola.id} className={cn("group flex items-center gap-4 px-4 py-3 transition-colors duration-200 [transition-timing-function:var(--ease-quart)] hover:bg-accent/40", i > 0 && "border-t border-border")}>
          <span className="w-5 shrink-0 text-right font-mono text-[10px] uppercase tracking-wider tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
          <Avatar className="size-9 shrink-0"><AvatarFallback className="bg-primary-muted font-mono text-[10px] uppercase tracking-wider text-primary-text">{gerarIniciais(item.escola.nome)}</AvatarFallback></Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{item.escola.nome}</p>
            <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{item.escola.municipio}</p>
          </div>
          <div className="hidden w-40 shrink-0 sm:block">
            <div className="h-1 w-full overflow-hidden rounded-full bg-muted/60" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(item.taxaParticipacao * 100)} aria-label={`Taxa de participação: ${formatarPorcentagem(item.taxaParticipacao * 100)}`}>
              <div className="h-full bg-primary transition-all duration-700 [transition-timing-function:var(--ease-quart)]" style={{ width: `${Math.round(item.taxaParticipacao * 100)}%` }} />
            </div>
            <p className="mt-1 text-right font-mono text-[9px] uppercase tracking-wider tabular-nums text-muted-foreground">{formatarPorcentagem(item.taxaParticipacao * 100)} participação</p>
          </div>
          <span className="inline-flex shrink-0 items-center rounded-md bg-muted px-2 py-1 font-mono text-[10px] uppercase tracking-wider tabular-nums text-muted-foreground">{item.simuladosAplicados} sim</span>
        </li>
      ))}
    </ol>
  );
}
