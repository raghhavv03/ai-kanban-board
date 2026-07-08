import { test, expect, type Page, type Locator } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/");
  await page.getByLabel("Username").fill("user");
  await page.getByLabel("Password").fill("password");
  await page.getByTestId("login-submit").click();
  await page.waitForSelector('[data-testid="kanban-board"]');
}

function columnByTitle(page: Page, title: string): Locator {
  return page.locator('[data-testid^="column-"]').filter({
    has: page.getByRole("button", { name: `Rename column: ${title}` }),
  });
}

function cardByText(page: Page, text: string): Locator {
  return page.locator('[data-testid^="card-"]').filter({ hasText: text }).first();
}

test("debug tall", async ({ page }) => {
  page.on("console", (m) => {
    const t = m.text();
    if (t.includes("MOVE") || t.includes("DROPIDX")) console.log(t);
  });
  await login(page);
  await page.request.post("/api/test/reset");
  await page.reload();
  await page.waitForSelector('[data-testid="kanban-board"]');

  const todo = columnByTitle(page, "To Do");
  await todo.getByTestId("add-card-button").click();
  await todo.getByLabel("Card title").fill("Tall card");
  await todo
    .getByLabel("Card details")
    .fill(
      "This card has a very long description that spans multiple lines so that it is noticeably taller than the cards it is dropped onto."
    );
  await todo.getByTestId("add-card-submit").click();
  await expect(page.getByText("Tall card")).toBeVisible();

  const source = cardByText(page, "Tall card");
  const destColumn = columnByTitle(page, "Backlog");
  const firstCard = destColumn.locator('[data-testid^="card-"]').first();
  const box = await source.boundingBox();
  const firstBox = await firstCard.boundingBox();
  console.log("SOURCE", JSON.stringify(box));
  console.log("FIRST(Backlog)", JSON.stringify(firstBox));

  const startX = box!.x + box!.width / 2;
  const startY = box!.y + box!.height / 2;
  const tx = firstBox!.x + firstBox!.width / 2;
  const ty = firstBox!.y + 6;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX, startY + 15, { steps: 5 });
  await page.mouse.move(tx, ty, { steps: 20 });
  await page.mouse.move(tx, ty, { steps: 5 });
  await page.mouse.up();
});
