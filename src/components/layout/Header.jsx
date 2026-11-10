import { Menu, Search, Bell } from 'lucide-react';

export default function Header() {
    return (
        <header className="bg-white shadow-sm z-10 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center">
                <button className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg mr-2">
                    <Menu className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-semibold text-gray-800 hidden md:block">Overview</h1>
            </div>

            <div className="flex items-center gap-4">
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors relative">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                </button>
                <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-gray-700">Admin User</p>
                        <p className="text-xs text-gray-500">ICT Dept</p>
                    </div>
                    <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm border-2 border-white shadow-sm">
                        AU
                    </div>
                </div>
            </div>
        </header>
    );
}
