import * as webpush from "web-push";
import { env } from "../../config/env.js";
import PushSubscription from "./push.model.js";

export const pushEnabled = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);

if (pushEnabled) {
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
} else {
  console.warn("VAPID keys are not set. Push notifications are disabled.");
}

export const sendPushNotification = async (subscription, payload) => {
  if (!pushEnabled) return { success: false, disabled: true };

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload), { TTL: 60 * 60 });
    return { success: true };
  } catch (error) {
    if (error.statusCode === 404 || error.statusCode === 410) {
      return { success: false, expired: true };
    }

    console.error("Push notification error:", error.statusCode ?? "", error.body ?? error.message);
    return { success: false, error: error.message };
  }
};

export const sendPushToUser = async (userId, payload) => {
  const subscriptions = await PushSubscription.find({ userId });

  const results = await Promise.all(
    subscriptions.map(async (item) => {
      const result = await sendPushNotification(item.toObject(), payload);
      if (result.expired) await PushSubscription.deleteOne({ _id: item._id });
      return result;
    })
  );

  return {
    devices: subscriptions.length,
    sent: results.filter((result) => result.success).length,
    results,
  };
};
