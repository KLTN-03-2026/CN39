import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '~/services/api';

// ═══════════ Sidebar Focus (Redesigned) ═══════════
function SidebarFocus({ 
  topic, 
  roadmapId, 
  onClose, 
  onDeepDive 
}: { 
  topic: any; 
  roadmapId?: string; 
  onClose: () => void;
  onDeepDive: (slug: string, newTab: boolean) => void;
}) {
  const [tab, setTab] = useState<'resources' | 'tutor'>('resources');
  const [chatMsg, setChatMsg] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: string; text: string }[]>([]);
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  if (!topic) return null;

  const topicId = topic.topicId || topic._id;
  const resources = topic.resources || [];
  const skillRoadmapSlug = topic.skillRoadmapSlug || (topic.title?.toLowerCase().replace(/\s+/g, '-')); // Fallback logic

  useEffect(() => {
    if (roadmapId && topicId) {
      api.get(`/roadmaps/chat/history/${roadmapId}/${topicId}`)
        .then(res => setChatHistory(res.data.history || []))
        .catch(() => {});
    }
  }, [roadmapId, topicId]);

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
      const res = await api.post('/roadmaps/chat', { message: msg, topic: topicId, roadmapId });
      setChatHistory(prev => [...prev, { role: 'model', text: res.data.reply }]);
    } catch { 
      setChatHistory(prev => [...prev, { role: 'model', text: 'AI Mentor is temporarily unavailable.' }]); 
    }
    setIsSending(false);
  };

  return (
    <div className="bg-white rounded-[2.5rem] sticky top-28 overflow-hidden border border-[#eaedff] shadow-[0_30px_70px_rgba(0,0,0,0.06)] flex flex-col h-[calc(100vh-140px)] w-full max-w-[550px] ml-auto animate-in slide-in-from-right-10 duration-500">
      {/* Top Nav Tabs */}
      <div className="flex p-4 gap-2 bg-white border-b border-[#f1f4f6]">
        <button 
          onClick={() => setTab('resources')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all ${tab === 'resources' ? 'bg-[#1a1d1f] text-white shadow-lg' : 'text-[#6f767e] hover:bg-[#f4f4f4]'}`}
        >
          <span className="material-symbols-outlined text-lg">auto_stories</span>
          Resources
        </button>
        <button 
          onClick={() => setTab('tutor')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all ${tab === 'tutor' ? 'bg-[#1a1d1f] text-white shadow-lg' : 'text-[#6f767e] hover:bg-[#f4f4f4]'}`}
        >
          <span className="material-symbols-outlined text-lg">psychology</span>
          AI Tutor
        </button>
        
        <div className="flex-1 flex justify-end items-center gap-3 pr-2">
           <select className="bg-[#f4f4f4] border-none rounded-xl px-4 py-2 text-xs font-bold text-[#6f767e] focus:ring-0">
              <option>Pending</option>
              <option>In Progress</option>
              <option>Completed</option>
           </select>
           <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 text-[#acb3b7] hover:text-red-500 transition-all">✕</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
        {tab === 'resources' ? (
          <div className="animate-in fade-in duration-500">
            <h2 className="text-4xl font-black font-['Manrope'] text-[#1a1d1f] mb-6 leading-tight">{topic.title}</h2>
            <p className="text-[#6f767e] text-base leading-relaxed mb-10">
              {topic.description || "Learn the fundamental principles and advanced techniques of this topic to master your career path."}
            </p>

            {/* Resources List */}
            <div className="space-y-8">
               <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#f1f4f6]"></div></div>
                  <div className="relative flex justify-start"><span className="pr-4 bg-white text-[10px] font-black text-[#00b341] uppercase tracking-widest flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-[#00b341] flex items-center justify-center text-[10px] text-white">♥</span> Free Resources
                  </span></div>
               </div>

               <div className="space-y-4">
                  {/* Skill Roadmap Item */}
                  <div className="flex items-center justify-between group p-1">
                    <div className="flex items-center gap-4">
                       <span className="bg-[#1a1d1f] text-white text-[9px] font-black px-2 py-1 rounded uppercase">Roadmap</span>
                       <button 
                         onClick={() => onDeepDive(skillRoadmapSlug, false)}
                         className="text-sm font-bold text-[#1a1d1f] hover:underline decoration-2 underline-offset-4"
                       >
                         Visit Dedicated {topic.title} Roadmap
                       </button>
                    </div>
                    <button 
                      onClick={() => onDeepDive(skillRoadmapSlug, true)}
                      className="material-symbols-outlined text-[#acb3b7] hover:text-[#1a1d1f] transition-colors"
                      title="Open in new tab"
                    >
                      open_in_new
                    </button>
                  </div>

                  {resources.map((r: any, i: number) => (
                    <div key={i} className="flex items-center justify-between group p-1">
                      <div className="flex items-center gap-4">
                        <span className={`text-white text-[9px] font-black px-2 py-1 rounded uppercase ${
                          r.type?.toLowerCase().includes('video') ? 'bg-[#f44336]' : 
                          r.type?.toLowerCase().includes('course') ? 'bg-[#ff9800]' : 'bg-[#2196f3]'
                        }`}>
                          {r.type || 'Article'}
                        </span>
                        <a href={r.url} target="_blank" rel="noreferrer" className="text-sm font-bold text-[#1a1d1f] hover:underline decoration-2 underline-offset-4">
                          {r.title || r.label}
                        </a>
                      </div>
                      <span className="material-symbols-outlined text-[#acb3b7] opacity-0 group-hover:opacity-100 transition-opacity text-sm">north_east</span>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full animate-in fade-in duration-500">
             <div className="flex-1 space-y-6 mb-6">
                {chatHistory.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] text-sm p-5 rounded-[1.5rem] leading-relaxed shadow-sm ${
                      m.role === 'user' ? 'bg-[#1a1d1f] text-white rounded-br-none' : 'bg-[#f4f4f4] text-[#1a1d1f] rounded-bl-none'
                    }`}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {isSending && <div className="flex justify-start"><div className="bg-[#f4f4f4] px-5 py-3 rounded-2xl text-xs text-[#acb3b7] italic animate-pulse">AI is typing...</div></div>}
                <div ref={chatEndRef} />
             </div>
             
             <div className="mt-auto pt-4 border-t border-[#f1f4f6] flex gap-3">
                <input 
                  type="text" 
                  value={chatMsg} 
                  onChange={e => setChatMsg(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Ask AI Mentor anything..." 
                  className="flex-1 bg-[#f4f4f4] border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-[#1a1d1f] transition-all"
                />
                <button onClick={sendMessage} className="w-14 h-14 rounded-2xl bg-[#1a1d1f] text-white flex items-center justify-center hover:scale-105 transition-all shadow-lg">
                  <span className="material-symbols-outlined">send</span>
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════ Main Roadmap View ═══════════
export default function RoadmapViewNew() {
  const location = useLocation();
  const navigate = useNavigate();
  const [roadmapData, setRoadmapData] = useState<any>(location.state?.roadmapData);
  const [isLoading, setIsLoading] = useState(!location.state?.roadmapData);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  
  // Quản lý Stack để quay lại lộ trình chính
  const [roadmapStack, setRoadmapStack] = useState<any[]>([]);

  const fetchLatestRoadmap = async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const res = await api.get('/roadmaps/latest');
      if (res.data.roadmapData) {
        setRoadmapData(res.data.roadmapData);
      }
    } catch (err) {
      console.error('Failed to fetch roadmap');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestRoadmap(!roadmapData);

    const pollInterval = setInterval(() => {
      if (roadmapData && !roadmapData.isEnriched) {
        fetchLatestRoadmap();
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [roadmapData?.isEnriched]);

  // Tự động cập nhật selectedTopic nếu dữ liệu roadmap thay đổi
  useEffect(() => {
    if (selectedTopic && roadmapData) {
      const topicId = selectedTopic.topicId || selectedTopic._id;
      for (const phase of roadmapData.phases || []) {
        const updated = phase.topics.find((t: any) => (t.topicId || t._id) === topicId);
        if (updated) setSelectedTopic(updated);
      }
    }
  }, [roadmapData]);

  // Xử lý Deep Dive vào Skill Roadmap
  const handleDeepDive = async (slug: string, newTab: boolean) => {
    if (newTab) {
      window.open(`/roadmap/preview/${slug}`, '_blank');
      return;
    }
    
    // Lưu roadmap hiện tại vào stack
    setRoadmapStack(prev => [...prev, roadmapData]);
    setIsLoading(true);
    try {
      // Giả sử có API lấy template chi tiết theo slug
      const res = await api.get(`/roadmaps/templates/${slug}`);
      setRoadmapData(res.data.template);
      setSelectedTopic(null);
    } catch {
      alert("Skill Roadmap này đang được cập nhật, vui lòng thử lại sau!");
    }
    setIsLoading(false);
  };

  const handleGoBack = () => {
    if (roadmapStack.length === 0) return;
    const previous = roadmapStack[roadmapStack.length - 1];
    setRoadmapData(previous);
    setRoadmapStack(prev => prev.slice(0, -1));
    setSelectedTopic(null);
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-[#f7f9fb]"><div className="w-12 h-12 border-4 border-[#1a1d1f] border-t-transparent rounded-full animate-spin" /></div>;
  if (!roadmapData) return <div className="flex h-screen items-center justify-center bg-[#f7f9fb]"><h2 className="text-xl font-bold text-red-500">Roadmap not found</h2></div>;

  return (
    <div className="bg-[#f7f9fb] font-['Inter'] text-[#2d3337] antialiased min-h-screen">
      <main className="pt-32 pb-24 max-w-7xl mx-auto px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Main Content */}
          <div className="lg:col-span-7">
            <header className="mb-12">
              {roadmapStack.length > 0 && (
                <button 
                  onClick={handleGoBack}
                  className="flex items-center gap-2 text-sm font-bold text-[#6f767e] hover:text-[#1a1d1f] mb-6 transition-all group"
                >
                  <span className="material-symbols-outlined text-lg group-hover:-translate-x-1 transition-transform">arrow_back</span>
                  Back to Main Career Path
                </button>
              )}
              <span className="px-3 py-1 bg-[#eaedff] text-[#3856c4] text-[10px] font-bold uppercase tracking-widest rounded-full">AI Architected Path</span>
              <h1 className="text-4xl md:text-5xl font-black font-['Manrope'] tracking-tight mt-4 mb-3">{roadmapData.targetRole || roadmapData.title}</h1>
              <p className="text-[#596063] text-lg leading-relaxed max-w-2xl">{roadmapData.description || "Personalized learning journey based on your skill gaps."}</p>
            </header>

            {/* Timeline ... (giữ nguyên logic cũ nhưng có thể tối ưu thêm) */}
            <div className="space-y-20 relative">
              {/* Vertical Progress Line Background */}
              <div className="absolute left-[2.45rem] top-10 bottom-10 w-1 bg-[#eaedff] rounded-full hidden md:block"></div>

              {roadmapData.phases?.map((phase: any, pIdx: number) => (
                <div key={pIdx} className="relative z-10">
                  {/* ... nội dung phase ... */}
                  <div className="flex items-center gap-6 mb-10 group">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-[#1a1d1f] text-white flex items-center justify-center shadow-xl shadow-[#1a1d1f]/20 group-hover:scale-110 transition-transform duration-500">
                      <span className="material-symbols-outlined text-3xl">
                        {pIdx === 0 ? 'auto_stories' : pIdx === 1 ? 'architecture' : 'military_tech'}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#3856c4] font-black uppercase tracking-[0.3em] mb-1">Phase 0{pIdx + 1}</p>
                      <h2 className="text-2xl font-black font-['Manrope'] text-[#1a1d1f]">{phase.phaseName || phase.title}</h2>
                    </div>
                  </div>

                  <div className="space-y-8 md:ml-20 relative">
                    {(phase.topics || phase.items)?.map((topic: any, tIdx: number) => {
                      const topicId = topic.topicId || topic._id || topic.id;
                      const isSelected = (selectedTopic?.topicId || selectedTopic?._id || selectedTopic?.id) === topicId;
                      // ... logic isDone, isCurrent ...
                      const isDone = topic.status === 'done' || topic.status === 'COMPLETED';
                      const isCurrent = topic.status === 'learning' || topic.status === 'IN_PROGRESS';
                      const subCount = (topic.subTopics?.length || 0) + (topic.subtopics?.length || 0);

                      return (
                        <div key={tIdx} className="relative">
                          {/* Connection Line to Dot */}
                          <div className="absolute -left-12 top-1/2 w-8 h-[2px] bg-[#eaedff] hidden md:block"></div>
                          
                          {/* Node Dot */}
                          <div className={`absolute -left-[3.5rem] top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-4 border-[#f7f9fb] z-20 transition-all duration-500 flex items-center justify-center ${
                            isDone ? 'bg-[#00b341] scale-110' : isCurrent ? 'bg-[#1a1d1f] ring-8 ring-[#1a1d1f]/10 animate-pulse' : 'bg-white border-[#eaedff]'
                          }`}>
                            {isDone && <span className="material-symbols-outlined text-white text-[14px]">check</span>}
                            {isCurrent && <div className="w-2 h-2 bg-white rounded-full"></div>}
                          </div>

                          {/* Node Card */}
                          <div 
                            onClick={() => setSelectedTopic(topic)}
                            className={`p-8 rounded-[2.5rem] cursor-pointer transition-all duration-300 border-2 flex flex-col md:flex-row md:items-center justify-between gap-6 ${
                              isSelected 
                                ? 'bg-white border-[#1a1d1f] shadow-[0_30px_60px_rgba(0,0,0,0.06)] -translate-y-1' 
                                : 'bg-white/60 border-transparent hover:border-[#eaedff] hover:bg-white hover:shadow-lg'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                               <div className="flex items-center gap-3 mb-2">
                                  <h3 className={`text-lg font-black font-['Manrope'] ${isSelected ? 'text-[#1a1d1f]' : 'text-[#2d3337]'}`}>{topic.title || topic.name}</h3>
                                  {subCount > 0 && (
                                    <span className="px-2 py-0.5 bg-[#f1f4f6] text-[#757c7f] text-[9px] font-black rounded-full uppercase tracking-tighter">
                                      {subCount} Sub-topics
                                    </span>
                                  )}
                               </div>
                               <p className="text-sm text-[#596063] line-clamp-2 leading-relaxed font-medium">
                                 {topic.description || 'Explore the core principles and skills of this module.'}
                                </p>
                            </div>

                            <div className="flex items-center gap-4 shrink-0">
                               {isDone && (
                                 <div className="flex items-center gap-1.5 text-[#00b341] bg-[#00b341]/10 px-4 py-2 rounded-full">
                                    <span className="material-symbols-outlined text-sm font-bold">verified</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest">Mastered</span>
                                 </div>
                               )}
                               {isCurrent && (
                                 <div className="flex items-center gap-1.5 text-[#1a1d1f] bg-[#1a1d1f]/10 px-4 py-2 rounded-full">
                                    <span className="material-symbols-outlined text-sm font-bold animate-spin">sync</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest">Learning</span>
                                 </div>
                               )}
                               {!isDone && !isCurrent && (
                                 <div className="text-[#acb3b7] group-hover:text-[#1a1d1f] transition-colors">
                                    <span className="material-symbols-outlined">chevron_right</span>
                                 </div>
                               )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-5 relative">
             <div className="sticky top-28">
                {!selectedTopic ? (
                  <div className="bg-[#f4f4f4]/50 border-2 border-dashed border-[#eaedff] rounded-[3rem] p-16 text-center animate-in fade-in duration-700">
                     <span className="material-symbols-outlined text-[#acb3b7] text-5xl mb-6">ads_click</span>
                     <p className="text-sm font-black text-[#1a1d1f] uppercase tracking-widest">Select a topic</p>
                     <p className="text-xs text-[#6f767e] mt-3 leading-relaxed">Click on any node to reveal official resources and chat with your AI Mentor.</p>
                  </div>
                ) : (
                  <SidebarFocus 
                    topic={selectedTopic} 
                    roadmapId={roadmapData._id} 
                    onClose={() => setSelectedTopic(null)} 
                    onDeepDive={handleDeepDive}
                  />
                )}
             </div>
          </div>

        </div>
      </main>
    </div>
  );
}
