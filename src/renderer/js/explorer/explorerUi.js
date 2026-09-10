/**
 * @file Funções da UI do explorador de arquivos (File Explorer), incluindo a renderização da árvore de arquivos, eventos de interação e manipulação de elementos DOM relacionados.
 */

export function initExplorerEvents() {
    // TODO: Inicializa eventos de interação com a árvore de arquivos
    toggleAdvancedExplorerView();
}

function toggleAdvancedExplorerView() {

    // Alternador de exibição de itens avançados na árvore
    const modeToggle = document.getElementById('mode-toggle');
    if (modeToggle) {
        modeToggle.addEventListener('change', (e) => {
            const container = document.getElementById('file-tree');
            if (container) {
                if (e.target.checked) {
                    container.classList.add('show-advanced');
                } else {
                    container.classList.remove('show-advanced');
                }
            }
        });
    }
}