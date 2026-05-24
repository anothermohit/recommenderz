const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

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
      videoId,
      username,
    },
  };

  try {
    await getMessaging().send(message);
    console.log(`FCM sent to topic: ${username}`);
  } catch (e) {
    console.error("FCM send error:", e);
  }
});
