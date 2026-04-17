import React, { useState, useEffect } from 'react';
import { UploadCloud, FileText, LogOut, User as UserIcon, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '~/context/AuthContext';
import { api } from '~/services/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [goal, setGoal] = useState('Fullstack Developer');
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("Đang khởi tạo kết nối AI...");
  const [latestRoadmap, setLatestRoadmap] = useState<any>(null);
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const res = await api.get('/roadmaps/latest');
        if (res.data.roadmapData) {
          setLatestRoadmap(res.data.roadmapData);
          if (res.data.roadmapData.targetRole) {
            setGoal(res.data.roadmapData.targetRole);
          }
        }
      } catch (err) {
        console.error("Không lấy được lộ trình gần nhất", err);
      }
    };
    if (user) fetchLatest();
  }, [user]);

  // Giả lập tiến trình khi AI đang phân tích CV
  useEffect(() => {
    if (isScanning) {
      const steps = [
        "Đang đọc nội dung và trích xuất từ khóa CV...",
        "Truy vấn RAG (Retrieval-Augmented Generation)...",
        "Đang ráp nối kiến thức vào Vector DB...",
        "AI đang dựng trục Xương Sống của Cây Kỹ năng...",
        "Đang phân bổ các Topic (Nhánh) phụ...",
        "Đang truy xuất khóa học & URL YouTube mới nhất...",
        "Đang render giao diện Neo-Brutalism..."
      ];
      let i = 0;
      setScanStatus(steps[0]);
      
      const timer = setInterval(() => {
        if (i < steps.length - 1) {
          i++;
          setScanStatus(steps[i]);
        }
      }, 3500);
      
      return () => clearInterval(timer);
    }
  }, [isScanning]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleProcess = async () => {
    if (!file) return;
    setIsScanning(true);
    
    // Đóng gói file và mục tiêu gửi lên AI Agent
    const formData = new FormData();
    formData.append('cv', file);
    formData.append('goal', goal);

    try {
      const res = await api.post('/roadmaps/generate', formData);
      if (res.data.roadmapData) {
         navigate('/roadmap', { state: { roadmapData: res.data.roadmapData, agentChat: res.data.agentChat } });
      }
    } catch (err: any) {
      const status = err.response?.status;
      const serverMsg = err.response?.data?.message;

      if (status === 429) {
        toast.error("⚠️ Hết quota API Gemini!\n\n" + (serverMsg || "Giới hạn miễn phí: 20 request/ngày. Vui lòng đổi API key hoặc thử lại sau vài giờ."));
      } else if (status === 500) {
        toast.error("🤖 AI không tạo được lộ trình.\n\n" + (serverMsg || "Vui lòng thử lại."));
      } else if (status === 400 && serverMsg?.includes('PDF')) {
        toast.error("📄 Không thể đọc file PDF.\n\nFile có thể bị hỏng hoặc là ảnh scan. Hãy dùng file PDF text.");
      } else if (status === 401) {
        toast.error("🔒 Phiên đăng nhập hết hạn. Hệ thống đang tự làm mới...");
      } else {
        toast.error("❌ Lỗi: " + (serverMsg || err.message));
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen p-8 flex flex-col items-center justify-center font-sans">
      
      {/* Top Navbar */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-50">
         <div className="text-xl font-black text-gradient">SYSTEM.AI</div>
         <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-[var(--color-neon-blue)] bg-[var(--color-glass-overlay)] px-4 py-2 rounded-full border border-[var(--color-glass-border)]">
               <UserIcon className="w-4 h-4" />
               <span className="font-bold">{user?.fullName}</span>
            </div>
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-400 transition-colors bg-[var(--color-glass-overlay)] rounded-full border border-[var(--color-glass-border)]">
               <LogOut className="w-4 h-4" />
            </button>
         </div>
      </div>

      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[var(--color-neon-purple)] rounded-full mix-blend-screen filter blur-[150px] opacity-10 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[var(--color-neon-blue)] rounded-full mix-blend-screen filter blur-[150px] opacity-10 pointer-events-none"></div>
      
      {/* Landing Page Content */}
      <motion.div 
         initial={{ opacity: 0, y: 30 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ duration: 0.8 }}
         className="flex flex-col items-center justify-center text-center mt-12 mb-12 z-10 max-w-4xl mx-auto"
      >
         <h1 className="text-6xl md:text-7xl font-black mb-6 text-gradient tracking-tighter drop-shadow-lg">
            HỆ THỐNG ĐỊNH HƯỚNG NGHỀ NGHIỆP AI
         </h1>
         <p className="text-gray-400 text-lg md:text-xl max-w-2xl font-light leading-relaxed">
            Nền tảng Tự Lập Lộ Trình học tập tiên tiến nhất. Trí tuệ Nhân tạo sẽ tự động phân tích CV của bạn, dạo quanh Internet để ghép nối kiến thức và tạo ra một sơ đồ Skill Tree dành riêng cho bạn.
         </p>
      </motion.div>

      {/* Upload Panel */}
      <motion.div 
         initial={{ opacity: 0, scale: 0.9 }}
         animate={{ opacity: 1, scale: 1 }}
         transition={{ duration: 0.5, delay: 0.3 }}
         className="glass-panel p-10 max-w-2xl w-full relative overflow-hidden z-10 border border-[var(--color-neon-blue)]/30 hover:border-[var(--color-neon-blue)]/60 transition-colors shadow-2xl"
      >
        
        {isScanning && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center border-2 border-[var(--color-neon-purple)]">
             <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                className="w-16 h-16 border-4 border-[var(--color-neon-blue)] border-t-transparent rounded-full mb-6 shadow-[0_0_15px_var(--color-neon-blue)]"
             />
             <motion.p 
                key={scanStatus}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-[var(--color-neon-purple)] font-black uppercase tracking-widest text-lg text-center px-4"
             >
                {scanStatus}
             </motion.p>
             <p className="text-gray-500 text-xs mt-4 uppercase tracking-widest">Tiến trình này có thể mất từ 30s đến 1 phút</p>
          </div>
        )}
        
        <h2 className="text-2xl font-bold mb-6 text-center tracking-wide text-white">Khởi Trị Dữ Liệu Đầu Vào</h2>
        
        <div className="mb-6 glass-panel p-4 bg-black/40 border-dashed border-gray-600/50">
           <label className="block text-xs font-bold text-[var(--color-neon-purple)] mb-2 uppercase tracking-widest">Mục Tiêu Công Việc Của Bạn</label>
           <input 
              type="text" 
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full bg-transparent text-xl font-bold text-white focus:outline-none border-b border-gray-700 pb-2 focus:border-[var(--color-neon-purple)] transition-colors"
              placeholder="VD: Backend Nodejs, Data Analyst..."
              disabled={isScanning}
           />
        </div>

        <div className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all relative cursor-pointer group ${isScanning ? 'border-[var(--color-neon-blue)] neon-glow-primary' : 'border-[var(--color-glass-border)] hover:border-[var(--color-neon-purple)]'}`}>
          <input 
            type="file" 
            accept=".pdf"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleUpload}
            disabled={isScanning}
          />
          <UploadCloud className={`w-16 h-16 mx-auto mb-4 transition-colors ${isScanning ? 'text-[var(--color-neon-blue)]' : 'text-gray-400 group-hover:text-[var(--color-neon-purple)]'}`} />
          <h3 className="text-xl font-semibold mb-2">
            {file ? file.name : "Kéo thả hoặc nhấn để tải CV lên"}
          </h3>
          <p className="text-gray-500 text-sm">Chỉ hỗ trợ PDF</p>
        </div>

        {file && (
          <button 
            onClick={handleProcess}
            disabled={isScanning || !goal}
            className="mt-8 w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-[var(--color-neon-purple)] to-[var(--color-neon-blue)] hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(176,38,255,0.3)] hover:shadow-[0_0_30px_rgba(0,243,255,0.5)] disabled:opacity-50 disabled:cursor-wait"
          >
            {isScanning ? (
              <span className="animate-pulse tracking-wide uppercase">AI đang xử lý RAG & Phân tích...</span>
            ) : (
              <>
                <FileText className="w-5 h-5" /> 
                GỬI LỆNH CHO ĐẠI LÝ AI QUÉT LẠI CV
              </>
            )}
          </button>
        )}

        {!isScanning && !file && latestRoadmap && (
          <button 
            onClick={() => navigate('/roadmap', { state: { roadmapData: latestRoadmap, agentChat: "Chào mừng trở lại! Đây là lộ trình học tập của bạn." } })}
            className="mt-6 w-full py-4 rounded-xl font-bold text-lg bg-white/10 border border-white/20 hover:bg-white/20 transition-all flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5 text-[var(--color-neon-blue)]" /> 
            TIẾP TỤC VỚI LỘ TRÌNH GẦN NHẤT
          </button>
        )}
      </motion.div>
    </div>
  );
}
