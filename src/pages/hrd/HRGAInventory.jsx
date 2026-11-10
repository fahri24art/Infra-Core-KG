import React from 'react';
import InventoryManager from '../../components/InventoryManager';

export default function HRGAInventory() {
    return (
        <div className="max-w-7xl mx-auto p-4 md:p-5">
            <InventoryManager department="HRGA" />
        </div>
    );
}
