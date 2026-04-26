import React, { useEffect, useState } from 'react';
import { api } from '~/services/api';
import { useNavigate } from 'react-router-dom';

interface Resource {
  _id: string;
  title: string;
  url: string;
  description?: string;
  type?: string;
  tags?: string[];
}

export default function ResourcesLibrary() {
  const navigate = useNavigate();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [activeFilter, setActiveFilter] = useState('all');
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = [
    { id: 'all', label: 'All Fields' },
    { id: 'frontend', label: 'Frontend' },
    { id: 'backend', label: 'Backend' },
    { id: 'ai', label: 'AI & Data' },
    { id: 'security', label: 'Security' },
    { id: 'devops', label: 'DevOps' }
  ];

  const types = [
    { id: 'all', label: 'All Types', icon: 'apps' },
    { id: 'video', label: 'Videos', icon: 'play_circle' },
    { id: 'document', label: 'Docs', icon: 'description' },
    { id: 'course', label: 'Courses', icon: 'school' }
  ];

  const fetchResources = async (search = '', p = 0, type = 'all', category = 'all') => {
    setLoading(true);
    try {
      const res = await api.get('/resources', {
        params: { 
          q: search, 
          page: p, 
          limit: 12,
          type: type !== 'all' ? type : undefined,
          category: category !== 'all' ? category : undefined
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
      fetchResources(searchTerm, 0, activeFilter, activeCategory);
      setPage(0);
    }, 200);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, activeFilter, activeCategory]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchResources(searchTerm, newPage, activeFilter, activeCategory);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cleanDescription = (desc: string | undefined, title: string) => {
    // Xử lý tiêu đề cho tự nhiên (nếu là câu hỏi thì dẫn dắt khác)
    const topicDisplay = title.endsWith('?') ? `chủ đề "${title}"` : title;
    const fallback = `Tài liệu này cung cấp cái nhìn chuyên sâu và giải đáp các vấn đề cốt lõi về ${topicDisplay}, giúp bạn xây dựng nền tảng vững chắc trong lộ trình học tập.`;
    
    if (!desc || desc.length < 5) return fallback;
    
    const words = desc.trim().split(/\s+/);
    const hyphenCount = (desc.match(/-/g) || []).length;
    
    // Thuật toán bắt rác: Nếu số dấu gạch nối >= số từ, hoặc quá ít từ mà có gạch nối -> Chắc chắn là Tag rác
    const isTagTrash = hyphenCount >= words.length || (words.length < 4 && desc.includes('-')) || desc.includes('--');
    const isTooShort = words.length < 3;
    
    if (isTagTrash || isTooShort) return fallback;

    // Loại bỏ các cụm từ vô nghĩa thường gặp
    const uselessPhrases = [/resource for/gi, /link to/gi, /documentation for/gi, /tutorial about/gi];
    let cleaned = desc;
    uselessPhrases.forEach(p => cleaned = cleaned.replace(p, ''));
    
    if (cleaned.trim().length < 20) {
      return `Nghiên cứu về ${topicDisplay} giúp bạn nắm vững các khái niệm và ứng dụng thực tế, chuẩn bị hành trang cho những thử thách tiếp theo.`;
    }
    
    return cleaned.trim();
  };

  return (
    <div className="bg-[#f7f9fb] font-['Inter'] text-[#2d3337] antialiased min-h-screen">
      <main className="pt-32 pb-24 max-w-7xl mx-auto px-8">
        {/* Hero Section */}
        <div className="mb-12">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
            <div>
              <h1 className="text-4xl font-black font-['Manrope'] tracking-tight mb-4 text-[#2d3337]">Knowledge Library</h1>
              <p className="text-lg text-[#596063] max-w-xl leading-relaxed">
                Khai thác kho tàng <span className="text-[#3856c4] font-bold">20.000+</span> tài liệu, video và khóa học được AI tinh lọc dành riêng cho sự nghiệp của bạn.
              </p>
            </div>
            
            {/* Search Bar */}
            <div className="relative w-full lg:max-w-md group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#acb3b7] group-focus-within:text-[#3856c4] transition-colors">search</span>
              <input 
                type="text"
                placeholder="Tìm kiếm kỹ năng, công cụ, hoặc từ khóa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-[#eaedff] rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-4 focus:ring-[#3856c4]/5 focus:border-[#3856c4] shadow-sm transition-all"
              />
            </div>
          </div>

          {/* Filters Area */}
          <div className="space-y-6">
            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all border ${
                    activeCategory === cat.id 
                      ? 'bg-[#2d3337] text-white border-[#2d3337] shadow-lg shadow-[#2d3337]/20' 
                      : 'bg-white text-[#596063] border-[#eaedff] hover:border-[#3856c4] hover:text-[#3856c4]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Type Filter */}
            <div className="flex flex-wrap gap-4 items-center">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#acb3b7]">Resource Type:</span>
              <div className="flex gap-2">
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
              {resources.length > 0 ? resources.map((r) => (
                <a 
                  key={r._id} 
                  href={r.url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="bg-white rounded-2xl p-6 transition-all hover:shadow-xl hover:-translate-y-1 group border border-transparent hover:border-[#3856c4]/10 flex flex-col h-full"
                  style={{ boxShadow: '0 4px 20px rgba(45,51,55,0.03)' }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[#eaedff] flex items-center justify-center text-[#3856c4]">
                      <span className="material-symbols-outlined">{r.type?.toLowerCase().includes('video') ? 'play_circle' : 'article'}</span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#acb3b7] group-hover:text-[#3856c4] transition-colors">{r.type || 'Article'}</span>
                  </div>
                  <h3 className="font-['Manrope'] font-black text-lg mb-3 text-[#2d3337] line-clamp-2 group-hover:text-[#3856c4] transition-colors leading-tight">{r.title}</h3>
                  <p className="text-sm text-[#596063] line-clamp-3 mb-6 leading-relaxed">
                    {cleanDescription(r.description, r.title)}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-auto">
                    {r.tags?.slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="px-2.5 py-1 bg-[#f1f4f6] text-[#596063] text-[10px] font-bold rounded-lg group-hover:bg-[#3856c4]/5 transition-colors">#{tag}</span>
                    ))}
                  </div>
                </a>
              )) : (
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
