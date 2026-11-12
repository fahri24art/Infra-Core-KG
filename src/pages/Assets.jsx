import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
    Plus, Search, Filter, Monitor, Printer, Server, Wifi,
    Smartphone, HardDrive, Cpu, Activity, AlertCircle,
    FileText, X, CheckCircle, Clock, RefreshCw, User,
    ChevronLeft, ChevronRight, ChevronDown,
    Download, Zap, Terminal as TerminalIcon, Shield, Globe, ShieldCheck, ArrowUpRight, ArrowUpCircle, MonitorPlay, QrCode, Upload, Columns, ShieldAlert, Lock, Unlock
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoTCF from '../assets/Logo_TCF_Sec_Processed.png';
import QRCode from 'qrcode';
import Swal from 'sweetalert2';
import AssetSidebar from '../components/AssetSidebar';
import RemoteDesktop from '../components/RemoteDesktop';
import UserDetailModal from '../components/UserDetailModal';
import STOManager from '../components/STOManager';
import AssetDetailDrawer from '../components/AssetDetailDrawer';
import AssetUpgradeModal from '../components/AssetUpgradeModal';

export default function Assets() {
    const [assets, setAssets] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [quickFilter, setQuickFilter] = useState('all'); // 'all', 'threats', 'capex', 'opex', 'compliant', 'online'

    const calculateHealthScore = (asset) => {
        try {
            if (!asset) return { score: 100, grade: 'A', category: 'NORMAL', age: 0, ramGb: 8, isSsd: true };
            const specs = getSpecs(asset) || {};
            let ramGb = 8;
            if (specs.ram_gb) ramGb = parseFloat(specs.ram_gb) || 8;
            else if (specs.ram) {
                const m = String(specs.ram).match(/(\d+(?:\.\d+)?)\s*(?:GB|Gb|G)/i);
                if (m) ramGb = parseFloat(m[1]) || 8;
            }
            
            let purchaseYear = 2023;
            if (asset.purchase_date) {
                const yr = new Date(asset.purchase_date).getFullYear();
                if (!isNaN(yr) && yr > 2000) purchaseYear = yr;
            } else if (specs.purchaseYear || specs.purchase_year) {
                purchaseYear = parseInt(specs.purchaseYear || specs.purchase_year) || 2023;
            }
            const currentYear = new Date().getFullYear();
            const age = Math.max(0, currentYear - purchaseYear);
            
            let storStr = '';
            if (typeof specs.storage_summary === 'string') storStr = specs.storage_summary;
            else if (typeof specs.storage_info === 'string') storStr = specs.storage_info;
            else if (typeof specs.storage === 'string') storStr = specs.storage;
            else if (Array.isArray(specs.storage)) storStr = JSON.stringify(specs.storage);
            else if (specs.storage && typeof specs.storage === 'object') storStr = JSON.stringify(specs.storage);
            storStr = storStr.toLowerCase();

            const isSsd = !!(specs.isSsd || specs.is_ssd || specs.has_ssd || storStr.includes('ssd') || storStr.includes('nvme'));
            
            let cpuStr = '';
            if (typeof specs.cpu === 'string') cpuStr = specs.cpu;
            else if (specs.cpu && typeof specs.cpu === 'object') cpuStr = specs.cpu.name || JSON.stringify(specs.cpu);
            else if (typeof specs.processor === 'string') cpuStr = specs.processor;
            cpuStr = cpuStr.toLowerCase();

            const isOldCpu = cpuStr.includes('celeron') || cpuStr.includes('pentium') || cpuStr.includes('i3-3') || cpuStr.includes('i3-4') || cpuStr.includes('i3-6');

            let score = 100;
            if (age >= 5) score -= 30;
            else if (age >= 4) score -= 15;

            if (ramGb < 8) score -= 25;
            if (!isSsd) score -= 20;
            if (isOldCpu) score -= 25;

            if (score < 15) score = 15;
            if (score > 100) score = 100;

            let grade = 'A';
            if (score < 50) grade = 'D';
            else if (score < 70) grade = 'C';
            else if (score < 85) grade = 'B';

            let category = 'NORMAL';
            if (age >= 5 || isOldCpu) category = 'CAPEX';
            else if (ramGb < 8 || !isSsd) category = 'OPEX';

            return { score, grade, age, ramGb, isSsd, category };
        } catch (err) {
            return { score: 100, grade: 'A', category: 'NORMAL', age: 0, ramGb: 8, isSsd: true };
        }
    };

    const handleQuickRemediation = async (asset, e) => {
        if (e) e.stopPropagation();
        const { value: chosenAction } = await Swal.fire({
            title: `Aksi Kilat: ${asset.name}`,
            html: `<div class="text-xs text-slate-500 mb-2">Pilih perintah darurat via Agent V30.0 untuk perangkat <b>${asset.name}</b> (${asset.ip_address || 'Online'})</div>`,
            input: 'radio',
            inputOptions: {
                'quick_scan': '🛡️ Windows Defender Quick Scan (Cek Virus)',
                'usb_lock_now': '🔒 Kunci Port USB Flashdisk (Triple-Lock)',
                'usb_unlock_temp': '🔓 Buka Port USB Flashdisk Sementara (1 Jam)',
                'restart_rustdesk': '🔄 Restart Servis RustDesk Local Relay',
                'resync': '⚡ Paksa Resync Spesifikasi & Heartbeat'
            },
            inputValue: 'quick_scan',
            showCancelButton: true,
            confirmButtonText: 'Kirim Perintah',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#2563EB',
            cancelButtonColor: '#64748B'
        });

        if (chosenAction) {
            Swal.fire({
                title: 'Mengirim Perintah...',
                text: 'Mengantrekan perintah ke Agent V30.0...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });
            try {
                const org = sessionStorage.getItem('organization') || 'TCF-SG';
                const res = await fetch(`/api/network/agents/${asset.id}/action`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-organization': org },
                    body: JSON.stringify({ action: chosenAction })
                });
                const data = await res.json();
                if (res.ok) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Perintah Berhasil Dikirim!',
                        html: `<div class="text-xs text-slate-600">${data.message || 'Perintah telah dimasukkan ke antrean Agent.'}</div>`,
                        timer: 2500,
                        showConfirmButton: false
                    });
                } else {
                    Swal.fire('Gagal', data.error || 'Terjadi kesalahan saat mengirim perintah.', 'error');
                }
            } catch (err) {
                Swal.fire('Error', err.message, 'error');
            }
        }
    };
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    const fileInputRef = useRef(null);

    const handleOfflineUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                // Prompt for organization
                const { value: org } = await Swal.fire({
                    title: 'Pilih Lokasi Perangkat',
                    input: 'radio',
                    inputOptions: {
                        'TCFSG': 'Sunter (SG)',
                        'TCFKG': 'Karanggan (KG)'
                    },
                    inputValidator: (value) => {
                        if (!value) return 'Anda harus memilih lokasi!';
                    }
                });

                if (org) {
                    const response = await fetch('/api/network/agents/register', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-organization': org
                        },
                        body: JSON.stringify(data)
                    });

                    if (response.ok) {
                        Swal.fire('Berhasil!', 'Data agen offline berhasil diimpor.', 'success').then(() => {
                            window.location.reload();
                        });
                    } else {
                        Swal.fire('Gagal!', 'Gagal menyimpan data.', 'error');
                    }
                }
            } catch (err) {
                Swal.fire('Error!', 'File JSON tidak valid.', 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = null; // Reset input
    };


    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(() => {
        try {
            const saved = localStorage.getItem('power_asset_items_per_page');
            return saved ? parseInt(saved, 10) : 10;
        } catch(e) { return 10; }
    });

    const handleItemsPerPageChange = (newLimit) => {
        setItemsPerPage(newLimit);
        setCurrentPage(1);
        try {
            localStorage.setItem('power_asset_items_per_page', newLimit.toString());
        } catch(e) {}
    };

    // Sorting State
    const [sortConfig, setSortConfig] = useState({ key: 'last_agent_sync', direction: 'desc' });

    // Columns State
    const ALL_COLUMNS = [
        { key: 'inventory_number', label: 'Asset ID' },
        { key: 'health_score', label: 'Health' },
        { key: 'security', label: 'Security' },
        { key: 'status', label: 'Status' },
        { key: 'category', label: 'Type' },
        { key: 'manufacturer', label: 'Brand' },
        { key: 'model', label: 'Model' },
        { key: 'os', label: 'OS' },
        { key: 'processor', label: 'CPU' },
        { key: 'memory', label: 'RAM (GB)' },
        { key: 'storage', label: 'Storage' },
        { key: 'location', label: 'Location' },
        { key: 'serial_number', label: 'Serial No.' },
        { key: 'user', label: 'User' },
        { key: 'user_department', label: 'Department' },
        { key: 'windows_login', label: 'PC Login' },
        { key: 'last_agent_sync', label: 'Last Sync' }
    ];
    
    const defaultCols = ['inventory_number', 'health_score', 'security', 'user', 'user_department', 'last_agent_sync', 'category', 'model'];
    const [visibleColumns, setVisibleColumns] = useState(() => {
        try {
            const saved = localStorage.getItem('power_asset_visible_cols');
            return saved ? JSON.parse(saved) : defaultCols;
        } catch(e) { return defaultCols; }
    });
    const [showColumnToggles, setShowColumnToggles] = useState(false);

    const toggleColumn = (key) => {
        setVisibleColumns(prev => {
            const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
            localStorage.setItem('power_asset_visible_cols', JSON.stringify(next));
            return next;
        });
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.columns-dropdown')) {
                setShowColumnToggles(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        localStorage.setItem('power_asset_visible_cols', JSON.stringify(visibleColumns));
    }, [visibleColumns]);

    // Modal State for Quick Ticket
    const [showTicketModal, setShowTicketModal] = useState(false);
    const [selectedAssetForTicket, setSelectedAssetForTicket] = useState(null);
    const [ticketSubject, setTicketSubject] = useState('');
    const [ticketDesc, setTicketDesc] = useState('');
    
    // User Detail Modal State
    const [selectedUserDetail, setSelectedUserDetail] = useState(null);
    const [selectedAssetForDrawer, setSelectedAssetForDrawer] = useState(null);

    // Upgrade Request Modal State
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [selectedAssetForUpgrade, setSelectedAssetForUpgrade] = useState(null);

    let currentUser = null;
    try {
        const stored = sessionStorage.getItem('user');
        if (stored) currentUser = JSON.parse(stored);
    } catch (e) {
        console.error("Failed to parse user from localStorage", e);
    }

    const category = searchParams.get('category');
    const type = searchParams.get('type');
    const tab = searchParams.get('tab') || 'fleet';

    // Agent / Node Control State
    const [agentDevices, setAgentDevices] = useState([]);
    const [agentLoading, setAgentLoading] = useState(true);
    const [agentSearchTerm, setAgentSearchTerm] = useState('');
    const [showAgentRemote, setShowAgentRemote] = useState(false);
    const [activeAgentSession, setActiveAgentSession] = useState(null);

    const handleTabChange = (newTab) => {
        const params = new URLSearchParams(searchParams);
        params.set('tab', newTab);
        setSearchParams(params);
    };

    const fetchAgents = async () => {
        try {
            const org = sessionStorage.getItem('organization') || 'TCF-SG';
            const res = await fetch(`/api/network/agents?organization=${org}`, {
                headers: { 'x-organization': org }
            });
            const data = await res.json();
            setAgentDevices(Array.isArray(data) ? data : []);
            setAgentLoading(false);
        } catch (err) {
            console.error('Failed to fetch agents', err);
            setAgentLoading(false);
        }
    };

    const isAgentOnline = (device) => {
        if (!device.last_agent_sync) return false;
        const now = new Date().getTime();
        const lastSync = new Date(device.last_agent_sync).getTime();
        const diffMinutes = (now - lastSync) / 1000 / 60;
        return diffMinutes <= 10; // Consider online if heartbeat was within the last 10 minutes
    };

    const filteredAgents = agentDevices
        .filter(d => {
            const matchesSearch = (d.hostname || d.name || '').toLowerCase().includes(agentSearchTerm.toLowerCase()) ||
                                  (d.ip_address || '').includes(agentSearchTerm);
            return matchesSearch;
        })
        .sort((a, b) => {
            const aOnline = isAgentOnline(a) ? 1 : 0;
            const bOnline = isAgentOnline(b) ? 1 : 0;
            if (aOnline !== bOnline) return bOnline - aOnline;
            const aTime = a.last_agent_sync ? new Date(a.last_agent_sync).getTime() : 0;
            const bTime = b.last_agent_sync ? new Date(b.last_agent_sync).getTime() : 0;
            return bTime - aTime;
        });

    useEffect(() => {
        if (tab !== 'agent') return;
        fetchAgents();
        const interval = setInterval(fetchAgents, 30000); // Changed from 5000 to 30000 (30 seconds)
        return () => clearInterval(interval);
    }, [tab]);

    const activeOrg = sessionStorage.getItem('organization') || 'TCF-SG';

    useEffect(() => {
        fetchData();
    }, [category, type, activeOrg]);

    // Reset pagination when filter or search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [category, type, searchTerm]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const org = sessionStorage.getItem('organization') || 'TCF-SG';
            // UPDATED PATHS: added /network prefix and organization param/header
            const [assetsRes, ticketsRes] = await Promise.all([
                fetch(`/api/network/assets?organization=${org}`, {
                    headers: { 'x-organization': org }
                }),
                fetch(`/api/network/tickets?organization=${org}`, {
                    headers: { 'x-organization': org }
                })
            ]);

            const assetsData = await assetsRes.json();
            const ticketsData = await ticketsRes.json();

            setAssets(Array.isArray(assetsData) ? assetsData : []);
            setTickets(Array.isArray(ticketsData) ? ticketsData : []);
            setLoading(false);
        } catch (err) {
            console.error('Failed to fetch data', err);
            setLoading(false);
        }
    };

    const handleTypeChange = (newType) => {
        const params = new URLSearchParams(searchParams);
        if (newType === 'All') {
            params.delete('type');
        } else {
            params.set('type', newType);
        }
        setSearchParams(params);
    };

    // --- Helpers ---
    const getIcon = (category, type) => {
        const cat = (category || '').toLowerCase();
        const typ = (type || '').toLowerCase();

        if (cat.includes('printer')) return <Printer size={20} />;
        if (cat.includes('phone') || typ.includes('mobile')) return <Smartphone size={20} />;
        if (cat.includes('monitor')) return <Monitor size={20} />; // Specific monitor icon if distinct from desktop
        if (typ.includes('laptop')) return <Cpu size={20} />; // Or a Laptop icon if available, using Cpu for now or generic
        if (cat.includes('server')) return <Server size={20} />;
        if (cat.includes('network')) return <Wifi size={20} />;
        return <HardDrive size={20} />; // Default for Desktop
    };

    const getOpenTicketCount = (assetId) => {
        if (!assetId || !Array.isArray(tickets)) return 0;
        return tickets.filter(t => t && t.asset_id === assetId && t.status !== 'Closed' && t.status !== 'Resolved').length;
    };

    const getTicketUser = (assetId) => {
        if (!assetId || !Array.isArray(tickets)) return null;
        const ticket = tickets.find(t => t.asset_id === assetId && t.status !== 'Closed' && t.status !== 'Resolved');
        return ticket ? ticket.user_name : null;
    };

    const getSpecs = (asset) => {
        try {
            if (typeof asset.specs === 'object' && asset.specs !== null) return asset.specs;
            if (typeof asset.specs === 'string' && asset.specs.trim().startsWith('{')) return JSON.parse(asset.specs);
            return {};
        } catch (e) { return {}; }
    };

    // --- Create Ticket Logic ---
    const openTicketModal = (asset) => {
        setSelectedAssetForTicket(asset);
        setTicketSubject(`Issue with ${asset.name}`);
        setShowTicketModal(true);
    };

    const handleCreateTicket = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/network/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: ticketSubject,
                    description: ticketDesc,
                    priority: 'Medium',
                    asset_id: selectedAssetForTicket.id,
                    user_id: currentUser?.id || 1,
                    email: currentUser?.email || 'admin@example.com'
                })
            });

            if (res.ok) {
                alert('Ticket created successfully!');
                setShowTicketModal(false);
                setTicketDesc('');
                fetchData(); // Refresh counts
            } else {
                alert('Failed to create ticket.');
            }
        } catch (err) {
            console.error(err);
            alert('Error creating ticket.');
        }
    };

    // --- Quick Status Update Logic ---
    const handleStatusChange = async (e, asset, newStatus) => {
        e.stopPropagation();
        if (asset.status === newStatus) return;
        try {
            const res = await fetch(`/api/network/assets/${asset.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...asset, status: newStatus })
            });
            if (res.ok) {
                fetchData();
            } else {
                alert('Failed to update status');
            }
        } catch (err) {
            console.error('Error updating status', err);
            alert('Error updating status');
        }
    };

    // --- Filtering ---
    const isTypeMatch = (asset, targetType) => {
        if (!asset) return false;
        if (!targetType || targetType === 'All') return true;

        const cat = String(asset.category || '').toLowerCase().trim();
        const typ = String(asset.type || '').toLowerCase().trim();
        const t = String(targetType).toLowerCase().trim();

        if (t === 'desktop') {
            return ['desktop', 'pc', 'personal computer'].includes(cat) || 
                   ['desktop', 'pc'].includes(typ) ||
                   (cat === 'computer' && typ !== 'laptop' && typ !== 'notebook');
        }
        if (t === 'laptop') {
            return ['laptop', 'notebook'].includes(cat) || ['laptop', 'notebook'].includes(typ);
        }
        if (t === 'printer') {
            return cat.includes('printer') || typ.includes('printer');
        }
        if (t === 'monitor') {
            return cat.includes('monitor') || typ.includes('monitor');
        }
        if (t === 'mobile' || t === 'phone') {
            return ['mobile', 'phone', 'smartphone'].includes(cat) || ['mobile', 'phone', 'smartphone'].includes(typ);
        }
        if (t === 'server') {
            return cat.includes('server') || typ.includes('server');
        }
        if (t === 'cctv') {
            return cat.includes('cctv') || typ.includes('cctv') || cat.includes('camera');
        }
        return cat === t || typ === t;
    };

    const assetsArray = Array.isArray(assets) ? assets : [];

    // Triage Counts
    const triageCounts = React.useMemo(() => {
        let threats = 0;
        let capex = 0;
        let opex = 0;
        let compliant = 0;
        let online = 0;

        for (const a of assetsArray) {
            if (parseInt(a.threats_found || 0) > 0) threats++;
            if (a.agent_status === 'Online') online++;
            const h = calculateHealthScore(a);
            if (h.category === 'CAPEX') capex++;
            else if (h.category === 'OPEX') opex++;
            else compliant++;
        }

        return { all: assetsArray.length, threats, capex, opex, compliant, online };
    }, [assetsArray]);

    const filteredAssets = assetsArray.filter(asset => {
        if (!asset) return false;

        // Quick Triage Filter
        if (quickFilter === 'threats') {
            if (parseInt(asset.threats_found || 0) <= 0) return false;
        } else if (quickFilter === 'capex') {
            if (calculateHealthScore(asset).category !== 'CAPEX') return false;
        } else if (quickFilter === 'opex') {
            if (calculateHealthScore(asset).category !== 'OPEX') return false;
        } else if (quickFilter === 'compliant') {
            if (calculateHealthScore(asset).category !== 'NORMAL') return false;
        } else if (quickFilter === 'online') {
            if (asset.agent_status !== 'Online') return false;
        }
        if (!asset) return false;
        if (category && !String(asset.category || '').toLowerCase().includes(category.toLowerCase())) return false;
        if (type && !isTypeMatch(asset, type)) return false;
        const search = searchTerm.toLowerCase();
        return (
            String(asset.name || '').toLowerCase().includes(search) ||
            String(asset.serial_number || '').toLowerCase().includes(search) ||
            String(asset.inventory_number || '').toLowerCase().includes(search) ||
            String(asset.location || '').toLowerCase().includes(search) ||
            String(asset.contact || '').toLowerCase().includes(search) ||
            String(asset.user_name || '').toLowerCase().includes(search) ||
            String(asset.user_department || asset.department || '').toLowerCase().includes(search) ||
            String(asset.windows_login || '').toLowerCase().includes(search) ||
            String(asset.o365_account || '').toLowerCase().includes(search) ||
            String(asset.network_name || '').toLowerCase().includes(search) ||
            String(asset.status || '').toLowerCase().includes(search) ||
            String(asset.manufacturer || '').toLowerCase().includes(search) ||
            String(asset.model || '').toLowerCase().includes(search)
        );
    });

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedAssets = [...filteredAssets].sort((a, b) => {
        if (!sortConfig.key) return 0;
        
        let aValue = a[sortConfig.key] || '';
        let bValue = b[sortConfig.key] || '';

        // Special handling for user (could be user_name or contact)
        if (sortConfig.key === 'user') {
            aValue = a.user_name || a.contact || '';
            bValue = b.user_name || b.contact || '';
        }

        if (sortConfig.key === 'user_department') {
            aValue = a.user_department || a.department || '';
            bValue = b.user_department || b.department || '';
        }

        // Special handling for dates
        if (['last_agent_sync', 'updated_at'].includes(sortConfig.key)) {
            aValue = aValue ? new Date(aValue).getTime() : 0;
            bValue = bValue ? new Date(bValue).getTime() : 0;
        }

        if (aValue < bValue) {
            return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
            return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });

    // --- Pagination Calculation ---
    const totalPages = Math.ceil(sortedAssets.length / itemsPerPage);
    const paginatedAssets = sortedAssets.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // --- Statistics ---
    const stats = {
        total: filteredAssets.length,
        online: filteredAssets.filter(a => a.agent_status === 'Online').length,
        issues: filteredAssets.filter(a => getOpenTicketCount(a.id) > 0).length,
        maintenance: filteredAssets.filter(a => a.status === 'In Repair' || a.status === 'In Maintenance').length
    };

    // --- PDF Generation ---
    const generateBulkLabelsPDF = async () => {
        try {
            const doc = new jsPDF('landscape', 'mm', 'a4');
            const labelWidth = 66;
            const labelHeight = 35;
            const marginX = 10.5;
            const marginY = 11.5;
            const spacingX = 4;
            const spacingY = 4;
            const cols = 4;
            const rows = 5;
            const labelsPerPage = cols * rows;

            for (let i = 0; i < filteredAssets.length; i++) {
                const asset = filteredAssets[i];
                const pageIndex = Math.floor(i / labelsPerPage);
                const posOnPage = i % labelsPerPage;

                if (posOnPage === 0 && pageIndex > 0) {
                    doc.addPage();
                }

                // If this is the first label on the page, draw the cutting guides
                if (posOnPage === 0) {
                    doc.setLineDash([2, 2], 0);
                    doc.setDrawColor(180, 180, 180);
                    doc.setLineWidth(0.2);
                    
                    // Vertical cuts
                    for (let c = 1; c < cols; c++) {
                        const cutX = marginX + (c * labelWidth) + ((c - 1) * spacingX) + (spacingX / 2);
                        doc.line(cutX, 0, cutX, 210);
                    }
                    
                    // Horizontal cuts
                    for (let r = 1; r < rows; r++) {
                        const cutY = marginY + (r * labelHeight) + ((r - 1) * spacingY) + (spacingY / 2);
                        doc.line(0, cutY, 297, cutY);
                    }
                    doc.setLineDash([]); // Reset to solid
                }

                const col = posOnPage % cols;
                const row = Math.floor(posOnPage / cols);
                const x = marginX + (col * (labelWidth + spacingX));
                const y = marginY + (row * (labelHeight + spacingY));

                // Draw Label Box (Thick Dark Blue)
                doc.setDrawColor(30, 41, 59); // Slate 800
                doc.setLineWidth(0.8);
                doc.rect(x, y, labelWidth, labelHeight);

                // Content Left
                doc.setFontSize(6);
                doc.setTextColor(148, 163, 184);
                doc.setFont("helvetica", "bold");
                doc.text("PROPERTY OF", x + 3, y + 6);

                doc.setFontSize(6.5);
                doc.setTextColor(30, 41, 59);
                doc.setFont("helvetica", "bold");
                doc.text("PT. TRI CENTRUM FORTUNA", x + 3, y + 10);

                doc.setFontSize(6);
                doc.setTextColor(51, 65, 85);
                doc.text((asset.name || 'Unknown').substring(0, 24), x + 3, y + 15);

                // Divider Line
                doc.setLineWidth(0.2);
                doc.setDrawColor(226, 232, 240);
                doc.line(x + 3, y + 18, x + labelWidth - 26, y + 18);

                // Metadata Rows
                const startMetaY = y + 23;
                
                doc.setFontSize(5.5);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(148, 163, 184);
                doc.text("ID:", x + 3, startMetaY);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(30, 41, 59);
                const idText = asset.inventory_number || asset.serial_number || `AST-${asset.id}`;
                doc.text(idText.substring(0, 23), x + 10, startMetaY);

                doc.setFont("helvetica", "normal");
                doc.setTextColor(148, 163, 184);
                doc.text("Type:", x + 3, startMetaY + 4);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(30, 41, 59);
                doc.text((asset.category || '').substring(0, 18), x + 10, startMetaY + 4);

                doc.setFont("helvetica", "normal");
                doc.setTextColor(148, 163, 184);
                doc.text("Brand:", x + 3, startMetaY + 8);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(30, 41, 59);
                const brandStr = [asset.manufacturer, asset.model].filter(Boolean).join(' ');
                doc.text(brandStr.substring(0, 24), x + 10, startMetaY + 8);

                // Content Right (QR Code)
                try {
                    const qrUrl = `${window.location.origin}/ict/assets/${asset.id}`;
                    const qrDataUrl = await QRCode.toDataURL(qrUrl, { errorCorrectionLevel: 'M', margin: 1 });
                    doc.addImage(qrDataUrl, 'PNG', x + labelWidth - 25, y + 6, 22, 22);
                    
                    let orgStr = 'TCF-SG';
                    if (idText.startsWith('TCFKG')) orgStr = 'TCF-KG';
                    
                    doc.setFontSize(6);
                    doc.setTextColor(100, 116, 139); // Slate 500
                    doc.setFont("helvetica", "bold");
                    doc.text(orgStr, x + labelWidth - 14, y + 30, { align: 'center' });
                } catch(e) { console.error("QR Error", e); }
            }
            window.open(doc.output('bloburl'), '_blank');
        } catch (e) {
            console.error(e);
            alert("Error generating labels");
        }
    };

    const generateDevicePassPDF = async () => {
        try {
            const doc = new jsPDF('portrait', 'mm', 'a4');
            const cardWidth = 55;
            const cardHeight = 90;
            const marginX = 15;
            const marginY = 13.5;
            const spacingX = 10;
            const spacingY = 5;
            const cols = 3;
            const rows = 3;
            const cardsPerPage = cols * rows;

            const img = new Image();
            img.src = logoTCF;
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });

            for (let i = 0; i < filteredAssets.length; i++) {
                const asset = filteredAssets[i];
                const pageIndex = Math.floor(i / cardsPerPage);
                const posOnPage = i % cardsPerPage;

                if (posOnPage === 0 && pageIndex > 0) {
                    doc.addPage();
                }

                if (posOnPage === 0) {
                    doc.setLineDash([2, 2], 0);
                    doc.setDrawColor(200, 200, 200);
                    doc.setLineWidth(0.2);
                    
                    for (let c = 0; c <= cols; c++) {
                        const cutX = marginX + (c * cardWidth) + (c * spacingX) - (spacingX / 2);
                        doc.line(cutX, 0, cutX, 297);
                    }
                    
                    for (let r = 0; r <= rows; r++) {
                        const cutY = marginY + (r * cardHeight) + (r * spacingY) - (spacingY / 2);
                        doc.line(0, cutY, 210, cutY);
                    }
                    doc.setLineDash([]);
                }

                const col = posOnPage % cols;
                const row = Math.floor(posOnPage / cols);
                const x = marginX + (col * (cardWidth + spacingX));
                const y = marginY + (row * (cardHeight + spacingY));

                doc.setDrawColor(220, 220, 220);
                doc.setLineWidth(0.3);
                doc.rect(x, y, cardWidth, cardHeight);

                doc.setFillColor(207, 168, 102);
                doc.triangle(x, y, x + 35, y, x, y + 15, 'F');
                doc.setFillColor(19, 81, 73);
                doc.triangle(x, y, x + 25, y, x, y + 10, 'F');

                doc.setFillColor(207, 168, 102);
                doc.triangle(x + cardWidth, y + cardHeight, x + cardWidth - 35, y + cardHeight, x + cardWidth, y + cardHeight - 15, 'F');
                doc.setFillColor(19, 81, 73);
                doc.triangle(x + cardWidth, y + cardHeight, x + cardWidth - 25, y + cardHeight, x + cardWidth, y + cardHeight - 10, 'F');

                try {
                    doc.addImage(img, 'PNG', x + 19, y + 5, 17, 15);
                } catch(e) {}

                doc.setFont("helvetica", "bold");
                doc.setFontSize(12);
                doc.setTextColor(19, 81, 73);
                const title = "DEVICE PASS";
                const titleWidth = doc.getTextWidth(title);
                doc.text(title, x + (cardWidth - titleWidth) / 2, y + 26);

                let userName = asset.user_name || asset.contact || 'UNASSIGNED';
                if (userName.length > 20) userName = userName.substring(0, 18) + '...';
                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                const userWidth = doc.getTextWidth(userName.toUpperCase());
                doc.text(userName.toUpperCase(), x + (cardWidth - userWidth) / 2, y + 32);

                let deptName = asset.user_department || 'General';
                if (deptName.length > 25) deptName = deptName.substring(0, 23) + '...';
                doc.setFontSize(8);
                const deptWidth = doc.getTextWidth(deptName.toUpperCase());
                doc.text(deptName.toUpperCase(), x + (cardWidth - deptWidth) / 2, y + 36);

                try {
                    const qrDataUrl = await QRCode.toDataURL(asset.inventory_number || asset.serial_number || asset.id.toString(), {
                        width: 100,
                        margin: 1,
                        color: {
                            dark: '#000000',
                            light: '#ffffff'
                        }
                    });
                    doc.addImage(qrDataUrl, 'PNG', x + 10, y + 40, 35, 35);
                } catch (err) {
                    console.error("QR Code Error:", err);
                }

                doc.setFont("helvetica", "italic");
                doc.setFontSize(6);
                const details = [
                    `Aset Name: ${asset.category || asset.type || 'N/A'}`,
                    `Device Name: ${asset.name || 'N/A'}`,
                    `Serial No. : ${asset.serial_number || 'N/A'}`,
                    `Aset Code : ${asset.inventory_number || 'N/A'}`
                ];

                let currentY = y + 78;
                details.forEach(detail => {
                    const dWidth = doc.getTextWidth(detail);
                    doc.text(detail, x + (cardWidth - dWidth) / 2, currentY);
                    currentY += 2.5;
                });
            }

            if (filteredAssets.length > 0) {
                const dateStr = new Date().toISOString().split('T')[0];
                doc.save(`Device_Passes_${dateStr}.pdf`);
            } else {
                alert('No assets found to print.');
            }
        } catch (error) {
            console.error("Failed to generate Device Passes", error);
            alert('Failed to generate PDF.');
        }
    };

    const generateAssetListPDF = async () => {
        try {
            const doc = new jsPDF('landscape');
            const img = new Image();

        img.onload = () => {
            try {
                doc.addImage(img, 'PNG', 14, 10, 26, 23);
            } catch(e) { console.error("Logo load failed", e); }

            // Header
            doc.setFontSize(10);
            doc.text("PT. TRI CENTRUM FORTUNA", 14, 38);
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text("ASSET LIST / DAFTAR INVENTARIS", 14, 45);
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.text("No. Dokumen: TCFSG-FM-ICT-02-01", 220, 38);
            doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString()}`, 220, 43);
            doc.text(`Filter: ${category || 'All Categories'} | ${type || 'All Types'}`, 14, 52);

            doc.setLineWidth(0.5);
            doc.line(14, 55, 283, 55);

            // Table
            const tableBody = filteredAssets.map((asset, index) => [
                index + 1,
                asset.inventory_number || '-',
                asset.vm_code ? `VM-${asset.vm_code}` : '-',
                asset.name,
                asset.server_purpose || asset.category,
                asset.location || '-',
                asset.user_name || asset.contact || '-',
                asset.status
            ]);

            autoTable(doc, {
                startY: 63,
                head: [['No', 'Inventaris ID', 'VM Code', 'Nama Asset', 'Kategori / Tujuan', 'Lokasi', 'Pengguna / PIC', 'Status']],
                body: tableBody,
                headStyles: { fillColor: [40, 40, 40] },
                styles: { fontSize: 8 }
            });

            // Footer Signatures
            const finalY = doc.lastAutoTable.finalY || 150;
            doc.setFontSize(8);

            doc.text("Dibuat Oleh,", 14, finalY + 15);
            doc.text("Diketahui Oleh,", 140, finalY + 15);

            doc.text("( IT Staff )", 14, finalY + 35);
            doc.text("( IT Manager / Dept Head )", 140, finalY + 35);

            window.open(doc.output('bloburl'), '_blank');
        };
        img.onerror = () => {
            // Fallback if image fails to load
            doc.setFontSize(10);
            doc.text("PT. TRI CENTRUM FORTUNA", 14, 38);
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text("ASSET LIST / DAFTAR INVENTARIS", 14, 45);
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.text("No. Dokumen: TCFSG-FM-ICT-02-01", 220, 38);
            doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString()}`, 220, 43);
            doc.text(`Filter: ${category || 'All Categories'} | ${type || 'All Types'}`, 14, 52);

            doc.setLineWidth(0.5);
            doc.line(14, 55, 283, 55);

            const tableBody = filteredAssets.map((asset, index) => [
                index + 1,
                asset.inventory_number || '-',
                asset.vm_code ? `VM-${asset.vm_code}` : '-',
                asset.name,
                asset.server_purpose || asset.category,
                asset.location || '-',
                asset.user_name || asset.contact || '-',
                asset.status
            ]);

            autoTable(doc, {
                startY: 63,
                head: [['No', 'Inventaris ID', 'VM Code', 'Nama Asset', 'Kategori / Tujuan', 'Lokasi', 'Pengguna / PIC', 'Status']],
                body: tableBody,
                headStyles: { fillColor: [40, 40, 40] },
                styles: { fontSize: 8 }
            });

            const finalY = doc.lastAutoTable.finalY || 150;
            doc.setFontSize(8);

            doc.text("Dibuat Oleh,", 14, finalY + 15);
            doc.text("Diketahui Oleh,", 140, finalY + 15);

            doc.text("( IT Staff )", 14, finalY + 35);
            doc.text("( IT Manager / Dept Head )", 140, finalY + 35);
            window.open(doc.output('bloburl'), '_blank');
        };

        img.src = logoTCF;
        } catch (error) {
            console.error('Failed to generate PDF:', error);
            alert('Error generating PDF.');
        }
    };




    if (showAgentRemote && activeAgentSession) {
        return <RemoteDesktop asset={activeAgentSession} onBack={() => setShowAgentRemote(false)} />;
    }

    const handleSadpScan = async () => {
        try {
            alert('Memulai proses SADP Discovery di jaringan... mohon tunggu sekitar 5-10 detik.');
            const res = await fetch('/api/network/cctv/sadp-scan');
            const data = await res.json();
            if (res.ok) {
                alert(`SADP Scan Selesai!\nKamera Ditemukan: ${data.devices.length}\nDitambahkan: ${data.inserted}\nDiperbarui: ${data.updated}`);
                fetchData(); // Refresh table
            } else {
                alert(`Error: ${data.error || 'Failed to scan SADP'}`);
            }
        } catch (err) {
            console.error('SADP scan error:', err);
            alert('Gagal melakukan scan SADP. Pastikan server Node.js terhubung ke jaringan CCTV.');
        }
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Premium Header & Title */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200/60 mb-4">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50/80 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 border border-blue-100/50">
                        <Activity size={12} className="animate-pulse" /> Live Fleet Sync
                    </div>
                    <h1 className="text-2xl font-bold text-[#172b4c] font-rubik tracking-tight">
                        {tab === 'agent' ? (
                            <>Agent <span className="text-blue-600">Control</span></>
                        ) : (
                            category ? `${category} Master Data` : 'Asset Master Data'
                        )}
                    </h1>
                    <p className="text-[#64748b] text-xs font-normal max-w-xl">
                        {tab === 'agent' 
                            ? 'Unified heartbeat monitoring and remote node control interface.'
                            : `Master asset management dan monitoring armada perangkat terhubung (${stats.total} devices).`}
                    </p>
                </div>
                
                {tab === 'fleet' ? (
                    <div className="flex flex-wrap items-center gap-2">
                        <button onClick={fetchData} className="p-2.5 bg-white border border-slate-200/60 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/50 shadow-sm transition-all active:scale-95 group">
                            <RefreshCw size={18} className={`transition-transform duration-500 ${loading ? 'animate-spin text-blue-600' : 'group-hover:rotate-180'}`} />
                        </button>
                        <button
                            onClick={generateAssetListPDF}
                            className="p-2.5 bg-white border border-slate-200/60 rounded-xl text-slate-400 hover:text-orange-600 hover:border-orange-200 hover:bg-orange-50/50 shadow-sm transition-all active:scale-95"
                            title="Print Asset List (03-01)"
                        >
                            <Printer size={18} />
                        </button>
                        <button
                            onClick={generateBulkLabelsPDF}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200/60 rounded-xl text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/50 shadow-sm transition-all active:scale-95 group"
                        >
                            <QrCode size={16} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                            <span className="text-[11px] font-bold uppercase tracking-wider hidden md:inline">Print Labels</span>
                        </button>
                        <button
                            onClick={generateDevicePassPDF}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200/60 rounded-xl text-slate-600 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50/50 shadow-sm transition-all active:scale-95 group"
                        >
                            <ShieldCheck size={16} className="text-slate-400 group-hover:text-emerald-600 transition-colors" />
                            <span className="text-[11px] font-bold uppercase tracking-wider hidden md:inline">Device Pass</span>
                        </button>
                        {/* GLPI Sync button removed as requested by user to prevent messing up clean asset data */}
                        {(!currentUser || currentUser.organization !== 'TCF-KG') && (
                            <button
                                onClick={async () => {
                                    if (!confirm("Sync VMs & Containers from Proxmox Cluster? This might take a moment.")) return;
                                    try {
                                        setLoading(true);
                                        const res = await fetch('/api/network/proxmox/sync', { method: 'POST' });
                                        if (res.ok) {
                                            alert('Proxmox Sync Successful!');
                                            fetchData();
                                        } else {
                                            const errData = await res.json();
                                            throw new Error(errData.error || 'Failed to sync');
                                        }
                                    } catch (e) {
                                        alert('Sync Failed: ' + e.message);
                                        setLoading(false);
                                    }
                                }}
                                className="bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl font-bold border border-slate-200/60 shadow-sm flex items-center transition-all active:scale-95 text-[11px] uppercase tracking-wider"
                            >
                                <Server size={16} className="mr-2 text-blue-600" />
                                Proxmox Sync
                            </button>
                        )}
                        <Link to="/ict/assets/new" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-500/25 flex items-center transition-all active:scale-95 text-[11px] uppercase tracking-wider">
                            <Plus size={16} className="mr-2" />
                            Add Asset
                        </Link>
                    </div>
                ) : (
                    <div className="flex items-center gap-4">
                        <button onClick={fetchAgents} className="p-2.5 bg-white border border-[#E1E1E1] rounded-xl text-slate-400 hover:text-blue-600 shadow-sm transition-all active:scale-95">
                            <RefreshCw size={20} className={agentLoading ? 'animate-spin' : ''} />
                        </button>
                        <div className="flex items-center gap-3 px-6 py-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
                            <Activity size={20} className="animate-pulse" />
                            <span className="text-xs font-black tracking-widest uppercase">{agentDevices.length} Nodes Connected</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Tabs moved to Sidebar dropdowns */}

            {tab === 'sto' ? (
                <div className="mt-4">
                    <STOManager />
                </div>
            ) : tab === 'fleet' ? (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <KPICard label="Total Fleet" value={stats.total} icon={HardDrive} color="blue" />
                        <KPICard label="Connected" value={stats.online} icon={Activity} color="emerald" />
                        <KPICard label="Alerts" value={stats.issues} icon={AlertCircle} color="rose" />
                        <KPICard label="In Service" value={stats.maintenance} icon={Cpu} color="amber" />
                    </div>

            {/* Filters & Search */}
            <div className="flex flex-col xl:flex-row gap-4 justify-between items-center mt-6">
                <div className="flex p-1.5 bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-sm overflow-x-auto max-w-full gap-1">
                    {[
                        { label: 'All', value: 'All' },
                        { label: 'Desktop', value: 'Desktop' },
                        { label: 'Laptop', value: 'Laptop' },
                        { label: 'Printer', value: 'Printer' },
                        { label: 'Monitor', value: 'Monitor' },
                        { label: 'Phone', value: 'Mobile' },
                        { label: 'Server', value: 'Server' },
                        { label: 'CCTV', value: 'CCTV' }
                    ].map(t => {
                        const count = t.value === 'All' 
                            ? assetsArray.length 
                            : assetsArray.filter(a => isTypeMatch(a, t.value)).length;
                        
                        return (
                            <button
                                key={t.value}
                                onClick={() => handleTypeChange(t.value)}
                                className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all duration-300 whitespace-nowrap flex items-center gap-2 ${(type === t.value) || (t.value === 'All' && !type)
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                                    }`}
                            >
                                {t.label} 
                                <span className={`px-2 py-0.5 rounded-lg text-[10px] ${
                                    (type === t.value) || (t.value === 'All' && !type)
                                        ? 'bg-white/20 text-white backdrop-blur-sm'
                                        : 'bg-slate-200 text-slate-500'
                                }`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {type === 'CCTV' && (
                    <div className="flex items-center">
                        <button 
                            onClick={handleSadpScan}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold shadow-md shadow-indigo-500/20 transition-all active:scale-95 hover:from-indigo-700 hover:to-purple-700 whitespace-nowrap uppercase tracking-wider text-[11px]"
                        >
                            <Activity size={16} /> Scan SADP
                        </button>
                    </div>
                )}
            </div>

            {/* ShopFloor Data Asset Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden mt-4">
                {/* 1. Card Top Bar: Title & Action Buttons */}
                <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100">
                    <h3 className="text-base font-bold text-[#172b4c] font-rubik tracking-tight">Data Asset</h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchData}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                        >
                            <RefreshCw size={13} className={loading ? "animate-spin text-blue-600" : ""} /> Refresh
                        </button>

                        <div className="relative columns-dropdown">
                            <button 
                                onClick={() => setShowColumnToggles(!showColumnToggles)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0f172a] text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm"
                            >
                                <Filter size={13} /> Filter
                            </button>
                            {showColumnToggles && (
                                <div className="absolute right-0 top-[110%] w-64 bg-white border border-slate-200 shadow-xl rounded-xl p-3 z-50 max-h-[360px] overflow-y-auto">
                                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">Visible Columns</h4>
                                    <div className="space-y-1">
                                        <label className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 rounded opacity-50 cursor-not-allowed">
                                            <input type="checkbox" checked disabled className="w-3.5 h-3.5 rounded text-blue-600 border-slate-300" />
                                            <span className="text-xs font-semibold text-slate-700">Name</span>
                                        </label>
                                        {ALL_COLUMNS.map(col => (
                                            <label key={col.key} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer transition-colors">
                                                <input 
                                                    type="checkbox" 
                                                    checked={visibleColumns.includes(col.key)}
                                                    onChange={() => toggleColumn(col.key)}
                                                    className="w-3.5 h-3.5 rounded text-blue-600 border-slate-300" 
                                                />
                                                <span className="text-xs font-semibold text-slate-700">{col.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <Link
                            to="/ict/assets/new"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#059669] hover:bg-[#047857] text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
                        >
                            <Plus size={14} /> Create
                        </Link>
                    </div>
                </div>

                {/* Cyber One-Click Triage Pill Bar */}
                <div className="px-6 py-2.5 bg-[#0B132B] border-b border-slate-800 flex items-center gap-2 overflow-x-auto custom-scrollbar select-none">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider mr-1 shrink-0 flex items-center gap-1.5">
                        <Activity size={12} className="text-blue-400" /> Triage:
                    </span>
                    
                    <button
                        type="button"
                        onClick={() => { setQuickFilter('all'); setCurrentPage(1); }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                            quickFilter === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                    >
                        <span>Semua Unit</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 text-white/90">{triageCounts.all}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => { setQuickFilter('threats'); setCurrentPage(1); }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                            quickFilter === 'threats' ? 'bg-rose-600 text-white shadow-xs animate-pulse' : 
                            triageCounts.threats > 0 ? 'bg-rose-950/60 border border-rose-800/80 text-rose-400 hover:bg-rose-900/80 hover:text-white' :
                            'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                    >
                        <ShieldAlert size={13} className={triageCounts.threats > 0 ? 'text-rose-400' : 'text-slate-400'} />
                        <span>🚨 Terancam Bahaya</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${triageCounts.threats > 0 ? 'bg-rose-500 text-white' : 'bg-black/30 text-slate-400'}`}>{triageCounts.threats}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => { setQuickFilter('capex'); setCurrentPage(1); }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                            quickFilter === 'capex' ? 'bg-purple-600 text-white shadow-xs' : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                    >
                        <span className="w-2 h-2 rounded-full bg-purple-400" />
                        <span>🔴 Kritis Capex (&gt;5 Thn)</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 text-white/90">{triageCounts.capex}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => { setQuickFilter('opex'); setCurrentPage(1); }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                            quickFilter === 'opex' ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                    >
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        <span>🟡 Butuh Upgrade Opex</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 text-white/90">{triageCounts.opex}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => { setQuickFilter('compliant'); setCurrentPage(1); }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                            quickFilter === 'compliant' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                    >
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>🟢 Prima / ISO</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 text-white/90">{triageCounts.compliant}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => { setQuickFilter('online'); setCurrentPage(1); }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                            quickFilter === 'online' ? 'bg-cyan-600 text-white shadow-xs' : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                    >
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>⚡ Agent Online</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 text-white/90">{triageCounts.online}</span>
                    </button>
                </div>

                {/* 2. Sub-Toolbar: Show entries & Search */}
                <div className="px-6 py-3 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-[#fafbfd]/50">
                    <div className="flex items-center gap-2 text-xs text-slate-600 font-plex">
                        <span>Show</span>
                        <div className="relative inline-block">
                            <select
                                value={itemsPerPage}
                                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                                className="appearance-none bg-white border border-slate-300 hover:border-slate-400 rounded px-3 py-1 pr-7 text-xs font-semibold text-[#172b4c] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm cursor-pointer"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value={1000}>1000</option>
                            </select>
                            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        </div>
                        <span>entries</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-600 font-plex">
                        <span>Search:</span>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm w-44 md:w-56"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto relative pb-2 custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[1200px]">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200/60 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 select-none backdrop-blur-md">
                                <th className="sticky left-0 bg-slate-50/90 backdrop-blur-xl z-20 px-3 py-4 text-[10px] uppercase shadow-[4px_0_15px_-3px_rgba(0,0,0,0.05)] border-r border-slate-200/60">
                                    <div className="flex items-center gap-1 cursor-pointer hover:text-blue-600" onClick={() => requestSort('name')}>
                                        Name
                                        {sortConfig.key === 'name' && <span className="text-blue-600">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                                    </div>
                                </th>
                                {ALL_COLUMNS.filter(col => visibleColumns.includes(col.key)).map(({ key, label }) => (
                                    <th 
                                        key={key}
                                        onClick={() => requestSort(key)}
                                        className="px-4 py-2 text-xs uppercase text-left cursor-pointer hover:text-blue-600 transition-colors border-r border-[#F0F0F0] last:border-0"
                                    >
                                        <div className="flex items-center gap-1 whitespace-nowrap">
                                            {label}
                                            {sortConfig.key === key && <span className="text-blue-600">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                                        </div>
                                    </th>
                                ))}
                                <th className="sticky right-0 bg-[#F8F9FB] z-10 px-3 py-1.5 text-[10px] uppercase text-right shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)] border-l border-[#F0F0F0]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F0F0F0]">
                            {loading ? (
                                <tr>
                                    <td colSpan={visibleColumns.length + 2} className="p-32 text-center">
                                        <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
                                        <p className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Scanning Network...</p>
                                    </td>
                                </tr>
                            ) : filteredAssets.length === 0 ? (
                                <tr>
                                    <td colSpan={visibleColumns.length + 2} className="p-32 text-center">
                                        <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                            <Search className="w-10 h-10 text-slate-200" />
                                        </div>
                                        <h3 className="text-lg font-black text-slate-900">Operational fleet empty</h3>
                                        <p className="text-slate-400 font-medium mt-2">Try adjusting your filters or sync with GLPI.</p>
                                    </td>
                                </tr>
                            ) : (
                                paginatedAssets.map(asset => {
                                    const ticketCount = getOpenTicketCount(asset.id);
                                    const specs = getSpecs(asset);
                                    
                                    // Hardware parsing
                                    const os = typeof specs.os === 'string' ? specs.os : '-';
                                    const processor = typeof specs.cpu === 'string' ? specs.cpu : (specs.cpu?.name || (specs.raw_spec ? 'Check Details (Raw)' : '-'));
                                    const ram = specs.ram_gb ? `${specs.ram_gb} GB` : (specs.ram ? String(specs.ram) : '-');
                                    const storage = specs.storage_info ? String(specs.storage_info).replace(/GB/i, ' GB') : (typeof specs.storage === 'string' ? specs.storage : '-');
                                    
                                    // Ram threshold
                                    const ramNum = parseFloat(specs.ram_gb || 0);
                                    const ramWarning = ramNum > 0 && ramNum <= 4;
                                    
                                    return (
                                        <tr key={asset.id} onClick={() => navigate('/ict/assets/' + asset.id)} 
                                            className="hover:bg-blue-50/30 transition-all group cursor-pointer bg-white">
                                            
                                            {/* STICKY LEFT: NAME */}
                                            <td className="sticky left-0 bg-white group-hover:bg-blue-50/50 z-10 px-3 py-1.5 text-[11px] border-r border-[#F0F0F0] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] transition-colors">
                                                <span className="font-bold text-slate-900 text-[11px] group-hover:text-blue-600 transition-colors whitespace-nowrap block truncate max-w-[250px]" title={asset.name}>{asset.name}</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {getIcon(asset.category, asset.type)}
                                                    <span className="text-[10px] text-slate-400 font-medium">{asset.category || 'Device'}</span>
                                                </div>
                                            </td>

                                            {/* DYNAMIC COLUMNS */}
                                            {ALL_COLUMNS.filter(col => visibleColumns.includes(col.key)).map(col => {
                                                let content = '-';
                                                
                                                if (col.key === 'inventory_number') content = <span className="text-slate-600 text-[11px] font-medium whitespace-nowrap block">{asset.inventory_number || 'UNTAGGED'}</span>;
                                                else if (col.key === 'health_score') {
                                                    const health = calculateHealthScore(asset);
                                                    content = (
                                                        <span 
                                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border shadow-xs ${
                                                                health.score >= 85 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                                health.score >= 70 ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                                health.score >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                                'bg-rose-50 text-rose-700 border-rose-200'
                                                            }`}
                                                            title={`Health Score: ${health.score}% • Grade ${health.grade} • Kategori: ${health.category} • Usia: ${health.age} Thn`}
                                                        >
                                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                                                health.score >= 85 ? 'bg-emerald-500' :
                                                                health.score >= 70 ? 'bg-blue-500' :
                                                                health.score >= 50 ? 'bg-amber-500' :
                                                                'bg-rose-500 animate-pulse'
                                                            }`} />
                                                            {health.score}% ({health.grade})
                                                        </span>
                                                    );
                                                }
                                                else if (col.key === 'security') {
                                                    const threats = parseInt(asset.threats_found || 0);
                                                    content = threats > 0 ? (
                                                        <span 
                                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200 animate-pulse"
                                                            title={`${threats} Ancaman Terdeteksi oleh Wazuh/Defender`}
                                                        >
                                                            <ShieldAlert size={11} className="text-rose-600" />
                                                            <span>{threats} Threat!</span>
                                                        </span>
                                                    ) : (
                                                        <span 
                                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200"
                                                            title="Sistem Terlindungi oleh Wazuh & Defender"
                                                        >
                                                            <ShieldCheck size={11} className="text-emerald-500" />
                                                            <span>Safe</span>
                                                        </span>
                                                    );
                                                }
                                                else if (col.key === 'status') {
                                                    content = (
                                                        <span onClick={e => e.stopPropagation()} className="block">
                                                            <select
                                                                value={asset.status || 'Active'}
                                                                onChange={(e) => handleStatusChange(e, asset, e.target.value)}
                                                                className={`text-[11px] font-bold rounded-lg px-3 py-1 border appearance-none outline-none cursor-pointer transition-colors ${
                                                                    asset.status === 'Rusak' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                                                                    asset.status === 'Dalam Perbaikan' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                                                    asset.status === 'Mati Total' ? 'bg-slate-800 text-slate-100 border-slate-700' :
                                                                    asset.status === 'In Stock' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' :
                                                                    asset.status === 'Disposed' ? 'bg-slate-100 text-slate-500 border-slate-300' :
                                                                    'bg-emerald-50 text-emerald-600 border-emerald-200'
                                                                }`}
                                                            >
                                                                <option value="Active">Active Duty</option>
                                                                <option value="In Repair">In-Service (Maintenance)</option>
                                                                <option value="In Stock">Standby (Inventory)</option>
                                                                <option value="Dalam Perbaikan">Dalam Perbaikan ⚠️</option>
                                                                <option value="Rusak">Rusak ❌</option>
                                                                <option value="Mati Total">Mati Total 💀</option>
                                                                <option value="Disposed">Decommissioned</option>
                                                            </select>
                                                        </span>
                                                    );
                                                }
                                                else if (col.key === 'category') content = <span className="text-slate-600 text-[11px] whitespace-nowrap block">{asset.category || '-'}</span>;
                                                else if (col.key === 'manufacturer') content = <span className="text-slate-600 text-[11px] whitespace-nowrap block truncate max-w-[150px]">{asset.manufacturer || '-'}</span>;
                                                else if (col.key === 'model') content = <span className="text-slate-600 text-[11px] whitespace-nowrap block truncate max-w-[200px]">{asset.model || '-'}</span>;
                                                else if (col.key === 'os') content = <span className="text-slate-600 text-[11px] whitespace-nowrap block truncate max-w-[150px]" title={os}>{os}</span>;
                                                else if (col.key === 'processor') content = <span className="text-slate-600 text-[11px] whitespace-nowrap block truncate max-w-[200px]" title={processor}>{processor}</span>;
                                                else if (col.key === 'memory') content = <span className={`text-[11px] font-bold whitespace-nowrap block ${ramWarning ? 'text-rose-600' : 'text-slate-600'}`}>{ram}</span>;
                                                else if (col.key === 'storage') content = <span className="text-slate-600 text-[11px] whitespace-nowrap block">{storage}</span>;
                                                else if (col.key === 'location') content = <span className="text-slate-600 text-[11px] whitespace-nowrap block truncate max-w-[150px]" title={asset.location}>{asset.location || '-'}</span>;
                                                else if (col.key === 'serial_number') content = <span className="text-slate-600 text-[11px] font-mono whitespace-nowrap block truncate max-w-[150px]">{asset.serial_number || '-'}</span>;
                                                else if (col.key === 'user') {
                                                    content = (
                                                        <span 
                                                            className="font-bold text-blue-600 uppercase text-[12px] whitespace-nowrap block cursor-pointer hover:underline hover:text-blue-800"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const username = asset.user_name || asset.contact;
                                                                if (username && username !== '-') {
                                                                    setSelectedUserDetail(username);
                                                                }
                                                            }}
                                                        >
                                                            {asset.user_name || asset.contact || 'No Owner'}
                                                        </span>
                                                    );
                                                }
                                                else if (col.key === 'user_department') {
                                                    content = (
                                                        <span className="text-slate-600 text-[11px] font-medium whitespace-nowrap block truncate max-w-[150px]" title={asset.user_department || asset.department}>
                                                            {asset.user_department || asset.department || '-'}
                                                        </span>
                                                    );
                                                }
                                                else if (col.key === 'windows_login') content = <span className="text-slate-600 text-[11px] font-bold whitespace-nowrap block">{asset.windows_login || '-'}</span>;
                                                else if (col.key === 'last_agent_sync') {
                                                    content = <span className="text-slate-600 text-[11px] whitespace-nowrap block">
                                                        {asset.last_agent_sync ? new Date(asset.last_agent_sync).toLocaleString('id-ID', {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit'}) : 'N/A'}
                                                    </span>;
                                                }

                                                return (
                                                    <td key={col.key} className="px-3 py-1.5 text-[11px] border-r border-[#F0F0F0] last:border-r-0">
                                                        {content}
                                                    </td>
                                                );
                                            })}

                                            {/* STICKY RIGHT: ACTIONS */}
                                            <td className="sticky right-0 bg-white group-hover:bg-blue-50/50 z-10 px-3 py-1.5 text-[11px] text-right shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)] border-l border-[#F0F0F0] transition-colors">
                                                <div className="flex items-center justify-end space-x-1.5">
                                                    {/* RustDesk / Remote Button */}
                                                    {(asset.rustdesk_id || asset.uuid || asset.agent_status === 'Online') ? (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveAgentSession(asset);
                                                                setShowAgentRemote(true);
                                                            }}
                                                            className="w-7 h-7 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs transition-all active:scale-95 cursor-pointer"
                                                            title={`Remote RustDesk / RDP (${asset.rustdesk_id ? 'ID: ' + asset.rustdesk_id : 'Direct'})`}
                                                        >
                                                            <Monitor size={13} />
                                                        </button>
                                                    ) : (
                                                        <div className="w-7 h-7 flex items-center justify-center bg-slate-50 text-slate-300 rounded-lg border border-[#F0F0F0] cursor-not-allowed">
                                                            <Monitor size={13} />
                                                        </div>
                                                    )}

                                                    {/* Quick Remediation Action Button (Scan / USB Lock / Restart) */}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleQuickRemediation(asset, e)}
                                                        className={`w-7 h-7 flex items-center justify-center rounded-lg shadow-xs transition-all active:scale-95 cursor-pointer ${
                                                            parseInt(asset.threats_found || 0) > 0 
                                                                ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse' 
                                                                : 'bg-slate-900 hover:bg-black text-amber-400'
                                                        }`}
                                                        title="Aksi Kilat (Scan Defender / Kunci USB / Restart RustDesk)"
                                                    >
                                                        <Zap size={13} />
                                                    </button>

                                                    {/* Upgrade Request */}
                                                    <button
                                                        className="w-7 h-7 flex items-center justify-center bg-white border border-[#E1E1E1] text-amber-500 hover:text-white hover:bg-amber-500 hover:border-amber-500 rounded-lg shadow-xs transition-all active:scale-95 cursor-pointer"
                                                        title="Permintaan Upgrade"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedAssetForUpgrade(asset);
                                                            setShowUpgradeModal(true);
                                                        }}
                                                    >
                                                        <ArrowUpCircle size={13} />
                                                    </button>

                                                    {/* Control Center / Detail Page Link */}
                                                    <Link
                                                        to={`/ict/assets/${asset.id}`}
                                                        className="w-7 h-7 flex items-center justify-center bg-white border border-[#E1E1E1] text-slate-400 hover:text-blue-600 hover:border-blue-600 rounded-lg shadow-xs transition-all active:scale-95"
                                                        title="Buka Detail Komputer"
                                                        onClick={e => e.stopPropagation()}
                                                    >
                                                        <ArrowUpRight size={13} />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {!loading && filteredAssets.length > 0 && (
                    <div className="px-6 py-4 bg-white border-t border-[#F0F0F0] flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-xs text-slate-500 font-plex">
                            Showing <span className="font-semibold text-slate-700">{filteredAssets.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-semibold text-slate-700">{Math.min(filteredAssets.length, currentPage * itemsPerPage)}</span> of <span className="font-semibold text-slate-700">{filteredAssets.length}</span> entries
                        </div>

                        {totalPages > 1 && (
                            <div className="flex items-center space-x-1">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className={`px-3 py-1.5 rounded border border-slate-200 text-xs font-medium transition-all ${currentPage === 1 ? 'text-slate-300 cursor-not-allowed bg-slate-50' : 'text-slate-600 hover:text-blue-600 hover:border-blue-500 bg-white'}`}
                                >
                                    Previous
                                </button>

                                <div className="flex items-center space-x-1">
                                    {[...Array(totalPages)].map((_, i) => {
                                        const pageNum = i + 1;
                                        if (
                                            pageNum === 1 ||
                                            pageNum === totalPages ||
                                            (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                                        ) {
                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    className={`min-w-8 h-7 px-2 rounded text-xs font-semibold font-rubik transition-all ${
                                                        currentPage === pageNum 
                                                            ? 'bg-blue-600 text-white shadow-sm' 
                                                            : 'text-slate-600 hover:bg-slate-100 border border-slate-200'
                                                    }`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        } else if (
                                            pageNum === currentPage - 2 ||
                                            pageNum === currentPage + 2
                                        ) {
                                            return <span key={pageNum} className="text-slate-300 text-xs px-1">...</span>;
                                        }
                                        return null;
                                    })}
                                </div>

                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className={`px-3 py-1.5 rounded border border-slate-200 text-xs font-medium transition-all ${currentPage === totalPages ? 'text-slate-300 cursor-not-allowed bg-slate-50' : 'text-slate-600 hover:text-blue-600 hover:border-blue-500 bg-white'}`}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
            </>
        ) : (
            /* Node Control (Agent) View */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left Side: Download & Features */}
                <div className="lg:col-span-4 space-y-3">
                    <div className="card-unifi p-5 group">
                        <div className="space-y-5">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
                                    <Monitor className="text-blue-600" size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900">RustDesk Agent</h3>
                                    <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">PowerShell Sync Script</p>
                                </div>
                            </div>
                            <p className="text-slate-500 text-xs leading-relaxed font-medium">
                                Deploy this lightweight script via GPO or manually to sync client RustDesk IDs directly to Power Asset for 1-click remote access.
                            </p>
                            <div className="flex flex-col gap-2.5 mt-2">
                                <a
                                    href="/api/network/agents/download-kg"
                                    className="flex items-center justify-center gap-2 w-full px-4 py-3.5 bg-gradient-to-r from-blue-600 via-cyan-600 to-indigo-600 hover:brightness-110 text-white text-xs font-black rounded-xl transition-all uppercase tracking-widest shadow-lg shadow-blue-500/25"
                                >
                                    <Download size={16} />
                                    DOWNLOAD AGENT V30.0 (PLANT KARAWANG)
                                </a>
                                
                                <a
                                    href="/api/network/agents/download-wazuh"
                                    className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors uppercase tracking-widest shadow-md shadow-rose-500/20"
                                >
                                    <Wifi size={16} />
                                    WIFI SETUP (MAGANG)
                                </a>

                                <a
                                    href="/api/network/agents/download-offline"
                                    className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors uppercase tracking-widest shadow-md shadow-amber-500/20"
                                >
                                    <Download size={16} />
                                    OFFLINE AGENT (.ZIP)
                                </a>

                                <input type="file" accept=".json" style={{display: 'none'}} ref={fileInputRef} onChange={handleOfflineUpload} />
                                <button
                                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                                    className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors uppercase tracking-widest shadow-md shadow-emerald-500/20 mt-2"
                                >
                                    <Upload size={16} />
                                    IMPORT OFFLINE DATA
                                </button>

                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <FeatureItem icon={Cpu} label="System Sync" desc="Automated mapping." />
                        <FeatureItem icon={ShieldCheck} label="Secure Tunnel" desc="Encrypted RDP." />
                        <FeatureItem icon={Globe} label="Global Access" desc="Edge-to-edge link." />
                    </div>
                </div>

                {/* Right Side: Device List */}
                <div className="lg:col-span-8 card-unifi p-5 h-full min-h-[600px] flex flex-col">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-[#F0F0F0]">
                        <div>
                            <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                                <Monitor size={20} className="text-blue-600" /> Active Uplinks
                            </h3>
                            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mt-1">Real-time status of nodes in current sector.</p>
                        </div>
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={16} />
                            <input
                                type="text"
                                placeholder="Search by name or IP..."
                                value={agentSearchTerm}
                                onChange={(e) => setAgentSearchTerm(e.target.value)}
                                className="bg-[#F8F9FB] border border-[#E1E1E1] rounded-2xl py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 transition-all text-xs font-bold w-full md:w-64"
                            />
                        </div>
                    </div>

                    <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {agentLoading ? (
                            <div className="py-32 text-center">
                                <div className="relative w-12 h-12 mx-auto mb-6">
                                    <div className="w-12 h-12 border-4 border-slate-100 rounded-full"></div>
                                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                                </div>
                                <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px]">Scanning Frequencies...</p>
                            </div>
                        ) : filteredAgents.length === 0 ? (
                            <div className="py-32 text-center border-2 border-dashed border-slate-100 rounded-[2rem]">
                                <Monitor className="mx-auto mb-4 text-slate-200" size={64} />
                                <p className="text-slate-500 font-bold">No active agents found.</p>
                            </div>
                        ) : (
                            filteredAgents.map(device => (
                                <div key={device.id} className="bg-white border border-[#E1E1E1] p-4 rounded-2xl hover:border-blue-600/30 hover:bg-slate-50/30 transition-all group relative">
                                    <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
                                        <div className="flex items-center gap-5 min-w-[200px] flex-1">
                                            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-[#E1E1E1] flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all shadow-sm">
                                                <Monitor size={20} />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-sm font-black text-slate-900 transition-colors truncate">{device.hostname || device.name}</h4>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mt-0.5 truncate">
                                                    <Globe size={10} className="text-blue-600 flex-shrink-0" /> {device.ip_address || '0.0.0.0'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-4 xl:gap-5">
                                            <div className="hidden xl:block w-28 flex-shrink-0">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Architecture</p>
                                                <p className="text-[10px] font-bold text-slate-700 truncate">
                                                    {(() => {
                                                        try {
                                                            const specs = typeof device.specs === 'string' ? JSON.parse(device.specs) : device.specs;
                                                            return specs?.os || device.os_info || 'Unknown OS';
                                                        } catch (e) { return device.os_info || 'Unknown OS'; }
                                                    })()}
                                                </p>
                                            </div>
                                            <div className="hidden md:block w-40 flex-shrink-0">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">User / Owner</p>
                                                <p className="text-[10px] font-bold text-slate-700 flex items-center gap-1.5 truncate">
                                                    <User size={10} className="text-slate-400 flex-shrink-0" />
                                                    <span className="truncate">{device.user_name || device.contact || 'No Owner'}</span>
                                                </p>
                                            </div>
                                            <div className="hidden sm:block w-28 flex-shrink-0">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Last Contact</p>
                                                <p className="text-[10px] font-bold text-slate-700 truncate">{device.last_agent_sync ? new Date(device.last_agent_sync).toLocaleTimeString() : (device.last_seen ? new Date(device.last_seen).toLocaleTimeString() : 'N/A')}</p>
                                            </div>
                                            <div className="flex items-center justify-end gap-4 min-w-[160px] flex-shrink-0">
                                                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${isAgentOnline(device)
                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                                    : 'bg-slate-50 text-slate-500 border-slate-200'
                                                    }`}>
                                                    {isAgentOnline(device) ? 'Online' : 'Offline'}
                                                </div>
                                                {device.rustdesk_id && device.rustdesk_id !== 'Not Installed / Pending' && (
                                                    <a
                                                        href={`rustdesk://${device.rustdesk_id}`}
                                                        title="Remote via RustDesk"
                                                        className="w-10 h-10 bg-slate-50 border border-[#E1E1E1] rounded-xl flex items-center justify-center text-slate-400 hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all active:scale-90"
                                                    >
                                                        <MonitorPlay size={18} />
                                                    </a>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        setActiveAgentSession(device);
                                                        setShowAgentRemote(true);
                                                    }}
                                                    title="Open Agent Terminal"
                                                    className="w-10 h-10 bg-slate-50 border border-[#E1E1E1] rounded-xl flex items-center justify-center text-slate-400 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all active:scale-90"
                                                >
                                                    <ArrowUpRight size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        )}

            {/* Quick Ticket Modal */}
            {showTicketModal && selectedAssetForTicket && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-[#E1E1E1]">
                        <div className="px-10 py-8 border-b border-[#F0F0F0] flex justify-between items-center">
                            <h3 className="font-black text-slate-900 flex items-center uppercase tracking-[0.2em] text-xs">
                                <AlertCircle size={20} className="text-rose-600 mr-4" />
                                Dispatch Ticket
                            </h3>
                            <button onClick={() => setShowTicketModal(false)} className="text-slate-400 hover:text-slate-900 transition-all">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateTicket} className="p-10 space-y-5">
                            <div className="p-4 bg-[#F8F9FB] rounded-2xl border border-[#E1E1E1] flex items-center">
                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-600 border border-[#E1E1E1] mr-5">
                                    <Monitor size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hardware Target</p>
                                    <p className="font-black text-slate-900 text-lg">{selectedAssetForTicket.name}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Summary</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-[#F8F9FB] border border-[#E1E1E1] rounded-2xl px-6 py-4 focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none transition-all font-bold text-slate-700"
                                    placeholder="Brief nature of problem"
                                    value={ticketSubject}
                                    onChange={e => setTicketSubject(e.target.value)}
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Detailed Log</label>
                                <textarea
                                    required
                                    className="w-full bg-[#F8F9FB] border border-[#E1E1E1] rounded-2xl px-6 py-4 h-40 focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none transition-all font-bold text-slate-700 resize-none"
                                    placeholder="Technical details..."
                                    value={ticketDesc}
                                    onChange={e => setTicketDesc(e.target.value)}
                                />
                            </div>

                            <button
                                type="submit"
                                className="btn-primary-unifi w-full py-5 text-[10px] uppercase font-black tracking-widest shadow-lg shadow-blue-100"
                            >
                                Dispatch Helpdesk Agent
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Asset Detail Drawer */}
            <AssetDetailDrawer assetId={selectedAssetForDrawer} onClose={() => setSelectedAssetForDrawer(null)} />
            
            {/* User Detail Modal */}
            {selectedUserDetail && (
                <UserDetailModal 
                    userName={selectedUserDetail} 
                    assets={assetsArray} 
                    onClose={() => setSelectedUserDetail(null)} 
                />
            )}

            {/* Asset Upgrade Modal */}
            <AssetUpgradeModal
                isOpen={showUpgradeModal}
                asset={selectedAssetForUpgrade}
                onClose={() => setShowUpgradeModal(false)}
                onSuccess={() => {
                    // Refetch or handle success
                }}
            />
        </div>
    );
}

function KPICard({ label, value, icon: Icon, color }) {
    const themes = {
        blue: {
            box: 'bg-blue-50 text-blue-600 border-blue-100',
            text: 'text-[#1d4ed8]',
        },
        emerald: {
            box: 'bg-emerald-50 text-emerald-600 border-emerald-100',
            text: 'text-[#059669]',
        },
        rose: {
            box: 'bg-rose-50 text-rose-600 border-rose-100',
            text: 'text-[#dc2626]',
        },
        amber: {
            box: 'bg-amber-50 text-amber-600 border-amber-100',
            text: 'text-[#ea580c]',
        }
    };

    const currentTheme = themes[color] || themes.blue;

    return (
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center gap-4 transition-all hover:shadow-md hover:border-slate-300 group">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 transition-transform duration-300 group-hover:scale-105 ${currentTheme.box}`}>
                <Icon size={22} />
            </div>
            <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500 mb-0.5">{label}</p>
                <h3 className={`text-2xl font-bold font-rubik tracking-tight ${currentTheme.text}`}>{value}</h3>
            </div>
        </div>
    );
}

function FeatureItem({ icon: Icon, label, desc }) {
    return (
        <div className="card-unifi p-5 flex items-center gap-4 hover:shadow-lg hover:shadow-blue-500/5 transition-all">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 border border-blue-100">
                <Icon size={22} />
            </div>
            <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none">{label}</h4>
                <p className="text-[10px] text-slate-500 font-bold mt-1.5">{desc}</p>
            </div>
        </div>
    );
}
