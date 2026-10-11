/**
 * @file Componente responsável pela renderização estrutural e lógica do explorer de arquivos.
 */

import "./styles.css";
import templateHtml from "./templates/main.hbs?raw";
import folderNodeTpl from "./templates/folderNode.hbs?raw";
import fileNodeTpl from "./templates/fileNode.hbs?raw";
import { Component } from "../Component.js";
import { normalizeItemMetadata, normalizePath } from "../../utils/helpers.js";
import { parseMarkdown } from "../../utils/markdown.js";

/**
 * Representa o explorer de arquivos.
 * @class
 */
export class ExplorerComponent extends Component {
  /**
   * Cria uma instância da classe.
   * @param {string} selector - Seletor CSS do elemento do DOM onde será injetada.
   * @param {Object} context - Objeto de contexto e infraestrutura (state, uiBus, domainBus).
   * @param {Object|Array|null} [params=null] - Parâmetros opcionais dinâmicos.
   * @param {Component|null} [parent=null] - Componente pai opcional.
   */
  constructor(selector, context, params, parent = null) {
    super(selector, context, templateHtml, params, parent);
  }

  /**
   * Executado logo após a renderização inicial do componente.
   * @returns {void}
   */
  onInit() {
    this.toggleAdvancedExplorerView();
    this.tabSelectionEvents();
  }

  /**
   * Configura os ouvintes de eventos da UI e de domínio.
   * @returns {void}
   */
  setupListeners() {
    // Ouve alterações no livro atual para re-renderizar a árvore
    this.uiBus.on("book:selected", async () => {
      await this.renderTree();
      this.syncAdvancedModeView();

      // Adiciona arquivo .temp à árvore
      this.uiBus.on("temp-file:saved", (path) => {
        this.updateFileTempStatus(path, true);
      });

      // Ouvinte geral de todos os arquivos .temp
      this.uiBus.on("temp-files:pending-list", (arr) => {
        if (Array.isArray(arr)) {
          this.clearAllTemp();
          arr.forEach((file) => {
            this.updateFileTempStatus(normalizePath(file.path), true);
          });
        }
      });

      // Ouve quando o arquivo atual muda para sincronizar a seleção visual na árvore
      this.uiBus.on("file:opened", (payload) => {
        this.autoOpenFileByPath(payload.relativePath);
      });
    });
  }

  /**
   * Controla e alterna a visibilidade dos elementos avançados no explorador.
   * @returns {void}
   */
  toggleAdvancedExplorerView() {
    const modeToggle = this.element.querySelector("#mode-toggle");
    const container = this.element.querySelector("#file-tree");

    if (modeToggle && container) {
      const updateAdvancedVisibility = () => {
        if (modeToggle.checked) {
          container.classList.add("show-advanced");
        } else {
          container.classList.remove("show-advanced");
        }
      };

      modeToggle.checked = false;
      updateAdvancedVisibility();
      modeToggle.addEventListener("change", updateAdvancedVisibility);
    }
  }

