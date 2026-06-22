"use client";

import Image from "next/image";
import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  GripVertical,
  ImagePlus,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  useAdminQuestao,
  useAtualizarQuestao,
} from "@/hooks/api/use-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import { cn, formatarDataBR, gerarIdAleatorio } from "@/lib/utils";
import type {
  AdaptacaoCognitiva,
  Alternativa,
  Materia,
  NivelDificuldade,
  Questao,
  SerieEscolar,
  StatusQuestao,
} from "@/types";

const SERIES = Object.entries(NOMES_SERIE) as [SerieEscolar, string][];
const MATERIAS = Object.entries(NOMES_MATERIA) as [Materia, string][];
const ADAPTACOES = Object.entries(NOMES_ADAPTACAO) as [
  AdaptacaoCognitiva,
  string,
][];

const TOM_NIVEL: Record<NivelDificuldade, string> = {
  facil: "border-success bg-success-muted text-success",
  medio: "border-warning bg-warning-muted text-warning",
  dificil: "border-destructive bg-destructive-muted text-destructive",
};

const TOM_STATUS: Record<StatusQuestao, string> = {
  rascunho: "bg-muted text-muted-foreground",
  em_revisao: "bg-warning-muted text-warning",
  publicada: "bg-success-muted text-success",
  arquivada: "bg-destructive-muted text-destructive",
};

const MAX_ENUNCIADO = 2000;
const MAX_ALTERNATIVAS = 5;
const MIN_ALTERNATIVAS = 2;
const URL_IMAGEM_VALIDA = /^(https?:\/\/|\/)/;

