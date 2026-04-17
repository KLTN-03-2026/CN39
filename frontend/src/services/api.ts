import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true,
});

// Request interceptor: Luôn gắn token mới nhất từ localStorage vào mỗi request
// Giải quyết lỗi 401 khi user ở lâu trên trang (token trong memory bị cũ)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor tự động refresh token khi access token hết hạn (401)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const url = originalRequest.url || '';

    // KHÔNG intercept các route auth (login, register, refresh)
    if (url.includes('/auth/')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const res = await api.post('/auth/refresh-token');
        const newAccessToken = res.data.accessToken;
        localStorage.setItem('access_token', newAccessToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        
        // Dispatch event để AuthContext cập nhật state cho React
        window.dispatchEvent(new CustomEvent('tokenRefreshed', { detail: newAccessToken }));
        
        return api(originalRequest);
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_info');
        delete api.defaults.headers.common['Authorization'];
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);
