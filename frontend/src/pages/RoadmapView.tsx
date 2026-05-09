import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '~/services/api';

// ═══════════════════════════════════════════════════════
//  RoadmapView — Timeline dọc + Floating Progress Bar + 4 Status
// ═══════════════════════════════════════════════════════

// Status config
const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  pending:     { color: '#acb3b7', bg: '#f1f4f6', icon: 'radio_button_unchecked', label: 'Pending' },
  in_progress: { color: '#3856c4', bg: '#eaedff', icon: 'pending',               label: 'In Progress' },
  done:        { color: '#00b341', bg: '#e6f9ee', icon: 'check_circle',           label: 'Done' },
  skip:        { color: '#d97706', bg: '#fffbeb', icon: 'skip_next',              label: 'Skipped' },
};

export default function RoadmapView() {
  const navigate = useNavigate();
  const { id, slug: previewSlug } = useParams();
  const [roadmapData, setRoadmapData] = useState<any>(null);
  const [topics, setTopics] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [topicStatuses, setTopicStatuses] = useState<Record<string, string>>({});
  const [stats, setStats] = useState({ total: 0, done: 0, inProgress: 0, skipped: 0, remaining: 0, percent: 0 });

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (previewSlug) {
          const res = await api.get(`/roadmaps/preview/${previewSlug}`);
          setRoadmapData(res.data?.template || null);
          setTopics(res.data?.topics || []);
        } else if (id) {
          const res = await api.get(`/roadmaps/${id}`);
          setRoadmapData(res.data?.roadmapData || null);
          setTopics(res.data?.topics || []);
          setTopicStatuses(res.data?.roadmapData?.topicStatuses || {});
        }
      } catch (err) {
        console.error('Failed to fetch roadmap:', err);
      }
      setIsLoading(false);
    };
    fetchData();
  }, [id, previewSlug]);

  // Fetch progress
  useEffect(() => {
    if (!id) return;
    api.get(`/roadmaps/progress/${id}`)
      .then(res => {
        setTopicStatuses(res.data?.topicStatuses || {});
        setStats(res.data?.stats || { total: 0, done: 0, inProgress: 0, skipped: 0, remaining: 0, percent: 0 });
      })
      .catch(() => {});
  }, [id]);

  // (Status change moved to LearnView)

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#3856c4] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!roadmapData) {
    return (
      <div className="flex h-screen items-center justify-center">
        <h2 className="text-xl font-bold text-red-500">Roadmap not found</h2>
      </div>
    );
  }

  // Phân tách main topics vs subtopics
  const mainTopics = topics.filter(t => !t.parentId).sort((a, b) => a.order - b.order);
  const getSubtopics = (parentId: string) => topics.filter(t => t.parentId?.toString() === parentId).sort((a, b) => a.order - b.order);

  const roadmapTitle = roadmapData.name || roadmapData.title || roadmapData.slug || 'Learning Path';

  const handleLearn = (topicSlug: string) => {
    if (id) {
      navigate(`/roadmap/learn/${id}/${topicSlug}`);
    }
  };

  return (
    <div className="min-h-screen">
      {/* ═══ FLOATING PROGRESS BAR ═══ */}
      {id && (
        <div className="sticky top-0 z-30 bg-[#1a1d1f] text-white px-6 py-4 shadow-2xl">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xl font-black">{stats.percent}%</span>
              <span className="text-sm font-medium text-white/60 capitalize">{roadmapTitle.replace(/-/g, ' ')}</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-[#3856c4] via-[#6366f1] to-[#8b5cf6] rounded-full transition-all duration-700"
                style={{ width: `${stats.percent}%` }}
              />
            </div>
            <div className="flex items-center gap-6 text-xs font-bold">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#00b341]" /> {stats.done} done
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#3856c4]" /> {stats.inProgress} in progress
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#d97706]" /> {stats.skipped} skipped
              </span>
              <span className="text-white/40">{stats.remaining} of {stats.total} remaining</span>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="pt-8 pb-32 px-6 md:px-12 lg:px-16 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-black font-['Manrope'] tracking-tight mb-3 capitalize">
            {roadmapTitle.replace(/-/g, ' ')}
          </h1>
        </div>

        {/* ═══ TIMELINE ═══ */}
        <div className="relative">
          <div className="absolute left-[28px] top-0 bottom-0 w-[2px] bg-[#e6e8ea]" />

          <div className="space-y-6">
            {mainTopics.map((topic, idx) => {
              const slug = topic.oldId || topic._id?.toString();
              const status = topicStatuses[slug] || 'pending';
              const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
              const subs = getSubtopics(topic._id?.toString());
              const isDoneOrSkip = status === 'done' || status === 'skip';

              return (
                <div key={slug || idx}>
                  {/* ── TOPIC CARD ── */}
                  <div className="flex items-start gap-6 relative">
                    {/* Status Circle */}
                    <div
                      className={`relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                        status === 'in_progress' ? 'animate-pulse' : ''
                      }`}
                      style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}
                    >
                      <span className="material-symbols-outlined text-xl">{statusConfig.icon}</span>
                    </div>

                    {/* Content Card */}
                    <div className={`flex-1 bg-white rounded-2xl p-6 border transition-all duration-300 ${
                      isDoneOrSkip ? 'border-[#e6e8ea] opacity-60' : 'border-[#e6e8ea] hover:border-[#3856c4]/30 hover:shadow-lg'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className={`text-lg font-black font-['Manrope'] ${
                              isDoneOrSkip ? 'line-through text-[#acb3b7]' : 'text-[#1a1d1f]'
                            }`}>
                              {topic.title}
                            </h3>
                            {roadmapData?.topicNotes?.[slug] && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-[#fef3c7] text-[#d97706] uppercase tracking-wider">
                                <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>star</span>
                                {roadmapData.topicNotes[slug]}
                              </span>
                            )}
                          </div>
                          {topic.description && (
                            <p className={`text-sm line-clamp-1 ${isDoneOrSkip ? 'text-[#d1d5db]' : 'text-[#6f767e]'}`}>
                              {topic.description.substring(0, 100)}
                            </p>
                          )}
                        </div>

                        {/* Learn Button */}
                        {id && !isDoneOrSkip && (
                          <button
                            onClick={() => handleLearn(slug)}
                            className="shrink-0 ml-4 px-5 py-2 bg-[#1a1d1f] text-white text-sm font-bold rounded-xl hover:bg-[#3856c4] transition-all"
                          >
                            Learn
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── SUBTOPICS ── */}
                  {subs.length > 0 && !isDoneOrSkip && (
                    <div className="ml-[104px] mt-3 space-y-2.5">
                      {subs.map((sub, sIdx) => {
                        const subSlug = sub.oldId || sub._id?.toString();
                        const subStatus = topicStatuses[subSlug] || 'pending';
                        const subConfig = STATUS_CONFIG[subStatus] || STATUS_CONFIG.pending;
                        const subDone = subStatus === 'done' || subStatus === 'skip';

                        return (
                          <div
                            key={subSlug || sIdx}
                            className={`flex items-center justify-between bg-white rounded-xl px-5 py-3 border transition-all group relative ${
                              subDone ? 'border-[#f1f4f6] opacity-50' : 'border-[#f1f4f6] hover:border-[#3856c4]/30 hover:shadow-sm cursor-pointer'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0" onClick={() => !subDone && id && handleLearn(subSlug)}>
                              <span className="material-symbols-outlined text-sm" style={{ color: subConfig.color }}>
                                {subConfig.icon}
                              </span>
                              <span className={`text-[13px] font-bold transition-colors truncate ${
                                subDone ? 'line-through text-[#acb3b7]' : 'text-[#596063] group-hover:text-[#3856c4]'
                              }`}>
                                {sub.title}
                              </span>
                            </div>
                            {/* Mini status toggle cho subtopic */}
                            {id && (
                              <button
                                onClick={() => {
                                  const next = subStatus === 'pending' ? 'done' : subStatus === 'done' ? 'skip' : 'pending';
                                  handleStatusChange(subSlug, next);
                                }}
                                className="shrink-0 ml-2 w-6 h-6 rounded-lg flex items-center justify-center hover:bg-[#f1f4f6] transition-all"
                                style={{ color: subConfig.color }}
                                title={`Current: ${subConfig.label}. Click to cycle.`}
                              >
                                <span className="material-symbols-outlined text-sm">{subConfig.icon}</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
