const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

// Upload file to chat R2 bucket
export async function uploadChatFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${SERVER_URL}/api/upload/chat`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        throw new Error('Upload failed');
    }

    return response.json();
}

// Upload file to social R2 bucket
export async function uploadSocialFile(file, type = 'post') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const response = await fetch(`${SERVER_URL}/api/upload/social`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        throw new Error('Upload failed');
    }

    return response.json();
}
