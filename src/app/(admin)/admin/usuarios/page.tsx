"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import {
  useAdminEscolas,
  useAdminUsuarios,
  useCriarUsuario,
  type FiltrosUsuario,
} from "@/hooks/api/use-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatarTempoRelativo, gerarIniciais } from "@/lib/utils";
import type { PerfilUsuario } from "@/types";

const PERFIS: { valor: PerfilUsuario; rotulo: string }[] = [
  { valor: "admin", rotulo: "Admin" },
  { valor: "gestor", rotulo: "Gestor" },
  { valor: "aluno", rotulo: "Aluno" },
  { valor: "suporte", rotulo: "Suporte" },
];

const TOM_PERFIL: Record<PerfilUsuario, string> = {
  admin: "bg-primary-muted text-primary-text",
  gestor: "bg-ia-muted text-ia",
  aluno: "bg-success-muted text-success",
  suporte: "bg-warning-muted text-warning",
};

const POR_PAGINA = 20;

const esquemaUsuario = z.object({
  nome: z.string().min(2, "Mínimo 2 caracteres"),
  email: z.email("Email inválido"),
  perfil: z.enum(["admin", "gestor", "aluno", "suporte"]),
  escolaId: z.string().min(1, "Selecione uma escola"),
});

type FormUsuario = z.infer<typeof esquemaUsuario>;

