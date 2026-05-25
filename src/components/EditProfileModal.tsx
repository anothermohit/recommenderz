import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditProfileModal({ open, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const d = await getDoc(doc(db, 'Users', user.uid));
      if (d.exists()) {
        const data = d.data();
        setName(data.displayName || '');
        setBio(data.bio || '');
        setWebsite(data.website || '');
      }
    })();
  }, [open, user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'Users', user.uid), {
        displayName: name || undefined,
        bio,
        website,
      });
      onClose();
      onSaved();
      showToast('Profile updated');
    } catch (e: any) {
      showToast('Error: ' + e.message);
    }
    setSaving(false);
  };

  if (!open) return null;

  return (
    <div className="edit-modal-bg open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="edit-modal">
        <div className="edit-modal-head">
          <button className="edit-cancel" onClick={onClose}>Cancel</button>
          <h3>Edit profile</h3>
          <button className="edit-save" onClick={handleSave} disabled={saving}>Done</button>
        </div>
        <div className="edit-modal-body">
          <div className="edit-field">
            <label>Name</label>
            <input type="text" maxLength={40} placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="edit-field">
            <label>Bio</label>
            <textarea rows={3} maxLength={150} placeholder="Bio" value={bio} onChange={e => setBio(e.target.value)} />
          </div>
          <div className="edit-field">
            <label>Website</label>
            <input type="url" placeholder="Website" value={website} onChange={e => setWebsite(e.target.value)} />
          </div>
        </div>
      </div>
    </div>
  );
}
