"use client";

import { useEffect, useState } from "react";

export function useConexaoOnline(): {
  online: boolean;
  ultimaMudancaEm: Date;
} {
  const [online, setOnline] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.navigator.onLine;
  });
  const [ultimaMudancaEm, setUltimaMudancaEm] = useState<Date>(
    () => new Date(),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const aoFicarOnline = (): void => {
      setOnline(true);
      setUltimaMudancaEm(new Date());
    };
    const aoFicarOffline = (): void => {
      setOnline(false);
      setUltimaMudancaEm(new Date());
    };

    window.addEventListener("online", aoFicarOnline);
    window.addEventListener("offline", aoFicarOffline);

    return () => {
      window.removeEventListener("online", aoFicarOnline);
      window.removeEventListener("offline", aoFicarOffline);
    };
  }, []);

  return { online, ultimaMudancaEm };
}
