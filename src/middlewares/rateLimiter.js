import rateLimit from "express-rate-limit";

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function rateLimitHandler(req, res, next) {
  const error = new Error("Too many requests. Please try again later.");
  error.code = "TOO_MANY_REQUESTS";
  next(error);
}

function createLimiter({ name, limit, windowMs = FIFTEEN_MINUTES, skip }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    identifier: name,
    handler: rateLimitHandler,
    ...(skip && { skip }),
  });
}

export const loginLimiter = createLimiter({ name: "login", limit: 5 });

export const registerLimiter = createLimiter({ name: "register", limit: 3 });

export const apiLimiter = createLimiter({ name: "api", limit: 200 });

export const writeLimiter = createLimiter({
  name: "write",
  limit: 60,
  skip: (req) => !WRITE_METHODS.has(req.method),
});
