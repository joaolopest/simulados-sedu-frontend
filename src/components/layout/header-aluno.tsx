"use client";

import Link from "next/link";
import { Bell, FileText, Home, LogOut, Menu, Settings } from "lucide-react";
import { BrasaoSedu } from "@/components/layout/brasao-sedu";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { gerarIniciais } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { ToggleTema } from "@/components/layout/toggle-tema";

export function HeaderAluno() {
  const { usuario, logout } = useAuth();

  return (
    <header
      className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl backdrop-saturate-150"
      data-slot="header-aluno"
    >
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4 md:h-16 md:px-6">
        <Link
          href="/aluno/home"
          className="flex items-center gap-2 transition-opacity hover:opacity-90"
          aria-label="Início"
        >
          <BrasaoSedu />
          <span className="hidden font-serif text-base font-medium md:inline">
            Simulados SEDU
          </span>
        </Link>

        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Navegação principal"
        >
          <Button variant="ghost" size="sm" asChild>
            <Link href="/aluno/home">Início</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/aluno/historico">Histórico</Link>
          </Button>
        </nav>

        <div className="flex items-center gap-1.5">
          <ToggleTema />
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="relative size-9"
            aria-label="Notificações"
          >
            <Link href="/notificacoes">
              <Bell className="size-4" />
              <span
                className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-ia"
                aria-hidden
              />
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="ml-1 flex items-center gap-2 rounded-full p-0.5 transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                aria-label="Menu do usuário"
              >
                <Avatar className="size-8">
                  <AvatarImage
                    src={usuario?.fotoUrl}
                    alt={usuario?.nome ?? "Avatar"}
                  />
                  <AvatarFallback className="bg-primary-muted text-[10px] font-mono uppercase tracking-wider text-primary-text">
                    {usuario ? gerarIniciais(usuario.nome) : "—"}
                  </AvatarFallback>
                </Avatar>
                <Menu
                  className="hidden size-3.5 text-muted-foreground md:inline"
                  aria-hidden
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {usuario && (
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{usuario.nome}</span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {usuario.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/perfil" className="gap-2">
                  <Settings className="size-3.5" aria-hidden />
                  <span>Perfil e acessibilidade</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/" className="gap-2">
                  <Home className="size-3.5" aria-hidden />
                  <span>Página inicial</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/documentacao" className="gap-2">
                  <FileText className="size-3.5" aria-hidden />
                  <span>Ajuda e documentação</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  void logout().then(() => {
                    window.location.href = "/login";
                  });
                }}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="size-3.5" aria-hidden />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
