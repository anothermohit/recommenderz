import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy, limit, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useCache } from '../context/CacheContext';
import { useToast } from '../hooks/useToast';
import { subscribeToUserTopic, unsubscribeFromUserTopic } from '../lib/fcm';
import { SettingsIcon, ChevronDownIcon } from './Icons';
import EditProfileModal from './EditProfileModal';
import SettingsModal from './SettingsModal';
import VideoReel from './VideoReel';
import { SkeletonProfile, SkeletonReel } from './Skeleton';
import type { Rec, UserDoc } from '../lib/types';

interface UserListItem {
  username: string;
  photoURL: string;
  displayName: string;
}

export default function ProfileTab() {
  const { username: paramUsername } = useParams<{ username: string }>();
  const { user, username: myUsername, photoURL: myPhotoURL } = useAuth();
  const { cache, getUserPhoto, setUserPhoto } = useCache();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const profileUsername = (paramUsername || myUsername || '').toLowerCase();

  const [userData, setUserData] = useState<UserDoc | null>(null);
  const [posts, setPosts] = useState<Rec[]>([]);
  const [followers, setFollowers] = useState<UserListItem[]>([]);
  const [followingList, setFollowingList] = useState<UserListItem[]>([]);
  const [mutuals, setMutuals] = useState<string[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [listModal, setListModal] = useState<'followers' | 'following' | null>(null);

  const isOwn = userData && user ? (profileUsername === myUsername) : false;

  const loadProfile = useCallback(async () => {
    if (!profileUsername || !user) return;
    setLoading(true);

    try {
      // Find user by username
      const uq = query(collection(db, 'Users'), where('username', '==', profileUsername), limit(1));
      const us = await getDocs(uq);
      if (us.empty) {
        console.warn('[Profile] No user found with username:', profileUsername);
        setUserData(null);
        setLoading(false);
        return;
      }
      const ud = us.docs[0].data() as UserDoc;
      setUserData(ud);
      setUserPhoto(profileUsername, ud.photoURL || '');

      // Get posts from Recommendations collection
      let postsList: Rec[] = [];
      try {
        const pq = query(
          collection(db, 'Recommendations'),
          where('username', '==', profileUsername),
          orderBy('timestamp', 'desc')
        );
        const ps = await getDocs(pq);
        ps.forEach(d => postsList.push({ ...d.data(), id: d.id } as Rec));
        console.log('[Profile] Posts loaded (indexed):', postsList.length);
      } catch (e) {
        console.warn('[Profile] Indexed query failed, trying without orderBy:', e);
        try {
          const pq2 = query(
            collection(db, 'Recommendations'),
            where('username', '==', profileUsername)
          );
          const ps2 = await getDocs(pq2);
          ps2.forEach(d => postsList.push({ ...d.data(), id: d.id } as Rec));
          postsList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          console.log('[Profile] Posts loaded (fallback):', postsList.length);
        } catch (e2) {
          console.error('[Profile] Both post queries failed:', e2);
        }
      }
      setPosts(postsList);

      // Get followers (users whose following array contains this username)
      const followerItems: UserListItem[] = [];
      try {
        const fq = query(collection(db, 'Users'), where('following', 'array-contains', profileUsername));
        const fs = await getDocs(fq);
        fs.forEach(d => {
          const data = d.data() as UserDoc;
          followerItems.push({
            username: data.username,
            photoURL: data.photoURL || '',
            displayName: data.displayName || data.username,
          });
        });
      } catch (e) {
        console.warn('[Profile] Followers query failed:', e);
      }
      setFollowers(followerItems);

      // Load following list (resolve usernames to user docs)
      const followingUsernames: string[] = ud.following || [];
      const followingItems: UserListItem[] = [];
      if (followingUsernames.length > 0) {
        // Firestore 'in' supports max 30 items per query
        for (let i = 0; i < followingUsernames.length; i += 30) {
          const batch = followingUsernames.slice(i, i + 30);
          try {
            const fq = query(collection(db, 'Users'), where('username', 'in', batch));
            const fs = await getDocs(fq);
            fs.forEach(d => {
              const data = d.data() as UserDoc;
              followingItems.push({
                username: data.username,
                photoURL: data.photoURL || '',
                displayName: data.displayName || data.username,
              });
            });
          } catch (e) {
            console.warn('[Profile] Following query failed for batch:', e);
          }
        }
      }
      setFollowingList(followingItems);

      // My following (for follow button state + mutuals)
      const myDoc = await getDoc(doc(db, 'Users', user.uid));
      const myFollowing: string[] = myDoc.exists() ? (myDoc.data().following || []) : [];
      setIsFollowing(myFollowing.includes(profileUsername));
      const followerUsernames = followerItems
        .map(f => f.username)
        .filter(u => u !== myUsername);
      setMutuals(followerUsernames.filter(u => myFollowing.includes(u)));
    } catch (e) {
      console.error('[Profile] Load failed:', e);
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
      setFollowers(prev => prev.filter(f => f.username !== myUsername));
      unsubscribeFromUserTopic(profileUsername);
      showToast(`Unfollowed @${profileUsername}`);
    } else {
      await updateDoc(r, { following: arrayUnion(profileUsername) });
      setIsFollowing(true);
      subscribeToUserTopic(profileUsername);
      setFollowers(prev => [...prev, { username: myUsername || '', photoURL: myPhotoURL || '', displayName: myUsername || '' }]);
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

  const listItems = listModal === 'followers' ? followers : followingList;
  const listTitle = listModal === 'followers' ? 'Followers' : 'Following';

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
            <div onClick={() => setListModal('followers')} style={{ cursor: 'pointer' }}>
              <b>{followers.length}</b><span>followers</span>
            </div>
            <div onClick={() => setListModal('following')} style={{ cursor: 'pointer' }}>
              <b>{followingCount}</b><span>following</span>
            </div>
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

      {/* Followers / Following List Modal */}
      {listModal && (
        <div className="modal-bg open" onClick={e => { if (e.target === e.currentTarget) setListModal(null); }}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-head">
              <h3>{listTitle}</h3>
              <button onClick={() => setListModal(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', padding: '4px 8px', color: '#262626' }}>&times;</button>
            </div>
            <div style={{ maxHeight: 400, overflowY: 'auto', padding: '8px 16px' }}>
              {listItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: '#8e8e8e' }}>
                  {listModal === 'followers' ? 'No followers yet' : 'Not following anyone'}
                </div>
              ) : (
                listItems.map(item => (
                  <div
                    key={item.username}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #efefef', cursor: 'pointer' }}
                    onClick={() => { setListModal(null); navigate('/' + item.username); }}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#efefef', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', fontSize: 18, fontWeight: 600, color: '#262626', flexShrink: 0 }}>
                      {item.photoURL ? <img src={item.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : item.username[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#262626' }}>{item.username}</div>
                      <div style={{ fontSize: 13, color: '#8e8e8e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.displayName}</div>
                    </div>
                    {item.username !== myUsername && (
                      <button
                        className="profile-follow-btn"
                        style={{ padding: '6px 16px', fontSize: 13 }}
                        onClick={e => {
                          e.stopPropagation();
                          navigate('/' + item.username);
                        }}
                      >
                        View
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <EditProfileModal open={editOpen} onClose={() => setEditOpen(false)} onSaved={loadProfile} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
