import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Settings, LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ProfileDropdown({ user }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();
    const { logout } = useAuth();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = (e) => {
        e.preventDefault();
        logout();
    };

    const displayName = user?.fullName || user?.full_name || 'Admin User';
    const displayRole = user?.role || 'Account Manager';

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 sm:gap-3 p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#F5B52A] flex items-center justify-center text-[#2D328F] font-bold text-xs shadow-md">
                    {displayName
                        .split(" ")
                        .map(n => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                </div>
                <div className="hidden sm:block text-left">
                    <p className="text-white font-semibold text-xs tracking-wide leading-tight">{displayName}</p>
                    <p className="text-slate-300 text-[10px] font-medium">{displayRole}</p>
                </div>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Account</p>
                        <p className="text-sm font-medium text-gray-800 mt-1">{displayName}</p>
                        <p className="text-xs text-gray-500">{displayRole}</p>
                    </div>

                    <button
                        onClick={() => { navigate('/settings'); setIsOpen(false); }}
                        className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer w-full"
                    >
                        <Settings className="w-4 h-4" />
                        <span className="text-sm">Settings</span>
                    </button>

                    <div className="border-t border-gray-100 my-1"></div>

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors cursor-pointer w-full"
                    >
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm font-medium">Logout</span>
                    </button>
                </div>
            )}
        </div>
    );
}
