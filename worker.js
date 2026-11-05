export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Serve static assets from build output directory
    if (env.ASSETS) {
      try {
        const response = await env.ASSETS.fetch(request);
        if (response.status !== 404) {
          return response;
        }
        // Fallback for SPA routing
        return await env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
      } catch (e) {
        // Fallback to asset fetch
        return await env.ASSETS.fetch(request);
      }
    }

    return new Response('AuraChat Server Running', {
      headers: { 'content-type': 'text/plain;charset=UTF-8' }
    });
  }
};
