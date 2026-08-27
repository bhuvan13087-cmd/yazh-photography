// Vercel Serverless Function: Multi-Tier Persistent Cloud Image Storage Proxy
// Uploads binary image to persistent cloud CDN (Catbox / Cloud CDN)
// Eliminates browser CORS issues and provides reliable global CDN delivery

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

    // 1. Primary Cloud Upload: Catbox Permanent CDN
    try {
      const catboxForm = new FormData();
      catboxForm.append('reqtype', 'fileupload');
      catboxForm.append('fileToUpload', blob, filename);

      const catboxRes = await fetch('https://catbox.moe/user/api.php', {
        method: 'POST',
        body: catboxForm
      });

      if (catboxRes.ok) {
        const directUrl = (await catboxRes.text()).trim();
        if (directUrl.startsWith('http')) {
          const timestamp = Date.now();
          const finalUrl = `${directUrl}?v=${timestamp}`;
          return res.status(200).json({
            success: true,
            image: {
              url: finalUrl,
              thumbnail: finalUrl,
              id: `img-${timestamp}`,
              filename: filename,
              size: buffer.length
            }
          });
        }
      }
    } catch (err) {
      console.warn('[Upload Proxy] Catbox primary upload failed, trying fallback:', err.message);
    }

    // 2. Secondary Fallback: Tmpfiles CDN
    try {
      const tmpForm = new FormData();
      tmpForm.append('file', blob, filename);

      const tmpRes = await fetch('https://tmpfiles.org/api/v1/upload', {
        method: 'POST',
        body: tmpForm
      });

      if (tmpRes.ok) {
        const tmpJson = await tmpRes.json();
        if (tmpJson?.data?.url) {
          const rawUrl = tmpJson.data.url;
          const directUrl = rawUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
          const timestamp = Date.now();
          return res.status(200).json({
            success: true,
            image: {
              url: `${directUrl}?v=${timestamp}`,
              thumbnail: `${directUrl}?v=${timestamp}`,
              id: `img-${timestamp}`,
              filename: filename,
              size: buffer.length
            }
          });
        }
      }
    } catch (err) {
      console.warn('[Upload Proxy] Secondary tmpfiles upload failed:', err.message);
    }

    throw new Error('All cloud image storage backends failed. Please try again.');
  } catch (err) {
    console.error('[API /api/upload Error]:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
