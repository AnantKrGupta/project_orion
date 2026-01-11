import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Check, X } from 'lucide-react';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export default function FriendRequestPopup({ socket, userEmail, onAccept, onDecline }) {
    const [requests, setRequests] = useState([]);

    useEffect(() => {
        if (!socket) return;

        // Listen for friend request notifications
        socket.on('friend_request_received', (data) => {
            setRequests(prev => [...prev, data]);
        });

        return () => {
            socket.off('friend_request_received');
        };
    }, [socket]);

    const handleAccept = async (request) => {
        try {
            const response = await fetch(`${SERVER_URL}/api/friends/accept/${request.friendshipId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userEmail })
            });

            if (response.ok) {
                setRequests(prev => prev.filter(r => r.friendshipId !== request.friendshipId));
                if (onAccept) onAccept(request);
            }
        } catch (error) {
            console.error('Error accepting request:', error);
        }
    };

    const handleDecline = async (request) => {
        try {
            const response = await fetch(`${SERVER_URL}/api/friends/decline/${request.friendshipId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userEmail })
            });

            if (response.ok) {
                setRequests(prev => prev.filter(r => r.friendshipId !== request.friendshipId));
                if (onDecline) onDecline(request);
            }
        } catch (error) {
            console.error('Error declining request:', error);
        }
    };

    return (
        <AnimatePresence>
            {requests.map((request, index) => (
                <motion.div
                    key={request.friendshipId}
                    initial={{ opacity: 0, y: -100, x: '-50%' }}
                    animate={{ opacity: 1, y: 0, x: '-50%' }}
                    exit={{ opacity: 0, y: -100, x: '-50%' }}
                    className="fixed top-4 left-1/2 z-50 w-[90%] max-w-sm"
                    style={{ top: `${16 + index * 100}px` }}
                >
                    <div className="bg-dark-800/95 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-4 shadow-2xl">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                                <UserPlus className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-white">{request.fromName}</h3>
                                <p className="text-sm text-gray-400">wants to be friends!</p>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => handleAccept(request)}
                                className="flex-1 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all"
                            >
                                <Check size={18} />
                                Accept
                            </button>
                            <button
                                onClick={() => handleDecline(request)}
                                className="flex-1 py-2.5 bg-dark-700 hover:bg-dark-600 rounded-xl font-semibold text-gray-300 flex items-center justify-center gap-2 transition-all"
                            >
                                <X size={18} />
                                Decline
                            </button>
                        </div>
                    </div>
                </motion.div>
            ))}
        </AnimatePresence>
    );
}
