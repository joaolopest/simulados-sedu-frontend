"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Search,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";

import {
  useAcompanharSimulado,
  type AlunoAcompanhamento,
  type RespostaAcompanhamento,
} from "@/hooks/api/use-gestor";
import { CronometroSimulado } from "@/components/simulado/cronometro-simulado";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  cn,
  formatarMinutosSegundos,
  formatarTempoRelativo,
  gerarIniciais,
} from "@/lib/utils";
import { obterNomeMaterias, obterNomeSerie } from "@/lib/displays";
import type { StatusAlunoSimulado } from "@/types";

// ============================================================
// Filtros e labels
// ============================================================

type FiltroStatus =
  | "todos"
  | "em_andamento"
  | "finalizado"
  | "desconectou"
  | "nao_iniciou";

const FILTROS: { id: FiltroStatus; rotulo: string }[] = [
  { id: "todos", rotulo: "Todos" },
  { id: "em_andamento", rotulo: "Em andamento" },
  { id: "finalizado", rotulo: "Finalizados" },
  { id: "desconectou", rotulo: "Desconectados" },
  { id: "nao_iniciou", rotulo: "Não iniciaram" },
];

const LABEL_STATUS: Record<StatusAlunoSimulado, string> = {
  nao_iniciou: "Não iniciou",
  em_andamento: "Em andamento",
  finalizado: "Finalizado",
  desconectou: "Desconectado",
  tempo_esgotado: "Tempo esgotado",
};

// ============================================================
// Página
// ============================================================

