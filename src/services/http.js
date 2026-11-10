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
        // Get organization from localStorage
        const organization = sessionStorage.getItem('organization') || 'TCF-SG';
        
        // Add organization header to all requests
        config.headers['X-Organization'] = organization;
        
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
        // Handle 401 unauthorized - redirect to login
        if (error.response && error.response.status === 401) {
            sessionStorage.removeItem('user');
            sessionStorage.removeItem('organization');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default http;