"use client";
import { useEffect, useState } from "react";
import {
  DEPOSIT_PRIZES,
  FREEPLAY_INFO,
  LIVE_PRIZES as PRIZES,
  SHADE_MAP,
  STATUS_LABELS as LABELS,
  VIEW_INFO,
} from "./config";
import type {
  AdminView as View,
  DailyConfig,
  DailyPlayer,
  DailySpinRow as DailyRow,
  DepositSpinRow as Row,
  FreeplayTab,
  ManualWinner,
  OfferConfig,
  RealWinner,
} from "./types";
export default function AdminDashboard({ user }: { user: string }) {
  const [view, setView] = useState<View>("facebook"),
    [freeplayTab, setFreeplayTab] = useState<FreeplayTab>("overview"),
    [rows, setRows] = useState<Row[]>([]),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("all"),
    [customerId, setCustomerId] = useState(""),
    [hours, setHours] = useState(24),
    [weights, setWeights] = useState([95, 5, 0, 0, 0, 0]),
    [custom, setCustom] = useState(false),
    [message, setMessage] = useState(""),
    [liveId, setLiveId] = useState(""),
    [livePrize, setLivePrize] = useState("$10"),
    [liveRank, setLiveRank] = useState(0),
    [winnerType, setWinnerType] = useState<"deposit" | "freeplay">("deposit"),
    [liveFrequency, setLiveFrequency] = useState(3),
    [confirmed, setConfirmed] = useState(false),
    [manualWinners, setManualWinners] = useState<ManualWinner[]>([]),
    [realWinners, setRealWinners] = useState<RealWinner[]>([]),
    [dailyRows, setDailyRows] = useState<DailyRow[]>([]),
    [dailyPlayers, setDailyPlayers] = useState<DailyPlayer[]>([]),
    [dailyConfig, setDailyConfig] = useState<DailyConfig | null>(null),
    [offerConfig, setOfferConfig] = useState<OfferConfig | null>(null),
    [offerGame, setOfferGame] = useState<"os2" | "moolah">("os2"),
    [configGame, setConfigGame] = useState("os2"),
    [newWheelName, setNewWheelName] = useState(""),
    [depositWheels, setDepositWheels] = useState<DailyConfig | null>(null),
    [depositWheel, setDepositWheel] = useState("deposit"),
    [newDepositWheel, setNewDepositWheel] = useState(""),
    [dailyQuery, setDailyQuery] = useState(""),
    [newFacebookName, setNewFacebookName] = useState("");
  async function load() {
    const p = new URLSearchParams({ q: query, status }),
      r = await fetch(`/api/admin/spins?${p}`),
      d = await r.json();
    if (r.ok) {
      setRows(d.rows);
      if (d.defaults && !custom) setWeights(d.defaults);
      if (d.depositWheels) {
        setDepositWheels(d.depositWheels);
        if (!d.depositWheels[depositWheel])
          setDepositWheel(Object.keys(d.depositWheels)[0]);
      }
    }
  }
  async function loadDaily() {
    const r = await fetch(
        `/api/admin/daily-spins?q=${encodeURIComponent(dailyQuery)}`,
      ),
      d = await r.json();
    if (r.ok) {
      setDailyRows(d.rows || []);
      setDailyPlayers(d.players || []);
      const c = d.config as DailyConfig | null;
      if (c) {
        const normalized = Object.fromEntries(
          Object.entries(c).map(([game, prizes]) => {
            const palette =
              game === "moolah" ? SHADE_MAP.moolah : SHADE_MAP.os2;
            return [
              game,
              prizes.map((p, i) => ({
                ...p,
                label: p.label || "FREEPLAY",
                color: p.color || palette[i % palette.length],
              })),
            ];
          }),
        );
        setDailyConfig(normalized);
        if (!normalized[configGame]) setConfigGame(Object.keys(normalized)[0]);
      } else setDailyConfig(null);
    }
  }
  async function loadManual() {
    const r = await fetch("/api/admin/winners"),
      d = await r.json();
    if (r.ok) {
      setManualWinners(d.manualRows || []);
      setRealWinners(d.realRows || []);
    }
  }
  async function loadOffers() {
    const r = await fetch("/api/admin/offers"),
      d = await r.json();
    if (r.ok) setOfferConfig(d);
  }
  useEffect(() => {
    load();
  }, [query, status]);
  useEffect(() => {
    loadManual();
    loadOffers();
  }, []);
  useEffect(() => {
    loadDaily();
  }, [dailyQuery]);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 3500);
    return () => clearTimeout(timer);
  }, [message]);
  async function create() {
    setMessage("");
    const r = await fetch("/api/admin/spins", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "create",
          customerId,
          hours,
          weights: custom ? weights : undefined,
          wheelId: depositWheel,
        }),
      }),
      d = await r.json();
    if (!r.ok) return setMessage(d.error);
    setCustomerId("");
    setMessage(`Đã tạo và sao chép mã: ${d.row.token}`);
    await navigator.clipboard.writeText(d.row.token);
    load();
  }
  async function act(id: number, action: string) {
    const r = await fetch("/api/admin/spins", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, action }),
      }),
      d = await r.json();
    if (!r.ok) setMessage(d.error);
    else load();
  }
  async function saveDefaults() {
    const r = await fetch("/api/admin/spins", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "save-defaults", weights }),
      }),
      d = await r.json();
    setMessage(r.ok ? "Đã lưu tỷ lệ mặc định" : d.error);
  }
  function updateDepositPrize(
    index: number,
    key: "label" | "amount" | "weight" | "color",
    value: string | number,
  ) {
    if (!depositWheels) return;
    const list = depositWheels[depositWheel].map((p, i) =>
      i === index ? { ...p, [key]: value } : p,
    );
    if (key === "color" && list.length >= 4 && index < 2)
      for (let i = 2; i < list.length; i++)
        list[i] = { ...list[i], color: list[i % 2].color };
    setDepositWheels({
      ...depositWheels,
      [depositWheel]: list,
    });
  }
  function addDepositPrize() {
    if (!depositWheels || depositWheels[depositWheel].length >= 10) return;
    const current = depositWheels[depositWheel],
      nextLength = current.length + 1,
      palette = ["#ef4a90", "#7141d8", "#ffb834"];
    const color =
      nextLength === 3
        ? palette[2]
        : current[current.length % 2]?.color || palette[current.length % 2];
    setDepositWheels({
      ...depositWheels,
      [depositWheel]: [
        ...depositWheels[depositWheel],
        { label: "", amount: 10, weight: 0, color },
      ],
    });
  }
  function removeDepositPrize(index: number) {
    if (!depositWheels || depositWheels[depositWheel].length <= 2) return;
    let list = depositWheels[depositWheel].filter((_, i) => i !== index);
    if (list.length === 3)
      list = list.map((p, i) => ({
        ...p,
        color: ["#ef4a90", "#7141d8", "#ffb834"][i],
      }));
    else if (list.length >= 4)
      list = list.map((p, i) => ({ ...p, color: list[i % 2].color }));
    setDepositWheels({
      ...depositWheels,
      [depositWheel]: list,
    });
  }
  function addDepositWheel() {
    if (!depositWheels) return;
    const id = newDepositWheel
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24);
    if (!id) return;
    if (depositWheels[id]) return setMessage("Vòng Deposit này đã tồn tại");
    setDepositWheels({
      ...depositWheels,
      [id]: [
        { label: "FREEPLAY", amount: 10, weight: 95, color: "#ef4a90" },
        { label: "", amount: 10, weight: 5, color: "#7141d8" },
      ],
    });
    setDepositWheel(id);
    setNewDepositWheel("");
  }
  function deleteDepositWheel() {
    if (!depositWheels || Object.keys(depositWheels).length <= 1) return;
    if (!confirm(`Xóa vòng Deposit ${depositWheel.toUpperCase()}?`)) return;
    const next = { ...depositWheels };
    delete next[depositWheel];
    setDepositWheels(next);
    setDepositWheel(Object.keys(next)[0]);
  }
  async function saveDepositWheels() {
    if (!depositWheels) return;
    const normalized = Object.fromEntries(
      Object.entries(depositWheels).map(([id, list]) => [
        id,
        list.length >= 4
          ? list.map((p, i) => ({ ...p, color: list[i % 2].color }))
          : list,
      ]),
    );
    const r = await fetch("/api/admin/spins", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "save-deposit-wheels",
          depositWheels: normalized,
        }),
      }),
      d = await r.json();
    setMessage(r.ok ? "Đã lưu các vòng quay Deposit" : d.error);
    if (r.ok) load();
  }
  async function addLiveWinner() {
    const r = await fetch("/api/admin/winners", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customerId: liveId,
          prize: livePrize,
          confirmed,
          featuredRank: liveRank || null,
          winnerType,
          frequency: liveFrequency,
        }),
      }),
      d = await r.json();
    if (!r.ok) return setMessage(d.error);
    setLiveId("");
    setConfirmed(false);
    setMessage(
      liveRank
        ? `Đã thêm vào LIVE và TOP ${liveRank}`
        : "Đã thêm người trúng vào LIVE WINS",
    );
    loadManual();
  }
  async function removeLiveWinner(id: number) {
    await fetch(`/api/admin/winners?id=${id}`, { method: "DELETE" });
    setMessage("Đã xóa thông báo khỏi LIVE");
    loadManual();
  }
  async function updateTop(id: number, featuredRank: number | null) {
    const r = await fetch("/api/admin/winners", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, featuredRank }),
      }),
      d = await r.json();
    setMessage(
      r.ok
        ? featuredRank
          ? `Đã chuyển sang TOP ${featuredRank}`
          : "Đã xóa khỏi TOP"
        : d.error,
    );
    if (r.ok) loadManual();
  }
  async function hideRealWinner(sourceKey: string) {
    if (
      !confirm("Xóa kết quả này khỏi dòng LIVE? Lịch sử quay vẫn được giữ lại.")
    )
      return;
    await fetch(
      `/api/admin/winners?sourceKey=${encodeURIComponent(sourceKey)}`,
      { method: "DELETE" },
    );
    setMessage("Đã xóa kết quả khỏi LIVE; lịch sử quay vẫn được giữ lại");
    loadManual();
  }
  async function resetAllDaily() {
    if (!confirm("Reset lượt hôm nay của TẤT CẢ khách Freeplay?")) return;
    const r = await fetch("/api/admin/daily-spins", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "reset-all" }),
      }),
      d = await r.json();
    setMessage(r.ok ? "Đã reset toàn bộ lượt Freeplay hôm nay" : d.error);
    loadDaily();
  }
  async function deleteDailyPlayer(playerId: number, name: string) {
    if (!confirm(`Xóa ${name} và toàn bộ lịch sử quay?`)) return;
    const r = await fetch("/api/admin/daily-spins", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ playerId }),
      }),
      d = await r.json();
    setMessage(r.ok ? `Đã xóa khách ${name}` : d.error);
    loadDaily();
  }
  async function deleteAllDailyPlayers() {
    if (
      !confirm(
        "XÓA TẤT CẢ khách Freeplay và toàn bộ lịch sử quay? Thao tác này không thể hoàn tác.",
      )
    )
      return;
    const r = await fetch("/api/admin/daily-spins", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "delete-all" }),
      }),
      d = await r.json();
    setMessage(r.ok ? "Đã xóa tất cả khách Freeplay" : d.error);
    loadDaily();
  }
  async function addDailyPlayer() {
    const r = await fetch("/api/admin/daily-spins", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ facebookName: newFacebookName }),
      }),
      d = await r.json();
    if (r.ok) {
      setMessage(`Đã thêm ${newFacebookName}`);
      setNewFacebookName("");
      loadDaily();
    } else setMessage(d.error);
  }
  function updatePrize(index: number, key: "amount" | "weight", value: number) {
    if (!dailyConfig) return;
    setDailyConfig({
      ...dailyConfig,
      [configGame]: dailyConfig[configGame].map((p, i) =>
        i === index ? { ...p, [key]: value } : p,
      ),
    });
  }
  function updatePrizeLabel(index: number, label: string) {
    if (!dailyConfig) return;
    setDailyConfig({
      ...dailyConfig,
      [configGame]: dailyConfig[configGame].map((p, i) =>
        i === index ? { ...p, label: label.slice(0, 18) } : p,
      ),
    });
  }
  function updatePrizeColor(index: number, color: string) {
    if (!dailyConfig) return;
    const list = dailyConfig[configGame].map((p, i) =>
      i === index ? { ...p, color } : p,
    );
    if (list.length >= 4 && index < 2) {
      for (let i = 2; i < list.length; i++)
        list[i] = { ...list[i], color: list[i % 2].color };
    }
    setDailyConfig({ ...dailyConfig, [configGame]: list });
  }
  function addPrize() {
    if (!dailyConfig || dailyConfig[configGame].length >= 10) return;
    const list = dailyConfig[configGame],
      palette = configGame === "moolah" ? SHADE_MAP.moolah : SHADE_MAP.os2,
      amount = Math.max(...list.map((p) => p.amount)) + 5,
      color = palette[list.length % palette.length];
    setDailyConfig({
      ...dailyConfig,
      [configGame]: [...list, { label: "FREEPLAY", amount, weight: 0, color }],
    });
  }
  function removePrize(index: number) {
    if (!dailyConfig || dailyConfig[configGame].length <= 2) return;
    const palette = configGame === "moolah" ? SHADE_MAP.moolah : SHADE_MAP.os2,
      list = dailyConfig[configGame]
        .filter((_, i) => i !== index)
        .map((p, i) => ({ ...p, color: palette[i % palette.length] }));
    setDailyConfig({ ...dailyConfig, [configGame]: list });
  }
  function addWheel() {
    if (!dailyConfig) return;
    const id = newWheelName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24);
    if (!id) return setMessage("Vui lòng nhập tên vòng quay");
    if (id === "deposit")
      return setMessage("Tên DEPOSIT được dành riêng cho vòng quay khách nạp");
    if (dailyConfig[id]) return setMessage("Tên vòng quay này đã tồn tại");
    setDailyConfig({
      ...dailyConfig,
      [id]: [
        { label: "FREEPLAY", amount: 5, weight: 60, color: "#ef4a90" },
        { label: "FREEPLAY", amount: 10, weight: 30, color: "#7141d8" },
        { label: "FREEPLAY", amount: 20, weight: 10, color: "#ffb834" },
      ],
    });
    setConfigGame(id);
    setNewWheelName("");
    setMessage(
      `Đã tạo vòng ${id.toUpperCase()}. Nhấn Lưu vòng quay để đưa ra trang khách.`,
    );
  }
  function deleteWheel() {
    if (!dailyConfig || Object.keys(dailyConfig).length <= 1) return;
    if (!confirm(`Xóa vòng quay ${configGame.toUpperCase()}?`)) return;
    const next = { ...dailyConfig };
    delete next[configGame];
    const first = Object.keys(next)[0];
    setDailyConfig(next);
    setConfigGame(first);
  }
  async function saveDailyConfig() {
    if (!dailyConfig) return;
    const list = dailyConfig[configGame],
      gameTotal = list.reduce((sum, p) => sum + Number(p.weight), 0),
      unique = new Set(list.map((p) => p.color.toLowerCase()));
    if (Math.abs(gameTotal - 100) >= 0.001)
      return setMessage(
        `Tổng tỷ lệ ${configGame.toUpperCase()} hiện là ${gameTotal}%. Cần đúng 100% mới được lưu.`,
      );
    if (list.length === 3 && unique.size !== 3)
      return setMessage("Vòng quay 3 ô bắt buộc chọn 3 màu khác nhau");
    if (
      list.length >= 4 &&
      list[0].color.toLowerCase() === list[1].color.toLowerCase()
    )
      return setMessage("Vòng quay từ 4 ô cần chọn 2 màu khác nhau");
    const normalized: DailyConfig = {
      ...dailyConfig,
      [configGame]:
        list.length >= 4
          ? list.map((p, i) => ({ ...p, color: list[i % 2].color }))
          : list,
    };
    const r = await fetch("/api/admin/daily-spins", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "save-config", config: normalized }),
      }),
      d = await r.json();
    setMessage(
      r.ok ? "Đã lưu phần thưởng, tỷ lệ và màu vòng quay Freeplay" : d.error,
    );
    if (r.ok) loadDaily();
  }
  function updateOffer(
    key: "badge" | "headline" | "description",
    value: string,
  ) {
    if (!offerConfig) return;
    setOfferConfig({
      ...offerConfig,
      [offerGame]: { ...offerConfig[offerGame], [key]: value },
    });
  }
  async function saveOffers() {
    if (!offerConfig) return;
    const r = await fetch("/api/admin/offers", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(offerConfig),
      }),
      d = await r.json();
    setMessage(r.ok ? "Đã cập nhật quảng cáo Offer trên trang khách" : d.error);
    if (r.ok) loadOffers();
  }
  async function deleteFreeplayHistory(spinId?: number) {
    if (
      !confirm(
        spinId
          ? "Xóa hàng lịch sử Freeplay này?"
          : "XÓA TẤT CẢ lịch sử Freeplay?",
      )
    )
      return;
    const r = await fetch("/api/admin/daily-spins", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: spinId ? "delete-history-one" : "delete-history-all",
          spinId,
        }),
      }),
      d = await r.json();
    setMessage(
      r.ok
        ? spinId
          ? "Đã xóa hàng lịch sử Freeplay"
          : "Đã xóa tất cả lịch sử Freeplay"
        : d.error,
    );
    if (r.ok) loadDaily();
  }
  async function deleteDepositHistory(id?: number) {
    if (
      !confirm(
        id ? "Xóa hàng lịch sử Deposit này?" : "XÓA TẤT CẢ lịch sử Deposit?",
      )
    )
      return;
    const r = await fetch("/api/admin/spins", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(id ? { id } : { action: "delete-all" }),
      }),
      d = await r.json();
    setMessage(
      r.ok
        ? id
          ? "Đã xóa hàng lịch sử Deposit"
          : "Đã xóa tất cả lịch sử Deposit"
        : d.error,
    );
    if (r.ok) load();
  }
  const total = weights.reduce((a, b) => a + Number(b), 0),
    customers = dailyPlayers.length,
    os2 = dailyRows.filter((r) => r.game === "os2").length,
    moolah = dailyRows.filter((r) => r.game === "moolah").length;
  return (
    <main
      className="admin-dashboard"
      onFocusCapture={(event) => {
        const input = event.target;
        if (
          input instanceof HTMLInputElement &&
          input.type === "number" &&
          Number(input.value) === 0
        )
          input.value = "";
      }}
      onBlurCapture={(event) => {
        const input = event.target;
        if (
          input instanceof HTMLInputElement &&
          input.type === "number" &&
          input.value === ""
        )
          input.value = "0";
      }}
    >
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <span>★</span>
          <div>
            <b>Spin Admin</b>
            <small>Reward Control</small>
          </div>
        </div>
        <p className="menu-label menu-major">SPIN KHÁCH FREEPLAY</p>
        <button
          className={
            view === "facebook" && freeplayTab === "overview" ? "active" : ""
          }
          onClick={() => {
            setView("facebook");
            setFreeplayTab("overview");
          }}
        >
          <i>◉</i>
          <span>Tổng Freeplay</span>
        </button>
        <button
          className={
            view === "facebook" && freeplayTab === "rewards" ? "active" : ""
          }
          onClick={() => {
            setView("facebook");
            setFreeplayTab("rewards");
          }}
        >
          <i>◆</i>
          <span>Phần thưởng & tỷ lệ</span>
        </button>
        <button
          className={
            view === "facebook" && freeplayTab === "customers" ? "active" : ""
          }
          onClick={() => {
            setView("facebook");
            setFreeplayTab("customers");
          }}
        >
          <i>♙</i>
          <span>Danh sách khách</span>
        </button>
        <button
          className={
            view === "facebook" && freeplayTab === "history" ? "active" : ""
          }
          onClick={() => {
            setView("facebook");
            setFreeplayTab("history");
          }}
        >
          <i>☷</i>
          <span>Lịch sử Freeplay</span>
        </button>
        <p className="menu-label menu-major">SPIN KHÁCH NẠP</p>
        <button
          className={view === "create" ? "active" : ""}
          onClick={() => setView("create")}
        >
          <i>＋</i>
          <span>Tạo vòng quay</span>
        </button>
        <button
          className={view === "deposit_rewards" ? "active" : ""}
          onClick={() => setView("deposit_rewards")}
        >
          <i>◆</i>
          <span>Phần thưởng & tỷ lệ</span>
        </button>
        <button
          className={view === "history" ? "active" : ""}
          onClick={() => setView("history")}
        >
          <i>☷</i>
          <span>Lịch sử spin</span>
        </button>
        <p className="menu-label menu-major">LIVE DÙNG CHUNG</p>
        <button
          className={view === "live" ? "active" : ""}
          onClick={() => setView("live")}
        >
          <i>◈</i>
          <span>LIVE WINS & TOP</span>
        </button>
        <p className="menu-label menu-major">QUẢNG CÁO</p>
        <button
          className={view === "offers" ? "active" : ""}
          onClick={() => setView("offers")}
        >
          <i>▣</i>
          <span>Quảng cáo Offer</span>
        </button>
        <a href="/" target="_blank">
          <i>↗</i>
          <span>Mở trang khách</span>
        </a>
      </aside>
      <div className="admin-workspace">
        <header className="dashboard-header">
          <div>
            <p>
              {
                (view === "facebook"
                  ? FREEPLAY_INFO[freeplayTab]
                  : VIEW_INFO[view])[1]
              }
            </p>
            <h1>
              {
                (view === "facebook"
                  ? FREEPLAY_INFO[freeplayTab]
                  : VIEW_INFO[view])[0]
              }
            </h1>
          </div>
          <div className="user-badge">
            <span>Admin</span>
            <strong>{user}</strong>
          </div>
        </header>
        {message && (
          <div className="admin-message">
            <span>{message}</span>
            <button onClick={() => setMessage("")}>×</button>
          </div>
        )}
        {view === "facebook" && (
          <>
            <div
              className={
                "dashboard-stats " +
                (freeplayTab === "overview" ? "" : "section-hidden")
              }
            >
              <article>
                <span>Khách hàng</span>
                <strong>{customers}</strong>
                <small>Tên Facebook đã lưu</small>
              </article>
              <article>
                <span>Tổng lượt hiển thị</span>
                <strong>{dailyRows.length}</strong>
                <small>Tối đa 300 bản ghi</small>
              </article>
              <article>
                <span>OS2</span>
                <strong>{os2}</strong>
                <small>Lượt đã quay</small>
              </article>
              <article>
                <span>Moolah</span>
                <strong>{moolah}</strong>
                <small>Lượt đã quay</small>
              </article>
            </div>
            {dailyConfig && (
              <section
                className={
                  "records prize-config " +
                  (freeplayTab === "rewards" ? "" : "section-hidden")
                }
              >
                <div className="records-head">
                  <div>
                    <h2>Phần thưởng & tỷ lệ</h2>
                    <p>
                      Thêm hoặc xóa ô; tổng tỷ lệ của mỗi vòng quay bắt buộc
                      đúng 100%.
                    </p>
                  </div>
                  <div className="config-tabs">
                    {Object.keys(dailyConfig).map((game) => (
                      <button
                        key={game}
                        className={configGame === game ? "active" : ""}
                        onClick={() => setConfigGame(game)}
                      >
                        {game.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="add-player wheel-creator">
                  <input
                    value={newWheelName}
                    onChange={(e) => setNewWheelName(e.target.value)}
                    placeholder="Tên vòng quay mới, ví dụ JUWA"
                  />
                  <button onClick={addWheel} disabled={!newWheelName.trim()}>
                    ＋ Tạo vòng mới
                  </button>
                  {Object.keys(dailyConfig).length > 1 && (
                    <button className="delete-all" onClick={deleteWheel}>
                      Xóa vòng {configGame.toUpperCase()}
                    </button>
                  )}
                </div>
                <div className="prize-config-list">
                  {dailyConfig[configGame].map((p, i) => (
                    <div className="prize-config-row" key={i}>
                      {dailyConfig[configGame].length === 3 || i < 2 ? (
                        <label className="color-picker">
                          Màu
                          <input
                            type="color"
                            value={p.color}
                            onChange={(e) =>
                              updatePrizeColor(i, e.target.value)
                            }
                          />
                        </label>
                      ) : (
                        <span className="color-placeholder" />
                      )}
                      <label>
                        Tên hiển thị
                        <input
                          value={p.label || "FREEPLAY"}
                          maxLength={18}
                          onChange={(e) => updatePrizeLabel(i, e.target.value)}
                          placeholder="FREEPLAY"
                        />
                      </label>
                      <label>
                        Số tiền
                        <input
                          type="number"
                          min="1"
                          value={p.amount}
                          onChange={(e) =>
                            updatePrize(i, "amount", Number(e.target.value))
                          }
                        />
                      </label>
                      <label>
                        Tỷ lệ %
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={p.weight}
                          onChange={(e) =>
                            updatePrize(i, "weight", Number(e.target.value))
                          }
                        />
                      </label>
                      <b>
                        {p.label || "FREEPLAY"} ${p.amount}
                      </b>
                      <button
                        className="remove-prize"
                        onClick={() => removePrize(i)}
                        disabled={dailyConfig[configGame].length <= 2}
                      >
                        Xóa
                      </button>
                    </div>
                  ))}
                </div>
                <div className="config-actions">
                  <button
                    onClick={addPrize}
                    disabled={dailyConfig[configGame].length >= 10}
                  >
                    ＋ Thêm ô thưởng
                  </button>
                  <div
                    className={
                      Math.abs(
                        dailyConfig[configGame].reduce(
                          (sum, p) => sum + Number(p.weight),
                          0,
                        ) - 100,
                      ) < 0.001
                        ? "total ok"
                        : "total bad"
                    }
                  >
                    Tổng tỷ lệ:{" "}
                    {dailyConfig[configGame].reduce(
                      (sum, p) => sum + Number(p.weight),
                      0,
                    )}
                    %
                  </div>
                  <button
                    className="save-config"
                    onClick={saveDailyConfig}
                    disabled={
                      Math.abs(
                        dailyConfig[configGame].reduce(
                          (sum, p) => sum + Number(p.weight),
                          0,
                        ) - 100,
                      ) >= 0.001
                    }
                  >
                    Lưu vòng quay
                  </button>
                </div>
              </section>
            )}
            <section
              className={
                "records player-manager " +
                (freeplayTab === "customers" ? "" : "section-hidden")
              }
            >
              <div className="records-head">
                <div>
                  <h2>Danh sách khách Freeplay</h2>
                  <p>
                    Reset tổng một lần; xóa toàn bộ hoặc xóa riêng từng khách.
                  </p>
                </div>
                <div className="player-actions">
                  <div className="add-player">
                    <input
                      value={newFacebookName}
                      onChange={(e) => setNewFacebookName(e.target.value)}
                      placeholder="Nhập tên Facebook…"
                    />
                    <button
                      onClick={addDailyPlayer}
                      disabled={!newFacebookName.trim()}
                    >
                      ＋ Thêm khách
                    </button>
                  </div>
                  <button className="reset-all" onClick={resetAllDaily}>
                    ↻ Reset tất cả hôm nay
                  </button>
                  <button
                    className="delete-all"
                    onClick={deleteAllDailyPlayers}
                  >
                    ✕ Xóa tất cả khách
                  </button>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Tên Facebook</th>
                      <th>OS2 hôm nay</th>
                      <th>Moolah hôm nay</th>
                      <th>Lần hoạt động gần nhất</th>
                      <th>Quản lý</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyPlayers.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <strong>{p.facebook_name}</strong>
                        </td>
                        <td>{p.os2_used}/2 lượt</td>
                        <td>{p.moolah_used}/2 lượt</td>
                        <td>
                          {new Date(p.last_seen_at).toLocaleString("vi-VN")}
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              className="danger-link"
                              onClick={() =>
                                deleteDailyPlayer(p.id, p.facebook_name)
                              }
                            >
                              Xóa khách
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!dailyPlayers.length && (
                  <div className="empty">Chưa có khách Freeplay.</div>
                )}
              </div>
            </section>
            <section
              className={
                "records daily-records " +
                (freeplayTab === "history" ? "" : "section-hidden")
              }
            >
              <div className="records-head">
                <div>
                  <h2>Lịch sử lượt quay Freeplay</h2>
                  <p>Tự cấp lại 2 lượt cho từng game khi sang ngày mới.</p>
                </div>
                <div className="filters">
                  <input
                    value={dailyQuery}
                    onChange={(e) => setDailyQuery(e.target.value)}
                    placeholder="Tìm tên Facebook hoặc mã…"
                  />
                  <button
                    className="delete-all"
                    onClick={() => deleteFreeplayHistory()}
                  >
                    Xóa tất cả lịch sử
                  </button>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Tên Facebook</th>
                      <th>Game</th>
                      <th>Lượt</th>
                      <th>Kết quả</th>
                      <th>Mã nhận thưởng</th>
                      <th>Ngày quay</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyRows.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <strong>{r.facebook_name}</strong>
                        </td>
                        <td>
                          <b>{r.game.toUpperCase()}</b>
                        </td>
                        <td>#{r.spin_number}/2</td>
                        <td>
                          <b className="prize">{r.result}</b>
                        </td>
                        <td>
                          <code>{r.confirmation_code}</code>
                        </td>
                        <td>
                          {new Date(r.created_at).toLocaleString("vi-VN")}
                        </td>
                        <td>
                          <button
                            className="danger-link"
                            onClick={() => deleteFreeplayHistory(r.id)}
                          >
                            Xóa
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!dailyRows.length && (
                  <div className="empty">Chưa có lượt quay hằng ngày.</div>
                )}
              </div>
            </section>
          </>
        )}
        {view === "offers" && offerConfig && (
          <section className="records offer-editor">
            <div className="records-head">
              <div>
                <h2>Quảng cáo Offer trang khách</h2>
                <p>Chỉnh riêng nội dung hiển thị cho OS2 và Moolah.</p>
              </div>
              <div className="config-tabs">
                <button
                  className={offerGame === "os2" ? "active" : ""}
                  onClick={() => setOfferGame("os2")}
                >
                  OS2
                </button>
                <button
                  className={offerGame === "moolah" ? "active" : ""}
                  onClick={() => setOfferGame("moolah")}
                >
                  Moolah
                </button>
              </div>
            </div>
            <div className="offer-form">
              <label>
                Nhãn quảng cáo
                <input
                  value={offerConfig[offerGame].badge}
                  maxLength={80}
                  onChange={(e) => updateOffer("badge", e.target.value)}
                />
              </label>
              <label>
                Tiêu đề lớn
                <input
                  value={offerConfig[offerGame].headline}
                  maxLength={80}
                  onChange={(e) => updateOffer("headline", e.target.value)}
                />
              </label>
              <label>
                Nội dung điều kiện
                <textarea
                  value={offerConfig[offerGame].description}
                  maxLength={240}
                  rows={4}
                  onChange={(e) => updateOffer("description", e.target.value)}
                />
              </label>
              <div className="offer-preview">
                <small>XEM TRƯỚC</small>
                <span>{offerConfig[offerGame].badge}</span>
                <h2>{offerConfig[offerGame].headline}</h2>
                <p>{offerConfig[offerGame].description}</p>
              </div>
            </div>
            <div className="config-actions">
              <button className="save-config" onClick={saveOffers}>
                Lưu quảng cáo Offer
              </button>
            </div>
          </section>
        )}
        {view === "create" && (
          <section className="create-panel">
            <div>
              <h2>Tạo mã quay một lần</h2>
              <p>Mã tự khóa ngay khi khách quay ra kết quả.</p>
            </div>
            <div className="create-grid">
              <label>
                ID khách hàng
                <input
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  placeholder="Ví dụ: bobbie400s"
                />
              </label>
              <label>
                Hiệu lực
                <select
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                >
                  <option value={1}>1 giờ</option>
                  <option value={6}>6 giờ</option>
                  <option value={24}>24 giờ</option>
                  <option value={72}>3 ngày</option>
                  <option value={168}>7 ngày</option>
                </select>
              </label>
              {depositWheels && (
                <label>
                  Vòng Deposit
                  <select
                    value={depositWheel}
                    onChange={(e) => {
                      setDepositWheel(e.target.value);
                      setWeights(
                        depositWheels[e.target.value].map((p) => p.weight),
                      );
                    }}
                  >
                    {Object.keys(depositWheels).map((id) => (
                      <option key={id} value={id}>
                        {id.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={custom}
                  onChange={(e) => setCustom(e.target.checked)}
                />
                <span>Tỷ lệ riêng cho ID này</span>
              </label>
            </div>
            {custom && (
              <div className="weights">
                {(depositWheels?.[depositWheel] || []).map((p, i) => (
                  <label key={i}>
                    <span>
                      {[p.label, p.amount > 0 ? `$${p.amount}` : ""]
                        .filter(Boolean)
                        .join(" ") || `Ô ${i + 1}`}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={weights[i]}
                      onChange={(e) =>
                        setWeights(
                          weights.map((v, x) =>
                            x === i ? Number(e.target.value) : v,
                          ),
                        )
                      }
                    />
                    <small>%</small>
                  </label>
                ))}
                <div
                  className={
                    Math.abs(total - 100) < 0.001 ? "total ok" : "total bad"
                  }
                >
                  Tổng {total}%
                </div>
              </div>
            )}
            <div className="create-actions">
              <button
                onClick={create}
                disabled={!customerId.trim() || Math.abs(total - 100) >= 0.001}
              >
                Tạo & sao chép mã
              </button>
              {custom && (
                <button
                  className="secondary"
                  onClick={saveDefaults}
                  disabled={Math.abs(total - 100) >= 0.001}
                >
                  Lưu làm mặc định
                </button>
              )}
            </div>
          </section>
        )}
        {view === "deposit_rewards" && depositWheels && (
          <section className="records prize-config deposit-prize-config">
            <div className="records-head">
              <div>
                <h2>Các vòng quay Deposit</h2>
                <p>
                  Tạo hoặc xóa vòng; tên loại để trống sẽ không hiện chữ trên
                  vòng quay.
                </p>
              </div>
            </div>
            <div className="config-tabs">
              {Object.keys(depositWheels).map((id) => (
                <button
                  key={id}
                  className={depositWheel === id ? "active" : ""}
                  onClick={() => {
                    setDepositWheel(id);
                    setWeights(depositWheels[id].map((p) => p.weight));
                  }}
                >
                  {id.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="add-player wheel-creator">
              <input
                value={newDepositWheel}
                onChange={(e) => setNewDepositWheel(e.target.value)}
                placeholder="Tên vòng Deposit mới"
              />
              <button onClick={addDepositWheel}>＋ Tạo vòng mới</button>
              {Object.keys(depositWheels).length > 1 && (
                <button className="delete-all" onClick={deleteDepositWheel}>
                  Xóa vòng
                </button>
              )}
            </div>
            <div className="prize-config-list">
              {depositWheels[depositWheel].map((p, i) => (
                <div className="prize-config-row deposit-prize-row" key={i}>
                  <span className="deposit-prize-index">{i + 1}</span>
                  {depositWheels[depositWheel].length === 3 || i < 2 ? (
                    <label className="color-picker">
                      Màu{" "}
                      <span
                        className="selected-color-swatch"
                        style={{ background: p.color }}
                      />
                      <input
                        type="color"
                        value={p.color}
                        onChange={(e) =>
                          updateDepositPrize(i, "color", e.target.value)
                        }
                      />
                    </label>
                  ) : (
                    <span className="color-placeholder" />
                  )}
                  <label>
                    Tên loại
                    <input
                      value={p.label}
                      placeholder="Để trống nếu không hiện tên"
                      onChange={(e) =>
                        updateDepositPrize(i, "label", e.target.value)
                      }
                    />
                  </label>
                  <label>
                    Số tiền
                    <input
                      type="number"
                      min="0"
                      value={p.amount}
                      onChange={(e) =>
                        updateDepositPrize(i, "amount", Number(e.target.value))
                      }
                    />
                  </label>
                  <label>
                    Tỷ lệ %
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={p.weight}
                      onChange={(e) =>
                        updateDepositPrize(i, "weight", Number(e.target.value))
                      }
                    />
                  </label>
                  <b>
                    {[p.label, p.amount > 0 ? `$${p.amount}` : ""]
                      .filter(Boolean)
                      .join(" ") || "Không hiện tên"}
                  </b>
                  <button
                    className="remove-prize"
                    onClick={() => removeDepositPrize(i)}
                    disabled={depositWheels[depositWheel].length <= 2}
                  >
                    Xóa ô
                  </button>
                </div>
              ))}
            </div>
            <div className="config-actions deposit-config-actions">
              <div
                className={
                  Math.abs(
                    depositWheels[depositWheel].reduce(
                      (s, p) => s + p.weight,
                      0,
                    ) - 100,
                  ) < 0.001
                    ? "total ok"
                    : "total bad"
                }
              >
                Tổng tỷ lệ:{" "}
                {depositWheels[depositWheel].reduce((s, p) => s + p.weight, 0)}%
              </div>
              <button
                onClick={addDepositPrize}
                disabled={depositWheels[depositWheel].length >= 10}
              >
                ＋ Thêm ô thưởng
              </button>
              <button
                className="save-config"
                onClick={saveDepositWheels}
                disabled={
                  Math.abs(
                    depositWheels[depositWheel].reduce(
                      (s, p) => s + p.weight,
                      0,
                    ) - 100,
                  ) >= 0.001
                }
              >
                Lưu các vòng Deposit
              </button>
            </div>
          </section>
        )}
        {view === "live" && (
          <section className="live-admin">
            <div>
              <h2>Điều chỉnh LIVE WINS & TOP</h2>
              <p>
                Dòng LIVE ngoài trang khách trộn kết quả quay thật và thông báo
                Admin thêm. Hai nguồn được tách riêng bên dưới.
              </p>
            </div>
            <div className="live-form">
              <input
                value={liveId}
                onChange={(e) => setLiveId(e.target.value)}
                placeholder="ID người trúng"
              />
              <select
                value={winnerType}
                onChange={(e) => {
                  const type = e.target.value as "deposit" | "freeplay";
                  setWinnerType(type);
                  setLiveFrequency(type === "deposit" ? 3 : 1);
                  setLivePrize(type === "deposit" ? "$10" : "FREEPLAY $5");
                }}
              >
                <option value="deposit">Khách nạp trúng</option>
                <option value="freeplay">Khách Freeplay trúng</option>
              </select>
              <select
                value={livePrize}
                onChange={(e) => setLivePrize(e.target.value)}
              >
                {PRIZES.filter((p) =>
                  winnerType === "freeplay"
                    ? p.startsWith("FREEPLAY")
                    : !p.startsWith("FREEPLAY"),
                ).map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
              <label>
                Tần suất{" "}
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={liveFrequency}
                  onChange={(e) =>
                    setLiveFrequency(
                      Math.max(1, Math.min(10, Number(e.target.value))),
                    )
                  }
                />
              </label>
              <select
                value={liveRank}
                onChange={(e) => setLiveRank(Number(e.target.value))}
              >
                <option value={0}>Chỉ chạy LIVE</option>
                <option value={1}>TOP 1 tháng</option>
                <option value={2}>TOP 2 tháng</option>
                <option value={3}>TOP 3 tháng</option>
              </select>
              <label>
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />{" "}
                Đã xác nhận
              </label>
              <button
                onClick={addLiveWinner}
                disabled={!liveId.trim() || !confirmed}
              >
                Thêm vào LIVE
              </button>
            </div>
            <section className="live-source top-manager">
              <div className="live-visible-head">
                <h3>Quản lý TOP 1–3</h3>
                <span>
                  {manualWinners.filter((w) => w.featuredRank).length} vị trí
                  đang hiển thị
                </span>
              </div>
              <p className="source-note">
                Đổi hạng hoặc xóa riêng khỏi TOP; người đó vẫn tiếp tục chạy
                trên LIVE.
              </p>
              {manualWinners.filter((w) => w.featuredRank).length ? (
                <div className="manual-list">
                  {manualWinners
                    .filter((w) => w.featuredRank)
                    .sort(
                      (a, b) => (a.featuredRank || 0) - (b.featuredRank || 0),
                    )
                    .map((w) => (
                      <div key={`top-${w.id}`}>
                        <span>
                          <i className="winner-kind deposit">
                            TOP {w.featuredRank}
                          </i>
                          <strong>{w.customerId}</strong> · {w.prize}
                        </span>
                        <span className="real-live-actions">
                          <select
                            value={w.featuredRank || 0}
                            onChange={(e) =>
                              updateTop(w.id, Number(e.target.value))
                            }
                          >
                            <option value={1}>TOP 1</option>
                            <option value={2}>TOP 2</option>
                            <option value={3}>TOP 3</option>
                          </select>
                          <button onClick={() => updateTop(w.id, null)}>
                            Xóa khỏi TOP
                          </button>
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="empty">Chưa có người nào trong TOP.</div>
              )}
            </section>
            <div className="live-source-grid">
              <section className="live-source real-source">
                <div className="live-visible-head">
                  <h3>Kết quả thật từ hệ thống</h3>
                  <span>{realWinners.length} kết quả</span>
                </div>
                <p className="source-note">
                  Tự động lấy từ khách đã quay; xóa khỏi LIVE không ảnh hưởng
                  lịch sử quay.
                </p>
                {realWinners.length > 0 ? (
                  <div className="manual-list">
                    {realWinners.map((w) => (
                      <div key={w.id}>
                        <span>
                          <i className={`winner-kind ${w.winnerType}`}>
                            {w.winnerType === "deposit"
                              ? "KHÁCH NẠP THẬT"
                              : "FREEPLAY THẬT"}
                          </i>
                          <strong>{w.customerId}</strong> · {w.prize}
                        </span>
                        <span className="real-live-actions">
                          <time>
                            {new Date(w.createdAt).toLocaleString("vi-VN")}
                          </time>
                          <button onClick={() => hideRealWinner(w.id)}>
                            Xóa khỏi LIVE
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty">Chưa có kết quả quay thật.</div>
                )}
              </section>
              <section className="live-source admin-source">
                <div className="live-visible-head">
                  <h3>Thông báo Admin tự thêm</h3>
                  <span>{manualWinners.length} mục đang chạy</span>
                </div>
                <p className="source-note">
                  Có thể xóa; khách nạp mặc định lặp nhiều hơn Freeplay.
                </p>
                {manualWinners.length > 0 ? (
                  <div className="manual-list">
                    {manualWinners.map((w) => (
                      <div key={w.id}>
                        <span>
                          <i className={`winner-kind ${w.winnerType}`}>
                            {w.winnerType === "deposit"
                              ? "KHÁCH NẠP"
                              : "FREEPLAY"}
                          </i>
                          <strong>{w.customerId}</strong> · {w.prize} · ×
                          {w.frequency}{" "}
                          {w.featuredRank ? `· TOP ${w.featuredRank}` : ""}
                        </span>
                        <button onClick={() => removeLiveWinner(w.id)}>
                          Xóa
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty">Chưa có thông báo Admin tự thêm.</div>
                )}
              </section>
            </div>
          </section>
        )}
        {view === "history" && (
          <section className="records">
            <div className="records-head">
              <div>
                <h2>Lịch sử lượt quay bằng mã</h2>
                <p>{rows.length} kết quả được tìm thấy</p>
              </div>
              <div className="filters">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm ID hoặc mã xác nhận…"
                />
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="all">Tất cả trạng thái</option>
                  {Object.entries(LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
                <button
                  className="delete-all"
                  onClick={() => deleteDepositHistory()}
                >
                  Xóa tất cả lịch sử
                </button>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID / Mã</th>
                    <th>Kết quả</th>
                    <th>Trạng thái</th>
                    <th>Thời gian</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.customerId}</strong>
                        <code>
                          {r.status === "pending" ? r.token : r.code || r.token}
                        </code>
                      </td>
                      <td>
                        <b className="prize">{r.result || "—"}</b>
                      </td>
                      <td>
                        <span className={`status status-${r.status}`}>
                          {LABELS[r.status]}
                        </span>
                      </td>
                      <td>
                        <span>
                          {new Date(r.createdAt).toLocaleString("vi-VN")}
                        </span>
                        <small>
                          Hết hạn:{" "}
                          {new Date(r.expiresAt).toLocaleString("vi-VN")}
                        </small>
                      </td>
                      <td>
                        <div className="row-actions">
                          {r.status === "pending" && (
                            <>
                              <button
                                onClick={() =>
                                  navigator.clipboard.writeText(r.token)
                                }
                              >
                                Sao chép mã
                              </button>
                              <button
                                onClick={() =>
                                  navigator.clipboard.writeText(r.url)
                                }
                              >
                                Sao chép link
                              </button>
                              <button
                                className="danger-link"
                                onClick={() => act(r.id, "cancel")}
                              >
                                Hủy
                              </button>
                            </>
                          )}
                          {r.status === "spun" && (
                            <button
                              className="award"
                              onClick={() => act(r.id, "award")}
                            >
                              Đã trao thưởng
                            </button>
                          )}
                          {r.status === "awarded" && <span>Hoàn tất ✓</span>}
                          <button
                            className="danger-link"
                            onClick={() => deleteDepositHistory(r.id)}
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rows.length && (
                <div className="empty">Chưa có lượt quay phù hợp.</div>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
