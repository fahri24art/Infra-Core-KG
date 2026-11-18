import axios from 'axios';

// Create axios instance with base configuration
const http = axios.create({
    baseURL: '',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add organization header
http.interceptors.request.use(
    (config) => {
        // Get organization from localStorage / sessionStorage
        const organization = sessionStorage.getItem('organization') || 'TCF-KG';
        
        // Add organization header to all requests
        config.headers['X-Organization'] = organization;

        // Add Authorization header if user token is stored
        try {
            const userStr = sessionStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                if (user && user.token) {
                    config.headers['Authorization'] = `Bearer ${user.token}`;
                }
            }
        } catch (e) {}
        
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
http.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle 401 unauthorized - redirect to login (kecuali di halaman publik)
        if (error.response && error.response.status === 401) {
            const currentPath = window.location.pathname || '';
            const isPublicPage = currentPath.startsWith('/pengajuan-budget') || 
                                 currentPath.startsWith('/permintaan-budget') ||
                                 currentPath.startsWith('/public') ||
                                 currentPath.startsWith('/ricoh/request') ||
                                 currentPath.startsWith('/pengajuan-kuota') ||
                                 currentPath.startsWith('/portal') || 
                                 currentPath.startsWith('/login') ||
                                 currentPath.startsWith('/ict/downloads');
            if (!isPublicPage) {
                sessionStorage.removeItem('user');
                sessionStorage.removeItem('organization');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default http;