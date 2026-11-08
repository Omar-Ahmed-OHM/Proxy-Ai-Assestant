import * as dashboardService from "./dashboard.service.js";
import * as weatherService from "./weather.service.js";

export async function getSummary(req, res) {
  const summary = await dashboardService.getSummary(req.user.id, req.query);

  res.status(200).json({ summary });
}

export async function getWeather(req, res) {
  const weather = await weatherService.getWeather(req.user.id, req.query);

  res.status(200).json({ weather });
}
