import axios from 'axios';

// Create a configured Axios instance
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  withCredentials: true, // Crucial for sending/receiving our httpOnly cookies!
});

// Intercept responses to handle global 401s
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If we get a 401 Unauthorized, the cookie expired or is missing.
      // Redirect to login unless we are already on the login page.
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
