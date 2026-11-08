import * as usersService from "../users/users.service.js";

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const TIMEOUT_MS = 8000;
const WEATHER_TTL_MS = 15 * 60 * 1000;

const geocodeCache = new Map();
const weatherCache = new Map();

function createError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

async function fetchJson(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Weather request failed:", error.message);
    throw createError("Weather is unavailable right now", "WEATHER_UNAVAILABLE");
  }
}

function cityFromTimezone(timezone) {
  return timezone.split("/").pop().replace(/_/g, " ");
}

async function geocode(city) {
  const key = city.toLowerCase();
  if (geocodeCache.has(key)) return geocodeCache.get(key);

  const params = new URLSearchParams({ name: city, count: "1", language: "en", format: "json" });
  const data = await fetchJson(`${GEOCODING_URL}?${params}`);
  const place = data.results?.[0];

  if (!place) {
    throw createError(`Could not find a location for ${city}`, "WEATHER_UNAVAILABLE");
  }

  const location = {
    lat: place.latitude,
    lon: place.longitude,
    city: place.name,
    country: place.country,
  };
  geocodeCache.set(key, location);
  return location;
}

function toCondition(code, windSpeed) {
  if (code >= 95) return "thunderstorm";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if (code >= 51 && code <= 57) return "drizzle";
  if (code === 45 || code === 48) return "fog";
  if (windSpeed >= 40) return "wind";
  if (code === 3) return "cloudy";
  if (code === 1 || code === 2) return "partly-cloudy";
  return "clear";
}

export async function getWeather(userId, { timezone, city, lat, lon } = {}) {
  let location;

  if (lat !== undefined && lon !== undefined) {
    location = { lat, lon, city: city ?? "Your location", country: undefined };
  } else {
    const tz = timezone ?? (await usersService.getUserById(userId)).timezone;
    location = await geocode(city ?? cityFromTimezone(tz));
  }

  const cacheKey = `${location.lat.toFixed(2)},${location.lon.toFixed(2)}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.weather;

  const params = new URLSearchParams({
    latitude: String(location.lat),
    longitude: String(location.lon),
    current: "temperature_2m,weather_code,wind_speed_10m",
    timezone: "auto",
  });
  const data = await fetchJson(`${FORECAST_URL}?${params}`);
  const current = data.current;

  if (!current || typeof current.temperature_2m !== "number") {
    throw createError("Weather is unavailable right now", "WEATHER_UNAVAILABLE");
  }

  const weather = {
    temperature: Math.round(current.temperature_2m),
    unit: "C",
    condition: toCondition(current.weather_code, current.wind_speed_10m ?? 0),
    city: location.city,
    ...(location.country && { country: location.country }),
  };
  weatherCache.set(cacheKey, { weather, expiresAt: Date.now() + WEATHER_TTL_MS });
  return weather;
}
