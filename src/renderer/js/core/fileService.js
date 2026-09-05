/**
 * @file Serviço responsável por centralizar as operações de CRUD de arquivos (leitura, escrita, restauração e resolução de caminhos), servindo como ponte entre o Editor e o Sistema de Arquivos.
 */

// Função para encontrar, abrir pastas pai e clicar no arquivo
export function autoOpenFileByPath(targetPath) {
    if (!targetPath) return;

    // 1. Decodifica caracteres e normaliza barras
    let decodedPath = targetPath;
    try {
        decodedPath = decodeURIComponent(targetPath);
    } catch (e) {
        console.error('Erro ao decodificar targetPath:', e);
    }

    // Limpa barras do início/fim e remove prefixos conhecidos como 'content/', '../books/', etc.
    const cleanTargetPath = decodedPath
        .replace(/\\/g, '/')
        .replace(/^\/+/, '')
        .replace(/^content\//, '')
        .replace(/^\.\.\/books\//, '');

    const fileSpans = document.querySelectorAll('.file-name');

    console.log(`[RESTORE] Elementos .file-name encontrados no DOM: ${fileSpans.length}`);

    if (fileSpans.length === 0) {
        console.warn('[RESTORE] Nenhum elemento de arquivo encontrado no DOM no momento do clique!');
        return;
    }

    let found = false;

    for (const span of fileSpans) {
        const attrPath = (span.getAttribute('data-path') || '').replace(/\\/g, '/').replace(/^\/+/, '');

        // 2. Comparações flexíveis:
        // - Igualdade exata sem prefixos
        // - Se a árvore termina com o caminho do link
        // - Se o link termina com o caminho da árvore
        const isMatch =
            attrPath === cleanTargetPath ||
            attrPath.endsWith(cleanTargetPath) ||
            cleanTargetPath.endsWith(attrPath);

        if (isMatch) {
            found = true;
            console.log('[RESTORE] Match encontrado para o arquivo:', attrPath);

            // Expande todas as pastas pai
            let parentLi = span.closest('li.folder');
            while (parentLi) {
                parentLi.classList.remove('collapsed');
                parentLi = parentLi.parentElement.closest('li.folder');
            }

            // Se for um arquivo avançado e o modo estiver desligado, ativa-o
            const parentFileLi = span.closest('li');
            if (parentFileLi && parentFileLi.classList.contains('advanced-item')) {
                const modeToggle = document.getElementById('mode-toggle');
                const container = document.getElementById('file-tree');
                if (modeToggle) modeToggle.checked = true;
                if (container) container.classList.add('show-advanced');
            }

            // Dispara o clique nativo
            span.click();
            console.log("Arquivo restaurado/aberto com sucesso:", attrPath);
            break;
        }
    }

    if (!found) {
        console.warn('[RESTORE] O arquivo existe no link/storage, mas não foi localizado na árvore atual:', cleanTargetPath);
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

/**
 * Lê o conteúdo bruto de um arquivo via IPC do Electron.
 * @param {string} fullPath Caminho absoluto no disco
 * @returns {Promise<string|null>} Conteúdo do arquivo ou null em caso de erro
 */
export async function readFile(fullPath) {
  try {
    const rawText = await window.electronAPI.readFile(fullPath);
    return rawText;
  } catch (error) {
    console.error(`[FILE SERVICE] Erro ao ler arquivo em ${fullPath}:`, error);
    return null;
  }
}

/**
 * Persiste o conteúdo de um arquivo em disco e futuramente registra os logs de alteração/diff.
 * @param {string} fullPath Caminho absoluto do arquivo a ser salvo
 * @param {string} content Content já formatado (Frontmatter + Body)
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function saveFile(fullPath, content) {
  if (!fullPath) {
    return { success: false, error: 'Caminho de arquivo inválido.' };
  }

  try {
    // TODO: [SISTEMA DE LOGS] Capturar estado anterior, gerar diff e registrar histórico antes de gravar
    
    const res = await window.electronAPI.saveFile(fullPath, content);
    return res;
  } catch (error) {
    console.error(`[FILE SERVICE] Erro ao salvar arquivo em ${fullPath}:`, error);
    return { success: false, error: error.message || 'Erro desconhecido ao salvar.' };
  }
}