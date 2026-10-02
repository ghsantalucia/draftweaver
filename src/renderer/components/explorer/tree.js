/**
 * @file Constrói e gerencia a interface da árvore de arquivos e pastas no painel lateral com suporte a filtros YAML e permissões de exibição.
 */

import { state } from "../../core/state.js";
import { openFileEditor } from "../editor";
import { normalizeItemMetadata } from "../../utils/helpers.js";
import { parseMarkdown } from "../../utils/markdown.js";
import { readFile } from "../../services/fileService.js";

/**
 * Renderiza a árvore de arquivos no container DOM principal.
 */
export async function renderTree() {
  const container = document.getElementById("file-tree");
  if (!container || !state.currentBookPath) return;

  container.innerHTML = ""; // Limpa a árvore antes de re-renderizar

  const folderName = state.currentBookPath.split(/[/\\]/).pop();
  const ul = await buildTree(state.currentBookPath, folderName);
  ul.className = "main-ul";
  container.appendChild(ul);
}

/**
 * Função principal de montagem: busca entradas no disco e coordena a hierarquia.
 * @param {string} directoryPath - Caminho absoluto do diretório a ser lido.
 * @param {string} currentPath - Caminho relativo acumulado para o mapeamento.
 * @param {Object} [parentMeta=null] - Metadados da pasta pai para herança de permissões/configurações.
 * @returns {Promise<HTMLUListElement>} Elemento de lista não ordenada (`<ul>`) contendo a árvore de nós gerada.
 */
export async function buildTree(directoryPath, currentPath, parentMeta = null) {
  const ul = document.createElement("ul");

  const folderData = await window.electronAPI.getTree(directoryPath);
  const rawEntries =
    folderData && folderData.children ? folderData.children : [];

  // TODO: Integrar com o novo sistema de Logs
  console.log(
    `[DEBUG buildTree] Pasta: "${directoryPath}" | Total de itens lidos:`,
    rawEntries.length,
    rawEntries.map((e) => e.name),
  );

  const entries = rawEntries.filter((e) => {
    if (e.isDirectory) return true;
    const nameLower = e.name.toLowerCase();
    return nameLower.endsWith(".md") && nameLower !== "folder.yml";
  });

  entries.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );

  const folderNodes = [];
  const fileNodes = [];

  for (const entry of entries) {
    const relativePath = currentPath
      ? `${currentPath}/${entry.name}`
      : entry.name;

    if (entry.isDirectory) {
      const folderLi = await createFolderNode(entry, relativePath, parentMeta);
      if (folderLi) folderNodes.push(folderLi);
    } else {
      const fileLi = await createFileNode(entry, relativePath, parentMeta);
      if (fileLi) fileNodes.push(fileLi);
    }
  }

  const compareByTitle = (a, b) => {
    const titleA = a.querySelector("span")?.innerText || "";
    const titleB = b.querySelector("span")?.innerText || "";
    return titleA.localeCompare(titleB, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  };

  folderNodes.sort(compareByTitle);
  fileNodes.sort(compareByTitle);

  [...folderNodes, ...fileNodes].forEach((node) => ul.appendChild(node));

  return ul;
}

/**
 * Processa uma pasta, lê seu `folder.yml` e monta o nó de pasta (`<li>`) se visível.
 * @param {Object} entry - Objeto de entrada contendo informações do diretório.
 * @param {string} relativePath - Caminho relativo do diretório.
 * @param {Object} [parentMeta=null] - Metadados do diretório pai.
 * @returns {Promise<HTMLLIElement|null>} Elemento de lista (`<li>`) formatado da pasta ou `null` se oculto.
 */
