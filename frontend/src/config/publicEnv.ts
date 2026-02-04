/// <reference types="vite/client" />

const DEFAULT_OAUTH_BASE_URL = "http://localhost:4180";

export const oauthEnv = {
  baseUrl: import.meta.env.VITE_OAUTH_BASE_URL ?? DEFAULT_OAUTH_BASE_URL,
};

export const oauthConfigured = Boolean(import.meta.env.VITE_OAUTH_BASE_URL);
