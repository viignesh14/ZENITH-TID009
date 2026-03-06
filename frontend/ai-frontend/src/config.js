let apiUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";
if (apiUrl && !apiUrl.endsWith('/api') && !apiUrl.endsWith('/api/')) {
    apiUrl = apiUrl.endsWith('/') ? `${apiUrl}api` : `${apiUrl}/api`;
}
const BASE_URL = apiUrl;

export default BASE_URL;
