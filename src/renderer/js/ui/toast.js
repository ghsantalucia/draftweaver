/**
 * @file Funções utilitárias para exibir notificações do tipo Toast na interface.
 */


/**
 * Exibe notificações do tipo Toast na interface.
 * @param {string} message Mensagem a ser exibida
 * @param {'success'|'error'} type Tipo da notificação
 */
export function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');

  if (!toast || !toastMessage) return;

  toastMessage.innerText = message;
  toast.className = `toast ${type}`;

  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}
