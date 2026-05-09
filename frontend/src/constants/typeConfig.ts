// Shared type config cho resource cards — dùng chung giữa LearnView, ResourcesLibrary, Bookmarks
export const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  article:    { icon: 'article',       color: '#3856c4', bg: '#eaedff', label: 'Article' },
  video:      { icon: 'play_circle',   color: '#dc2626', bg: '#fef2f2', label: 'Video' },
  course:     { icon: 'school',        color: '#7c3aed', bg: '#f5f3ff', label: 'Course' },
  official:   { icon: 'verified',      color: '#0d9488', bg: '#f0fdfa', label: 'Official' },
  roadmap:    { icon: 'route',         color: '#ea580c', bg: '#fff7ed', label: 'Roadmap' },
  feed:       { icon: 'rss_feed',      color: '#d97706', bg: '#fffbeb', label: 'Feed' },
  opensource: { icon: 'code',          color: '#059669', bg: '#ecfdf5', label: 'Open Source' },
  book:       { icon: 'menu_book',     color: '#6366f1', bg: '#eef2ff', label: 'Book' },
};

export const getTypeConfig = (type: string | undefined) => {
  return TYPE_CONFIG[(type || 'article').toLowerCase()] || TYPE_CONFIG.article;
};
