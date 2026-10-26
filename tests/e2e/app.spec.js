import { test, expect } from "@playwright/test";
import { _electron as electron } from "playwright";

test("deve iniciar o aplicativo Electron e carregar a interface", async () => {
  // Inicia o Electron apontando para a raiz do projeto
  const electronApp = await electron.launch({
    args: ["."],
    // Garanta que o ambiente de teste saiba que é o Electron
    env: { ...process.env, NODE_ENV: "test" },
  });

  // Captura a primeira janela aberta pelo Electron
  const window = await electronApp.firstWindow();

  // Opcional: Maximiza ou foca a janela para garantir visibilidade
  await window.waitForLoadState("domcontentloaded");

  // Agora, qualquer comando do Playwright (como clicar, digitar, achar elementos)
  // deve ser feito usando a constante "window", e não o "page" global do Playwright.
  const bodyExists = await window.locator("body").isVisible();
  expect(bodyExists).toBe(true);

  // Fecha o app ao terminar
  await electronApp.close();
});
