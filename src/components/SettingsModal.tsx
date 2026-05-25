import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SettingsIcon, BookmarkIcon, LogoutIcon } from './Icons';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: Props) {
  const { username, logout } = useAuth();
  const navigate = useNavigate();

  if (!open) return null;

  return (
    <div className="settings-bg open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="settings-menu">
        <div className="settings-handle" />
        <button className="settings-item" onClick={() => { navigate('/' + username); onClose(); }}>
          <SettingsIcon size={18} />
          Settings
        </button>
        <button className="settings-item" onClick={() => { navigate('/' + username); onClose(); }}>
          <BookmarkIcon size={18} />
          Saved
        </button>
        <button className="settings-item danger" onClick={() => { logout(); onClose(); }}>
          <LogoutIcon />
          Log out
        </button>
      </div>
    </div>
  );
}
