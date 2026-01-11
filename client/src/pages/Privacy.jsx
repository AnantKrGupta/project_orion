export default function Privacy() {
    return (
        <div className="min-h-screen bg-dark-900 p-6">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold gradient-text mb-8">🔐 Your Privacy Matters</h1>

                <div className="space-y-6">
                    <div className="card">
                        <h2 className="text-xl font-semibold text-green-400 mb-2">✅ No Message Storage</h2>
                        <p className="text-gray-400">
                            Messages exist only during your chat session. We never store messages on our servers.
                            When you disconnect, messages are gone forever.
                        </p>
                    </div>

                    <div className="card">
                        <h2 className="text-xl font-semibold text-green-400 mb-2">✅ End-to-End Encryption</h2>
                        <p className="text-gray-400">
                            All chat messages are encrypted using RSA-2048 encryption. Only you and your chat
                            partner can read the messages. Our server only sees encrypted data.
                        </p>
                    </div>

                    <div className="card">
                        <h2 className="text-xl font-semibold text-green-400 mb-2">✅ Thapar-Only Access</h2>
                        <p className="text-gray-400">
                            Only verified @thapar.edu email addresses can access the platform.
                            This ensures a safe community of Thapar students only.
                        </p>
                    </div>

                    <div className="card">
                        <h2 className="text-xl font-semibold text-purple-400 mb-2">How It Works</h2>
                        <div className="bg-dark-700 rounded-lg p-4 font-mono text-sm text-gray-300">
                            <p>You ──[Encrypted]──► Server ──[Encrypted]──► Partner</p>
                            <p className="text-gray-500 mt-2">       │                         │</p>
                            <p className="text-red-400">  Can't read              Can't read</p>
                        </div>
                    </div>

                    <div className="card">
                        <h2 className="text-xl font-semibold text-yellow-400 mb-2">⚠️ What We Store</h2>
                        <ul className="text-gray-400 space-y-2">
                            <li>• Your profile (display name, photo, bio)</li>
                            <li>• Community posts (deleted after 30 days)</li>
                            <li>• Friend connections</li>
                            <li>• Report history (for moderation)</li>
                        </ul>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <a href="/" className="btn-secondary inline-block">
                        Back to Login
                    </a>
                </div>
            </div>
        </div>
    );
}
