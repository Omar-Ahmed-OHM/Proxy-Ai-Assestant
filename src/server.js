import app from "./app.js";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { startRemindersJob } from "./jobs/reminders.job.js";

const startServer = async () => {
  app.listen(env.PORT, () => {
    console.log(`Server is running on port ${env.PORT}`);
  });

  try {
    await connectDB();
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
  }

  startRemindersJob();
};

startServer();
