import React, { useEffect, useState, useCallback } from 'react';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useCache } from '../context/CacheContext';
import { BellIcon, SendIcon } from './Icons';
import StoriesBar from './StoriesBar';
import RightSidebar from './RightSidebar';
import VideoReel from './VideoReel';
import { SkeletonReel } from './Skeleton';
import type { Rec } from '../lib/types';

interface Props {
  onCreateClick: () => void;
  onActivityClick: () => void;
}

export default function FeedTab({ onCreateClick, onActivityClick }: Props) {
  const { user, username } = useAuth();
  const { cache, getUserPhoto, setUserPhoto } = useCache();
  const [recs, setRecs] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);
  const [noFollowing, setNoFollowing] = useState(false);

  const loadFeed = useCallback(async () => {
    if (!user || !username) return;
    // Use cache if available
    if (cache.current.feed) {
      setRecs(cache.current.feed);
      setLoading(false);
      setEmpty(cache.current.feed.length === 0);
      return;
    }

    setLoading(true);
    try {
      const d = await getDoc(doc(db, 'Users', user.uid));
      const following: string[] = d.exists() ? (d.data().following || []) : [];

      if (!following.length) {
        setNoFollowing(true);
        setLoading(false);
        cache.current.feed = [];
        return;
      }

      let all: Rec[] = [];
      for (let i = 0; i < following.length; i += 30) {
        const batch = following.slice(i, i + 30);
        let q;
        try {
          q = query(collection(db, 'Recommendations'), where('username', 'in', batch), orderBy('timestamp', 'desc'), limit(20));
        } catch {
          q = query(collection(db, 'Recommendations'), where('username', 'in', batch), limit(20));
        }
        const snap = await getDocs(q);
        snap.forEach(d => all.push({ ...d.data(), id: d.id } as Rec));
      }
      all.sort((a, b) => b.timestamp - a.timestamp);
      all = all.slice(0, 20);

      // Prefetch photos
      const uniqueUsers = [...new Set(all.map(r => r.username))];
      await Promise.all(uniqueUsers.map(async (u) => {
        if (getUserPhoto(u) !== undefined) return;
        const uq = query(collection(db, 'Users'), where('username', '==', u), limit(1));
        const snap = await getDocs(uq);
        if (!snap.empty) {
          setUserPhoto(u, snap.docs[0].data().photoURL || '');
        } else {
          setUserPhoto(u, '');
        }
      }));

      setRecs(all);
      setEmpty(all.length === 0);
      cache.current.feed = all;
    } catch {
      setEmpty(true);
    }
    setLoading(false);
  }, [user, username, cache, getUserPhoto, setUserPhoto]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  return (
    <>
      {/* Header card with stories */}
      <section className="reel reel-special">
        <div className="reel-bar">
          <div className="topnav-logo">Recommenderz</div>
          <button style={{ background: 'none', border: 'none', display: 'flex', padding: 0, position: 'relative' }} onClick={onActivityClick} aria-label="Activity">
            <BellIcon />
          </button>
          <button style={{ background: 'none', border: 'none', display: 'flex', padding: 0, position: 'relative' }} onClick={onCreateClick} aria-label="Share">
            <SendIcon />
          </button>
        </div>
        <div className="reel-scroll">
          <StoriesBar onCreateClick={onCreateClick} />
          <RightSidebar />
        </div>
      </section>

      {/* Feed content */}
      {loading ? (
        <SkeletonReel />
      ) : noFollowing ? (
        <section className="reel" style={{ justifyContent: 'center' }}>
          <div className="feed-empty">
            <svg className="feed-empty-icon" width="80" height="80" fill="none" stroke="#262626" strokeWidth="1" viewBox="0 0 24 24">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <h3>Welcome to Recommenderz</h3>
            <p>Follow people to see their video recommendations here.<br /><br />Use the search tab to find people to follow.</p>
          </div>
        </section>
      ) : empty ? (
        <section className="reel" style={{ justifyContent: 'center' }}>
          <div className="feed-empty">
            <p style={{ color: '#a8a8a8' }}>No recommendations yet from people you follow.</p>
          </div>
        </section>
      ) : (
        recs.map(r => (
          <VideoReel key={r.id || r.videoId + r.timestamp} rec={r} photoURL={getUserPhoto(r.username)} />
        ))
      )}
    </>
  );
}
