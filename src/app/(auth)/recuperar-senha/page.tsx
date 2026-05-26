"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader, Mail, ArrowLeft } from "lucide-react";

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

const esquemaRecuperarSenha = z.object({
  email: z
    .string()
    .min(1, "Informe seu email institucional.")
    .email("Email inválido."),
});

type FormularioRecuperarSenha = z.infer<typeof esquemaRecuperarSenha>;

export default function PaginaRecuperarSenha() {
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const formulario = useForm<FormularioRecuperarSenha>({
    resolver: zodResolver(esquemaRecuperarSenha),
    defaultValues: { email: "" },
    mode: "onTouched",
  });

  async function aoSubmeter(valores: FormularioRecuperarSenha): Promise<void> {
    setEnviando(true);
    try {
      // Mesmo se 4xx, NÃO revelamos se email existe — sempre exibimos sucesso.
      await criar("/auth/recuperar-senha", { email: valores.email }).catch(
        () => undefined,
      );
      setEnviado(true);
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary-muted text-primary-text">
          <Mail className="size-5" />
        </div>
        <header className="flex flex-col gap-2">
          <h1 className="font-serif text-3xl leading-[1.1] tracking-[-0.01em] text-foreground md:text-4xl">
            Verifique seu email
          </h1>
          <p className="text-sm text-muted-foreground">
            Se este email estiver cadastrado, você receberá um link em
            instantes para redefinir sua senha.
          </p>
        </header>
        <p className="rounded-md border border-border bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
          Não chegou? Verifique a caixa de spam ou tente novamente em alguns
          minutos. O link expira em 1 hora.
        </p>
        <div className="flex flex-col gap-2">
          <Button asChild variant="outline" size="lg" className="rounded-md">
            <Link href="/login">
              <ArrowLeft className="size-4" />
              Voltar para o login
            </Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="rounded-md"
            onClick={() => {
              setEnviado(false);
              formulario.reset();
            }}
          >
            Enviar para outro email
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Recuperação
        </span>
        <h1 className="font-serif text-4xl leading-[1.05] tracking-[-0.015em] text-foreground md:text-5xl">
          Esqueceu sua senha?
        </h1>
        <p className="text-sm text-muted-foreground">
          Informe seu email institucional. Vamos enviar um link seguro para
          você redefinir o acesso.
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

          <Button
            type="submit"
            size="lg"
            className="h-11 w-full rounded-md text-sm font-medium"
            disabled={enviando}
          >
            {enviando ? (
              <>
                <Loader className="size-4 animate-spin" />
                Enviando…
              </>
            ) : (
              "Enviar link de recuperação"
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
