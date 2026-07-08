import { test, expect, type Page, type Locator } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/");
  await page.getByLabel("Username").fill("user");
  await page.getByLabel("Password").fill("password");
  await page.getByTestId("login-submit").click();
  await page.waitForSelector('[data-testid="kanban-board"]');
}

async function waitForBoard(page: Page) {
  await page.waitForSelector('[data-testid="kanban-board"]');
}

function columnByTitle(page: Page, title: string): Locator {
  return page.locator('[data-testid^="column-"]').filter({
    has: page.getByRole("button", { name: `Rename column: ${title}` }),
  });
}

function cardByText(page: Page, text: string): Locator {
  return page
    .locator('[data-testid^="card-"]')
    .filter({ hasText: text })
    .first();
}

async function columnCardTitles(column: Locator): Promise<string[]> {
  return column.locator('[data-testid^="card-"] h3').allInnerTexts();
}

async function dragCardTo(
  page: Page,
  card: Locator,
  targetX: number,
  targetY: number
) {
  const box = await card.boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  // small initial move to pass the drag activation distance
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2 + 15, {
    steps: 5,
  });
  await page.mouse.move(targetX, targetY, { steps: 20 });
  await page.mouse.move(targetX, targetY, { steps: 5 });
  await page.mouse.up();
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
    await waitForBoard(page);
    await expect(page.getByTestId("login-form")).toHaveCount(0);
  });
});

