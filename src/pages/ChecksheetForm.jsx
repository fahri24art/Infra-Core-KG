import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Save, CheckCircle } from 'lucide-react';

export default function ChecksheetForm() {
    const { assetId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        physicalCondition: 'good',
        softwareUpdated: false,
        antivirusActive: false,
        networkConnectivity: 'ok',
        notes: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        // Simulate submission
        setTimeout(() => {
            setLoading(false);
            alert('Checksheet submitted!');
            navigate('/ict/assets');
        }, 1000);
    };

    return (
        <div className="max-w-3xl mx-auto space-y-3">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">New Checksheet</h1>
                <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                    Asset ID: {assetId}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
                <Card className="p-4 space-y-3">
                    <h3 className="font-semibold text-lg border-b pb-2">Physical Inspection</h3>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Physical Condition</label>
                        <select
                            className="w-full rounded-lg border border-gray-300 px-3 py-2"
                            value={formData.physicalCondition}
                            onChange={e => setFormData({ ...formData, physicalCondition: e.target.value })}
                        >
                            <option value="good">Good</option>
                            <option value="scratched">Minor Scratches</option>
                            <option value="damaged">Damaged</option>
                        </select>
                    </div>

                    <div className="flex items-center space-x-3">
                        <input
                            type="checkbox"
                            id="clean"
                            className="w-4 h-4 text-blue-600 rounded"
                        />
                        <label htmlFor="clean">Device is clean and dust-free</label>
                    </div>
                </Card>

                <Card className="p-4 space-y-3">
                    <h3 className="font-semibold text-lg border-b pb-2">Software & Security</h3>

                    <div className="flex items-center space-x-3">
                        <input
                            type="checkbox"
                            id="sw-updated"
                            checked={formData.softwareUpdated}
                            onChange={e => setFormData({ ...formData, softwareUpdated: e.target.checked })}
                            className="w-4 h-4 text-blue-600 rounded"
                        />
                        <label htmlFor="sw-updated">OS Patches Updated</label>
                    </div>

                    <div className="flex items-center space-x-3">
                        <input
                            type="checkbox"
                            id="av-active"
                            checked={formData.antivirusActive}
                            onChange={e => setFormData({ ...formData, antivirusActive: e.target.checked })}
                            className="w-4 h-4 text-blue-600 rounded"
                        />
                        <label htmlFor="av-active">Antivirus Definitions Up-to-date</label>
                    </div>
                </Card>

                <Card className="p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tech Notes</label>
                    <textarea
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 min-h-[100px]"
                        placeholder="Any observations..."
                        value={formData.notes}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    ></textarea>
                </Card>

                <div className="flex justify-end gap-3">
                    <Button type="button" variant="secondary" onClick={() => navigate('/ict/assets')}>Cancel</Button>
                    <Button type="submit" disabled={loading}>
                        <Save className="w-4 h-4 mr-2" />
                        Submit Checksheet
                    </Button>
                </div>
            </form>
        </div>
    );
}
