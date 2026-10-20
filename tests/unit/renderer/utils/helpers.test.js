// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import fs from "fs";
import path from "path";
import {
  normalizeItemMetadata,
  normalizePath,
  getRelativePath,
  escapeHtml,
} from "../../../../src/renderer/utils/helpers.js";
import { parseMarkdown } from "../../../../src/renderer/utils/markdown.js";
import { DEFAULT_TREE_METADATA } from "../../../../src/renderer/core/state.js";

describe("helpers.js - Funções Auxiliares Genéricas", () => {
  // ==========================================
  // Testes para normalizeItemMetadata()
  // ==========================================
  describe("normalizeItemMetadata()", () => {
    it("deve mesclar os metadados brutos com os valores padrão de DEFAULT_TREE_METADATA", () => {
      const rawMetadata = {
        title: "Capítulo Especial",
        humanRead: false,
      };

      const result = normalizeItemMetadata(rawMetadata, "Título Fallback");

      expect(result).toEqual({
        ...DEFAULT_TREE_METADATA,
        title: "Capítulo Especial",
        humanRead: false,
      });
    });

    it("deve aplicar o fallbackTitle quando o título estiver ausente ou for uma string vazia", () => {
      const rawMetadata = { humanRead: true };

      const result = normalizeItemMetadata(rawMetadata, "Título Padrão");

      expect(result.title).toBe("Título Padrão");
    });

    it("deve lidar com metadados completamente vazios ou indefinidos", () => {
      const result = normalizeItemMetadata(null, "Título Alternativo");

      expect(result.title).toBe("Título Alternativo");
    });

    it("deve validar a integração lendo metadados reais de uma fixture de teste", () => {
      const fixturePath = path.join(
        __dirname,
        "../../../fixtures/metadata-incompleto.yml",
      );
      const rawContent = fs.readFileSync(fixturePath, "utf-8");
      const parsed = parseMarkdown(rawContent, true);

      const result = normalizeItemMetadata(
        parsed.metadata,
        "Capítulo Sem Título",
      );

      expect(result.humanRead).toBe(false);
      expect(result.advanced).toBe(true);
      expect(result.title).toBe("Capítulo Sem Título");
    });
  });

  // ==========================================
  // Testes para normalizePath()
  // ==========================================
  describe("normalizePath()", () => {
    it("deve converter contra-barras (Windows '\\') em barras normais ('/')", () => {
      const windowsPath =
        "C:\\Workspace\\draftweaver\\books\\book_01\\cap01.md";
      const result = normalizePath(windowsPath);

      expect(result).toBe("C:/Workspace/draftweaver/books/book_01/cap01.md");
    });

    it("deve manter inalterados caminhos que já utilizam barras normais ('/')", () => {
      const unixPath = "usr/workspace/draftweaver/books/book_01/cap01.md";
      const result = normalizePath(unixPath);

      expect(result).toBe("usr/workspace/draftweaver/books/book_01/cap01.md");
    });

    it("deve retornar uma string vazia caso o caminho seja null, undefined ou vazio", () => {
      expect(normalizePath(null)).toBe("");
      expect(normalizePath(undefined)).toBe("");
      expect(normalizePath("")).toBe("");
    });
  });

  // ==========================================
  // Testes para getRelativePath()
  // ==========================================
  describe("getRelativePath()", () => {
    it("deve extrair o caminho relativo a partir da pasta 'books' quando o formato for válido", () => {
      const fullPath =
        "C:\\Workspace\\draftweaver\\books\\book_01\\capitulos\\01.md";
      const result = getRelativePath(fullPath);

      expect(result).toBe("book_01/capitulos/01.md");
    });

    it("deve funcionar corretamente tanto com barras do Windows quanto do Unix", () => {
      const winPath = "C:\\project\\books\\book_fantasia\\ch1.md";
      const unixPath = "/home/user/project/books/book_fantasia/ch1.md";

      expect(getRelativePath(winPath)).toBe("book_fantasia/ch1.md");
      expect(getRelativePath(unixPath)).toBe("book_fantasia/ch1.md");
    });

    it("deve retornar null se a pasta 'books' não existir no caminho", () => {
      const invalidPath =
        "C:\\Workspace\\draftweaver\\documents\\book_01\\cap01.md";
      expect(getRelativePath(invalidPath)).toBeNull();
    });

    it("deve retornar null se a pasta 'books' for a última do caminho sem subpastas", () => {
      const pathEndingInBooks = "C:\\Workspace\\draftweaver\\books";
      expect(getRelativePath(pathEndingInBooks)).toBeNull();
    });

    it("deve retornar null se a pasta do livro não começar com o prefixo obrigatorio 'book_'", () => {
      const invalidBookFolder =
        "C:\\Workspace\\draftweaver\\books\\meu_livro_fantasia\\cap01.md";
      expect(getRelativePath(invalidBookFolder)).toBeNull();
    });

    it("deve retornar null caso a entrada seja nula ou vazia", () => {
      expect(getRelativePath(null)).toBeNull();
      expect(getRelativePath("")).toBeNull();
    });
  });

  // ==========================================
  // Testes para escapeHtml()
  // ==========================================
  describe("escapeHtml()", () => {
    it("deve escapar caracteres especiais do HTML como <, >, & e cometas", () => {
      const input = '<script>alert("xss & perigo")</script>';
      const result = escapeHtml(input);

      expect(result).toBe(
        '&lt;script&gt;alert("xss &amp; perigo")&lt;/script&gt;',
      );
    });

    it("deve retornar string vazia caso a entrada seja null, undefined ou vazia", () => {
      expect(escapeHtml(null)).toBe("");
      expect(escapeHtml(undefined)).toBe("");
      expect(escapeHtml("")).toBe("");
    });

    it("deve manter texto plano sem alterações", () => {
      const text = "Capítulo 1: O Passo em Falso";
      expect(escapeHtml(text)).toBe("Capítulo 1: O Passo em Falso");
    });
  });
});
