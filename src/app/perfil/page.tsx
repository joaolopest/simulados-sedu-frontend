"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  LogOut,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { formatarTempoRelativo, gerarIniciais } from "@/lib/utils";
import type { PerfilUsuario } from "@/types";

const HOME_POR_PERFIL: Record<PerfilUsuario, string> = {
  admin: "/admin/dashboard",
  gestor: "/gestor/dashboard",
  aluno: "/aluno/home",
  suporte: "/suporte/dashboard",
};

const ROTULO_PERFIL: Record<PerfilUsuario, string> = {
  admin: "Administrador — Secretaria",
  gestor: "Gestor — Coordenação",
  aluno: "Aluno",
  suporte: "Suporte — Professor/Secretário",
};

const TOM_PERFIL: Record<PerfilUsuario, string> = {
  admin: "bg-primary-muted text-primary-text",
  gestor: "bg-ia-muted text-ia",
  aluno: "bg-success-muted text-success",
  suporte: "bg-warning-muted text-warning",
};

export default function PaginaPerfil() {
  const router = useRouter();
  const { usuario, carregando, logout } = useAuth();

  const voltarHref = usuario ? HOME_POR_PERFIL[usuario.perfil] : "/login";

  async function aoSair() {
    await logout();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4 md:h-16 md:px-6">
          <Link
            href={voltarHref}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
          <div className="flex items-center gap-2">
            <User className="size-4 text-muted-foreground" />
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Perfil
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-10">
        {carregando && (
          <div className="space-y-4">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        )}

        {!carregando && !usuario && (
          <p className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
            Você não está autenticado.{" "}
            <Link href="/login" className="text-primary-text underline">
              Fazer login
            </Link>
          </p>
        )}

        {usuario && (
          <>
            {/* card identidade */}
            <section className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-4">
                <Avatar className="size-16">
                  {usuario.fotoUrl && (
                    <AvatarImage src={usuario.fotoUrl} alt={usuario.nome} />
                  )}
                  <AvatarFallback className="text-lg">
                    {gerarIniciais(usuario.nome)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h1 className="truncate font-serif text-2xl tracking-tight md:text-3xl">
                    {usuario.nome}
                  </h1>
                  <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                    {usuario.email}
                  </p>
                  <span
                    className={`mt-3 inline-flex items-center rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${TOM_PERFIL[usuario.perfil]}`}
                  >
                    {ROTULO_PERFIL[usuario.perfil]}
                  </span>
                </div>
              </div>
            </section>

            {/* card detalhes */}
            <section className="mt-6 rounded-xl border border-border bg-card">
              <h2 className="border-b border-border p-4 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Dados da conta
              </h2>
              <dl className="divide-y divide-border">
                <div className="grid grid-cols-1 gap-1 p-4 md:grid-cols-[180px_1fr] md:items-center">
                  <dt className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="size-3.5" />
                    Email
                  </dt>
                  <dd className="font-mono text-sm">{usuario.email}</dd>
                </div>

                <div className="grid grid-cols-1 gap-1 p-4 md:grid-cols-[180px_1fr] md:items-center">
                  <dt className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="size-3.5" />
                    Perfil
                  </dt>
                  <dd className="text-sm">{ROTULO_PERFIL[usuario.perfil]}</dd>
                </div>

                {usuario.escolaId && (
                  <div className="grid grid-cols-1 gap-1 p-4 md:grid-cols-[180px_1fr] md:items-center">
                    <dt className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                      <Building2 className="size-3.5" />
                      Escola vinculada
                    </dt>
                    <dd className="font-mono text-sm">{usuario.escolaId}</dd>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-1 p-4 md:grid-cols-[180px_1fr] md:items-center">
                  <dt className="text-xs text-muted-foreground">Status</dt>
                  <dd className="text-sm">
                    <span
                      className={`inline-flex items-center gap-1.5 ${usuario.ativo ? "text-success" : "text-muted-foreground"}`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${usuario.ativo ? "bg-success" : "bg-muted-foreground"}`}
                        aria-hidden
                      />
                      {usuario.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </dd>
                </div>

                {usuario.ultimoAcesso && (
                  <div className="grid grid-cols-1 gap-1 p-4 md:grid-cols-[180px_1fr] md:items-center">
                    <dt className="text-xs text-muted-foreground">Último acesso</dt>
                    <dd className="font-mono text-sm tabular-nums">
                      {formatarTempoRelativo(usuario.ultimoAcesso)}
                    </dd>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-1 p-4 md:grid-cols-[180px_1fr] md:items-center">
                  <dt className="text-xs text-muted-foreground">Conta criada em</dt>
                  <dd className="font-mono text-sm tabular-nums">
                    {formatarTempoRelativo(usuario.criadoEm)}
                  </dd>
                </div>
              </dl>
            </section>

            {/* ações */}
            <section className="mt-6 flex justify-end">
              <Button variant="destructive" onClick={aoSair}>
                <LogOut className="size-4" />
                Sair da conta
              </Button>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
