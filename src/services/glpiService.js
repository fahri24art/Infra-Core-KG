import api from './api';

let sessionToken = null;

export const glpiService = {
    apiPath: '/glpi/apirest.php',

    async initSession(userToken) {
        try {
            const response = await api.get(`${this.apiPath}/initSession`, {
                headers: {
                    'Authorization': 'Basic ' + btoa('mulyana:nevergiveup')
                    // 'App-Token': ... // Omitted: User did not provide App-Token. 
                    // If GLPI requires it, connection will fail (401/400). 
                    // Often internal GLPI allows Basic Auth without App-Token if configured.
                }
            });
            console.log("GLPI Session Init Success:", response.data);
            sessionToken = response.data.session_token;
            return sessionToken;
        } catch (error) {
            console.error('Failed to init GLPI session', error.response?.data || error.message);
            throw error;
        }
    },

    async getAssets(itemType = 'Computer') {

        if (!sessionToken) {
            // Always try to init session if we have hardcoded creds or logic to get them
            try {
                await this.initSession();
            } catch (e) {
                console.error("Auto-init failed:", e);
                throw new Error("Session initialization failed: " + e.message);
            }
        }
        const response = await api.get(`${this.apiPath}/${itemType}`, {
            headers: {
                'Session-Token': sessionToken
            }
        });
        return response.data;
    },

    /**
     * Search for tickets based on criteria.
     * @param {Object} queryParams - The search parameters (criteria, range, sort, order).
     * @returns {Promise<Array>} List of found tickets.
     */
    async searchTickets(queryParams = {}) {
        if (!sessionToken) {
            if (import.meta.env.VITE_GLPI_USER_TOKEN) {
                await this.initSession();
            } else {
                return []; // Fail gracefully for numbering if no session
            }
        }

        try {
            // Construct query string or body. search/Ticket usually takes query params.
            // Example: /search/Ticket?criteria[0][field]=1&criteria[0][searchtype]=contains&criteria[0][value]=Title

            const config = {
                headers: { 'Session-Token': sessionToken },
                params: queryParams
            };

            // Note: Complex nested criteria often need qs.stringify or specific formatting. 
            // For this simple implementation, we assume queryParams object structure matches axios params handling 
            // OR the caller passes a pre-formatted structure. 
            // GLPI API is picky. Let's assume the caller uses the standard GLPI API format.

            const response = await api.get(`${this.apiPath}/search/Ticket`, config);

            // GLPI Search response: { totalcount: X, count: Y, data: [...] }
            return response.data.data || [];
        } catch (error) {
            console.error("GLPI Search Error:", error);
            throw error;
        }
    },

    async createTicket(title, content, requesterId = null) {
        if (!sessionToken) await this.initSession();

        const payload = {
            input: {
                name: title,
                content: content,
                // status: 2 (Processing/Assigned) or 1 (New). Default 1.
                // type: 2 (Request) or 1 (Incident). Maybe 2 for Maintenance?
            }
        };

        if (requesterId) {
            // If we need to set specific requester. 
            // Usually simpler to just let the API Auth user be the requester.
            // payload.input._users_id_requester = requesterId;
        }

        const response = await api.post(`${this.apiPath}/Ticket`, payload, {
            headers: { 'Session-Token': sessionToken }
        });

        return response.data;
    },

    // Mock for Shopee-like Warehouse items (Inventory Model)
    async getConsumables() {
        return [
            { id: 101, name: 'Logitech B100 Optical Mouse USB', stock: 45, consumed: 154, image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&q=80', isHot: true },
            { id: 102, name: 'Kertas HVS A4 70gsm (1 Rim)', stock: 200, consumed: 1200, image: 'https://images.unsplash.com/photo-1586075010923-2dd45eeed858?w=400&q=80' },
            { id: 103, name: 'Tinta Epson 664 Black Original', stock: 12, consumed: 89, image: 'https://images.unsplash.com/photo-1563264627-89fb73d5260e?w=400&q=80', isLowStock: true },
            { id: 104, name: 'Kabel LAN UTP Cat6 (5 Meter)', stock: 50, consumed: 34, image: 'https://images.unsplash.com/photo-1544197150-b99a580bbcbf?w=400&q=80' },
            { id: 105, name: 'Baterai Alkaline AA (Pack isi 4)', stock: 100, consumed: 56, image: 'https://images.unsplash.com/photo-1620351237305-18155986927d?w=400&q=80' },
            { id: 106, name: 'Lakban Bening 2 Inch', stock: 30, consumed: 121, image: 'https://images.unsplash.com/photo-1616406432452-9226f71e2c89?w=400&q=80' },
            { id: 107, name: 'Amplop Coklat Tali Folio (Pack 10)', stock: 0, consumed: 400, image: 'https://images.unsplash.com/photo-1586075010923-2dd45eeed858?w=400&q=80' },
            { id: 108, name: 'Flashdisk Sandisk 32GB', stock: 15, consumed: 45, image: 'https://images.unsplash.com/photo-1623949556303-b0d17d198863?w=400&q=80', isHot: true },
        ];
    }
};
