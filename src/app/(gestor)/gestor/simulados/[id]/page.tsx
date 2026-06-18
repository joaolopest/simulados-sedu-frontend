"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  GraduationCap,
  ListChecks,
  Loader2,
  Users,
} from "lucide-react";

import { useGestorSimulado } from "@/hooks/api/use-gestor";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { baseProvasPorPerfil } from "@/lib/rotas-provas";
import { useAuthStore } from "@/stores/auth-store";
import {
  obterNomeMateria,
  obterNomeSerie,
} from "@/lib/displays";
import { cn, formatarDataBR } from "@/lib/utils";
import type { StatusSimulado } from "@/types";

const TOM_STATUS: Record<StatusSimulado, string> = {
  rascunho: "bg-muted text-muted-foreground",
  em_curadoria: "bg-ia-muted text-ia",
  liberado: "bg-success-muted text-success",
  em_andamento: "bg-primary-muted text-primary-text",
  finalizado: "bg-success-muted text-success",
  cancelado: "bg-destructive-muted text-destructive",
};

const ROTULO_STATUS: Record<StatusSimulado, string> = {
  rascunho: "Rascunho",
  em_curadoria: "Em curadoria",
  liberado: "Liberado",
  em_andamento: "Em andamento",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

export default function PaginaDetalheSimulado() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const perfil = useAuthStore((s) => s.usuario?.perfil);
  const pathname = usePathname();
  const id = params.id;
  const baseProvas = baseProvasPorPerfil(perfil, pathname);

  const { data, isLoading, isError, refetch } = useGestorSimulado(id);
  const simulado = data?.simulado;
  const parametros = simulado?.parametros;
  const nomeSimulado = parametros?.nome?.trim() || `Simulado ${id}`;
  const serieSimulado = parametros?.serie ?? "9_fundamental";
  const materiasSimulado = parametros?.materias ?? [];
  const conteudosSimulado = parametros?.conteudos ?? [];
  const distribuicaoSimulado =
    parametros?.distribuicao ?? { facil: 0, medio: 0, dificil: 0 };
  const quantidadeQuestoes =
    parametros?.quantidadeQuestoes ?? simulado?.questaoIds.length ?? 0;
  const tempoLimiteMinutos = parametros?.tempoLimiteMinutos ?? 60;
  const turmaId = parametros?.turmaId || "-";

  // Para finalizados, faz mais sentido ir direto pro relatório.
  useEffect(() => {
    if (simulado?.status === "finalizado") {
      router.replace(`${baseProvas}/${id}/relatorio`);
    }
  }, [simulado?.status, id, router, baseProvas]);

  const acoes = useMemo(() => {
    if (!simulado) return [];
    const lista: { href: string; rotulo: string; descricao: string }[] = [];

    if (
      simulado.status === "liberado" ||
      simulado.status === "em_andamento"
    ) {
      lista.push({
        href: `${baseProvas}/${id}/acompanhar`,
        rotulo: "Acompanhar ao vivo",
        descricao: "Veja quem já entregou, em andamento ou ainda não acessou.",
      });
    }

    if (
      simulado.status === "finalizado" ||
      simulado.status === "em_andamento"
    ) {
      lista.push({
        href: `${baseProvas}/${id}/relatorio`,
        rotulo: "Ver relatório",
        descricao: "Notas, distribuição, competências e recomendações.",
      });
    }

    return lista;
  }, [simulado, id, baseProvas]);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 md:px-6 md:py-10">
      <Link
        href={baseProvas}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Voltar para simulados
      </Link>

      {isLoading && (
        <div className="mt-6 space-y-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      )}

      {isError && (
        <div className="mt-6 flex items-start justify-between gap-4 rounded-xl border border-destructive/30 bg-destructive-muted p-5 text-destructive">
          <p className="text-sm">Erro ao carregar este simulado.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Tentar de novo
          </Button>
        </div>
      )}

      {simulado && (
        <>
          <header className="mt-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Simulado · {id}
            </p>
            <h1 className="mt-2 font-serif text-3xl tracking-tight md:text-4xl">
              {nomeSimulado}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider",
                  TOM_STATUS[simulado.status],
                )}
              >
                {ROTULO_STATUS[simulado.status]}
              </span>
              <Badge variant="outline" className="font-normal">
                {obterNomeSerie(serieSimulado)}
              </Badge>
              {materiasSimulado.map((m) => (
                <Badge key={m} variant="outline" className="font-normal">
                  {obterNomeMateria(m)}
                </Badge>
              ))}
            </div>
          </header>

          {/* metadados */}
          <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Metadado
              icone={ListChecks}
              rotulo="Questões"
              valor={`${quantidadeQuestoes}`}
            />
            <Metadado
              icone={Clock}
              rotulo="Tempo"
              valor={`${tempoLimiteMinutos} min`}
            />
            <Metadado
              icone={Users}
              rotulo="Turma"
              valor={turmaId}
            />
            <Metadado
              icone={Calendar}
              rotulo="Criado"
              valor={formatarDataBR(simulado.criadoEm)}
            />
          </section>

          {/* conteúdos */}
          {conteudosSimulado.length > 0 && (
            <section className="mt-6 rounded-xl border border-border bg-card p-5">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Conteúdos cobrados
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {conteudosSimulado.map((c) => (
                  <li
                    key={c}
                    className="rounded-md border border-border bg-background px-3 py-1.5 text-xs"
                  >
                    {c}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* distribuição */}
          <section className="mt-6 rounded-xl border border-border bg-card p-5">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Distribuição de dificuldade
            </h2>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div className="rounded-md bg-success-muted px-3 py-2 text-center">
                <p className="font-mono text-[10px] uppercase tracking-wider text-success">
                  Fácil
                </p>
                <p className="mt-1 font-sans text-lg font-medium tabular-nums">
                  {distribuicaoSimulado.facil}
                </p>
              </div>
              <div className="rounded-md bg-warning-muted px-3 py-2 text-center">
                <p className="font-mono text-[10px] uppercase tracking-wider text-warning">
                  Médio
                </p>
                <p className="mt-1 font-sans text-lg font-medium tabular-nums">
                  {distribuicaoSimulado.medio}
                </p>
              </div>
              <div className="rounded-md bg-destructive-muted px-3 py-2 text-center">
                <p className="font-mono text-[10px] uppercase tracking-wider text-destructive">
                  Difícil
                </p>
                <p className="mt-1 font-sans text-lg font-medium tabular-nums">
                  {distribuicaoSimulado.dificil}
                </p>
              </div>
            </div>
          </section>

          {/* ações */}
          {acoes.length > 0 && (
            <section className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
              {acoes.map((acao) => (
                <Link
                  key={acao.href}
                  href={acao.href}
                  className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/30"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-lg tracking-tight">
                      {acao.rotulo}
                    </h3>
                    <FileText className="size-4 text-muted-foreground" />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {acao.descricao}
                  </p>
                </Link>
              ))}
            </section>
          )}

          {/* rascunho */}
          {(simulado.status === "rascunho" ||
            simulado.status === "em_curadoria") && (
            <section className="mt-6 rounded-xl border border-dashed border-border bg-card p-6 text-center">
              <Loader2 className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                Este simulado ainda está sendo preparado. As ações de
                acompanhamento e relatório aparecem assim que ele for liberado.
              </p>
            </section>
          )}

          {/* curadoria info */}
          {simulado.curadoria && (
            <section className="mt-6 rounded-xl border border-border bg-card p-5">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Curadoria IA
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                <Metadado
                  icone={GraduationCap}
                  rotulo="Confiança"
                  valor={`${simulado.curadoria.confiancaPercentual}%`}
                />
                <Metadado
                  icone={Clock}
                  rotulo="Tempo IA"
                  valor={`${simulado.curadoria.tempoCuradoriaSegundos}s`}
                />
                <Metadado
                  icone={ListChecks}
                  rotulo="Tentativas"
                  valor={`${simulado.curadoria.tentativas}`}
                />
                <Metadado
                  icone={Calendar}
                  rotulo="Gerado"
                  valor={formatarDataBR(simulado.curadoria.geradoEm)}
                />
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Metadado({
  icone: Icone,
  rotulo,
  valor,
}: {
  icone: typeof Calendar;
  rotulo: string;
  valor: string;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icone className="size-3.5" />
        <span className="font-mono text-[10px] uppercase tracking-wider">
          {rotulo}
        </span>
      </div>
      <p className="mt-1 font-sans text-sm tabular-nums">{valor}</p>
    </div>
  );
}
