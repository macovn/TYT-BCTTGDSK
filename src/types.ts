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
  nguoiThucHien: string;
  ghiChu: string;
}

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