export default function PaginaEditarQuestao({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useAdminQuestao(id);
  const atualizar = useAtualizarQuestao();

  const [enunciado, setEnunciado] = useState<string>("");
  const [imagemUrl, setImagemUrl] = useState<string | undefined>(undefined);
  const [alternativas, setAlternativas] = useState<Alternativa[]>([]);
  const [explicacao, setExplicacao] = useState<string>("");
  const [serie, setSerie] = useState<SerieEscolar>("1_fundamental");
  const [materia, setMateria] = useState<Materia>("portugues");
  const [conteudo, setConteudo] = useState<string>("");
  const [nivel, setNivel] = useState<NivelDificuldade>("medio");
  const [adaptacoes, setAdaptacoes] = useState<AdaptacaoCognitiva[]>([]);
  const [tempo, setTempo] = useState<number>(60);
  const [competenciasTexto, setCompetenciasTexto] = useState<string>("");

  // Hidrata estado quando dados chegarem
  useEffect(() => {
    if (!data) return;
    const idTimeout = window.setTimeout(() => {
      setEnunciado(data.enunciado);
      setImagemUrl(data.imagemUrl);
      setAlternativas(data.alternativas);
      setExplicacao(data.explicacao ?? "");
      setSerie(data.serie);
      setMateria(data.materia);
      setConteudo(data.conteudo);
      setNivel(data.nivel);
      setAdaptacoes(data.adaptacoes);
      setTempo(data.tempoEstimadoSegundos);
      setCompetenciasTexto(data.competencias.join(", "));
    }, 0);
    return () => window.clearTimeout(idTimeout);
  }, [data]);

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function aoArrastarFim(evento: DragEndEvent) {
    const { active, over } = evento;
    if (!over || active.id === over.id) return;
    setAlternativas((atuais) => {
      const oldIndex = atuais.findIndex((a) => a.id === active.id);
      const newIndex = atuais.findIndex((a) => a.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return atuais;
      return arrayMove(atuais, oldIndex, newIndex).map((a, i) => ({
        ...a,
        ordem: i,
      }));
    });
  }

  function alterarAlternativa(idAlt: string, texto: string) {
    setAlternativas((atuais) =>
      atuais.map((a) => (a.id === idAlt ? { ...a, texto } : a)),
    );
  }

  function marcarCorreta(idAlt: string) {
    setAlternativas((atuais) =>
      atuais.map((a) => ({ ...a, correta: a.id === idAlt })),
    );
  }

  function removerAlternativa(idAlt: string) {
    if (alternativas.length <= MIN_ALTERNATIVAS) return;
    setAlternativas((atuais) =>
      atuais
        .filter((a) => a.id !== idAlt)
        .map((a, i) => ({ ...a, ordem: i })),
    );
  }

  function adicionarAlternativa() {
    if (alternativas.length >= MAX_ALTERNATIVAS) return;
    setAlternativas((atuais) => [
      ...atuais,
      {
        id: gerarIdAleatorio("alt"),
        texto: "",
        correta: false,
        ordem: atuais.length,
      },
    ]);
  }

  function alternarAdaptacao(adapt: AdaptacaoCognitiva) {
    setAdaptacoes((atuais) =>
      atuais.includes(adapt)
        ? atuais.filter((a) => a !== adapt)
        : [...atuais, adapt],
    );
  }

  const competencias = useMemo(
    () =>
      competenciasTexto
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    [competenciasTexto],
  );

  function montarPayload(status: StatusQuestao): Partial<Questao> {
    return {
      enunciado,
      imagemUrl,
      alternativas,
      explicacao: explicacao || undefined,
      serie,
      materia,
      conteudo,
      nivel,
      adaptacoes,
      tempoEstimadoSegundos: tempo,
      competencias,
      status,
    };
  }

  function salvar(status: StatusQuestao) {
    if (imagemUrl && !URL_IMAGEM_VALIDA.test(imagemUrl)) {
      toast.error("Informe uma URL de imagem válida ou remova a imagem.");
      return;
    }
    atualizar.mutate(
      { id, dados: montarPayload(status) },
      {
        onSuccess: () => {
          toast.success(
            status === "publicada"
              ? "Questão publicada"
              : "Rascunho salvo",
          );
          router.push("/admin/questoes");
        },
        onError: () => toast.error("Falha ao salvar. Tenta de novo."),
      },
    );
  }

  // Loading
  if (isLoading || !data) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="mt-6 h-12 w-2/3" />
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <Skeleton className="h-96 md:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-12 md:px-6">
        <div
          className="rounded-xl border border-destructive/30 bg-destructive-muted p-6 text-destructive"
          role="alert"
        >
          <p className="font-mono text-[10px] uppercase tracking-wider">
            Erro ao carregar questão
          </p>
          <p className="mt-2 text-sm">
            Não consegui buscar os dados dessa questão.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => refetch()}
          >
            Tentar de novo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-28">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-10">
        {/* Header */}
        <header>
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href="/admin/questoes">
              <ArrowLeft data-icon="inline-start" />
              Voltar
            </Link>
          </Button>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Painel administrativo · Editor
            </p>
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-3">
            <h1
              className="font-serif text-3xl tracking-tight md:text-4xl"
            >
              Editar questão{" "}
              <span className="font-mono text-2xl text-muted-foreground tabular-nums md:text-3xl">
                {data.id}
              </span>
            </h1>
            <Badge variant="outline" className="font-mono">
              v{data.versao}
            </Badge>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                TOM_STATUS[data.status],
              )}
            >
              {data.status}
            </span>
          </div>
        </header>

        {/* Layout 2 colunas */}
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {/* Coluna esquerda */}
          <div className="space-y-6 md:col-span-2">
            {/* Enunciado */}
            <section className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="enunciado"
                  className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
                >
                  Enunciado
                </Label>
                <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                  {enunciado.length} / {MAX_ENUNCIADO}
                </span>
              </div>
              <textarea
                id="enunciado"
                value={enunciado}
                onChange={(e) =>
                  setEnunciado(e.target.value.slice(0, MAX_ENUNCIADO))
                }
                className="mt-2 min-h-[120px] w-full resize-y rounded-lg border border-input bg-transparent p-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                placeholder="Escreve o enunciado da questão..."
              />
            </section>

            {/* Imagem */}
            <DropzoneImagem
              imagemUrl={imagemUrl}
              aoMudar={setImagemUrl}
            />

            {/* Alternativas */}
            <section className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Alternativas
                </p>
                <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                  {alternativas.length} / {MAX_ALTERNATIVAS}
                </span>
              </div>
              <DndContext
                sensors={sensores}
                collisionDetection={closestCenter}
                onDragEnd={aoArrastarFim}
              >
                <SortableContext
                  items={alternativas.map((a) => a.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="mt-4 space-y-2">
                    {alternativas.map((alt, indice) => (
                      <ItemAlternativa
                        key={alt.id}
                        alternativa={alt}
                        indice={indice}
                        podeRemover={alternativas.length > MIN_ALTERNATIVAS}
                        aoMarcarCorreta={() => marcarCorreta(alt.id)}
                        aoMudarTexto={(t) => alterarAlternativa(alt.id, t)}
                        aoRemover={() => removerAlternativa(alt.id)}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
              {alternativas.length < MAX_ALTERNATIVAS && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={adicionarAlternativa}
                >
                  <Plus data-icon="inline-start" />
                  Adicionar alternativa
                </Button>
              )}
            </section>

            {/* Explicação */}
            <section className="rounded-xl border border-border bg-card p-5">
              <Label
                htmlFor="explicacao"
                className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
              >
                Explicação (opcional)
              </Label>
              <textarea
                id="explicacao"
                value={explicacao}
                onChange={(e) => setExplicacao(e.target.value)}
                className="mt-2 min-h-[80px] w-full resize-y rounded-lg border border-input bg-transparent p-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                placeholder="Texto pedagógico que aparece após a resolução..."
              />
            </section>
          </div>

          {/* Coluna direita */}
          <aside className="md:sticky md:top-6 md:self-start">
            <div className="space-y-6 rounded-xl border border-border bg-card p-5">
              {/* Série */}
              <div>
                <Label className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Série
                </Label>
                <Select
                  value={serie}
                  onValueChange={(v) => setSerie(v as SerieEscolar)}
                >
                  <SelectTrigger className="mt-2 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERIES.map(([v, r]) => (
                      <SelectItem key={v} value={v}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Matéria */}
              <div>
                <Label className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Matéria
                </Label>
                <Select
                  value={materia}
                  onValueChange={(v) => setMateria(v as Materia)}
                >
                  <SelectTrigger className="mt-2 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MATERIAS.map(([v, r]) => (
                      <SelectItem key={v} value={v}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Conteúdo */}
              <div>
                <Label
                  htmlFor="conteudo"
                  className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
                >
                  Conteúdo
                </Label>
                <Input
                  id="conteudo"
                  value={conteudo}
                  onChange={(e) => setConteudo(e.target.value)}
                  className="mt-2"
                  placeholder="Ex.: Frações equivalentes"
                />
              </div>

              {/* Nível */}
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Nível
                </p>
                <div
                  role="radiogroup"
                  aria-label="Nível de dificuldade"
                  className="mt-2 grid grid-cols-3 gap-1.5"
                >
                  {(Object.keys(NOMES_NIVEL) as NivelDificuldade[]).map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={nivel === n}
                      onClick={() => setNivel(n)}
                      className={cn(
                        "rounded-lg border px-2 py-1.5 text-xs transition-colors",
                        "[transition-timing-function:var(--ease-snap)]",
                        nivel === n
                          ? TOM_NIVEL[n]
                          : "border-border bg-background text-muted-foreground hover:border-foreground/30",
                      )}
                    >
                      {NOMES_NIVEL[n]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Adaptações */}
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Adaptações cognitivas
                </p>
                <div className="mt-2 space-y-2">
                  {ADAPTACOES.map(([v, r]) => (
                    <label
                      key={v}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={adaptacoes.includes(v)}
                        onCheckedChange={() => alternarAdaptacao(v)}
                        aria-label={r}
                      />
                      <span>{r}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Tempo */}
              <div>
                <Label
                  htmlFor="tempo"
                  className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
                >
                  Tempo estimado (segundos)
                </Label>
                <Input
                  id="tempo"
                  type="number"
                  min={10}
                  max={300}
                  value={tempo}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (!Number.isFinite(v)) return;
                    setTempo(Math.max(10, Math.min(300, Math.round(v))));
                  }}
                  className="mt-2 font-mono tabular-nums"
                />
              </div>

              {/* Competências */}
              <div>
                <Label
                  htmlFor="competencias"
                  className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
                >
                  Competências
                </Label>
                <Input
                  id="competencias"
                  value={competenciasTexto}
                  onChange={(e) => setCompetenciasTexto(e.target.value)}
                  className="mt-2"
                  placeholder="EF06MA01, EF06MA02..."
                />
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Separa por vírgula
                </p>
              </div>

              {/* Auditoria */}
              <div className="border-t border-border pt-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Auditoria
                </p>
                <p className="mt-1.5 text-[11px] text-muted-foreground tabular-nums">
                  Criada em {formatarDataBR(data.criadoEm)} · atualizada em{" "}
                  {formatarDataBR(data.atualizadoEm)}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Footer fixo */}
      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 md:left-[232px]">
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-2 px-4 py-3 md:px-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/admin/questoes")}
          >
            Cancelar
          </Button>
          <Button
            variant="outline"
            onClick={() => salvar("rascunho")}
            disabled={atualizar.isPending}
          >
            Salvar rascunho
          </Button>
          <Button
            onClick={() => salvar("publicada")}
            disabled={atualizar.isPending}
          >
            Publicar
          </Button>
        </div>
      </footer>
    </div>
  );
}

