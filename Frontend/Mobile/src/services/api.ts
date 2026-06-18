import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '@/constants/config';

const memoryFallback = new Map<string, string>();

// Web-safe storage wrapper to bypass native module issues on Web browsers
export const storage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      try {
        return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      } catch (e) {
        console.error('[API] Error reading from localStorage:', e);
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
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, value);
        }
      } catch (e) {
        console.error('[API] Error writing to localStorage:', e);
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
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(key);
        }
      } catch (e) {
        console.error('[API] Error removing from localStorage:', e);
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

// Response Interceptor: Global error handler
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Check for 401 Unauthorized errors (expired token, invalid token)
    if (error.response?.status === 401) {
      console.warn('[API] Unauthorized access - clearing token.');
      await setAuthToken(null);
    }
    
    // Format error message to be more readable
    const apiError = {
      message: (error.response?.data as any)?.detail || error.message || 'A apărut o eroare neașteptată',
      status: error.response?.status,
      originalError: error,
    };

    return Promise.reject(apiError);
  }
);

export default api;
