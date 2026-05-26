"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  FileEdit,
  FilePlus2,
  FileText,
  Filter,
  LogIn,
  LogOut,
  Send,
  Sparkles,
  Upload,
  UserCog,
  UserPlus,
  X,
  type LucideIcon,
} from "lucide-react";

import {
  useAdminAuditoria,
  type AcaoAuditoriaEnriquecida,
  type FiltrosAuditoria,
} from "@/hooks/api/use-admin";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatarDataBR, gerarIniciais } from "@/lib/utils";
import type { AcaoAuditoria } from "@/types";

// ============================================================
// Tipagem auxiliar
// ============================================================

type TipoAcao = AcaoAuditoria["tipo"];

interface ConfigTipo {
  rotulo: string;
  verbo: string;
  icone: LucideIcon;
  tom: "primary" | "ia" | "success" | "warning" | "muted";
}

const CONFIG_TIPOS: Record<TipoAcao, ConfigTipo> = {
  login: { rotulo: "Login", verbo: "fez login", icone: LogIn, tom: "muted" },
  logout: { rotulo: "Logout", verbo: "saiu da plataforma", icone: LogOut, tom: "muted" },
  criar_questao: { rotulo: "Criar questão", verbo: "criou uma questão", icone: FilePlus2, tom: "primary" },
  editar_questao: { rotulo: "Editar questão", verbo: "editou uma questão", icone: FileEdit, tom: "primary" },
  publicar_questao: { rotulo: "Publicar questão", verbo: "publicou uma questão", icone: FileText, tom: "primary" },
  importar_questoes: { rotulo: "Importação", verbo: "importou questões", icone: Upload, tom: "ia" },
  criar_simulado: { rotulo: "Criar simulado", verbo: "criou um simulado", icone: Sparkles, tom: "success" },
  liberar_simulado: { rotulo: "Liberar simulado", verbo: "liberou um simulado", icone: Send, tom: "success" },
  criar_usuario: { rotulo: "Criar usuário", verbo: "criou um usuário", icone: UserPlus, tom: "warning" },
  editar_usuario: { rotulo: "Editar usuário", verbo: "editou um usuário", icone: UserCog, tom: "warning" },
};

const TIPOS_ORDEM: TipoAcao[] = [
  "login",
  "logout",
  "criar_questao",
  "editar_questao",
  "publicar_questao",
  "importar_questoes",
  "criar_simulado",
  "liberar_simulado",
  "criar_usuario",
  "editar_usuario",
];

const TOM_DOT: Record<ConfigTipo["tom"], string> = {
  primary: "bg-primary text-primary-foreground ring-primary/30",
  ia: "bg-ia text-ia-foreground ring-ia/30",
  success: "bg-success text-success-foreground ring-success/30",
  warning: "bg-warning text-warning-foreground ring-warning/30",
  muted: "bg-muted text-muted-foreground ring-border",
};

const TOM_PILL: Record<ConfigTipo["tom"], string> = {
  primary: "bg-primary-muted text-primary-text border-primary/20",
  ia: "bg-ia-muted text-ia-text border-ia/20",
  success: "bg-success-muted text-success border-success/30",
  warning: "bg-warning-muted text-warning border-warning/30",
  muted: "bg-muted text-muted-foreground border-border",
};

// ============================================================
// Página
// ============================================================

