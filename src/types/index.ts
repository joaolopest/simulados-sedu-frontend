export * from "./usuario";
export * from "./questao";
export * from "./simulado";
export * from "./resposta";
export * from "./ia";
export * from "./escola";
export * from "./notificacao";

export interface RespostaApi<T> {
  dados: T;
  meta?: {
    pagina: number;
    porPagina: number;
    total: number;
    totalPaginas: number;
  };
}

export interface ErroApi {
  codigo: string;
  mensagem: string;
  detalhes?: Record<string, unknown>;
}
