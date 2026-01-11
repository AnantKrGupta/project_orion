import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import {
    Users, FileText, Flag, UserX, Trash2, Check, X,
    Search, Loader2, Shield, BarChart3
} from 'lucide-react';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export default function Admin() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [reports, setReports] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch admin data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const headers = { 'x-user-email': user.email };

                const [statsRes, reportsRes] = await Promise.all([
                    fetch(`${SERVER_URL}/api/admin/stats`, { headers }),
                    fetch(`${SERVER_URL}/api/admin/reports`, { headers })
                ]);

                if (!statsRes.ok) {
                    alert('Not authorized as admin');
                    return;
                }

                setStats(await statsRes.json());
                setReports(await reportsRes.json());
            } catch (error) {
                console.error('Error fetching admin data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user.email]);

    // Search users
    const searchUsers = async () => {
        try {
            const res = await fetch(
                `${SERVER_URL}/api/admin/users?search=${searchQuery}`,
                { headers: { 'x-user-email': user.email } }
            );
            setUsers(await res.json());
        } catch (error) {
            console.error('Error searching users:', error);
        }
    };

    // Ban user
    const banUser = async (userId, duration) => {
        try {
            await fetch(`${SERVER_URL}/api/admin/ban/${userId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-email': user.email
                },
                body: JSON.stringify({ duration })
            });

            // Refresh users
            searchUsers();
        } catch (error) {
            console.error('Error banning user:', error);
        }
    };

    // Unban user
    const unbanUser = async (userId) => {
        try {
            await fetch(`${SERVER_URL}/api/admin/unban/${userId}`, {
                method: 'POST',
                headers: { 'x-user-email': user.email }
            });

            searchUsers();
        } catch (error) {
            console.error('Error unbanning user:', error);
        }
    };

    // Dismiss report
    const dismissReport = async (reportId) => {
        try {
            await fetch(`${SERVER_URL}/api/admin/reports/${reportId}/dismiss`, {
                method: 'POST',
                headers: { 'x-user-email': user.email }
            });

            setReports(reports.filter(r => r._id !== reportId));
        } catch (error) {
            console.error('Error dismissing report:', error);
        }
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="p-4 text-center">
                <Shield size={64} className="mx-auto mb-4 text-red-500" />
                <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
                <p className="text-gray-400">You are not authorized to access the admin dashboard.</p>
            </div>
        );
    }

    return (
        <div className="pb-4">
            {/* Header */}
            <div className="sticky top-0 bg-dark-900/95 backdrop-blur-lg z-10 px-4 py-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <Shield className="text-purple-500" />
                    <h1 className="text-2xl font-bold gradient-text">Admin Dashboard</h1>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex px-4 gap-2 mt-4">
                {['overview', 'reports', 'users'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === tab
                                ? 'bg-purple-600 text-white'
                                : 'bg-dark-700 text-gray-400 hover:text-white'
                            }`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="p-4">
                    <div className="grid grid-cols-2 gap-4">
                        <StatCard
                            icon={Users}
                            label="Total Users"
                            value={stats.totalUsers}
                            color="purple"
                        />
                        <StatCard
                            icon={Users}
                            label="Online Now"
                            value={stats.onlineUsers}
                            color="green"
                        />
                        <StatCard
                            icon={Flag}
                            label="Pending Reports"
                            value={stats.pendingReports}
                            color="yellow"
                        />
                        <StatCard
                            icon={UserX}
                            label="Banned Users"
                            value={stats.bannedUsers}
                            color="red"
                        />
                        <StatCard
                            icon={FileText}
                            label="Total Posts"
                            value={stats.totalPosts}
                            color="blue"
                        />
                        <StatCard
                            icon={BarChart3}
                            label="Avg Posts/Day"
                            value={Math.round(stats.totalPosts / 30)}
                            color="pink"
                        />
                    </div>
                </div>
            )}

            {/* Reports Tab */}
            {activeTab === 'reports' && (
                <div className="p-4">
                    <h2 className="text-lg font-semibold text-white mb-4">
                        Pending Reports ({reports.length})
                    </h2>

                    {reports.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Check size={48} className="mx-auto mb-2 text-green-500" />
                            <p>No pending reports!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {reports.map((report) => (
                                <motion.div
                                    key={report._id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="card"
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${report.type === 'chat' ? 'bg-blue-500/20 text-blue-400' :
                                                        report.type === 'post' ? 'bg-green-500/20 text-green-400' :
                                                            'bg-yellow-500/20 text-yellow-400'
                                                    }`}>
                                                    {report.type}
                                                </span>
                                                <span className="px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400">
                                                    {report.reason}
                                                </span>
                                            </div>
                                            <p className="text-white font-medium">
                                                Target: {report.targetUser?.displayName}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                Reported by: {report.reporter?.displayName}
                                            </p>
                                            <p className="text-xs text-gray-600 mt-1">
                                                Reports: {report.targetUser?.reportCount || 0}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => banUser(report.targetUser?._id, 48)}
                                                className="p-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm"
                                            >
                                                Ban 48h
                                            </button>
                                            <button
                                                onClick={() => dismissReport(report._id)}
                                                className="p-2 bg-gray-600 hover:bg-gray-500 rounded-lg"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
                <div className="p-4">
                    <div className="flex gap-2 mb-4">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search users..."
                            className="input flex-1"
                        />
                        <button
                            onClick={searchUsers}
                            className="btn-primary px-4"
                        >
                            <Search size={18} />
                        </button>
                    </div>

                    <div className="space-y-3">
                        {users.map((u) => (
                            <motion.div
                                key={u._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="card flex items-center gap-4"
                            >
                                <img
                                    src={u.photoUrl || `https://ui-avatars.com/api/?name=${u.displayName}&background=random`}
                                    alt={u.displayName}
                                    className="w-10 h-10 rounded-full"
                                />
                                <div className="flex-1">
                                    <p className="font-medium text-white">{u.displayName}</p>
                                    <p className="text-sm text-gray-500">{u.email}</p>
                                </div>
                                <div className="text-sm text-gray-400">
                                    Reports: {u.reportCount}
                                </div>
                                {u.bannedUntil && new Date(u.bannedUntil) > new Date() ? (
                                    <button
                                        onClick={() => unbanUser(u._id)}
                                        className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded-lg text-sm"
                                    >
                                        Unban
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => banUser(u._id, 48)}
                                        className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded-lg text-sm"
                                    >
                                        Ban
                                    </button>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// Stat Card Component
function StatCard({ icon: Icon, label, value, color }) {
    const colors = {
        purple: 'from-purple-600 to-purple-800',
        green: 'from-green-600 to-green-800',
        yellow: 'from-yellow-600 to-yellow-800',
        red: 'from-red-600 to-red-800',
        blue: 'from-blue-600 to-blue-800',
        pink: 'from-pink-600 to-pink-800'
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`bg-gradient-to-br ${colors[color]} rounded-2xl p-4`}
        >
            <Icon size={24} className="text-white/80 mb-2" />
            <p className="text-3xl font-bold text-white">{value}</p>
            <p className="text-sm text-white/70">{label}</p>
        </motion.div>
    );
}
