import { GAME_META } from "./config";
import type { Game, Prize } from "./types";

export function angleFor(result: string, prizes: Prize[], turns = 0) {
  const amount = Number(result.match(/\$(\d+(?:\.\d+)?)/)?.[1] || 0);
  const index = Math.max(
    0,
    prizes.findIndex((prize) => prize.amount === amount),
  );
  return turns * 360 - index * (360 / prizes.length);
}

export function wheelGradient(prizes: Prize[], game: Game) {
  const size = 360 / prizes.length;
  const fallback = GAME_META[game]?.colors || [
    "#ef4a90",
    "#7141d8",
    "#ffb834",
    "#4256d9",
  ];
  const colors =
    prizes.length === 3
      ? prizes.map(
          (prize, index) => prize.color || fallback[index % fallback.length],
        )
      : [prizes[0]?.color || fallback[0], prizes[1]?.color || fallback[1]];
  const slices = prizes
    .map(
      (_, index) =>
        `${colors[index % colors.length]} ${index * size}deg ${(index + 1) * size}deg`,
    )
    .join(",");
  return `conic-gradient(from ${-size / 2}deg,${slices})`;
}
