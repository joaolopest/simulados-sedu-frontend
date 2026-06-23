"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FilePlus2,
  FileQuestion,
  ListChecks,
  PenSquare,
  Sparkles,
} from "lucide-react";

import { useProfessorDashboard } from "@/hooks/api/use-professor";
import { useAuth } from "@/hooks/use-auth";
import { CardKpi } from "@/components/graficos/card-kpi";
import { Button } from "@/components/ui/button";
import { CategoryBadge } from "@/components/ui/category-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { obterNomeMateria, obterNomeSerie } from "@/lib/displays";
import { cn, formatarPorcentagem, truncar } from "@/lib/utils";

export default function PaginaProfessorDashboard() {
  const { usuario } = useAuth();
  const { data, isLoading, isError, refetch } = useProfessorDashboard();
  const primeiroNome = usuario?.nome?.split(" ")[0] ?? "professor";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 md:py-12">
      <header className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Painel do professor
        </p>
        <h1 className="font-serif text-3xl text-foreground md:text-4xl">
          Olá, {primeiroNome}
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Monte provas, acompanhe suas questões e revise sinais de qualidade do
          seu acervo antes de aplicar.
        </p>
      </header>

      {isError && (
        <div className="mt-6 flex items-start justify-between gap-4 rounded-xl border border-destructive/30 bg-destructive-muted p-5 text-destructive">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider">
              Erro ao carregar painel
            </p>
            <p className="mt-1 text-sm">Tente novamente para buscar seus dados.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Tentar de novo
          </Button>
        </div>
      )}

      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading || !data ? (
          Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))
        ) : (
          <>
            <CardKpi
              icone={FileQuestion}
              rotulo="Minhas questões"
              valor={data.kpis.minhasQuestoes}
              tom="primario"
              delayReveal={0}
            />
            <CardKpi
              icone={FilePlus2}
              rotulo="Provas criadas"
              valor={data.kpis.provasCriadas}
              tom="neutro"
              delayReveal={0.08}
            />
            <CardKpi
              icone={CheckCircle2}
              rotulo="Provas liberadas"
              valor={data.kpis.provasLiberadas}
              tom="vivo"
              delayReveal={0.16}
            />
            <CardKpi
              icone={AlertTriangle}
              rotulo="Alertas"
              valor={data.kpis.alertasQualidade + data.kpis.revisoesPendentes}
              tom={
                data.kpis.alertasQualidade + data.kpis.revisoesPendentes > 0
                  ? "alerta"
                  : "neutro"
              }
              delayReveal={0.24}
            />
          </>
        )}
      </section>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/professor/provas/nova"
          className="group relative flex flex-col justify-between gap-6 overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-primary-muted via-card to-card p-6 transition-shadow hover:shadow-[0_0_0_3px_var(--primary-muted)]"
        >
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FilePlus2 className="size-5" aria-hidden />
          </div>
          <div className="space-y-1.5">
            <h2 className="font-serif text-xl text-foreground">
              Criar prova completa
            </h2>
            <p className="text-sm text-muted-foreground">
              Escolha questões do banco, crie novas inline e monte a prova de
              ponta a ponta.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-primary-text">
            Começar
            <ArrowRight
              className="size-3.5 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </span>
        </Link>

        <Link
          href="/professor/questoes"
          className="group flex flex-col justify-between gap-6 rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/30"
        >
          <div className="flex size-11 items-center justify-center rounded-lg bg-muted text-foreground">
            <ListChecks className="size-5" aria-hidden />
          </div>
          <div className="space-y-1.5">
            <h2 className="font-serif text-xl text-foreground">
              Minhas questões
            </h2>
            <p className="text-sm text-muted-foreground">
              Crie questões novas, revise as que você fez e solicite revisão
              das demais.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground group-hover:text-primary-text">
            <PenSquare className="size-3.5" aria-hidden />
            Abrir
          </span>
        </Link>
      </div>

      {data && (
        <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_1.1fr]">
          <CardQualidadeProfessor qualidade={data.qualidadeQuestoes} />
          <CardInsightsProfessor insights={data.insights} />
        </section>
      )}

      {data && (
        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-serif text-xl text-foreground">
                Provas recentes
              </h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/professor/provas">
                  Ver todas
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </Button>
            </div>
            {data.provasRecentes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma prova criada ainda.
              </p>
            ) : (
              <ul className="space-y-2">
                {data.provasRecentes.map((prova) => (
                  <li
                    key={prova.id}
                    className="rounded-lg border border-border bg-background/60 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {prova.parametros.nome}
                        </p>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                          {prova.totalQuestoes} questões · {prova.totalAlunos} alunos
                        </p>
                      </div>
                      <CategoryBadge categoria="neutro" tamanho="xs">
                        {prova.status}
                      </CategoryBadge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-serif text-xl text-foreground">
                Questões recentes
              </h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/professor/questoes">
                  Ver banco
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </Button>
            </div>
            {data.questoesRecentes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma questão criada ainda.
              </p>
            ) : (
              <ul className="space-y-2">
                {data.questoesRecentes.map((questao) => (
                  <li
                    key={questao.id}
                    className="rounded-lg border border-border bg-background/60 p-3"
                  >
                    <p className="line-clamp-2 text-sm text-foreground">
                      {truncar(questao.enunciado, 120)}
                    </p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {obterNomeMateria(questao.materia)} ·{" "}
                      {obterNomeSerie(questao.serie)} · {questao.status}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      <p className="mt-8 rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Sobre permissões:</span>{" "}
        você pode adicionar questões e montar provas livremente. Para{" "}
        <span className="text-foreground">apagar</span> uma questão ou editar
        uma que você não criou, use{" "}
        <span className="text-foreground">solicitar revisão</span>: um admin
        recebe o pedido.
      </p>
    </div>
  );
}

function CardQualidadeProfessor({
  qualidade,
}: {
  qualidade: {
    totalQuestoes: number;
    publicadas: number;
    rascunhos: number;
    emRevisao: number;
    arquivadas: number;
    comAlertas: number;
    semRespostas: number;
    taxaMediaAcerto: number;
  };
}) {
  const barras = [
    { rotulo: "Publicadas", valor: qualidade.publicadas, classe: "bg-success" },
    { rotulo: "Rascunhos", valor: qualidade.rascunhos, classe: "bg-muted-foreground" },
    { rotulo: "Em revisão", valor: qualidade.emRevisao, classe: "bg-warning" },
    { rotulo: "Arquivadas", valor: qualidade.arquivadas, classe: "bg-destructive" },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Qualidade
          </p>
          <h2 className="mt-1 font-serif text-xl text-foreground">
            Minhas questões
          </h2>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider",
            qualidade.comAlertas > 0
              ? "bg-warning-muted text-warning"
              : "bg-success-muted text-success",
          )}
        >
          {qualidade.comAlertas} alerta{qualidade.comAlertas === 1 ? "" : "s"}
        </span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <IndicadorProfessor
          rotulo="Taxa média"
          valor={formatarPorcentagem(qualidade.taxaMediaAcerto * 100)}
        />
        <IndicadorProfessor
          rotulo="Sem respostas"
          valor={qualidade.semRespostas.toString()}
        />
      </div>
      <div className="mt-5 space-y-2">
        {barras.map((item) => {
          const percentual =
            qualidade.totalQuestoes > 0
              ? Math.round((item.valor / qualidade.totalQuestoes) * 100)
              : 0;
          return (
            <div key={item.rotulo}>
              <div className="mb-1 flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">{item.rotulo}</span>
                <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                  {item.valor}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", item.classe)}
                  style={{ width: `${percentual}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IndicadorProfessor({
  rotulo,
  valor,
}: {
  rotulo: string;
  valor: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/50 p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {rotulo}
      </p>
      <p className="mt-1 font-serif text-2xl tracking-tight text-foreground">
        {valor}
      </p>
    </div>
  );
}

function CardInsightsProfessor({
  insights,
}: {
  insights: { id?: string; titulo?: string; texto?: string }[];
}) {
  return (
    <div className="rounded-xl border border-ia/20 bg-ia-muted p-5">
      <div className="flex items-center gap-2">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-ia/12 text-ia-text">
          <Sparkles className="size-4" aria-hidden />
        </div>
        <h2 className="font-serif text-xl text-foreground">Sinais pedagógicos</h2>
      </div>
      <ul className="mt-5 space-y-4">
        {insights.map((insight, index) => (
          <li key={insight.id ?? index} className="flex gap-3">
            <span
              className="mt-1.5 size-1.5 shrink-0 rounded-full bg-ia"
              aria-hidden
            />
            <div>
              {insight.titulo ? (
                <p className="text-sm font-medium text-foreground">
                  {insight.titulo}
                </p>
              ) : null}
              {insight.texto ? (
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {insight.texto}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
