import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  FileSpreadsheet, 
  FileText, 
  Printer, 
  LayoutDashboard, 
  Table as TableIcon,
  Trash2,
  Pencil,
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
  Cell,
  LineChart,
  Line,
  Legend
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

const THEME_COLORS = {
  primary: "#2563EB",
  secondary: "#10B981",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  text: "#0F172A",
  subtext: "#64748B",
  primaryLight: "#60A5FA"
};

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import { supabase } from './lib/supabase';

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

  const isSupabaseConfigured = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-2xl text-center">
          <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Thiếu cấu hình Supabase</h1>
          <p className="text-blue-100/60 mb-8 text-sm">
            Vui lòng thiết lập <strong>VITE_SUPABASE_URL</strong> và <strong>VITE_SUPABASE_ANON_KEY</strong> trong phần Settings của Vercel để ứng dụng có thể hoạt động.
          </p>
          <div className="bg-black/20 p-4 rounded-xl text-left text-xs font-mono text-blue-200 mb-8 overflow-x-auto">
            <p>1. Vào Vercel Dashboard</p>
            <p>2. Settings &rarr; Environment Variables</p>
            <p>3. Thêm VITE_SUPABASE_URL</p>
            <p>4. Thêm VITE_SUPABASE_ANON_KEY</p>
            <p>5. Redeploy ứng dụng</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition-all"
          >
            Kiểm tra lại
          </button>
        </div>
      </div>
    );
  }

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
  const [editingRecord, setEditingRecord] = useState<HealthCommunicationRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  // Fetch records from Supabase
  const fetchRecords = async () => {
    try {
      let query = supabase.from('activities').select('*');

      if (currentUser.role === 'station') {
        query = query.eq('unit_id', currentUser.unitId);
      }

      const { data, error } = await query.order('date', { ascending: false });

      if (error) throw error;

      if (data) {
        const mappedRecords: HealthCommunicationRecord[] = data.map((item, index) => ({
          id: item.id,
          stt: index + 1,
          thoiGian: item.date,
          diaDiem: item.location,
          noiDung: item.content,
          hinhThuc: item.type,
          doiTuong: item.target,
          soNguoi: item.people,
          phuongTien: item.material,
          thoiLuong: item.duration,
          staff: item.staff,
          signature: item.signature,
          ghiChu: item.note,
          unitId: item.unit_id,
        }));
        setRecords(mappedRecords);
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

  const handleAddRecord = async (e: React.FormEvent) => {
    try {
      e.preventDefault();
      
      if (!formData.staff) {
        alert("Vui lòng nhập người thực hiện");
        return;
      }

      const payload = {
        date: formData.thoiGian,
        location: formData.diaDiem,
        content: formData.noiDung,
        type: formData.hinhThuc,
        target: formData.doiTuong,
        people: formData.soNguoi,
        material: formData.phuongTien,
        duration: formData.thoiLuong,
        staff: formData.staff,
        signature: formData.signature,
        note: formData.ghiChu,
        unit_id: currentUser.unitId,
      };

      if (editingRecord) {
        const { error } = await supabase.from('activities').update(payload).eq('id', editingRecord.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('activities').insert(payload);
        if (error) throw error;
      }

      await fetchRecords();
      setIsFormOpen(false);
      setEditingRecord(null);
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
    } catch (error) {
      console.error("Error in handleAddRecord:", error);
      alert("Lỗi khi lưu dữ liệu.");
    }
  };

  const openEditForm = (record: HealthCommunicationRecord) => {
    setEditingRecord(record);
    setFormData({
      thoiGian: record.thoiGian,
      diaDiem: record.diaDiem,
      noiDung: record.noiDung,
      hinhThuc: record.hinhThuc,
      doiTuong: record.doiTuong,
      soNguoi: record.soNguoi,
      phuongTien: record.phuongTien,
      thoiLuong: record.thoiLuong,
      staff: record.staff,
      signature: record.signature,
      ghiChu: record.ghiChu,
    });
    setIsFormOpen(true);
  };

  const deleteRecord = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bản ghi này?")) return;
    
    try {
      const { error } = await supabase.from('activities').delete().eq('id', id);
      if (error) throw error;
      
      await fetchRecords();
    } catch (error) {
      console.error("Error in deleteRecord:", error);
      alert("Lỗi khi xóa dữ liệu.");
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

  // Records for the Entry list (filtered by unit only)
  const entryRecords = useMemo(() => {
    let result = records;
    if (selectedUnit !== 'all') {
      result = result.filter(r => r.unitId === selectedUnit);
    }
    return result;
  }, [records, selectedUnit]);

  // Pagination for Entry list
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return entryRecords.slice(startIndex, startIndex + itemsPerPage);
  }, [entryRecords, currentPage]);

  const totalPages = Math.ceil(entryRecords.length / itemsPerPage);

  // Records for Report calculations (filtered by unit and date)
  const reportRecords = useMemo(() => {
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
    reportRecords.forEach(r => {
      counts[r.hinhThuc] = (counts[r.hinhThuc] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [reportRecords]);

  const reportSummary = useMemo(() => {
    const totalSessions = reportRecords.length;
    const totalPeople = reportRecords.reduce((sum, item) => sum + Number(item.soNguoi || 0), 0);
    
    const byType: Record<string, { sessions: number; people: number }> = {};
    const byUnit: Record<string, { sessions: number; people: number }> = {};
    
    reportRecords.forEach(item => {
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
  }, [reportRecords]);

  const statsByDoiTuong = useMemo(() => {
    const counts: Record<string, number> = {};
    reportRecords.forEach(r => {
      counts[r.doiTuong] = (counts[r.doiTuong] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [reportRecords]);

  const statsByUnit = useMemo(() => {
    const counts: Record<string, number> = {};
    reportRecords.forEach(r => {
      const unitName = UNITS.find(u => u.id === r.unitId)?.name || "Khác";
      counts[unitName] = (counts[unitName] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [reportRecords]);

  const statsByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    reportRecords.forEach(r => {
      const date = r.thoiGian;
      counts[date] = (counts[date] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [reportRecords]);

  const handlePrint = () => {
    try {
      const printContent = document.getElementById('print-area');
      if (!printContent) {
        window.print(); // Fallback to direct print
        return;
      }

      // Create a new window for printing
      const printWindow = window.open('', '_blank', 'width=1000,height=800');
      if (!printWindow) {
        // Fallback to direct print if popup is blocked
        window.focus();
        window.print();
        return;
      }

      // Collect all styles to pass to the print window
      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(s => s.outerHTML)
        .join('');

      printWindow.document.write(`
        <html>
          <head>
            <title>In Sổ Theo Dõi - GDSK</title>
            ${styles}
            <style>
              @media print {
                @page { size: A4 landscape; margin: 1cm; }
              }
              body { 
                padding: 20px; 
                font-family: "Times New Roman", Times, serif !important;
                background: white !important;
                color: black !important;
              }
              .print-only { display: block !important; }
              .no-print { display: none !important; }
              table { 
                width: 100% !important; 
                border-collapse: collapse !important; 
                margin-top: 20px !important; 
              }
              th, td { 
                border: 1px solid black !important; 
                padding: 6px !important; 
                text-align: center !important; 
                vertical-align: middle !important;
                font-size: 13px !important;
              }
              th { background-color: #f2f2f2 !important; font-weight: bold !important; }
              h1, h2 { text-align: center !important; margin-bottom: 10px !important; }
              .print-header { margin-bottom: 30px; }
            </style>
          </head>
          <body>
            <div class="print-only">
              ${printContent.innerHTML}
            </div>
            <script>
              window.onload = () => {
                setTimeout(() => {
                  window.print();
                  window.close();
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      console.error("Print error:", error);
      window.print(); // Final fallback
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
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {/* Print-only component */}
      <div className="print-only">
        <div className="print-header">
          <h1>SỔ THEO DÕI TRUYỀN THÔNG GDSK</h1>
          <h2 style={{ textTransform: 'none' }}>Thời gian: {reportTitle}</h2>
        </div>
        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Thời gian</th>
              <th>Địa điểm</th>
              <th>Nội dung</th>
              <th>Hình thức</th>
              <th>Đối tượng</th>
              <th>Số người</th>
              <th>Thời lượng</th>
              <th>Phương tiện</th>
              <th>Người thực hiện</th>
              <th>Ký xác nhận</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {reportRecords.map((item, index) => (
              <tr key={item.id || index}>
                <td>{index + 1}</td>
                <td>{item.thoiGian}</td>
                <td>{item.diaDiem}</td>
                <td>{item.noiDung}</td>
                <td>{item.hinhThuc}</td>
                <td>{item.doiTuong}</td>
                <td>{item.soNguoi}</td>
                <td>{item.thoiLuong}</td>
                <td>{item.phuongTien}</td>
                <td>{item.staff}</td>
                <td>{item.signature}</td>
                <td>{item.ghiChu}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-12 flex justify-between px-16">
          <div className="text-center">
            <p className="font-bold">Người lập sổ</p>
            <p className="mt-20">(Ký, ghi rõ họ tên)</p>
          </div>
          <div className="text-center">
            <p className="italic">Ngày ...... tháng ...... năm 20...</p>
            <p className="font-bold mt-2">Trưởng đơn vị</p>
            <p className="mt-20">(Ký tên, đóng dấu)</p>
          </div>
        </div>
      </div>

      <div className="no-print flex w-full">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900 flex flex-col shadow-2xl z-20">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3 text-blue-400 mb-1">
            <Megaphone size={24} strokeWidth={2.5} />
            <h1 className="font-black text-xl tracking-tighter text-white">GDSK A11</h1>
          </div>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">
            {UNITS.find(u => u.id === currentUser.unitId)?.name || 'Trạm Y tế'}
          </p>
          <div className="mt-6 pt-6 border-t border-slate-800">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-500/20 border border-blue-500/30 rounded-xl flex items-center justify-center text-blue-400 font-black text-sm shadow-inner">
                {currentUser.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-200 truncate">{currentUser.username}</p>
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider">{currentUser.role === 'admin' ? 'Quản trị viên' : 'Nhân viên trạm'}</p>
              </div>
            </div>
            <button 
              onClick={logout}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all duration-200"
            >
              <LogIn size={14} className="rotate-180" />
              Đăng xuất
            </button>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('entry')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${activeTab === 'entry' ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
          >
            <TableIcon size={20} className={activeTab === 'entry' ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'} />
            Sổ Theo Dõi
          </button>
          <button 
            onClick={() => setActiveTab('report')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${activeTab === 'report' ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
          >
            <LayoutDashboard size={20} className={activeTab === 'report' ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'} />
            Báo Cáo Tháng
          </button>
          <button 
            onClick={() => setActiveTab('reminders')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 group ${activeTab === 'reminders' ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
          >
            <div className="flex items-center gap-3">
              <Bell size={20} className={activeTab === 'reminders' ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'} />
              Nhắc Nhở
            </div>
            {reminders.filter(r => !r.hoanThanh).length > 0 && (
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${activeTab === 'reminders' ? 'bg-white text-blue-600' : 'bg-red-500 text-white'}`}>
                {reminders.filter(r => !r.hoanThanh).length}
              </span>
            )}
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-5 text-white shadow-xl shadow-blue-900/20 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <Megaphone size={80} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Tổng số buổi</p>
            <p className="text-3xl font-black tracking-tighter">{records.length}</p>
            <div className="mt-4 grid grid-cols-2 gap-2 relative z-10">
              <button 
                onClick={async () => {
                  try {
                    const { exportToExcel } = await import('./lib/export');
                    await exportToExcel(reportRecords, reportTitle, currentUser.role === 'admin');
                  } catch (error) {
                    console.error("Error in exportToExcel button:", error);
                  }
                }}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-[10px] font-black py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-white/10"
                title="Xuất Excel"
              >
                <FileSpreadsheet size={12} />
                EXCEL
              </button>
              <button 
                onClick={async () => {
                  try {
                    const { exportToWord } = await import('./lib/export');
                    await exportToWord(reportRecords, reportTitle, currentUser.role === 'admin');
                  } catch (error) {
                    console.error("Error in exportToWord button:", error);
                  }
                }}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-[10px] font-black py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-white/10"
                title="Xuất Word"
              >
                <FileText size={12} />
                WORD
              </button>
              <button 
                onClick={async () => {
                  try {
                    const { exportToPDF } = await import('./lib/export');
                    await exportToPDF(reportRecords, reportTitle, currentUser.role === 'admin');
                  } catch (error) {
                    console.error("Error in exportToPDF button:", error);
                  }
                }}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-[10px] font-black py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-white/10"
                title="Xuất PDF"
              >
                <FileText size={12} />
                PDF
              </button>
              <button 
                onClick={handlePrint}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-[10px] font-black py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-white/10"
                title="In Sổ"
              >
                <Printer size={12} />
                IN SỔ
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="font-bold text-slate-900 text-lg">
              {activeTab === 'entry' ? 'Danh Sách Hoạt Động Truyền Thông' : 
               activeTab === 'report' ? 'Thống Kê Báo Cáo' : 'Danh Sách Nhắc Nhở'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
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
                    className="bg-white border-none text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
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
                  className="bg-white border-none text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                >
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>Năm {y}</option>
                  ))}
                </select>
              </div>
            )}

            {activeTab === 'entry' && (
              <button 
                onClick={() => setIsFormOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-semibold transition-all shadow-md shadow-blue-100"
              >
                <Plus size={18} />
                Thêm Hoạt Động
              </button>
            )}

            {activeTab === 'reminders' && (
              <button 
                onClick={() => setIsReminderFormOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-semibold transition-all shadow-md shadow-blue-100"
              >
                <Plus size={18} />
                Thêm Nhắc Nhở
              </button>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-8">
          {activeTab === 'entry' && (
            <div className="bg-white rounded-[12px] border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-12">STT</th>
                      <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Thời gian</th>
                      <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Địa điểm</th>
                      <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nội dung</th>
                      <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hình thức</th>
                      <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Đơn vị</th>
                      <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Đối tượng</th>
                      <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Số người</th>
                      <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Phương tiện</th>
                      <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50 transition-all duration-200 group cursor-default">
                        <td className="px-4 py-4 text-sm font-medium text-slate-400 text-center">{record.stt}</td>
                        <td className="px-4 py-4 text-sm font-bold text-slate-700">{safeFormat(record.thoiGian, 'dd/MM/yyyy')}</td>
                        <td className="px-4 py-4 text-sm text-slate-600 max-w-[150px] truncate" title={record.diaDiem}>{record.diaDiem}</td>
                        <td className="px-4 py-4 text-sm font-medium text-slate-900 max-w-[250px] truncate" title={record.noiDung}>{record.noiDung}</td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 text-[10px] font-black rounded-md uppercase tracking-wider ${
                            record.hinhThuc === 'Tập huấn' ? 'bg-blue-100 text-blue-700' : 
                            record.hinhThuc === 'Phát thanh loa xã' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {record.hinhThuc}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                          {UNITS.find(u => u.id === record.unitId)?.name || 'N/A'}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600">{record.doiTuong}</td>
                        <td className="px-4 py-4 text-sm font-black text-slate-900 text-center">{record.soNguoi}</td>
                        <td className="px-4 py-4 text-sm text-slate-500 italic">{record.phuongTien}</td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => openEditForm(record)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              title="Sửa"
                            >
                              <Pencil size={14} />
                            </button>
                            <button 
                              onClick={() => deleteRecord(record.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Xóa"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {paginatedRecords.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-4 py-20 text-center text-slate-400 italic">
                          Chưa có dữ liệu. Hãy nhấn "Thêm Hoạt Động" để bắt đầu.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Trang {currentPage} / {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <button 
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => prev - 1)}
                      className="p-2 rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-transparent hover:border-slate-200"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button 
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      className="p-2 rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-transparent hover:border-slate-200"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'report' && (
            <div className="space-y-8">
              {/* Report Header */}
              <div className="text-center space-y-2 mb-10">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">BÁO CÁO TRUYỀN THÔNG GDSK</h2>
                <p className="text-slate-500 font-medium text-lg">Thời gian: {reportTitle}</p>
              </div>

              {reportRecords.length === 0 ? (
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
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-white to-blue-50/30 p-8 rounded-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:shadow-[0_20px_50px_rgba(37,99,235,0.1)] transition-all duration-500">
                  <div className="absolute -right-6 -top-6 w-32 h-32 bg-blue-500/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                  <div className="flex items-center gap-5 mb-6 relative z-10">
                    <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 group-hover:rotate-6 transition-transform duration-300">
                      <LayoutDashboard size={28} />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Tổng số buổi</p>
                      <p className="text-4xl font-black text-slate-900 tracking-tighter">{reportSummary.totalSessions}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-600 relative z-10">
                    <span className="px-2 py-0.5 bg-blue-100 rounded-full">Hoạt động</span>
                    <span className="text-slate-400 font-medium">đã thực hiện</span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-white to-emerald-50/30 p-8 rounded-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:shadow-[0_20px_50px_rgba(16,185,129,0.1)] transition-all duration-500">
                  <div className="absolute -right-6 -top-6 w-32 h-32 bg-emerald-500/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                  <div className="flex items-center gap-5 mb-6 relative z-10">
                    <div className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200 group-hover:rotate-6 transition-transform duration-300">
                      <Users size={28} />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Tổng số người</p>
                      <p className="text-4xl font-black text-slate-900 tracking-tighter">{reportSummary.totalPeople.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 relative z-10">
                    <span className="px-2 py-0.5 bg-emerald-100 rounded-full">Lượt tiếp cận</span>
                    <span className="text-slate-400 font-medium">trong kỳ</span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-white to-amber-50/30 p-8 rounded-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:shadow-[0_20px_50px_rgba(245,158,11,0.1)] transition-all duration-500">
                  <div className="absolute -right-6 -top-6 w-32 h-32 bg-amber-500/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                  <div className="flex items-center gap-5 mb-6 relative z-10">
                    <div className="w-14 h-14 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200 group-hover:rotate-6 transition-transform duration-300">
                      <CheckCircle2 size={28} />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Trung bình</p>
                      <p className="text-4xl font-black text-slate-900 tracking-tighter">
                        {reportSummary.totalSessions > 0 
                          ? (reportSummary.totalPeople / reportSummary.totalSessions).toFixed(1) 
                          : 0}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-600 relative z-10">
                    <span className="px-2 py-0.5 bg-amber-100 rounded-full">Hiệu suất</span>
                    <span className="text-slate-400 font-medium">người/buổi</span>
                  </div>
                </div>
              </div>

              {/* Charts Row 1: Trend and Type */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 my-8">
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2 group">
                    <span className="w-1.5 h-6 bg-blue-600 rounded-full group-hover:h-8 transition-all duration-300"></span>
                    <span className="border-b-2 border-blue-500/20 pb-1">Xu Hướng Theo Thời Gian</span>
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={statsByDate}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{fontSize: 10, fill: THEME_COLORS.subtext}}
                          tickFormatter={(val) => val.split('-').slice(1).reverse().join('/')}
                        />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: THEME_COLORS.subtext}} />
                        <Tooltip 
                          contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                        />
                        <Line type="monotone" dataKey="value" stroke={THEME_COLORS.primary} strokeWidth={3} dot={{r: 4, fill: THEME_COLORS.primary, strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2 group">
                    <span className="w-1.5 h-6 bg-blue-600 rounded-full group-hover:h-8 transition-all duration-300"></span>
                    <span className="border-b-2 border-blue-500/20 pb-1">Phân Bổ Theo Hình Thức</span>
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statsByHinhThuc}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: THEME_COLORS.subtext}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: THEME_COLORS.subtext}} />
                        <Tooltip 
                          contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                        />
                        <Bar dataKey="value" fill={THEME_COLORS.secondary} radius={[4, 4, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Charts Row 2: Unit (Admin Only) & Target Audience */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {currentUser.role === 'admin' && (
                  <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2 group">
                      <span className="w-1.5 h-6 bg-blue-600 rounded-full group-hover:h-8 transition-all duration-300"></span>
                      <span className="border-b-2 border-blue-500/20 pb-1">Thống Kê Theo Đơn Vị</span>
                    </h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={statsByUnit} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                          <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: THEME_COLORS.subtext}} />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: THEME_COLORS.subtext}} width={150} />
                          <Tooltip 
                            contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                          />
                          <Bar dataKey="value" fill={THEME_COLORS.primaryLight} radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2 group">
                    <span className="w-1.5 h-6 bg-blue-600 rounded-full group-hover:h-8 transition-all duration-300"></span>
                    <span className="border-b-2 border-blue-500/20 pb-1">Cơ Cấu Đối Tượng</span>
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
              </div>

              {/* Summary Table */}
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm mb-8">
                <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2 group">
                  <span className="w-1.5 h-6 bg-blue-600 rounded-full group-hover:h-8 transition-all duration-300"></span>
                  <span className="border-b-2 border-blue-500/20 pb-1">Bảng Tổng Hợp Phân Loại</span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200">
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Hình thức truyền thông</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Số buổi</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Số người tham gia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Object.entries(reportSummary.byType).map(([type, val]) => (
                        <tr key={type} className="hover:bg-blue-50/80 even:bg-slate-50/50 transition-all duration-200">
                          <td className="px-6 py-4 text-sm font-medium text-slate-700">{type}</td>
                          <td className="px-6 py-4 text-sm font-bold text-slate-900 text-center">{val.sessions}</td>
                          <td className="px-6 py-4 text-sm font-bold text-blue-600 text-center">{val.people}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50/50 font-bold">
                        <td className="px-6 py-4 text-sm text-slate-900 uppercase">Tổng cộng</td>
                        <td className="px-6 py-4 text-sm text-slate-900 text-center">{reportSummary.totalSessions}</td>
                        <td className="px-6 py-4 text-sm text-blue-700 text-center">{reportSummary.totalPeople}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Unit Summary Table (Admin Only) */}
              {currentUser.role === 'admin' && (
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm mb-8">
                  <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2 group">
                    <span className="w-1.5 h-6 bg-blue-600 rounded-full group-hover:h-8 transition-all duration-300"></span>
                    <span className="border-b-2 border-blue-500/20 pb-1">Bảng Tổng Hợp Theo Đơn Vị</span>
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200">
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Đơn vị</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Số buổi</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Số người tham gia</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {Object.entries(reportSummary.byUnit).map(([unit, val]) => (
                          <tr key={unit} className="hover:bg-blue-50/80 even:bg-slate-50/50 transition-all duration-200">
                            <td className="px-6 py-4 text-sm font-medium text-slate-700">{unit}</td>
                            <td className="px-6 py-4 text-sm font-bold text-slate-900 text-center">{val.sessions}</td>
                            <td className="px-6 py-4 text-sm font-bold text-blue-600 text-center">{val.people}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
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
                          className={`p-2 rounded-lg transition-colors ${reminder.hoanThanh ? 'text-emerald-500 bg-emerald-50' : 'text-slate-300 hover:bg-slate-50 hover:text-blue-600'}`}
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
      <div id="print-area" className="p-8 hidden print:block">
        {reportRecords.length > 0 ? (
          <>
            <div className="flex justify-between items-start mb-8">
              <div className="text-center space-y-1">
                <p className="font-bold uppercase text-[10pt]">SỞ Y TẾ .................................</p>
                <p className="font-bold uppercase text-[10pt]">TTYT ...................................</p>
                <p className="font-bold uppercase text-[10pt]">TRẠM Y TẾ: {UNITS.find(u => u.id === currentUser.unitId)?.name.toUpperCase() || '.......................'}</p>
              </div>
              <div className="text-center space-y-1">
                <p className="font-bold uppercase text-[10pt]">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                <p className="font-bold text-[10pt] border-b border-black pb-1 inline-block">Độc lập - Tự do - Hạnh phúc</p>
                <p className="text-[9pt] mt-2 block">Mẫu số: A11/YTCS</p>
              </div>
            </div>

            <h1 className="text-2xl font-black text-center mb-2 uppercase tracking-tight">SỔ GHI CHÉP HOẠT ĐỘNG TRUYỀN THÔNG GIÁO DỤC SỨC KHỎE</h1>
            <p className="text-center mb-10 italic subtitle text-sm">Thời gian: {reportTitle}</p>
            
            <table className="w-full border-collapse border-2 border-black text-[9pt]">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border-2 border-black p-2 w-8">STT</th>
                  <th className="border-2 border-black p-2 w-24">Ngày, tháng</th>
                  <th className="border-2 border-black p-2 w-32">Địa điểm</th>
                  <th className="border-2 border-black p-2">Nội dung truyền thông</th>
                  <th className="border-2 border-black p-2 w-28">Hình thức truyền thông</th>
                  <th className="border-2 border-black p-2 w-28">Đối tượng truyền thông</th>
                  <th className="border-2 border-black p-2 w-16">Số người tham dự</th>
                  <th className="border-2 border-black p-2 w-16">Thời lượng (phút)</th>
                  <th className="border-2 border-black p-2 w-24">Phương tiện truyền thông</th>
                  <th className="border-2 border-black p-2 w-24">Người thực hiện</th>
                  <th className="border-2 border-black p-2 w-24">Ký xác nhận</th>
                  <th className="border-2 border-black p-2 w-24">Ghi chú</th>
                </tr>
                <tr className="bg-slate-100 text-[8pt]">
                  <td className="border-2 border-black p-1 text-center italic">1</td>
                  <td className="border-2 border-black p-1 text-center italic">2</td>
                  <td className="border-2 border-black p-1 text-center italic">3</td>
                  <td className="border-2 border-black p-1 text-center italic">4</td>
                  <td className="border-2 border-black p-1 text-center italic">5</td>
                  <td className="border-2 border-black p-1 text-center italic">6</td>
                  <td className="border-2 border-black p-1 text-center italic">7</td>
                  <td className="border-2 border-black p-1 text-center italic">8</td>
                  <td className="border-2 border-black p-1 text-center italic">9</td>
                  <td className="border-2 border-black p-1 text-center italic">10</td>
                  <td className="border-2 border-black p-1 text-center italic">11</td>
                  <td className="border-2 border-black p-1 text-center italic">12</td>
                </tr>
              </thead>
              <tbody>
                {reportRecords.map(r => (
                  <tr key={r.id}>
                    <td className="border-2 border-black p-2 text-center font-medium">{r.stt}</td>
                    <td className="border-2 border-black p-2 text-center">{safeFormat(r.thoiGian, 'dd/MM/yyyy')}</td>
                    <td className="border-2 border-black p-2">{r.diaDiem}</td>
                    <td className="border-2 border-black p-2">{r.noiDung}</td>
                    <td className="border-2 border-black p-2">{r.hinhThuc}</td>
                    <td className="border-2 border-black p-2">{r.doiTuong}</td>
                    <td className="border-2 border-black p-2 text-center">{r.soNguoi}</td>
                    <td className="border-2 border-black p-2 text-center">{r.thoiLuong}</td>
                    <td className="border-2 border-black p-2">{r.phuongTien}</td>
                    <td className="border-2 border-black p-2">{r.staff}</td>
                    <td className="border-2 border-black p-2">{r.signature}</td>
                    <td className="border-2 border-black p-2">{r.ghiChu}</td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="font-bold bg-slate-50">
                  <td colSpan={6} className="border-2 border-black p-2 text-right uppercase">Tổng cộng:</td>
                  <td className="border-2 border-black p-2 text-center">{reportSummary.totalPeople}</td>
                  <td colSpan={5} className="border-2 border-black p-2"></td>
                </tr>
              </tbody>
            </table>

            <div className="mt-12 grid grid-cols-2 text-center">
              <div className="space-y-20">
                <p className="font-bold uppercase">Trưởng trạm</p>
                <div className="h-20"></div>
                <p className="font-bold">...................................</p>
              </div>
              <div className="space-y-20">
                <p className="font-bold italic">Ngày ...... tháng ...... năm 202...</p>
                <p className="font-bold uppercase">Người lập sổ</p>
                <div className="h-20"></div>
                <p className="font-bold">{currentUser.name}</p>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-20 italic text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl">
            Không có hoạt động nào trong thời gian này
          </div>
        )}
      </div>

      {/* Modal Form */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
              <h3 className="text-xl font-bold text-slate-900">{editingRecord ? 'Cập Nhật Hoạt Động' : 'Thêm Hoạt Động Truyền Thông'}</h3>
              <button onClick={() => { setIsFormOpen(false); setEditingRecord(null); }} className="text-slate-400 hover:text-slate-600 transition-colors">
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
                  onClick={() => { setIsFormOpen(false); setEditingRecord(null); }}
                  className="flex-1 px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                >
                  Hủy Bỏ
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  {editingRecord ? 'Cập Nhật' : 'Lưu Hoạt Động'}
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
    </div>
  );
}
