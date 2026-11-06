import * as usersService from "./users.service.js";


export async function getMe(req, res) {
  const user = await usersService.getUserById(req.user.id);

  res.status(200).json({ user });
}

export async function updateMe(req, res) {
  const { name, timezone } = req.body;
  const user = await usersService.updateProfile(req.user.id, { name, timezone });

  res.status(200).json({ user });
}

export async function changeMyPassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  await usersService.changePassword(req.user.id, currentPassword, newPassword);

  res.status(204).end();
}

export async function deleteMe(req, res) {
  await usersService.deleteUser(req.user.id);

  res.status(204).end();
}
