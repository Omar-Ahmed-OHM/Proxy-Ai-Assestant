import { verifyToken } from "../utils/jwt.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    const error = new Error("Authentication required");
    error.code = "UNAUTHORIZED";
    return next(error);
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub };
    next();
  } catch {
    const error = new Error("Invalid or expired token");
    error.code = "UNAUTHORIZED";
    next(error);
  }
}
