"use client";

import { useEffect, useMemo, useState } from "react";
import { Mail, MapPin, Phone, Plus, Search, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import {
  useAdminEscolas,
  useCriarEscola,
  useCriarUsuario,
  useRemoverEscola,
  type EscolaComGestores,
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
import { cn, gerarIniciais } from "@/lib/utils";
import type { PerfilUsuario, Usuario } from "@/types";

const PERFIL_ESCOLA: { valor: PerfilUsuario; rotulo: string }[] = [
  { valor: "gestor", rotulo: "Gestor" },
  { valor: "suporte", rotulo: "Suporte" },
];

export default function PaginaAdminEscolas() {
  const [busca, setBusca] = useState<string>("");
  const [buscaDebounced, setBuscaDebounced] = useState<string>("");
  const [apenasAtivas, setApenasAtivas] = useState<boolean>(false);
  const [modalCriarAberto, setModalCriarAberto] = useState<boolean>(false);
  const [escolaRemovendo, setEscolaRemovendo] =
    useState<EscolaComGestores | null>(null);

  const remover = useRemoverEscola();

  useEffect(() => {
    const id = setTimeout(() => setBuscaDebounced(busca), 300);
    return () => clearTimeout(id);
  }, [busca]);

  const filtros = useMemo(
    () => ({
      busca: buscaDebounced || undefined,
      ativas: apenasAtivas || undefined,
    }),
    [buscaDebounced, apenasAtivas],
  );

  const { data, isLoading, isError, refetch } = useAdminEscolas(filtros);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-10">
      {/* Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Painel administrativo
          </p>
          <h1 className="mt-2 font-serif text-3xl tracking-tight md:text-4xl">
            Escolas
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
            Rede de escolas conectadas ao ecossistema. Gestão por código INEP,
            gestores e usuários atrelados.
          </p>
        </div>
        <Dialog open={modalCriarAberto} onOpenChange={setModalCriarAberto}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus data-icon="inline-start" />
              Nova escola
            </Button>
          </DialogTrigger>
          <FormularioNovaEscola aoSucesso={() => setModalCriarAberto(false)} />
        </Dialog>
      </header>

      {/* Filtros */}
      <section
        className="mt-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
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
            placeholder="Buscar por nome ou município..."
            aria-label="Buscar escola"
            className="pl-9"
          />
        </div>
        <button
          type="button"
          onClick={() => setApenasAtivas((v) => !v)}
          aria-pressed={apenasAtivas}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors",
            "[transition-timing-function:var(--ease-snap)]",
            apenasAtivas
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground",
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              apenasAtivas ? "bg-primary-foreground" : "bg-success",
            )}
            aria-hidden
          />
          Apenas ativas
        </button>
      </section>

      {/* Erro */}
      {isError && (
        <div
          className="mt-8 flex items-start justify-between gap-4 rounded-xl border border-destructive/30 bg-destructive-muted p-5 text-destructive"
          role="alert"
        >
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider">
              Erro ao carregar escolas
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Tentar de novo
          </Button>
        </div>
      )}

      {/* Lista */}
      <section
        className="mt-8"
        role="region"
        aria-label="Lista de escolas"
        aria-busy={isLoading}
      >
        {isLoading || !data ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
            Nenhuma escola encontrada com os filtros atuais.
          </p>
        ) : (
          <>
            {/* Desktop tabela */}
            <div className="hidden rounded-xl border border-border bg-card md:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border">
                    <TableHead className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Escola
                    </TableHead>
                    <TableHead className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      INEP
                    </TableHead>
                    <TableHead className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Gestores
                    </TableHead>
                    <TableHead className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Alunos
                    </TableHead>
                    <TableHead className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Status
                    </TableHead>
                    <TableHead className="w-[1%]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((escola) => (
                    <TableRow key={escola.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="font-medium">{escola.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {escola.municipio} · {escola.uf}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs tabular-nums">
                        {escola.codigoInep}
                      </TableCell>
                      <TableCell>
                        <PilhaGestores gestores={escola.gestores} />
                      </TableCell>
                      <TableCell className="font-mono text-sm tabular-nums">
                        {escola.totalAlunos}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                            escola.ativa
                              ? "bg-success-muted text-success"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {escola.ativa ? "ativa" : "inativa"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <DetalhesEscola escola={escola} />
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            aria-label={`Excluir ${escola.nome}`}
                            className="text-destructive hover:text-destructive"
                            onClick={() => setEscolaRemovendo(escola)}
                          >
                            <Trash2 className="size-3.5" />
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
              {data.map((escola) => (
                <li
                  key={escola.id}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{escola.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {escola.municipio} · {escola.uf}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                        escola.ativa
                          ? "bg-success-muted text-success"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {escola.ativa ? "ativa" : "inativa"}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <PilhaGestores gestores={escola.gestores} />
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      {escola.totalAlunos} alunos
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <DetalhesEscola escola={escola} />
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setEscolaRemovendo(escola)}
                    >
                      <Trash2 className="size-3" />
                      Excluir
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* Dialog: confirmar exclusão de escola */}
      <Dialog
        open={escolaRemovendo !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setEscolaRemovendo(null);
        }}
      >
        {escolaRemovendo && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Excluir escola</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Tem certeza que quer excluir{" "}
                <strong className="text-foreground">{escolaRemovendo.nome}</strong>{" "}
                (INEP {escolaRemovendo.codigoInep})?
              </p>
              <p className="text-xs text-muted-foreground">
                A exclusão só funciona se a escola não tiver turmas nem
                usuários vinculados. Caso contrário, transfira ou desative
                esses vínculos primeiro.
              </p>
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEscolaRemovendo(null)}
                disabled={remover.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={remover.isPending}
                onClick={() => {
                  const alvo = escolaRemovendo;
                  remover.mutate(alvo.id, {
                    onSuccess: () => {
                      toast.success(`${alvo.nome} excluída`);
                      setEscolaRemovendo(null);
                    },
                    onError: (erro) => {
                      const mensagem =
                        erro && typeof erro === "object" && "mensagem" in erro
                          ? String((erro as { mensagem: unknown }).mensagem)
                          : "Não foi possível excluir.";
                      toast.error(mensagem);
                    },
                  });
                }}
              >
                {remover.isPending ? "Excluindo..." : "Excluir definitivamente"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

// ============================================================
// Pilha de avatares estilo Linktree
// ============================================================

function PilhaGestores({ gestores }: { gestores: Usuario[] }) {
  const visiveis = gestores.slice(0, 3);
  const restantes = gestores.length - visiveis.length;

  if (gestores.length === 0) {
    return (
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        Sem gestor
      </span>
    );
  }

  return (
    <div className="group/pilha flex -space-x-2">
      {visiveis.map((g, i) => (
        <Avatar
          key={g.id}
          size="sm"
          className={cn(
            "ring-2 ring-card transition-transform duration-200",
            "[transition-timing-function:var(--ease-snap)]",
            // primeiro avatar destaca no hover, demais recuam
            i === 0
              ? "group-hover/pilha:translate-x-0 group-hover/pilha:scale-110"
              : `group-hover/pilha:translate-x-${i} group-hover/pilha:opacity-70`,
          )}
          style={{ zIndex: visiveis.length - i }}
          title={g.nome}
        >
          {g.fotoUrl && <AvatarImage src={g.fotoUrl} alt={g.nome} />}
          <AvatarFallback>{gerarIniciais(g.nome)}</AvatarFallback>
        </Avatar>
      ))}
      {restantes > 0 && (
        <span
          className="relative z-0 inline-flex size-6 items-center justify-center rounded-full bg-muted font-mono text-[10px] text-muted-foreground ring-2 ring-card tabular-nums"
          aria-label={`${restantes} gestores adicionais`}
        >
          +{restantes}
        </span>
      )}
    </div>
  );
}

// ============================================================
// Sheet de detalhes
// ============================================================

function DetalhesEscola({ escola }: { escola: EscolaComGestores }) {
  const [aberto, setAberto] = useState<boolean>(false);
  const [nome, setNome] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [perfil, setPerfil] = useState<PerfilUsuario>("gestor");

  const criar = useCriarUsuario();

  function aoSubmeter(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !email.trim()) {
      toast.error("Preencha nome e email");
      return;
    }
    criar.mutate(
      {
        nome: nome.trim(),
        email: email.trim(),
        perfil,
        escolaId: escola.id,
      },
      {
        onSuccess: () => {
          toast.success(`${nome} adicionado a ${escola.nome}`);
          setNome("");
          setEmail("");
          setPerfil("gestor");
        },
        onError: () => toast.error("Falha ao criar usuário"),
      },
    );
  }

  return (
    <Sheet open={aberto} onOpenChange={setAberto}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm">
          Ver detalhes
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Escola · INEP {escola.codigoInep}
          </p>
          <SheetTitle
            className="mt-1 font-serif text-2xl tracking-tight"
          >
            {escola.nome}
          </SheetTitle>
          <SheetDescription>
            {escola.municipio} · {escola.uf}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-4">
          {/* Info detalhada */}
          <section className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
            <ItemInfo icone={MapPin}>
              {escola.endereco} · CEP {escola.cep}
            </ItemInfo>
            {escola.telefone && (
              <ItemInfo icone={Phone}>{escola.telefone}</ItemInfo>
            )}
            {escola.emailContato && (
              <ItemInfo icone={Mail}>{escola.emailContato}</ItemInfo>
            )}
          </section>

          {/* Gestores */}
          <section>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Gestores ({escola.gestores.length})
            </p>
            <ul className="mt-3 space-y-2">
              {escola.gestores.map((g) => (
                <li
                  key={g.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-3"
                >
                  <Avatar size="sm">
                    {g.fotoUrl && <AvatarImage src={g.fotoUrl} alt={g.nome} />}
                    <AvatarFallback>{gerarIniciais(g.nome)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm">{g.nome}</p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {g.email}
                    </p>
                  </div>
                </li>
              ))}
              {escola.gestores.length === 0 && (
                <li className="text-xs text-muted-foreground">
                  Nenhum gestor atrelado.
                </li>
              )}
            </ul>
          </section>

          {/* Form novo usuário */}
          <section>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              <UserPlus className="mr-1.5 inline size-3" aria-hidden />
              Novo usuário pra esta escola
            </p>
            <form
              onSubmit={aoSubmeter}
              className="mt-3 space-y-3 rounded-lg border border-border p-4"
            >
              <div>
                <Label htmlFor="novo-nome" className="text-xs">
                  Nome
                </Label>
                <Input
                  id="novo-nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="mt-1.5"
                  placeholder="Maria Silva"
                  required
                />
              </div>
              <div>
                <Label htmlFor="novo-email" className="text-xs">
                  Email
                </Label>
                <Input
                  id="novo-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5"
                  placeholder="maria@escola.es.gov.br"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">Perfil</Label>
                <Select
                  value={perfil}
                  onValueChange={(v) => setPerfil(v as PerfilUsuario)}
                >
                  <SelectTrigger className="mt-1.5 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERFIL_ESCOLA.map((p) => (
                      <SelectItem key={p.valor} value={p.valor}>
                        {p.rotulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                size="sm"
                className="w-full"
                disabled={criar.isPending}
              >
                Criar usuário
              </Button>
            </form>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ItemInfo({
  icone: Icone,
  children,
}: {
  icone: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 text-xs text-muted-foreground">
      <Icone className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  );
}

// ============================================================
// Modal: criar nova escola
// ============================================================

function FormularioNovaEscola({ aoSucesso }: { aoSucesso: () => void }) {
  const criar = useCriarEscola();
  const [nome, setNome] = useState("");
  const [codigoInep, setCodigoInep] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [uf, setUf] = useState("ES");
  const [endereco, setEndereco] = useState("");
  const [cep, setCep] = useState("");
  const [telefone, setTelefone] = useState("");
  const [emailContato, setEmailContato] = useState("");

  const nomeOk = nome.trim().length >= 3;
  const inepOk = /^\d{8}$/.test(codigoInep.trim());
  const municipioOk = municipio.trim().length >= 2;
  const ufOk = /^[A-Z]{2}$/.test(uf.toUpperCase());
  const formularioValido = nomeOk && inepOk && municipioOk && ufOk;

  function aoSubmeter(e: React.FormEvent) {
    e.preventDefault();
    if (!formularioValido) return;
    criar.mutate(
      {
        nome: nome.trim(),
        codigoInep: codigoInep.trim(),
        municipio: municipio.trim(),
        uf: uf.toUpperCase(),
        endereco: endereco.trim() || undefined,
        cep: cep.trim() || undefined,
        telefone: telefone.trim() || undefined,
        emailContato: emailContato.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success(`${nome} cadastrada`);
          setNome("");
          setCodigoInep("");
          setMunicipio("");
          setUf("ES");
          setEndereco("");
          setCep("");
          setTelefone("");
          setEmailContato("");
          aoSucesso();
        },
        onError: (erro) => {
          const mensagem =
            erro && typeof erro === "object" && "mensagem" in erro
              ? String((erro as { mensagem: unknown }).mensagem)
              : "Falha ao criar escola";
          toast.error(mensagem);
        },
      },
    );
  }

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Nova escola</DialogTitle>
      </DialogHeader>
      <form onSubmit={aoSubmeter} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="esc-nome" className="text-xs">
            Nome <span className="text-destructive">*</span>
          </Label>
          <Input
            id="esc-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="EEEFM Maria Ortiz"
            className="mt-1.5"
            aria-invalid={nome.length > 0 && !nomeOk}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="esc-inep" className="text-xs">
              Código INEP <span className="text-destructive">*</span>
            </Label>
            <Input
              id="esc-inep"
              value={codigoInep}
              onChange={(e) => setCodigoInep(e.target.value.replace(/\D/g, ""))}
              placeholder="32012345"
              maxLength={8}
              inputMode="numeric"
              className="mt-1.5 font-mono"
              aria-invalid={codigoInep.length > 0 && !inepOk}
            />
            {codigoInep.length > 0 && !inepOk && (
              <p className="mt-1 text-xs text-destructive">
                Deve ter 8 dígitos.
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="esc-uf" className="text-xs">
              UF <span className="text-destructive">*</span>
            </Label>
            <Input
              id="esc-uf"
              value={uf}
              onChange={(e) =>
                setUf(e.target.value.toUpperCase().slice(0, 2))
              }
              placeholder="ES"
              maxLength={2}
              className="mt-1.5 font-mono"
              aria-invalid={uf.length > 0 && !ufOk}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="esc-municipio" className="text-xs">
            Município <span className="text-destructive">*</span>
          </Label>
          <Input
            id="esc-municipio"
            value={municipio}
            onChange={(e) => setMunicipio(e.target.value)}
            placeholder="Vitória"
            className="mt-1.5"
            aria-invalid={municipio.length > 0 && !municipioOk}
          />
        </div>
        <div>
          <Label htmlFor="esc-endereco" className="text-xs">
            Endereço
          </Label>
          <Input
            id="esc-endereco"
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            placeholder="Rua dos Andradas, 123"
            className="mt-1.5"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="esc-cep" className="text-xs">
              CEP
            </Label>
            <Input
              id="esc-cep"
              value={cep}
              onChange={(e) => setCep(e.target.value)}
              placeholder="29010-000"
              className="mt-1.5 font-mono"
            />
          </div>
          <div>
            <Label htmlFor="esc-telefone" className="text-xs">
              Telefone
            </Label>
            <Input
              id="esc-telefone"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(27) 3132-1234"
              className="mt-1.5 font-mono"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="esc-email" className="text-xs">
            Email de contato
          </Label>
          <Input
            id="esc-email"
            type="email"
            value={emailContato}
            onChange={(e) => setEmailContato(e.target.value)}
            placeholder="escola@sedu.es.gov.br"
            className="mt-1.5"
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={aoSucesso}
            disabled={criar.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={!formularioValido || criar.isPending}
          >
            {criar.isPending ? "Cadastrando..." : "Cadastrar escola"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