// ============================================================
// Item de alternativa (sortable)
// ============================================================

interface ItemAlternativaProps {
  alternativa: Alternativa;
  indice: number;
  podeRemover: boolean;
  aoMarcarCorreta: () => void;
  aoMudarTexto: (texto: string) => void;
  aoRemover: () => void;
}

function ItemAlternativa({
  alternativa,
  indice,
  podeRemover,
  aoMarcarCorreta,
  aoMudarTexto,
  aoRemover,
}: ItemAlternativaProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: alternativa.id });

  const estilo: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const letra = String.fromCharCode(65 + indice);

  return (
    <li
      ref={setNodeRef}
      style={estilo}
      className={cn(
        "flex items-start gap-2 rounded-lg border bg-background p-3 transition-shadow",
        alternativa.correta
          ? "border-success/40 bg-success-muted/40"
          : "border-border",
        isDragging && "shadow-lg",
      )}
    >
      <button
        type="button"
        aria-label="Reordenar"
        className="mt-1.5 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" aria-hidden />
      </button>
      <label className="mt-1.5 flex shrink-0 cursor-pointer items-center gap-2">
        <input
          type="radio"
          name="alternativa-correta"
          checked={alternativa.correta}
          onChange={aoMarcarCorreta}
          className="size-4 cursor-pointer accent-success"
          aria-label={`Alternativa ${letra} é a correta`}
        />
        <span className="font-mono text-xs text-muted-foreground">{letra}</span>
      </label>
      <textarea
        value={alternativa.texto}
        onChange={(e) => aoMudarTexto(e.target.value)}
        className="min-h-[40px] flex-1 resize-y rounded-md border border-input bg-transparent px-2 py-1.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        placeholder={`Texto da alternativa ${letra}`}
      />
      {podeRemover && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={aoRemover}
          aria-label="Remover alternativa"
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 />
        </Button>
      )}
    </li>
  );
}

