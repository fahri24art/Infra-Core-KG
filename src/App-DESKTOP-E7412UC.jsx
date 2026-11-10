import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import RemoteDesktop from './components/RemoteDesktop';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Assets from './pages/Assets';
import AssetDetail from './pages/AssetDetail';
import MaintenanceSchedule from './pages/MaintenanceSchedule';
import MaintenanceExecution from './pages/MaintenanceExecution';
import UserPortal from './pages/UserPortal';
import Tickets from './pages/Tickets';
import Reports from './pages/Reports';
import Admin from './pages/Admin';
import UserManagement from './pages/admin/UserManagement';
import DepartmentManagement from './pages/admin/DepartmentManagement';
import DivisionManagement from './pages/admin/DivisionManagement';
import SystemSettings from './pages/admin/SystemSettings';
import Agent from './pages/Agent';
import NetworkPage from './pages/Network';
import SecurityPage from './pages/Security';
import PolicyPage from './pages/Policy';
import ObjectsPage from './pages/Objects';
import NexusHub from './pages/NexusHub';
import SupportCenter from './pages/SupportCenter';
import bgImage from './assets/space-background.jpg';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="p-20 text-center bg-white h-screen">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong.</h1>
                    <pre className="text-xs bg-slate-100 p-4 rounded-lg overflow-auto max-w-2xl mx-auto text-left">
                        {this.state.error?.toString()}
                    </pre>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg font-bold"
                    >
                        Reload Page
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

function Layout({ children }) {
    const location = useLocation();
    const isLoginPage = location.pathname.startsWith('/login');
    const isNexusPage = location.pathname === '/' || location.pathname === '/nexus';
    const isSupportPage = location.pathname === '/support';
    const isPortalPage = location.pathname === '/portal';
    const hideHeaderFooter = isLoginPage || isNexusPage || isSupportPage || isPortalPage;

    return (
        <div className="min-h-screen bg-[#020617] font-sans text-slate-100 flex flex-col relative overflow-hidden">
            {/* Global Background Layer */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div
                    className="absolute inset-[-10%] z-0 bg-cover bg-center bg-no-repeat opacity-20 animate-drift"
                    style={{ backgroundImage: `url(${bgImage})` }}
                ></div>
            </div>

            <div className="relative z-10 flex flex-col min-h-screen">
                {!hideHeaderFooter && <Header />}
                <main className="flex-grow">
                    {children}
                </main>
                {!hideHeaderFooter && <Footer />}
            </div>
        </div>
    );
}

// Protected Route Component
const ProtectedRoute = ({ children, requireAdmin = false }) => {
    const user = JSON.parse(sessionStorage.getItem('user') || 'null');

    if (!user) {
        // Smart redirect to specific login portal
        const loginType = requireAdmin ? 'admin' : 'support';
        return <Navigate to={`/login/${loginType}`} replace />;
    }

    if (requireAdmin && user.role !== 'admin') {
        return <Navigate to="/support" replace />;
    }

    return children;
};

function App() {
    return (
        <Router>
            <Layout>
                <ErrorBoundary>
                    <Routes>
                        <Route path="/" element={<NexusHub />} />
                        <Route path="/nexus" element={<Navigate to="/" replace />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/login/:type" element={<Login />} />

                        {/* Admin Only Routes */}
                        <Route path="/dashboard" element={<ProtectedRoute requireAdmin={true}><Dashboard /></ProtectedRoute>} />
                        <Route path="/assets" element={<ProtectedRoute requireAdmin={true}><Assets /></ProtectedRoute>} />
                        <Route path="/assets/:id" element={<ProtectedRoute requireAdmin={true}><AssetDetail /></ProtectedRoute>} />
                        <Route path="/maintenance" element={<ProtectedRoute requireAdmin={true}><MaintenanceSchedule /></ProtectedRoute>} />
                        <Route path="/maintenance/execution/:id" element={<ProtectedRoute requireAdmin={true}><MaintenanceExecution /></ProtectedRoute>} />
                        <Route path="/tickets" element={<ProtectedRoute requireAdmin={true}><Tickets /></ProtectedRoute>} />
                        <Route path="/reports" element={<ProtectedRoute requireAdmin={true}><Reports /></ProtectedRoute>} />
                        <Route path="/agent" element={<ProtectedRoute requireAdmin={true}><Agent /></ProtectedRoute>} />
                        <Route path="/remote/:id" element={<ProtectedRoute requireAdmin={true}><RemoteDesktop /></ProtectedRoute>} />
                        <Route path="/admin" element={<ProtectedRoute requireAdmin={true}><Admin /></ProtectedRoute>} />
                        <Route path="/admin/users" element={<ProtectedRoute requireAdmin={true}><UserManagement /></ProtectedRoute>} />
                        <Route path="/admin/departments" element={<ProtectedRoute requireAdmin={true}><DepartmentManagement /></ProtectedRoute>} />
                        <Route path="/admin/divisions" element={<ProtectedRoute requireAdmin={true}><DivisionManagement /></ProtectedRoute>} />
                        <Route path="/admin/settings" element={<ProtectedRoute requireAdmin={true}><SystemSettings /></ProtectedRoute>} />
                        <Route path="/network" element={<ProtectedRoute requireAdmin={true}><NetworkPage /></ProtectedRoute>} />
                        <Route path="/security" element={<ProtectedRoute requireAdmin={true}><SecurityPage /></ProtectedRoute>} />
                        <Route path="/policy" element={<ProtectedRoute requireAdmin={true}><PolicyPage /></ProtectedRoute>} />
                        <Route path="/objects" element={<ProtectedRoute requireAdmin={true}><ObjectsPage /></ProtectedRoute>} />

                        {/* Public/User Routes */}
                        <Route path="/portal" element={<UserPortal />} />
                        <Route path="/support" element={<ProtectedRoute><SupportCenter /></ProtectedRoute>} />
                    </Routes>
                </ErrorBoundary>
            </Layout>
        </Router>
    );
}

export default App;