async function createFolderNode(entry, relativePath, parentMeta = null) {
  const folderYmlPath = `${entry.path}/folder.yml`;
  let rawMeta = {};

  const rawText = await window.electronAPI.readFile(folderYmlPath);

  console.log(
    `[DEBUG Folder YML] Lendo "${folderYmlPath}" -> Sucesso? ${!!rawText}`,
  );

  if (rawText) {
    const parsed = parseMarkdown(rawText, true);
    rawMeta = parsed.metadata || {};
  }

  const meta = normalizeItemMetadata(rawMeta, entry.name);
  state.fileMetadataMap[relativePath] = meta;

  console.log(
    `[DEBUG Folder Meta] Pasta: "${entry.name}" | humanRead:`,
    meta.humanRead,
    "| Meta final:",
    meta,
  );

  if (!meta.humanRead) {
    return null;
  }

  if (parentMeta && parentMeta.advanced === true) {
    meta.advanced = true;
  }

  const li = document.createElement("li");
  li.className = "folder collapsed";

  // Se parentMeta for null, significa que é uma pasta da raiz
  if (!parentMeta) {
    li.classList.add("folder-root");

    const folderKey = entry.name;
    if (folderKey.includes("content")) {
      li.classList.add("content-folder");
    } else if (folderKey.includes("assets")) {
      li.classList.add("assets-folder");
    } else {
      li.classList.add("notes-folder");
    }
  }

  // Se a pasta for marcada como avançada, adiciona a classe CSS correspondente
  if (meta.advanced) {
    li.classList.add("advanced-item");
  }

  const span = document.createElement("span");
  span.className = "folder-name";
  span.setAttribute("data-path", relativePath);

  // Injeta os ícones HTML e o título da pasta
  span.innerHTML = `
    <i class="fa-solid fa-chevron-right tree-arrow"></i>
    <i class="fa-solid fa-folder icon-folder"></i>
    <span class="folder-title">${meta.title}</span>
  `;

  span.onclick = (e) => {
    e.stopPropagation();
    li.classList.toggle("collapsed");

    // Alterna o ícone de pasta aberta (fa-folder-open) e fechada (fa-folder) ao clicar
    const folderIcon = span.querySelector(".icon-folder");
    if (folderIcon) {
      if (li.classList.contains("collapsed")) {
        folderIcon.classList.replace("fa-folder-open", "fa-folder");
      } else {
        folderIcon.classList.replace("fa-folder", "fa-folder-open");
      }
    }
  };

  li.appendChild(span);

  const subUl = await buildTree(entry.path, relativePath, meta);
  li.appendChild(subUl);

  return li;
}

/**
 * Lê o arquivo Markdown, avalia permissões no Frontmatter e cria o nó de arquivo (`<li>`).
 * @param {Object} entry - Objeto de entrada contendo informações do arquivo.
 * @param {string} relativePath - Caminho relativo do arquivo.
 * @param {Object} [parentMeta=null] - Metadados do diretório pai.
 * @returns {Promise<HTMLLIElement|null>} Elemento de lista (`<li>`) formatado do arquivo ou `null` se oculto.
 */
async function createFileNode(entry, relativePath, parentMeta = null) {
  console.log(`[DEBUG File Process] Processando arquivo: "${relativePath}"`);

  let rawMeta = {};

  // Usa o readFile do fileService para verificar se existe .temp prioritariamente
  const { content: rawText, isTemp } = await readFile(entry.path);

  if (rawText) {
    const parsed = parseMarkdown(rawText);
    rawMeta = parsed.metadata || {};
  }

  const meta = normalizeItemMetadata(rawMeta, entry.name);
  state.fileMetadataMap[relativePath] = meta;

  // console.log(`[DEBUG File Meta] Arquivo: "${entry.name}" | humanRead:`, meta.humanRead, '| humanWrite:', meta.humanWrite);

  if (!meta.humanRead && !meta.humanWrite) {
    return null;
  }

  const li = document.createElement("li");
  li.setAttribute("data-path", relativePath);
  li.setAttribute("data-absolute-path", entry.path);

  const isAdvanced =
    (parentMeta && parentMeta.advanced === true) || meta.advanced === true;
  if (isAdvanced) {
    li.classList.add("advanced-item");
  }

  if (meta.humanRead && !meta.humanWrite) {
    li.classList.add("readonly");
  }

  // Se for um rascunho temporário, marca o li para CSS e identificação
  if (isTemp) {
    li.classList.add("has-temp");
  }

  const span = document.createElement("span");
  span.className = "file-name";
  span.setAttribute("data-path", relativePath);
  span.setAttribute("data-absolute-path", entry.path);

  // Adicionado a classe/asterisco condicional
  const dirtyAsterisk = isTemp ? '<span class="dirty-asterisk">*</span>' : "";

  // Injeta o ícone HTML do arquivo (fa-file-lines) e o título
  span.innerHTML = `
    <i class="fa-regular fa-file-lines notes-icon icon-file"></i>
    <span class="file-title-wrapper">
      <span class="file-title">${meta.title}</span>${dirtyAsterisk}
    </span>
  `;

  span.onclick = async (e) => {
    e.stopPropagation();
    document
      .querySelectorAll(".file-name")
      .forEach((el) => el.classList.remove("active"));
    span.classList.add("active");
    await openFileEditor(entry.path, relativePath);
  };

  li.appendChild(span);

  return li;
}

