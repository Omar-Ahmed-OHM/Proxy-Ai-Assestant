import * as usersService from "../users/users.service.js";
import { signToken } from "../../utils/jwt.js";

export async function register(userData) {
  const user = await usersService.registerUser(userData);
  const token = signToken(user.id);

  return { user, token };
}

export async function login(email, password) {
  const user = await usersService.verifyCredentials(email, password);
  const token = signToken(user.id);

  return { user, token };
}
