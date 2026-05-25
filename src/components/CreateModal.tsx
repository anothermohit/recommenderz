import React, { useState } from 'react';
import { ref, set } from 'firebase/database';
import { addDoc, collection } from 'firebase/firestore';
import { db, rtdb } from '../lib/firebase';
import { parseVideoId, embedUrl } from '../lib/youtube';
import { useAuth } from '../context/AuthContext';
import { useCache } from '../context/CacheContext';
import { useToast } from '../hooks/useToast';
import { VideoCardIcon } from './Icons';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CreateModal({ open, onClose }: Props) {
  const { user, username } = useAuth();
  const { invalidate } = useCache();
  const { showToast } = useToast();
  const [link, setLink] = useState('');
  const [status, setStatus] = useState('');
  const [sharing, setSharing] = useState(false);

  const videoId = parseVideoId(link);

  const handleShare = async () => {
    if (!videoId || !username || !user) return;
    setSharing(true);
    setStatus('Sharing...');
    try {
      await set(ref(rtdb, 'status/' + username), { videoId, timestamp: Date.now() });
      await addDoc(collection(db, 'Recommendations'), {
        username,
        uid: user.uid,
        videoId,
        timestamp: Date.now(),
      });
      setStatus('Shared!');
      invalidate('feed');
      invalidate('explore');
      invalidate('profiles');
      showToast('Your recommendation has been shared!');
      setTimeout(() => {
        onClose();
        setLink('');
        setStatus('');
        setSharing(false);
      }, 1500);
    } catch (e: any) {
      setStatus('Error: ' + e.message);
      setSharing(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-bg open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-head">
          <h3>Create new post</h3>
          <button
            className="share-action"
            disabled={!videoId || sharing}
            onClick={handleShare}
          >
            Share
          </button>
        </div>
        <div className="modal-body">
          {!videoId && (
            <>
              <div className="icon-art"><VideoCardIcon /></div>
              <p className="modal-prompt">Paste a YouTube link</p>
            </>
          )}
          <input
            type="text"
            className="create-input"
            placeholder="https://youtube.com/watch?v=..."
            value={link}
            onChange={e => setLink(e.target.value)}
          />
          {videoId && (
            <div className="modal-preview" style={{ display: 'block' }}>
              <iframe
                src={embedUrl(videoId)}
                allow="autoplay; encrypted-media"
                allowFullScreen
                title="preview"
              />
            </div>
          )}
          <div className="share-status">{status}</div>
        </div>
      </div>
    </div>
  );
}