  /**
   * Gerencia a seleção de abas de navegação do explorador.
   * @returns {void}
   */
  tabSelectionEvents() {
    const fileTreeContainer = this.element.querySelector("#file-tree");

    this.element.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.element
          .querySelectorAll(".tab-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        if (fileTreeContainer) {
          fileTreeContainer.classList.remove(
            "active-tab-notes",
            "active-tab-content",
            "active-tab-assets",
          );

          const folder = btn.getAttribute("folder");
          if (folder === "content") {
            fileTreeContainer.classList.add("active-tab-content");
          } else if (folder === "assets") {
            fileTreeContainer.classList.add("active-tab-assets");
          } else if (folder === "notes") {
            fileTreeContainer.classList.add("active-tab-notes");
          }
        }
      });
    });

    const defaultTab = this.element.querySelector('.tab-btn[folder="content"]');
    if (defaultTab) {
      defaultTab.click();
    }
  }

  /**
   * Sincroniza o estado visual do switch e do container de arquivos avançados
   * com base nas configurações (config.json) do livro atual.
   * @returns {void}
   */
  syncAdvancedModeView() {
    if (!this.state || !this.state.bookList || !this.state.currentBookPath)
      return;

    const currentBook = this.state.bookList.find(
      (b) => b.fullPath === this.state.currentBookPath,
    );

    const isAdvanced = currentBook?.explorer_state?.advanced_mode || false;

    const modeToggle = this.element.querySelector("#mode-toggle");
    const fileTreeContainer = this.element.querySelector("#file-tree");

    if (modeToggle) {
      modeToggle.checked = isAdvanced;
    }

    if (fileTreeContainer) {
      if (isAdvanced) {
        fileTreeContainer.classList.add("show-advanced");
      } else {
        fileTreeContainer.classList.remove("show-advanced");
      }
    }
  }

  /**
   * Renderiza a árvore de arquivos no container principal utilizando o estado atual.
   * @async
   * @returns {Promise<void>}
   */
  async renderTree() {
    const container = this.element.querySelector("#file-tree");
    if (!container || !this.state || !this.state.currentBookPath) return;

    container.innerHTML = "";

    const folderName = this.state.currentBookPath.split(/[/\\]/).pop();
    const ul = await this.buildTree(this.state.currentBookPath, folderName);
    ul.className = "main-ul";
    container.appendChild(ul);
  }

  /**
   * Função principal de montagem recursiva da árvore de diretórios e arquivos.
   * @async
   * @param {string} directoryPath - Caminho absoluto do diretório a ser lido.
   * @param {string} currentPath - Caminho relativo acumulado.
   * @param {Object|null} [parentMeta=null] - Metadados herdados do diretório pai.
   * @returns {Promise<HTMLUListElement>} Elemento de lista (ul) contendo os nós processados.
   */
  async buildTree(directoryPath, currentPath, parentMeta = null) {
    const ul = document.createElement("ul");

    const folderData = await window.electronAPI.getTree(directoryPath);
    const rawEntries =
      folderData && folderData.children ? folderData.children : [];

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
        const folderLi = await this.createFolderNode(
          entry,
          relativePath,
          parentMeta,
        );
        if (folderLi) folderNodes.push(folderLi);
      } else {
        const fileLi = await this.createFileNode(
          entry,
          relativePath,
          parentMeta,
        );
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
   * Processa e cria o nó de pasta utilizando o template dedicado de pasta via Handlebars.
   * @param {Object} entry - Objeto contendo os dados do diretório (caminho, nome, etc.).
   * @param {string} relativePath - Caminho relativo do diretório na árvore.
   * @param {Object|null} [parentMeta=null] - Metadados do diretório pai, se houver.
   * @returns {Promise<HTMLLIElement|null>} O elemento HTML da pasta montada ou null se não for legível.
   */
  async createFolderNode(entry, relativePath, parentMeta = null) {
    const folderYmlPath = `${normalizePath(entry.path)}/folder.yml`;
    let rawMeta = {};

    const rawText = await window.electronAPI.readFile(folderYmlPath);
    if (rawText) {
      const parsed = parseMarkdown(rawText, true);
      rawMeta = parsed.metadata || {};
    }

    const meta = normalizeItemMetadata(rawMeta, entry.name);
    if (this.state && this.state.fileMetadataMap) {
      this.state.fileMetadataMap[relativePath] = meta;
    }

    if (!meta.humanRead) return null;

    if (parentMeta && parentMeta.advanced === true) {
      meta.advanced = true;
    }

    let rootClass = "";
    if (!parentMeta) {
      const folderKey = entry.name;
      if (folderKey.includes("content")) rootClass = "content-folder";
      else if (folderKey.includes("assets")) rootClass = "assets-folder";
      else rootClass = "notes-folder";
    }

    // Verifica se esta pasta está marcada como aberta no config.json do livro atual
    let isOpen = false;
    if (this.state && this.state.bookList && this.state.currentBookPath) {
      const currentBook = this.state.bookList.find(
        (b) => b.fullPath === this.state.currentBookPath,
      );
      if (
        currentBook &&
        currentBook.explorer_state &&
        Array.isArray(currentBook.explorer_state.open_folders)
      ) {
        const normalizedRelPath = relativePath.replace(/\\/g, "/");
        isOpen = currentBook.explorer_state.open_folders.some(
          (p) => p && p.replace(/\\/g, "/") === normalizedRelPath,
        );
      }
    }

    // Compila e cria o nó DOM do folder usando os utilitários da classe Component
    const htmlString = this.compile(folderNodeTpl, {
      meta,
      relativePath,
      parentMeta,
      rootClass,
      isOpen,
    });
    const li = this.createDOMElement(htmlString);

    const span = li.querySelector(".folder-name");
    span.onclick = (e) => {
      li.classList.toggle("collapsed");

      const folderIcon = span.querySelector(".icon-folder");
      if (folderIcon) {
        if (li.classList.contains("collapsed")) {
          folderIcon.classList.replace("fa-folder-open", "fa-folder");
          li.dataset.status = "collapsed";
        } else {
          folderIcon.classList.replace("fa-folder", "fa-folder-open");
          li.dataset.status = "open";
        }
      }
    };

    const subUl = await this.buildTree(entry.path, relativePath, meta);
    li.appendChild(subUl);

    return li;
  }

  /**
   * Cria o nó de arquivo emitindo eventos via uiBus e utilizando o template dedicado de arquivo via Handlebars.
   * @param {Object} entry - Objeto contendo os dados do arquivo (caminho, nome, etc.).
   * @param {string} relativePath - Caminho relativo do arquivo na árvore.
   * @param {Object|null} [parentMeta=null] - Metadados do diretório pai, se houver.
   * @returns {Promise<HTMLLIElement|null>} O elemento HTML do arquivo montado ou null se não permitido.
   */
  async createFileNode(entry, relativePath, parentMeta = null) {
    let rawText = "";
    let isTemp = false;

    if (window.electronAPI && window.electronAPI.readFile) {
      rawText = await window.electronAPI.readFile(entry.path);
    }

    let rawMeta = {};
    if (rawText) {
      const parsed = parseMarkdown(rawText);
      rawMeta = parsed.metadata || {};
    }

    const meta = normalizeItemMetadata(rawMeta, entry.name);
    if (this.state && this.state.fileMetadataMap) {
      this.state.fileMetadataMap[relativePath] = meta;
    }

    if (!meta.humanRead && !meta.humanWrite) return null;

    const isAdvanced =
      (parentMeta && parentMeta.advanced === true) || meta.advanced === true;
    const isReadonly = meta.humanRead && !meta.humanWrite;

    let absolutePath = normalizePath(entry.path);
    relativePath = normalizePath(relativePath);

    // Compila e cria o nó DOM do file usando os utilitários da classe Component
    const htmlString = this.compile(fileNodeTpl, {
      absolutePath,
      relativePath,
      meta,
      isAdvanced,
      isReadonly,
      isTemp,
    });
    const li = this.createDOMElement(htmlString);

    const span = li.querySelector(".file-name");
    span.onclick = (e) => {
      this.element
        .querySelectorAll(".file-name")
        .forEach((el) => el.classList.remove("active"));
      span.classList.add("active");

      if (this.uiBus) {
        this.uiBus.emit("editor:open-file", { path: entry.path, relativePath });
      }
    };

    return li;
  }

  /**
   * Abre/seleciona o arquivo na árvore de forma completa (abas, switch avançado, pastas e seleção),
   * aguardando de forma resiliente caso a árvore ainda esteja sendo renderizada.
   * @param {string} targetPath - Caminho relativo do arquivo.
   * @returns {void}
   */
  async autoOpenFileByPath(targetPath) {
    if (!targetPath) return;

    let decodedPath = targetPath;
    try {
      decodedPath = decodeURIComponent(targetPath);
    } catch (e) {
      console.error("[ExplorerComponent] Erro ao decodificar targetPath:", e);
    }

    const cleanTargetPath = decodedPath
      .replace(/\\/g, "/")
      .replace(/^\/+/, "")
      .replace(/^content\//, "")
      .replace(/^\.\.\/books\//, "");

    const pathSegments = cleanTargetPath.split("/");
    const rootFolder = pathSegments[1];

    if (rootFolder) {
      const tabBtn = this.element.querySelector(
        `.tab-btn[folder="${rootFolder}"]`,
      );
      if (tabBtn) {
        this.element
          .querySelectorAll(".tab-btn")
          .forEach((b) => b.classList.remove("active"));
        tabBtn.classList.add("active");

        const fileTreeContainer = this.element.querySelector("#file-tree");
        if (fileTreeContainer) {
          fileTreeContainer.classList.remove(
            "active-tab-notes",
            "active-tab-content",
            "active-tab-assets",
          );
          fileTreeContainer.classList.add(`active-tab-${rootFolder}`);
        }
      }
    }

    const attemptSelection = () => {
      const fileSpan = this.element.querySelector(
        `.file-name[data-path$="${CSS.escape(cleanTargetPath)}"]`,
      );

      if (!fileSpan) return false;

      const parentLi = fileSpan.closest("li");

      if (parentLi && parentLi.classList.contains("advanced-item")) {
        const modeToggle = this.element.querySelector("#mode-toggle");
        const container = this.element.querySelector("#file-tree");
        if (modeToggle) {
          modeToggle.checked = true;
          modeToggle.dispatchEvent(new Event("change"));
        }
        if (container) container.classList.add("show-advanced");
      }

      let currentElement = fileSpan.parentElement;
      while (currentElement && currentElement !== this.element) {
        if (
          currentElement.tagName === "LI" &&
          currentElement.classList.contains("folder")
        ) {
          currentElement.classList.remove("collapsed");
          const folderIcon = currentElement.querySelector(
            ".folder-name > .icon-folder",
          );
          if (folderIcon) {
            folderIcon.classList.replace("fa-folder", "fa-folder-open");
          }
        }
        currentElement = currentElement.parentElement;
      }

      this.element
        .querySelectorAll(".file-name")
        .forEach((el) => el.classList.remove("active"));
      fileSpan.classList.add("active");

      return true;
    };

    if (!attemptSelection()) {
      setTimeout(() => {
        attemptSelection();
      }, 150);
    }
  }

  /**
   * Adiciona ou remove a indicação de arquivo temporário (.temp) na UI do Explorer.
   * @param {string} filePath - Caminho do arquivo afetado.
   * @param {boolean} isTemp - True para marcar como temporário, false para limpar.
   */
  updateFileTempStatus(filePath, isTemp) {
    console.log("updateFileTempStatus()", filePath, isTemp);
    if (!filePath) return;

    // Normaliza o caminho para garantir compatibilidade com os atributos data-path e data-absolute-path
    const cleanPath = filePath.replace(/\.temp$/, "");

    // Seleciona todos os elementos <li> da árvore que correspondem ao arquivo
    const fileNodes = this.element.querySelectorAll(
      "#file-tree li, #file-tree [data-path]",
    );

    fileNodes.forEach((node) => {
      const nodePath = node.getAttribute("data-path") || "";
      const absPath = node.getAttribute("data-absolute-path") || "";

      const isMatch =
        nodePath === cleanPath ||
        absPath === cleanPath ||
        cleanPath.endsWith(nodePath);

      if (isMatch) {
        const fileNameSpan = node.querySelector(".file-name");
        const titleWrapper = node.querySelector(".file-title-wrapper");

        if (isTemp) {
          // Adiciona a marcação apenas se já não estiver cadastrado/marcado
          if (!node.classList.contains("has-temp")) {
            node.classList.add("has-temp");
            fileNameSpan?.classList.add("has-temp");

            if (
              titleWrapper &&
              !titleWrapper.classList.contains("dirty-asterisk")
            ) {
              titleWrapper.classList.add("dirty-asterisk");
            }
          }
        } else {
          // Remove a marcação caso o arquivo tenha sido sincronizado ou descartado
          node.classList.remove("has-temp");
          fileNameSpan?.classList.remove("has-temp");
          titleWrapper?.classList.remove("dirty-asterisk");
        }
      }
    });
  }

  /**
   * Remove todas as marcações de arquivos temporários (.temp) da interface do Explorer.
   */
  clearAllTemp() {
    if (!this.element) return;

    // Seleciona todos os nós que possuem alguma marcação temporária
    const tempNodes = this.element.querySelectorAll(
      "#file-tree .has-temp, #file-tree .dirty-asterisk",
    );

    tempNodes.forEach((node) => {
      node.classList.remove("has-temp");
      // Se for o wrapper do título, remove a classe do asterisco
      if (node.classList.contains("dirty-asterisk")) {
        node.classList.remove("dirty-asterisk");
      }
    });

    console.log(
      "[ExplorerComponent] Todas as marcações .temp foram limpas da UI.",
    );
  }
}
