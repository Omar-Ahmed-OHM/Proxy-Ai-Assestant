import mongoose from "mongoose";

export const TASK_STATUSES = ["pending", "in_progress", "completed"];
export const TASK_PRIORITIES = ["low", "medium", "high"];

const taskSchema = new mongoose.Schema(
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

    status: {
      type: String,
      enum: TASK_STATUSES,
      default: "pending",
    },

    priority: {
      type: String,
      enum: TASK_PRIORITIES,
      default: "medium",
    },

    dueDate: {
      type: Date,
    },

    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

taskSchema.index({ userId: 1, createdAt: -1 });

export const Task = mongoose.model("Task", taskSchema);
