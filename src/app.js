import express from "express";
import cors from "cors";
import helm from "helmet";
import mongoose from "mongoose";
import authRoutes from "./modules/auth/auth.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import tasksRoutes from "./modules/tasks/tasks.routes.js";
import remindersRoutes from "./modules/reminders/reminders.routes.js";
import dailyPlanRoutes from "./modules/daily-plan/daily-plan.routes.js";
import assistantRoutes from "./modules/assistant/assistant.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";
import { apiLimiter } from "./middlewares/rateLimiter.js";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import pushRoutes from "./modules/push/push.routes.js";

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
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
})

app.use("/api/v1", async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    const dbError = new Error("Database is unavailable, please try again shortly");
    dbError.code = "DATABASE_UNAVAILABLE";
    next(dbError);
  }
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", usersRoutes);
app.use("/api/v1/tasks", tasksRoutes);
app.use("/api/v1/reminders", remindersRoutes);
app.use("/api/v1/daily-plans", dailyPlanRoutes);
app.use("/api/v1/assistant", assistantRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/push", pushRoutes);

app.use(notFound);
app.use(errorHandler);

export default app ;