import Constants from 'expo-constants';

export const Config = {
  MAPTILER_STYLE_URL: process.env.EXPO_PUBLIC_MAPTILER_STYLE_URL as string,
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL as string,
  LLM_BASE_URL: process.env.EXPO_PUBLIC_LLM_BASE_URL as string,
  DASHBOARD_URL: process.env.EXPO_PUBLIC_DASHBOARD_URL as string,
  // Sursa unica pentru versiunea afisata in UI (Setari, footer web) — citita din app.json, nu duplicata manual.
  APP_VERSION: Constants.expoConfig?.version ?? '1.0.0',
};