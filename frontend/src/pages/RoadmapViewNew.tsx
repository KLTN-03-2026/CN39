import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '~/services/api';

// ═══════════ Sidebar Focus ═══════════
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

  const topicId = topic.topicId;
  const resources = topic.resources || [];
  const skillRoadmapSlug = topic.skillRoadmapSlug;

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

  const getBadgeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'video': return 'bg-red-500';
      case 'course': return 'bg-orange-500';
      case 'official': return 'bg-emerald-500';
      case 'roadmap': return 'bg-indigo-600';
      case 'feed': return 'bg-blue-400';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] sticky top-28 overflow-hidden border border-[#eaedff] shadow-[0_30px_70px_rgba(0,0,0,0.06)] flex flex-col h-[calc(100vh-140px)] w-full max-w-[550px] ml-auto">
      <div className="flex p-4 gap-2 bg-white border-b border-[#f1f4f6]">
        <button onClick={() => setTab('resources')} className={`px-6 py-2.5 rounded-full text-sm font-bold ${tab === 'resources' ? 'bg-[#1a1d1f] text-white' : 'text-[#6f767e]'}`}>Resources</button>
        <button onClick={() => setTab('tutor')} className={`px-6 py-2.5 rounded-full text-sm font-bold ${tab === 'tutor' ? 'bg-[#1a1d1f] text-white' : 'text-[#6f767e]'}`}>AI Tutor</button>
        <div className="flex-1 flex justify-end"><button onClick={onClose} className="p-2 hover:bg-red-50 rounded-full">✕</button></div>
      </div>

      <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
        {tab === 'resources' ? (
          <div>
            <h2 className="text-3xl font-black mb-6">{topic.title}</h2>
            <p className="text-[#6f767e] mb-10 leading-relaxed">{topic.description}</p>
            
            <div className="space-y-4">
              {skillRoadmapSlug && (
                <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <div className="flex items-center gap-3">
                    <span className="bg-indigo-600 text-white text-[9px] font-black px-2 py-1 rounded">ROADMAP</span>
                    <button onClick={() => onDeepDive(skillRoadmapSlug, false)} className="text-sm font-bold text-indigo-900 hover:underline">Explore Dedicated Roadmap</button>
                  </div>
                </div>
              )}

              {resources.map((r: any, i: number) => (
                <div key={i} className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <span className={`text-white text-[9px] font-black px-2 py-1 rounded uppercase ${getBadgeColor(r.type)}`}>{r.type || 'Article'}</span>
                    {r.type === 'roadmap' ? (
                      <button onClick={() => onDeepDive(r.url.split('/').pop(), false)} className="text-sm font-bold hover:underline">{r.title}</button>
                    ) : (
                      <a href={r.url} target="_blank" rel="noreferrer" className="text-sm font-bold hover:underline">{r.title}</a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex-1 space-y-4 overflow-y-auto mb-4">
              {chatHistory.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${m.role === 'user' ? 'bg-[#1a1d1f] text-white' : 'bg-gray-100'}`}>{m.text}</div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="flex gap-2">
              <input type="text" value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Ask anything..." className="flex-1 bg-gray-100 border-none rounded-xl px-4 py-3" />
              <button onClick={sendMessage} className="bg-[#1a1d1f] text-white p-3 rounded-xl">Send</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RoadmapViewNew() {
  const { id, slug: previewSlug } = useParams();
  const location = useLocation();
  const [roadmapData, setRoadmapData] = useState<any>(location.state?.roadmapData);
  const [isLoading, setIsLoading] = useState(!roadmapData);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  const [roadmapStack, setRoadmapStack] = useState<any[]>([]);

  const fetchRoadmap = async (roadmapId: string) => {
    setIsLoading(true);
    try {
      const res = await api.get(`/roadmaps/${roadmapId}`);
      setRoadmapData(res.data.roadmapData);
    } catch { console.error("Failed to fetch"); }
    finally { setIsLoading(false); }
  };

  const fetchPreview = async (slug: string) => {
    setIsLoading(true);
    try {
      const res = await api.get(`/roadmaps/preview/${slug}`);
      setRoadmapData(res.data.roadmapData);
    } catch { console.error("Failed to fetch preview"); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    if (previewSlug) fetchPreview(previewSlug);
    else if (id) fetchRoadmap(id);
    else if (!roadmapData) fetchRoadmap('latest');
  }, [id, previewSlug]);

  const handleDeepDive = async (slug: string, newTab: boolean) => {
    if (newTab) { window.open(`/roadmap/preview/${slug}`, '_blank'); return; }
    setRoadmapStack(prev => [...prev, roadmapData]);
    await fetchPreview(slug);
    setSelectedTopic(null);
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center animate-pulse text-2xl font-black">SCANNING PATH...</div>;
  if (!roadmapData) return <div>Not found</div>;

  return (
    <div className="bg-[#f7f9fb] min-h-screen pt-32 px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-7">
          <header className="mb-12">
            {roadmapStack.length > 0 && <button onClick={() => { setRoadmapData(roadmapStack.pop()); setRoadmapStack([...roadmapStack]); }} className="text-sm font-bold text-gray-500 mb-4 hover:text-black flex items-center gap-2">← Back</button>}
            <h1 className="text-5xl font-black font-['Manrope'] mb-4">{roadmapData.targetRole || roadmapData.title}</h1>
            <p className="text-gray-500 text-lg">{roadmapData.description || 'Your personalized learning path.'}</p>
          </header>

          <div className="space-y-6">
            {roadmapData.topics?.map((topic: any, idx: number) => (
              <div 
                key={idx} 
                onClick={() => setSelectedTopic(topic)}
                className={`p-6 rounded-[2rem] cursor-pointer border-2 transition-all ${selectedTopic?.topicId === topic.topicId ? 'bg-white border-black shadow-xl' : 'bg-white/50 border-transparent hover:border-gray-200'}`}
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold">{topic.title}</h3>
                  {topic.isCompleted && <span className="text-emerald-500 material-symbols-outlined">check_circle</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5">
          <SidebarFocus topic={selectedTopic} roadmapId={roadmapData._id} onClose={() => setSelectedTopic(null)} onDeepDive={handleDeepDive} />
        </div>
      </div>
    </div>
  );
}
