import { DailyPlan } from "./daily-plan.model.js";

export async function createDailyPlan(planData) {
  return await DailyPlan.create(planData);
}

export async function findDailyPlanByUserAndDate(userId, date) {
  return await DailyPlan.findOne({ userId, date });
}

export async function findDailyPlanByIdAndUser(planId, userId) {
  return await DailyPlan.findOne({ _id: planId, userId });
}

export async function findDailyPlansByUser(userId, { from, to } = {}) {
  const query = { userId };

  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = from;
    if (to) query.date.$lte = to;
  }

  return await DailyPlan.find(query).sort({ date: 1 });
}

export async function updateDailyPlan(planId, userId, updateData, expectedVersion) {
  const filter = { _id: planId, userId };

  if (expectedVersion !== undefined) {
    filter.__v = expectedVersion;
  }

  return await DailyPlan.findOneAndUpdate(
    filter,
    { $set: updateData, $inc: { __v: 1 } },
    { returnDocument: "after", runValidators: true }
  );
}

export async function deleteDailyPlan(planId, userId) {
  return await DailyPlan.findOneAndDelete({ _id: planId, userId });
}
