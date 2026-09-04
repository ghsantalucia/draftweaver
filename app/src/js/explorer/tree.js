/**
 * @file Constrói e gerencia a interface da árvore de arquivos e pastas no painel lateral com suporte a filtros YAML e permissões de exibição.
 */

import { state } from '../config.js';
import { openFileElectron } from '../editor/index.js';
import { parseMarkdown, normalizeItemMetadata } from '../utils/helpers.js';

/**
 * Renderiza a árvore de arquivos no container DOM principal.
 */
export async function renderTree() {
  const container = document.getElementById('file-tree');
  if (!container || !state.currentBookPath) return;

  container.innerHTML = ''; // Limpa a árvore antes de re-renderizar

  const folderName = state.currentBookPath.split(/[/\\]/).pop();
  const ul = await buildTree(state.currentBookPath, folderName);
  container.appendChild(ul);
}

/**
 * Função principal de montagem: busca entradas no disco e coordena a hierarquia.
 */
export async function buildTree(directoryPath, currentPath, parentMeta = null) {
  const ul = document.createElement('ul');

  const folderData = await window.electronAPI.getTree(directoryPath);
  const rawEntries = folderData && folderData.children ? folderData.children : [];

  // TODO: Integrar com o novo sistema de Logs
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

  const compareByTitle = (a, b) => {
    const titleA = a.querySelector('span')?.innerText || '';
    const titleB = b.querySelector('span')?.innerText || '';
    return titleA.localeCompare(titleB, undefined, { numeric: true, sensitivity: 'base' });
  };

  folderNodes.sort(compareByTitle);
  fileNodes.sort(compareByTitle);

  [...folderNodes, ...fileNodes].forEach(node => ul.appendChild(node));

  return ul;
}

/**
 * Processa uma pasta, lê seu `folder.yml` e monta o nó de pasta (`<li>`) se visível.
 */
async function createFolderNode(entry, relativePath, parentMeta = null) {
  const folderYmlPath = `${entry.path}/folder.yml`;
  let rawMeta = {};

  const rawText = await window.electronAPI.readFile(folderYmlPath);

  console.log(`[DEBUG Folder YML] Lendo "${folderYmlPath}" -> Sucesso? ${!!rawText}`);

  if (rawText) {
    const parsed = parseMarkdown(rawText, true);
    rawMeta = parsed.metadata || {};
  }

  const meta = normalizeItemMetadata(rawMeta, entry.name);
  state.fileMetadataMap[relativePath] = meta;

  console.log(`[DEBUG Folder Meta] Pasta: "${entry.name}" | humanRead:`, meta.humanRead, '| Meta final:', meta);

  if (!meta.humanRead) {
    return null;
  }

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

/**
 * Lê o arquivo Markdown, avalia permissões no Frontmatter e cria o nó de arquivo (`<li>`).
 */
async function createFileNode(entry, relativePath, parentMeta = null) {
  console.log(`[DEBUG File Process] Processando arquivo: "${relativePath}"`);

  let rawMeta = {};

  const rawText = await window.electronAPI.readFile(entry.path);
  if (rawText) {
    const parsed = parseMarkdown(rawText);
    rawMeta = parsed.metadata || {};
  }

  const meta = normalizeItemMetadata(rawMeta, entry.name);
  state.fileMetadataMap[relativePath] = meta;

  console.log(`[DEBUG File Meta] Arquivo: "${entry.name}" | humanRead:`, meta.humanRead, '| humanWrite:', meta.humanWrite);

  if (!meta.humanRead && !meta.humanWrite) {
    return null;
  }

  const li = document.createElement('li');

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