const STATUS_BY_CODE = {
  VALIDATION_ERROR: 400,
  INVALID_ID: 400,
  INVALID_JSON: 400,
  INVALID_TIMEZONE: 400,
  INVALID_PASSWORD: 400,
  NO_UPDATE_FIELDS: 400,
  REMINDER_IN_PAST: 400,
  INVALID_TASK_ORDER: 400,
  UNAUTHORIZED: 401,
  INVALID_CREDENTIALS: 401,
  USER_NOT_FOUND: 404,
  TASK_NOT_FOUND: 404,
  REMINDER_NOT_FOUND: 404,
  DAILY_PLAN_NOT_FOUND: 404,
  TASK_NOT_IN_PLAN: 404,
  NOT_FOUND: 404,
  EMAIL_ALREADY_EXISTS: 409,
  DUPLICATE_KEY: 409,
  REMINDER_NOT_EDITABLE: 409,
  INVALID_STATUS_TRANSITION: 409,
  DAILY_PLAN_ALREADY_EXISTS: 409,
  DAILY_PLAN_COMPLETED: 409,
  DAILY_PLAN_FULL: 409,
  TASK_ALREADY_IN_PLAN: 409,
  CONCURRENT_UPDATE: 409,
  TOO_MANY_REQUESTS: 429,
  DATABASE_UNAVAILABLE: 503,
  WEATHER_UNAVAILABLE: 502,
  ASSISTANT_UNAVAILABLE: 502,
  ASSISTANT_NOT_CONFIGURED: 503,
};

function normalizeError(err) {
  if (err.name === "CastError") {
    return { code: "INVALID_ID", message: "Invalid id" };
  }

  if (err.name === "ValidationError") {
    return {
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      details: Object.values(err.errors).map((e) => ({
        path: e.path,
        message: e.message,
      })),
    };
  }

  if (err.code === 11000) {
    return { code: "DUPLICATE_KEY", message: "Resource already exists" };
  }

  if (err.type === "entity.parse.failed") {
    return { code: "INVALID_JSON", message: "Malformed JSON body" };
  }

  if (STATUS_BY_CODE[err.code]) {
    return { code: err.code, message: err.message, details: err.details };
  }

  return null;
}

export function notFound(req, res, next) {
  const error = new Error(`Route ${req.method} ${req.originalUrl} not found`);
  error.code = "NOT_FOUND";
  next(error);
}

export function errorHandler(err, req, res, next) {
  const known = normalizeError(err);

  if (!known) {
    console.error(err);
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Something went wrong" },
    });
  }

  res.status(STATUS_BY_CODE[known.code]).json({
    error: {
      code: known.code,
      message: known.message,
      ...(known.details && { details: known.details }),
    },
  });
}
