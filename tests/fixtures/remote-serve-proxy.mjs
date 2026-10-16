import http from 'node:http';

// Test stand-in for Tailscale Serve: an HTTPS-terminating reverse proxy that
// removes client-supplied identity headers and sets its own, keeps the public
// Host and adds X-Forwarded-*. Streaming responses (SSE) pass unbuffered.
export const IDENTITY_HEADERS = ['tailscale-user-login', 'tailscale-user-name', 'tailscale-user-profile-pic'];

export async function startServeProxy({ targetPort, login = 'owner@example.com', host = 'mac.tailnet-fixture.ts.net' }) {
  const server = http.createServer((req, res) => {
    const headers = { ...req.headers };
    for (const name of IDENTITY_HEADERS) delete headers[name];
    if (login) Object.assign(headers, { 'tailscale-user-login': login, 'tailscale-user-name': 'Owner' });
    Object.assign(headers, { host, 'x-forwarded-host': host, 'x-forwarded-proto': 'https', 'x-forwarded-for': '100.64.0.2' });
    if (headers.origin === `http://127.0.0.1:${server.address().port}`) headers.origin = `https://${host}`;
    const upstream = http.request({ host: '127.0.0.1', port: targetPort, method: req.method, path: req.url, headers }, response => {
      res.writeHead(response.statusCode, response.headers);
      response.pipe(res);
      // A stream the backend closes is closed for the client too.
      response.on('close', () => { if (!res.writableEnded) res.destroy(); });
    });
    upstream.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end(); });
    req.pipe(upstream);
    res.on('close', () => upstream.destroy());
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return Object.freeze({ port: server.address().port, host, origin: `https://${host}`,
    close: () => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }) });
}
