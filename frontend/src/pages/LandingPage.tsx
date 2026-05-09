import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '~/services/api';
import { useAuth } from '~/context/AuthContext';

interface Template {
  slug: string;
  title: string;
  description?: string;
  category?: string;
}

// Parse slug/title → tên hiển thị đẹp
// VD: "ai-engineer" → "AI Engineer", "postgresql-dba" → "PostgreSQL DBA"
const DISPLAY_NAMES: Record<string, string> = {
  'frontend': 'Frontend Developer',
  'backend': 'Backend Developer',
  'full-stack': 'Full Stack Developer',
  'devops': 'DevOps Engineer',
  'devsecops': 'DevSecOps Engineer',
  'ai-engineer': 'AI Engineer',
  'ai-data-scientist': 'AI & Data Scientist',
  'data-engineer': 'Data Engineer',
  'data-analyst': 'Data Analyst',
  'android': 'Android Developer',
  'ios': 'iOS Developer',
  'machine-learning': 'Machine Learning',
  'postgresql-dba': 'PostgreSQL DBA',
  'blockchain': 'Blockchain Developer',
  'qa': 'QA Engineer',
  'software-architect': 'Software Architect',
  'cyber-security': 'Cyber Security',
  'ux-design': 'UX Design',
  'technical-writer': 'Technical Writer',
  'game-developer': 'Game Developer',
  'server-side-game-developer': 'Server-Side Game Dev',
  'mlops': 'MLOps Engineer',
  'product-manager': 'Product Manager',
  'engineering-manager': 'Engineering Manager',
  'devrel': 'Developer Relations',
  'bi-analyst': 'BI Analyst',
  'react': 'React',
  'vue': 'Vue.js',
  'angular': 'Angular',
  'typescript': 'TypeScript',
  'javascript': 'JavaScript',
  'python': 'Python',
  'java': 'Java',
  'golang': 'Go',
  'rust': 'Rust',
  'nodejs': 'Node.js',
  'docker': 'Docker',
  'kubernetes': 'Kubernetes',
  'sql': 'SQL',
  'mongodb': 'MongoDB',
  'graphql': 'GraphQL',
  'git-github': 'Git & GitHub',
  'aws': 'AWS',
  'linux': 'Linux',
  'redis': 'Redis',
  'system-design': 'System Design',
  'api-design': 'API Design',
  'terraform': 'Terraform',
  'prompt-engineering': 'Prompt Engineering',
  'computer-science': 'Computer Science',
  'ai-agents': 'AI Agents',
  'frontend-beginner': 'Frontend Beginner',
  'backend-beginner': 'Backend Beginner',
};

function getDisplayName(slug: string, title?: string): string {
  if (DISPLAY_NAMES[slug]) return DISPLAY_NAMES[slug];
  // Fallback: parse title hoặc slug
  const raw = title || slug;
  return raw
    .replace(/-/g, ' ')
    .replace(/\b(ai|qa|dba|ux|ui|api|sql|aws|mlops|bi|ios|devops|devsecops|devrel)\b/gi, m => m.toUpperCase())
    .replace(/\b\w/g, c => c.toUpperCase());
}

