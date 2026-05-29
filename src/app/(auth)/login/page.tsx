"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Eye,
  EyeOff,
  Loader,
  ShieldCheck,
  GraduationCap,
  Headphones,
  Building2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { criar } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { PerfilUsuario, UsuarioAutenticado } from "@/types";

const esquemaLogin = z.object({
  email: z
    .string()
    .min(1, "Informe seu email institucional.")
    .email("Email inválido."),
  senha: z.string().min(6, "Senha precisa ter pelo menos 6 caracteres."),
});

type FormularioLogin = z.infer<typeof esquemaLogin>;

interface RespostaLogin {
  usuario: UsuarioAutenticado;
}

const HOME_POR_PERFIL: Record<PerfilUsuario, string> = {
  admin: "/admin/dashboard",
  gestor: "/gestor/dashboard",
  aluno: "/aluno/home",
  suporte: "/suporte/dashboard",
};

const PERFIS_DEV: ReadonlyArray<{
  perfil: PerfilUsuario;
  rotulo: string;
  descricao: string;
  Icone: typeof ShieldCheck;
}> = [
  {
    perfil: "admin",
    rotulo: "ADMIN — Secretaria",
    descricao: "Curadoria, escolas, auditoria",
    Icone: ShieldCheck,
  },
  {
    perfil: "gestor",
    rotulo: "GESTOR — Coordenador",
    descricao: "Simulados, turmas, alertas",
    Icone: Building2,
  },
  {
    perfil: "aluno",
    rotulo: "ALUNO",
    descricao: "Executar simulado",
    Icone: GraduationCap,
  },
  {
    perfil: "suporte",
    rotulo: "SUPORTE — Professor",
    descricao: "Acompanhar alunos",
    Icone: Headphones,
  },
];

function ConteudoLogin() {
  const router = useRouter();
  const parametros = useSearchParams();
  const fazerLogin = useAuthStore((s) => s.fazerLogin);
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [perfilCarregando, setPerfilCarregando] =
    useState<PerfilUsuario | null>(null);
  const [enviandoForm, setEnviandoForm] = useState(false);

  const formulario = useForm<FormularioLogin>({
    resolver: zodResolver(esquemaLogin),
    defaultValues: { email: "", senha: "" },
    mode: "onTouched",
  });

  function destinoPos(perfil: PerfilUsuario): string {
    const retorno = parametros.get("retorno");
    if (retorno && retorno.startsWith("/")) return retorno;
    return HOME_POR_PERFIL[perfil];
  }

  async function autenticarComPayload(
    payload: Record<string, unknown>,
    perfilDevAtual: PerfilUsuario | null,
  ): Promise<void> {
    try {
      const resposta = await criar<RespostaLogin>("/auth/login", payload);
      fazerLogin(resposta.usuario);
      router.push(destinoPos(resposta.usuario.perfil));
    } catch (erro) {
      const mensagem =
        erro && typeof erro === "object" && "mensagem" in erro
          ? String((erro as { mensagem: unknown }).mensagem)
          : "Não foi possível entrar. Tente novamente.";
      if (perfilDevAtual) {
        toast.error(`Falha no acesso rápido (${perfilDevAtual})`, {
          description: mensagem,
        });
      } else {
        formulario.setError("senha", { type: "server", message: mensagem });
      }
    }
  }

  async function aoSubmeter(valores: FormularioLogin): Promise<void> {
    setEnviandoForm(true);
    try {
      await autenticarComPayload(valores, null);
    } finally {
      setEnviandoForm(false);
    }
  }

  async function aoEntrarComoDev(perfil: PerfilUsuario): Promise<void> {
    setPerfilCarregando(perfil);
    try {
      await autenticarComPayload({ perfilDev: perfil }, perfil);
    } finally {
      setPerfilCarregando(null);
    }
  }

  const ehDev = process.env.NODE_ENV === "development";

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <span className="texto-rotulo-lg">Acesso institucional</span>
        <h1 className="titulo-display text-foreground">Entrar na plataforma</h1>
        <p className="text-sm text-muted-foreground">
          Use seu email <span className="text-foreground">@sedu.es.gov.br</span>{" "}
          ou o login do aluno fornecido pela escola.
        </p>
      </header>

      <Form {...formulario}>
        <form
          onSubmit={formulario.handleSubmit(aoSubmeter)}
          className="flex flex-col gap-5"
          noValidate
        >
          <FormField
            control={formulario.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    autoComplete="email"
                    placeholder="seu.nome@sedu.es.gov.br"
                    inputMode="email"
                    autoFocus
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={formulario.control}
            name="senha"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Senha</FormLabel>
                  <Link
                    href="/recuperar-senha"
                    className="text-xs font-medium text-primary-text underline-offset-4 hover:underline"
                  >
                    Esqueci minha senha
                  </Link>
                </div>
                <FormControl>
                  <div className="relative">
                    <Input
                      {...field}
                      type={senhaVisivel ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setSenhaVisivel((v) => !v)}
                      aria-label={
                        senhaVisivel ? "Ocultar senha" : "Mostrar senha"
                      }
                      aria-pressed={senhaVisivel}
                      className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {senhaVisivel ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            size="lg"
            className="botao-primario-elevado mt-1 h-11 w-full rounded-md text-sm font-medium"
            disabled={enviandoForm}
          >
            {enviandoForm ? (
              <>
                <Loader className="size-4 animate-spin" />
                Entrando…
              </>
            ) : (
              "Entrar"
            )}
          </Button>
        </form>
      </Form>

      {ehDev ? (
        <section
          aria-label="Acesso rápido de desenvolvimento"
          className="flex flex-col gap-4"
        >
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Acesso rápido (dev)
            </span>
            <Separator className="flex-1" />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PERFIS_DEV.map(({ perfil, rotulo, descricao, Icone }) => {
              const carregando = perfilCarregando === perfil;
              return (
                <Button
                  key={perfil}
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => aoEntrarComoDev(perfil)}
                  disabled={perfilCarregando !== null}
                  className="h-auto justify-start rounded-md py-2.5 text-left"
                >
                  <span className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-primary-muted text-primary-text">
                      {carregando ? (
                        <Loader className="size-3.5 animate-spin" />
                      ) : (
                        <Icone className="size-3.5" />
                      )}
                    </span>
                    <span className="flex flex-col">
                      <span className="text-xs font-semibold leading-tight tracking-[0.02em]">
                        {rotulo}
                      </span>
                      <span className="text-[11px] font-normal leading-tight text-muted-foreground">
                        {descricao}
                      </span>
                    </span>
                  </span>
                </Button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Botões disponíveis apenas em <code>NODE_ENV=development</code>.
            Loga direto com mock do perfil — não use em produção.
          </p>
        </section>
      ) : null}
    </div>
  );
}

export default function PaginaLogin() {
  return (
    <Suspense fallback={<div className="h-[420px]" aria-hidden />}>
      <ConteudoLogin />
    </Suspense>
  );
}
