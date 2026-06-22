"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ComponentType } from "react";
import {
  ArrowLeft,
  BarChart3,
  BookOpenCheck,
  Clock,
  FileSpreadsheet,
  GraduationCap,
  ListChecks,
  ShieldAlert,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGestorTurmaDetalhe,
  type AlunoTurmaDetalhe,
  type SimuladoTurmaDetalhe,
} from "@/hooks/api/use-gestor";
import {
  cn,
  formatarDataHoraBR,
  formatarNota,
  formatarPorcentagem,
} from "@/lib/utils";
import { obterNomeSerie } from "@/lib/displays";

export default function PaginaDetalheTurmaGestor() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data, isLoading, isError, refetch } = useGestorTurmaDetalhe(id);

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-6 h-32 rounded-xl" />
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-10 md:px-6">
        <Button variant="ghost" asChild className="-ml-2 gap-2">
          <Link href="/gestor/turmas">
            <ArrowLeft className="size-4" aria-hidden />
            Voltar para turmas
          </Link>
        </Button>
        <section className="mt-6 rounded-xl border border-destructive/30 bg-destructive-muted p-6 text-destructive">
          <p className="font-mono text-[10px] uppercase tracking-wider">
            Nao consegui carregar
          </p>
          <h1 className="mt-2 font-serif text-2xl">Detalhe da turma indisponivel</h1>
          <p className="mt-2 text-sm">
            A turma pode estar fora do seu escopo ou a API nao respondeu.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </section>
      </main>
    );
  }

  const { turma, kpis, alunos, simulados, resultadosRecentes, alertas } = data;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-10">
      <Button variant="ghost" asChild className="-ml-2 gap-2">
        <Link href="/gestor/turmas">
          <ArrowLeft className="size-4" aria-hidden />
          Voltar para turmas
        </Link>
      </Button>

      <header className="mt-4 flex flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {turma.escolaNome || "Escola"} · {obterNomeSerie(turma.serie)}
          </p>
          <h1 className="mt-2 font-serif text-3xl tracking-tight md:text-4xl">
            {turma.nome}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Visao completa da turma, provas vinculadas, resultados recentes e alunos que precisam de acompanhamento.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={`/gestor/simulados/novo?turmaId=${turma.id}`} className="gap-2">
              <BookOpenCheck className="size-4" aria-hidden />
              Criar prova
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/gestor/simulados" className="gap-2">
              <ListChecks className="size-4" aria-hidden />
              Ver provas
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link
              href={`/api/gestor/turmas/${turma.id}/relatorio/exportar?formato=csv&secao=alunos`}
              download
              className="gap-2"
            >
              <FileSpreadsheet className="size-4" aria-hidden />
              CSV alunos
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link
              href={`/api/gestor/turmas/${turma.id}/relatorio/exportar?formato=csv&secao=resultados`}
              download
              className="gap-2"
            >
              <FileSpreadsheet className="size-4" aria-hidden />
              CSV resultados
            </Link>
          </Button>
        </div>
      </header>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6" aria-label="Resumo da turma">
        <KpiCard icone={Users} rotulo="Alunos" valor={kpis.totalAlunos.toString()} />
        <KpiCard icone={ShieldAlert} rotulo="Adaptações" valor={kpis.totalComAdaptacao.toString()} tom={kpis.totalComAdaptacao > 0 ? "warning" : "neutro"} />
        <KpiCard icone={BookOpenCheck} rotulo="Provas" valor={kpis.totalSimulados.toString()} />
        <KpiCard icone={BarChart3} rotulo="Finalizadas" valor={kpis.simuladosFinalizados.toString()} />
        <KpiCard icone={GraduationCap} rotulo="Média" valor={kpis.mediaTurma == null ? "—" : formatarNota(kpis.mediaTurma)} tom={kpis.mediaTurma != null && kpis.mediaTurma < 6 ? "warning" : "neutro"} />
        <KpiCard icone={ShieldAlert} rotulo="Risco" valor={kpis.alunosEmRisco.toString()} tom={kpis.alunosEmRisco > 0 ? "warning" : "neutro"} />
      </section>

      {alertas.length > 0 && (
        <section className="mt-6 grid gap-3 md:grid-cols-2" aria-label="Alertas da turma">
          {alertas.map((alerta) => (
            <article
              key={`${alerta.tipo}-${alerta.titulo}`}
              className="rounded-xl border border-warning/30 bg-warning-muted p-4 text-warning"
            >
              <p className="font-mono text-[10px] uppercase tracking-wider">
                {alerta.severidade}
              </p>
              <h2 className="mt-1 font-serif text-lg text-foreground">
                {alerta.titulo}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {alerta.mensagem}
              </p>
            </article>
          ))}
        </section>
      )}

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-xl border border-border bg-card p-5" aria-labelledby="provas-turma">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Provas
              </p>
              <h2 id="provas-turma" className="mt-1 font-serif text-xl">
                Aplicações da turma
              </h2>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/gestor/simulados/novo?turmaId=${turma.id}`}>
                Nova prova
              </Link>
            </Button>
          </div>
          {simulados.length === 0 ? (
            <EstadoVazio texto="Nenhuma prova vinculada a esta turma ainda." />
          ) : (
            <div className="mt-4 overflow-hidden rounded-lg border border-border">
              {simulados.map((simulado) => (
                <LinhaSimulado key={simulado.id} simulado={simulado} />
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-5" aria-labelledby="resultados-recentes">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Resultados
          </p>
          <h2 id="resultados-recentes" className="mt-1 font-serif text-xl">
            Últimas entregas
          </h2>
          {resultadosRecentes.length === 0 ? (
            <EstadoVazio texto="Ainda não há resultados finalizados." />
          ) : (
            <ul className="mt-4 space-y-2">
              {resultadosRecentes.map((resultado) => (
                <li
                  key={`${resultado.alunoId}-${resultado.simuladoId}-${resultado.finalizadoEm}`}
                  className="rounded-lg border border-border bg-background p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {resultado.alunoNome}
                      </p>
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {formatarDataHoraBR(resultado.finalizadoEm)}
                      </p>
                    </div>
                    <span className="font-serif text-xl tabular-nums">
                      {formatarNota(resultado.notaFinal)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {resultado.acertos} acertos · {resultado.erros} erros · {resultado.emBranco} branco(s)
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-border bg-card p-5" aria-labelledby="alunos-turma">
        <div className="flex flex-col gap-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Alunos
          </p>
          <h2 id="alunos-turma" className="font-serif text-xl">
            Acompanhamento individual
          </h2>
        </div>
        {alunos.length === 0 ? (
          <EstadoVazio texto="Nenhum aluno encontrado para esta turma." />
        ) : (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {alunos.map((aluno) => (
              <CardAluno key={aluno.id} aluno={aluno} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function KpiCard({
  icone: Icone,
  rotulo,
  valor,
  tom = "neutro",
}: {
  icone: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  rotulo: string;
  valor: string;
  tom?: "neutro" | "warning";
}) {
  return (
    <article
      className={cn(
        "rounded-xl border bg-card p-4",
        tom === "warning" ? "border-warning/30" : "border-border",
      )}
    >
      <Icone
        className={cn("size-4", tom === "warning" ? "text-warning" : "text-primary-text")}
        aria-hidden
      />
      <p className="mt-3 font-serif text-2xl leading-none tabular-nums">{valor}</p>
      <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        {rotulo}
      </p>
    </article>
  );
}

function LinhaSimulado({ simulado }: { simulado: SimuladoTurmaDetalhe }) {
  const parametros = simulado.parametros;
  const taxaConclusao = simulado.contagens.total
    ? simulado.contagens.finalizado / simulado.contagens.total
    : 0;
  const destino =
    simulado.status === "liberado" || simulado.status === "em_andamento"
      ? `/gestor/simulados/${simulado.id}/acompanhar`
      : simulado.status === "finalizado"
        ? `/gestor/simulados/${simulado.id}/relatorio`
        : `/gestor/simulados/${simulado.id}`;

  return (
    <Link
      href={destino}
      className="grid gap-3 border-b border-border bg-background p-4 transition-colors hover:bg-muted/40 last:border-b-0 md:grid-cols-[1fr_auto]"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate font-medium text-foreground">
            {parametros.nome || `Prova ${simulado.id}`}
          </h3>
          <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            {simulado.status}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {simulado.totalQuestoes} questões · {simulado.totalAlunos} alunos · conclusão {formatarPorcentagem(taxaConclusao * 100)}
        </p>
      </div>
      <div className="flex items-center gap-4 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <BarChart3 className="size-3" aria-hidden />
          {simulado.media == null ? "sem média" : formatarNota(simulado.media)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3" aria-hidden />
          {simulado.contagens.em_andamento} em andamento
        </span>
      </div>
    </Link>
  );
}

function CardAluno({ aluno }: { aluno: AlunoTurmaDetalhe }) {
  return (
    <article className="rounded-lg border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-medium text-foreground">{aluno.nome}</h3>
          <p className="truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {aluno.email}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-1 font-mono text-[9px] uppercase tracking-wider",
            aluno.probabilidadeRisco >= 0.7
              ? "bg-destructive-muted text-destructive"
              : aluno.probabilidadeRisco >= 0.5 || aluno.necessitaSuporte
                ? "bg-warning-muted text-warning"
                : "bg-success-muted text-success",
          )}
        >
          risco {formatarPorcentagem(aluno.probabilidadeRisco * 100)}
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <div>
          <dt className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            Média
          </dt>
          <dd className="mt-1 font-serif text-xl tabular-nums">
            {aluno.media == null ? "—" : formatarNota(aluno.media)}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            Resultados
          </dt>
          <dd className="mt-1 font-serif text-xl tabular-nums">{aluno.totalResultados}</dd>
        </div>
        <div>
          <dt className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            Suporte
          </dt>
          <dd className="mt-1 font-serif text-xl tabular-nums">
            {aluno.necessitaSuporte ? "sim" : "não"}
          </dd>
        </div>
      </dl>
      {(aluno.adaptacoes.length > 0 || aluno.competenciasFracas.length > 0) && (
        <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
          {[...aluno.adaptacoes, ...aluno.competenciasFracas].slice(0, 4).join(" · ")}
        </p>
      )}
    </article>
  );
}

function EstadoVazio({ texto }: { texto: string }) {
  return (
    <div className="mt-4 rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
      {texto}
    </div>
  );
}
