"use client";

import Link from "next/link";
import { ArrowRight, FilePlus2, ListChecks, PenSquare } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";

export default function PaginaProfessorDashboard() {
  const { usuario } = useAuth();
  const primeiroNome = usuario?.nome?.split(" ")[0] ?? "professor";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6 md:py-12">
      <header className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Painel do professor
        </p>
        <h1 className="font-serif text-3xl text-foreground md:text-4xl">
          Olá, {primeiroNome}
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Monte uma prova completa escolhendo questões do banco — e, se faltar
          alguma, crie a questão na hora, sem sair do fluxo.
        </p>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {/* CTA primário — construtor de prova completa */}
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

        {/* Secundário — minhas questões (criar/gerir/solicitar revisão) */}
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
              Crie questões novas, revise as que você fez e solicite revisão das
              demais.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground group-hover:text-primary-text">
            <PenSquare className="size-3.5" aria-hidden />
            Abrir
          </span>
        </Link>
      </div>

      <p className="mt-8 rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Sobre permissões:</span>{" "}
        você pode adicionar questões e montar provas livremente. Para{" "}
        <span className="text-foreground">apagar</span> uma questão ou editar
        uma que você não criou, use{" "}
        <span className="text-foreground">solicitar revisão</span> — um admin
        recebe o pedido.
      </p>
    </div>
  );
}
