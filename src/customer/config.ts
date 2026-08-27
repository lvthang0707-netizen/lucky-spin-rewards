import type { Game } from "./types";

export const GAME_META: Record<Game, { name: string; colors: string[] }> = {
  os2: {
    name: "OS2",
    colors: ["#ef4a90", "#7141d8", "#4256d9", "#ffb834"],
  },
  moolah: {
    name: "MOOLAH",
    colors: ["#0e8f68", "#22b99a", "#62d7b7"],
  },
};

export const DEFAULT_OFFERS = {
  os2: {
    badge: "OS2 NEW PLAYER BONUS",
    headline: "Up to 150%",
    description:
      "New players: 150% on $5–$20 · 100% on $21–$50 · 50% on $51–$100",
  },
  moolah: {
    badge: "MOOLAH NEW PLAYER BONUS",
    headline: "Up to 120%",
    description: "New players: 120% on $5–$30 · 100% on $31–$50",
  },
};
