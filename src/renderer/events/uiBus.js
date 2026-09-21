/**
 * @file Barramento de eventos (Pub-Sub) dedicado exclusivamente para a interface do usuário (UI), gerenciando interações visuais, abertura de drawers, toasts e modais.
 */

import mitt from 'mitt';
export const uiBus = mitt();