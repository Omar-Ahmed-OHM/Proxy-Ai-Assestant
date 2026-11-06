import mongoose from "mongoose";

export const REMINDER_STATUSES = ["pending", "completed", "cancelled"];

const reminderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    remindAt: {
      type: Date,
      required: true,
    },

    timezone: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: REMINDER_STATUSES,
      default: "pending",
    },

    completedAt: {
      type: Date,
    },

    notifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

reminderSchema.index({ userId: 1, status: 1, remindAt: 1 });
reminderSchema.index({ status: 1, notifiedAt: 1, remindAt: 1 });

export const Reminder = mongoose.model("Reminder", reminderSchema);
