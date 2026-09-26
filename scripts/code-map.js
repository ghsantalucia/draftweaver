/**
 * @file scripts/code-map.js
 * @description Gera um mapa estruturado da pasta /src focando em arquivos .js,
 * capturando apenas classes e métodos reais, ignorando chamadas internas como super().
 */

const fs = require('fs');
const path = require('path');

const TARGET_DIR = path.join(process.cwd(), 'src');

function extractCodeStructuresFromFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const structures = [];

    // Remove a descrição do arquivo do topo para não poluir
    const fileDescMatch = content.match(/\/\*\*[\s\S]*?@(?:file|description)\s+([^\*]+)[\s\S]*?\*\//i);
    const fileDescription = fileDescMatch ? fileDescMatch[1].trim().replace(/\r?\n\s*\*\s*/g, ' ') : '';
    
    if (fileDescMatch) {
      content = content.replace(fileDescMatch[0], '');
    }

    const lines = content.split(/\r?\n/);
    let currentClass = null;
    let currentJsDoc = '';

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();

      // Captura blocos de JSDoc acumulados
      if (line.startsWith('/**')) {
        currentJsDoc = '';
        while (i < lines.length && !lines[i].includes('*/')) {
          currentJsDoc += lines[i] + '\n';
          i++;
        }
        if (i < lines.length) {
          currentJsDoc += lines[i];
        }
        continue;
      }

      const cleanDoc = currentJsDoc
        .replace(/\/\*\*|\*\//g, '')
        .replace(/^\s*\*\s?/gm, '')
        .replace(/@(?:param|returns|class|abstract|type|private|public|file|description)\s+.*/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      // 1. Detecta Classe
      const classMatch = line.match(/(?:export\s+)?class\s+([a-zA-Z0-9_$]+)/);
      if (classMatch) {
        currentClass = {
          type: 'class',
          name: classMatch[1],
          description: cleanDoc || '',
          methods: []
        };
        structures.push(currentClass);
        currentJsDoc = '';
        continue;
      }

      // 2. Detecta Métodos dentro de Classes
      const methodMatch = line.match(/^([a-zA-Z0-9_$]+)\s*\((.*?)\)\s*\{?/);
      if (methodMatch && currentClass) {
        const methName = methodMatch[1];
        const methParams = methodMatch[2];

        // Lista negra estrita para ignorar palavras reservadas ou comandos que não são métodos
        const ignoredKeywords = ['if', 'for', 'while', 'switch', 'catch', 'super', 'return', 'function'];

        if (!ignoredKeywords.includes(methName)) {
          currentClass.methods.push({
            name: methName,
            params: methParams,
            description: cleanDoc || (methName === 'constructor' ? 'Método Construtor' : '')
          });
          currentJsDoc = '';
        }
        continue;
      }

      // 3. Detecta Funções Globais
      const funcMatch = line.match(/(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\((.*?)\)/);
      if (funcMatch) {
        structures.push({
          type: 'function',
          name: funcMatch[1],
          params: funcMatch[2],
          description: cleanDoc || ''
        });
        currentJsDoc = '';
        continue;
      }

      if (line !== '' && !line.startsWith('*')) {
        currentJsDoc = '';
      }
    }

    return {
      fileDescription,
      structures
    };
  } catch (err) {
    return { fileDescription: '', structures: [] };
  }
}

function hasJsFiles(dirPath) {
  const items = fs.readdirSync(dirPath);
  for (const item of items) {
    const itemPath = path.join(dirPath, item);
    const stats = fs.statSync(itemPath);
    if (stats.isDirectory() && hasJsFiles(itemPath)) return true;
    if (stats.isFile() && item.endsWith('.js')) return true;
  }
  return false;
}

function scanSourceTree(dirPath, prefix = '') {
  if (!fs.existsSync(dirPath)) return;
  
  const items = fs.readdirSync(dirPath).sort().filter(item => {
    const itemPath = path.join(dirPath, item);
    const stats = fs.statSync(itemPath);
    if (stats.isDirectory()) return hasJsFiles(itemPath);
    return item.endsWith('.js');
  });

  items.items = items; // contexto interno
  items.forEach((item, index) => {
    const isLast = index === items.length - 1;
    const itemPath = path.join(dirPath, item);
    const stats = fs.statSync(itemPath);

    const connector = isLast ? '└── ' : '├── ';
    const childPrefix = prefix + (isLast ? '     ' : '│   ');

    if (stats.isDirectory()) {
      console.log(`${prefix}${connector}[${item}]`);
      scanSourceTree(itemPath, childPrefix);
    } else {
      const parsedData = extractCodeStructuresFromFile(itemPath);
      const fileDescText = parsedData.fileDescription ? ` — [${parsedData.fileDescription}]` : '';
      
      console.log(`${prefix}${connector}${item}${fileDescText}`);

      if (parsedData.structures.length > 0) {
        parsedData.structures.forEach((struct, sIndex) => {
          const isLastStruct = sIndex === parsedData.structures.length - 1;
          const structConnector = isLastStruct ? '└── ' : '├── ';

          if (struct.type === 'class') {
            const descPart = struct.description ? ` — ${struct.description}` : '';
            console.log(`${childPrefix}${structConnector}📦 class ${struct.name}${descPart}`);

            if (struct.methods && struct.methods.length > 0) {
              const classChildPrefix = childPrefix + (isLastStruct ? '    ' : '│   ');
              struct.methods.forEach((meth, mIndex) => {
                const isLastMeth = mIndex === struct.methods.length - 1;
                const methConnector = isLastMeth ? '└── ⚙️ ' : '├── ⚙️ ';
                const methDesc = meth.description ? ` — ${meth.description}` : '';
                console.log(`${classChildPrefix}${methConnector}${meth.name}(${meth.params})${methDesc}`);
              });
            }
          } else if (struct.type === 'function') {
            const descPart = struct.description ? ` — ${struct.description}` : '';
            console.log(`${childPrefix}${structConnector}⚙️ ${struct.name}(${struct.params})${descPart}`);
          }
        });
      }
    }
  });
}

console.log('=== MAPA DETALHADO DE CÓDIGO DA PASTA /SRC ===\n.');
scanSourceTree(TARGET_DIR);