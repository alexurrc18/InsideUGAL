import axios from "axios";
import { AxiosHeaders, type AxiosError, type InternalAxiosRequestConfig } from "axios";

import { apiBaseUrl, getStoredAccessToken, refreshAuthSession } from "./api-client";

const axiosInstance = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

function setAuthorizationHeader(config: InternalAxiosRequestConfig, token: string) {
  const value = `Bearer ${token}`;

  if (config.headers instanceof AxiosHeaders) {
    config.headers.set("Authorization", value);
    return;
  }

  config.headers = AxiosHeaders.from(config.headers);
  config.headers.set("Authorization", value);
}

axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getStoredAccessToken();

  if (token) {
    setAuthorizationHeader(config, token);
  }

  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (error.response?.status !== 401 || !config || config._retry) {
      return Promise.reject(error);
    }

    const token = await refreshAuthSession();
    if (!token) {
      return Promise.reject(error);
    }

    config._retry = true;
    setAuthorizationHeader(config, token);
    return axiosInstance(config);
  },
);

export default axiosInstance;
