import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { UserProvider } from './context/UserContext';
import { CartProvider } from './context/CartContext';
import axios from 'axios';

// ─── Global Axios Interceptor ─────────────────────────────────────────────────
// Helper to get organization: Admin can switch via param/session; non-admin strictly bound to their account
const getOrganization = () => {
    try {
        const user = JSON.parse(sessionStorage.getItem('user') || 'null');
        if (user && user.role) {
            const isAdmin = ['super_user', 'superuser', 'administrator', 'admin'].includes(user.role.toLowerCase());
            if (!isAdmin && user.organization) {
                return user.organization;
            }
        }
    } catch (e) {}
    const params = new URLSearchParams(window.location.search);
    return params.get('org') || sessionStorage.getItem('organization') || 'TCF-SG';
};

// Otomatis tambah X-Organization header ke SEMUA request axios di seluruh app
axios.interceptors.request.use((config) => {
    config.headers['X-Organization'] = getOrganization();
    return config;
});

// Otomatis tambah X-Organization header ke SEMUA fetch() request di seluruh app
const originalFetch = window.fetch;
window.fetch = function (resource, init = {}) {
    try {
        const org = getOrganization();
        init = init || {};
        if (init.headers instanceof Headers) {
            if (!init.headers.has('x-organization') && !init.headers.has('X-Organization')) {
                init.headers.set('x-organization', org);
            }
        } else if (Array.isArray(init.headers)) {
            const hasOrg = init.headers.some(([k]) => k.toLowerCase() === 'x-organization');
            if (!hasOrg) init.headers.push(['x-organization', org]);
        } else {
            init.headers = {
                ...(init.headers || {}),
                'x-organization': (init.headers && (init.headers['x-organization'] || init.headers['X-Organization'])) || org
            };
        }
    } catch (e) {
        console.error('[Global Fetch Interceptor] Error setting org:', e);
    }
    return originalFetch.call(this, resource, init);
};

// Auto logout saat 401 (kecuali di halaman publik seperti pengajuan budget & portal)
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const currentPath = window.location.pathname || '';
            const isPublicPage = currentPath.startsWith('/pengajuan-budget') || 
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

// ─── Global window.fetch Patch ────────────────────────────────────────────────
// Axios interceptor TIDAK berlaku untuk fetch() API.
// Patch ini memastikan SEMUA fetch() di seluruh app juga kirim X-Organization.
const _originalFetch = window.fetch.bind(window);
window.fetch = function(url, options = {}) {
    options.headers = {
        'X-Organization': getOrganization(),
        ...options.headers,
    };
    return _originalFetch(url, options);
};
// ─────────────────────────────────────────────────────────────────────────────

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <UserProvider>
      <CartProvider>
        <App />
      </CartProvider>
    </UserProvider>
  </StrictMode>,
)

console.log('Force cache bust 1');
