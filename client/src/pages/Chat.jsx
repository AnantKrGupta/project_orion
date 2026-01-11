import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useOutletContext } from 'react-router-dom';
import {
    Send, Image, Mic, SkipForward, Lock, Users, Shield,
    X, Play, Pause, Flag, UserPlus
} from 'lucide-react';
import { generateKeyPair, exportPublicKey, encrypt, decrypt, importPublicKey } from '../utils/encryption';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

const getRandomAvatar = () => {
    return Math.random() > 0.5 ? '/avatars/avatar-girl.png' : '/avatars/avatar-boy.png';
};

export default function Chat() {
    const { user } = useAuth();
    const { socket, onlineCount } = useOutletContext();
    const [status, setStatus] = useState('idle');
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [partner, setPartner] = useState(null);
    const [partnerEmail, setPartnerEmail] = useState(null);
    const [partnerAvatar, setPartnerAvatar] = useState(null);
    const [partnerPublicKey, setPartnerPublicKey] = useState(null);
    const [friendRequestSent, setFriendRequestSent] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [showEncryptionInfo, setShowEncryptionInfo] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [currentRoomId, setCurrentRoomId] = useState(null); // For friend chat room tracking
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const keyPairRef = useRef(null);

    // Setup socket event listeners
    useEffect(() => {
        if (!socket) return;



        const handleMatchFound = async (data) => {
            setPartner(data.partnerName);
            setPartnerEmail(data.partnerEmail);
            setPartnerAvatar(getRandomAvatar());
            setStatus('matched');
            setFriendRequestSent(false);

            if (data.partnerPublicKey) {
                try {
                    const importedKey = await importPublicKey(data.partnerPublicKey);
                    setPartnerPublicKey(importedKey);
                } catch (err) {
                    console.error('Error importing partner public key:', err);
                }
            }

            setMessages([
                { type: 'system', text: '🔐 Secure connection established. Messages are encrypted.' },
                { type: 'system', text: `🎉 Matched with ${data.partnerName}! Say hi!` }
            ]);
        };

        const handleReceiveMessage = async (data) => {
            try {
                const currentKeyPair = keyPairRef.current;
                if (!currentKeyPair?.privateKey) {
                    console.error('No private key for decryption');
                    return;
                }
                const content = await decrypt(data.encrypted, currentKeyPair.privateKey);
                setMessages(prev => [...prev, { type: data.type, content, sender: 'partner' }]);
            } catch (err) {
                console.error('Decryption error:', err);
                setMessages(prev => [...prev, { type: 'system', text: '⚠️ Could not decrypt message' }]);
            }
        };

        const handlePartnerTyping = () => setIsTyping(true);
        const handlePartnerStopTyping = () => setIsTyping(false);

        const handlePartnerDisconnected = () => {
            setMessages(prev => [...prev, { type: 'system', text: '👋 Partner disconnected.' }]);
            setStatus('idle');
            setPartner(null);
            setPartnerPublicKey(null);
            keyPairRef.current = null;
        };

        const handleFriendChatStarted = async (data) => {
            console.log('Friend chat started:', data);

            // Generate key pair
            const keyPair = await generateKeyPair();
            keyPairRef.current = keyPair;
            const publicKeyStr = await exportPublicKey(keyPair.publicKey);

            socket.emit('friend_chat_key_exchange', { roomId: data.roomId, publicKey: publicKeyStr });

            if (data.publicKey) {
                try {
                    const importedKey = await importPublicKey(data.publicKey);
                    setPartnerPublicKey(importedKey);
                } catch (err) {
                    console.error('Error importing friend public key:', err);
                }
            }

            setPartner(data.displayName);
            setPartnerEmail(data.email);
            setPartnerAvatar(getRandomAvatar());
            setStatus('matched');
            setFriendRequestSent(true);

            setMessages([
                { type: 'system', text: '🔐 Secure connection established with your friend.' },
                { type: 'system', text: `💬 Now chatting with ${data.displayName}!` }
            ]);
        };

        const handleFriendKeyReceived = async (data) => {
            if (data.publicKey) {
                try {
                    const importedKey = await importPublicKey(data.publicKey);
                    setPartnerPublicKey(importedKey);
                } catch (err) {
                    console.error('Error importing friend public key:', err);
                }
            }
        };

        socket.on('match_found', handleMatchFound);
        socket.on('receive_message', handleReceiveMessage);
        socket.on('partner_typing', handlePartnerTyping);
        socket.on('partner_stop_typing', handlePartnerStopTyping);
        socket.on('partner_disconnected', handlePartnerDisconnected);
        socket.on('friend_chat_started', handleFriendChatStarted);
        socket.on('friend_chat_key_received', handleFriendKeyReceived);

        return () => {
            // Notify partner when leaving chat page
            socket.emit('leave_chat');

            socket.off('match_found', handleMatchFound);
            socket.off('receive_message', handleReceiveMessage);
            socket.off('partner_typing', handlePartnerTyping);
            socket.off('partner_stop_typing', handlePartnerStopTyping);
            socket.off('partner_disconnected', handlePartnerDisconnected);
            socket.off('friend_chat_started', handleFriendChatStarted);
            socket.off('friend_chat_key_received', handleFriendKeyReceived);
        };
    }, [socket]);

    // Check for pending friend chat from sessionStorage (when navigated from Layout)
    useEffect(() => {
        if (!socket) return;

        const friendChatDataStr = sessionStorage.getItem('friendChatData');
        if (friendChatDataStr) {
            const data = JSON.parse(friendChatDataStr);
            sessionStorage.removeItem('friendChatData'); // Clear after reading

            console.log('Restoring friend chat from sessionStorage:', data);

            // Set current room ID for robust messaging
            setCurrentRoomId(data.roomId);

            // Start the friend chat session
            (async () => {
                console.log('🏁 Starting friend chat session...');
                // Generate key pair
                const keyPair = await generateKeyPair();
                keyPairRef.current = keyPair;
                const publicKeyStr = await exportPublicKey(keyPair.publicKey);

                socket.emit('friend_chat_key_exchange', { roomId: data.roomId, publicKey: publicKeyStr });

                if (data.publicKey) {
                    try {
                        const importedKey = await importPublicKey(data.publicKey);
                        setPartnerPublicKey(importedKey);
                    } catch (err) {
                        console.error('Error importing friend public key:', err);
                    }
                }

                setPartner(data.displayName);
                setPartnerEmail(data.email);
                setPartnerAvatar(getRandomAvatar());
                setStatus('matched');
                setFriendRequestSent(true);

                setMessages([
                    { type: 'system', text: '🔐 Secure connection established with your friend.' },
                    { type: 'system', text: `💬 Now chatting with ${data.displayName}!` }
                ]);
            })();
        }
    }, [socket]);

    // Listen for friendChatReady event from Layout (when already on chat page)
    useEffect(() => {
        if (!socket) return;

        const handleFriendChatReady = async (event) => {
            const data = event.detail;
            console.log('FriendChatReady event received:', data);
            sessionStorage.removeItem('friendChatData'); // Clear any stored data

            // Set current room ID for robust messaging
            setCurrentRoomId(data.roomId);

            // Start the friend chat session
            const keyPair = await generateKeyPair();
            keyPairRef.current = keyPair;
            const publicKeyStr = await exportPublicKey(keyPair.publicKey);

            socket.emit('friend_chat_key_exchange', { roomId: data.roomId, publicKey: publicKeyStr });

            if (data.publicKey) {
                try {
                    const importedKey = await importPublicKey(data.publicKey);
                    setPartnerPublicKey(importedKey);
                } catch (err) {
                    console.error('Error importing friend public key:', err);
                }
            }

            setPartner(data.displayName);
            setPartnerEmail(data.email);
            setPartnerAvatar(getRandomAvatar());
            setStatus('matched');
            setFriendRequestSent(true);

            setMessages([
                { type: 'system', text: '🔐 Secure connection established with your friend.' },
                { type: 'system', text: `💬 Now chatting with ${data.displayName}!` }
            ]);
        };

        window.addEventListener('friendChatReady', handleFriendChatReady);

        return () => {
            window.removeEventListener('friendChatReady', handleFriendChatReady);
        };
    }, [socket]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleInputChange = (e) => {
        setInputMessage(e.target.value);
        if (socket && status === 'matched') {
            socket.emit('typing');
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => socket.emit('stop_typing'), 1000);
        }
    };

    const startMatching = async () => {
        if (!socket) return;
        setStatus('searching');
        setMessages([]);

        const newKeyPair = await generateKeyPair();
        keyPairRef.current = newKeyPair;
        const publicKeyStr = await exportPublicKey(newKeyPair.publicKey);

        socket.emit('join_queue', {
            displayName: user.displayName || 'Anonymous',
            email: user.email,
            publicKey: publicKeyStr
        });
    };

    const sendMessage = async () => {
        if (!inputMessage.trim() || !partnerPublicKey || !socket) return;

        try {
            const encryptedMsg = await encrypt(inputMessage, partnerPublicKey);
            socket.emit('send_message', {
                type: 'text',
                encrypted: encryptedMsg,
                roomId: currentRoomId
            });
            setMessages(prev => [...prev, { type: 'text', content: inputMessage, sender: 'me' }]);
            setInputMessage('');
            socket.emit('stop_typing');
        } catch (err) {
            console.error('Encryption error:', err);
        }
    };

    const skipPartner = () => {
        if (socket) {
            socket.emit('skip');
            setStatus('idle');
            setPartner(null);
            setPartnerEmail(null);
            setPartnerPublicKey(null);
            keyPairRef.current = null;
            setMessages([]);
            setFriendRequestSent(false);
        }
    };

    const sendFriendRequest = async () => {
        if (!partnerEmail || friendRequestSent) return;

        try {
            const response = await fetch(`${SERVER_URL}/api/friends/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email, friendEmail: partnerEmail })
            });

            if (response.ok) {
                setFriendRequestSent(true);
                setMessages(prev => [...prev, { type: 'system', text: `✨ Friend request sent to ${partner}!` }]);
            } else {
                const data = await response.json();
                setMessages(prev => [...prev, { type: 'system', text: `⚠️ ${data.error || 'Could not send friend request'}` }]);
            }
        } catch (err) {
            console.error('Friend request error:', err);
        }
    };

    const sendReport = async (reason) => {
        if (!partnerEmail) return;

        try {
            const response = await fetch(`${SERVER_URL}/api/reports`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: user.email,
                    targetEmail: partnerEmail,
                    reason,
                    type: 'chat'
                })
            });

            if (response.ok) {
                setMessages(prev => [...prev, { type: 'system', text: '🚨 Report submitted. Thank you for keeping our community safe.' }]);
                setShowReportModal(false);
                skipPartner();
            } else {
                const data = await response.json();
                setMessages(prev => [...prev, { type: 'system', text: `⚠️ ${data.error || 'Could not submit report'}` }]);
            }
        } catch (err) {
            console.error('Report error:', err);
        }
    };

    return (
        <div className="h-screen flex flex-col bg-dark-900 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-20 left-0 w-48 h-48 bg-cyan-600/10 rounded-full blur-[100px]" />
            </div>

            {/* Header */}
            <div className="relative z-10 bg-dark-800/90 backdrop-blur-xl border-b border-purple-500/20 px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {status === 'matched' ? (
                            <>
                                <div className="relative">
                                    <img src={partnerAvatar} alt="Partner" className="w-11 h-11 rounded-full avatar-cyber" />
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-dark-800" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-white">{partner}</h2>
                                    <button
                                        onClick={() => setShowEncryptionInfo(!showEncryptionInfo)}
                                        className="flex items-center gap-1.5 text-green-400 text-xs hover:text-green-300 transition-colors"
                                    >
                                        <Lock size={12} />
                                        <span>End-to-End Encrypted</span>
                                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                                    <Shield className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-white">Anonymous Chat</h2>
                                    <p className="text-xs text-gray-400">Secure & Private</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-gray-400 text-sm bg-dark-700/50 px-3 py-1.5 rounded-full">
                            <Users size={14} className="text-cyan-400" />
                            <span className="font-medium">{onlineCount}</span>
                            <span className="hidden sm:inline">online</span>
                        </div>

                        {status === 'matched' && (
                            <>
                                <button
                                    onClick={sendFriendRequest}
                                    disabled={friendRequestSent}
                                    className={`p-2.5 rounded-xl transition-all ${friendRequestSent
                                        ? 'text-green-400 bg-green-400/10'
                                        : 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/10'
                                        }`}
                                    title={friendRequestSent ? "Request sent" : "Add friend"}
                                >
                                    <UserPlus size={18} />
                                </button>
                                <button
                                    onClick={() => setShowReportModal(true)}
                                    className="p-2.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                                    title="Report"
                                >
                                    <Flag size={18} />
                                </button>
                                <button
                                    onClick={skipPartner}
                                    className="p-2.5 text-gray-400 hover:text-orange-400 hover:bg-orange-400/10 rounded-xl transition-all"
                                    title="Skip"
                                >
                                    <SkipForward size={18} />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Chat area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10">
                {status === 'idle' && (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-sm">
                            <div className="flex justify-center mb-6">
                                <img src="/avatars/avatar-girl.png" alt="Avatar" className="w-16 h-16 rounded-full avatar-cyber -mr-4 z-10" />
                                <img src="/avatars/avatar-boy.png" alt="Avatar" className="w-16 h-16 rounded-full avatar-cyber" />
                            </div>
                            <h2 className="text-2xl font-bold gradient-text mb-2">Ready to Connect?</h2>
                            <p className="text-gray-400 mb-6">Meet random Thaparites anonymously.</p>
                            <button onClick={startMatching} className="btn-primary w-full py-4 cyber-border">Start Matching</button>
                        </motion.div>
                    </div>
                )}

                {status === 'searching' && (
                    <div className="h-full flex flex-col items-center justify-center">
                        <div className="relative">
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} className="w-20 h-20 border-4 border-purple-500/30 border-t-purple-500 rounded-full" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Users className="w-8 h-8 text-purple-400" />
                            </div>
                        </div>
                        <p className="mt-6 text-gray-400">Finding someone for you...</p>
                        <button onClick={() => { socket?.emit('leave_queue'); setStatus('idle'); keyPairRef.current = null; }} className="mt-6 text-gray-500 hover:text-white transition-colors">Cancel</button>
                    </div>
                )}

                {status === 'matched' && (
                    <AnimatePresence>
                        {messages.map((msg, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                                {msg.type === 'system' ? (
                                    <div className="text-center text-gray-500 text-sm py-2 w-full">{msg.text}</div>
                                ) : (
                                    <div className="flex items-end gap-2 max-w-xs lg:max-w-md">
                                        {msg.sender === 'partner' && <img src={partnerAvatar} alt="Partner" className="w-8 h-8 rounded-full avatar-cyber flex-shrink-0" />}
                                        <div className={`px-4 py-3 ${msg.sender === 'me' ? 'message-sent text-white' : 'message-received text-white'}`}>
                                            <p>{msg.content}</p>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                        {isTyping && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                                <img src={partnerAvatar} alt="Partner" className="w-8 h-8 rounded-full avatar-cyber" />
                                <div className="message-received px-4 py-3">
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            {status === 'matched' && (
                <div className="relative z-10 bg-dark-800/90 backdrop-blur-xl border-t border-purple-500/20 p-4">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={inputMessage}
                            onChange={handleInputChange}
                            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                            placeholder="Type a message..."
                            className="flex-1 bg-dark-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 border border-purple-500/20"
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!inputMessage.trim()}
                            className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all glow-purple"
                        >
                            <Send size={20} className="text-white" />
                        </button>
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-3 text-xs text-gray-500">
                        <Lock size={10} className="text-green-500" />
                        <span>Messages are encrypted and never stored</span>
                    </div>
                </div>
            )}

            {/* Report Modal */}
            <AnimatePresence>
                {showReportModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowReportModal(false)}
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
                                    <Flag className="w-6 h-6 text-red-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg">Report User</h3>
                                    <p className="text-gray-400 text-sm">Why are you reporting {partner}?</p>
                                </div>
                            </div>

                            <div className="space-y-2 mb-6">
                                {['spam', 'harassment', 'inappropriate', 'abuse', 'other'].map(reason => (
                                    <button
                                        key={reason}
                                        onClick={() => sendReport(reason)}
                                        className="w-full py-3 px-4 bg-dark-700 hover:bg-dark-600 rounded-xl text-left text-white capitalize transition-all"
                                    >
                                        {reason}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => setShowReportModal(false)}
                                className="w-full py-2.5 bg-dark-700 hover:bg-dark-600 rounded-xl font-semibold text-gray-300 transition-all"
                            >
                                Cancel
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
