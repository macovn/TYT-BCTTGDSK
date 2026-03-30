import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  FileSpreadsheet, 
  FileText, 
  Printer, 
  LayoutDashboard, 
  Table as TableIcon,
  Trash2,
  Save,
  ChevronRight,
  ChevronLeft,
  Calendar as CalendarIcon,
  Users,
  Megaphone,
  Bell,
  CheckCircle2,
  Clock,
  AlertCircle,
  CalendarDays,
  LogOut,
  LogIn
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { 
  HealthCommunicationRecord, 
  Reminder,
  HINH_THUC_OPTIONS, 
  DOI_TUONG_OPTIONS, 
  PHUONG_TIEN_OPTIONS,
  UNITS,
  User
} from './types';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const API_KEYS: Record<string, string> = {
  "tram-chinh": "key-tram-chinh-123",
  "doan-ket": "key-doan-ket-456",
  "ha-long": "key-ha-long-789",
  "dai-xuyen": "key-dai-xuyen-012",
  "van-yen": "key-van-yen-345"
};

import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={<MainApp />} />
    </Routes>
  );
}

function MainApp() {
  const navigate = useNavigate();
  
  // Session Helper
  const currentUser = useMemo(() => {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  }, []);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  if (!currentUser) return null;

  const logout = () => {
    localStorage.removeItem("user");
    navigate('/login');
  };

  console.log("MainApp: Rendering...");
  const [records, setRecords] = useState<HealthCommunicationRecord[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [activeTab, setActiveTab] = useState<'entry' | 'report' | 'reminders'>('entry');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isReminderFormOpen, setIsReminderFormOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // RBAC State - Now from currentUser
  const [selectedUnit, setSelectedUnit] = useState<string>('all');

  // Report Filter State
  const [reportType, setReportType] = useState<'month' | 'quarter' | '6month' | '9month' | 'year'>('month');
  const [reportValue, setReportValue] = useState<number>(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState<number>(new Date().getFullYear());

  // Reset reportValue when reportType changes
  useEffect(() => {
    if (reportType === 'month') {
      setReportValue(new Date().getMonth() + 1);
    } else if (reportType === 'quarter') {
      setReportValue(Math.ceil((new Date().getMonth() + 1) / 3));
    } else if (reportType === '6month') {
      setReportValue(new Date().getMonth() + 1 <= 6 ? 1 : 2);
    } else {
      setReportValue(1);
    }
  }, [reportType]);

  // Form state
  const [formData, setFormData] = useState<Partial<HealthCommunicationRecord>>({
    thoiGian: format(new Date(), 'yyyy-MM-dd'),
    diaDiem: '',
    noiDung: '',
    hinhThuc: HINH_THUC_OPTIONS[0],
    doiTuong: DOI_TUONG_OPTIONS[0],
    soNguoi: 0,
    phuongTien: PHUONG_TIEN_OPTIONS[0],
    thoiLuong: '',
    staff: '',
    signature: '',
    ghiChu: '',
  });

  // Fetch records from API
  const fetchRecords = async () => {
    try {
      let url = `/api/data/${currentUser.unitId}`;
      let headers: Record<string, string> = {
        "x-api-key": API_KEYS[currentUser.unitId] || ""
      };

      if (currentUser.role === 'admin') {
        url = `/api/central/report`;
        headers = {}; 
      }

      const response = await fetch(url, { headers });
      if (response.ok) {
        const data = await response.json();
        setRecords(data);
      }
    } catch (error) {
      console.error("Error fetching records:", error);
    }
  };

  useEffect(() => {
    fetchRecords();
    
    // Load reminders from localStorage (still local for now)
    const savedReminders = localStorage.getItem('health_comm_reminders');
    if (savedReminders) {
      const parsed = JSON.parse(savedReminders);
      if (Array.isArray(parsed)) setReminders(parsed);
    }

    // Auto-sync every 10 minutes for station users
    let syncInterval: any;
    if (currentUser.role === 'station') {
      syncInterval = setInterval(() => {
        handleSync();
      }, 10 * 60 * 1000);
    }

    return () => {
      if (syncInterval) clearInterval(syncInterval);
    };
  }, [currentUser]);

  // Save data to localStorage
  useEffect(() => {
    if (records.length > 0) {
      localStorage.setItem('health_comm_records', JSON.stringify(records));
    }
  }, [records]);

  useEffect(() => {
    localStorage.setItem('health_comm_reminders', JSON.stringify(reminders));
  }, [reminders]);

  const handleSync = async () => {
    if (currentUser.role === 'admin') return;
    
    setIsSyncing(true);
    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId: currentUser.unitId,
          apiKey: API_KEYS[currentUser.unitId],
          data: records
        })
      });

      if (response.ok) {
        alert("Đồng bộ dữ liệu về trạm chính thành công!");
      } else {
        alert("Đồng bộ thất bại. Vui lòng kiểm tra kết nối.");
      }
    } catch (error) {
      console.error("Sync error:", error);
      alert("Lỗi khi đồng bộ dữ liệu.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddRecord = async (e: React.FormEvent) => {
    try {
      e.preventDefault();
      
      if (!formData.staff) {
        alert("Vui lòng nhập người thực hiện");
        return;
      }

      const record: HealthCommunicationRecord = {
        ...(formData as HealthCommunicationRecord),
        id: Math.random().toString(36).substr(2, 9),
        stt: records.length + 1,
        unitId: currentUser.unitId
      };

      const response = await fetch(`/api/data/${currentUser.unitId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEYS[currentUser.unitId] || ""
        },
        body: JSON.stringify(record)
      });

      if (response.ok) {
        setRecords(prev => [record, ...prev]);
        setIsFormOpen(false);
        setFormData({
          thoiGian: format(new Date(), 'yyyy-MM-dd'),
          diaDiem: '',
          noiDung: '',
          hinhThuc: HINH_THUC_OPTIONS[0],
          doiTuong: DOI_TUONG_OPTIONS[0],
          soNguoi: 0,
          phuongTien: PHUONG_TIEN_OPTIONS[0],
          thoiLuong: '',
          staff: '',
          signature: '',
          ghiChu: '',
        });
      }
    } catch (error) {
      console.error("Error in handleAddRecord:", error);
    }
  };

  const deleteRecord = (id: string) => {
    try {
      const updated = records.filter(r => r.id !== id).map((r, index) => ({ ...r, stt: index + 1 }));
      setRecords(updated);
    } catch (error) {
      console.error("Error in deleteRecord:", error);
    }
  };

  const [reminderFormData, setReminderFormData] = useState<Partial<Reminder>>({
    tieuDe: '',
    ngay: format(new Date(), 'yyyy-MM-dd'),
    loai: 'KeHoach',
    moTa: '',
  });

  const handleAddReminder = (e: React.FormEvent) => {
    try {
      e.preventDefault();
      const newReminder: Reminder = {
        ...(reminderFormData as Reminder),
        id: Date.now().toString(),
        hoanThanh: false,
      };
      setReminders([...reminders, newReminder]);
      setIsReminderFormOpen(false);
      setReminderFormData({
        tieuDe: '',
        ngay: format(new Date(), 'yyyy-MM-dd'),
        loai: 'KeHoach',
        moTa: '',
      });
    } catch (error) {
      console.error("Error in handleAddReminder:", error);
    }
  };

  // Report calculations
  const filteredRecords = useMemo(() => {
    try {
      return records.filter(record => {
        // RBAC Filter
        if (currentUser.role === 'admin') {
          if (selectedUnit !== 'all' && record.unitId !== selectedUnit) return false;
        } else {
          if (record.unitId !== currentUser.unitId) return false;
        }

        const date = new Date(record.thoiGian);
        if (isNaN(date.getTime())) return false;
        
        const month = date.getMonth() + 1;
        const year = date.getFullYear();

        if (year !== reportYear) return false;

        switch (reportType) {
          case 'month':
            return month === reportValue;
          case 'quarter':
            const q = Math.ceil(month / 3);
            return q === reportValue;
          case '6month':
            return reportValue === 1 ? month <= 6 : month > 6;
          case '9month':
            return month <= 9;
          case 'year':
            return true;
          default:
            return true;
        }
      });
    } catch (e) {
      console.error("Lỗi khi tính toán dữ liệu báo cáo:", e);
      return [];
    }
  }, [records, reportType, reportValue, reportYear, currentUser, selectedUnit]);

  const reportTitle = useMemo(() => {
    const yearStr = `Năm ${reportYear}`;
    switch (reportType) {
      case 'month':
        return `Tháng ${reportValue} / ${yearStr}`;
      case 'quarter':
        return `Quý ${reportValue === 1 ? 'I' : reportValue === 2 ? 'II' : reportValue === 3 ? 'III' : 'IV'} / ${yearStr}`;
      case '6month':
        return `${reportValue === 1 ? '6 tháng đầu năm' : '6 tháng cuối năm'} / ${yearStr}`;
      case '9month':
        return `9 tháng đầu năm / ${yearStr}`;
      case 'year':
        return yearStr;
      default:
        return yearStr;
    }
  }, [reportType, reportValue, reportYear]);

  const statsByHinhThuc = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach(r => {
      counts[r.hinhThuc] = (counts[r.hinhThuc] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredRecords]);

  const reportSummary = useMemo(() => {
    const totalSessions = filteredRecords.length;
    const totalPeople = filteredRecords.reduce((sum, item) => sum + Number(item.soNguoi || 0), 0);
    
    const byType: Record<string, { sessions: number; people: number }> = {};
    const byUnit: Record<string, { sessions: number; people: number }> = {};
    
    filteredRecords.forEach(item => {
      const type = item.hinhThuc || "Khác";
      if (!byType[type]) {
        byType[type] = { sessions: 0, people: 0 };
      }
      byType[type].sessions += 1;
      byType[type].people += Number(item.soNguoi || 0);

      const unit = UNITS.find(u => u.id === item.unitId)?.name || "Không xác định";
      if (!byUnit[unit]) {
        byUnit[unit] = { sessions: 0, people: 0 };
      }
      byUnit[unit].sessions += 1;
      byUnit[unit].people += Number(item.soNguoi || 0);
    });
    
    return { totalSessions, totalPeople, byType, byUnit };
  }, [filteredRecords]);

  const statsByDoiTuong = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach(r => {
      counts[r.doiTuong] = (counts[r.doiTuong] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredRecords]);

  const statsByUnit = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach(r => {
      const unitName = UNITS.find(u => u.id === r.unitId)?.name || "Khác";
      counts[unitName] = (counts[unitName] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredRecords]);

  const handlePrint = () => {
    try {
      if (typeof window === "undefined") return;
      const content = document.getElementById('print-area');

      if (!content) {
        alert("Không có dữ liệu để in");
        return;
      }

      const printWindow = window.open("", "", "width=1200,height=800");
      if (!printWindow) {
        alert("Vui lòng cho phép trình duyệt mở cửa sổ mới để in");
        return;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>In sổ GDSK</title>
            <style>
              @page {
                size: A4 landscape;
                margin: 2cm 2cm 2cm 3cm;
              }
              body {
                font-family: "Times New Roman", Times, serif;
                font-size: 14pt;
                line-height: 1.3;
                margin: 0;
                padding: 0;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
              }
              .header h1 {
                font-size: 18pt;
                margin: 0;
                text-transform: uppercase;
              }
              .header h2 {
                font-size: 14pt;
                margin: 5px 0;
              }
              .header p {
                font-style: italic;
                margin: 5px 0;
              }
              .section-title { 
                font-size: 14pt; 
                font-weight: bold; 
                margin-top: 20px; 
                margin-bottom: 10px; 
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
              }
              th, td {
                border: 1px solid black;
                padding: 6px;
                text-align: left;
                font-size: 12pt;
              }
              th {
                background-color: #f2f2f2;
                text-align: center;
                font-weight: bold;
              }
              .footer {
                margin-top: 40px;
                display: flex;
                justify-content: space-between;
              }
              .footer-col {
                text-align: center;
                width: 40%;
              }
              .footer-col p.title {
                font-weight: bold;
                margin-bottom: 60px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Sổ theo dõi truyền thông GDSK</h1>
              <h2>Trạm Y tế Cái Bầu</h2>
              <p>Thời gian: ${reportTitle}</p>
            </div>

            <div class="section-title">I. TỔNG HỢP CHUNG</div>
            <p>1. Tổng số buổi truyền thông: ${reportSummary.totalSessions}</p>
            <p>2. Tổng số lượt người tham gia: ${reportSummary.totalPeople}</p>

            <div class="section-title">II. PHÂN LOẠI THEO HÌNH THỨC</div>
            <table>
              <thead>
                <tr>
                  <th>Hình thức</th>
                  <th>Số buổi</th>
                  <th>Số người</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(reportSummary.byType).map(([type, val]) => `
                  <tr>
                    <td>${type}</td>
                    <td style="text-align: center">${val.sessions}</td>
                    <td style="text-align: center">${val.people}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            ${currentUser.role === 'admin' ? `
              <div class="section-title">III. PHÂN LOẠI THEO ĐƠN VỊ</div>
              <table>
                <thead>
                  <tr>
                    <th>Đơn vị</th>
                    <th>Số buổi</th>
                    <th>Số người</th>
                  </tr>
                </thead>
                <tbody>
                  ${Object.entries(reportSummary.byUnit).map(([unit, val]) => `
                    <tr>
                      <td>${unit}</td>
                      <td style="text-align: center">${val.sessions}</td>
                      <td style="text-align: center">${val.people}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : ''}

            <div class="section-title">${currentUser.role === 'admin' ? 'IV' : 'III'}. CHI TIẾT CÁC HOẠT ĐỘNG</div>
            <table>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Thời gian</th>
                  <th>Địa điểm</th>
                  <th>Nội dung</th>
                  <th>Hình thức</th>
                  <th>Đơn vị</th>
                  <th>Đối tượng</th>
                  <th>Số người</th>
                  <th>Phương tiện</th>
                  <th>Thời lượng</th>
                  <th>Người thực hiện</th>
                  <th>Ký xác nhận</th>
                </tr>
              </thead>
              <tbody>
                ${filteredRecords.map(row => `
                  <tr>
                    <td style="text-align: center">${row.stt}</td>
                    <td>${safeFormat(row.thoiGian, 'dd/MM/yyyy')}</td>
                    <td>${row.diaDiem}</td>
                    <td>${row.noiDung}</td>
                    <td>${row.hinhThuc}</td>
                    <td>${UNITS.find(u => u.id === row.unitId)?.name || 'N/A'}</td>
                    <td>${row.doiTuong}</td>
                    <td style="text-align: center">${row.soNguoi}</td>
                    <td>${row.phuongTien}</td>
                    <td>${row.thoiLuong}</td>
                    <td>${row.staff}</td>
                    <td>${row.signature || ''}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="footer">
              <div class="footer-col">
                <p class="title">Người lập</p>
                <p style="font-style: italic">(Ký, ghi rõ họ tên)</p>
              </div>
              <div class="footer-col">
                <p class="title">Trưởng trạm</p>
                <p style="font-style: italic">(Ký tên, đóng dấu)</p>
              </div>
            </div>
          </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.focus();

      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    } catch (error) {
      console.error("Error in handlePrint:", error);
    }
  };

  const handleExportPDF = async () => {
    try {
      if (typeof window === "undefined") return;
      if (filteredRecords.length === 0) {
        alert("Không có hoạt động trong thời gian này");
        return;
      }

      // Lazy load libraries
      const [jsPDFModule, autoTableModule] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable')
      ]);
      const { jsPDF } = jsPDFModule;
      
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

      // Add title
      doc.setFontSize(18);
      doc.text("BAO CAO TRUYEN THONG GDSK", doc.internal.pageSize.getWidth() / 2, 20, { align: "center" });
      
      doc.setFontSize(12);
      doc.text(`Thoi gian: ${reportTitle}`, doc.internal.pageSize.getWidth() / 2, 28, { align: "center" });

      // I. Summary Section
      doc.setFontSize(14);
      doc.text("I. TONG HOP CHUNG", 14, 40);
      doc.setFontSize(11);
      doc.text(`1. Tong so buoi truyen thong: ${reportSummary.totalSessions}`, 14, 48);
      doc.text(`2. Tong so luot nguoi tham gia: ${reportSummary.totalPeople}`, 14, 54);

      // II. Classification Table
      doc.setFontSize(14);
      doc.text("II. PHAN LOAI THEO HINH THUC", 14, 65);
      
      const summaryColumn = ["Hinh thuc", "So buoi", "So nguoi"];
      const summaryRows = Object.entries(reportSummary.byType).map(([type, val]) => [
        type, val.sessions, val.people
      ]);

      (doc as any).autoTable({
        head: [summaryColumn],
        body: summaryRows,
        startY: 70,
        theme: 'grid',
        styles: { fontSize: 10, font: 'helvetica' },
        headStyles: { fillColor: [100, 100, 100] }
      });

      let finalY = (doc as any).lastAutoTable.finalY || 70;

      // Unit Breakdown (Admin Only)
      if (currentUser.role === 'admin') {
        doc.setFontSize(14);
        doc.text("III. PHAN LOAI THEO DON VI", 14, finalY + 15);
        
        const unitColumn = ["Don vi", "So buoi", "So nguoi"];
        const unitRows = Object.entries(reportSummary.byUnit).map(([unit, val]) => [
          unit, val.sessions, val.people
        ]);

        (doc as any).autoTable({
          head: [unitColumn],
          body: unitRows,
          startY: finalY + 20,
          theme: 'grid',
          styles: { fontSize: 10, font: 'helvetica' },
          headStyles: { fillColor: [100, 100, 100] }
        });
        finalY = (doc as any).lastAutoTable.finalY || finalY + 20;
      }

      // III. Detailed Table
      doc.setFontSize(14);
      doc.text(`${currentUser.role === 'admin' ? 'IV' : 'III'}. CHI TIET CAC HOAT DONG`, 14, finalY + 15);

      const tableColumn = ["STT", "Thoi gian", "Dia diem", "Noi dung", "Hinh thuc", "Don vi", "Doi tuong", "So nguoi", "Phuong tien", "Thoi luong", "Nguoi thuc hien", "Ky xac nhan", "Ghi chu"];
      const tableRows = filteredRecords.map(row => [
        row.stt,
        safeFormat(row.thoiGian, 'dd/MM/yyyy'),
        row.diaDiem,
        row.noiDung,
        row.hinhThuc,
        UNITS.find(u => u.id === row.unitId)?.name || 'N/A',
        row.doiTuong,
        row.soNguoi,
        row.phuongTien,
        row.thoiLuong,
        row.staff,
        row.signature || "",
        row.ghiChu || ""
      ]);

      (doc as any).autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: finalY + 20,
        theme: 'grid',
        styles: {
          fontSize: 9,
          cellPadding: 2,
          valign: 'middle',
          font: 'helvetica'
        },
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
        }
      });

      doc.save(`Bao_cao_truyen_thong_${reportTitle.replace(/\//g, '-')}.pdf`);
    } catch (error) {
      console.error("Error in handleExportPDF:", error);
      alert("Có lỗi xảy ra khi xuất PDF. Vui lòng thử lại.");
    }
  };

  const safeFormat = (dateStr: string, formatStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'N/A';
      return format(date, formatStr);
    } catch (e) {
      return 'N/A';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-slate-800">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3 text-indigo-600 mb-1">
            <Megaphone size={24} strokeWidth={2.5} />
            <h1 className="font-bold text-lg tracking-tight">GDSK A11</h1>
          </div>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
            {UNITS.find(u => u.id === currentUser.unitId)?.name || 'Trạm Y tế'}
          </p>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xs">
                {currentUser.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-700 truncate">{currentUser.username}</p>
                <p className="text-[10px] text-slate-400 uppercase font-bold">{currentUser.role === 'admin' ? 'Quản trị viên' : 'Nhân viên trạm'}</p>
              </div>
            </div>
            <button 
              onClick={logout}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogIn size={14} className="rotate-180" />
              Đăng xuất
            </button>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button 
            onClick={() => setActiveTab('entry')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'entry' ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <TableIcon size={20} />
            Sổ Theo Dõi
          </button>
          <button 
            onClick={() => setActiveTab('report')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'report' ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <LayoutDashboard size={20} />
            Báo Cáo Tháng
          </button>
          <button 
            onClick={() => setActiveTab('reminders')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'reminders' ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <div className="flex items-center gap-3">
              <Bell size={20} />
              Nhắc Nhở
            </div>
            {reminders.filter(r => !r.hoanThanh).length > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {reminders.filter(r => !r.hoanThanh).length}
              </span>
            )}
          </button>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="bg-indigo-600 rounded-2xl p-4 text-white shadow-lg shadow-indigo-200">
            <p className="text-xs opacity-80 mb-1">Tổng số buổi</p>
            <p className="text-2xl font-bold">{records.length}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button 
                onClick={async () => {
                  try {
                    const { exportToExcel } = await import('./lib/export');
                    exportToExcel(filteredRecords, reportTitle, currentUser.role === 'admin');
                  } catch (error) {
                    console.error("Error in exportToExcel button:", error);
                  }
                }}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-xs font-medium"
                title="Xuất Excel"
              >
                <FileSpreadsheet size={16} />
                Excel
              </button>
              <button 
                onClick={async () => {
                  try {
                    const { exportToWord } = await import('./lib/export');
                    exportToWord(filteredRecords, reportTitle, currentUser.role === 'admin');
                  } catch (error) {
                    console.error("Error in exportToWord button:", error);
                  }
                }}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-xs font-medium"
                title="Xuất Word"
              >
                <FileText size={16} />
                Word
              </button>
              <button 
                onClick={async () => {
                  try {
                    const { exportToPDF } = await import('./lib/export');
                    exportToPDF(filteredRecords, reportTitle, currentUser.role === 'admin');
                  } catch (error) {
                    console.error("Error in exportToPDF button:", error);
                  }
                }}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-xs font-medium"
                title="Xuất PDF"
              >
                <FileText size={16} className="text-red-300" />
                PDF
              </button>
              <button 
                onClick={handlePrint}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-xs font-medium"
                title="In Sổ"
              >
                <Printer size={16} />
                In Sổ
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="font-bold text-slate-900 text-lg">
              {activeTab === 'entry' ? 'Danh Sách Hoạt Động Truyền Thông' : 
               activeTab === 'report' ? 'Thống Kê Báo Cáo' : 'Danh Sách Nhắc Nhở'}
            </h2>

            {/* Unit Selector */}
            <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase px-2">Đơn vị:</span>
              {currentUser.role === 'admin' ? (
                <select 
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  className="bg-white border-none text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                >
                  <option value="all">Tất cả đơn vị</option>
                  {UNITS.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              ) : (
                <select 
                  disabled
                  value={currentUser.unitId}
                  className="bg-slate-200 border-none text-xs font-bold px-3 py-1.5 rounded-lg outline-none cursor-not-allowed opacity-70"
                >
                  <option value={currentUser.unitId}>
                    {UNITS.find(u => u.id === currentUser.unitId)?.name}
                  </option>
                </select>
              )}
            </div>

            {activeTab === 'report' && (
              <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1.5">
                <select 
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as any)}
                  className="bg-white border-none text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                >
                  <option value="month">Tháng</option>
                  <option value="quarter">Quý</option>
                  <option value="6month">6 tháng</option>
                  <option value="9month">9 tháng</option>
                  <option value="year">Năm</option>
                </select>

                {(reportType === 'month' || reportType === 'quarter' || reportType === '6month') && (
                  <select 
                    value={reportValue}
                    onChange={(e) => setReportValue(parseInt(e.target.value))}
                    className="bg-white border-none text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                  >
                    {reportType === 'month' && Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
                    ))}
                    {reportType === 'quarter' && [1, 2, 3, 4].map(q => (
                      <option key={q} value={q}>Quý {q === 1 ? 'I' : q === 2 ? 'II' : q === 3 ? 'III' : 'IV'}</option>
                    ))}
                    {reportType === '6month' && (
                      <>
                        <option value={1}>6 tháng đầu</option>
                        <option value={2}>6 tháng cuối</option>
                      </>
                    )}
                  </select>
                )}

                <select 
                  value={reportYear}
                  onChange={(e) => setReportYear(parseInt(e.target.value))}
                  className="bg-white border-none text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                >
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>Năm {y}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {activeTab === 'entry' && (
            <div className="flex gap-2">
              {currentUser.role === 'station' && (
                <button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-semibold transition-all shadow-md shadow-emerald-100 disabled:opacity-50"
                >
                  <Save size={18} className={isSyncing ? 'animate-spin' : ''} />
                  {isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ về trạm chính'}
                </button>
              )}
              <button 
                onClick={() => setIsFormOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-semibold transition-all shadow-md shadow-indigo-100"
              >
                <Plus size={18} />
                Thêm Hoạt Động
              </button>
            </div>
          )}

          {activeTab === 'reminders' && (
            <button 
              onClick={() => setIsReminderFormOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-semibold transition-all shadow-md shadow-indigo-100"
            >
              <Plus size={18} />
              Thêm Nhắc Nhở
            </button>
          )}
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-8">
          {activeTab === 'entry' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-12">STT</th>
                      <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Thời gian</th>
                      <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Địa điểm</th>
                      <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Nội dung</th>
                      <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Hình thức</th>
                      <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Đơn vị</th>
                      <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Đối tượng</th>
                      <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Số người</th>
                      <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Phương tiện</th>
                      <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {records.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-4 py-4 text-sm font-medium text-slate-400 text-center">{record.stt}</td>
                        <td className="px-4 py-4 text-sm font-semibold text-slate-700">{safeFormat(record.thoiGian, 'dd/MM/yyyy')}</td>
                        <td className="px-4 py-4 text-sm text-slate-600">{record.diaDiem}</td>
                        <td className="px-4 py-4 text-sm font-medium text-slate-900">{record.noiDung}</td>
                        <td className="px-4 py-4">
                          <span className="px-2 py-1 bg-indigo-50 text-indigo-600 text-[11px] font-bold rounded-md uppercase tracking-wide">
                            {record.hinhThuc}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-xs font-medium text-slate-500">
                          {UNITS.find(u => u.id === record.unitId)?.name || 'N/A'}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600">{record.doiTuong}</td>
                        <td className="px-4 py-4 text-sm font-bold text-slate-900 text-center">{record.soNguoi}</td>
                        <td className="px-4 py-4 text-sm text-slate-500 italic">{record.phuongTien}</td>
                        <td className="px-4 py-4 text-center">
                          <button 
                            onClick={() => deleteRecord(record.id)}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {records.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-4 py-20 text-center text-slate-400 italic">
                          Chưa có dữ liệu. Hãy nhấn "Thêm Hoạt Động" để bắt đầu.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'report' && (
            <div className="space-y-8">
              {/* Report Header */}
              <div className="text-center space-y-2 mb-10">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">BÁO CÁO TRUYỀN THÔNG GDSK</h2>
                <p className="text-slate-500 font-medium text-lg">Thời gian: {reportTitle}</p>
              </div>

              {filteredRecords.length === 0 ? (
                <div className="bg-white py-20 rounded-3xl border border-dashed border-slate-200 text-center space-y-4">
                  <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-slate-300">
                    <AlertCircle size={40} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xl font-bold text-slate-900">Không có hoạt động nào</p>
                    <p className="text-slate-400">Vui lòng chọn thời gian khác hoặc thêm dữ liệu mới.</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                      <CalendarIcon size={24} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tổng số buổi</p>
                      <p className="text-2xl font-black text-slate-900">{filteredRecords.length}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">{reportTitle}</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                      <Users size={24} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tổng số người</p>
                      <p className="text-2xl font-black text-slate-900">
                        {reportSummary.totalPeople}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">Người tham gia trực tiếp</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                      <Megaphone size={24} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Hình thức phổ biến</p>
                      <p className="text-lg font-bold text-slate-900 truncate">
                        {statsByHinhThuc.length > 0 ? [...statsByHinhThuc].sort((a,b) => b.value - a.value)[0].name : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">Được thực hiện nhiều nhất</p>
                </div>
              </div>

              {/* Summary Table */}
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <span className="w-1 h-6 bg-slate-600 rounded-full"></span>
                  Bảng Tổng Hợp Phân Loại
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Hình thức truyền thông</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Số buổi</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Số người tham gia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Object.entries(reportSummary.byType).map(([type, val]) => (
                        <tr key={type} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-slate-700">{type}</td>
                          <td className="px-6 py-4 text-sm font-bold text-slate-900 text-center">{val.sessions}</td>
                          <td className="px-6 py-4 text-sm font-bold text-indigo-600 text-center">{val.people}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50/50 font-bold">
                        <td className="px-6 py-4 text-sm text-slate-900 uppercase">Tổng cộng</td>
                        <td className="px-6 py-4 text-sm text-slate-900 text-center">{reportSummary.totalSessions}</td>
                        <td className="px-6 py-4 text-sm text-indigo-700 text-center">{reportSummary.totalPeople}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Unit Summary Table (Admin Only) */}
              {currentUser.role === 'admin' && (
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm mb-8">
                  <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <span className="w-1 h-6 bg-indigo-600 rounded-full"></span>
                    Bảng Tổng Hợp Theo Đơn Vị
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Đơn vị</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Số buổi</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Số người tham gia</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {Object.entries(reportSummary.byUnit).map(([unit, val]) => (
                          <tr key={unit} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 text-sm font-medium text-slate-700">{unit}</td>
                            <td className="px-6 py-4 text-sm font-bold text-slate-900 text-center">{val.sessions}</td>
                            <td className="px-6 py-4 text-sm font-bold text-indigo-600 text-center">{val.people}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <span className="w-1 h-6 bg-indigo-600 rounded-full"></span>
                    Phân Bổ Theo Hình Thức
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statsByHinhThuc}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748B'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748B'}} />
                        <Tooltip 
                          contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                        />
                        <Bar dataKey="value" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <span className="w-1 h-6 bg-emerald-600 rounded-full"></span>
                    Cơ Cấu Đối Tượng
                  </h3>
                  <div className="h-80 flex items-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statsByDoiTuong}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {statsByDoiTuong.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="w-1/3 space-y-2">
                      {statsByDoiTuong.map((entry, index) => (
                        <div key={entry.name} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                          <span className="text-xs text-slate-600 truncate">{entry.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {currentUser.role === 'admin' && (
                  <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
                    <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                      <span className="w-1 h-6 bg-indigo-600 rounded-full"></span>
                      Phân Loại Theo Đơn Vị Gốc
                    </h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={statsByUnit}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                          <Tooltip 
                            contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                          />
                          <Bar dataKey="value" fill="#4F46E5" radius={[4, 4, 0, 0]} barSize={60} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

          {activeTab === 'reminders' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...reminders].sort((a, b) => new Date(a.ngay).getTime() - new Date(b.ngay).getTime()).map((reminder) => {
                const isOverdue = new Date(reminder.ngay) < new Date() && !reminder.hoanThanh;
                const isToday = safeFormat(reminder.ngay, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                
                return (
                  <div 
                    key={reminder.id} 
                    className={`bg-white p-6 rounded-2xl border transition-all duration-200 ${reminder.hoanThanh ? 'opacity-60 border-slate-100' : 'border-slate-200 shadow-sm hover:shadow-md'}`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-2 rounded-lg ${reminder.loai === 'KeHoach' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                        {reminder.loai === 'KeHoach' ? <CalendarDays size={20} /> : <Clock size={20} />}
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            try {
                              const updated = reminders.map(r => r.id === reminder.id ? { ...r, hoanThanh: !r.hoanThanh } : r);
                              setReminders(updated);
                            } catch (error) {
                              console.error("Error in toggleReminder button:", error);
                            }
                          }}
                          className={`p-2 rounded-lg transition-colors ${reminder.hoanThanh ? 'text-emerald-500 bg-emerald-50' : 'text-slate-300 hover:bg-slate-50 hover:text-indigo-600'}`}
                        >
                          <CheckCircle2 size={18} />
                        </button>
                        <button 
                          onClick={() => {
                            try {
                              const updated = reminders.filter(r => r.id !== reminder.id);
                              setReminders(updated);
                            } catch (error) {
                              console.error("Error in deleteReminder button:", error);
                            }
                          }}
                          className="p-2 text-slate-300 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    
                    <h4 className={`font-bold text-slate-900 mb-1 ${reminder.hoanThanh ? 'line-through' : ''}`}>
                      {reminder.tieuDe}
                    </h4>
                    <p className="text-sm text-slate-500 mb-4 line-clamp-2">{reminder.moTa}</p>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <CalendarIcon size={14} className="text-slate-400" />
                        <span className={isOverdue ? 'text-red-500' : isToday ? 'text-amber-500' : 'text-slate-600'}>
                          {safeFormat(reminder.ngay, 'dd/MM/yyyy')}
                        </span>
                      </div>
                      {isOverdue && !reminder.hoanThanh && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 uppercase tracking-wider">
                          <AlertCircle size={12} />
                          Quá hạn
                        </span>
                      )}
                      {isToday && !reminder.hoanThanh && (
                        <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Hôm nay</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {reminders.length === 0 && (
                <div className="col-span-full py-20 text-center text-slate-400 italic bg-white rounded-2xl border border-dashed border-slate-200">
                  Chưa có nhắc nhở nào. Hãy nhấn "Thêm Nhắc Nhở" để lập kế hoạch.
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Print Only Section */}
      <div id="print-area" className="p-8">
        {filteredRecords.length > 0 ? (
          <>
            <h1 className="text-2xl font-bold text-center mb-2 uppercase">BÁO CÁO TRUYỀN THÔNG GDSK</h1>
            <p className="text-center mb-8 italic subtitle">Thời gian: {reportTitle}</p>
            
            <div className="mb-8 space-y-4">
              <div className="section-title">I. TỔNG HỢP CHUNG</div>
              <p>1. Tổng số buổi truyền thông: <strong>{reportSummary.totalSessions}</strong></p>
              <p>2. Tổng số lượt người tham gia: <strong>{reportSummary.totalPeople}</strong></p>
              
              <div className="section-title">II. PHÂN LOẠI THEO HÌNH THỨC</div>
              <table className="w-full border-collapse border border-black mb-6">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-black p-2">Hình thức</th>
                    <th className="border border-black p-2 text-center">Số buổi</th>
                    <th className="border border-black p-2 text-center">Số người</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(reportSummary.byType).map(([type, val]) => (
                    <tr key={type}>
                      <td className="border border-black p-2">{type}</td>
                      <td className="border border-black p-2 text-center">{val.sessions}</td>
                      <td className="border border-black p-2 text-center">{val.people}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {currentUser.role === 'admin' && (
                <>
                  <div className="section-title">III. PHÂN LOẠI THEO ĐƠN VỊ</div>
                  <table className="w-full border-collapse border border-black mb-6">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-black p-2">Đơn vị</th>
                        <th className="border border-black p-2 text-center">Số buổi</th>
                        <th className="border border-black p-2 text-center">Số người</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(reportSummary.byUnit).map(([unit, val]) => (
                        <tr key={unit}>
                          <td className="border border-black p-2">{unit}</td>
                          <td className="border border-black p-2 text-center">{val.sessions}</td>
                          <td className="border border-black p-2 text-center">{val.people}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
              
              <div className="section-title">{currentUser.role === 'admin' ? 'IV' : 'III'}. CHI TIẾT CÁC HOẠT ĐỘNG</div>
            </div>

            <table className="w-full border-collapse border border-black text-[10pt]">
              <thead>
                <tr>
                  <th className="border border-black p-2">STT</th>
                  <th className="border border-black p-2">Thời gian</th>
                  <th className="border border-black p-2">Địa điểm</th>
                  <th className="border border-black p-2">Nội dung</th>
                  <th className="border border-black p-2">Hình thức</th>
                  <th className="border border-black p-2">Đơn vị</th>
                  <th className="border border-black p-2">Đối tượng</th>
                  <th className="border border-black p-2">Số người</th>
                  <th className="border border-black p-2">Phương tiện</th>
                  <th className="border border-black p-2">Thời lượng</th>
                  <th className="border border-black p-2">Người thực hiện</th>
                  <th className="border border-black p-2">Ký xác nhận</th>
                  <th className="border border-black p-2">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map(r => (
                  <tr key={r.id}>
                    <td className="border border-black p-2 text-center">{r.stt}</td>
                    <td className="border border-black p-2">{safeFormat(r.thoiGian, 'dd/MM/yyyy')}</td>
                    <td className="border border-black p-2">{r.diaDiem}</td>
                    <td className="border border-black p-2">{r.noiDung}</td>
                    <td className="border border-black p-2">{r.hinhThuc}</td>
                    <td className="border border-black p-2">{UNITS.find(u => u.id === r.unitId)?.name || 'N/A'}</td>
                    <td className="border border-black p-2">{r.doiTuong}</td>
                    <td className="border border-black p-2 text-center">{r.soNguoi}</td>
                    <td className="border border-black p-2">{r.phuongTien}</td>
                    <td className="border border-black p-2">{r.thoiLuong}</td>
                    <td className="border border-black p-2">{r.staff}</td>
                    <td className="border border-black p-2">{r.signature}</td>
                    <td className="border border-black p-2">{r.ghiChu}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <div className="text-center py-10 italic text-slate-500">
            Không có hoạt động nào trong thời gian này
          </div>
        )}
      </div>

      {/* Modal Form */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
              <h3 className="text-xl font-bold text-slate-900">Thêm Hoạt Động Truyền Thông</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <Plus className="rotate-45" size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAddRecord} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thời gian</label>
                  <input 
                    type="date" 
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    value={formData.thoiGian}
                    onChange={e => setFormData({...formData, thoiGian: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Địa điểm</label>
                  <input 
                    type="text" 
                    required
                    placeholder="VD: Nhà văn hóa thôn..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    value={formData.diaDiem}
                    onChange={e => setFormData({...formData, diaDiem: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nội dung truyền thông</label>
                <textarea 
                  required
                  placeholder="Nhập nội dung chi tiết..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                  value={formData.noiDung}
                  onChange={e => setFormData({...formData, noiDung: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hình thức</label>
                  <select 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all appearance-none bg-white"
                    value={formData.hinhThuc}
                    onChange={e => setFormData({...formData, hinhThuc: e.target.value})}
                  >
                    {HINH_THUC_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Đối tượng</label>
                  <select 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all appearance-none bg-white"
                    value={formData.doiTuong}
                    onChange={e => setFormData({...formData, doiTuong: e.target.value})}
                  >
                    {DOI_TUONG_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Số người</label>
                  <input 
                    type="number" 
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    value={formData.soNguoi}
                    onChange={e => setFormData({...formData, soNguoi: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thời lượng</label>
                  <input 
                    type="text" 
                    placeholder="VD: 45 phút"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    value={formData.thoiLuong}
                    onChange={e => setFormData({...formData, thoiLuong: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phương tiện</label>
                  <select 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all appearance-none bg-white"
                    value={formData.phuongTien}
                    onChange={e => setFormData({...formData, phuongTien: e.target.value})}
                  >
                    {PHUONG_TIEN_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Người/Đơn vị thực hiện</label>
                  <input 
                    type="text" 
                    placeholder="VD: BS. Nguyễn Văn A"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    value={formData.staff}
                    onChange={e => setFormData({...formData, staff: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ký xác nhận</label>
                  <input 
                    type="text" 
                    placeholder="Người ký / đã ký"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    value={formData.signature}
                    onChange={e => setFormData({...formData, signature: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                >
                  Hủy Bỏ
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Lưu Hoạt Động
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reminder Modal Form */}
      {isReminderFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
              <h3 className="text-xl font-bold text-slate-900">Thêm Nhắc Nhở Mới</h3>
              <button onClick={() => setIsReminderFormOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <Plus className="rotate-45" size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAddReminder} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tiêu đề</label>
                <input 
                  type="text" 
                  required
                  placeholder="VD: Chuẩn bị tài liệu..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  value={reminderFormData.tieuDe}
                  onChange={e => setReminderFormData({...reminderFormData, tieuDe: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ngày nhắc</label>
                  <input 
                    type="date" 
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    value={reminderFormData.ngay}
                    onChange={e => setReminderFormData({...reminderFormData, ngay: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loại nhắc nhở</label>
                  <select 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all appearance-none bg-white"
                    value={reminderFormData.loai}
                    onChange={e => setReminderFormData({...reminderFormData, loai: e.target.value as any})}
                  >
                    <option value="KeHoach">Kế hoạch mới</option>
                    <option value="TheoDoi">Theo dõi buổi cũ</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mô tả chi tiết</label>
                <textarea 
                  placeholder="Nhập ghi chú thêm..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                  value={reminderFormData.moTa}
                  onChange={e => setReminderFormData({...reminderFormData, moTa: e.target.value})}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsReminderFormOpen(false)}
                  className="flex-1 px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                >
                  Hủy Bỏ
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Lưu Nhắc Nhở
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
