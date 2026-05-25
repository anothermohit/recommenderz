/* Firebase Cloud Messaging background handler.
   FCM auto-registers this file to show notifications when the app is in the
   background. Uses the compat builds because service workers can't use the
   modular ESM bundle via importScripts. */
importScripts('https://www.gstatic.com/firebasejs/11.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBdOqNXVd3wG3SDz0RWlMr7_udFgMKn6KQ",
  authDomain: "recommenderz-app.firebaseapp.com",
  projectId: "recommenderz-app",
  storageBucket: "recommenderz-app.firebasestorage.app",
  messagingSenderId: "931987951306",
  appId: "1:931987951306:web:b1c1b853eee851e4c52e33"
});

const messaging = firebase.messaging();

// Shown for data-only messages; notification-payload messages are auto-displayed.
messaging.onBackgroundMessage((payload) => {
  const n = payload.notification || {};
  self.registration.showNotification(n.title || 'Recommenderz', {
    body: n.body || 'New recommendation',
    icon: '/favicon.svg',
    data: payload.data || {},
  });
});

// Tapping a notification opens the recommender's video.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const vid = e.notification.data && e.notification.data.videoId;
  const url = vid ? 'https://youtube.com/watch?v=' + vid : '/';
  e.waitUntil(clients.openWindow(url));
});
