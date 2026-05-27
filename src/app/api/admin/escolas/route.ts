import { NextResponse } from "next/server";
import { mockEscolas, mockUsuarios } from "@/lib/mocks";
import { registrarAuditoria } from "@/lib/auditoria";
import type { Escola } from "@/types";

export async function GET(request: Request): Promise<NextResponse> {
  await new Promise((r) => setTimeout(r, 150 + Math.random() * 250));
  const url = new URL(request.url);
  const busca = url.searchParams.get("busca")?.toLowerCase() ?? "";
  const apenasAtivas = url.searchParams.get("ativas") === "true";

  let lista = mockEscolas;
  if (busca) {
    lista = lista.filter(
      (e) =>
        e.nome.toLowerCase().includes(busca) ||
        e.municipio.toLowerCase().includes(busca) ||
        e.codigoInep.includes(busca),
    );
  }
  if (apenasAtivas) {
    lista = lista.filter((e) => e.ativa);
  }

  const enriquecidas = lista.map((e) => {
    const gestores = mockUsuarios.filter(
      (u) => u.perfil === "gestor" && e.gestorIds.includes(u.id),
    );
    return { ...e, gestores };
  });

  return NextResponse.json({ dados: enriquecidas });
}

export async function POST(request: Request): Promise<NextResponse> {
  await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));

  let body: Partial<Escola>;
  try {
    body = (await request.json()) as Partial<Escola>;
  } catch {
    return NextResponse.json(
      { codigo: "CORPO_INVALIDO", mensagem: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  if (!body.nome || !body.codigoInep || !body.municipio || !body.uf) {
    return NextResponse.json(
      {
        codigo: "CAMPOS_OBRIGATORIOS",
        mensagem:
          "nome, codigoInep, municipio e uf são obrigatórios.",
      },
      { status: 422 },
    );
  }

  if (mockEscolas.some((e) => e.codigoInep === body.codigoInep)) {
    return NextResponse.json(
      {
        codigo: "INEP_DUPLICADO",
        mensagem: "Já existe uma escola com este código INEP.",
      },
      { status: 409 },
    );
  }

  const agora = new Date().toISOString();
  const nova: Escola = {
    id: `esc_${Date.now().toString(36)}`,
    nome: body.nome,
    codigoInep: body.codigoInep,
    municipio: body.municipio,
    uf: body.uf.toUpperCase(),
    endereco: body.endereco ?? "",
    cep: body.cep ?? "",
    telefone: body.telefone,
    emailContato: body.emailContato,
    diretorId: body.diretorId,
    gestorIds: body.gestorIds ?? [],
    totalAlunos: body.totalAlunos ?? 0,
    totalTurmas: body.totalTurmas ?? 0,
    totalProfessores: body.totalProfessores ?? 0,
    ativa: body.ativa ?? true,
    criadaEm: agora,
    atualizadaEm: agora,
  };

  mockEscolas.push(nova);

  registrarAuditoria({
    tipo: "criar_escola",
    usuarioId: "usu_001",
    usuarioNome: "Renata Albuquerque Cardoso",
    alvoTipo: "escola",
    alvoId: nova.id,
    detalhes: `Cadastrou escola ${nova.nome} (INEP ${nova.codigoInep})`,
  });

  return NextResponse.json({ ...nova, gestores: [] }, { status: 201 });
}
