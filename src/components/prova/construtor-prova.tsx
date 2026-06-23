"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
import {
  useCriarProvaRascunho,
  useLiberarProva,
  useMontarProva,
  useProvaTurmas,
  useSugerirQuestoesProva,
} from "@/hooks/api/use-provas";
import {
  useAtualizarSimulado,
  useGestorSimulado,
  type TurmaEnriquecida,
} from "@/hooks/api/use-gestor";
import {
  useAdminConfiguracoes,
  useAdminQuestoes,
  useCriarQuestao,
} from "@/hooks/api/use-admin";
import { useAuthStore } from "@/stores/auth-store";
import {
  NOMES_MATERIA,
  NOMES_NIVEL,
  NOMES_SERIE,
  obterNomeSerie,
} from "@/lib/displays";
import { cn, gerarIdAleatorio } from "@/lib/utils";
import { baseProvasPorPerfil } from "@/lib/rotas-provas";
import type {
  Materia,
  NivelDificuldade,
  ParametrosSimulado,
  Questao,
  SerieEscolar,
} from "@/types";

const SERIES = Object.entries(NOMES_SERIE) as [SerieEscolar, string][];
const MATERIAS = Object.entries(NOMES_MATERIA) as [Materia, string][];
const NIVEIS = Object.entries(NOMES_NIVEL) as [NivelDificuldade, string][];

