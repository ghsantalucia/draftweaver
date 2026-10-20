import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  parseMarkdown,
  stringifyFrontmatter,
} from "../../../../src/renderer/utils/markdown.js";

describe("markdown.js - Utilitário de Parsing e Serialização", () => {
  describe("parseMarkdown()", () => {
    it("deve extrair corretamente os metadados YAML e o corpo do Markdown a partir da fixture real do capítulo", () => {
      const fixturePath = path.join(__dirname, "../../../fixtures/chapter.md");
      const rawContent = fs.readFileSync(fixturePath, "utf-8");

      const result = parseMarkdown(rawContent);

      // Valida se todos os tipos e chaves do seu frontmatter foram lidos corretamente
      expect(result.metadata).toEqual({
        humanRead: true,
        humanWrite: true,
        aiRead: true,
        aiWrite: true,
        advanced: false,
        title: "Manuscrito",
        description: "null", // O parser simples converte string "null" ou lê literal
      });

      // Valida se o título e o parágrafo do capítulo vieram no corpo intactos
      expect(result.body).toContain("# CAPÍTULO 01: O PASSO EM FALSO");
      expect(result.body).toContain("O silêncio do salão pesava mais");
    });

    it("deve retornar metadata vazio e manter o corpo intacto quando não houver Frontmatter", () => {
      const rawContent = "Apenas um texto simples sem bloco YAML.";
      const result = parseMarkdown(rawContent);

      expect(result.metadata).toEqual({});
      expect(result.body.trim()).toBe(
        "Apenas um texto simples sem bloco YAML.",
      );
    });

    it("deve processar corretamente quando isYmlOnly for true (ex: folder.yml)", () => {
      const rawContent = `type: "character"
name: "Protagonista"
hidden: false`;

      const result = parseMarkdown(rawContent, true);

      expect(result.metadata).toEqual({
        type: "character",
        name: "Protagonista",
        hidden: false,
      });
    });

    it("deve extrair metadados do folder.yml a partir de arquivo fixture quando isYmlOnly for true", () => {
      const fixturePath = path.join(__dirname, "../../../fixtures/folder.yml");
      const rawContent = fs.readFileSync(fixturePath, "utf-8");

      const result = parseMarkdown(rawContent, true);

      expect(result.metadata).toEqual({
        humanRead: true,
        humanWrite: false,
        aiRead: true,
        aiWrite: true,
        advanced: false,
        title: "Capítulo 01",
        description: "Capítulo 01",
      });
    });
  });

  describe("stringifyFrontmatter()", () => {
    it("deve reconstituir o bloco YAML com os metadados e anexar ao corpo do Markdown", () => {
      const metadata = {
        title: "Capítulo 2",
        status: "completed",
      };
      const body = "Conteúdo revisado do capítulo.";

      const result = stringifyFrontmatter(metadata, body);

      expect(result).toContain("---");
      expect(result).toContain("title: Capítulo 2");
      expect(result).toContain("status: completed");
      expect(result).toContain("Conteúdo revisado do capítulo.");
    });

    it("deve retornar apenas o corpo sem alterações caso o metadata esteja vazio", () => {
      const metadata = {};
      const body = "Apenas o corpo do texto.";

      const result = stringifyFrontmatter(metadata, body);

      expect(result).toBe("Apenas o corpo do texto.");
    });
  });
});
