import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup, RecaptchaVerifier, signInWithPhoneNumber, signOut, ConfirmationResult } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { UserDoc } from '../lib/types';

interface AuthState {
  user: User | null;
  userDoc: UserDoc | null;
  loading: boolean;
  username: string | null;
  photoURL: string;
  signInWithGoogle: () => Promise<void>;
  showPhoneInput: boolean;
  setShowPhoneInput: (v: boolean) => void;
  sendOTP: (phone: string) => Promise<void>;
  verifyOTP: (code: string) => Promise<void>;
  saveUsername: (username: string) => Promise<string | null>;
  logout: () => Promise<void>;
  needsUsername: boolean;
  refreshUserDoc: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({} as AuthState);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsUsername, setNeedsUsername] = useState(false);
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  const username = userDoc?.username || null;
  const photoURL = userDoc?.photoURL || user?.photoURL || '';

  const refreshUserDoc = useCallback(async () => {
    if (!user) return;
    const d = await getDoc(doc(db, 'Users', user.uid));
    if (d.exists()) {
      setUserDoc(d.data() as UserDoc);
    }
  }, [user]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const d = await getDoc(doc(db, 'Users', u.uid));
        if (d.exists() && d.data().username) {
          setUserDoc(d.data() as UserDoc);
          setNeedsUsername(false);
          localStorage.setItem('r_logged_in', '1');
          localStorage.setItem('r_username', d.data().username);
        } else {
          setNeedsUsername(true);
        }
      } else {
        setUser(null);
        setUserDoc(null);
        setNeedsUsername(false);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const doSignInWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (_e) { /* user closed popup */ }
  }, []);

  const sendOTP = useCallback(async (phone: string) => {
    if (!phone) return;
    if (recaptchaRef.current) recaptchaRef.current.clear();
    recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
    confirmationRef.current = await signInWithPhoneNumber(auth, phone, recaptchaRef.current);
  }, []);

  const verifyOTP = useCallback(async (code: string) => {
    if (!code || !confirmationRef.current) return;
    await confirmationRef.current.confirm(code);
  }, []);

  const saveUsernameAction = useCallback(async (u: string): Promise<string | null> => {
    const clean = u.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!clean || clean.length < 3) return 'Username must be at least 3 characters.';
    const q = query(collection(db, 'Users'), where('username', '==', clean));
    const snap = await getDocs(q);
    if (!snap.empty) return "This username isn't available.";
    if (!user) return 'Not signed in.';
    await setDoc(doc(db, 'Users', user.uid), {
      username: clean,
      displayName: user.displayName || clean,
      photoURL: user.photoURL || '',
      following: [],
      createdAt: Date.now(),
    });
    const newDoc: UserDoc = {
      username: clean,
      displayName: user.displayName || clean,
      photoURL: user.photoURL || '',
      following: [],
      createdAt: Date.now(),
    };
    setUserDoc(newDoc);
    setNeedsUsername(false);
    localStorage.setItem('r_logged_in', '1');
    localStorage.setItem('r_username', clean);
    return null;
  }, [user]);

  const logout = useCallback(async () => {
    localStorage.removeItem('r_logged_in');
    localStorage.removeItem('r_username');
    await signOut(auth);
    setUser(null);
    setUserDoc(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user, userDoc, loading, username, photoURL,
      signInWithGoogle: doSignInWithGoogle,
      showPhoneInput, setShowPhoneInput,
      sendOTP, verifyOTP,
      saveUsername: saveUsernameAction,
      logout,
      needsUsername,
      refreshUserDoc,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
