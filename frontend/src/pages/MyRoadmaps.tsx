import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '~/services/api';

export default function MyRoadmaps() {
  const navigate = useNavigate();
  const [roadmaps, setRoadmaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/roadmaps/my')
      .then(res => setRoadmaps(res.data?.roadmaps || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Tính progress từ topicStatuses
  const getStats = (rm: any) => {
    const statuses = rm.topicStatuses || {};
    const total = Object.keys(statuses).length;
    const done = Object.values(statuses).filter((s: any) => s === 'done').length;
    const skipped = Object.values(statuses).filter((s: any) => s === 'skip').length;
    const percent = total > 0 ? Math.round(((done + skipped) / total) * 100) : 0;
    return { total, done, skipped, percent };
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#3856c4] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pt-10 pb-24 px-8 max-w-6xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-black font-['Manrope'] tracking-tight mb-2">My Roadmaps</h1>
        <p className="text-[#6f767e]">Quản lý tất cả lộ trình học tập của bạn</p>
      </div>

      {roadmaps.length === 0 ? (
        <div className="text-center py-20">
          <span className="material-symbols-outlined text-6xl text-[#e6e8ea] mb-4">map</span>
          <p className="text-[#acb3b7] mb-6">Bạn chưa có lộ trình nào</p>
          <button
            onClick={() => navigate('/new-roadmap')}
            className="px-6 py-3 bg-[#3856c4] text-white font-bold rounded-2xl hover:bg-[#2d47a8] transition-all"
          >
            Tạo Roadmap đầu tiên
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roadmaps.map(rm => {
            const stats = getStats(rm);
            return (
              <div
                key={rm._id}
                onClick={() => navigate(`/roadmap/${rm._id}`)}
                className="bg-white rounded-2xl p-6 border border-[#f1f4f6] hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3856c4] to-[#6366f1] flex items-center justify-center">
                    <span className="material-symbols-outlined text-white">route</span>
                  </div>
                  <span className="text-2xl font-black text-[#3856c4]">{stats.percent}%</span>
                </div>
                <h3 className="font-black font-['Manrope'] text-lg mb-2 group-hover:text-[#3856c4] transition-colors line-clamp-2">
                  {rm.name || 'Untitled Roadmap'}
                </h3>
                {/* Mini progress bar */}
                <div className="w-full h-2 bg-[#f1f4f6] rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-gradient-to-r from-[#3856c4] to-[#6366f1] rounded-full transition-all duration-500"
                    style={{ width: `${stats.percent}%` }}
                  />
                </div>
                <div className="flex items-center gap-4 text-[11px] text-[#acb3b7] font-bold">
                  <span>{stats.done} done</span>
                  <span>{stats.skipped} skipped</span>
                  <span>{stats.total} total</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
