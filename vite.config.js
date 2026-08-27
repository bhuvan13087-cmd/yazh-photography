import { defineConfig } from 'vite';

const CLOUD_STORAGE_ENDPOINT = 'https://extendsclass.com/api/json-storage/bin/fbfcdba';
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
          return text.replace(/^http:\/\//i, 'https://');
        }
      }
    } catch (e) {
      console.warn(`[Vite Middleware Catbox Attempt ${attempt} Failed]:`, e.message);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 500 * attempt));
      }
    }
  }
  return null;
}

function apiProxyPlugin() {
  return {
    name: 'api-proxy-middleware',
    configureServer(server) {
      // 1. /api/manifest middleware
      server.middlewares.use('/api/manifest', async (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          res.end();
          return;
        }

        if (req.method === 'GET') {
          try {
            const upstream = await fetch(`${CLOUD_STORAGE_ENDPOINT}?_t=${Date.now()}`, {
              method: 'GET',
              headers: { 'Accept': 'application/json' },
              cache: 'no-store'
            });

            if (!upstream.ok) {
              throw new Error(`Upstream returned ${upstream.status}`);
            }

            const data = await upstream.json();
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true, data }));
          } catch (err) {
            console.error('[Vite Dev Middleware /api/manifest GET Error]:', err.message);
            res.statusCode = 500;
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
          return;
        }

        if (req.method === 'POST' || req.method === 'PUT') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const payload = JSON.parse(body);
              const upstream = await fetch(CLOUD_STORAGE_ENDPOINT, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
              });

              if (!upstream.ok) {
                throw new Error(`Upstream returned ${upstream.status}`);
              }

              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, message: 'Synced' }));
            } catch (err) {
              console.error('[Vite Dev Middleware /api/manifest PUT Error]:', err.message);
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        res.statusCode = 405;
        res.end(JSON.stringify({ error: 'Method Not Allowed' }));
      });

      // 2. /api/upload middleware
      server.middlewares.use('/api/upload', async (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          res.end();
          return;
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const parsed = JSON.parse(body);
              const base64Data = parsed.image || parsed.source;
              const filename = parsed.filename || `photo_${Date.now()}.jpg`;

              if (!base64Data) {
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, error: 'Missing image data' }));
                return;
              }

              const cleanBase64 = base64Data.replace(/^data:image\/[a-z0-9+]+;base64,/i, '');
              const buffer = Buffer.from(cleanBase64, 'base64');
              
              let mimeType = 'image/jpeg';
              if (/\.png$/i.test(filename)) mimeType = 'image/png';
              else if (/\.webp$/i.test(filename)) mimeType = 'image/webp';

              const blob = new Blob([buffer], { type: mimeType });

              // Upload to Catbox Direct Image CDN
              const cdnUrl = await uploadToCatbox(blob, filename);

              if (cdnUrl) {
                const timestamp = Date.now();
                const versionedUrl = `${cdnUrl}?v=${timestamp}`;

                res.statusCode = 200;
                res.end(JSON.stringify({
                  success: true,
                  image: {
                    url: versionedUrl,
                    thumbnail: versionedUrl,
                    id: `img-${timestamp}`,
                    filename: filename,
                    size: buffer.length
                  }
                }));
                return;
              }

              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: 'Could not upload image to persistent cloud storage' }));
            } catch (err) {
              console.error('[Vite Dev Middleware /api/upload Error]:', err.message);
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        res.statusCode = 405;
        res.end(JSON.stringify({ error: 'Method Not Allowed' }));
      });
    }
  };
}

export default defineConfig({
  plugins: [apiProxyPlugin()],
  server: {
    port: 3000,
    open: false,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
