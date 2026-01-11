import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Shield, Users, MessageCircle, X } from 'lucide-react';

const ONBOARDING_KEY = 'thapar_chat_onboarding_seen';

export default function OnboardingModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);

    const slides = [
        {
            icon: Lock,
            title: 'End-to-End Encrypted',
            description: 'All your chat messages are encrypted. Only you and your chat partner can read them. Not even we can see your messages.',
            color: 'from-purple-500 to-pink-500'
        },
        {
            icon: Shield,
            title: 'Nothing Stored',
            description: 'Your chat messages are never saved on our servers. When the chat ends, messages disappear forever.',
            color: 'from-green-500 to-teal-500'
        },
        {
            icon: Users,
            title: 'Thapar Only',
            description: 'Only verified @thapar.edu students can access this platform. Your community, your space.',
            color: 'from-blue-500 to-indigo-500'
        },
        {
            icon: MessageCircle,
            title: 'Make Real Connections',
            description: 'Found someone cool? Click "Vibe Together" to add them as a friend and chat anytime!',
            color: 'from-orange-500 to-red-500'
        }
    ];

    useEffect(() => {
        const seen = localStorage.getItem(ONBOARDING_KEY);
        if (!seen) {
            setIsOpen(true);
        }
    }, []);

    const handleClose = () => {
        localStorage.setItem(ONBOARDING_KEY, 'true');
        setIsOpen(false);
    };

    const nextSlide = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(currentSlide + 1);
        } else {
            handleClose();
        }
    };

    const CurrentIcon = slides[currentSlide].icon;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-dark-800 rounded-3xl w-full max-w-md overflow-hidden"
                    >
                        {/* Close button */}
                        <div className="flex justify-end p-4">
                            <button
                                onClick={handleClose}
                                className="p-2 text-gray-500 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Slide content */}
                        <div className="px-8 pb-8 text-center">
                            <motion.div
                                key={currentSlide}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                {/* Icon */}
                                <div className={`w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br ${slides[currentSlide].color} flex items-center justify-center`}>
                                    <CurrentIcon size={40} className="text-white" />
                                </div>

                                {/* Title */}
                                <h2 className="text-2xl font-bold text-white">
                                    {slides[currentSlide].title}
                                </h2>

                                {/* Description */}
                                <p className="text-gray-400">
                                    {slides[currentSlide].description}
                                </p>
                            </motion.div>

                            {/* Progress dots */}
                            <div className="flex justify-center gap-2 mt-8 mb-6">
                                {slides.map((_, i) => (
                                    <div
                                        key={i}
                                        className={`w-2 h-2 rounded-full transition-colors ${i === currentSlide ? 'bg-purple-500' : 'bg-gray-600'
                                            }`}
                                    />
                                ))}
                            </div>

                            {/* Button */}
                            <button
                                onClick={nextSlide}
                                className="btn-primary w-full"
                            >
                                {currentSlide < slides.length - 1 ? 'Next' : 'Get Started'}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
