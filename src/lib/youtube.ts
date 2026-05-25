// Extract an 11-char YouTube video id from any common URL shape.
export function parseVideoId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

export function embedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

export function thumbUrl(videoId: string, quality: 'mq' | 'hq' | 'default' = 'mq'): string {
  const q = quality === 'hq' ? 'hqdefault' : quality === 'default' ? 'default' : 'mqdefault';
  return `https://img.youtube.com/vi/${videoId}/${q}.jpg`;
}

export function timeAgo(ts?: number): string {
  if (!ts) return '';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return m + 'm';
  const h = Math.floor(m / 60); if (h < 24) return h + 'h';
  const d = Math.floor(h / 24); if (d < 7) return d + 'd';
  return Math.floor(d / 7) + 'w';
}
