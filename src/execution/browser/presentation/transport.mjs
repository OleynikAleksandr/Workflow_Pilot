import { BACKEND_LIMITS, protocolError } from '../../../contracts/backend.mjs';
import { validateBrowserInput, verifyInputTarget } from '../../../contracts/browser-presentation.mjs';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const uuid = value => typeof value === 'string' && /^[0-9a-f-]{36}$/.test(value);
const TRANSFER_ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
const MAX_DROP_FILES = 10;
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
// context.clientId (remote device): viewers belong to the device that created
// them, and input, paste, viewport and files need that device to hold the lease.
export function createPresentationRoutes({ host, transfers, leaseGeneration, leaseHolder = () => null }) {
  const sequences = new Map();
  const viewerOwners = new Map();
  const inputOwners = new Map();
  let lastLease = leaseGeneration();
  const viewer = (id, context = {}) => {
    if (!uuid(id)) throw notFound();
    if (context.clientId && viewerOwners.get(id) !== context.clientId) throw notFound();
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
  const requireLease = (value, context = {}) => {
    if (context.clientId && leaseHolder() !== context.clientId) throw protocolError('BACKEND_LEASE_STALE', 'Право управления у другого окна.');
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
    sequences.delete(viewerId); viewerOwners.delete(viewerId);
    return host.detachViewer(viewerId);
  };
  // A revoked device loses every viewer it created.
  const detachClient = async clientId => {
    for (const [viewerId, owner] of [...viewerOwners]) if (owner === clientId) await detach(viewerId);
  };
  async function route(req, res, url, requestContext = {}) {
    const path = url.pathname;
    if (!path.startsWith('/v1/browser/')) return false;
    const context = requestContext;
    const viewerOf = id => viewer(id, context), leaseOf = value => requireLease(value, context);
    await syncLease();
    if (req.method === 'GET' && path === '/v1/browser/pages') return json(res, 200, { pages: host.pages() });
    if (req.method === 'POST' && path === '/v1/browser/viewers') {
      const body = exact(await readBody(req), ['browserSessionId']);
      const presentation = host.presentation(body.browserSessionId);
      if (!presentation) throw notFound();
      const viewerId = host.attachViewer(body.browserSessionId);
      sequences.set(viewerId, 0); viewerOwners.set(viewerId, context.clientId ?? null);
      return json(res, 200, { viewerId, browserSessionId: presentation.browserSessionId, documentGeneration: presentation.documentGeneration });
    }
    let match = path.match(/^\/v1\/browser\/viewers\/([0-9a-f-]{36})$/);
    if (req.method === 'DELETE' && match) { viewerOf(match[1]); return json(res, 200, { detached: await detach(match[1]) }); }
    if (req.method === 'GET' && path === '/v1/browser/frame') {
      const presentation = viewerOf(url.searchParams.get('viewer'));
      const after = url.searchParams.get('after');
      if (after !== null && !/^\d{1,15}$/.test(after)) throw protocolError('BROWSER_PRESENTATION_INVALID');
      const format = url.searchParams.get('format') === 'jpeg' ? 'jpeg' : 'png';
      const quality = Number(url.searchParams.get('quality') ?? 70), maxScale = Number(url.searchParams.get('maxScale') ?? 0);
      if (!Number.isFinite(quality) || quality < 30 || quality > 95 || !Number.isFinite(maxScale) || maxScale < 0 || maxScale > 5)
        throw protocolError('BROWSER_PRESENTATION_INVALID');
      const frame = await presentation.frame({ after: after === null ? null : Number(after), waitMs: after === null ? 0 : 1000,
        format, quality, maxScale: maxScale || null });
      if (!frame) { res.writeHead(204, { 'cache-control': 'no-store' }); return res.end(); }
      res.writeHead(200, { 'content-type': frame.mime ?? 'image/png', 'content-length': frame.png.length, 'cache-control': 'no-store',
        'x-browser-frame': JSON.stringify(frame.meta) });
      return res.end(frame.png);
    }
    if (req.method === 'POST' && path === '/v1/browser/input') {
      const body = exact(await readBody(req), ['viewerId', 'input']);
      const presentation = viewerOf(body.viewerId), input = validateBrowserInput(body.input);
      if (context.clientId && leaseHolder() !== context.clientId) throw protocolError('BACKEND_LEASE_STALE', 'Право управления у другого окна.');
      verifyInputTarget(input, { browserSessionId: presentation.browserSessionId, documentGeneration: presentation.documentGeneration,
        leaseGeneration: leaseGeneration(), lastSequence: sequences.get(body.viewerId) ?? 0 });
      sequences.set(body.viewerId, input.sequence);
      inputOwners.set(presentation.browserSessionId, body.viewerId);
      await presentation.dispatch(input);
      return json(res, 200, { accepted: input.sequence });
    }
    if (req.method === 'POST' && path === '/v1/browser/viewport') {
      const body = exact(await readBody(req), ['viewerId', 'width', 'height', 'leaseGeneration']);
      leaseOf(body.leaseGeneration);
      if (![body.width, body.height].every(value => Number.isSafeInteger(value) && value >= 320 && value <= 4096))
        throw protocolError('BROWSER_PRESENTATION_INVALID');
      viewerOf(body.viewerId).setViewport(body.width, body.height);
      return json(res, 200, { width: body.width, height: body.height });
    }
    if (req.method === 'POST' && path === '/v1/browser/clipboard/selection') {
      const body = exact(await readBody(req), ['viewerId']);
      return json(res, 200, { text: await viewerOf(body.viewerId).selection() });
    }
    if (req.method === 'POST' && path === '/v1/browser/clipboard/paste') {
      const body = exact(await readBody(req), ['viewerId', 'text', 'leaseGeneration']);
      leaseOf(body.leaseGeneration);
      if (typeof body.text !== 'string' || !body.text.length || body.text.length > 60 * 1024) throw protocolError('BROWSER_PRESENTATION_INVALID');
      await viewerOf(body.viewerId).paste(body.text);
      return json(res, 200, { pasted: body.text.length });
    }
    if (req.method === 'POST' && path === '/v1/browser/transfers') {
      const body = exact(await readBody(req), ['transfer', 'leaseGeneration']);
      leaseOf(body.leaseGeneration);
      return json(res, 200, transfers.startUpload(body.transfer));
    }
    match = path.match(/^\/v1\/browser\/transfers\/([A-Za-z0-9][A-Za-z0-9_.:-]{0,127})$/);
    if (req.method === 'PUT' && match) {
      const offset = url.searchParams.get('offset');
      if (offset === null || !/^\d{1,12}$/.test(offset)) throw protocolError('BACKEND_TRANSFER_INVALID');
      if (context.clientId && leaseHolder() !== context.clientId) throw protocolError('BACKEND_LEASE_STALE', 'Право управления у другого окна.');
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
      leaseOf(body.leaseGeneration);
      if (!uuid(body.chooserId)) throw protocolError('BROWSER_PRESENTATION_INVALID');
      const presentation = viewerOf(body.viewerId), file = transfers.finishUpload(match[1]);
      // Only a completely received file is attached to the page's own chooser.
      await presentation.setFiles(body.chooserId, [file]);
      return json(res, 200, { attached: true });
    }
    if (req.method === 'POST' && path === '/v1/browser/drop') {
      const body = exact(await readBody(req), ['viewerId', 'transferIds', 'x', 'y', 'leaseGeneration']);
      leaseOf(body.leaseGeneration);
      if (!Array.isArray(body.transferIds) || !body.transferIds.length || body.transferIds.length > MAX_DROP_FILES
        || !body.transferIds.every(id => typeof id === 'string' && TRANSFER_ID.test(id)) || new Set(body.transferIds).size !== body.transferIds.length
        || ![body.x, body.y].every(value => Number.isFinite(value) && value >= 0 && value <= 100000))
        throw protocolError('BROWSER_PRESENTATION_INVALID');
      // Every file must be completely received before the page sees the drop.
      const presentation = viewerOf(body.viewerId), files = body.transferIds.map(id => transfers.finishUpload(id));
      await presentation.drop(files, { x: body.x, y: body.y });
      return json(res, 200, { dropped: files.length });
    }
    if (req.method === 'POST' && path === '/v1/browser/choosers/cancel') {
      const body = exact(await readBody(req), ['viewerId', 'chooserId', 'leaseGeneration']);
      leaseOf(body.leaseGeneration);
      viewerOf(body.viewerId).cancelChooser(body.chooserId);
      return json(res, 200, { cancelled: true });
    }
    throw protocolError('BACKEND_ROUTE_NOT_FOUND');
  }
  return Object.freeze({ route, leaseChanged: syncLease, detach, detachClient });
}
