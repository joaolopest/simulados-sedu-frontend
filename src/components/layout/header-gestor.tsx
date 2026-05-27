"use client";

import Link from "next/link";
import { Bell, Home, LogOut, Menu, Settings } from "lucide-react";
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

export function HeaderGestor() {
  const { usuario, logout } = useAuth();

  return (
    <header
      className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl backdrop-saturate-150"
      data-slot="header-gestor"
    >
      <div className="flex h-14 items-center justify-between gap-3 px-6 md:h-16">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="size-4" />
          </Button>
        </div>

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
                className="ml-1 flex items-center gap-2 rounded-full p-0.5 hover:bg-accent focus-visible:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                aria-label="Menu do usuário"
              >
                <Avatar className="size-8">
                  <AvatarImage
                    src={usuario?.fotoUrl}
                    alt={usuario?.nome ?? "Avatar"}
                  />
                  <AvatarFallback className="bg-primary-muted font-mono text-[10px] uppercase text-primary-text">
                    {usuario ? gerarIniciais(usuario.nome) : "—"}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {usuario && (
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{usuario.nome}</span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Coordenação pedagógica
                    </span>
                  </div>
                </DropdownMenuLabel>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/perfil" className="gap-2">
                  <Settings className="size-3.5" aria-hidden />
                  Perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/" className="gap-2">
                  <Home className="size-3.5" aria-hidden />
                  Página inicial
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
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
