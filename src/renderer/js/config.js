/**
 * @file Gerencia o estado global compartilhado e define os valores padrão para os metadados e permissões dos arquivos.
 */

// Estado Global Compartilhado
export const state = {
  editor: null,
  currentBookPath: null,
  currentFilePath: null,
  currentFileMetadata: {},
  fileMetadataMap: {}, 
  aiLockState: false
};

// Valores padrão para metadados de arquivos, caso não estejam presentes no arquivo .md
export const DEFAULT_TREE_METADATA = {
  humanRead: false,
  humanWrite: false,
  aiRead: false,
  aiWrite: false,
  advanced: false,
  title: null, // Será tratado no merge se precisar do nome do arquivo
  description: null
};