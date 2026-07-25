import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sse_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Render's free tier spins down the backend after ~15 minutes of inactivity.
// The first request after that can take 30-60s to wake it back up, which
// otherwise looks like a network failure to the user. We retry a couple of
// times with backoff before giving up, and expose an onColdStart callback so
// the UI can show a friendly "waking up the server" message meanwhile.
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 4000;

let onColdStart = null;
export function setColdStartHandler(handler) {
  onColdStart = handler;
}

function isLikelyColdStart(error) {
  // No response at all (connection refused/timeout) is the signature of a
  // sleeping Render instance, as opposed to a 4xx/5xx which means the
  // server did respond.
  return !error.response && (error.code === 'ECONNABORTED' || error.message === 'Network Error' || !error.code);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config || {};

    if (isLikelyColdStart(error) && !config.__isRetryRequest) {
      config.__retryCount = config.__retryCount || 0;

      if (config.__retryCount < MAX_RETRIES) {
        config.__retryCount += 1;
        if (config.__retryCount === 1 && onColdStart) onColdStart('waking');

        await wait(RETRY_DELAY_MS);
        try {
          const retryResponse = await api.request(config);
          if (onColdStart) onColdStart('ready');
          return retryResponse;
        } catch (retryError) {
          return Promise.reject(retryError);
        }
      } else if (onColdStart) {
        onColdStart('error');
      }
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('sse_token');
      localStorage.removeItem('sse_user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
