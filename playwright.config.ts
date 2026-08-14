import { defineConfig, devices } from "@playwright/test";
import path from "path";

const AUTH_FILE = path.join(__dirname, "playwright/.auth/user.json");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 4,
  reporter: [["list"], ["html", { open: "never", outputFolder: "e2e-report" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    // 1 — Setup: login único
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    // 2 — Rotas públicas (sem auth)
    {
      name: "public",
      testMatch: /public-routes\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    // 3 — Painel autenticado (reutiliza sessão do setup)
    {
      name: "authenticated",
      testMatch: /expand-authenticated\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: AUTH_FILE,
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
