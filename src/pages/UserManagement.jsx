import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { onDataChange } from '../utils/dataSync';
import { useAuth } from '../context/AuthContext';
import { Users, UserPlus, Edit, Trash2, X, AlertCircle } from 'lucide-react';

const ROLES = {
    MANAGER: 'Account Manager',
    WAGES_CLERK: 'Wages Clerk',
    ACCOUNTS_CLERK: 'Accounts Clerk'
};

const UserManagement = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        password: '',
        role: ROLES.WAGES_CLERK
    });
    const [submitting, setSubmitting] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    useEffect(() => {
        fetchUsers();
        const unsubscribe = onDataChange(() => fetchUsers());
        return () => unsubscribe();
    }, [fetchUsers]);

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get('/auth/users');
            setUsers(response.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch users');
        } finally {
            setLoading(false);
        }
    }, []);

    const resetForm = () => {
        setFormData({ full_name: '', email: '', password: '', role: ROLES.WAGES_CLERK });
        setEditingUser(null);
    };

    const handleOpenModal = (user = null) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                full_name: user.full_name,
                email: user.email,
                password: '',
                role: user.role
            });
        } else {
            resetForm();
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            if (editingUser) {
                const updateData = {
                    full_name: formData.full_name,
                    email: formData.email,
                    role: formData.role
                };
                if (formData.password) {
                    updateData.password = formData.password;
                }
                await api.put(`/auth/users/${editingUser.id}`, updateData);
            } else {
                await api.post('/auth/users', formData);
            }
            await fetchUsers();
            setIsModalOpen(false);
            resetForm();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save user');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        setSubmitting(true);
        setError('');
        try {
            await api.delete(`/auth/users/${id}`);
            await fetchUsers();
            setDeleteConfirm(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete user');
        } finally {
            setSubmitting(false);
        }
    };

    const getRoleBadgeClass = (role) => {
        switch (role) {
            case ROLES.MANAGER:
                return 'bg-purple-100 text-purple-700';
            case ROLES.WAGES_CLERK:
                return 'bg-blue-100 text-blue-700';
            case ROLES.ACCOUNTS_CLERK:
                return 'bg-green-100 text-green-700';
            default:
                return 'bg-slate-100 text-slate-700';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">User Directory</h3>
                    <p className="text-sm text-slate-500">Manage organizational access and roles</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-[#1742c4] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-800 transition-colors shadow-sm font-semibold"
                >
                    <UserPlus size={18} />
                    Create User
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border-b border-red-200 text-red-600 flex items-center gap-2">
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider">
                        <tr>
                            <th className="px-6 py-4">Name</th>
                            <th className="px-6 py-4">Email</th>
                            <th className="px-6 py-4">Access Role</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {users.map((u) => (
                            <tr key={u.id} className="hover:bg-slate-50/80 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200">
                                            {u.full_name ? u.full_name[0] : '?'}
                                        </div>
                                        <span className="font-semibold text-slate-900">
                                            {u.full_name}
                                            {u.id === currentUser?.id && <span className="text-blue-600 ml-1">(You)</span>}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-600">{u.email}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${getRoleBadgeClass(u.role)}`}>
                                        {u.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => handleOpenModal(u)}
                                            className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        {u.id !== currentUser?.id && (
                                            <button
                                                onClick={() => setDeleteConfirm(u.id)}
                                                className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {users.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                    <Users size={40} className="mx-auto mb-4 text-slate-300" />
                    <p>No users found. Create your first user.</p>
                </div>
            )}

            {deleteConfirm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                                <AlertCircle size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Delete User?</h3>
                            <p className="text-slate-500">This action cannot be undone.</p>
                        </div>
                        <div className="flex gap-3 p-6 pt-0">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm)}
                                disabled={submitting}
                                className="flex-1 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                                {submitting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-800">
                                {editingUser ? 'Edit User' : 'Add New User'}
                            </h3>
                            <button
                                onClick={() => { setIsModalOpen(false); resetForm(); }}
                                className="p-1 text-slate-400 hover:text-slate-600"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.full_name}
                                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Password {editingUser && '(leave blank to keep current)'}
                                </label>
                                <input
                                    type="password"
                                    required={!editingUser}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Role Assignment</label>
                                <select
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value={ROLES.MANAGER}>{ROLES.MANAGER}</option>
                                    <option value={ROLES.WAGES_CLERK}>{ROLES.WAGES_CLERK}</option>
                                    <option value={ROLES.ACCOUNTS_CLERK}>{ROLES.ACCOUNTS_CLERK}</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                                <button
                                    type="button"
                                    onClick={() => { setIsModalOpen(false); resetForm(); }}
                                    className="flex-1 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 py-2 bg-[#1742c4] text-white font-semibold rounded-lg hover:bg-blue-800 transition-colors shadow-md disabled:opacity-50"
                                >
                                    {submitting ? 'Saving...' : (editingUser ? 'Save Changes' : 'Create Account')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
