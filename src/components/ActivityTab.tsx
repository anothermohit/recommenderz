import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy, limit, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useCache } from '../context/CacheContext';
import { useToast } from '../hooks/useToast';
import { BellIcon } from './Icons';
import { thumbUrl, timeAgo } from '../lib/youtube';
import { SkeletonActivity } from './Skeleton';
import type { Rec, UserDoc } from '../lib/types';

export default function ActivityTab() {
  const { user, username } = useAuth();
  const { cache, getUserPhoto, setUserPhoto } = useCache();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [followers, setFollowers] = useState<UserDoc[]>([]);
  const [recentRecs, setRecentRecs] = useState<Rec[]>([]);
  const [myFollowing, setMyFollowing] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadActivity = useCallback(async () => {
    if (!user || !username) return;
    if (cache.current.activity) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Get followers
      const fq = query(collection(db, 'Users'), where('following', 'array-contains', username));
      const fs = await getDocs(fq);
      const fList: UserDoc[] = [];
      fs.forEach(d => {
        const data = d.data() as UserDoc;
        if (data.username !== username) fList.push(data);
      });
      setFollowers(fList);

      // Get my following
      const myDoc = await getDoc(doc(db, 'Users', user.uid));
      const mf: string[] = myDoc.exists() ? (myDoc.data().following || []) : [];
      setMyFollowing(mf);

      // Get recent recs from followed
      let rr: Rec[] = [];
      if (mf.length > 0) {
        const batch = mf.slice(0, 10);
        const rq = query(collection(db, 'Recommendations'), where('username', 'in', batch), orderBy('timestamp', 'desc'), limit(10));
        const rs = await getDocs(rq);
        rs.forEach(d => rr.push(d.data() as Rec));
      }

      // Prefetch photos
      const allUsers = [...new Set([...fList.map(f => f.username), ...rr.map(r => r.username)])];
      await Promise.all(allUsers.map(async (u) => {
        if (getUserPhoto(u) !== undefined) return;
        const uq = query(collection(db, 'Users'), where('username', '==', u), limit(1));
        const s = await getDocs(uq);
        setUserPhoto(u, !s.empty ? (s.docs[0].data().photoURL || '') : '');
      }));

      setRecentRecs(rr);
      cache.current.activity = true;
    } catch {
      // noop
    }
    setLoading(false);
  }, [user, username, cache, getUserPhoto, setUserPhoto]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  const handleToggleFollow = async (target: string) => {
    if (!user) return;
    const r = doc(db, 'Users', user.uid);
    const isF = myFollowing.includes(target);
    if (isF) {
      await updateDoc(r, { following: arrayRemove(target) });
      setMyFollowing(prev => prev.filter(u => u !== target));
      showToast(`Unfollowed @${target}`);
    } else {
      await updateDoc(r, { following: arrayUnion(target) });
      setMyFollowing(prev => [...prev, target]);
      showToast(`Following @${target}`);
    }
    cache.current.feed = null;
    cache.current.profiles = {};
  };

  return (
    <section className="reel reel-special">
      <div className="reel-bar">
        <div className="topnav-logo" style={{ fontSize: 20 }}>Notifications</div>
      </div>
      <div className="reel-scroll">
        {loading ? (
          <SkeletonActivity />
        ) : followers.length === 0 && recentRecs.length === 0 ? (
          <div className="activity-empty">
            <div className="activity-empty-icon">
              <BellIcon size={28} />
            </div>
            <h3>Activity</h3>
            <p>When people interact with you, you'll see it here.</p>
          </div>
        ) : (
          <>
            {followers.length > 0 && (
              <div className="activity-section">
                <div className="activity-section-title">Followers</div>
                {followers.map(f => {
                  const isFollowingBack = myFollowing.includes(f.username);
                  const photo = f.photoURL || getUserPhoto(f.username) || '';
                  return (
                    <div key={f.username} className="activity-item" onClick={() => navigate('/' + f.username)}>
                      <div className="activity-ava">
                        {photo ? <img src={photo} alt="" /> : f.username[0].toUpperCase()}
                      </div>
                      <div className="activity-text">
                        <b>{f.username}</b> started following you.{' '}
                        <span className="activity-time">{f.createdAt ? timeAgo(f.createdAt) : ''}</span>
                      </div>
                      <button
                        className={`activity-follow-btn ${isFollowingBack ? 'on' : ''}`}
                        onClick={e => { e.stopPropagation(); handleToggleFollow(f.username); }}
                      >
                        {isFollowingBack ? 'Following' : 'Follow'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {recentRecs.length > 0 && (
              <div className="activity-section">
                <div className="activity-section-title">Recent Activity</div>
                {recentRecs.map((r, i) => {
                  const photo = getUserPhoto(r.username) || '';
                  return (
                    <div
                      key={r.videoId + r.timestamp + i}
                      className="activity-item"
                      onClick={() => window.open('https://youtube.com/watch?v=' + r.videoId, '_blank')}
                    >
                      <div className="activity-ava">
                        {photo ? <img src={photo} alt="" /> : r.username[0].toUpperCase()}
                      </div>
                      <div className="activity-text">
                        <b>{r.username}</b> shared a recommendation.{' '}
                        <span className="activity-time">{timeAgo(r.timestamp)}</span>
                      </div>
                      <div className="activity-thumb">
                        <img src={thumbUrl(r.videoId, 'default')} alt="" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
