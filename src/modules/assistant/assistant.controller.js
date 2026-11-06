import * as assistantService from "./assistant.service.js";

export async function sendMessage(req, res) {
  const result = await assistantService.sendMessage(req.user.id, req.body);

  res.status(200).json(result);
}

export async function getBriefing(req, res) {
  const result = await assistantService.getBriefing(req.user.id, req.query);

  res.status(200).json(result);
}
