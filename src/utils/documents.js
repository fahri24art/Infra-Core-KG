export const getDocId = async (key, defaultId) => {
    const org = sessionStorage.getItem('organization') || 'TCF-SG';
    const isKG = org.toUpperCase().includes('KG');
    let effectiveDefault = defaultId;
    if (isKG && typeof effectiveDefault === 'string') {
        effectiveDefault = effectiveDefault.replace(/TCFSG/g, 'TCFKG');
    }

    try {
        const res = await fetch(`/api/network/settings?organization=${org}`, {
            headers: { 'X-Organization': org }
        });
        if (res.ok) {
            const data = await res.json();
            if (data.documents && data.documents[key]) {
                const docId = data.documents[key];
                return isKG && typeof docId === 'string' ? docId.replace(/TCFSG/g, 'TCFKG') : docId;
            }
        }
    } catch (e) {
        console.error("Failed to fetch doc settings", e);
    }
    return effectiveDefault;
};
