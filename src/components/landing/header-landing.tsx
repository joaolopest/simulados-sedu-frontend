"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { ToggleTema } from "@/components/layout/toggle-tema";
import { cn } from "@/lib/utils";

const ANCORAS = [
  { id: "como-funciona", rotulo: "Como funciona" },
  { id: "depoimentos", rotulo: "Quem usa" },
  { id: "diagnostico", rotulo: "Diagnóstico IA" },
  { id: "acessibilidade", rotulo: "Acessibilidade" },
];

export function HeaderLanding() {
  const [aberto, setAberto] = useState(false);
  const [rolou, setRolou] = useState(false);

  useEffect(() => {
    const aoScrollar = () => setRolou(window.scrollY > 8);
    aoScrollar();
    window.addEventListener("scroll", aoScrollar, { passive: true });
    return () => window.removeEventListener("scroll", aoScrollar);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full bg-marble transition-all duration-200 dark:bg-shade",
        rolou &&
          "border-b border-shade/10 bg-marble/70 shadow-none backdrop-blur-[20px] backdrop-saturate-[150%] dark:border-marble/10 dark:bg-shade/80",
      )}
      data-slot="header-landing"
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 md:h-[72px] md:px-8">
        <Link
          href="/"
          className="flex items-center gap-2"
          aria-label="Simulados SEDU"
        >
          <span className="font-sans text-xl font-bold tracking-[-0.03em] text-shade dark:text-marble">
            Simulados<span className="text-hydrangea">SEDU</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Navegação">
          {ANCORAS.map((a) => (
            <a
              key={a.id}
              href={`#${a.id}`}
              className="rounded-full px-4 py-2 text-sm font-medium text-shade transition-colors hover:bg-shade/8 dark:text-marble dark:hover:bg-marble/10"
            >
              {a.rotulo}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ToggleTema />
          <Link
            href="/login"
            className="hidden rounded-full px-5 py-2 text-sm font-semibold text-shade transition-colors hover:bg-shade/8 dark:text-marble dark:hover:bg-marble/10 md:inline-flex"
          >
            Entrar
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full bg-shade px-5 py-2.5 text-sm font-bold text-marble transition-all hover:bg-shade/90 active:translate-y-px dark:bg-marble dark:text-shade dark:hover:bg-chartreuse"
          >
            Acessar plataforma
          </Link>
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            className="ml-1 inline-flex size-10 items-center justify-center rounded-full hover:bg-shade/8 dark:hover:bg-marble/10 md:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="size-5 text-shade dark:text-marble" aria-hidden />
          </button>
        </div>
      </div>

      {/* mobile menu */}
      {aberto && (
        <div className="border-t border-shade/10 bg-marble motion-materialize dark:border-marble/10 dark:bg-shade md:hidden">
          <nav className="px-4 py-4">
            {ANCORAS.map((a) => (
              <a
                key={a.id}
                href={`#${a.id}`}
                onClick={() => setAberto(false)}
                className="block rounded-full px-4 py-3 text-sm font-medium text-shade hover:bg-shade/8 dark:text-marble dark:hover:bg-marble/10"
              >
                {a.rotulo}
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
