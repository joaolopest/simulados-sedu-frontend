"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";

import {
  useCriarSimuladoRascunho,
  useCurarSimulado,
  useGestorSimulado,
  useGestorTurmas,
  useLiberarSimulado,
  type RespostaCuradoria,
  type TurmaEnriquecida,
} from "@/hooks/api/use-gestor";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BadgeIA } from "@/components/ia/badge-ia";
import { BadgeConfianca } from "@/components/ia/badge-confianca";
import { BannerFallbackIA } from "@/components/ia/banner-fallback-ia";
import { SliderTripleSomaCem } from "@/components/simulado/slider-triple-soma-cem";
import { CardQuestao } from "@/components/simulado/card-questao";
import {
  NOMES_ADAPTACAO,
  NOMES_MATERIA,
  NOMES_SERIE,
  obterNomeMaterias,
  obterNomeSerie,
} from "@/lib/displays";
import { cn, formatarDataBR } from "@/lib/utils";
import type {
  AdaptacaoCognitiva,
  Materia,
  ParametrosSimulado,
  Questao,
  SerieEscolar,
} from "@/types";

// ============================================================
// Constantes & schemas
// ============================================================

type NumeroPasso = 1 | 2 | 3 | 4;

const PASSOS: { numero: NumeroPasso; rotulo: string }[] = [
  { numero: 1, rotulo: "Parâmetros" },
  { numero: 2, rotulo: "Conteúdo" },
  { numero: 3, rotulo: "Curadoria IA" },
  { numero: 4, rotulo: "Liberar" },
];

const TEMPOS_DISPONIVEIS = [30, 60, 90, 120] as const;

const ADAPTACOES_DISPONIVEIS: AdaptacaoCognitiva[] = [
  "tdah",
  "dislexia",
  "discalculia",
  "autismo",
  "deficiencia_visual",
  "deficiencia_auditiva",
];

const FRASES_PROCESSAMENTO = [
  "Analisando o banco de questões…",
  "Balanceando tópicos da BNCC…",
  "Aplicando adaptações cognitivas…",
  "Validando equilíbrio entre dificuldades…",
  "Calculando índice de confiança…",
] as const;

const ITENS_CHECKLIST = [
  "Distribuição de dificuldade dentro do esperado",
  "Adaptações aplicadas corretamente",
  "Quantidade de questões adequada à série",
  "Tempo limite suficiente",
  "Banco de questões com cobertura",
] as const;

const SERIES = Object.keys(NOMES_SERIE) as [SerieEscolar, ...SerieEscolar[]];
const MATERIAS = Object.keys(NOMES_MATERIA) as [Materia, ...Materia[]];
const ADAPTACOES_ENUM = ADAPTACOES_DISPONIVEIS as [
  AdaptacaoCognitiva,
  ...AdaptacaoCognitiva[],
];

// Schema do passo 1 — parâmetros básicos
const schemaPasso1 = z.object({
  nome: z
    .string()
    .min(3, "Nome precisa de ao menos 3 caracteres")
    .max(120, "Nome muito longo"),
  turmaId: z.string().min(1, "Selecione uma turma"),
  serie: z.enum(SERIES, { message: "Selecione uma série" }),
  materias: z
    .array(z.enum(MATERIAS))
    .min(1, "Selecione pelo menos uma matéria"),
  dataLiberacao: z.string().min(1, "Defina uma data de liberação"),
  tempoLimiteMinutos: z
    .number()
    .int()
    .refine((v) => TEMPOS_DISPONIVEIS.includes(v as 30 | 60 | 90 | 120), {
      message: "Selecione um tempo válido",
    }),
});

type ValoresPasso1 = z.infer<typeof schemaPasso1>;

// Schema do passo 2 — conteúdo
const schemaPasso2 = z.object({
  conteudos: z
    .array(z.string().min(1))
    .min(1, "Adicione pelo menos um conteúdo a cobrar"),
  quantidadeQuestoes: z.number().int().min(5).max(50),
  distribuicao: z.object({
    facil: z.number().int().min(0).max(100),
    medio: z.number().int().min(0).max(100),
    dificil: z.number().int().min(0).max(100),
  }),
  adaptacoesAceitas: z.array(z.enum(ADAPTACOES_ENUM)),
});

type ValoresPasso2 = z.infer<typeof schemaPasso2>;

// ============================================================
// Página
// ============================================================

