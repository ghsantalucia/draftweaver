/**
 * @file Gerencia a alternância e a persistência dos temas claro/escuro na aplicação e no editor de texto.
 */

/**
 * Classe responsável por gerenciar temas visuais e preferências de claro/escuro da interface.
 * @class
 */
export class ThemeManager {
  /**
   * Cria uma instância do ThemeManager.
   * @constructor
   */
  constructor() {}

  /**
   * Inicializa o gerenciador de temas, recuperando o tema salvo e configurando os ouvintes de evento.
   */
  init() {
    const savedTheme = localStorage.getItem('theme');
    const isDark = savedTheme === 'dark';

    this.applyTheme(isDark);

    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.checked = isDark;
      themeToggle.addEventListener('change', (e) => {
        this.toggleTheme(e.target.checked);
      });
    }
  }

  /**
   * Alterna o tema atual e o persiste no armazenamento local.
   * 
   * @param {boolean} isDark - Define se o tema deve ser escuro (true) ou claro (false).
   */
  toggleTheme(isDark) {
    this.applyTheme(isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }

  /**
   * Aplica as classes visuais do tema no corpo da página, no editor e opcionalmente na janela nativa.
   * 
   * @private
   * @param {boolean} isDark - Define se as classes de tema escuro devem ser aplicadas.
   */
  applyTheme(isDark) {
    // 1. Altera a classe no body
    if (isDark) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }

    // 2. Altera o Toast UI Editor
    const editorEl = document.querySelector('#markdown-editor .toastui-editor-defaultUI');
    if (editorEl) {
      if (isDark) {
        editorEl.classList.add('toastui-editor-dark');
      } else {
        editorEl.classList.remove('toastui-editor-dark');
      }
    }

    // 3. Atualiza os botões nativos da janela do Windows via Electron API
    // if (window.electronAPI && window.electronAPI.setNativeTheme) {
    //   window.electronAPI.setNativeTheme(isDark);
    // }
  }
}