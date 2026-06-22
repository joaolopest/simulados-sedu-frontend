"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Calendar,
  GraduationCap,
  ListChecks,
  Search,
  ShieldAlert,
  Users,
} from "lucide-react";

import { useGestorTurmas, type TurmaEnriquecida } from "@/hooks/api/use-gestor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { obterNomeSerie } from "@/lib/displays";
import type { Turma } from "@/types";

type TurnoFiltro = "todos" | Turma["turno"];

const ROTULOS_TURNO: Record<Turma["turno"], string> = {
  matutino: "Matutino",
  vespertino: "Vespertino",
  noturno: "Noturno",
  integral: "Integral",
};

const ABAS: { valor: TurnoFiltro; rotulo: string }[] = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "matutino", rotulo: "Matutino" },
  { valor: "vespertino", rotulo: "Vespertino" },
  { valor: "noturno", rotulo: "Noturno" },
  { valor: "integral", rotulo: "Integral" },
];

export default function PaginaGestorTurmas() {
  const { data, isLoading, isError, refetch } = useGestorTurmas();
  const [busca, setBusca] = useState<string>("");
  const [turno, setTurno] = useState<TurnoFiltro>("todos");
  const [turmaSelecionada, setTurmaSelecionada] =
    useState<TurmaEnriquecida | null>(null);

  const turmasFiltradas = useMemo(() => {
    if (!data) return [];
    const buscaNormalizada = busca.trim().toLowerCase();
    return data.filter((turma) => {
      const passaTurno = turno === "todos" || turma.turno === turno;
      const passaBusca =
        buscaNormalizada.length === 0 ||
        turma.nome.toLowerCase().includes(buscaNormalizada);
      return passaTurno && passaBusca;
    });
  }, [data, busca, turno]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-10">
      {/* Header */}
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Painel do gestor
        </p>
        <h1
          className="mt-2 font-serif text-3xl tracking-tight md:text-4xl"
        >
          Turmas
        </h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          Visão geral das turmas da escola, alunos matriculados e adaptações
          cognitivas registradas.
        </p>
      </header>

      {/* Filtros */}
      <section
        className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
        role="region"
        aria-label="Filtros de turmas"
      >
        <div className="relative w-full md:max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Buscar turma pelo nome..."
            aria-label="Buscar turma"
            className="pl-9"
          />
        </div>
        <Tabs
          value={turno}
          onValueChange={(novoValor) => setTurno(novoValor as TurnoFiltro)}
        >
          <TabsList>
            {ABAS.map((aba) => (
              <TabsTrigger key={aba.valor} value={aba.valor}>
                {aba.rotulo}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </section>

      {/* Erro */}
      {isError && (
        <div
          className="mt-8 flex items-start justify-between gap-4 rounded-xl border border-destructive/30 bg-destructive-muted p-5 text-destructive"
          role="alert"
        >
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider">
              Erro ao carregar turmas
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

      {/* Grid */}
      <section
        className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
        role="region"
        aria-label="Lista de turmas"
        aria-busy={isLoading}
      >
        {isLoading || !data ? (
          Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))
        ) : turmasFiltradas.length === 0 ? (
          <EstadoVazio busca={busca} turno={turno} />
        ) : (
          turmasFiltradas.map((turma) => (
            <CardTurma
              key={turma.id}
              turma={turma}
              aoSelecionar={() => setTurmaSelecionada(turma)}
            />
          ))
        )}
      </section>

      <PainelDetalheTurma
        turma={turmaSelecionada}
        aberto={Boolean(turmaSelecionada)}
        aoFechar={() => setTurmaSelecionada(null)}
      />
    </div>
  );
}

// ============================================================
// Card de turma
// ============================================================

function CardTurma({
  turma,
  aoSelecionar,
}: {
  turma: TurmaEnriquecida;
  aoSelecionar: () => void;
}) {
  const ehAtiva = turma.ativa;

  return (
    <button
      type="button"
      onClick={aoSelecionar}
      aria-label={`Detalhes da turma ${turma.nome}`}
      className={cn(
        "group block rounded-xl border bg-card p-5 text-left",
        "transition-all duration-200 [transition-timing-function:var(--ease-quart)]",
        "hover:-translate-y-0.5 hover:border-primary/30 hover:ring-2 hover:ring-primary/15",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        ehAtiva ? "border-border" : "border-border opacity-70",
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {obterNomeSerie(turma.serie)}
          </p>
          <h2
            className="mt-1.5 truncate font-serif text-xl tracking-tight"
          >
            {turma.nome}
          </h2>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider",
            ehAtiva
              ? "bg-success-muted text-success"
              : "bg-muted text-muted-foreground",
          )}
        >
          {ehAtiva ? "ativa" : "inativa"}
        </span>
      </header>

      <dl className="mt-5 grid grid-cols-2 gap-3">
        <ItemEstatistica
          icone={Users}
          rotulo="Alunos"
          valor={turma.totalAlunos.toString()}
        />
        <ItemEstatistica
          icone={GraduationCap}
          rotulo="Adaptações"
          valor={turma.totalComAdaptacao.toString()}
          tom={turma.totalComAdaptacao > 0 ? "warning" : "neutro"}
        />
      </dl>

      <footer className="mt-5 flex items-center justify-between border-t border-border pt-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground tabular-nums">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <Calendar className="size-3" aria-hidden />
            {turma.anoLetivo}
          </span>
          <span aria-hidden>·</span>
          <span>{ROTULOS_TURNO[turma.turno]}</span>
        </div>
        <span
          className="inline-flex items-center gap-0.5 text-primary-text opacity-80 transition-opacity duration-200 group-hover:opacity-100"
          aria-hidden
        >
          detalhes
          <ArrowRight className="size-3 transition-transform duration-200 group-hover:translate-x-0.5" />
        </span>
      </footer>
    </button>
  );
}

function PainelDetalheTurma({
  turma,
  aberto,
  aoFechar,
}: {
  turma: TurmaEnriquecida | null;
  aberto: boolean;
  aoFechar: () => void;
}) {
  if (!turma) return null;

  const alunos = turma.alunos ?? [];
  const alunosOcultos = Math.max(0, turma.totalAlunos - alunos.length);

  return (
    <Sheet open={aberto} onOpenChange={(novoAberto) => !novoAberto && aoFechar()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {turma.escolaNome || "Escola"} · {obterNomeSerie(turma.serie)}
          </p>
          <SheetTitle className="font-serif text-2xl tracking-tight">
            {turma.nome}
          </SheetTitle>
          <SheetDescription>
            {ROTULOS_TURNO[turma.turno]} · {turma.anoLetivo} ·{" "}
            {turma.totalAlunos} alunos
          </SheetDescription>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-4">
          <ResumoDetalhe icone={Users} rotulo="Alunos" valor={turma.totalAlunos} />
          <ResumoDetalhe
            icone={ShieldAlert}
            rotulo="Adaptações"
            valor={turma.totalComAdaptacao}
          />
          <ResumoDetalhe
            icone={BookOpenCheck}
            rotulo="Provas"
            valor={turma.totalSimulados}
          />
          <ResumoDetalhe
            icone={BarChart3}
            rotulo="Finalizadas"
            valor={turma.simuladosFinalizados}
          />
        </div>

        <section className="px-4" aria-labelledby="acoes-turma">
          <h3
            id="acoes-turma"
            className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
          >
            Ações rápidas
          </h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Button asChild>
              <Link href={`/gestor/turmas/${turma.id}`} className="gap-2">
                <ArrowRight className="size-4" aria-hidden />
                Detalhes completos
              </Link>
            </Button>
            <Button asChild>
              <Link href="/gestor/simulados/novo" className="gap-2">
                <BookOpenCheck className="size-4" aria-hidden />
                Criar prova
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/gestor/simulados" className="gap-2">
                <ListChecks className="size-4" aria-hidden />
                Simulados
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/gestor/alertas" className="gap-2">
                <ShieldAlert className="size-4" aria-hidden />
                Alertas
              </Link>
            </Button>
          </div>
        </section>

        <section className="px-4 pb-6" aria-labelledby="alunos-turma">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h3
                id="alunos-turma"
                className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
              >
                Alunos vinculados
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Primeiros registros carregados do banco.
              </p>
            </div>
            {turma.simuladosLiberados > 0 && (
              <span className="rounded-full bg-primary-muted px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-primary-text">
                {turma.simuladosLiberados} liberado(s)
              </span>
            )}
          </div>

          {alunos.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
              Nenhum aluno encontrado para esta turma.
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
              {alunos.map((aluno) => (
                <li
                  key={aluno.id}
                  className="flex items-center justify-between gap-3 px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {aluno.nome}
                    </p>
                    <p className="truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {aluno.email}
                    </p>
                  </div>
                  {aluno.necessitaSuporte && (
                    <span className="shrink-0 rounded-full bg-warning-muted px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-warning">
                      suporte
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {alunosOcultos > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Mais {alunosOcultos} aluno(s) nesta turma.
            </p>
          )}
        </section>
      </SheetContent>
    </Sheet>
  );
}

function ResumoDetalhe({
  icone: Icone,
  rotulo,
  valor,
}: {
  icone: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  rotulo: string;
  valor: number;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <Icone className="size-4 text-primary-text" aria-hidden />
      <p className="mt-3 font-serif text-2xl leading-none tabular-nums">
        {valor}
      </p>
      <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        {rotulo}
      </p>
    </div>
  );
}

// ============================================================
// Item estatística
// ============================================================

interface ItemEstatisticaProps {
  icone: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  rotulo: string;
  valor: string;
  tom?: "neutro" | "warning";
}

function ItemEstatistica({
  icone: Icone,
  rotulo,
  valor,
  tom = "neutro",
}: ItemEstatisticaProps) {
  const tomClasses = {
    neutro: {
      iconeBg: "bg-muted text-muted-foreground",
      texto: "text-foreground",
    },
    warning: {
      iconeBg: "bg-warning-muted text-warning",
      texto: "text-warning",
    },
  }[tom];

  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-md",
          tomClasses.iconeBg,
        )}
        aria-hidden
      >
        <Icone className="size-3.5" aria-hidden />
      </div>
      <div className="min-w-0">
        <dd
          className={cn(
            "font-serif text-lg leading-none tabular-nums",
            tomClasses.texto,
          )}
        >
          {valor}
        </dd>
        <dt className="mt-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          {rotulo}
        </dt>
      </div>
    </div>
  );
}

// ============================================================
// Estado vazio
// ============================================================

function EstadoVazio({ busca, turno }: { busca: string; turno: TurnoFiltro }) {
  const houveFiltro = busca.length > 0 || turno !== "todos";
  return (
    <div className="col-span-full rounded-xl border border-dashed border-border bg-card p-10 text-center">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {houveFiltro ? "Sem resultados" : "Nada por aqui"}
      </p>
      <p
        className="mt-3 font-serif text-lg tracking-tight"
      >
        {houveFiltro
          ? "Nenhuma turma corresponde aos filtros."
          : "Ainda não há turmas cadastradas nesta escola."}
      </p>
      {houveFiltro && (
        <p className="mt-2 text-sm text-muted-foreground">
          Tente ajustar a busca ou trocar o turno.
        </p>
      )}
    </div>
  );
}
