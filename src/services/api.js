import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_GLPI_URL,
    headers: {
        'Content-Type': 'application/json',
        'App-Token': import.meta.env.VITE_GLPI_APP_TOKEN,
    },
});

export default api;
