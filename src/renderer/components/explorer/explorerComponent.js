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
    // Na seleção de livro antes de trocar definitivamente, limpa a árvore
    this.uiBus.on("book:selected", async () => {
      this._treeReady = false;
      this.element.querySelector("#file-tree").innetHtml = "";
    });

    // Ouve alterações no livro atual para re-renderizar a árvore
    this.uiBus.on("book:changed", async () => {
      await this.renderTree();
      this._treeReady = true;

      this.syncAdvancedModeView();

      // Se tem arquivo automático para abrir na lista de espera
      if (this._autoOpenFile) {
        this.autoOpenFileByPath(this._autoOpenFile);
        this._autoOpenFile = null;
      }
      // Se tem arquivos .temp para renderizar
      if (this._tempList) {
        this.handleTempList(this._tempList);
        this._tempList = null;
      }
    });

    // Ouve quando o arquivo atual muda para sincronizar a seleção visual na árvore
    this.uiBus.on("file:opened", (payload) => {
      if (!this._treeReady) {
        this._autoOpenFile = payload.relativePath;
      } else {
        this._autoOpenFile = null;
        this.autoOpenFileByPath(payload.relativePath);
      }
    });

    // Ouvinte geral de todos os arquivos .temp
    this.uiBus.on("temp-files:pending-list", (arr) => {
      if (!this._treeReady) {
        this._tempList = arr;
      } else {
        this._tempList = null;
        this.handleTempList(arr);
      }
    });

    // Adiciona arquivo .temp à árvore
    this.uiBus.on("temp-file:saved", (path) => {
      this.updateFileTempStatus(path, true);
    });
  }

  handleTempList(arr) {
    if (Array.isArray(arr)) {
      this.clearAllTemp();
      arr.forEach((file) => {
        this.updateFileTempStatus(normalizePath(file.path), true);
      });
    }
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
   * Renderiza a árvore de arquivos no container principal utilizando o esqueleto do estado atual.
   * @async
   * @returns {Promise<void>}
   */
  async renderTree() {
    const container = this.element.querySelector("#file-tree");

    if (!container || !this.state) return;

    container.innerHTML = "";

    // Utiliza a árvore completa armazenada em memória no state
    const bookTree = this.state.currentBookMap;

    if (!bookTree) return;

    const folderName = this.state.currentBookPath
      ? this.state.currentBookPath.split(/[/\\]/).pop()
      : "book";
    const ul = this.buildTree(bookTree, folderName);
    ul.className = "main-ul";
    container.appendChild(ul);
  }

  /**
   * Função principal de montagem recursiva da árvore a partir do dicionário em memória.
   * @param {Object} node Nó atual da árvore (contém folders e files).
   * @param {string} currentPath Caminho relativo acumulado.
   * @param {Object|null} [parentMeta=null] Metadados herdados do diretório pai.
   * @returns {HTMLUListElement} Elemento de lista (ul) contendo os nós processados.
   */
  buildTree(node, currentPath, parentMeta = null) {
    const ul = document.createElement("ul");
    if (!node) return ul;

    const folderNodes = [];
    const fileNodes = [];

    // Processa subpastas presentes em node.folders
    if (node.folders) {
      for (const [folderName, subFolderNode] of Object.entries(node.folders)) {
        const relativePath = currentPath
          ? `${currentPath}/${folderName}`
          : folderName;
        const folderLi = this.createFolderNode(
          subFolderNode,
          folderName,
          relativePath,
          parentMeta,
        );
        if (folderLi) folderNodes.push(folderLi);
      }
    }

    // Processa arquivos presentes em node.files
    if (node.files) {
      for (const [fileKey, fileData] of Object.entries(node.files)) {
        // Ignora arquivos JSON de sistema na árvore visual de documentos
        if (fileData.path && fileData.path.toLowerCase().endsWith(".json"))
          continue;

        const relativePath = currentPath
          ? `${currentPath}/${fileKey}.md`
          : `${fileKey}.md`;
        const fileLi = this.createFileNode(
          fileData,
          fileKey,
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

    [...folderNodes, ...fileNodes].forEach((nodeEl) => ul.appendChild(nodeEl));

    return ul;
  }

  /**
   * Processa e cria o nó de pasta utilizando os metadados já cacheados no sub-nó.
   * @param {Object} folderNode Objeto contendo os dados da subpasta (metadata, folders, files).
   * @param {string} folderName Nome da pasta atual.
   * @param {string} relativePath Caminho relativo da pasta na árvore.
   * @param {Object|null} [parentMeta=null] Metadados do diretório pai, se houver.
   * @returns {HTMLLIElement|null} O elemento HTML da pasta montada ou null se não for legível.
   */
  createFolderNode(folderNode, folderName, relativePath, parentMeta = null) {
    // Os metadados do folder.yml já vêm processados do backend na propriedade metadata do nó
    const rawMeta = folderNode.metadata || {};
    const meta = normalizeItemMetadata(rawMeta, folderName);

    if (this.state && this.state.currentBookMap) {
      this.state.currentBookMap[relativePath] = meta;
    }

    if (!meta.humanRead) return null;

    if (parentMeta && parentMeta.advanced === true) {
      meta.advanced = true;
    }

    let rootClass = "";
    if (!parentMeta) {
      if (folderName.includes("content")) rootClass = "content-folder";
      else if (folderName.includes("assets")) rootClass = "assets-folder";
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

    // Constrói a sub-lista recursivamente passando o sub-nó correspondente
    const subUl = this.buildTree(folderNode, relativePath, meta);
    li.appendChild(subUl);

    return li;
  }

  /**
   * Cria o nó de arquivo utilizando os metadados do Frontmatter já presentes no dicionário.
   * @param {Object} fileData Objeto contendo os dados do arquivo (path, originalPath, isTemp, metadata).
   * @param {string} fileKey Nome base do arquivo sem extensão.
   * @param {string} relativePath Caminho relativo do arquivo na árvore.
   * @param {Object|null} [parentMeta=null] Metadados do diretório pai, se houver.
   * @returns {HTMLLIElement|null} O elemento HTML do arquivo montado ou null se não permitido.
   */
  createFileNode(fileData, fileKey, relativePath, parentMeta = null) {
    // Os metadados do Frontmatter já foram extraídos e armazenados no objeto pelo get-tree
    const rawMeta = fileData.metadata || {};
    const fileName = `${fileKey}.md`;
    const meta = normalizeItemMetadata(rawMeta, fileName);

    if (this.state && this.state.currentBookMap) {
      this.state.currentBookMap[relativePath] = meta;
    }

    if (!meta.humanRead && !meta.humanWrite) return null;

    const isAdvanced =
      (parentMeta && parentMeta.advanced === true) || meta.advanced === true;
    const isReadonly = meta.humanRead && !meta.humanWrite;
    const isTemp = fileData.isTemp || false;

    let absolutePath = normalizePath(fileData.originalPath);
    relativePath = normalizePath(relativePath);

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
        // Envia o caminho absoluto correto (seja o rascunho .temp ativo ou o original .md)
        this.uiBus.emit("editor:open-file", {
          path: fileData.path,
          relativePath,
        });
      }
    };

    return li;
  }

  /**
   * Abre/seleciona o arquivo na árvore com rastreamento completo de depuração (Debug).
   * @param {string} targetPath Caminho relativo do arquivo.
   * @returns {void}
   */
  async autoOpenFileByPath(targetPath) {
    // Cancela qualquer timer pendente de uma seleção anterior para evitar empilhamento
    if (this._currentSelectionTimer) {
      clearTimeout(this._currentSelectionTimer);
      this._currentSelectionTimer = null;
    }

    if (!targetPath) {
      console.warn(
        "[ExplorerDebug] autoOpenFileByPath chamado com targetPath vazio.",
      );
      return;
    }

    let decodedPath = targetPath;
    try {
      decodedPath = decodeURIComponent(targetPath);
    } catch (e) {
      console.error("[ExplorerDebug] Erro ao decodificar targetPath:", e);
    }

    let cleanTargetPath = decodedPath
      .replace(/\\/g, "/")
      .replace(/^\/+/, "")
      .replace(/^content\//, "")
      .replace(/^\.\.\/books\//, "");

    // Normaliza se for .temp para coincidir com o data-path limpo do DOM (.md)
    cleanTargetPath = cleanTargetPath.replace(/\.md\.temp$/, ".md");
    if (cleanTargetPath.endsWith(".temp")) {
      cleanTargetPath = cleanTargetPath.slice(0, -5);
    }

    const pathSegments = cleanTargetPath.split("/");
    const rootFolder =
      pathSegments.length > 1 &&
      ["notes", "content", "assets"].includes(pathSegments[0])
        ? pathSegments[0]
        : pathSegments[1] || pathSegments[0];

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
      } else {
        console.warn(
          "[ExplorerDebug] AVISO: Nenhuma tab-btn encontrada com folder=",
          rootFolder,
        );
      }
    }

    const attemptSelection = (retries = 10, delay = 100) => {
      const selector = `.file-name[data-path$="${CSS.escape(cleanTargetPath)}"]`;
      const fileSpan = this.element.querySelector(selector);

      if (!fileSpan) {
        if (retries > 0) {
          this._currentSelectionTimer = setTimeout(
            () => attemptSelection(retries - 1, delay),
            delay,
          );
        } else {
          console.error(
            "[ExplorerDebug] ERRO: Elemento não encontrado no DOM após todas as tentativas:",
            cleanTargetPath,
          );
        }
        return false;
      }

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

    attemptSelection();
  }

  /**
   * Adiciona ou remove a indicação de arquivo temporário (.temp) na UI do Explorer.
   * @param {string} filePath Caminho do arquivo afetado.
   * @param {boolean} isTemp True para marcar como temporário, false para limpar.
   */
  updateFileTempStatus(filePath, isTemp) {
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

            // Insere o elemento físico do asterisco (*) se ele ainda não existir no HTML
            if (
              titleWrapper &&
              !titleWrapper.querySelector(".dirty-asterisk")
            ) {
              const asterisk = document.createElement("span");
              asterisk.className = "dirty-asterisk";
              asterisk.textContent = "*";
              titleWrapper.appendChild(asterisk);
            }
          }
        }
      }
    });
  }

  /**
   * Remove todas as marcações de arquivos temporários (.temp) e os elementos físicos do asterisco (*) da UI do Explorer.
   */
  clearAllTemp() {
    if (!this.element) return;

    // 1. Remove a classe has-temp de todos os nós que a possuem
    const tempNodes = this.element.querySelectorAll("#file-tree .has-temp");
    tempNodes.forEach((node) => {
      node.classList.remove("has-temp");
    });

    // 2. Remove fisicamente todos os elementos span do asterisco (.dirty-asterisk) do DOM
    const asteriskElements = this.element.querySelectorAll(
      "#file-tree .dirty-asterisk",
    );
    asteriskElements.forEach((asterisk) => {
      asterisk.remove();
    });
  }
}
