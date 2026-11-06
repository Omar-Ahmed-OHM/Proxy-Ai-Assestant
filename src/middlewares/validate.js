// source: "body" | "params" | "query"
export function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const error = new Error("Validation failed");
      error.code = "VALIDATION_ERROR";
      error.details = result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
      return next(error);
    }

    // req.query is a getter in Express 5, so shadow it instead of assigning
    Object.defineProperty(req, source, {
      value: result.data,
      writable: true,
      enumerable: true,
      configurable: true,
    });
    next();
  };
}
