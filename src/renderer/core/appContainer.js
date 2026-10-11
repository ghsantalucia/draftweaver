/**
 * @file Contém a classe AppContainer, responsável por inicializar, instanciar e gerenciar
 * o ciclo de vida dos serviços e componentes utilizando o padrão de Inversão de Controle (IoC).
 */

import { State } from "./state.js";
import { ThemeManager } from "./themeManager.js";
import { ServiceManager } from "../services/serviceManager.js";
import { UiController } from "../controllers/uiController.js";
import { DomainController } from "../controllers/domainController.js";
import { uiBus } from "../events/uiBus.js";
import { domainBus } from "../events/domainBus.js";

import * as ComponentClass from "../components/index.js";

/**
 * Orquestrador principal da aplicação no processo de renderização.
 * Gerencia a inicialização e injeção de dependências das classes de serviços e UI.
 * @class
 */
export class AppContainer {
  /**
   * Cria uma instância do AppContainer e inicializa suas dependências.
   * @constructor
   */
  constructor() {
    // 1. Core e Serviços
    this.state = new State();

    const context = {
      uiBus: uiBus,
      domainBus: domainBus,
      state: this.state,
    };
    this.themeManager = new ThemeManager();
    this.modalManager = new ComponentClass.ModalManager(
      "#modal-container",
      context,
    );

    // 2. Centraliza os serviços em um único lugar
    this.services = new ServiceManager(this.state);

    // 3. Controllers
    this.uiController = new UiController(this.services, this.state);
    this.domainController = new DomainController(this.services, this.state);

    // 4. Agrupamos os componentes de UI em um array/objeto central
    this.components = {};

    this.components.sidebar = new ComponentClass.SidebarComponent(
      "#sidebar-container",
      context,
    );
    this.components.chat = this.components.sidebar.newChild(
      ComponentClass.ChatComponent,
      "#chat-container",
      context,
    );
    this.components.explorer = this.components.sidebar.newChild(
      ComponentClass.ExplorerComponent,
      "#explorer-container",
      context,
    );
    this.components.editor = new ComponentClass.EditorComponent(
      "#editor-container",
      context,
    );
    this.components.editorOverlay = this.components.editor.newChild(
      ComponentClass.EditorOverlayComponent,
      "#editor-overlay-container",
      context,
    );
    this.components.toolbar = new ComponentClass.ToolbarComponent(
      "#toolbar-container",
      context,
    );
    this.components.settings = new ComponentClass.SettingsComponent(
      "#settings-container",
      context,
    );
    this.components.toast = new ComponentClass.ToastComponent(
      "#toast-container",
      context,
    );
  }

  /**
   * Inicializa assincronamente todos os módulos, temas, eventos globais e dados iniciais do container.
   * @returns {Promise<void>}
   */
  async init() {
    // Inicializa o estado global da aplicação antes de tudo.
    await this.setupState();

    // Aguarda a inicialização e renderização de todos os componentes principais em paralelo
    const componentPromises = Object.values(this.components).map(
      async (component) => {
        if (component && typeof component.init === "function") {
          await component.init();
        }
      },
    );

    await Promise.all(componentPromises);

    // Inicia o tema depois que todos os elementos UI estão renderizados
    this.themeManager.init();

    // Define eventos globais
    this.setupGlobalEvents();

    // Emite eventos globais de que a aplicação está pronta para interações
    uiBus.emit("app:ready");
    domainBus.emit("app:ready");
  }

  /**
   * Inicializa o estado global da aplicação, carregando dados persistidos do localStorage.
   * @private
   */
  async setupState() {
    this.state.currentBookPath =
      localStorage.getItem("last_selected_book") || null;
    this.state.currentFilePath =
      localStorage.getItem("last_opened_file") || null;
    console.log(this.state.currentFilePath); // FIXME: Remover este log após depuração
  }

  /**
   * Configura ouvintes globais de eventos na janela (arrastar arquivos, restrições de TAB, etc.).
   * @private
   */
  setupGlobalEvents() {
    // Previne comportamento padrão de arrastar elementos na janela
    document.addEventListener(
      "dragstart",
      (e) => {
        e.preventDefault();
      },
      true,
    );

    // Impede que o TAB navegue pelos elementos do app fora do editor
    window.addEventListener(
      "keydown",
      (e) => {
        if (e.key === "Tab") {
          const isInsideEditor =
            e.target.closest(".toastui-editor-defaultUI") ||
            e.target.closest(".CodeMirror") ||
            e.target.closest(".ProseMirror");

          if (!isInsideEditor) {
            e.preventDefault();
          }
        }
      },
      true,
    );
  }
}

console.log("[APP-CONTAINER.JS]");
