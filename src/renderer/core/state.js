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
     * Instância do editor de texto ativo.
     * @type {Object|null}
     */
    this.editor = null;
  }
}
