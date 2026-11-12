/**
 * @file Registro de ferramentas (tool calling) independente de provedor.
 * As definições usam JSON Schema (o mesmo formato do MCP), então cada provedor
 * apenas traduz `{ name, description, parameters }` para o seu formato nativo.
 */

/**
 * @typedef {Object} ToolDefinition
 * @property {string} name
 * @property {string} description
 * @property {Object} parameters - JSON Schema (type: "object") dos argumentos.
 * @property {(args: Object, ctx: Object) => Promise<string|Object>} execute
 */

export class ToolRegistry {
  constructor() {
    /** @type {Map<string, ToolDefinition>} */
    this.tools = new Map();
  }

  /**
   * Registra uma ferramenta.
   * @param {ToolDefinition} tool
   */
  register(tool) {
    this.tools.set(tool.name, tool);
  }

  /**
   * Definições expostas ao modelo (sem a função de execução).
   * @returns {Array<{name: string, description: string, parameters: Object}>}
   */
  getDefinitions() {
    return [...this.tools.values()].map(
      ({ name, description, parameters }) => ({
        name,
        description,
        parameters,
      }),
    );
  }

  /**
   * Executa uma ferramenta. Nunca lança: erros viram `isError` para o modelo reagir.
   * @param {string} name
   * @param {Object} args
   * @param {Object} ctx - Contexto (state, fileService).
   * @returns {Promise<{output: string, isError: boolean}>}
   */
  async execute(name, args, ctx) {
    const tool = this.tools.get(name);
    if (!tool) {
      return { output: `Ferramenta desconhecida: ${name}`, isError: true };
    }

    try {
      const result = await tool.execute(args || {}, ctx);
      const output =
        typeof result === "string" ? result : JSON.stringify(result, null, 2);
      return { output, isError: false };
    } catch (error) {
      return { output: error.message, isError: true };
    }
  }
}
