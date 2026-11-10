require('dotenv').config();
const db = require('./db');

const rawData = `
00001	DESIGN01-ENG	7539
00002	DESKTOP-02VP769	8253
00003	DESKTOP-16HR1SQ	3541
00004	DESKTOP-1KJG1SJ	1506
00005	DESKTOP-1QKU0J8	4809
00006	Irfan Maulana	2023
00007	DESKTOP-2TPI34I	9217
00008	Colour	7787
00011	DESKTOP-3L56DM4	4321
00012	DESKTOP-4FG9IQ2	3715
00014	DESKTOP-4O314L4	7745
00015	DESKTOP-5A8MPEH	6568
00016	DESKTOP-5CD6G75	6256
00017	DESKTOP-5Q24QFF	9714
00018	DESKTOP-80JIP2H	7045
00019	DESKTOP-9FKU9F7	6789
00022	DESKTOP-B22II3H	5803
00023	DESKTOP-B69UE2B	9914
00024	DESKTOP-BNG5FFU	2285
00025	DESKTOP-CI60NCO	6040
00026	DESKTOP-D8168QD	9392
00027	DESKTOP-E7412UC	9695
00028	DESKTOP-FGLTFUL	6416
00029	DESKTOP-FPIE5DC	7112
00030	DESKTOP-FULC7KQ	8884
00031	DESKTOP-GCVS4VB	1696
00032	DESKTOP-GSASLJS	9895
00033	DESKTOP-HFO5QOR	2189
00034	DESKTOP-HFQQ866	4391
00035	DESKTOP-HOO7D4C	2259
00036	DESKTOP-IJP9COJ	7882
00037	DESKTOP-IMMDGJC	4522
00038	DESKTOP-JFETSLP	7122
00039	DESKTOP-JOKP7GI	5145
00040	DESKTOP-K5ESK70	8284
00041	DESKTOP-LSBN2N5	2766
00042	DESKTOP-MCT5DCT	6742
00043	DESKTOP-O00VMAS	5432
00046	DESKTOP-OUI70FQ	9667
00047	DESKTOP-PEPH035	4807
00048	DESKTOP-QDNDH56	9133
00049	DESKTOP-S6GLP64	1828
00050	DESKTOP-SIVS2H3	8885
00051	DESKTOP-TFKJ7BI	4380
00052	DESKTOP-TGN84MA	2740
00053	DESKTOP-TJ3DQN4	3295
00054	DESKTOP-TLV30SA	2663
00055	DESKTOP-TQ8I4R5	7529
00056	DESKTOP-VC07DO0	7043
00058	DESKTOP-VN2VAL9	5536
00059	DESKTOP-VNLVKAL	5449
00060	ENG-1333	2443
00061	ENG2024	2136
00062	helpdesk	3491
00063	ICT4532	1935
00064	ICT-67543	2312
00065	ICT-9807	9349
00066	idempiere	8459
00067	IMF-ADM1	8192
00068	LAPTOP-01TSF26U	7768
00070	LAPTOP-BE8NEP5N	8199
00071	MKT-004	4027
00072	PC-01	5703
00073	PPIC-KHALDA	4906
00074	PPIC-Kori	3624
00075	PPIC-MUFLIKHA	4861
00076	PPIC-WINDI	1384
00077	Purchasing-01	8947
00078	QC7	9747
00079	QC8	5729
00080	qmr1	5272
00082	sjumdm-PF362LV2	4607
00083	System-Maintenance	9560
00084	system-tcf	7660
00085	TCF2-PROD05	2717
00087	TCF3-FA05	9373
00088	TCF-MKT07	9203
00089	TCF-PUR01	1499
00090	TCFSG-ICT2234	5881
00091	TCFSG-ICT23342	8770
00092	TCFSG-ICT54	8141
00094	ITC-0867	5672
`;

async function seed() {
    try {
        console.log("Deleting old quotas...");
        await db('ricoh_device_quotas').del();
        console.log("Wiped ricoh_device_quotas.");

        const lines = rawData.split('\n').filter(l => l.trim().length > 0);
        let inserts = [];
        
        for (const line of lines) {
            const parts = line.split('\t').map(p => p.trim()).filter(p => p.length > 0);
            if (parts.length >= 3) {
                const name = parts[1];
                const pin = parts[2];
                if (pin !== '---') {
                    inserts.push({
                        computer_name: name,
                        user_code: pin,
                        monthly_quota_bw: 1000,
                        monthly_quota_color: 500,
                        status: 'active'
                    });
                }
            }
        }
        
        console.log(`Inserting ${inserts.length} new records...`);
        if (inserts.length > 0) {
            await db('ricoh_device_quotas').insert(inserts);
            console.log("Success!");
        }
        
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

seed();
