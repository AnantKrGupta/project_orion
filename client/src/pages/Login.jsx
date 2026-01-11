import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { MessageCircle, Shield, Users, Sparkles, Eye, EyeOff, Mail } from 'lucide-react';

export default function Login() {
    const { loginWithGoogle, loginWithEmail, error } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('returning'); // 'new' or 'returning'
    const [isLoading, setIsLoading] = useState(false);

    // Email/Password form
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [localError, setLocalError] = useState('');

    // Handle Google login (for new users)
    const handleGoogleLogin = async () => {
        try {
            setIsLoading(true);
            setLocalError('');
            await loginWithGoogle();
            navigate('/app/chat');
        } catch (err) {
            setLocalError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle Email/Password login (for returning users)
    const handleEmailLogin = async (e) => {
        e.preventDefault();
        try {
            setIsLoading(true);
            setLocalError('');
            await loginWithEmail(email, password);
            navigate('/app/chat');
        } catch (err) {
            setLocalError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const features = [
        { icon: MessageCircle, title: 'Anonymous Chat', desc: 'Connect with random Thaparites', color: 'from-cyan-500 to-blue-500' },
        { icon: Shield, title: 'End-to-End Encrypted', desc: 'Your messages are private', color: 'from-green-500 to-emerald-500' },
        { icon: Users, title: 'Make Friends', desc: 'Find your vibe and connect', color: 'from-purple-500 to-pink-500' },
    ];

    return (
        <div className="min-h-screen bg-dark-900 relative overflow-hidden flex items-center justify-center p-4">
            {/* Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px] animate-float" />
                <div className="absolute top-1/3 -left-40 w-[400px] h-[400px] bg-cyan-600/20 rounded-full blur-[100px] animate-float" style={{ animationDelay: '-2s' }} />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(168,85,247,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(168,85,247,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 w-full max-w-md"
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 mb-2">
                        <Sparkles className="w-8 h-8 text-cyan-400" />
                        <h1 className="text-4xl font-black gradient-text">Thapar Chat</h1>
                    </div>
                    <p className="text-gray-400">Where Thaparites connect anonymously</p>
                </div>

                {/* Tabs */}
                <div className="flex mb-6 bg-dark-800 rounded-xl p-1">
                    <button
                        onClick={() => { setActiveTab('returning'); setLocalError(''); }}
                        className={`flex-1 py-3 rounded-lg font-semibold transition-all ${activeTab === 'returning'
                                ? 'bg-purple-600 text-white'
                                : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Returning User
                    </button>
                    <button
                        onClick={() => { setActiveTab('new'); setLocalError(''); }}
                        className={`flex-1 py-3 rounded-lg font-semibold transition-all ${activeTab === 'new'
                                ? 'bg-purple-600 text-white'
                                : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        New User
                    </button>
                </div>

                {/* Error message */}
                <AnimatePresence>
                    {(localError || error) && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm"
                        >
                            {localError || error}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Returning User - Email/Password Login */}
                {activeTab === 'returning' && (
                    <motion.form
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        onSubmit={handleEmailLogin}
                        className="card p-6 space-y-4"
                    >
                        <div className="text-center mb-4">
                            <Mail className="w-12 h-12 text-purple-400 mx-auto mb-2" />
                            <p className="text-gray-400 text-sm">Login with your Thapar email & password</p>
                        </div>

                        <div>
                            <label className="block text-gray-400 text-sm mb-2">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input w-full"
                                placeholder="your.email@thapar.edu"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-gray-400 text-sm mb-2">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input w-full pr-12"
                                    placeholder="Enter your password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full btn-primary py-3 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                'Login'
                            )}
                        </button>

                        <Link
                            to="/forgot-password"
                            className="block text-center text-purple-400 hover:text-purple-300 text-sm"
                        >
                            Forgot password?
                        </Link>
                    </motion.form>
                )}

                {/* New User - Google Sign In */}
                {activeTab === 'new' && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="card p-6"
                    >
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Shield className="w-8 h-8 text-purple-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Welcome to Thapar Chat!</h3>
                            <p className="text-gray-400 text-sm">
                                Sign in with your @thapar.edu email to get started.
                                <br />
                                <span className="text-purple-400">You'll set your password after first login.</span>
                            </p>
                        </div>

                        <button
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                            className="w-full btn-primary py-3 flex items-center justify-center gap-3"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <img
                                        src="https://www.google.com/favicon.ico"
                                        alt="Google"
                                        className="w-5 h-5"
                                    />
                                    Continue with Google
                                </>
                            )}
                        </button>

                        <p className="text-center text-gray-500 text-xs mt-4">
                            Only @thapar.edu emails are allowed
                        </p>
                    </motion.div>
                )}

                {/* Features */}
                <div className="mt-8 grid grid-cols-3 gap-3">
                    {features.map((feature, i) => (
                        <div key={i} className="text-center">
                            <div className={`w-10 h-10 mx-auto rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-2`}>
                                <feature.icon className="w-5 h-5 text-white" />
                            </div>
                            <p className="text-gray-400 text-xs">{feature.title}</p>
                        </div>
                    ))}
                </div>

                <p className="mt-6 text-center text-gray-500 text-sm">
                    <Link to="/privacy" className="hover:text-purple-400 transition-colors">
                        Privacy Policy
                    </Link>
                </p>
            </motion.div>
        </div>
    );
}
