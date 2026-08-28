import { state } from './config.js';
import { openFileElectron } from './editor.js';
import { parseMarkdown, normalizeItemMetadata } from './utils.js';


export async function renderTree() {

  const container = document.getElementById('file-tree');
  if (!container || !state.currentBookPath) return;

  container.innerHTML = ''; // Limpa a árvore antes de re-renderizar

  // Chama a construção passando o caminho no disco e o nome base
  const folderName = state.currentBookPath.split(/[/\\]/).pop();
  const ul = await buildTree(state.currentBookPath, folderName);
  container.appendChild(ul);

}

// Função principal: busca as entradas da pasta e coordena a montagem da árvore.
export async function buildTree(directoryPath, currentPath, parentMeta = null) {
  
  const ul = document.createElement('ul');

  const folderData = await window.electronAPI.getTree(directoryPath);
  const rawEntries = folderData && folderData.children ? folderData.children : [];

  // FIXME: +++ INSERIR LOG +++
  console.log(`[DEBUG buildTree] Pasta: "${directoryPath}" | Total de itens lidos:`, rawEntries.length, rawEntries.map(e => e.name));

  const entries = rawEntries.filter(e => {
    if (e.isDirectory) return true;
    const nameLower = e.name.toLowerCase();
    return nameLower.endsWith('.md') && nameLower !== 'folder.yml';
  });

  entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

  const folderNodes = [];
  const fileNodes = [];

  for (const entry of entries) {
    const relativePath = currentPath ? `${currentPath}/${entry.name}` : entry.name;

    if (entry.isDirectory) {
      const folderLi = await createFolderNode(entry, relativePath, parentMeta);
      if (folderLi) folderNodes.push(folderLi);
    } else {
      const fileLi = await createFileNode(entry, relativePath, parentMeta);
      if (fileLi) fileNodes.push(fileLi);
    }
  }

  // Função auxiliar para comparar o título visível nos elementos <span>
  const compareByTitle = (a, b) => {
    const titleA = a.querySelector('span')?.innerText || '';
    const titleB = b.querySelector('span')?.innerText || '';
    return titleA.localeCompare(titleB, undefined, { numeric: true, sensitivity: 'base' });
  };

  // Ordena as pastas e arquivos separadamente pelo título (meta.title)
  folderNodes.sort(compareByTitle);
  fileNodes.sort(compareByTitle);

  // Anexa na árvore (primeiro pastas, depois arquivos)
  [...folderNodes, ...fileNodes].forEach(node => ul.appendChild(node));

  return ul;
}

// Processa a pasta, lê o folder.yml e monta o nó <li> se permitido.
async function createFolderNode(entry, relativePath, parentMeta = null) {
  const folderYmlPath = `${entry.path}/folder.yml`;
  let rawMeta = {};

  const rawText = await window.electronAPI.readFile(folderYmlPath);

  // FIXME: +++ INSERIR LOG +++
  console.log(`[DEBUG Folder YML] Lendo "${folderYmlPath}" -> Sucesso? ${!!rawText}`);

  if (rawText) {
    const parsed = parseMarkdown(rawText, true);
    rawMeta = parsed.metadata || {};
  }

  // Normalização unificada
  const meta = normalizeItemMetadata(rawMeta, entry.name);
  state.fileMetadataMap[relativePath] = meta;

  // FIXME: +++ INSERIR LOG +++
  console.log(`[DEBUG Folder Meta] Pasta: "${entry.name}" | humanRead:`, meta.humanRead, '| Meta final:', meta);

  // Regra 1: Se humanRead for false, ignora a pasta e a subárvore
  if (!meta.humanRead) {
    return null;
  }

  // Herda a propriedade advanced da pasta pai caso ela exista
  if (parentMeta && parentMeta.advanced === true) {
    meta.advanced = true;
  }

  const li = document.createElement('li');
  li.className = 'folder collapsed';

  if (meta.advanced) {
    li.classList.add('advanced-item');
  }

  const span = document.createElement('span');
  span.className = 'folder-name';
  span.setAttribute('data-path', relativePath);
  span.innerText = meta.title;

  span.onclick = (e) => {
    e.stopPropagation();
    li.classList.toggle('collapsed');
  };

  li.appendChild(span);

  const subUl = await buildTree(entry.path, relativePath, meta);
  li.appendChild(subUl);

  return li;
}

// Lê o arquivo, processa metadados e cria o nó <li> para arquivos .md
async function createFileNode(entry, relativePath, parentMeta = null) {

  // FIXME: +++ INSERIR LOG +++
  console.log(`[DEBUG File Process] Processando arquivo: "${relativePath}"`);

  let rawMeta = {};

  const rawText = await window.electronAPI.readFile(entry.path);
  if (rawText) {
    const parsed = parseMarkdown(rawText);
    rawMeta = parsed.metadata || {};
  }

  // Normalização unificada
  const meta = normalizeItemMetadata(rawMeta, entry.name);
  state.fileMetadataMap[relativePath] = meta;

  // FIXME: +++ INSERIR LOG +++
  console.log(`[DEBUG File Meta] Arquivo: "${entry.name}" | humanRead:`, meta.humanRead, '| humanWrite:', meta.humanWrite, '| Retorna NULL?', (!meta.humanRead && !meta.humanWrite));

  // Oculta se o humano não puder ler nem escrever no arquivo
  if (!meta.humanRead && !meta.humanWrite) {
    return null;
  }

  const li = document.createElement('li');

  // Herança: O arquivo assume avançado se a pasta pai for avançada OU se o próprio arquivo for avançado
  const isAdvanced = (parentMeta && parentMeta.advanced === true) || meta.advanced === true;
  if (isAdvanced) {
    li.classList.add('advanced-item');
  }

  const span = document.createElement('span');
  span.className = 'file-name';
  span.setAttribute('data-path', relativePath);
  span.innerText = `📄 ${meta.title}`;

  span.onclick = async (e) => {
    e.stopPropagation();
    document.querySelectorAll('.file-name').forEach(el => el.classList.remove('active'));
    span.classList.add('active');
    await openFileElectron(entry.path, relativePath);
  };

  li.appendChild(span);
  return li;
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