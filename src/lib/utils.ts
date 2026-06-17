import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Converte para Date de forma tolerante: aceita null/undefined/strings inválidas
// e devolve null nesses casos (em vez de "Invalid Date", que faz date-fns lançar).
function paraData(data: string | Date | null | undefined): Date | null {
  if (!data) return null;
  const d = data instanceof Date ? data : parseISO(data);
  return isValid(d) ? d : null;
}

export function formatarDataBR(
  data: string | Date | null | undefined,
  formato: string = "dd/MM/yyyy",
): string {
  const d = paraData(data);
  return d ? format(d, formato, { locale: ptBR }) : "—";
}

export function formatarDataHoraBR(data: string | Date | null | undefined): string {
  const d = paraData(data);
  return d ? format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : "—";
}

export function formatarTempoRelativo(data: string | Date | null | undefined): string {
  const d = paraData(data);
  return d ? formatDistanceToNow(d, { addSuffix: true, locale: ptBR }) : "—";
}

export function formatarMinutosSegundos(totalSegundos: number): string {
  const seguros = Math.max(0, Math.floor(totalSegundos));
  const minutos = Math.floor(seguros / 60);
  const segundos = seguros % 60;
  return `${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;
}

export function formatarNota(nota: number, casas: number = 1): string {
  return nota.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

export function formatarPorcentagem(valor: number, casas: number = 0): string {
  return `${valor.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })}%`;
}

export function truncar(texto: string, max: number): string {
  if (texto.length <= max) return texto;
  if (max <= 1) return "…";
  return `${texto.slice(0, max - 1).trimEnd()}…`;
}

export function gerarIniciais(nome: string): string {
  const partes = nome
    .trim()
    .split(/\s+/)
    .filter((palavra) => palavra.length > 0);
  if (partes.length === 0) return "";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  const primeira = partes[0][0] ?? "";
  const ultima = partes[partes.length - 1][0] ?? "";
  return `${primeira}${ultima}`.toUpperCase();
}

export function calcularTendencia(
  serie: number[],
): "subindo" | "estavel" | "caindo" {
  if (serie.length < 2) return "estavel";
  const metade = Math.floor(serie.length / 2);
  const inicio = serie.slice(0, metade);
  const fim = serie.slice(metade);
  const mediaInicio =
    inicio.reduce((acumulador, valor) => acumulador + valor, 0) / inicio.length;
  const mediaFim =
    fim.reduce((acumulador, valor) => acumulador + valor, 0) / fim.length;
  const diferenca = mediaFim - mediaInicio;
  // Tolerância: 2% da média absoluta total para considerar estável.
  const escala = Math.max(Math.abs(mediaInicio), Math.abs(mediaFim), 1);
  const limiar = escala * 0.02;
  if (Math.abs(diferenca) <= limiar) return "estavel";
  return diferenca > 0 ? "subindo" : "caindo";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  ms: number,
): (...args: Parameters<T>) => void {
  let temporizador: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (temporizador !== null) clearTimeout(temporizador);
    temporizador = setTimeout(() => {
      temporizador = null;
      fn(...args);
    }, ms);
  };
}

export function validarCPF(cpf: string): boolean {
  const numeros = cpf.replace(/\D/g, "");
  if (numeros.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(numeros)) return false;

  const calcularDigito = (base: string, pesoInicial: number): number => {
    let soma = 0;
    for (let indice = 0; indice < base.length; indice += 1) {
      soma += Number(base[indice]) * (pesoInicial - indice);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  const digito1 = calcularDigito(numeros.slice(0, 9), 10);
  if (digito1 !== Number(numeros[9])) return false;
  const digito2 = calcularDigito(numeros.slice(0, 10), 11);
  if (digito2 !== Number(numeros[10])) return false;

  return true;
}

export function gerarIdAleatorio(prefixo: string): string {
  const sufixo = Math.random().toString(36).slice(2, 8);
  return `${prefixo}_${sufixo}`;
}
