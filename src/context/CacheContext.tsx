import React, { createContext, useContext, useRef, useCallback } from 'react';
import type { Rec, UserDoc } from '../lib/types';

interface CacheData {
  feed: Rec[] | null;
  stories: boolean;
  explore: Rec[] | null;
  activity: boolean;
  profiles: Record<string, { userData: UserDoc; posts: Rec[]; followersCount: number }>;
  userPhotos: Record<string, string>;
}

interface CacheCtx {
  cache: React.MutableRefObject<CacheData>;
  invalidate: (key?: keyof CacheData) => void;
  getUserPhoto: (username: string) => string | undefined;
  setUserPhoto: (username: string, url: string) => void;
}

const CacheContext = createContext<CacheCtx>({} as CacheCtx);
export const useCache = () => useContext(CacheContext);

export function CacheProvider({ children }: { children: React.ReactNode }) {
  const cache = useRef<CacheData>({
    feed: null,
    stories: false,
    explore: null,
    activity: false,
    profiles: {},
    userPhotos: {},
  });

  const invalidate = useCallback((key?: keyof CacheData) => {
    if (key) {
      if (key === 'profiles') cache.current.profiles = {};
      else if (key === 'userPhotos') cache.current.userPhotos = {};
      else (cache.current as any)[key] = key === 'stories' || key === 'activity' ? false : null;
    } else {
      cache.current = { feed: null, stories: false, explore: null, activity: false, profiles: {}, userPhotos: {} };
    }
  }, []);

  const getUserPhoto = useCallback((username: string) => cache.current.userPhotos[username], []);
  const setUserPhoto = useCallback((username: string, url: string) => { cache.current.userPhotos[username] = url; }, []);

  return (
    <CacheContext.Provider value={{ cache, invalidate, getUserPhoto, setUserPhoto }}>
      {children}
    </CacheContext.Provider>
  );
}
