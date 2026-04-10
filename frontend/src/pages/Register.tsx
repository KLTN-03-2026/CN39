import React, { useState } from 'react';
import { api } from '~/services/api';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await api.post('/auth/register', { fullName, email, password });
      alert("Đăng ký thành công! Hãy đăng nhập hệ thống.");
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Đăng ký thất bại. Email đã tồn tại?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-dark-bg)] p-4 relative overflow-hidden font-sans">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--color-neon-pink)] rounded-full mix-blend-screen filter blur-[150px] opacity-10 pointer-events-none"></div>
        
        <div className="glass-panel w-full max-w-md p-8 relative z-10 border border-[var(--color-neon-purple)]/20 hover:border-[var(--color-neon-purple)]/60 shadow-[0_0_30px_rgba(176,38,255,0.05)] transition-all duration-500">
            <h2 className="text-3xl font-black text-center mb-2 text-gradient">ĐĂNG KÝ HỆ TRÍ TUỆ</h2>
            <p className="text-center text-xs text-gray-500 tracking-widest uppercase mb-8">Tạo mã định danh mới</p>
            
            {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-6 text-sm text-center">{error}</div>}
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                   <label className="block text-xs font-bold text-gray-400 mb-1 tracking-widest uppercase">Họ và Tên</label>
                   <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required
                     className="w-full bg-black/50 border border-[var(--color-glass-border)] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[var(--color-neon-purple)] focus:shadow-[0_0_15px_rgba(176,38,255,0.2)] transition-all"
                   />
                </div>
                <div>
                   <label className="block text-xs font-bold text-gray-400 mb-1 tracking-widest uppercase">Email</label>
                   <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                     className="w-full bg-black/50 border border-[var(--color-glass-border)] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[var(--color-neon-purple)] focus:shadow-[0_0_15px_rgba(176,38,255,0.2)] transition-all"
                   />
                </div>
                <div>
                   <label className="block text-xs font-bold text-gray-400 mb-1 tracking-widest uppercase">Mật khẩu</label>
                   <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                     className="w-full bg-black/50 border border-[var(--color-glass-border)] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[var(--color-neon-purple)] focus:shadow-[0_0_15px_rgba(176,38,255,0.2)] transition-all"
                   />
                </div>
                <button type="submit" disabled={loading}
                    className="mt-6 w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-[var(--color-neon-pink)] to-[var(--color-neon-purple)] hover:opacity-90 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(247,37,133,0.4)] hover:shadow-[0_0_25px_rgba(176,38,255,0.6)] uppercase tracking-wider"
                >
                    {loading ? 'Đang tạo...' : 'GHI DANH HỆ THỐNG'}
                </button>
            </form>
            <p className="mt-6 text-center text-sm text-gray-400">
                Đã có tài khoản? <Link to="/login" className="text-[var(--color-neon-purple)] hover:underline font-bold">Quay lại Đăng nhập</Link>
            </p>
        </div>
    </div>
  );
}