// ============================================================
// Dropzone de imagem
// ============================================================

function DropzoneImagem({
  imagemUrl,
  aoMudar,
}: {
  imagemUrl: string | undefined;
  aoMudar: (url: string | undefined) => void;
}) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
    },
    multiple: false,
    onDrop: (aceitos) => {
      if (aceitos.length > 0) {
        toast.error(
          "Upload de arquivo ainda precisa do Storage. Cole uma URL pública da imagem.",
        );
      }
    },
  });

  const imagemPreviewValida = !!imagemUrl && URL_IMAGEM_VALIDA.test(imagemUrl);

  if (imagemUrl) {
    return (
      <section className="rounded-xl border border-border bg-card p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Imagem anexada
        </p>
        {imagemPreviewValida ? (
          <div className="mt-3 overflow-hidden rounded-lg border border-border">
            <div className="relative aspect-video max-h-80 w-full bg-muted">
              <Image
                src={imagemUrl}
                alt="Pré-visualização da imagem da questão"
                fill
                sizes="(min-width: 768px) 720px, calc(100vw - 2rem)"
                className="object-contain"
                unoptimized
              />
            </div>
          </div>
        ) : (
          <p className="mt-3 rounded-lg border border-warning/30 bg-warning-muted p-3 text-sm text-warning">
            URL inválida. Use um link que comece com http://, https:// ou /.
          </p>
        )}
        <Label
          htmlFor="imagem-url-edicao"
          className="mt-4 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
        >
          URL da imagem
        </Label>
        <Input
          id="imagem-url-edicao"
          value={imagemUrl}
          onChange={(e) => aoMudar(e.target.value.trim() || undefined)}
          className="mt-2"
          placeholder="https://exemplo.gov.br/imagem.png"
        />
        <Button
          variant="outline"
          size="sm"
          className="mt-3 text-destructive"
          onClick={() => aoMudar(undefined)}
        >
          <Trash2 data-icon="inline-start" />
          Remover imagem
        </Button>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <Label
        htmlFor="imagem-url-edicao"
        className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
      >
        URL da imagem (opcional)
      </Label>
      <Input
        id="imagem-url-edicao"
        value=""
        onChange={(e) => aoMudar(e.target.value.trim() || undefined)}
        className="mt-2"
        placeholder="https://exemplo.gov.br/imagem.png"
      />
      <div
        {...getRootProps()}
        className={cn(
          "mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-background px-5 py-8 text-center transition-colors",
          isDragActive
            ? "border-primary bg-primary-muted"
            : "border-border hover:border-primary/50",
        )}
        role="button"
        aria-label="Selecionar arquivo de imagem"
        tabIndex={0}
      >
        <input {...getInputProps()} aria-label="Selecionar imagem" />
        <ImagePlus className="size-6 text-muted-foreground" aria-hidden />
        <p className="mt-2 text-sm">Upload de arquivo em breve</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Por enquanto, cole uma URL pública para persistir no banco.
        </p>
      </div>
    </section>
  );
}
