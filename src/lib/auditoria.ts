import { mockAuditoria } from "@/lib/mocks";
import type { AcaoAuditoria } from "@/types";

/**
 * Helper pra registrar uma ação de auditoria nos mocks em memória.
 * Como os mocks são compartilhados entre requisições no server do Next,
 * fazer .unshift() aqui faz a próxima chamada GET /admin/auditoria
 * já enxergar o evento — refletindo "tempo real".
 *
 * NOTE: em produção esse helper viraria um INSERT na tabela audit_log
 * via repository.
 */
export function registrarAuditoria(
  acao: Omit<AcaoAuditoria, "id" | "ocorridoEm">,
): AcaoAuditoria {
  const evento: AcaoAuditoria = {
    ...acao,
    id: `aud_${Date.now().toString(36)}`,
    ocorridoEm: new Date().toISOString(),
  };
  mockAuditoria.unshift(evento);
  return evento;
}
