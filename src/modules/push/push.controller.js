import PushSubscription from "./push.model.js";
import { sendPushToUser } from "./push.service.js";

export const subscribe = async (req, res, next) => {
  try {
    const { endpoint, keys, expirationTime } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({
        message: "Invalid push subscription",
      });
    }

    await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        userId: req.user.id,
        endpoint,
        keys,
        expirationTime: expirationTime ?? null,
      },
      { upsert: true, new: true, runValidators: true }
    );

    return res.status(200).json({
      message: "Device registered successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const unsubscribe = async (req, res, next) => {
  try {
    const { endpoint } = req.body;

    await PushSubscription.deleteOne({
      endpoint,
      userId: req.user.id,
    });

    return res.status(200).json({
      message: "Device unregistered successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const testPush = async (req, res, next) => {
  try {
    const { devices, results } = await sendPushToUser(req.user.id, {
      title: "Reminder App",
      body: "Push notifications are working!",
      url: "/",
    });

    if (!devices) {
      return res.status(404).json({
        message: "No registered devices found",
      });
    }

    return res.status(200).json({
      message: "Test notification sent",
      results,
    });
  } catch (error) {
    next(error);
  }
};
