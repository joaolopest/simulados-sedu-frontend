import { NextResponse } from "next/server";
import { mockQuestoes } from "@/lib/mocks";
import { registrarAuditoria } from "@/lib/auditoria";
import type { Questao } from "@/types";

export async function GET(request: Request): Promise<NextResponse> {
  await new Promise((r) => setTimeout(r, 150 + Math.random() * 250));
  const url = new URL(request.url);
  const busca = url.searchParams.get("busca")?.toLowerCase() ?? "";
  const series = url.searchParams.getAll("serie");
  const materias = url.searchParams.getAll("materia");
  const niveis = url.searchParams.getAll("nivel");
  const adaptacoes = url.searchParams.getAll("adaptacao");
  const status = url.searchParams.getAll("status");
  const pagina = parseInt(url.searchParams.get("pagina") ?? "1", 10);
  const porPagina = parseInt(url.searchParams.get("porPagina") ?? "20", 10);

  let lista: Questao[] = mockQuestoes;
  if (busca) {
    lista = lista.filter((q) => q.enunciado.toLowerCase().includes(busca));
  }
  if (series.length) lista = lista.filter((q) => series.includes(q.serie));
  if (materias.length) lista = lista.filter((q) => materias.includes(q.materia));
  if (niveis.length) lista = lista.filter((q) => niveis.includes(q.nivel));
  if (status.length) lista = lista.filter((q) => status.includes(q.status));
  if (adaptacoes.length) {
    lista = lista.filter((q) =>
      q.adaptacoes.some((a) => adaptacoes.includes(a)),
    );
  }

  const total = lista.length;
  const inicio = (pagina - 1) * porPagina;
  const dados = lista.slice(inicio, inicio + porPagina);

  return NextResponse.json({
    dados,
    meta: {
      pagina,
      porPagina,
      total,
      totalPaginas: Math.ceil(total / porPagina),
    },
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));
  const body = (await request.json()) as Partial<Questao>;
  const nova: Questao = {
    ...body,
    id: `que_${Date.now().toString(36)}`,
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
    versao: 1,
  } as Questao;
  mockQuestoes.push(nova);

  registrarAuditoria({
    tipo: "criar_questao",
    usuarioId: nova.criadoPor ?? "usu_001",
    usuarioNome: "Renata Albuquerque Cardoso",
    alvoTipo: "questao",
    alvoId: nova.id,
    detalhes: `Cadastrou questão de ${nova.materia} (${nova.nivel})`,
  });
  if (nova.status === "publicada") {
    registrarAuditoria({
      tipo: "publicar_questao",
      usuarioId: nova.criadoPor ?? "usu_001",
      usuarioNome: "Renata Albuquerque Cardoso",
      alvoTipo: "questao",
      alvoId: nova.id,
      detalhes: `Publicou questão recém-criada de ${nova.materia}`,
    });
  }

  return NextResponse.json(nova, { status: 201 });
}
