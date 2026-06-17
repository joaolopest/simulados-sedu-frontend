import { NextResponse } from "next/server";
import { registrarAuditoria } from "@/lib/auditoria-backend";
import { tokenDaRequisicao } from "@/lib/backend";

export async function POST(request: Request): Promise<NextResponse> {
  await registrarAuditoria(tokenDaRequisicao(request), {
    tipo: "logout",
    alvoTipo: "sessao",
    detalhes: "Usuario saiu da plataforma",
  });
  return NextResponse.json({ ok: true });
}
