import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

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

// Serve static assets from Vite dist folder
const distPath = path.resolve(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  // SPA fallback for non-file routes
  app.get('*', (req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('AuraChat dist/index.html not found');
    }
  });
} else {
  app.get('*', (req, res) => {
    res.send('AuraChat Server Running. Please run "npm run build" first.');
  });
}

app.listen(PORT, () => {
  console.log(`🚀 AuraChat production server listening on port ${PORT}`);
});
