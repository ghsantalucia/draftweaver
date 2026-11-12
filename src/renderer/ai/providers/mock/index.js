/**
 * @file Provedor Mock (somente para testes). Não chama nenhuma API: responde de forma
 * determinística e permite exercitar tool calling, travas e revisão de rascunhos por comandos.
 *
 * Comandos (digite no chat):
 *   /ajuda                                 lista os comandos
 *   /listar                                chama list_files
 *   /ler <caminho>                         chama read_file
 *   /anexar <caminho> | <texto>            chama append_to_file
 *   /substituir <caminho> | <de> | <para>  chama replace_in_file
 *   /escrever <caminho> | <conteúdo>       chama write_file
 *   /lento                                 demora 6s (testa o indicador de carregamento)
 *   /erro                                  lança um erro (testa o tratamento de falhas)
 * Qualquer outro texto recebe uma resposta em Markdown.
 */

import { runToolLoop } from "../../toolLoop.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const HELP = `**Provedor Mock** — comandos disponíveis:

- \`/listar\`
- \`/ler <caminho>\`
- \`/anexar <caminho> | <texto>\`
- \`/substituir <caminho> | <de> | <para>\`
- \`/escrever <caminho> | <conteúdo>\`
- \`/lento\` e \`/erro\``;

/** Estima tokens (~4 caracteres por token). */
const estimateTokens = (text) => Math.ceil((text || "").length / 4);

/**
 * Converte o prompt em um plano: uma chamada de ferramenta ou uma resposta direta.
 * @param {string} prompt
 * @returns {{tool?: {name: string, args: Object}, reply?: string, delay?: number, fail?: boolean}}
 */
function parseCommand(prompt) {
  const [command, ...rest] = prompt.trim().split(/\s+/);
  const args = prompt.trim().slice(command.length).trim();
  const parts = args.split("|").map((p) => p.trim());

  switch (command) {
    case "/ajuda":
      return { reply: HELP };
    case "/listar":
      return { tool: { name: "list_files", args: {} } };
    case "/ler":
      return { tool: { name: "read_file", args: { path: args } } };
    case "/anexar":
      return {
        tool: {
          name: "append_to_file",
          args: { path: parts[0], text: parts[1] },
        },
      };
    case "/substituir":
      return {
        tool: {
          name: "replace_in_file",
          args: { path: parts[0], old_text: parts[1], new_text: parts[2] },
        },
      };
    case "/escrever":
      return {
        tool: {
          name: "write_file",
          args: { path: parts[0], content: parts[1] },
        },
      };
    case "/lento":
      return {
        delay: 6000,
        reply: "Terminei de **pensar** (resposta lenta simulada).",
      };
    case "/erro":
      return { fail: true };
    default:
      return {
        reply: [
          "## Resposta simulada",
          "",
          `Você disse: _"${prompt.trim()}"_`,
          "",
          "Este provedor **não** usa IA de verdade. Exemplos de formatação:",
          "",
          "- item com **negrito**",
          "- item com *itálico* e `código`",
          "",
          "> Digite `/ajuda` para ver os comandos de teste.",
        ].join("\n"),
      };
  }
}

/**
 * Formata o resultado das ferramentas como resposta final em Markdown.
 * @param {Array<{call: Object, output: string, isError: boolean}>} results
 */
function formatResults(results) {
  return results
    .map(({ call, output, isError }) =>
      isError
        ? `❌ **${call.name}** falhou: ${output}`
        : `✅ **${call.name}**:\n\n\`\`\`\n${output}\n\`\`\``,
    )
    .join("\n\n");
}

/**
 * Simula uma requisição ao provedor, executando ferramentas reais quando o comando pedir.
 * @param {Object} params
 * @param {string} params.prompt
 * @param {string} params.systemPrompt
 * @param {Object} params.toolContext
 * @returns {Promise<{text: string, usage: import("../../toolLoop.js").TokenUsage}>}
 */
export async function sendRequest({ prompt, systemPrompt = "", toolContext }) {
  await sleep(600);

  const plan = parseCommand(prompt);
  if (plan.fail) throw new Error("Erro simulado pelo provedor Mock.");
  if (plan.delay) await sleep(plan.delay);

  const inputTokens = estimateTokens(systemPrompt) + estimateTokens(prompt);

  return runToolLoop({
    conversation: { step: 0, results: [] },
    toolContext,

    async callModel(conversation) {
      // Após as ferramentas, simula o tempo de "escrever" a resposta final
      await sleep(conversation.step === 0 ? 300 : 1500);
      if (conversation.step === 0 && plan.tool) {
        return {
          text: "",
          raw: null,
          usage: { input: inputTokens, output: 20 },
          toolCalls: [{ id: "mock-call", ...plan.tool }],
        };
      }
      const text = plan.tool ? formatResults(conversation.results) : plan.reply;
      return {
        text,
        raw: null,
        usage: { input: inputTokens, output: estimateTokens(text) },
        toolCalls: [],
      };
    },

    appendToolResults(conversation, _turn, results) {
      conversation.step = 1;
      conversation.results = results;
    },
  });
}
