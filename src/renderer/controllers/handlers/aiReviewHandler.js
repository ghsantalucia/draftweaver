/**
 * @file Handler da janela de comparação entre a versão atual de um arquivo e o rascunho (.temp) gerado pela IA.
 */

import Handlebars from "handlebars";
import Editor from "@toast-ui/editor";
import "@toast-ui/editor/dist/toastui-editor.css";
import "@toast-ui/editor/dist/theme/toastui-editor-dark.css";

import { uiBus } from "../../events/uiBus.js";
import { diffLines } from "../../utils/diff.js";
import { normalizePath } from "../../utils/helpers.js";
import { parseMarkdown, splitFrontmatter } from "../../utils/markdown.js";
import reviewTpl from "../../components/Modal/templates/aiReview.hbs?raw";

/**
 * Abre, em sequência, a janela de comparação de cada arquivo alterado pela IA.
 * @param {{files: string[]}} payload - Caminhos absolutos dos arquivos originais (.md).
 * @param {Object} fileService - Instância do FileService.
 * @returns {Promise<void>}
 */
export async function onAiReviewOpen({ files }, fileService) {
  for (const originalPath of files) {
    await reviewFile(originalPath, fileService);
  }
}

/**
 * Cria um plugin do editor que marca (decoration `diff-added`) as linhas novas da IA.
 * As decorations acompanham as linhas se o usuário editar o texto.
 * @param {Set<number>} addedLines - Índices (base 0) das linhas novas.
 * @returns {{plugin: Function, highlight: (editor: Editor) => void}}
 */
function createDiffHighlight(addedLines) {
  let key = null;

  const plugin = ({ pmState, pmView }) => {
    const { Plugin, PluginKey } = pmState;
    const { Decoration, DecorationSet } = pmView;
    key = new PluginKey("aiDiffHighlight");

    const build = (doc) => {
      const decorations = [];
      let index = 0;
      doc.forEach((node, offset) => {
        if (addedLines.has(index)) {
          decorations.push(
            Decoration.node(offset, offset + node.nodeSize, {
              class: "diff-added",
            }),
          );
        }
        index++;
      });
      return DecorationSet.create(doc, decorations);
    };

    return {
      markdownPlugins: [
        () =>
          new Plugin({
            key,
            state: {
              init: () => DecorationSet.empty,
              apply: (tr, set) =>
                tr.getMeta(key) ? build(tr.doc) : set.map(tr.mapping, tr.doc),
            },
            props: { decorations: (state) => key.getState(state) },
          }),
      ],
    };
  };

  // Calcula as decorations depois que o conteúdo inicial já está no documento
  const highlight = (editor) => {
    const view = editor.mdEditor?.view;
    if (view && key) view.dispatch(view.state.tr.setMeta(key, true));
  };

  return { plugin, highlight };
}

/**
 * Mostra a janela de comparação de um arquivo e resolve quando o usuário escolhe uma versão.
 * @param {string} originalPath
 * @param {Object} fileService
 * @returns {Promise<void>}
 */
async function reviewFile(originalPath, fileService) {
  const tempPath = fileService.getTempPath(originalPath);
  const [original, draft] = await Promise.all([
    window.electronAPI.readFile(originalPath),
    window.electronAPI.readFile(tempPath),
  ]);
  if (draft === null) return; // rascunho já resolvido

  const oldPart = splitFrontmatter(original ?? "");
  const newPart = splitFrontmatter(draft);
  const normPath = normalizePath(originalPath);

  // A IA não mudou nada: descarta o rascunho sem incomodar o usuário
  if (oldPart.body === newPart.body) {
    await fileService.deleteFile(tempPath);
    uiBus.emit("temp-file:deleted", normPath);
    return;
  }

  const { metadata } = parseMarkdown(draft);
  const title = metadata.title || normPath.split("/").pop();
  const { oldLines, newLines } = diffLines(oldPart.body, newPart.body);
  const addedLines = new Set(
    newLines.flatMap((line, index) => (line.added ? [index] : [])),
  );

  return new Promise((resolve) => {
    let editor = null;
    const diffHighlight = createDiffHighlight(addedLines);

    const finish = () => resolve();

    uiBus.emit("modal:open", {
      id: "ai-review-modal",
      title: `Revisar alterações da IA: ${title}`,
      content: Handlebars.compile(reviewTpl)({ oldLines }),
      windowClass: "modal-wide",
      closable: false,
      buttons: [
        {
          text: "Manter versão antiga (descartar IA)",
          class: "btn-danger",
          onClick: async (modal) => {
            const res = await fileService.deleteFile(tempPath);
            if (!res.success) return toastError(res.error);
            uiBus.emit("temp-file:deleted", normPath);
            uiBus.emit("toast:show", {
              message: `Alterações da IA em "${title}" descartadas.`,
              type: "success",
            });
            editor?.destroy();
            modal.close();
            finish();
          },
        },
        {
          text: "Manter versão nova",
          class: "btn-primary",
          onClick: async (modal) => {
            // O usuário pode ter editado a versão da IA: persiste exatamente o que está no editor
            const content = newPart.frontmatter + editor.getMarkdown();
            const res = await fileService.saveFile(originalPath, content);
            if (!res.success) return toastError(res.error);
            uiBus.emit("temp-file:synced", normPath);
            uiBus.emit("toast:show", {
              message: `"${title}" atualizado.`,
              type: "success",
            });
            editor.destroy();
            modal.close();
            finish();
          },
        },
      ],
      onMounted: (modal) => {
        editor = new Editor({
          el: modal.element.querySelector("#ai-review-editor"),
          height: "100%",
          initialEditType: "markdown",
          theme: "dark",
          previewStyle: "tab",
          hideModeSwitch: true,
          usageStatistics: false,
          initialValue: newPart.body,
          plugins: [diffHighlight.plugin],
        });
        diffHighlight.highlight(editor);
      },
    });
  });
}

function toastError(error) {
  uiBus.emit("toast:show", {
    message: `Erro ao salvar a escolha: ${error}`,
    type: "error",
  });
}
