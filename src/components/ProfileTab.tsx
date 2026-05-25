import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy, limit, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useCache } from '../context/CacheContext';
import { useToast } from '../hooks/useToast';
import { SettingsIcon, ChevronDownIcon } from './Icons';
import EditProfileModal from './EditProfileModal';
import SettingsModal from './SettingsModal';
import VideoReel from './VideoReel';
import { SkeletonProfile, SkeletonReel } from './Skeleton';
import type { Rec, UserDoc } from '../lib/types';

export default function ProfileTab() {
  const { username: paramUsername } = useParams<{ username: string }>();
  const { user, username: myUsername, photoURL: myPhotoURL } = useAuth();
  const { cache, getUserPhoto, setUserPhoto } = useCache();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const profileUsername = paramUsername || myUsername || '';

  const [userData, setUserData] = useState<UserDoc | null>(null);
  const [posts, setPosts] = useState<Rec[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [mutuals, setMutuals] = useState<string[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const isOwn = userData && user ? (profileUsername === myUsername) : false;

  const loadProfile = useCallback(async () => {
    if (!profileUsername || !user) return;
    setLoading(true);

    try {
      // Find user
      const uq = query(collection(db, 'Users'), where('username', '==', profileUsername), limit(1));
      const us = await getDocs(uq);
      if (us.empty) {
        setUserData(null);
        setLoading(false);
        return;
      }
      const ud = us.docs[0].data() as UserDoc;
      setUserData(ud);
      setUserPhoto(profileUsername, ud.photoURL || '');

      // Get posts
      let postsList: Rec[] = [];
      try {
        const pq = query(collection(db, 'Recommendations'), where('username', '==', profileUsername), orderBy('timestamp', 'desc'));
        const ps = await getDocs(pq);
        ps.forEach(d => postsList.push(d.data() as Rec));
      } catch {
        try {
          const pq2 = query(collection(db, 'Recommendations'), where('username', '==', profileUsername));
          const ps2 = await getDocs(pq2);
          ps2.forEach(d => postsList.push(d.data() as Rec));
          postsList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        } catch { /* noop */ }
      }
      setPosts(postsList);

      // Get followers count
      const followerUsernames: string[] = [];
      try {
        const fq = query(collection(db, 'Users'), where('following', 'array-contains', profileUsername));
        const fs = await getDocs(fq);
        setFollowersCount(fs.size);
        fs.forEach(d => {
          const data = d.data() as UserDoc;
          if (data.username !== myUsername) followerUsernames.push(data.username);
        });
      } catch { /* noop */ }

      // My following
      const myDoc = await getDoc(doc(db, 'Users', user.uid));
      const myFollowing: string[] = myDoc.exists() ? (myDoc.data().following || []) : [];
      setIsFollowing(myFollowing.includes(profileUsername));
      setMutuals(followerUsernames.filter(u => myFollowing.includes(u)));
    } catch {
      setUserData(null);
    }
    setLoading(false);
  }, [profileUsername, user, myUsername, setUserPhoto]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleToggleFollow = async () => {
    if (!user) return;
    const r = doc(db, 'Users', user.uid);
    if (isFollowing) {
      await updateDoc(r, { following: arrayRemove(profileUsername) });
      setIsFollowing(false);
      setFollowersCount(prev => prev - 1);
      showToast(`Unfollowed @${profileUsername}`);
    } else {
      await updateDoc(r, { following: arrayUnion(profileUsername) });
      setIsFollowing(true);
      setFollowersCount(prev => prev + 1);
      showToast(`Following @${profileUsername}`);
    }
    cache.current.feed = null;
    cache.current.activity = false;
    cache.current.profiles = {};
  };

  const shareProfile = async () => {
    const url = window.location.origin + '/' + profileUsername;
    try {
      if (navigator.share) {
        await navigator.share({ title: `@${profileUsername} on Recommenderz`, url });
      } else {
        await navigator.clipboard.writeText(url);
        showToast('Profile link copied to clipboard');
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        showToast('Profile link copied to clipboard');
      } catch { /* noop */ }
    }
  };

  if (loading) {
    return (
      <>
        <SkeletonProfile />
        <SkeletonReel />
      </>
    );
  }

  if (!userData) {
    return (
      <section className="reel" style={{ justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: 60, color: '#8e8e8e' }}>User not found</div>
      </section>
    );
  }

  const photoURL = userData.photoURL || '';
  const displayName = userData.displayName || profileUsername;
  const bio = userData.bio || '';
  const website = userData.website || '';
  const followingCount = (userData.following || []).length;
  const initial = profileUsername[0].toUpperCase();

  return (
    <>
      {/* Profile info card */}
      <section className="reel reel-profile">
        <div className="reel-scroll">
          <div className="rp-top">
            <div className="profile-ava-ring">
              <div className="profile-ava">
                {photoURL ? <img src={photoURL} alt={profileUsername} /> : initial}
              </div>
            </div>
            <div className="rp-uname">{profileUsername}</div>
            <div className="rp-name">{displayName}</div>
            {bio && <div className="rp-bio">{bio}</div>}
            {website && (
              <div className="rp-web">
                <a href={website} target="_blank" rel="noopener noreferrer">
                  {website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
            {!isOwn && mutuals.length > 0 && (
              <div className="profile-mutual" style={{ marginTop: 8 }}>
                Followed by <b>{mutuals[0]}</b>
                {mutuals.length > 1 ? ` + ${mutuals.length - 1} more` : ''}
              </div>
            )}
          </div>

          <div className="rp-stats">
            <div><b>{posts.length}</b><span>posts</span></div>
            <div><b>{followersCount}</b><span>followers</span></div>
            <div><b>{followingCount}</b><span>following</span></div>
          </div>

          <div className="rp-actions">
            {isOwn ? (
              <>
                <button className="profile-edit-btn" onClick={() => setEditOpen(true)}>Edit profile</button>
                <button className="profile-share-btn" onClick={shareProfile}>Share</button>
                <button className="profile-settings-btn" onClick={() => setSettingsOpen(true)}>
                  <SettingsIcon />
                </button>
              </>
            ) : (
              <>
                <button
                  className={`profile-follow-btn ${isFollowing ? 'following' : ''}`}
                  onClick={handleToggleFollow}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
                <button className="profile-share-btn" onClick={shareProfile}>Share</button>
              </>
            )}
          </div>

          {posts.length > 0 && (
            <div className="rp-hint">
              <ChevronDownIcon />
              Swipe up to watch {posts.length} recommendation{posts.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </section>

      {/* Profile video reels */}
      {posts.length > 0 ? (
        posts.map((p, i) => (
          <VideoReel key={p.videoId + p.timestamp + i} rec={{ ...p, username: profileUsername }} photoURL={photoURL} />
        ))
      ) : (
        <section className="reel" style={{ justifyContent: 'center' }}>
          <div className="profile-empty">
            <div className="profile-empty-icon">
              <svg width="28" height="28" fill="none" stroke="#262626" strokeWidth="1.5" viewBox="0 0 24 24">
                <rect x="2" y="2" width="20" height="20" rx="2" />
                <polygon points="10 8 16 12 10 16" fill="#262626" stroke="none" />
              </svg>
            </div>
            <h3>{isOwn ? 'Share Videos' : 'No Posts Yet'}</h3>
            <p>{isOwn ? 'When you share recommendations, they will appear on your profile.' : "This user hasn't shared any recommendations yet."}</p>
          </div>
        </section>
      )}

      {/* Modals */}
      <EditProfileModal open={editOpen} onClose={() => setEditOpen(false)} onSaved={loadProfile} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
