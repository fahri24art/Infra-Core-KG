import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
export default function InfraGuard() {
    const userStr = typeof window !== 'undefined' ? sessionStorage.getItem('user') : null;
    const user = userStr ? JSON.parse(userStr) : null;
    const isSuperAdmin = user && ['super_user', 'superuser', 'administrator', 'admin'].includes(user.role?.toLowerCase());
    const userOrg = user?.organization || 'TCF-SG';

    const [currentOrg, setCurrentOrg] = useState(() => {
        return isSuperAdmin 
            ? (sessionStorage.getItem('organization') || userOrg)
            : userOrg;
    });
    const [ssoUrl, setSsoUrl] = useState("http://192.168.1.3/login/infra");
    const location = useLocation();

    const handlePlantSwitch = (newOrg) => {
        if (!isSuperAdmin) return;
        sessionStorage.setItem('organization', newOrg);
        setCurrentOrg(newOrg);
        if (user) {
            user.organization = newOrg;
            sessionStorage.setItem('user', JSON.stringify(user));
        }
    };

    useEffect(() => {
        try {
            const userStr = sessionStorage.getItem('user');
            if (userStr) {
                // Parse and elevate role for SSO to bypass login
                const userObj = JSON.parse(userStr);
                userObj.role = 'administrator'; // Force admin to be recognized as superadmin by Infra Guard
                userObj.organization = currentOrg;
                userObj.plant = currentOrg.toUpperCase().includes('KG') ? 'KG' : 'SG';
                const elevatedUserStr = JSON.stringify(userObj);
                
                // Encode the user object to base64
                const encodedUser = btoa(unescape(encodeURIComponent(elevatedUserStr)));
                
                // Determine the internal path from the React router path
                let internalPath = location.pathname.replace('/ict/infraguard', '');
                if (!internalPath) {
                    internalPath = sessionStorage.getItem('last_infraguard_wrapper_path') || '';
                }
                
                const pathParam = internalPath ? `&path=${encodeURIComponent(internalPath)}` : '';
                const plantParam = `&org=${currentOrg}&plant=${userObj.plant}`;
                
                // Use the public domain URL if accessed externally, otherwise local IP
                const isPublicDomain = typeof window !== 'undefined' && window.location.hostname.includes('tricentrumfortuna.com');
                const baseGuardUrl = isPublicDomain ? 'https://guard.tricentrumfortuna.com' : 'http://192.168.1.3';
                const cacheBuster = `&_t=${Date.now()}`;
                setSsoUrl(`${baseGuardUrl}/login/infra?sso_token=${encodeURIComponent(encodedUser)}${pathParam}${plantParam}${cacheBuster}`);
            }
        } catch (e) {
            console.error("Failed to generate SSO token", e);
        }

        // Listen for route changes from the iframe
        const handleMessage = (event) => {
            if (event.data && event.data.type === 'INFRAGUARD_ROUTE') {
                sessionStorage.setItem('last_infraguard_wrapper_path', event.data.path);
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [location.pathname, currentOrg]);

    const isKG = currentOrg.toUpperCase().includes('KG');

    return (
        <div className="w-full h-screen -mt-4 -mx-4 md:-mx-8 w-[calc(100%+2rem)] md:w-[calc(100%+4rem)] overflow-hidden bg-slate-900 flex flex-col">
            {/* Top Plant Context Bar */}
            <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs shrink-0 z-10">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="font-bold text-white tracking-wide">
                        INFRA GUARD NATIVE • {isKG ? 'PLANT KARAWANG (KG)' : 'PLANT SADANG (SG)'}
                    </span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded ${isKG ? 'bg-amber-500 text-slate-950' : 'bg-indigo-600 text-white'}`}>
                        {currentOrg}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {isSuperAdmin ? (
                        <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-700">
                            <button
                                onClick={() => handlePlantSwitch('TCF-SG')}
                                className={`px-3 py-1 rounded-md font-bold transition-all ${!isKG ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                            >
                                Plant SG (Sadang)
                            </button>
                            <button
                                onClick={() => handlePlantSwitch('TCF-KG')}
                                className={`px-3 py-1 rounded-md font-bold transition-all ${isKG ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'}`}
                            >
                                Plant KG (Karawang)
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1 rounded-lg border border-slate-700 text-xs font-bold text-slate-300" title="Plant terkunci sesuai hak akses user">
                            <span className={`w-2 h-2 rounded-full ${isKG ? 'bg-amber-400' : 'bg-indigo-400'}`} />
                            <span>{isKG ? 'Plant KG (Karawang)' : 'Plant SG (Sadang)'}</span>
                            <span className="text-[10px] text-slate-500 font-normal ml-1">🔒 Locked</span>
                        </div>
                    )}

                    <a
                        href={ssoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-lg transition-all shadow-md shadow-blue-600/30 active:scale-95"
                        title="Buka Infra Guard di Tab Browser Baru (Layar Penuh)"
                    >
                        <ExternalLink size={12} />
                        <span>Buka Tab Baru</span>
                    </a>
                </div>
            </div>

            <iframe 
                key={currentOrg}
                src={ssoUrl}
                className="w-full flex-1 border-0 bg-transparent"
                title="Infra Guard Gateway"
            />
        </div>
    );
}
