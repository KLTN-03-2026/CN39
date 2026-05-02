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

  useEffect(() => {
    if (isScanning) {
      const steps = [
        "Đang đọc nội dung và trích xuất từ khóa CV...",
        "Truy vấn RAG (Retrieval-Augmented Generation)...",
        "Đang ráp nối kiến thức vào Vector DB...",
        "AI đang dựng trục Xương Sống của Cây Kỹ năng...",
        "AI Agent đang lọc bỏ các kiến thức bạn đã biết...",
        "Hoàn tất! Đang chuyển hướng..."
      ];
      let i = 0;
      setScanStatus(steps[0]);
      const timer = setInterval(() => {
        if (i < steps.length - 1) {
          i++;
          setScanStatus(steps[i]);
        }
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [isScanning]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) setFile(e.target.files[0]);
  };

  const handleProcess = async () => {
    if (!file) return;
    setIsScanning(true);
    const formData = new FormData();
    formData.append('cv', file);
    formData.append('goal', goal);

    try {
      const res = await api.post('/roadmaps/generate', formData);
      if (res.data.roadmapId) {
         navigate(`/roadmap/${res.data.roadmapId}`, { state: { roadmapData: res.data.roadmapData } });
      }
    } catch (err: any) {
      toast.error("Lỗi: " + (err.response?.data?.message || err.message));
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="min-h-screen p-8 flex flex-col items-center justify-center font-sans bg-black text-white">
      {/* Top Navbar */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-50">
         <div className="text-xl font-black text-blue-500">SYSTEM.AI</div>
         <div className="flex items-center gap-4">
            <div className="bg-gray-900 border border-gray-800 px-4 py-2 rounded-full flex items-center gap-2">
               <UserIcon className="w-4 h-4 text-blue-400" />
               <span className="font-bold text-sm">{user?.fullName}</span>
            </div>
            <button onClick={() => { logout(); navigate('/login'); }} className="p-2 hover:bg-red-900/20 rounded-full transition-colors"><LogOut className="w-4 h-4" /></button>
         </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-4xl mb-12">
         <h1 className="text-6xl md:text-7xl font-black mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600 tracking-tighter">AI CAREER ROADMAP</h1>
         <p className="text-gray-400 text-lg">Tải CV của bạn lên để AI Agent phân tích Gap Analysis và thiết kế lộ trình học tập chuyên biệt.</p>
      </motion.div>

      <div className="bg-gray-900/50 border border-gray-800 p-8 rounded-[2rem] w-full max-w-2xl relative overflow-hidden backdrop-blur-xl">
        {isScanning && (
          <div className="absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-8 text-center">
             <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6" />
             <p className="text-blue-400 font-bold uppercase tracking-widest">{scanStatus}</p>
          </div>
        )}

        <div className="mb-8">
           <label className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-2 block">Mục Tiêu Nghề Nghiệp</label>
           <input type="text" value={goal} onChange={(e) => setGoal(e.target.value)} className="w-full bg-transparent border-b border-gray-800 focus:border-purple-500 py-3 text-xl font-bold outline-none transition-colors" placeholder="VD: Senior React Developer" />
        </div>

        <div className="border-2 border-dashed border-gray-800 hover:border-blue-500 rounded-[1.5rem] p-12 text-center relative group transition-colors">
          <input type="file" accept=".pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleUpload} />
          <UploadCloud className="w-12 h-12 mx-auto mb-4 text-gray-600 group-hover:text-blue-500" />
          <h3 className="font-bold text-lg">{file ? file.name : "Tải lên CV (PDF)"}</h3>
          <p className="text-gray-500 text-sm mt-1">AI sẽ đọc kinh nghiệm của bạn từ đây</p>
        </div>

        {file && (
          <button onClick={handleProcess} className="w-full mt-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20">
            BẮT ĐẦU PHÂN TÍCH LỘ TRÌNH
          </button>
        )}

        {!isScanning && !file && latestRoadmap && (
          <button onClick={() => navigate(`/roadmap/${latestRoadmap._id}`)} className="w-full mt-6 py-4 rounded-xl bg-gray-800 hover:bg-gray-700 font-bold transition-all flex items-center justify-center gap-2">
            <Play className="w-4 h-4 text-blue-400" /> TIẾP TỤC HỌC TẬP
          </button>
        )}
      </div>
    </div>
  );
}
