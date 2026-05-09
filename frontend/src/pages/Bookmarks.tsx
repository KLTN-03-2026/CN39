import React, { useEffect, useState } from 'react';
import { api } from '~/services/api';
import { getTypeConfig } from '~/constants/typeConfig';

export default function Bookmarks() {
  const [roadmaps, setRoadmaps] = useState<any[]>([]);
  const [selectedRoadmap, setSelectedRoadmap] = useState<string>('');
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Lấy danh sách roadmaps
  useEffect(() => {
    api.get('/roadmaps/my')
      .then(res => {
        const rms = res.data?.roadmaps || [];
        setRoadmaps(rms);
        if (rms.length > 0) setSelectedRoadmap(rms[0]._id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Lấy bookmarks theo roadmap
  useEffect(() => {
    if (!selectedRoadmap) return;
    setLoading(true);
    api.get(`/roadmaps/${selectedRoadmap}/bookmarks`)
      .then(res => setResources(res.data?.resources || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedRoadmap]);

  return (
    <div className="pt-10 pb-24 px-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black font-['Manrope'] tracking-tight mb-2">Saved Resources</h1>
          <p className="text-[#6f767e]">Tài liệu bạn đã bookmark trong quá trình học</p>
        </div>
        {roadmaps.length > 1 && (
          <select
            value={selectedRoadmap}
            onChange={e => setSelectedRoadmap(e.target.value)}
            className="bg-white border border-[#e6e8ea] rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-[#3856c4]/10"
          >
            {roadmaps.map(rm => (
              <option key={rm._id} value={rm._id}>{rm.name}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-[#3856c4] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : resources.length === 0 ? (
        <div className="text-center py-20">
          <span className="material-symbols-outlined text-6xl text-[#e6e8ea] mb-4">bookmark_border</span>
          <p className="text-[#acb3b7]">Chưa có tài liệu nào được bookmark</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map(r => {
            const config = getTypeConfig(r.type);
            return (
              <a
                key={r._id}
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="bg-white rounded-2xl p-6 transition-all hover:shadow-xl hover:-translate-y-1 group border border-transparent hover:border-[#3856c4]/10 flex flex-col h-full"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: config.bg, color: config.color }}>
                    <span className="material-symbols-outlined">{config.icon}</span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: config.color }}>
                    {config.label}
                  </span>
                </div>
                <h3 className="font-['Manrope'] font-black text-lg mb-3 text-[#2d3337] line-clamp-2 group-hover:text-[#3856c4] transition-colors leading-tight">
                  {r.title}
                </h3>
                <p className="text-sm text-[#596063] line-clamp-3 leading-relaxed">
                  {r.description || ''}
                </p>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
