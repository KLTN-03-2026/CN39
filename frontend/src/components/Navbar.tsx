import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '~/context/AuthContext';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Nếu chưa đăng nhập thì không hiện Navbar này (hoặc hiện kiểu khác)
  if (!isAuthenticated) return null;

  const navLinks = [
    { name: 'Career Paths', path: '/dashboard', active: location.pathname === '/dashboard' },
    { name: 'Resources', path: '/resources', active: location.pathname === '/resources' },
  ];

  return (
    <header className="fixed top-0 w-full z-50 bg-[#f7f9fb]/90 backdrop-blur-2xl border-b border-[#eaedff] h-20 flex items-center">
      <div className="max-w-7xl mx-auto px-8 w-full flex items-center justify-between">
        {/* Logo */}
        <div 
          className="text-2xl font-black font-['Manrope'] text-[#2d3337] cursor-pointer flex items-center gap-3 tracking-tighter"
          onClick={() => navigate('/dashboard')}
        >
          <div className="w-10 h-10 bg-[#3856c4] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#3856c4]/20">
            <span className="material-symbols-outlined font-bold">rocket_launch</span>
          </div>
          <span className="hidden sm:block">Path For Student</span>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-10">
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.name}
                onClick={() => navigate(link.path)}
                className={`text-[13px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                  link.active ? 'text-[#3856c4]' : 'text-[#acb3b7] hover:text-[#3856c4]'
                }`}
              >
                <span className="material-symbols-outlined text-lg">
                  {link.name === 'Resources' ? 'library_books' : 'explore'}
                </span>
                {link.name}
              </button>
            ))}
          </div>

          {/* User Profile Area */}
          <div className="flex items-center gap-4 pl-8 border-l border-[#eaedff]">
            <div className="hidden lg:flex flex-col items-end">
              <span className="text-xs font-black text-[#2d3337] uppercase tracking-tighter">{user?.fullName || 'Student'}</span>
              <span className="text-[10px] text-[#acb3b7] font-bold">Beta Explorer</span>
            </div>
            
            <div className="relative group">
              <div className="w-11 h-11 rounded-2xl bg-[#eaedff] text-[#3856c4] flex items-center justify-center font-black border-2 border-white shadow-sm cursor-pointer group-hover:shadow-md transition-all">
                {user?.fullName?.charAt(0).toUpperCase() || 'S'}
              </div>
              
              {/* Logout Dropdown (Hover) */}
              <div className="absolute right-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                <div className="bg-white border border-[#eaedff] rounded-2xl shadow-2xl p-2 min-w-[160px]">
                   <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-[#ac3149] hover:bg-[#ac3149]/5 rounded-xl transition-all"
                   >
                     <span className="material-symbols-outlined text-lg">logout</span>
                     Logout
                   </button>
                </div>
              </div>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
