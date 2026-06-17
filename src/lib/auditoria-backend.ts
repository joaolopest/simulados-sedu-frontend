// Registra ações na trilha de auditoria do backend (Python). Substitui o
// registrarAuditoria em memória de @/lib/auditoria nas rotas BFF.
//
// O ator é sempre o dono do token (o backend ignora qualquer ator do cliente).
// Falhas são silenciosas: auditoria nunca deve quebrar a ação principal.

import { backendFetch } from "@/lib/backend";

export interface EntradaAuditoria {
  tipo: string;
  alvoTipo?: string;
  alvoId?: string;
  detalhes?: string;
}

export async function registrarAuditoria(
  token: string | null,
  entrada: EntradaAuditoria,
): Promise<void> {
  try {
    await backendFetch("/auditoria", {
      method: "POST",
      token,
      body: {
        tipo: entrada.tipo,
        alvo_tipo: entrada.alvoTipo,
        alvo_id: entrada.alvoId,
        detalhes: entrada.detalhes,
      },
    });
  } catch {
    /* silencioso — não propaga falha de auditoria */
  }
}
