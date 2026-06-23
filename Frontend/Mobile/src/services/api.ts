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

  let cleanMsg = detail;

  // Extract message from "Supabase authentication failed:"
  if (typeof detail === 'string' && detail.includes("Supabase authentication failed:")) {
    const rawError = detail.replace("Supabase authentication failed:", "").trim();
    const jsonStart = rawError.indexOf("{");
    
    if (jsonStart !== -1) {
      try {
        const jsonStr = rawError.substring(jsonStart);
        const parsed = JSON.parse(jsonStr);
        if (parsed.msg) {
          cleanMsg = parsed.msg;
        } else if (parsed.message) {
          cleanMsg = parsed.message;
        } else if (parsed.error_description) {
          cleanMsg = parsed.error_description;
        } else {
          cleanMsg = rawError;
        }
      } catch {
        // Fallback to regex pattern matching
        const match = rawError.match(/"(?:msg|message|error_description)"\s*:\s*"([^"]+)"/);
        if (match && match[1]) {
          cleanMsg = match[1];
        } else {
          cleanMsg = rawError;
        }
      }
    } else {
      cleanMsg = rawError;
    }
  }

  // Map known raw error messages to user-friendly Romanian strings
  const translations: Record<string, string> = {
    "invalid login credentials": "Email-ul sau parola sunt incorecte.",
    "email not confirmed": "Adresa de email nu este confirmată. Vă rugăm să vă verificați emailul.",
    "user already registered": "Acest cont/utilizator există deja.",
    "user already exists": "Acest cont/utilizator există deja.",
    "password should be at least 6 characters": "Parola trebuie să aibă cel puțin 6 caractere.",
    "signup requires a valid email": "Vă rugăm să introduceți o adresă de email validă.",
    "invalid email structure": "Formatul adresei de email este invalid.",
    "too many requests": "Prea multe încercări. Vă rugăm să încercați mai târziu.",
    "rate_limit_exceeded": "Prea multe încercări. Vă rugăm să încercați mai târziu.",
    "rate limit exceeded": "Prea multe încercări. Vă rugăm să încercați mai târziu.",
    "active profile not found.": "Profil inactiv sau inexistent.",
    "database error saving user profile": "Eroare la salvarea profilului de utilizator.",
    "email rate limit exceeded": "S-a depășit limita de mesaje trimise. Încercați mai târziu.",
    "network request failed": "Conexiunea la internet a eșuat. Verificați rețeaua.",
    "user not found": "Utilizatorul nu a fost găsit."
  };

  const trimmedMsg = cleanMsg.trim();
  const lowerMsg = trimmedMsg.toLowerCase();

  // Try exact dictionary match
  if (translations[lowerMsg]) {
    return translations[lowerMsg];
  }

  // Try partial dictionary match
  for (const [key, value] of Object.entries(translations)) {
    if (lowerMsg.includes(key)) {
      return value;
    }
  }

  // Fallback for technical strings containing raw supabase or json information
  if (lowerMsg.includes("supabase") || lowerMsg.includes("{") || lowerMsg.includes("status_code")) {
    return "A apărut o eroare de autentificare. Vă rugăm să reîncercați.";
  }

  return status ? `${trimmedMsg} (${status})` : trimmedMsg;
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
