import { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleProvider } from '../firebase';
import {
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    updatePassword,
    signOut,
    onAuthStateChanged,
    EmailAuthProvider,
    linkWithCredential
} from 'firebase/auth';

const AuthContext = createContext();

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

// Admin emails that bypass @thapar.edu restriction
const ADMIN_EMAILS = [
    'anantkrgupta02@gmail.com'
];

// Check if email is allowed
const isEmailAllowed = (email) => {
    if (!email) return false;
    if (email.endsWith('@thapar.edu')) return true;
    if (ADMIN_EMAILS.includes(email.toLowerCase())) return true;
    return false;
};

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser && isEmailAllowed(firebaseUser.email)) {
                // Check if user has password set up (has email provider)
                const hasPassword = firebaseUser.providerData.some(
                    p => p.providerId === 'password'
                );

                // Fetch user profile from MongoDB
                try {
                    const res = await fetch(`${SERVER_URL}/api/users/${firebaseUser.email}`);
                    if (res.ok) {
                        const userData = await res.json();
                        setUser({
                            ...firebaseUser,
                            ...userData,
                            hasPassword
                        });
                        setNeedsPasswordSetup(!hasPassword);
                    } else {
                        // New user - needs to set up profile
                        setUser({
                            email: firebaseUser.email,
                            displayName: firebaseUser.displayName,
                            photoUrl: firebaseUser.photoURL,
                            hasPassword: false,
                            isNewUser: true
                        });
                        setNeedsPasswordSetup(true);
                    }
                } catch (err) {
                    console.error('Error fetching user profile:', err);
                    setUser({
                        email: firebaseUser.email,
                        displayName: firebaseUser.displayName,
                        photoUrl: firebaseUser.photoURL,
                        hasPassword
                    });
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    // Login with Google (for new users)
    // Note: User is created in MongoDB by ProfileSetupModal, not here
    const loginWithGoogle = async () => {
        try {
            setError(null);
            const result = await signInWithPopup(auth, googleProvider);

            if (!isEmailAllowed(result.user.email)) {
                await signOut(auth);
                throw new Error('Only @thapar.edu emails are allowed');
            }

            return result.user;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    // Login with Email/Password (for returning users)
    const loginWithEmail = async (email, password) => {
        try {
            setError(null);
            const result = await signInWithEmailAndPassword(auth, email, password);
            return result.user;
        } catch (err) {
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setError('Invalid email or password');
            } else if (err.code === 'auth/invalid-credential') {
                setError('Invalid email or password');
            } else {
                setError(err.message);
            }
            throw err;
        }
    };

    // Set up password for Google user (links email/password to account)
    const setupPassword = async (password) => {
        try {
            setError(null);
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error('No user logged in');

            const credential = EmailAuthProvider.credential(currentUser.email, password);
            await linkWithCredential(currentUser, credential);

            setNeedsPasswordSetup(false);
            setUser(prev => ({ ...prev, hasPassword: true }));
            return true;
        } catch (err) {
            if (err.code === 'auth/provider-already-linked') {
                // Password already set
                setNeedsPasswordSetup(false);
                return true;
            }
            setError(err.message);
            throw err;
        }
    };

    // Send password reset email
    const resetPassword = async (email) => {
        try {
            setError(null);
            await sendPasswordResetEmail(auth, email);
            return true;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    // Change password
    const changePassword = async (newPassword) => {
        try {
            setError(null);
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error('No user logged in');

            await updatePassword(currentUser, newPassword);
            return true;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    // Logout
    const logout = async () => {
        await signOut(auth);
        setUser(null);
        setNeedsPasswordSetup(false);
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            error,
            needsPasswordSetup,
            loginWithGoogle,
            loginWithEmail,
            setupPassword,
            resetPassword,
            changePassword,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