// Icon mapping theo slug keyword
function getPathIcon(slug: string): string {
  const map: Record<string, string> = {
    'frontend': 'web', 'backend': 'dns', 'full-stack': 'layers',
    'devops': 'cloud_sync', 'devsecops': 'security', 'ai': 'psychology',
    'data': 'analytics', 'android': 'smartphone', 'ios': 'phone_iphone',
    'machine': 'model_training', 'blockchain': 'token', 'qa': 'bug_report',
    'architect': 'architecture', 'cyber': 'shield', 'ux': 'design_services',
    'game': 'sports_esports', 'mlops': 'precision_manufacturing',
    'product': 'inventory_2', 'engineer': 'engineering', 'devrel': 'groups',
    'writer': 'edit_note', 'react': 'hub', 'vue': 'view_in_ar',
    'angular': 'change_history', 'typescript': 'code', 'javascript': 'javascript',
    'python': 'code', 'java': 'coffee', 'golang': 'code', 'rust': 'build',
    'docker': 'deployed_code', 'kubernetes': 'grid_view', 'sql': 'storage',
    'mongodb': 'database', 'graphql': 'scatter_plot', 'git': 'account_tree',
    'aws': 'cloud', 'linux': 'terminal', 'redis': 'bolt', 'terraform': 'construction',
    'system': 'schema', 'api': 'api', 'prompt': 'auto_awesome', 'computer': 'computer',
  };
  for (const [key, icon] of Object.entries(map)) {
    if (slug.includes(key)) return icon;
  }
  return 'school';
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard');
    api.get('/roadmaps/templates').then(res => setTemplates(res.data.templates || [])).catch(() => {});
  }, [isAuthenticated, navigate]);

  const roleTemplates = templates.filter(t => t.category === 'role' || !t.category);

  const handleGetStarted = () => {
    navigate(isAuthenticated ? '/dashboard' : '/login');
  };

  return (
    <div className="bg-[#fafbfc] min-h-screen font-['Inter'] text-[#1a1d1f] antialiased">

      {/* ═══════════ NAVBAR ═══════════ */}
      <header className="fixed top-0 w-full z-50 border-b border-black/5" style={{ background: 'rgba(250,251,252,0.8)', backdropFilter: 'blur(20px)' }}>
        <div className="flex justify-between items-center h-16 px-8 max-w-7xl mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1a1d1f] flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-sm">route</span>
            </div>
            <span className="text-base font-black tracking-tight font-['Manrope']">RoadmapAI</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-[13px] font-semibold text-[#6f767e]">
            <a href="#paths" className="hover:text-[#1a1d1f] transition-colors">Lộ trình</a>
            <a href="#how" className="hover:text-[#1a1d1f] transition-colors">Cách hoạt động</a>
            <a href="#features" className="hover:text-[#1a1d1f] transition-colors">Tính năng</a>
          </nav>
          <div className="flex items-center gap-4">
            {!isAuthenticated && (
              <button onClick={() => navigate('/login')} className="text-[13px] font-bold text-[#6f767e] hover:text-[#1a1d1f] transition-colors">
                Đăng nhập
              </button>
            )}
            <button
              onClick={handleGetStarted}
              className="px-5 py-2 text-[13px] font-bold text-white rounded-xl bg-[#1a1d1f] hover:bg-[#3856c4] transition-all"
            >
              {isAuthenticated ? 'Dashboard' : 'Bắt đầu miễn phí'}
            </button>
          </div>
        </div>
      </header>

      {/* ═══════════ HERO ═══════════ */}
      <section className="pt-36 pb-20 px-8 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#3856c4]/10 text-[#3856c4] text-xs font-bold mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3856c4] animate-pulse" />
          AI-Powered Career Roadmaps
        </div>
        <h1 className="text-4xl md:text-[56px] font-black font-['Manrope'] tracking-tight leading-[1.1] mb-6">
          Lộ trình nghề nghiệp<br />
          <span className="bg-gradient-to-r from-[#3856c4] to-[#8b5cf6] bg-clip-text text-transparent">cá nhân hóa bằng AI</span>
        </h1>
        <p className="text-lg text-[#6f767e] max-w-xl mx-auto leading-relaxed mb-10">
          Upload CV — AI phân tích kỹ năng — Nhận lộ trình học tập tối ưu với 11,000+ tài liệu chất lượng cao.
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handleGetStarted}
            className="px-8 py-3.5 text-sm font-bold text-white rounded-2xl bg-[#1a1d1f] hover:bg-[#3856c4] transition-all shadow-xl shadow-black/10 hover:shadow-[#3856c4]/20"
          >
            Bắt đầu ngay
            <span className="material-symbols-outlined align-middle ml-2 text-base">arrow_forward</span>
          </button>
          <button
            onClick={() => document.getElementById('paths')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-6 py-3.5 text-sm font-bold text-[#6f767e] rounded-2xl border border-[#e6e8ea] hover:border-[#1a1d1f] hover:text-[#1a1d1f] transition-all"
          >
            Xem lộ trình
          </button>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-10 mt-14">
          {[
            { value: '11,000+', label: 'Tài liệu' },
            { value: '60+', label: 'Lộ trình' },
            { value: 'AI', label: 'Gap Analysis' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <p className="text-2xl font-black font-['Manrope']">{s.value}</p>
              <p className="text-xs text-[#acb3b7] font-semibold">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ CAREER PATHS (Infinite Scroll) ═══════════ */}
      <section id="paths" className="pb-24 overflow-hidden">
        <div className="text-center mb-12 px-8">
          <h2 className="text-3xl font-black font-['Manrope'] tracking-tight mb-3">Khám phá lộ trình</h2>
          <p className="text-[#6f767e] max-w-md mx-auto">Hơn 60 lộ trình từ cơ bản đến chuyên sâu, được cập nhật liên tục.</p>
        </div>

        {/* Row 1 — scroll left */}
        <div className="relative w-full flex overflow-x-hidden mb-4">
          <div className="flex animate-[scrollLeft_60s_linear_infinite] gap-4 w-max">
            {[...roleTemplates, ...roleTemplates].map((t, idx) => (
              <div key={`r1-${t.slug}-${idx}`}
                className="shrink-0 flex items-center gap-3 bg-white rounded-2xl px-5 py-3.5 border border-[#f1f4f6] hover:border-[#3856c4]/30 hover:shadow-lg transition-all cursor-default"
              >
                <div className="w-9 h-9 rounded-xl bg-[#f4f6fb] flex items-center justify-center text-[#3856c4]">
                  <span className="material-symbols-outlined text-lg">{getPathIcon(t.slug)}</span>
                </div>
                <span className="text-sm font-bold whitespace-nowrap">{getDisplayName(t.slug, t.title)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Row 2 — scroll right (reversed) */}
        <div className="relative w-full flex overflow-x-hidden">
          <div className="flex animate-[scrollRight_55s_linear_infinite] gap-4 w-max">
            {[...roleTemplates.slice().reverse(), ...roleTemplates.slice().reverse()].map((t, idx) => (
              <div key={`r2-${t.slug}-${idx}`}
                className="shrink-0 flex items-center gap-3 bg-white rounded-2xl px-5 py-3.5 border border-[#f1f4f6] hover:border-[#3856c4]/30 hover:shadow-lg transition-all cursor-default"
              >
                <div className="w-9 h-9 rounded-xl bg-[#f4f6fb] flex items-center justify-center text-[#3856c4]">
                  <span className="material-symbols-outlined text-lg">{getPathIcon(t.slug)}</span>
                </div>
                <span className="text-sm font-bold whitespace-nowrap">{getDisplayName(t.slug, t.title)}</span>
              </div>
            ))}
          </div>
        </div>

        <style>{`
          @keyframes scrollLeft {
            0% { transform: translateX(0); }
            100% { transform: translateX(calc(-50% - 8px)); }
          }
          @keyframes scrollRight {
            0% { transform: translateX(calc(-50% - 8px)); }
            100% { transform: translateX(0); }
          }
        `}</style>
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section id="how" className="py-24 px-8 bg-[#f1f4f6]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black font-['Manrope'] tracking-tight mb-3">Cách hoạt động</h2>
            <p className="text-[#6f767e]">3 bước đơn giản để có lộ trình tối ưu</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: 'upload_file', step: '01', title: 'Upload CV', desc: 'Tải lên CV để AI nhận diện kỹ năng hiện tại. Dù bạn mới bắt đầu hay đã có kinh nghiệm.' },
              { icon: 'target', step: '02', title: 'Chọn mục tiêu', desc: 'Chọn vị trí nghề nghiệp mơ ước. AI sẽ phân tích gap giữa kỹ năng hiện có và yêu cầu.' },
              { icon: 'route', step: '03', title: 'Nhận lộ trình', desc: 'Lộ trình cá nhân hóa chỉ chứa những kiến thức bạn CẦN học, tiết kiệm hàng tháng mò mẫm.' },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 relative overflow-hidden">
                <span className="absolute top-4 right-5 text-5xl font-black text-[#f1f4f6] font-['Manrope']">{s.step}</span>
                <div className="w-12 h-12 rounded-2xl bg-[#1a1d1f] flex items-center justify-center text-white mb-5">
                  <span className="material-symbols-outlined">{s.icon}</span>
                </div>
                <h3 className="text-lg font-black font-['Manrope'] mb-2">{s.title}</h3>
                <p className="text-sm text-[#6f767e] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FEATURES ═══════════ */}
      <section id="features" className="py-24 px-8 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-black font-['Manrope'] tracking-tight mb-3">Tính năng nổi bật</h2>
          <p className="text-[#6f767e] max-w-md mx-auto">Mọi thứ bạn cần để học tập hiệu quả, tất cả ở một nơi.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {[
            { icon: 'auto_stories', title: 'Kho tài liệu 11,000+', desc: 'Bài viết, video, khóa học từ cộng đồng công nghệ toàn cầu.' },
            { icon: 'psychology', title: 'AI Tutor 24/7', desc: 'Trợ lý AI sẵn sàng giải đáp thắc mắc ngay trong bài học.' },
            { icon: 'trending_up', title: 'Theo dõi tiến trình', desc: '4 trạng thái cho mỗi chủ đề: Pending, In Progress, Done, Skip.' },
            { icon: 'bookmark', title: 'Bookmark tài liệu', desc: 'Lưu lại tài liệu hay để đọc lại bất cứ lúc nào.' },
          ].map((f, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-[#f1f4f6] hover:shadow-lg transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#f4f6fb] flex items-center justify-center text-[#3856c4] mb-4">
                <span className="material-symbols-outlined">{f.icon}</span>
              </div>
              <h4 className="font-black font-['Manrope'] mb-1">{f.title}</h4>
              <p className="text-sm text-[#6f767e] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ CTA ═══════════ */}
      <section className="py-20 px-8 text-center bg-[#1a1d1f]">
        <h2 className="text-3xl font-black font-['Manrope'] text-white mb-4">Bắt đầu hành trình ngay hôm nay</h2>
        <p className="text-white/50 mb-8 max-w-md mx-auto">Lộ trình đầu tiên của bạn hoàn toàn miễn phí. Không cần thẻ tín dụng.</p>
        <button
          onClick={handleGetStarted}
          className="px-8 py-3.5 bg-white text-[#1a1d1f] font-bold rounded-2xl hover:bg-[#3856c4] hover:text-white transition-all shadow-xl"
        >
          Trải nghiệm miễn phí
        </button>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="py-8 px-8 bg-[#f1f4f6]">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#1a1d1f] flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-xs">route</span>
            </div>
            <span className="text-sm font-black font-['Manrope']">RoadmapAI</span>
          </div>
          <p className="text-xs text-[#acb3b7]">© 2025 RoadmapAI. Structured Serenity in Education.</p>
        </div>
      </footer>
    </div>
  );
}
