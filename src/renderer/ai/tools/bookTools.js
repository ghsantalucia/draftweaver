/**
 * @file Ferramentas de leitura e edição dos arquivos .md do livro, sujeitas às permissões aiRead/aiWrite.
 * Toda escrita vai para o rascunho (.md.temp); o autor sincroniza depois.
 */

import { uiBus } from "../../events/uiBus.js";
import { normalizePath } from "../../utils/helpers.js";
import { splitFrontmatter } from "../../utils/markdown.js";
import { assertPermission, hasPermission, locateFile } from "./permissions.js";

const MAX_READ_CHARS = 60000;

const PATH_PARAM = {
  type: "string",
  description:
    "Caminho do arquivo relativo à raiz do livro, ex: content/cap_001/1_script.md",
};

/**
 * Lê o conteúdo atual (rascunho, se existir) e separa frontmatter e corpo.
 * @param {Object} located
 * @param {Object} ctx
 */
async function readCurrent(located, ctx) {
  const { content } = await ctx.fileService.readFile(located.originalPath);
  if (content === null) throw new Error("Não foi possível ler o arquivo.");
  return splitFrontmatter(content);
}

/**
 * Grava o corpo como rascunho preservando o frontmatter e avisa a interface.
 */
async function saveDraft(located, frontmatter, body, ctx) {
  const result = await ctx.fileService.saveTempFile(
    located.originalPath,
    frontmatter + body,
  );
  if (!result?.success) {
    throw new Error(`Falha ao salvar o rascunho: ${result?.error}`);
  }

  const original = normalizePath(located.originalPath);
  ctx.recordEdit?.(original);
  uiBus.emit("temp-file:saved", original);

  // Se o arquivo está aberto no editor, recarrega para mostrar o rascunho da IA.
  const open = normalizePath(ctx.state.currentFilePath).replace(/\.temp$/, "");
  if (open === original) uiBus.emit("editor:open-file", { path: original });

  uiBus.emit("toast:show", {
    message: `A IA alterou "${located.title}".`,
    type: "success",
  });
}

/** Percorre a árvore listando os .md que a IA pode ler. */
function collectFiles(node, prefix, out) {
  for (const [key, file] of Object.entries(node.files || {})) {
    if (!/\.md(\.temp)?$/i.test(file.originalPath || "")) continue;
    const located = { metadata: file.metadata || {} };
    if (!hasPermission(located, "aiRead")) continue;
    out.push({
      title: file.metadata?.title || key,
      path: `${prefix}${key}.md`,
      canWrite: hasPermission(located, "aiWrite"),
      hasPendingDraft: Boolean(file.isTemp),
    });
  }
  for (const [name, sub] of Object.entries(node.folders || {})) {
    if (name.startsWith(".")) continue;
    collectFiles(sub, `${prefix}${name}/`, out);
  }
}

/**
 * Prepara uma edição: exige que não haja rascunhos pendentes no projeto e trava a tela.
 * Deve ser chamada antes de qualquer leitura-para-escrita, já com a permissão validada.
 */
async function beginEdit(ctx) {
  if (typeof ctx.beginEdit === "function") await ctx.beginEdit();
}

/**
 * Registra as ferramentas de arquivos do livro.
 * @param {import('./registry.js').ToolRegistry} registry
 */
