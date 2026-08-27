"use client";
import { useEffect, useState } from "react";
import { DEFAULT_OFFERS, GAME_META } from "./config";
import type {
  Game,
  OfferConfig,
  Prize,
  RankedWinner,
  SpinState,
  Winner,
} from "./types";
import { angleFor, wheelGradient } from "./wheel-utils";

type GameOption = { id: string; name: string };
type DepositState = {
  customerId: string;
  status: string;
  result?: string;
  code?: string;
  expiresAt: string;
  prizes: Prize[];
};
const DEPOSIT_PRIZES: Prize[] = [
  { label: "FREEPLAY", amount: 10, weight: 95, color: "#ef4a90" },
  { label: "", amount: 10, weight: 5, color: "#7141d8" },
  { label: "", amount: 99, weight: 0, color: "#ffb834" },
  { label: "", amount: 299, weight: 0, color: "#4256d9" },
  { label: "", amount: 599, weight: 0, color: "#ef4a90" },
  { label: "", amount: 999, weight: 0, color: "#7141d8" },
];

function looksLikeDepositCode(value: string) {
  return /^.+-[a-z0-9]{8,}$/i.test(value.trim());
}

export default function SpinExperience() {
  const [game, setGame] = useState<Game>("os2"),
    [games, setGames] = useState<GameOption[]>([
      { id: "os2", name: "OS2" },
      { id: "moolah", name: "MOOLAH" },
    ]),
    [depositMode, setDepositMode] = useState(false),
    [token, setToken] = useState(""),
    [deposit, setDeposit] = useState<DepositState | null>(null),
    [name, setName] = useState(""),
    [nameReady, setNameReady] = useState(false),
    [profile, setProfile] = useState<SpinState | null>(null),
    [error, setError] = useState(""),
    [spinning, setSpinning] = useState(false),
    [angle, setAngle] = useState(0),
    [result, setResult] = useState<{ prize: string; code: string } | null>(
      null,
    ),
    [winners, setWinners] = useState<Winner[]>([]),
    [top, setTop] = useState<RankedWinner[]>([]),
    [offers, setOffers] = useState<OfferConfig>(DEFAULT_OFFERS);
  async function loadWinners() {
    try {
      const r = await fetch("/api/winners", { cache: "no-store" }),
        d = await r.json();
      setWinners(d.recent || []);
      setTop(d.top || []);
    } catch {}
  }
  async function loadOffers() {
    try {
      const r = await fetch("/api/offers", { cache: "no-store" }),
        d = await r.json();
      if (d.os2 && d.moolah) setOffers(d);
    } catch {}
  }
  async function loadGames() {
    try {
      const r = await fetch("/api/daily-spins", { cache: "no-store" }),
        d = await r.json();
      if (r.ok && d.games?.length) setGames(d.games);
    } catch {}
  }
  useEffect(() => {
    const saved = localStorage.getItem("spin-facebook-name") || "",
      urlToken = new URLSearchParams(location.search).get("token") || "";
    setName(saved);
    loadWinners();
    loadOffers();
    loadGames();
    const timer = setInterval(() => {
      loadWinners();
      loadOffers();
      loadGames();
    }, 15000);
    if (urlToken) {
      setToken(urlToken);
      setName(urlToken);
      openDeposit(urlToken);
    }
    return () => clearInterval(timer);
  }, []);
  async function open(value = name, nextGame = game) {
    setError("");
    const r = await fetch("/api/daily-spins", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          facebookName: value,
          game: nextGame,
          action: "status",
        }),
      }),
      d = await r.json();
    if (!r.ok) return setError(d.error);
    localStorage.setItem("spin-facebook-name", value.trim());
    setProfile(d);
    setGame(d.game);
  }
  async function selectGame(next: Game) {
    if (spinning) return;
    setDepositMode(false);
    setGame(next);
    setAngle(0);
    setResult(null);
    setError("");
    if (nameReady || profile) await open(profile?.facebookName || name, next);
  }
  async function selectDeposit() {
    if (spinning) return;
    setDepositMode(true);
    setAngle(0);
    setResult(null);
    setError("");
  }
  async function spin() {
    if (!profile || spinning || !profile.remaining) return;
    setSpinning(true);
    setResult(null);
    setError("");
    const r = await fetch("/api/daily-spins", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          facebookName: profile.facebookName,
          game,
          action: "spin",
        }),
      }),
      d = await r.json();
    if (!r.ok) {
      setProfile(d);
      setError(d.error);
      setSpinning(false);
      return;
    }
    setAngle(angleFor(d.result, d.config, 7));
    setTimeout(() => {
      setProfile(d);
      setResult({ prize: d.result, code: d.code });
      setSpinning(false);
    }, 4200);
  }
  async function openDeposit(value = token) {
    setError("");
    const clean = value.trim();
    if (!clean) return setError("Please enter your deposit spin code.");
    const r = await fetch(`/api/spins?token=${encodeURIComponent(clean)}`, {
        cache: "no-store",
      }),
      d = await r.json();
    if (!r.ok) {
      setName(clean);
      setToken("");
      setDeposit(null);
      setDepositMode(false);
      setNameReady(false);
      setProfile(null);
      setError(d.error);
      return;
    }
    setToken(clean);
    setDeposit(d);
    setDepositMode(true);
    if (d.result) setResult({ prize: d.result, code: d.code });
  }
  async function startUnified() {
    const value = name.trim();
    if (!value)
      return setError("Please enter your Facebook name or deposit code.");
    setError("");
    const depositCode = looksLikeDepositCode(value);
    try {
      const r = await fetch(`/api/spins?token=${encodeURIComponent(value)}`, {
        cache: "no-store",
      });
      if (r.ok) {
        const d = await r.json();
        setToken(value);
        setDeposit(d);
        setDepositMode(true);
        setProfile(null);
        if (d.result) setResult({ prize: d.result, code: d.code });
        return;
      }
      if (depositCode) {
        const d = await r.json().catch(() => ({}));
        setDepositMode(false);
        setDeposit(null);
        setProfile(null);
        setNameReady(false);
        setError(d.error || "This deposit spin code is invalid or expired.");
        return;
      }
    } catch {
      if (depositCode) {
        setDepositMode(false);
        setDeposit(null);
        setProfile(null);
        setNameReady(false);
        setError("Unable to check this deposit spin code. Please try again.");
        return;
      }
    }
    setDepositMode(false);
    localStorage.setItem("spin-facebook-name", value);
    setProfile(null);
    setNameReady(true);
  }
  async function spinDeposit() {
    if (!deposit || deposit.status !== "pending" || spinning) return;
    setSpinning(true);
    setResult(null);
    setError("");
    const r = await fetch("/api/spins", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      }),
      d = await r.json();
    if (!r.ok && d.status !== "spun") {
      setError(d.error || "This code cannot be used.");
      setDeposit(d);
      setSpinning(false);
      return;
    }
    setAngle(angleFor(d.result, d.prizes || DEPOSIT_PRIZES, 7));
    setTimeout(() => {
      setDeposit(d);
      setResult({ prize: d.result, code: d.code });
      setSpinning(false);
    }, 4200);
  }
  const config = profile?.config || [],
    meta = GAME_META[game] || {
      name: game.toUpperCase(),
      colors: ["#ef4a90", "#7141d8"],
    },
    offer = offers[game],
    shownConfig = depositMode ? deposit?.prizes || DEPOSIT_PRIZES : config,
    segment = shownConfig.length ? 360 / shownConfig.length : 90,
    compact = shownConfig.length >= 5,
    tight = shownConfig.length >= 8,
    labelWidth = Math.max(
      48,
      Math.min(104, Math.round(620 / Math.max(shownConfig.length, 1))),
    );
  return (
    <main
      className={`customer-page dual-page ${depositMode ? "game-deposit" : `game-${game}`}`}
    >
      {winners.length > 0 && (
        <div className="winner-strip">
          <div className="live-pill">
            <i />
            LIVE WINS
          </div>
          <div className="ticker-window">
            <div className="ticker-track">
              {[...winners, ...winners].map((w, i) => (
                <span key={i}>
                  🎉 <b>{w.name}</b> won <strong>{w.prize}</strong>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
      <section className="spin-shell os2-shell">
        {top.length > 0 && (
          <div className="monthly-podium">
            {top.map((w) => (
              <div className={`rank-card rank-${w.rank}`} key={w.rank}>
                <span>{w.rank === 1 ? "♛" : `#${w.rank}`}</span>
                <div>
                  <small>TOP {w.rank} THIS MONTH</small>
                  <strong>
                    {w.name} · {w.prize}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        )}
        <h1>Spin Win</h1>
        {!depositMode && nameReady && (
          <div className="game-tabs dynamic-game-tabs">
            {games.map((g) => (
              <button
                key={g.id}
                className={!depositMode && game === g.id ? "selected" : ""}
                onClick={() => selectGame(g.id)}
              >
                {g.name}
              </button>
            ))}
          </div>
        )}
        {!depositMode && nameReady && !profile && (
          <p className="choose-wheel-note">
            Choose a game to open your freeplay wheel
          </p>
        )}
        {depositMode ? (
          <>
            {!deposit && (
              <form
                className="code-entry"
                onSubmit={(e) => {
                  e.preventDefault();
                  openDeposit();
                }}
              >
                <label htmlFor="deposit-code">DEPOSIT SPIN CODE</label>
                <div>
                  <input
                    id="deposit-code"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Enter deposit code"
                  />
                  <button>OPEN</button>
                </div>
              </form>
            )}
            {error && <div className="notice danger">{error}</div>}
            {deposit && (
              <>
                <div className="player-line">
                  <span>
                    Deposit spin for <b>{deposit.customerId}</b>
                  </span>
                  <button
                    onClick={() => {
                      setDeposit(null);
                      setDepositMode(false);
                      setNameReady(false);
                      setProfile(null);
                      setName("");
                      setToken("");
                      setResult(null);
                      setError("");
                    }}
                  >
                    Change code
                  </button>
                </div>
                <Wheel
                  prizes={deposit.prizes || DEPOSIT_PRIZES}
                  game="deposit"
                  angle={angle}
                  spinning={spinning}
                  compact={compact}
                  tight={tight}
                  labelWidth={labelWidth}
                  segment={segment}
                />
                <button
                  className="spin-button"
                  onClick={spinDeposit}
                  disabled={spinning || deposit.status !== "pending"}
                >
                  {spinning
                    ? "SPINNING…"
                    : deposit.status === "pending"
                      ? "SPIN DEPOSIT"
                      : "SPIN USED"}
                </button>
                {result && <Result result={result} />}
              </>
            )}
          </>
        ) : (
          <>
            {!profile && !nameReady && (
              <>
                <form
                  className="code-entry"
                  onSubmit={(e) => {
                    e.preventDefault();
                    startUnified();
                  }}
                >
                  <label htmlFor="fb-name">FACEBOOK NAME OR DEPOSIT CODE</label>
                  <div>
                    <input
                      id="fb-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter Facebook name or deposit code"
                    />
                    <button>START</button>
                  </div>
                </form>
              </>
            )}
            {error && <div className="notice danger">{error}</div>}
            {profile && (
              <>
                <div className="player-line">
                  <span>
                    Playing as <b>{profile.facebookName}</b>
                  </span>
                  <button
                    onClick={() => {
                      setProfile(null);
                      setNameReady(false);
                      setResult(null);
                    }}
                  >
                    Change
                  </button>
                </div>
                <div className="spin-counter">
                  <span className={profile.used < 1 ? "active" : "used"}>
                    1
                  </span>
                  <span className={profile.used < 2 ? "active" : "used"}>
                    2
                  </span>
                  <b>
                    {profile.remaining} {meta.name} spin
                    {profile.remaining === 1 ? "" : "s"} left today
                  </b>
                </div>
                <Wheel
                  prizes={config}
                  game={game}
                  angle={angle}
                  spinning={spinning}
                  compact={compact}
                  tight={tight}
                  labelWidth={labelWidth}
                  segment={segment}
                />
                <button
                  className="spin-button"
                  onClick={spin}
                  disabled={spinning || !profile.remaining}
                >
                  {spinning
                    ? "SPINNING…"
                    : profile.remaining
                      ? "SPIN NOW"
                      : "COME BACK TOMORROW"}
                </button>
                {result && <Result result={result} />}
              </>
            )}
            {offer && (
              <article className="active-offer">
                <span>{offer.badge}</span>
                <h2>{offer.headline}</h2>
                <p>{offer.description}</p>
              </article>
            )}
          </>
        )}
      </section>
    </main>
  );
}
function Wheel({
  prizes,
  game,
  angle,
  spinning,
  compact,
  tight,
  labelWidth,
  segment,
}: {
  prizes: Prize[];
  game: string;
  angle: number;
  spinning: boolean;
  compact: boolean;
  tight: boolean;
  labelWidth: number;
  segment: number;
}) {
  return (
    <div className="wheel-wrap">
      <div className="pointer">▼</div>
      <div
        className={`wheel dynamic-wheel ${spinning ? "is-spinning" : ""}`}
        style={{
          transform: `rotate(${angle}deg)`,
          background: wheelGradient(prizes, game),
        }}
      >
        {prizes.map((p, i) => {
          const label = p.label?.trim() ||
            (game === "deposit" ? "" : "FREEPLAY");
          return (
            <div
              className={`wheel-label ${tight ? "label-tight" : compact ? "label-compact" : ""}`}
              style={{
                width: labelWidth,
                marginLeft: -labelWidth / 2,
                transform: `rotate(${i * segment}deg) translateY(-132px)`,
              }}
              key={`${p.amount}-${i}`}
            >
              <span>
                {compact && label.toUpperCase() === "FREEPLAY" ? "FP" : label}
                {p.amount > 0 && <em>${p.amount}</em>}
              </span>
            </div>
          );
        })}
        <div className="wheel-center">★</div>
      </div>
    </div>
  );
}
function Result({ result }: { result: { prize: string; code: string } }) {
  return (
    <div className="result-card">
      <span>You won</span>
      <strong>{result.prize}</strong>
      <small>CLAIM CODE</small>
      <code>{result.code}</code>
      <p>Send this code to the page admin to claim your reward.</p>
    </div>
  );
}
