import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CacheProvider } from './context/CacheContext';
import { ToastProvider } from './hooks/useToast';
import AuthScreen from './components/AuthScreen';
import UsernameScreen from './components/UsernameScreen';
import AppShell from './components/AppShell';

function AppInner() {
  const { user, loading, needsUsername } = useAuth();

  // Show loading splash unless we have a cached flag
  if (loading) {
    const hadPrevLogin = localStorage.getItem('r_logged_in');
    if (hadPrevLogin) {
      // Show empty app shell instantly (will render properly once auth resolves)
      return (
        <div className="app" style={{ display: 'flex' }}>
          <div className="app-body">
            <div className="main-area">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <div className="spinner" />
              </div>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36, fontFamily: "'Inter','Segoe UI',Roboto,Helvetica,Arial,sans-serif", fontWeight: 800, letterSpacing: -1, color: '#262626', marginBottom: 16 }}>
            Recommenderz
          </div>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (!user) return <AuthScreen />;
  if (needsUsername) return <UsernameScreen />;
  return <AppShell />;
}

export default function App() {
  return (
    <AuthProvider>
      <CacheProvider>
        <ToastProvider>
          <AppInner />
        </ToastProvider>
      </CacheProvider>
    </AuthProvider>
  );
}
