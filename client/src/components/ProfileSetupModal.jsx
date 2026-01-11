import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { User, Camera } from 'lucide-react';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export default function ProfileSetupModal() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(true);
    const [displayName, setDisplayName] = useState('');
    const [bio, setBio] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Only show for new users who haven't set up profile
    if (!user?.isNewUser || !isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!displayName.trim() || displayName.trim().length < 2 || displayName.trim().length > 15) {
            setError('Username must be 2-15 characters');
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch(`${SERVER_URL}/api/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: user.email,
                    displayName: displayName.trim(),
                    bio: bio.trim(),
                    photoUrl: user.photoUrl || ''
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to save profile');
            }

            // Reload page to update user state
            window.location.reload();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
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
                    className="bg-dark-800 rounded-2xl p-6 w-full max-w-md border border-purple-500/20"
                >
                    <div className="text-center mb-6">
                        <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            {user.photoUrl ? (
                                <img
                                    src={user.photoUrl}
                                    alt="Profile"
                                    className="w-20 h-20 rounded-full object-cover"
                                />
                            ) : (
                                <User className="w-10 h-10 text-purple-400" />
                            )}
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Choose Your Username</h2>
                        <p className="text-gray-400 text-sm">
                            This will be your unique identity (2-15 characters)
                        </p>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-gray-400 text-sm mb-2">
                                Username <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="input w-full"
                                placeholder="Choose a unique username"
                                maxLength={15}
                                required
                                autoFocus
                            />
                            <p className="text-gray-500 text-xs mt-1">{displayName.length}/15</p>
                        </div>

                        <div>
                            <label className="block text-gray-400 text-sm mb-2">
                                Bio <span className="text-gray-500">(optional)</span>
                            </label>
                            <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                className="input w-full resize-none h-20"
                                placeholder="Tell us a bit about yourself..."
                                maxLength={150}
                            />
                            <p className="text-gray-500 text-xs mt-1">{bio.length}/150</p>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !displayName.trim()}
                            className="w-full btn-primary py-3 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                'Continue'
                            )}
                        </button>
                    </form>

                    <p className="text-center text-gray-500 text-xs mt-4">
                        You can change this later in Settings
                    </p>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
