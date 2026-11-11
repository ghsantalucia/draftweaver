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

export const expect = base.expect;
