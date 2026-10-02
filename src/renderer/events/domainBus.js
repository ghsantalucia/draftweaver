/**
 * @file Barramento de eventos (Pub-Sub) dedicado à camada de negócio da aplicação, processando atualizações de dados vindas do sistema de arquivos e regras do fluxo literário.
 */

import mitt from "mitt";
export const domainBus = mitt();

// DEBUG Ouve absolutamente tudo o que passa pelo uiBus
domainBus.on("*", (eventType, eventContext) => {
  console.log(`[DOMAIN Debug] Evento disparado: "${eventType}"`, eventContext);
});
