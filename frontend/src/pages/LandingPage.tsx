import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '~/services/api';
import { useAuth } from '~/context/AuthContext';

interface Template {
  slug: string;
  title: string;
  description: string;
  totalPhases: number;
  totalTopics: number;
}

const CARDS_PER_PAGE = 4;

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
    api.get('/roadmaps/templates').then(res => setTemplates(res.data.templates || [])).catch(() => {});
  }, [isAuthenticated, navigate]);

  const totalPages = Math.ceil(templates.length / CARDS_PER_PAGE);
  const visibleTemplates = templates.slice(page * CARDS_PER_PAGE, (page + 1) * CARDS_PER_PAGE);

  const handlePathClick = (template: Template) => {
    localStorage.setItem('selected_path_id', template.id);
    localStorage.setItem('selected_path_title', template.title);
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  const handleGetStarted = () => {
    if (isAuthenticated) navigate('/dashboard');
    else navigate('/login');
  };

  return (
    <div className="bg-[#f7f9fb] min-h-screen font-['Inter'] text-[#2d3337] antialiased">

      {/* ═══════════ NAVBAR ═══════════ */}
      <header className="fixed top-0 w-full z-50" style={{ background: 'rgba(247,249,251,0.7)', backdropFilter: 'blur(20px)' }}>
        <div className="flex justify-between items-center h-20 px-8 max-w-7xl mx-auto">
          <span className="text-xl font-extrabold tracking-tight font-['Manrope'] text-[#3856c4]">Path For Student</span>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#596063]">
            <a href="#paths" className="hover:text-[#3856c4] transition-colors">Career Paths</a>
            <a href="#how" className="hover:text-[#3856c4] transition-colors">How It Works</a>
            <a href="#features" className="hover:text-[#3856c4] transition-colors">Features</a>
          </nav>
          <button
            onClick={handleGetStarted}
            className="px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-md transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #3856c4, #2949b7)' }}
          >
            {isAuthenticated ? 'Dashboard' : 'Get Started'}
          </button>
        </div>
      </header>

      {/* ═══════════ HERO ═══════════ */}
      <section className="pt-40 pb-24 px-8 max-w-5xl mx-auto text-center">
        <p className="uppercase text-xs font-bold tracking-[0.15em] text-[#742fe5] mb-4">Structured Serenity in Education</p>
        <h1 className="text-5xl md:text-6xl font-extrabold font-['Manrope'] tracking-tight leading-tight text-[#2d3337] mb-6">
          Clear roadmap from student<br />to <span className="text-[#3856c4]">developer</span>, <span className="text-[#00687b]">data</span> or <span className="text-[#742fe5]">AI</span> roles.
        </h1>
        <p className="text-lg text-[#596063] max-w-2xl mx-auto leading-relaxed mb-10">
          Join thousands of students building their future with structured serenity. Upload your CV, pick a path, and let AI craft your personalized roadmap.
        </p>
        <button
          onClick={handleGetStarted}
          className="px-8 py-4 text-base font-bold text-white rounded-xl shadow-lg transition-all hover:shadow-xl hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #3856c4, #2949b7)' }}
        >
          Start Your Journey
          <span className="material-symbols-outlined align-middle ml-2" style={{ fontSize: 20 }}>arrow_forward</span>
        </button>
      </section>

      {/* ═══════════ CAREER PATHS (Dynamic from DB + Pagination) ═══════════ */}
      <section id="paths" className="pb-24 px-8 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="uppercase text-xs font-bold tracking-[0.15em] text-[#742fe5] mb-2">Career Paths</p>
          <h2 className="text-3xl font-extrabold font-['Manrope'] tracking-tight">Choose Your Destination</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {visibleTemplates.map(t => (
            <div
              key={t.id}
              className="bg-white rounded-2xl p-6 transition-all hover:shadow-lg cursor-pointer group"
              style={{ boxShadow: '0 2px 12px rgba(45,51,55,0.04)' }}
              onClick={() => handlePathClick(t)}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white"
                style={{ background: 'linear-gradient(135deg, #3856c4, #2949b7)' }}>
                <span className="material-symbols-outlined">route</span>
              </div>
              <h3 className="text-lg font-bold font-['Manrope'] text-[#2d3337] mb-2 group-hover:text-[#3856c4] transition-colors">{t.title}</h3>
              <p className="text-sm text-[#596063] mb-4 line-clamp-2">{t.description}</p>
              <div className="flex items-center gap-3 text-xs text-[#757c7f]">
                <span>{t.totalPhases} phases</span>
                <span>•</span>
                <span>{t.totalTopics} skills</span>
              </div>
              <div className="mt-4 flex items-center text-sm font-bold text-[#3856c4] opacity-0 group-hover:opacity-100 transition-opacity">
                View Path <span className="material-symbols-outlined ml-1" style={{ fontSize: 18 }}>arrow_forward</span>
              </div>
            </div>
          ))}
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 mt-10">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#596063] hover:text-[#3856c4] disabled:opacity-30 transition-all shadow-sm"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${
                  i === page
                    ? 'text-white shadow-md'
                    : 'bg-white text-[#596063] hover:text-[#3856c4] shadow-sm'
                }`}
                style={i === page ? { background: 'linear-gradient(135deg, #3856c4, #2949b7)' } : {}}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#596063] hover:text-[#3856c4] disabled:opacity-30 transition-all shadow-sm"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        )}
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section id="how" className="py-24 px-8" style={{ background: '#f1f4f6' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="uppercase text-xs font-bold tracking-[0.15em] text-[#00687b] mb-2">How It Works</p>
            <h2 className="text-3xl font-extrabold font-['Manrope'] tracking-tight">Your Roadmap to Success</h2>
            <p className="text-[#596063] mt-3">A friction-less journey designed for maximum retention and professional growth.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: 'target', title: 'Choose Goal', desc: 'Select your desired career destination from our curated industry categories.' },
              { icon: 'auto_awesome', title: 'Get Roadmap', desc: 'Receive a personalized, phase-by-phase curriculum with verified resources.' },
              { icon: 'trending_up', title: 'Track Progress', desc: 'Gamify your learning experience with milestones, skill trees, and badges.' }
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 text-center" style={{ boxShadow: '0 2px 12px rgba(45,51,55,0.04)' }}>
                <div className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center text-white"
                  style={{ background: 'linear-gradient(135deg, #00687b, #005b6c)' }}>
                  <span className="material-symbols-outlined">{s.icon}</span>
                </div>
                <h3 className="text-lg font-bold font-['Manrope'] mb-2">{s.title}</h3>
                <p className="text-sm text-[#596063] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FEATURES ═══════════ */}
      <section id="features" className="py-24 px-8 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="uppercase text-xs font-bold tracking-[0.15em] text-[#742fe5] mb-2">Features</p>
          <h2 className="text-3xl font-extrabold font-['Manrope'] tracking-tight">Mastery at your fingertips.</h2>
          <p className="text-[#596063] mt-3 max-w-xl mx-auto">Our dashboard provides the focus you need. No more tab-switching or lost bookmarks.</p>
        </div>

        <div className="flex flex-col gap-4 mb-12 max-w-lg mx-auto">
          {['Dynamic Skill Tree Visualization', 'Curated High-Quality Resources', 'Daily Task Checklist & Focus Mode'].map((f, i) => (
            <div key={i} className="flex items-center gap-3 bg-white rounded-xl px-5 py-4" style={{ boxShadow: '0 2px 8px rgba(45,51,55,0.04)' }}>
              <span className="material-symbols-outlined text-[#00687b]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              <span className="text-sm font-medium">{f}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {[
            { icon: 'school', title: 'Structured Learning', desc: 'No more infinite scrolling on YouTube. Get a curated path that actually leads to a job.' },
            { icon: 'work', title: 'Industry Focused', desc: 'Projects based on real-world scenarios designed by engineers from top tech companies.' },
            { icon: 'group', title: 'Mentorship', desc: 'Direct access to a community of experts who can unblock your learning journey.' },
            { icon: 'badge', title: 'Job Readiness', desc: 'We help you build a portfolio that stands out to recruiters and prepares you for interviews.' }
          ].map((f, i) => (
            <div key={i} className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 2px 12px rgba(45,51,55,0.04)' }}>
              <span className="material-symbols-outlined text-[#3856c4] mb-3 block">{f.icon}</span>
              <h4 className="font-bold font-['Manrope'] mb-1">{f.title}</h4>
              <p className="text-sm text-[#596063] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ CTA ═══════════ */}
      <section className="py-20 px-8 text-center" style={{ background: 'linear-gradient(135deg, #3856c4, #2949b7)' }}>
        <h2 className="text-3xl font-extrabold font-['Manrope'] text-white mb-4">Start building your future today</h2>
        <p className="text-white/70 mb-8 max-w-lg mx-auto">Join 10,000+ students navigating their path with structured serenity. Your first roadmap is completely free.</p>
        <button
          onClick={handleGetStarted}
          className="px-8 py-4 bg-white text-[#3856c4] font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
        >
          Get Started Free
        </button>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="py-12 px-8 bg-[#f1f4f6]">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <span className="text-sm font-bold font-['Manrope'] text-[#3856c4]">Path For Student</span>
          <p className="text-xs text-[#757c7f]">Structured Serenity in Education. Built for the architects of tomorrow.</p>
          <p className="text-xs text-[#acb3b7]">© 2024 Path For Student. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
