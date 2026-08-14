import { test as setup } from "@playwright/test";
import path from "path";

const AUTH_FILE = path.join(__dirname, "../playwright/.auth/user.json");

setup("autenticar como admin", async ({ page }) => {
  await page.goto("/login", { waitUntil: "load", timeout: 30_000 });

  // Espera o React hidratar — o botão deve estar habilitado
  const btn = page.locator("form .hx-btn-primary");
  await btn.waitFor({ state: "visible", timeout: 15_000 });

  await page.fill("input[type='email']", "teste@hashes.com.br");
  await page.fill("input[type='password']", "HashesTeste123");
  await btn.click();

  // Aguarda sair de /login (qualquer destino: /cliente, /expand, /dashboard)
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 });

  // Salva sessão para reutilizar nos testes
  await page.context().storageState({ path: AUTH_FILE });
});
