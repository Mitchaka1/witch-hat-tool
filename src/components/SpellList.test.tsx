import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { demoSpells } from "@/data/demoSpells";
import SpellList from "@/components/SpellList";

describe("SpellList", () => {
  it("shows every known spell and selects affordable entries", () => {
    const onSelect = vi.fn();

    render(
      <SpellList
        spells={demoSpells}
        selectedId="flame_shot"
        spentInk={0}
        inkBudget={100}
        onSelect={onSelect}
      />,
    );

    expect(screen.getAllByRole("button")).toHaveLength(8);
    expect(screen.getByText("Fire + Column + Region")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /Watershot Seal/i }),
    );
    expect(onSelect).toHaveBeenCalledWith("watershot");
  });

  it("disables spells that exceed the remaining ink budget", () => {
    render(
      <SpellList
        spells={demoSpells}
        selectedId="flame_shot"
        spentInk={80}
        inkBudget={100}
        onSelect={() => undefined}
      />,
    );

    expect(
      screen.getByRole("button", { name: /Pyreball Seal/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /Flame Shot Seal/i }),
    ).toBeEnabled();
  });
});
