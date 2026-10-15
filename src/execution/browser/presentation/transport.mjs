import { BACKEND_LIMITS, protocolError } from '../../../contracts/backend.mjs';
import { validateBrowserInput, verifyInputTarget } from '../../../contracts/browser-presentation.mjs';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const uuid = value => typeof value === 'string' && /^[0-9a-f-]{36}$/.test(value);
const notFound = () => protocolError('BROWSER_PAGE_NOT_FOUND', 'Страница или зритель не найдены.');

function readBody(req, { json = true, limit = BACKEND_LIMITS.messageBytes } = {}) {
  return new Promise((resolve, reject) => {
    const type = req.headers['content-type'] ?? '';
    if (json ? !/^application\/json(;|$)/.test(type) : type !== 'application/octet-stream')
      return reject(protocolError('BACKEND_MESSAGE_INVALID'));
    let size = 0; const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > limit) { req.removeAllListeners('data'); req.resume(); reject(protocolError('BACKEND_MESSAGE_SIZE')); }
      else chunks.push(chunk);
    });
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      if (!json) return resolve(body);
      try { const value = JSON.parse(body.toString('utf8')); if (!object(value)) throw new Error(); resolve(value); }
      catch { reject(protocolError('BACKEND_MESSAGE_INVALID')); }
    });
    req.on('error', reject);
  });
}
const exact = (value, keys) => { if (!Object.keys(value).every(key => keys.includes(key))) throw protocolError('BROWSER_PRESENTATION_INVALID'); return value; };

