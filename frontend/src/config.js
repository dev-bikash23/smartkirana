// Central API config — reads from environment variable in production
// Set VITE_API_URL in your Vercel/Netlify dashboard to your Render backend URL
export const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
