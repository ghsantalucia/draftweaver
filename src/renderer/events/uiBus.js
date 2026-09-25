/**
 * @file scripts/renderer/events/eventUi.js
 * @description Mini-framework de delegação de eventos via atributos declarativos, extraindo dados de atributos data-* automaticamente.
 */

import mitt from 'mitt';

// Instância central do barramento de UI
export const uiBus = mitt();

// FIXME: DEBUG Ouve absolutamente tudo o que passa pelo uiBus
uiBus.on('*', (eventType, eventContext) => {
  console.log(`[UI Debug] Evento disparado: "${eventType}"`, eventContext);
});

// Lista de eventos DOM que vamos escutar via delegação global
const SUPPORTED_EVENTS = ['click', 'change', 'input', 'submit', 'focus'];

/**
 * Inicializa o escutador global de eventos no documento.
 */
function initDeclarativeEvents() {
    SUPPORTED_EVENTS.forEach(eventType => {
        document.addEventListener(eventType, (e) => {
            const attributeName = `event-${eventType}`;
            const targetElement = e.target.closest(`[${attributeName}]`);

            if (!targetElement) return;

            const eventChannel = targetElement.getAttribute(attributeName);

            // 1. Constrói um objeto dinâmico pegando todos os atributos dataset do elemento
            const data = {};
            for (const key in targetElement.dataset) {
                data[key] = targetElement.dataset[key];
            }

            // 2. Se for um input, extrai o valor de forma inteligente
            let value = null;
            if (targetElement.tagName === 'INPUT' || targetElement.tagName === 'SELECT' || targetElement.tagName === 'TEXTAREA') {
                if (targetElement.type === 'checkbox' || targetElement.type === 'radio') {
                    value = targetElement.checked; // boolean para checkboxes
                } else {
                    value = targetElement.value;   // valor em string para textos/selects
                }
            }

            // Dispara no uiBus o canal definido e passa o objeto de contexto + o evento nativo
            uiBus.emit(eventChannel, { value, data, nativeEvent: e, target: targetElement });
            // console.log(eventChannel, { data, nativeEvent: e, target: targetElement });
        });
    });
}

// Inicializa automaticamente ao carregar o módulo
initDeclarativeEvents();