import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: [
      "tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}",
      "tests/integration/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}",
    ],

    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/tests/e2e/**",
      "**/.vite/**",
    ],
  },
});
