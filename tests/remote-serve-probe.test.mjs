import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { startServeProxy } from './fixtures/remote-serve-proxy.mjs';

// T001: the properties the remote gateway relies on, as documented for
// Tailscale Serve (identity headers set by Serve, spoofed ones removed,
// streaming responses) and reproduced by the test proxy used by later suites.
test('serve stand-in replaces spoofed identity, keeps the public host and streams events', async t => {
  const seen = [];
  const backend = http.createServer((req, res) => {
    seen.push({ login: req.headers['tailscale-user-login'], host: req.headers.host, forwarded: req.headers['x-forwarded-host'],
      proto: req.headers['x-forwarded-proto'] });
    if (req.url === '/events') {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store' });
      res.write('event: a\ndata: 1\n\n');
      setTimeout(() => { res.write('event: b\ndata: 2\n\n'); res.end(); }, 150);
      return;
    }
    res.end('ok');
  });
  await new Promise(resolve => backend.listen(0, '127.0.0.1', resolve));
  const proxy = await startServeProxy({ targetPort: backend.address().port });
  t.after(async () => { await proxy.close(); backend.close(); });
  await fetch(`http://127.0.0.1:${proxy.port}/`, { headers: { 'tailscale-user-login': 'attacker@example.com' } });
  assert.deepEqual(seen[0], { login: 'owner@example.com', host: proxy.host, forwarded: proxy.host, proto: 'https' },
    'a client cannot choose its identity through Serve');
  // The first event arrives before the stream ends: no buffering of SSE.
  const response = await fetch(`http://127.0.0.1:${proxy.port}/events`);
  const reader = response.body.getReader(), started = Date.now();
  const first = new TextDecoder().decode((await reader.read()).value);
  assert.match(first, /event: a/);assert.ok(Date.now() - started < 140, 'events are streamed, not buffered');
  await reader.cancel();
  // Without Serve (direct loopback) nothing sets the identity: the gateway must not trust a bare header alone.
  const anonymous = await startServeProxy({ targetPort: backend.address().port, login: null });
  t.after(() => anonymous.close());
  await fetch(`http://127.0.0.1:${anonymous.port}/`, { headers: { 'tailscale-user-login': 'attacker@example.com' } });
  assert.equal(seen.at(-1).login, undefined, 'identity headers from the client are always stripped');
});
