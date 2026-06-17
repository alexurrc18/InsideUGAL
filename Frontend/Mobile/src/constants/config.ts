import { Platform } from 'react-native';

const getApiBaseUrl = () => {
  return 'http://127.0.0.1:8002';
};

export const Config = {
  MAPTILER_STYLE_URL: 'https://api.maptiler.com/maps/019ea17c-89bb-7ed5-b99b-850727394299/style.json?key=O12wVsNDEy2SNlkC8eYS',
  API_BASE_URL: getApiBaseUrl(),
};