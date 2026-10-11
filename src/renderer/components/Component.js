import Handlebars from "handlebars";

/**
 * Classe base abstrata para todos os componentes do DraftWeaver.
 * Gerencia ciclo de vida, herança pai-filho (Composite) e renderização via Handlebars.
 * @class
 * @abstract
 */
export class Component {
  /**
   * Cria uma instância do componente.
   * @param {string} selector - Seletor CSS do container alvo no DOM.
   * @param {Object} context - Objeto de contexto e infraestrutura (state, uiBus, domainBus)
   * @param {string} [templateHtml=''] - Template HTML em formato string para renderização.
   * @param {Object|Array|null} [params=null] - Parâmetros opcionais dinâmicos para a exigência do componente.
   * @param {Component|null} [parent=null] - Componente pai opcional para auto-registro.
   */
  constructor(selector, context, templateHtml, params = null, parent = null) {
    this.selector = selector;
    this.templateHtml = templateHtml;
    this.params = params;
    this.parent = parent;
    this.state = context.state;
    this.uiBus = context.uiBus;
    this.domainBus = context.domainBus;
    this.element = null;
    this.children = [];

    // Auto-registro no pai, se fornecido
    if (this.parent && typeof this.parent.setChild === "function") {
      this.parent.setChild(this);
    }
  }

  /**
   * Fábrica interna para instanciar e registrar um componente filho de forma limpa pelo pai.
   * @param {Function} ComponentClass - A classe do componente filho (ex: ChatComponent)
   * @param {string} selector - Seletor CSS do container do filho
   * @param {Object} context - Objeto de contexto e infraestrutura
   * @param {string} [templateHtml=''] - Template HTML do filho
   * @param {Object|Array|null} [params=null] - Parâmetros dinâmicos opcionais do filho
   * @returns {Component} A instância do componente filho criada
   */
  newChild(ComponentClass, selector, context, params = null) {
    // Instancia o filho passando 'this' como pai e os parâmetros opcionais
    const childInstance = new ComponentClass(selector, context, params, this);

    // Registra automaticamente no pai
    // this.setChild(childInstance);

    return childInstance;
  }

  /**
   * Adiciona um componente filho à lista de gerenciamento.
   * @param {Component} child
   */
  setChild(child) {
    this.children.push(child);
  }

  /**
   * Ciclo de vida principal padronizado.
   * @param {boolean} verifica se é o pai que está inicializando
   */
  /**
   * Ciclo de vida principal padronizado e assíncrono.
   * @param {boolean} isParent - verifica se é o pai que está inicializando
   * @returns {Promise<void>}
   */
  async init(isParent = false) {
    if (this.parent && !isParent) return;

    this.element = document.querySelector(this.selector);

    if (!this.element) {
      console.error(
        `[${this.constructor.name}] Container alvo (${this.selector}) não fornecido para renderização.`,
      );
      return;
    }

    // 1. Renderiza o HTML principal
    await this.render();

    // 2. Gancho opcional (suporta assincronicidade se o filho precisar)
    if (typeof this.onInit === "function") {
      await this.onInit();
    }

    // 3. Configura ouvintes de eventos da classe filha
    this.setupListeners();

    // 4. Inicializa todos os filhos em cascata e aguarda a conclusão de todos via Promise.all
    if (this.children.length > 0) {
      const childPromises = this.children.map((child) => {
        if (typeof child.init === "function") {
          return child.init(true);
        }
        return Promise.resolve();
      });
      await Promise.all(childPromises);
    }

    const isChild = this.parent ? " (child)" : "";
    console.log(
      `[${this.constructor.name}]${isChild} Inicializado com sucesso.`,
    );
  }

  /**
   * Motor de renderização centralizado usando Handlebars.
   */
  async render() {
    if (!this.element || !this.templateHtml) return;

    // Se a filha tiver o método getContext, usa ele. Se não, usa um objeto vazio {} por padrão.
    const context =
      typeof this.getContext === "function" ? this.getContext() : {};

    const templateFn = Handlebars.compile(this.templateHtml);
    this.element.innerHTML = templateFn(context);
  }

  /**
   * Método padrão vazio (Hook). As filhas fazem override se precisarem de eventos.
   */
  setupListeners() {
    // Vazio por padrão
  }

  // ========= Utilitários Handlebars ========= //

  /**
   * Compila uma string de template Handlebars com um contexto de dados e retorna a string HTML.
   * @param {string} templateStr - String do template Handlebars.
   * @param {Object} [data={}] - Dados para preencher o template.
   * @returns {string} HTML final processado.
   */
  compile(templateStr, data = {}) {
    if (!templateStr) return "";
    const templateFn = Handlebars.compile(templateStr);
    return templateFn(data);
  }

  /**
   * Converte uma string HTML em um elemento DOM individual (Node).
   * @param {string} htmlString - String HTML bem formatada.
   * @returns {HTMLElement} Elemento DOM pronto para append/prepend.
   */
  createDOMElement(htmlString) {
    const template = document.createElement("template");
    template.innerHTML = htmlString.trim();
    return template.content.firstElementChild;
  }
}
