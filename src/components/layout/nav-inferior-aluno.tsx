"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, History, Home, User, type LucideIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { navegacaoPermitida } from "@/lib/permissoes";
import { cn } from "@/lib/utils";

const ICONES: Record<string, LucideIcon> = {
  historico: History,
  inicio: Home,
  notificacoes: Bell,
  perfil: User,
};

export function NavInferiorAluno() {
  const pathname = usePathname();
  const { usuario } = useAuth();
  const perfil = usuario?.perfil === "candidato" ? "candidato" : "aluno";
  const itens = navegacaoPermitida(perfil);

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 backdrop-blur-xl",
        "md:hidden",
      )}
      aria-label="Navegação inferior"
      data-slot="nav-inferior-aluno"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-4">
        {itens.map((item) => {
          const Icone = ICONES[item.id];
          const ativo =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-2 py-2.5",
                  "transition-colors duration-200",
                  ativo
                    ? "text-primary-text"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-current={ativo ? "page" : undefined}
              >
                <Icone
                  className={cn(
                    "size-5 transition-transform",
                    ativo && "scale-110",
                  )}
                  aria-hidden
                />
                <span className="font-mono text-[10px] uppercase tracking-wider">
                  {item.rotulo}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
