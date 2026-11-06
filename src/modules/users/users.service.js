import bcrypt from "bcryptjs";
import * as userRepository from "./users.repository.js";

const SALT_ROUNDS = 12;

function createError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function isValidTimezone(timezone) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

function toPublicUser(user) {
  if (!user) return null;

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    timezone: user.timezone,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function registerUser(userData) {
  const name = userData.name.trim();
  const email = normalizeEmail(userData.email);
  const timezone = userData.timezone || "Africa/Cairo";

  if (!isValidTimezone(timezone)) {
    throw createError("Invalid timezone", "INVALID_TIMEZONE");
  }

  const existingUser = await userRepository.findUserByEmail(email);

  if (existingUser) {
    throw createError("Email already exists", "EMAIL_ALREADY_EXISTS");
  }

  const passwordHash = await bcrypt.hash(userData.password, SALT_ROUNDS);
  const newUser = {
    name,
    email,
    passwordHash,
    timezone,
  };

  try {
    const user = await userRepository.createUser(newUser);
    return toPublicUser(user);
  } catch (error) {
    if (error.code === 11000) {
      throw createError("Email already exists", "EMAIL_ALREADY_EXISTS");
    }

    throw error;
  }
}

export async function verifyCredentials(email, password) {
  const user = await userRepository.findUserByEmailWithPassword(
    normalizeEmail(email)
  );

  const isMatch = user && (await bcrypt.compare(password, user.passwordHash));

  if (!isMatch) {
    throw createError("Invalid email or password", "INVALID_CREDENTIALS");
  }

  return toPublicUser(user);
}

export async function getUserById(id) {
  const user = await userRepository.findUserById(id);

  if (!user) {
    throw createError("User not found", "USER_NOT_FOUND");
  }

  return toPublicUser(user);
}

export async function updateProfile(id, updateData) {
  const updates = {};

  if (updateData.name !== undefined) {
    updates.name = updateData.name.trim();
  }

  if (updateData.timezone !== undefined) {
    if (!isValidTimezone(updateData.timezone)) {
      throw createError("Invalid timezone", "INVALID_TIMEZONE");
    }
    updates.timezone = updateData.timezone;
  }

  const user = await userRepository.updateUser(id, updates);

  if (!user) {
    throw createError("User not found", "USER_NOT_FOUND");
  }

  return toPublicUser(user);
}

export async function changePassword(id, currentPassword, newPassword) {
  const user = await userRepository.findUserByIdWithPassword(id);

  if (!user) {
    throw createError("User not found", "USER_NOT_FOUND");
  }

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);

  if (!isMatch) {
    throw createError("Current password is incorrect", "INVALID_PASSWORD");
  }

  const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await userRepository.updateUserPassword(id, newPasswordHash);
}

export async function deleteUser(id) {
  const user = await userRepository.deleteUser(id);

  if (!user) {
    throw createError("User not found", "USER_NOT_FOUND");
  }
}
