/**
 * @file Gerencia a alternância e a persistência dos temas claro/escuro na aplicação e no editor de texto.
 */

export function initTheme() {

  const savedTheme = localStorage.getItem('theme');
  const isDark = savedTheme === 'dark';

  applyTheme(isDark);

  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.checked = isDark;
    themeToggle.addEventListener('change', (e) => {
      toggleTheme(e.target.checked);
    });
  }
}

export function toggleTheme(isDark) {
  applyTheme(isDark);
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

function applyTheme(isDark) {

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