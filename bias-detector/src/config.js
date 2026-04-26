// config.js — Central place for API configuration.
// In development: points to your local FastAPI server.
// In production: set VITE_API_URL in your .env file.

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';