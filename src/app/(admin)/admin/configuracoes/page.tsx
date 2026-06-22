"use client";

import { FormEvent, useMemo, useState } from "react";
import { Save, Settings2, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  useAdminConfiguracoes,
  useAtualizarConfiguracao,
} from "@/hooks/api/use-admin";

type ChaveConfig = "provas" | "acessibilidade" | "resultados";

type ProvasConfig = {
  tempoPadraoMinutos: number;
  quantidadeMinimaQuestoes: number;
  quantidadeMaximaQuestoes: number;
  permitirReabrirAposFinalizacao: boolean;
  motivoReaberturaMinCaracteres: number;
};

type AcessibilidadeConfig = {
  tempoExtraPercentualPadrao: number;
  permitirFonteMaior: boolean;
  permitirAltoContraste: boolean;
  permitirLeituraSimplificada: boolean;
};

type ResultadosConfig = {
  mostrarGabaritoAoAluno: boolean;
  mostrarResultadoImediato: boolean;
  notaMinimaRecomendada: number;
};

function numero(valor: unknown, fallback: number): number {
  const n = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(n) ? n : fallback;
}

function booleano(valor: unknown, fallback: boolean): boolean {
  return typeof valor === "boolean" ? valor : fallback;
}

function provasDe(valor: Record<string, unknown> | undefined): ProvasConfig {
  const bruto = valor ?? {};
  return {
    tempoPadraoMinutos: numero(bruto.tempoPadraoMinutos, 60),
    quantidadeMinimaQuestoes: numero(bruto.quantidadeMinimaQuestoes, 3),
    quantidadeMaximaQuestoes: numero(bruto.quantidadeMaximaQuestoes, 100),
    permitirReabrirAposFinalizacao: booleano(
      bruto.permitirReabrirAposFinalizacao,
      true,
    ),
    motivoReaberturaMinCaracteres: numero(
      bruto.motivoReaberturaMinCaracteres,
      5,
    ),
  };
}

function acessibilidadeDe(
  valor: Record<string, unknown> | undefined,
): AcessibilidadeConfig {
  const bruto = valor ?? {};
  return {
    tempoExtraPercentualPadrao: numero(bruto.tempoExtraPercentualPadrao, 25),
    permitirFonteMaior: booleano(bruto.permitirFonteMaior, true),
    permitirAltoContraste: booleano(bruto.permitirAltoContraste, true),
    permitirLeituraSimplificada: booleano(
      bruto.permitirLeituraSimplificada,
      true,
    ),
  };
}

function resultadosDe(
  valor: Record<string, unknown> | undefined,
): ResultadosConfig {
  const bruto = valor ?? {};
  return {
    mostrarGabaritoAoAluno: booleano(bruto.mostrarGabaritoAoAluno, true),
    mostrarResultadoImediato: booleano(bruto.mostrarResultadoImediato, true),
    notaMinimaRecomendada: numero(bruto.notaMinimaRecomendada, 7),
  };
}

export default function PaginaAdminConfiguracoes() {
  const { data, isLoading, isError, refetch } = useAdminConfiguracoes();
  const atualizar = useAtualizarConfiguracao();

  const configPorChave = useMemo(() => {
    return new Map((data ?? []).map((config) => [config.chave, config.valor]));
  }, [data]);

  function salvar(chave: ChaveConfig, valor: Record<string, unknown>) {
    atualizar.mutate(
      { chave, valor },
      {
        onSuccess: () => toast.success("Configuração salva."),
        onError: (erro) =>
          toast.error(
            erro instanceof Error ? erro.message : "Não consegui salvar a configuração.",
          ),
      },
    );
  }

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-10">
        <Skeleton className="h-10 w-72" />
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-96 rounded-xl" />
          ))}
        </div>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-10 md:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Configurações indisponíveis</CardTitle>
            <CardDescription>
              A API não respondeu ao carregar as regras globais.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const provas = provasDe(configPorChave.get("provas"));
  const acessibilidade = acessibilidadeDe(configPorChave.get("acessibilidade"));
  const resultados = resultadosDe(configPorChave.get("resultados"));

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-10">
      <header className="border-b border-border pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Administração
        </p>
        <h1 className="mt-2 font-serif text-3xl tracking-tight md:text-4xl">
          Configurações globais
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
          Regras persistidas no banco que controlam provas, reabertura,
          acessibilidade e visualização de resultados.
        </p>
      </header>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <CardProvas
          key={JSON.stringify(provas)}
          inicial={provas}
          salvando={atualizar.isPending}
          onSalvar={(valor) => salvar("provas", valor)}
        />
        <CardAcessibilidade
          key={JSON.stringify(acessibilidade)}
          inicial={acessibilidade}
          salvando={atualizar.isPending}
          onSalvar={(valor) => salvar("acessibilidade", valor)}
        />
        <CardResultados
          key={JSON.stringify(resultados)}
          inicial={resultados}
          salvando={atualizar.isPending}
          onSalvar={(valor) => salvar("resultados", valor)}
        />
      </div>
    </main>
  );
}

