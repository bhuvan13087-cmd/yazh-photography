import { defineConfig } from 'vite';

const CLOUD_STORAGE_ENDPOINT = 'https://extendsclass.com/api/json-storage/bin/fbfcdba';

function manifestApiPlugin() {
  return {
    name: 'manifest-api-middleware',
    configureServer(server) {
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
    }
  };
}

export default defineConfig({
  plugins: [manifestApiPlugin()],
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
