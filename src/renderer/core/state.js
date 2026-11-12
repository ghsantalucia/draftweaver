/**
 * @file Gerencia o estado global compartilhado e define os valores padrão para os metadados e permissões dos arquivos.
 */

/**
 * Objeto de configuração contendo os valores padrão para metadados de arquivos,
 * caso não estejam presentes no arquivo .md.
 * @type {Object}
 */
export const DEFAULT_TREE_METADATA = {
  humanRead: false,
  humanWrite: false,
  aiRead: false,
  aiWrite: false,
  advanced: false,
  title: null, // Será tratado no merge se precisar do nome do arquivo
  description: null,
};

/**
 * Classe responsável por gerenciar o estado global compartilhado da aplicação.
 * @class
 */
export class State {
  /**
   * Cria uma instância do gerenciador de estado.
   * @constructor
   */
  constructor() {
    /**
     * Lista de todos os livros/projetos
     * @type {Array[Object]}
     */
    this.bookList = [];

    /**
     * Caminho absoluto do livro atualmente selecionado.
     * @type {string|null}
     */
    this.currentBookPath = null;

    /**
     * Dados do config.json do livro
     * @type {Object}
     */
    this.currentBookMetadata = {};

    /**
     * Mapa de metadados de todos os arquivos rastreados.
     * @type {Object}
     */
    this.currentBookMap = {};

    /**
     * Caminho absoluto do arquivo atualmente aberto.
     * @type {string|null}
     */
    this.currentFilePath = null;

    /**
     * Metadados do arquivo atual.
     * @type {Object}
     */
    this.currentFileMetadata = {};

    /**
     * Provedor de IA ativo (nome da pasta em /ai/providers).
     * @type {string}
     */
    this.aiProvider = "claude";

    /**
     * Configurações de IA persistidas: { provider, providers: { [id]: { apiKey } } }
     * @type {Object}
     */
    this.aiSettings = { provider: "claude", providers: {} };

    /**
     * Modelos conhecidos por provider (vindos da API), com janela de contexto.
     * @type {Object<string, Array<{id: string, label: string, contextWindow?: number}>>}
     */
    this.aiModels = {};

    /**
     * Consumo de tokens da sessão atual do chat.
     * @type {{inputTokens: number, outputTokens: number, contextTokens: number}}
     */
    this.aiUsage = { inputTokens: 0, outputTokens: 0, contextTokens: 0 };

    /**
     * Instância do editor de texto ativo.
     * @type {Object|null}
     */
    this.editor = null;
  }
}
