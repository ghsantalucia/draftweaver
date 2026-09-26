/**
 * @file scripts/renderer/events/eventUi.js
 * @description Mini-framework de delegação de eventos via atributos declarativos, extraindo dados de atributos data-* automaticamente.
 */

import mitt from 'mitt';
import { initDeclarativeEvents } from './uiDeclarativeEvents.js';

// Instância central do barramento de UI
export const uiBus = mitt();

// Inicializa automaticamente ao carregar o módulo
initDeclarativeEvents(uiBus);

// DEBUG Ouve absolutamente tudo o que passa pelo uiBus
uiBus.on('*', (eventType, eventContext) => {
    console.log(`[UI Debug] Evento disparado: "${eventType}"`, eventContext);
});