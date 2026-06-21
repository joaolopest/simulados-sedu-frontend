"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bell, Check, CheckCheck, Undo2 } from "lucide-react";

import { atualizar, obter } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatarTempoRelativo } from "@/lib/utils";
import type { Notificacao, PerfilUsuario } from "@/types";

interface RespostaNotificacoes {
  total: number;
  naoLidas: number;
  dados: Notificacao[];
}

const HOME_POR_PERFIL: Record<PerfilUsuario, string> = {
  admin: "/admin/dashboard",
  gestor: "/gestor/dashboard",
  professor: "/professor/dashboard",
  aluno: "/aluno/home",
  candidato: "/aluno/home",
  suporte: "/suporte/dashboard",
};

const COR_TIPO: Record<string, string> = {
  simulado_liberado: "bg-primary-muted text-primary-text",
  simulado_iniciado: "bg-ia-muted text-ia",
  simulado_finalizado: "bg-success-muted text-success",
  diagnostico_pronto: "bg-success-muted text-success",
  alerta_risco: "bg-destructive-muted text-destructive",
  questao_publicada: "bg-warning-muted text-warning",
  importacao_concluida: "bg-success-muted text-success",
  convite_usuario: "bg-ia-muted text-ia",
  sistema: "bg-muted text-muted-foreground",
};

export default function PaginaNotificacoes() {
  const qc = useQueryClient();
  const usuario = useAuthStore((s) => s.usuario);

  const usuarioId = usuario?.id;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["notificacoes", usuarioId],
    queryFn: () =>
      obter<RespostaNotificacoes>(
        `/notificacoes${usuarioId ? `?usuarioId=${usuarioId}` : ""}`,
      ),
    enabled: Boolean(usuarioId),
    staleTime: 15_000,
  });

  const alterarLida = useMutation({
    mutationFn: (vars: { id: string; lida: boolean }) =>
      atualizar<Notificacao>(`/notificacoes/${vars.id}`, { lida: vars.lida }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notificacoes", usuarioId] });
    },
  });

  const marcarTodas = useMutation({
    mutationFn: async () => {
      const naoLidas = data?.dados.filter((n) => !n.lida) ?? [];
      await Promise.all(
        naoLidas.map((n) =>
          atualizar<Notificacao>(`/notificacoes/${n.id}`, { lida: true }),
        ),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notificacoes", usuarioId] });
    },
  });

  const voltarHref = usuario ? HOME_POR_PERFIL[usuario.perfil] : "/login";

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
            <Bell className="size-4 text-muted-foreground" />
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Notificações
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-10">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-serif text-3xl tracking-tight md:text-4xl">
              Suas notificações
            </h1>
            {data && (
              <p className="mt-2 text-sm text-muted-foreground">
                {data.naoLidas > 0
                  ? `${data.naoLidas} não ${data.naoLidas === 1 ? "lida" : "lidas"} · ${data.total} no total`
                  : `Todas lidas · ${data.total} no total`}
              </p>
            )}
          </div>
          {data && data.naoLidas > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => marcarTodas.mutate()}
              disabled={marcarTodas.isPending}
            >
              <CheckCheck className="size-3.5" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        {isError && (
          <div
            className="mt-8 flex items-start justify-between gap-4 rounded-xl border border-destructive/30 bg-destructive-muted p-5 text-destructive"
            role="alert"
          >
            <p className="text-sm">Erro ao carregar notificações.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Tentar de novo
            </Button>
          </div>
        )}

        {!usuario && (
          <p className="mt-8 rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
            Faça login para ver suas notificações.
          </p>
        )}

        {usuario && (isLoading || !data) && (
          <ul className="mt-6 space-y-2">
            {Array.from({ length: 5 }, (_, i) => (
              <li key={i}>
                <Skeleton className="h-20 rounded-xl" />
              </li>
            ))}
          </ul>
        )}

        {usuario && data && data.dados.length === 0 && (
          <p className="mt-8 rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
            Você não tem notificações ainda.
          </p>
        )}

        {usuario && data && data.dados.length > 0 && (
          <ul className="mt-6 space-y-2">
            {data.dados.map((n) => (
              <li
                key={n.id}
                className={cn(
                  "rounded-xl border bg-card p-4 transition-colors",
                  n.lida
                    ? "border-border opacity-75"
                    : "border-primary/30 bg-primary-muted/30",
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                      COR_TIPO[n.tipo] ?? "bg-muted text-muted-foreground",
                    )}
                  >
                    {n.tipo.replace(/_/g, " ")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm",
                        n.lida ? "text-muted-foreground" : "font-medium",
                      )}
                    >
                      {n.titulo}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {n.mensagem}
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground tabular-nums">
                        {formatarTempoRelativo(n.criadaEm)}
                      </span>
                      <div className="flex items-center gap-1">
                        {n.acaoUrl && n.acaoLabel && (
                          <Button
                            asChild
                            variant="outline"
                            size="xs"
                            onClick={() =>
                              alterarLida.mutate({ id: n.id, lida: true })
                            }
                          >
                            <Link href={n.acaoUrl}>{n.acaoLabel}</Link>
                          </Button>
                        )}
                        {n.lida ? (
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() =>
                              alterarLida.mutate({ id: n.id, lida: false })
                            }
                            disabled={alterarLida.isPending}
                          >
                            <Undo2 className="size-3" />
                            Marcar como não lida
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() =>
                              alterarLida.mutate({ id: n.id, lida: true })
                            }
                            disabled={alterarLida.isPending}
                          >
                            <Check className="size-3" />
                            Marcar lida
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
