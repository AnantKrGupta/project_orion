import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import {
    Camera, Edit2, Save, Loader2, Settings
} from 'lucide-react';
import imageCompression from 'browser-image-compression';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export default function Profile() {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [displayName, setDisplayName] = useState('');
    const [bio, setBio] = useState('');
    const [photoUrl, setPhotoUrl] = useState('');

    // Fetch profile
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch(`${SERVER_URL}/api/users/${user.email}`);
                if (res.ok) {
                    const data = await res.json();
                    setProfile(data);
                    setDisplayName(data.displayName || '');
                    setBio(data.bio || '');
                    setPhotoUrl(data.photoUrl || user.photoURL || '');
                } else {
                    // Create new profile
                    setDisplayName(user.displayName || '');
                    setPhotoUrl(user.photoURL || '');
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
                setDisplayName(user.displayName || '');
                setPhotoUrl(user.photoURL || '');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [user]);

    // Save profile
    const saveProfile = async () => {
        if (!displayName.trim()) {
            alert('Display name is required');
            return;
        }

        setSaving(true);
        try {
            const res = await fetch(`${SERVER_URL}/api/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: user.email,
                    displayName: displayName.trim(),
                    bio: bio.trim(),
                    photoUrl
                })
            });

            if (!res.ok) {
                const error = await res.json();
                alert(error.error);
                return;
            }

            const data = await res.json();
            setProfile(data);
            setEditing(false);
        } catch (error) {
            console.error('Error saving profile:', error);
            alert('Failed to save profile');
        } finally {
            setSaving(false);
        }
    };

    // Handle photo upload
    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const compressed = await imageCompression(file, {
                maxSizeMB: 0.3,
                maxWidthOrHeight: 400,
                useWebWorker: true
            });

            // Convert to base64 for now (replace with R2 upload later)
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoUrl(reader.result);
            };
            reader.readAsDataURL(compressed);
        } catch (error) {
            console.error('Error compressing photo:', error);
        }
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        );
    }

    return (
        <div className="p-4 max-w-lg mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card text-center"
            >
                {/* Profile Photo */}
                <div className="relative inline-block mb-6">
                    <img
                        src={photoUrl || `https://ui-avatars.com/api/?name=${displayName}&size=120&background=random`}
                        alt="Profile"
                        className="w-28 h-28 rounded-full object-cover border-4 border-purple-500/30"
                    />
                    {editing && (
                        <label className="absolute bottom-0 right-0 p-2 bg-purple-600 rounded-full cursor-pointer hover:bg-purple-500 transition-colors">
                            <Camera size={16} />
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoUpload}
                                className="hidden"
                            />
                        </label>
                    )}
                </div>

                {/* Display Name */}
                {editing ? (
                    <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Display Name"
                        className="input text-center text-xl font-bold mb-2"
                        maxLength={30}
                    />
                ) : (
                    <h1 className="text-2xl font-bold text-white mb-2">{displayName}</h1>
                )}

                {/* Email */}
                <p className="text-gray-500 mb-4">{user.email}</p>

                {/* Bio */}
                {editing ? (
                    <div className="mb-6">
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="Tell us about yourself..."
                            className="input resize-none h-24"
                            maxLength={150}
                        />
                        <div className="text-right text-xs text-gray-500 mt-1">
                            {bio.length}/150
                        </div>
                    </div>
                ) : (
                    <p className="text-gray-400 mb-6">
                        {bio || 'No bio yet'}
                    </p>
                )}

                {/* Actions */}
                {editing ? (
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={() => setEditing(false)}
                            className="btn-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={saveProfile}
                            disabled={saving}
                            className="btn-primary flex items-center gap-2"
                        >
                            {saving ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <Save size={18} />
                            )}
                            Save
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setEditing(true)}
                        className="btn-secondary flex items-center gap-2 mx-auto"
                    >
                        <Edit2 size={18} />
                        Edit Profile
                    </button>
                )}
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="card text-center">
                    <p className="text-2xl font-bold text-purple-400">0</p>
                    <p className="text-gray-500 text-sm">Posts</p>
                </div>
                <div className="card text-center">
                    <p className="text-2xl font-bold text-pink-400">0</p>
                    <p className="text-gray-500 text-sm">Friends</p>
                </div>
                <div className="card text-center">
                    <p className="text-2xl font-bold text-green-400">0</p>
                    <p className="text-gray-500 text-sm">Hearts</p>
                </div>
            </div>

            {/* Account Info */}
            <div className="card mt-6">
                <h2 className="font-semibold text-white mb-4">Account Info</h2>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-500">Email</span>
                        <span className="text-gray-300">{user.email}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Status</span>
                        <span className="text-green-400">Active</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Member since</span>
                        <span className="text-gray-300">
                            {profile?.createdAt
                                ? new Date(profile.createdAt).toLocaleDateString()
                                : 'Today'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Settings Link */}
            <Link
                to="/app/settings"
                className="card mt-6 flex items-center justify-between hover:bg-dark-700 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5 text-purple-400" />
                    <span className="text-white font-medium">Settings</span>
                </div>
                <span className="text-gray-500">→</span>
            </Link>
        </div>
    );
}

