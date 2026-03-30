import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, User, Lock, ShieldCheck } from 'lucide-react';
import { UNITS } from '../types';

const USERS = [
  { username: "admin", password: "123456", role: "admin", unitId: "tram-chinh" },
  { username: "doanket", password: "123456", role: "station", unitId: "doan-ket" },
  { username: "halong", password: "123456", role: "station", unitId: "ha-long" },
  { username: "daixuyen", password: "123456", role: "station", unitId: "dai-xuyen" },
  { username: "vanyen", password: "123456", role: "station", unitId: "van-yen" }
];

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      navigate('/');
    }
  }, [navigate]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = USERS.find(
      u => u.username === username && u.password === password
    );

    if (!user) {
      setError("Sai tài khoản hoặc mật khẩu");
      return;
    }

    localStorage.setItem("user", JSON.stringify(user));
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-blue-500/50">
            <ShieldCheck className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white text-center">Hệ thống Quản lý GDSK</h1>
          <p className="text-blue-200/60 text-sm mt-2">Đăng nhập để tiếp tục</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-blue-100 mb-2">Tên đăng nhập</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="text-blue-300/50" size={18} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-300/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Nhập username"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-100 mb-2">Mật khẩu</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="text-blue-300/50" size={18} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-300/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 text-sm p-3 rounded-lg text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <LogIn size={20} />
            Đăng nhập
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-white/10 text-center">
          <p className="text-blue-300/40 text-xs">
            &copy; 2026 Hệ thống Truyền thông Giáo dục Sức khỏe
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
