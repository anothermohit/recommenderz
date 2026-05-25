import { getToken, onMessage } from 'firebase/messaging';
import { httpsCallable } from 'firebase/functions';
import { doc, updateDoc } from 'firebase/firestore';
import { messaging, functions, db } from './firebase';

// Get this from Firebase Console → Project settings → Cloud Messaging → Web Push certificates
// Generate a key pair if none exists, then paste the public key here.
const VAPID_KEY = '';

let cachedToken: string | null = null;

export async function requestNotificationPermission(uid: string): Promise<string | null> {
  if (!messaging || !VAPID_KEY) {
    console.warn('[FCM] Messaging not available or VAPID_KEY not set');
    return null;
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')
        || await navigator.serviceWorker.register('/firebase-messaging-sw.js'),
    });

    if (token) {
      cachedToken = token;
      // Save token to user doc
      await updateDoc(doc(db, 'Users', uid), { fcmToken: token });
    }
    return token;
  } catch (e) {
    console.error('[FCM] Token request failed:', e);
    return null;
  }
}

export function getCachedToken(): string | null {
  return cachedToken;
}

export async function subscribeToUserTopic(topic: string): Promise<void> {
  const token = cachedToken;
  if (!token) return;
  try {
    const fn = httpsCallable(functions, 'subscribeToTopic');
    await fn({ token, topic });
    console.log('[FCM] Subscribed to topic:', topic);
  } catch (e) {
    console.error('[FCM] Subscribe failed:', e);
  }
}

export async function unsubscribeFromUserTopic(topic: string): Promise<void> {
  const token = cachedToken;
  if (!token) return;
  try {
    const fn = httpsCallable(functions, 'unsubscribeFromTopic');
    await fn({ token, topic });
    console.log('[FCM] Unsubscribed from topic:', topic);
  } catch (e) {
    console.error('[FCM] Unsubscribe failed:', e);
  }
}

export function listenForForegroundMessages(callback: (title: string, body: string) => void): () => void {
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    const n = payload.notification;
    if (n) callback(n.title || 'Recommenderz', n.body || 'New recommendation');
  });
}
