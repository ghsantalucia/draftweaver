/**
 * @file Comparação linha a linha entre duas versões de um texto.
 */

/** Limite de células da tabela LCS (acima disso, o trecho alterado é tratado como trocado por inteiro). */
const MAX_LCS_CELLS = 4_000_000;

/**
 * Compara dois textos e indica quais linhas foram removidas (versão antiga) e adicionadas (versão nova).
 * @param {string} oldText
 * @param {string} newText
 * @returns {{ oldLines: Array<{text: string, deleted: boolean}>, newLines: Array<{text: string, added: boolean}> }}
 */
export function diffLines(oldText, newText) {
  const a = (oldText ?? "").split(/\r?\n/);
  const b = (newText ?? "").split(/\r?\n/);

  // Prefixo e sufixo idênticos não precisam entrar na tabela
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;

  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }

  const deleted = new Set();
  const added = new Set();
  const n = endA - start;
  const m = endB - start;

  if (n * m > MAX_LCS_CELLS) {
    for (let i = start; i < endA; i++) deleted.add(i);
    for (let j = start; j < endB; j++) added.add(j);
  } else if (n > 0 || m > 0) {
    // Tabela LCS: lcs[i][j] = tamanho da subsequência comum de a[start+i..] e b[start+j..]
    const width = m + 1;
    const lcs = new Uint32Array((n + 1) * width);
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        lcs[i * width + j] =
          a[start + i] === b[start + j]
            ? lcs[(i + 1) * width + j + 1] + 1
            : Math.max(lcs[(i + 1) * width + j], lcs[i * width + j + 1]);
      }
    }

    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (a[start + i] === b[start + j]) {
        i++;
        j++;
      } else if (lcs[(i + 1) * width + j] >= lcs[i * width + j + 1]) {
        deleted.add(start + i++);
      } else {
        added.add(start + j++);
      }
    }
    while (i < n) deleted.add(start + i++);
    while (j < m) added.add(start + j++);
  }

  return {
    oldLines: a.map((text, i) => ({ text, deleted: deleted.has(i) })),
    newLines: b.map((text, i) => ({ text, added: added.has(i) })),
  };
}
