import * as authService from "./auth.service.js";

export async function register(req, res) {
  const result = await authService.register(req.body);

  res.status(201).json(result);
}

export async function login(req, res) {
  const { email, password } = req.body;
  const result = await authService.login(email, password);

  res.status(200).json(result);
}
