
// This file contains the KPI structure extracted from KPI 2026 (ICT)-SG.xlsx
// It will be merged with actual system data for "Actual" rows.

export const KPI_DATA_2026 = {
    metadata: {
        department: "Information and Communication Technology",
        period: "2026",
        company: "PT. Tri Centrum Fortuna"
    },
    sections: [
        {
            id: 1,
            title: "Safety",
            metrics: [
                {
                    id: "m7",
                    name: "Accident",
                    description: "Accident",
                    measurements: "Kecelakaan yang terjadi di dalam Pabrik",
                    target2025: "0",
                    achievement2025: "0",
                    target2026: "0",
                    monthly: createEmptyPA("0", "0")
                },
                {
                    id: "m9",
                    name: "Traffic Accident",
                    description: "Traffic Accident",
                    measurements: "Kecelakaan yang tejadi di Jalan Raya",
                    target2025: "0",
                    achievement2025: "0",
                    target2026: "0",
                    monthly: createEmptyPA("0", "0")
                }
            ]
        },
        {
            id: 2,
            title: "EXIST",
            metrics: [
                {
                    id: "m11",
                    name: "EXIST",
                    description: "EXIST",
                    measurements: "Budaya EXIST untuk seluruh karyawan",
                    target2025: "Belum Ada",
                    achievement2025: "Belum Implementasi",
                    target2026: "100% Mengetahui dan Memahami Point- point Exist",
                    monthly: {
                        jan: { p: "0", a: "0" },
                        feb: { p: "0", a: "0" },
                        mar: { p: "0.30", a: "0" },
                        apr: { p: "0", a: "0" },
                        may: { p: "0", a: "0" },
                        jun: { p: "0.60", a: "0" },
                        jul: { p: "0", a: "0" },
                        aug: { p: "0", a: "0" },
                        sep: { p: "0.90", a: "0" },
                        oct: { p: "0", a: "0" },
                        nov: { p: "0", a: "0" },
                        dec: { p: "1", a: "0" }
                    }
                }
            ]
        },
        {
            id: 3,
            title: "5S",
            metrics: [
                {
                    id: "m14",
                    name: "Genba Weekly",
                    description: "Genba Weekly",
                    measurements: "Melakukan 5S di seluruh area kerja",
                    target2025: "Point : 16",
                    achievement2025: "Point : 16,9",
                    target2026: "Point : 20",
                    monthly: createEmptyPA("20", "0")
                }
            ]
        },
        {
            id: 4,
            title: "Cost Competitiveness",
            metrics: [
                {
                    id: "m17",
                    name: "Cost Reduction",
                    description: "Cost Reduction",
                    measurements: "Aktual Cost - Standard Cost",
                    target2025: "Belum Ada",
                    achievement2025: "25650000",
                    target2026: "46877623",
                    monthly: createEmptyPA("3,906,468", "0")
                }
            ]
        },
        {
            id: 5,
            title: "Process Administration",
            metrics: [
                {
                    id: "m20",
                    name: "Program Digitaliztion",
                    description: "Program Digitaliztion",
                    measurements: "-",
                    target2025: "100% Implementasi",
                    achievement2025: "100% Implementasi",
                    target2026: "100% Implementasi",
                    monthly: {
                        jan: { p: "0.10", a: "10%" },
                        feb: { p: "0.20", a: "20%" },
                        mar: { p: "0.30", a: "0" },
                        apr: { p: "0.40", a: "0" },
                        may: { p: "0.50", a: "0" },
                        jun: { p: "0.60", a: "0" },
                        jul: { p: "0.70", a: "0" },
                        aug: { p: "0.80", a: "0" },
                        sep: { p: "0.90", a: "0" },
                        oct: { p: "1", a: "0" },
                        nov: { p: "0", a: "0" },
                        dec: { p: "0", a: "0" }
                    }
                },
                {
                    id: "m23",
                    name: "Review IK",
                    description: "Review IK",
                    measurements: "Review seluruh IK yang terdaftar",
                    target2025: "Belum Ada",
                    achievement2025: "Belum Teridentifikasi",
                    target2026: "Min 4x/bulan",
                    monthly: createEmptyPA("4", "0")
                },
                {
                    id: "p5", // Linked to Server Uptime
                    name: "Uptime Server / ERP",
                    description: "Uptime hasil pencatatan System Idempiere Log dan juga System Log Server",
                    measurements: "Percentage",
                    target2025: "90%",
                    achievement2025: "95%",
                    target2026: "100% Implementasi",
                    monthly: createEmptyPA("100%", "99%")
                },
                {
                    id: "p9", // Linked to Network
                    name: "Uptime Jaringan Internet",
                    description: "Uptime hasil pencatatan System Downtime Jaringan Internet Berdasarkan Log Microtik",
                    measurements: "Percentage",
                    target2025: "98%",
                    achievement2025: "98.5%",
                    target2026: "100% Implementasi",
                    monthly: createEmptyPA("100%", "99.5%")
                },
                {
                    id: "p13", // Linked to Maintenance
                    name: "Preventive Perangkat (Hardware & Software)",
                    description: "Jumlah perangkat yang diakukan pemeliharaan / Seluruh jumlah perangkat",
                    measurements: "Percentage",
                    target2025: "Follow by schedule",
                    achievement2025: "100%",
                    target2026: "100% Implementasi",
                    monthly: createEmptyPA("100%", "0%")
                }
            ]
        },
        {
            id: 6,
            title: "People",
            metrics: [
                {
                    id: "m44",
                    name: "Menyelesaikan IT Helpdesk Ticket",
                    description: "Total Helpdesk Ticket yang selesai / Total keseluruhan Helpdesk Ticket",
                    measurements: "Percentage",
                    target2025: "90%",
                    achievement2025: "92%",
                    target2026: "100% Implementasi",
                    monthly: createEmptyPA("100%", "95%")
                },
                {
                    id: "m47",
                    name: "QCC",
                    description: "1 Group/Tahun",
                    measurements: "QCC",
                    target2025: "Belum Ada",
                    achievement2025: "0",
                    target2026: "1 Group/Tahun",
                    monthly: createEmptyPA("1", "0")
                },
                {
                    id: "m50",
                    name: "SS",
                    description: "SS yang dibuat oleh setiap man power",
                    measurements: "SS",
                    target2025: "Belum Ada",
                    achievement2025: "0",
                    target2026: "4 SS/MP (year)",
                    monthly: createEmptyPA("4", "0")
                }
            ]
        }
    ]
};

function createEmptyPA(defaultP = "0", defaultA = "0") {
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const data = {};
    months.forEach(m => {
        data[m] = { p: defaultP, a: defaultA };
    });
    return data;
}
