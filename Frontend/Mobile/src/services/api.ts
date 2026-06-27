import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '@/constants/config';

const memoryFallback = new Map<string, string>();

function isValidTokenString(val: string | null | undefined): boolean {
  if (!val) return false;
  const trimmed = val.trim();
  return (
    trimmed !== '' &&
    trimmed.toLowerCase() !== 'null' &&
    trimmed.toLowerCase() !== 'undefined' &&
    trimmed.toLowerCase() !== 'none'
  );
}

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
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const secureFlag = isHttps ? '; Secure' : '';
  document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax" + secureFlag;
}

function eraseCookie(name: string) {
  if (typeof document === 'undefined') return;
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const secureFlag = isHttps ? '; Secure' : '';
  document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax' + secureFlag;
}

// Web-safe storage wrapper to bypass native module issues on Web browsers
export const storage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      try {
        const localVal = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
        if (isValidTokenString(localVal)) return localVal;

        if (key === 'access_token') {
          const cookieVal = getCookie(key);
          if (isValidTokenString(cookieVal)) return cookieVal;
        }
        return null;
      } catch (e) {
        console.error('[API] Error reading from storage:', e);
        return null;
      }
    }
    try {
      const val = await AsyncStorage.getItem(key);
      if (isValidTokenString(val)) return val;
      return memoryFallback.get(key) || null;
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
        if (key === 'access_token') {
          setCookie(key, value, 7); // 7 days expiration
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
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(key);
        }
        if (key === 'access_token') {
          eraseCookie(key);
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

// Callback apelat de interceptorul de 401 când refresh-ul eșuează și sesiunea e invalidată.
let _onSessionExpired: (() => void) | null = null;
export function setSessionExpiredCallback(cb: () => void): void {
  _onSessionExpired = cb;
}

// Global variables to keep token state in memory for fast access
let authToken: string | null = null;
let tokenExpiresAt: number | null = null; // Unix timestamp in seconds

// Create Axios instance
// eslint-disable-next-line import/no-named-as-default-member
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
 * Call this with the access token after a successful login or refresh, or with null on logout.
 */
export async function setAuthToken(
  token: string | null,
  refreshToken: string | null = null,
  expiresAt: number | null = null,
): Promise<void> {
  authToken = token;
  if (token === null) {
    tokenExpiresAt = null;
  } else if (expiresAt) {
    tokenExpiresAt = expiresAt;
  }
  try {
    if (token) {
      await storage.setItem('access_token', token);
    } else {
      await storage.removeItem('access_token');
    }
    if (refreshToken) {
      await storage.setItem('refresh_token', refreshToken);
    } else if (token === null) {
      await storage.removeItem('refresh_token');
    }
    if (expiresAt) {
      await storage.setItem('token_expires_at', String(expiresAt));
    } else if (token === null) {
      await storage.removeItem('token_expires_at');
    }
  } catch (error) {
    console.error('[API] Error saving token to storage:', error);
  }
}

export function resolveImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.includes('supabase-kong:8000')) {
    const apiHost = Config.API_BASE_URL ? Config.API_BASE_URL.replace('http://', '').replace('https://', '').split(':')[0] : 'localhost';
    return url.replace('supabase-kong:8000', `${apiHost}/supabase`);
  }
  if (url.includes('127.0.0.1:54325')) {
    const apiHost = Config.API_BASE_URL ? Config.API_BASE_URL.replace('http://', '').replace('https://', '').split(':')[0] : 'localhost';
    return url.replace('127.0.0.1:54325', `${apiHost}/supabase`);
  }
  return url;
}

export async function getAuthToken(): Promise<string | null> {
  if (isValidTokenString(authToken)) {
    return authToken;
  }
  authToken = null;
  try {
    const token = await storage.getItem('access_token');
    if (isValidTokenString(token)) {
      authToken = token;
      return token;
    }
    return null;
  } catch (error) {
    console.error('[API] Error loading token from storage:', error);
    return null;
  }
}

async function getTokenExpiresAt(): Promise<number | null> {
  if (tokenExpiresAt !== null) return tokenExpiresAt;
  const stored = await storage.getItem('token_expires_at');
  if (stored) {
    tokenExpiresAt = Number(stored);
    return tokenExpiresAt;
  }
  return null;
}

// Shared promise so concurrent requests don't each trigger their own proactive refresh
let proactiveRefreshPromise: Promise<string | null> | null = null;

