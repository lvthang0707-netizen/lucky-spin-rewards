export type AdminView =
  "facebook" | "offers" | "create" | "deposit_rewards" | "live" | "history";
export type FreeplayTab = "overview" | "rewards" | "customers" | "history";

export type DepositSpinRow = {
  id: number;
  customerId: string;
  token: string;
  status: string;
  result?: string;
  code?: string;
  createdAt: string;
  expiresAt: string;
  weights: number[];
  url: string;
};

export type ManualWinner = {
  id: number;
  customerId: string;
  prize: string;
  createdAt: string;
  featuredRank?: number | null;
  winnerType: "deposit" | "freeplay";
  frequency: number;
};

export type RealWinner = {
  id: string;
  customerId: string;
  prize: string;
  createdAt: string;
  winnerType: "deposit" | "freeplay";
};

export type DailySpinRow = {
  id: number;
  player_id: number;
  facebook_name: string;
  game: string;
  result: string;
  confirmation_code: string;
  created_at: string;
  date_key: string;
  spin_number: number;
};

export type DailyPlayer = {
  id: number;
  facebook_name: string;
  created_at: string;
  last_seen_at: string;
  os2_used: number;
  moolah_used: number;
};

export type PrizeConfig = {
  label?: string;
  amount: number;
  weight: number;
  color: string;
};
export type DailyConfig = Record<string, PrizeConfig[]>;
export type Offer = { badge: string; headline: string; description: string };
export type OfferConfig = { os2: Offer; moolah: Offer };
