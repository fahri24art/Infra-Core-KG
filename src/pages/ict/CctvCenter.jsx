import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, Shield, Server, HardDrive, Radio, Maximize2, Grid, 
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  RefreshCw, CheckCircle2, AlertTriangle, Clock, MapPin, Map,
  Sliders, Plus, Edit2, Trash2, Save, X, Eye, FileText, Check, ExternalLink,
  Move, Lock, Unlock, Compass, RotateCw, Image, Layers, Info as InfoIcon, Camera
} from 'lucide-react';
import axios from 'axios';

// Preview Thumbnail Component
const PreviewThumbnail = ({ cam, autoLoad = false, fullSize = false }) => {
  const [loaded, setLoaded] = useState(autoLoad);
  const [hasError, setHasError] = useState(false);
  const [displayUrl, setDisplayUrl] = useState('');
  const objectUrlRef = useRef(null);

  useEffect(() => {
    if (!loaded) return;

    let currentTimeout;
    let isActive = true;

    const fetchSnapshot = async () => {
      try {
          const nextUrl = `/api/cctv/snapshot/${cam.id}?t=${Date.now()}`;
          const response = await fetch(nextUrl);
          
          if (!response.ok) throw new Error('Failed to fetch snapshot');
          
          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);
          
          if (isActive) {
              if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
              objectUrlRef.current = objectUrl;
              setDisplayUrl(objectUrl);
              setHasError(false);
          } else {
              URL.revokeObjectURL(objectUrl);
          }
      } catch (err) {
          if (isActive) setHasError(true);
      }

      if (isActive) {
          const refreshRate = fullSize ? 1500 : 15000;
          currentTimeout = setTimeout(fetchSnapshot, refreshRate);
      }
    };

    const initialStagger = fullSize ? Math.random() * 1500 : Math.random() * 8000;
    currentTimeout = setTimeout(fetchSnapshot, initialStagger);

    return () => {
      isActive = false;
      clearTimeout(currentTimeout);
      if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, [loaded, cam.id]);

  if (!loaded) {
    return (
      <button 
        onClick={() => setLoaded(true)}
        className={`bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-[9px] font-bold text-slate-500 flex flex-col items-center justify-center transition-colors ${fullSize ? 'w-full h-full' : 'w-20 h-12'}`}
      >
        <Camera className="w-4 h-4 mb-0.5 text-slate-400" />
        LOAD
      </button>
    );
  }
  
  if (hasError && !displayUrl) {
    return (
      <div className={`${fullSize ? 'w-full h-full' : 'w-20 h-12'} bg-slate-900 border border-slate-800 rounded flex flex-col items-center justify-center text-[10px] text-red-500 font-bold text-center leading-tight p-2`}>
        <span className="text-xl mb-1">⚠️</span> CONNECTION FAILED OR OFFLINE
      </div>
    );
  }

  return (
    <div className={`${fullSize ? 'w-full h-full' : 'w-20 h-12'} relative`}>
      {displayUrl && (
        <img 
          src={displayUrl} 
          alt={`Preview ${cam.channel}`}
          className={`w-full h-full ${fullSize ? 'object-fill bg-black' : 'object-cover bg-slate-200 border border-slate-300'} rounded transition-opacity duration-300`}
          onError={() => setHasError(true)}
        />
      )}
      {!displayUrl && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900 rounded text-slate-500 text-xs">
          Connecting...
        </div>
      )}
      {hasError && displayUrl && (
        <div className="absolute top-2 right-2 bg-red-600/80 text-white text-[10px] px-2 py-0.5 rounded">
          ⚠️ OFFLINE
        </div>
      )}
    </div>
  );
};

