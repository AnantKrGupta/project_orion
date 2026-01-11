import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MessageCircle, Newspaper, Users, User, LogOut, Shield } from 'lucide-react';
import { io } from 'socket.io-client';
import FriendRequestPopup from './FriendRequestPopup';
import ChatRequestPopup from './ChatRequestPopup';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [socket, setSocket] = useState(null);
    const [notification, setNotification] = useState(null);
    const [onlineCount, setOnlineCount] = useState(0);

    // Initialize socket for notifications
    useEffect(() => {
        // Only connect if we have a user and no socket (or if user changed)
        // We use a simple check to avoid reconnecting on every render

        const newSocket = io(SERVER_URL, {
            transports: ['websocket', 'polling']
        });

        newSocket.on('connect', () => {
            console.log('Layout socket connected:', newSocket.id);
            // Register user for notifications
            newSocket.emit('register', {
                email: user.email,
                displayName: user.displayName
            });
        });

        // Listen for online count
        newSocket.on('online_count', (count) => {
            console.log('Online count updated:', count);
            setOnlineCount(count);
        });

        // Handle friend chat started - navigate to chat only if not already there
        newSocket.on('friend_chat_started', (data) => {
            console.log('Friend chat started:', data);
            sessionStorage.setItem('friendChatData', JSON.stringify(data));

            // Only navigate if not already on chat page
            if (!window.location.pathname.includes('/app/chat')) {
                navigate('/app/chat');
            }
            // If already on chat page, emit a custom event for Chat.jsx to pick up
            window.dispatchEvent(new CustomEvent('friendChatReady', { detail: data }));
        });

        // Handle friend request accepted notification
        newSocket.on('friend_request_accepted', (data) => {
            console.log('Friend request accepted:', data);
            setNotification({
                type: 'success',
                message: `${data.friendName} accepted your friend request! 🎉`
            });
            setTimeout(() => setNotification(null), 5000);
        });

        // Handle friend request declined notification
        newSocket.on('friend_request_declined', (data) => {
            console.log('Friend request declined:', data);
            setNotification({
                type: 'info',
                message: `${data.friendName} declined your friend request`
            });
            setTimeout(() => setNotification(null), 5000);
        });

        setSocket(newSocket);

        return () => {
            console.log('Layout socket disconnecting...');
            newSocket.disconnect();
        };
    }, [user.email]); // Only recreate if user EMAIL changes, ignore navigate

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const handleChatAccept = (request) => {
        // Chat will start after friend_chat_started event
    };

    const navItems = [
        { to: '/app/chat', icon: MessageCircle, label: 'Chat' },
        { to: '/app/feed', icon: Newspaper, label: 'Feed' },
        { to: '/app/friends', icon: Users, label: 'Friends' },
        { to: '/app/profile', icon: User, label: 'Profile' },
    ];

    return (
        <div className="min-h-screen bg-dark-900 flex flex-col">
            {/* Friend Request Popup */}
            <FriendRequestPopup
                socket={socket}
                userEmail={user.email}
            />

            {/* Chat Request Popup */}
            <ChatRequestPopup
                socket={socket}
                userEmail={user.email}
                onAccept={handleChatAccept}
            />

            {/* Notification Toast */}
            {notification && (
                <div className={`fixed top-4 right-4 z-50 max-w-sm p-4 rounded-xl shadow-2xl ${notification.type === 'success'
                    ? 'bg-green-500/20 border border-green-500/30 backdrop-blur-xl'
                    : 'bg-gray-500/20 border border-gray-500/30 backdrop-blur-xl'
                    }`}>
                    <p className="text-white font-medium">{notification.message}</p>
                </div>
            )}

            {/* Main content */}
            <main className="flex-1 pb-20">
                <Outlet context={{ socket, onlineCount }} />
            </main>

            {/* Bottom navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-dark-800 border-t border-white/5 px-4 py-2 z-50">
                <div className="max-w-lg mx-auto flex items-center justify-around">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${isActive
                                    ? 'text-purple-400 bg-purple-500/10'
                                    : 'text-gray-500 hover:text-gray-300'
                                }`
                            }
                        >
                            <item.icon size={22} />
                            <span className="text-xs font-medium">{item.label}</span>
                        </NavLink>
                    ))}
                    <button
                        onClick={handleLogout}
                        className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-gray-500 hover:text-red-400 transition-all"
                    >
                        <LogOut size={22} />
                        <span className="text-xs font-medium">Logout</span>
                    </button>
                </div>
            </nav>
        </div>
    );
}