export default function PaginaAdminUsuarios() {
  const [busca, setBusca] = useState<string>("");
  const [buscaDebounced, setBuscaDebounced] = useState<string>("");
  const [perfilFiltro, setPerfilFiltro] = useState<PerfilUsuario | "todos">(
    "todos",
  );
  const [escolaFiltro, setEscolaFiltro] = useState<string>("todas");
  const [pagina, setPagina] = useState<number>(1);
  const [modalAberto, setModalAberto] = useState<boolean>(false);

  useEffect(() => {
    const id = setTimeout(() => setBuscaDebounced(busca), 300);
    return () => clearTimeout(id);
  }, [busca]);

  useEffect(() => {
    setPagina(1);
  }, [buscaDebounced, perfilFiltro, escolaFiltro]);

  const filtros = useMemo<FiltrosUsuario>(
    () => ({
      busca: buscaDebounced || undefined,
      perfil: perfilFiltro !== "todos" ? [perfilFiltro] : undefined,
      escolaId: escolaFiltro !== "todas" ? escolaFiltro : undefined,
      pagina,
      porPagina: POR_PAGINA,
    }),
    [buscaDebounced, perfilFiltro, escolaFiltro, pagina],
  );

  const { data, isLoading, isError, refetch } = useAdminUsuarios(filtros);
  const { data: escolas } = useAdminEscolas();

  const meta = data?.meta;
  const inicioFaixa = meta ? (meta.pagina - 1) * meta.porPagina + 1 : 0;
  const fimFaixa = meta
    ? Math.min(meta.pagina * meta.porPagina, meta.total)
    : 0;

  const temFiltroAtivo =
    buscaDebounced.length > 0 ||
    perfilFiltro !== "todos" ||
    escolaFiltro !== "todas";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-10">
      {/* Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Painel administrativo
          </p>
          <h1
            className="mt-2 font-serif text-3xl tracking-tight md:text-4xl"
          >
            Usuários
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
            Cadastros do ecossistema. Filtra por perfil, escola e status; cria
            ou edita acessos.
          </p>
        </div>
        <Dialog open={modalAberto} onOpenChange={setModalAberto}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus data-icon="inline-start" />
              Novo usuário
            </Button>
          </DialogTrigger>
          <FormularioNovoUsuario
            escolas={escolas?.map((e) => ({ id: e.id, nome: e.nome })) ?? []}
            aoSucesso={() => setModalAberto(false)}
          />
        </Dialog>
      </header>

      {/* Filtros */}
      <section
        className="mt-8 flex flex-col gap-3 md:flex-row md:items-center"
        role="region"
        aria-label="Filtros"
      >
        <div className="relative w-full md:max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou email..."
            aria-label="Buscar usuário"
            className="pl-9"
          />
        </div>
        <Select
          value={perfilFiltro}
          onValueChange={(v) => setPerfilFiltro(v as PerfilUsuario | "todos")}
        >
          <SelectTrigger className="w-full md:w-40">
            <SelectValue placeholder="Perfil" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os perfis</SelectItem>
            {PERFIS.map((p) => (
              <SelectItem key={p.valor} value={p.valor}>
                {p.rotulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={escolaFiltro} onValueChange={setEscolaFiltro}>
          <SelectTrigger className="w-full md:w-56">
            <SelectValue placeholder="Escola" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as escolas</SelectItem>
            {escolas?.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      {/* Erro */}
      {isError && (
        <div
          className="mt-8 flex items-start justify-between gap-4 rounded-xl border border-destructive/30 bg-destructive-muted p-5 text-destructive"
          role="alert"
        >
          <p className="text-sm">Erro ao carregar usuários.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Tentar de novo
          </Button>
        </div>
      )}

      {/* Lista */}
      <section
        className="mt-8"
        role="region"
        aria-label="Lista de usuários"
        aria-busy={isLoading}
      >
        {isLoading || !data ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : data.dados.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
            {temFiltroAtivo
              ? "Nenhum usuário encontrado com esses filtros."
              : "Nenhum usuário cadastrado ainda."}
          </p>
        ) : (
          <>
            {/* Desktop tabela */}
            <div className="hidden rounded-xl border border-border bg-card md:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border">
                    <TableHead className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Usuário
                    </TableHead>
                    <TableHead className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Perfil
                    </TableHead>
                    <TableHead className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Escola
                    </TableHead>
                    <TableHead className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Status
                    </TableHead>
                    <TableHead className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Último acesso
                    </TableHead>
                    <TableHead className="w-[1%]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.dados.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar size="sm">
                            {u.fotoUrl && (
                              <AvatarImage src={u.fotoUrl} alt={u.nome} />
                            )}
                            <AvatarFallback>
                              {gerarIniciais(u.nome)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm">{u.nome}</p>
                            <p className="truncate font-mono text-xs text-muted-foreground">
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                            TOM_PERFIL[u.perfil],
                          )}
                        >
                          {u.perfil}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {u.escola ?? "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 text-xs",
                            u.ativo ? "text-success" : "text-muted-foreground",
                          )}
                        >
                          <span
                            className={cn(
                              "size-1.5 rounded-full",
                              u.ativo ? "bg-success" : "bg-muted-foreground",
                            )}
                            aria-hidden
                          />
                          {u.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground tabular-nums">
                        {u.ultimoAcesso
                          ? formatarTempoRelativo(u.ultimoAcesso)
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => toast.success("Editor abriria aqui")}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() =>
                              toast.success(
                                u.ativo
                                  ? `${u.nome} desativado`
                                  : `${u.nome} reativado`,
                              )
                            }
                          >
                            {u.ativo ? "Desativar" : "Reativar"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <ul className="space-y-3 md:hidden">
              {data.dados.map((u) => (
                <li
                  key={u.id}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex items-center gap-3">
                    <Avatar size="sm">
                      {u.fotoUrl && (
                        <AvatarImage src={u.fotoUrl} alt={u.nome} />
                      )}
                      <AvatarFallback>{gerarIniciais(u.nome)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{u.nome}</p>
                      <p className="truncate font-mono text-xs text-muted-foreground">
                        {u.email}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                        TOM_PERFIL[u.perfil],
                      )}
                    >
                      {u.perfil}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
                    <span>{u.escola ?? "—"}</span>
                    <span className="tabular-nums">
                      {u.ultimoAcesso
                        ? formatarTempoRelativo(u.ultimoAcesso)
                        : "—"}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => toast.success("Editor abriria aqui")}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() =>
                        toast.success(
                          u.ativo
                            ? `${u.nome} desativado`
                            : `${u.nome} reativado`,
                        )
                      }
                    >
                      {u.ativo ? "Desativar" : "Reativar"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Paginação */}
            {meta && meta.totalPaginas > 1 && (
              <footer className="mt-6 flex items-center justify-between gap-4 border-t border-border pt-4">
                <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground tabular-nums">
                  Mostrando {inicioFaixa}–{fimFaixa} de {meta.total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagina((p) => Math.max(1, p - 1))}
                    disabled={pagina <= 1}
                  >
                    <ChevronLeft data-icon="inline-start" />
                    Anterior
                  </Button>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {pagina} / {meta.totalPaginas}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPagina((p) => Math.min(meta.totalPaginas, p + 1))
                    }
                    disabled={pagina >= meta.totalPaginas}
                  >
                    Próxima
                    <ChevronRight data-icon="inline-end" />
                  </Button>
                </div>
              </footer>
            )}
          </>
        )}
      </section>
    </div>
  );
}

// ============================================================
// Modal: criar usuário
// ============================================================

function FormularioNovoUsuario({
  escolas,
  aoSucesso,
}: {
  escolas: { id: string; nome: string }[];
  aoSucesso: () => void;
}) {
  const criar = useCriarUsuario();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isValid },
  } = useForm<FormUsuario>({
    resolver: zodResolver(esquemaUsuario),
    mode: "onChange",
    defaultValues: {
      nome: "",
      email: "",
      perfil: "aluno",
      escolaId: "",
    },
  });

  const perfilAtual = watch("perfil");
  const escolaAtual = watch("escolaId");

  function aoSubmeter(dados: FormUsuario) {
    criar.mutate(dados, {
      onSuccess: () => {
        toast.success(`${dados.nome} criado`);
        reset();
        aoSucesso();
      },
      onError: () => toast.error("Falha ao criar usuário"),
    });
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Novo usuário</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={handleSubmit(aoSubmeter)}
        className="space-y-4"
        noValidate
      >
        <div>
          <Label htmlFor="form-nome" className="text-xs">
            Nome
          </Label>
          <Input
            id="form-nome"
            {...register("nome")}
            className="mt-1.5"
            aria-invalid={!!errors.nome}
          />
          {errors.nome && (
            <p className="mt-1 text-xs text-destructive">
              {errors.nome.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="form-email" className="text-xs">
            Email
          </Label>
          <Input
            id="form-email"
            type="email"
            {...register("email")}
            className="mt-1.5"
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>
        <div>
          <Label className="text-xs">Perfil</Label>
          <Select
            value={perfilAtual}
            onValueChange={(v) =>
              setValue("perfil", v as PerfilUsuario, {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger className="mt-1.5 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERFIS.map((p) => (
                <SelectItem key={p.valor} value={p.valor}>
                  {p.rotulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Escola</Label>
          <Select
            value={escolaAtual}
            onValueChange={(v) =>
              setValue("escolaId", v, { shouldValidate: true })
            }
          >
            <SelectTrigger
              className="mt-1.5 w-full"
              aria-invalid={!!errors.escolaId}
            >
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {escolas.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.escolaId && (
            <p className="mt-1 text-xs text-destructive">
              {errors.escolaId.message}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            type="submit"
            disabled={!isValid || criar.isPending}
          >
            Criar
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
