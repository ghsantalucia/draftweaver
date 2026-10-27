import { test, expect } from "@playwright/test";
import { _electron as electron } from "playwright";
import path from "path";

let electronApp;
let window;

test.beforeEach(async () => {
  electronApp = await electron.launch({
    args: [
      path.join(__dirname, "../../.vite/build/main.js"),
      "--window-size=1440,900",
    ],
    env: { ...process.env, NODE_ENV: "test" },
  });

  window = await electronApp.firstWindow();
  await window.setViewportSize({ width: 1440, height: 900 });
});

test.afterEach(async () => {
  if (electronApp) {
    await electronApp.close();
  }
});

test("a drawer de settings abre e fecha corretamente", async () => {
  const openButton = window.locator("#btn-open-menu");
  const settingsContainer = window.locator("#settings-container");
  const closeButton = window.locator("#btn-close-menu");

  // Aguarda o botão principal carregar e ficar visível na tela
  await openButton.waitFor({ state: "visible", timeout: 30000 });

  // 1. Garante que começa fechada (sem a classe 'open')
  await expect(settingsContainer).not.toHaveClass(/open/);

  // 2. Clica no botão para abrir e valida se ganhou a classe 'open'
  await openButton.click();
  await expect(settingsContainer).toHaveClass(/open/);

  // 3. Clica no botão de fechar e valida se perdeu a classe 'open'
  await closeButton.click();
  await expect(settingsContainer).not.toHaveClass(/open/);
});
