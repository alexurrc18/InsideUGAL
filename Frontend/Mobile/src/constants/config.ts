export const Config = {
  MAPTILER_STYLE_URL: process.env.EXPO_PUBLIC_MAPTILER_STYLE_URL ?? '',
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8002',
  LLM_BASE_URL: process.env.EXPO_PUBLIC_LLM_BASE_URL ?? 'http://localhost:8001',
  DASHBOARD_URL: process.env.EXPO_PUBLIC_DASHBOARD_URL ?? 'http://localhost:3000',
};
