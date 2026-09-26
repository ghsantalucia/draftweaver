/**
 * @file Funções auxiliares genéricas para apoio à interface do usuário, controle de menus e normalizações.
 */

import { DEFAULT_TREE_METADATA } from '../core/state.js';

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

/**
 * Normaliza caminhos de arquivo para evitar quebras em seletores CSS ou chamadas do Node/IPC.
 */
export function normalizePath(p) {
  return (p || '').replace(/\\/g, '/');
}