export default function PaginaNovoSimulado() {
  const roteador = useRouter();

  const [passoAtual, setPassoAtual] = useState<NumeroPasso>(1);
  const [valoresPasso1, setValoresPasso1] = useState<ValoresPasso1 | null>(
    null,
  );
  const [valoresPasso2, setValoresPasso2] = useState<ValoresPasso2 | null>(
    null,
  );

  // Curadoria
  const [simuladoId, setSimuladoId] = useState<string | null>(null);
  const [respostaCuradoria, setRespostaCuradoria] =
    useState<RespostaCuradoria | null>(null);
  const [seguirSemCuradoria, setSeguirSemCuradoria] = useState(false);

  // Confirmação modal
  const [modalAberto, setModalAberto] = useState(false);

  // Hooks API
  const { data: turmas = [], isLoading: turmasCarregando } = useGestorTurmas();
  const mutationCriarRascunho = useCriarSimuladoRascunho();
  const mutationCurar = useCurarSimulado();
  const mutationLiberar = useLiberarSimulado();

  // Builds o ParametrosSimulado consolidado
  const parametrosFinais: ParametrosSimulado | null = useMemo(() => {
    if (!valoresPasso1 || !valoresPasso2) return null;
    return {
      nome: valoresPasso1.nome,
      turmaId: valoresPasso1.turmaId,
      serie: valoresPasso1.serie,
      materias: valoresPasso1.materias,
      conteudos: valoresPasso2.conteudos,
      quantidadeQuestoes: valoresPasso2.quantidadeQuestoes,
      distribuicao: valoresPasso2.distribuicao,
      adaptacoesAceitas: valoresPasso2.adaptacoesAceitas,
      tempoLimiteMinutos: valoresPasso1.tempoLimiteMinutos,
      liberadoEm: valoresPasso1.dataLiberacao,
    };
  }, [valoresPasso1, valoresPasso2]);

  const turmaSelecionada = useMemo(
    () => turmas.find((t) => t.id === valoresPasso1?.turmaId),
    [turmas, valoresPasso1?.turmaId],
  );

  const podeAvancar = useMemo(() => {
    if (passoAtual === 3) return Boolean(respostaCuradoria) || seguirSemCuradoria;
    return true;
  }, [passoAtual, respostaCuradoria, seguirSemCuradoria]);

  function avancar() {
    if (!podeAvancar) return;
    if (passoAtual < 4) {
      setPassoAtual((p) => (p + 1) as NumeroPasso);
    }
  }

  function voltar() {
    if (passoAtual > 1) setPassoAtual((p) => (p - 1) as NumeroPasso);
  }

  async function aoSubmeterPasso1(valores: ValoresPasso1) {
    setValoresPasso1(valores);
    avancarPara(2);
  }

  async function aoSubmeterPasso2(valores: ValoresPasso2) {
    const total =
      valores.distribuicao.facil +
      valores.distribuicao.medio +
      valores.distribuicao.dificil;
    if (total !== 100) {
      toast.error("A distribuição de dificuldade precisa somar 100%");
      return;
    }
    setValoresPasso2(valores);
    avancarPara(3);
  }

  function avancarPara(proximo: NumeroPasso) {
    setPassoAtual(proximo);
  }

  // Gera curadoria — cria rascunho + curar
  async function gerarCuradoria() {
    if (!parametrosFinais) return;
    try {
      // Cria rascunho ou reutiliza
      let id = simuladoId;
      if (!id) {
        const rascunho = await mutationCriarRascunho.mutateAsync(parametrosFinais);
        id = rascunho.id;
        setSimuladoId(id);
      }
      const resposta = await mutationCurar.mutateAsync({
        simuladoId: id,
        parametros: parametrosFinais,
      });
      setRespostaCuradoria(resposta);
      setSeguirSemCuradoria(false);
      toast.success("Curadoria pronta para revisão");
    } catch {
      toast.error("Não foi possível concluir a curadoria. Use seleção clássica.");
    }
  }

  async function regenerarCuradoria() {
    if (!parametrosFinais || !simuladoId) {
      await gerarCuradoria();
      return;
    }
    try {
      const resposta = await mutationCurar.mutateAsync({
        simuladoId,
        parametros: parametrosFinais,
      });
      setRespostaCuradoria(resposta);
      toast.success("Nova versão gerada");
    } catch {
      toast.error("Falha ao regenerar. Tente novamente.");
    }
  }

  async function confirmarLiberacao() {
    if (!simuladoId) {
      toast.error("Simulado ainda não foi salvo. Volte e tente novamente.");
      return;
    }
    try {
      await mutationLiberar.mutateAsync(simuladoId);
      toast.success("Simulado liberado para a turma");
      setModalAberto(false);
      roteador.push(`/gestor/simulados/${simuladoId}/acompanhar`);
    } catch {
      toast.error("Não foi possível liberar agora. Tente novamente.");
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <div className="space-y-1">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Gestor · novo simulado
            </p>
            <h1
              className="font-serif text-2xl text-foreground md:text-3xl"
            >
              Novo simulado
            </h1>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/gestor/simulados">
              <X className="size-4" aria-hidden />
              Cancelar
            </Link>
          </Button>
        </div>
      </header>

      {/* Stepper sticky */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <Stepper passoAtual={passoAtual} />
      </div>

      {/* Conteúdo */}
      <main className="flex-1 px-6 py-10 pb-32">
        <div className="mx-auto w-full max-w-3xl">
          {passoAtual === 1 && (
            <Passo1Parametros
              valorInicial={valoresPasso1}
              turmas={turmas}
              turmasCarregando={turmasCarregando}
              aoSubmeter={aoSubmeterPasso1}
            />
          )}

          {passoAtual === 2 && (
            <Passo2Conteudo
              valorInicial={valoresPasso2}
              aoSubmeter={aoSubmeterPasso2}
            />
          )}

          {passoAtual === 3 && parametrosFinais && (
            <Passo3Curadoria
              parametros={parametrosFinais}
              turmaNome={turmaSelecionada?.nome}
              estaProcessando={mutationCurar.isPending || mutationCriarRascunho.isPending}
              respostaCuradoria={respostaCuradoria}
              seguirSemCuradoria={seguirSemCuradoria}
              aoGerar={gerarCuradoria}
              aoRegenerar={regenerarCuradoria}
              aoSeguirSemCuradoria={() => setSeguirSemCuradoria(true)}
              falhouCuradoria={mutationCurar.isError}
            />
          )}

          {passoAtual === 4 && parametrosFinais && (
            <Passo4Preview
              parametros={parametrosFinais}
              turmaNome={turmaSelecionada?.nome}
              respostaCuradoria={respostaCuradoria}
              simuladoId={simuladoId}
              aoLiberar={() => setModalAberto(true)}
              estaLiberando={mutationLiberar.isPending}
            />
          )}
        </div>
      </main>

      {/* Footer fixo */}
      <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-4">
          <Button
            variant="outline"
            size="lg"
            onClick={voltar}
            disabled={passoAtual === 1}
            aria-label="Voltar para o passo anterior"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Voltar
          </Button>

          <p className="hidden font-mono text-[11px] uppercase tracking-wider text-muted-foreground md:block">
            Passo {passoAtual} de 4
          </p>

          {passoAtual < 4 ? (
            <Button
              size="lg"
              onClick={() => {
                if (passoAtual === 1) {
                  // O submit do form do passo 1 é via tecla Enter ou botão dele.
                  // Aqui dispara o submit programático.
                  document
                    .querySelector<HTMLFormElement>("[data-form-passo='1']")
                    ?.requestSubmit();
                } else if (passoAtual === 2) {
                  document
                    .querySelector<HTMLFormElement>("[data-form-passo='2']")
                    ?.requestSubmit();
                } else {
                  avancar();
                }
              }}
              disabled={!podeAvancar}
              aria-label="Avançar para o próximo passo"
            >
              Próximo
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          ) : (
            <Button
              size="lg"
              variant="default"
              onClick={() => setModalAberto(true)}
              disabled={!simuladoId || mutationLiberar.isPending}
              className="bg-success text-success-foreground hover:bg-success/90"
              aria-label="Liberar simulado para a turma"
            >
              {mutationLiberar.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Liberando…
                </>
              ) : (
                <>
                  <Check className="size-4" aria-hidden />
                  Liberar simulado
                </>
              )}
            </Button>
          )}
        </div>
      </footer>

      {/* Modal de confirmação */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">
              Liberar simulado agora?
            </DialogTitle>
            <DialogDescription>
              Após liberar, alunos da turma{" "}
              <span className="font-medium text-foreground">
                {turmaSelecionada?.nome ?? "selecionada"}
              </span>{" "}
              poderão começar a responder. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              onClick={confirmarLiberacao}
              disabled={mutationLiberar.isPending}
              className="bg-success text-success-foreground hover:bg-success/90"
            >
              {mutationLiberar.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Liberando…
                </>
              ) : (
                "Confirmar liberação"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Stepper
// ============================================================

function Stepper({ passoAtual }: { passoAtual: NumeroPasso }) {
  return (
    <nav
      aria-label="Progresso do wizard de criação de simulado"
      className="mx-auto w-full max-w-3xl px-6 py-4"
    >
      <ol className="hidden items-center md:flex">
        {PASSOS.map((p, i) => {
          const completo = passoAtual > p.numero;
          const atual = passoAtual === p.numero;
          return (
            <li key={p.numero} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full border-2 font-mono text-sm font-semibold tabular-nums",
                    "transition-all duration-300 [transition-timing-function:var(--ease-quart)]",
                    completo &&
                      "border-success bg-success text-success-foreground",
                    atual &&
                      "border-primary bg-primary text-primary-foreground shadow-[0_0_0_4px_var(--primary-muted)]",
                    !completo &&
                      !atual &&
                      "border-border bg-card text-muted-foreground",
                  )}
                  aria-current={atual ? "step" : undefined}
                >
                  {completo ? (
                    <Check className="size-4" aria-hidden strokeWidth={3} />
                  ) : (
                    p.numero
                  )}
                </div>
                <span
                  className={cn(
                    "font-mono text-[10px] uppercase tracking-wider",
                    atual ? "text-primary-text" : "text-muted-foreground",
                    completo && "text-success",
                  )}
                >
                  {p.rotulo}
                </span>
              </div>
              {i < PASSOS.length - 1 && (
                <div
                  className={cn(
                    "mx-2 mb-5 h-px flex-1 transition-colors duration-300",
                    completo ? "bg-success" : "bg-border",
                  )}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* Mobile: lista vertical */}
      <ol className="flex flex-col gap-2 md:hidden">
        {PASSOS.map((p) => {
          const completo = passoAtual > p.numero;
          const atual = passoAtual === p.numero;
          return (
            <li
              key={p.numero}
              className={cn(
                "flex items-center gap-3 rounded-md px-2 py-1.5",
                atual && "bg-primary-muted",
              )}
            >
              <div
                className={cn(
                  "flex size-7 items-center justify-center rounded-full border-2 font-mono text-xs font-semibold tabular-nums",
                  completo && "border-success bg-success text-success-foreground",
                  atual && "border-primary bg-primary text-primary-foreground",
                  !completo &&
                    !atual &&
                    "border-border bg-card text-muted-foreground",
                )}
                aria-current={atual ? "step" : undefined}
              >
                {completo ? <Check className="size-3.5" strokeWidth={3} /> : p.numero}
              </div>
              <span
                className={cn(
                  "text-sm font-medium",
                  atual ? "text-primary-text" : "text-muted-foreground",
                  completo && "text-success",
                )}
              >
                {p.rotulo}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ============================================================
// Passo 1 — Parâmetros
// ============================================================

interface Passo1Props {
  valorInicial: ValoresPasso1 | null;
  turmas: TurmaEnriquecida[];
  turmasCarregando: boolean;
  aoSubmeter: (valores: ValoresPasso1) => void;
}

function Passo1Parametros({
  valorInicial,
  turmas,
  turmasCarregando,
  aoSubmeter,
}: Passo1Props) {
  const form = useForm({
    resolver: zodResolver(schemaPasso1),
    defaultValues: valorInicial ?? {
      nome: "",
      turmaId: "",
      serie: "" as SerieEscolar,
      materias: [] as Materia[],
      dataLiberacao: "",
      tempoLimiteMinutos: 60,
    },
    mode: "onBlur",
  });

  // Auto-preenche série quando turma é escolhida (ainda permite override)
  const turmaIdSelecionada = form.watch("turmaId");
  useEffect(() => {
    if (!turmaIdSelecionada) return;
    const turma = turmas.find((t) => t.id === turmaIdSelecionada);
    if (turma && !form.getValues("serie")) {
      form.setValue("serie", turma.serie, { shouldValidate: true });
    }
  }, [turmaIdSelecionada, turmas, form]);

  // Agrupa turmas por escola e ordena por série dentro de cada grupo
  const turmasAgrupadas = useMemo(() => {
    const grupos = new Map<string, TurmaEnriquecida[]>();
    for (const turma of turmas) {
      const existente = grupos.get(turma.escolaNome);
      if (existente) {
        existente.push(turma);
      } else {
        grupos.set(turma.escolaNome, [turma]);
      }
    }
    for (const lista of grupos.values()) {
      lista.sort((a, b) => SERIES.indexOf(a.serie) - SERIES.indexOf(b.serie));
    }
    return Array.from(grupos.entries()).sort(([a], [b]) =>
      a.localeCompare(b, "pt-BR"),
    );
  }, [turmas]);

  return (
    <SecaoCard
      eyebrow="Passo 1 · básico"
      titulo="Quem vai responder e quando"
      descricao="Defina nome, turma, matéria e janela de aplicação. A série é sugerida pela turma."
    >
      <Form {...form}>
        <form
          data-form-passo="1"
          onSubmit={form.handleSubmit(aoSubmeter)}
          className="space-y-6"
        >
          <FormField
            control={form.control}
            name="nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do simulado</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ex: Diagnóstica · Matemática · 8º ano"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="turmaId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Turma</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={turmasCarregando}
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue
                          placeholder={
                            turmasCarregando ? "Carregando…" : "Selecione…"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {turmasAgrupadas.map(([escolaNome, lista]) => (
                          <SelectGroup key={escolaNome}>
                            <SelectLabel className="px-2 pt-2 pb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                              {escolaNome}
                            </SelectLabel>
                            {lista.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.nome}{" "}
                                <span className="text-muted-foreground">
                                  · {obterNomeSerie(t.serie)}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="serie"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Série</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder="Selecione…" />
                      </SelectTrigger>
                      <SelectContent>
                        {SERIES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {NOMES_SERIE[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="materias"
            render={({ field }) => {
              const selecionadas = (field.value ?? []) as Materia[];
              const total = selecionadas.length;
              function alternar(m: Materia, marcar: boolean) {
                const proximo = marcar
                  ? Array.from(new Set([...selecionadas, m]))
                  : selecionadas.filter((x) => x !== m);
                field.onChange(proximo);
              }
              return (
                <FormItem>
                  <div className="flex items-baseline justify-between gap-2">
                    <FormLabel>Matérias</FormLabel>
                    <span
                      className="font-mono text-[10px] uppercase tracking-wider tabular-nums text-muted-foreground"
                      aria-live="polite"
                    >
                      {total === 0
                        ? "nenhuma · selecione 1+"
                        : `${total} selecionada${total > 1 ? "s" : ""}`}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Marque quantas quiser. O simulado pode cobrir 1 ou mais
                    matérias.
                  </p>
                  <FormControl>
                    <ul className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                      {MATERIAS.map((m) => (
                        <CheckboxItem
                          key={m}
                          rotulo={NOMES_MATERIA[m]}
                          marcado={selecionadas.includes(m)}
                          aoAlternar={(marcar) => alternar(m, marcar)}
                        />
                      ))}
                    </ul>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          <FormField
            control={form.control}
            name="dataLiberacao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de liberação</FormLabel>
                <FormControl>
                  <Input type="date" {...field} className="md:max-w-xs" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tempoLimiteMinutos"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tempo limite</FormLabel>
                <FormControl>
                  <div className="flex flex-wrap gap-2">
                    {TEMPOS_DISPONIVEIS.map((t) => {
                      const ativo = field.value === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => field.onChange(t)}
                          aria-pressed={ativo}
                          className={cn(
                            "inline-flex h-10 items-center gap-2 rounded-full border px-5 font-mono text-sm font-medium tabular-nums",
                            "transition-all duration-200 [transition-timing-function:var(--ease-quart)]",
                            "hover:border-primary/40",
                            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                            ativo
                              ? "border-primary bg-primary-muted text-primary-text shadow-[0_0_0_3px_var(--primary-muted)]"
                              : "border-border bg-card text-muted-foreground",
                          )}
                        >
                          {t}
                          <span className="text-[10px] uppercase tracking-wider opacity-70">
                            min
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </SecaoCard>
  );
}

// ============================================================
// Passo 2 — Conteúdo
// ============================================================

interface Passo2Props {
  valorInicial: ValoresPasso2 | null;
  aoSubmeter: (valores: ValoresPasso2) => void;
}

function Passo2Conteudo({ valorInicial, aoSubmeter }: Passo2Props) {
  const form = useForm({
    resolver: zodResolver(schemaPasso2),
    defaultValues: valorInicial ?? {
      conteudos: [] as string[],
      quantidadeQuestoes: 20,
      distribuicao: { facil: 30, medio: 50, dificil: 20 },
      adaptacoesAceitas: [] as AdaptacaoCognitiva[],
    },
    mode: "onBlur",
  });

  const conteudos = form.watch("conteudos");
  const quantidade = form.watch("quantidadeQuestoes");
  const distribuicao = form.watch("distribuicao");
  const adaptacoes = form.watch("adaptacoesAceitas");

  const [novoConteudo, setNovoConteudo] = useState("");

  function adicionarConteudo() {
    const limpo = novoConteudo.trim();
    if (!limpo) return;
    if (conteudos.includes(limpo)) {
      setNovoConteudo("");
      return;
    }
    form.setValue("conteudos", [...conteudos, limpo], { shouldValidate: true });
    setNovoConteudo("");
  }

  function removerConteudo(c: string) {
    form.setValue(
      "conteudos",
      conteudos.filter((x) => x !== c),
      { shouldValidate: true },
    );
  }

  function alternarAdaptacao(a: AdaptacaoCognitiva, marcar: boolean) {
    const proximo = marcar
      ? Array.from(new Set([...adaptacoes, a]))
      : adaptacoes.filter((x) => x !== a);
    form.setValue("adaptacoesAceitas", proximo, { shouldValidate: true });
  }

  return (
    <SecaoCard
      eyebrow="Passo 2 · conteúdo"
      titulo="O que cobrar e em que dose"
      descricao="Defina os conteúdos, a quantidade de questões e a curva de dificuldade desejada."
    >
      <form
        data-form-passo="2"
        onSubmit={form.handleSubmit(aoSubmeter)}
        className="space-y-8"
      >
        {/* Tags de conteúdo */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Conteúdos a cobrar
          </label>
          <p className="text-xs text-muted-foreground">
            Adicione tópicos livres. Pressione Enter ou clique em adicionar.
          </p>
          <div className="flex gap-2">
            <Input
              value={novoConteudo}
              onChange={(e) => setNovoConteudo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  adicionarConteudo();
                }
              }}
              placeholder="Ex: Equações do 1º grau"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={adicionarConteudo}
              disabled={!novoConteudo.trim()}
            >
              <Plus className="size-4" aria-hidden />
              Adicionar
            </Button>
          </div>
          {conteudos.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {conteudos.map((c) => (
                <li key={c}>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-muted px-3 py-1 text-xs text-primary-text">
                    {c}
                    <button
                      type="button"
                      onClick={() => removerConteudo(c)}
                      aria-label={`Remover ${c}`}
                      className="rounded-full p-0.5 hover:bg-primary/20"
                    >
                      <X className="size-3" aria-hidden />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {form.formState.errors.conteudos && (
            <p className="text-xs font-medium text-destructive">
              {form.formState.errors.conteudos.message}
            </p>
          )}
        </div>

        {/* Quantidade de questões */}
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">
                Quantidade de questões
              </label>
              <p className="text-xs text-muted-foreground">
                Entre 5 e 50. Ajuste conforme tempo limite.
              </p>
            </div>
            <span
              className="font-mono text-3xl font-semibold tabular-nums text-primary-text md:text-4xl"
              aria-live="polite"
            >
              {quantidade}
            </span>
          </div>
          <Slider
            value={[quantidade]}
            min={5}
            max={50}
            step={1}
            onValueChange={(v) =>
              form.setValue("quantidadeQuestoes", v[0] ?? 20, {
                shouldValidate: true,
              })
            }
            aria-label="Quantidade de questões"
          />
          <div className="flex justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>5</span>
            <span>50</span>
          </div>
        </div>

        {/* Distribuição triple */}
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-foreground">
              Distribuição de dificuldade
            </label>
            <p className="text-xs text-muted-foreground">
              Os três sliders se ajustam mantendo a soma em 100%.
            </p>
          </div>
          <SliderTripleSomaCem
            valor={distribuicao}
            aoMudar={(prox) =>
              form.setValue("distribuicao", prox, { shouldValidate: true })
            }
          />
        </div>

        {/* Adaptações */}
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-foreground">
              Aceitar adaptações cognitivas
            </label>
            <p className="text-xs text-muted-foreground">
              Inclui alunos com adaptações específicas. A IA ajustará tempo e
              formato das questões.
            </p>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {ADAPTACOES_DISPONIVEIS.map((a) => (
              <CheckboxItem
                key={a}
                rotulo={NOMES_ADAPTACAO[a]}
                marcado={adaptacoes.includes(a)}
                aoAlternar={(m) => alternarAdaptacao(a, m)}
              />
            ))}
          </ul>
        </div>
      </form>
    </SecaoCard>
  );
}

function CheckboxItem({
  rotulo,
  marcado,
  aoAlternar,
}: {
  rotulo: string;
  marcado: boolean;
  aoAlternar: (m: boolean) => void;
}) {
  const id = useId();
  return (
    <li>
      <label
        htmlFor={id}
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-sm",
          "transition-colors duration-200",
          "hover:border-primary/30",
          marcado && "border-primary bg-primary-muted",
        )}
      >
        <Checkbox
          id={id}
          checked={marcado}
          onCheckedChange={(v) => aoAlternar(Boolean(v))}
        />
        <span className={cn("flex-1", marcado && "text-primary-text")}>
          {rotulo}
        </span>
      </label>
    </li>
  );
}

// ============================================================
// Passo 3 — Curadoria IA
// ============================================================

interface Passo3Props {
  parametros: ParametrosSimulado;
  turmaNome?: string;
  estaProcessando: boolean;
  respostaCuradoria: RespostaCuradoria | null;
  seguirSemCuradoria: boolean;
  aoGerar: () => void;
  aoRegenerar: () => void;
  aoSeguirSemCuradoria: () => void;
  falhouCuradoria: boolean;
}

function Passo3Curadoria({
  parametros,
  turmaNome,
  estaProcessando,
  respostaCuradoria,
  seguirSemCuradoria,
  aoGerar,
  aoRegenerar,
  aoSeguirSemCuradoria,
  falhouCuradoria,
}: Passo3Props) {
  return (
    <div className="space-y-6">
      {/* Banner violeta com BadgeIA */}
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-ia/20 p-5 md:p-6",
          "bg-gradient-to-br from-ia-muted via-card to-card",
        )}
      >
        <div className="relative z-10 flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
          <BadgeIA tamanho="lg" descricao="" />
          <div className="space-y-1.5">
            <h2
              className="font-serif text-lg text-foreground md:text-xl"
            >
              A IA vai montar o simulado pra você
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              A inteligência artificial balanceia tópicos, dificuldade e
              adaptações conforme os parâmetros que você definiu. Você pode
              regenerar até ficar satisfeito ou cair pra seleção clássica.
            </p>
          </div>
        </div>
      </div>

      {/* Resumo dos parâmetros */}
      <ResumoParametros parametros={parametros} turmaNome={turmaNome} />

      {/* Estados */}
      {!respostaCuradoria && !estaProcessando && !seguirSemCuradoria && (
        <EstadoVazioCuradoria
          aoGerar={aoGerar}
          aoCair={aoSeguirSemCuradoria}
          falhou={falhouCuradoria}
        />
      )}

      {estaProcessando && <EstadoProcessandoCuradoria />}

      {respostaCuradoria && !estaProcessando && (
        <ResultadoCuradoria
          resposta={respostaCuradoria}
          aoRegenerar={aoRegenerar}
        />
      )}

      {seguirSemCuradoria && !respostaCuradoria && !estaProcessando && (
        <Alert>
          <AlertTriangle aria-hidden />
          <AlertTitle>Seleção clássica ativada</AlertTitle>
          <AlertDescription>
            O simulado seguirá com seleção heurística baseada nos parâmetros.
            Você pode tentar a curadoria por IA novamente quando quiser.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function EstadoVazioCuradoria({
  aoGerar,
  aoCair,
  falhou,
}: {
  aoGerar: () => void;
  aoCair: () => void;
  falhou: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-5 rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-ia-muted">
        <Sparkles className="size-7 text-ia" aria-hidden />
      </div>
      <div className="space-y-1">
        <h3
          className="font-serif text-xl text-foreground"
        >
          Pronto pra montar
        </h3>
        <p className="max-w-md text-sm text-muted-foreground">
          A IA vai analisar o banco e devolver uma seleção balanceada com
          índice de confiança. Leva poucos segundos.
        </p>
      </div>
      <Button
        size="lg"
        onClick={aoGerar}
        className="bg-ia text-ia-foreground hover:bg-ia-hover"
      >
        <Sparkles className="size-4" aria-hidden />
        Gerar simulado com IA
      </Button>
      {falhou && (
        <BannerFallbackIA aoAcionar={aoCair} className="w-full max-w-xl" />
      )}
    </div>
  );
}

function EstadoProcessandoCuradoria() {
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndice((i) => (i + 1) % FRASES_PROCESSAMENTO.length);
    }, 1500);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-ia/30 bg-card px-6 py-12"
      aria-live="polite"
      aria-busy="true"
    >
      {/* gradient ambient animado */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(800px circle at 30% 20%, oklch(0.456 0.247 296 / 0.08), transparent 50%), radial-gradient(600px circle at 70% 80%, oklch(0.456 0.247 296 / 0.06), transparent 50%)",
          animation: "pulse-ambient 4s ease-in-out infinite",
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-6 text-center">
        <BadgeIA tamanho="lg" variante="pulsante" descricao="" />

        {/* Frase rotativa */}
        <div className="flex h-7 items-center">
          <p
            key={indice}
            className="font-serif text-lg text-foreground motion-materialize md:text-xl"
          >
            {FRASES_PROCESSAMENTO[indice]}
          </p>
        </div>

        {/* Skeletons de questão */}
        <div className="w-full max-w-xl space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <div className="space-y-2 pt-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-ia-text">
          <Loader2 className="size-3 animate-spin" aria-hidden />
          Processando…
        </div>
      </div>
    </div>
  );
}

function ResultadoCuradoria({
  resposta,
  aoRegenerar,
}: {
  resposta: RespostaCuradoria;
  aoRegenerar: () => void;
}) {
  const { curadoria, questoesSelecionadas } = resposta;
  const [todasExpandidas, setTodasExpandidas] = useState(false);

  const dadosPizza = useMemo(
    () => [
      {
        nome: "Fácil",
        valor: curadoria.distribuicaoReal.facil,
        cor: "oklch(0.72 0.14 161)",
      },
      {
        nome: "Médio",
        valor: curadoria.distribuicaoReal.medio,
        cor: "oklch(0.55 0.12 161)",
      },
      {
        nome: "Difícil",
        valor: curadoria.distribuicaoReal.dificil,
        cor: "oklch(0.38 0.10 161)",
      },
    ],
    [curadoria.distribuicaoReal],
  );

  const visiveis = todasExpandidas
    ? questoesSelecionadas
    : questoesSelecionadas.slice(0, 5);
  const restantes = questoesSelecionadas.length - 5;

  return (
    <div className="space-y-6">
      {/* Cabeçalho com confiança + pizza + tempo */}
      <div className="grid gap-6 rounded-xl border border-border bg-card p-6 md:grid-cols-[auto_1fr_auto] md:gap-8">
        <BadgeConfianca
          percentual={curadoria.confiancaPercentual}
          tamanho="lg"
          exibirFlag
        />

        <div className="flex flex-col items-center justify-center">
          <div className="h-40 w-full max-w-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dadosPizza}
                  dataKey="valor"
                  nameKey="nome"
                  cx="50%"
                  cy="50%"
                  innerRadius={32}
                  outerRadius={62}
                  paddingAngle={2}
                  isAnimationActive={false}
                >
                  {dadosPizza.map((d) => (
                    <Cell key={d.nome} fill={d.cor} stroke="none" />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                  }}
                  formatter={(valor) => [`${valor}%`, ""]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            {dadosPizza.map((d) => (
              <span
                key={d.nome}
                className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground"
              >
                <span
                  className="size-2 rounded-sm"
                  style={{ backgroundColor: d.cor }}
                  aria-hidden
                />
                {d.nome} {d.valor}%
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-end gap-3 self-start">
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Tempo de curadoria
            </p>
            <p className="font-mono text-2xl font-semibold tabular-nums text-foreground">
              {curadoria.tempoCuradoriaSegundos.toFixed(1)}s
            </p>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Tentativa #{curadoria.tentativas}
          </p>
        </div>
      </div>

      {/* Aviso revisão obrigatória */}
      {curadoria.confiancaPercentual < 60 && (
        <BannerFallbackIA
          titulo="Confiança abaixo do esperado"
          mensagem="Recomendamos revisar manualmente as questões selecionadas antes de liberar para os alunos."
          aoAcionar={aoRegenerar}
          rotuloAcao="Regenerar curadoria"
        />
      )}

      {/* Observações */}
      {curadoria.observacoes.length > 0 && (
        <Alert>
          <AlertTriangle aria-hidden />
          <AlertTitle>Observações da IA</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {curadoria.observacoes.map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Lista de questões */}
      <div className="rounded-xl border border-border bg-card p-5 md:p-6">
        <div className="mb-4 flex items-baseline justify-between">
          <h3
            className="font-serif text-lg text-foreground"
          >
            Questões selecionadas
          </h3>
          <span className="font-mono text-xs uppercase tracking-wider tabular-nums text-muted-foreground">
            {questoesSelecionadas.length} totais
          </span>
        </div>
        <ol className="divide-y divide-border">
          {visiveis.map((q, i) => (
            <li key={q.id} className="flex items-start gap-3 py-3">
              <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-background font-mono text-xs font-semibold tabular-nums text-muted-foreground">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm leading-relaxed text-foreground">
                  {q.enunciado}
                </p>
                <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <span>{q.conteudo}</span>
                  <span>· {q.nivel}</span>
                  {q.adaptacoes.length > 0 && <span>· adaptada</span>}
                </p>
              </div>
            </li>
          ))}
        </ol>
        {restantes > 0 && (
          <button
            type="button"
            onClick={() => setTodasExpandidas((v) => !v)}
            className="mt-4 inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-primary-text hover:text-primary"
          >
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform duration-200",
                todasExpandidas && "rotate-180",
              )}
              aria-hidden
            />
            {todasExpandidas ? "recolher" : `ver mais ${restantes}`}
          </button>
        )}
      </div>

      {/* Ações */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          variant="outline"
          size="lg"
          onClick={aoRegenerar}
          className="flex-1"
        >
          <RefreshCw className="size-4" aria-hidden />
          Regenerar
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Passo 4 — Preview
// ============================================================

interface Passo4Props {
  parametros: ParametrosSimulado;
  turmaNome?: string;
  respostaCuradoria: RespostaCuradoria | null;
  simuladoId: string | null;
  aoLiberar: () => void;
  estaLiberando: boolean;
}

function Passo4Preview({
  parametros,
  turmaNome,
  respostaCuradoria,
  simuladoId,
}: Passo4Props) {
  // Carrega questões do rascunho caso não tenha curadoria (fallback clássico)
  const { data: dadosSimulado } = useGestorSimulado(
    !respostaCuradoria && simuladoId ? simuladoId : undefined,
  );

  const primeiraQuestao: Questao | undefined =
    respostaCuradoria?.questoesSelecionadas[0] ?? dadosSimulado?.questoes[0];

  const [checklist, setChecklist] = useState<boolean[]>(() =>
    ITENS_CHECKLIST.map(() => true),
  );
  const podeLiberar = checklist.every(Boolean);

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Passo 4 · revisão final
        </p>
        <h2
          className="font-serif text-2xl text-foreground md:text-3xl"
        >
          Pronto pra liberar
        </h2>
        <p className="text-sm text-muted-foreground">
          Confira o resumo, valide o checklist e libere para a turma.
        </p>
      </div>

      <ResumoParametros
        parametros={parametros}
        turmaNome={turmaNome}
        respostaCuradoria={respostaCuradoria}
      />

      {/* Preview em modo aluno */}
      {primeiraQuestao && (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h3
              className="font-serif text-lg text-foreground"
            >
              Preview em modo aluno
            </h3>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              read-only
            </span>
          </div>
          <div className="pointer-events-none opacity-95">
            <CardQuestao
              questao={primeiraQuestao}
              numero={1}
              total={parametros.quantidadeQuestoes}
              alternativaSelecionadaId={null}
              aoSelecionar={() => {}}
            />
          </div>
        </div>
      )}

      {/* Checklist */}
      <div className="rounded-xl border border-border bg-card p-5 md:p-6">
        <h3
          className="font-serif text-lg text-foreground"
        >
          Checklist de validação
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Confirme que cada item está adequado antes de liberar.
        </p>
        <ul className="mt-4 space-y-2">
          {ITENS_CHECKLIST.map((item, i) => (
            <li key={item}>
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border bg-background px-3 py-2.5 text-sm",
                  "transition-colors duration-200",
                  checklist[i]
                    ? "border-success/40 text-foreground"
                    : "border-warning/40 text-muted-foreground",
                )}
              >
                <Checkbox
                  checked={checklist[i]}
                  onCheckedChange={(v) =>
                    setChecklist((arr) =>
                      arr.map((b, idx) => (idx === i ? Boolean(v) : b)),
                    )
                  }
                />
                <span className="flex-1">{item}</span>
              </label>
            </li>
          ))}
        </ul>
        {!podeLiberar && (
          <p className="mt-3 text-xs text-warning">
            Marque todos os itens para liberar o simulado.
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Componentes auxiliares
// ============================================================

function ResumoParametros({
  parametros,
  turmaNome,
  respostaCuradoria,
}: {
  parametros: ParametrosSimulado;
  turmaNome?: string;
  respostaCuradoria?: RespostaCuradoria | null;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 md:p-6">
      <div className="mb-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Resumo dos parâmetros
        </p>
        <h3
          className="mt-1 font-serif text-xl text-foreground"
        >
          {parametros.nome || "Sem nome"}
        </h3>
      </div>

      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 md:grid-cols-3">
        <ItemResumo rotulo="Turma" valor={turmaNome ?? "—"} />
        <ItemResumo rotulo="Série" valor={obterNomeSerie(parametros.serie)} />
        <ItemResumo
          rotulo={parametros.materias.length > 1 ? "Matérias" : "Matéria"}
          valor={obterNomeMaterias(parametros.materias)}
        />
        <ItemResumo
          rotulo="Questões"
          valor={`${parametros.quantidadeQuestoes}`}
          mono
        />
        <ItemResumo
          rotulo="Tempo limite"
          valor={`${parametros.tempoLimiteMinutos} min`}
          mono
        />
        <ItemResumo
          rotulo="Liberação"
          valor={
            parametros.liberadoEm
              ? formatarDataBR(parametros.liberadoEm)
              : "—"
          }
          mono
        />
        <ItemResumo
          rotulo="Distribuição"
          valor={`${parametros.distribuicao.facil}/${parametros.distribuicao.medio}/${parametros.distribuicao.dificil}`}
          mono
        />
        <ItemResumo
          rotulo="Adaptações"
          valor={
            parametros.adaptacoesAceitas.length > 0
              ? `${parametros.adaptacoesAceitas.length} aceita${parametros.adaptacoesAceitas.length > 1 ? "s" : ""}`
              : "Nenhuma"
          }
        />
        {respostaCuradoria && (
          <ItemResumo
            rotulo="Confiança IA"
            valor={`${respostaCuradoria.curadoria.confiancaPercentual.toFixed(0)}%`}
            mono
          />
        )}
      </dl>

      {parametros.conteudos.length > 0 && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Conteúdos
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {parametros.conteudos.map((c) => (
              <li
                key={c}
                className="rounded-full bg-muted px-3 py-0.5 text-xs text-foreground"
              >
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ItemResumo({
  rotulo,
  valor,
  mono = false,
}: {
  rotulo: string;
  valor: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {rotulo}
      </dt>
      <dd
        className={cn(
          "text-foreground",
          mono ? "font-mono tabular-nums" : "",
        )}
      >
        {valor}
      </dd>
    </div>
  );
}

function SecaoCard({
  eyebrow,
  titulo,
  descricao,
  children,
}: {
  eyebrow: string;
  titulo: string;
  descricao: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 md:p-8">
      <div className="mb-6 space-y-1.5">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary-text">
          {eyebrow}
        </p>
        <h2
          className="font-serif text-2xl text-foreground md:text-3xl"
        >
          {titulo}
        </h2>
        <p className="max-w-prose text-sm text-muted-foreground">{descricao}</p>
      </div>
      {children}
    </div>
  );
}
