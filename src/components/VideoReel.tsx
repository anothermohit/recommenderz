import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { embedUrl } from '../lib/youtube';
import { timeAgo } from '../lib/youtube';
import { HeartIcon, CommentIcon, SendIcon, BookmarkIcon } from './Icons';
import { useToast } from '../hooks/useToast';
import type { Rec } from '../lib/types';

interface Props {
  rec: Rec;
  photoURL?: string;
}

export default function VideoReel({ rec, photoURL }: Props) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [liked, setLiked] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const lastTapRef = useRef(0);
  const caption = rec.caption || 'shared a video recommendation';

  const handleDoubleTap = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'IFRAME') return;
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!liked) setLiked(true);
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 800);
    }
    lastTapRef.current = now;
  }, [liked]);

  const toggleLike = () => {
    setLiked(prev => !prev);
  };

  const shareVideo = async () => {
    const url = 'https://youtube.com/watch?v=' + rec.videoId;
    try {
      if (navigator.share) {
        await navigator.share({ url });
      } else {
        await navigator.clipboard.writeText(url);
        showToast('Link copied to clipboard');
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        showToast('Link copied to clipboard');
      } catch { /* noop */ }
    }
  };

  const ava = photoURL
    ? <img src={photoURL} alt="" />
    : (rec.username ? rec.username[0].toUpperCase() : '?');

  return (
    <section className="reel">
      <div className="reel-head">
        <div className="post-ava-ring" onClick={() => navigate('/' + rec.username)}>
          <div className="post-ava">{ava}</div>
        </div>
        <div className="post-user" onClick={() => navigate('/' + rec.username)}>{rec.username}</div>
        <button className="post-dot" style={{ background: 'none', border: 'none', color: '#262626', padding: 4, fontSize: 16, letterSpacing: 2 }}>
          {'\u2022\u2022\u2022'}
        </button>
      </div>
      <div className="reel-media" onClick={handleDoubleTap}>
        <iframe
          src={embedUrl(rec.videoId)}
          allow="encrypted-media"
          allowFullScreen
          loading="lazy"
          title={rec.videoId}
        />
        {showHeart && (
          <div className="heart-overlay">
            <svg width="80" height="80" fill="#ed4956" viewBox="0 0 24 24">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
            </svg>
          </div>
        )}
      </div>
      <div className="reel-foot">
        <div className="post-actions">
          <button className={liked ? 'liked' : ''} onClick={toggleLike}>
            <HeartIcon filled={liked} />
          </button>
          <button onClick={() => window.open('https://youtube.com/watch?v=' + rec.videoId, '_blank')}>
            <CommentIcon />
          </button>
          <button onClick={shareVideo}>
            <SendIcon />
          </button>
          <button className="right">
            <BookmarkIcon />
          </button>
        </div>
        <div className="post-meta">
          <div className="caption">
            <b onClick={() => navigate('/' + rec.username)}>{rec.username}</b>{' '}
            <span>{caption}</span>
          </div>
          <div className="time">{timeAgo(rec.timestamp)}</div>
        </div>
      </div>
    </section>
  );
}
