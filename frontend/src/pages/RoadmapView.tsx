import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ReactFlow, MiniMap, Controls, Background, useNodesState, useEdgesState, BackgroundVariant } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Markdown from 'react-markdown';
import toast from 'react-hot-toast';
import SkillNode from '~/components/SkillNode';
import PhaseNode from '~/components/PhaseNode';
import RootNode from '~/components/RootNode';
import { api } from '~/services/api';

const nodeTypes = { skill: SkillNode, phase: PhaseNode, root: RootNode };

// Thuật toán Bố cục Xương Cá Đối Xứng (Dual-Branch Spine Layout) — phong cách roadmap.sh
function mapDataToReactFlow(roadmapData: any) {
  const nodes: any[] = [];
  const edges: any[] = [];
  
  const spineX = 600; // Trục xương sống trung tâm
  const TOPIC_GAP = 50; // Khoảng cách dọc giữa các topic node  
  const PHASE_PADDING = 60; // Padding dọc giữa các cụm phase
  const BRANCH_LEFT_X = spineX - 340; // Nhánh trái (Required)
  const BRANCH_RIGHT_X = spineX + 230; // Nhánh phải (Optional)
  
  let currentY = 180;

  // 0. Vạch đứt nền
  nodes.push({
    id: 'fake-top',
    type: 'default',
    data: { label: '' },
    position: { x: spineX - 112, y: -50 },
    className: '!bg-transparent !border-none !shadow-none',
    style: { zIndex: -1, background: 'transparent', border: 'none', width: '224px', pointerEvents: 'none' }
  });

  // 1. Root Node (Header)
  nodes.push({
    id: 'root',
    type: 'root',
    data: { title: roadmapData.targetRole || "Front-end" },
    position: { x: spineX - 112, y: 50 }
  });
  
  edges.push({ id: `e-fake-root`, source: `fake-top`, target: `root`, type: 'straight', animated: false, style: { stroke: '#3b82f6', strokeWidth: 3, strokeDasharray: '4 4' } });

  roadmapData.phases?.forEach((phase: any, phaseIndex: number) => {
    // Kiểm tra phase mở khoá
    let isPhaseLocked = false;
    if (phaseIndex > 0) {
       const prevPhase = roadmapData.phases[phaseIndex - 1];
       const requiredTopics = prevPhase.topics.filter((t: any) => t.isRequired !== false);
       const allRequiredCompleted = requiredTopics.every((t: any) => t.isCompleted === true);
       isPhaseLocked = !allRequiredCompleted;
    }

    // Phân loại Topics: Required (trái) vs Optional (phải)
    const requiredTopics: any[] = [];
    const optionalTopics: any[] = [];
    phase.topics?.forEach((topic: any, topicIndex: number) => {
      const enriched = { ...topic, _originalIndex: topicIndex };
      if (topic.isRequired !== false) {
        requiredTopics.push(enriched);
      } else {
        optionalTopics.push(enriched);
      }
    });

    // Tính chiều cao tối đa cần cho cụm này
    const maxBranchCount = Math.max(requiredTopics.length, optionalTopics.length, 1);
    const clusterHeight = maxBranchCount * TOPIC_GAP;

    // Phase Node (Trục xương sống trung tâm)
    nodes.push({
      id: `phase-${phaseIndex}`,
      type: 'phase',
      data: { 
         label: isPhaseLocked ? `🔒 ${phase.phaseName}` : phase.phaseName,
         title: phase.phaseName,
         description: phase.description,
         resources: phase.resources,
         isLocked: isPhaseLocked,
         isCompleted: phase.isCompleted,
         phaseIndex: phaseIndex,
         topicId: `phase-${phaseIndex}`
      },
      position: { x: spineX - 112, y: currentY },
      style: { zIndex: 10 }
    });

    // Nối spine
    if (phaseIndex === 0) {
      edges.push({ id: `e-root-phase-0`, source: `root`, sourceHandle: 'bottom', target: `phase-0`, targetHandle: 'top', type: 'straight', animated: false, style: { stroke: '#3b82f6', strokeWidth: 3 } });
    } else {
      edges.push({ id: `e-phase-${phaseIndex}`, source: `phase-${phaseIndex-1}`, sourceHandle: 'bottom', target: `phase-${phaseIndex}`, targetHandle: 'top', type: 'straight', animated: false, style: { stroke: '#3b82f6', strokeWidth: 3 } });
    }

    // Vẽ nhánh TRÁI (Required Topics)
    let leftY = currentY - ((requiredTopics.length - 1) * TOPIC_GAP) / 2;
    requiredTopics.forEach((topic: any, i: number) => {
      const topicId = topic.topicId || `topic-${phaseIndex}-${topic._originalIndex}`;
      nodes.push({
        id: topicId,
        type: 'skill',
        data: { 
           title: topic.title, 
           isCompleted: topic.isCompleted, 
           isRequired: true,
           isLocked: isPhaseLocked,
           resources: topic.resources, 
           description: topic.description,
           topicId: topicId,
           phaseIndex: phaseIndex
        },
        position: { x: BRANCH_LEFT_X, y: leftY },
      });
      edges.push({ 
        id: `e-p${phaseIndex}-req-${i}`, 
        source: `phase-${phaseIndex}`, 
        sourceHandle: 'left',
        target: topicId,
        targetHandle: 'right',
        type: 'default',
        animated: false,
        style: { stroke: isPhaseLocked ? '#E5E7EB' : '#3b82f6', strokeWidth: 2, strokeDasharray: '4 4' }
      });
      leftY += TOPIC_GAP;
    });

    // Vẽ nhánh PHẢI (Optional Topics)
    let rightY = currentY - ((optionalTopics.length - 1) * TOPIC_GAP) / 2;
    optionalTopics.forEach((topic: any, i: number) => {
      const topicId = topic.topicId || `topic-${phaseIndex}-${topic._originalIndex}`;
      nodes.push({
        id: topicId,
        type: 'skill',
        data: { 
           title: topic.title, 
           isCompleted: topic.isCompleted, 
           isRequired: false,
           isLocked: isPhaseLocked,
           resources: topic.resources, 
           description: topic.description,
           topicId: topicId,
           phaseIndex: phaseIndex
        },
        position: { x: BRANCH_RIGHT_X, y: rightY },
      });
      edges.push({ 
        id: `e-p${phaseIndex}-opt-${i}`, 
        source: `phase-${phaseIndex}`, 
        sourceHandle: 'right',
        target: topicId,
        targetHandle: 'left',
        type: 'default',
        animated: false,
        style: { stroke: isPhaseLocked ? '#E5E7EB' : '#6366f1', strokeWidth: 2, strokeDasharray: '4 4' }
      });
      rightY += TOPIC_GAP;
    });

    // Tiến currentY xuống phù hợp với chiều cao cụm
    currentY += clusterHeight + PHASE_PADDING;
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
        <h2 className="text-xl font-black text-black">{data.title || data.label}</h2>
        {data.description && <p className="text-gray-600 mt-2 text-sm leading-relaxed">{data.description}</p>}
      </div>

      {/* Free Resources */}
      {(freeArticles.length > 0 || freeVideos.length > 0 || freeCourses.length > 0) && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-green-600">♥</span>
            <span className="text-green-600 font-bold text-xs uppercase tracking-widest border border-green-300 px-2 py-0.5 rounded-full">Free Resources</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {freeArticles.map((r: any, i: number) => (
              <a key={`a-${i}`} href={r.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 py-1.5 hover:text-blue-600 transition-colors group">
                <TypeBadge type="Article" />
                <span className="text-gray-700 group-hover:underline">{r.label}</span>
              </a>
            ))}
            {freeVideos.map((r: any, i: number) => (
              <a key={`v-${i}`} href={r.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 py-1.5 hover:text-blue-600 transition-colors group">
                <TypeBadge type="Video" />
                <span className="text-gray-700 group-hover:underline">{r.label}</span>
              </a>
            ))}
            {freeCourses.map((r: any, i: number) => (
              <a key={`c-${i}`} href={r.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 py-1.5 hover:text-blue-600 transition-colors group">
                <TypeBadge type="Course" />
                <span className="text-gray-700 group-hover:underline">{r.label}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Premium Resources */}
      {premiumCourses.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-yellow-500">★</span>
            <span className="text-yellow-600 font-bold text-xs uppercase tracking-widest border border-yellow-400 px-2 py-0.5 rounded-full">Premium Courses</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {premiumCourses.map((r: any, i: number) => {
              let platform = 'Course';
              if (r.url?.includes('udemy')) platform = 'Udemy';
              else if (r.url?.includes('scrimba')) platform = 'Scrimba';
              else if (r.url?.includes('coursera')) platform = 'Coursera';
              else if (r.url?.includes('pluralsight')) platform = 'Pluralsight';
              
              return (
                <a key={`p-${i}`} href={r.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 py-2 px-3 bg-yellow-50 border border-yellow-300 rounded-lg hover:border-yellow-500 transition-colors group">
                  <span className="text-[10px] font-black uppercase bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded">{platform}</span>
                  <span className="text-gray-800 group-hover:underline font-medium">{r.label}</span>
                </a>
              );
            })}
          </div>
          <p className="text-gray-400 text-xs mt-2 italic">Các khoá học trả phí từ nhiều nền tảng uy tín.</p>
        </div>
      )}

      {/* Button Hoàn Thành */}
      <div className="pt-4 border-t border-gray-200 mt-auto">
        {!data.isCompleted ? (
          <button 
            onClick={() => { console.log('[Click] Đánh dấu hoàn thành'); onComplete(); }}
            className="w-full py-3 rounded-lg font-bold bg-black text-white hover:bg-gray-800 transition-all cursor-pointer relative z-50 pointer-events-auto"
          >
            Đánh Dấu Hoàn Thành
          </button>
        ) : (
          <button 
            disabled
            className="w-full py-3 rounded-lg font-bold bg-green-100 text-green-700 border border-green-300 cursor-not-allowed"
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
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-800 border border-gray-200'
            }`}>
              {msg.role === 'ai' && <span className="text-blue-600 font-bold text-xs block mb-1">🤖 AI Tutor</span>}
              {msg.role === 'ai' ? (
                <div className="prose prose-sm max-w-none prose-pre:bg-gray-800 prose-pre:text-gray-100 prose-pre:border prose-pre:border-gray-300 prose-pre:rounded-lg prose-code:text-blue-600 prose-headings:text-black prose-strong:text-black prose-a:text-blue-600">
                  <Markdown>{msg.text}</Markdown>
                </div>
              ) : (
                <span>{msg.text}</span>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-3 py-2 rounded-xl text-gray-500 text-sm border border-gray-200 animate-pulse">
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
          className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-black placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors"
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className="px-4 py-2.5 bg-black text-white rounded-lg text-sm font-bold hover:bg-gray-800 transition-all disabled:opacity-50"
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
            const mappedHistory = res.data.history.map((m: any) => ({
               role: m.role === 'model' ? 'ai' : m.role,
               text: m.text
            }));
            setChatMessages(mappedHistory);
            chatHistoryMap.current[title] = mappedHistory;
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
    <div className="absolute top-0 right-0 w-[420px] h-full bg-white z-[100] flex flex-col border-l-2 border-black shadow-[-4px_0_15px_rgba(0,0,0,0.08)] pointer-events-auto" onClick={(e) => e.stopPropagation()}>
      {/* Header: Tabs + Close */}
      <div className="flex items-center justify-between px-4 pt-4 pb-0 bg-gray-50 border-b-2 border-black">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('resources')}
            className={`px-4 py-2 rounded-t-md text-sm font-bold transition-all border-2 border-b-0 ${
              activeTab === 'resources'
                ? 'bg-white border-black text-black -mb-[2px]'
                : 'bg-gray-100 border-transparent text-gray-400 hover:text-black'
            }`}
          >
            📚 Tài liệu
          </button>
          <button
            onClick={() => setActiveTab('tutor')}
            className={`px-4 py-2 rounded-t-md text-sm font-bold transition-all border-2 border-b-0 ${
              activeTab === 'tutor'
                ? 'bg-white border-black text-black -mb-[2px]'
                : 'bg-gray-100 border-transparent text-gray-400 hover:text-black'
            }`}
          >
            🤖 AI Tutor
          </button>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-red-500 font-bold text-xl transition-colors">✕</button>
      </div>

      {/* Content - LUÔN render cả 2, ẩn bằng CSS để giữ state */}
      <div className="flex-1 overflow-hidden">
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

  const [isLoadingRoadmap, setIsLoadingRoadmap] = useState(!location.state?.roadmapData);

  useEffect(() => {
    // Nếu không có roadmapData từ Navigation State (do F5), thử lấy lại từ API
    if (!roadmapData) {
      api.get('/roadmaps/latest')
        .then(res => {
          if (res.data.roadmapData) {
            setRoadmapData(res.data.roadmapData);
          }
        })
        .catch(err => console.error("Error fetching roadmap on refresh:", err))
        .finally(() => setIsLoadingRoadmap(false));
    } else {
      setIsLoadingRoadmap(false);
    }
  }, []);

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

  if (isLoadingRoadmap) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center font-sans gap-4">
        <div className="w-16 h-16 border-4 border-[var(--color-neon-blue)] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 text-lg">Đang khôi phục dữ liệu lộ trình...</p>
      </div>
    );
  }

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
    // Cho phép click Phase node HOẶC Topic node - miễn là không bị lock
    if (node.data.title && !node.data.isLocked && node.id !== 'root') {
      setSelectedNodeData(node.data);
    }
  };

  const handleCompleteTopic = async (topicId: string, phaseIndex: number) => {
    try {
      await api.patch(`/roadmaps/${roadmapData._id}/topics/${topicId}/complete`, { phaseIndex });
      
      // Clone and update state locally to trigger React Flow recalculation
      const newData = JSON.parse(JSON.stringify(roadmapData));
      
      // Tìm topic trong mảng để update (xử lý cả trường hợp topicId là ID thật và ID giả)
      const fallbackMatch = topicId.match(/^topic-(\d+)-(\d+)$/);
      let topic = null;
      if (fallbackMatch) {
         const tIdx = parseInt(fallbackMatch[2], 10);
         topic = newData.phases[phaseIndex].topics[tIdx];
      } else {
         topic = newData.phases[phaseIndex].topics.find((t: any) => t.topicId === topicId);
      }
      
      if (topic) {
         topic.isCompleted = true;
      }
      
      setRoadmapData(newData);
      // Cập nhật thủ công để giao diện DetailPanel (Nút) đổi trạng thái tức thì
      setSelectedNodeData((prev: any) => prev ? { ...prev, isCompleted: true } : prev);
    } catch (e: any) {
      console.error('[completeTopic] Lỗi:', e?.response?.data || e?.message || e);
      console.error('[completeTopic] topicId:', topicId, 'phaseIndex:', phaseIndex, 'roadmapId:', roadmapData._id);
      toast.error('Không thể đánh dấu hoàn thành. Chi tiết: ' + (e?.response?.data?.message || e?.message || 'Unknown'));
    }
  };

  return (
    <div className="w-screen h-screen bg-white overflow-hidden flex font-sans relative">

        {/* Sơ đồ Interactive (React Flow) */}
      <div className="flex-1 h-full relative">
        
        {/* Thông tin Text Role cũ (Đã xoá để dùng Root Node bên trong ReactFlow) */}
        
        {/* Legend Box (Góc trái trên) - Giống roadmap.sh */}
        <div className="absolute top-20 left-4 z-20 bg-white border-2 border-black p-4 rounded-md shadow-sm pointer-events-none text-black">
           <div className="space-y-2.5">
             <div className="flex items-center gap-2">
               <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-white text-[11px] font-bold">✓</div>
               <span className="text-sm font-[600] text-black">Lộ trình khuyến nghị</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-[11px] font-bold">✓</div>
               <span className="text-sm font-[600] text-black">Tùy chọn thay thế</span>
             </div>
           </div>
        </div>

        {/* Nút quay lại */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 z-10 bg-black text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-gray-800 transition-all pointer-events-auto"
        >
          ← Trang chủ
        </button>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={true}
          proOptions={{ hideAttribution: true }}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          panOnScroll={true}
          minZoom={1}
          maxZoom={1}
          className="bg-transparent"
        >
          <Background color="#ccc" variant={BackgroundVariant.Dots} gap={20} size={2} />
        </ReactFlow>
      </div>

      {/* Detail Panel - overlay bên phải, NGOÀI ReactFlow container */}
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
    </div>
  );
}
