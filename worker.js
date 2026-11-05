export default {
  async fetch(request, env) {
    if (env.ASSETS) {
      try {
        const response = await env.ASSETS.fetch(request);
        if (response.status !== 404) return response;
        return await env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
      } catch (e) {
        return await env.ASSETS.fetch(request);
      }
    }
    return new Response('AuraChat OK', { status: 200 });
  }
};
