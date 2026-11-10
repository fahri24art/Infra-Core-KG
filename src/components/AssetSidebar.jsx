import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Monitor,
    Laptop,
    Smartphone,
    Printer,
    Network,
    HardDrive,
    Settings,
    Wrench,
    Activity,
    Cable,
    LifeBuoy,
    Database
} from 'lucide-react';

const AssetSidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    const isAdmin = user.role === 'admin';

    const menuItems = [
        { icon: <LayoutDashboard size={18} />, label: 'Dashboard', path: '/dashboard', category: null, adminOnly: true },
        { icon: <Activity size={18} />, label: 'Network Status', path: '/network', category: null, adminOnly: true },
        { icon: <Database size={18} />, label: 'Data Center', path: '/datacenter', category: null, adminOnly: true },
        { icon: <Cable size={18} />, label: 'Service Bridges', path: '/bridges', category: null, adminOnly: true },
        { icon: <Wrench size={18} />, label: 'Maintenance', path: '/maintenance', category: null, adminOnly: true },
        { type: 'divider', label: 'ASSETS', adminOnly: true },
        { icon: <Monitor size={18} />, label: 'Desktops', category: 'Desktop', adminOnly: true },
        { icon: <Laptop size={18} />, label: 'Notebooks', category: 'Notebook', adminOnly: true },
        { icon: <Smartphone size={18} />, label: 'Phones', category: 'Phone', adminOnly: true },
        { icon: <Printer size={18} />, label: 'Printers', category: 'Printer', adminOnly: true },
        { icon: <Network size={18} />, label: 'Network', category: 'Network', adminOnly: true },
        { icon: <HardDrive size={18} />, label: 'Unassigned', category: 'Unassigned', adminOnly: true },
        { type: 'divider', label: 'SYSTEM', adminOnly: true },
        { icon: <Settings size={18} />, label: 'Settings', path: '/admin/settings?tab=assets', category: null, adminOnly: true },
        { icon: <LifeBuoy size={18} />, label: 'Support Center', path: '/support', category: null, adminOnly: false },
    ];

    const handleNavigation = (item) => {
        if (item.path) {
            navigate(item.path);
        } else if (item.category) {
            navigate(`/assets?category=${item.category}`);
        }
    };

    return (
        <div className="w-64 bg-white/5 backdrop-blur-3xl h-full text-slate-300 flex flex-col border-r border-white/5">
            <div className="p-4 border-b border-white/5">
                <div className="flex items-center space-x-3">
                    <div className="bg-blue-600 p-2 rounded-lg">
                        <Monitor className="text-white" size={20} />
                    </div>
                    <div>
                        <h2 className="text-white font-bold tracking-tight">INFRACORE</h2>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{isAdmin ? 'Enterprise v1.0' : 'User Portal'}</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
                {menuItems.filter(item => isAdmin || !item.adminOnly).map((item, index) => {
                    if (item.type === 'divider') {
                        return (
                            <div key={index} className="pt-4 pb-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                {item.label}
                            </div>
                        );
                    }

                    const isActive = location.pathname === item.path || (item.category && location.search.includes(`category=${item.category}`));

                    return (
                        <button
                            key={index}
                            onClick={() => handleNavigation(item)}
                            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 group ${isActive
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                                : 'hover:bg-slate-800 hover:text-white'
                                }`}
                        >
                            <span className={`${isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}`}>
                                {item.icon}
                            </span>
                            <span className="text-sm font-medium">{item.label}</span>
                            {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]"></div>}
                        </button>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-white/5 bg-transparent">
                <div className="bg-slate-800/50 rounded-xl p-3 flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-inner ${isAdmin ? 'bg-blue-500' : 'bg-emerald-500'}`}>
                        {user.name ? user.name.charAt(0) : 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{user.name || 'Guest'}</p>
                        <p className="text-[10px] text-slate-500 truncate">{isAdmin ? 'System Administrator' : 'Standard User'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssetSidebar;
