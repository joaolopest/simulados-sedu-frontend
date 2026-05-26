# Simulados SEDU

Plataforma estadual de simulados com correção e geração assistida por IA.

> Avaliação que não trava o aluno nem sobrecarrega o professor. Questão boa, feedback rápido, dado limpo na ponta da rede.

## Sobre

Frontend da plataforma de simulados da Secretaria de Estado da Educação de Sergipe (SEDU). Atende alunos da rede estadual e professores que precisam aplicar, corrigir e analisar simulados sem montar prova no Word às 23h. A IA entra na geração de itens alinhados à matriz de referência e na correção de questões abertas — o professor revisa, não substitui. Construído pra rodar em escola pública: rede instável, dispositivos variados, sessão de prova longa.

## Stack

| Camada | Ferramentas |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Server Components |
| Tipagem | TypeScript estrito |
| Estilo | Tailwind CSS v4 |
| Componentes | shadcn/ui sobre Radix |
| IA | Claude API / OpenAI (geração e avaliação de itens) |
| Deploy | Vercel |

## Decisões técnicas

- **App Router com Server Components por padrão.** A maior parte da plataforma é leitura: lista de simulados, gabarito, relatório de turma. Renderizar no servidor reduz JS no cliente — crítico em Chromebook de escola e celular 3G. Client Component só onde tem interação real (cronômetro, marcação de resposta, editor do professor).
- **shadcn/ui em vez de MUI ou Chakra.** Componentes copiados pro repositório, não importados de pacote. Permite ajustar acessibilidade (foco, leitor de tela, teclado) sem brigar com tema de biblioteca, e mantém o bundle enxuto. Radix por baixo garante semântica WAI-ARIA correta — requisito de acessibilidade do governo.
- **IA com schema rígido e banco de itens validado.** Geração de questão passa por function calling com JSON schema (enunciado, alternativas, gabarito, habilidade BNCC, justificativa). Toda saída é validada com Zod antes de persistir, e nenhum item vai pro aluno sem revisão humana do professor. Alucinação aqui é problema pedagógico, não bug de UX.
- **Tailwind v4 com tokens de design no CSS.** Variáveis em `@theme` no CSS direto, sem `tailwind.config.ts` engordando. Tipografia e espaçamento seguem escala fixa — interface de prova precisa ser previsível, não criativa.
- **Server Actions para submissão de simulado.** Resposta do aluno vai por Server Action com revalidação direcionada. Menos endpoint REST pra manter, menos surface pra inconsistência entre cliente e servidor quando a rede da escola cai no meio da prova.

## Como rodar localmente

```bash
git clone https://github.com/joaolopest/simulados-sedu-frontend.git
cd simulados-sedu-frontend
pnpm install
cp .env.example .env.local   # preencher chaves de IA e backend
pnpm dev
```

Aplicação sobe em `http://localhost:3000`.

## Deploy

Deploy contínuo na Vercel a partir da branch `main`. URL de produção: _a definir_.

---

[LinkedIn](https://linkedin.com/in/joaolopest) · joaolopest@gmail.com
