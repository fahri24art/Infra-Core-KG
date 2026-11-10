import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Save, Bell, Mail, MessageCircle } from 'lucide-react';

export default function Settings() {
    const [emailConfig, setEmailConfig] = useState({
        enabled: false,
        smtpServer: 'smtp.gmail.com',
        port: '587',
        senderEmail: 'ict.notify@company.com',
        password: '' // Security note: In real app, don't store plain text
    });

    const [waConfig, setWaConfig] = useState({
        enabled: false,
        provider: 'Wablas', // or Fonnte, Twilio etc
        apiKey: '',
        senderNumber: ''
    });

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Load settings from localStorage if available
        const savedOps = localStorage.getItem('ict_notification_settings');
        if (savedOps) {
            const parsed = JSON.parse(savedOps);
            if (parsed.email) setEmailConfig(parsed.email);
            if (parsed.wa) setWaConfig(parsed.wa);
        }
    }, []);

    const handleSave = (e) => {
        e.preventDefault();
        setLoading(true);

        const settings = {
            email: emailConfig,
            wa: waConfig
        };

        localStorage.setItem('ict_notification_settings', JSON.stringify(settings));

        setTimeout(() => {
            setLoading(false);
            alert('Notification Settings Saved Successfully!');
        }, 800);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-3">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gray-100 text-gray-600 rounded-lg">
                    <Bell className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Notification Settings</h1>
                    <p className="text-gray-500">Configure Email and WhatsApp alerts for Checksheet Approvals</p>
                </div>
            </div>

            <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-blue-900">GLPI Connection Status</h3>
                        <p className="text-sm text-blue-700">Server: http://192.168.1.66 (via /glpi proxy)</p>
                    </div>
                    <Button type="button" onClick={async () => {
                        const { glpiService } = await import('../services/glpiService');
                        try {
                            setLoading(true);
                            await glpiService.initSession();
                            alert("✅ Connected to GLPI successfully!");
                        } catch (err) {
                            alert("❌ Connection Failed: " + err.message);
                        } finally {
                            setLoading(false);
                        }
                    }} disabled={loading} variant="outline" className="bg-white hover:bg-blue-100 text-blue-700 border-blue-300">
                        Test Connection
                    </Button>
                </div>
            </Card>

            <form onSubmit={handleSave}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Email Configuration */}
                    <Card className="p-4 space-y-3">
                        <div className="flex items-center justify-between border-b pb-4">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Mail className="w-5 h-5 text-blue-500" />
                                Email Notification
                            </h3>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={emailConfig.enabled}
                                    onChange={e => setEmailConfig({ ...emailConfig, enabled: e.target.checked })}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        <div className={`space-y-3 transition-opacity ${emailConfig.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Server</label>
                                <Input
                                    value={emailConfig.smtpServer}
                                    onChange={e => setEmailConfig({ ...emailConfig, smtpServer: e.target.value })}
                                    placeholder="smtp.example.com"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                                    <Input
                                        value={emailConfig.port}
                                        onChange={e => setEmailConfig({ ...emailConfig, port: e.target.value })}
                                        placeholder="587"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Sender Email</label>
                                    <Input
                                        value={emailConfig.senderEmail}
                                        onChange={e => setEmailConfig({ ...emailConfig, senderEmail: e.target.value })}
                                        placeholder="notify@example.com"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password / App Key</label>
                                <Input
                                    type="password"
                                    value={emailConfig.password}
                                    onChange={e => setEmailConfig({ ...emailConfig, password: e.target.value })}
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                    </Card>

                    {/* WhatsApp Configuration */}
                    <Card className="p-4 space-y-3">
                        <div className="flex items-center justify-between border-b pb-4">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <MessageCircle className="w-5 h-5 text-green-500" />
                                WhatsApp Notification
                            </h3>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={waConfig.enabled}
                                    onChange={e => setWaConfig({ ...waConfig, enabled: e.target.checked })}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                            </label>
                        </div>

                        <div className={`space-y-3 transition-opacity ${waConfig.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Provider API</label>
                                <select
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                    value={waConfig.provider}
                                    onChange={e => setWaConfig({ ...waConfig, provider: e.target.value })}
                                >
                                    <option value="Wablas">Wablas</option>
                                    <option value="Fonnte">Fonnte</option>
                                    <option value="Twilio">Twilio</option>
                                    <option value="Custom">Custom HTTP Request</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">API Token / Key</label>
                                <Input
                                    type="password"
                                    value={waConfig.apiKey}
                                    onChange={e => setWaConfig({ ...waConfig, apiKey: e.target.value })}
                                    placeholder="Paste API Key here"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sender Number (Optional)</label>
                                <Input
                                    value={waConfig.senderNumber}
                                    onChange={e => setWaConfig({ ...waConfig, senderNumber: e.target.value })}
                                    placeholder="628123456789"
                                />
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="flex justify-end mt-6">
                    <Button type="submit" disabled={loading} className="w-full md:w-auto">
                        <Save className="w-4 h-4 mr-2" />
                        {loading ? 'Saving...' : 'Save Configuration'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
