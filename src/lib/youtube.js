// Extracts the 11-char video ID from any common YouTube URL shape:
// watch?v=ID, youtu.be/ID, /embed/ID, /shorts/ID. Returns null if it
// doesn't look like a YouTube video URL.
export function extractYouTubeId(url) {
  try {
    const u = new URL(url.trim());
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('/')[0] || null;
    if (u.hostname.includes('youtube.com')) {
      if (u.searchParams.get('v')) return u.searchParams.get('v');
      const match = u.pathname.match(/\/(embed|shorts)\/([^/?]+)/);
      if (match) return match[2];
    }
    return null;
  } catch {
    return null;
  }
}

export const youtubeThumbnail = (id) => `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
export const youtubeEmbedUrl = (id) => `https://www.youtube.com/embed/${id}`;
