import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Captura todos os argumentos após a chamada do script para permitir nomes compostos por espaço
const rawInput = process.argv.slice(2).join(" ").trim();

if (!rawInput) {
  console.error(
    "❌ Por favor, informe o nome do componente.\nExemplo: node scripts/create-component.js Left SidebAr",
  );
  process.exit(1);
}

// 1. Tratamento e Sanitização de Strings
// Converte a entrada limpa removendo o sufixo "Component" caso o usuário tenha digitado
const cleanedInput = rawInput.replace(/Component$/i, "").trim();

// Separa palavras por espaços, hífens ou underlines
const words = cleanedInput.split(/[\s-_]+/).filter(Boolean);

// PascalCase (ex: "Left SidebAr" -> "LeftSidebar")
const pascalName = words
  .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
  .join("");

// kebab-case (ex: "Left SidebAr" -> "left-sidebar")
const kebabName = words.map((w) => w.toLowerCase()).join("-");

// Definições de Nomes Finais
const folderName = pascalName; // Ex: LeftSidebar
const className = `${pascalName}Component`; // Ex: LeftSidebarComponent
const fileName = `${pascalName}.js`; // Ex: LeftSidebar.js
const cssContainerId = `#${kebabName}-container`; // Ex: #left-sidebar-container

// 2. Mapeamento de Caminhos
const componentsDir = path.resolve(__dirname, "../src/renderer/components");
const targetDir = path.join(componentsDir, folderName);
const templatesDir = path.join(targetDir, "templates");
const barrelPath = path.join(componentsDir, "index.js");

// Verifica se a pasta do componente já existe
if (fs.existsSync(targetDir)) {
  console.error(`⚠️ O componente "${folderName}" já existe em: ${targetDir}`);
  process.exit(1);
}

// 3. Criação de Diretórios
fs.mkdirSync(templatesDir, { recursive: true });

// 4. Definição do Conteúdo dos Arquivos

// LeftSidebar.js
const jsContent = `/**
 * @file Componente ${pascalName}
 */

import "./styles.css";
import templateHtml from "./templates/main.hbs?raw";
import { Component } from "../Component.js";

/**
 * Representa o componente ${pascalName}.
 * @class
 */
export class ${className} extends Component {
  /**
   * Cria uma instância da classe
   * @param {string} selector - Seletor CSS do elemento do DOM onde será injetada.
   * @param {Object} context - Objeto de contexto e infraestrutura (state, uiBus, domainBus)
   * @param {Object|Array|null} [params=null] - Parâmetros opcionais dinâmicos para a exigência do componente.
   * @param {Component} [parent=null]
   */
  constructor(selector, context, params, parent = null) {
    super(selector, context, templateHtml, params, parent);
  }

  /**
   * Eventos de inicialização do componente.
   */
  onInit() {
    // Opcional
  }

  /**
   * Configura os ouvintes de eventos da interface.
   */
  setupListeners() {
    // Opcional
  }
}
`;

// styles.css
const cssContent = `/* Estilos do componente ${pascalName} */

${cssContainerId} {

}
`;

// templates/main.hbs
const hbsContent = `{{!-- Template do componente ${pascalName} --}}
`;

// 5. Gravação dos Arquivos
fs.writeFileSync(path.join(targetDir, fileName), jsContent, "utf-8");
fs.writeFileSync(path.join(targetDir, "styles.css"), cssContent, "utf-8");
fs.writeFileSync(path.join(templatesDir, "main.hbs"), hbsContent, "utf-8");

// 6. Atualização do Barrel (/src/renderer/components/index.js)
const barrelExportLine = `export { ${className} } from "./${folderName}/${fileName}";\n`;

if (fs.existsSync(barrelPath)) {
  fs.appendFileSync(barrelPath, barrelExportLine, "utf-8");
} else {
  fs.writeFileSync(barrelPath, barrelExportLine, "utf-8");
}

console.log(`✅ Componente "${className}" criado com sucesso!`);
console.log(` 📂 Pasta: ${targetDir}`);
console.log(` 📄 Classe: ${fileName}`);
console.log(` 🎨 CSS Container: ${cssContainerId}`);
console.log(` 🔄 Adicionado ao Barrel: src/renderer/components/index.js`);
