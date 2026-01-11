import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
    Users, MessageCircle, Clock, UserPlus, Check, X, Loader2, Trash2, AlertTriangle
} from 'lucide-react';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export default function Friends() {
    const { user } = useAuth();
    const { socket } = useOutletContext();
    const navigate = useNavigate();
    const [friends, setFriends] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [confirmRemove, setConfirmRemove] = useState(null);
    const [waitingForChat, setWaitingForChat] = useState(null);

    useEffect(() => {
        if (!socket) return;

        const handleStatusChange = (data) => {
            setFriends(prev => prev.map(f =>
                f.email === data.email
                    ? { ...f, isOnline: data.isOnline }
                    : f
            ));
        };

        const handleFriendRemoved = (data) => {
            setFriends(prev => prev.filter(f => f.email !== data.friendEmail));
        };

        const handleFriendAccepted = () => {
            fetchFriends();
        };

        const handleChatStarted = (data) => {
            setWaitingForChat(null);
            sessionStorage.setItem('friendChatData', JSON.stringify(data));
            navigate('/app/chat');
        };

        const handleChatDeclined = (data) => {
            setWaitingForChat(null);
            alert(`${data.displayName} declined the chat request.`);
        };

        socket.on('friend_status_change', handleStatusChange);
        socket.on('friend_removed', handleFriendRemoved);
        socket.on('friend_request_accepted', handleFriendAccepted);
        socket.on('friend_chat_started', handleChatStarted);
        socket.on('friend_chat_declined', handleChatDeclined);

        return () => {
            socket.off('friend_status_change', handleStatusChange);
            socket.off('friend_removed', handleFriendRemoved);
            socket.off('friend_request_accepted', handleFriendAccepted);
            socket.off('friend_chat_started', handleChatStarted);
            socket.off('friend_chat_declined', handleChatDeclined);
        };
    }, [socket, navigate]);

    const fetchFriends = async () => {
        try {
            const [friendsRes, pendingRes] = await Promise.all([
                fetch(`${SERVER_URL}/api/friends?email=${user.email}`),
                fetch(`${SERVER_URL}/api/friends/pending?email=${user.email}`)
            ]);

            const friendsData = await friendsRes.json();
            const pendingData = await pendingRes.json();

            setFriends(Array.isArray(friendsData) ? friendsData : []);
            setPendingRequests(Array.isArray(pendingData) ? pendingData : []);
        } catch (error) {
            console.error('Error fetching friends:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFriends();
    }, [user.email]);

    const acceptRequest = async (requestId) => {
        try {
            await fetch(`${SERVER_URL}/api/friends/accept/${requestId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email })
            });
            fetchFriends();
        } catch (error) {
            console.error('Error accepting request:', error);
        }
    };

    const declineRequest = async (requestId) => {
        try {
            await fetch(`${SERVER_URL}/api/friends/decline/${requestId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email })
            });
            setPendingRequests(prev => prev.filter(r => r._id !== requestId));
        } catch (error) {
            console.error('Error declining request:', error);
        }
    };

    const removeFriend = async (friend) => {
        try {
            await fetch(`${SERVER_URL}/api/friends/${friend.friendshipId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email })
            });
            setFriends(prev => prev.filter(f => f._id !== friend._id));
            setConfirmRemove(null);
        } catch (error) {
            console.error('Error removing friend:', error);
        }
    };

    // Send chat request to friend
    const startChat = (friend) => {
        if (!socket || !friend.isOnline) return;

        setWaitingForChat(friend.email);
        socket.emit('friend_chat_request', {
            friendEmail: friend.email
        });
    };

    const cancelChatRequest = () => {
        setWaitingForChat(null);
    };

    const formatLastSeen = (date) => {
        if (!date) return 'Never';
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        );
    }

    const onlineFriends = friends.filter(f => f.isOnline);
    const offlineFriends = friends.filter(f => !f.isOnline);

    return (
        <div className="pb-4">
            {/* Header */}
            <div className="sticky top-0 bg-dark-900/95 backdrop-blur-lg z-10 px-4 py-4 border-b border-white/5">
                <h1 className="text-2xl font-bold gradient-text">Your Vibes</h1>
                <p className="text-gray-500 text-sm">{friends.length} friends</p>
            </div>

            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
                <div className="p-4">
                    <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <UserPlus size={18} className="text-purple-400" />
                        Pending Requests ({pendingRequests.length})
                    </h2>
                    <div className="space-y-3">
                        {pendingRequests.map((request) => (
                            <motion.div
                                key={request._id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="card flex items-center gap-4"
                            >
                                <img
                                    src={request.user1?.photoUrl || `https://ui-avatars.com/api/?name=${request.user1?.displayName}&background=random`}
                                    alt={request.user1?.displayName}
                                    className="w-12 h-12 rounded-full"
                                />
                                <div className="flex-1">
                                    <p className="font-semibold text-white">{request.user1?.displayName}</p>
                                    <p className="text-sm text-gray-500">Wants to vibe with you!</p>
                                </div>
                                <button
                                    onClick={() => acceptRequest(request._id)}
                                    className="p-2 bg-green-600 hover:bg-green-500 rounded-xl"
                                >
                                    <Check size={18} />
                                </button>
                                <button
                                    onClick={() => declineRequest(request._id)}
                                    className="p-2 bg-dark-700 hover:bg-dark-600 rounded-xl"
                                >
                                    <X size={18} />
                                </button>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Online Friends */}
            <div className="p-4">
                <h2 className="text-lg font-semibold text-green-400 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    Online ({onlineFriends.length})
                </h2>

                {onlineFriends.length === 0 ? (
                    <p className="text-gray-500 text-sm">No friends online</p>
                ) : (
                    <div className="space-y-3">
                        {onlineFriends.map((friend) => (
                            <FriendCard
                                key={friend._id}
                                friend={friend}
                                isOnline={true}
                                onStartChat={() => startChat(friend)}
                                onRemove={() => setConfirmRemove(friend)}
                                isWaiting={waitingForChat === friend.email}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Offline Friends */}
            <div className="p-4">
                <h2 className="text-lg font-semibold text-gray-400 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-500 rounded-full" />
                    Offline ({offlineFriends.length})
                </h2>

                {offlineFriends.length === 0 ? (
                    <p className="text-gray-500 text-sm">All friends are online!</p>
                ) : (
                    <div className="space-y-3">
                        {offlineFriends.map((friend) => (
                            <FriendCard
                                key={friend._id}
                                friend={friend}
                                isOnline={false}
                                lastSeen={formatLastSeen(friend.lastSeen)}
                                onRemove={() => setConfirmRemove(friend)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Empty State */}
            {friends.length === 0 && pendingRequests.length === 0 && (
                <div className="text-center py-12 px-4">
                    <Users size={64} className="mx-auto mb-4 text-gray-600" />
                    <h2 className="text-xl font-semibold text-white mb-2">No Vibes Yet</h2>
                    <p className="text-gray-400 max-w-sm mx-auto">
                        Start chatting anonymously and click "Add Friend" when you find someone cool!
                    </p>
                </div>
            )}

            {/* Waiting for chat acceptance */}
            <AnimatePresence>
                {waitingForChat && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-dark-800 rounded-2xl p-6 max-w-sm w-full border border-cyan-500/30 text-center"
                        >
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center">
                                <MessageCircle className="w-8 h-8 text-white animate-pulse" />
                            </div>
                            <h3 className="font-bold text-white text-lg mb-2">Waiting for response...</h3>
                            <p className="text-gray-400 mb-6">
                                Waiting for your friend to accept the chat request
                            </p>
                            <button
                                onClick={cancelChatRequest}
                                className="py-2.5 px-6 bg-dark-700 hover:bg-dark-600 rounded-xl font-semibold text-gray-300 transition-all"
                            >
                                Cancel
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Confirmation Dialog */}
            <AnimatePresence>
                {confirmRemove && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setConfirmRemove(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-dark-800 rounded-2xl p-6 max-w-sm w-full border border-red-500/30"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                                    <AlertTriangle className="w-6 h-6 text-red-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg">Remove Friend?</h3>
                                    <p className="text-gray-400 text-sm">This action cannot be undone</p>
                                </div>
                            </div>

                            <p className="text-gray-300 mb-6">
                                Are you sure you want to remove <span className="font-bold text-white">{confirmRemove.displayName}</span> from your friends?
                                They will also be removed from your friends list.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setConfirmRemove(null)}
                                    className="flex-1 py-2.5 bg-dark-700 hover:bg-dark-600 rounded-xl font-semibold text-gray-300 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => removeFriend(confirmRemove)}
                                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all"
                                >
                                    <Trash2 size={18} />
                                    Remove
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function FriendCard({ friend, isOnline, lastSeen, onStartChat, onRemove, isWaiting }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card flex items-center gap-4"
        >
            <div className="relative">
                <img
                    src={friend.photoUrl || `https://ui-avatars.com/api/?name=${friend.displayName}&background=random`}
                    alt={friend.displayName}
                    className="w-12 h-12 rounded-full"
                />
                <div
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-dark-800 ${isOnline ? 'bg-green-400' : 'bg-gray-500'}`}
                />
            </div>

            <div className="flex-1">
                <p className="font-semibold text-white">{friend.displayName}</p>
                {isOnline ? (
                    <p className="text-sm text-green-400">Online</p>
                ) : (
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Clock size={12} />
                        {lastSeen}
                    </p>
                )}
            </div>

            <div className="flex items-center gap-2">
                {isOnline && onStartChat && (
                    <button
                        onClick={onStartChat}
                        disabled={isWaiting}
                        className={`py-2 px-4 flex items-center gap-2 rounded-xl font-semibold transition-all ${isWaiting
                                ? 'bg-gray-600 text-gray-400 cursor-wait'
                                : 'btn-primary'
                            }`}
                    >
                        <MessageCircle size={16} />
                        {isWaiting ? 'Waiting...' : 'Chat'}
                    </button>
                )}
                {onRemove && (
                    <button
                        onClick={onRemove}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                        title="Remove friend"
                    >
                        <Trash2 size={18} />
                    </button>
                )}
            </div>
        </motion.div>
    );
}
