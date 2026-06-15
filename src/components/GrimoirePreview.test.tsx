import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { demoSpells } from "@/data/demoSpells";
import GrimoirePreview from "@/components/GrimoirePreview";
import { createPreparedSpell } from "@/lib/grimoireStorage";

describe("GrimoirePreview", () => {
  it("explains the empty state", () => {
    render(<GrimoirePreview prepared={[]} onRemove={vi.fn()} />);

    expect(screen.getByText(/blank grimoire/i)).toBeInTheDocument();
  });

  it("renders quality, charges, and removal for prepared pages", () => {
    const onRemove = vi.fn();
    const prepared = createPreparedSpell(demoSpells[0], 0.84, {
      id: "page-1",
      now: 1,
    });

    render(
      <GrimoirePreview prepared={[prepared]} onRemove={onRemove} />,
    );

    expect(screen.getByText("Flame Shot Seal")).toBeInTheDocument();
    expect(screen.getByText(/84%/)).toBeInTheDocument();
    expect(screen.getByText(/4 uses/i)).toBeInTheDocument();

    screen.getByRole("button", { name: /remove flame shot seal/i }).click();
    expect(onRemove).toHaveBeenCalledWith("page-1");
  });
});
