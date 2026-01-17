import imageCompression from 'browser-image-compression';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

// Constants
const CHAT_MAX_SIZE = 10 * 1024 * 1024; // 10MB for chat
const SOCIAL_TARGET_SIZE = 300 * 1024; // 300KB for social

/**
 * Compress image in browser to target size
 * @param {File} file - Image file to compress
 * @param {number} maxSizeKB - Target max size in KB
 * @returns {Promise<{file: File, wasCompressed: boolean, originalSize: number}>}
 */
async function compressImage(file, maxSizeKB) {
    const originalSize = file.size;

    // If already under target, return as-is
    if (file.size <= maxSizeKB * 1024) {
        return { file, wasCompressed: false, originalSize };
    }

    try {
        const options = {
            maxSizeMB: maxSizeKB / 1024,
            maxWidthOrHeight: 1200,
            useWebWorker: true,
            fileType: 'image/jpeg'
        };

        const compressedFile = await imageCompression(file, options);

        return {
            file: compressedFile,
            wasCompressed: true,
            originalSize
        };
    } catch (error) {
        console.error('Compression failed:', error);
        // Return original if compression fails
        return { file, wasCompressed: false, originalSize };
    }
}

/**
 * Upload file to chat R2 bucket
 * Supports images, videos, and audio (max 10MB)
 * Returns a presigned URL that expires in 30 minutes
 */
export async function uploadChatFile(file) {
    // Validate file size (10MB max)
    if (file.size > CHAT_MAX_SIZE) {
        throw new Error(`File too large. Maximum size is 10MB.`);
    }

    // Validate file type
    const allowedTypes = ['image/', 'video/', 'audio/'];
    if (!allowedTypes.some(type => file.type.startsWith(type))) {
        throw new Error('Invalid file type. Only images, videos, and audio are allowed.');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${SERVER_URL}/api/upload/chat`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Upload failed');
    }

    return response.json();
}

/**
 * Upload file to social R2 bucket
 * Supports images only (compressed to 300KB in browser before upload)
 * Returns a permanent public URL
 */
export async function uploadSocialFile(file, type = 'post') {
    // Validate file type (images only for social)
    if (!file.type.startsWith('image/')) {
        throw new Error('Invalid file type. Only images are allowed for social uploads.');
    }

    // Compress in browser before uploading
    const { file: compressedFile, wasCompressed, originalSize } = await compressImage(
        file,
        SOCIAL_TARGET_SIZE / 1024 // Convert to KB
    );

    const formData = new FormData();
    formData.append('file', compressedFile);
    formData.append('type', type); // 'post' or 'profile'

    const response = await fetch(`${SERVER_URL}/api/upload/social`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Upload failed');
    }

    const result = await response.json();

    // Add compression info to result
    return {
        ...result,
        compressed: wasCompressed,
        originalSize,
        finalSize: compressedFile.size,
        message: wasCompressed
            ? `Image compressed from ${formatBytes(originalSize)} to ${formatBytes(compressedFile.size)}`
            : null
    };
}

/**
 * Get upload service status
 */
export async function getUploadStatus() {
    const response = await fetch(`${SERVER_URL}/api/upload/status`);
    return response.json();
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get file type category
 */
export function getFileType(file) {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'unknown';
}
