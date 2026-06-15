import { describe, expect, it } from "vitest";
import { resolveJumpInput } from "@/lib/combatControls";

describe("resolveJumpInput", () => {
  it("starts one jump per press and does not auto-jump on landing", () => {
    expect(resolveJumpInput(true, false, true)).toEqual({
      shouldJump: true,
      consumed: true,
    });
    expect(resolveJumpInput(true, true, true)).toEqual({
      shouldJump: false,
      consumed: true,
    });
  });

  it("rearms jumping after the control is released", () => {
    expect(resolveJumpInput(false, true, false)).toEqual({
      shouldJump: false,
      consumed: false,
    });
  });
});
