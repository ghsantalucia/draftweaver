/**
 * @file scripts/code-map.js
 * @description Gera um mapa estruturado da pasta /src focando em arquivos .js,
 * ignorando funções locais/aninhadas e associando corretamente os JSDocs.
 */

const fs = require('fs');
const path = require('path');

const TARGET_DIR = path.join(process.cwd(), 'src');

function extractFileDescription(content) {
  const match = content.match(/@(?:file|description)\s+([^\*]+)/i);
  return match ? match[1].trim().replace(/\r?\n\s*\*\s*/g, ' ') : '';
}

function extractFunctionsFromFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const functions = [];

    // 1. Isola e remove o bloco de descrição do arquivo do topo para não afetar as funções
    const fileDescMatch = content.match(/\/\*\*[\s\S]*?@(?:file|description)\s+([^\*]+)[\s\S]*?\*\//i);
    const fileDescription = fileDescMatch ? fileDescMatch[1].trim().replace(/\r?\n\s*\*\s*/g, ' ') : '';
    
    if (fileDescMatch) {
      content = content.replace(fileDescMatch[0], '');
    }

    // 2. Regex para capturar funções de nível superior (com ou sem export/async, com JSDoc opcional)
    const regex = /(?:\/\*\*([\s\S]*?)\*\/)?\s*(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(([^)]*)\)/g;
    
    let match;
    while ((match = regex.exec(content)) !== null) {
      const fullMatchIndex = match.index;
      const jsdoc = match[1] || '';
      const funcName = match[2];
      const rawParams = match[3].trim();

      // 3. Verifica o escopo: descarta se estiver dentro de outra função (profundidade de chaves > 0)
      const textBefore = content.substring(0, fullMatchIndex);
      const cleanTextBefore = textBefore
        .replace(/\/\*[\s\S]*?\*\//g, '') // remove comentários de bloco do texto anterior
        .replace(/\/.*/g, '');           // remove comentários de linha

      const openBraces = (cleanTextBefore.match(/\{/g) || []).length;
      const closeBraces = (cleanTextBefore.match(/\}/g) || []).length;
      
      if ((openBraces - closeBraces) > 0) {
        continue; // Ignora funções locais/aninhadas
      }

      // 4. Limpeza inteligente do JSDoc (remove linhas @param, remove quebras e normaliza espaços)
      const cleanDoc = jsdoc
        .replace(/^\s*\*\s?/gm, '')
        .replace(/@param\s+.*/g, '')
        .replace(/\r?\n|\r/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      functions.push({
        name: funcName,
        params: rawParams,
        description: cleanDoc || ''
      });
    }

    return {
      fileDescription,
      functions
    };
  } catch (err) {
    return { fileDescription: '', functions: [] };
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

  items.forEach((item, index) => {
    const isLast = index === items.length - 1;
    const itemPath = path.join(dirPath, item);
    const stats = fs.statSync(itemPath);

    const connector = isLast ? '└── ' : '├── ';
    const childPrefix = prefix + (isLast ? '    ' : '│   ');

    if (stats.isDirectory()) {
      console.log(`${prefix}${connector}[${item}]`);
      scanSourceTree(itemPath, childPrefix);
    } else {
      const parsedData = extractFunctionsFromFile(itemPath);
      const fileDescText = parsedData.fileDescription ? ` — [${parsedData.fileDescription}]` : '';
      
      console.log(`${prefix}${connector}${item}${fileDescText}`);

      if (parsedData.functions.length > 0) {
        parsedData.functions.forEach((func, fIndex) => {
          const isLastFunc = fIndex === parsedData.functions.length - 1;
          const funcConnector = isLastFunc ? '└── ⚙️ ' : '├── ⚙️ ';
          const descPart = func.description ? ` — ${func.description}` : '';
          console.log(`${childPrefix}${funcConnector}${func.name}(${func.params})${descPart}`);
        });
      }
    }
  });
}

console.log('=== MAPA DETALHADO DE CÓDIGO DA PASTA /SRC ===\n.');
scanSourceTree(TARGET_DIR);