const CctvCenter = () => {
  const [cameras, setCameras] = useState([]);
  const [nvrStatus, setNvrStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCam, setSelectedCam] = useState(null);
  
  // UI Tabs
  const [activeMainTab, setActiveMainTab] = useState(() => {
    return localStorage.getItem('cctv_active_tab') || 'map';
  });
  
  useEffect(() => {
    localStorage.setItem('cctv_active_tab', activeMainTab);
  }, [activeMainTab]);

  const [gridLayout, setGridLayout] = useState('2x2'); // '1x1', '2x2', '3x3'
  const [categoryFilter, setCategoryFilter] = useState('All');
  const user = JSON.parse((typeof window !== 'undefined' && sessionStorage.getItem('user')) || 'null');
  const isSuperAdmin = user && ['super_user', 'superuser', 'administrator', 'admin'].includes(user.role?.toLowerCase());
  const userOrg = user?.organization || 'TCF-SG';
  const effectiveOrg = isSuperAdmin 
    ? ((typeof window !== 'undefined' && sessionStorage.getItem('organization')) || userOrg)
    : userOrg;

  // Standalone KG Node is permanently locked to Plant KG
  const [activePlant, setActivePlant] = useState('KG');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedConfigNvr, setSelectedConfigNvr] = useState(null); // Track which NVR is selected in Config tab
  const [ptzMessage, setPtzMessage] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  
  const [isTvMode, setIsTvMode] = useState(false);
  const [tvCameras, setTvCameras] = useState([]);
  
  // Parse TV Mode URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tvParam = params.get('tv');
    const camsParam = params.get('cams');
    const layoutParam = params.get('layout'); // e.g. '1x1', '2x2', '3x3'
    
    if (tvParam === '1' || camsParam) {
      setIsTvMode(true);
      if (layoutParam && ['1x1', '2x2', '3x3'].includes(layoutParam)) {
        setGridLayout(layoutParam);
      }
      
      if (cameras.length > 0) {
        let matchedCams = cameras;
        if (camsParam) {
          const allowedIdsOrNames = camsParam.split(',').map(s => s.trim().toLowerCase());
          matchedCams = cameras.filter(cam => {
            const camId = String(cam.id || '').toLowerCase();
            const camName = String(cam.name || '').toLowerCase();
            return allowedIdsOrNames.some(allowed => camId === allowed || camName.includes(allowed));
          });
        }
        setTvCameras(matchedCams);
      }
    }
  }, [cameras]);

  // Auto-rotate disabled - TV Mode now shows all cameras on one page

  // Interactive Floorplan Map States (UniFi Controller Style)
  const [isEditMode, setIsEditMode] = useState(false);
  const [mapZoom, setMapZoom] = useState(1);
  const [draggingCamId, setDraggingCamId] = useState(null);
  const [mapBgImage, setMapBgImage] = useState(() => {
    return (typeof window !== 'undefined' && localStorage.getItem('cctv_kg_map_bg')) || '';
  });
  const mapFileInputRef = useRef(null);

  const handleMapUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (typeof dataUrl === 'string') {
        try {
          localStorage.setItem('cctv_kg_map_bg', dataUrl);
        } catch (storageErr) {
          console.warn('[CCTV Map] LocalStorage quota exceeded, keeping in state:', storageErr);
        }
        setMapBgImage(dataUrl);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveMap = () => {
    if (window.confirm('Hapus gambar denah map saat ini?')) {
      localStorage.removeItem('cctv_kg_map_bg');
      setMapBgImage('');
    }
  };

  const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mapContainerRef = useRef(null);
  const mapInnerRef = useRef(null);

  // Configuration Modal & Form States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCam, setEditingCam] = useState(null);
  const [showTvGeneratorModal, setShowTvGeneratorModal] = useState(false);
  const [tvGeneratorSelections, setTvGeneratorSelections] = useState([]);
  const [tvGeneratorLayout, setTvGeneratorLayout] = useState('2x2');
  const [camFormData, setCamFormData] = useState({
    name: '',
    location: '',
    ip: '',
    channel: 1,
    category: 'General',
    type: 'Hikvision IP Camera',
    resolution: '1920x1080 (1080p)',
    fps: 25,
    ptzCapable: false,
    streamUrl: '',
    mapCoords: { x: 50, y: 50, rotation: 0 }
  });

  const [nvrFormData, setNvrFormData] = useState({
    ip: '',
    model: '',
    username: '',
    password: '',
    firmware: ''
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [tvExpandedCamId, setTvExpandedCamId] = useState(null);

  useEffect(() => {
    fetchCctvData();
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    
    // Parse URL for TV Mode
    const params = new URLSearchParams(window.location.search);
    if (params.get('tv_mode') === 'true') {
      setIsTvMode(true);
      setActiveMainTab('matrix');
      const camsParam = params.get('cameras');
      if (camsParam) {
        setTvCameras(camsParam.split(',').map(c => c.trim().toLowerCase()));
      }
    }
    
    return () => clearInterval(timer);
  }, []);

  const fetchCctvData = async () => {
    try {
      setLoading(true);
      const [camsRes, nvrRes] = await Promise.all([
        axios.get('/api/cctv/cameras'),
        axios.get('/api/cctv/nvr-status')
      ]);

      if (camsRes.data && camsRes.data.cameras) {
        setCameras(camsRes.data.cameras);
        if (!selectedCam && camsRes.data.cameras.length > 0) {
          setSelectedCam(camsRes.data.cameras[0]);
        }
      }
      if (nvrRes.data && nvrRes.data.nvr) {
        setNvrStatus(nvrRes.data.nvr);
        setNvrFormData({
          ip: nvrRes.data.nvr.ip || '',
          model: nvrRes.data.nvr.model || '',
          username: nvrRes.data.nvr.username || 'admin',
          firmware: nvrRes.data.nvr.firmware || ''
        });
      }
    } catch (err) {
      console.error('Failed to fetch CCTV data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePtzCommand = async (command) => {
    if (!selectedCam) return;
    try {
      setPtzMessage(`Sending PTZ: ${command}...`);
      const res = await axios.post('/api/cctv/ptz', {
        cameraId: selectedCam.id,
        command,
        speed: 5
      });
      if (res.data && res.data.message) {
        setPtzMessage(`✅ ${res.data.message}`);
        setTimeout(() => setPtzMessage(''), 3000);
      }
    } catch (err) {
      setPtzMessage(`❌ ${err.response?.data?.message || 'PTZ Execution failed'}`);
      setTimeout(() => setPtzMessage(''), 3000);
    }
  };

  // Map Drag and Drop Handlers
  const handleMapClick = (e) => {
    if (!isEditMode || !mapInnerRef.current) return;
    const rect = mapInnerRef.current.getBoundingClientRect();
    const x = parseFloat((((e.clientX - rect.left) / rect.width) * 100).toFixed(2));
    const y = parseFloat((((e.clientY - rect.top) / rect.height) * 100).toFixed(2));

    if (selectedCam) {
      updateCameraCoords(selectedCam.id, x, y, selectedCam.mapCoords?.rotation || 0);
    }
  };

  const handleMapMouseDown = (e) => {
    if (e.target.closest('.camera-marker')) return;
    e.preventDefault();
    setIsPanning(true);
    setDragStart({ x: e.clientX - mapOffset.x, y: e.clientY - mapOffset.y });
  };

  const handleMapMouseMove = (e) => {
    if (!isPanning) return;
    setMapOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMapMouseUp = () => {
    setIsPanning(false);
  };

  const handleMapWheel = (e) => {
    setMapZoom(prev => {
      const zoomStep = 0.15;
      const newZoom = e.deltaY < 0 ? prev + zoomStep : prev - zoomStep;
      return Math.max(0.7, Math.min(5.0, newZoom));
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDropOnMap = (e) => {
    e.preventDefault();
    if (!isEditMode || !mapInnerRef.current) return;
    const camId = e.dataTransfer.getData('text/plain') || draggingCamId;
    if (!camId) return;

    const rect = mapInnerRef.current.getBoundingClientRect();
    const x = parseFloat((Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100))).toFixed(2));
    const y = parseFloat((Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100))).toFixed(2));

    const cam = cameras.find(c => c.id === camId);
    updateCameraCoords(camId, x, y, cam?.mapCoords?.rotation || 0);
    setDraggingCamId(null);
  };

  const updateCameraCoords = async (camId, x, y, rotation) => {
    try {
      const updatedCoords = { x, y, rotation: rotation || 0 };
      setCameras(prev => prev.map(c => c.id === camId ? { ...c, mapCoords: updatedCoords } : c));
      
      await axios.put(`/api/cctv/cameras/${camId}`, { mapCoords: updatedCoords });
    } catch (err) {
      console.error('Failed to save camera position:', err);
    }
  };

  const handleRotateCamera = (e, camId, delta) => {
    e.stopPropagation();
    const cam = cameras.find(c => c.id === camId);
    if (!cam) return;
    const currentRot = cam.mapCoords?.rotation || 0;
    const newRot = (currentRot + delta + 360) % 360;
    updateCameraCoords(camId, cam.mapCoords?.x || 50, cam.mapCoords?.y || 50, newRot);
  };

  const adoptedNvrsMap = {};
  cameras.forEach(cam => {
    if (cam.nvrIp && !adoptedNvrsMap[cam.nvrIp]) {
      adoptedNvrsMap[cam.nvrIp] = {
        ip: cam.nvrIp,
        username: cam.nvrUsername || 'admin',
        password: cam.nvrPassword || '',
        model: 'Adopted Hikvision DVR/NVR',
        cameraCount: 0
      };
    }
    if (cam.nvrIp) {
      adoptedNvrsMap[cam.nvrIp].cameraCount++;
    }
  });
  const adoptedNvrs = Object.values(adoptedNvrsMap);

  // Auto-select the first NVR if none is selected and we are in config tab
  useEffect(() => {
    if (activeMainTab === 'config' && adoptedNvrs.length > 0 && !selectedConfigNvr) {
      const firstNvr = adoptedNvrs[0];
      setSelectedConfigNvr(firstNvr.ip);
      setNvrFormData({
        ip: firstNvr.ip,
        username: firstNvr.username,
        password: firstNvr.password,
        model: firstNvr.model
      });
    }
  }, [activeMainTab, adoptedNvrs, selectedConfigNvr]);

  // Add / Edit Camera Actions
  const handleSaveCamera = async (e) => {
    e.preventDefault();
    try {
      if (editingCam) {
        await axios.put(`/api/cctv/cameras/${editingCam.id}`, camFormData);
      } else {
        await axios.post('/api/cctv/cameras', camFormData);
      }
      setShowAddModal(false);
      setEditingCam(null);
      fetchCctvData();
    } catch (err) {
      alert('Failed to save camera settings');
    }
  };

  const handleDeleteCamera = async (camId) => {
    if (!window.confirm('Are you sure you want to delete this camera?')) return;
    try {
      await axios.delete(`/api/cctv/cameras/${camId}`);
      fetchCctvData();
    } catch (err) {
      alert('Failed to delete camera');
    }
  };

  const openEditModal = (cam) => {
    setEditingCam(cam);
    setCamFormData({
      name: cam.name,
      location: cam.location,
      ip: cam.ip,
      channel: cam.channel,
      category: cam.category,
      type: cam.type,
      resolution: cam.resolution,
      fps: cam.fps,
      ptzCapable: cam.ptzCapable,
      streamUrl: cam.streamUrl,
      mapCoords: cam.mapCoords || { x: 50, y: 50, rotation: 0 }
    });
    setShowAddModal(true);
  };

  const openAddModal = () => {
    setEditingCam(null);
    setCamFormData({
      name: `CAM 0${cameras.length + 1} - New Location`,
      location: 'Building Area',
      ip: `192.168.1.2${(cameras.length + 10).toString().slice(-2)}`,
      channel: cameras.length + 1,
      category: 'General',
      type: 'Hikvision IP Camera 4MP',
      resolution: '1920x1080 (1080p)',
      fps: 25,
      ptzCapable: false,
      streamUrl: '',
      mapCoords: { x: 50, y: 50, rotation: 0 }
    });
    setShowAddModal(true);
  };

  const handleSaveNvrSettings = async (e) => {
    e.preventDefault();
    try {
      await axios.put('/api/cctv/nvr-status', nvrFormData);
      alert('NVR Settings saved successfully!');
      fetchCctvData();
    } catch (err) {
      alert('Failed to update NVR settings');
    }
  };

  const handleSyncHikvision = async () => {
    console.log("Sync Payload:", nvrFormData);
    const ip = nvrFormData.ip || '';
    const user = nvrFormData.username || '';
    const pass = nvrFormData.password || '';

    if (!ip.trim() || !user.trim()) {
      alert(`Missing fields!\nIP: ${ip}\nUser: ${user}\nPlease fill at least IP and User.`);
      return;
    }
    setIsSyncing(true);
    try {
      const res = await axios.post('/api/cctv/sync-hikvision', {
        ip: ip.trim(),
        username: user.trim(),
        password: pass.trim()
      });
      if (res.data.success) {
        alert(res.data.message);
        fetchCctvData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error syncing from NVR. Please check IP and credentials.');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, gridLayout, activePlant]);

  let filteredCameras = cameras;
  let itemsPerPage = 1;
  let totalPages = 1;
  let currentCameras = [];
  
  // 1. Filter by TV Mode Cameras if active
  if (isTvMode) {
    // 1. TV Mode Filters
    const allowedPlants = [];
    if (activePlant === 'All') {
      allowedPlants.push('SG', 'KG');
    } else {
      allowedPlants.push(activePlant);
    }
    
    // Auto sync TV config filtering logic
    filteredCameras = tvCameras.filter(cam => {
      const isVisible = cam.visible !== false;
      const matchPlant = allowedPlants.includes(cam.plant || 'SG');
      return isVisible && matchPlant;
    });
    
    // In TV mode, we show ALL cameras without pagination
    itemsPerPage = filteredCameras.length > 0 ? filteredCameras.length : 1;
    totalPages = 1;
    currentCameras = filteredCameras;
  } else {
    // 2. Normal Mode Filters (Category & Plant)
    filteredCameras = cameras.filter(cam => {
      const matchCategory = categoryFilter === 'All' || cam.category === categoryFilter;
      const matchPlant = activePlant === 'All' || (cam.plant || 'SG') === activePlant;
      return matchCategory && matchPlant;
    });

    // Pagination logic
    itemsPerPage = gridLayout === '1x1' ? 1 : gridLayout === '2x2' ? 4 : 9;
    totalPages = Math.max(1, Math.ceil(filteredCameras.length / itemsPerPage));
    currentCameras = filteredCameras.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }

  const categories = ['All', 'Data Center', 'Perimeter', 'Production', 'Warehouse', 'Office'];



  if (isTvMode) {
    if (tvExpandedCamId) {
      const expandedCam = currentCameras.find(c => c.id === tvExpandedCamId);
      if (expandedCam) {
        return (
          <div className="fixed inset-0 bg-black z-50 cursor-pointer flex flex-col" onClick={() => setTvExpandedCamId(null)}>
            <div className="flex-1 relative w-full h-full min-h-0 min-w-0">
              <PreviewThumbnail cam={expandedCam} autoLoad={true} fullSize={true} />
              
              <div className="absolute top-3 left-3 flex items-center gap-3 pointer-events-none">
                <div className="flex items-center gap-2 bg-transparent drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  <span className="text-sm font-bold text-white/90 font-mono tracking-widest">{String(expandedCam.name || '').split(' - ')[0]}</span>
                </div>
              </div>
              
              <div className="absolute top-3 right-3 pointer-events-none">
                <div className="bg-black/30 text-white/60 px-2 py-1 rounded text-[10px] font-mono tracking-widest border border-white/5 drop-shadow-md">
                  CLICK TO MINIMIZE
                </div>
              </div>
            </div>
          </div>
        );
      }
    }

    // Calculate optimal grid layout to minimize empty space while keeping things roughly square
    const colCount = Math.ceil(Math.sqrt(currentCameras.length || 1));
    const rowCount = Math.ceil(currentCameras.length / colCount) || 1;
    const totalCells = colCount * rowCount;
    const dummyCellsCount = Math.max(0, totalCells - currentCameras.length);
    
    return (
      <div className="fixed inset-0 bg-black flex flex-col overflow-hidden">
        <div 
          className="grid flex-1 gap-0.5 p-0.5 min-h-0 min-w-0"
          style={{ 
            gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))`
          }}
        >
          {currentCameras.map((cam) => (
            <div 
              key={cam.id} 
              className="relative bg-slate-900 overflow-hidden border border-slate-800 min-h-0 min-w-0 cursor-pointer group"
              onClick={() => setTvExpandedCamId(cam.id)}
            >
              <div className="absolute inset-0 z-10 bg-black/0 group-hover:bg-blue-500/10 transition-colors pointer-events-none border-2 border-transparent group-hover:border-blue-500/50 rounded box-border" />
              <PreviewThumbnail cam={cam} autoLoad={true} fullSize={true} />
              
              <div className="absolute top-1 left-2 flex items-center gap-2 pointer-events-none">
                <div className="flex items-center gap-1.5 bg-transparent drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,1)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500/80 animate-pulse"></span>
                  <span className="text-[10px] font-bold text-white/90 font-mono tracking-wider uppercase">{String(cam.name || '').split(' - ')[0]}</span>
                </div>
              </div>
            </div>
          ))}
          {Array.from({ length: dummyCellsCount }).map((_, index) => (
            <div key={`empty-${index}`} className="bg-black min-h-0 min-w-0"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3 bg-slate-50 min-h-screen text-slate-800">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-sm gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-500/20">
              <Video className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                HIKVISION CCTV COMMAND CENTER
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold border border-red-200 flex items-center gap-1 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-red-600"></span> LIVE NVR
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                UniFi-Style Interactive Floorplan Map • TCF Karawang Plant Layout • Drag & Drop Pins
              </p>
            </div>
          </div>
        </div>

        {/* System Stats & Refresh */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl text-right">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Clock</span>
            <span className="text-sm font-mono font-bold text-slate-900 flex items-center justify-end gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-600" /> {currentTime}
            </span>
          </div>

          {nvrStatus && (
            <div className="bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl text-right">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Storage</span>
              <span className="text-sm font-mono font-bold text-slate-900 flex items-center justify-end gap-1">
                <HardDrive className="w-3.5 h-3.5 text-emerald-600" /> {nvrStatus.storage?.usedTB || 11.4} / {nvrStatus.storage?.totalTB || 16} TB
              </span>
            </div>
          )}

          <button 
            onClick={fetchCctvData}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors border border-slate-200"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex justify-between items-end border-b border-slate-200 bg-white px-4 pt-2 rounded-xl shadow-sm gap-2 flex-wrap">
        <div className="flex gap-2">
        <button
          onClick={() => setActiveMainTab('map')}
          className={`px-4 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeMainTab === 'map' 
              ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Map className="w-4 h-4" /> Interactive Plant Map (UniFi Style Floorplan)
        </button>

        <button
          onClick={() => setActiveMainTab('matrix')}
          className={`px-4 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeMainTab === 'matrix' 
              ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Grid className="w-4 h-4" /> Live Camera Matrix Grid
        </button>

        <button
          onClick={() => setActiveMainTab('config')}
          className={`px-4 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeMainTab === 'config' 
              ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Sliders className="w-4 h-4" /> Camera & NVR Configuration
        </button>
        </div>
        
        {/* Plant Filters - Locked to KG */}
        <div className="flex bg-slate-100 p-1 rounded-t-lg gap-1">
          <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-100/80 border border-amber-300/80 rounded-md shadow-sm">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Plant Karawang (KG)</span>
          </div>
        </div>
      </div>

      {/* TAB 1: INTERACTIVE FLOORPLAN MAP (UNIFI CONTROLLER STYLE DRAG & DROP) */}
      {activeMainTab === 'map' && (
        <div className="space-y-3">
          {/* Map Controls & Mode Switcher Bar */}
          <div className="flex flex-wrap items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm ${
                  isEditMode
                    ? 'bg-amber-500 text-white shadow-amber-500/20'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {isEditMode ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                {isEditMode ? 'EDIT POSITIONS (DRAG & DROP ACTIVE)' : 'LOCK MAP (LIVE MONITORING)'}
              </button>

              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
                <InfoIcon className="w-4 h-4 text-blue-500" />
                {isEditMode 
                  ? 'Drag camera badges to place them directly on the TCF Karawang plant layout!' 
                  : 'Click any camera marker on the map to open its Live Video & PTZ Feed!'}
              </div>
            </div>

            {/* Map Import & Zoom Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <input 
                type="file" 
                accept="image/*" 
                ref={mapFileInputRef} 
                onChange={handleMapUpload} 
                className="hidden" 
              />
              <button
                type="button"
                onClick={() => mapFileInputRef.current && mapFileInputRef.current.click()}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                title="Unggah denah layout pabrik Karawang (JPG/PNG)"
              >
                <Image className="w-3.5 h-3.5" />
                <span>Ganti / Import Denah</span>
              </button>

              {mapBgImage && (
                <button
                  type="button"
                  onClick={handleRemoveMap}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Hapus gambar denah map saat ini"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Denah</span>
                </button>
              )}

              <div className="h-5 w-[1px] bg-slate-200 mx-1 hidden sm:block" />

              <button
                onClick={() => setMapZoom(prev => Math.min(5.0, prev + 0.15))}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono font-bold text-slate-700 w-12 text-center">
                {Math.round(mapZoom * 100)}%
              </span>
              <button
                onClick={() => setMapZoom(prev => Math.max(0.7, prev - 0.15))}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setMapZoom(1); setMapOffset({ x: 0, y: 0 }); }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Reset
              </button>
              <button
                onClick={() => setIsFullscreen(true)}
                className="px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 ml-1"
              >
                <Maximize2 className="w-3.5 h-3.5" /> Fullscreen
              </button>
            </div>
          </div>

          {/* Map Layout Canvas & Sidebar Drag Tray */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            
            {/* Main Interactive Map Viewport (Left 3 Cols) */}
            <div className={isFullscreen ? 'fixed inset-0 z-[100] bg-slate-950 flex flex-col p-4' : 'lg:col-span-3'}>
              {isFullscreen && (
                <div className="flex justify-between mb-4 shrink-0">
                  <div className="text-white font-mono text-sm px-4 py-2 bg-slate-900 rounded-lg border border-slate-700 flex items-center gap-2">
                    <Map className="w-4 h-4 text-blue-500" /> TCF KARAWANG PLANT LAYOUT
                  </div>
                  <button onClick={() => setIsFullscreen(false)} className="px-5 py-2 bg-red-600 font-bold text-white rounded-lg hover:bg-red-700 shadow-lg shadow-red-500/20">
                    Exit Fullscreen (Esc)
                  </button>
                </div>
              )}
              <div 
                ref={mapContainerRef}
                onClick={handleMapClick}
                onMouseDown={handleMapMouseDown}
                onMouseMove={handleMapMouseMove}
                onMouseUp={handleMapMouseUp}
                onMouseLeave={handleMapMouseUp}
                onWheel={handleMapWheel}
                onDragOver={handleDragOver}
                onDrop={handleDropOnMap}
                className={`relative bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-800 shadow-2xl transition-all cursor-${isPanning ? 'grabbing' : 'grab'} ${isFullscreen ? 'flex-1' : 'h-[650px]'}`}
              >
                {/* Background Plant Image / Blueprint Graphic */}
                <div 
                  ref={mapInnerRef}
                  className="absolute inset-0 bg-contain bg-no-repeat bg-center"
                  style={{ 
                    backgroundImage: mapBgImage ? `url('${mapBgImage}')` : 'none',
                    transform: `translate(${mapOffset.x}px, ${mapOffset.y}px) scale(${mapZoom})`,
                    transformOrigin: 'center center'
                  }}
                >
                  {/* Grid Overlay Graphic */}
                  <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none"></div>

                  {/* Empty Map State when no layout image is uploaded */}
                  {!mapBgImage && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 pointer-events-none p-6 text-center z-10">
                      <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-400 mb-3 shadow-inner">
                        <Map className="w-8 h-8" />
                      </div>
                      <p className="text-base font-bold text-slate-200">Belum Ada Denah Map Plant Karawang</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-md leading-relaxed">
                        Klik tombol <span className="text-blue-400 font-bold">"Ganti / Import Denah"</span> di toolbar atas untuk mengunggah gambar denah layout pabrik Karawang (JPG / PNG).
                      </p>
                    </div>
                  )}

                  {/* Plant Zone Labels */}
                  <div className="absolute top-4 left-6 bg-slate-900/90 text-white font-mono text-xs px-3 py-1.5 rounded-lg border border-slate-700 backdrop-blur-md pointer-events-none">
                    🏢 TCF KARAWANG PLANT LAYOUT • KG-01 SURVEILLANCE
                  </div>

                  {/* Render Camera Markers on Floorplan Map */}
                  {filteredCameras.map((cam) => {
                    const coords = cam.mapCoords || { x: 50, y: 50, rotation: 0 };
                    const isSelected = selectedCam && selectedCam.id === cam.id;

                    return (
                      <div
                        key={cam.id}
                        draggable={isEditMode}
                        onDragStart={(e) => {
                          setDraggingCamId(cam.id);
                          e.dataTransfer.setData('text/plain', cam.id);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCam(cam);
                        }}
                        style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all z-20 group camera-marker ${
                          isEditMode ? 'hover:z-30' : 'hover:z-30'
                        }`}
                      >
                        <div style={{ transform: `scale(${1 / mapZoom})`, transformOrigin: 'center center' }} className="relative flex items-center justify-center transition-transform">
                          {/* Camera FOV Field of View Arc Graphic */}
                          <div 
                            className="absolute w-24 h-24 -top-12 -left-12 pointer-events-none opacity-40 group-hover:opacity-80 transition-opacity"
                            style={{ transform: `rotate(${coords.rotation || 0}deg)` }}
                          >
                            <svg viewBox="0 0 100 100" className="w-full h-full text-blue-500 fill-current">
                              <path d="M 50 50 L 15 15 A 50 50 0 0 1 85 15 Z" />
                            </svg>
                          </div>

                          {/* Camera Marker Pin */}
                          <div className={`relative flex items-center gap-1 p-0.5 px-1 rounded-full shadow-lg border-2 transition-all ${
                            isSelected 
                              ? 'bg-blue-600 border-white text-white scale-110 ring-4 ring-blue-500/50' 
                              : cam.status === 'online' 
                              ? 'bg-slate-900/90 border-emerald-500 text-emerald-400 hover:bg-slate-800' 
                              : 'bg-slate-900/90 border-red-500 text-red-400'
                          } ${isEditMode ? 'hover:scale-125' : ''}`}>
                            <div className="relative flex items-center justify-center">
                              <Video className="w-2.5 h-2.5" />
                              {cam.status === 'online' && (
                                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                              )}
                            </div>

                            <span className="text-[8px] font-bold font-mono px-0.5 leading-none">
                              CH-0{cam.channel}
                            </span>

                            {/* Quick Rotation Buttons in Edit Mode */}
                            {isEditMode && (
                              <button
                                onClick={(e) => handleRotateCamera(e, cam.id, 45)}
                                className="p-0.5 bg-slate-800 hover:bg-blue-500 rounded text-white"
                                title="Rotate Camera FOV 45°"
                              >
                                <RotateCw className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>

                          {/* Camera Tooltip / Name Tag */}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5 bg-slate-900/95 text-white text-[8px] font-mono px-1 py-0.5 rounded whitespace-nowrap border border-slate-700 shadow-md pointer-events-none opacity-90 group-hover:opacity-100">
                            {String(cam.name || '').split(' - ')[0]}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Control Tray: Camera Pins & Live Stream Modal */}
            <div className="space-y-3">
              
              {/* Edit Mode Camera Tray (UniFi Controller Style Drag List) */}
              {isEditMode ? (
                <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5 space-y-3">
                  <h3 className="text-xs font-bold text-amber-900 flex items-center gap-2 uppercase tracking-wider">
                    <Move className="w-4 h-4 text-amber-600" />
                    CAMERAS DRAG & DROP TRAY
                  </h3>
                  <p className="text-[11px] text-amber-700">
                    Drag any camera item below directly onto the plant blueprint to position its pin!
                  </p>

                  <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                    {filteredCameras.map((cam) => (
                      <div
                        key={cam.id}
                        draggable
                        onDragStart={(e) => {
                          setDraggingCamId(cam.id);
                          e.dataTransfer.setData('text/plain', cam.id);
                        }}
                        onClick={() => setSelectedCam(cam)}
                        className="p-3 bg-white rounded-xl border border-amber-200 shadow-sm cursor-grab active:cursor-grabbing hover:border-amber-400 flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Video className="w-4 h-4 text-blue-600" />
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">{cam.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">CH-0{cam.channel} • {cam.location}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                          X:{cam.mapCoords?.x || 50}% Y:{cam.mapCoords?.y || 50}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Selected Camera Live Video & PTZ Popup Card */
                selectedCam && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                    <div className="border-b border-slate-100 pb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {selectedCam.category}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-1">{selectedCam.name}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" /> {selectedCam.location}
                      </p>
                    </div>

                    {/* Simulated Live Video Preview */}
                    <div className="relative bg-slate-950 aspect-video rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center text-center p-3">
                      <div className="w-12 h-12 rounded-full bg-slate-900/80 flex items-center justify-center border border-slate-800 mb-1">
                        <Video className="w-6 h-6 text-blue-500 animate-pulse" />
                      </div>
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/80 px-2 py-0.5 rounded text-[10px] text-white font-mono">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> LIVE STREAM
                      </div>
                    </div>

                    {/* Specs Table */}
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-50">
                        <span className="text-slate-400">IP Address:</span>
                        <span className="font-mono font-semibold text-slate-800">{selectedCam.ip}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-50">
                        <span className="text-slate-400">NVR Channel:</span>
                        <span className="font-mono font-bold text-blue-600">CH-0{selectedCam.channel}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">PTZ Support:</span>
                        <span className={`font-semibold ${selectedCam.ptzCapable ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {selectedCam.ptzCapable ? 'Supported' : 'Fixed Lens'}
                        </span>
                      </div>
                    </div>

                    {/* PTZ Controller Pad */}
                    {selectedCam.ptzCapable && (
                      <div className="pt-2 border-t border-slate-100 space-y-3">
                        <span className="text-xs font-bold text-slate-900 block text-center uppercase tracking-wider">
                          ISAPI PTZ Controller
                        </span>

                        <div className="flex flex-col items-center gap-1 my-2">
                          <button 
                            onClick={() => handlePtzCommand('UP')}
                            className="p-2 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 rounded-xl transition-all active:scale-95"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <div className="flex gap-3">
                            <button 
                              onClick={() => handlePtzCommand('LEFT')}
                              className="p-2 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 rounded-xl transition-all active:scale-95"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handlePtzCommand('HOME')}
                              className="px-2.5 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold active:scale-95"
                            >
                              RESET
                            </button>
                            <button 
                              onClick={() => handlePtzCommand('RIGHT')}
                              className="p-2 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 rounded-xl transition-all active:scale-95"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                          <button 
                            onClick={() => handlePtzCommand('DOWN')}
                            className="p-2 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 rounded-xl transition-all active:scale-95"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE MATRIX GRID */}
      {activeMainTab === 'matrix' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    categoryFilter === cat
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setGridLayout('1x1')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  gridLayout === '1x1' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" /> 1x1 Focus
              </button>
              <button
                onClick={() => setGridLayout('2x2')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  gridLayout === '2x2' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Grid className="w-3.5 h-3.5" /> 2x2 Quad
              </button>
              <button
                onClick={() => setGridLayout('3x3')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  gridLayout === '3x3' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Grid className="w-3.5 h-3.5" /> 3x3 View
              </button>

              <div className="w-px h-6 bg-slate-200 mx-1"></div>
              
              <button
                onClick={() => setShowTvGeneratorModal(true)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                title="Create a special TV monitoring dashboard link"
              >
                <ExternalLink className="w-3.5 h-3.5" /> TV Link Generator
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3 space-y-3">
              <div className={`grid gap-4 ${
                gridLayout === '1x1' ? 'grid-cols-1' :
                gridLayout === '2x2' ? 'grid-cols-1 md:grid-cols-2' :
                'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
              }`}>
                {currentCameras.map((cam) => {
                  const isSelected = selectedCam && selectedCam.id === cam.id;
                  return (
                    <div
                      key={cam.id}
                      onClick={() => setSelectedCam(cam)}
                      className={`relative rounded-2xl overflow-hidden border-2 transition-all cursor-pointer shadow-md group ${
                        isSelected ? 'border-blue-600 ring-4 ring-blue-500/20' : 'border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className={`relative bg-slate-950 flex items-center justify-center overflow-hidden ${isTvMode ? 'h-full' : 'aspect-video'}`}>
                        {/* Live Snapshot Component */}
                        <PreviewThumbnail cam={cam} autoLoad={true} fullSize={true} />

                        <div className="absolute top-2 left-2 right-2 flex justify-between items-center pointer-events-none">
                          <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-md border border-slate-700/50">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                            <span className="text-[11px] font-bold text-white font-mono">{String(cam.name || '').split(' - ')[0]}</span>
                          </div>
                          <div className="flex items-center gap-1 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-slate-300 font-mono">
                            <Radio className="w-3 h-3 text-emerald-400" /> {cam.resolution}
                          </div>
                        </div>

                        <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center pointer-events-none">
                          <div className="bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" /> {cam.location}
                          </div>
                          <div className="bg-black/80 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-mono text-white">
                            {currentTime}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-6">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors shadow-sm flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" /> Prev
                  </button>
                  <span className="text-slate-500 font-bold text-xs bg-slate-100 px-3 py-2 rounded-xl">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors shadow-sm flex items-center gap-1"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {selectedCam && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                  <div className="border-b border-slate-100 pb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {selectedCam.category}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{selectedCam.name}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> {selectedCam.location}
                    </p>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400">IP Address:</span>
                      <span className="font-mono font-semibold text-slate-800">{selectedCam.ip}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400">NVR Channel:</span>
                      <span className="font-mono font-bold text-blue-600">CH-0{selectedCam.channel}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">PTZ Status:</span>
                      <span className={`font-semibold ${selectedCam.ptzCapable ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {selectedCam.ptzCapable ? 'Supported' : 'Fixed Lens'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CAMERA & NVR CONFIGURATION */}
      {activeMainTab === 'config' && (
        <div className="space-y-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Server className="w-5 h-5 text-blue-600" /> ADOPTED HIKVISION NVRs & DVRs
              </h3>
              <button 
                onClick={() => {
                  setSelectedConfigNvr(null);
                  setNvrFormData({ ip: '', username: '', password: '', model: '' });
                }}
                className="px-3 py-1.5 bg-slate-900 hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add New DVR
              </button>
            </div>

            <div className="flex flex-wrap gap-3 pb-2">
              {adoptedNvrs.length === 0 && (
                <div className="text-slate-500 text-sm italic">No DVRs adopted yet. Click "Add New DVR" to sync your first NVR/DVR.</div>
              )}
              {adoptedNvrs.map((nvr) => (
                <button
                  key={nvr.ip}
                  onClick={() => {
                    setSelectedConfigNvr(nvr.ip);
                    setNvrFormData({
                      ip: nvr.ip,
                      username: nvr.username,
                      password: nvr.password,
                      model: nvr.model
                    });
                  }}
                  className={`px-4 py-3 rounded-xl border flex flex-col items-start transition-all ${
                    selectedConfigNvr === nvr.ip 
                      ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-600/20' 
                      : 'bg-white border-slate-200 hover:border-blue-400 hover:bg-slate-50'
                  }`}
                >
                  <span className={`font-bold text-sm ${selectedConfigNvr === nvr.ip ? 'text-blue-700' : 'text-slate-800'}`}>
                    {nvr.ip}
                  </span>
                  <span className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <Camera className="w-3 h-3" /> {nvr.cameraCount} Channels
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Server className="w-5 h-5 text-blue-600" /> {selectedConfigNvr ? 'NVR CONNECTION SETTINGS' : 'NEW NVR CONNECTION SETTINGS'}
            </h3>

            <form onSubmit={handleSaveNvrSettings} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">NVR Model Name</label>
                  <input 
                    type="text" 
                    value={nvrFormData.model} 
                    onChange={(e) => setNvrFormData({...nvrFormData, model: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">NVR IP Address</label>
                  <input 
                    type="text" 
                    value={nvrFormData.ip} 
                    onChange={(e) => setNvrFormData({...nvrFormData, ip: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Admin Username</label>
                  <input 
                    type="text" 
                    value={nvrFormData.username} 
                    onChange={(e) => setNvrFormData({...nvrFormData, username: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Admin Password</label>
                  <input 
                    type="password" 
                    value={nvrFormData.password || ''} 
                    onChange={(e) => setNvrFormData({...nvrFormData, password: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <Save className="w-4 h-4" /> Save Settings
                </button>
                <button 
                  type="button" 
                  onClick={handleSyncHikvision}
                  disabled={isSyncing}
                  className="px-6 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} /> 
                  {isSyncing ? 'Syncing with NVR...' : 'Sync Cameras from NVR'}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Video className="w-5 h-5 text-blue-600" /> REGISTERED CCTV CHANNELS & IP CAMERAS
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Manage camera streams, RTSP links, PTZ capabilities and map locations</p>
              </div>

              <button
                onClick={openAddModal}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add New CCTV Camera
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-3 py-1.5 text-[10px] uppercase">CH</th>
                    <th className="px-3 py-1.5 text-[10px] uppercase">PREVIEW</th>
                    <th className="px-3 py-1.5 text-[10px] uppercase">CAMERA NAME</th>
                    <th className="px-3 py-1.5 text-[10px] uppercase">NVR HOST</th>
                    <th className="px-3 py-1.5 text-[10px] uppercase">CAMERA IP</th>
                    <th className="px-3 py-1.5 text-[10px] uppercase">TYPE / CATEGORY</th>
                    <th className="px-3 py-1.5 text-[10px] uppercase text-center">PTZ</th>
                    <th className="px-3 py-1.5 text-[10px] uppercase text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {(() => {
                    const tableCams = selectedConfigNvr ? cameras.filter(cam => cam.nvrIp === selectedConfigNvr) : [];
                    if (tableCams.length === 0) return (
                      <tr>
                        <td colSpan="8" className="p-12 text-center text-slate-400 bg-slate-50/50">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <Server className="w-12 h-12 text-slate-200" />
                            <p className="font-bold">{selectedConfigNvr ? 'No cameras found for this NVR.' : 'Select an adopted NVR above to view its cameras.'}</p>
                          </div>
                        </td>
                      </tr>
                    );
                    return tableCams.map((cam) => (
                      <tr key={cam.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono font-bold text-blue-600">
                          CH-{String(cam.channel).padStart(2, '0')}
                        </td>
                        <td className="p-3 text-[11px]">
                          <PreviewThumbnail cam={cam} />
                        </td>
                        <td className="p-3 text-[11px]">
                          <div className="font-bold text-slate-800">{cam.name}</div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" /> {cam.location || 'Auto Synced'}
                          </div>
                        </td>
                        <td className="p-3 font-mono text-slate-700 bg-slate-50/50">
                          {cam.nvrIp || 'N/A'}
                        </td>
                        <td className="p-3 font-mono text-slate-700">
                          {cam.ip}
                        </td>
                        <td className="p-3 text-[11px]">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-medium">
                            {cam.category} • {cam.type}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {cam.ptzCapable ? (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded font-bold text-[10px]">YES (PTZ)</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-bold text-[10px]">FIXED</span>
                          )}
                        </td>
                        <td className="p-3 text-[11px]">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => openEditModal(cam)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Edit Camera Details"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteCamera(cam.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                              title="Remove Camera"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Camera Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Video className="w-4 h-4 text-blue-400" />
                {editingCam ? 'EDIT HIKVISION CAMERA CONFIGURATION' : 'ADD NEW HIKVISION CCTV CAMERA'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCamera} className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Camera Name</label>
                  <input
                    type="text"
                    value={camFormData.name}
                    onChange={(e) => setCamFormData({...camFormData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">NVR Channel Number</label>
                  <input
                    type="number"
                    value={camFormData.channel}
                    onChange={(e) => setCamFormData({...camFormData, channel: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">IP Address</label>
                  <input
                    type="text"
                    value={camFormData.ip}
                    onChange={(e) => setCamFormData({...camFormData, ip: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Location / Zone</label>
                  <input
                    type="text"
                    value={camFormData.location}
                    onChange={(e) => setCamFormData({...camFormData, location: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Category</label>
                  <select
                    value={camFormData.category}
                    onChange={(e) => setCamFormData({...camFormData, category: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600"
                  >
                    <option value="Data Center">Data Center</option>
                    <option value="Perimeter">Perimeter</option>
                    <option value="Production">Production</option>
                    <option value="Warehouse">Warehouse</option>
                    <option value="Office">Office</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Plant (Location)</label>
                  <select
                    value={camFormData.plant || 'SG'}
                    onChange={(e) => setCamFormData({...camFormData, plant: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600"
                  >
                    <option value="SG">Plant SG</option>
                    <option value="KG">Plant KG</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Camera Hardware Type</label>
                  <input
                    type="text"
                    value={camFormData.type}
                    onChange={(e) => setCamFormData({...camFormData, type: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" /> Save Camera
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TV Link Generator Modal */}
      {showTvGeneratorModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowTvGeneratorModal(false)}></div>
          <div className="relative bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-blue-400" /> TV Dashboard Link Generator
              </h2>
              <button onClick={() => setShowTvGeneratorModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 bg-slate-50 space-y-3 text-sm text-slate-700">
              <p>Create a special borderless dashboard link for your Security TV Monitors. All selected cameras will be automatically arranged on a single fullscreen view without pagination.</p>
              
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-slate-900 block">1. Select Cameras to Include</label>
                  <button 
                    onClick={() => {
                      if (tvGeneratorSelections.length === cameras.length) {
                        setTvGeneratorSelections([]);
                      } else {
                        setTvGeneratorSelections(cameras.map(c => c.id));
                      }
                    }}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    {tvGeneratorSelections.length === cameras.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2">
                  {cameras.map(cam => (
                    <label key={cam.id} className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={tvGeneratorSelections.includes(cam.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTvGeneratorSelections([...tvGeneratorSelections, cam.id]);
                          } else {
                            setTvGeneratorSelections(tvGeneratorSelections.filter(id => id !== cam.id));
                          }
                        }}
                        className="mt-0.5 w-4 h-4 text-blue-600 rounded"
                      />
                      <div>
                        <div className="font-bold text-slate-800 text-xs">{cam.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">CH-0{cam.channel} • {cam.location}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-2">
                <label className="font-bold text-blue-900 block">2. Copy Your Generated TV Link</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    readOnly
                    value={`${window.location.origin}${window.location.pathname}?tv=1${tvGeneratorSelections.length > 0 ? '&cams=' + tvGeneratorSelections.join(',') : ''}`}
                    className="flex-1 px-3 py-2 bg-white border border-blue-200 rounded-lg text-xs font-mono text-slate-700 outline-none"
                  />
                  <button 
                    onClick={() => {
                      const url = `${window.location.origin}${window.location.pathname}?tv=1&t=${Date.now()}${tvGeneratorSelections.length > 0 ? '&cams=' + tvGeneratorSelections.join(',') : ''}`;
                      if (navigator.clipboard && window.isSecureContext) {
                        navigator.clipboard.writeText(url);
                        alert('TV Link copied to clipboard!');
                      } else {
                        const textArea = document.createElement("textarea");
                        textArea.value = url;
                        document.body.appendChild(textArea);
                        textArea.focus();
                        textArea.select();
                        try {
                          document.execCommand('copy');
                          alert('TV Link copied to clipboard!');
                        } catch (err) {
                          alert('Failed to copy. Please copy the link manually.');
                        }
                        document.body.removeChild(textArea);
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg whitespace-nowrap shadow-sm"
                  >
                    Copy Link
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CctvCenter;
