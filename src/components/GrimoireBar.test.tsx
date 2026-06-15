import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { demoSpells } from "@/data/demoSpells";
import GrimoireBar from "@/components/GrimoireBar";
import { createPreparedSpell } from "@/lib/grimoireStorage";

describe("GrimoireBar", () => {
  it("shows charges and allows direct page selection", () => {
    const pages = [
      createPreparedSpell(demoSpells[0], 0.8, { id: "a", now: 1 }),
      createPreparedSpell(demoSpells[1], 0.9, { id: "b", now: 2 }),
    ];
    const onSelect = vi.fn();

    render(
      <GrimoireBar
        pages={pages}
        selectedIndex={0}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByText(/4 uses/i)).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /Select Watershot Seal/i }),
    );
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it("marks an exhausted page without hiding it", () => {
    const exhausted = {
      ...createPreparedSpell(demoSpells[7], 0.7, { id: "a", now: 1 }),
      remainingUses: 0,
    };

    render(
      <GrimoireBar
        pages={[exhausted]}
        selectedIndex={0}
        onSelect={() => undefined}
      />,
    );

    expect(screen.getByText("Spent")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Select Pyreball Seal/i }),
    ).toBeEnabled();
  });
});
