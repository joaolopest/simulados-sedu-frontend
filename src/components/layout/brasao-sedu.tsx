import { cn } from "@/lib/utils";

interface BrasaoSeduProps {
  className?: string;
  variante?: "padrao" | "monocromatico" | "claro";
  exibirNome?: boolean;
}

/**
 * Brasão institucional SEDU — composição geométrica:
 * livro aberto (educação) + selo institucional (autoridade) + traço diagonal (ascensão).
 * Sem cartoon, sem gradiente roxo→rosa, sem 3D.
 */
export function BrasaoSedu({
  className,
  variante = "padrao",
  exibirNome = false,
}: BrasaoSeduProps) {
  const corPrimaria =
    variante === "claro"
      ? "currentColor"
      : variante === "monocromatico"
        ? "currentColor"
        : "var(--primary)";
  const corSecundaria =
    variante === "claro"
      ? "currentColor"
      : variante === "monocromatico"
        ? "currentColor"
        : "var(--ia)";

  return (
    <div
      className={cn("inline-flex items-center gap-3", className)}
      data-slot="brasao-sedu"
    >
      <svg
        viewBox="0 0 48 48"
        className="size-10 shrink-0"
        role="img"
        aria-label="Brasão SEDU"
        fill="none"
      >
        {/* selo externo — círculo institucional */}
        <circle
          cx="24"
          cy="24"
          r="22"
          stroke={corPrimaria}
          strokeWidth="1.5"
          opacity={variante === "claro" ? "0.5" : "0.18"}
        />
        {/* livro aberto estilizado — duas páginas com lombada central */}
        <path
          d="M10 18 L24 14 L38 18 L38 34 L24 30 L10 34 Z"
          fill={corPrimaria}
          opacity={variante === "claro" ? "0.92" : "1"}
        />
        <line
          x1="24"
          y1="14"
          x2="24"
          y2="30"
          stroke={variante === "claro" ? corPrimaria : "oklch(1 0 0)"}
          strokeWidth="1.2"
          opacity="0.7"
        />
        {/* linha diagonal de ascensão (educação que move) */}
        <path
          d="M14 22 L22 18"
          stroke={corSecundaria}
          strokeWidth="2"
          strokeLinecap="round"
          opacity={variante === "claro" ? "0.8" : "0.95"}
        />
        <path
          d="M26 18 L34 22"
          stroke={corSecundaria}
          strokeWidth="2"
          strokeLinecap="round"
          opacity={variante === "claro" ? "0.8" : "0.95"}
        />
      </svg>

      {exibirNome && (
        <div className="flex flex-col leading-none">
          <span className="font-serif text-lg font-medium tracking-tight">
            Simulados SEDU
          </span>
          <span className="mt-0.5 font-mono text-[10px] uppercase tracking-wider opacity-60">
            Avaliação educacional
          </span>
        </div>
      )}
    </div>
  );
}
