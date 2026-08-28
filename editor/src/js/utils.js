import { DEFAULT_FILE_METADATA } from './config.js';

// Recebe o metadado lido do YAML e garante que todas as chaves existam com seus devidos valores padrão (fallbacks).
export function normalizeMetadata(rawMetadata, fallbackTitle = '') {
  // O Object.assign ou o operador spread (...) aplica os padrões primeiro
  // e sobrescreve apenas com as propriedades que realmente vieram no YAML.
  const metadata = {
    ...DEFAULT_FILE_METADATA,
    ...rawMetadata
  };

  // Trata fallbacks dinâmicos (como o título que depende do nome do arquivo)
  if (!metadata.title) {
    metadata.title = fallbackTitle;
  }

  return metadata;
}

// Função para exibir notificações Toast
export function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');

  if (!toast || !toastMessage) return;

  toastMessage.innerText = message;
  toast.className = `toast ${type}`; // Aplica a classe success ou error

  // Esconde automaticamente após 3 segundos
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

// Converte Frontmatter YAML em Objeto JS e retorna o corpo do Markdown
export function parseMarkdown(fileContent) {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
  const match = fileContent.match(frontmatterRegex);

  if (match) {
    const yamlText = match[1];
    const body = fileContent.replace(frontmatterRegex, '');
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

  return { metadata: {}, body: fileContent };
}
// Reconstruir o YAML para salvar o arquivo, mantendo a formatação original
export function stringifyFrontmatter(metadata, body) {
  if (!metadata || Object.keys(metadata).length === 0) return body;

  let yaml = '---\n';
  for (const [key, value] of Object.entries(metadata)) {
    yaml += `${key}: ${value}\n`;
  }
  yaml += '---\n\n';

  return yaml + body.trimStart();
}

// Ações de Abrir e Fechar isoladas
export function openDrawer() {
  const drawer = document.getElementById('settings-drawer');
  const drawerOverlay = document.getElementById('drawer-overlay');
  drawer?.classList.add('open');
  drawerOverlay?.classList.remove('hidden');
}
export function closeDrawer() {
  const drawer = document.getElementById('settings-drawer');
  const drawerOverlay = document.getElementById('drawer-overlay');
  drawer?.classList.remove('open');
  drawerOverlay?.classList.add('hidden');
}

// Função de Inicialização (Anexa os ouvintes UMA VEZ na carga do app)
export function initMenuEvents() {
  const btnOpenMenu = document.getElementById('btn-open-menu');
  const btnCloseMenu = document.getElementById('btn-close-menu');
  const drawerOverlay = document.getElementById('drawer-overlay');

  if (btnOpenMenu) btnOpenMenu.addEventListener('click', openDrawer);
  if (btnCloseMenu) btnCloseMenu.addEventListener('click', closeDrawer);
  if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);
}