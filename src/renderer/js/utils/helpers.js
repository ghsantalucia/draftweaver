/**
 * @file Funções auxiliares genéricas para apoio à interface do usuário, controle de menus e normalizações.
 */

import { DEFAULT_TREE_METADATA } from '../config.js';

/**
 * Garante que todas as chaves obrigatórias do objeto de metadados existam com valores padrão (fallbacks).
 * @param {Object} rawMetadata Metadados lidos do YAML
 * @param {string} fallbackTitle Título alternativo caso não informado
 * @returns {Object} Metadados normalizados
 */
export function normalizeItemMetadata(rawMetadata, fallbackTitle = '') {
  const metadata = {
    ...DEFAULT_TREE_METADATA,
    ...rawMetadata
  };

  if (!metadata.title) {
    metadata.title = fallbackTitle;
  }

  return metadata;
}

// Converte Frontmatter YAML em Objeto JS e retorna o corpo do Markdown
// Converte Frontmatter YAML em Objeto JS e retorna o corpo do Markdown
export function parseMarkdown(fileContent, isYmlOnly = false) {
  let yamlText = '';
  let body = '';

  if (isYmlOnly) {
    // Para arquivos .yml puros, todo o conteúdo é o texto YAML
    yamlText = fileContent;
    body = '';
  } else {
    // Para arquivos .md, extrai o conteúdo entre os delimitadores '---'
    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
    const match = fileContent.match(frontmatterRegex);

    if (match) {
      yamlText = match[1];
      body = fileContent.replace(frontmatterRegex, '');
    } else {
      return { metadata: {}, body: fileContent };
    }
  }

  const metadata = {};

  // Converte chave: valor do YAML em Objeto JS
  yamlText.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      const cleanKey = key.trim();
      let val = valueParts.join(':').trim().replace(/^["']|["']$/g, ''); // Remove aspas

      if (val === 'true') val = true;
      else if (val === 'false') val = false;

      metadata[cleanKey] = val;
    }
  });

  return { metadata, body };
}

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

// Pilha em memória para armazenar os overlays ativos
// Estrutura do item: { key, message, showSpinner }
const overlayStack = [];

/**
 * Controla o estado do overlay interno do editor usando uma pilha por chaves.
 * @param {boolean} show Define se o bloqueio deve ser exibido ou ocultado
 * @param {string} key Identificador único da causa do bloqueio (ex: 'no-file', 'ai-lock')
 * @param {string} [message=''] Mensagem a ser exibida no card
 * @param {boolean} [showSpinner=true] Exibe ou oculta o spinner
 */
export function toggleEditorOverlay(show, key, message = '', showSpinner = true) {
  const overlay = document.getElementById('editor-overlay');
  const messageEl = document.getElementById('editor-overlay-message');
  const spinnerEl = document.getElementById('editor-overlay-spinner');

  if (!overlay) return;

  if (show) {
    // 1. Se a chave já existir na pilha, atualiza os dados; caso contrário, insere no topo
    const index = overlayStack.findIndex(item => item.key === key);
    if (index !== -1) {
      overlayStack[index] = { key, message, showSpinner };
    } else {
      overlayStack.push({ key, message, showSpinner });
    }
  } else {
    // 2. Se for para ocultar, remove a chave informada da pilha
    const index = overlayStack.findIndex(item => item.key === key);
    if (index !== -1) {
      overlayStack.splice(index, 1);
    }
  }

  // 3. Processa o estado final baseado no topo da pilha
  if (overlayStack.length > 0) {
    // Pega o último elemento adicionado à pilha
    const currentOverlay = overlayStack[overlayStack.length - 1];

    if (messageEl) messageEl.textContent = currentOverlay.message;
    if (spinnerEl) spinnerEl.style.display = currentOverlay.showSpinner ? 'block' : 'none';

    overlay.classList.remove('hidden');
  } else {
    // Se a pilha estiver vazia, oculta o overlay visualmente
    overlay.classList.add('hidden');
  }
}

// Pilha em memória para overlays globais de tela cheia
const globalOverlayStack = [];

/**
 * Controla o estado do overlay global de tela cheia via pilha.
 * @param {boolean} show Define se o overlay deve ser exibido ou removido
 * @param {string} key Identificador único (ex: 'settings-drawer', 'confirm-dialog')
 */
export function toggleAppOverlay(show, key) {
  const overlay = document.getElementById('app-modal-overlay');
  if (!overlay) return;

  if (show) {
    if (!globalOverlayStack.includes(key)) {
      globalOverlayStack.push(key);
    }
  } else {
    const index = globalOverlayStack.indexOf(key);
    if (index !== -1) {
      globalOverlayStack.splice(index, 1);
    }
  }

  // Se houver qualquer bloqueio ativo na pilha, exibe o overlay
  if (globalOverlayStack.length > 0) {
    overlay.classList.remove('hidden');
  } else {
    overlay.classList.add('hidden');
  }
}