import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import * as dashboardController from "./dashboard.controller.js";
import { summaryQuerySchema, weatherQuerySchema } from "./dashboard.validation.js";

const router = Router();

router.use(requireAuth);

router.get("/summary", validate(summaryQuerySchema, "query"), dashboardController.getSummary);
router.get("/weather", validate(weatherQuerySchema, "query"), dashboardController.getWeather);

export default router;
