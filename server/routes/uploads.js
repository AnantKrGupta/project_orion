const express = require('express');
const router = express.Router();
const multer = require('multer');

// Constants
const CHAT_MAX_SIZE = 10 * 1024 * 1024; // 10MB for chat (images, videos, audio)
const SOCIAL_MAX_SIZE = 500 * 1024; // 500KB for social (already compressed by client)
const PRESIGNED_URL_EXPIRY = 30 * 60; // 30 minutes in seconds

// Multer configs
const chatUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: CHAT_MAX_SIZE },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/', 'video/', 'audio/'];
        if (allowedTypes.some(type => file.mimetype.startsWith(type))) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images, videos, and audio are allowed.'));
        }
    }
});

const socialUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: SOCIAL_MAX_SIZE },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images are allowed for social uploads.'));
        }
    }
});

// Check if R2 is configured
const isR2Configured = !!(
    process.env.R2_CHAT_ENDPOINT &&
    process.env.R2_CHAT_ACCESS_KEY &&
    process.env.R2_CHAT_SECRET_KEY
);

let r2Chat = null;
let r2Social = null;

// Initialize S3 clients if R2 is configured
if (isR2Configured) {
    const { S3Client } = require('@aws-sdk/client-s3');

    r2Chat = new S3Client({
        region: 'auto',
        endpoint: process.env.R2_CHAT_ENDPOINT,
        credentials: {
            accessKeyId: process.env.R2_CHAT_ACCESS_KEY,
            secretAccessKey: process.env.R2_CHAT_SECRET_KEY
        }
    });

    r2Social = new S3Client({
        region: 'auto',
        endpoint: process.env.R2_SOCIAL_ENDPOINT,
        credentials: {
            accessKeyId: process.env.R2_SOCIAL_ACCESS_KEY,
            secretAccessKey: process.env.R2_SOCIAL_SECRET_KEY
        }
    });
}

// Upload to Chat R2 (images, videos, audio) - Uses presigned URLs
router.post('/chat', chatUpload.single('file'), async (req, res) => {
    // If R2 is not configured, return base64
    if (!isR2Configured) {
        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }
        const base64 = req.file.buffer.toString('base64');
        const dataUrl = `data:${req.file.mimetype};base64,${base64}`;
        return res.json({ url: dataUrl, key: null, expiresIn: null });
    }

    try {
        const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
        const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
        const { v4: uuidv4 } = require('uuid');

        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        const file = req.file;

        // Determine folder based on file type
        let folder = 'images';
        if (file.mimetype.startsWith('video/')) folder = 'videos';
        else if (file.mimetype.startsWith('audio/')) folder = 'audio';

        const ext = file.originalname.split('.').pop() || getDefaultExtension(file.mimetype);
        const key = `chat/${folder}/${uuidv4()}.${ext}`;

        // Upload to R2
        await r2Chat.send(new PutObjectCommand({
            Bucket: process.env.R2_CHAT_BUCKET,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype
        }));

        // Generate presigned URL (30 minutes)
        const presignedUrl = await getSignedUrl(
            r2Chat,
            new GetObjectCommand({
                Bucket: process.env.R2_CHAT_BUCKET,
                Key: key
            }),
            { expiresIn: PRESIGNED_URL_EXPIRY }
        );

        res.json({
            url: presignedUrl,
            key,
            expiresIn: PRESIGNED_URL_EXPIRY,
            expiresAt: new Date(Date.now() + PRESIGNED_URL_EXPIRY * 1000).toISOString()
        });
    } catch (error) {
        console.error('Chat upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// Upload to Social R2 (posts and profiles) - Uses public URLs
// Note: Images are pre-compressed by client to ~300KB
router.post('/social', socialUpload.single('file'), async (req, res) => {
    // If R2 is not configured, return base64
    if (!isR2Configured) {
        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }
        const base64 = req.file.buffer.toString('base64');
        const dataUrl = `data:${req.file.mimetype};base64,${base64}`;
        return res.json({ url: dataUrl, key: null });
    }

    try {
        const { PutObjectCommand } = require('@aws-sdk/client-s3');
        const { v4: uuidv4 } = require('uuid');

        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        const file = req.file;
        const type = req.body.type || 'post';
        const folder = type === 'profile' ? 'profiles' : 'posts';
        const ext = file.originalname.split('.').pop() || 'jpg';
        const key = `social/${folder}/${uuidv4()}.${ext}`;

        await r2Social.send(new PutObjectCommand({
            Bucket: process.env.R2_SOCIAL_BUCKET,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype
        }));

        const url = `${process.env.R2_SOCIAL_PUBLIC_URL}/${key}`;
        res.json({ url, key });
    } catch (error) {
        console.error('Social upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// Status endpoint
router.get('/status', (req, res) => {
    res.json({
        r2Configured: isR2Configured,
        message: isR2Configured ? 'R2 storage active' : 'Using base64 fallback',
        limits: {
            chat: { maxSize: '10MB', types: ['image', 'video', 'audio'], urlExpiry: '30 min' },
            social: { maxSize: '300KB (client-compressed)', types: ['image'], urlType: 'public' }
        }
    });
});

// Helper: Get default extension from mime type
function getDefaultExtension(mimeType) {
    const map = {
        'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp',
        'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
        'audio/mpeg': 'mp3', 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/wav': 'wav'
    };
    return map[mimeType] || 'bin';
}

// Helper: Format bytes
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Error handling for multer
router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                error: 'File too large',
                maxSize: req.path.includes('chat') ? '10MB' : '500KB'
            });
        }
    }
    if (err.message) {
        return res.status(400).json({ error: err.message });
    }
    next(err);
});

module.exports = router;
