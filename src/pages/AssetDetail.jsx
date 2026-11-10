import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    Save, ArrowLeft, Trash2, Monitor, Activity, Shield,
    Cpu, HardDrive, Package, Clock, User, MapPin,
    Info, ExternalLink, RefreshCw, AlertCircle, FileText, Printer,
    CheckCircle, Tag, Database, Layers, Wifi, X, MemoryStick, Server,
    LayoutDashboard, Box, Terminal, Plug, HelpCircle, FileDigit, CalendarDays, Upload,
    Keyboard, Mouse, Copy, Check, Download, Globe, Radio, Play, Plus, Network, Zap,
    ShieldCheck, Lock, Unlock, RotateCw, ShieldAlert, CheckCircle2, Coins, TrendingUp, Award, Sparkles
} from 'lucide-react';
import AssetLabel from '../components/AssetLabel';
import RemoteDesktop from '../components/RemoteDesktop';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generateAssetHistoryPdf } from '../utils/generateAssetHistoryPdf';
import { generateHandoverPdf } from '../utils/generateHandoverPdf';
import { generateTicketPdf } from '../utils/generateTicketPdf';


export default function AssetDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = id === 'new';
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');

    const [form, setForm] = useState({
        name: '',
        category: 'Computer',
        status: 'Active',
        serial_number: '',
        inventory_number: '',
        vm_code: '',
        server_purpose: '',
        location: '',
        contact: '',
        manufacturer: '',
        model: '',
        specs: '',
        hr_employee_id: '',
        purchase_date: ''
    });

    const [users, setUsers] = useState([]);
    const [historyLogs, setHistoryLogs] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [loading, setLoading] = useState(true);
    const [glpiLoading, setGlpiLoading] = useState(false);
    const [glpiDebug, setGlpiDebug] = useState('');
    const [assetTickets, setAssetTickets] = useState([]);
    const [assetMaintenance, setAssetMaintenance] = useState([]);
    const [copiedField, setCopiedField] = useState(null);
    const [showRemoteModal, setShowRemoteModal] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);
    const [actionMessage, setActionMessage] = useState(null);
    const [securityAlerts, setSecurityAlerts] = useState([]);
    const [clearingThreats, setClearingThreats] = useState(false);
    const [healthData, setHealthData] = useState(null);
    const [submittingBudget, setSubmittingBudget] = useState(false);
    const [budgetSubmitted, setBudgetSubmitted] = useState(false);

    const fetchHealthScore = async (assetId) => {
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const org = sessionStorage.getItem('organization') || 'TCF-SG';
            const res = await fetch(`/api/network/assets/${assetId}/health-score`, {
                headers: { 
                    'Authorization': token ? `Bearer ${token}` : '',
                    'x-organization': org 
                }
            });
            if (res.ok) {
                const data = await res.json();
                setHealthData(data);
                if (data.is_in_budget) {
                    setBudgetSubmitted(true);
                }
            }
        } catch (e) {
            console.warn('Failed to fetch health score', e);
        }
    };

    const handlePushToBudget = async () => {
        if (!healthData || !healthData.assessment) return;
        const a = healthData.assessment;
        setSubmittingBudget(true);
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const org = sessionStorage.getItem('organization') || 'TCF-SG';
            const res = await fetch('/api/budgeting/master-plan/hardware/push-to-budget', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : '',
                    'x-organization': org 
                },
                body: JSON.stringify({
                    asset_id: form.id,
                    year: 2027,
                    item_name: `${a.status_label || 'Peremajaan'}: ${form.name} (${form.user_name || 'Asset'})`,
                    form: a.target_form || (a.category === 'CAPEX' ? 'I-1' : 'F2'),
                    category: a.category || 'CAPEX',
                    cost: a.estimated_cost || 0,
                    notes: `${a.recommendation || ''} | Spec: ${healthData.specs?.cpu || ''}, RAM: ${healthData.specs?.ramGb || 0}GB, SSD: ${healthData.specs?.isSsd ? 'Yes' : 'No'} | Tag: ${form.inventory_number || ''}`,
                    plant: (form.inventory_number || '').toUpperCase().includes('TCFKG') ? 'KG' : 'SG',
                    target_month: 'jan'
                })
            });
            if (res.ok) {
                setBudgetSubmitted(true);
                fetchHealthScore(form.id);
                setActionMessage({ type: 'success', text: 'Usulan peremajaan/upgrade berhasil didaftarkan ke Draft Master Plan Anggaran 2027!' });
            } else {
                const errData = await res.json();
                setActionMessage({ type: 'error', text: errData.error || 'Gagal mengajukan ke anggaran.' });
            }
        } catch (err) {
            setActionMessage({ type: 'error', text: 'Gagal mengajukan: ' + err.message });
        } finally {
            setSubmittingBudget(false);
        }
    };

    const fetchSecurityAlerts = async (assetId) => {
        try {
            const org = sessionStorage.getItem('organization') || 'TCF-SG';
            const res = await fetch(`/api/network/assets/${assetId}/security-alerts`, {
                headers: { 'x-organization': org }
            });
            if (res.ok) {
                const data = await res.json();
                setSecurityAlerts(data.alerts || []);
            }
        } catch (e) {
            console.warn('Failed to fetch security alerts', e);
        }
    };

    const handleClearThreats = async () => {
        if (!form.id) return;
        setClearingThreats(true);
        try {
            const org = sessionStorage.getItem('organization') || 'TCF-SG';
            const res = await fetch(`/api/network/assets/${form.id}/clear-threats`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-organization': org }
            });
            if (res.ok) {
                setForm(prev => ({ ...prev, threats_found: 0 }));
                setActionMessage({ type: 'success', text: 'Status ancaman berhasil direset (Aset dinyatakan Bersih/Aman).' });
            }
        } catch (e) {
            console.error('Failed to clear threats', e);
        } finally {
            setClearingThreats(false);
        }
    };

    const triggerAgentAction = async (actionType) => {
        if (!form.id) return;
        setActionLoading(actionType);
        setActionMessage(null);
        try {
            const org = sessionStorage.getItem('organization') || 'TCF-SG';
            const res = await fetch(`/api/network/agents/${form.id}/action`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-organization': org
                },
                body: JSON.stringify({ action: actionType })
            });
            const data = await res.json();
            if (res.ok) {
                setActionMessage({ type: 'success', text: data.message || 'Perintah berhasil dikirim ke Agent PC!' });
                if (actionType === 'resync' || actionType === 'restart_rustdesk') {
                    setTimeout(() => fetchAsset(), 6000);
                }
            } else {
                setActionMessage({ type: 'error', text: data.error || 'Gagal mengirim aksi ke Agent' });
            }
        } catch (err) {
            setActionMessage({ type: 'error', text: 'Koneksi ke server terputus saat mengirim aksi.' });
        } finally {
            setActionLoading(null);
        }
    };

    const copyToClipboard = (text, fieldName) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const downloadRdpFile = () => {
        if (!form.ip_address) return;
        const rdpContent = [
            `full address:s:${form.ip_address}:3389`,
            'prompt for credentials:i:1',
            'administrative session:i:1',
            'screen mode id:i:2',
            'use multimon:i:0',
            'desktopwidth:i:1920',
            'desktopheight:i:1080',
            'session bpp:i:32',
            'compression:i:1',
            'keyboardhook:i:2',
            'audiomode:i:0',
            'redirectprinters:i:0',
            'redirectcomports:i:0',
            'redirectsmartcards:i:0',
            'redirectclipboard:i:1',
            'redirectposdevices:i:0',
            'autoreconnection enabled:i:1',
            'authentication level:i:2',
            'negotiate security layer:i:1',
            `username:s:${form.windows_login || form.user_name || ''}`
        ].join('\r\n');

        const blob = new Blob([rdpContent], { type: 'application/x-rdp' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${form.name || 'RemoteDesktop'}.rdp`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    
    // GLPI Data State
    const [glpiData, setGlpiData] = useState({
        software: [],
        volumes: [],
        components: { cpus: [], rams: [], networks: [] }
    });

    const [activeTab, setActiveTab] = useState('computer');

    const [masterCategories, setMasterCategories] = useState([]);
    const [masterNodeTypes, setMasterNodeTypes] = useState([]);
    const [masterStatuses, setMasterStatuses] = useState([]);
    const [masterLocations, setMasterLocations] = useState([]);

    useEffect(() => {
        fetchInitialData();
        fetchMasterData();
    }, [id]);

    const fetchMasterData = async () => {
        try {
            const org = user?.organization || 'TCF-SG';
            const [catRes, nodeRes, dropRes, deptRes] = await Promise.all([
                fetch(`/api/network/global/categories?organization=${org}`),
                fetch(`/api/network/global/node-types?organization=${org}`),
                fetch(`/api/network/global/dropdowns?organization=${org}`),
                fetch(`/api/departments`)
            ]);
            
            if (catRes.ok) {
                const catData = await catRes.json();
                setMasterCategories(catData.length > 0 ? catData : [
                    { name: 'Desktop' }, { name: 'Laptop' }, { name: 'Printer' },
                    { name: 'Monitor' }, { name: 'Phone' }, { name: 'Server' },
                    { name: 'CCTV' }, { name: 'Network' }
                ]);
            }
            if (nodeRes.ok) {
                const nodeData = await nodeRes.json();
                setMasterNodeTypes(nodeData.length > 0 ? nodeData : []);
            }

            let locations = [];
            if (dropRes.ok) {
                const dropData = await dropRes.json();
                setMasterStatuses(dropData.filter(d => d.category === 'asset_status' && d.is_active));
                const customLocs = dropData.filter(d => d.category === 'asset_location' && d.is_active);
                if (customLocs.length > 0) locations = customLocs;
            }
            if (deptRes.ok) {
                const deptData = await deptRes.json();
                if (Array.isArray(deptData) && deptData.length > 0) {
                    deptData.forEach(d => {
                        if (d.name && !locations.some(l => l.value === d.name)) {
                            locations.push({ value: d.name, label: d.name });
                        }
                    });
                }
            }
            if (locations.length === 0) {
                const defaultDepts = ['ICT', 'Purchasing', 'PPIC', 'HRD-GA', 'Produksi', 'Engineering', 'Marketing', 'Maintenance', 'QC', 'QMR'];
                locations = defaultDepts.map(d => ({ value: d, label: d }));
            }
            setMasterLocations(locations);
        } catch (err) {
            console.error('Failed to fetch master data', err);
            // Fallback
            setMasterCategories([
                { name: 'Desktop' }, { name: 'Laptop' }, { name: 'Printer' },
                { name: 'Monitor' }, { name: 'Phone' }, { name: 'Server' },
                { name: 'CCTV' }, { name: 'Network' }
            ]);
            setMasterLocations([
                { value: 'ICT', label: 'ICT' },
                { value: 'Purchasing', label: 'Purchasing' },
                { value: 'PPIC', label: 'PPIC' },
                { value: 'HRD-GA', label: 'HRD-GA' },
                { value: 'Produksi', label: 'Produksi' },
                { value: 'Engineering', label: 'Engineering' },
                { value: 'Maintenance', label: 'Maintenance' },
                { value: 'Marketing', label: 'Marketing' },
                { value: 'QC', label: 'QC' },
                { value: 'QMR', label: 'QMR' }
            ]);
        }
    };

    const fetchInitialData = async () => {
        setLoading(true);
        await fetchUsers();
        if (!isNew) {
            await fetchAsset();
        } else {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/hr/employees');
            if (res.ok) {
                const data = await res.json();
                const emps = data.data ? data.data : (Array.isArray(data) ? data : []);
                if (emps.length > 0) {
                    setUsers(emps);
                    return;
                }
            }
            // Fallback: If /api/hr/employees is empty, load from /api/users
            const uRes = await fetch('/api/users');
            if (uRes.ok) {
                const uData = await uRes.json();
                setUsers(Array.isArray(uData) ? uData : []);
            } else {
                setUsers([]);
            }
        } catch (err) {
            console.error('Failed to fetch users', err);
            setUsers([]);
        }
    };

    const fetchAsset = async () => {
        try {
            const res = await fetch(`/api/network/assets/${id}`);
            const data = await res.json();
            let formattedSpecs = data.specs;
            if (typeof data.specs === 'object' && data.specs !== null) {
                formattedSpecs = JSON.stringify(data.specs, null, 2);
            }
            const initialLocation = data.location && data.location !== 'Unknown' 
                ? data.location 
                : (data.user_department || '');

            setForm({ 
                ...data, 
                specs: formattedSpecs || '', 
                hr_employee_id: data.hr_employee_id || '', 
                location: initialLocation,
                purchase_date: (data.purchase_date || '').substring(0, 10) 
            });
            fetchSecurityAlerts(data.id || id);
            fetchHealthScore(data.id || id);
            
            // Try fetching GLPI data using UUID or Name
            const identifier = data.uuid || data.name;
            
            // Prefer custom agent specs if available
            let agentSpecs = null;
            try {
                if (typeof data.specs === 'string' && data.specs.includes('{')) {
                    agentSpecs = JSON.parse(data.specs);
                } else if (typeof data.specs === 'object' && data.specs !== null) {
                    agentSpecs = data.specs;
                }
            } catch (e) {}

            if (agentSpecs && (agentSpecs.cpu || agentSpecs.ram || agentSpecs.software)) {
                // Construct glpiData from local agent specs
                let networksArr = [];
                const macList = [];
                if (Array.isArray(agentSpecs?.mac_addresses)) {
                    agentSpecs.mac_addresses.forEach(m => {
                        if (m && !macList.includes(m)) macList.push(m);
                    });
                }
                if (data.mac_address && !macList.includes(data.mac_address)) {
                    macList.push(data.mac_address);
                }

                if (macList.length > 0) {
                    macList.forEach((mac, idx) => {
                        networksArr.push({
                            name: idx === 0 && data.network_name ? data.network_name : `Network Adapter ${idx + 1}`,
                            type: data.network_type || 'Ethernet',
                            mac: mac,
                            ip: idx === 0 ? (data.ip_address || '—') : '—',
                            status: idx === 0 ? (data.agent_status === 'Online' ? 'Up' : 'Ready') : 'Ready',
                            internet: idx === 0 ? data.internet_access : false
                        });
                    });
                } else if (data.network_name || data.ip_address) {
                    networksArr.push({
                        name: data.network_name || 'Primary Network Interface',
                        type: data.network_type || 'Ethernet',
                        mac: 'Not Reported',
                        ip: data.ip_address || '—',
                        status: data.agent_status === 'Online' ? 'Up' : 'Ready',
                        internet: data.internet_access
                    });
                }
                
                let storageArr = [];
                if (Array.isArray(agentSpecs.storage)) {
                    storageArr = agentSpecs.storage.map(s => ({
                        drive: s.drive || '',
                        total_mb: parseInt(s.size_gb || 0) * 1024,
                        free_mb: parseInt(s.free_gb || 0) * 1024,
                        filesystem: s.file_system || 'NTFS'
                    }));
                }

                let cpusArr = [];
                if (agentSpecs.cpu) {
                    cpusArr.push({ name: agentSpecs.cpu, speed: 0 });
                }

                let ramsArr = [];
                if (agentSpecs.ram) {
                    ramsArr.push({ type: 'RAM', size_mb: parseInt(agentSpecs.ram.replace(/[^0-9]/g, '')) * 1024 || 0 });
                }

                let softwareArr = [];
                if (Array.isArray(agentSpecs.software)) {
                    softwareArr = agentSpecs.software.map(s => ({
                        software_name: s.name,
                        version: s.version
                    }));
                }

                setGlpiData({
                    components: {
                        cpus: cpusArr,
                        rams: ramsArr,
                        networks: networksArr
                    },
                    volumes: storageArr,
                    software: softwareArr
                });
            } else if (identifier) {
                // Fallback to GLPI
                fetchGlpiData(identifier);
            }

            if (data.id) fetchHistory(data.id);
            setLoading(false);
        } catch (err) {
            console.error('Failed to fetch asset details', err);
            setLoading(false);
        }
    };
    
    const fetchGlpiData = async (identifier) => {
        let debugStr = "Fetch called for " + identifier + "\n";
        try {
            setGlpiLoading(true);
            const res = await fetch(`/api/network/glpi/computer/${encodeURIComponent(identifier)}`);
            debugStr += "Status: " + res.status + "\n";
            if (res.ok) {
                const data = await res.json();
                debugStr += "Data success: " + data.success + "\n";
                if (data.success) {
                    debugStr += "Has data.data: " + !!data.data + "\n";
                    if (data.data) {
                        debugStr += "Software count: " + (data.data.software?.length || 0) + "\n";
                        debugStr += "CPUs count: " + (data.data.components?.cpus?.length || 0) + "\n";
                        setGlpiData(data.data);
                        debugStr += "setGlpiData CALLED!\n";
                    }
                } else {
                    debugStr += "Error message: " + data.message + "\n";
                }
            } else {
                debugStr += "HTTP Error: " + res.statusText + "\n";
            }
        } catch(err) {
            debugStr += "Exception: " + err.message + "\n";
            console.error('Failed to fetch GLPI data', err);
        } finally {
            setGlpiDebug(debugStr);
            setGlpiLoading(false);
        }
    };

    const fetchHistory = async (assetId) => {
        try {
            setLoadingHistory(true);
            const res = await fetch(`/api/network/agents/${assetId}/history`);
            if (res.ok) {
                const data = await res.json();
                setHistoryLogs(Array.isArray(data) ? data : []);
            } else {
                setHistoryLogs([]);
            }
            
            // Fetch tickets
            try {
                let ticketsRes = await fetch(`/api/network/assets/${assetId}/tickets`);
                if (!ticketsRes.ok) ticketsRes = await fetch(`/api/network/tickets?asset_id=${assetId}`);
                if (ticketsRes.ok) {
                    const ticketsData = await ticketsRes.json();
                    setAssetTickets(Array.isArray(ticketsData) ? ticketsData : []);
                }
            } catch (e) {
                console.error('Failed to fetch tickets for asset', e);
            }
            
            // Fetch maintenance
            try {
                let maintRes = await fetch(`/api/network/assets/${assetId}/maintenance`);
                if (!maintRes.ok) maintRes = await fetch(`/api/network/maintenance/asset/${assetId}`);
                if (maintRes.ok) {
                    const maintData = await maintRes.json();
                    setAssetMaintenance(Array.isArray(maintData) ? maintData : []);
                }
            } catch (e) {
                console.error('Failed to fetch maintenance for asset', e);
            }
            
        } catch (err) {
            console.error('Failed to fetch history', err);
            setHistoryLogs([]);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleChange = (e) => {
        if (e.target.name === 'hr_employee_id') {
            const selectedEmpId = e.target.value;
            const selectedUser = users.find(u => String(u.id) === String(selectedEmpId));
            const userDept = selectedUser?.department || '';
            setForm(prev => ({
                ...prev,
                hr_employee_id: selectedEmpId,
                user_id: selectedEmpId ? prev.user_id : '',
                location: userDept || prev.location
            }));
        } else {
            setForm({ ...form, [e.target.name]: e.target.value });
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        const url = isNew ? '/api/network/assets' : `/api/network/assets/${id}`;
        const method = isNew ? 'POST' : 'PUT';
        let specsJson = null;
        try {
            if (form.specs) specsJson = JSON.parse(form.specs);
        } catch (e) {
            alert('Invalid JSON in Technical Specs. Please check formatting.');
            return;
        }
        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, specs: specsJson })
            });
            if (res.ok) {
                navigate('/ict/assets');
            } else {
                alert('Commit failed. Server rejected the configuration.');
            }
        } catch (err) {
            console.error('Error saving asset', err);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to delete this asset? This action cannot be undone.")) return;
        try {
            const res = await fetch(`/api/network/assets/${id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                navigate('/ict/assets');
            } else {
                alert('Failed to delete asset. Server rejected the request.');
            }
        } catch (err) {
            console.error('Error deleting asset', err);
            alert('Error deleting asset');
        }
    };

    if (loading && !isNew) return (
        <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Syncing Asset Node...</div>
            </div>
        </div>
    );

    const isOnline = form.agent_status === 'Online';

    // Shared input/label style
    const inputClass = "w-full bg-[#F8F9FB] border border-[#E1E1E1] rounded-xl px-4 py-3 focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none transition-all font-semibold text-slate-800 placeholder-slate-400 text-sm";
    const labelClass = "block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5";

    // Extract peripherals data (keyboards, mice, monitors, printers)
    let peripheralsData = { monitors: [], keyboards: [], mice: [], printers: [] };
    try {
        if (typeof form.peripherals === 'string' && form.peripherals.includes('{')) {
            peripheralsData = { ...peripheralsData, ...JSON.parse(form.peripherals) };
        } else if (typeof form.peripherals === 'object' && form.peripherals !== null) {
            peripheralsData = { ...peripheralsData, ...form.peripherals };
        } else if (typeof form.specs === 'string' && form.specs.includes('peripherals')) {
            const parsed = JSON.parse(form.specs);
            if (parsed.peripherals) peripheralsData = { ...peripheralsData, ...parsed.peripherals };
        }
    } catch (e) {}

    const totalPeripheralsCount = 
        (peripheralsData.monitors?.length || 0) +
        (peripheralsData.keyboards?.length || 0) +
        (peripheralsData.mice?.length || 0) +
        (peripheralsData.printers?.length || 0);

    // Sidebar Menu Items based on GLPI
    const sidebarSections = [
        {
            title: 'Asset Core',
            items: [
                { id: 'computer', label: 'Computer', icon: LayoutDashboard },
                { id: 'impact', label: 'Impact Analysis', icon: Activity },
                { id: 'os', label: 'Operating Systems', icon: Terminal, count: 1 }
            ]
        },
        {
            title: 'Hardware',
            items: [
                { id: 'components', label: 'Components', icon: Cpu, count: (glpiData.components?.cpus?.length || 0) + (glpiData.components?.rams?.length || 0) || null },
                { id: 'volumes', label: 'Volumes', icon: HardDrive, count: glpiData.volumes?.length || null }
            ]
        },
        {
            title: 'Ecosystem',
            items: [
                { id: 'software', label: 'Software', icon: Box, count: glpiData.software?.length || null },
                { id: 'connections', label: 'Connections & Peripherals', icon: Plug, count: totalPeripheralsCount || null },
                { id: 'network_ports', label: 'Network Ports', icon: Wifi, count: glpiData.components?.networks?.length || (form.ip_address || form.network_name ? 1 : null) },
                { id: 'remote_mgmt', label: 'Remote management', icon: Monitor, count: (form.rustdesk_id || form.ip_address) ? 1 : null }
            ]
        },
        {
            title: 'Lifecycle',
            items: [
                { id: 'tickets', label: 'Tickets', icon: HelpCircle, count: assetTickets.length || null },
                { id: 'problems', label: 'Problems', icon: AlertCircle, count: assetTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved').length || null },
                { id: 'maintenance', label: 'Maintenance', icon: CheckCircle, count: assetMaintenance.length || null },
                { id: 'historical', label: 'Historical', icon: Clock, count: historyLogs.length || null },
                { id: 'health_budget', label: 'Health Score & Budget 2027', icon: Coins, count: healthData ? `${healthData.score}%` : null }
            ]
        }
    ];

    // Helper to format bytes
    const formatBytes = (bytes) => {
        if (!bytes) return '0 GB';
        const gb = bytes / 1024; // Assuming MB in GLPI
        return gb.toFixed(1) + ' GB';
    };

    return (
        <div className="absolute inset-0 flex flex-col bg-[#F3F4F6] z-10">
            
            {/* ── Top Header ── */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/ict/assets')} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-black text-slate-900 tracking-tight">
                                {isNew ? 'New Computer' : (form.name || 'Computer Detail')}
                            </h1>
                            {!isNew && (
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${isOnline ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                                    {form.agent_status || 'Offline'}
                                </span>
                            )}
                            {!isNew && healthData && (
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('health_budget')}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border cursor-pointer hover:opacity-80 transition-all ${
                                        healthData.score >= 85 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                        healthData.score >= 70 ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                        healthData.score >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                        'bg-rose-50 text-rose-700 border-rose-200'
                                    }`}
                                    title="Audit Kelayakan ISO & Usulan Anggaran 2027"
                                >
                                    <Coins size={11} />
                                    <span>Health: {healthData.score}% ({healthData.grade})</span>
                                </button>
                            )}
                        </div>
                        <div className="text-[11px] font-bold text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>{form.manufacturer} {form.model}</span>
                            <span className="text-slate-300">•</span>
                            <span className="font-mono">{form.uuid || form.inventory_number || 'UNREGISTERED'}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {(form.rustdesk_id || form.ip_address || form.uuid) && (
                        <button 
                            type="button"
                            onClick={() => setShowRemoteModal(true)} 
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[11px] uppercase tracking-wider transition-all shadow-md shadow-indigo-500/20"
                        >
                            <Monitor size={14} /> Remote (RustDesk / RDP)
                        </button>
                    )}
                    {!isNew && (
                        <button onClick={handleDelete} className="p-2 bg-white border border-slate-200 text-rose-500 hover:bg-rose-50 rounded-lg transition-all">
                            <Trash2 size={16} />
                        </button>
                    )}
                    <button onClick={handleSubmit} className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[11px] uppercase tracking-wider transition-all shadow-md shadow-blue-500/20">
                        <Save size={14} /> Save
                    </button>
                </div>
            </div>

            {/* ── Main Layout ── */}
            <div className="flex flex-1 overflow-hidden">
                
                {/* Left Sidebar */}
                <div className="w-64 bg-white border-r border-slate-200 flex-shrink-0 overflow-y-auto custom-scrollbar">
                    <div className="py-6">
                        {sidebarSections.map((section, idx) => (
                            <div key={idx} className="mb-6">
                                <h4 className="px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                    {section.title}
                                </h4>
                                <div className="space-y-0.5">
                                    {section.items.map(item => {
                                        const Icon = item.icon;
                                        const isActive = activeTab === item.id;
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => setActiveTab(item.id)}
                                                className={`w-full flex items-center justify-between px-5 py-2.5 text-sm font-semibold transition-all border-l-4 ${isActive ? 'bg-blue-50/50 text-blue-700 border-blue-600' : 'text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Icon size={16} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                                                    {item.label}
                                                </div>
                                                {item.count !== null && item.count !== undefined && (
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                                                        {item.count}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Content Pane */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50 p-6 lg:p-8">

                    {/* Security Fabric Threat Alert Banner */}
                    {form.threats_found > 0 && (
                        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 text-rose-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm mb-6 animate-in fade-in">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-rose-500 text-white rounded-xl shadow-xs shrink-0">
                                    <ShieldAlert size={22} />
                                </div>
                                <div>
                                    <h4 className="font-black text-sm uppercase tracking-wide text-rose-900 flex items-center gap-2">
                                        <span>🚨 Peringatan Keamanan Aktif: {form.threats_found} Ancaman Terdeteksi!</span>
                                    </h4>
                                    <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
                                        Wazuh SIEM & Windows Defender mencatat aktivitas mencurigakan pada perangkat ini. Segera jalankan remediasi di bawah.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => triggerAgentAction('quick_scan')}
                                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                                >
                                    <ShieldCheck size={14} /> Scan Sekarang
                                </button>
                                <button
                                    type="button"
                                    onClick={() => triggerAgentAction('usb_lock_now')}
                                    className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                                >
                                    <Lock size={14} /> Kunci USB
                                </button>
                                <button
                                    type="button"
                                    disabled={clearingThreats}
                                    onClick={handleClearThreats}
                                    className="px-3 py-2 bg-white hover:bg-rose-100 border border-rose-300 text-rose-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                >
                                    <CheckCircle2 size={14} /> {clearingThreats ? '...' : 'Clear'}
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {/* ── TAB: COMPUTER ── */}
                    {activeTab === 'computer' && (
                        <div className="max-w-4xl space-y-3">
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                        <Info size={16} className="text-blue-600" /> Main Information
                                    </h3>
                                </div>
                                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass}>Name</label>
                                        <input name="name" value={form.name} onChange={handleChange} required className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Category</label>
                                        <select name="category" value={form.category || 'Computer'} onChange={handleChange} className={inputClass}>
                                            <option value="" disabled>Select Category</option>
                                            {masterCategories.length > 0 ? masterCategories.map((c, i) => (
                                                <option key={i} value={c.name}>{c.name}</option>
                                            )) : (
                                                <>
                                                    <option value="Desktop">Desktop</option>
                                                    <option value="Laptop">Laptop</option>
                                                    <option value="Printer">Printer</option>
                                                    <option value="Monitor">Monitor</option>
                                                    <option value="Phone">Phone</option>
                                                    <option value="Server">Server</option>
                                                    <option value="CCTV">CCTV</option>
                                                    <option value="Network">Network</option>
                                                </>
                                            )}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Status</label>
                                        <select name="status" value={form.status || 'Active'} onChange={handleChange} className={inputClass}>
                                            {masterStatuses.length > 0 ? (
                                                masterStatuses.map((s, i) => <option key={i} value={s.value}>{s.label}</option>)
                                            ) : (
                                                <>
                                                    <option value="Active">Active</option>
                                                    <option value="In Repair">In Repair</option>
                                                    <option value="In Stock">In Stock</option>
                                                    <option value="Disposed">Disposed</option>
                                                </>
                                            )}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Manufacturer</label>
                                        <input name="manufacturer" value={form.manufacturer || ''} onChange={handleChange} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Model</label>
                                        <input name="model" value={form.model || ''} onChange={handleChange} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Serial Number</label>
                                        <input name="serial_number" value={form.serial_number || ''} onChange={handleChange} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Inventory Number</label>
                                        <input name="inventory_number" value={form.inventory_number || ''} onChange={handleChange} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Location</label>
                                        <select name="location" value={form.location || ''} onChange={handleChange} className={inputClass}>
                                            <option value="">Select Location</option>
                                            {form.location && !masterLocations.some(l => l.value === form.location) && (
                                                <option value={form.location}>{form.location}</option>
                                            )}
                                            {masterLocations.map((l, i) => (
                                                <option key={i} value={l.value}>{l.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelClass}>User / Custodian</label>
                                        <select name="hr_employee_id" value={form.hr_employee_id} onChange={handleChange} className={inputClass}>
                                            <option value="">— Unassigned —</option>
                                            {users.map(u => (
                                                <option key={u.id} value={u.id}>{u.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── TAB: COMPONENTS ── */}
                    {activeTab === 'components' && (
                        <div className="max-w-5xl space-y-3">
                            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <Cpu size={20} className="text-blue-600" /> Hardware Components
                            </h2>
                            
                            {glpiLoading ? (
                                <div className="text-center py-10 text-slate-500 font-medium">Fetching live component data...</div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    
                                    {/* CPU Card */}
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                            <h3 className="font-bold text-slate-700 text-sm">Processors (CPU)</h3>
                                            <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{glpiData.components?.cpus?.length || 0}</span>
                                        </div>
                                        <div className="divide-y divide-slate-100">
                                            {glpiData.components?.cpus?.length > 0 ? glpiData.components.cpus.map((cpu, i) => (
                                                <div key={i} className="p-4 hover:bg-slate-50 transition-colors flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex justify-center items-center flex-shrink-0">
                                                        <Cpu size={20} className="text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800 text-sm">{cpu.name || 'Unknown Processor'}</div>
                                                        <div className="text-xs text-slate-500 mt-0.5">Speed: {cpu.speed ? `${cpu.speed} MHz` : 'N/A'}</div>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="p-4 text-center text-slate-400 text-sm">No CPU data available.</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* RAM Card */}
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                            <h3 className="font-bold text-slate-700 text-sm">Memory (RAM)</h3>
                                            <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{glpiData.components?.rams?.length || 0}</span>
                                        </div>
                                        <div className="divide-y divide-slate-100">
                                            {glpiData.components?.rams?.length > 0 ? glpiData.components.rams.map((ram, i) => (
                                                <div key={i} className="p-4 hover:bg-slate-50 transition-colors flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-lg bg-emerald-50 flex justify-center items-center flex-shrink-0">
                                                        <MemoryStick size={20} className="text-emerald-600" />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800 text-sm">{ram.size_mb ? `${(ram.size_mb/1024).toFixed(0)} GB` : 'Unknown Size'} {ram.type || 'RAM'}</div>
                                                        <div className="text-xs text-slate-500 mt-0.5">Speed: {ram.speed ? `${ram.speed} MHz` : 'N/A'}</div>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="p-4 text-center text-slate-400 text-sm">No RAM data available.</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Network Card */}
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden lg:col-span-2">
                                        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                            <h3 className="font-bold text-slate-700 text-sm">Network Interfaces</h3>
                                            <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{glpiData.components?.networks?.length || 0}</span>
                                        </div>
                                        <div className="divide-y divide-slate-100">
                                            {glpiData.components?.networks?.length > 0 ? glpiData.components.networks.map((net, i) => (
                                                <div key={i} className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex justify-center items-center flex-shrink-0">
                                                            <Wifi size={20} className="text-indigo-600" />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-800 text-sm">{net.name || 'Network Adapter'}</div>
                                                        </div>
                                                    </div>
                                                    {net.mac && (
                                                        <div className="bg-slate-100 text-slate-600 font-mono text-xs px-3 py-1.5 rounded-lg border border-slate-200">
                                                            MAC: {net.mac}
                                                        </div>
                                                    )}
                                                </div>
                                            )) : (
                                                <div className="p-4 text-center text-slate-400 text-sm">No Network Adapters found.</div>
                                            )}
                                        </div>
                                    </div>

                                </div>
                            )}
                        </div>
                    )}

                    {/* ── TAB: VOLUMES ── */}
                    {activeTab === 'volumes' && (
                        <div className="max-w-4xl space-y-3">
                            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <HardDrive size={20} className="text-blue-600" /> Disk Volumes
                            </h2>
                            {glpiLoading ? (
                                <div className="text-center py-10 text-slate-500 font-medium">Fetching live volume data...</div>
                            ) : glpiData.volumes?.length > 0 ? (
                                <div className="space-y-3">
                                    {glpiData.volumes.map((vol, i) => {
                                        const total = vol.total_mb || 0;
                                        const free = vol.free_mb || 0;
                                        const used = total - free;
                                        const usedPercent = total > 0 ? Math.round((used / total) * 100) : 0;
                                        const isHighUsage = usedPercent > 85;

                                        return (
                                            <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex justify-center items-center">
                                                            <HardDrive size={24} className="text-slate-600" />
                                                        </div>
                                                        <div>
                                                            <div className="text-lg font-black text-slate-800">{vol.drive || 'Local Disk'}</div>
                                                            <div className="text-xs font-semibold text-slate-500">File System: {vol.filesystem || 'NTFS'}</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xl font-black text-slate-800">{formatBytes(total)}</div>
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Size</div>
                                                    </div>
                                                </div>

                                                {total > 0 && (
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between text-xs font-bold">
                                                            <span className={isHighUsage ? 'text-rose-600' : 'text-slate-600'}>{usedPercent}% Used</span>
                                                            <span className="text-slate-500">{formatBytes(free)} Free</span>
                                                        </div>
                                                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200/60">
                                                            <div 
                                                                className={`h-full rounded-full transition-all duration-1000 ${isHighUsage ? 'bg-rose-500' : 'bg-blue-500'}`} 
                                                                style={{ width: `${usedPercent}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                                    <HardDrive size={48} className="mx-auto text-slate-300 mb-4" />
                                    <h3 className="text-lg font-bold text-slate-700 mb-1">No Volumes Found</h3>
                                    <p className="text-slate-500 text-sm">GLPI Agent has not reported any disk volumes for this computer.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── TAB: SOFTWARE ── */}
                    {activeTab === 'software' && (
                        <div className="space-y-3 h-full flex flex-col">
                            <div className="flex justify-between items-end">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-1">
                                        <Box size={20} className="text-blue-600" /> Installed Software
                                    </h2>
                                    <p className="text-sm text-slate-500 font-medium">Comprehensive list of applications reported by GLPI Agent.</p>
                                </div>
                                <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm text-sm font-bold text-slate-700">
                                    {glpiData.software?.length || 0} Total Apps
                                </div>
                            </div>
                            
                            {glpiLoading ? (
                                <div className="text-center py-10 text-slate-500 font-medium">Fetching live software data...</div>
                            ) : glpiData.software?.length > 0 ? (
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1">
                                    <table className="w-full text-left text-sm text-slate-600">
                                        <thead className="bg-slate-50/80 border-b border-slate-200 text-[10px] uppercase font-black tracking-widest text-slate-400">
                                            <tr>
                                                <th className="px-3 py-1.5 text-[10px] uppercase">Application Name</th>
                                                <th className="px-3 py-1.5 text-[10px] uppercase w-64">Version</th>
                                                <th className="px-3 py-1.5 text-[10px] uppercase w-32 text-center">Update Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {glpiData.software.map((sw, i) => (
                                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-3 py-1.5 text-[11px] font-semibold text-slate-800">{sw.software_name}</td>
                                                    <td className="px-3 py-1.5 text-[11px] text-slate-500 font-mono text-[11px]">{sw.version || 'Unknown'}</td>
                                                    <td className="px-3 py-1.5 text-[11px] text-center">
                                                        {sw.is_update === 1 ? (
                                                            <span className="bg-amber-50 text-amber-600 px-2.5 py-1 rounded-md text-[10px] font-bold border border-amber-100">UPDATE</span>
                                                        ) : (
                                                            <span className="text-slate-300">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                                    <Box size={48} className="mx-auto text-slate-300 mb-4" />
                                    <h3 className="text-lg font-bold text-slate-700 mb-1">No Software Found</h3>
                                    <p className="text-slate-500 text-sm">Software inventory data is currently unavailable.</p>
                                </div>
                            )}
                        </div>
                    )}
                    

                    {/* ── TAB: OPERATING SYSTEM ── */}
                    {activeTab === 'os' && (
                        <div className="max-w-4xl space-y-3">
                            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <Terminal size={20} className="text-blue-600" /> Operating System
                            </h2>
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                                    <h3 className="font-bold text-slate-800">System Information</h3>
                                    <div className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-100">Active OS</div>
                                </div>
                                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {(() => {
                                        let parsedSpecs = {};
                                        try {
                                            if (form.specs) parsedSpecs = JSON.parse(form.specs);
                                        } catch(e) {}
                                        return (
                                            <>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">OS Name</label>
                                                    <div className="font-semibold text-slate-800">{parsedSpecs.os || 'N/A'}</div>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Version</label>
                                                    <div className="font-semibold text-slate-800">{parsedSpecs.os_version || 'N/A'}</div>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Architecture</label>
                                                    <div className="font-semibold text-slate-800">{parsedSpecs.os_architecture || 'N/A'}</div>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Product Key / License</label>
                                                    <div className="font-mono text-sm text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">{parsedSpecs.os_license || 'Not Available'}</div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── TAB: NETWORK PORTS ── */}
                    {activeTab === 'network_ports' && (
                        <div className="max-w-5xl space-y-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-2">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-1">
                                        <Wifi size={22} className="text-blue-600" /> Network Ports & Telemetry
                                    </h2>
                                    <p className="text-sm text-slate-500 font-medium">Informasi antarmuka jaringan fisik & nirkabel, MAC Address, serta konektivitas IP.</p>
                                </div>
                                <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm text-sm font-bold text-slate-700">
                                    {(glpiData.components?.networks?.length || (form.ip_address || form.network_name ? 1 : 0))} Adapters
                                </div>
                            </div>
                            
                            {glpiLoading ? (
                                <div className="text-center py-10 text-slate-500 font-medium">Fetching live network data...</div>
                            ) : (glpiData.components?.networks?.length > 0 || form.ip_address || form.network_name) ? (
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1">
                                    <table className="w-full text-left text-sm text-slate-600">
                                        <thead className="bg-slate-50/80 border-b border-slate-200 text-[10px] uppercase font-black tracking-widest text-slate-400">
                                            <tr>
                                                <th className="px-4 py-3 text-[10px] uppercase">Interface Name</th>
                                                <th className="px-4 py-3 text-[10px] uppercase">Type</th>
                                                <th className="px-4 py-3 text-[10px] uppercase">MAC Address</th>
                                                <th className="px-4 py-3 text-[10px] uppercase">IP Address</th>
                                                <th className="px-4 py-3 text-[10px] uppercase">Internet</th>
                                                <th className="px-4 py-3 text-[10px] uppercase text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {(glpiData.components?.networks?.length > 0 ? glpiData.components.networks : [
                                                {
                                                    name: form.network_name || 'Primary Network Adapter',
                                                    type: form.network_type || 'LAN',
                                                    mac: (() => {
                                                        try {
                                                            const p = typeof form.specs === 'string' ? JSON.parse(form.specs) : form.specs;
                                                            if (Array.isArray(p?.mac_addresses) && p.mac_addresses[0]) return p.mac_addresses[0];
                                                        } catch(e) {}
                                                        return form.mac_address || 'Not Reported';
                                                    })(),
                                                    ip: form.ip_address || '—',
                                                    internet: form.internet_access,
                                                    status: isOnline ? 'Up' : 'Ready'
                                                }
                                            ]).map((net, i) => (
                                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-4 py-3 text-[12px] font-semibold text-slate-800">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex justify-center items-center flex-shrink-0 font-bold border border-blue-100">
                                                                <Wifi size={18} />
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-slate-800">{net.name || 'Network Adapter'}</div>
                                                                <div className="text-[10px] text-slate-400 font-medium">Physical NIC Telemetry</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-[11px]">
                                                        <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                                                            {net.type || form.network_type || 'LAN'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-[11px] font-mono text-slate-700">
                                                        <div className="flex items-center gap-2">
                                                            <span>{net.mac || 'N/A'}</span>
                                                            {net.mac && net.mac !== 'N/A' && net.mac !== 'Not Reported' && (
                                                                <button
                                                                    onClick={() => copyToClipboard(net.mac, `mac-${i}`)}
                                                                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
                                                                    title="Copy MAC Address"
                                                                >
                                                                    {copiedField === `mac-${i}` ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-[11px] font-mono font-bold text-blue-600">
                                                        <div className="flex items-center gap-2">
                                                            <span>{net.ip || form.ip_address || '—'}</span>
                                                            {net.ip && net.ip !== '—' && (
                                                                <button
                                                                    onClick={() => copyToClipboard(net.ip, `ip-${i}`)}
                                                                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
                                                                    title="Copy IP Address"
                                                                >
                                                                    {copiedField === `ip-${i}` ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-[11px]">
                                                        {net.internet || form.internet_access ? (
                                                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                Connected
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                                                                Intranet Only
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-[11px] text-right">
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Up
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                                    <Wifi size={48} className="mx-auto text-slate-300 mb-4" />
                                    <h3 className="text-lg font-bold text-slate-700 mb-1">No Network Ports Found</h3>
                                    <p className="text-slate-500 text-sm">GLPI Agent has not reported any network interfaces.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── TAB: CONNECTIONS & PERIPHERALS ── */}
                    {activeTab === 'connections' && (
                        <div className="max-w-5xl space-y-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-2">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-1">
                                        <Plug size={22} className="text-blue-600" /> Connected Devices & Peripherals
                                    </h2>
                                    <p className="text-sm text-slate-500 font-medium">
                                        Keyboard, mouse, monitor display, dan printer yang terdeteksi otomatis oleh TCF Agent.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-black">
                                        {totalPeripheralsCount} Connected Items
                                    </span>
                                </div>
                            </div>

                            {totalPeripheralsCount > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    
                                    {/* 1. MONITORS & DISPLAYS */}
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                                                    <Monitor size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-bold text-slate-800">Display Monitors</h3>
                                                    <p className="text-[11px] text-slate-400 font-medium">Layar eksternal & monitor visual</p>
                                                </div>
                                            </div>
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100">
                                                {peripheralsData.monitors?.length || 0} Unit
                                            </span>
                                        </div>

                                        <div className="space-y-2.5">
                                            {peripheralsData.monitors && peripheralsData.monitors.length > 0 ? (
                                                peripheralsData.monitors.map((mon, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-150 hover:bg-white hover:shadow-xs transition-all">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                                                            <div>
                                                                <div className="text-xs font-bold text-slate-800">{mon}</div>
                                                                <div className="text-[10px] text-slate-400 font-medium">DisplayPort / HDMI / VGA Output</div>
                                                            </div>
                                                        </div>
                                                        <span className="text-[9px] font-black px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-md uppercase">
                                                            Active
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-xs text-slate-400 py-4 text-center italic">Tidak ada monitor eksternal terdeteksi</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 2. KEYBOARDS */}
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                                                    <Keyboard size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-bold text-slate-800">Keyboards</h3>
                                                    <p className="text-[11px] text-slate-400 font-medium">Papan ketik fisik / USB Input</p>
                                                </div>
                                            </div>
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-600 border border-purple-100">
                                                {peripheralsData.keyboards?.length || 0} Unit
                                            </span>
                                        </div>

                                        <div className="space-y-2.5">
                                            {peripheralsData.keyboards && peripheralsData.keyboards.length > 0 ? (
                                                peripheralsData.keyboards.map((kb, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-150 hover:bg-white hover:shadow-xs transition-all">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div>
                                                            <div>
                                                                <div className="text-xs font-bold text-slate-800">{kb}</div>
                                                                <div className="text-[10px] text-slate-400 font-medium">Input Device / USB Interface</div>
                                                            </div>
                                                        </div>
                                                        <span className="text-[9px] font-black px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-md uppercase">
                                                            Plugged
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-xs text-slate-400 py-4 text-center italic">Tidak ada keyboard terdeteksi</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 3. MICE & POINTING */}
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                                                    <Mouse size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-bold text-slate-800">Mouse & Pointing Devices</h3>
                                                    <p className="text-[11px] text-slate-400 font-medium">Mouse optik, touchpad & pointer</p>
                                                </div>
                                            </div>
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100">
                                                {peripheralsData.mice?.length || 0} Unit
                                            </span>
                                        </div>

                                        <div className="space-y-2.5">
                                            {peripheralsData.mice && peripheralsData.mice.length > 0 ? (
                                                peripheralsData.mice.map((m, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-150 hover:bg-white hover:shadow-xs transition-all">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                                                            <div>
                                                                <div className="text-xs font-bold text-slate-800">{m}</div>
                                                                <div className="text-[10px] text-slate-400 font-medium">USB Optical / Wireless Mouse</div>
                                                            </div>
                                                        </div>
                                                        <span className="text-[9px] font-black px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-md uppercase">
                                                            Plugged
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-xs text-slate-400 py-4 text-center italic">Tidak ada mouse terdeteksi</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 4. PRINTERS */}
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                                                    <Printer size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-bold text-slate-800">Installed Printers</h3>
                                                    <p className="text-[11px] text-slate-400 font-medium">Printer fisik & antrean cetak</p>
                                                </div>
                                            </div>
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                {peripheralsData.printers?.length || 0} Unit
                                            </span>
                                        </div>

                                        <div className="space-y-2.5">
                                            {peripheralsData.printers && peripheralsData.printers.length > 0 ? (
                                                peripheralsData.printers.map((p, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-150 hover:bg-white hover:shadow-xs transition-all">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                                                            <div>
                                                                <div className="text-xs font-bold text-slate-800">{p}</div>
                                                                <div className="text-[10px] text-slate-400 font-medium">Network / Local Printer Device</div>
                                                            </div>
                                                        </div>
                                                        <span className="text-[9px] font-black px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-md uppercase">
                                                            Ready
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-xs text-slate-400 py-4 text-center italic">Tidak ada printer terhubung</div>
                                            )}
                                        </div>
                                    </div>

                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                                    <Plug size={48} className="mx-auto text-slate-300 mb-4" />
                                    <h3 className="text-lg font-bold text-slate-700 mb-1">No Peripherals Detected</h3>
                                    <p className="text-slate-500 text-sm max-w-md mx-auto">
                                        Agent belum mengirimkan data aksesoris fisik untuk perangkat ini, atau perangkat belum online sinkronisasi dengan versi agent terbaru.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── TAB: HISTORICAL ── */}
                    {activeTab === 'historical' && (
                        <div className="max-w-5xl space-y-3">
                            <div className="flex justify-between items-end mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-1">
                                        <Clock size={20} className="text-blue-600" /> Historical Activity
                                    </h2>
                                    <p className="text-sm text-slate-500 font-medium">Log of status changes, agent synchronizations, and actions.</p>
                                </div>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={(e) => {
                                            e.preventDefault();
                                            generateAssetHistoryPdf(form, historyLogs);
                                        }}
                                        className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl shadow-sm transition-all text-xs font-black uppercase flex items-center gap-2"
                                        title="Print History Perangkat (03-03)"
                                    >
                                        <Printer size={16} /> Print History
                                    </button>
                                    <button 
                                        onClick={(e) => {
                                            e.preventDefault();
                                            const userData = users.find(u => u.id === form.hr_employee_id) || {};
                                            const bastForm = {
                                                nik: userData.nik || '.......................',
                                                jabatan: userData.position || '.......................',
                                                divisi: userData.department || '.......................',
                                                atasan: '.......................',
                                                snCharger: '.......................'
                                            };
                                            generateHandoverPdf(userData.name || form.user_id || form.contact || 'User', form, bastForm);
                                        }}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all text-xs font-black uppercase flex items-center gap-2"
                                        title="Print Serah Terima Perangkat Ini (03-02)"
                                    >
                                        <Printer size={16} /> Print BAST
                                    </button>
                                    <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm text-sm font-bold text-slate-700">
                                        {historyLogs.length} Events
                                    </div>
                                </div>
                            </div>

                            {loadingHistory ? (
                                <div className="text-center py-10 text-slate-500 font-medium">Loading history logs...</div>
                            ) : historyLogs.length > 0 ? (
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
                                    {/* Timeline line */}
                                    <div className="absolute left-[39px] top-6 bottom-6 w-0.5 bg-slate-100 z-0 hidden sm:block"></div>
                                    
                                    <div className="divide-y divide-slate-50">
                                        {historyLogs.map((log, i) => {
                                            const actionLower = (log.action || '').toLowerCase();
                                            const isUpgrade = actionLower.includes('upgrade');
                                            const isAlert = actionLower.includes('alert') || actionLower.includes('warning') || actionLower.includes('berkurang');
                                            const isInit = actionLower.includes('registration') || actionLower.includes('initial');

                                            return (
                                                <div key={i} className="p-4 hover:bg-slate-50/60 transition-colors relative z-10 flex gap-4">
                                                    <div className="hidden sm:flex flex-col items-center">
                                                        <div className={`w-10 h-10 rounded-full border-4 border-white flex justify-center items-center flex-shrink-0 shadow-sm ${
                                                            isAlert ? 'bg-rose-100 text-rose-600' :
                                                            isUpgrade ? 'bg-emerald-100 text-emerald-600' :
                                                            isInit ? 'bg-blue-100 text-blue-600' :
                                                            'bg-slate-100 text-slate-600'
                                                        }`}>
                                                            {isAlert ? <AlertCircle size={18} /> :
                                                             isUpgrade ? <CheckCircle size={18} /> :
                                                             isInit ? <Package size={18} /> :
                                                             <Activity size={18} />}
                                                        </div>
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <h4 className="font-bold text-slate-800 text-sm">{log.action || 'System Update'}</h4>
                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                                                    isAlert ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                                    isUpgrade ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                                    isInit ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                                    'bg-slate-100 text-slate-600 border-slate-200'
                                                                }`}>
                                                                    {log.performed_by || log.user || 'TCF Agent'}
                                                                </span>
                                                            </div>
                                                            <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md w-fit">
                                                                {new Date(log.timestamp || log.created_at).toLocaleString('id-ID')}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-slate-700 bg-[#FAFBFD] border border-slate-150 p-3.5 rounded-xl shadow-xs whitespace-pre-line leading-relaxed font-mono">
                                                            {log.details || log.description || 'No additional details provided.'}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                                    <Clock size={48} className="mx-auto text-slate-300 mb-4" />
                                    <h3 className="text-lg font-bold text-slate-700 mb-1">No History Found</h3>
                                    <p className="text-slate-500 text-sm">There are no recorded events for this asset yet.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── TAB: TICKETS ── */}
                    {activeTab === 'tickets' && (
                        <div className="max-w-5xl space-y-3">
                            <div className="flex justify-between items-end mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-1">
                                        <Layers size={20} className="text-blue-600" /> Helpdesk Tickets
                                    </h2>
                                    <p className="text-sm text-slate-500 font-medium">Riwayat perbaikan dan permintaan terkait pengguna/perangkat ini.</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Link
                                        to={`/ict/tickets?asset_id=${form.id}&action=new`}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl shadow-sm text-sm font-bold flex items-center gap-2 transition-colors"
                                    >
                                        <Plus size={16} /> Buka Tiket Baru
                                    </Link>
                                    <label className="cursor-pointer bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-300 px-4 py-2 rounded-xl shadow-sm text-sm font-bold flex items-center gap-2 transition-colors">
                                        <Upload size={16} /> Upload Requisition
                                        <input type="file" className="hidden" accept=".pdf,image/*" onChange={async (e) => {
                                            const file = e.target.files[0];
                                            if (!file) return;
                                            
                                            const formData = new FormData();
                                            formData.append('document', file);
                                            formData.append('asset_id', form.id);
                                            if (form.user_id) formData.append('user_id', form.user_id);
                                            formData.append('description', 'Upload via Asset Detail (Requisition Form)');

                                            try {
                                                const res = await fetch('/api/network/tickets/upload-requisition', {
                                                    method: 'POST',
                                                    body: formData
                                                });
                                                if (res.ok) {
                                                    alert('Berhasil upload & generate ticket!');
                                                    fetchAsset();
                                                } else {
                                                    alert('Gagal upload.');
                                                }
                                            } catch (err) {
                                                alert('Terjadi kesalahan saat upload.');
                                            }
                                        }} />
                                    </label>
                                    <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm text-sm font-bold text-slate-700">
                                        {assetTickets.length} Tickets
                                    </div>
                                </div>
                            </div>
                            
                            {assetTickets.length > 0 ? (
                                <div className="space-y-3">
                                    {assetTickets.map((t, i) => (
                                        <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4">
                                            <div className="flex-1 space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md ${
                                                        t.status === 'Closed' ? 'bg-emerald-100 text-emerald-700' :
                                                        t.status === 'Open' ? 'bg-amber-100 text-amber-700' :
                                                        'bg-blue-100 text-blue-700'
                                                    }`}>
                                                        {t.status}
                                                    </span>
                                                    <h3 className="font-bold text-slate-800">#{t.number || t.id} - {t.subject}</h3>
                                                </div>
                                                <p className="text-sm text-slate-600 line-clamp-2">{t.description}</p>
                                                {t.closing_notes && (
                                                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-500">
                                                        <strong>Notes:</strong> <span className="line-clamp-2">{t.closing_notes}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-right sm:min-w-[150px] flex flex-col justify-center border-t sm:border-t-0 sm:border-l border-slate-100 pt-4 sm:pt-0 sm:pl-6">
                                                <div className="text-[10px] font-black uppercase text-slate-400 mb-1">Created</div>
                                                <div className="text-sm font-bold text-slate-700 mb-3">{new Date(t.created_at).toLocaleDateString()}</div>
                                                <div className="flex gap-2 justify-end">
                                                    <Link 
                                                        to={`/ict/tickets?ticket=${t.id}`}
                                                        className="inline-block text-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                                                    >
                                                        View Ticket
                                                    </Link>
                                                    <button 
                                                        onClick={async (e) => {
                                                            e.preventDefault();
                                                            try {
                                                                const res = await fetch(`/api/tickets/${t.id}/responses`);
                                                                const data = await res.json();
                                                                generateTicketPdf(t, data.data || [], form);
                                                            } catch (err) {
                                                                console.error("Failed to load ticket responses", err);
                                                                generateTicketPdf(t, [], form);
                                                            }
                                                        }}
                                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all text-xs font-bold flex items-center gap-1"
                                                        title="Print Riwayat Perbaikan (03-01)"
                                                    >
                                                        <FileText size={14} /> Print Perbaikan
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                                    <AlertCircle size={48} className="mx-auto text-slate-300 mb-4" />
                                    <h3 className="text-lg font-bold text-slate-700 mb-1">No Tickets Found</h3>
                                    <p className="text-slate-500 text-sm mb-4">Tidak ada riwayat perbaikan untuk pengguna/perangkat ini.</p>
                                    <Link
                                        to={`/ict/tickets?asset_id=${form.id}&action=new`}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                                    >
                                        <Plus size={14} /> Buka Tiket Masalah Baru
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* ── TAB: PROBLEMS ── */}
                    {activeTab === 'problems' && (
                        <div className="max-w-5xl space-y-3">
                            <div className="flex justify-between items-end mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-1">
                                        <AlertCircle size={20} className="text-rose-600" /> Device Problems
                                    </h2>
                                    <p className="text-sm text-slate-500 font-medium">Tiket perbaikan yang belum terselesaikan / masih bermasalah.</p>
                                </div>
                            </div>
                            
                            {assetTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved').length > 0 ? (
                                <div className="space-y-3">
                                    {assetTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved').map((t, i) => (
                                        <div key={i} className="bg-rose-50 p-4 rounded-2xl border border-rose-100 shadow-sm flex flex-col sm:flex-row gap-4">
                                            <div className="flex-1 space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md bg-rose-200 text-rose-800">
                                                        {t.status}
                                                    </span>
                                                    <h3 className="font-bold text-rose-900">#{t.number || t.id} - {t.subject}</h3>
                                                </div>
                                                <p className="text-sm text-rose-700 line-clamp-2">{t.description}</p>
                                            </div>
                                            <div className="text-right sm:min-w-[150px] flex flex-col justify-center border-t sm:border-t-0 sm:border-l border-rose-200/50 pt-4 sm:pt-0 sm:pl-6">
                                                <div className="text-[10px] font-black uppercase text-rose-400 mb-1">Priority</div>
                                                <div className="text-sm font-bold text-rose-800 mb-3">{t.priority || 'Normal'}</div>
                                                <Link 
                                                    to={`/ict/helpdesk?ticket=${t.id}`}
                                                    className="inline-block text-center px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors"
                                                >
                                                    Solve Problem
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                                    <CheckCircle size={48} className="mx-auto text-emerald-400 mb-4" />
                                    <h3 className="text-lg font-bold text-slate-700 mb-1">No Active Problems</h3>
                                    <p className="text-slate-500 text-sm">Semua masalah pada perangkat ini telah terselesaikan.</p>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* ── TAB: MAINTENANCE ── */}
                    {activeTab === 'maintenance' && (
                        <div className="max-w-5xl space-y-3">
                            <div className="flex justify-between items-end mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-1">
                                        <CalendarDays size={20} className="text-blue-600" /> Maintenance Records
                                    </h2>
                                    <p className="text-sm text-slate-500 font-medium">Riwayat Preventive Maintenance dari Checksheet.</p>
                                </div>
                                <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm text-sm font-bold text-slate-700">
                                    {assetMaintenance.length} Records
                                </div>
                            </div>
                            
                            {assetMaintenance.length > 0 ? (
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
                                    <div className="absolute left-[39px] top-6 bottom-6 w-0.5 bg-slate-100 z-0 hidden sm:block"></div>
                                    <div className="divide-y divide-slate-50">
                                        {assetMaintenance.map((record, i) => (
                                            <div key={i} className="p-4 hover:bg-slate-50/50 transition-colors relative z-10 flex gap-4">
                                                <div className="hidden sm:flex flex-col items-center">
                                                    <div className="w-10 h-10 rounded-full bg-emerald-50 border-4 border-white flex justify-center items-center flex-shrink-0 shadow-sm">
                                                        <CheckCircle size={16} className="text-emerald-600" />
                                                    </div>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                                        <h4 className="font-bold text-slate-800 text-sm">
                                                            {record.plan_name || 'Preventive Maintenance Checksheet'} 
                                                            <span className="ml-2 text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">{record.plan_type || record.maintenance_type || 'PM'}</span>
                                                        </h4>
                                                        <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md w-fit">
                                                            {new Date(record.maintenance_date || record.executed_at || record.created_at).toLocaleDateString('id-ID')}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm text-slate-600 bg-white border border-slate-100 p-4 rounded-xl shadow-xs space-y-1 mb-3">
                                                        <div className="flex items-center justify-between text-xs text-slate-500 pb-1 border-b border-slate-50">
                                                            <span>Teknisi Pelaksana: <strong className="text-slate-800 font-semibold">{record.pic_name || 'ICT Helpdesk'}</strong></span>
                                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-150 uppercase">{record.status || 'Completed'}</span>
                                                        </div>
                                                        {record.condition_after && <div className="text-xs text-slate-700 pt-1"><strong>Hasil Pengecekan:</strong> {record.condition_after}</div>}
                                                        {record.notes && <div className="text-xs text-slate-500"><strong>Catatan:</strong> {record.notes}</div>}
                                                    </div>
                                                    {record.document_path && (
                                                        <a href={record.document_path} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                                                            <FileText size={14} /> View Maintenance Report (PDF)
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                                    <CalendarDays size={48} className="mx-auto text-slate-300 mb-4" />
                                    <h3 className="text-lg font-bold text-slate-700 mb-1">No Maintenance Records</h3>
                                    <p className="text-slate-500 text-sm mb-4">Belum ada riwayat pelaksanaan maintenance untuk perangkat ini.</p>
                                    <Link
                                        to="/ict/maintenance"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                                    >
                                        <ExternalLink size={14} /> Buka Jadwal Maintenance
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── TAB: REMOTE MANAGEMENT ── */}
                    {activeTab === 'remote_mgmt' && (
                        <div className="max-w-5xl space-y-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-2">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-1">
                                        <Monitor size={22} className="text-blue-600" /> Remote Management & Assistance
                                    </h2>
                                    <p className="text-sm text-slate-500 font-medium">Akses kendali jarak jauh (RustDesk Enterprise & Windows RDP) untuk perangkat ini.</p>
                                </div>
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${isOnline ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                    <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                                    {isOnline ? 'Device Online' : 'Device Standby'}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                
                                {/* 1. RustDesk Card */}
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
                                    <div className="p-6 space-y-4">
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xl border border-blue-100 shadow-xs">
                                                    RD
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-900 text-base">RustDesk Enterprise Remote</h3>
                                                    <p className="text-xs text-slate-400 font-medium">Self-hosted low latency remote desktop</p>
                                                </div>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${form.rustdesk_id ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                {form.rustdesk_id ? 'Client Ready' : 'Pending Client'}
                                            </span>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">RustDesk Remote ID</label>
                                                <button type="button" onClick={() => setShowRemoteModal(true)} className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                                                    <Terminal size={12} /> Buka Console & Auto-Fix Agent
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-bold text-slate-800">
                                                <span className="truncate max-w-[280px]">{form.rustdesk_id || 'Not Assigned / Pending'}</span>
                                                {form.rustdesk_id && (
                                                    <button
                                                        onClick={() => copyToClipboard(form.rustdesk_id, 'rustdesk_id')}
                                                        className="p-1.5 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition-all flex items-center gap-1 text-xs"
                                                    >
                                                        {copiedField === 'rustdesk_id' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                                        <span>{copiedField === 'rustdesk_id' ? 'Copied' : 'Copy'}</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Gateway details */}
                                        <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl space-y-1.5 text-xs text-slate-600">
                                            <div className="flex justify-between">
                                                <span className="text-slate-400 font-medium">Relay Server:</span>
                                                <span className="font-mono font-bold text-slate-700">192.168.1.66:21116</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400 font-medium">Encryption:</span>
                                                <span className="font-semibold text-emerald-700">ChaCha20-Poly1305 (E2EE)</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400 font-medium">Unattended Password:</span>
                                                <button onClick={() => copyToClipboard('Tcf*Remote2026', 'rd_pwd')} className="font-mono font-bold text-indigo-700 hover:underline flex items-center gap-1">
                                                    Tcf*Remote2026 {copiedField === 'rd_pwd' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                                </button>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400 font-medium">Server Key (66):</span>
                                                <button onClick={() => copyToClipboard('goI0tPWvahAVECQtsTDn2O2ongsTDSuXG1qIExA8lP4=', 'rd_key')} className="font-mono font-bold text-blue-700 hover:underline flex items-center gap-1">
                                                    goI0tPWvah... {copiedField === 'rd_key' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-5 bg-slate-50/80 border-t border-slate-100 flex flex-wrap gap-3">
                                        {form.ip_address && (
                                            <a
                                                href={`rustdesk://${form.ip_address}`}
                                                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm shadow-emerald-500/20 transition-all text-center"
                                            >
                                                <Wifi size={14} /> Direct LAN IP ({form.ip_address})
                                            </a>
                                        )}
                                        {form.rustdesk_id ? (
                                            <a
                                                href={`rustdesk://${form.rustdesk_id}`}
                                                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 transition-all text-center"
                                            >
                                                <Play size={14} /> 1-Click Launch RustDesk
                                            </a>
                                        ) : (
                                            <button
                                                disabled
                                                className="flex-1 py-2.5 px-4 bg-slate-200 text-slate-400 rounded-xl font-bold text-xs uppercase tracking-wider cursor-not-allowed text-center"
                                            >
                                                RustDesk Client Belum Aktif
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            disabled={actionLoading !== null}
                                            onClick={() => triggerAgentAction('restart_rustdesk')}
                                            className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-200 mt-1"
                                            title="Restart background service RustDesk di PC target jika remote macet"
                                        >
                                            {actionLoading === 'restart_rustdesk' ? <RefreshCw size={13} className="animate-spin text-blue-600" /> : <RotateCw size={13} />}
                                            <span>Restart Servis RustDesk di PC Target</span>
                                        </button>
                                    </div>
                                </div>

                                {/* 2. Windows RDP Card */}
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
                                    <div className="p-6 space-y-4">
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xl border border-indigo-100 shadow-xs">
                                                    RDP
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-900 text-base">Windows Remote Desktop</h3>
                                                    <p className="text-xs text-slate-400 font-medium">Direct native MSTSC session</p>
                                                </div>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${form.ip_address ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                {form.ip_address ? 'Port 3389 Active' : 'No IP'}
                                            </span>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Direct IP Endpoint</label>
                                            <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-bold text-slate-800">
                                                <span>{form.ip_address ? `${form.ip_address}:3389` : 'IP Address Not Assigned'}</span>
                                                {form.ip_address && (
                                                    <button
                                                        onClick={() => copyToClipboard(`mstsc /v:${form.ip_address}`, 'mstsc_cmd')}
                                                        className="p-1.5 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition-all flex items-center gap-1 text-xs"
                                                    >
                                                        {copiedField === 'mstsc_cmd' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                                        <span>{copiedField === 'mstsc_cmd' ? 'Copied' : 'Copy Cmd'}</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5 text-xs text-slate-600">
                                            <div className="flex justify-between">
                                                <span className="text-slate-400 font-medium">Default User:</span>
                                                <span className="font-semibold text-slate-700">{form.windows_login || form.user_name || 'Administrator'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400 font-medium">Network Scope:</span>
                                                <span className="font-semibold text-slate-700">{form.network_name || form.network_type || 'Internal LAN'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-5 bg-slate-50/80 border-t border-slate-100 flex flex-wrap gap-3">
                                        {form.ip_address && (
                                            <a
                                                href={`rustdesk://${form.ip_address}`}
                                                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm shadow-emerald-500/20 transition-all text-center"
                                            >
                                                <Wifi size={14} /> Direct LAN IP ({form.ip_address})
                                            </a>
                                        )}
                                        <button
                                            onClick={downloadRdpFile}
                                            disabled={!form.ip_address}
                                            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm ${form.ip_address ? 'bg-slate-800 hover:bg-slate-900 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                                        >
                                            <Download size={14} /> Download .RDP Shortcut
                                        </button>
                                        {form.uuid && isOnline && (
                                            <button
                                                onClick={() => window.open(`/ict/remote/${form.uuid}`, '_blank')}
                                                className="py-2.5 px-4 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xs"
                                                title="Open in-browser web remote"
                                            >
                                                <ExternalLink size={14} /> Web Remote
                                            </button>
                                        )}
                                    </div>
                                </div>

                            </div>
                        </div>
                    )}

                    {showRemoteModal && <RemoteDesktop asset={{ ...form, id }} onClose={() => setShowRemoteModal(false)} />}
                    {/* ── TAB: IMPACT & SECURITY FABRIC ── */}
                    {activeTab === 'impact' && (
                        <div className="max-w-5xl space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                                        <Activity size={22} className="text-blue-600" /> Impact & Security Fabric Analysis
                                    </h2>
                                    <p className="text-xs text-slate-500 font-medium">Analisis dampak operasional, kesehatan hardware, dan postur keamanan Zero-Trust (InfraGuard XDR + Wazuh).</p>
                                </div>
                                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Fabric Active • Node SG-66
                                </span>
                            </div>

                            {/* 3 Metric Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Health Score</span>
                                        <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle size={16} /></span>
                                    </div>
                                    <div className="text-2xl font-black text-slate-900">
                                        {form.agent_status === 'Online' ? '98%' : '85%'}
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium">Hardware & security operating smoothly</p>
                                </div>

                                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Security Posture</span>
                                        <span className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Shield size={16} /></span>
                                    </div>
                                    <div className="text-2xl font-black text-slate-900">
                                        {form.antivirus_status || 'Protected'}
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium">{form.antivirus_name || 'Windows Defender'} • {form.threats_found || 0} active threats</p>
                                </div>

                                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Remote Readiness</span>
                                        <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Monitor size={16} /></span>
                                    </div>
                                    <div className="text-2xl font-black text-indigo-700 font-mono">
                                        {form.rustdesk_id || 'ID Pending'}
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium">Server 66 Relay • Unattended Ready</p>
                                </div>
                            </div>

                            {/* Detailed Architecture & Zero-Trust Breakdown */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                                    <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                            <Layers size={16} className="text-indigo-600" /> Operational Impact Matrix
                                        </h3>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Live Telemetry</span>
                                    </div>
                                    <div className="p-5 space-y-3.5 text-xs">
                                        <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                                            <span className="text-slate-500 font-medium">Assigned Custodian:</span>
                                            <span className="font-bold text-slate-800">{form.contact || form.user_name || 'Unassigned'}</span>
                                        </div>
                                        <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                                            <span className="text-slate-500 font-medium">Department / Location:</span>
                                            <span className="font-bold text-slate-800">{form.location || 'General Plant'}</span>
                                        </div>
                                        <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                                            <span className="text-slate-500 font-medium">IP Address & Scope:</span>
                                            <span className="font-mono font-bold text-blue-600">{form.ip_address || 'DHCP'} ({form.network_name || 'LAN'})</span>
                                        </div>
                                        <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                                            <span className="text-slate-500 font-medium">Unified Database Link:</span>
                                            <span className="font-semibold text-emerald-700">Server 66 (:5432) Shared Fabric</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500 font-medium">Agent Sync Status:</span>
                                            <span className="font-bold text-slate-700">{form.last_agent_sync ? new Date(form.last_agent_sync).toLocaleString('id-ID') : 'Recently'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
                                    <div>
                                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                                <Zap size={16} className="text-amber-500" /> Fast Navigation & 1-Click Remediation
                                            </h3>
                                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">Live Agent Actions</span>
                                        </div>
                                        <div className="p-5 space-y-4">
                                            <p className="text-xs text-slate-500 leading-relaxed">
                                                Kirim perintah kendali instan langsung ke endpoint ini via background service Agent V30 tanpa perlu remote manual.
                                            </p>

                                            {/* Action Status Toast Banner */}
                                            {actionMessage && (
                                                <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${actionMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                                                    {actionMessage.type === 'success' ? <CheckCircle size={15} className="text-emerald-600 shrink-0" /> : <AlertCircle size={15} className="text-rose-600 shrink-0" />}
                                                    <span>{actionMessage.text}</span>
                                                </div>
                                            )}

                                            {/* 1-Click Action Buttons Grid */}
                                            <div className="grid grid-cols-2 gap-2.5">
                                                <button
                                                    type="button"
                                                    disabled={actionLoading !== null}
                                                    onClick={() => triggerAgentAction('quick_scan')}
                                                    className="p-3 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 text-indigo-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-indigo-200 transition-all text-center cursor-pointer shadow-xs"
                                                    title="Memicu Quick Scan Windows Defender di PC target"
                                                >
                                                    {actionLoading === 'quick_scan' ? <RefreshCw size={14} className="animate-spin text-indigo-600" /> : <ShieldCheck size={14} />}
                                                    <span>1-Click Scan Defender</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    disabled={actionLoading !== null}
                                                    onClick={() => triggerAgentAction('restart_rustdesk')}
                                                    className="p-3 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 text-blue-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-blue-200 transition-all text-center cursor-pointer shadow-xs"
                                                    title="Restart background service RustDesk jika koneksi remote macet"
                                                >
                                                    {actionLoading === 'restart_rustdesk' ? <RefreshCw size={14} className="animate-spin text-blue-600" /> : <RotateCw size={14} />}
                                                    <span>Restart RustDesk Svc</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    disabled={actionLoading !== null}
                                                    onClick={() => triggerAgentAction('usb_unlock_temp')}
                                                    className="p-3 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 text-amber-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-amber-200 transition-all text-center cursor-pointer shadow-xs"
                                                    title="Buka akses flashdisk USB selama 1 jam, lalu otomatis relock"
                                                >
                                                    {actionLoading === 'usb_unlock_temp' ? <RefreshCw size={14} className="animate-spin text-amber-600" /> : <Unlock size={14} />}
                                                    <span>Buka USB (1 Jam)</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    disabled={actionLoading !== null}
                                                    onClick={() => triggerAgentAction('usb_lock_now')}
                                                    className="p-3 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-rose-200 transition-all text-center cursor-pointer shadow-xs"
                                                    title="Kunci port USB sekarang juga"
                                                >
                                                    {actionLoading === 'usb_lock_now' ? <RefreshCw size={14} className="animate-spin text-rose-600" /> : <Lock size={14} />}
                                                    <span>Kunci USB Sekarang</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    disabled={actionLoading !== null}
                                                    onClick={() => triggerAgentAction('resync')}
                                                    className="p-3 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 text-emerald-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-emerald-200 transition-all text-center cursor-pointer col-span-2 shadow-xs"
                                                    title="Paksa Agent mengambil spek terbaru dan kirim telemetri segera"
                                                >
                                                    {actionLoading === 'resync' ? <RefreshCw size={14} className="animate-spin text-emerald-600" /> : <Zap size={14} />}
                                                    <span>⚡ Paksa Re-Sync Telemetri Endpoint Sekarang</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-400 text-center font-medium">
                                        Protected by InfraGuard Multi-Layer Shield • Server 3 & Server 66
                                    </div>
                                </div>
                            </div>

                            {/* Wazuh SIEM & EDR Threat Events History Card */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-black">
                                            <ShieldAlert size={18} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 text-sm">Wazuh SIEM & EDR Threat History</h3>
                                            <p className="text-[11px] text-slate-500">Log insiden keamanan terdeteksi untuk perangkat ini dari Server 3 & Server 66</p>
                                        </div>
                                    </div>
                                    {form.threats_found > 0 && (
                                        <button
                                            type="button"
                                            disabled={clearingThreats}
                                            onClick={handleClearThreats}
                                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                                        >
                                            <CheckCircle2 size={14} />
                                            <span>{clearingThreats ? 'Mereset...' : 'Tandai Teratasi (Clear Threat)'}</span>
                                        </button>
                                    )}
                                </div>
                                <div className="p-5">
                                    {securityAlerts.length === 0 ? (
                                        <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                                            <ShieldCheck size={28} className="text-emerald-500" />
                                            <span className="font-semibold text-slate-600">Tidak ada riwayat ancaman aktif pada perangkat ini</span>
                                            <span className="text-[11px]">Endpoint dalam kondisi terproteksi oleh Wazuh Agent & Windows Defender.</span>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs text-left">
                                                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                                                    <tr>
                                                        <th className="py-2.5 px-3">Waktu</th>
                                                        <th className="py-2.5 px-3">Tingkat Bahaya</th>
                                                        <th className="py-2.5 px-3">Deskripsi Insiden</th>
                                                        <th className="py-2.5 px-3">Source IP</th>
                                                        <th className="py-2.5 px-3">Tindakan Sistem</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {securityAlerts.map((al, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                                            <td className="py-2.5 px-3 text-slate-500 font-mono">
                                                                {al.timestamp ? new Date(Number(al.timestamp)).toLocaleString('id-ID') : '-'}
                                                            </td>
                                                            <td className="py-2.5 px-3">
                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                                    al.rule_level >= 10 ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                                                                    al.rule_level >= 7 ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                                                    'bg-blue-100 text-blue-700 border border-blue-200'
                                                                }`}>
                                                                    Level {al.rule_level}
                                                                </span>
                                                            </td>
                                                            <td className="py-2.5 px-3 font-semibold text-slate-800">
                                                                {al.description || '-'}
                                                            </td>
                                                            <td className="py-2.5 px-3 font-mono text-slate-600">
                                                                {al.src_ip || 'Internal'}
                                                            </td>
                                                            <td className="py-2.5 px-3">
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                                    al.action_taken === 'banned_mikrotik' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                                                    al.action_taken === 'whitelisted_bypassed' ? 'bg-slate-100 text-slate-600' :
                                                                    'bg-slate-100 text-slate-700'
                                                                }`}>
                                                                    {al.action_taken || 'Logged'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── TAB: SMART HEALTH & BUDGET 2027 ── */}
                    {activeTab === 'health_budget' && (
                        <div className="max-w-4xl space-y-6 animate-in fade-in">
                            
                            {/* Hero Card: Health Score & Grade */}
                            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 rounded-2xl p-6 text-white shadow-xl border border-slate-700/60 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
                                
                                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                    <div className="flex items-center gap-5">
                                        {/* Score Circular Badge */}
                                        <div className={`relative flex items-center justify-center w-24 h-24 rounded-2xl border-2 shadow-lg ${
                                            (healthData?.score || 100) >= 85 ? 'border-emerald-500/80 bg-emerald-500/10 shadow-emerald-500/20' :
                                            (healthData?.score || 100) >= 70 ? 'border-blue-500/80 bg-blue-500/10 shadow-blue-500/20' :
                                            (healthData?.score || 100) >= 50 ? 'border-amber-500/80 bg-amber-500/10 shadow-amber-500/20' :
                                            'border-rose-500/80 bg-rose-500/10 shadow-rose-500/20'
                                        }`}>
                                            <div className="text-center">
                                                <span className="text-2xl font-black block tracking-tight">
                                                    {healthData ? healthData.score : '--'}
                                                </span>
                                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                                    Score
                                                </span>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                    (healthData?.grade || 'A') === 'A' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                                    (healthData?.grade || 'A') === 'B' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                                    (healthData?.grade || 'A') === 'C' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                                    'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                                }`}>
                                                    Grade {healthData?.grade || 'A'} • {healthData?.grade_label || 'Optimal'}
                                                </span>
                                                <span className="text-[11px] text-slate-400 font-mono">
                                                    ISO TCF-SOP-ICT-04
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                                                <span>Smart Health Score & Audit Kelayakan</span>
                                            </h3>
                                            <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                                                {healthData?.assessment?.detailed_justification?.split('\n\n')[0] || 
                                                 'Evaluasi otomatis kelayakan teknis, arsitektur hardware, dan batas usia operasional menurut standar ICT ISO 9001:2015.'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Push to Budget */}
                                    <div className="shrink-0 flex flex-col items-end gap-2 w-full md:w-auto">
                                        {budgetSubmitted || healthData?.is_in_budget ? (
                                            <div className="px-4 py-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2 shadow-sm">
                                                <CheckCircle2 size={16} className="text-emerald-400" />
                                                <span>Terjadwal di Master Plan 2027</span>
                                            </div>
                                        ) : healthData?.assessment?.status !== 'COMPLIANT' && healthData?.assessment?.status !== 'NORMAL' ? (
                                            <button
                                                type="button"
                                                disabled={submittingBudget}
                                                onClick={handlePushToBudget}
                                                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/30 flex items-center gap-2 cursor-pointer w-full md:w-auto justify-center"
                                            >
                                                <Coins size={15} />
                                                <span>{submittingBudget ? 'Mendaftarkan...' : '⚡ Usulkan ke Anggaran 2027'}</span>
                                            </button>
                                        ) : (
                                            <div className="px-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-400 text-xs font-semibold flex items-center gap-1.5">
                                                <CheckCircle size={14} className="text-emerald-400" />
                                                <span>Perangkat Layak Pakai</span>
                                            </div>
                                        )}
                                        <span className="text-[10px] text-slate-400">
                                            {healthData?.assessment?.target_form ? `Target: Formulir ${healthData.assessment.target_form} (${healthData.assessment.category})` : 'Preventive Maintenance'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* 4 Pillars Compliance Grid */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                <h4 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                                    <Award size={16} className="text-blue-600" />
                                    <span>Audit 4 Pilar Standar Kepatuhan Hardware</span>
                                </h4>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Pillar 1: Usia */}
                                    <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/60">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                                <Clock size={14} className="text-slate-500" />
                                                <span>Usia Operasional (Lifecycle)</span>
                                            </span>
                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                                (healthData?.specs?.age || 0) < 5 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                            }`}>
                                                {(healthData?.specs?.age || 0) < 5 ? 'Lulus' : 'Kedaluwarsa'}
                                            </span>
                                        </div>
                                        <div className="text-base font-black text-slate-900 mb-1">
                                            {healthData?.specs?.age || 0} Tahun
                                            <span className="text-xs text-slate-500 font-normal ml-1">
                                                (Perolehan: {healthData?.specs?.purchaseYear || '-'} • Max 5 Thn)
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-600 leading-relaxed">
                                            {(healthData?.specs?.age || 0) < 5 
                                                ? 'Masih dalam batas aman masa pakai ekonomis.' 
                                                : 'Melebihi batas depresiasi ISO. Risiko kerusakan komponen motherboard & fan tinggi.'}
                                        </p>
                                    </div>

                                    {/* Pillar 2: RAM */}
                                    <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/60">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                                <MemoryStick size={14} className="text-slate-500" />
                                                <span>Kapasitas RAM</span>
                                            </span>
                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                                (healthData?.specs?.ramGb || 0) >= 8 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                            }`}>
                                                {(healthData?.specs?.ramGb || 0) >= 8 ? 'Lulus' : 'Di Bawah Standar'}
                                            </span>
                                        </div>
                                        <div className="text-base font-black text-slate-900 mb-1">
                                            {healthData?.specs?.ramGb || 0} GB
                                            <span className="text-xs text-slate-500 font-normal ml-1">
                                                (Min. Standar: 8 GB DDR4)
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-600 leading-relaxed">
                                            {(healthData?.specs?.ramGb || 0) >= 8 
                                                ? 'Memadai untuk multitasking OS & ERP Adempiere.' 
                                                : 'Kapasitas RAM rendah memicu disk swapping & keluhan PC lemot.'}
                                        </p>
                                    </div>

                                    {/* Pillar 3: Processor */}
                                    <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/60">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                                <Cpu size={14} className="text-slate-500" />
                                                <span>Arsitektur Processor</span>
                                            </span>
                                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                                Terverifikasi
                                            </span>
                                        </div>
                                        <div className="text-xs font-black text-slate-900 mb-1 font-mono truncate" title={healthData?.specs?.cpu || form.cpu}>
                                            {healthData?.specs?.cpu || form.cpu || 'Intel / AMD Processor'}
                                        </div>
                                        <p className="text-[11px] text-slate-600 leading-relaxed">
                                            Kompatibilitas instruksi 64-bit dan kestabilan clock speed komputasi kantor.
                                        </p>
                                    </div>

                                    {/* Pillar 4: Storage */}
                                    <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/60">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                                <HardDrive size={14} className="text-slate-500" />
                                                <span>Media Penyimpanan (Storage)</span>
                                            </span>
                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                                healthData?.specs?.isSsd ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                            }`}>
                                                {healthData?.specs?.isSsd ? 'SSD Solid State' : 'HDD Mekanik'}
                                            </span>
                                        </div>
                                        <div className="text-base font-black text-slate-900 mb-1">
                                            {healthData?.specs?.isSsd ? 'SSD High-Speed' : 'HDD Tradisional'}
                                        </div>
                                        <p className="text-[11px] text-slate-600 leading-relaxed">
                                            {healthData?.specs?.isSsd 
                                                ? 'Bebas dari bottleneck 100% Disk Usage.' 
                                                : 'Wajib migrasi ke SSD 256GB/512GB untuk mencegah IO bottleneck.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Recommendation & Cost Estimate Card */}
                            {healthData?.assessment && (
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                    <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
                                        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                            <TrendingUp size={16} className="text-indigo-600" />
                                            <span>Rekomendasi Pembiayaan & Anggaran Tahun 2027</span>
                                        </h4>
                                        {healthData.assessment.estimated_cost > 0 && (
                                            <span className="text-sm font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                                                Est. Biaya: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(healthData.assessment.estimated_cost)}
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                                            <Sparkles size={18} className="text-amber-500 shrink-0 mt-0.5" />
                                            <div>
                                                <div className="text-xs font-bold text-slate-800">
                                                    {healthData.assessment.recommendation || 'Perawatan Preventif Rutin'}
                                                </div>
                                                <div className="text-[11px] text-slate-500 mt-0.5">
                                                    {healthData.assessment.standard_rule || 'Klausul Standar ISO 9001:2015'}
                                                </div>
                                            </div>
                                        </div>

                                        {healthData.assessment.detailed_justification && (
                                            <div className="text-xs text-slate-700 bg-slate-50/50 p-4 rounded-xl border border-slate-100 whitespace-pre-line leading-relaxed font-sans">
                                                {healthData.assessment.detailed_justification}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
