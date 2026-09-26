/**
 * @file Handler dos eventos relacionados a arquivos .md e .temp
 */

import { uiBus } from '../../events/uiBus.js';
import { domainBus } from '../../events/domainBus.js';


/**
 * Handler que abre modal e exibe todos os arquivos .temp do projeto para serem sincronizados
 */
export function onSyncOpenModal() {

    // Teste de modal
    uiBus.emit('modal:open', {
        title: "Confirmar Exclusão",
        content: "<p>Tem certeza que deseja apagar este livro?</p>",
        buttons: [
            { text: "Cancelar", class: "btn-secondary" },
            {
                text: "Excluir",
                class: "btn-danger",
                onClick: (modalInstance) => {
                    modalInstance.close();
                }
            }
        ]
    });

}