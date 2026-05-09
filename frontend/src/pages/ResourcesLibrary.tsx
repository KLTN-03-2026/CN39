import React, { useEffect, useState } from 'react';
import { api } from '~/services/api';
import { getTypeConfig } from '~/constants/typeConfig';

interface Resource {
  _id: string;
  title: string;
  url: string;
  description?: string;
  type?: string;
  topic_id?: string;
}

export default function ResourcesLibrary() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [activeFilter, setActiveFilter] = useState('all');

  const types = [
    { id: 'all',        label: 'All Types',   icon: 'apps' },
    { id: 'article',    label: 'Articles',    icon: 'article' },
    { id: 'video',      label: 'Videos',      icon: 'play_circle' },
    { id: 'official',   label: 'Official',    icon: 'verified' },
    { id: 'course',     label: 'Courses',     icon: 'school' },
    { id: 'opensource', label: 'Open Source',  icon: 'code' },
  ];

  const fetchResources = async (search = '', p = 0, type = 'all') => {
    setLoading(true);
    try {
      const res = await api.get('/resources', {
        params: { 
          q: search, 
          page: p, 
          limit: 12,
          type: type !== 'all' ? type : undefined
        }
      });
      setResources(res.data.resources || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (error) {
      console.error('Fetch resources error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchResources(searchTerm, 0, activeFilter);
      setPage(0);
    }, 200);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, activeFilter]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchResources(searchTerm, newPage, activeFilter);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Xử lý click resource: nếu type = roadmap thì navigate nội bộ, còn lại mở tab mới
  const handleResourceClick = (r: Resource, e: React.MouseEvent) => {
    if (r.type === 'roadmap' && r.url.startsWith('/roadmap/preview/')) {
      e.preventDefault();
      window.open(r.url, '_blank');
    }
  };


  return (
    <div className="font-['Inter'] text-[#2d3337] antialiased min-h-screen">
      <main className="pt-10 pb-24 max-w-7xl mx-auto px-8">
        {/* Hero Section */}
        <div className="mb-12">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
            <div>
              <h1 className="text-4xl font-black font-['Manrope'] tracking-tight mb-4 text-[#2d3337]">Thư viện Tài liệu</h1>
              <p className="text-lg text-[#596063] max-w-xl leading-relaxed">
                Khai thác kho tàng <span className="text-[#3856c4] font-bold">11.000+</span> tài liệu, video và khóa học được phân loại chi tiết dành riêng cho lộ trình nghề nghiệp của bạn.
              </p>
            </div>
          </div>
            
          {/* Controls (Search + Type Filter) */}
          <div className="space-y-6 bg-white p-6 rounded-3xl border border-[#f1f4f6] shadow-sm">
            {/* Search Bar */}
            <div className="relative w-full group">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#acb3b7] group-focus-within:text-[#3856c4] transition-colors">search</span>
              <input 
                type="text"
                placeholder="Tìm kiếm kỹ năng, công cụ, hoặc từ khóa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#f7f9fb] border-none rounded-2xl py-4 pl-14 pr-6 text-sm focus:outline-none focus:ring-4 focus:ring-[#3856c4]/10 transition-all font-medium text-[#2d3337] placeholder:text-[#acb3b7]"
              />
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#acb3b7]">Loại tài liệu:</span>
              <div className="flex gap-2 flex-wrap">
                {types.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveFilter(t.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      activeFilter === t.id 
                        ? 'bg-[#3856c4]/10 text-[#3856c4]' 
                        : 'text-[#acb3b7] hover:bg-[#f1f4f6] hover:text-[#596063]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Resources Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-[#3856c4] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {resources.length > 0 ? resources.map((r) => {
                const config = getTypeConfig(r.type);
                return (
                  <a 
                    key={r._id} 
                    href={r.url} 
                    target="_blank" 
                    rel="noreferrer"
                    onClick={(e) => handleResourceClick(r, e)}
                    className="bg-white rounded-2xl p-6 transition-all hover:shadow-xl hover:-translate-y-1 group border border-transparent hover:border-[#3856c4]/10 flex flex-col h-full"
                    style={{ boxShadow: '0 4px 20px rgba(45,51,55,0.03)' }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: config.bg, color: config.color }}>
                        <span className="material-symbols-outlined">{config.icon}</span>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] transition-colors" style={{ color: config.color }}>
                        {config.label}
                      </span>
                    </div>
                    <h3 className="font-['Manrope'] font-black text-lg mb-3 text-[#2d3337] line-clamp-2 group-hover:text-[#3856c4] transition-colors leading-tight">
                      {r.title}
                    </h3>
                    <p className="text-sm text-[#596063] line-clamp-3 mb-6 leading-relaxed">
                      {r.description || ''}
                    </p>
                    {r.topic_id && (
                      <div className="flex flex-wrap gap-2 mt-auto">
                        <span className="px-2.5 py-1 bg-[#f1f4f6] text-[#596063] text-[10px] font-bold rounded-lg group-hover:bg-[#3856c4]/5 transition-colors">
                          #{r.topic_id}
                        </span>
                      </div>
                    )}
                  </a>
                );
              }) : (
                <div className="col-span-full py-20 text-center">
                  <span className="material-symbols-outlined text-5xl text-[#acb3b7] mb-4">search_off</span>
                  <p className="text-[#596063]">No resources found matching your search.</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4">
                <button 
                  disabled={page === 0}
                  onClick={() => handlePageChange(page - 1)}
                  className="w-10 h-10 rounded-xl border border-[#e6e8ea] flex items-center justify-center text-[#596063] hover:bg-white hover:border-[#3856c4] hover:text-[#3856c4] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <span className="text-sm font-medium text-[#596063]">
                  Page <span className="text-[#2d3337] font-bold">{page + 1}</span> of {totalPages}
                </span>
                <button 
                  disabled={page >= totalPages - 1}
                  onClick={() => handlePageChange(page + 1)}
                  className="w-10 h-10 rounded-xl border border-[#e6e8ea] flex items-center justify-center text-[#596063] hover:bg-white hover:border-[#3856c4] hover:text-[#3856c4] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
