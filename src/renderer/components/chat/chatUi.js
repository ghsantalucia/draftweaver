/**
 * @file Responsável pelos eventos e comportamentos da interface do Chat com a IA (auto-resize do input, envio com tecla Enter, renderização e estado do chat).
 */

import './styles.css';

import {gsap} from 'gsap';

import { handleUserPrompt } from './chatPipeline.js';
import { loadChatHistory } from './chatStorage.js';

/**
 * Garante que a caixa de mensagens role até o final para mostrar o conteúdo mais recente.
 */
export function scrollToBottom() {
  const chatContainer = document.getElementById('ai-chat-messages');
  if (chatContainer) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
}

/**
 * Renderiza uma mensagem no DOM da caixa de mensagens do Chat.
 * @param {Object} msgData
 * @param {string} msgData.role - Papel do emissor ('user' | 'assistant' | 'system').
 * @param {string} msgData.content - Conteúdo de texto.
 */
export function renderChatMessage({ role, content }) {
  const chatContainer = document.getElementById('ai-chat-messages');
  if (!chatContainer) return;

  const messageDiv = document.createElement('div');
  messageDiv.className = `ai-message ${role}`;
  messageDiv.textContent = content;

  chatContainer.appendChild(messageDiv);
  scrollToBottom();
}

/**
 * Define o estado de carregamento do chat (bloqueando ou liberando a digitação).
 * @param {boolean} isLoading - Indica se o assistente está processando.
 */
export function setChatLoadingState(isLoading) {
  const textarea = document.getElementById('ai-chat-input');
  const btnSend = document.getElementById('btn-send-ai');

  if (textarea) {
    textarea.disabled = isLoading;
    if (!isLoading) textarea.focus();
  }

  if (btnSend) {
    btnSend.disabled = isLoading;
    btnSend.style.opacity = isLoading ? '0.5' : '1';
    btnSend.style.pointerEvents = isLoading ? 'none' : 'auto';
  }
}

/**
 * Limpa o container de mensagens da interface.
 */
export function clearChatContainer() {
  const chatContainer = document.getElementById('ai-chat-messages');
  if (chatContainer) {
    chatContainer.innerHTML = '';
  }
}

/**
 * Recarrega o histórico salvo e exibe as mensagens no chat.
 * Caso o histórico esteja vazio, exibe a mensagem de boas-vindas do sistema.
 */
export async function reloadChatForCurrentBook() {

  // DEBUG
  console.log('[CHAT] Recarregando histórico do chat para o livro atual...');

  clearChatContainer();

  const history = await loadChatHistory();

  if (history && history.length > 0) {
    
    // DEBUG
    console.log(`[CHAT] Histórico carregado com ${history.length} mensagens.`);

    history.forEach((msg) => renderChatMessage(msg));
  } else {
    // Mensagem de sistema padrão exibida no primeiro acesso ao livro
    renderChatMessage({
      role: 'system',
      content: 'Olá! Como posso ajudar na estruturação do seu livro hoje?',
    });
  }
}

/**
 * Dispara o envio da instrução do usuário.
 */
function triggerSendMessage() {
  const textarea = document.getElementById('ai-chat-input');
  if (!textarea) return;

  const promptText = textarea.value;
  if (!promptText.trim()) return;

  // Reseta o input e sua altura
  textarea.value = '';
  textarea.style.height = 'auto';

  // Processa a instrução na pipeline
  handleUserPrompt(promptText, {
    onUserMessageRender: renderChatMessage,
    onAssistantMessageRender: renderChatMessage,
    setLoadingState: setChatLoadingState,
  });
}

/**
 * Configura o redimensionamento automático e eventos do campo de digitação do chat.
 */
export function setupAutoResizeInput() {
  const textarea = document.getElementById('ai-chat-input');
  const btnSend = document.getElementById('btn-send-ai');

  if (textarea) {
    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    });

    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        triggerSendMessage();
      }
    });
  }

  if (btnSend) {
    btnSend.addEventListener('click', (e) => {
      e.preventDefault();
      triggerSendMessage();
    });
  }
}

/**
 * Alterna o estado da gaveta (Drawer) com fade-in no canvas.
 */
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
        delay: 0.1,
      });
    }

    const textarea = document.getElementById('ai-chat-input');
    if (textarea) textarea.focus();
    scrollToBottom();
  } else if (canvas) {
    gsap.to(canvas, {
      opacity: 0,
      duration: 0.2,
    });
  }
}

/**
 * Configura os gatilhos de clique na interface para a gaveta do assistente.
 */
export function setupAiDrawerEvents() {
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

  setupAutoResizeInput();
}