export default function PaginaAuditoria() {
  const [tiposSelecionados, setTiposSelecionados] = useState<TipoAcao[]>([]);
  const [desde, setDesde] = useState<string>("");
  const [ate, setAte] = useState<string>("");

  const filtros = useMemo<FiltrosAuditoria>(() => {
    const f: FiltrosAuditoria = { porPagina: 200 };
    if (tiposSelecionados.length > 0) f.tipo = tiposSelecionados;
    if (desde) f.desde = desde;
    if (ate) f.ate = ate;
    return f;
  }, [tiposSelecionados, desde, ate]);

  const { data, isLoading, isError, refetch } = useAdminAuditoria(filtros);

  const dadosOrdenados = useMemo(() => {
    if (!data?.dados) return [];
    return [...data.dados].sort(
      (a, b) =>
        new Date(b.ocorridoEm).getTime() - new Date(a.ocorridoEm).getTime(),
    );
  }, [data]);

  const grupos = useMemo(() => agruparPorDia(dadosOrdenados), [dadosOrdenados]);

  const total = data?.meta?.total ?? dadosOrdenados.length;
  const temFiltros = tiposSelecionados.length > 0 || desde !== "" || ate !== "";

  function alternarTipo(tipo: TipoAcao) {
    setTiposSelecionados((atual) =>
      atual.includes(tipo)
        ? atual.filter((t) => t !== tipo)
        : [...atual, tipo],
    );
  }

  function limparFiltros() {
    setTiposSelecionados([]);
    setDesde("");
    setAte("");
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6 md:py-10">
      {/* Header */}
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Trilha administrativa
        </p>
        <div className="mt-2 flex items-end justify-between gap-4">
          <h1
            className="font-serif text-3xl tracking-tight md:text-4xl"
          >
            Auditoria
          </h1>
          {!isLoading && (
            <p className="font-mono text-xs uppercase tracking-wider tabular-nums text-muted-foreground">
              {total.toLocaleString("pt-BR")} ações
            </p>
          )}
        </div>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          Toda ação relevante na plataforma fica registrada aqui — quem fez,
          quando, e de onde.
        </p>
      </header>

      {/* Filtros (sticky) */}
      <div
        className={cn(
          "sticky top-0 z-10 -mx-4 mt-6 border-b border-border bg-background/85 px-4 py-4 backdrop-blur md:-mx-6 md:px-6",
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            <Filter className="size-3" aria-hidden />
            Filtros
          </div>
          {temFiltros && (
            <Button
              variant="ghost"
              size="sm"
              onClick={limparFiltros}
              className="h-7 gap-1 px-2 font-mono text-[10px] uppercase tracking-wider"
            >
              <X className="size-3" aria-hidden />
              Limpar filtros
            </Button>
          )}
        </div>

        {/* Pills de tipo */}
        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por tipo de ação">
          {TIPOS_ORDEM.map((tipo) => {
            const cfg = CONFIG_TIPOS[tipo];
            const ativo = tiposSelecionados.includes(tipo);
            const Icone = cfg.icone;
            return (
              <button
                key={tipo}
                type="button"
                onClick={() => alternarTipo(tipo)}
                aria-pressed={ativo}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider",
                  "transition-all duration-200 [transition-timing-function:var(--ease-quart)]",
                  ativo
                    ? TOM_PILL[cfg.tom]
                    : "border-border bg-card text-muted-foreground hover:bg-accent/40",
                )}
              >
                <Icone className="size-3" aria-hidden />
                {cfg.rotulo}
              </button>
            );
          })}
        </div>

        {/* Datas */}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Desde
            <input
              type="date"
              value={desde}
              onChange={(evento) => setDesde(evento.target.value)}
              className="rounded-md border border-border bg-card px-2 py-1 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
              aria-label="Filtrar a partir desta data"
            />
          </label>
          <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Até
            <input
              type="date"
              value={ate}
              onChange={(evento) => setAte(evento.target.value)}
              className="rounded-md border border-border bg-card px-2 py-1 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
              aria-label="Filtrar até esta data"
            />
          </label>
        </div>
      </div>

      {/* Erro */}
      {isError && (
        <div
          className="mt-8 flex items-start justify-between gap-4 rounded-xl border border-destructive/30 bg-destructive-muted p-5 text-destructive"
          role="alert"
        >
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider">
              Erro ao carregar auditoria
            </p>
            <p className="mt-1 text-sm">
              Não consegui buscar o histórico agora.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Tentar de novo
          </Button>
        </div>
      )}

      {/* Timeline */}
      <section className="mt-8" aria-label="Histórico de ações">
        {isLoading ? (
          <SkeletonTimeline />
        ) : grupos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Nada registrado
            </p>
            <p
              className="mt-3 font-serif text-lg tracking-tight"
            >
              Nenhuma ação no período selecionado.
            </p>
          </div>
        ) : (
          <div role="feed" aria-busy={isLoading} className="space-y-10">
            {grupos.map((grupo) => (
              <GrupoDia key={grupo.chave} grupo={grupo} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ============================================================
// Agrupamento por dia
// ============================================================

interface GrupoAuditoria {
  chave: string;
  rotulo: string;
  acoes: AcaoAuditoriaEnriquecida[];
}

function agruparPorDia(
  acoes: AcaoAuditoriaEnriquecida[],
): GrupoAuditoria[] {
  const mapa = new Map<string, AcaoAuditoriaEnriquecida[]>();
  for (const acao of acoes) {
    const data = new Date(acao.ocorridoEm);
    const chave = `${data.getFullYear()}-${data.getMonth()}-${data.getDate()}`;
    const lista = mapa.get(chave);
    if (lista) {
      lista.push(acao);
    } else {
      mapa.set(chave, [acao]);
    }
  }

  const hoje = new Date();
  const ontem = new Date();
  ontem.setDate(hoje.getDate() - 1);

  function rotularDia(amostra: Date): string {
    const mesmoDia =
      amostra.getDate() === hoje.getDate() &&
      amostra.getMonth() === hoje.getMonth() &&
      amostra.getFullYear() === hoje.getFullYear();
    if (mesmoDia) return "Hoje";
    const eOntem =
      amostra.getDate() === ontem.getDate() &&
      amostra.getMonth() === ontem.getMonth() &&
      amostra.getFullYear() === ontem.getFullYear();
    if (eOntem) return "Ontem";
    return formatarDataBR(amostra, "EEEE',' d 'de' MMMM");
  }

  const grupos: GrupoAuditoria[] = [];
  for (const [chave, lista] of mapa.entries()) {
    const amostra = new Date(lista[0].ocorridoEm);
    grupos.push({
      chave,
      rotulo: rotularDia(amostra),
      acoes: lista,
    });
  }
  // Já estavam ordenados desc; preserva ordem.
  return grupos;
}

// ============================================================
// Grupo por dia
// ============================================================

function GrupoDia({ grupo }: { grupo: GrupoAuditoria }) {
  return (
    <div>
      <h2 className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {grupo.rotulo}
      </h2>
      <ol className="relative mt-4 space-y-1 border-l border-border pl-6">
        {grupo.acoes.map((acao) => (
          <li key={acao.id}>
            <ItemAuditoria acao={acao} />
          </li>
        ))}
      </ol>
    </div>
  );
}

// ============================================================
// Item de auditoria (expansível)
// ============================================================

function ItemAuditoria({ acao }: { acao: AcaoAuditoriaEnriquecida }) {
  const [aberto, setAberto] = useState(false);
  const cfg = CONFIG_TIPOS[acao.tipo];
  const Icone = cfg.icone;
  const nome = acao.usuario?.nome ?? acao.usuarioNome ?? "Usuário";
  const horario = formatarDataBR(acao.ocorridoEm, "HH:mm");

  // Detalhe especial para importação: extrair número do detalhe se possível.
  const descricao = `${nome} ${cfg.verbo}`;

  return (
    <div className="relative">
      {/* Dot na linha */}
      <span
        aria-hidden
        className={cn(
          "absolute -left-[33px] top-3 size-3 rounded-full ring-4",
          TOM_DOT[cfg.tom],
        )}
      />

      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className={cn(
          "group flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left",
          "transition-colors duration-200 [transition-timing-function:var(--ease-quart)]",
          "hover:bg-accent/40",
        )}
      >
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-md",
            TOM_PILL[cfg.tom],
            "border",
          )}
          aria-hidden
        >
          <Icone className="size-3.5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm text-foreground">
              <span className="font-medium">{descricao}</span>
              {acao.detalhes && (
                <span className="text-muted-foreground">
                  {" "}
                  — {acao.detalhes}
                </span>
              )}
            </p>
            <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider tabular-nums text-muted-foreground">
              {horario}
            </span>
          </div>

          <div className="mt-1 flex items-center gap-2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            <span
              aria-hidden
              className="inline-flex size-4 items-center justify-center rounded-full bg-muted text-[8px] font-semibold text-muted-foreground"
            >
              {gerarIniciais(nome).slice(0, 2)}
            </span>
            <span className="truncate">{cfg.rotulo}</span>
            {acao.alvoTipo && (
              <>
                <span aria-hidden>·</span>
                <span>{acao.alvoTipo}</span>
              </>
            )}
            <ChevronDown
              className={cn(
                "ml-auto size-3 transition-transform duration-200",
                aberto && "rotate-180",
              )}
              aria-hidden
            />
          </div>
        </div>
      </button>

      {aberto && (
        <div className="ml-10 mr-3 mt-1 mb-2 rounded-md border border-border bg-card/60 px-3 py-2.5">
          <dl className="grid gap-2 font-mono text-[10px] uppercase tracking-wider sm:grid-cols-2">
            <DetalheLinha rotulo="Usuário ID" valor={acao.usuarioId} />
            <DetalheLinha rotulo="IP de origem" valor={acao.ipOrigem ?? "—"} />
            {acao.alvoId && (
              <DetalheLinha rotulo="Alvo ID" valor={acao.alvoId} />
            )}
            <DetalheLinha
              rotulo="Ocorrido em"
              valor={formatarDataBR(acao.ocorridoEm, "dd/MM/yyyy HH:mm:ss")}
            />
          </dl>
        </div>
      )}
    </div>
  );
}

function DetalheLinha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-[9px] tracking-[0.14em] text-muted-foreground/70">
        {rotulo}
      </dt>
      <dd className="mt-0.5 truncate text-xs normal-case tracking-normal text-foreground tabular-nums">
        {valor}
      </dd>
    </div>
  );
}

// ============================================================
// Skeleton
// ============================================================

function SkeletonTimeline() {
  return (
    <div className="space-y-10">
      {Array.from({ length: 2 }, (_, gIdx) => (
        <div key={gIdx}>
          <Skeleton className="h-3 w-32" />
          <ol className="relative mt-4 space-y-3 border-l border-border pl-6">
            {Array.from({ length: 4 }, (_, iIdx) => (
              <li key={iIdx}>
                <Skeleton className="h-12 w-full rounded-lg" />
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}
