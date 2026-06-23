"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  File as FileIcon,
  RotateCcw,
  Upload,
  XCircle,
} from "lucide-react";
import Papa from "papaparse";
import { toast } from "sonner";

import {
  useImportarQuestoes,
  useValidarImportacaoQuestoes,
  type PayloadImportacaoQuestoes,
} from "@/hooks/api/use-admin";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, truncar } from "@/lib/utils";
import type { ResultadoImportacao } from "@/types";

type Estado = "ocioso" | "processando" | "resultado";

const ETAPAS: { ate: number; rotulo: string }[] = [
  { ate: 30, rotulo: "Lendo arquivo JSON..." },
  { ate: 65, rotulo: "Validando schema no backend..." },
  { ate: 100, rotulo: "Importando para o banco..." },
];

function normalizarQuestaoImportacao(item: unknown): Record<string, unknown> {
  if (!item || typeof item !== "object") return {};
  const q = { ...(item as Record<string, unknown>) };
  const etiquetas =
    q.etiquetas && typeof q.etiquetas === "object"
      ? (q.etiquetas as Record<string, unknown>)
      : null;

  if (etiquetas) {
    q.serie ??= etiquetas.serie;
    q.materia ??= etiquetas.materia;
    q.conteudo ??= etiquetas.conteudo;
    q.nivel ??= etiquetas.nivel;
  }
  if (q.imagemUrl === undefined && q.imagem_url !== undefined) {
    q.imagemUrl = q.imagem_url;
  }
  return q;
}

