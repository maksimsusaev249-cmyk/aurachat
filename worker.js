/**
 * Chatix Cloudflare Worker & Pages Fetch Handler
 * Supports SPA fallback routing and /api/download proxy endpoint
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // API Route: /api/download proxy endpoint
    if (url.pathname === '/api/download') {
      const targetUrl = url.searchParams.get('url');
      const rawName = url.searchParams.get('name') || 'download';

      if (!targetUrl) {
        return new Response('Missing url parameter', { status: 400 });
      }

      try {
        const resp = await fetch(targetUrl);
        if (!resp.ok) {
          return new Response(`Failed to fetch: ${resp.statusText}`, { status: resp.status });
        }

        const contentType = resp.headers.get('content-type') || 'application/octet-stream';
        const headers = new Headers({
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${encodeURIComponent(rawName)}"`,
          'Access-Control-Allow-Origin': '*'
        });

        return new Response(resp.body, { status: 200, headers });
      } catch (err) {
        return new Response(`Error: ${err?.message || String(err)}`, { status: 500 });
      }
    }

    // Serve static assets with SPA fallback to /index.html
    if (env.ASSETS) {
      try {
        const response = await env.ASSETS.fetch(request);
        if (response.status !== 404) return response;
        return await env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
      } catch (e) {
        return await env.ASSETS.fetch(request);
      }
    }

    return new Response('Chatix OK', { status: 200 });
  }
};