export function ConstrutorProva() {
  const perfil = useAuthStore((s) => s.usuario?.perfil);
  const pathname = usePathname();
  const { data: turmas = [], isLoading: turmasCarregando } = useProvaTurmas();
  const { data: configuracoes = [] } = useAdminConfiguracoes();
  const [idEdicao, setIdEdicao] = useState<string | undefined>(undefined);
  const [edicaoCarregada, setEdicaoCarregada] = useState(false);
  const [nome, setNome] = useState("");
  const [turmaId, setTurmaId] = useState("");
  const [tempoLimiteMinutos, setTempoLimiteMinutos] = useState(60);
  const [busca, setBusca] = useState("");
  const [filtroSerie, setFiltroSerie] = useState("todos");
  const [filtroMateria, setFiltroMateria] = useState("todos");
  const [filtroNivel, setFiltroNivel] = useState("todos");
  const [paginaBanco, setPaginaBanco] = useState(1);
  const [quantidadeAutomatica, setQuantidadeAutomatica] = useState(10);
  const [selecionadas, setSelecionadas] = useState<Questao[]>([]);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [resultado, setResultado] = useState<{
    total: number;
    liberada: boolean;
  } | null>(null);

  const bancoQuery = useAdminQuestoes({
    busca: busca.trim() || undefined,
    serie: filtroSerie !== "todos" ? [filtroSerie as SerieEscolar] : undefined,
    materia: filtroMateria !== "todos" ? [filtroMateria as Materia] : undefined,
    nivel: filtroNivel !== "todos" ? [filtroNivel as NivelDificuldade] : undefined,
    status: ["publicada"],
    pagina: paginaBanco,
    porPagina: 20,
  });
  const metaBanco = bancoQuery.data?.meta;
  const totalPaginasBanco = metaBanco?.totalPaginas ?? 1;

  const criarRascunho = useCriarProvaRascunho();
  const sugerirQuestoes = useSugerirQuestoesProva();
  const atualizarSimulado = useAtualizarSimulado();
  const montar = useMontarProva();
  const liberar = useLiberarProva();
  const { data: dadosEdicao, isLoading: carregandoEdicao } =
    useGestorSimulado(idEdicao);
  const destinoInicio =
    perfil === "admin"
      ? "/admin/dashboard"
      : perfil === "gestor"
        ? "/gestor/dashboard"
        : "/professor/dashboard";
  const destinoProvas = baseProvasPorPerfil(perfil, pathname);
  const turmaSelecionada = useMemo(
    () => turmas.find((t) => t.id === turmaId),
    [turmaId, turmas],
  );
  const configProvas = useMemo(() => {
    const valor =
      configuracoes.find((config) => config.chave === "provas")?.valor ?? {};
    const minimo = Number(valor.quantidadeMinimaQuestoes ?? 3);
    const maximo = Number(valor.quantidadeMaximaQuestoes ?? 100);
    const tempo = Number(valor.tempoPadraoMinutos ?? 60);
    return {
      quantidadeMinimaQuestoes: Number.isFinite(minimo) ? Math.max(1, minimo) : 3,
      quantidadeMaximaQuestoes: Number.isFinite(maximo) ? Math.max(1, maximo) : 100,
      tempoPadraoMinutos: Number.isFinite(tempo) ? Math.max(1, tempo) : 60,
    };
  }, [configuracoes]);
  const quantidadeMinima = configProvas.quantidadeMinimaQuestoes;
  const quantidadeMaxima = Math.max(
    quantidadeMinima,
    configProvas.quantidadeMaximaQuestoes,
  );

  useEffect(() => {
    const idTimeout = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      setIdEdicao(params.get("id") ?? undefined);
      setEdicaoCarregada(false);
    }, 0);
    return () => window.clearTimeout(idTimeout);
  }, []);

  useEffect(() => {
    if (idEdicao || edicaoCarregada) return;
    const idTimeout = window.setTimeout(
      () => setTempoLimiteMinutos(configProvas.tempoPadraoMinutos),
      0,
    );
    return () => window.clearTimeout(idTimeout);
  }, [configProvas.tempoPadraoMinutos, edicaoCarregada, idEdicao]);

  useEffect(() => {
    if (!dadosEdicao?.simulado || edicaoCarregada) return;
    const parametros = dadosEdicao.simulado.parametros;
    const idTimeout = window.setTimeout(() => {
      setNome(parametros.nome?.trim() || `Simulado ${dadosEdicao.simulado.id}`);
      setTurmaId(parametros.turmaId || "");
      setTempoLimiteMinutos(
        Math.max(1, Number(parametros.tempoLimiteMinutos) || configProvas.tempoPadraoMinutos),
      );
      setSelecionadas(dadosEdicao.questoes);
      setEdicaoCarregada(true);
    }, 0);
    return () => window.clearTimeout(idTimeout);
  }, [configProvas.tempoPadraoMinutos, dadosEdicao, edicaoCarregada]);

  // volta pra página 1 quando muda a busca ou qualquer filtro do banco
  useEffect(() => {
    const idTimeout = window.setTimeout(() => setPaginaBanco(1), 0);
    return () => window.clearTimeout(idTimeout);
  }, [busca, filtroSerie, filtroMateria, filtroNivel]);

  const idsSelecionados = useMemo(
    () => new Set(selecionadas.map((q) => q.id)),
    [selecionadas],
  );
  const banco = (bancoQuery.data?.dados ?? []).filter(
    (q) => !idsSelecionados.has(q.id),
  );

  const turmasAgrupadas = useMemo(() => agruparPorEscola(turmas), [turmas]);
  const podeSalvar =
    nome.trim().length >= 3 &&
    Boolean(turmaId) &&
    selecionadas.length >= quantidadeMinima &&
    selecionadas.length <= quantidadeMaxima;
  const salvando =
    criarRascunho.isPending ||
    sugerirQuestoes.isPending ||
    atualizarSimulado.isPending ||
    montar.isPending ||
    liberar.isPending;

  function adicionar(q: Questao) {
    setSelecionadas((s) => {
      if (s.some((item) => item.id === q.id)) return s;
      if (s.length >= quantidadeMaxima) {
        toast.warning(`A prova não pode ter mais de ${quantidadeMaxima} questões.`);
        return s;
      }
      return [...s, q];
    });
  }
  function remover(id: string) {
    setSelecionadas((s) => s.filter((q) => q.id !== id));
  }

  async function gerarPorFiltros() {
    if (!turmaId || sugerirQuestoes.isPending) return;
    const vagasDisponiveis = quantidadeMaxima - selecionadas.length;
    if (vagasDisponiveis <= 0) {
      toast.warning(`A prova não pode ter mais de ${quantidadeMaxima} questões.`);
      return;
    }
    const quantidade = Math.max(
      1,
      Math.min(vagasDisponiveis, quantidadeAutomatica || 10),
    );
    const nomeProva =
      nome.trim() ||
      `Prova automática ${turmaSelecionada?.nome ? `· ${turmaSelecionada.nome}` : ""}`.trim();
    try {
      const resposta = await sugerirQuestoes.mutateAsync({
        nome: nomeProva,
        turmaId,
        serie:
          filtroSerie !== "todos"
            ? (filtroSerie as SerieEscolar)
            : (turmaSelecionada?.serie as SerieEscolar | undefined),
        materias:
          filtroMateria !== "todos" ? [filtroMateria as Materia] : undefined,
        niveis:
          filtroNivel !== "todos" ? [filtroNivel as NivelDificuldade] : undefined,
        quantidade,
        quantidadeQuestoes: quantidade,
        tempoLimiteMinutos,
        evitarQuestoesJaUsadas: false,
      });
      setNome((atual) => atual || nomeProva);
      setSelecionadas((atuais) => {
        const idsAtuais = new Set(atuais.map((q) => q.id));
        const novas = resposta.questoesSelecionadas.filter(
          (q) => !idsAtuais.has(q.id),
        );
        return [...atuais, ...novas].slice(0, quantidadeMaxima);
      });
      toast.success(
        `${resposta.questoesSelecionadas.length} questões selecionadas pelo banco`,
      );
      for (const aviso of resposta.avisos ?? []) {
        toast.message(aviso);
      }
    } catch {
      toast.error("Não foi possível gerar a prova com esses filtros.");
    }
  }

  async function salvar(liberarAgora: boolean) {
    if (!podeSalvar || salvando) return;
    const turma = turmas.find((t) => t.id === turmaId);
    const distribuicao = calcularDistribuicao(selecionadas);
    const parametros: ParametrosSimulado = {
      nome: nome.trim(),
      turmaId,
      serie: (turma?.serie || "9_fundamental") as SerieEscolar,
      materias: valoresUnicos(selecionadas.map((q) => q.materia)),
      conteudos: valoresUnicos(
        selecionadas.map((q) => q.conteudo).filter(Boolean),
      ),
      quantidadeQuestoes: selecionadas.length,
      distribuicao,
      adaptacoesAceitas: [],
      tempoLimiteMinutos,
      liberadoEm: new Date().toISOString().slice(0, 10),
    };
    try {
      const sim = idEdicao
        ? await atualizarSimulado.mutateAsync({ id: idEdicao, parametros })
        : await criarRascunho.mutateAsync(parametros);
      await montar.mutateAsync({
        simuladoId: sim.id,
        questaoIds: selecionadas.map((q) => q.id),
      });
      if (liberarAgora) await liberar.mutateAsync(sim.id);
      toast.success(
        liberarAgora
          ? "Prova salva e liberada!"
          : idEdicao
            ? "Prova atualizada!"
            : "Prova salva como rascunho!",
      );
      setResultado({ total: selecionadas.length, liberada: liberarAgora });
    } catch {
      toast.error("Não foi possível salvar a prova. Tente novamente.");
    }
  }

  function recomecar() {
    window.history.replaceState(null, "", window.location.pathname);
    setIdEdicao(undefined);
    setEdicaoCarregada(false);
    setNome("");
    setTurmaId("");
    setBusca("");
    setFiltroSerie("todos");
    setFiltroMateria("todos");
    setFiltroNivel("todos");
    setTempoLimiteMinutos(configProvas.tempoPadraoMinutos);
    setPaginaBanco(1);
    setQuantidadeAutomatica(10);
    setSelecionadas([]);
    setResultado(null);
  }

  if (resultado) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-success-muted">
          <CheckCircle2 className="size-8 text-success" aria-hidden />
        </div>
        <h2 className="mt-5 font-serif text-2xl text-foreground">
          Prova {resultado.liberada ? "liberada" : "salva"}!
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {resultado.total} questão(ões) na prova.{" "}
          {resultado.liberada
            ? "Os alunos da turma já podem responder."
            : "Ficou como rascunho — você pode liberar depois."}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="outline" onClick={recomecar}>
            Criar outra prova
          </Button>
          <Button asChild>
            <Link href={idEdicao ? destinoProvas : destinoInicio}>
              {idEdicao ? "Voltar para provas" : "Voltar ao início"}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 pb-28 md:px-6 md:py-10">
      <header className="space-y-1.5">
        <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit gap-1.5">
          <Link href={destinoProvas}>
            <ArrowLeft className="size-4" aria-hidden />
            Voltar para provas
          </Link>
        </Button>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Construtor de prova
        </p>
        <h1 className="font-serif text-2xl text-foreground md:text-3xl">
          {idEdicao ? "Editar prova" : "Criar prova completa"}
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Escolha questões do banco e, se faltar alguma, crie na hora — ela
          entra direto na prova.
        </p>
      </header>

      {idEdicao && carregandoEdicao && (
        <div className="mt-6 rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          Carregando dados da prova...
        </div>
      )}

      {/* Dados da prova */}
      <section className="mt-6 grid gap-4 rounded-xl border border-border bg-card p-5 md:grid-cols-3 md:p-6">
        <div className="space-y-1.5">
          <Label htmlFor="prova-nome">Nome da prova</Label>
          <Input
            id="prova-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Diagnóstica · Matemática · 8º ano"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Turma</Label>
          <Select value={turmaId} onValueChange={setTurmaId}>
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={turmasCarregando ? "Carregando…" : "Selecione…"}
              />
            </SelectTrigger>
            <SelectContent>
              {turmasAgrupadas.map(([escola, lista]) => (
                <SelectGroup key={escola}>
                  <SelectLabel className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {escola}
                  </SelectLabel>
                  {lista.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nome}
                      {t.serie ? (
                        <span className="text-muted-foreground">
                          {" "}
                          · {obterNomeSerie(t.serie as SerieEscolar)}
                        </span>
                      ) : null}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="prova-tempo">Tempo limite (min)</Label>
          <Input
            id="prova-tempo"
            type="number"
            min={1}
            max={480}
            value={tempoLimiteMinutos}
            onChange={(e) =>
              setTempoLimiteMinutos(
                Math.max(1, Math.min(480, Number(e.target.value) || 1)),
              )
            }
          />
        </div>
      </section>

      {/* Montagem — banco | prova */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Banco */}
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-serif text-lg text-foreground">
              Banco de questões
            </h2>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setDialogAberto(true)}
            >
              <Plus className="size-3.5" aria-hidden />
              Criar questão
            </Button>
          </div>
          <div className="relative mt-3">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por enunciado…"
              className="pl-8"
            />
          </div>
          {/* Filtros (mesmos das questões normais): série · matéria · nível */}
          <div className="mt-2 grid grid-cols-3 gap-2">
            <Select value={filtroSerie} onValueChange={setFiltroSerie}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Série" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as séries</SelectItem>
                {SERIES.map(([v, r]) => (
                  <SelectItem key={v} value={v}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroMateria} onValueChange={setFiltroMateria}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Matéria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as matérias</SelectItem>
                {MATERIAS.map(([v, r]) => (
                  <SelectItem key={v} value={v}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroNivel} onValueChange={setFiltroNivel}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Nível" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os níveis</SelectItem>
                {NIVEIS.map(([v, r]) => (
                  <SelectItem key={v} value={v}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(busca ||
            filtroSerie !== "todos" ||
            filtroMateria !== "todos" ||
            filtroNivel !== "todos") && (
            <button
              type="button"
              onClick={() => {
                setBusca("");
                setFiltroSerie("todos");
                setFiltroMateria("todos");
                setFiltroNivel("todos");
              }}
              className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              Limpar filtros
            </button>
          )}
          <div className="mt-3 flex flex-col gap-2 rounded-lg border border-border bg-background p-3 sm:flex-row sm:items-end">
            <div className="w-full sm:max-w-28">
              <Label htmlFor="qtd-automatica" className="text-xs">
                Quantidade
              </Label>
              <Input
                id="qtd-automatica"
                type="number"
                min={1}
                max={quantidadeMaxima}
                value={quantidadeAutomatica}
                onChange={(e) =>
                  setQuantidadeAutomatica(Number(e.target.value) || 1)
                }
                className="mt-1"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              className="w-full gap-2 sm:flex-1"
              disabled={!turmaId || sugerirQuestoes.isPending}
              onClick={gerarPorFiltros}
            >
              {sugerirQuestoes.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="size-4" aria-hidden />
              )}
              Gerar automática
            </Button>
          </div>
          <ul className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {bancoQuery.isLoading && (
              <li className="py-8 text-center text-sm text-muted-foreground">
                Carregando questões…
              </li>
            )}
            {!bancoQuery.isLoading && banco.length === 0 && (
              <li className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma questão publicada encontrada. Use “Criar questão”.
              </li>
            )}
            {banco.map((q) => (
              <li
                key={q.id}
                className="flex items-start gap-2 rounded-lg border border-border bg-background p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm text-foreground">
                    {q.enunciado}
                  </p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {NOMES_MATERIA[q.materia] ?? q.materia} ·{" "}
                    {NOMES_NIVEL[q.nivel] ?? q.nivel}
                  </p>
                </div>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => adicionar(q)}
                  aria-label="Adicionar à prova"
                >
                  <Plus className="size-4" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
          {totalPaginasBanco > 1 && (
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={paginaBanco <= 1 || bancoQuery.isFetching}
                onClick={() => setPaginaBanco((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                Página {metaBanco?.pagina ?? paginaBanco} de {totalPaginasBanco}
                <span className="ml-1 hidden sm:inline">
                  ({metaBanco?.total ?? 0} questões)
                </span>
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={
                  paginaBanco >= totalPaginasBanco || bancoQuery.isFetching
                }
                onClick={() => setPaginaBanco((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          )}
        </section>

        {/* Prova */}
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-serif text-lg text-foreground">
            Nesta prova{" "}
            <span className="font-mono text-sm tabular-nums text-muted-foreground">
              ({selecionadas.length})
            </span>
          </h2>
          {selecionadas.length === 0 ? (
            <div className="mt-3 flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-12 text-center">
              <Sparkles className="size-6 text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">
                Adicione questões do banco ou crie novas.
              </p>
            </div>
          ) : (
            <ol className="mt-3 max-h-[460px] space-y-2 overflow-y-auto pr-1">
              {selecionadas.map((q, i) => (
                <li
                  key={q.id}
                  className="flex items-start gap-2 rounded-lg border border-border bg-background p-3"
                >
                  <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-border font-mono text-[11px] tabular-nums text-muted-foreground">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm text-foreground">
                      {q.enunciado}
                    </p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {NOMES_MATERIA[q.materia] ?? q.materia} ·{" "}
                      {NOMES_NIVEL[q.nivel] ?? q.nivel}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => remover(q.id)}
                    aria-label="Remover da prova"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </Button>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {/* Barra de ações fixa */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-3">
          <p className="hidden text-xs text-muted-foreground sm:block">
            {selecionadas.length} questão(ões) ·{" "}
            {podeSalvar
              ? "pronto para salvar"
              : selecionadas.length < quantidadeMinima
                ? `mínimo de ${quantidadeMinima} questões`
                : "preencha nome e turma"}
          </p>
          <div className="flex flex-1 justify-end gap-2 sm:flex-none">
            <Button variant="ghost" asChild>
              <Link href={destinoProvas}>Cancelar</Link>
            </Button>
            <Button
              variant="outline"
              disabled={!podeSalvar || salvando}
              onClick={() => salvar(false)}
            >
              {salvando ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              Salvar rascunho
            </Button>
            <Button
              disabled={!podeSalvar || salvando}
              onClick={() => salvar(true)}
              className="bg-success text-success-foreground hover:bg-success/90"
            >
              {salvando ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Check className="size-4" aria-hidden />
              )}
              Salvar e liberar
            </Button>
          </div>
        </div>
      </div>

      <DialogCriarQuestao
        aberto={dialogAberto}
        aoFechar={() => setDialogAberto(false)}
        aoCriar={(q) => {
          adicionar(q);
          setDialogAberto(false);
        }}
      />
    </div>
  );
}

// ============================================================
// Diálogo de autoria de questão inline
// ============================================================

const MIN_ALT = 2;
const MAX_ALT = 5;

function novaAlt() {
  return { id: gerarIdAleatorio("alt"), texto: "", correta: false };
}

function DialogCriarQuestao({
  aberto,
  aoFechar,
  aoCriar,
}: {
  aberto: boolean;
  aoFechar: () => void;
  aoCriar: (q: Questao) => void;
}) {
  const criar = useCriarQuestao();
  const [enunciado, setEnunciado] = useState("");
  const [serie, setSerie] = useState<SerieEscolar>("9_fundamental");
  const [materia, setMateria] = useState<Materia>("matematica");
  const [conteudo, setConteudo] = useState("");
  const [nivel, setNivel] = useState<NivelDificuldade>("medio");
  const [alternativas, setAlternativas] = useState([
    novaAlt(),
    novaAlt(),
    novaAlt(),
    novaAlt(),
  ]);

  function limpar() {
    setEnunciado("");
    setConteudo("");
    setAlternativas([novaAlt(), novaAlt(), novaAlt(), novaAlt()]);
  }

  const temCorreta = alternativas.some((a) => a.correta);
  const altOk = alternativas.every((a) => a.texto.trim().length > 0);
  const valido =
    enunciado.trim().length >= 10 &&
    conteudo.trim().length >= 2 &&
    altOk &&
    temCorreta;

  async function submeter() {
    if (!valido || criar.isPending) return;
    const dados: Partial<Questao> = {
      enunciado: enunciado.trim(),
      serie,
      materia,
      conteudo: conteudo.trim(),
      nivel,
      adaptacoes: [],
      competencias: [],
      tempoEstimadoSegundos: 60,
      status: "rascunho",
      alternativas: alternativas.map((a, i) => ({
        id: a.id,
        texto: a.texto.trim(),
        correta: a.correta,
        ordem: i,
      })),
    };
    try {
      const q = await criar.mutateAsync(dados);
      toast.success("Questão criada e adicionada à prova");
      limpar();
      aoCriar(q);
    } catch {
      toast.error("Falha ao criar a questão.");
    }
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(o) => {
        if (!o) aoFechar();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg">Nova questão</DialogTitle>
          <DialogDescription>
            A questão entra como rascunho seu e já é adicionada à prova.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="q-enunciado" className="text-xs">
              Enunciado
            </Label>
            <textarea
              id="q-enunciado"
              value={enunciado}
              onChange={(e) => setEnunciado(e.target.value)}
              placeholder="Digite o enunciado (mín. 10 caracteres)…"
              className="min-h-[90px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              maxLength={2000}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Série</Label>
              <Select
                value={serie}
                onValueChange={(v) => setSerie(v as SerieEscolar)}
              >
                <SelectTrigger className="w-full">
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
            <div className="space-y-1.5">
              <Label className="text-xs">Matéria</Label>
              <Select
                value={materia}
                onValueChange={(v) => setMateria(v as Materia)}
              >
                <SelectTrigger className="w-full">
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
            <div className="space-y-1.5">
              <Label htmlFor="q-conteudo" className="text-xs">
                Conteúdo
              </Label>
              <Input
                id="q-conteudo"
                value={conteudo}
                onChange={(e) => setConteudo(e.target.value)}
                placeholder="ex.: Função afim"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nível</Label>
              <Select
                value={nivel}
                onValueChange={(v) => setNivel(v as NivelDificuldade)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NIVEIS.map(([v, r]) => (
                    <SelectItem key={v} value={v}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">
                Alternativas (clique na letra p/ marcar a correta)
              </Label>
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={() =>
                  setAlternativas((a) =>
                    a.length >= MAX_ALT ? a : [...a, novaAlt()],
                  )
                }
                disabled={alternativas.length >= MAX_ALT}
              >
                <Plus className="size-3" aria-hidden />
              </Button>
            </div>
            <ul className="space-y-2">
              {alternativas.map((a, i) => (
                <li key={a.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setAlternativas((arr) =>
                        arr.map((x) => ({ ...x, correta: x.id === a.id })),
                      )
                    }
                    className={cn(
                      "inline-flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold",
                      a.correta
                        ? "border-success bg-success-muted text-success"
                        : "border-border text-muted-foreground hover:border-success/50",
                    )}
                    aria-pressed={a.correta}
                    aria-label={a.correta ? "Correta" : "Marcar correta"}
                  >
                    {String.fromCharCode(65 + i)}
                  </button>
                  <Input
                    value={a.texto}
                    onChange={(e) =>
                      setAlternativas((arr) =>
                        arr.map((x) =>
                          x.id === a.id ? { ...x, texto: e.target.value } : x,
                        ),
                      )
                    }
                    placeholder={`Alternativa ${String.fromCharCode(65 + i)}`}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() =>
                      setAlternativas((arr) =>
                        arr.length <= MIN_ALT
                          ? arr
                          : arr.filter((x) => x.id !== a.id),
                      )
                    }
                    disabled={alternativas.length <= MIN_ALT}
                    aria-label="Remover alternativa"
                  >
                    <X className="size-3.5" aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={aoFechar} disabled={criar.isPending}>
            Cancelar
          </Button>
          <Button onClick={submeter} disabled={!valido || criar.isPending}>
            {criar.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Plus className="size-4" aria-hidden />
            )}
            Criar e adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function agruparPorEscola(
  turmas: TurmaEnriquecida[],
): [string, TurmaEnriquecida[]][] {
  const grupos = new Map<string, TurmaEnriquecida[]>();
  for (const t of turmas) {
    const chave = t.escolaNome || "Outras";
    const lista = grupos.get(chave);
    if (lista) lista.push(t);
    else grupos.set(chave, [t]);
  }
  return Array.from(grupos.entries()).sort(([a], [b]) =>
    a.localeCompare(b, "pt-BR"),
  );
}

function valoresUnicos<T extends string>(valores: T[]): T[] {
  return Array.from(new Set(valores));
}

function calcularDistribuicao(questoes: Questao[]): ParametrosSimulado["distribuicao"] {
  const total = questoes.length || 1;
  const faceis = questoes.filter((q) => q.nivel === "facil").length;
  const medias = questoes.filter((q) => q.nivel === "medio").length;
  const facil = Math.round((faceis / total) * 100);
  const medio = Math.round((medias / total) * 100);
  return {
    facil,
    medio,
    dificil: Math.max(0, 100 - facil - medio),
  };
}
