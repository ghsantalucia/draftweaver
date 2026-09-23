import Handlebars from 'handlebars';

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
   * @param {Component|null} [parent=null] - Componente pai opcional para auto-registro.
   * @param {string} [templateHtml=''] - Template HTML em formato string para renderização.
   */
  constructor(selector, templateHtml, parent = null) {
    this.selector = selector;
    this.templateHtml = templateHtml;
    this.containerElement = null;
    this.children = [];
    this.parent = parent;

    // Auto-registro no pai, se fornecido
    if (this.parent && typeof this.parent.setChildren === 'function') {
      this.parent.setChildren(this);
    }
  }

  /**
   * Adiciona um componente filho à lista de gerenciamento.
   * @param {Component} child 
   */
  setChildren(child) {
    this.children.push(child);
  }

  /**
   * Ciclo de vida principal padronizado.
   */
  init() {
    this.containerElement = document.querySelector(this.selector);

    if (!this.containerElement) {
      console.error(`[${this.constructor.name}] Container alvo (${this.selector}) não fornecido para renderização.`);
      return;
    }

    // 1. Renderiza o HTML principal
    this.render();

    // 2. Gancho opcional para lógica pós-renderização na classe filha
    if (typeof this.onInit === 'function') {
      this.onInit();
    }

    // 3. Configura ouvintes de eventos da classe filha
    this.setupListeners();

    // 4. Se houver filhos cadastrados, inicializa todos em cascata
    for (const child of this.children) {
      if (typeof child.init === 'function') {
        child.init();
      }
    }

    console.log(`[${this.constructor.name}] Inicializado com sucesso.`);
  }

  /**
   * Motor de renderização centralizado usando Handlebars.
   */
  render() {
    if (!this.containerElement || !this.templateHtml) return;

    // Se a filha tiver o método getContext, usa ele. Se não, usa um objeto vazio {} por padrão.
    const context = typeof this.getContext === 'function' ? this.getContext() : {};
    
    const templateFn = Handlebars.compile(this.templateHtml);
    this.containerElement.innerHTML = templateFn(context);
  }

  /**
   * Método padrão vazio (Hook). As filhas fazem override se precisarem de eventos.
   */
  setupListeners() {
    // Vazio por padrão
  }
}