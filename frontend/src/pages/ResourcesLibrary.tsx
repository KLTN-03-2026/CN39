import React, { useEffect, useState } from 'react';
import { api } from '~/services/api';
import { useNavigate } from 'react-router-dom';

interface Resource {
  _id: string;
  title: string;
  url: string;
  description?: string;
  type?: string;
  topic_id?: string;
}

export default function ResourcesLibrary() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/resources')
      .then(res => setResources(res.data.resources || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = resources.filter(r => {
    if (filter === 'all') return true;
    return r.type?.toLowerCase() === filter;
  });

  const getTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'video': return 'play_circle';
      case 'course': return 'school';
      case 'official': return 'verified';
      case 'roadmap': return 'map';
      default: return 'article';
    }
  };

  return (
    <div className="bg-[#f7f9fb] min-h-screen pt-32 px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-5xl font-black mb-8">Resource Library</h1>
        
        <div className="flex gap-4 mb-12">
          {['all', 'article', 'video', 'course', 'official', 'roadmap'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-2 rounded-full font-bold uppercase text-xs transition-all ${filter === f ? 'bg-black text-white' : 'bg-white text-gray-500 hover:bg-gray-100'}`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(r => (
            <div key={r._id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
              <span className="material-symbols-outlined text-gray-300 mb-4 block group-hover:text-black">{getTypeIcon(r.type || '')}</span>
              <h3 className="text-xl font-bold mb-2 line-clamp-2">{r.title}</h3>
              <p className="text-gray-500 text-sm mb-6 line-clamp-3">{r.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-blue-500">{r.topic_id}</span>
                <a href={r.url} target="_blank" rel="noreferrer" className="bg-black text-white px-4 py-2 rounded-xl text-xs font-bold">Visit</a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
