import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { ContextCache } from '../src/context-cache.mjs';
import { readinessContextKey } from '../src/context-inputs.mjs';

function packet(workspace, context = 'полный пакет') {
  return { delivery_protocol: 'inline-context-v1', ack_required: false, status: 'ready', completeness: 'COMPLETE',
    workspace, context, signature: 'signature', head: 'a'.repeat(40), generated_at_ms: 1,
    facts: {project_id:'p',project_name:'Project',plan_revision:1,scope_id:'scope',execution_scope_status:'ACTIVE',
      delivery_status:'IN_PROGRESS',task_id:'T001',task_title:'Task'},
    parts:[{index:1,total:1,text:context,bytes:Buffer.byteLength(context),sha256:createHash('sha256').update(context).digest('hex')}],
    context_bytes:Buffer.byteLength(context),context_sha256:createHash('sha256').update(context).digest('hex') };
}
test('complete packet is reused across sessions and age; input changes rebuild it', async () => {
  let key='a', loads=0;
  const cache=new ContextCache({inputKey:async()=>key,load:async w=>{loads++;return packet(w,key);}});
  const first=await cache.load('/project');assert.equal(first.preparation.cacheHit,false);
  const second=await cache.load('/project');assert.equal(second.preparation.cacheHit,true);
  assert.equal(second.context,first.context);assert.equal(second.generated_at_ms,1);assert.equal(loads,1);
  second.facts.project_name='mutated';
  assert.equal((await cache.load('/project')).facts.project_name,'Project');
  key='b';assert.equal(await cache.isCurrent('/project',first.preparation.inputKey),false);
  assert.equal((await cache.load('/project')).context,'b');assert.equal(loads,2);
  await cache.load('/other');assert.equal(loads,3);
});
test('concurrent callers share one build, bounded entries and clear invalidate', async () => {
  let loads=0, release;
  const cache=new ContextCache({inputKey:async()=> 'key',load:async w=>{loads++;await new Promise(r=>release=r);return packet(w);},limit:2});
  const first=cache.load('/a'),second=cache.load('/a');
  while(!release) await new Promise(r=>setImmediate(r));
  release();await Promise.all([first,second]);assert.equal(loads,1);
  cache.loadPacket=async w=>{loads++;return packet(w);};
  await cache.load('/b');await cache.load('/c');assert.equal(cache.entries.size,2);
  assert.equal(cache.entries.has('/a'),false);
  cache.clear();assert.equal(cache.entries.size,0);
});
test('changing inputs during build are retried; unstable build is never cached',async()=>{
  let key='a', loads=0;
  const cache=new ContextCache({inputKey:async()=>key,load:async w=>{loads++;const p=packet(w,key);if(loads===1) key='b';return p;}});
  assert.equal((await cache.load('/p')).context,'b');assert.equal(loads,2);
  cache.clear();cache.loadPacket=async w=>{key+='x';return packet(w);};
  await assert.rejects(cache.load('/p'),{code:'CONTEXT_CHANGED'});assert.equal(cache.entries.size,0);
});
test('unavailable inputs block warm and foreground instead of falling back to age; corrupt packets fail',async()=>{
  let loads=0;
  const cache=new ContextCache({inputKey:async()=>{throw Error('unavailable');},load:async w=>{loads++;return packet(w);}});
  await cache.warm('/p');assert.equal(loads,0);
  await assert.rejects(cache.load('/p'),{code:'CONTEXT_INPUTS_UNAVAILABLE'});assert.equal(loads,0);
  assert.equal(await cache.isCurrent('/p','key'),false);
  cache.inputKey=async()=> 'key';cache.loadPacket=async w=>({...packet(w),context:'corrupt'});
  await assert.rejects(cache.load('/p'),{code:'MCP_CONTEXT_DAMAGED'});
});

test('sessions of one checkout share one packet and legacy session echo does not route context', async () => {
  let loads=0;
  const cache=new ContextCache({inputKey:async()=> 'identical-revision',load:async w=>{
    loads++;return {...packet(w,'current'),session_id:'legacy-owner',plan_id:'legacy-plan'};
  }});
  const a={workspace:'/project',sessionId:'a'},b={workspace:'/project',sessionId:'b'};
  const [first,second]=await Promise.all([cache.load(a.workspace),cache.load(b.workspace)]);
  assert.equal(first.context,'current');assert.equal(second.context,'current');assert.equal(loads,1);
  assert.equal((await cache.load(b.workspace)).preparation.cacheHit,true);assert.equal(loads,1);
  cache.clear();cache.loadPacket=async w=>({...packet(w,'current'),session_id:'different-legacy-session',plan_id:'historical-plan'});
  assert.equal((await cache.load(a.workspace)).context,'current');
});

test('warm uses one input check on a cache hit and two around a cold build', async () => {
  let keys = 0, loads = 0, clock = 0;
  const cache = new ContextCache({ now: () => clock, inputKey: async () => { keys++; return 'key'; }, load: async w => { loads++; return packet(w); } });
  await cache.warm('/project'); assert.equal(keys, 2); assert.equal(loads, 1);
  clock = 6000; keys = 0; await cache.warm('/project'); assert.equal(keys, 1); assert.equal(loads, 1);
});

test('checkout recovery key ignores chat address and rejects failed or foreign readiness', async () => {
  let inputKey = 'all-inputs-a', ready = true, workspace = '/project';
  const setup = { ready: async () => ({ ready, inputKey, workspace }) };
  const a = { workspace: '/project', sessionId: 'a' }, b = { workspace: '/project', sessionId: 'b' };
  const key = await readinessContextKey(setup, a.workspace);
  assert.equal(key, await readinessContextKey(setup, b.workspace));
  inputKey = 'changed-hooks-config-or-required-document';
  assert.notEqual(key, await readinessContextKey(setup, a.workspace));
  ready = false; await assert.rejects(readinessContextKey(setup, a.workspace), { code: 'CONTEXT_INPUTS_UNAVAILABLE' });
  ready = true; workspace = '/other'; await assert.rejects(readinessContextKey(setup, a.workspace), { code: 'CONTEXT_INPUTS_UNAVAILABLE' });
});
test('concurrent warm shares one promise, and a new event retries immediately without a time gate', async () => {
  let release, keys = 0;
  const cache = new ContextCache({ inputKey: async () => { keys++; return 'key'; },
    load: async workspace => { await new Promise(resolve => { release = resolve; }); return packet(workspace); } });
  const a = cache.warm('/project'), b = cache.warm('/project');
  assert.equal(a, b);
  while (!release) await new Promise(resolve => setImmediate(resolve));
  release(); assert.deepEqual(await a, { ok: true }); assert.equal(keys, 2);
  await cache.warm('/project'); assert.equal(keys, 3);
  cache.inputKey = async () => { throw Error('offline'); };
  assert.equal((await cache.warm('/project')).ok, false);
  cache.inputKey = async () => 'key';
  cache.loadPacket = async workspace => packet(workspace);
  assert.deepEqual(await cache.warm('/project'), { ok: true });
});
