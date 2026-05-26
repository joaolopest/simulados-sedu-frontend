"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Eye, EyeOff, Loader, ArrowLeft, X } from "lucide-react";
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
import { criar } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ChecagemSenha {
  id: string;
  rotulo: string;
  satisfaz: (senha: string) => boolean;
}

const CHECAGENS: ChecagemSenha[] = [
  {
    id: "comprimento",
    rotulo: "Mínimo 8 caracteres",
    satisfaz: (senha) => senha.length >= 8,
  },
  {
    id: "maiuscula",
    rotulo: "Letra maiúscula (A-Z)",
    satisfaz: (senha) => /[A-Z]/.test(senha),
  },
  {
    id: "minuscula",
    rotulo: "Letra minúscula (a-z)",
    satisfaz: (senha) => /[a-z]/.test(senha),
  },
  {
    id: "numero",
    rotulo: "Número (0-9)",
    satisfaz: (senha) => /[0-9]/.test(senha),
  },
  {
    id: "simbolo",
    rotulo: "Símbolo (!@#$…)",
    satisfaz: (senha) => /[^A-Za-z0-9]/.test(senha),
  },
];

const esquemaPrimeiroAcesso = z
  .object({
    senha: z
      .string()
      .min(8, "Mínimo 8 caracteres.")
      .regex(/[A-Z]/, "Inclua pelo menos uma maiúscula.")
      .regex(/[a-z]/, "Inclua pelo menos uma minúscula.")
      .regex(/[0-9]/, "Inclua pelo menos um número.")
      .regex(/[^A-Za-z0-9]/, "Inclua pelo menos um símbolo."),
    confirmacao: z.string().min(1, "Repita sua nova senha."),
  })
  .refine((dados) => dados.senha === dados.confirmacao, {
    path: ["confirmacao"],
    message: "As senhas não coincidem.",
  });

type FormularioPrimeiroAcesso = z.infer<typeof esquemaPrimeiroAcesso>;

const NIVEIS = [
  { rotulo: "Muito fraca", classeBarra: "bg-destructive" },
  { rotulo: "Fraca", classeBarra: "bg-warning" },
  { rotulo: "Razoável", classeBarra: "bg-warning" },
  { rotulo: "Boa", classeBarra: "bg-primary" },
  { rotulo: "Excelente", classeBarra: "bg-success" },
] as const;

function calcularForca(senha: string): number {
  if (!senha) return 0;
  return CHECAGENS.reduce(
    (acumulador, item) => acumulador + (item.satisfaz(senha) ? 1 : 0),
    0,
  );
}

function ConteudoPrimeiroAcesso() {
  const router = useRouter();
  const parametros = useSearchParams();
  const token = parametros.get("token") ?? "";

  const [verSenha, setVerSenha] = useState(false);
  const [verConfirmacao, setVerConfirmacao] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const formulario = useForm<FormularioPrimeiroAcesso>({
    resolver: zodResolver(esquemaPrimeiroAcesso),
    defaultValues: { senha: "", confirmacao: "" },
    mode: "onChange",
  });

  const senhaAtual = formulario.watch("senha");
  const forca = useMemo(() => calcularForca(senhaAtual), [senhaAtual]);
  const nivel = NIVEIS[Math.max(0, forca - 1)];

  async function aoSubmeter(valores: FormularioPrimeiroAcesso): Promise<void> {
    setEnviando(true);
    try {
      await criar("/auth/primeiro-acesso", {
        token,
        senha: valores.senha,
      });
      toast.success("Senha definida com sucesso", {
        description: "Você já pode entrar com seus novos dados.",
      });
      router.push("/login");
    } catch (erro) {
      const mensagem =
        erro && typeof erro === "object" && "mensagem" in erro
          ? String((erro as { mensagem: unknown }).mensagem)
          : "Não foi possível definir a senha. Tente novamente.";
      toast.error("Falha ao definir senha", { description: mensagem });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Primeiro acesso
        </span>
        <h1 className="font-serif text-4xl leading-[1.05] tracking-[-0.015em] text-foreground md:text-5xl">
          Defina sua senha
        </h1>
        <p className="text-sm text-muted-foreground">
          Crie uma senha forte para proteger seu acesso à plataforma. Use
          combinação de letras, números e símbolos.
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
            name="senha"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nova senha</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      {...field}
                      type={verSenha ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Digite a nova senha"
                      className="pr-10"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setVerSenha((v) => !v)}
                      aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}
                      aria-pressed={verSenha}
                      className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {verSenha ? (
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

          {/* indicador de força */}
          <div
            className="flex flex-col gap-3"
            aria-live="polite"
            aria-atomic="true"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Força da senha</span>
              <span
                className={cn(
                  "font-medium tabular-nums",
                  forca === 0 && "text-muted-foreground",
                  forca > 0 && forca <= 2 && "text-destructive",
                  forca === 3 && "text-warning",
                  forca === 4 && "text-primary-text",
                  forca === 5 && "text-success",
                )}
              >
                {forca === 0 ? "—" : nivel.rotulo}
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={5}
              aria-valuenow={forca}
              aria-label="Força da senha"
              className="grid grid-cols-5 gap-1"
            >
              {Array.from({ length: 5 }).map((_, indice) => {
                const ativo = indice < forca;
                return (
                  <span
                    key={indice}
                    className={cn(
                      "h-1.5 rounded-full transition-colors",
                      ativo ? nivel.classeBarra : "bg-muted",
                    )}
                  />
                );
              })}
            </div>
            <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {CHECAGENS.map((item) => {
                const ok = item.satisfaz(senhaAtual);
                return (
                  <li
                    key={item.id}
                    className={cn(
                      "flex items-center gap-2 text-xs transition-colors",
                      ok ? "text-success" : "text-muted-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex size-4 shrink-0 items-center justify-center rounded-full",
                        ok
                          ? "bg-success-muted text-success"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {ok ? (
                        <Check className="size-3" strokeWidth={3} />
                      ) : (
                        <X className="size-3" strokeWidth={2.5} />
                      )}
                    </span>
                    {item.rotulo}
                  </li>
                );
              })}
            </ul>
          </div>

          <FormField
            control={formulario.control}
            name="confirmacao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmar nova senha</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      {...field}
                      type={verConfirmacao ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Repita a nova senha"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setVerConfirmacao((v) => !v)}
                      aria-label={
                        verConfirmacao ? "Ocultar senha" : "Mostrar senha"
                      }
                      aria-pressed={verConfirmacao}
                      className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {verConfirmacao ? (
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
            className="h-11 w-full rounded-md text-sm font-medium"
            disabled={enviando || forca < 5}
          >
            {enviando ? (
              <>
                <Loader className="size-4 animate-spin" />
                Salvando…
              </>
            ) : (
              "Definir senha e entrar"
            )}
          </Button>
        </form>
      </Form>

      <div className="text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          Voltar para o login
        </Link>
      </div>
    </div>
  );
}

export default function PaginaPrimeiroAcesso() {
  return (
    <Suspense fallback={<div className="h-[420px]" aria-hidden />}>
      <ConteudoPrimeiroAcesso />
    </Suspense>
  );
}
