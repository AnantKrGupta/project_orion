import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import {
    Heart, HeartCrack, MessageCircle, Image, Send,
    X, Flag, Loader2, Plus
} from 'lucide-react';
import imageCompression from 'browser-image-compression';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export default function Feed() {
    const { user } = useAuth();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newPostText, setNewPostText] = useState('');
    const [newPostImages, setNewPostImages] = useState([]);
    const [creating, setCreating] = useState(false);
    const [expandedComments, setExpandedComments] = useState(null);

    // Fetch posts
    const fetchPosts = async () => {
        try {
            const res = await fetch(`${SERVER_URL}/api/posts`);
            const data = await res.json();
            setPosts(data);
        } catch (error) {
            console.error('Error fetching posts:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, []);

    // Create post
    const createPost = async () => {
        if (!newPostText.trim()) return;

        setCreating(true);
        try {
            const res = await fetch(`${SERVER_URL}/api/posts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: user.email,
                    text: newPostText,
                    images: newPostImages
                })
            });

            if (!res.ok) {
                const error = await res.json();
                alert(error.error);
                return;
            }

            const post = await res.json();
            setPosts([post, ...posts]);
            setNewPostText('');
            setNewPostImages([]);
            setShowCreateModal(false);
        } catch (error) {
            console.error('Error creating post:', error);
            alert('Failed to create post');
        } finally {
            setCreating(false);
        }
    };

    // Handle image upload
    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || newPostImages.length >= 2) return;

        try {
            const compressed = await imageCompression(file, {
                maxSizeMB: 0.3,
                maxWidthOrHeight: 1920,
                useWebWorker: true
            });

            // Convert to base64 for now (replace with R2 upload later)
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewPostImages([...newPostImages, reader.result]);
            };
            reader.readAsDataURL(compressed);
        } catch (error) {
            console.error('Error compressing image:', error);
        }
    };

    // React to post
    const reactToPost = async (postId, type) => {
        try {
            const res = await fetch(`${SERVER_URL}/api/posts/${postId}/react`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email, type })
            });

            const { hearts, brokenHearts } = await res.json();

            setPosts(posts.map(p =>
                p._id === postId
                    ? { ...p, hearts: Array(hearts).fill(1), brokenHearts: Array(brokenHearts).fill(1) }
                    : p
            ));
        } catch (error) {
            console.error('Error reacting:', error);
        }
    };

    // Format time ago
    const timeAgo = (date) => {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        if (seconds < 60) return 'just now';
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

    return (
        <div className="pb-4">
            {/* Header */}
            <div className="sticky top-0 bg-dark-900/95 backdrop-blur-lg z-10 px-4 py-4 border-b border-white/5">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold gradient-text">Campus Buzz</h1>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="p-2 bg-purple-600 hover:bg-purple-500 rounded-xl transition-colors"
                    >
                        <Plus size={20} />
                    </button>
                </div>
            </div>

            {/* Posts */}
            <div className="space-y-4 p-4">
                {posts.length === 0 ? (
                    <div className="text-center text-gray-500 py-12">
                        <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No posts yet. Be the first to share!</p>
                    </div>
                ) : (
                    posts.map((post) => (
                        <PostCard
                            key={post._id}
                            post={post}
                            onReact={reactToPost}
                            onToggleComments={() =>
                                setExpandedComments(expandedComments === post._id ? null : post._id)
                            }
                            showComments={expandedComments === post._id}
                            timeAgo={timeAgo}
                            userEmail={user.email}
                        />
                    ))
                )}
            </div>

            {/* Create Post Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4"
                        onClick={() => setShowCreateModal(false)}
                    >
                        <motion.div
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-dark-800 rounded-2xl w-full max-w-lg p-6"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-white">Create Post</h2>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="p-2 text-gray-400 hover:text-white"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <textarea
                                value={newPostText}
                                onChange={(e) => setNewPostText(e.target.value)}
                                placeholder="What's on your mind?"
                                className="w-full bg-dark-700 rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none h-32"
                                maxLength={500}
                            />
                            <div className="text-right text-xs text-gray-500 mt-1">
                                {newPostText.length}/500
                            </div>

                            {/* Image previews */}
                            {newPostImages.length > 0 && (
                                <div className="flex gap-2 mt-4">
                                    {newPostImages.map((img, i) => (
                                        <div key={i} className="relative">
                                            <img
                                                src={img}
                                                alt={`Upload ${i + 1}`}
                                                className="w-20 h-20 object-cover rounded-lg"
                                            />
                                            <button
                                                onClick={() => setNewPostImages(newPostImages.filter((_, j) => j !== i))}
                                                className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center justify-between mt-4">
                                <label className="flex items-center gap-2 text-gray-400 hover:text-white cursor-pointer">
                                    <Image size={20} />
                                    <span className="text-sm">Add image ({newPostImages.length}/2)</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        disabled={newPostImages.length >= 2}
                                        className="hidden"
                                    />
                                </label>

                                <button
                                    onClick={createPost}
                                    disabled={!newPostText.trim() || creating}
                                    className="btn-primary flex items-center gap-2"
                                >
                                    {creating ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        <Send size={18} />
                                    )}
                                    Post
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Post Card Component
function PostCard({ post, onReact, onToggleComments, showComments, timeAgo, userEmail }) {
    const [comments, setComments] = useState([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

    // Fetch comments when expanded
    useEffect(() => {
        if (showComments && comments.length === 0) {
            fetchComments();
        }
    }, [showComments]);

    const fetchComments = async () => {
        setLoadingComments(true);
        try {
            const res = await fetch(`${SERVER_URL}/api/posts/${post._id}/comments`);
            const data = await res.json();
            setComments(data);
        } catch (error) {
            console.error('Error fetching comments:', error);
        } finally {
            setLoadingComments(false);
        }
    };

    const addComment = async () => {
        if (!newComment.trim()) return;

        setSubmitting(true);
        try {
            const res = await fetch(`${SERVER_URL}/api/posts/${post._id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userEmail, text: newComment })
            });

            if (!res.ok) {
                const error = await res.json();
                alert(error.error);
                return;
            }

            const comment = await res.json();
            setComments([comment, ...comments]);
            setNewComment('');
        } catch (error) {
            console.error('Error adding comment:', error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
        >
            {/* Author */}
            <div className="flex items-center gap-3 mb-4">
                <img
                    src={post.author?.photoUrl || `https://ui-avatars.com/api/?name=${post.author?.displayName}&background=random`}
                    alt={post.author?.displayName}
                    className="w-10 h-10 rounded-full"
                />
                <div className="flex-1">
                    <h3 className="font-semibold text-white">{post.author?.displayName}</h3>
                    <p className="text-xs text-gray-500">{timeAgo(post.createdAt)}</p>
                </div>
                <button className="p-2 text-gray-500 hover:text-red-400">
                    <Flag size={16} />
                </button>
            </div>

            {/* Content */}
            <p className="text-gray-200 mb-4">{post.text}</p>

            {/* Images */}
            {post.images?.length > 0 && (
                <div className={`grid gap-2 mb-4 ${post.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {post.images.map((img, i) => (
                        <img
                            key={i}
                            src={img}
                            alt={`Post image ${i + 1}`}
                            className="rounded-xl w-full h-48 object-cover"
                        />
                    ))}
                </div>
            )}

            {/* Reactions */}
            <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                <button
                    onClick={() => onReact(post._id, 'heart')}
                    className="flex items-center gap-2 text-gray-400 hover:text-pink-500 transition-colors"
                >
                    <Heart size={20} />
                    <span>{post.hearts?.length || 0}</span>
                </button>
                <button
                    onClick={() => onReact(post._id, 'brokenHeart')}
                    className="flex items-center gap-2 text-gray-400 hover:text-purple-500 transition-colors"
                >
                    <HeartCrack size={20} />
                    <span>{post.brokenHearts?.length || 0}</span>
                </button>
                <button
                    onClick={onToggleComments}
                    className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors"
                >
                    <MessageCircle size={20} />
                    <span>{post.commentCount || 0}</span>
                </button>
            </div>

            {/* Comments Section */}
            <AnimatePresence>
                {showComments && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-4 pt-4 border-t border-white/5">
                            {/* New comment input */}
                            <div className="flex gap-2 mb-4">
                                <input
                                    type="text"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Write a comment..."
                                    className="flex-1 bg-dark-700 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none"
                                    maxLength={300}
                                />
                                <button
                                    onClick={addComment}
                                    disabled={!newComment.trim() || submitting}
                                    className="p-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-xl"
                                >
                                    {submitting ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <Send size={16} />
                                    )}
                                </button>
                            </div>

                            {/* Comments list */}
                            {loadingComments ? (
                                <div className="text-center py-4">
                                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-500" />
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-60 overflow-y-auto">
                                    {comments.map((comment) => (
                                        <CommentItem key={comment._id} comment={comment} userEmail={userEmail} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// Comment Item Component
function CommentItem({ comment, userEmail }) {
    const [likes, setLikes] = useState(comment.likes?.length || 0);
    const [dislikes, setDislikes] = useState(comment.dislikes?.length || 0);

    const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

    const handleLike = async () => {
        try {
            const res = await fetch(`${SERVER_URL}/api/comments/${comment._id}/like`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userEmail })
            });
            const data = await res.json();
            setLikes(data.likes);
            setDislikes(data.dislikes);
        } catch (error) {
            console.error('Error liking:', error);
        }
    };

    const handleDislike = async () => {
        try {
            const res = await fetch(`${SERVER_URL}/api/comments/${comment._id}/dislike`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userEmail })
            });
            const data = await res.json();
            setLikes(data.likes);
            setDislikes(data.dislikes);
        } catch (error) {
            console.error('Error disliking:', error);
        }
    };

    return (
        <div className="flex gap-3">
            <img
                src={comment.author?.photoUrl || `https://ui-avatars.com/api/?name=${comment.author?.displayName}&background=random`}
                alt={comment.author?.displayName}
                className="w-8 h-8 rounded-full flex-shrink-0"
            />
            <div className="flex-1">
                <div className="bg-dark-700 rounded-xl px-3 py-2">
                    <p className="text-sm font-medium text-white">{comment.author?.displayName}</p>
                    <p className="text-sm text-gray-300">{comment.text}</p>
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                    <button onClick={handleLike} className="hover:text-green-400">
                        👍 {likes}
                    </button>
                    <button onClick={handleDislike} className="hover:text-red-400">
                        👎 {dislikes}
                    </button>
                    <button className="hover:text-red-400">
                        🚩
                    </button>
                </div>
            </div>
        </div>
    );
}