// Browser presentation over the authenticated loopback API. Observers read
// frames; only the current lease holder sends input, paste, viewport or files.
export function createPresentationRoutes({ host, transfers, leaseGeneration }) {
  const sequences = new Map();
  const inputOwners = new Map();
  let lastLease = leaseGeneration();
  const viewer = id => {
    if (!uuid(id)) throw notFound();
    const presentation = host.viewerPage(id);
    if (!presentation) throw notFound();
    return presentation;
  };
  // A new or lost lease ends the old holder's pressed input on every page.
  const syncLease = async () => {
    const current = leaseGeneration();
    if (current === lastLease) return;
    lastLease = current;
    for (const [browserSessionId] of [...inputOwners]) {
      inputOwners.delete(browserSessionId);
      await host.presentation(browserSessionId)?.release();
    }
  };
  const requireLease = value => {
    const current = leaseGeneration();
    if (current === null || value !== current) throw protocolError('BACKEND_LEASE_STALE', 'Право управления устарело.');
  };
  const json = (res, status, value) => {
    const body = Buffer.from(JSON.stringify(value));
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': body.length, 'cache-control': 'no-store' });
    res.end(body);
  };
  const detach = async viewerId => {
    const presentation = host.viewerPage(viewerId);
    if (presentation && inputOwners.get(presentation.browserSessionId) === viewerId) {
      inputOwners.delete(presentation.browserSessionId);
      await presentation.release();
    }
    sequences.delete(viewerId);
    return host.detachViewer(viewerId);
  };
  async function route(req, res, url) {
    const path = url.pathname;
    if (!path.startsWith('/v1/browser/')) return false;
    await syncLease();
    if (req.method === 'GET' && path === '/v1/browser/pages') return json(res, 200, { pages: host.pages() });
    if (req.method === 'POST' && path === '/v1/browser/viewers') {
      const body = exact(await readBody(req), ['browserSessionId']);
      const presentation = host.presentation(body.browserSessionId);
      if (!presentation) throw notFound();
      const viewerId = host.attachViewer(body.browserSessionId);
      sequences.set(viewerId, 0);
      return json(res, 200, { viewerId, browserSessionId: presentation.browserSessionId, documentGeneration: presentation.documentGeneration });
    }
    let match = path.match(/^\/v1\/browser\/viewers\/([0-9a-f-]{36})$/);
    if (req.method === 'DELETE' && match) return json(res, 200, { detached: await detach(match[1]) });
    if (req.method === 'GET' && path === '/v1/browser/frame') {
      const presentation = viewer(url.searchParams.get('viewer'));
      const after = url.searchParams.get('after');
      if (after !== null && !/^\d{1,15}$/.test(after)) throw protocolError('BROWSER_PRESENTATION_INVALID');
      const frame = await presentation.frame({ after: after === null ? null : Number(after), waitMs: after === null ? 0 : 1000 });
      if (!frame) { res.writeHead(204, { 'cache-control': 'no-store' }); return res.end(); }
      res.writeHead(200, { 'content-type': 'image/png', 'content-length': frame.png.length, 'cache-control': 'no-store',
        'x-browser-frame': JSON.stringify(frame.meta) });
      return res.end(frame.png);
    }
    if (req.method === 'POST' && path === '/v1/browser/input') {
      const body = exact(await readBody(req), ['viewerId', 'input']);
      const presentation = viewer(body.viewerId), input = validateBrowserInput(body.input);
      verifyInputTarget(input, { browserSessionId: presentation.browserSessionId, documentGeneration: presentation.documentGeneration,
        leaseGeneration: leaseGeneration(), lastSequence: sequences.get(body.viewerId) ?? 0 });
      sequences.set(body.viewerId, input.sequence);
      inputOwners.set(presentation.browserSessionId, body.viewerId);
      await presentation.dispatch(input);
      return json(res, 200, { accepted: input.sequence });
    }
    if (req.method === 'POST' && path === '/v1/browser/viewport') {
      const body = exact(await readBody(req), ['viewerId', 'width', 'height', 'leaseGeneration']);
      requireLease(body.leaseGeneration);
      if (![body.width, body.height].every(value => Number.isSafeInteger(value) && value >= 320 && value <= 4096))
        throw protocolError('BROWSER_PRESENTATION_INVALID');
      viewer(body.viewerId).setViewport(body.width, body.height);
      return json(res, 200, { width: body.width, height: body.height });
    }
    if (req.method === 'POST' && path === '/v1/browser/clipboard/selection') {
      const body = exact(await readBody(req), ['viewerId']);
      return json(res, 200, { text: await viewer(body.viewerId).selection() });
    }
    if (req.method === 'POST' && path === '/v1/browser/clipboard/paste') {
      const body = exact(await readBody(req), ['viewerId', 'text', 'leaseGeneration']);
      requireLease(body.leaseGeneration);
      if (typeof body.text !== 'string' || !body.text.length || body.text.length > 60 * 1024) throw protocolError('BROWSER_PRESENTATION_INVALID');
      await viewer(body.viewerId).paste(body.text);
      return json(res, 200, { pasted: body.text.length });
    }
    if (req.method === 'POST' && path === '/v1/browser/transfers') {
      const body = exact(await readBody(req), ['transfer', 'leaseGeneration']);
      requireLease(body.leaseGeneration);
      return json(res, 200, transfers.startUpload(body.transfer));
    }
    match = path.match(/^\/v1\/browser\/transfers\/([A-Za-z0-9][A-Za-z0-9_.:-]{0,127})$/);
    if (req.method === 'PUT' && match) {
      const offset = url.searchParams.get('offset');
      if (offset === null || !/^\d{1,12}$/.test(offset)) throw protocolError('BACKEND_TRANSFER_INVALID');
      const chunk = await readBody(req, { json: false, limit: BACKEND_LIMITS.transferChunkBytes });
      return json(res, 200, transfers.appendUpload(match[1], Number(offset), chunk));
    }
    if (req.method === 'GET' && match) {
      const file = transfers.readDownload(match[1]);
      res.writeHead(200, { 'content-type': 'application/octet-stream', 'content-length': file.size, 'cache-control': 'no-store',
        'x-transfer-name': encodeURIComponent(file.name) });
      file.stream.pipe(res);
      return true;
    }
    if (req.method === 'DELETE' && match) return json(res, 200, { discarded: transfers.discard(match[1]) });
    match = path.match(/^\/v1\/browser\/transfers\/([A-Za-z0-9][A-Za-z0-9_.:-]{0,127})\/attach$/);
    if (req.method === 'POST' && match) {
      const body = exact(await readBody(req), ['viewerId', 'chooserId', 'leaseGeneration']);
      requireLease(body.leaseGeneration);
      if (!uuid(body.chooserId)) throw protocolError('BROWSER_PRESENTATION_INVALID');
      const presentation = viewer(body.viewerId), file = transfers.finishUpload(match[1]);
      // Only a completely received file is attached to the page's own chooser.
      await presentation.setFiles(body.chooserId, [file]);
      return json(res, 200, { attached: true });
    }
    if (req.method === 'POST' && path === '/v1/browser/choosers/cancel') {
      const body = exact(await readBody(req), ['viewerId', 'chooserId', 'leaseGeneration']);
      requireLease(body.leaseGeneration);
      viewer(body.viewerId).cancelChooser(body.chooserId);
      return json(res, 200, { cancelled: true });
    }
    throw protocolError('BACKEND_ROUTE_NOT_FOUND');
  }
  return Object.freeze({ route, leaseChanged: syncLease, detach });
}
