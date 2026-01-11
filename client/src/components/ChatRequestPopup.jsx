import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Check, X } from 'lucide-react';
import { generateKeyPair, exportPublicKey } from '../utils/encryption';

export default function ChatRequestPopup({ socket, userEmail, onAccept, onDecline }) {
    const [requests, setRequests] = useState([]);
    const keyPairRef = useRef(null);

    useEffect(() => {
        if (!socket) return;

        // Listen for friend chat requests
        const handleChatRequest = (data) => {
            console.log('Chat request received:', data);
            setRequests(prev => [...prev, data]);
        };

        socket.on('friend_chat_request', handleChatRequest);

        return () => {
            socket.off('friend_chat_request', handleChatRequest);
        };
    }, [socket]);

    const handleAccept = async (request) => {
        if (socket) {
            // Generate key pair for this chat session
            const keyPair = await generateKeyPair();
            keyPairRef.current = keyPair;
            const publicKeyStr = await exportPublicKey(keyPair.publicKey);

            // Emit accept - server will join both users to room and emit friend_chat_started
            socket.emit('friend_chat_accept', {
                friendEmail: request.from,
                publicKey: publicKeyStr
            });
            // Layout will receive friend_chat_started and handle navigation
        }
        setRequests(prev => prev.filter(r => r.from !== request.from));
        if (onAccept) onAccept(request);
    };

    const handleDecline = (request) => {
        if (socket) {
            socket.emit('friend_chat_decline', {
                friendEmail: request.from
            });
        }
        setRequests(prev => prev.filter(r => r.from !== request.from));
        if (onDecline) onDecline(request);
    };

    return (
        <AnimatePresence>
            {requests.map((request, index) => (
                <motion.div
                    key={request.from}
                    initial={{ opacity: 0, y: -100, x: '-50%' }}
                    animate={{ opacity: 1, y: 0, x: '-50%' }}
                    exit={{ opacity: 0, y: -100, x: '-50%' }}
                    className="fixed top-4 left-1/2 z-50 w-[90%] max-w-sm"
                    style={{ top: `${16 + index * 120}px` }}
                >
                    <div className="bg-dark-800/95 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-4 shadow-2xl">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center">
                                <MessageCircle className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-white">{request.displayName}</h3>
                                <p className="text-sm text-gray-400">wants to chat with you!</p>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => handleAccept(request)}
                                className="flex-1 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all"
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
