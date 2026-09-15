/**
 * @file Funções da UI do explorador de arquivos (File Explorer), incluindo a renderização da árvore de arquivos, eventos de interação e manipulação de elementos DOM relacionados.
 */

export function initExplorerEvents() {
    // TODO: Inicializa eventos de interação com a árvore de arquivos
    toggleAdvancedExplorerView();
    tabSelectionEvents();
}

function toggleAdvancedExplorerView() {
    
    const modeToggle = document.getElementById('mode-toggle');
    const container = document.getElementById('file-tree');

    // Unifica a verificação dos dois elementos em um único if
    if (modeToggle && container) {

        // Função local para atualizar a classe com base no estado do checkbox
        function updateAdvancedVisibility() {
            if (modeToggle.checked) {
                container.classList.add('show-advanced');
            } else {
                container.classList.remove('show-advanced');
            }
        }

        // 1. Estado inicial desativado
        modeToggle.checked = false;
        updateAdvancedVisibility();

        // 2. Listener de eventos em segundo
        modeToggle.addEventListener('change', updateAdvancedVisibility);
    }
}

function tabSelectionEvents() {

    const fileTreeContainer = document.getElementById('file-tree');

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {

            // Atualiza estado visual do botão
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Remove classes anteriores e adiciona a nova no container
            fileTreeContainer.classList.remove('active-tab-notes', 'active-tab-content', 'active-tab-assets');

            if (btn.getAttribute('folder') === 'content') {
                fileTreeContainer.classList.add('active-tab-content');
            } 
            else if (btn.getAttribute('folder') === 'assets') {
                fileTreeContainer.classList.add('active-tab-assets');
            } 
            else if (btn.getAttribute('folder') === 'notes') {
                fileTreeContainer.classList.add('active-tab-notes');
            }
        });
    });

    // Estado inicial: ativa a aba "content" por padrão
    const defaultTab = document.querySelector('.tab-btn[folder="content"]');
    if (defaultTab) {
        defaultTab.click();
    }
}

