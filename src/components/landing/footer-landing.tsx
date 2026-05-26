import Link from "next/link";

const COLUNAS = [
  {
    titulo: "Plataforma",
    links: [
      { rotulo: "Como funciona", href: "#como-funciona" },
      { rotulo: "Quem usa", href: "#depoimentos" },
      { rotulo: "Diagnóstico IA", href: "#diagnostico" },
      { rotulo: "Acessibilidade", href: "#acessibilidade" },
    ],
  },
  {
    titulo: "Institucional",
    links: [
      { rotulo: "Secretaria de Educação", href: "#" },
      { rotulo: "Política de privacidade", href: "#" },
      { rotulo: "Termos de uso", href: "#" },
      { rotulo: "Contato", href: "#" },
    ],
  },
  {
    titulo: "Acesso",
    links: [
      { rotulo: "Entrar", href: "/login" },
      { rotulo: "Recuperar senha", href: "/recuperar-senha" },
      { rotulo: "Primeiro acesso", href: "/primeiro-acesso" },
    ],
  },
];

export function FooterLanding() {
  const ano = new Date().getFullYear();

  return (
    <footer
      className="relative overflow-hidden bg-shade"
      data-slot="footer-landing"
    >
      {/* mascote SVG playful — ilustração 2D autoral, não 3D */}
      <MascoteSedu />

      <div className="relative mx-auto w-full max-w-7xl px-4 pt-20 pb-12 md:px-8 md:pt-28 md:pb-14">
        {/* wordmark gigante topo — estilo Linktree footer */}
        <div className="mb-16 md:mb-20">
          <p
            className="font-sans text-marble"
            style={{               fontSize: "clamp(3rem, 12vw, 9rem)",
              lineHeight: "1",
              letterSpacing: "-0.04em",
              animation: "materialize 0.8s var(--ease-quart) 0ms backwards",
            }}
          >
            Simulados<span className="text-chartreuse">SEDU</span>
          </p>
        </div>

        <div className="grid gap-12 border-t border-marble/15 pt-12 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-5">
            <p className="max-w-sm text-base leading-[1.55] text-marble/80">
              Plataforma estadual de avaliação educacional do Espírito Santo.
              Da Secretaria à sala de aula em um único fluxo.
            </p>
          </div>

          <div className="grid gap-10 sm:grid-cols-3 md:col-span-7">
            {COLUNAS.map((c, i) => (
              <div
                key={c.titulo}
                style={{
                  animation: `materialize 0.6s var(--ease-quart) ${200 + i * 100}ms backwards`,
                }}
              >
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-chartreuse">
                  {c.titulo}
                </p>
                <ul className="mt-4 space-y-2.5">
                  {c.links.map((l) => (
                    <li key={l.rotulo}>
                      <Link
                        href={l.href}
                        className="text-sm font-medium text-marble transition-colors hover:text-chartreuse"
                      >
                        {l.rotulo}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-marble/15 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-marble/50">
            Governo do Espírito Santo · Secretaria de Educação · {ano}
          </p>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-marble/50">
            v0.1.0 · WCAG AA
          </p>
        </div>
      </div>
    </footer>
  );
}

/**
 * Mascote SVG playful — 2D autoral (não 3D Memoji/Storyset).
 * Composição geométrica: livro aberto antropomorfizado segurando lápis.
 * Aparece grande à direita do footer, parcialmente cortado pela borda.
 */
function MascoteSedu() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 280 320"
      className="pointer-events-none absolute -right-20 -bottom-16 hidden h-[280px] w-auto opacity-80 lg:block lg:-right-8 lg:h-[360px] xl:h-[420px]"
    >
      {/* corpo livro aberto */}
      <path
        d="M 40 120 Q 40 100 60 100 L 130 100 Q 140 100 140 110 L 140 280 Q 140 290 130 290 L 60 290 Q 40 290 40 270 Z"
        fill="var(--color-chartreuse)"
      />
      <path
        d="M 240 120 Q 240 100 220 100 L 150 100 Q 140 100 140 110 L 140 280 Q 140 290 150 290 L 220 290 Q 240 290 240 270 Z"
        fill="var(--color-canopy)"
      />
      {/* lombada */}
      <rect x="138" y="100" width="4" height="190" fill="var(--color-shade)" />
      {/* linhas de texto no livro esquerdo */}
      <rect x="60" y="130" width="60" height="3" rx="1.5" fill="var(--color-shade)" opacity="0.4" />
      <rect x="60" y="142" width="50" height="3" rx="1.5" fill="var(--color-shade)" opacity="0.4" />
      <rect x="60" y="154" width="65" height="3" rx="1.5" fill="var(--color-shade)" opacity="0.4" />
      {/* linhas direito */}
      <rect x="160" y="130" width="60" height="3" rx="1.5" fill="var(--color-shade)" opacity="0.3" />
      <rect x="160" y="142" width="55" height="3" rx="1.5" fill="var(--color-shade)" opacity="0.3" />
      {/* olhos */}
      <circle
        cx="90"
        cy="200"
        r="8"
        fill="var(--color-shade)"
        style={{
          animation: "piscar 5s ease-in-out infinite",
          transformOrigin: "center",
          transformBox: "fill-box",
        }}
      />
      <circle
        cx="190"
        cy="200"
        r="8"
        fill="var(--color-shade)"
        style={{
          animation: "piscar 5s ease-in-out infinite",
          transformOrigin: "center",
          transformBox: "fill-box",
        }}
      />
      <circle cx="92" cy="198" r="2.5" fill="var(--color-marble)" />
      <circle cx="192" cy="198" r="2.5" fill="var(--color-marble)" />
      {/* sorriso pequeno */}
      <path
        d="M 120 230 Q 140 245 160 230"
        stroke="var(--color-shade)"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* lápis flutuando */}
      <g style={{ animation: "flutuar-lapis 3.5s ease-in-out infinite" }}>
        <rect width="10" height="80" rx="2" fill="var(--color-poppy)" />
        <polygon points="0,80 5,95 10,80" fill="var(--color-shade)" />
        <rect y="-12" width="10" height="14" rx="2" fill="var(--color-rose)" />
      </g>
      {/* estrelas decorativas */}
      <g fill="var(--color-orchid)">
        <circle cx="20" cy="60" r="4" />
        <circle cx="260" cy="200" r="5" />
        <circle cx="40" cy="280" r="3" />
      </g>
      <style>{`@keyframes piscar { 0%, 90%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } } @keyframes flutuar-lapis { 0%, 100% { transform: translate(220px, 60px) rotate(35deg); } 50% { transform: translate(220px, 50px) rotate(40deg); } }`}</style>
    </svg>
  );
}
