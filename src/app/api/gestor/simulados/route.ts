import { NextResponse } from "next/server";
import { mockSimulados } from "@/lib/mocks";
import type {
  ParametrosSimulado,
  Simulado,
  StatusSimulado,
} from "@/types";

export async function GET(request: Request): Promise<NextResponse> {
  await new Promise((r) => setTimeout(r, 150 + Math.random() * 250));

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const busca = url.searchParams.get("busca")?.toLowerCase() ?? "";

  let lista: Simulado[] = mockSimulados;

  if (status) {
    lista = lista.filter((s) => s.status === status);
  }
  if (busca) {
    lista = lista.filter((s) =>
      s.parametros.nome.toLowerCase().includes(busca),
    );
  }

  return NextResponse.json({ dados: lista });
}

export async function POST(request: Request): Promise<NextResponse> {
  await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));

  let parametros: ParametrosSimulado;
  try {
    parametros = (await request.json()) as ParametrosSimulado;
  } catch {
    return NextResponse.json(
      { codigo: "CORPO_INVALIDO", mensagem: "Corpo inválido." },
      { status: 400 },
    );
  }

  const id = `sim_${Date.now().toString(36)}`;
  const novo: Simulado = {
    id,
    parametros,
    questaoIds: [],
    status: "rascunho" as StatusSimulado,
    criadoPor: "usu_001",
    escolaId: "esc_001",
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  };

  return NextResponse.json(novo, { status: 201 });
}
