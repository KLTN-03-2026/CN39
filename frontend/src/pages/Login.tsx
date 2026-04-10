import React, { useState } from 'react';
import { api } from '~/services/api';
import { useAuth } from '~/context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.data.user, res.data.accessToken);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại. Kiểm tra lại kết nối Database.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-dark-bg)] p-4 relative overflow-hidden font-sans">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--color-neon-purple)] rounded-full mix-blend-screen filter blur-[150px] opacity-20 pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--color-neon-blue)] rounded-full mix-blend-screen filter blur-[150px] opacity-20 pointer-events-none"></div>
        
        <div className="glass-panel w-full max-w-md p-8 relative z-10 border border-[var(--color-neon-blue)]/20 hover:border-[var(--color-neon-blue)]/60 shadow-[0_0_30px_rgba(0,243,255,0.05)] transition-all duration-500">
            <h2 className="text-3xl font-black text-center mb-2 text-gradient">AI MENTOR</h2>
            <p className="text-center text-xs text-gray-500 tracking-widest uppercase mb-8">Access Terminal</p>
            
            {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-6 text-sm text-center">{error}</div>}
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                   <label className="block text-xs font-bold text-gray-400 mb-1 tracking-widest uppercase">Email</label>
                   <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                     className="w-full bg-black/50 border border-[var(--color-glass-border)] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[var(--color-neon-blue)] focus:shadow-[0_0_15px_rgba(0,243,255,0.2)] transition-all"
                   />
                </div>
                <div>
                   <label className="block text-xs font-bold text-gray-400 mb-1 tracking-widest uppercase">Mật khẩu</label>
                   <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                     className="w-full bg-black/50 border border-[var(--color-glass-border)] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[var(--color-neon-blue)] focus:shadow-[0_0_15px_rgba(0,243,255,0.2)] transition-all"
                   />
                </div>
                <button type="submit" disabled={loading}
                    className="mt-6 w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-[var(--color-neon-purple)] to-[var(--color-neon-blue)] hover:opacity-90 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(176,38,255,0.4)] hover:shadow-[0_0_25px_rgba(0,243,255,0.6)] uppercase tracking-wider"
                >
                    {loading ? 'Đang xác thực...' : 'KHỞI ĐỘNG HỆ THỐNG'}
                </button>
            </form>
            <p className="mt-6 text-center text-sm text-gray-400">
                Chưa có mã định danh? <Link to="/register" className="text-[var(--color-neon-blue)] hover:underline font-bold">Đăng ký ngay</Link>
            </p>
        </div>
    </div>
  );
}
