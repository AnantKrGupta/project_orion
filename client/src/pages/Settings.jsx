import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import {
    Settings as SettingsIcon,
    Lock,
    Trash2,
    AlertTriangle,
    Eye,
    EyeOff,
    Check,
    ArrowLeft
} from 'lucide-react';
import { deleteUser } from 'firebase/auth';
import { auth } from '../firebase';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export default function Settings() {
    const { user, changePassword, logout } = useAuth();
    const navigate = useNavigate();

    // Change Password
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordSuccess, setPasswordSuccess] = useState(false);
    const [passwordError, setPasswordError] = useState('');

    // Delete Account
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordError('');

        if (newPassword.length < 8) {
            setPasswordError('Password must be at least 8 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError('Passwords do not match');
            return;
        }

        setPasswordLoading(true);
        try {
            await changePassword(newPassword);
            setPasswordSuccess(true);
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => {
                setPasswordSuccess(false);
                setShowChangePassword(false);
            }, 2000);
        } catch (err) {
            if (err.code === 'auth/requires-recent-login') {
                setPasswordError('Please logout and login again to change password');
            } else {
                setPasswordError(err.message || 'Failed to change password');
            }
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'DELETE') return;

        setDeleteLoading(true);
        setDeleteError('');

        try {
            // Delete from MongoDB first
            const res = await fetch(`${SERVER_URL}/api/users/${user.email}`, {
                method: 'DELETE'
            });

            if (!res.ok) {
                throw new Error('Failed to delete account data');
            }

            // Delete from Firebase
            const currentUser = auth.currentUser;
            if (currentUser) {
                await deleteUser(currentUser);
            }

            // Logout and redirect
            await logout();
            navigate('/login');
        } catch (err) {
            if (err.code === 'auth/requires-recent-login') {
                setDeleteError('Please logout and login again to delete account');
            } else {
                setDeleteError(err.message || 'Failed to delete account');
            }
            setDeleteLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-dark-900 p-4 pb-24">
            <div className="max-w-lg mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate('/app/profile')}
                        className="p-2 hover:bg-dark-800 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </button>
                    <div className="flex items-center gap-3">
                        <SettingsIcon className="w-8 h-8 text-purple-400" />
                        <h1 className="text-2xl font-bold text-white">Settings</h1>
                    </div>
                </div>

                {/* Account Info */}
                <div className="card p-4 mb-6">
                    <h2 className="text-lg font-semibold text-white mb-2">Account</h2>
                    <p className="text-gray-400">{user?.email}</p>
                </div>

                {/* Change Password */}
                <div className="card p-4 mb-6">
                    <button
                        onClick={() => setShowChangePassword(!showChangePassword)}
                        className="w-full flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <Lock className="w-5 h-5 text-purple-400" />
                            <span className="text-white font-medium">Change Password</span>
                        </div>
                        <span className="text-gray-400">{showChangePassword ? '−' : '+'}</span>
                    </button>

                    <AnimatePresence>
                        {showChangePassword && (
                            <motion.form
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                onSubmit={handleChangePassword}
                                className="mt-4 space-y-4 overflow-hidden"
                            >
                                {passwordError && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                                        {passwordError}
                                    </div>
                                )}

                                {passwordSuccess && (
                                    <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm flex items-center gap-2">
                                        <Check size={16} />
                                        Password changed successfully!
                                    </div>
                                )}

                                <div>
                                    <label className="block text-gray-400 text-sm mb-2">New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="input w-full pr-12"
                                            placeholder="At least 8 characters"
                                            required
                                            minLength={8}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-gray-400 text-sm mb-2">Confirm Password</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="input w-full"
                                        placeholder="Confirm new password"
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={passwordLoading}
                                    className="w-full btn-primary py-2.5 flex items-center justify-center gap-2"
                                >
                                    {passwordLoading ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        'Update Password'
                                    )}
                                </button>
                            </motion.form>
                        )}
                    </AnimatePresence>
                </div>

                {/* Delete Account */}
                <div className="card p-4 border-red-500/20">
                    <button
                        onClick={() => setShowDeleteModal(true)}
                        className="w-full flex items-center gap-3 text-red-400 hover:text-red-300 transition-colors"
                    >
                        <Trash2 className="w-5 h-5" />
                        <span className="font-medium">Delete Account</span>
                    </button>
                </div>

                {/* Delete Confirmation Modal */}
                <AnimatePresence>
                    {showDeleteModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-dark-800 rounded-2xl p-6 w-full max-w-md border border-red-500/30"
                            >
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <AlertTriangle className="w-8 h-8 text-red-400" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-white mb-2">Delete Account?</h2>
                                    <p className="text-gray-400 text-sm">
                                        This will permanently delete your account and all your data including:
                                    </p>
                                    <ul className="text-red-400 text-sm mt-2 space-y-1">
                                        <li>• All your posts</li>
                                        <li>• All your comments</li>
                                        <li>• All your friendships</li>
                                        <li>• Your profile</li>
                                    </ul>
                                    <p className="text-red-400 font-bold mt-4">This cannot be undone!</p>
                                </div>

                                {deleteError && (
                                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                                        {deleteError}
                                    </div>
                                )}

                                <div className="mb-4">
                                    <label className="block text-gray-400 text-sm mb-2">
                                        Type <span className="text-red-400 font-bold">DELETE</span> to confirm
                                    </label>
                                    <input
                                        type="text"
                                        value={deleteConfirmText}
                                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                                        className="input w-full"
                                        placeholder="Type DELETE"
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setShowDeleteModal(false);
                                            setDeleteConfirmText('');
                                            setDeleteError('');
                                        }}
                                        className="flex-1 py-2.5 bg-dark-700 text-white rounded-xl hover:bg-dark-600 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDeleteAccount}
                                        disabled={deleteConfirmText !== 'DELETE' || deleteLoading}
                                        className="flex-1 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {deleteLoading ? (
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            'Delete Forever'
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
