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
  init(isParent = false) {
    // Se é componente filho e não é o pai que inicia, retorna
    if (this.parent && !isParent) return;

    this.element = document.querySelector(this.selector);

    if (!this.element) {
      console.error(
        `[${this.constructor.name}] Container alvo (${this.selector}) não fornecido para renderização.`,
      );
      return;
    }

    // 1. Renderiza o HTML principal
    this.render();

    // 2. Gancho opcional para lógica pós-renderização na classe filha
    if (typeof this.onInit === "function") {
      this.onInit();
    }

    // 3. Configura ouvintes de eventos da classe filha
    this.setupListeners();

    // 4. Se houver filhos cadastrados, inicializa todos em cascata
    for (const child of this.children) {
      if (typeof child.init === "function") {
        child.init(true);
      }
    }

    const isChild = this.parent ? " (child)" : "";
    console.log(
      `[${this.constructor.name}]${isChild} Inicializado com sucesso.`,
    );
  }

  /**
   * Motor de renderização centralizado usando Handlebars.
   */
  render() {
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
}
