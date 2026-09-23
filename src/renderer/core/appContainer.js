/**
 * @file Contém a classe AppContainer, responsável por inicializar, instanciar e gerenciar 
 * o ciclo de vida dos serviços e componentes utilizando o padrão de Inversão de Controle (IoC).
 */

import { State } from './state.js';
import { ThemeManager } from './themeManager.js';
import { ServiceManager } from '../services/serviceManager.js';
import { UiController } from '../controllers/uiController.js';
import { DomainController } from '../controllers/domainController.js';

// FIXME: Importar Componentes operantes
import { SidebarComponent } from '../components/sidebar/sidebarComponent.js';
import { ToolbarComponent } from '../components/toolbar/toolbarComponent.js';
import { EditorComponent } from '../components/editor/editorComponent.js';
import { ChatComponent } from '../components/chat/chatComponent.js';
import { ExplorerComponent } from '../components/explorer/explorerComponent.js';
// import { EditorOverlayComponent } from '../components/editor-overlay/editorOverlayComponent.js';
// import { ModalComponent } from '../components/modal/modalComponent.js';
// import { SettingsComponent } from '../components/settings/settingsComponent.js';
// import { ToastComponent } from '../components/toast/toastComponent.js';


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
        this.themeManager = new ThemeManager();

        // 2. Centraliza os serviços em um único lugar
        this.services = new ServiceManager(this.state);

        // 3. Controllers
        this.uiController = new UiController(this.services);
        this.domainController = new DomainController(this.services);

        // 4. Agrupamos os componentes de UI em um array/objeto central
        this.components = {};

        this.components.sidebar = new SidebarComponent('#sidebar-container');
        if (this.components.sidebar) {
            this.components.chat     = new ChatComponent('#chat-container', this.components.sidebar);
            this.components.explorer = new ExplorerComponent('#explorer-container', this.components.sidebar);
        }
        this.components.editor = new EditorComponent('#editor-container');
        if (this.components.editor) {
            // this.components.editorOverlay = new EditorOverlayComponent('#editor-overlay-container', this.components.editor);
        }
        this.components.toolbar = new ToolbarComponent('#toolbar-container');

    }

    /**
   * Inicializa assincronamente todos os módulos, temas, eventos globais e dados iniciais do container.
   * @returns {Promise<void>}
   */
    async init() {

        this.themeManager.init();

        // Percorre os valores do objeto de componentes de forma segura
        // for (const component of Object.values(this.components)) {
        //     if (component && typeof component.init === 'function') {
        //         component.init();
        //     }
        // }

        this.components.sidebar.init();
        this.components.toolbar.init();
        this.components.editor.init();

        this.setupGlobalEvents();

        // FIXME: Implementar métodos de UI iniciais
        // const books = await this.services.book.popularSelectDeLivros();
        // await this.services.book.restoreLastSelectedBook(books);
        // this.services.file.restoreLastOpenedFile();
    }

    /**
    * Configura ouvintes globais de eventos na janela (arrastar arquivos, restrições de TAB, etc.).
    * @private
    */
    setupGlobalEvents() {
        // Previne comportamento padrão de arrastar elementos na janela
        document.addEventListener('dragstart', (e) => {
            e.preventDefault();
        }, true);

        // Impede que o TAB navegue pelos elementos do app fora do editor
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                const isInsideEditor = e.target.closest('.toastui-editor-defaultUI') ||
                    e.target.closest('.CodeMirror') ||
                    e.target.closest('.ProseMirror');

                if (!isInsideEditor) {
                    e.preventDefault();
                }
            }
        }, true);
    }
}

console.log("[APP-CONTAINER.JS]");