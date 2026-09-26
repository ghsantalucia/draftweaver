import fs from 'fs/promises';
import path from 'path';

const SRC_DIR = path.resolve('src');

async function getFiles(dir, ext) {
    let results = [];
    try {
        const list = await fs.readdir(dir, { withFileTypes: true });
        for (const file of list) {
            const filePath = path.join(dir, file.name);
            if (file.isDirectory()) {
                results = results.concat(await getFiles(filePath, ext));
            } else if (ext.some(e => file.name.endsWith(e))) {
                results.push(filePath);
            }
        }
    } catch (e) {
        // Ignora se o diretório não existir
    }
    return results;
}

function findEnclosingContext(content, index) {
    const codeBefore = content.substring(0, index);
    const lines = codeBefore.split('\n');
    
    // Lista de palavras que queremos ignorar se forem capturadas por engano
    const ignoreKeywords = ['if', 'for', 'while', 'switch', 'catch', 'return'];
    
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        
        // Ignora linhas vazias ou comentários simples
        if (!line || line.startsWith('//') || line.startsWith('/*')) continue;

        // Procura por declarações de métodos, funções ou arrow functions
        // Ex: registerEvents() { , onBookSelect = (...) => { , function foo() {
        const funcMatch = line.match(/(?:async\s+)?(?:function\s+([a-zA-Z0-9_$]+)|([a-zA-Z0-9_$]+)\s*[:=]\s*(?:async\s*)?\([^)]*\)\s*=>|([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*\{)/);
        
        if (funcMatch) {
            const candidate = funcMatch[1] || funcMatch[2] || funcMatch[3];
            // Se o candidato não for uma palavra reservada/controle, retornamos ele
            if (candidate && !ignoreKeywords.includes(candidate)) {
                return candidate;
            }
        }
        
        // Fallback: se a linha parece ser a definição de um método de classe (ex: "registerEvents() {")
        const simpleMethodMatch = line.match(/^([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*\{?/);
        if (simpleMethodMatch) {
            const candidate = simpleMethodMatch[1];
            if (candidate && !ignoreKeywords.includes(candidate)) {
                return candidate;
            }
        }
    }
    return 'escopo global';
}

// Analisa elementos HTML para extrair tag#id ou tag.class
function parseHtmlElement(htmlSnippet) {
    // Captura a tag (ex: <button ...)
    const tagMatch = htmlSnippet.match(/^<\s*([a-zA-Z0-9_-]+)/);
    const tagName = tagMatch && tagMatch[1] ? tagMatch[1].toLowerCase() : 'element';

    // Procura por id="..." ou id='...'
    const idMatch = htmlSnippet.match(/\bid\s*=\s*(["'])(.*?)\1/);
    if (idMatch && idMatch[2]) {
        return `${tagName}#${idMatch[2]}`;
    }

    // Procura por class="..." ou class='...'
    const classMatch = htmlSnippet.match(/\bclass\s*=\s*(["'])(.*?)\1/);
    if (classMatch && classMatch[2]) {
        // Pega a primeira classe se houver múltiplas
        const firstClass = classMatch[2].trim().split(/\s+/)[0];
        if (firstClass) {
            return `${tagName}.${firstClass}`;
        }
    }

    return tagName;
}

async function parseEvents() {
    const files = await getFiles(SRC_DIR, ['.js', '.html']);
    const documentation = {
        uiBus: {},
        domainBus: {}
    };

    const buses = ['uiBus', 'domainBus'];

    for (const filePath of files) {
        const content = await fs.readFile(filePath, 'utf-8');
        const relativePath = path.relative(process.cwd(), filePath);
        const isHtml = filePath.endsWith('.html');

        if (isHtml) {
            // Varre arquivos HTML em busca de event-*="..." ou event-*='...'
            // Ex: event-click="sync:open-modal" ou event-change='book:selected'
            const htmlEventRegex = /(<[a-zA-Z0-9_-][^>]*?\bevent-[a-zA-Z0-9_-]+\s*=\s*(["'])([^"']+)\2[^>]*>)/g;
            let match;
            while ((match = htmlEventRegex.exec(content)) !== null) {
                const fullTag = match[1];
                const eventName = match[3]; // O nome do evento está no grupo 3
                
                // Por padrão, eventos declarativos em HTML pertencem ao uiBus
                const busName = 'uiBus'; 

                if (!documentation[busName][eventName]) {
                    documentation[busName][eventName] = { emitters: [], listeners: [] };
                }

                const elementIdentifier = parseHtmlElement(fullTag);
                const locationStr = `${elementIdentifier} (${relativePath})`;
                
                if (!documentation[busName][eventName].emitters.includes(locationStr)) {
                    documentation[busName][eventName].emitters.push(locationStr);
                }
            }
        } else {
            // Varre arquivos JS (.js)
            buses.forEach(busName => {
                const emitRegex = new RegExp(`${busName}\\.\\s*emit\\s*\\(\\s*['"\`\\\`]([^'"\`\\\`]+)['"\`\\\`]`, 'g');
                let match;
                while ((match = emitRegex.exec(content)) !== null) {
                    const eventName = match[1];
                    const context = findEnclosingContext(content, match.index);
                    
                    if (!documentation[busName][eventName]) {
                        documentation[busName][eventName] = { emitters: [], listeners: [] };
                    }
                    
                    documentation[busName][eventName].emitters.push(`${context} (${relativePath})`);
                }

                const onRegex = new RegExp(`${busName}\\.\\s*on\\s*\\(\\s*['"\`\\\`]([^'"\`\\\`]+)['"\`\\\`]`, 'g');
                while ((match = onRegex.exec(content)) !== null) {
                    const eventName = match[1];
                    const context = findEnclosingContext(content, match.index);
                    
                    if (!documentation[busName][eventName]) {
                        documentation[busName][eventName] = { emitters: [], listeners: [] };
                    }
                    
                    documentation[busName][eventName].listeners.push(`${context} (${relativePath})`);
                }
            });
        }
    }

    return documentation;
}

async function generateTextMap() {
    const data = await parseEvents();

    let output = `==================================================\n`;
    output += ` MAPA DE ARQUITETURA DE EVENTOS DO DRAFTWEAVER\n`;
    output += `==================================================\n\n`;

    // Seção uiBus
    output += `[uiBus] - Eventos da Interface Gráfica\n`;
    output += `--------------------------------------------------\n`;
    const uiEvents = Object.keys(data.uiBus).sort();
    
    if (uiEvents.length === 0) {
        output += `Nenhum evento registrado.\n\n`;
    } else {
        uiEvents.forEach(event => {
            output += `⚙️ [${event}]\n`;
            
            output += `    * Emissores:\n`;
            const emitters = [...new Set(data.uiBus[event].emitters)];
            if (emitters.length === 0) {
                output += `      └── ---\n`;
            } else {
                emitters.forEach((loc, idx) => {
                    const connector = idx === emitters.length - 1 ? '└──' : '├──';
                    output += `      ${connector} ${loc}\n`;
                });
            }

            output += `    * Escutadores:\n`;
            const listeners = [...new Set(data.uiBus[event].listeners)];
            if (listeners.length === 0) {
                output += `      └── ---\n`;
            } else {
                listeners.forEach((loc, idx) => {
                    const connector = idx === listeners.length - 1 ? '└──' : '├──';
                    output += `      ${connector} ${loc}\n`;
                });
            }
            output += `\n`;
        });
    }

    output += `\n`;

    // Seção domainBus
    output += `[domainBus] - Eventos de Domínio e Negócio\n`;
    output += `--------------------------------------------------\n`;
    const domainEvents = Object.keys(data.domainBus).sort();
    
    if (domainEvents.length === 0) {
        output += `Nenhum evento registrado.\n\n`;
    } else {
        domainEvents.forEach(event => {
            output += `⚙️ [${event}]\n`;
            
            output += `    * Emissores:\n`;
            const emitters = [...new Set(data.domainBus[event].emitters)];
            if (emitters.length === 0) {
                output += `      └── ---\n`;
            } else {
                emitters.forEach((loc, idx) => {
                    const connector = idx === emitters.length - 1 ? '└──' : '├──';
                    output += `      ${connector} ${loc}\n`;
                });
            }

            output += `    * Escutadores:\n`;
            const listeners = [...new Set(data.domainBus[event].listeners)];
            if (listeners.length === 0) {
                output += `      └── ---\n`;
            } else {
                listeners.forEach((loc, idx) => {
                    const connector = idx === listeners.length - 1 ? '└──' : '├──';
                    output += `      ${connector} ${loc}\n`;
                });
            }
            output += `\n`;
        });
    }

    process.stdout.write(output);
}
generateTextMap();