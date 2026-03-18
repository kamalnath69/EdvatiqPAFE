import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

let getToken = () => localStorage.getItem('token');
let onUnauthorized = () => {};
let handlingUnauthorized = false;

export function registerApiAuthHandlers({ getTokenFn, onUnauthorizedFn }) {
  if (getTokenFn) getToken = getTokenFn;
  if (onUnauthorizedFn) onUnauthorized = onUnauthorizedFn;
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && !handlingUnauthorized) {
      handlingUnauthorized = true;
      onUnauthorized();
      setTimeout(() => {
        handlingUnauthorized = false;
      }, 200);
    }
    return Promise.reject(error);
  }
);

export default api;