test.describe("Kanban Board", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.request.post("/api/test/reset");
    await page.reload();
    await waitForBoard(page);
  });

  test("loads with seeded data in expected columns", async ({ page }) => {
    for (const title of ["Backlog", "To Do", "In Progress", "Review", "Done"]) {
      await expect(
        page.getByRole("button", { name: `Rename column: ${title}` })
      ).toBeVisible();
    }
    await expect(page.getByText("Research competitors")).toBeVisible();
    await expect(page.getByText("Deploy MVP")).toBeVisible();
  });

  test("renames a column and persists", async ({ page }) => {
    await page.getByRole("button", { name: "Rename column: To Do" }).click();
    const input = page.getByLabel("Column title");
    await input.fill("Ready");
    await input.press("Enter");
    await expect(
      page.getByRole("button", { name: "Rename column: Ready" })
    ).toBeVisible();

    await page.reload();
    await waitForBoard(page);
    await expect(
      page.getByRole("button", { name: "Rename column: Ready" })
    ).toBeVisible();
  });

  test("adds a card and persists", async ({ page }) => {
    const todo = columnByTitle(page, "To Do");
    await todo.getByTestId("add-card-button").click();
    await todo.getByLabel("Card title").fill("E2E Test Card");
    await todo.getByLabel("Card details").fill("Created by Playwright");
    await todo.getByTestId("add-card-submit").click();

    await expect(page.getByText("E2E Test Card")).toBeVisible();

    await page.reload();
    await waitForBoard(page);
    await expect(page.getByText("E2E Test Card")).toBeVisible();
    await expect(page.getByText("Created by Playwright")).toBeVisible();
  });

  test("edits a card and persists", async ({ page }) => {
    const card = cardByText(page, "Design board layout");
    await card.hover();
    await card
      .getByRole("button", { name: "Edit card: Design board layout" })
      .click();

    await page.getByLabel("Edit card title").fill("Design board UI");
    await page.getByLabel("Edit card details").fill("Updated wireframe notes");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Design board UI")).toBeVisible();

    await page.reload();
    await waitForBoard(page);
    await expect(page.getByText("Design board UI")).toBeVisible();
    await expect(page.getByText("Design board layout")).toHaveCount(0);
  });

  test("deletes a card and persists", async ({ page }) => {
    const card = cardByText(page, "Set up project repo");
    await card.hover();
    await card
      .getByRole("button", { name: "Delete card: Set up project repo" })
      .click();

    await expect(page.getByText("Set up project repo")).toHaveCount(0);

    await page.reload();
    await waitForBoard(page);
    await expect(page.getByText("Set up project repo")).toHaveCount(0);
  });

  test("drags a card to another column and persists", async ({ page }) => {
    const source = cardByText(page, "Design board layout");
    const destColumn = columnByTitle(page, "In Progress");

    const sourceBox = await source.boundingBox();
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

    await page.reload();
    await waitForBoard(page);
    await expect(
      columnByTitle(page, "In Progress").getByText("Design board layout")
    ).toBeVisible();
    await expect(
      columnByTitle(page, "To Do").getByText("Design board layout")
    ).toHaveCount(0);
  });

  test("drops a card at the first position of another column", async ({
    page,
  }) => {
    const source = cardByText(page, "Design board layout");
    const destColumn = columnByTitle(page, "In Progress");
    const firstCard = destColumn.locator('[data-testid^="card-"]').first();

    const firstBox = await firstCard.boundingBox();
    expect(firstBox).toBeTruthy();
    // Aim just below the top edge of the first card so it lands above it.
    await dragCardTo(
      page,
      source,
      firstBox!.x + firstBox!.width / 2,
      firstBox!.y + 6
    );

    await expect
      .poll(async () => (await columnCardTitles(destColumn))[0])
      .toBe("Design board layout");

    await page.reload();
    await waitForBoard(page);
    const titles = await columnCardTitles(columnByTitle(page, "In Progress"));
    expect(titles[0]).toBe("Design board layout");
  });

  test("drops a tall card above a shorter card", async ({ page }) => {
    // A card taller than its target used to always land below it. Create a
    // deliberately tall card, then drop it above the first card in another
    // column.
    const todo = columnByTitle(page, "To Do");
    await todo.getByTestId("add-card-button").click();
    await todo.getByLabel("Card title").fill("Tall card");
    await todo
      .getByLabel("Card details")
      .fill(
        "This card has a very long description that spans multiple lines so " +
          "that it is noticeably taller than the cards it is dropped onto, " +
          "which is exactly the condition that broke the above/below drop."
      );
    await todo.getByTestId("add-card-submit").click();
    await expect(page.getByText("Tall card")).toBeVisible();

    const source = cardByText(page, "Tall card");
    const destColumn = columnByTitle(page, "Backlog");
    const firstCard = destColumn.locator('[data-testid^="card-"]').first();
    const firstBox = await firstCard.boundingBox();
    expect(firstBox).toBeTruthy();

    await dragCardTo(
      page,
      source,
      firstBox!.x + firstBox!.width / 2,
      firstBox!.y + 6
    );

    await expect
      .poll(async () => (await columnCardTitles(destColumn))[0])
      .toBe("Tall card");

    await page.reload();
    await waitForBoard(page);
    const titles = await columnCardTitles(columnByTitle(page, "Backlog"));
    expect(titles[0]).toBe("Tall card");
  });

  test("reorders a card above another card in the same column", async ({
    page,
  }) => {
    const column = columnByTitle(page, "In Progress");
    const source = column
      .locator('[data-testid^="card-"]')
      .filter({ hasText: "Implement drag and drop" })
      .first();
    const anchor = column
      .locator('[data-testid^="card-"]')
      .filter({ hasText: "Build card component" })
      .first();

    const anchorBox = await anchor.boundingBox();
    expect(anchorBox).toBeTruthy();
    await dragCardTo(
      page,
      source,
      anchorBox!.x + anchorBox!.width / 2,
      anchorBox!.y + 6
    );

    await expect
      .poll(async () => await columnCardTitles(column))
      .toEqual(["Implement drag and drop", "Build card component"]);

    await page.reload();
    await waitForBoard(page);
    expect(await columnCardTitles(columnByTitle(page, "In Progress"))).toEqual([
      "Implement drag and drop",
      "Build card component",
    ]);
  });

  test("drops a card directly above an existing card", async ({ page }) => {
    const source = cardByText(page, "Set up project repo");
    const destColumn = columnByTitle(page, "In Progress");
    const anchor = destColumn
      .locator('[data-testid^="card-"]')
      .filter({ hasText: "Implement drag and drop" })
      .first();

    const anchorBox = await anchor.boundingBox();
    expect(anchorBox).toBeTruthy();
    // Aim at the upper portion of the anchor card to insert before it.
    await dragCardTo(
      page,
      source,
      anchorBox!.x + anchorBox!.width / 2,
      anchorBox!.y + 6
    );

    await expect
      .poll(async () => await columnCardTitles(destColumn))
      .toEqual([
        "Build card component",
        "Set up project repo",
        "Implement drag and drop",
      ]);

    await page.reload();
    await waitForBoard(page);
    expect(await columnCardTitles(columnByTitle(page, "In Progress"))).toEqual([
      "Build card component",
      "Set up project repo",
      "Implement drag and drop",
    ]);
  });
});

test.describe("AI chat", () => {
  test("shows assistant reply and refreshes the board after an update", async ({
    page,
  }) => {
    await login(page);
    await page.getByTestId("chat-open").click();
    await expect(page.getByTestId("chat-sidebar")).toBeVisible();

    const boardRes = await page.request.get("/api/board");
    const board = await boardRes.json();
    const todo = board.columns.find(
      (column: { title: string }) => column.title === "To Do"
    );

    await page.request.post(`/api/columns/${todo.id}/cards`, {
      data: { title: "Sprint planning", details: "Plan the next sprint" },
    });

    await page.route("**/api/chat", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          reply: "I added Sprint planning to To Do.",
          board_changed: true,
          model: "test",
        }),
      });
    });

    await page.getByTestId("chat-input").fill("Add Sprint planning to To Do");
    await page.getByTestId("chat-send").click();

    await expect(
      page.getByText("I added Sprint planning to To Do.")
    ).toBeVisible();
    await expect(cardByText(page, "Sprint planning")).toBeVisible();
  });
});
