import { state } from './config.js';
import { openFileElectron } from './editor.js';
import { parseMarkdown, normalizeMetadata } from './utils.js';


export async function renderTree() {

  const container = document.getElementById('file-tree');
  if (!container || !state.currentBookPath) return;

  container.innerHTML = ''; // Limpa a árvore antes de re-renderizar

  // Chama a construção passando o caminho no disco e o nome base
  const folderName = state.currentBookPath.split(/[/\\]/).pop();
  const ul = await buildTree(state.currentBookPath, folderName);
  container.appendChild(ul);

}

export async function buildTree(directoryPath, currentPath) {
  const ul = document.createElement('ul');

  const folderData = await window.electronAPI.getTree(directoryPath);
  const rawEntries = folderData && folderData.children ? folderData.children : [];

  // Filtra apenas pastas OU arquivos .md
  const entries = rawEntries.filter(e => e.isDirectory || e.name.toLowerCase().endsWith('.md'));

  // Ordenação
  entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

  const folders = entries.filter(e => e.isDirectory);
  const files = entries.filter(e => !e.isDirectory);
  const sortedEntries = [...folders, ...files];

  for (const entry of sortedEntries) {
    const relativePath = currentPath ? `${currentPath}/${entry.name}` : entry.name;

    if (entry.isDirectory) {
      const li = document.createElement('li');
      li.className = 'folder collapsed';

      const span = document.createElement('span');
      span.className = 'folder-name';
      span.setAttribute('data-path', relativePath);
      span.innerText = entry.name;
      span.onclick = (e) => {
        e.stopPropagation();
        li.classList.toggle('collapsed');
      };

      li.appendChild(span);
      const subUl = await buildTree(entry.path, relativePath);
      li.appendChild(subUl);
      ul.appendChild(li);

    } else {
      let rawMeta = {};

      const rawText = await window.electronAPI.readFile(entry.path);
      if (rawText) {
        const parsed = parseMarkdown(rawText);
        rawMeta = parsed.metadata || {};
      }

      // Normalização dos metadados do arquivo
      const meta = normalizeMetadata(rawMeta, entry.name);

      state.fileMetadataMap[relativePath] = meta;

      // Regra 1: Oculto se humano não pode LER
      const isHidden = !meta.humanRead && !meta.humanWrite;      
      if (isHidden) continue;

      const li = document.createElement('li');

      // Regra 2: Classe para controle do toggle de itens avançados
      if (meta.advanced === true) {
        li.classList.add('advanced-item');
      }

      const span = document.createElement('span');
      span.className = 'file-name';
      span.setAttribute('data-path', relativePath);

      // Regra 3: Exibe o título definido no YAML ou o nome do arquivo como fallback
      span.innerText = `📄 ${meta.title}`;

      span.onclick = async (e) => {
        e.stopPropagation();
        document.querySelectorAll('.file-name').forEach(el => el.classList.remove('active'));
        span.classList.add('active');
        await openFileElectron(entry.path, relativePath);
      };

      li.appendChild(span);
      ul.appendChild(li);
    }
  }
  return ul;
}

// Função para encontrar, abrir pastas pai e clicar no arquivo
export function autoOpenFileByPath(targetPath) {

  if (!targetPath) return;

  // Normaliza o caminho removendo pontos e barras iniciais
  const cleanTargetPath = targetPath.replace(/^\.\.\/books\//, '').replace(/^\//, '');
  const fileSpans = document.querySelectorAll('.file-name');

  console.log(`[RESTORE] Elementos .file-name encontrados no DOM: ${fileSpans.length}`);

  if (fileSpans.length === 0) {
    console.warn('[RESTORE] Nenhum elemento de arquivo encontrado no DOM no momento do clique!');
    return;
  }

  let found = false;

  for (const span of fileSpans) {
    const attrPath = span.getAttribute('data-path') || '';
    const cleanAttrPath = attrPath.replace(/^\//, '');

    // Compara se os dois caminhos terminam com a mesma estrutura
    if (cleanAttrPath === cleanTargetPath || cleanAttrPath.endsWith(cleanTargetPath) || cleanTargetPath.endsWith(cleanAttrPath)) {

      found = true;
      console.log('[RESTORE] Match encontrado para o arquivo:', attrPath);

      // Expande todas as pastas pai onde o arquivo está guardado
      let parentLi = span.closest('li.folder');
      while (parentLi) {
        parentLi.classList.remove('collapsed');
        parentLi = parentLi.parentElement.closest('li.folder');
      }

      // Se for um arquivo do modo avançado e o modo estiver desligado, ativa o modo avançado
      const parentFileLi = span.closest('li');
      if (parentFileLi && parentFileLi.classList.contains('advanced-item')) {
        const modeToggle = document.getElementById('mode-toggle');
        const container = document.getElementById('file-tree');
        if (modeToggle) modeToggle.checked = true;
        if (container) container.classList.add('show-advanced');
      }

      // Dispara o clique no arquivo
      span.click();
      console.log("Arquivo restaurado com sucesso:", attrPath);
      break;
    }
  }

  if (!found) {
    console.warn('[RESTORE] O arquivo salvo existe no storage, mas não foi localizado na árvore atual:', cleanTargetPath);
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