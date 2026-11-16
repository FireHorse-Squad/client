//trigger deployment
import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import TopBar from './component/_plans/TopBar';
import Toast from './component/_plans/Toast';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Timesheets = lazy(() => import('./pages/Timesheets'));
const BatchExport = lazy(() => import('./pages/BatchExport'));
const CostingSchedule = lazy(() => import('./pages/CostingSchedule'));
const Employees = lazy(() => import('./pages/Employees'));
const TransactionCodes = lazy(() => import('./pages/TransactionCodes'));
const Clients = lazy(() => import('./pages/Clients'));
const Settings = lazy(() => import('./pages/Settings'));
const UserManagement = lazy(() => import('./pages/UserManagement'));

function PageLoading() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-[#2D328F] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-[#2D328F] font-medium">Loading page...</p>
            </div>
        </div>
    );
}

const ROLES = {
    MANAGER: 'Account Manager',
    WAGES_CLERK: 'Wages Clerk',
    ACCOUNTS_CLERK: 'Accounts Clerk',
    WAGES_HR: 'Wages HR',
    CAPE_TOWN_ADMIN: 'Cape Town Admin'
};

const PAGE_ROLES = {
    '/dashboard': [ROLES.MANAGER],
    '/timesheets': [ROLES.MANAGER, ROLES.WAGES_CLERK, ROLES.CAPE_TOWN_ADMIN],
    '/batch-export': [ROLES.MANAGER, ROLES.WAGES_CLERK, ROLES.CAPE_TOWN_ADMIN],
    '/costing-schedule': [ROLES.MANAGER, ROLES.WAGES_CLERK, ROLES.CAPE_TOWN_ADMIN],
    '/clients': [ROLES.MANAGER,  ROLES.ACCOUNTS_CLERK],
    '/employees': [ROLES.MANAGER, ROLES.WAGES_HR],
    '/transaction-codes': [ROLES.MANAGER],
    '/settings': [ROLES.MANAGER, ROLES.WAGES_CLERK, ROLES.ACCOUNTS_CLERK, ROLES.WAGES_HR, ROLES.CAPE_TOWN_ADMIN],
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
                <div className="max-w-[1900px] mx-auto">
                    <Routes>
                          { <Route path="/dashboard" element={
                            <Suspense fallback={<PageLoading />}>
                              <ProtectedRoute requiredRoles={PAGE_ROLES['/dashboard']}>
                                <Dashboard />
                              </ProtectedRoute>
                            </Suspense>
                        } /> }
                        <Route path="/timesheets" element={
                            <Suspense fallback={<PageLoading />}>
                                <ProtectedRoute requiredRoles={PAGE_ROLES['/timesheets']}>
                                    <Timesheets />
                                </ProtectedRoute>
                            </Suspense>
                        } />
                        <Route path="/batch-export" element={
                            <Suspense fallback={<PageLoading />}>
                                <ProtectedRoute requiredRoles={PAGE_ROLES['/batch-export']}>
                                    <BatchExport />
                                </ProtectedRoute>
                            </Suspense>
                        } />
                        <Route path="/costing-schedule" element={
                            <Suspense fallback={<PageLoading />}>
                                <ProtectedRoute requiredRoles={PAGE_ROLES['/costing-schedule']}>
                                    <CostingSchedule />
                                </ProtectedRoute>
                            </Suspense>
                        } />
                        <Route path="/clients" element={
                            <Suspense fallback={<PageLoading />}>
                                <ProtectedRoute requiredRoles={PAGE_ROLES['/clients']}>
                                    <Clients />
                                </ProtectedRoute>
                            </Suspense>
                        } />
                        <Route path="/employees" element={
                            <Suspense fallback={<PageLoading />}>
                                <ProtectedRoute requiredRoles={PAGE_ROLES['/employees']}>
                                    <Employees />
                                </ProtectedRoute>
                            </Suspense>
                        } />
                        <Route path="/transaction-codes" element={
                            <Suspense fallback={<PageLoading />}>
                                <ProtectedRoute requiredRoles={PAGE_ROLES['/transaction-codes']}>
                                    <TransactionCodes />
                                </ProtectedRoute>
                            </Suspense>
                        } />
                        <Route path="/settings" element={
                            <Suspense fallback={<PageLoading />}>
                                <ProtectedRoute requiredRoles={PAGE_ROLES['/settings']}>
                                    <Settings />
                                </ProtectedRoute>
                            </Suspense>
                        } />
                        <Route path="/user-management" element={
                            <Suspense fallback={<PageLoading />}>
                                <ProtectedRoute requiredRoles={PAGE_ROLES['/user-management']}>
                                    <UserManagement />
                                </ProtectedRoute>
                            </Suspense>
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
                <Route path="/login" element={
                    <Suspense fallback={<PageLoading />}>
                        <Login />
                    </Suspense>
                } />
                <Route path="/*" element={<AppLayout />} />
            </Routes>
        </AuthProvider>
    );
}

export default App;
