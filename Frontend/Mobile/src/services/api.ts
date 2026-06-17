import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '@/constants/config';

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
 * Sets the auth token both in memory and persists it to AsyncStorage.
 * Call this with the access token after a successful login, or with null on logout.
 */
export async function setAuthToken(token: string | null): Promise<void> {
  authToken = token;
  try {
    if (token) {
      await AsyncStorage.setItem('access_token', token);
    } else {
      await AsyncStorage.removeItem('access_token');
    }
  } catch (error) {
    console.error('[API] Error saving token to AsyncStorage:', error);
  }
}

/**
 * Retrieves the current auth token, checking memory first then AsyncStorage.
 */
export async function getAuthToken(): Promise<string | null> {
  if (authToken) return authToken;
  try {
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      authToken = token;
    }
    return token;
  } catch (error) {
    console.error('[API] Error loading token from AsyncStorage:', error);
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
