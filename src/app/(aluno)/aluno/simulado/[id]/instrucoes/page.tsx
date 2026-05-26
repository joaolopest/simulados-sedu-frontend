"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CircleCheck,
  Clock,
  Keyboard,
  ListChecks,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useSimuladoAluno } from "@/hooks/api/use-simulado-aluno";
import { obterNomeMaterias, obterNomeSerie } from "@/lib/displays";

const INSTRUCOES = [
  {
    icone: Save,
    titulo: "Suas respostas são salvas automaticamente",
    descricao:
      "A cada alternativa marcada, o sistema guarda seu progresso. Se a internet cair, o simulado continua e sincroniza quando voltar.",
  },
  {
    icone: Clock,
    titulo: "Você tem o tempo total exibido abaixo",
    descricao:
      "O cronômetro fica visível durante todo o simulado. Avisos aparecem aos 5 min, 1 min e 30 segundos finais.",
  },
  {
    icone: ListChecks,
    titulo: "Você pode navegar entre questões",
    descricao:
      "Use os botões de Anterior e Próxima ou o grid de bolinhas no rodapé para pular pra qualquer questão. Pode marcar pra revisar depois.",
  },
  {
    icone: Keyboard,
    titulo: "Atalhos de teclado disponíveis",
    descricao:
      "Setas para navegar entre questões, números 1-4 para selecionar alternativas. F para alternar modo foco.",
  },
] as const;

export default function PaginaInstrucoesSimulado({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading, isError } = useSimuladoAluno(id);
  const [aceito, setAceito] = useState(false);
  const [carregando, setCarregando] = useState(false);

  function iniciar() {
    if (!aceito) return;
    setCarregando(true);
    router.push(`/aluno/simulado/${id}/executar`);
  }

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-12 md:px-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-4 h-12 w-full" />
        <Skeleton className="mt-8 h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-12 md:px-6">
        <div className="rounded-xl border border-destructive/30 bg-destructive-muted p-8 text-center">
          <AlertTriangle className="mx-auto size-8 text-destructive" aria-hidden />
          <p
            className="mt-4 font-serif text-xl"
          >
            Não consegui carregar este simulado.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Volta pra Home e tenta de novo. Se persistir, fala com seu coordenador.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/aluno/home">Voltar pra Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { simulado } = data;
  const tempoMin = simulado.parametros.tempoLimiteMinutos;
  const tempoFormatado =
    tempoMin >= 60
      ? `${Math.floor(tempoMin / 60)}h${tempoMin % 60 > 0 ? ` ${tempoMin % 60}min` : ""}`
      : `${tempoMin} min`;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 md:px-6 md:py-16">
      <article className="rounded-2xl border border-border bg-card p-6 shadow-[0_24px_48px_rgba(15,23,42,0.06),inset_0_1px_0_oklch(1_0_0/0.6)] md:p-10">
        {/* eyebrow */}
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary-text">
          ● Antes de começar
        </p>

        {/* nome */}
        <h1
          className="mt-3 font-serif text-3xl leading-tight tracking-tight md:text-4xl"
        >
          {simulado.parametros.nome}
        </h1>

        {/* metadata */}
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>{obterNomeMaterias(simulado.parametros.materias)}</span>
          <span aria-hidden>·</span>
          <span>{obterNomeSerie(simulado.parametros.serie)}</span>
        </div>

        {/* stats principais */}
        <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border">
          <div className="bg-card p-5">
            <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Questões
            </dt>
            <dd className="mt-2 font-serif text-3xl tabular-nums">
              {simulado.parametros.quantidadeQuestoes}
            </dd>
          </div>
          <div className="bg-card p-5">
            <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Tempo
            </dt>
            <dd className="mt-2 font-serif text-3xl tabular-nums">
              {tempoFormatado}
            </dd>
          </div>
        </dl>

        {/* instruções */}
        <h2 className="mt-10 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          O que você precisa saber
        </h2>
        <ul className="mt-4 space-y-5">
          {INSTRUCOES.map((item) => (
            <li key={item.titulo} className="flex gap-4">
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary-muted text-primary-text"
                aria-hidden
              >
                <item.icone className="size-4" />
              </span>
              <div className="flex-1">
                <p className="font-medium text-foreground">{item.titulo}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                  {item.descricao}
                </p>
              </div>
            </li>
          ))}
        </ul>

        {/* checkbox + cta */}
        <div className="mt-10 flex items-start gap-3 rounded-lg border border-border bg-background p-4">
          <Checkbox
            id="aceite"
            checked={aceito}
            onCheckedChange={(v) => setAceito(v === true)}
            className="mt-0.5"
          />
          <Label
            htmlFor="aceite"
            className="flex-1 cursor-pointer text-sm leading-relaxed font-normal"
          >
            Li e entendi as instruções acima. Estou em local adequado, com
            internet e tempo necessários para fazer o simulado completo.
          </Label>
        </div>

        <Button
          onClick={iniciar}
          disabled={!aceito || carregando}
          size="lg"
          className="mt-6 w-full gap-2"
        >
          {carregando ? (
            <>Carregando…</>
          ) : (
            <>
              <CircleCheck className="size-4" aria-hidden />
              Iniciar simulado
              <ArrowRight className="size-4" aria-hidden />
            </>
          )}
        </Button>

        <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          O cronômetro só começa após você iniciar
        </p>
      </article>
    </div>
  );
}
