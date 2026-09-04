const fs = require('fs');
const path = require('path');

// Pastas/Arquivos a serem ignorados completamente
const IGNORE_LIST = ['node_modules', '.git', 'dist', 'build', 'project-map.js', 'project-map.txt'];

// Pastas que devem ser exibidas na árvore, mas SEM listar o conteúdo interno
const DONT_RECURSE = ['books'];

/**
 * Tenta extrair a descrição da tag @file ou @description no início do arquivo
 */
function extractDescription(filePath) {
  try {
    const buffer = Buffer.alloc(1024);
    const fd = fs.openSync(filePath, 'r');
    const bytesRead = fs.readSync(fd, buffer, 0, 1024, 0);
    fs.closeSync(fd);

    const content = buffer.toString('utf8', 0, bytesRead);

    const match = content.match(/@(?:file|description)\s+(.+)/i);
    if (match && match[1]) {
      return match[1].trim();
    }
  } catch (err) {
    // Ignora erros de leitura
  }
  return '';
}

/**
 * Percorre as pastas e gera a árvore em texto puro
 */
function printTree(dirPath, prefix = '') {
  const items = fs.readdirSync(dirPath).filter(item => !IGNORE_LIST.includes(item));

  items.forEach((item, index) => {
    const isLast = index === items.length - 1;
    const itemPath = path.join(dirPath, item);
    const stats = fs.statSync(itemPath);

    const connector = isLast ? '└── ' : '├── ';
    const childPrefix = prefix + (isLast ? '    ' : '│   ');

    if (stats.isDirectory()) {
      console.log(`${prefix}${connector}[${item}]`);
      
      // Só entra na pasta se ela NÃO estiver na lista DONT_RECURSE
      if (!DONT_RECURSE.includes(item)) {
        printTree(itemPath, childPrefix);
      }
    } else {
      const description = extractDescription(itemPath);
      const descText = description ? ` — ${description}` : '';
      console.log(`${prefix}${connector}${item}${descText}`);
    }
  });
}

console.log('Estrutura do Projeto com Descrições:\n.');
printTree('.');