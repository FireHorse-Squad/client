import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
// import Dashboard from './pages/Dashboard';
import Timesheets from './pages/Timesheets';
import BatchExport from './pages/BatchExport';
import CostingSchedule from './pages/CostingSchedule';
import Employees from './pages/Employees';
import TransactionCodes from './pages/TransactionCodes';
import Clients from './pages/Clients';
import Settings from './pages/Settings';
import UserManagement from './pages/UserManagement';
import TopBar from './component/_plans/TopBar';
import Toast from './component/_plans/Toast';

const ROLES = {
    MANAGER: 'Account Manager',
    WAGES_CLERK: 'Wages Clerk',
    ACCOUNTS_CLERK: 'Accounts Clerk',
    WAGES_HR: 'Wages HR'
};

const PAGE_ROLES = {
    // '/dashboard': [ROLES.MANAGER, ROLES.WAGES_CLERK, ROLES.ACCOUNTS_CLERK],
    '/timesheets': [ROLES.MANAGER, ROLES.WAGES_CLERK],
    '/batch-export': [ROLES.MANAGER, ROLES.WAGES_CLERK],
    '/costing-schedule': [ROLES.MANAGER, ROLES.WAGES_CLERK],
    '/clients': [ROLES.MANAGER, ROLES.WAGES_CLERK, ROLES.ACCOUNTS_CLERK],
    '/employees': [ROLES.MANAGER, ROLES.WAGES_CLERK, ROLES.ACCOUNTS_CLERK, ROLES.WAGES_HR],
    '/transaction-codes': [ROLES.MANAGER, ROLES.WAGES_CLERK, ROLES.ACCOUNTS_CLERK],
    '/settings': [ROLES.MANAGER, ROLES.WAGES_CLERK, ROLES.ACCOUNTS_CLERK, ROLES.WAGES_HR],
    '/user-management': [ROLES.MANAGER]
};

function AppLayout() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-[#2D328F] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-[#2D328F] font-medium">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 text-slate-800 font-sans flex flex-col">
            <TopBar user={user} />
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
                <div className="max-w-7xl mx-auto">
                    <Routes>
                        {/* <Route path="/dashboard" element={
                            <ProtectedRoute requiredRoles={PAGE_ROLES['/dashboard']}>
                                <Dashboard />
                            </ProtectedRoute>
                        } /> */}
                        <Route path="/timesheets" element={
                            <ProtectedRoute requiredRoles={PAGE_ROLES['/timesheets']}>
                                <Timesheets />
                            </ProtectedRoute>
                        } />
                        <Route path="/batch-export" element={
                            <ProtectedRoute requiredRoles={PAGE_ROLES['/batch-export']}>
                                <BatchExport />
                            </ProtectedRoute>
                        } />
                        <Route path="/costing-schedule" element={
                            <ProtectedRoute requiredRoles={PAGE_ROLES['/costing-schedule']}>
                                <CostingSchedule />
                            </ProtectedRoute>
                        } />
                        <Route path="/clients" element={
                            <ProtectedRoute requiredRoles={PAGE_ROLES['/clients']}>
                                <Clients />
                            </ProtectedRoute>
                        } />
                        <Route path="/employees" element={
                            <ProtectedRoute requiredRoles={PAGE_ROLES['/employees']}>
                                <Employees />
                            </ProtectedRoute>
                        } />
                        <Route path="/transaction-codes" element={
                            <ProtectedRoute requiredRoles={PAGE_ROLES['/transaction-codes']}>
                                <TransactionCodes />
                            </ProtectedRoute>
                        } />
                        <Route path="/settings" element={
                            <ProtectedRoute requiredRoles={PAGE_ROLES['/settings']}>
                                <Settings />
                            </ProtectedRoute>
                        } />
                        <Route path="/user-management" element={
                            <ProtectedRoute requiredRoles={PAGE_ROLES['/user-management']}>
                                <UserManagement />
                            </ProtectedRoute>
                        } />
                        <Route path="*" element={<Navigate to="/timesheets" replace />} />
                    </Routes>
                </div>
            </main>
        </div>
    );
}

function App() {
    return (
        <AuthProvider>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/*" element={<AppLayout />} />
            </Routes>
        </AuthProvider>
    );
}

export default App;
