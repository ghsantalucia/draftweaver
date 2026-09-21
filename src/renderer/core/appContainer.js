/**
 * @file Contém a classe AppContainer, responsável por inicializar, instanciar e gerenciar 
 * o ciclo de vida dos serviços e componentes utilizando o padrão de Inversão de Controle (IoC).
 */

import { State } from './config.js';
import { ThemeManager } from './theme.js';
import { FileService } from '../services/fileService.js';
import { BookService } from '../services/bookService.js';
import { EditorComponent } from '../components/editor/editor.js';
import { ExplorerComponent } from '../components/explorer/explorerUi.js';
import { ChatComponent } from '../components/chat/chatUi.js';
import { SettingsComponent } from '../components/settings/settingsUi.js';


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
        // 1. Camada de Estado e Serviços Core
        this.state = new State();
        this.fileService = new FileService(this.state);
        this.bookService = new BookService(this.state, this.fileService);
        this.themeManager = new ThemeManager();

        // 2. Camada de Componentes de UI (Injetando dependências necessárias)
        this.editorComponent = new EditorComponent(this.fileService, this.state);
        this.explorerComponent = new ExplorerComponent(this.fileService, this.state);
        this.chatComponent = new ChatComponent(this.state);
        this.settingsComponent = new SettingsComponent(this.themeManager);
    }

    /**
   * Inicializa assincronamente todos os módulos, temas, eventos globais e dados iniciais do container.
   * @returns {Promise<void>}
   */
    async init() {
        // Inicializa o tema salvo
        this.themeManager.init();

        // Inicializa os componentes de UI
        this.editorComponent.init();
        this.explorerComponent.init();
        this.chatComponent.init();
        this.settingsComponent.init();

        // Configura eventos globais e restrições de janela
        this.setupGlobalEvents();

        // Carrega e restaura dados iniciais de livros e arquivos
        const books = await this.bookService.popularSelectDeLivros();
        await this.bookService.restoreLastSelectedBook(books);
        this.fileService.restoreLastOpenedFile();

        // Pollings periódicos da aplicação
        setInterval(() => this.bookService.checkAILock(), 500);
        setInterval(() => this.bookService.updateBookTitlesInSelect(), 1000);
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