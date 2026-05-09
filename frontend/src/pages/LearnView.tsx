import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '~/services/api';
import { getTypeConfig } from '~/constants/typeConfig';

// ═══════════════════════════════════════════════════════
//  LearnView — Trang học cho từng topic
//  Cập nhật: đọc topic từ DB, dùng topicSlug (oldId)
// ═══════════════════════════════════════════════════════

const YoutubeVideoCard = ({ r }: { r: any }) => {
  const match = r.url?.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
  const ytId = (match && match[2].length === 11) ? match[2] : null;
  const thumbnailUrl = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : '';
  
  const [channelName, setChannelName] = useState<string>('YouTube Video');
  
  useEffect(() => {
    if (r.url) {
      fetch(`https://noembed.com/embed?url=${encodeURIComponent(r.url)}`)
        .then(res => res.json())
        .then(data => { if (data.author_name) setChannelName(data.author_name); })
        .catch(() => {});
    }
  }, [r.url]);

  return (
    <a href={r.url} target="_blank" rel="noreferrer"
      className="bg-white rounded-2xl overflow-hidden border border-[#e6e8ea] hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col"
    >
      <div className="h-44 bg-[#1a1d1f] relative overflow-hidden">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1a1d1f] to-[#2d3337] flex items-center justify-center">
            <span className="material-symbols-outlined text-white/50 text-5xl">play_circle</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:bg-[#dc2626] transition-all">
            <span className="material-symbols-outlined text-white text-2xl ml-1">play_arrow</span>
          </div>
        </div>
      </div>
      <div className="p-5 flex-1 flex flex-col justify-center">
        <h3 className="font-bold text-[15px] mb-2 group-hover:text-[#dc2626] transition-colors line-clamp-2 leading-snug">
          {r.title}
        </h3>
        <div className="mt-auto flex items-center justify-between border-t border-[#f1f4f6] pt-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#fef2f2] flex items-center justify-center">
              <span className="material-symbols-outlined text-[14px] text-[#dc2626]">smart_display</span>
            </div>
            <span className="text-[11px] font-bold text-[#dc2626] uppercase line-clamp-1">{channelName}</span>
          </div>
          <span className="material-symbols-outlined text-sm text-[#dc2626] transform group-hover:translate-x-1 transition-transform">arrow_forward</span>
        </div>
      </div>
    </a>
  );
};

export default function LearnView() {
  // Params: id = roadmapId, topicId = topicOldId (slug)
  const { id: roadmapId, topicId: topicSlug } = useParams<{ id: string; topicId: string }>();
  const navigate = useNavigate();
  
  const [topic, setTopic] = useState<any>(null);
  const [resources, setResources] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'resources' | 'tutor'>('resources');
  
  // Roadmap & Status state
  const [roadmapData, setRoadmapData] = useState<any>(null);
  const [currentStatus, setCurrentStatus] = useState<string>('pending');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  
  // AI Tutor state
  const [chatMsg, setChatMsg] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: string; text: string }[]>([]);
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Bookmark state
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  // Translated description
  const [translatedDesc, setTranslatedDesc] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState(false);

  // Fetch bookmarked resource IDs
  useEffect(() => {
    if (roadmapId) {
      api.get(`/roadmaps/${roadmapId}/bookmarks`)
        .then(res => {
          const ids = (res.data?.resources || []).map((r: any) => r._id);
          setBookmarkedIds(new Set(ids));
        })
        .catch(() => {});
    }
  }, [roadmapId]);

  const toggleBookmark = async (resourceId: string) => {
    if (!roadmapId) return;
    try {
      const res = await api.patch(`/roadmaps/${roadmapId}/bookmark/${resourceId}`);
      setBookmarkedIds(prev => {
        const next = new Set(prev);
        if (res.data?.bookmarked) next.add(resourceId);
        else next.delete(resourceId);
        return next;
      });
    } catch {}
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (!roadmapId) return;
        // Lấy roadmap + topics
        const res = await api.get(`/roadmaps/${roadmapId}`);
        const allTopics: any[] = res.data?.topics || [];
        setRoadmapData(res.data?.roadmapData || null);
        
        // Cập nhật status
        if (topicSlug && res.data?.roadmapData?.topicStatuses?.[topicSlug]) {
          setCurrentStatus(res.data.roadmapData.topicStatuses[topicSlug]);
        }
        
        // Tìm topic theo oldId (slug)
        const found = allTopics.find((t: any) => t.oldId === topicSlug);
        setTopic(found || null);

        // Lấy resources thuộc topic này
        if (found?.resourceIds?.length > 0) {
          // Fetch resources by IDs (có thể gọi API riêng hoặc dùng search)
          const resData = await api.get('/resources', {
            params: { topicOldId: topicSlug, limit: 50 }
          });
          setResources(resData.data?.resources || []);
        } else {
          // Fallback: tìm theo topic_id
          const resData = await api.get('/resources', {
            params: { q: topicSlug, limit: 20 }
          });
          setResources(resData.data?.resources || []);
        }
      } catch (err) {
        console.error('Failed to fetch learn data', err);
      }
      setIsLoading(false);
    };
    fetchData();
  }, [roadmapId, topicSlug]);

  // Translate description
  useEffect(() => {
    if (topic?.description) {
      setTranslatedDesc('');
      setIsTranslating(true);
      api.post('/roadmaps/chat', {
        message: `Dịch nội dung sau sang tiếng Việt tự nhiên, chuyên ngành IT. Chỉ trả về kết quả dịch: ${topic.description}`,
        topicSlug: topicSlug,
        roadmapId
      }).then(res => setTranslatedDesc(res.data.reply))
        .catch(() => setTranslatedDesc(topic.description))
        .finally(() => setIsTranslating(false));
    }
  }, [topic?.oldId]);

  // Load chat history
  useEffect(() => {
    if (roadmapId && topicSlug) {
      api.get(`/roadmaps/chat/history/${roadmapId}/${topicSlug}`)
        .then(res => setChatHistory(res.data.history || []))
        .catch(() => {});
    }
  }, [roadmapId, topicSlug]);

  const handleStatusChange = async (newStatus: string) => {
    if (!roadmapId || !topicSlug) return;
    setIsUpdatingStatus(true);
    setCurrentStatus(newStatus);
    try {
      await api.patch(`/roadmaps/${roadmapId}/topics/${topicSlug}/status`, { status: newStatus });
      toast.success('Đã cập nhật trạng thái');
    } catch {
      toast.error('Lỗi cập nhật trạng thái');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  useEffect(() => {
    if (roadmapId && topicSlug) {
      api.get(`/roadmaps/chat/history/${roadmapId}/${topicSlug}`)
        .then(res => setChatHistory(res.data.history || []))
        .catch(() => {});
    }
  }, [roadmapId, topicSlug]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const sendMessage = async () => {
    if (!chatMsg.trim() || isSending) return;
    const msg = chatMsg.trim();
    setChatMsg('');
    setChatHistory(prev => [...prev, { role: 'user', text: msg }]);
    setIsSending(true);
    try {
      const res = await api.post('/roadmaps/chat', {
        message: msg,
        topicSlug: topicSlug,
        roadmapId
      });
      setChatHistory(prev => [...prev, { role: 'model', text: res.data.reply }]);
    } catch {
      setChatHistory(prev => [...prev, { role: 'model', text: 'AI Tutor đang tạm gián đoạn.' }]);
    }
    setIsSending(false);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#3856c4] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4">
        <span className="material-symbols-outlined text-5xl text-[#acb3b7]">error</span>
        <h2 className="text-lg font-bold">Không tìm thấy Chủ đề</h2>
        <button onClick={() => navigate(-1)} className="text-sm text-[#3856c4] font-bold hover:underline">Quay lại</button>
      </div>
    );
  }

  // Phân loại resources
  const classifiedResources = resources.map((r: any) => {
    let type = r.type || 'article';
    if (type === 'article' || type === 'feed') {
      if (r.url?.includes('youtube.com') || r.url?.includes('youtu.be')) type = 'video';
      else if (r.url?.includes('coursera.org') || r.url?.includes('udemy.com') || r.url?.includes('edx.org')) type = 'course';
      else if (r.url?.includes('github.com')) type = 'opensource';
      else if (r.url?.includes('docs') || r.url?.includes('developer.')) type = 'official';
    }
    return { ...r, type };
  });

  const officialResources = classifiedResources.filter(r => r.type === 'official');
  const videoResources = classifiedResources.filter(r => r.type === 'video');
  const articleResources = classifiedResources.filter(r => r.type === 'article' || r.type === 'feed');
  const courseResources = classifiedResources.filter(r => r.type === 'course');
  const openSourceResources = classifiedResources.filter(r => r.type === 'opensource');
  const roadmapResources = classifiedResources.filter(r => r.type === 'roadmap');

  return (
    <div className="pt-6 pb-24 px-6 md:px-12 lg:px-16 max-w-5xl mx-auto">
      
      {/* Back + Tab */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate(`/roadmap/${roadmapId}`)}
          className="flex items-center gap-2 text-sm text-[#6f767e] font-bold hover:text-[#1a1d1f] transition-colors"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span> Quay lại Lộ trình
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('resources')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'resources' ? 'bg-[#3856c4] text-white' : 'bg-white text-[#6f767e] border border-[#e6e8ea]'
            }`}
          >
            <span className="material-symbols-outlined text-base">auto_stories</span> Tài liệu
          </button>
          <button
            onClick={() => setActiveTab('tutor')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'tutor' ? 'bg-[#3856c4] text-white' : 'bg-white text-[#6f767e] border border-[#e6e8ea]'
            }`}
          >
            <span className="material-symbols-outlined text-base">psychology</span> AI Tutor
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="mb-10">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-3">
          <h1 className="text-3xl md:text-4xl font-black font-['Manrope'] tracking-tight flex-1">{topic.title}</h1>
          
          {/* Status Selector */}
          <div className="flex items-center gap-2 shrink-0 bg-white border border-[#e6e8ea] rounded-xl p-1.5 shadow-sm">
            {[
              { id: 'pending', label: 'Pending', icon: 'radio_button_unchecked', color: '#acb3b7' },
              { id: 'in_progress', label: 'In Progress', icon: 'pending', color: '#3856c4' },
              { id: 'done', label: 'Done', icon: 'check_circle', color: '#00b341' },
              { id: 'skip', label: 'Skip', icon: 'skip_next', color: '#d97706' },
            ].map(s => (
              <button
                key={s.id}
                onClick={() => handleStatusChange(s.id)}
                disabled={isUpdatingStatus}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  currentStatus === s.id 
                    ? 'bg-[#f4f6fb] ring-1 ring-black/5' 
                    : 'hover:bg-[#f8fafc]'
                }`}
                style={{ color: currentStatus === s.id ? s.color : '#6f767e' }}
              >
                <span className="material-symbols-outlined text-sm">{s.icon}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {roadmapData?.topicNotes?.[topicSlug] && (
          <div className="mb-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#fef3c7] text-[#d97706] uppercase tracking-wider">
            <span className="material-symbols-outlined text-sm">star</span>
            Ghi chú từ AI: {roadmapData.topicNotes[topicSlug]}
          </div>
        )}

        {topic.description && (
          <p className={`text-[#6f767e] text-base leading-relaxed max-w-3xl whitespace-pre-wrap transition-opacity ${isTranslating ? 'opacity-50' : ''}`}>
            {translatedDesc || topic.description}
          </p>
        )}
      </div>

      {/* ═══ RESOURCES TAB ═══ */}
      {activeTab === 'resources' && (
        <div className="space-y-12">

          {/* Skill Roadmap Links */}
          {roadmapResources.length > 0 && (
            <section>
              <h2 className="text-xl font-black font-['Manrope'] mb-5 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ea580c]">route</span>
                Lộ Trình Chuyên Sâu
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roadmapResources.map((r: any, i: number) => (
                  <a key={i} href={r.url} target="_blank" rel="noreferrer"
                    className="bg-gradient-to-r from-[#1a1d1f] to-[#2d3337] text-white rounded-2xl p-5 flex items-center gap-4 hover:shadow-xl hover:-translate-y-0.5 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                      <span className="material-symbols-outlined">route</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm">{r.title}</p>
                      <p className="text-[10px] text-white/60 uppercase tracking-wider">Lộ trình dành riêng</p>
                    </div>
                    <span className="material-symbols-outlined text-white/40 group-hover:text-white transition-colors">open_in_new</span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Official */}
          {officialResources.length > 0 && (
            <section>
              <h3 className="text-lg font-bold font-['Manrope'] mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0d9488] text-base">verified</span> Official
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {officialResources.map((r: any, i: number) => (
                  <div key={i} className="bg-white rounded-2xl p-5 border border-[#e6e8ea] hover:border-[#0d9488]/30 hover:shadow-lg hover:-translate-y-0.5 transition-all group relative">
                    <button
                      onClick={() => toggleBookmark(r._id)}
                      className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#f1f4f6] transition-all"
                      title={bookmarkedIds.has(r._id) ? 'Bỏ bookmark' : 'Bookmark'}
                    >
                      <span className="material-symbols-outlined text-lg" style={{ color: bookmarkedIds.has(r._id) ? '#d97706' : '#acb3b7', fontVariationSettings: bookmarkedIds.has(r._id) ? "'FILL' 1" : "'FILL' 0" }}>
                        bookmark
                      </span>
                    </button>
                    <a href={r.url} target="_blank" rel="noreferrer">
                      <div className="w-9 h-9 rounded-xl bg-[#f0fdfa] flex items-center justify-center text-[#0d9488] mb-3">
                        <span className="material-symbols-outlined text-lg">verified</span>
                      </div>
                      <h3 className="font-bold text-sm mb-1 group-hover:text-[#0d9488] transition-colors line-clamp-2 pr-8">{r.title}</h3>
                    </a>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Videos */}
          {videoResources.length > 0 && (
            <section>
              <h3 className="text-lg font-bold font-['Manrope'] mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#dc2626] text-base">play_circle</span> Video Youtube
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {videoResources.map((r: any, i: number) => <YoutubeVideoCard key={i} r={r} />)}
              </div>
            </section>
          )}

          {/* Articles */}
          {articleResources.length > 0 && (
            <section>
              <h3 className="text-lg font-bold font-['Manrope'] mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#3856c4] text-base">article</span> Articles
              </h3>
              <div className="space-y-3">
                {articleResources.map((r: any, i: number) => {
                  const cfg = getTypeConfig(r.type);
                  return (
                    <div key={i}
                      className="flex items-center gap-4 bg-white rounded-xl px-5 py-4 border border-[#e6e8ea] hover:border-[#3856c4]/20 hover:shadow transition-all group"
                    >
                      <a href={r.url} target="_blank" rel="noreferrer" className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                          <span className="material-symbols-outlined text-base">{cfg.icon}</span>
                        </div>
                        <span className="text-sm font-semibold group-hover:text-[#3856c4] transition-colors flex-1 truncate">{r.title}</span>
                      </a>
                      <button
                        onClick={() => toggleBookmark(r._id)}
                        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#f1f4f6] transition-all"
                      >
                        <span className="material-symbols-outlined text-lg" style={{ color: bookmarkedIds.has(r._id) ? '#d97706' : '#acb3b7', fontVariationSettings: bookmarkedIds.has(r._id) ? "'FILL' 1" : "'FILL' 0" }}>
                          bookmark
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Open Source */}
          {openSourceResources.length > 0 && (
            <section>
              <h3 className="text-lg font-bold font-['Manrope'] mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#24292f] text-base">code</span> Open Source
              </h3>
              <div className="space-y-3">
                {openSourceResources.map((r: any, i: number) => (
                  <a key={i} href={r.url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-4 bg-white rounded-xl px-5 py-4 border border-[#e6e8ea] hover:shadow transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[#f6f8fa] text-[#24292f]">
                      <span className="material-symbols-outlined text-base">code</span>
                    </div>
                    <span className="text-sm font-semibold group-hover:text-[#3856c4] transition-colors flex-1 truncate">{r.title}</span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Courses */}
          {courseResources.length > 0 && (
            <section>
              <h3 className="text-lg font-bold font-['Manrope'] mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#7c3aed] text-base">school</span> Courses
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {courseResources.map((r: any, i: number) => (
                  <a key={i} href={r.url} target="_blank" rel="noreferrer"
                    className="bg-white rounded-2xl p-5 border border-[#e6e8ea] hover:border-[#7c3aed]/30 hover:shadow-lg transition-all group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#f5f3ff] flex items-center justify-center text-[#7c3aed] mb-3">
                      <span className="material-symbols-outlined text-lg">school</span>
                    </div>
                    <h3 className="font-bold text-sm group-hover:text-[#7c3aed] transition-colors line-clamp-2">{r.title}</h3>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* No resources */}
          {classifiedResources.length === 0 && (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-5xl text-[#e6e8ea] mb-3">search_off</span>
              <p className="text-[#acb3b7]">Chưa có tài liệu nào cho chủ đề này</p>
            </div>
          )}

          {/* AI Tutor Banner */}
          <div className="bg-gradient-to-r from-[#3856c4] to-[#6366f1] rounded-2xl p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-2xl">psychology</span>
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Gặp khó khăn?</h3>
                <p className="text-white/70 text-sm">AI Tutor đã được đào tạo chuyên sâu về '{topic.title}'</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('tutor')}
              className="px-6 py-2.5 bg-white text-[#3856c4] font-bold text-sm rounded-xl hover:bg-white/90 transition-all shrink-0"
            >
              Bắt Đầu Trò Chuyện
            </button>
          </div>
        </div>
      )}

      {/* ═══ AI TUTOR TAB ═══ */}
      {activeTab === 'tutor' && (
        <div className="bg-white rounded-2xl border border-[#e6e8ea] overflow-hidden" style={{ minHeight: '60vh' }}>
          <div className="p-6 border-b border-[#f1f4f6] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3856c4] to-[#6366f1] flex items-center justify-center text-white">
              <span className="material-symbols-outlined">psychology</span>
            </div>
            <div>
              <p className="font-bold text-sm">AI Tutor</p>
              <p className="text-[10px] text-[#acb3b7]">Chuyên môn về {topic.title}</p>
            </div>
          </div>

          <div className="p-6 space-y-4 max-h-[50vh] overflow-y-auto">
            {chatHistory.length === 0 && (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-5xl text-[#e6e8ea] mb-3">forum</span>
                <p className="text-sm text-[#acb3b7]">Hỏi bất cứ điều gì về <strong>{topic.title}</strong></p>
              </div>
            )}
            {chatHistory.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] text-sm p-4 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-[#1a1d1f] text-white rounded-br-none'
                    : 'bg-[#f4f4f4] text-[#1a1d1f] rounded-bl-none'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex justify-start">
                <div className="bg-[#f4f4f4] px-5 py-3 rounded-2xl text-xs text-[#acb3b7] italic animate-pulse">
                  AI đang trả lời...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 border-t border-[#f1f4f6] flex gap-3">
            <input
              type="text"
              value={chatMsg}
              onChange={e => setChatMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder={`Hỏi về ${topic.title}...`}
              className="flex-1 bg-[#f4f4f4] border-none rounded-xl px-5 py-3 text-sm focus:ring-2 focus:ring-[#3856c4] transition-all"
            />
            <button
              onClick={sendMessage}
              disabled={isSending}
              className="w-12 h-12 rounded-xl bg-[#1a1d1f] text-white flex items-center justify-center hover:bg-[#3856c4] transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined">send</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
