import React, { useEffect, useState } from 'react';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { ref, get } from 'firebase/database';
import { db, rtdb } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useCache } from '../context/CacheContext';
import { SkeletonStories } from './Skeleton';

interface StoryItem {
  username: string;
  photoURL: string;
  hasStatus: boolean;
  videoId?: string;
}

interface Props {
  onCreateClick: () => void;
}

export default function StoriesBar({ onCreateClick }: Props) {
  const { user, username, photoURL } = useAuth();
  const { getUserPhoto, setUserPhoto } = useCache();
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !username) return;
    let cancelled = false;

    (async () => {
      try {
        const d = await getDoc(doc(db, 'Users', user.uid));
        const following: string[] = d.exists() ? (d.data().following || []) : [];

        if (cancelled) return;

        const items: StoryItem[] = [];
        for (const u of following.slice(0, 20)) {
          const s = await get(ref(rtdb, 'status/' + u));
          const has = s.exists();
          let photo = getUserPhoto(u);
          if (photo === undefined) {
            const q = query(collection(db, 'Users'), where('username', '==', u), limit(1));
            const snap = await getDocs(q);
            photo = '';
            if (!snap.empty) {
              photo = snap.docs[0].data().photoURL || '';
            }
            setUserPhoto(u, photo);
          }
          items.push({
            username: u,
            photoURL: photo,
            hasStatus: has,
            videoId: has ? s.val().videoId : undefined,
          });
        }

        if (!cancelled) {
          setStories(items);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user, username]);

  const yourPhoto = photoURL
    ? <img src={photoURL} alt="" />
    : (username ? username[0].toUpperCase() : '?');

  return (
    <div className="stories">
      {/* Your story */}
      <div className="story story-yours" onClick={onCreateClick}>
        <div className="story-ring">
          <div className="story-ava">{yourPhoto}</div>
        </div>
        <div className="story-plus">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
        <div className="story-name">Your story</div>
      </div>

      {loading ? (
        <SkeletonStories />
      ) : (
        stories.map(s => (
          <div
            key={s.username}
            className="story"
            onClick={() => s.videoId && window.open('https://youtube.com/watch?v=' + s.videoId, '_blank')}
          >
            <div className={`story-ring ${s.hasStatus ? '' : 'empty'}`}>
              <div className="story-ava">
                {s.photoURL ? <img src={s.photoURL} alt="" /> : s.username[0].toUpperCase()}
              </div>
            </div>
            <div className="story-name">{s.username}</div>
          </div>
        ))
      )}
    </div>
  );
}