export function registerBookTools(registry) {
  registry.register({
    name: "list_files",
    description:
      "Lista os arquivos .md do livro atual que a IA tem permissão de ler, com título, caminho, se pode escrever e se há rascunho pendente. O caminho é só para uso nas ferramentas; ao falar com o autor use o título.",
    parameters: { type: "object", properties: {} },
    async execute(_args, ctx) {
      if (!ctx.state.currentBookPath)
        throw new Error("Nenhum livro selecionado.");
      const tree = await window.electronAPI.getTree(
        normalizePath(ctx.state.currentBookPath),
      );
      if (!tree) throw new Error("Não foi possível ler a estrutura do livro.");
      const files = [];
      collectFiles(tree, "", files);
      return files;
    },
  });

  registry.register({
    name: "read_file",
    description:
      "Lê o conteúdo (corpo Markdown, sem frontmatter) de um arquivo do livro. Requer permissão de leitura da IA.",
    parameters: {
      type: "object",
      properties: { path: PATH_PARAM },
      required: ["path"],
    },
    async execute({ path }, ctx) {
      const located = await locateFile(ctx.state, path);
      assertPermission(located, "aiRead");
      const { body } = await readCurrent(located, ctx);
      if (body.length <= MAX_READ_CHARS) return body;
      return `${body.slice(0, MAX_READ_CHARS)}\n\n[... arquivo truncado em ${MAX_READ_CHARS} caracteres]`;
    },
  });

  registry.register({
    name: "write_file",
    description:
      "Substitui TODO o corpo de um arquivo existente pelo conteúdo informado (o frontmatter é preservado). Salva como rascunho. Requer permissão de escrita da IA.",
    parameters: {
      type: "object",
      properties: {
        path: PATH_PARAM,
        content: {
          type: "string",
          description: "Novo corpo completo do arquivo em Markdown.",
        },
      },
      required: ["path", "content"],
    },
    async execute({ path, content }, ctx) {
      if (typeof content !== "string")
        throw new Error("'content' é obrigatório.");
      const located = await locateFile(ctx.state, path);
      assertPermission(located, "aiWrite");
      await beginEdit(ctx);
      const { frontmatter } = await readCurrent(located, ctx);
      await saveDraft(located, frontmatter, content, ctx);
      return `Rascunho de "${located.title}" salvo. O autor irá revisar as alterações.`;
    },
  });

  registry.register({
    name: "append_to_file",
    description:
      "Acrescenta texto ao final de um arquivo existente. Salva como rascunho. Requer permissão de escrita da IA.",
    parameters: {
      type: "object",
      properties: {
        path: PATH_PARAM,
        text: { type: "string", description: "Texto Markdown a acrescentar." },
      },
      required: ["path", "text"],
    },
    async execute({ path, text }, ctx) {
      if (typeof text !== "string") throw new Error("'text' é obrigatório.");
      const located = await locateFile(ctx.state, path);
      assertPermission(located, "aiWrite");
      await beginEdit(ctx);
      const { frontmatter, body } = await readCurrent(located, ctx);
      const separator = body.endsWith("\n") ? "\n" : "\n\n";
      await saveDraft(located, frontmatter, body + separator + text, ctx);
      return `Texto acrescentado ao rascunho de "${located.title}".`;
    },
  });

  registry.register({
    name: "replace_in_file",
    description:
      "Substitui um trecho exato do arquivo por outro. O trecho deve ser único, a menos que replace_all seja true. Salva como rascunho. Requer permissão de escrita da IA.",
    parameters: {
      type: "object",
      properties: {
        path: PATH_PARAM,
        old_text: {
          type: "string",
          description: "Trecho exato a ser substituído.",
        },
        new_text: { type: "string", description: "Texto que o substituirá." },
        replace_all: {
          type: "boolean",
          description: "Substituir todas as ocorrências (padrão: false).",
        },
      },
      required: ["path", "old_text", "new_text"],
    },
    async execute({ path, old_text, new_text, replace_all }, ctx) {
      if (!old_text) throw new Error("'old_text' não pode ser vazio.");
      if (typeof new_text !== "string")
        throw new Error("'new_text' é obrigatório.");
      const located = await locateFile(ctx.state, path);
      assertPermission(located, "aiWrite");
      await beginEdit(ctx);
      const { frontmatter, body } = await readCurrent(located, ctx);

      const occurrences = body.split(old_text).length - 1;
      if (occurrences === 0)
        throw new Error("Trecho não encontrado no arquivo.");
      if (occurrences > 1 && !replace_all) {
        throw new Error(
          `O trecho aparece ${occurrences} vezes. Informe mais contexto ou use replace_all.`,
        );
      }

      const updated = replace_all
        ? body.split(old_text).join(new_text)
        : body.replace(old_text, () => new_text);
      await saveDraft(located, frontmatter, updated, ctx);
      return `${replace_all ? occurrences : 1} substituição(ões) no rascunho de "${located.title}".`;
    },
  });
}
