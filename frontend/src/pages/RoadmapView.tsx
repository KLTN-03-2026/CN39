import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ReactFlow, MiniMap, Controls, Background, useNodesState, useEdgesState, BackgroundVariant } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import SkillNode from '~/components/SkillNode';
import { api } from '~/services/api';

const nodeTypes = { skill: SkillNode };

// Thuật toán trải phẳng (Flattening) Data DB thành Nodes và Edges
export function mapDataToReactFlow(roadmapData: any) {
  const nodes: any[] = [];
  const edges: any[] = [];
  
  let currentX = 50;

  nodes.push({
    id: 'root',
    type: 'skill',
    data: { title: roadmapData.targetRole || "Mục Tiêu", isCompleted: true },
    position: { x: currentX, y: 150 },
  });

  currentX += 400;

  roadmapData.phases?.forEach((phase: any, phaseIndex: number) => {
    // Kiểm tra phase mở khoá
    let isPhaseLocked = false;
    if (phaseIndex > 0) {
       const prevPhase = roadmapData.phases[phaseIndex - 1];
       const requiredTopics = prevPhase.topics.filter((t: any) => t.isRequired !== false);
       const allRequiredCompleted = requiredTopics.every((t: any) => t.isCompleted === true);
       isPhaseLocked = !allRequiredCompleted;
    }

    nodes.push({
      id: `phase-${phaseIndex}`,
      data: { label: isPhaseLocked ? `🔒 ${phase.phaseName}` : phase.phaseName },
      position: { x: currentX, y: 150 },
      className: `glass-panel text-white py-3 px-8 rounded-full border ${isPhaseLocked ? 'border-gray-800 opacity-50' : 'border-[var(--color-neon-purple)] shadow-[0_0_15px_rgba(176,38,255,0.4)]'} text-sm uppercase tracking-widest font-black`,
      style: { background: 'var(--color-dark-bg)', color: isPhaseLocked ? '#666' : '#b026ff' }
    });

    if (phaseIndex === 0) {
      edges.push({ id: `e-root-phase`, source: 'root', target: `phase-${phaseIndex}`, animated: true, style: { stroke: 'var(--color-neon-blue)'} });
    } else {
      edges.push({ id: `e-phase-${phaseIndex}`, source: `phase-${phaseIndex-1}`, target: `phase-${phaseIndex}`, animated: !isPhaseLocked, style: { stroke: isPhaseLocked ? '#333' : 'var(--color-neon-blue)'} });
    }

    let topicY = 300;
    
    phase.topics.forEach((topic: any, topicIndex: number) => {
      const topicId = topic.topicId || `topic-${phaseIndex}-${topicIndex}`;
      nodes.push({
        id: topicId,
        type: 'skill',
        data: { 
           title: topic.title, 
           isCompleted: topic.isCompleted, 
           isRequired: topic.isRequired !== false,
           isLocked: isPhaseLocked,
           resources: topic.resources, 
           description: topic.description,
           topicId: topicId,
           phaseIndex: phaseIndex
        },
        position: { x: currentX, y: topicY },
      });
      edges.push({ 
        id: `e-p${phaseIndex}-t${topicIndex}`, 
        source: `phase-${phaseIndex}`, 
        target: topicId,
        animated: !topic.isCompleted && !isPhaseLocked,
        style: { stroke: topic.isCompleted ? 'var(--color-neon-blue)' : (isPhaseLocked ? '#222' : '#444'), strokeWidth: topic.isCompleted ? 3 : 2 }
      });
      topicY += 160;
    });
    currentX += 450;
  });

  return { initialNodes: nodes, initialEdges: edges };
}

// ==================== BADGE COMPONENT ====================
function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    article: 'bg-green-600',
    video: 'bg-red-500',
    youtube: 'bg-red-500',
    course: 'bg-blue-600',
    docs: 'bg-yellow-600',
  };
  const bg = colors[type?.toLowerCase()] || 'bg-gray-600';
  return <span className={`${bg} text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider`}>{type}</span>;
}

