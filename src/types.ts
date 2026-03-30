/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface HealthCommunicationRecord {
  id: string;
  stt: number;
  thoiGian: string;
  diaDiem: string;
  noiDung: string;
  hinhThuc: string;
  doiTuong: string;
  soNguoi: number;
  phuongTien: string;
  thoiLuong: string;
  staff: string;
  signature: string;
  ghiChu: string;
  unitId: string;
  sourceUnit?: string;
  syncedAt?: string;
}

export interface User {
  id: string;
  name: string;
  username?: string;
  role: 'admin' | 'station';
  unitId: string;
}

export const UNITS = [
  { id: "tram-chinh", name: "Trạm chính" },
  { id: "doan-ket", name: "Điểm trạm 1 (Đoàn Kết)" },
  { id: "ha-long", name: "Điểm trạm 2 (Hạ Long)" },
  { id: "dai-xuyen", name: "Điểm trạm 3 (Đài Xuyên)" },
  { id: "van-yen", name: "Điểm trạm 4 (Vạn Yên)" }
];

export interface Reminder {
  id: string;
  tieuDe: string;
  ngay: string;
  loai: 'KeHoach' | 'TheoDoi';
  moTa: string;
  hoanThanh: boolean;
}

export const HINH_THUC_OPTIONS = [
  "Phát thanh loa xã",
  "Tập huấn",
  "Truyền thông nhóm",
  "Tư vấn trực tiếp",
  "Phát tờ rơi",
  "Nói chuyện chuyên đề",
];

export const DOI_TUONG_OPTIONS = [
  "Phụ nữ 15–49",
  "Người cao tuổi",
  "Học sinh",
  "Toàn dân",
  "Người bệnh mạn tính",
];

export const PHUONG_TIEN_OPTIONS = [
  "Loa phát thanh",
  "Tờ rơi",
  "Tranh lật",
  "Slide trình chiếu",
  "Video",
];
