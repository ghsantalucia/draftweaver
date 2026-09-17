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
 * Normaliza caminhos de arquivo para evitar quebras em seletores CSS ou chamadas do Node/IPC.
 */
export function normalizePath(p) {
  return (p || '').replace(/\\/g, '/');
}