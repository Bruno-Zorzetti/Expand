import { test, expect, type Page } from "@playwright/test";

// A sessão já está autenticada via storageState (veja playwright.config.ts)

async function navTo(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded", timeout: 30_000 });
}

test.describe("Painel Expand — autenticado", () => {
  test.beforeEach(async ({ page }) => {
    await navTo(page, "/expand");
  });

  test("Meu Dia carrega com KPIs", async ({ page }) => {
    await expect(page.getByText(/Bom dia|Boa tarde|Boa noite/i)).toBeVisible({ timeout: 10_000 });
    const kpiCount = await page.locator(".ex-kpi").count();
    expect(kpiCount).toBeGreaterThanOrEqual(1);
    await expect(page).toHaveTitle(/Expand/);
  });

  test("menu lateral contém itens principais", async ({ page }) => {
    // Seções da nav (ExpandShell)
    await expect(page.getByText("Operação & Atividades")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Comercial")).toBeVisible();
    await expect(page.getByText("EXPAND").first()).toBeVisible();
  });

  test("Carteira carrega sem erro", async ({ page }) => {
    await navTo(page, "/expand/carteira");
    await expect(page.locator("body")).not.toContainText("Application error");
    await expect(page.locator("h1, .ex-h1, [class*='ex-h']").first()).toBeVisible({ timeout: 10_000 });
  });

  test("Board de Entrega carrega", async ({ page }) => {
    await navTo(page, "/expand/board");
    await expect(page.locator("body")).not.toContainText("Application error");
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 10_000 });
  });

  test("Fluxograma carrega com etapas", async ({ page }) => {
    await navTo(page, "/expand/fluxo");
    await expect(page.locator("body")).not.toContainText("Application error");
    await expect(page.locator("body")).not.toContainText("404");
    await expect(page.locator("main, [role='main'], .ex-shell-body").first()).toBeVisible({ timeout: 10_000 });
  });

  test("Equipe & Agentes carrega", async ({ page }) => {
    await navTo(page, "/expand/equipe");
    await expect(page.locator("body")).not.toContainText("Application error");
    await expect(page.getByText(/Equipe|Time/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("Gestão carrega com KPIs", async ({ page }) => {
    await navTo(page, "/expand/gestao");
    await expect(page.locator("body")).not.toContainText("Application error");
    const kpiCount = await page.locator(".ex-kpi").count();
    expect(kpiCount).toBeGreaterThanOrEqual(1);
  });

  test("Finanças — Mini DRE carrega", async ({ page }) => {
    await navTo(page, "/expand/financas");
    await expect(page.locator("body")).not.toContainText("Application error");
    await expect(page.getByText(/DRE|Finan/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("Roadmap carrega com fases", async ({ page }) => {
    await navTo(page, "/expand/roadmap");
    await expect(page.locator("body")).not.toContainText("Application error");
    await expect(page.getByText(/Roadmap/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("body")).not.toContainText("HASHES");
  });

  test("Perfis de clientes carrega", async ({ page }) => {
    await navTo(page, "/expand/perfis");
    await expect(page.locator("body")).not.toContainText("Application error");
    await expect(page.locator("main, .ex-shell-body").first()).toBeVisible({ timeout: 10_000 });
  });

  test("Plano de Ação carrega", async ({ page }) => {
    await navTo(page, "/expand/plano");
    await expect(page.locator("body")).not.toContainText("Application error");
    await expect(page.locator("main, .ex-shell-body").first()).toBeVisible({ timeout: 10_000 });
  });

  test("Rotinas carrega", async ({ page }) => {
    await navTo(page, "/expand/rotinas");
    await expect(page.locator("body")).not.toContainText("Application error");
    await expect(page.locator("main, .ex-shell-body").first()).toBeVisible({ timeout: 10_000 });
  });

  test("Sala do time carrega", async ({ page }) => {
    await navTo(page, "/expand/sala");
    await expect(page.locator("body")).not.toContainText("Application error");
    await expect(page.getByText(/Sala/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("Guia do sistema comercial carrega", async ({ page }) => {
    await navTo(page, "/expand/comercial/guia");
    await expect(page.locator("body")).not.toContainText("Application error");
    await expect(page.getByText(/Guia do/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("RBAC — tabela de permissões carrega", async ({ page }) => {
    await navTo(page, "/expand/rbac");
    await expect(page.locator("body")).not.toContainText("Application error");
    await expect(page.getByText(/Permissões|RBAC/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("filtros de Meu Dia — Semana e Mês funcionam", async ({ page }) => {
    await page.locator('a[href*="range=semana"]').click();
    await page.waitForURL(/range=semana/, { timeout: 10_000 });
    await page.locator('a[href*="range=mes"]').click();
    await page.waitForURL(/range=mes/, { timeout: 10_000 });
  });
});

test.describe("Marca — sem referências antigas", () => {
  test("título da aba não contém Hashes", async ({ page }) => {
    await navTo(page, "/expand");
    await expect(page).not.toHaveTitle(/Hashes/i);
    await expect(page).toHaveTitle(/Expand/i);
  });

  test("SiteHeader exibe EXPAND, não HASHES", async ({ page }) => {
    await navTo(page, "/expand");
    const hdr = page.locator("header");
    if (await hdr.count() > 0) {
      await expect(hdr).not.toContainText("HASHES");
    }
  });

  test("SiteFooter exibe EXPAND", async ({ page }) => {
    await navTo(page, "/hashes");
    const footer = page.locator("footer");
    if (await footer.count() > 0) {
      await expect(footer).not.toContainText("HASHES");
      await expect(footer).toContainText("EXPAND");
    }
  });
});
