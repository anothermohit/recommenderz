const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

// Subscribe a device's FCM token to a user's public topic (called when you
// follow someone). Web clients can't subscribe to topics directly, so this
// runs the Admin SDK on their behalf. The caller must be signed in.
exports.subscribeToTopic = onCall(async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required.");
  const { token, topic } = req.data || {};
  if (!token || !topic) throw new HttpsError("invalid-argument", "token and topic are required.");
  await getMessaging().subscribeToTopic([token], topic);
  return { ok: true };
});

// Unsubscribe a device's token from a topic (called when you unfollow).
exports.unsubscribeFromTopic = onCall(async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required.");
  const { token, topic } = req.data || {};
  if (!token || !topic) throw new HttpsError("invalid-argument", "token and topic are required.");
  await getMessaging().unsubscribeFromTopic([token], topic);
  return { ok: true };
});

exports.onNewRecommendation = onDocumentCreated("Recommendations/{recId}", async (event) => {
  const data = event.data.data();
  const { username, videoId } = data;
  if (!username || !videoId) return;

  const message = {
    topic: username,
    notification: {
      title: `@${username} recommends`,
      body: "Check out this video!",
    },
    data: {
      videoId: String(videoId),
      username: String(username),
    },
    webpush: {
      notification: { icon: "/favicon.svg" },
      fcmOptions: { link: `https://recommenderz-app.web.app/${username}` },
    },
  };

  try {
    await getMessaging().send(message);
    console.log(`FCM sent to topic: ${username}`);
  } catch (e) {
    console.error("FCM send error:", e);
  }
});
