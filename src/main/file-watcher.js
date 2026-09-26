/**
 * @file Monitora o sistema de arquivos utilizando a biblioteca Chokidar na pasta /books, disparando eventos via IPC para o processo de renderização sempre que houver alterações em arquivos de configuração, markdowns ou pastas de livros.
 */

const chokidar = require('chokidar');
const path = require('path');

/**
 * Configura e inicia o observador do sistema de arquivos para a pasta de livros.
 * @param {BrowserWindow} mainWindow - Instância da janela principal do Electron para envio de eventos IPC.
 */
export function setupFileWatcher(mainWindow) {
  // Caminho absoluto para a pasta books na raiz do projeto
  const booksPath = path.join(process.cwd(), 'books');

  const watcher = chokidar.watch(booksPath, {
    ignored: /(^|[/\\])\../, // ignora arquivos ocultos
    persistent: true,
    ignoreInitial: true
  });

  watcher.on('all', (event, filePath) => {
    const relativePath = path.relative(booksPath, filePath);
    const filename = path.basename(filePath);

    // 1. Alterações no config.json de qualquer livro
    if (filename === 'config.json') {
      console.log("[CHOKIDAR] Alteração de config.json");
      mainWindow.webContents.send('fs:config-changed', { event, filePath, relativePath });
      return;
    }

    // 3. Criações e exclusões de arquivos .md.temp
    if (filename.endsWith('.md.temp')) {
      mainWindow.webContents.send('fs:temp-changed', { event, filePath, relativePath });
      return;
    }

    // 2. Criações, exclusões e alterações de arquivos .md
    if (filename.endsWith('.md')) {
      mainWindow.webContents.send('fs:markdown-changed', { event, filePath, relativePath });
      return;
    }

    // 4. Criações e exclusões de pastas de livros em /books (1 nível abaixo de books)
    const pathSegments = relativePath.split(path.sep);
    if (pathSegments.length === 1 && (event === 'addDir' || event === 'unlinkDir')) {
      mainWindow.webContents.send('fs:book-folder-changed', { event, filePath, relativePath });
    }
  });

  console.log('[FileWatcher] Monitoramento iniciado em:', booksPath);
}