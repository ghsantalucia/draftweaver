// @ts-check
import { defineConfig } from "@playwright/test";

export default defineConfig({
  // Diretório onde ficarão os seus testes E2E
  testDir: "./tests/e2e",

  // Tempo limite máximo para cada teste (30 segundos)
  timeout: 30 * 1000,

  // Configurações de execução paralela e relatórios
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ["html", { outputFolder: "tests/reports/playwright/html", open: "never" }],
  ],

  use: {
    // Coleta trace caso algum teste falhe para facilitar o debug
    trace: "on-first-retry",
  },
});
