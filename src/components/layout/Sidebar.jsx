import { LayoutDashboard, CheckSquare, Calendar, FolderSearch, BarChart2, Settings as SettingsIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Sidebar() {
    return (
        <aside className="w-64 bg-slate-900 text-white hidden md:block transition-all duration-300">
            <div className="p-4 border-b border-slate-800">
                <h2 className="text-xl font-bold tracking-tight text-blue-400 uppercase">INFRAFORCE</h2>
            </div>
            <nav className="mt-6 flex flex-col gap-1 px-3">
                <Link to="/maintenance" className="flex items-center px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
                    <LayoutDashboard className="w-5 h-5 mr-3" />
                    Dashboard
                </Link>
                <Link to="/maintenance/checksheets" className="flex items-center px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
                    <CheckSquare className="w-5 h-5 mr-3" />
                    Checksheets
                </Link>
                <Link to="/maintenance/assets" className="flex items-center px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
                    <FolderSearch className="w-5 h-5 mr-3" />
                    Assets
                </Link>
                <Link to="/maintenance/schedule" className="flex items-center px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
                    <Calendar className="w-5 h-5 mr-3" />
                    Schedule
                </Link>
                <Link to="/maintenance/reports" className="flex items-center px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
                    <BarChart2 className="w-5 h-5 mr-3" />
                    Reports
                </Link>
                <Link to="/maintenance/settings" className="flex items-center px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
                    <SettingsIcon className="w-5 h-5 mr-3" />
                    Settings
                </Link>
            </nav>
            <div className="absolute bottom-4 left-0 right-0 px-3">
                <div className="flex items-center gap-3 px-4 py-3 text-slate-400 text-sm">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                        AU
                    </div>
                    <div>
                        <p className="text-white font-medium">Admin User</p>
                        <p className="text-xs">ICT Dept</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
