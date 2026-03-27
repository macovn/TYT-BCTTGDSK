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
  CalendarDays
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
import html2pdf from 'html2pdf.js';
import { 
  HealthCommunicationRecord, 
  Reminder,
  HINH_THUC_OPTIONS, 
  DOI_TUONG_OPTIONS, 
  PHUONG_TIEN_OPTIONS 
} from './types';
import { exportToExcel, exportToWord } from './lib/export';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function App() {
  const [records, setRecords] = useState<HealthCommunicationRecord[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [activeTab, setActiveTab] = useState<'entry' | 'report' | 'reminders'>('entry');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isReminderFormOpen, setIsReminderFormOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

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
    nguoiThucHien: '',
    ghiChu: '',
  });

  // Load data from localStorage
  useEffect(() => {
    const savedRecords = localStorage.getItem('health_comm_records');
    const savedReminders = localStorage.getItem('health_comm_reminders');
    
    if (savedRecords) setRecords(JSON.parse(savedRecords));
    if (savedReminders) setReminders(JSON.parse(savedReminders));

    if (!savedRecords) {
      // Sample data
      const sample: HealthCommunicationRecord[] = [
        {
          id: '1',
          stt: 1,
          thoiGian: '2026-03-10',
          diaDiem: 'Hội trường UBND xã',
          noiDung: 'Phòng chống sốt xuất huyết',
          hinhThuc: 'Nói chuyện chuyên đề',
          doiTuong: 'Toàn dân',
          soNguoi: 45,
          phuongTien: 'Slide trình chiếu',
          thoiLuong: '60 phút',
          nguoiThucHien: 'BS. Nguyễn Văn A',
          ghiChu: '',
        },
        {
          id: '2',
          stt: 2,
          thoiGian: '2026-03-15',
          diaDiem: 'Trạm Y tế',
          noiDung: 'Tiêm chủng mở rộng',
          hinhThuc: 'Tư vấn trực tiếp',
          doiTuong: 'Phụ nữ 15–49',
          soNguoi: 12,
          phuongTien: 'Tờ rơi',
          thoiLuong: '15 phút',
          nguoiThucHien: 'YS. Trần Thị B',
          ghiChu: '',
        }
      ];
      setRecords(sample);
      localStorage.setItem('health_comm_records', JSON.stringify(sample));
    }

    if (!savedReminders) {
      const sampleReminders: Reminder[] = [
        {
          id: 'r1',
          tieuDe: 'Truyền thông phòng chống HIV',
          ngay: format(new Date(), 'yyyy-MM-dd'),
          loai: 'KeHoach',
          moTa: 'Tổ chức tại trường THCS',
          hoanThanh: false
        }
      ];
      setReminders(sampleReminders);
      localStorage.setItem('health_comm_reminders', JSON.stringify(sampleReminders));
    }
  }, []);

  // Save data to localStorage
  useEffect(() => {
    if (records.length > 0) {
      localStorage.setItem('health_comm_records', JSON.stringify(records));
    }
  }, [records]);

  useEffect(() => {
    localStorage.setItem('health_comm_reminders', JSON.stringify(reminders));
  }, [reminders]);

  const handleAddRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const newRecord: HealthCommunicationRecord = {
      ...(formData as HealthCommunicationRecord),
      id: Date.now().toString(),
      stt: records.length + 1,
    };
    setRecords([...records, newRecord]);
    setIsFormOpen(false);
    // Reset form
    setFormData({
      thoiGian: format(new Date(), 'yyyy-MM-dd'),
      diaDiem: '',
      noiDung: '',
      hinhThuc: HINH_THUC_OPTIONS[0],
      doiTuong: DOI_TUONG_OPTIONS[0],
      soNguoi: 0,
      phuongTien: PHUONG_TIEN_OPTIONS[0],
      thoiLuong: '',
      nguoiThucHien: '',
      ghiChu: '',
    });
  };

  const deleteRecord = (id: string) => {
    const updated = records.filter(r => r.id !== id).map((r, index) => ({ ...r, stt: index + 1 }));
    setRecords(updated);
  };

  const [reminderFormData, setReminderFormData] = useState<Partial<Reminder>>({
    tieuDe: '',
    ngay: format(new Date(), 'yyyy-MM-dd'),
    loai: 'KeHoach',
    moTa: '',
  });

  const handleAddReminder = (e: React.FormEvent) => {
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
  };

  // Report calculations
  const filteredRecords = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return records.filter(r => isWithinInterval(new Date(r.thoiGian), { start, end }));
  }, [records, currentMonth]);

  const statsByHinhThuc = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach(r => {
      counts[r.hinhThuc] = (counts[r.hinhThuc] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredRecords]);

  const statsByDoiTuong = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach(r => {
      counts[r.doiTuong] = (counts[r.doiTuong] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredRecords]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    const element = document.getElementById('print-area');
    if (!element) return;

    const opt: any = {
      margin: [20, 20, 20, 30], // top, right, bottom, left (mm)
      filename: 'So_GDSK_A11.pdf',
      image: { type: 'jpeg', quality: 1 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'landscape'
      }
    };

    html2pdf().set(opt).from(element).save();
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
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Trạm Y tế Xã/Phường</p>
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
                onClick={() => exportToExcel(records)}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-xs font-medium"
                title="Xuất Excel"
              >
                <FileSpreadsheet size={16} />
                Excel
              </button>
              <button 
                onClick={() => exportToWord(records)}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-xs font-medium"
                title="Xuất Word"
              >
                <FileText size={16} />
                Word
              </button>
              <button 
                onClick={handleExportPDF}
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
            {activeTab === 'report' && (
              <div className="flex items-center bg-slate-100 rounded-lg p-1">
                <button 
                  onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
                  className="p-1 hover:bg-white rounded transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-3 text-sm font-semibold min-w-[100px] text-center">
                  Tháng {format(currentMonth, 'MM/yyyy')}
                </span>
                <button 
                  onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
                  className="p-1 hover:bg-white rounded transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>

          {activeTab === 'entry' && (
            <button 
              onClick={() => setIsFormOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-semibold transition-all shadow-md shadow-indigo-100"
            >
              <Plus size={18} />
              Thêm Hoạt Động
            </button>
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
                        <td className="px-4 py-4 text-sm font-semibold text-slate-700">{format(new Date(record.thoiGian), 'dd/MM/yyyy')}</td>
                        <td className="px-4 py-4 text-sm text-slate-600">{record.diaDiem}</td>
                        <td className="px-4 py-4 text-sm font-medium text-slate-900">{record.noiDung}</td>
                        <td className="px-4 py-4">
                          <span className="px-2 py-1 bg-indigo-50 text-indigo-600 text-[11px] font-bold rounded-md uppercase tracking-wide">
                            {record.hinhThuc}
                          </span>
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
                  <p className="text-xs text-slate-500">Trong tháng {format(currentMonth, 'MM/yyyy')}</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                      <Users size={24} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tổng số người</p>
                      <p className="text-2xl font-black text-slate-900">
                        {filteredRecords.reduce((sum, r) => sum + r.soNguoi, 0)}
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
                        {statsByHinhThuc.length > 0 ? statsByHinhThuc.sort((a,b) => b.value - a.value)[0].name : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">Được thực hiện nhiều nhất</p>
                </div>
              </div>

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
              </div>
            </div>
          )}

          {activeTab === 'reminders' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reminders.sort((a, b) => new Date(a.ngay).getTime() - new Date(b.ngay).getTime()).map((reminder) => {
                const isOverdue = new Date(reminder.ngay) < new Date() && !reminder.hoanThanh;
                const isToday = format(new Date(reminder.ngay), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                
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
                            const updated = reminders.map(r => r.id === reminder.id ? { ...r, hoanThanh: !r.hoanThanh } : r);
                            setReminders(updated);
                          }}
                          className={`p-2 rounded-lg transition-colors ${reminder.hoanThanh ? 'text-emerald-500 bg-emerald-50' : 'text-slate-300 hover:bg-slate-50 hover:text-indigo-600'}`}
                        >
                          <CheckCircle2 size={18} />
                        </button>
                        <button 
                          onClick={() => {
                            const updated = reminders.filter(r => r.id !== reminder.id);
                            setReminders(updated);
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
                          {format(new Date(reminder.ngay), 'dd/MM/yyyy')}
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
        <h1 className="text-2xl font-bold text-center mb-2">SỔ THEO DÕI TRUYỀN THÔNG GDSK</h1>
        <p className="text-center mb-8 italic">Mẫu A11/TYT - Theo Thông tư 23/2019/TT-BYT</p>
        
        <table className="w-full border-collapse border border-black text-[10pt]">
          <thead>
            <tr>
              <th className="border border-black p-2">STT</th>
              <th className="border border-black p-2">Thời gian</th>
              <th className="border border-black p-2">Địa điểm</th>
              <th className="border border-black p-2">Nội dung</th>
              <th className="border border-black p-2">Hình thức</th>
              <th className="border border-black p-2">Đối tượng</th>
              <th className="border border-black p-2">Số người</th>
              <th className="border border-black p-2">Phương tiện</th>
              <th className="border border-black p-2">Thời lượng</th>
              <th className="border border-black p-2">Người thực hiện</th>
              <th className="border border-black p-2">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {records.map(r => (
              <tr key={r.id}>
                <td className="border border-black p-2 text-center">{r.stt}</td>
                <td className="border border-black p-2">{format(new Date(r.thoiGian), 'dd/MM/yyyy')}</td>
                <td className="border border-black p-2">{r.diaDiem}</td>
                <td className="border border-black p-2">{r.noiDung}</td>
                <td className="border border-black p-2">{r.hinhThuc}</td>
                <td className="border border-black p-2">{r.doiTuong}</td>
                <td className="border border-black p-2 text-center">{r.soNguoi}</td>
                <td className="border border-black p-2">{r.phuongTien}</td>
                <td className="border border-black p-2">{r.thoiLuong}</td>
                <td className="border border-black p-2">{r.nguoiThucHien}</td>
                <td className="border border-black p-2">{r.ghiChu}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
