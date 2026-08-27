export type Game = string;

export type Prize = {
  label?: string;
  amount: number;
  weight: number;
  color: string;
};

export type Winner = {
  name: string;
  prize: string;
};

export type RankedWinner = Winner & { rank: number };

export type TodaySpin = {
  result: string;
  confirmation_code: string;
};

export type SpinState = {
  facebookName: string;
  game: Game;
  config: Prize[];
  spins: TodaySpin[];
  used: number;
  remaining: number;
};

export type Offer = { badge: string; headline: string; description: string };
export type OfferConfig = Record<string, Offer>;
