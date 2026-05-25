import React, { useState, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HomeIcon, CompassIcon, CreateIcon, BellIcon, LogoIcon, MenuIcon } from './Icons';
import FeedTab from './FeedTab';
import ExploreTab from './ExploreTab';
import ActivityTab from './ActivityTab';
import ProfileTab from './ProfileTab';
import CreateModal from './CreateModal';
import SettingsModal from './SettingsModal';

export default function AppShell() {
  const { username, photoURL } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const openCreate = useCallback(() => setCreateOpen(true), []);
  const closeCreate = useCallback(() => setCreateOpen(false), []);

  // Determine active tab from location
  const path = location.pathname.replace(/^\/+|\/+$/g, '');
  let activeTab = 'feed';
  if (path === 'explore') activeTab = 'explore';
  else if (path === 'activity') activeTab = 'activity';
  else if (path && path !== '') activeTab = 'profile';

  const goTab = (tab: string) => {
    switch (tab) {
      case 'feed': navigate('/'); break;
      case 'explore': navigate('/explore'); break;
      case 'activity': navigate('/activity'); break;
      case 'profile': navigate('/' + username); break;
    }
  };

  const initial = username ? username[0].toUpperCase() : '?';
  const avaContent = photoURL ? <img src={photoURL} alt="" /> : initial;

  return (
    <div className="app" style={{ display: 'flex' }}>
      <div className="app-body">
        {/* Desktop sidebar */}
        <div className="sidebar">
          <div className="sidebar-logo-wrap">
            <div className="sidebar-logo-full">Recommenderz</div>
            <div className="sidebar-logo-icon"><LogoIcon /></div>
          </div>

          <button onClick={() => goTab('feed')} className={`sidebar-item ${activeTab === 'feed' ? 'active' : ''}`} data-tab="feed">
            <HomeIcon />
            <span className="sidebar-label">Home</span>
          </button>
          <button onClick={() => goTab('explore')} className={`sidebar-item ${activeTab === 'explore' ? 'active' : ''}`} data-tab="explore">
            <CompassIcon />
            <span className="sidebar-label">Explore</span>
          </button>
          <button onClick={() => goTab('activity')} className={`sidebar-item ${activeTab === 'activity' ? 'active' : ''}`} data-tab="activity">
            <BellIcon />
            <span className="sidebar-label">Notifications</span>
          </button>
          <button onClick={openCreate} className="sidebar-item">
            <CreateIcon />
            <span className="sidebar-label">Create</span>
          </button>
          <button onClick={() => goTab('profile')} className={`sidebar-item ${activeTab === 'profile' && path === username ? 'active' : ''}`} data-tab="profile">
            <div className="sidebar-ava">{avaContent}</div>
            <span className="sidebar-label">Profile</span>
          </button>

          <div className="sidebar-spacer" />

          <button onClick={() => setSettingsOpen(true)} className="sidebar-item">
            <MenuIcon />
            <span className="sidebar-label">More</span>
          </button>
        </div>

        {/* Main content area */}
        <div className="main-area">
          <Routes>
            <Route path="/" element={
              <div className="reel-view">
                <FeedTab onCreateClick={openCreate} onActivityClick={() => goTab('activity')} />
              </div>
            } />
            <Route path="/explore" element={
              <div className="reel-view">
                <ExploreTab />
              </div>
            } />
            <Route path="/activity" element={
              <div className="reel-view">
                <ActivityTab />
              </div>
            } />
            <Route path="/:username" element={
              <div className="reel-view">
                <ProfileTab />
              </div>
            } />
          </Routes>
        </div>
      </div>

      {/* Bottom nav (mobile) */}
      <div className="bottomnav">
        <button onClick={() => goTab('feed')} className={activeTab === 'feed' ? 'active' : ''} data-tab="feed">
          <HomeIcon />
        </button>
        <button onClick={() => goTab('explore')} className={activeTab === 'explore' ? 'active' : ''} data-tab="explore">
          <CompassIcon />
        </button>
        <button onClick={openCreate}>
          <CreateIcon />
        </button>
        <button onClick={() => goTab('activity')} className={activeTab === 'activity' ? 'active' : ''} data-tab="activity">
          <BellIcon />
        </button>
        <button onClick={() => goTab('profile')} data-tab="profile">
          <div className={`bnav-ava ${activeTab === 'profile' ? 'active' : ''}`} style={activeTab === 'profile' ? { borderColor: '#00b4d8' } : undefined}>
            {avaContent}
          </div>
        </button>
      </div>

      {/* Modals */}
      <CreateModal open={createOpen} onClose={closeCreate} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
