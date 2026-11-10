import { glpiService } from '../services/glpiService';

/**
 * Generates the next IATF Ticket Number.
 * Format: Ticket #TCFSG/FM/ICT/03/{SEQUENCE}
 * Example: Ticket #TCFSG/FM/ICT/03/001
 */
export async function generateIATFNumber() {
    const org = (typeof window !== 'undefined' && sessionStorage.getItem('organization')) || 'TCF-SG';
    const isKG = org.toUpperCase().includes('KG');
    const plantCode = isKG ? 'TCFKG' : 'TCFSG';
    const prefix = `Ticket #${plantCode}/FM/ICT/03/`;

    try {
        // Query GLPI for tickets (we'll need to implement searchTickets in glpiService)
        // We search for tickets that likely match this pattern.
        // Since API search might be limited, we might fetch recent tickets or use a specific search criteria if possible.
        // For now, let's assume we can get a list of recent tickets or filter them.

        // LIMITATION: Standard GLPI API uses criteria. 
        // We will try to search for tickets where name (title) contains the prefix.
        // Criteria 1 = 'contains', Field 1 = 'name' (Title)

        const tickets = await glpiService.searchTickets({
            criteria: [
                {
                    field: 1, // Title
                    searchtype: 'contains',
                    value: prefix
                }
            ],
            range: '0-50', // Check last 50 matches
            sort: 2, // Sort by ID
            order: 'DESC' // Newest first
        });

        let maxSequence = 0;

        if (tickets && tickets.length > 0) {
            for (const ticket of tickets) {
                // ticket['1'] is usually the Title in basic search response, 
                // but checking full response structure is safer. 
                // However, searchTickets response is usually a list of items where key is ID.
                // Let's assume standard item structure or standardized by service.
                const title = ticket.name || ticket[1]; // Adjust based on actual API response

                if (title && title.startsWith(prefix)) {
                    const parts = title.split('/');
                    const seqStr = parts[parts.length - 1]; // "001" or "001 (some text)"
                    // Extract just the number
                    const numberMatch = seqStr.match(/^(\d+)/);
                    if (numberMatch) {
                        const seq = parseInt(numberMatch[1], 10);
                        if (seq > maxSequence) {
                            maxSequence = seq;
                        }
                    }
                }
            }
        }

        const nextSequence = maxSequence + 1;
        const paddedSequence = String(nextSequence).padStart(3, '0');

        return `${prefix}${paddedSequence}`;

    } catch (error) {
        console.error("Error creating IATF number:", error);
        // Fallback if search fails? Or throw?
        // Let's fallback to timestamp to avoid blocking, or 001 if mostly offline dev
        return `${prefix}ERR-${Date.now().toString().slice(-4)}`;
    }
}
