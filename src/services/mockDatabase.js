// Simulate a database using localStorage to demonstrate integration

const DB_KEY = 'ict_app_db_v1';

const INITIAL_DATA = {
    assets: [
        { id: 26, code: 'TCF2-ICT-PC-00024', brand: 'PC RAKITAN', user: 'Admin', type: 'Computer', lastMaintenance: '2025-06-15' },
        { id: 27, code: 'TCF2-ICT-PC-00025', brand: 'PC RAKITAN', user: 'PUTRI Nur Syifa', type: 'Computer', lastMaintenance: '2025-02-10' },
        { id: 28, code: 'TCF2-ICT-PC-00026', brand: 'PC RAKITAN', user: 'MAIKEL HARYOSENO', type: 'Computer', lastMaintenance: '2025-09-01' },
        { id: 101, code: 'TCF2-ICT-PRT-001', brand: 'EPSON LX-310', user: 'GUDANG', type: 'Printer', lastMaintenance: '2025-01-20' },
    ],
    schedules: [], // Generated based on assets
    checksheets: []
};

// Helper to init schedules if empty
const initSchedules = (data) => {
    if (data.schedules.length === 0) {
        data.schedules = data.assets.map(asset => {
            // Logic to create a schedule entry
            return {
                assetId: asset.id,
                plannedDate: asset.lastMaintenance, // Simplification: assume last maintenance was the plan base
                // Logic would typically project future dates. 
                // For the matrix view, we need month flags.
                jan: false, feb: false, mar: false, apr: false, may: false, jun: false,
                jul: false, aug: false, sep: false, oct: false, nov: false, dec: false,
                status: 'Pending', // Pending, Done, Overdue
                actualDate: null
            };
        });
    }
    return data;
};

export const db = {
    load: () => {
        const stored = localStorage.getItem(DB_KEY);
        let data = stored ? JSON.parse(stored) : INITIAL_DATA;
        data = initSchedules(data);
        return data;
    },

    save: (data) => {
        localStorage.setItem(DB_KEY, JSON.stringify(data));
    },

    getAsset: (id) => {
        const data = db.load();
        return data.assets.find(a => a.id == id);
    },

    addChecksheet: (checksheet) => {
        const data = db.load();
        checksheet.id = Date.now();
        checksheet.timestamp = new Date().toISOString();
        checksheet.status = 'Pending Approval'; // Integration Point: Approval Workflow
        data.checksheets.push(checksheet);

        // Integration Point: Update Schedule
        const scheduleIdx = data.schedules.findIndex(s => s.assetId == checksheet.assetId);
        if (scheduleIdx >= 0) {
            data.schedules[scheduleIdx].actualDate = checksheet.timestamp;
            data.schedules[scheduleIdx].status = 'Waiting Approval';
        }

        db.save(data);
        return checksheet;
    },

    getSchedules: () => {
        const data = db.load();
        // Join with asset info for display
        return data.schedules.map(sch => {
            const asset = data.assets.find(a => a.id === sch.assetId);
            return { ...sch, ...asset }; // Merge to get code, brand, user
        });
    }
};
