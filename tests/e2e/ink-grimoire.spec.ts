import { expect, test } from "@playwright/test";
import { demoSpells } from "../../src/data/demoSpells";
import { createPreparedSpell } from "../../src/lib/grimoireStorage";

test("loads a prepared page and uses it in the arena", async ({ page }) => {
  const preparedPage = createPreparedSpell(demoSpells[0], 0.9, {
    id: "e2e-flame",
    now: 1,
  });

  await page.addInitScript((prepared) => {
    window.localStorage.setItem("wha:onboarding:v1", "done");
    window.localStorage.setItem(
      "ink-grimoire-arena:prepared-spells:v1",
      JSON.stringify([prepared]),
    );
  }, preparedPage);
  await page.goto("/prepare");

  await expect(
    page.getByRole("heading", { name: "Prepare your spellbook" }),
  ).toBeVisible();
  await expect(page.getByText("1 pages", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Enter the arena" }).click();
  await expect(page).toHaveURL(/\/arena$/);
  await expect(
    page.getByRole("heading", { name: "Ink Grimoire Arena" }),
  ).toBeVisible();

  const stage = page.getByLabel("Ink Grimoire Arena combat stage");
  await stage.click({ position: { x: 780, y: 430 } });
  await expect(
    page.locator("article").getByText(/3 uses/),
  ).toBeVisible();

  await page.getByRole("button", { name: "Restart" }).click();
  await expect(
    page.locator("article").getByText(/4 uses/),
  ).toBeVisible();
});
