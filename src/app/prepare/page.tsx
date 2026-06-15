import type { Metadata } from "next";
import SpellPreparationScreen from "@/components/SpellPreparationScreen";

export const metadata: Metadata = {
  title: "Prepare Grimoire | Ink Grimoire Arena",
  description: "Trace spell rings, spend preparation ink, and bind a battle grimoire.",
};

export default function PreparePage() {
  return <SpellPreparationScreen />;
}