function CardProvas({
  inicial,
  salvando,
  onSalvar,
}: {
  inicial: ProvasConfig;
  salvando: boolean;
  onSalvar: (valor: Record<string, unknown>) => void;
}) {
  const [provas, setProvas] = useState(inicial);

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    onSalvar(provas);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="size-4" aria-hidden />
          Provas
        </CardTitle>
        <CardDescription>
          Define o padrão aplicado ao criar, montar e liberar provas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={enviar}>
          <CampoNumero
            id="tempoPadraoMinutos"
            label="Tempo padrão (min)"
            min={1}
            value={provas.tempoPadraoMinutos}
            onChange={(valor) =>
              setProvas((atual) => ({ ...atual, tempoPadraoMinutos: valor }))
            }
          />
          <CampoNumero
            id="quantidadeMinimaQuestoes"
            label="Mínimo de questões"
            min={1}
            value={provas.quantidadeMinimaQuestoes}
            onChange={(valor) =>
              setProvas((atual) => ({ ...atual, quantidadeMinimaQuestoes: valor }))
            }
          />
          <CampoNumero
            id="quantidadeMaximaQuestoes"
            label="Máximo de questões"
            min={provas.quantidadeMinimaQuestoes}
            value={provas.quantidadeMaximaQuestoes}
            onChange={(valor) =>
              setProvas((atual) => ({ ...atual, quantidadeMaximaQuestoes: valor }))
            }
          />
          <CampoNumero
            id="motivoReaberturaMinCaracteres"
            label="Mínimo do motivo de reabertura"
            min={1}
            value={provas.motivoReaberturaMinCaracteres}
            onChange={(valor) =>
              setProvas((atual) => ({
                ...atual,
                motivoReaberturaMinCaracteres: valor,
              }))
            }
          />
          <CampoSwitch
            id="permitirReabrirAposFinalizacao"
            label="Permitir reabertura"
            checked={provas.permitirReabrirAposFinalizacao}
            onCheckedChange={(checked) =>
              setProvas((atual) => ({
                ...atual,
                permitirReabrirAposFinalizacao: checked,
              }))
            }
          />
          <Button type="submit" disabled={salvando}>
            <Save className="size-4" aria-hidden />
            Salvar provas
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function CardAcessibilidade({
  inicial,
  salvando,
  onSalvar,
}: {
  inicial: AcessibilidadeConfig;
  salvando: boolean;
  onSalvar: (valor: Record<string, unknown>) => void;
}) {
  const [acessibilidade, setAcessibilidade] = useState(inicial);

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    onSalvar(acessibilidade);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SlidersHorizontal className="size-4" aria-hidden />
          Acessibilidade
        </CardTitle>
        <CardDescription>
          Define recursos e tempo extra aplicáveis a alunos com adaptação.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={enviar}>
          <CampoNumero
            id="tempoExtraPercentualPadrao"
            label="Tempo extra padrão (%)"
            min={0}
            value={acessibilidade.tempoExtraPercentualPadrao}
            onChange={(valor) =>
              setAcessibilidade((atual) => ({
                ...atual,
                tempoExtraPercentualPadrao: valor,
              }))
            }
          />
          <CampoSwitch
            id="permitirFonteMaior"
            label="Fonte maior"
            checked={acessibilidade.permitirFonteMaior}
            onCheckedChange={(checked) =>
              setAcessibilidade((atual) => ({ ...atual, permitirFonteMaior: checked }))
            }
          />
          <CampoSwitch
            id="permitirAltoContraste"
            label="Alto contraste"
            checked={acessibilidade.permitirAltoContraste}
            onCheckedChange={(checked) =>
              setAcessibilidade((atual) => ({
                ...atual,
                permitirAltoContraste: checked,
              }))
            }
          />
          <CampoSwitch
            id="permitirLeituraSimplificada"
            label="Leitura simplificada"
            checked={acessibilidade.permitirLeituraSimplificada}
            onCheckedChange={(checked) =>
              setAcessibilidade((atual) => ({
                ...atual,
                permitirLeituraSimplificada: checked,
              }))
            }
          />
          <Button type="submit" disabled={salvando}>
            <Save className="size-4" aria-hidden />
            Salvar acessibilidade
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function CardResultados({
  inicial,
  salvando,
  onSalvar,
}: {
  inicial: ResultadosConfig;
  salvando: boolean;
  onSalvar: (valor: Record<string, unknown>) => void;
}) {
  const [resultados, setResultados] = useState(inicial);

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    onSalvar(resultados);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-4" aria-hidden />
          Resultados
        </CardTitle>
        <CardDescription>
          Controla quando e como o aluno visualiza o desempenho.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={enviar}>
          <CampoNumero
            id="notaMinimaRecomendada"
            label="Nota mínima recomendada"
            min={0}
            max={10}
            step={0.1}
            value={resultados.notaMinimaRecomendada}
            onChange={(valor) =>
              setResultados((atual) => ({ ...atual, notaMinimaRecomendada: valor }))
            }
          />
          <CampoSwitch
            id="mostrarGabaritoAoAluno"
            label="Mostrar gabarito ao aluno"
            checked={resultados.mostrarGabaritoAoAluno}
            onCheckedChange={(checked) =>
              setResultados((atual) => ({
                ...atual,
                mostrarGabaritoAoAluno: checked,
              }))
            }
          />
          <CampoSwitch
            id="mostrarResultadoImediato"
            label="Mostrar resultado imediato"
            checked={resultados.mostrarResultadoImediato}
            onCheckedChange={(checked) =>
              setResultados((atual) => ({
                ...atual,
                mostrarResultadoImediato: checked,
              }))
            }
          />
          <Button type="submit" disabled={salvando}>
            <Save className="size-4" aria-hidden />
            Salvar resultados
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function CampoNumero({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (valor: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(evento) => onChange(numero(evento.target.value, value))}
      />
    </div>
  );
}

function CampoSwitch({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
      <Label htmlFor={id} className="text-sm">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
