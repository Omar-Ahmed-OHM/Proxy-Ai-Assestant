import mongoose from "mongoose";
import { env } from "./env.js";

let connecting = null;

// Reuses one connection per process, which serverless platforms (Vercel) keep warm between requests
export async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  if (!env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set");
  }

  connecting ??= mongoose
    .connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
    .then((instance) => {
      console.log("MongoDB connected successfully");
      return instance.connection;
    })
    .catch((error) => {
      connecting = null;
      throw error;
    });

  return connecting;
}

export async function disconnectDB() {
  await mongoose.disconnect();
}