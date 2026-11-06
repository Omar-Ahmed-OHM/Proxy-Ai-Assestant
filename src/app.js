import express from "express";
import cors from "cors";
import helm from "helmet";
import authRoutes from "./modules/auth/auth.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import tasksRoutes from "./modules/tasks/tasks.routes.js";
import remindersRoutes from "./modules/reminders/reminders.routes.js";
import dailyPlanRoutes from "./modules/daily-plan/daily-plan.routes.js";
import assistantRoutes from "./modules/assistant/assistant.routes.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";
import { apiLimiter } from "./middlewares/rateLimiter.js";
import { env } from "./config/env.js";

const app = express();

if (env.TRUST_PROXY !== undefined) {
  app.set("trust proxy", env.TRUST_PROXY);
}

app.use(cors());
app.use(helm());
app.use("/api/v1", apiLimiter);
app.use(express.json())

app.get("/health",(req,res)=>{
     res.status(200).json({
    status: "ok",
    message: "Proxy API is running",
  });
})

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", usersRoutes);
app.use("/api/v1/tasks", tasksRoutes);
app.use("/api/v1/reminders", remindersRoutes);
app.use("/api/v1/daily-plans", dailyPlanRoutes);
app.use("/api/v1/assistant", assistantRoutes);

app.use(notFound);
app.use(errorHandler);

export default app ;