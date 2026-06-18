import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from "axios";

import { apiBaseUrl, getStoredAccessToken } from "./api-client";

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

export default axiosInstance;
