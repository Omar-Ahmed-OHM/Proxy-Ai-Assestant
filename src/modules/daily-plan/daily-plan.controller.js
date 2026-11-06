import * as dailyPlanService from "./daily-plan.service.js";

export async function createDailyPlan(req, res) {
  const plan = await dailyPlanService.createDailyPlan(req.user.id, req.body);

  res.status(201).json({ plan });
}

export async function getDailyPlans(req, res) {
  const plans = await dailyPlanService.getDailyPlans(req.user.id, req.query);

  res.status(200).json({ plans });
}

export async function getDailyPlan(req, res) {
  const plan = await dailyPlanService.getDailyPlanById(req.params.id, req.user.id);

  res.status(200).json({ plan });
}

export async function updateDailyPlan(req, res) {
  const plan = await dailyPlanService.updateDailyPlan(req.params.id, req.user.id, req.body);

  res.status(200).json({ plan });
}

export async function addTaskToPlan(req, res) {
  const plan = await dailyPlanService.addTaskToPlan(req.params.id, req.user.id, req.body);

  res.status(200).json({ plan });
}

export async function removeTaskFromPlan(req, res) {
  const plan = await dailyPlanService.removeTaskFromPlan(
    req.params.id,
    req.user.id,
    req.params.taskId
  );

  res.status(200).json({ plan });
}

export async function reorderPlanTasks(req, res) {
  const plan = await dailyPlanService.reorderPlanTasks(
    req.params.id,
    req.user.id,
    req.body.taskIds
  );

  res.status(200).json({ plan });
}

export async function completeDailyPlan(req, res) {
  const plan = await dailyPlanService.completeDailyPlan(req.params.id, req.user.id);

  res.status(200).json({ plan });
}

export async function deleteDailyPlan(req, res) {
  await dailyPlanService.deleteDailyPlan(req.params.id, req.user.id);

  res.status(204).end();
}
