import { test, expect } from "@playwright/test";

test("loads sample and formats it", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Sample" }).click();
  await page.getByRole("button", { name: "Format", exact: true }).click();

  // The output pane (read-only editor) should contain pretty-printed JSON.
  await expect(page.getByText('"name": "json-formatter"')).toBeVisible();

  // Status bar reports valid JSON.
  await expect(page.getByText(/Valid JSON/)).toBeVisible();
});
