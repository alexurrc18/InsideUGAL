export const Config = {
  MAPTILER_STYLE_URL: process.env.EXPO_PUBLIC_MAPTILER_STYLE_URL ?? 'https://api.maptiler.com/maps/019ea17c-89bb-7ed5-b99b-850727394299/style.json?key=O12wVsNDEy2SNlkC8eYS',
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8002',
  LLM_BASE_URL: process.env.EXPO_PUBLIC_LLM_BASE_URL ?? 'http://localhost:8001',
  DASHBOARD_URL: process.env.EXPO_PUBLIC_DASHBOARD_URL ?? 'http://localhost:3000',
};
