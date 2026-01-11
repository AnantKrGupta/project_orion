const express = require('express');
const router = express.Router();
const multer = require('multer');

// Multer setup for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 15 * 1024 * 1024 // 15 MB max
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

// Only initialize S3 clients if R2 is configured
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

// Upload to Chat R2 (images and audio)
router.post('/chat', upload.single('file'), async (req, res) => {
    // If R2 is not configured, return base64
    if (!isR2Configured) {
        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        const base64 = req.file.buffer.toString('base64');
        const mimeType = req.file.mimetype;
        const dataUrl = `data:${mimeType};base64,${base64}`;

        return res.json({ url: dataUrl, key: null });
    }

    try {
        const { PutObjectCommand } = require('@aws-sdk/client-s3');
        const { v4: uuidv4 } = require('uuid');

        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        const file = req.file;
        const isAudio = file.mimetype.startsWith('audio/');
        const folder = isAudio ? 'audio' : 'images';
        const ext = file.originalname.split('.').pop() || (isAudio ? 'webm' : 'jpg');
        const key = `chat/${folder}/${uuidv4()}.${ext}`;

        await r2Chat.send(new PutObjectCommand({
            Bucket: process.env.R2_CHAT_BUCKET,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype
        }));

        const url = `${process.env.R2_CHAT_PUBLIC_URL}/${key}`;
        res.json({ url, key });
    } catch (error) {
        console.error('Chat upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// Upload to Social R2 (posts and profiles)
router.post('/social', upload.single('file'), async (req, res) => {
    // If R2 is not configured, return base64
    if (!isR2Configured) {
        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        const base64 = req.file.buffer.toString('base64');
        const mimeType = req.file.mimetype;
        const dataUrl = `data:${mimeType};base64,${base64}`;

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
        message: isR2Configured ? 'R2 storage active' : 'Using base64 fallback'
    });
});

module.exports = router;
