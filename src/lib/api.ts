import axios from 'axios';

// Use environment variable if set, otherwise use localhost for development
// const API_URL = import.meta.env.VITE_API_URL || 'https://b2b-nest-backend-production.up.railway.app/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;

