import { spawnSync } from "node:child_process";
import { setDefaultResultOrder } from "node:dns";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

setDefaultResultOrder("ipv4first");

const raiz = resolve(fileURLToPath(new URL("..", import.meta.url)));
const args = new Set(process.argv.slice(2));
const skipBuild = args.has("--skip-build");
const skipBackend = args.has("--skip-backend");
const backendArg = process.argv
  .slice(2)
  .find((arg) => arg.startsWith("--backend-url="));
const bffArg = process.argv
  .slice(2)
  .find((arg) => arg.startsWith("--bff-url="));
const backendUrl = (
  backendArg?.split("=").slice(1).join("=") ||
  process.env.BACKEND_URL ||
  "http://127.0.0.1:8000"
).replace(/\/$/, "");
const bffUrl = (
  bffArg?.split("=").slice(1).join("=") ||
  process.env.NEXT_PUBLIC_APP_URL ||
  ""
).replace(/\/$/, "");

const pnpmExecPath = process.env.npm_execpath;
const pnpmComando =
  pnpmExecPath && /\.(cjs|js)$/i.test(pnpmExecPath)
    ? { comando: process.execPath, prefixo: [pnpmExecPath] }
    : {
        comando: pnpmExecPath || (process.platform === "win32" ? "pnpm.cmd" : "pnpm"),
        prefixo: [],
      };
const falhas = [];

function titulo(texto) {
  console.log(`\n== ${texto} ==`);
}

function falhar(mensagem) {
  falhas.push(mensagem);
  console.error(`ERRO: ${mensagem}`);
}

function rodar(nome, comando, parametros) {
  titulo(nome);
  const resultado = spawnSync(comando, parametros, {
    cwd: raiz,
    stdio: "inherit",
  });
  if (resultado.error) {
    falhar(`${nome} nao conseguiu iniciar '${comando}': ${resultado.error.message}`);
    return;
  }
  if (resultado.status !== 0) {
    falhar(`${nome} falhou com codigo ${resultado.status ?? "desconhecido"}.`);
  }
}

function rodarPnpm(nome, parametros) {
  if (process.platform === "win32" && pnpmComando.prefixo.length === 0 && /\.cmd$/i.test(pnpmComando.comando)) {
    rodar(nome, "cmd.exe", ["/d", "/s", "/c", pnpmComando.comando, ...parametros]);
    return;
  }
  rodar(nome, pnpmComando.comando, [...pnpmComando.prefixo, ...parametros]);
}

function buscarViaCurlWindows(url, init = {}) {
  const metodo = init.method ?? "GET";
  const corpo = typeof init.body === "string" ? init.body : "";
  const args = [
    "--ssl-no-revoke",
    "-sS",
    "-X",
    metodo,
    "-w",
    "\n__HTTP_STATUS__:%{http_code}",
  ];
  if (corpo) {
    args.push("-H", "Content-Type: application/json", "--data", corpo);
  }
  args.push(url);

  const resultado = spawnSync("curl.exe", args, {
    cwd: raiz,
    encoding: "utf8",
  });
  if (resultado.error) throw resultado.error;
  if (resultado.status !== 0) {
    throw new Error(resultado.stderr || `curl HTTP falhou com codigo ${resultado.status}`);
  }
  const saida = resultado.stdout;
  const marcador = "\n__HTTP_STATUS__:";
  const indice = saida.lastIndexOf(marcador);
  if (indice === -1) throw new Error("curl HTTP nao retornou status.");
  return {
    body: saida.slice(0, indice),
    status: Number(saida.slice(indice + marcador.length).trim()),
  };
}

async function buscarJson(url, init = {}) {
  try {
    const resposta = await fetch(url, init);
    const texto = await resposta.text();
    return {
      ok: resposta.ok,
      status: resposta.status,
      dados: texto ? JSON.parse(texto) : null,
    };
  } catch (erro) {
    if (process.platform === "win32" && url.startsWith("https://")) {
      const resposta = buscarViaCurlWindows(url, init);
      let dados = null;
      if (resposta.body) {
        try {
          dados = JSON.parse(resposta.body);
        } catch {
          dados = resposta.body;
        }
      }
      return {
        ok: resposta.status >= 200 && resposta.status < 300,
        status: resposta.status,
        dados,
      };
    }
    throw erro;
  }
}

function listarArquivos(caminho, ignorar = new Set()) {
  const abs = resolve(raiz, caminho);
  if (!existsSync(abs)) return [];
  const stat = statSync(abs);
  if (stat.isFile()) return [abs];
  const saida = [];
  for (const item of readdirSync(abs)) {
    if (ignorar.has(item)) continue;
    const filho = join(abs, item);
    const filhoStat = statSync(filho);
    if (filhoStat.isDirectory()) {
      saida.push(...listarArquivos(relative(raiz, filho), ignorar));
    } else {
      saida.push(filho);
    }
  }
  return saida;
}

function verificarSemMocksRuntime() {
  titulo("Mocks/MSW fora do runtime");
  const alvos = [
    ...listarArquivos("src", new Set(["node_modules"])),
    ...listarArquivos("backend/app"),
    "package.json",
    "docker-compose.yml",
  ]
    .map((arquivo) => resolve(raiz, arquivo))
    .filter((arquivo) => existsSync(arquivo));

  const padroes = [
    "NEXT_PUBLIC_USE_MOCKS",
    "mockServiceWorker",
    "seed_from_mocks",
    "export-mocks",
    "sedu-fila-respostas",
    "sincronizarFila",
    "@/lib/mocks",
    "lib/mocks",
  ];
  const ocorrencias = [];
  for (const arquivo of alvos) {
    const texto = readFileSync(arquivo, "utf8");
    for (const padrao of padroes) {
      if (texto.includes(padrao)) {
        ocorrencias.push(`${relative(raiz, arquivo)} -> ${padrao}`);
      }
    }
  }
  if (ocorrencias.length > 0) {
    falhar(`Dependencia runtime de mock encontrada:\n${ocorrencias.join("\n")}`);
    return;
  }
  console.log("OK: nenhum mock/MSW/fila local encontrado em runtime.");
}

