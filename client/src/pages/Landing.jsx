import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Shield, Users, Zap, Heart, Lock } from 'lucide-react';

export default function Landing() {
    const navigate = useNavigate();

    const features = [
        { icon: Lock, title: 'End-to-End Encrypted', desc: 'Your messages are secure', color: 'from-green-500 to-emerald-500' },
        { icon: Users, title: 'Anonymous Matching', desc: 'Meet new people safely', color: 'from-purple-500 to-pink-500' },
        { icon: Heart, title: 'Make Friends', desc: 'Connect with like-minded people', color: 'from-red-500 to-orange-500' },
        { icon: Zap, title: 'Real-time Chat', desc: 'Instant messaging experience', color: 'from-yellow-500 to-amber-500' },
    ];

    return (
        <div className="min-h-screen bg-dark-900 overflow-hidden">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            {/* Navigation */}
            <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2"
                >
                    <MessageCircle className="w-8 h-8 text-purple-500" />
                    <span className="text-2xl font-bold text-white">PopTalk</span>
                </motion.div>
                <motion.button
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => navigate('/login')}
                    className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-full font-medium transition-colors"
                >
                    Login
                </motion.button>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10 flex flex-col items-center justify-center px-6 pt-20 pb-32 max-w-7xl mx-auto text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <h1 className="text-5xl md:text-7xl font-black text-white mb-6">
                        Chat <span className="bg-gradient-to-r from-purple-500 to-cyan-500 bg-clip-text text-transparent">Anonymously</span>
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
                        Connect with random people, make new friends, and have meaningful conversations.
                        Your identity stays private until you choose to reveal it.
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-col sm:flex-row gap-4"
                >
                    <button
                        onClick={() => navigate('/login')}
                        className="px-8 py-4 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-full font-bold text-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all transform hover:scale-105"
                    >
                        Get Started Free
                    </button>
                    <button
                        onClick={() => navigate('/privacy')}
                        className="px-8 py-4 bg-dark-800 text-white rounded-full font-bold text-lg border border-gray-700 hover:border-purple-500 transition-all"
                    >
                        Learn More
                    </button>
                </motion.div>

                {/* Stats */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="flex gap-12 mt-16"
                >
                    <div className="text-center">
                        <div className="text-3xl font-bold text-white">100%</div>
                        <div className="text-gray-500">Anonymous</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-white">E2E</div>
                        <div className="text-gray-500">Encrypted</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-white">Free</div>
                        <div className="text-gray-500">Forever</div>
                    </div>
                </motion.div>
            </main>

            {/* Features Section */}
            <section className="relative z-10 px-6 py-20 max-w-7xl mx-auto">
                <motion.h2
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="text-3xl font-bold text-white text-center mb-12"
                >
                    Why PopTalk?
                </motion.h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feature, index) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="p-6 bg-dark-800/50 backdrop-blur-sm rounded-2xl border border-gray-800 hover:border-purple-500/50 transition-colors"
                        >
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4`}>
                                <feature.icon className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                            <p className="text-gray-400">{feature.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* CTA Section */}
            <section className="relative z-10 px-6 py-20 max-w-4xl mx-auto text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="p-12 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-3xl border border-purple-500/20"
                >
                    <h2 className="text-3xl font-bold text-white mb-4">Ready to start chatting?</h2>
                    <p className="text-gray-400 mb-8">Join thousands of users already making meaningful connections.</p>
                    <button
                        onClick={() => navigate('/login')}
                        className="px-8 py-4 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-full font-bold text-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all transform hover:scale-105"
                    >
                        Join PopTalk Now
                    </button>
                </motion.div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 px-6 py-8 border-t border-gray-800">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <MessageCircle className="w-6 h-6 text-purple-500" />
                        <span className="text-lg font-bold text-white">PopTalk</span>
                    </div>
                    <div className="flex gap-6">
                        <button onClick={() => navigate('/privacy')} className="text-gray-400 hover:text-white transition-colors">
                            Privacy
                        </button>
                        <a href="mailto:support@poptalk.me" className="text-gray-400 hover:text-white transition-colors">
                            Contact
                        </a>
                    </div>
                    <p className="text-gray-500 text-sm">© 2025 PopTalk. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
