# QA Final Do Plano

Este QA valida se o projeto esta pronto para o fluxo principal:

1. cadastrar questoes;
2. criar prova;
3. associar questoes;
4. criar aluno;
5. inscrever aluno;
6. aluno responder;
7. gerar resultado persistido.

Ele tambem verifica se o runtime saiu de mock/MSW/fila local e se as rotas essenciais aparecem na OpenAPI do backend.

## Comando Rapido Local

Use quando quiser verificar TypeScript, lint, collection Postman e ausencia de mocks, sem depender do backend estar ligado:

```powershell
pnpm run qa:final -- --skip-backend --skip-build
```

## Comando Completo Local

Com o backend rodando em `http://127.0.0.1:8000`:

```powershell
pnpm run qa:final
```

Se o backend estiver em outra URL:

```powershell
pnpm run qa:final -- --backend-url=http://127.0.0.1:8000
```

## Comando Contra Producao

Para validar o backend direto publicado na Vercel, sem refazer o build local:

```powershell
pnpm run qa:final -- --backend-url=https://simulados-sedu.vercel.app/_/backend --skip-build
```

Esse e o mesmo prefixo usado no Postman para chamar a API FastAPI diretamente.

Tambem e possivel validar a camada BFF publica (`/api`):

```powershell
pnpm run qa:final -- --bff-url=https://simulados-sedu.vercel.app --skip-build
```

Esse segundo modo confirma que a aplicacao publica chama dados reais do backend/banco por tras das rotas Next.js.

## O Que O QA Confere

- Nenhuma dependencia runtime de `mock`, `MSW`, `NEXT_PUBLIC_USE_MOCKS`, `seed_from_mocks`, `export-mocks` ou fila local de respostas.
- Collection Postman local existe e cobre o fluxo principal, incluindo teste negativo de refazer prova sem reabertura.
- Backend responde `/health/detalhado`.
- OpenAPI contem rotas essenciais de questoes, provas, montagem, reabertura, finalizacao e diagnostico.
- Em modo BFF, `/api/public/landing` responde com metricas reais e `/api/auth/login` reprova credenciais invalidas com 401.
- TypeScript passa.
- ESLint passa.
- Build do Next.js passa, exceto quando `--skip-build` for usado.

## Guia Do Fluxo No Postman

O passo a passo copiavel para executar o fluxo no Postman esta em:

```text
docs/postman-fluxo-backend.md
```

A collection local esta em:

```text
postman/simulados-sedu-fluxo.postman_collection.json
```

Essa pasta esta ignorada pelo Git de proposito, porque nao e necessaria para rodar a aplicacao.