async function proactiveRefreshIfNeeded(): Promise<string | null> {
  const expiresAt = await getTokenExpiresAt();
  if (!expiresAt) return null;
  const secondsLeft = expiresAt - Math.floor(Date.now() / 1000);
  // Only refresh when within 60s of expiry and the token isn't already way past expiry
  if (secondsLeft > 60 || secondsLeft < -30) return null;

  if (proactiveRefreshPromise) return proactiveRefreshPromise;

  proactiveRefreshPromise = (async () => {
    try {
      const storedRefreshToken = await storage.getItem('refresh_token');
      if (!storedRefreshToken) return null;

      const response = await axios.post(
        `${Config.API_BASE_URL}/auth/refresh`,
        { refresh_token: storedRefreshToken },
        { headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' } },
      );

      const data = response.data;
      const newAccessToken = data?.access_token;
      const newRefreshToken = data?.refresh_token ?? null;
      const newExpiresAt = data?.expires_at ?? null;

      if (newAccessToken) {
        await setAuthToken(newAccessToken, newRefreshToken, newExpiresAt);
        return newAccessToken;
      }
      return null;
    } catch {
      // Don't log out here — let the reactive 401 handler decide
      return null;
    } finally {
      proactiveRefreshPromise = null;
    }
  })();

  return proactiveRefreshPromise;
}

/**
 * Logs out the user by calling /auth/logout API to invalidate the session on the backend
 * and then clearing local authentication tokens.
 */
export async function logout(): Promise<void> {
  const token = await getAuthToken();
  if (token) {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.warn('[API] Logout request failed:', error);
    }
  }
  await setAuthToken(null);
}


function setAuthorizationHeader(config: InternalAxiosRequestConfig, token: string) {
  if (!config.headers) return;
  const value = `Bearer ${token}`;
  if (typeof (config.headers as any).set === 'function') {
    (config.headers as any).set('Authorization', value);
  } else {
    config.headers.Authorization = value;
  }
}

// Request Interceptor: Attach bearer token to outgoing requests, proactively refreshing if needed
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Don't inject tokens or trigger refresh for auth endpoints
    const url = config.url ?? '';
    if (url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/logout')) {
      return config;
    }

    const refreshed = await proactiveRefreshIfNeeded();
    const token = refreshed ?? await getAuthToken();
    if (token) {
      setAuthorizationHeader(config, token);
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
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;
    const errorDetail = (error.response?.data as any)?.detail;
    const status = error.response?.status;
    
    // Check for 401 Unauthorized
    if (status === 401 && originalRequest && !(originalRequest as any)._retry) {
      console.log('[API Interceptor] 401 error caught for:', originalRequest.url);
      if (isRefreshing) {
        return new Promise<string>(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          setAuthorizationHeader(originalRequest, token);
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      (originalRequest as any)._retry = true;
      isRefreshing = true;

      try {
        const storedRefreshToken = await storage.getItem('refresh_token');
        console.log('[API Interceptor] Stored refresh token:', storedRefreshToken ? '(present)' : '(missing)');
        if (!storedRefreshToken) {
          throw new Error('No refresh token found');
        }

        const response = await axios.post(`${Config.API_BASE_URL}/auth/refresh`, {
          refresh_token: storedRefreshToken
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }
        });

        let responseData = response.data;
        if (typeof responseData === 'string' && responseData.trim().startsWith('{')) {
          try {
            responseData = JSON.parse(responseData);
          } catch {
            // keep as string
          }
        }

        console.log('[API Interceptor] Refresh response:', response.status, responseData);

        const newAccessToken = typeof responseData === 'string' ? responseData : responseData?.access_token;
        const newRefreshToken = responseData?.refresh_token ?? null;
        const newExpiresAt = responseData?.expires_at ?? null;

        if (newAccessToken) {
          await setAuthToken(newAccessToken, newRefreshToken, newExpiresAt);
          processQueue(null, newAccessToken);
          setAuthorizationHeader(originalRequest, newAccessToken);
          return api(originalRequest);
        } else {
          throw new Error('No access token returned from refresh');
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        console.warn('[API] Refresh token failed - clearing credentials.');
        await setAuthToken(null);
        _onSessionExpired?.();

        // Formatted error message to be returned
        const apiError = {
          message: "Sesiunea a expirat. Vă rugăm să vă reconectați.",
          status: 401,
          originalError: error,
        };
        return Promise.reject(apiError);
      } finally {
        isRefreshing = false;
      }
    }
    
    // Check for 403 Active profile not found (inactive) or other 403s
    if (status === 403 && errorDetail === "Active profile not found.") {
      console.warn('[API] Inactive profile - clearing token.');
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
