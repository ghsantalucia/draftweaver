/**
 * @file Utilitário para conversão, parsing e serialização de conteúdos Markdown e metadados Frontmatter YAML.
 */

/**
 * Converte Frontmatter YAML em Objeto JS e retorna o corpo do Markdown separadamente.
 * @param {string} fileContent Conteúdo bruto do arquivo
 * @param {boolean} isYmlOnly Indica se o arquivo contém apenas metadados YAML (ex: folder.yml)
 * @returns {{ metadata: Object, body: string }}
 */
export function parseMarkdown(fileContent, isYmlOnly = false) {
  let yamlText = "";
  let body = "";

  if (isYmlOnly) {
    yamlText = fileContent;
    body = "";
  } else {
    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
    const match = fileContent.match(frontmatterRegex);

    if (match) {
      yamlText = match[1];
      body = fileContent.replace(frontmatterRegex, "");
    } else {
      return { metadata: {}, body: fileContent };
    }
  }

  const metadata = {};

  yamlText.split("\n").forEach((line) => {
    const [key, ...valueParts] = line.split(":");
    if (key && valueParts.length > 0) {
      const cleanKey = key.trim();
      let val = valueParts
        .join(":")
        .trim()
        .replace(/^["']|["']$/g, "");

      if (val === "true") val = true;
      else if (val === "false") val = false;

      metadata[cleanKey] = val;
    }
  });

  return { metadata, body };
}

/**
 * Reconstrói o bloco Frontmatter YAML e anexa ao corpo em Markdown para salvamento.
 * @param {Object} metadata Objeto de metadados
 * @param {string} body Texto do Markdown
 * @returns {string} Conteúdo formatado pronto para gravação em disco
 */
export function stringifyFrontmatter(metadata, body) {
  if (!metadata || Object.keys(metadata).length === 0) return body;

  let yaml = "---\n";
  for (const [key, value] of Object.entries(metadata)) {
    yaml += `${key}: ${value}\n`;
  }
  yaml += "---\n\n";

  return yaml + body.trimStart();
}
