import React from 'react';
import { Outlet } from 'react-router-dom';
import ShopeeHeader from '../components/warehouse/ShopeeHeader';

const WarehouseLayout = () => {
    return (
        <div className="min-h-screen bg-gray-100 font-sans text-gray-800 pb-20 sm:pb-0">
            <ShopeeHeader />
            <div className="max-w-7xl mx-auto px-0 sm:px-4 py-4">
                <Outlet />
            </div>

            {/* Mobile Bottom Nav Spacer or Actual Component could go here */}
            {/* <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-2 flex justify-around">
                Mobile Nav
            </div> */}
        </div>
    );
};

export default WarehouseLayout;
