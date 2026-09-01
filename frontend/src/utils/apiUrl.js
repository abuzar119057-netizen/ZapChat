// Utility to get the backend URL
// Use this function throughout the app to construct API URLs
export const getBackendUrl = () => {
  return import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000";
};

export const getApiUrl = (path) => {
  const base = getBackendUrl().replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

export default getBackendUrl;
