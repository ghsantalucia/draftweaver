/**
 * @file Modelos do Gemini oferecidos por padrão no select (a lista é atualizada pela API quando há chave).
 * Os IDs mudam com frequência; a atualização pela API é a fonte confiável.
 */

export const GEMINI_MODELS = [
  {
    id: "gemini-3.1-pro-preview",
    label: "Gemini 3.1 Pro (preview)",
    contextWindow: 1048576,
  },
  { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash", contextWindow: 1048576 },
  {
    id: "gemini-3-flash-preview",
    label: "Gemini 3 Flash (preview)",
    contextWindow: 1048576,
  },
];

export const GEMINI_DEFAULT_MODEL = "gemini-3.6-flash";
