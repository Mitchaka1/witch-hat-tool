import { describe, expect, it } from "vitest";
import { findUsablePageIndex } from "@/lib/grimoireNavigation";

describe("findUsablePageIndex", () => {
  const pages = [
    { remainingUses: 0 },
    { remainingUses: 2 },
    { remainingUses: 0 },
    { remainingUses: 1 },
  ];

  it("skips spent pages while moving forward or backward", () => {
    expect(findUsablePageIndex(pages, 0, 1)).toBe(1);
    expect(findUsablePageIndex(pages, 1, 1)).toBe(3);
    expect(findUsablePageIndex(pages, 3, 1)).toBe(1);
    expect(findUsablePageIndex(pages, 1, -1)).toBe(3);
  });

  it("can include the current page when choosing after a cast", () => {
    expect(findUsablePageIndex(pages, 1, 1, true)).toBe(1);
    expect(findUsablePageIndex(pages, 2, 1, true)).toBe(3);
  });

  it("returns -1 when every prepared page is spent", () => {
    expect(
      findUsablePageIndex(
        [{ remainingUses: 0 }, { remainingUses: 0 }],
        0,
        1,
      ),
    ).toBe(-1);
  });
});
