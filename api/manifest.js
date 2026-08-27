// Vercel Serverless Function & Cloud Manifest Proxy
// Handles persistent CRUD synchronization between browser client and cloud JSON storage
// Eliminates browser CORS preflight issues and provides secure server-to-server synchronization

const CLOUD_STORAGE_ENDPOINT = 'https://extendsclass.com/api/json-storage/bin/fbfcdba';

export default async function handler(req, res) {
  // Set CORS and Cache Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. GET: Fetch latest persistent cloud state
  if (req.method === 'GET') {
    try {
      const response = await fetch(`${CLOUD_STORAGE_ENDPOINT}?_t=${Date.now()}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`Upstream cloud storage returned HTTP ${response.status}`);
      }

      const data = await response.json();
      return res.status(200).json({ success: true, data });
    } catch (err) {
      console.error('[API /api/manifest GET Error]:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // 2. POST / PUT: Update persistent cloud state
  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      
      if (!payload || typeof payload !== 'object') {
        return res.status(400).json({ success: false, error: 'Invalid payload' });
      }

      const response = await fetch(CLOUD_STORAGE_ENDPOINT, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Upstream cloud storage returned HTTP ${response.status}`);
      }

      return res.status(200).json({ success: true, message: 'Cloud manifest synced successfully' });
    } catch (err) {
      console.error('[API /api/manifest PUT Error]:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method Not Allowed' });
}
