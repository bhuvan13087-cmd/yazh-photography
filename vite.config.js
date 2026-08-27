import { defineConfig } from 'vite';

const CLOUD_STORAGE_ENDPOINT = 'https://extendsclass.com/api/json-storage/bin/fbfcdba';

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

              // Primary Cloud Upload: Catbox.moe
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
                    res.statusCode = 200;
                    res.end(JSON.stringify({
                      success: true,
                      image: {
                        url: finalUrl,
                        thumbnail: finalUrl,
                        id: `img-${timestamp}`,
                        filename: filename,
                        size: buffer.length
                      }
                    }));
                    return;
                  }
                }
              } catch (e) {
                console.warn('[Vite Middleware] Catbox upload error, trying fallback:', e.message);
              }

              // Secondary Fallback: Tmpfiles CDN
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
                    res.statusCode = 200;
                    res.end(JSON.stringify({
                      success: true,
                      image: {
                        url: `${directUrl}?v=${timestamp}`,
                        thumbnail: `${directUrl}?v=${timestamp}`,
                        id: `img-${timestamp}`,
                        filename: filename,
                        size: buffer.length
                      }
                    }));
                    return;
                  }
                }
              } catch (e) {
                console.warn('[Vite Middleware] Tmpfiles fallback error:', e.message);
              }

              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: 'All cloud image storage backends failed' }));
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