function montarPayloadImportacao(
  json: unknown,
  arquivoNome: string,
): PayloadImportacaoQuestoes {
  const bruto = Array.isArray(json)
    ? json
    : json && typeof json === "object"
      ? (json as Record<string, unknown>).questoes
      : null;

  if (!Array.isArray(bruto)) {
    throw new Error(
      "O JSON precisa ser um array de questões ou um objeto com a chave 'questoes'.",
    );
  }

  return {
    arquivoNome,
    totalLinhas: bruto.length,
    questoes: bruto.map(normalizarQuestaoImportacao),
  };
}

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function PaginaImportarQuestoes() {
  const [estado, setEstado] = useState<Estado>("ocioso");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [progresso, setProgresso] = useState<number>(0);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);

  const importar = useImportarQuestoes();
  const validar = useValidarImportacaoQuestoes();

  const etapaAtual = useMemo(() => {
    return ETAPAS.find((e) => progresso <= e.ate) ?? ETAPAS[ETAPAS.length - 1];
  }, [progresso]);

  // Progresso visual enquanto o arquivo é lido, validado e importado.
  useEffect(() => {
    if (estado !== "processando") return;
    const intervalo = setInterval(() => {
      setProgresso((p) => {
        if (p >= 95) return p;
        return Math.min(95, p + Math.random() * 8);
      });
    }, 200);
    return () => clearInterval(intervalo);
  }, [estado]);

  const aoSoltar = useCallback(
    (aceitos: File[], rejeitados: FileRejection[]) => {
      if (rejeitados.length > 0) {
        toast.error("Aceitamos apenas arquivos .json");
        return;
      }
      if (aceitos.length === 0) return;
      const arq = aceitos[0];
      setArquivo(arq);
      setEstado("processando");
      setProgresso(0);

      void (async () => {
        try {
          const texto = await arq.text();
          setProgresso(25);
          const json = JSON.parse(texto) as unknown;
          const payload = montarPayloadImportacao(json, arq.name);
          setProgresso(45);

          const relatorioValidacao = await validar.mutateAsync(payload);
          setProgresso(70);

          if (!relatorioValidacao.valido) {
            const agora = new Date().toISOString();
            setResultado({
              totalLinhas: relatorioValidacao.totalLinhas,
              importadas: 0,
              rejeitadas: relatorioValidacao.rejeitadas,
              iniciadoEm: agora,
              finalizadoEm: agora,
            });
            setProgresso(100);
            setTimeout(() => {
              setEstado("resultado");
              toast.error("Arquivo validado com rejeições. Nada foi gravado.");
            }, 300);
            return;
          }

          const dados = await importar.mutateAsync(payload);
          setProgresso(100);
          setResultado(dados);
          setTimeout(() => {
            setEstado("resultado");
            toast.success(
              `${dados.importadas} de ${dados.totalLinhas} questões importadas`,
            );
          }, 400);
        } catch (erro) {
          toast.error(
            erro instanceof Error
              ? erro.message
              : "Falha na importação. Tenta de novo.",
          );
          setEstado("ocioso");
          setArquivo(null);
          setProgresso(0);
        }
      })();
    },
    [importar, validar],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: aoSoltar,
    accept: { "application/json": [".json"] },
    multiple: false,
    disabled: estado !== "ocioso",
  });

  function reiniciar() {
    setEstado("ocioso");
    setArquivo(null);
    setProgresso(0);
    setResultado(null);
  }

  function baixarRelatorioCSV() {
    if (!resultado) return;
    const csv = Papa.unparse(
      resultado.rejeitadas.map((r) => ({
        linha: r.linha,
        campo: r.campo,
        motivo: r.motivo,
        valor: typeof r.valor === "string" ? r.valor : JSON.stringify(r.valor),
      })),
      { columns: ["linha", "campo", "motivo", "valor"] },
    );
    // BOM UTF-8 pra abrir corretamente no Excel
    const blob = new Blob(["﻿", csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rejeitadas-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Relatório baixado");
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 md:px-6 md:py-10">
      {/* Header */}
      <header>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/admin/questoes">
            <ArrowLeft data-icon="inline-start" />
            Voltar
          </Link>
        </Button>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Painel administrativo · Lote
        </p>
        <h1
          className="mt-2 font-serif text-3xl tracking-tight md:text-4xl"
        >
          Importar questões
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
          Sobe um arquivo JSON com o lote. A gente valida schema, aplica
          adaptações cognitivas e devolve relatório do que foi rejeitado.
        </p>
      </header>

      {/* Estado: ocioso */}
      {estado === "ocioso" && (
        <section className="mt-8">
          <div
            {...getRootProps()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-card px-6 py-16 text-center transition-colors",
              "[transition-timing-function:var(--ease-quart)]",
              isDragActive
                ? "border-primary bg-primary-muted"
                : "border-border hover:border-primary/50 hover:bg-muted/30",
            )}
            role="button"
            aria-label="Área de upload de arquivo JSON"
            tabIndex={0}
          >
            <input {...getInputProps()} aria-label="Selecionar arquivo JSON" />
            <div className="flex size-16 items-center justify-center rounded-2xl bg-primary-muted text-primary-text">
              <Upload className="size-7" aria-hidden />
            </div>
            <p
              className="mt-5 font-serif text-xl tracking-tight"
            >
              {isDragActive
                ? "Solta aqui"
                : "Solte o arquivo aqui ou clique pra selecionar"}
            </p>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Aceitamos apenas arquivos <code className="font-mono">.json</code>{" "}
              com lote único.
            </p>
            {arquivo && (
              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5">
                <FileIcon className="size-3.5 text-muted-foreground" aria-hidden />
                <span className="text-xs">{arquivo.name}</span>
                <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                  {formatarTamanho(arquivo.size)}
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Estado: processando */}
      {estado === "processando" && (
        <section className="mt-8 rounded-2xl border border-border bg-card p-8">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary-muted text-primary-text">
              <FileIcon className="size-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="truncate font-mono text-xs">{arquivo?.name}</p>
              {arquivo && (
                <p className="font-mono text-[10px] text-muted-foreground tabular-nums">
                  {formatarTamanho(arquivo.size)}
                </p>
              )}
            </div>
          </div>
          <Progress value={progresso} className="mt-6" />
          <div className="mt-3 flex items-center justify-between font-mono text-[11px] uppercase tracking-wider tabular-nums">
            <span className="text-muted-foreground">{etapaAtual.rotulo}</span>
            <span className="text-foreground">{Math.floor(progresso)}%</span>
          </div>
        </section>
      )}

      {/* Estado: resultado */}
      {estado === "resultado" && resultado && (
        <section className="mt-8 space-y-4">
          {/* Card sucesso */}
          <div className="rounded-2xl border border-success/30 bg-success-muted p-8">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success">
                <CheckCircle2 className="size-7" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-success">
                  Sucesso
                </p>
                <p
                  className="mt-2 font-serif text-4xl tabular-nums tracking-tight text-success md:text-5xl"
                >
                  {resultado.importadas}
                </p>
                <p className="mt-1 text-sm text-success">
                  {resultado.importadas === 1
                    ? "questão importada"
                    : "questões importadas"}{" "}
                  de {resultado.totalLinhas} no lote
                </p>
              </div>
            </div>
          </div>

          {/* Card rejeitadas */}
          {resultado.rejeitadas.length > 0 && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive-muted">
              <Accordion type="single" collapsible>
                <AccordionItem
                  value="rejeitadas"
                  className="border-b-0"
                >
                  <AccordionTrigger className="px-6 py-5 hover:no-underline">
                    <div className="flex items-center gap-4">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
                        <XCircle className="size-5" aria-hidden />
                      </div>
                      <div className="text-left">
                        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-destructive">
                          Atenção
                        </p>
                        <p
                          className="mt-1 font-serif text-2xl tabular-nums tracking-tight text-destructive"
                        >
                          {resultado.rejeitadas.length} rejeitadas
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6">
                    {/* Desktop tabela */}
                    <div className="hidden overflow-hidden rounded-xl border border-destructive/20 bg-background md:block">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-destructive/20">
                            <TableHead className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                              Linha
                            </TableHead>
                            <TableHead className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                              Campo
                            </TableHead>
                            <TableHead className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                              Motivo
                            </TableHead>
                            <TableHead className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                              Valor
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {resultado.rejeitadas.map((r, i) => (
                            <TableRow
                              key={`${r.linha}-${r.campo}-${i}`}
                              className="border-destructive/10"
                            >
                              <TableCell className="font-mono text-xs tabular-nums">
                                {r.linha}
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {r.campo}
                              </TableCell>
                              <TableCell className="text-sm">
                                {r.motivo}
                              </TableCell>
                              <TableCell className="max-w-xs truncate font-mono text-xs text-muted-foreground">
                                {truncar(
                                  typeof r.valor === "string"
                                    ? r.valor
                                    : JSON.stringify(r.valor),
                                  60,
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {/* Mobile lista */}
                    <ul className="space-y-2 md:hidden">
                      {resultado.rejeitadas.map((r, i) => (
                        <li
                          key={`${r.linha}-${r.campo}-${i}`}
                          className="rounded-lg border border-destructive/20 bg-background p-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                              Linha {r.linha} · {r.campo}
                            </span>
                          </div>
                          <p className="mt-1 text-sm">{r.motivo}</p>
                          <p className="mt-1 font-mono text-xs text-muted-foreground">
                            {truncar(
                              typeof r.valor === "string"
                                ? r.valor
                                : JSON.stringify(r.valor),
                              80,
                            )}
                          </p>
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={baixarRelatorioCSV}
                    >
                      <Download data-icon="inline-start" />
                      Baixar relatório CSV
                    </Button>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={reiniciar} variant="outline">
              <RotateCcw data-icon="inline-start" />
              Importar outro arquivo
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
