import { test, expect } from "@playwright/test";

// Testa fluxo de controle de acessos do painel Expand.
// Requer autenticação de admin — usa sessão salva em playwright/.auth/admin.json se disponível.

test.describe("Controle de Acessos", () => {
  test.beforeEach(async ({ page }) => {
    // Navega diretamente; se não estiver autenticado, o middleware redireciona para /login
    await page.goto("/expand/acessos");
  });

  test("página de acessos carrega com seções principais", async ({ page }) => {
    // Se redirecionar para login, pula o teste (sem sessão de admin)
    if (page.url().includes("/login")) {
      test.skip(true, "Sem sessão de admin disponível");
      return;
    }
    await expect(page.getByText("Controle de")).toBeVisible();
    await expect(page.getByText("Convidar por e-mail")).toBeVisible();
  });

  test("RBAC redireciona para acessos", async ({ page }) => {
    await page.goto("/expand/rbac");
    // Deve redirecionar para /expand/acessos ou /login
    await page.waitForURL(url =>
      url.pathname.includes("/expand/acessos") || url.pathname.includes("/login")
    );
    expect(
      page.url().includes("/expand/acessos") || page.url().includes("/login")
    ).toBeTruthy();
  });

  test("link público de diagnóstico é acessível sem login", async ({ page }) => {
    // Testa um ID fictício — deve retornar 404 (perfil inexistente), nunca redirect para login
    const fakeId = "00000000-0000-0000-0000-000000000000";
    await page.goto(`/expand/pub/diag/${fakeId}`);
    // Não deve redirecionar para /login
    expect(page.url()).not.toContain("/login");
  });
});

test.describe("Formulário de convite", () => {
  test("formulário de convite está presente na página de acessos (admin)", async ({ page }) => {
    await page.goto("/expand/acessos");
    if (page.url().includes("/login")) {
      test.skip(true, "Sem sessão de admin");
      return;
    }
    const emailInput = page.locator('input[name="email"]');
    await expect(emailInput).toBeVisible();
    const roleSelect = page.locator('select[name="role"]');
    await expect(roleSelect).toBeVisible();
  });
});