function validarPostman() {
  titulo("Collection Postman local");
  const arquivo = resolve(raiz, "postman/simulados-sedu-fluxo.postman_collection.json");
  if (!existsSync(arquivo)) {
    console.log("AVISO: collection local nao existe. O guia escrito continua em docs/postman-fluxo-backend.md.");
    return;
  }
  try {
    const json = JSON.parse(readFileSync(arquivo, "utf8"));
    const itens = Array.isArray(json.item) ? json.item : [];
    const nomes = itens.map((item) => item.name);
    const obrigatorios = [
      "00 - Login admin",
      "01 - Cadastrar questao 1",
      "05 - Associar as 3 questoes a prova",
      "15 - Finalizar com questao 3 em branco",
      "17 - Negativo: aluno nao refaz sem reabertura",
      "18 - Reabrir tentativa do aluno",
    ];
    const ausentes = obrigatorios.filter((nome) => !nomes.includes(nome));
    if (ausentes.length > 0) {
      falhar(`Collection Postman incompleta: ${ausentes.join(", ")}`);
      return;
    }
    console.log(`OK: collection valida com ${itens.length} requisicoes.`);
  } catch (erro) {
    falhar(`Collection Postman invalida: ${erro.message}`);
  }
}

async function verificarBackend() {
  if (skipBackend) {
    titulo("Backend/API");
    console.log("PULADO: --skip-backend informado.");
    return;
  }
  titulo("Backend/API");
  if (bffUrl) {
    await verificarBff();
    return;
  }
  try {
    const health = await buscarJson(`${backendUrl}/health/detalhado`);
    if (!health.ok) {
      falhar(`/health/detalhado retornou HTTP ${health.status}.`);
      return;
    }
    const dadosHealth = health.dados;
    if (dadosHealth.status !== "online") {
      falhar(`/health/detalhado retornou status ${dadosHealth.status}.`);
    } else {
      console.log(`OK: backend online, banco ${dadosHealth.banco?.status ?? "desconhecido"}.`);
    }

    const openapi = await buscarJson(`${backendUrl}/openapi.json`);
    if (!openapi.ok) {
      falhar(`/openapi.json retornou HTTP ${openapi.status}.`);
      return;
    }
    const spec = openapi.dados;
    const paths = spec.paths ?? {};
    const obrigatorios = [
      "/questoes",
      "/gestor/simulados",
      "/gestor/simulados/{simulado_id}/montar",
      "/gestor/simulados/{simulado_id}/alunos/{aluno_id}/reabrir",
      "/aluno/simulado/{simulado_id}/finalizar",
      "/diagnostico",
    ];
    const ausentes = obrigatorios.filter((path) => !paths[path]);
    if (ausentes.length > 0) {
      falhar(`OpenAPI sem endpoints obrigatorios: ${ausentes.join(", ")}`);
      return;
    }
    console.log("OK: OpenAPI contem endpoints essenciais do fluxo.");
  } catch (erro) {
    falhar(
      `Backend indisponivel em ${backendUrl}. Inicie a API ou rode com --skip-backend. Detalhe: ${erro.message}`,
    );
  }
}

async function verificarBff() {
  try {
    const landing = await buscarJson(`${bffUrl}/api/public/landing`);
    if (!landing.ok) {
      falhar(`/api/public/landing retornou HTTP ${landing.status}.`);
      return;
    }
    const dadosLanding = landing.dados;
    const metricas = dadosLanding.metricas ?? {};
    const camposMetricas = [
      "totalEscolas",
      "totalAlunos",
      "totalSimulados",
      "totalQuestoes",
    ];
    const ausentes = camposMetricas.filter((campo) => typeof metricas[campo] !== "number");
    if (ausentes.length > 0) {
      falhar(`BFF publico sem metricas obrigatorias: ${ausentes.join(", ")}`);
      return;
    }

    const loginInvalido = await buscarJson(`${bffUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "qa-invalido@example.com", senha: "errada" }),
    });
    if (loginInvalido.status !== 401) {
      falhar(`/api/auth/login negativo retornou HTTP ${loginInvalido.status}; esperado 401.`);
      return;
    }

    console.log("OK: BFF publico responde e chama dados reais do backend/banco.");
  } catch (erro) {
    falhar(`BFF indisponivel em ${bffUrl}. Detalhe: ${erro.message}`);
  }
}

async function main() {
  verificarSemMocksRuntime();
  validarPostman();
  await verificarBackend();
  rodarPnpm("TypeScript", ["exec", "tsc", "--noEmit"]);
  rodarPnpm("ESLint", ["run", "lint"]);
  if (skipBuild) {
    titulo("Build");
    console.log("PULADO: --skip-build informado.");
  } else {
    rodarPnpm("Build Next.js", ["run", "build"]);
  }

  if (falhas.length > 0) {
    console.error("\nQA FINAL REPROVADO");
    for (const falha of falhas) console.error(`- ${falha}`);
    process.exit(1);
  }
  console.log("\nQA FINAL APROVADO");
}

await main();
