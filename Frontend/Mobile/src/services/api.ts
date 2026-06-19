import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '@/constants/config';

const memoryFallback = new Map<string, string>();

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function setCookie(name: string, value: string, days?: number) {
  if (typeof document === 'undefined') return;
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Strict; Secure";
}

function eraseCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Strict; Secure';
}

// Web-safe storage wrapper to bypass native module issues on Web browsers
export const storage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      try {
        if (key === 'access_token') {
          return getCookie(key);
        }
        return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      } catch (e) {
        console.error('[API] Error reading from storage:', e);
        return null;
      }
    }
    try {
      return await AsyncStorage.getItem(key);
    } catch (e) {
      console.warn('[API] AsyncStorage.getItem failed, falling back to memory:', e);
      return memoryFallback.get(key) || null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        if (key === 'access_token') {
          setCookie(key, value, 7); // 7 days expiration
        } else if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, value);
        }
      } catch (e) {
        console.error('[API] Error writing to storage:', e);
      }
      return;
    }
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.warn('[API] AsyncStorage.setItem failed, falling back to memory:', e);
      memoryFallback.set(key, value);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        if (key === 'access_token') {
          eraseCookie(key);
        } else if (typeof window !== 'undefined') {
          window.localStorage.removeItem(key);
        }
      } catch (e) {
        console.error('[API] Error removing from storage:', e);
      }
      return;
    }
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.warn('[API] AsyncStorage.removeItem failed, falling back to memory:', e);
      memoryFallback.delete(key);
    }
  }
};

// Global variable to keep the token in memory for fast synchronous access
let authToken: string | null = null;

// Create Axios instance
const api = axios.create({
  baseURL: Config.API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

/**
 * Sets the auth token both in memory and persists it to AsyncStorage / localStorage.
 * Call this with the access token after a successful login, or with null on logout.
 */
export async function setAuthToken(token: string | null): Promise<void> {
  authToken = token;
  try {
    if (token) {
      await storage.setItem('access_token', token);
    } else {
      await storage.removeItem('access_token');
    }
  } catch (error) {
    console.error('[API] Error saving token to storage:', error);
  }
}

/**
 * Retrieves the current auth token, checking memory first then AsyncStorage / localStorage.
 */
export async function getAuthToken(): Promise<string | null> {
  if (authToken) return authToken;
  try {
    const token = await storage.getItem('access_token');
    if (token) {
      authToken = token;
    }
    return token;
  } catch (error) {
    console.error('[API] Error loading token from storage:', error);
    return null;
  }
}

// Request Interceptor: Attach bearer token to outgoing requests
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getAuthToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

function cleanErrorMessage(detail: string | undefined, defaultMsg: string, status?: number): string {
  if (!detail) {
    return status ? `${defaultMsg} (${status})` : defaultMsg;
  }
  
  if (typeof detail === 'string' && detail.includes("Supabase authentication failed:")) {
    try {
      const jsonStart = detail.indexOf("{");
      if (jsonStart !== -1) {
        const jsonStr = detail.substring(jsonStart);
        const parsed = JSON.parse(jsonStr);
        if (parsed.msg) {
          let msg = parsed.msg;
          if (msg === "Invalid login credentials") {
            msg = "Date de conectare invalide";
          } else if (msg === "Email not confirmed") {
            msg = "Adresa de email nu este confirmată";
          }
          return status ? `${msg} (${status})` : msg;
        }
      }
    } catch (e) {
      const match = detail.match(/"msg"\s*:\s*"([^"]+)"/);
      if (match && match[1]) {
        let msg = match[1];
        if (msg === "Invalid login credentials") {
          msg = "Date de conectare invalide";
        } else if (msg === "Email not confirmed") {
          msg = "Adresa de email nu este confirmată";
        }
        return status ? `${msg} (${status})` : msg;
      }
    }
  }

  if (detail === "Active profile not found.") {
    return status ? `Profil inactiv sau inexistent (${status})` : "Profil inactiv sau inexistent";
  }

  return status ? `${detail} (${status})` : detail;
}

// Response Interceptor: Global error handler
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const errorDetail = (error.response?.data as any)?.detail;
    const status = error.response?.status;
    
    // Check for 401 Unauthorized or 403 Active profile not found (expired/invalid/inactive)
    if (
      status === 401 ||
      (status === 403 && errorDetail === "Active profile not found.")
    ) {
      console.warn('[API] Stale or invalid credentials - clearing token.');
      await setAuthToken(null);
    }
    
    // Format error message to be more readable
    const apiError = {
      message: cleanErrorMessage(errorDetail, error.message, status),
      status: status,
      originalError: error,
    };

    return Promise.reject(apiError);
  }
);

export default api;
