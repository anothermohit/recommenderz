export interface Rec {
  id?: string;
  videoId: string;
  username: string;
  uid?: string;
  timestamp: number;
  caption?: string;
}

export interface UserDoc {
  username: string;
  displayName?: string;
  photoURL?: string;
  bio?: string;
  website?: string;
  following?: string[];
  fcmToken?: string;
  createdAt?: number;
}
