// Exporta os mocks do frontend para um JSON que o backend Python consome
// pra popular o Supabase. Rode com: npx tsx scripts/export-mocks.ts
import { writeFileSync } from "node:fs";
import {
  mockUsuarios,
  mockEscolas,
  mockTurmas,
  mockQuestoes,
  mockSimulados,
  mockResultados,
} from "../src/lib/mocks";

const dados = {
  usuarios: mockUsuarios,
  escolas: mockEscolas,
  turmas: mockTurmas,
  questoes: mockQuestoes,
  simulados: mockSimulados,
  resultados: mockResultados,
};

const saida = "backend/scripts/_mocks_export.json";
writeFileSync(saida, JSON.stringify(dados, null, 2), "utf-8");

console.log("Exportado para", saida);
console.log("  usuarios:", mockUsuarios.length);
console.log("  escolas: ", mockEscolas.length);
console.log("  turmas:  ", mockTurmas.length);
console.log("  questoes:", mockQuestoes.length);
console.log("  simulados:", mockSimulados.length);
console.log("  resultados:", mockResultados.length);
