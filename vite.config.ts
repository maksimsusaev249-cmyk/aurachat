import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {defineConfig, Plugin} from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function copyDistToBuildPlugin(): Plugin {
  return {
    name: 'copy-dist-to-build-plugin',
    closeBundle() {
      try {
        const distDir = path.resolve(__dirname, 'dist');
        const buildDir = path.resolve(__dirname, 'build');
        if (fs.existsSync(distDir)) {
          fs.cpSync(distDir, buildDir, { recursive: true });
        }
      } catch {}
    }
  };
}

function downloadProxyPlugin(): Plugin {
  return {
    name: 'download-proxy-plugin',
    configureServer(server) {
      server.middlewares.use('/api/download', async (req, res) => {
        try {
          const urlObj = new URL(req.url || '', `http://${req.headers.host}`);
          const targetUrl = urlObj.searchParams.get('url');
          const rawName = urlObj.searchParams.get('name') || 'download';
          if (!targetUrl) {
            res.statusCode = 400;
            res.end('Missing url parameter');
            return;
          }

          const response = await fetch(targetUrl);
          if (!response.ok) {
            res.statusCode = response.status;
            res.end(`Failed to fetch: ${response.statusText}`);
            return;
          }

          const contentType = response.headers.get('content-type') || 'application/octet-stream';
          res.setHeader('Content-Type', contentType);
          res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(rawName)}"`);
          res.setHeader('Access-Control-Allow-Origin', '*');

          const arrayBuffer = await response.arrayBuffer();
          res.end(Buffer.from(arrayBuffer));
        } catch (err: any) {
          res.statusCode = 500;
          res.end(`Error: ${err.message}`);
        }
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), downloadProxyPlugin(), copyDistToBuildPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 3000,
      target: 'esnext',
      cssCodeSplit: true,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

