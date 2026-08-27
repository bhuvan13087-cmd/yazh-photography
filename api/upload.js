// Vercel Serverless Function: Persistent Cloud Image Storage Proxy
// Uploads binary image to persistent Catbox Cloud CDN (https://files.catbox.moe/...)
// Eliminates browser CORS restrictions and guarantees direct raw image delivery

const CATBOX_API_URL = 'https://catbox.moe/user/api.php';

async function uploadToCatbox(blob, filename, maxRetries = 2) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const formData = new FormData();
      formData.append('reqtype', 'fileupload');
      formData.append('fileToUpload', blob, filename);

      const response = await fetch(CATBOX_API_URL, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const text = (await response.text()).trim();
        if (text.startsWith('http://') || text.startsWith('https://')) {
          // Convert http to https
          return text.replace(/^http:\/\//i, 'https://');
        }
      }
    } catch (e) {
      console.warn(`[Catbox Upload Attempt ${attempt} Failed]:`, e.message);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 500 * attempt));
      }
    }
  }
  return null;
}

export default async function handler(req, res) {
  // Set CORS and Cache Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const base64Data = body?.image || body?.source;
    const filename = body?.filename || `photo_${Date.now()}.jpg`;

    if (!base64Data) {
      return res.status(400).json({ success: false, error: 'Missing image data in request payload.' });
    }

    // Convert base64 to Buffer & Blob
    const cleanBase64 = base64Data.replace(/^data:image\/[a-z0-9+]+;base64,/i, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    
    // Determine mime type from filename
    let mimeType = 'image/jpeg';
    if (/\.png$/i.test(filename)) mimeType = 'image/png';
    else if (/\.webp$/i.test(filename)) mimeType = 'image/webp';
    
    const blob = new Blob([buffer], { type: mimeType });

    // Upload to Catbox Direct Image CDN
    const cdnUrl = await uploadToCatbox(blob, filename);

    if (cdnUrl) {
      const timestamp = Date.now();
      const versionedUrl = `${cdnUrl}?v=${timestamp}`;

      return res.status(200).json({
        success: true,
        image: {
          url: versionedUrl,
          thumbnail: versionedUrl,
          id: `img-${timestamp}`,
          filename: filename,
          size: buffer.length
        }
      });
    }

    throw new Error('Could not upload image to persistent cloud storage. Please try again.');
  } catch (err) {
    console.error('[API /api/upload Error]:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