/**
 * Sincroniza a árvore de arquivos e as abas visuais ao abrir um arquivo.
 * @param {string} relativePath - O caminho relativo do arquivo aberto.
 */
export function syncTreeSelection(relativePath) {
  console.log("[DEBUG syncTree] Iniciando sincronização para:", relativePath);

  if (!relativePath) {
    console.warn("[DEBUG syncTree] relativePath está vazio ou indefinido.");
    return;
  }

  // 1. Normaliza as barras do caminho para evitar incompatibilidade entre Windows/Linux
  const normalizedPath = relativePath.replace(/\\/g, "/");

  // 2. Procura pelo elemento no DOM usando querySelector ou iteração manual de segurança
  let fileSpan = document.querySelector(
    `.file-name[data-path="${CSS.escape(normalizedPath)}"]`,
  );

  if (!fileSpan) {
    // Fallback: itera sobre todos os file-names caso a busca exata falhe
    const allFiles = document.querySelectorAll(".file-name");
    for (const span of allFiles) {
      const spanPath = span.getAttribute("data-path")?.replace(/\\/g, "/");
      if (spanPath === normalizedPath) {
        fileSpan = span;
        break;
      }
    }
  }

  if (!fileSpan) {
    console.error(
      "[DEBUG syncTree] Não foi encontrado nenhum span.file-name com data-path:",
      normalizedPath,
    );
    return;
  }

  console.log("[DEBUG syncTree] Elemento span localizado no DOM:", fileSpan);

  // 3. Destaca o arquivo ativo
  document
    .querySelectorAll(".file-name")
    .forEach((el) => el.classList.remove("active"));
  fileSpan.classList.add("active");

  // 4. Busca a aba (data-tab) subindo pelos nós pais OU descobrindo via raiz
  let rootFolderLi = fileSpan.closest("li.folder-root");
  let tabName = null;

  if (rootFolderLi) {
    // Identifica qual das classes de raiz a pasta pai possui
    if (rootFolderLi.classList.contains("content-folder")) tabName = "escrita";
    else if (rootFolderLi.classList.contains("assets-folder"))
      tabName = "mundo";
    else if (rootFolderLi.classList.contains("notes-folder"))
      tabName = "anotações";
  } else {
    // Se a li.folder-root não estiver configurada, tenta buscar o atributo data-tab subindo a árvore
    const tabElement = fileSpan.closest("[data-tab]");
    if (tabElement) {
      tabName = tabElement.getAttribute("data-tab");
    }
  }

  console.log("[DEBUG syncTree] Aba detectada para o arquivo:", tabName);

  // 5. Executa a troca visual de aba no container se uma aba for encontrada
  if (tabName) {
    const fileTreeContainer = document.getElementById("file-tree");
    if (fileTreeContainer) {
      fileTreeContainer.classList.remove(
        "active-tab-notes",
        "active-tab-content",
        "active-tab-assets",
      );

      const folderKey = tabName.toLowerCase();
      if (folderKey.includes("escrita") || folderKey.includes("content")) {
        fileTreeContainer.classList.add("active-tab-content");
      } else if (folderKey.includes("mundo") || folderKey.includes("assets")) {
        fileTreeContainer.classList.add("active-tab-assets");
      } else {
        fileTreeContainer.classList.add("active-tab-notes");
      }
    }

    // Atualiza o estado ativo nos botões de aba do topo
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      const btnText = btn.innerText.trim().toLowerCase();
      const targetKey = tabName.toLowerCase();

      if (
        (targetKey.includes("escrita") && btnText.includes("escrita")) ||
        (targetKey.includes("mundo") && btnText.includes("mundo")) ||
        (targetKey.includes("anotações") && btnText.includes("anotações"))
      ) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }

  // 6. Expande todas as pastas colapsadas acima do arquivo para torná-lo visível
  let parentFolder = fileSpan.closest(".folder");
  while (parentFolder) {
    parentFolder.classList.remove("collapsed");
    parentFolder = parentFolder.parentElement?.closest(".folder");
  }

  console.log("[DEBUG syncTree] Sincronização concluída com sucesso.");
}