// ==================== RESOURCES TAB ====================
function ResourcesTab({ data, roadmapId, onComplete }: { data: any, roadmapId: string, onComplete: () => void }) {
  const resources = data.resources || [];
  
  // Phân loại tài nguyên
  const freeVideos = resources.filter((r: any) => r.type?.toLowerCase() === 'video' || r.type?.toLowerCase() === 'youtube').slice(0, 3);
  const freeArticles = resources.filter((r: any) => r.type?.toLowerCase() === 'article' || r.type?.toLowerCase() === 'docs');
  const premiumCourses = resources.filter((r: any) => r.isPremium);
  const freeCourses = resources.filter((r: any) => r.type?.toLowerCase() === 'course' && !r.isPremium);

  return (
    <div className="flex flex-col gap-5 text-sm">
      {/* Tiêu đề topic */}
      <div>
        <h2 className="text-2xl font-black text-white">{data.title || data.label}</h2>
        {data.description && <p className="text-gray-400 mt-2 text-sm leading-relaxed">{data.description}</p>}
      </div>

      {/* Free Resources */}
      {(freeArticles.length > 0 || freeVideos.length > 0 || freeCourses.length > 0) && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-green-400">♥</span>
            <span className="text-green-400 font-bold text-xs uppercase tracking-widest border border-green-400/30 px-2 py-0.5 rounded-full">Free Resources</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {freeArticles.map((r: any, i: number) => (
              <a key={`a-${i}`} href={r.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 py-1.5 hover:text-[var(--color-neon-blue)] transition-colors group">
                <TypeBadge type="Article" />
                <span className="text-gray-200 group-hover:underline">{r.label}</span>
              </a>
            ))}
            {freeVideos.map((r: any, i: number) => (
              <a key={`v-${i}`} href={r.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 py-1.5 hover:text-[var(--color-neon-blue)] transition-colors group">
                <TypeBadge type="Video" />
                <span className="text-gray-200 group-hover:underline">{r.label}</span>
              </a>
            ))}
            {freeCourses.map((r: any, i: number) => (
              <a key={`c-${i}`} href={r.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 py-1.5 hover:text-[var(--color-neon-blue)] transition-colors group">
                <TypeBadge type="Course" />
                <span className="text-gray-200 group-hover:underline">{r.label}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Premium Resources */}
      {premiumCourses.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-yellow-400">★</span>
            <span className="text-yellow-400 font-bold text-xs uppercase tracking-widest border border-yellow-400/30 px-2 py-0.5 rounded-full">Premium Courses</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {premiumCourses.map((r: any, i: number) => {
              // Xác định nền tảng từ URL
              let platform = 'Course';
              if (r.url?.includes('udemy')) platform = 'Udemy';
              else if (r.url?.includes('scrimba')) platform = 'Scrimba';
              else if (r.url?.includes('coursera')) platform = 'Coursera';
              else if (r.url?.includes('pluralsight')) platform = 'Pluralsight';
              
              return (
                <a key={`p-${i}`} href={r.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 py-2 px-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg hover:border-yellow-400 transition-colors group">
                  <span className="text-[10px] font-black uppercase bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded">{platform}</span>
                  <span className="text-yellow-200 group-hover:underline font-medium">{r.label}</span>
                </a>
              );
            })}
          </div>
          <p className="text-gray-500 text-xs mt-2 italic">Các khoá học trả phí từ nhiều nền tảng uy tín.</p>
        </div>
      )}

      {/* Button Hoàn Thành */}
      <div className="pt-4 border-t border-white/10 mt-auto">
        {!data.isCompleted ? (
          <button 
            onClick={onComplete}
            className="w-full py-3 rounded-xl font-bold bg-[var(--color-neon-blue)] text-black shadow-[0_0_15px_rgba(0,243,255,0.4)] hover:shadow-[0_0_25px_rgba(0,243,255,0.6)] transition-all"
          >
            Đánh Dấu Đã Hoàn Thành Kỹ Năng Này
          </button>
        ) : (
          <button 
            disabled
            className="w-full py-3 rounded-xl font-bold bg-gray-800 text-green-400 border border-green-500/30 cursor-not-allowed"
          >
            ✓ Đã Hoàn Thành
          </button>
        )}
      </div>


      {resources.length === 0 && (
        <p className="text-gray-500 italic text-center py-8">Chưa có tài nguyên cho topic này. Chuyển sang tab AI Tutor để hỏi thêm.</p>
      )}
    </div>
  );
}

// ==================== AI TUTOR TAB (Chatbox) ====================
type ChatMsg = { role: string; text: string };

function AITutorTab({ topicTitle, roadmapId, messages, setMessages }: { 
  topicTitle: string;
  roadmapId: string;
  messages: ChatMsg[];
  setMessages: (msgs: ChatMsg[]) => void;
}) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    const updated = [...messages, { role: 'user', text: userMsg }];
    setMessages(updated);
    setLoading(true);

    try {
      const res = await api.post('/roadmaps/chat', { message: userMsg, topic: topicTitle, roadmapId });
      setMessages([...updated, { role: 'ai', text: res.data.reply }]);
    } catch {
      setMessages([...updated, { role: 'ai', text: 'Xin lỗi, có lỗi khi kết nối AI. Vui lòng thử lại.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-[var(--color-neon-purple)]/30 text-white border border-[var(--color-neon-purple)]/40'
                : 'bg-white/5 text-gray-200 border border-white/10'
            }`}>
              {msg.role === 'ai' && <span className="text-[var(--color-neon-blue)] font-bold text-xs block mb-1">🤖 AI Tutor</span>}
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/5 px-3 py-2 rounded-xl text-gray-400 text-sm border border-white/10 animate-pulse">
              AI đang suy nghĩ...
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder={`Hỏi về ${topicTitle}...`}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-[var(--color-neon-purple)] focus:outline-none transition-colors"
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className="px-4 py-2.5 bg-gradient-to-r from-[var(--color-neon-purple)] to-[var(--color-neon-blue)] rounded-xl text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50"
        >
          Gửi
        </button>
      </div>
    </div>
  );
}

// ==================== DETAIL PANEL (Resources + AI Tutor) ====================
function DetailPanel({ data, roadmapId, onClose, chatHistoryMap, onCompleteTopic }: { 
  data: any; 
  roadmapId: string;
  onClose: () => void;
  chatHistoryMap: React.MutableRefObject<Record<string, ChatMsg[]>>;
  onCompleteTopic: (topicId: string, phaseIndex: number) => void;
}) {
  const [activeTab, setActiveTab] = useState<'resources' | 'tutor'>('resources');
  const title = data.title || data.label || 'Chi tiết';
  
  const defaultMessage = { role: 'ai', text: `Xin chào! Tôi là AI Tutor 🤖 Bạn muốn hiểu rõ hơn về "${title}" ở phần nào?` };

  // Khởi tạo state bằng default hoặc history đã lưu trong auth session
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>(chatHistoryMap.current[title] || [defaultMessage]);

  // Sync DB history when opening a topic
  useEffect(() => {
    const loadHistory = async () => {
      // Chỉ fetch lần đầu nếu map chưa có dữ liệu thật (chỉ có default hoặc trống)
      if (!chatHistoryMap.current[title] || chatHistoryMap.current[title].length <= 1) {
        try {
          const res = await api.get(`/roadmaps/chat/history/${roadmapId}/${title}`);
          if (res.data.history && res.data.history.length > 0) {
            setChatMessages(res.data.history);
          } else {
            setChatMessages([defaultMessage]);
          }
        } catch (e) {
          console.error("Lỗi lấy lịch sử chat", e);
        }
      }
    };
    if (roadmapId && title) {
      loadHistory();
    }
  }, [roadmapId, title]);

  // Đồng bộ chat history vào ref mỗi khi thay đổi
  useEffect(() => {
    chatHistoryMap.current[title] = chatMessages;
  }, [chatMessages, title]);

  return (
    <div className="w-[420px] h-full border-r border-[var(--color-glass-border)] bg-[var(--color-dark-bg)] z-20 flex flex-col shadow-2xl">
      {/* Header: Tabs + Close */}
      <div className="flex items-center justify-between px-4 pt-4 pb-0">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('resources')}
            className={`px-4 py-2 rounded-t-lg text-sm font-bold transition-all ${
              activeTab === 'resources'
                ? 'bg-white/10 text-white border border-b-0 border-white/20'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            📚 Resources
          </button>
          <button
            onClick={() => setActiveTab('tutor')}
            className={`px-4 py-2 rounded-t-lg text-sm font-bold transition-all ${
              activeTab === 'tutor'
                ? 'bg-white/10 text-white border border-b-0 border-white/20'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            🤖 AI Tutor
          </button>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-xl transition-colors">✕</button>
      </div>

      {/* Content - LUÔN render cả 2, ẩn bằng CSS để giữ state */}
      <div className="flex-1 overflow-hidden border-t border-white/10">
        <div className={`h-full p-5 overflow-y-auto flex flex-col ${activeTab === 'resources' ? '' : 'hidden'}`}>
          <ResourcesTab 
             data={data} 
             roadmapId={roadmapId} 
             onComplete={() => onCompleteTopic(data.topicId, data.phaseIndex)} 
          />
        </div>
        <div className={`h-full p-5 ${activeTab === 'tutor' ? '' : 'hidden'}`}>
          <AITutorTab topicTitle={title} roadmapId={roadmapId} messages={chatMessages} setMessages={setChatMessages} />
        </div>
      </div>
    </div>
  );
}

// ==================== MAIN PAGE ====================
export default function RoadmapView() {
  const location = useLocation();
  const navigate = useNavigate();

  // Khởi tạo state bằng original data
  const [roadmapData, setRoadmapData] = useState<any>(location.state?.roadmapData);
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [selectedNodeData, setSelectedNodeData] = useState<any>(null);
  const chatHistoryMap = useRef<Record<string, ChatMsg[]>>({});

  // Cập nhật React Flow mỗi khi roadmapData thay đổi
  useEffect(() => {
    if (roadmapData) {
      const { initialNodes, initialEdges } = mapDataToReactFlow(roadmapData);
      setNodes(initialNodes);
      setEdges(initialEdges);
      
      // Update selectedData nếu đang mở
      if (selectedNodeData) {
         const phase = roadmapData.phases[selectedNodeData.phaseIndex];
         const updatedTopic = phase?.topics.find((t: any) => t.topicId === selectedNodeData.topicId);
         if (updatedTopic) {
            setSelectedNodeData({ ...selectedNodeData, isCompleted: updatedTopic.isCompleted });
         }
      }
    }
  }, [roadmapData]);

  if (!roadmapData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center font-sans gap-4">
        <p className="text-gray-400 text-lg">Chưa có dữ liệu lộ trình. Hãy upload CV trước.</p>
        <button onClick={() => navigate('/')} className="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-[var(--color-neon-purple)] to-[var(--color-neon-blue)] hover:opacity-90 transition-all">
          Quay Về Trang Chủ
        </button>
      </div>
    );
  }

  const onNodeClick = (_: React.MouseEvent, node: any) => {
    if (node.data.title && !node.data.isLocked && node.id !== 'root' && !node.id.startsWith('phase-')) {
      setSelectedNodeData(node.data);
    }
  };

  const handleCompleteTopic = async (topicId: string, phaseIndex: number) => {
    try {
      await api.patch(`/roadmaps/${roadmapData._id}/topics/${topicId}/complete`);
      
      // Clone and update state locally to trigger React Flow recalculation
      const newData = JSON.parse(JSON.stringify(roadmapData));
      const topic = newData.phases[phaseIndex].topics.find((t: any) => t.topicId === topicId);
      if (topic) topic.isCompleted = true;
      setRoadmapData(newData);
    } catch (e) {
      alert('Lỗi: Không thể đánh dấu hoàn thành.');
    }
  };

  return (
    <div className="w-screen h-screen bg-[var(--color-dark-bg)] overflow-hidden flex font-sans">
      
      {/* Detail Panel - hiện khi click node */}
      {selectedNodeData && (
        <DetailPanel 
          key={selectedNodeData.title || selectedNodeData.label || 'detail'}
          data={selectedNodeData} 
          roadmapId={roadmapData._id} 
          onClose={() => setSelectedNodeData(null)} 
          chatHistoryMap={chatHistoryMap} 
          onCompleteTopic={handleCompleteTopic}
        />
      )}

      {/* Sơ đồ Interactive (React Flow) */}
      <div className="flex-1 h-full relative">
        {/* Nút quay lại */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 z-10 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-xl text-sm font-bold text-white hover:bg-[var(--color-neon-purple)]/30 transition-all"
        >
          ← Quay Lại Dashboard
        </button>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          panOnScroll={true}
          minZoom={1}
          maxZoom={1}
          className="bg-transparent"
        >
          <Background color="var(--color-glass-border)" variant={BackgroundVariant.Dots} gap={24} size={2} />
          <Controls className="glass-panel text-white fill-white border-[var(--color-glass-border)] overflow-hidden" showInteractive={false} showZoom={false} />
        </ReactFlow>
      </div>
    </div>
  );
}
