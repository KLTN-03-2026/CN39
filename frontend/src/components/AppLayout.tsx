import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '~/context/AuthContext';

/**
 * AppLayout — Sidebar cố định + Main content area
 * Sidebar thu gọn được (collapse ↔ expand)
 */
export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { path: '/new-roadmap', icon: 'add_circle', label: 'New Roadmap', accent: true },
    { path: '/dashboard', icon: 'home', label: 'Home' },
    { path: '/my-roadmaps', icon: 'map', label: 'My Roadmaps' },
    { path: '/resources', icon: 'local_library', label: 'Library' },
    { path: '/bookmarks', icon: 'bookmark', label: 'Saved' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen bg-[#f7f9fb] font-['Inter'] text-[#1a1d1f] antialiased">
      {/* ═══ SIDEBAR ═══ */}
      <aside className={`fixed top-0 left-0 h-full z-40 bg-white border-r border-[#f1f4f6] flex flex-col transition-all duration-300 ${
        collapsed ? 'w-[72px]' : 'w-[240px]'
      }`}>
        {/* Logo + Toggle */}
        <div className="flex items-center justify-between p-4 border-b border-[#f1f4f6]">
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3856c4] to-[#6366f1] flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-lg">route</span>
              </div>
              <span className="text-sm font-black font-['Manrope'] tracking-tight">RoadmapAI</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-8 h-8 rounded-lg hover:bg-[#f4f4f4] flex items-center justify-center text-[#acb3b7] hover:text-[#1a1d1f] transition-all"
          >
            <span className="material-symbols-outlined text-lg">
              {collapsed ? 'chevron_right' : 'chevron_left'}
            </span>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-3 w-full rounded-xl text-sm transition-all
                ${collapsed ? 'justify-center px-2 py-3' : 'px-4 py-3'}
                ${item.accent && !isActive
                  ? 'bg-gradient-to-r from-[#3856c4] to-[#6366f1] text-white font-bold shadow-lg shadow-[#3856c4]/20 hover:shadow-xl hover:shadow-[#3856c4]/30'
                  : isActive
                    ? 'bg-[#3856c4]/10 text-[#3856c4] font-bold'
                    : 'text-[#6f767e] hover:bg-[#f4f4f4] hover:text-[#1a1d1f]'
                }
              `}
              title={collapsed ? item.label : undefined}
            >
              <span className="material-symbols-outlined text-lg">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-[#f1f4f6]">
          {!collapsed && user && (
            <div className="px-4 py-2 mb-2">
              <p className="text-xs font-bold text-[#1a1d1f] truncate">{user.fullName}</p>
              <p className="text-[10px] text-[#acb3b7] truncate">{user.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 w-full rounded-xl text-sm text-[#6f767e] hover:bg-[#fef2f2] hover:text-[#dc2626] transition-all ${
              collapsed ? 'justify-center px-2 py-3' : 'px-4 py-3'
            }`}
            title={collapsed ? 'Logout' : undefined}
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            {!collapsed && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══ */}
      <main className={`flex-1 transition-all duration-300 ${collapsed ? 'ml-[72px]' : 'ml-[240px]'}`}>
        <Outlet />
      </main>
    </div>
  );
}
