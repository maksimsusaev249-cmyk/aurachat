export default async function handler(req: any, res: any) {
  try {
    const urlStr = req.url || '';
    const query = new URL(urlStr, `http://${req.headers.host || 'localhost'}`).searchParams;
    const targetUrl = query.get('url');
    const rawName = query.get('name') || 'download';

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
    res.status(200).send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    res.statusCode = 500;
    res.end(`Error: ${err?.message || String(err)}`);
  }
}
