import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader, FolderSearch } from 'lucide-react';
import { glpiService } from '../services/glpiService';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export default function AssetLookup() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searched, setSearched] = useState(false);

    const navigate = useNavigate();

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setError(null);
        setSearched(true);

        try {
            // In a real scenario, we would filter via API parameters
            // For now, we fetch mock or real data and filter client-side if needed, 
            // or rely on the service to return what it can.
            // Since we don't have a real backend connected securely yet without creds,
            // we'll simulate a successful fetch if the service fails auth, for demo purposes.

            let assets = [];
            try {
                // Try fetching from real GLPI first
                const glpiData = await glpiService.getAssets();
                // GLPI returns an array or an object keyed by ID depending on endpoint
                // Adjust based on actual response structure. assuming array for now or converting values
                assets = Array.isArray(glpiData) ? glpiData : Object.values(glpiData);

                // Map GLPI fields to our app's expected format if needed
                assets = assets.map(a => ({
                    id: a.id,
                    name: a.name,
                    serial: a.serial || a.serial_number || 'N/A',
                    type: 'Computer', // dynamic if possible
                    location: a.locations_id || 'Unknown'
                }));

            } catch (err) {
                console.warn("GLPI Connection failed:", err);

                // Fallback to local mock data (JSON File)
                try {
                    const mockRes = await fetch('/mock_assets.json');
                    if (mockRes.ok) {
                        assets = await mockRes.json();
                        setError(`Using Local Mock Data (${assets.length} items). Connection to GLPI failed.`);
                    } else {
                        throw new Error("Mock file not found");
                    }
                } catch (mockErr) {
                    setError('Failed to load both Real and Mock data. Showing minimal fallback.');
                    assets = [
                        { id: 1, name: 'PC-MOCK-FALLBACK', serial: '00000', type: 'Computer', location: 'Unknown' }
                    ];
                }
            }

            // Simple client-side fuzzy search
            const filtered = assets.filter(a =>
                a.name?.toLowerCase().includes(query.toLowerCase()) ||
                a.serial?.toLowerCase().includes(query.toLowerCase())
            );
            setResults(filtered);
        } catch (err) {
            setError('An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    const handleStartCheck = (asset) => {
        if (asset.type === 'Computer') {
            navigate(`/checksheets/pc/${asset.id}`);
        } else if (asset.type === 'Printer') {
            navigate(`/checksheets/printer/${asset.id}`);
        } else {
            navigate(`/checksheets/new/${asset.id}`);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-3">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                    <FolderSearch className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Asset Lookup</h1>
                    <p className="text-gray-500">Search for assets to perform checksheets</p>
                </div>
            </div>

            <Card className="p-4">
                <form onSubmit={handleSearch} className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Asset Tag or Serial Number</label>
                        <Input
                            placeholder="e.g. SN123456"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <Button type="submit" disabled={loading} className="mb-[1px]">
                        {loading ? <Loader className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                        {loading ? 'Searching...' : 'Search'}
                    </Button>
                </form>
            </Card>

            {error && <div className="text-red-500 bg-red-50 p-4 rounded-lg text-sm">{error}</div>}

            <div className="space-y-3">
                {results.map(asset => (
                    <Card key={asset.id} onClick={() => handleStartCheck(asset)} className="p-4 flex items-center justify-between hover:border-blue-400 cursor-pointer transition-all hover:shadow-md group">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 font-bold text-xs uppercase">
                                {asset.type?.substring(0, 2) || 'AS'}
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-gray-800 group-hover:text-blue-600 transition-colors">{asset.name}</h3>
                                <div className="flex items-center gap-3 text-sm text-gray-500">
                                    <span>SN: {asset.serial}</span>
                                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                    <span>{asset.location || 'Unknown Location'}</span>
                                </div>
                            </div>
                        </div>
                        <Button size="s" variant="secondary" className="group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-200">
                            Start Check
                        </Button>
                    </Card>
                ))}
                {results.length === 0 && searched && !loading && !error && (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                        <p className="text-gray-500">No assets found matching "{query}"</p>
                    </div>
                )}
                {!searched && (
                    <div className="text-center py-12">
                        <p className="text-gray-400">Enter a serial number to get started</p>
                    </div>
                )}
            </div>
        </div>
    );
}
