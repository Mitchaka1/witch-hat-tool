import type { Metadata } from "next";
import ArenaGame from "@/components/ArenaGame";

export const metadata: Metadata = {
  title: "Arena | Ink Grimoire Arena",
  description: "Fight a one-on-one ink duel using only the pages you prepared.",
};

export default function ArenaPage() {
  return <ArenaGame />;
}
