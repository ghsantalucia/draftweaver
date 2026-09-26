/**
 * @file Barramento de eventos (Pub-Sub) dedicado à camada de negócio da aplicação, processando atualizações de dados vindas do sistema de arquivos e regras do fluxo literário.
 */

import mitt from 'mitt';
export const domainBus = mitt();