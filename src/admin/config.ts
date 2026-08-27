import type { AdminView, FreeplayTab } from "./types";

export const LIVE_PRIZES = [
  "FREEPLAY $5",
  "FREEPLAY $10",
  "FREEPLAY $20",
  "FREEPLAY $30",
  "$10",
  "$99",
  "$299",
  "$599",
  "$999",
];

export const DEPOSIT_PRIZES = ["FREEPLAY", "$10", "$99", "$299", "$599", "$999"];

export const STATUS_LABELS: Record<string, string> = {
  pending: "Chưa quay",
  spun: "Đã quay",
  awarded: "Đã trao thưởng",
  expired: "Hết hạn",
  cancelled: "Đã hủy",
};

export const VIEW_INFO: Record<AdminView, [string, string]> = {
  facebook: ["Spin khách Freeplay", "OS2 & Moolah · 2 lượt mỗi ngày"],
  offers: ["Quảng cáo Offer", "Chỉnh nội dung quảng cáo trên trang khách"],
  create: ["Tạo mã spin khách nạp", "Mã dùng một lần cho khách nạp"],
  deposit_rewards: ["Phần thưởng & tỷ lệ khách nạp", "Cơ cấu mặc định của vòng quay bằng mã"],
  live: ["LIVE WINS & TOP", "Quản lý bảng tin trên trang khách"],
  history: ["Lịch sử spin khách nạp", "Theo dõi trạng thái và trao thưởng"],
};

export const FREEPLAY_INFO: Record<FreeplayTab, [string, string]> = {
  overview: ["Tổng Freeplay", "Số liệu khách và lượt quay hôm nay"],
  rewards: ["Phần thưởng & tỷ lệ", "Điều chỉnh ô thưởng, tên, màu và trọng số"],
  customers: ["Danh sách khách Freeplay", "Thêm, reset hoặc xóa khách"],
  history: ["Lịch sử Freeplay", "Theo dõi các lượt quay OS2 và Moolah"],
};

export const SHADE_MAP = {
  os2: ["#ef4a90", "#7141d8", "#4256d9", "#ffb834"],
  moolah: ["#0e8f68", "#22b99a", "#62d7b7"],
} as const;
