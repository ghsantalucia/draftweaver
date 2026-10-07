/**
 * @file Ponto de entrada do frontend (Renderer), responsável por inicializar o container principal da aplicação.
 */

import { AppContainer } from "./core/appContainer.js";

// Inicialização principal quando o DOM estiver carregado utilizando o Container IoC
document.addEventListener("DOMContentLoaded", async () => {
  const appContainer = new AppContainer();
  await appContainer.init();
});

console.log("[APP.JS]");
