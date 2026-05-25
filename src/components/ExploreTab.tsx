import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy, limit, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useCache } from '../context/CacheContext';
import { useToast } from '../hooks/useToast';
import { SearchIcon } from './Icons';
import VideoReel from './VideoReel';
import { SkeletonReel } from './Skeleton';
import type { Rec, UserDoc } from '../lib/types';

export default function ExploreTab() {
  const { user, username } = useAuth();
  const { cache, getUserPhoto, setUserPhoto } = useCache();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [searchVal, setSearchVal] = useState('');
  const [searchResults, setSearchResults] = useState<(UserDoc & { isFollowing: boolean })[]>([]);
  const [recs, setRecs] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);

  const loadExploreGrid = useCallback(async () => {
    if (cache.current.explore) {
      setRecs(cache.current.explore);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const q = query(collection(db, 'Recommendations'), orderBy('timestamp', 'desc'), limit(30));
      const snap = await getDocs(q);
      const items: Rec[] = [];
      snap.forEach(d => items.push(d.data() as Rec));

      // prefetch photos
      const uniqueUsers = [...new Set(items.map(r => r.username))];
      await Promise.all(uniqueUsers.map(async (u) => {
        if (getUserPhoto(u) !== undefined) return;
        const uq = query(collection(db, 'Users'), where('username', '==', u), limit(1));
        const s = await getDocs(uq);
        setUserPhoto(u, !s.empty ? (s.docs[0].data().photoURL || '') : '');
      }));

      setRecs(items);
      cache.current.explore = items;
    } catch {
      setRecs([]);
    }
    setLoading(false);
  }, [cache, getUserPhoto, setUserPhoto]);

  useEffect(() => {
    loadExploreGrid();
  }, [loadExploreGrid]);

  const handleSearch = useCallback(async (val: string) => {
    setSearchVal(val);
    if (val.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    if (!user) return;
    const t = val.trim().toLowerCase();
    const q = query(collection(db, 'Users'), where('username', '>=', t), where('username', '<=', t + '\uf8ff'), limit(10));
    const snap = await getDocs(q);
    const md = await getDoc(doc(db, 'Users', user.uid));
    const myFollowing: string[] = md.exists() ? (md.data().following || []) : [];

    const results: (UserDoc & { isFollowing: boolean })[] = [];
    snap.forEach(d => {
      const data = d.data() as UserDoc;
      if (data.username !== username) {
        results.push({ ...data, isFollowing: myFollowing.includes(data.username) });
      }
    });
    setSearchResults(results);
  }, [user, username]);

  const handleToggleFollow = async (target: string, btn: HTMLButtonElement) => {
    if (!user) return;
    const r = doc(db, 'Users', user.uid);
    const isFollowing = btn.textContent === 'Following';
    if (isFollowing) {
      await updateDoc(r, { following: arrayRemove(target) });
      btn.textContent = 'Follow';
      btn.classList.remove('on');
      showToast(`Unfollowed @${target}`);
    } else {
      await updateDoc(r, { following: arrayUnion(target) });
      btn.textContent = 'Following';
      btn.classList.add('on');
      showToast(`Following @${target}`);
    }
    cache.current.feed = null;
    cache.current.activity = false;
    cache.current.profiles = {};
  };

  const showGrid = searchVal.trim().length < 2;

  return (
    <>
      {/* Search card */}
      <section className="reel reel-special">
        <div className="reel-bar" style={{ borderBottom: 'none', paddingBottom: 6 }}>
          <div className="topnav-logo" style={{ fontSize: 20 }}>Explore</div>
        </div>
        <div className="search-wrap" style={{ position: 'static' }}>
          <div className="search-wrap-inner">
            <SearchIcon />
            <input
              type="text"
              className="search-box"
              placeholder="Search"
              value={searchVal}
              onChange={e => handleSearch(e.target.value)}
              style={{ paddingLeft: 36 }}
            />
            <div className="search-icon" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
              <SearchIcon />
            </div>
          </div>
        </div>
        <div className="reel-scroll">
          {searchResults.map(u => (
            <div key={u.username} className="user-row" onClick={() => navigate('/' + u.username)}>
              <div className="user-row-ava">
                {u.photoURL ? <img src={u.photoURL} alt="" /> : u.username[0].toUpperCase()}
              </div>
              <div className="user-row-info">
                <div className="user-row-name">{u.username}</div>
                <div className="user-row-full">{u.displayName || ''}</div>
              </div>
              <button
                className={`follow-btn ${u.isFollowing ? 'on' : ''}`}
                onClick={e => { e.stopPropagation(); handleToggleFollow(u.username, e.currentTarget); }}
              >
                {u.isFollowing ? 'Following' : 'Follow'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Explore grid (video reels) */}
      {showGrid && (
        loading ? (
          <SkeletonReel />
        ) : recs.length === 0 ? (
          <section className="reel" style={{ justifyContent: 'center' }}>
            <div className="activity-empty">
              <div className="activity-empty-icon">
                <svg width="28" height="28" fill="none" stroke="#262626" strokeWidth="1.5" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                </svg>
              </div>
              <h3>Discover Videos</h3>
              <p>Recommendations from the community will appear here.</p>
            </div>
          </section>
        ) : (
          recs.map((r, i) => (
            <VideoReel key={r.videoId + r.timestamp + i} rec={r} photoURL={getUserPhoto(r.username)} />
          ))
        )
      )}
    </>
  );
}
