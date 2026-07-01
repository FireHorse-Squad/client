import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Key, User, CheckCircle, AlertCircle } from 'lucide-react';

const Settings = () => {
    const { user, updateUser } = useAuth();
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [message, setMessage] = useState({ type: '', text: '' });
    const [loading, setLoading] = useState(false);

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }

        if (passwordData.newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/change-password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });

            setMessage({ type: 'success', text: 'Password updated successfully!' });
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update password' });
        } finally {
            setLoading(false);
        }
    };

    const getRoleBadgeClass = (role) => {
        switch (role) {
            case 'Account Manager':
                return 'bg-[#FFAE3B] text-[#2D328F]';
            case 'Wages Clerk':
                return 'bg-[#FFAE3B] text-[#2D328F]';
            case 'Accounts Clerk':
                return 'bg-[#FFAE3B] text-[#2D328F]';
            default:
                return 'bg-[#FFAE3B] text-[#2D328F]';
        }
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-6 ml-4 mt-6 rounded-xl border border-slate-200 shadow-sm text-center">
                    <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600 font-bold text-3xl border-4 border-white shadow-md">
                        {user.fullName ? user.fullName[0] : user.full_name ? user.full_name[0] : '?'}
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">{user.fullName || user.full_name}</h3>
                    <p className="text-slate-500 mb-4">{user.email}</p>
                    <div className={`inline-block px-3 py-1 ${getRoleBadgeClass(user.role)} rounded-full text-xs font-bold uppercase tracking-wider`}>
                        {user.role}
                    </div>
                </div>

                <div className="bg-[#4B51C7] p-6 ml-4 rounded-xl text-white shadow-xl">
                    <h4 className="font-bold flex items-center gap-2 mb-4">
                        <ShieldCheck size={18} className="text-[#EE8623]" />
                        Account Integrity
                    </h4>
                    <p className="text-xs text-[#EE8623] leading-relaxed">
                        Your account is currently active. Last sign in was {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}.
                    </p>
                </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-6 mr-4">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Key size={18} className="text-blue-600" />
                            Security Settings
                        </h3>
                    </div>
                    <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
                        {message.text && (
                            <div className={`p-3 rounded-lg text-sm font-medium flex items-center gap-2 ${
                                message.type === 'success'
                                    ? 'bg-green-50 text-green-700 border border-green-200'
                                    : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                                {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                                {message.text}
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                            <input
                                type="password"
                                required
                                placeholder="Enter current password"
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                value={passwordData.currentPassword}
                                onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                            <input
                                type="password"
                                required
                                placeholder="Enter new secure password"
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                value={passwordData.newPassword}
                                onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                            <input
                                type="password"
                                required
                                placeholder="Confirm new password"
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                value={passwordData.confirmPassword}
                                onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                            />
                        </div>
                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-[#EE8623] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#FFAE3B] transition-all shadow-md disabled:opacity-50"
                            >
                                {loading ? 'Updating...' : 'Update Password'}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mr-4">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <User size={18} className="text-blue-600" />
                            Profile Information
                        </h3>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Full Name</p>
                            <p className="text-slate-800 font-medium">{user.fullName || user.full_name}</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Access Level</p>
                            <p className="text-slate-800 font-medium">{user.role}</p>
                        </div>
                        <div className="md:col-span-2">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Email Address</p>
                            <p className="text-slate-800 font-medium">{user.email}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
