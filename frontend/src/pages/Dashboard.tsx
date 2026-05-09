import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '~/context/AuthContext';
import { api } from '~/services/api';

/**
 * Dashboard — Home page (sau khi đăng nhập)
 * Hiển thị: Welcome + roadmap đang học + quick actions
 */
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [latestRoadmap, setLatestRoadmap] = useState<any>(null);
  const [allRoadmaps, setAllRoadmaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [latestRes, allRes] = await Promise.all([
          api.get('/roadmaps/latest'),
          api.get('/roadmaps/my')
        ]);
        setLatestRoadmap(latestRes.data?.roadmapData || null);
        setAllRoadmaps(allRes.data?.roadmaps || []);
      } catch {}
      setLoading(false);
    };
    fetchData();
  }, []);

  // Tính progress từ topicStatuses
  const getStats = (rm: any) => {
    const statuses = rm?.topicStatuses || {};
    const total = Object.keys(statuses).length;
    const done = Object.values(statuses).filter((s: any) => s === 'done').length;
    const inProgress = Object.values(statuses).filter((s: any) => s === 'in_progress').length;
    const skipped = Object.values(statuses).filter((s: any) => s === 'skip').length;
    const remaining = total - done - skipped;
    const percent = total > 0 ? Math.round(((done + skipped) / total) * 100) : 0;
    return { total, done, inProgress, skipped, remaining, percent };
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#3856c4] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const latestStats = getStats(latestRoadmap);

  return (
    <div className="pt-10 pb-24 px-8 max-w-6xl mx-auto">
      
      {/* ═══ Welcome Header ═══ */}
      <div className="mb-12">
        <p className="text-sm text-[#acb3b7] font-bold mb-1">{greeting()}</p>
        <h1 className="text-3xl font-black font-['Manrope'] tracking-tight">
          {user?.fullName || 'Learner'} 👋
        </h1>
      </div>

      {/* ═══ Currently Learning Card ═══ */}
      {latestRoadmap ? (
        <div className="mb-12">
          <h2 className="text-sm font-black uppercase tracking-wider text-[#acb3b7] mb-4">Đang học</h2>
          <div
            onClick={() => navigate(`/roadmap/${latestRoadmap._id}`)}
            className="bg-gradient-to-r from-[#1a1d1f] to-[#2d3337] rounded-3xl p-8 text-white cursor-pointer hover:shadow-2xl transition-all group relative overflow-hidden"
          >
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-black font-['Manrope'] mb-1">{latestRoadmap.name || 'Untitled Roadmap'}</h3>
                  <p className="text-white/50 text-sm">{latestStats.total} topics</p>
                </div>
                <span className="text-4xl font-black">{latestStats.percent}%</span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-gradient-to-r from-[#3856c4] via-[#6366f1] to-[#8b5cf6] rounded-full transition-all duration-700"
                  style={{ width: `${latestStats.percent}%` }}
                />
              </div>

              <div className="flex items-center gap-6 text-xs font-bold">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#00b341]" /> {latestStats.done} done
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#3856c4]" /> {latestStats.inProgress} in progress
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#d97706]" /> {latestStats.skipped} skipped
                </span>
                <span className="text-white/30">{latestStats.remaining} remaining</span>
              </div>
            </div>

            {/* Decorative */}
            <span className="absolute -right-6 -bottom-6 material-symbols-outlined text-[120px] text-white/5 group-hover:scale-110 transition-transform">
              route
            </span>
          </div>
        </div>
      ) : (
        <div className="mb-12">
          <div className="bg-white rounded-3xl p-12 text-center border border-[#f1f4f6]">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-[#3856c4] to-[#6366f1] flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-white text-4xl">add_circle</span>
            </div>
            <h3 className="text-xl font-black font-['Manrope'] mb-2">Bắt đầu hành trình</h3>
            <p className="text-[#6f767e] mb-6">Tạo lộ trình cá nhân hóa dựa trên CV của bạn</p>
            <button
              onClick={() => navigate('/new-roadmap')}
              className="px-8 py-3 bg-[#1a1d1f] text-white font-bold rounded-2xl hover:bg-[#3856c4] transition-all"
            >
              Tạo Roadmap đầu tiên
            </button>
          </div>
        </div>
      )}

      {/* ═══ Quick Actions ═══ */}
      <div className="mb-12">
        <h2 className="text-sm font-black uppercase tracking-wider text-[#acb3b7] mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: 'add_circle', label: 'New Roadmap', path: '/new-roadmap', color: '#3856c4' },
            { icon: 'map', label: 'My Roadmaps', path: '/my-roadmaps', color: '#6366f1' },
            { icon: 'local_library', label: 'Library', path: '/resources', color: '#0d9488' },
            { icon: 'bookmark', label: 'Saved', path: '/bookmarks', color: '#d97706' },
          ].map(action => (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className="bg-white rounded-2xl p-5 border border-[#f1f4f6] hover:shadow-lg hover:-translate-y-0.5 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ backgroundColor: `${action.color}15`, color: action.color }}>
                <span className="material-symbols-outlined">{action.icon}</span>
              </div>
              <p className="text-sm font-bold group-hover:text-[#3856c4] transition-colors">{action.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ═══ All Roadmaps (nếu có > 1) ═══ */}
      {allRoadmaps.length > 1 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-[#acb3b7]">Tất cả lộ trình</h2>
            <button onClick={() => navigate('/my-roadmaps')} className="text-xs font-bold text-[#3856c4] hover:underline">
              Xem tất cả →
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allRoadmaps.slice(0, 3).map(rm => {
              const s = getStats(rm);
              return (
                <div
                  key={rm._id}
                  onClick={() => navigate(`/roadmap/${rm._id}`)}
                  className="bg-white rounded-2xl p-5 border border-[#f1f4f6] hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-sm truncate group-hover:text-[#3856c4] transition-colors">
                      {rm.name}
                    </h4>
                    <span className="text-lg font-black text-[#3856c4]">{s.percent}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#f1f4f6] rounded-full overflow-hidden">
                    <div className="h-full bg-[#3856c4] rounded-full transition-all" style={{ width: `${s.percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
