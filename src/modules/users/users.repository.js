import { User } from "./user.model.js";

export async function createUser(userData) {
  const user = new User(userData);
  return await user.save();
}

export async function findUserByEmail(email) {
  return await User.findOne({ email });
}

export async function findUserByEmailWithPassword(email) {
  return await User.findOne({ email }).select("+passwordHash");
}

export async function findUserById(id) {
  return await User.findById(id);
}

export async function findUserByIdWithPassword(id) {
  return await User.findById(id).select("+passwordHash");
}

export async function updateUser(id, updateData) {
  return await User.findByIdAndUpdate(id, updateData, {
    returnDocument: "after",
    runValidators: true,
  });
}

export async function updateUserPassword(id, newPasswordHash) {
  return await User.findByIdAndUpdate(
    id,
    { passwordHash: newPasswordHash },
    { returnDocument: "after" }
  );
}

export async function deleteUser(id) {
  return await User.findByIdAndDelete(id);
}