export default function PaginaAcompanharSimulado({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const consulta = useAcompanharSimulado(id);
  const dados = consulta.data;

  const [filtro, setFiltro] = useState<FiltroStatus>("todos");
  const [busca, setBusca] = useState("");

  // Tick a cada segundo pra cronômetro fluído (Date.now() fora do render)
  const [agora, setAgora] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const alunosFiltrados = useMemo(() => {
    if (!dados) return [];
    const termoBusca = busca.trim().toLowerCase();
    return dados.alunos.filter((a) => {
      const passaFiltro =
        filtro === "todos"
          ? true
          : filtro === "desconectou"
            ? !a.conexaoOk || a.status === "desconectou"
            : a.status === filtro;
      const passaBusca = termoBusca
        ? a.nome.toLowerCase().includes(termoBusca)
        : true;
      return passaFiltro && passaBusca;
    });
  }, [dados, filtro, busca]);

  // Calcula tempo decorrido pra cronômetro ao vivo (depende de `agora` pra atualizar)
  const segundosRestantes = useMemo(() => {
    if (!dados) return 0;
    const totalSegundos = dados.tempoLimiteMinutos * 60;
    const liberadoEm = dados.simulado.liberadoEm;
    if (!liberadoEm) return totalSegundos;
    const inicio = new Date(liberadoEm).getTime();
    const decorrido = Math.floor((agora - inicio) / 1000);
    return Math.max(0, totalSegundos - decorrido);
  }, [dados, agora]);

  if (consulta.isLoading) {
    return <Carregando />;
  }

  if (consulta.isError || !dados) {
    return (
      <ErroEstado
        mensagem={
          consulta.isError
            ? "Não foi possível carregar o acompanhamento."
            : "Simulado não encontrado."
        }
      />
    );
  }

  const c = dados.contagens;
  const totalSegundos = dados.tempoLimiteMinutos * 60;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <Link
                href="/gestor/simulados"
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                <ArrowLeft className="size-3" aria-hidden />
                simulados
              </Link>
              <span aria-hidden>·</span>
              <span>acompanhamento ao vivo</span>
            </div>
            <h1
              className="font-serif text-2xl text-foreground md:text-3xl"
            >
              {dados.simulado.parametros.nome}
            </h1>
            <p className="text-sm text-muted-foreground">
              {obterNomeMaterias(dados.simulado.parametros.materias)} ·{" "}
              {obterNomeSerie(dados.simulado.parametros.serie)} ·{" "}
              <span className="font-mono tabular-nums">
                {dados.tempoLimiteMinutos} min
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <CronometroSimulado
              segundosRestantes={segundosRestantes}
              duracaoTotalSegundos={totalSegundos}
            />
            <IndicadorAtualizando ativo={consulta.isFetching} />
          </div>
        </div>
      </header>

      {/* Stats row */}
      <section
        aria-live="polite"
        aria-atomic="false"
        className="border-b border-border bg-card/30"
      >
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-y divide-border px-0 sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">
          <CardStat
            rotulo="Total"
            valor={c.total}
            icone={<Users className="size-4" aria-hidden />}
            cor="muted"
          />
          <CardStat
            rotulo="Não iniciaram"
            valor={c.nao_iniciou}
            icone={<Clock className="size-4" aria-hidden />}
            cor="muted"
          />
          <CardStat
            rotulo="Em andamento"
            valor={c.em_andamento}
            icone={<Activity className="size-4" aria-hidden />}
            cor="primary"
            pulsante={c.em_andamento > 0}
          />
          <CardStat
            rotulo="Finalizados"
            valor={c.finalizado}
            icone={<CheckCircle2 className="size-4" aria-hidden />}
            cor="success"
          />
          <CardStat
            rotulo="Desconectados"
            valor={c.desconectou}
            icone={<WifiOff className="size-4" aria-hidden />}
            cor="warning"
          />
        </div>
      </section>

      {/* Filtros + busca */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <ul
            role="tablist"
            aria-label="Filtrar alunos por status"
            className="flex flex-wrap gap-1.5"
          >
            {FILTROS.map((f) => {
              const ativo = filtro === f.id;
              return (
                <li key={f.id}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={ativo}
                    onClick={() => setFiltro(f.id)}
                    className={cn(
                      "inline-flex h-8 items-center rounded-full border px-4 font-mono text-[11px] uppercase tracking-wider tabular-nums",
                      "transition-colors duration-200",
                      ativo
                        ? "border-primary bg-primary-muted text-primary-text"
                        : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground",
                    )}
                  >
                    {f.rotulo}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="relative w-full lg:w-72">
            <Search
              aria-hidden
              className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome do aluno"
              className="pl-9"
              aria-label="Buscar aluno"
            />
          </div>
        </div>
      </section>

      {/* Grid de alunos */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {alunosFiltrados.length === 0 ? (
          <EstadoVazio busca={busca} filtro={filtro} />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {alunosFiltrados.map((aluno) => (
              <li key={aluno.alunoId}>
                <CardAluno aluno={aluno} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

// ============================================================
// Card stat
// ============================================================

function CardStat({
  rotulo,
  valor,
  icone,
  cor,
  pulsante = false,
}: {
  rotulo: string;
  valor: number;
  icone: React.ReactNode;
  cor: "primary" | "success" | "warning" | "muted";
  pulsante?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 px-6 py-4",
        cor === "primary" && pulsante && "bg-primary-muted/30",
      )}
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-md",
          cor === "primary" && "bg-primary-muted text-primary-text",
          cor === "success" && "bg-success-muted text-success",
          cor === "warning" && "bg-warning-muted text-warning",
          cor === "muted" && "bg-muted text-muted-foreground",
          cor === "primary" && pulsante && "motion-pulse-ambient",
        )}
        aria-hidden
      >
        {icone}
      </div>
      <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {rotulo}
        </p>
        <p
          className={cn(
            "font-mono text-3xl font-semibold tabular-nums leading-tight",
            cor === "primary" && "text-primary-text",
            cor === "success" && "text-success",
            cor === "warning" && "text-warning",
            cor === "muted" && "text-foreground",
          )}
        >
          {valor}
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Card de aluno
// ============================================================

const ESTILOS_STATUS: Record<
  StatusAlunoSimulado,
  { borda: string; texto: string; fundo: string }
> = {
  nao_iniciou: {
    borda: "border-border",
    texto: "text-muted-foreground",
    fundo: "bg-muted",
  },
  em_andamento: {
    borda: "border-primary/40",
    texto: "text-primary-text",
    fundo: "bg-primary-muted",
  },
  finalizado: {
    borda: "border-success/40",
    texto: "text-success",
    fundo: "bg-success-muted",
  },
  desconectou: {
    borda: "border-warning/40",
    texto: "text-warning",
    fundo: "bg-warning-muted",
  },
  tempo_esgotado: {
    borda: "border-destructive/40",
    texto: "text-destructive",
    fundo: "bg-destructive-muted",
  },
};

function CardAluno({ aluno }: { aluno: AlunoAcompanhamento }) {
  const estilo = ESTILOS_STATUS[aluno.status];
  const desconectado = !aluno.conexaoOk || aluno.status === "desconectou";
  const progresso =
    aluno.totalQuestoes > 0
      ? Math.round((aluno.questaoAtualIndice / aluno.totalQuestoes) * 100)
      : 0;

  return (
    <article
      className={cn(
        "group/card flex flex-col gap-3 rounded-xl border bg-card p-4",
        "transition-[transform,box-shadow,border-color] duration-200",
        "[transition-timing-function:var(--ease-quart)]",
        "hover:-translate-y-0.5 hover:shadow-md",
        estilo.borda,
      )}
      data-status={aluno.status}
      aria-label={`${aluno.nome}, ${LABEL_STATUS[aluno.status]}`}
    >
      <header className="flex items-start gap-3">
        <Avatar size="lg">
          {aluno.fotoUrl && (
            <AvatarImage src={aluno.fotoUrl} alt={`Foto de ${aluno.nome}`} />
          )}
          <AvatarFallback>{gerarIniciais(aluno.nome)}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {aluno.nome}
            </h3>
            {desconectado ? (
              <WifiOff
                className="size-3.5 shrink-0 text-warning"
                aria-label="Conexão perdida"
              />
            ) : aluno.status === "em_andamento" ? (
              <Wifi
                className="size-3.5 shrink-0 text-success"
                aria-label="Online"
              />
            ) : null}
          </div>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            atividade {formatarTempoRelativo(aluno.ultimaAtividadeEm)}
          </p>
        </div>

        <span
          className={cn(
            "inline-flex h-6 items-center rounded-full px-2.5 font-mono text-[10px] uppercase tracking-wider",
            estilo.fundo,
            estilo.texto,
          )}
        >
          {LABEL_STATUS[aluno.status]}
        </span>
      </header>

      {/* Progresso */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider tabular-nums text-muted-foreground">
          <span>
            questão {aluno.questaoAtualIndice} de {aluno.totalQuestoes}
          </span>
          <span className={estilo.texto}>{progresso}%</span>
        </div>
        <Progress
          value={progresso}
          className={cn("h-1.5", estilo.fundo)}
          aria-label={`Progresso ${progresso}%`}
        />
      </div>

      {/* Tempo restante */}
      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          tempo restante
        </span>
        <span
          className={cn(
            "font-mono text-sm font-semibold tabular-nums",
            aluno.tempoRestanteSegundos < 60
              ? "text-destructive"
              : aluno.tempoRestanteSegundos < 300
                ? "text-warning"
                : "text-foreground",
          )}
        >
          {formatarMinutosSegundos(aluno.tempoRestanteSegundos)}
        </span>
      </div>
    </article>
  );
}

// ============================================================
// Estados auxiliares
// ============================================================

function IndicadorAtualizando({ ativo }: { ativo: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider",
        ativo ? "text-primary-text" : "text-muted-foreground",
      )}
      aria-live="polite"
    >
      {ativo ? (
        <Loader2 className="size-3 animate-spin" aria-hidden />
      ) : (
        <RefreshCw className="size-3" aria-hidden />
      )}
      {ativo ? "Atualizando…" : "Sincronizado"}
    </span>
  );
}

function Carregando() {
  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

function ErroEstado({ mensagem }: { mensagem: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md space-y-4 text-center">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Erro · acompanhamento
        </p>
        <h1
          className="font-serif text-2xl text-foreground"
        >
          Não rolou de carregar
        </h1>
        <p className="text-sm text-muted-foreground">{mensagem}</p>
        <Button asChild variant="outline">
          <Link href="/gestor/simulados">
            <ArrowLeft className="size-4" aria-hidden />
            Voltar para simulados
          </Link>
        </Button>
      </div>
    </div>
  );
}

function EstadoVazio({
  busca,
  filtro,
}: {
  busca: string;
  filtro: FiltroStatus;
}) {
  const temBusca = busca.trim().length > 0;
  const filtroLabel = FILTROS.find((f) => f.id === filtro)?.rotulo ?? "Todos";
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Users className="size-5" aria-hidden />
      </div>
      <h3
        className="font-serif text-lg text-foreground"
      >
        Nenhum aluno encontrado
      </h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        {temBusca
          ? `Nada bate com "${busca}" no filtro ${filtroLabel}.`
          : `Sem alunos no filtro ${filtroLabel} no momento.`}
      </p>
    </div>
  );
}

// expor pra eventual reuso interno
export type { RespostaAcompanhamento };
