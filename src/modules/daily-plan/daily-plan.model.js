import mongoose from "mongoose";

export const DAILY_PLAN_STATUSES = ["active", "completed"];
export const MAX_TASKS_PER_PLAN = 100;

const planTaskSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },

    order: {
      type: Number,
      required: true,
      min: 1,
    },

    note: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  { _id: false }
);

const dailyPlanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    tasks: {
      type: [planTaskSchema],
      default: [],
      validate: {
        validator: (tasks) => tasks.length <= MAX_TASKS_PER_PLAN,
        message: `A plan can hold at most ${MAX_TASKS_PER_PLAN} tasks`,
      },
    },

    status: {
      type: String,
      enum: DAILY_PLAN_STATUSES,
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

dailyPlanSchema.index({ userId: 1, date: 1 }, { unique: true });

export const DailyPlan = mongoose.model("DailyPlan", dailyPlanSchema);
