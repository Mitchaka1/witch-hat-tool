import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SpellFormula from "@/components/SpellFormula";
import { demoSpells } from "@/data/demoSpells";

describe("SpellFormula", () => {
  it("renders the library components, roles, and public alias", () => {
    render(<SpellFormula spell={demoSpells[0]} />);

    expect(screen.getByText("Cinder Lance")).toBeInTheDocument();
    expect(screen.getByText("Fire")).toBeInTheDocument();
    expect(screen.getByText("Column")).toBeInTheDocument();
    expect(screen.getByText("Region")).toBeInTheDocument();
    expect(
      screen.getByText(/Fire supplies the flame, Column drives it forward/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Fire sigil reference" }),
    ).toHaveAttribute("src", expect.stringContaining("Fire_sigil.svg"));
  });
});
