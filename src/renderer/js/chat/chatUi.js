/**
 * @file Responsável pelos eventos e comportamentos da interface do Chat com a IA (auto-resize do input, envio com tecla Enter, etc).
 */

/**
 * Configura o redimensionamento automático e eventos do campo de digitação do chat.
 */
export function setupAutoResizeInput() {
  const textarea = document.getElementById('ai-chat-input');
  if (!textarea) return;

  textarea.addEventListener('input', () => {
    // Reseta a altura para recalcular corretamente ao apagar texto
    textarea.style.height = 'auto';

    // Define a nova altura com base no scrollHeight
    textarea.style.height = `${textarea.scrollHeight}px`;
  });

  // Enviar com a tecla Enter (e usar Shift+Enter para quebrar linha)
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const btnSend = document.getElementById('btn-send-ai');
      if (btnSend) btnSend.click();
    }
  });
}

// DRAWER DE ASSISTENTE DE IA

// 1. Alterna o estado da gaveta (Drawer) com fade-in no canvas
export function toggleAiDrawer() {

  const aiDrawer = document.getElementById('ai-assistant-drawer');
  const canvas = document.getElementById('ai-bg-canvas');
  if (!aiDrawer) return;

  const isOpening = !aiDrawer.classList.contains('expanded');
  aiDrawer.classList.toggle('expanded');

  if (isOpening) {
    if (canvas) gsap.set(canvas, { opacity: 0 });

    if (typeof window.resetStarsPosition === 'function') {
      setTimeout(window.resetStarsPosition, 50);
      setTimeout(window.resetStarsPosition, 350);
    }

    if (canvas) {
      gsap.to(canvas, {
        opacity: 1,
        duration: 0.5,
        ease: 'power2.out',
        delay: 0.1
      });
    }
    document.getElementById('ai-chat-input').focus();
  } 
  else {
    if (canvas) {
      gsap.to(canvas, {
        opacity: 0,
        duration: 0.2
      });
    }
  }
}

// 2. Configura os gatilhos de clique na interface
export function setupAiDrawerEvents() {

  console.log('[DRAWER] Configurando eventos de clique para a gaveta do assistente de IA...');

  const aiHeader = document.getElementById('ai-assistant-header');
  const btnToggleAi = document.getElementById('btn-toggle-ai');

  if (aiHeader) {
    aiHeader.addEventListener('click', toggleAiDrawer);
  }

  if (btnToggleAi) {
    btnToggleAi.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleAiDrawer();
    });
  }
}
