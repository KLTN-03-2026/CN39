import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '~/services/api';
import toast from 'react-hot-toast';

export default function NewRoadmap() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedGoal, setSelectedGoal] = useState('');
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    api.get('/roadmaps/templates')
      .then(res => setTemplates(res.data?.templates || []))
      .catch(() => {});
  }, []);

  const handleGenerate = async () => {
    if (!cvFile) { toast.error('Vui lòng tải lên CV'); return; }
    if (!selectedGoal) { toast.error('Vui lòng chọn mục tiêu nghề nghiệp'); return; }

    setIsGenerating(true);
    setProgress(10);

    const formData = new FormData();
    formData.append('cv', cvFile);
    formData.append('goal', selectedGoal);

    // Simulate progress
    const progressTimer = setInterval(() => {
      setProgress(p => Math.min(p + 8, 90));
    }, 1000);

    try {
      const res = await api.post('/roadmaps/generate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      clearInterval(progressTimer);
      setProgress(100);
      toast.success('Tạo lộ trình thành công!');
      setTimeout(() => navigate(`/roadmap/${res.data.roadmapId}`), 500);
    } catch (err: any) {
      clearInterval(progressTimer);
      setProgress(0);
      const msg = err.response?.data?.message || 'Lỗi tạo lộ trình';
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  // Icon mapping
  const getIcon = (slug: string) => {
    const map: Record<string, string> = {
      'frontend': 'auto_awesome_motion', 'backend': 'database', 'ai-engineer': 'psychology',
      'devops': 'cloud_sync', 'cyber-security': 'security', 'android': 'smartphone',
      'full-stack': 'layers', 'qa': 'bug_report', 'ux-design': 'design_services',
      'react': 'hub', 'python': 'code', 'java': 'code',
    };
    return map[slug] || 'school';
  };

  return (
    <div className="pt-10 pb-24 px-8 max-w-4xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-black font-['Manrope'] tracking-tight mb-2">Tạo Lộ trình mới</h1>
        <p className="text-[#6f767e]">Upload CV và chọn mục tiêu nghề nghiệp để AI tạo lộ trình cá nhân hóa</p>
      </div>

      {/* Step 1: Chọn mục tiêu */}
      <div className="mb-8">
        <h2 className="text-sm font-black uppercase tracking-wider text-[#acb3b7] mb-4">1. Chọn mục tiêu</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {templates.slice(0, 12).map((t: any) => (
            <button
              key={t.slug || t._id}
              onClick={() => setSelectedGoal(t.title || t.slug)}
              className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
                selectedGoal === (t.title || t.slug)
                  ? 'border-[#3856c4] bg-[#3856c4]/5'
                  : 'border-[#f1f4f6] hover:border-[#3856c4]/30'
              }`}
            >
              <span className="material-symbols-outlined text-[#3856c4]">{getIcon(t.slug)}</span>
              <span className="text-sm font-bold truncate">{t.title || t.slug}</span>
            </button>
          ))}
        </div>
        {/* Custom input */}
        <div className="mt-3">
          <input
            type="text"
            placeholder="Hoặc nhập mục tiêu khác..."
            value={selectedGoal}
            onChange={e => setSelectedGoal(e.target.value)}
            className="w-full bg-[#f7f9fb] border border-[#f1f4f6] rounded-2xl py-3.5 px-5 text-sm focus:outline-none focus:ring-4 focus:ring-[#3856c4]/10 font-medium"
          />
        </div>
      </div>

      {/* Step 2: Upload CV */}
      <div className="mb-8">
        <h2 className="text-sm font-black uppercase tracking-wider text-[#acb3b7] mb-4">2. Upload CV (PDF)</h2>
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#e6e8ea] rounded-2xl p-10 cursor-pointer hover:border-[#3856c4]/40 hover:bg-[#3856c4]/5 transition-all">
          <span className="material-symbols-outlined text-4xl text-[#acb3b7] mb-3">upload_file</span>
          <p className="text-sm font-bold text-[#6f767e]">
            {cvFile ? cvFile.name : 'Click để chọn file PDF'}
          </p>
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={e => setCvFile(e.target.files?.[0] || null)}
          />
        </label>
      </div>

      {/* Progress bar khi generate */}
      {isGenerating && (
        <div className="mb-6">
          <div className="w-full h-3 bg-[#f1f4f6] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#3856c4] to-[#6366f1] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-[#acb3b7] mt-2 text-center">AI đang phân tích CV và tạo lộ trình... ({progress}%)</p>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || !cvFile || !selectedGoal}
        className="w-full py-4 bg-[#1a1d1f] text-white font-bold rounded-2xl hover:bg-[#3856c4] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg text-sm"
      >
        {isGenerating ? 'Đang tạo...' : 'Tạo Lộ Trình Cá Nhân'}
      </button>
    </div>
  );
}
