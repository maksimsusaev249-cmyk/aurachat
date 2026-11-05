export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Handle API proxy downloads on Cloudflare Workers
    if (url.pathname === '/api/download') {
      try {
        const targetUrl = url.searchParams.get('url');
        const rawName = url.searchParams.get('name') || 'download';
        if (!targetUrl) {
          return new Response('Missing url parameter', { status: 400 });
        }
        const mediaResp = await fetch(targetUrl);
        if (!mediaResp.ok) {
          return new Response(`Failed to fetch: ${mediaResp.statusText}`, { status: mediaResp.status });
        }
        const contentType = mediaResp.headers.get('content-type') || 'application/octet-stream';
        const headers = new Headers(mediaResp.headers);
        headers.set('Content-Type', contentType);
        headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(rawName)}"`);
        headers.set('Access-Control-Allow-Origin', '*');
        return new Response(mediaResp.body, {
          status: 200,
          headers
        });
      } catch (err) {
        return new Response(`Error: ${err?.message || String(err)}`, { status: 500 });
      }
    }

    // 2. Serve static assets from build output directory
    if (env && env.ASSETS) {
      try {
        const response = await env.ASSETS.fetch(request);
        if (response && response.status !== 404) {
          return response;
        }
        // Fallback for SPA routing to /index.html
        return await env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
      } catch (e) {
        return await env.ASSETS.fetch(request);
      }
    }

    return new Response('AuraChat Server Running', {
      headers: { 'content-type': 'text/plain;charset=UTF-8' }
    });
  }
};
