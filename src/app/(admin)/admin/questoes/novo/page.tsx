"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useCriarQuestao } from "@/hooks/api/use-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  NOMES_ADAPTACAO,
  NOMES_MATERIA,
  NOMES_NIVEL,
  NOMES_SERIE,
} from "@/lib/displays";
import { gerarIdAleatorio } from "@/lib/utils";
import type {
  AdaptacaoCognitiva,
  Alternativa,
  Materia,
  NivelDificuldade,
  Questao,
  SerieEscolar,
} from "@/types";

const SERIES = Object.entries(NOMES_SERIE) as [SerieEscolar, string][];
const MATERIAS = Object.entries(NOMES_MATERIA) as [Materia, string][];
const NIVEIS = Object.entries(NOMES_NIVEL) as [NivelDificuldade, string][];
const ADAPTACOES = Object.entries(NOMES_ADAPTACAO) as [
  AdaptacaoCognitiva,
  string,
][];

const MIN_ALTERNATIVAS = 2;
const MAX_ALTERNATIVAS = 5;

function novaAlternativaVazia(ordem: number): Alternativa {
  return {
    id: gerarIdAleatorio("alt"),
    texto: "",
    correta: false,
    ordem,
  };
}

export default function PaginaNovaQuestao() {
  const router = useRouter();
  const criar = useCriarQuestao();

  const [enunciado, setEnunciado] = useState("");
  const [serie, setSerie] = useState<SerieEscolar>("9_fundamental");
  const [materia, setMateria] = useState<Materia>("portugues");
  const [conteudo, setConteudo] = useState("");
  const [nivel, setNivel] = useState<NivelDificuldade>("medio");
  const [adaptacoes, setAdaptacoes] = useState<AdaptacaoCognitiva[]>([]);
  const [tempo, setTempo] = useState(60);
  const [explicacao, setExplicacao] = useState("");
  const [alternativas, setAlternativas] = useState<Alternativa[]>([
    novaAlternativaVazia(0),
    novaAlternativaVazia(1),
    novaAlternativaVazia(2),
    novaAlternativaVazia(3),
  ]);

  function alterarAlternativaTexto(id: string, texto: string) {
    setAlternativas((atuais) =>
      atuais.map((a) => (a.id === id ? { ...a, texto } : a)),
    );
  }

  function marcarCorreta(id: string) {
    setAlternativas((atuais) =>
      atuais.map((a) => ({ ...a, correta: a.id === id })),
    );
  }

  function adicionarAlternativa() {
    if (alternativas.length >= MAX_ALTERNATIVAS) return;
    setAlternativas((atuais) => [
      ...atuais,
      novaAlternativaVazia(atuais.length),
    ]);
  }

  function removerAlternativa(id: string) {
    if (alternativas.length <= MIN_ALTERNATIVAS) return;
    setAlternativas((atuais) =>
      atuais
        .filter((a) => a.id !== id)
        .map((a, indice) => ({ ...a, ordem: indice })),
    );
  }

  function alternarAdaptacao(a: AdaptacaoCognitiva, marcada: boolean) {
    setAdaptacoes((atuais) =>
      marcada ? [...atuais, a] : atuais.filter((x) => x !== a),
    );
  }

  const enunciadoOk = enunciado.trim().length >= 10;
  const conteudoOk = conteudo.trim().length >= 2;
  const tempoOk = tempo >= 10 && tempo <= 600;
  const alternativasComTexto = alternativas.every(
    (a) => a.texto.trim().length > 0,
  );
  const temCorreta = alternativas.some((a) => a.correta);
  const formularioValido =
    enunciadoOk &&
    conteudoOk &&
    tempoOk &&
    alternativas.length >= MIN_ALTERNATIVAS &&
    alternativasComTexto &&
    temCorreta;

  function aoSubmeter(publicar: boolean) {
    if (!formularioValido) return;
    const corpo: Partial<Questao> = {
      enunciado: enunciado.trim(),
      serie,
      materia,
      conteudo: conteudo.trim(),
      nivel,
      adaptacoes,
      alternativas: alternativas.map((a, indice) => ({
        ...a,
        ordem: indice,
        texto: a.texto.trim(),
      })),
      tempoEstimadoSegundos: tempo,
      explicacao: explicacao.trim() || undefined,
      competencias: [],
      criadoPor: "usu_001",
      status: publicar ? "publicada" : "rascunho",
    };
    criar.mutate(corpo, {
      onSuccess: (questao) => {
        toast.success(
          publicar ? "Questão criada e publicada" : "Questão salva como rascunho",
        );
        router.push(`/admin/questoes/${questao.id}`);
      },
      onError: () => toast.error("Falha ao criar questão"),
    });
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 md:px-6 md:py-10">
      <Link
        href="/admin/questoes"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Voltar para questões
      </Link>

      <header className="mt-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Painel administrativo
        </p>
        <h1 className="mt-2 font-serif text-3xl tracking-tight md:text-4xl">
          Nova questão
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Preencha os campos abaixo. Você pode salvar como rascunho e refinar
          depois, ou publicar direto.
        </p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          aoSubmeter(false);
        }}
        className="mt-8 space-y-6"
        noValidate
      >
        {/* enunciado */}
        <section className="rounded-xl border border-border bg-card p-5">
          <Label htmlFor="form-enunciado" className="text-xs">
            Enunciado <span className="text-destructive">*</span>
          </Label>
          <textarea
            id="form-enunciado"
            value={enunciado}
            onChange={(e) => setEnunciado(e.target.value)}
            placeholder="Digite o enunciado da questão (mínimo 10 caracteres)..."
            className="mt-1.5 w-full min-h-[120px] resize-y rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-invalid={enunciado.length > 0 && !enunciadoOk}
            maxLength={2000}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {enunciado.length}/2000
          </p>
        </section>

        {/* metadados */}
        <section className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-card p-5 md:grid-cols-2">
          <div>
            <Label className="text-xs">
              Série <span className="text-destructive">*</span>
            </Label>
            <Select value={serie} onValueChange={(v) => setSerie(v as SerieEscolar)}>
              <SelectTrigger className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SERIES.map(([valor, rotulo]) => (
                  <SelectItem key={valor} value={valor}>
                    {rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">
              Matéria <span className="text-destructive">*</span>
            </Label>
            <Select value={materia} onValueChange={(v) => setMateria(v as Materia)}>
              <SelectTrigger className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MATERIAS.map(([valor, rotulo]) => (
                  <SelectItem key={valor} value={valor}>
                    {rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="form-conteudo" className="text-xs">
              Conteúdo / Tópico <span className="text-destructive">*</span>
            </Label>
            <Input
              id="form-conteudo"
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              placeholder="ex.: Função afim"
              className="mt-1.5"
              aria-invalid={conteudo.length > 0 && !conteudoOk}
            />
          </div>
          <div>
            <Label className="text-xs">
              Nível <span className="text-destructive">*</span>
            </Label>
            <Select value={nivel} onValueChange={(v) => setNivel(v as NivelDificuldade)}>
              <SelectTrigger className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NIVEIS.map(([valor, rotulo]) => (
                  <SelectItem key={valor} value={valor}>
                    {rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="form-tempo" className="text-xs">
              Tempo estimado (segundos) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="form-tempo"
              type="number"
              min={10}
              max={600}
              value={tempo}
              onChange={(e) => setTempo(parseInt(e.target.value || "0", 10))}
              className="mt-1.5"
              aria-invalid={!tempoOk}
            />
          </div>
        </section>

        {/* alternativas */}
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">
              Alternativas <span className="text-destructive">*</span> (
              {alternativas.length}/{MAX_ALTERNATIVAS})
            </Label>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={adicionarAlternativa}
              disabled={alternativas.length >= MAX_ALTERNATIVAS}
            >
              <Plus className="size-3" />
              Adicionar
            </Button>
          </div>
          <ul className="mt-3 space-y-2">
            {alternativas.map((alt, indice) => (
              <li
                key={alt.id}
                className="flex items-start gap-2 rounded-md border border-border bg-background p-3"
              >
                <button
                  type="button"
                  onClick={() => marcarCorreta(alt.id)}
                  className={`mt-1 inline-flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-colors ${
                    alt.correta
                      ? "border-success bg-success-muted text-success"
                      : "border-border text-muted-foreground hover:border-success/50"
                  }`}
                  aria-label={alt.correta ? "Alternativa correta" : "Marcar como correta"}
                  aria-pressed={alt.correta}
                >
                  {String.fromCharCode(65 + indice)}
                </button>
                <Input
                  value={alt.texto}
                  onChange={(e) => alterarAlternativaTexto(alt.id, e.target.value)}
                  placeholder={`Texto da alternativa ${String.fromCharCode(65 + indice)}`}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removerAlternativa(alt.id)}
                  disabled={alternativas.length <= MIN_ALTERNATIVAS}
                  aria-label="Remover alternativa"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
          {!temCorreta && alternativasComTexto && (
            <p className="mt-2 text-xs text-destructive">
              Marque uma alternativa como correta clicando no círculo da letra.
            </p>
          )}
        </section>

        {/* adaptações */}
        <section className="rounded-xl border border-border bg-card p-5">
          <Label className="text-xs">Adaptações aceitas (opcional)</Label>
          <div className="mt-3 flex flex-wrap gap-3">
            {ADAPTACOES.map(([valor, rotulo]) => (
              <label
                key={valor}
                className="inline-flex items-center gap-2 cursor-pointer"
              >
                <Checkbox
                  checked={adaptacoes.includes(valor)}
                  onCheckedChange={(v) => alternarAdaptacao(valor, v === true)}
                />
                <span className="text-sm">{rotulo}</span>
              </label>
            ))}
          </div>
        </section>

        {/* explicação */}
        <section className="rounded-xl border border-border bg-card p-5">
          <Label htmlFor="form-explicacao" className="text-xs">
            Explicação / Gabarito (opcional)
          </Label>
          <textarea
            id="form-explicacao"
            value={explicacao}
            onChange={(e) => setExplicacao(e.target.value)}
            placeholder="Explicação da resposta correta. Útil para feedback ao aluno."
            className="mt-1.5 w-full min-h-[80px] resize-y rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            maxLength={1000}
          />
        </section>

        {/* ações */}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/questoes")}
            disabled={criar.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="outline"
            disabled={!formularioValido || criar.isPending}
          >
            {criar.isPending ? "Salvando..." : "Salvar como rascunho"}
          </Button>
          <Button
            type="button"
            disabled={!formularioValido || criar.isPending}
            onClick={() => aoSubmeter(true)}
          >
            {criar.isPending ? "Publicando..." : "Criar e publicar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
