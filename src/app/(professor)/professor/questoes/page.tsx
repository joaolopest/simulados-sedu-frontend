"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FilePlus2, Loader2, Search, ShieldQuestion } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAdminQuestoes } from "@/hooks/api/use-admin";
import { criar } from "@/lib/api";
import { NOMES_MATERIA, NOMES_NIVEL } from "@/lib/displays";
import type { Questao } from "@/types";

export default function PaginaProfessorQuestoes() {
  const [busca, setBusca] = useState("");
  const { data, isLoading } = useAdminQuestoes({
    busca: busca.trim() || undefined,
    porPagina: 50,
  });
  const questoes = data?.dados ?? [];

  const [alvo, setAlvo] = useState<Questao | null>(null);
  const [tipo, setTipo] = useState<"exclusao" | "edicao">("edicao");
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  function abrir(q: Questao) {
    setAlvo(q);
    setTipo("edicao");
    setMotivo("");
  }

  async function enviar() {
    if (!alvo || enviando) return;
    setEnviando(true);
    try {
      await criar(`/questoes/${alvo.id}/solicitar-revisao`, { tipo, motivo });
      toast.success("Pedido de revisão enviado aos administradores.");
      setAlvo(null);
    } catch {
      toast.error("Não foi possível enviar o pedido.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-6 md:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Painel do professor
          </p>
          <h1 className="font-serif text-2xl text-foreground md:text-3xl">
            Questões
          </h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            Adicione questões montando uma prova. Para apagar ou editar uma
            questão que você não criou, solicite revisão a um administrador.
          </p>
        </div>
        <Button asChild>
          <Link href="/professor/provas/nova">
            <FilePlus2 className="size-4" aria-hidden />
            Criar prova / questão
          </Link>
        </Button>
      </header>

      <div className="relative mt-6">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar questões por enunciado…"
          className="pl-8"
        />
      </div>

      <ul className="mt-4 space-y-2">
        {isLoading && (
          <li className="py-10 text-center text-sm text-muted-foreground">
            Carregando…
          </li>
        )}
        {!isLoading && questoes.length === 0 && (
          <li className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma questão encontrada.
          </li>
        )}
        {questoes.map((q) => (
          <li
            key={q.id}
            className="flex items-start gap-3 rounded-lg border border-border bg-card p-4"
          >
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm text-foreground">
                {q.enunciado}
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {NOMES_MATERIA[q.materia] ?? q.materia} ·{" "}
                {NOMES_NIVEL[q.nivel] ?? q.nivel} · {q.status}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => abrir(q)}
            >
              <ShieldQuestion className="size-3.5" aria-hidden />
              Solicitar revisão
            </Button>
          </li>
        ))}
      </ul>

      <Dialog open={alvo !== null} onOpenChange={(o) => !o && setAlvo(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">
              Solicitar revisão
            </DialogTitle>
            <DialogDescription className="line-clamp-2">
              {alvo?.enunciado}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de pedido</Label>
              <Select
                value={tipo}
                onValueChange={(v) => setTipo(v as "exclusao" | "edicao")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="edicao">Edição da questão</SelectItem>
                  <SelectItem value="exclusao">Exclusão da questão</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rev-motivo" className="text-xs">
                Motivo (opcional)
              </Label>
              <textarea
                id="rev-motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex.: enunciado ambíguo, alternativa incorreta, questão duplicada…"
                className="min-h-[80px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                maxLength={500}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAlvo(null)}
              disabled={enviando}
            >
              Cancelar
            </Button>
            <Button onClick={enviar} disabled={enviando}>
              {enviando ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              Enviar pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
