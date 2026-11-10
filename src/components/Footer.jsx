import React from 'react';

export default function Footer() {
    return (
        <footer className="bg-slate-900 text-slate-400 py-6 mt-auto border-t border-slate-800">
            <div className="container mx-auto px-4 text-center text-xs">
                <p className="mb-2">
                    <span className="font-semibold text-slate-300">Version 3.1 (Port 80)</span>
                </p>
                <p>
                    Copyright &copy; 2026 <span className="text-white font-medium">PT. Tri Centrum Fortuna</span>. All Rights Reserved.
                </p>
                <p className="mt-1 text-slate-500">
                    Created: 2026
                </p>
            </div>
        </footer>
    );
}
