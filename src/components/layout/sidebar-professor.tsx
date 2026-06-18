"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FilePlus2,
  LayoutDashboard,
  ListChecks,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrasaoSedu } from "@/components/layout/brasao-sedu";
import { navegacaoPermitida } from "@/lib/permissoes";
import { cn } from "@/lib/utils";

const ICONES: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  "nova-prova": FilePlus2,
  provas: FilePlus2,
  questoes: ListChecks,
};

export function SidebarProfessor() {
  const pathname = usePathname();
  const itens = navegacaoPermitida("professor");

  return (
    <aside
      className="hidden w-[232px] shrink-0 border-r border-border bg-sidebar md:flex md:flex-col"
      data-slot="sidebar-professor"
      aria-label="Navegação principal"
    >
      <div className="border-b border-border px-5 py-4">
        <Link
          href="/professor/dashboard"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
          aria-label="Início"
        >
          <BrasaoSedu />
          <div className="flex flex-col leading-none">
            <span className="font-serif text-sm font-medium">SEDU</span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
              Professor
            </span>
          </div>
        </Link>
      </div>

      <div className="px-3 pt-4 pb-2">
        <Button asChild size="sm" className="w-full gap-2">
          <Link href="/professor/provas/nova">
            <Plus className="size-3.5" aria-hidden />
            Nova prova
          </Link>
        </Button>
      </div>

      <nav className="flex-1 px-3 py-3" aria-label="Menu">
        <ul className="space-y-0.5">
          {itens.map((item) => {
            const Icone = ICONES[item.id] ?? FilePlus2;
            const ativo = item.matchPrefix
              ? pathname.startsWith(item.href)
              : pathname === item.href;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors duration-160",
                    "[transition-timing-function:var(--ease-quart)]",
                    ativo
                      ? "nav-item-ativo"
                      : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
                  )}
                  aria-current={ativo ? "page" : undefined}
                >
                  <Icone
                    className={cn(
                      "size-4 shrink-0",
                      ativo ? "text-primary-text" : "",
                    )}
                    aria-hidden
                  />
                  <span className="flex-1 truncate">{item.rotulo}</span>
                  {ativo && (
                    <span
                      aria-hidden
                      className="size-1 rounded-full bg-primary-text"
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-border px-5 py-3">
        <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          v0.1.0 · WCAG AA
        </p>
      </div>
    </aside>
  );
}
