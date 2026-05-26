// Singleton resistente a HMR — anexa a globalThis pra sobreviver
// re-imports do módulo durante hot reload em dev.
declare global {
  // eslint-disable-next-line no-var
  var __mswInicioPromise: Promise<void> | undefined;
}

export async function iniciarMSW(): Promise<void> {
  if (typeof window === "undefined") return;
  if (process.env.NODE_ENV !== "development") return;

  if (globalThis.__mswInicioPromise) {
    return globalThis.__mswInicioPromise;
  }

  globalThis.__mswInicioPromise = (async () => {
    const { worker } = await import("./browser");

    await worker.start({
      onUnhandledRequest(request, print) {
        const url = new URL(request.url);
        // ignora ruído interno do Next/Turbopack/HMR
        if (
          url.pathname.startsWith("/_next/") ||
          url.pathname.startsWith("/__nextjs") ||
          url.pathname === "/favicon.ico" ||
          url.pathname === "/mockServiceWorker.js" ||
          url.pathname.endsWith(".hot-update.json")
        ) {
          return;
        }
        if (url.pathname.startsWith("/api/")) {
          print.warning();
        }
      },
      serviceWorker: {
        url: "/mockServiceWorker.js",
        options: { scope: "/" },
      },
      quiet: false,
    });

    console.info(
      "%c[Simulados SEDU] MSW pronto — chamadas /api/* mockadas",
      "color:#6D28D9;font-weight:600",
    );
  })();

  try {
    await globalThis.__mswInicioPromise;
  } catch (erro) {
    globalThis.__mswInicioPromise = undefined;
    throw erro;
  }
}
