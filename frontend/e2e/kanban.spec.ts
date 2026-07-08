import { test, expect, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/");
  await page.getByLabel("Username").fill("user");
  await page.getByLabel("Password").fill("password");
  await page.getByTestId("login-submit").click();
  await page.waitForSelector('[data-testid="kanban-board"]');
}

test.describe("Authentication", () => {
  test("shows login and hides the board before signing in", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("login-form")).toBeVisible();
    await expect(page.getByTestId("kanban-board")).toHaveCount(0);
  });

  test("rejects invalid credentials", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Username").fill("user");
    await page.getByLabel("Password").fill("wrong");
    await page.getByTestId("login-submit").click();
    await expect(page.getByTestId("login-error")).toBeVisible();
    await expect(page.getByTestId("kanban-board")).toHaveCount(0);
  });

  test("logs in with valid credentials and logs out", async ({ page }) => {
    await login(page);
    await expect(page.getByText("Project Board")).toBeVisible();

    await page.getByTestId("logout-button").click();
    await expect(page.getByTestId("login-form")).toBeVisible();
    await expect(page.getByTestId("kanban-board")).toHaveCount(0);
  });

  test("session persists across reload", async ({ page }) => {
    await login(page);
    await page.reload();
    await page.waitForSelector('[data-testid="kanban-board"]');
    await expect(page.getByTestId("login-form")).toHaveCount(0);
  });
});

test.describe("Kanban Board", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("loads with dummy data in expected columns", async ({ page }) => {
    await expect(page.getByText("Project Board")).toBeVisible();
    await expect(page.getByText("Backlog")).toBeVisible();
    await expect(page.getByText("To Do")).toBeVisible();
    await expect(page.getByText("In Progress")).toBeVisible();
    await expect(page.getByText("Review")).toBeVisible();
    await expect(page.getByText("Done")).toBeVisible();
    await expect(page.getByText("Research competitors")).toBeVisible();
    await expect(page.getByText("Deploy MVP")).toBeVisible();
  });

  test("renames a column", async ({ page }) => {
    await page.getByRole("button", { name: "Rename column: To Do" }).click();
    const input = page.getByLabel("Column title");
    await input.fill("Ready");
    await input.press("Enter");

    await expect(page.getByText("Ready")).toBeVisible();
    await expect(page.getByText("To Do")).not.toBeVisible();
  });

  test("adds a card with title and details", async ({ page }) => {
    const column = page.getByTestId("column-col-todo");
    await column.getByTestId("add-card-button").click();
    await column.getByLabel("Card title").fill("E2E Test Card");
    await column.getByLabel("Card details").fill("Created by Playwright");
    await column.getByTestId("add-card-submit").click();

    await expect(page.getByText("E2E Test Card")).toBeVisible();
    await expect(page.getByText("Created by Playwright")).toBeVisible();
  });

  test("edits a card's title and details", async ({ page }) => {
    const card = page.getByTestId("card-card-3");
    await card.hover();
    await card.getByRole("button", { name: "Edit card: Design board layout" }).click();

    const titleInput = page.getByLabel("Edit card title");
    await titleInput.fill("Design board UI");
    const detailsInput = page.getByLabel("Edit card details");
    await detailsInput.fill("Updated wireframe notes");
    await page.getByTestId("card-edit-save-card-3").click();

    await expect(page.getByText("Design board UI")).toBeVisible();
    await expect(page.getByText("Updated wireframe notes")).toBeVisible();
    await expect(page.getByText("Design board layout")).not.toBeVisible();
  });

  test("deletes a card", async ({ page }) => {
    const card = page.getByTestId("card-card-3");
    await expect(card).toBeVisible();
    await card.hover();
    await card.getByRole("button", { name: "Delete card: Design board layout" }).click();

    await expect(page.getByText("Design board layout")).not.toBeVisible();
  });

  test("drags a card from one column to another", async ({ page }) => {
    const sourceCard = page.getByTestId("card-card-3");
    const destColumn = page.getByTestId("column-col-in-progress");

    await expect(sourceCard).toBeVisible();

    const sourceBox = await sourceCard.boundingBox();
    const destBox = await destColumn.boundingBox();
    expect(sourceBox).toBeTruthy();
    expect(destBox).toBeTruthy();

    const startX = sourceBox!.x + sourceBox!.width / 2;
    const startY = sourceBox!.y + sourceBox!.height / 2;
    const endX = destBox!.x + destBox!.width / 2;
    const endY = destBox!.y + 120;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY + 20, { steps: 5 });
    await page.mouse.move(endX, endY, { steps: 15 });
    await page.mouse.up();

    await expect(
      destColumn.getByText("Design board layout")
    ).toBeVisible();
    await expect(
      page.getByTestId("column-col-todo").getByText("Design board layout")
    ).not.toBeVisible();
  });

  test("drags a card to the last position in another column", async ({ page }) => {
    const sourceCard = page.getByTestId("card-card-3");
    const destColumn = page.getByTestId("column-col-in-progress");

    const sourceBox = await sourceCard.boundingBox();
    const lastDestCard = destColumn.getByTestId("card-card-6");
    const lastCardBox = await lastDestCard.boundingBox();
    const destBox = await destColumn.boundingBox();
    expect(sourceBox).toBeTruthy();
    expect(lastCardBox).toBeTruthy();
    expect(destBox).toBeTruthy();

    const startX = sourceBox!.x + sourceBox!.width / 2;
    const startY = sourceBox!.y + sourceBox!.height / 2;
    const endX = destBox!.x + destBox!.width / 2;
    const endY = lastCardBox!.y + lastCardBox!.height + 30;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY + 20, { steps: 5 });
    await page.mouse.move(endX, endY, { steps: 20 });
    await page.mouse.up();

    const destCards = destColumn.locator("[data-testid^='card-']");
    await expect(destCards).toHaveCount(3);
    await expect(destCards.nth(2)).toContainText("Design board layout");
  });
});
