import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
});

// Attach the login token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Token missing or expired → back to the login page (except for the login call itself)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('workingYear');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

// Turns a NestJS error response into one readable message
export function apiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  const message = axios.isAxiosError(error) ? error.response?.data?.message : null;
  return (Array.isArray(message) ? message[0] : message) ?? fallback;
}
