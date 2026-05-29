import type { ReactNode } from "react";

export default function LayoutAuth({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-svh grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside
        aria-hidden="true"
        className="relative hidden flex-col justify-between overflow-hidden bg-primary px-12 py-14 text-primary-foreground lg:flex"
      >
        {/* halo cromático sutil — não é gradiente roxo→rosa nem glass cliché */}
        <div className="painel-auth-hero pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative flex items-center gap-3">
          <BrasaoSedu className="size-9" />
          <span className="font-mono text-xs uppercase tracking-[0.18em] text-primary-foreground/80">
            SEDU · Espírito Santo
          </span>
        </div>

        <div className="relative max-w-md">
          <h1 className="font-serif text-4xl leading-[1.1] tracking-[-0.01em] text-primary-foreground md:text-5xl">
            Avaliação educacional inteligente, desenhada para a sala de aula.
          </h1>
          <p className="mt-6 text-sm leading-relaxed text-primary-foreground/75">
            Plataforma oficial de simulados da Secretaria Estadual de Educação
            do Espírito Santo. Curadoria assistida por IA, diagnóstico por
            competência, acessibilidade pedagógica.
          </p>
        </div>

        <div className="relative flex items-end justify-between text-xs text-primary-foreground/60">
          <span className="font-mono">simulados.sedu.es.gov.br</span>
          <span className="font-mono tabular-nums">v1.0</span>
        </div>
      </aside>

      <main className="fundo-auth-mobile flex flex-col items-center justify-center px-6 py-10 sm:px-12">
        <div className="entrada-pagina flex w-full max-w-md flex-col gap-8">
          {/* topo mobile com brasão */}
          <div className="flex items-center gap-3 lg:hidden">
            <BrasaoSedu className="size-8 text-primary" />
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              SEDU · Espírito Santo
            </span>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

function BrasaoSedu({ className }: { className?: string }) {
  // SVG estilizado — duas formas geométricas do livro aberto + selo SEDU.
  // Sem ilustração 3D, sem cartoon, sem "AI sparkle". Linha sólida institucional.
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M5 10 L20 14 L35 10 L35 30 L20 34 L5 30 Z" />
      <path d="M20 14 L20 34" />
      <path d="M11 16 L17 17.5" />
      <path d="M23 17.5 L29 16" />
      <path d="M11 22 L17 23.5" />
      <path d="M23 23.5 L29 22" />
    </svg>
  );
}
