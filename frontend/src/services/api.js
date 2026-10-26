
// Vite exposes VITE_* values at build time; remove a trailing slash so
// endpoint paths can be appended consistently.
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

async function apiRequest(endpoint) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`);

  // Surface HTTP failures to the component instead of treating them as data.
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json();
}

export function getHealth() {
  return apiRequest("/api/health");
}

export function getActuals(startDate, endDate) {
  // URLSearchParams safely encodes date values in the query string.
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
  });

  return apiRequest(`/api/actuals?${params}`);
}

export function getForecasts(startDate, endDate) {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
  });

  return apiRequest(`/api/forecasts?${params}`);
}

export function getAnalysis(startDate, endDate, decisionHourUtc = 11) {
  // Match the backend parameter name and send the cutoff as a query value.
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    decision_hour_utc: String(decisionHourUtc),
  });

  return apiRequest(`/api/analysis?${params}`);
}
