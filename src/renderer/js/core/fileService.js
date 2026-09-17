/**
 * @file Serviço responsável por centralizar as operações de CRUD de arquivos (leitura, escrita, restauração e resolução de caminhos), servindo como ponte entre o Editor e o Sistema de Arquivos.
 */

import { refreshSaveButtonState } from '../editor';

export function getTempPath(filePath) {
  return filePath ? `${filePath}.temp` : null;
}

export async function deleteFile(fullPath) {
  try {
    return await window.electronAPI.deleteFile(fullPath);
  } catch (error) {
    console.error(`[FILE SERVICE] Erro ao deletar arquivo em ${fullPath}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Lê o conteúdo bruto de um arquivo via IPC. Tenta carregar o .temp prioritariamente.
 */
export async function readFile(fullPath) {
  try {
    if (!fullPath) return { content: null, isTemp: false };

    // Se o caminho já for o arquivo .temp, lê diretamente sem chamar getTempPath
    if (fullPath.endsWith('.temp')) {
      const rawText = await window.electronAPI.readFile(fullPath);
      return { content: rawText, isTemp: true };
    }

    // Se for o caminho original, tenta o .temp primeiro
    const tempPath = getTempPath(fullPath);
    let rawText = await window.electronAPI.readFile(tempPath);
    let isTemp = true;

    if (rawText === null) {
      rawText = await window.electronAPI.readFile(fullPath);
      isTemp = false;
    }

    return { content: rawText, isTemp };
  } catch (error) {
    console.error(`[FILE SERVICE] Erro ao ler arquivo em ${fullPath}:`, error);
    return { content: null, isTemp: false };
  }
}

/**
 * Salva o rascunho no arquivo .temp
 */
export async function saveTempFile(fullPath, content) {
  if (!fullPath) return { success: false, error: 'Caminho inválido.' };
  const tempPath = getTempPath(fullPath);
  const file = await window.electronAPI.saveFile(tempPath, content);
  refreshSaveButtonState();
  return file;
}

/**
 * Persiste o conteúdo de um arquivo em disco substituindo o original pelo .temp e apagando o .temp.
 */
export async function saveFile(fullPath, content) {
  if (!fullPath) {
    return { success: false, error: 'Caminho de arquivo inválido.' };
  }

  try {
    // 1. Grava no arquivo oficial
    const res = await window.electronAPI.saveFile(fullPath, content);
    
    if (res.success) {
      // 2. Remove o arquivo .temp
      const tempPath = getTempPath(fullPath);
      await deleteFile(tempPath);
    }
    
    return res;
  } catch (error) {
    console.error(`[FILE SERVICE] Erro ao salvar arquivo em ${fullPath}:`, error);
    return { success: false, error: error.message || 'Erro desconhecido ao salvar.' };
  }
}

// Função que abre arquivo no editor e seleciona na árvore
export function autoOpenFileByPath(targetPath) {
  console.log('[DEBUG autoOpenFileByPath] Entrada targetPath:', targetPath);
  if (!targetPath) return;

  let decodedPath = targetPath;
  try {
    decodedPath = decodeURIComponent(targetPath);
  } catch (e) {
    console.error('[DEBUG] Erro ao decodificar targetPath:', e);
  }

  const cleanTargetPath = decodedPath
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/^content\//, '')
    .replace(/^\.\.\/books\//, '');

  console.log('[DEBUG autoOpenFileByPath] cleanTargetPath:', cleanTargetPath);

  const fileSpans = document.querySelectorAll('.file-name');
  console.log('[DEBUG autoOpenFileByPath] Spans .file-name encontrados:', fileSpans.length);

  if (fileSpans.length === 0) return;

  let found = false;

  for (const span of fileSpans) {
    const parentLi = span.closest('li');
    const rawAttrPath = span.getAttribute('data-path') || parentLi?.getAttribute('data-path') || '';
    const attrPath = rawAttrPath.replace(/\\/g, '/').replace(/^\/+/, '');

    const isMatch =
      attrPath === cleanTargetPath ||
      attrPath.endsWith(cleanTargetPath) ||
      cleanTargetPath.endsWith(attrPath);

    console.log(`[DEBUG Comparação] attrPath: "${attrPath}" vs cleanTarget: "${cleanTargetPath}" => Match: ${isMatch}`);

    if (isMatch) {
      found = true;
      console.log('[DEBUG autoOpenFileByPath] MATCH ENCONTRADO! Clicando no span...', span);

      let folderLi = span.closest('li.folder');
      while (folderLi) {
        folderLi.classList.remove('collapsed');
        folderLi = folderLi.parentElement.closest('li.folder');
      }

      if (parentLi && parentLi.classList.contains('advanced-item')) {
        const modeToggle = document.getElementById('mode-toggle');
        const container = document.getElementById('file-tree');
        if (modeToggle) modeToggle.checked = true;
        if (container) container.classList.add('show-advanced');
      }

      span.click();
      break;
    }
  }

  if (!found) {
    console.warn('[DEBUG autoOpenFileByPath] NENHUM MATCH ENCONTRADO para:', cleanTargetPath);
  }
}
// Tenta reabrir o arquivo salvo no localStorage (Executar SOMENTE na inicialização)
export function restoreLastOpenedFile() {
    const lastFile = localStorage.getItem('last_open_file');
    console.log('[RESTORE] Tentando restaurar arquivo salvo:', lastFile);

    if (!lastFile) {
        console.log('[RESTORE] Nenhum arquivo salvo no localStorage.');
        return;
    }

    // Tenta encontrar o elemento na árvore
    autoOpenFileByPath(lastFile);
}