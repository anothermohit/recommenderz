import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, query, getDocs, limit, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useCache } from '../context/CacheContext';
import { useToast } from '../hooks/useToast';
import type { UserDoc } from '../lib/types';

export default function RightSidebar() {
  const { user, username, photoURL } = useAuth();
  const { invalidate } = useCache();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<UserDoc[]>([]);
  const [followedSet, setFollowedSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user || !username) return;
    (async () => {
      const d = await getDoc(doc(db, 'Users', user.uid));
      const myFollowing: string[] = d.exists() ? (d.data().following || []) : [];

      const allQ = query(collection(db, 'Users'), limit(20));
      const snap = await getDocs(allQ);
      const sugs: UserDoc[] = [];
      snap.forEach(d => {
        const u = d.data() as UserDoc;
        if (u.username !== username && !myFollowing.includes(u.username)) {
          sugs.push(u);
        }
      });
      setSuggestions(sugs.slice(0, 5));
    })();
  }, [user, username]);

  const handleFollow = async (target: string) => {
    if (!user) return;
    await updateDoc(doc(db, 'Users', user.uid), { following: arrayUnion(target) });
    setFollowedSet(prev => new Set(prev).add(target));
    invalidate('feed');
    invalidate('activity');
    invalidate('profiles');
    showToast(`Following @${target}`);
  };

  const displayName = username || '';
  const avaContent = photoURL ? <img src={photoURL} alt="" /> : (username ? username[0].toUpperCase() : '?');

  return (
    <div style={{ padding: '8px 16px 24px' }}>
      <div className="rs-user">
        <div className="rs-ava">{avaContent}</div>
        <div className="rs-info">
          <div className="rs-uname" onClick={() => navigate('/' + username)}>{username}</div>
          <div className="rs-name">{displayName}</div>
        </div>
      </div>

      {suggestions.length > 0 && (
        <>
          <div className="rs-head">
            <span className="rs-head-title">Suggested for you</span>
          </div>
          {suggestions.map(s => {
            const isFollowed = followedSet.has(s.username);
            return (
              <div className="rs-suggestion" key={s.username}>
                <div className="rs-sug-ava" onClick={() => navigate('/' + s.username)}>
                  {s.photoURL ? <img src={s.photoURL} alt="" /> : s.username[0].toUpperCase()}
                </div>
                <div className="rs-sug-info" onClick={() => navigate('/' + s.username)}>
                  <div className="rs-sug-uname">{s.username}</div>
                  <div className="rs-sug-detail">Suggested for you</div>
                </div>
                <button
                  className="rs-follow-btn"
                  onClick={() => handleFollow(s.username)}
                  style={isFollowed ? { color: '#a8a8a8' } : undefined}
                >
                  {isFollowed ? 'Following' : 'Follow'}
                </button>
              </div>
            );
          })}
        </>
      )}

      <div className="rs-footer" style={{ marginTop: 24, fontSize: 12, color: '#c7c7c7', lineHeight: 1.8 }}>
        <span style={{ marginRight: 4 }}>About</span>
        <span style={{ marginRight: 4 }}>Help</span>
        <span style={{ marginRight: 4 }}>Press</span>
        <span style={{ marginRight: 4 }}>API</span>
        <span style={{ marginRight: 4 }}>Jobs</span>
        <span style={{ marginRight: 4 }}>Privacy</span>
        <span>Terms</span>
        <br />RECOMMENDERZ
      </div>
    </div>
  );
}
