import { test, expect } from "@playwright/test";

// Rotas públicas — sem login necessário

test.describe("Rotas públicas", () => {
  test("login page carrega", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/Expand/);
    await expect(page.locator("input[type='email']")).toBeVisible();
    await expect(page.locator("input[type='password']")).toBeVisible();
  });

  test("raiz carrega sem erro de servidor", async ({ page }) => {
    await page.goto("/");
    // Pode ficar em / ou redirecionar — o importante é não ter erro 500
    await expect(page.locator("body")).not.toContainText("Application error");
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
  });

  test("/expand redireciona para login sem autenticação", async ({ page }) => {
    await page.goto("/expand");
    await expect(page).toHaveURL(/\/login/);
  });

  test("/expand/board redireciona para login", async ({ page }) => {
    await page.goto("/expand/board");
    await expect(page).toHaveURL(/\/login/);
  });

  test("/expand/gestao redireciona para login", async ({ page }) => {
    await page.goto("/expand/gestao");
    await expect(page).toHaveURL(/\/login/);
  });

  test("/expand/financas redireciona para login", async ({ page }) => {
    await page.goto("/expand/financas");
    await expect(page).toHaveURL(/\/login/);
  });

  test("/expand/equipe redireciona para login", async ({ page }) => {
    await page.goto("/expand/equipe");
    await expect(page).toHaveURL(/\/login/);
  });

  test("página /hashes (catálogo legado) carrega sem erro", async ({ page }) => {
    await page.goto("/hashes");
    // Pode redirecionar para login ou mostrar conteúdo
    const status = page.url();
    expect(status).toMatch(/localhost:3000/);
    // Não deve ter erro de servidor
    await expect(page.locator("body")).not.toContainText("Application error");
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
  });
});
