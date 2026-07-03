import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Drawer, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import Logo from "../../assets/img/Firehorselogo.png";
import ProfileDropdown from '../../components/ProfileDropdown';

const pages = [
    // { key: 'dashboard', label: 'Dashboard' },
    { key: 'timesheets', label: 'Timesheets' },
    { key: 'batch-export', label: 'Batch Export' },
    { key: 'costing-schedule', label: 'Costing Schedule' },
    { key: 'clients', label: 'Clients' },
    { key: 'employees', label: 'Employees' },
    { key: 'transaction-codes', label: 'Transaction Codes' }
];

export default function TopBar({ user }) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const currentPath = location.pathname;

    const getPageKeyFromPath = (path) => {
        // if (path === '/dashboard') return 'dashboard';
        if (path === '/timesheets') return 'timesheets';
        if (path === '/batch-export') return 'batch-export';
        if (path === '/costing-schedule') return 'costing-schedule';
        if (path === '/clients') return 'clients';
        if (path === '/employees') return 'employees';
        if (path === '/transaction-codes') return 'transaction-codes';
        if (path === '/user-management') return 'user-management';
        return null;
    };

    const activePage = getPageKeyFromPath(currentPath);

    return (
        <header className="bg-[#2D328F] border-b border-slate-200/80 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4 z-30 w-full">
            <div className="flex items-center gap-2 sm:gap-3">
                <IconButton
                    color="inherit"
                    aria-label="open navigation menu"
                    sx={{ display: { xs: 'flex', lg: 'none' } }}
                    onClick={() => setMobileOpen(true)}
                >
                    <MenuIcon sx={{ color: 'white' }} />
                </IconButton>
                <div className="flex-shrink-0">
                    <img src={Logo} alt="Firehorse" className='w-[70px] sm:w-[100px] md:w-[110px] lg:w-[130px] h-[32px] sm:h-[40px] md:h-[50px] lg:h-[60px] object-contain' />
                </div>
            </div>

            <nav className="hidden lg:flex flex-1 justify-center items-center">
                <div className="flex items-center gap-1 sm:gap-2 bg-[#FFFFFF] p-1.5 sm:p-2 rounded-xl shadow-inner">
                    {pages.map((page) => {
                        const isActive = activePage === page.key;
                        return (
                            <button
                                key={page.key}
                                onClick={() => navigate(`/${page.key === 'timesheets' ? 'timesheets' : page.key}`)}
                                className={`h-[35px] px-3 sm:px-5 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all duration-200 whitespace-nowrap ${
                                    isActive
                                        ? 'bg-[#F5B52A] text-[#FFFFFF] shadow-sm'
                                        : 'text-[#2D328F] hover:bg-[#F5B52A]/10 hover:text-[#2D328F]'
                                }`}
                            >
                                {page.label}
                            </button>
                        );
                    })}
                    {user?.role === 'Account Manager' && (
                        <button
                            onClick={() => navigate('/user-management')}
                            className={`h-[35px] px-3 sm:px-5 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all duration-200 whitespace-nowrap ${
                                activePage === 'user-management'
                                    ? 'bg-[#F5B52A] text-[#FFFFFF] shadow-sm'
                                    : 'text-[#2D328F] hover:bg-[#F5B52A]/10 hover:text-[#2D328F]'
                            }`}
                        >
                            User Management
                        </button>
                    )}
                </div>
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden lg:block w-px h-8 bg-white/20" />
                <ProfileDropdown user={user} />
            </div>

            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={() => setMobileOpen(false)}
                ModalProps={{ keepMounted: true }}
                PaperProps={{
                    sx: {
                        width: 280,
                        bgcolor: '#2D328F',
                    }
                }}
            >
                <div className="h-full flex flex-col text-white">
                    <div className="p-4 flex items-center justify-between border-b border-white/10">
                        <span className="text-sm font-bold tracking-wide">Navigation</span>
                        <IconButton
                            onClick={() => setMobileOpen(false)}
                            sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
                        >
                            <ChevronRightIcon />
                        </IconButton>
                    </div>
                    <div className="flex-1 overflow-y-auto py-4">
                        {pages.map((page) => (
                            <button
                                key={page.key}
                                onClick={() => {
                                    navigate(`/${page.key === 'timesheets' ? 'timesheets' : page.key}`);
                                    setMobileOpen(false);
                                }}
                                className={`w-full text-left px-5 py-3.5 text-sm font-semibold transition-all duration-200 border-l-4 ${
                                    activePage === page.key
                                        ? 'bg-[#F5B52A]/20 border-[#F5B52A] text-white'
                                        : 'border-transparent text-white/90 hover:bg-white/10'
                                }`}
                            >
                                {page.label}
                            </button>
                        ))}
                        {user?.role === 'Account Manager' && (
                            <button
                                onClick={() => {
                                    navigate('/user-management');
                                    setMobileOpen(false);
                                }}
                                className={`w-full text-left px-5 py-3.5 text-sm font-semibold transition-all duration-200 border-l-4 ${
                                    activePage === 'user-management'
                                        ? 'bg-[#F5B52A]/20 border-[#F5B52A] text-white'
                                        : 'border-transparent text-white/90 hover:bg-white/10'
                                }`}
                            >
                                User Management
                            </button>
                        )}
                    </div>
                </div>
            </Drawer>
        </header>
    );
}
