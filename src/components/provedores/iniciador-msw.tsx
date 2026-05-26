"use client";

import { useEffect, useState } from "react";

interface IniciadorMSWProps {
  children: React.ReactNode;
}

type EstadoMSW = "iniciando" | "pronto" | "desabilitado" | "erro" | "recarregando";

const FLAG_RECARREGOU = "__sedu_msw_reload";

export function IniciadorMSW({ children }: IniciadorMSWProps) {
  const [estado, setEstado] = useState<EstadoMSW>(() =>
    process.env.NODE_ENV === "development" ? "iniciando" : "desabilitado",
  );
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  useEffect(() => {
    if (estado !== "iniciando") return;
    let cancelado = false;

    (async () => {
      try {
        const { iniciarMSW } = await import("@/lib/msw/iniciar-msw");
        await iniciarMSW();

        // Service Worker pode ter registrado MAS não tomou controle ainda
        // (acontece na primeira instalação). Solução: reload automático 1x.
        if (
          typeof navigator !== "undefined" &&
          navigator.serviceWorker &&
          !navigator.serviceWorker.controller
        ) {
          // só recarrega 1 vez por sessão pra evitar loop
          if (!sessionStorage.getItem(FLAG_RECARREGOU)) {
            sessionStorage.setItem(FLAG_RECARREGOU, "1");
            if (!cancelado) setEstado("recarregando");
            window.location.reload();
            return;
          }
        }

        // ok, SW registrou e tomou controle (ou já tinha tomado)
        sessionStorage.removeItem(FLAG_RECARREGOU);
        if (!cancelado) setEstado("pronto");
      } catch (erro) {
        const mensagem =
          erro instanceof Error ? erro.message : String(erro);
        console.error("[Simulados SEDU] falha ao iniciar MSW:", erro);
        if (!cancelado) {
          setMensagemErro(mensagem);
          setEstado("erro");
        }
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [estado]);

  if (estado === "iniciando" || estado === "recarregando") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-screen items-center justify-center bg-background"
      >
        <div className="flex flex-col items-center gap-4">
          <div
            aria-hidden
            className="size-2 rounded-full bg-ia motion-pulse-ambient"
          />
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {estado === "recarregando"
              ? "Ativando ambiente local…"
              : "Inicializando ambiente local"}
          </span>
        </div>
      </div>
    );
  }

  if (estado === "erro") {
    return (
      <div
        role="alert"
        className="flex min-h-screen items-center justify-center bg-background p-6"
      >
        <div className="max-w-md rounded-xl border border-destructive/40 bg-destructive-muted p-6">
          <p className="font-mono text-[11px] uppercase tracking-wider text-destructive">
            Falha ao iniciar mock
          </p>
          <p className="mt-3 font-serif text-xl text-foreground">
            Não consegui registrar o mock service worker.
          </p>
          {mensagemErro && (
            <p className="mt-3 font-mono text-xs text-muted-foreground">
              {mensagemErro}
            </p>
          )}
          <p className="mt-4 text-sm text-muted-foreground">
            Tenta um hard reload (Cmd+Shift+R). Se persistir, abre o DevTools →
            Application → Service Workers → Unregister e recarrega.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
