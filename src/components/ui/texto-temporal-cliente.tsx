"use client";

import { useSyncExternalStore } from "react";

import { saudacaoDoMomento } from "@/lib/displays";
import { formatarDataBR } from "@/lib/utils";

const assinarCliente = () => () => undefined;
const clienteHidratado = () => true;
const servidorNaoHidratado = () => false;

function useClienteHidratado(): boolean {
  return useSyncExternalStore(
    assinarCliente,
    clienteHidratado,
    servidorNaoHidratado,
  );
}

export function DataAtualCliente({
  formato,
  fallback = "Hoje",
}: {
  formato: string;
  fallback?: string;
}) {
  const hidratado = useClienteHidratado();
  return <>{hidratado ? formatarDataBR(new Date(), formato) : fallback}</>;
}

export function SaudacaoAtualCliente({ fallback = "Olá" }: { fallback?: string }) {
  const hidratado = useClienteHidratado();
  return <>{hidratado ? saudacaoDoMomento() : fallback}</>;
}
