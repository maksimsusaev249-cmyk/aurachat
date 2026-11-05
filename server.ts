import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

async function createServer() {
  const app = express();
  app.use(express.json());

  // API Route: /api/download (Proxy media files for direct browser download)
  app.get('/api/download', async (req, res) => {
    try {
      const targetUrl = req.query.url as string;
      const rawName = (req.query.name as string) || 'download';

      if (!targetUrl) {
        res.status(400).send('Missing url parameter');
        return;
      }

      const response = await fetch(targetUrl);
      if (!response.ok) {
        res.status(response.status).send(`Failed to fetch: ${response.statusText}`);
        return;
      }

      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(rawName)}"`);
      res.setHeader('Access-Control-Allow-Origin', '*');

      const arrayBuffer = await response.arrayBuffer();
      res.status(200).send(Buffer.from(arrayBuffer));
    } catch (err: any) {
      res.status(500).send(`Error: ${err?.message || String(err)}`);
    }
  });

  if (!isProd) {
    // Development mode: Mount Vite dev middleware dynamically
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'custom'
      });
      app.use(vite.middlewares);

      app.get('*', async (req, res, next) => {
        try {
          const url = req.originalUrl;
          const indexPath = path.resolve(__dirname, 'index.html');
          if (fs.existsSync(indexPath)) {
            let template = fs.readFileSync(indexPath, 'utf-8');
            template = await vite.transformIndexHtml(url, template);
            res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
          } else {
            next();
          }
        } catch (e: any) {
          vite.ssrFixStacktrace(e);
          next(e);
        }
      });
    } catch (e) {
      console.warn('Vite dev middleware import failed, falling back to static files', e);
    }
  }

  // Production fallback / Static files serving
  const distPath = path.resolve(__dirname, 'dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        const rootIndex = path.resolve(__dirname, 'index.html');
        if (fs.existsSync(rootIndex)) {
          res.sendFile(rootIndex);
        } else {
          res.status(404).send('AuraChat index.html not found');
        }
      }
    });
  } else {
    app.get('*', (req, res) => {
      const rootIndex = path.resolve(__dirname, 'index.html');
      if (fs.existsSync(rootIndex)) {
        res.sendFile(rootIndex);
      } else {
        res.status(404).send('AuraChat index.html not found');
      }
    });
  }

  app.listen(PORT, () => {
    console.log(`🚀 AuraChat server running on port ${PORT} (${isProd ? 'production' : 'development'})`);
  });
}

createServer();
