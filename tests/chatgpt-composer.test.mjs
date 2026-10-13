import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { PageStateSource } from '../src/page-state.mjs';
import { chatGPTDOMScript } from '../src/chatgpt-dom.mjs';
import { installPageObserver } from '../src/chatgpt-page-observer.mjs';
import { ChatGPTComposer, pageOperation, pageScript } from '../src/chatgpt-composer.mjs';

function attachmentFixture({partial=false,uploading=false,renamed=false}={}) {
  const f=fixture(),w=f.dom.window;
  Object.assign(w,{File,TextEncoder});
  w.DataTransfer=class {constructor(){this.files=[];this.items={add:file=>this.files.push(file)};}};
  w.ClipboardEvent=class extends w.Event {constructor(type,options){super(type,options);this.clipboardData=options.clipboardData;}};
  let pastes=0;const received=[];
  f.editor.addEventListener('paste',event=>{
    event.preventDefault();pastes++;received.push(...event.clipboardData.files);
    for(const file of event.clipboardData.files.slice(0,partial?6:7)) {
      const card=f.document.createElement('div'),label=f.document.createElement('span'),remove=f.document.createElement('button');
      label.textContent=renamed?file.name.replace(/\.md$/,'(1).md'):file.name;remove.type='button';remove.setAttribute('aria-label','Remove file');card.append(label,remove);
      if(uploading)card.setAttribute('aria-busy','true');
      f.editor.before(card);
    }
  });
  const request={requestId:'files-request',text:'Start files-request',attachments:Array.from({length:7},(_,i)=>({name:`part-${i+1}.md`,text:'я'.repeat(14000)}))};
  return {...f,request,received,pastes:()=>pastes};
}

test('seven 28000-byte File parts upload before exactly one Send, with exact UTF-8 contents',async()=>{
  const f=attachmentFixture({uploading:true});
  let waits=0;const wait=f.composer.wait;
  f.composer.wait=async ms=>{assert.equal(f.sends(),0);await wait(ms);waits++;for(const card of f.document.querySelectorAll('[aria-busy]'))card.removeAttribute('aria-busy');};
  assert.equal((await f.composer.deliver(f.request)).state,'sent');
  assert.equal(f.pastes(),1);assert.equal(f.sends(),1);assert.equal(f.received.length,7);assert(waits>0);
  for(const file of f.received){assert.equal(file.size,28000);assert.equal(await file.text(),'я'.repeat(14000));}
  assert.equal((await f.composer.deliver(f.request)).state,'sent');assert.equal(f.pastes(),1);assert.equal(f.sends(),1);
});

test('partial or failed upload never sends, repastes, or loses the prepared files',async()=>{
  for(const partial of [true,false]) {
    const f=attachmentFixture({partial});
    const execute=f.view.executeJavaScript;
    f.view.executeJavaScript=async script=>{const value=await execute(script);if(!partial&&value.action==='attachments-dispatched')f.document.querySelector('form > div').setAttribute('data-state','error');return value;};
    const code=partial?'ATTACHMENTS_PENDING':'ATTACHMENTS_FAILED';
    await assert.rejects(f.composer.deliver(f.request),{code});
    await assert.rejects(f.composer.deliver(f.request),{code});
    assert.equal(f.sends(),0);assert.equal(f.pastes(),1);assert.equal(f.received.length,7);
    assert.equal(f.editor.value,f.request.text);assert.equal(f.request.attachments.length,7);
  }
});

// ChatGPT renames an upload whose name it has seen before; such a card is not ours, so nothing is sent.
test('a card renamed by ChatGPT is not recognised and never sent',async()=>{
  const f=attachmentFixture({renamed:true});
  await assert.rejects(f.composer.deliver(f.request),{code:'ATTACHMENTS_PENDING'});
  assert.equal(f.sends(),0);assert.equal(f.pastes(),1);
  f.dom.window.close();
});

for (const outcome of ['ready', 'pending', 'failed']) test('attachment deadline with fake clock: '+outcome, async()=>{
  const f=attachmentFixture({uploading:true}), records=[];
  let time=0;
  const pageState={version:0,waitForChange:async(version,{timeoutMs})=>{
    assert.equal(f.sends(),0);
    assert.ok(timeoutMs>0 && timeoutMs<=500);
    time+=timeoutMs;
    if(outcome==='ready' && time>=30000)
      for(const card of f.document.querySelectorAll('[aria-busy]'))card.removeAttribute('aria-busy');
    if(outcome==='failed' && time>=1000)f.document.querySelector('form > div').setAttribute('data-state','error');
    return {timeout:true,version};
  }};
  const composer=new ChatGPTComposer(f.view,{now:()=>time,pageState,onDiagnostic:r=>records.push(r),
    wait:()=>{throw Error('Event-driven wait required');}});
  assert.equal(composer.timeoutMs,12000);
  assert.equal(composer.attachmentTimeoutMs,120000);
  if(outcome==='ready') {
    assert.equal((await composer.deliver(f.request)).state,'sent');
    assert.equal(time,30000);assert.equal(f.sends(),1);
    assert.equal((await composer.deliver(f.request)).state,'sent');assert.equal(f.sends(),1);
  } else {
    await assert.rejects(composer.deliver(f.request),{code:outcome==='failed'?'ATTACHMENTS_FAILED':'ATTACHMENTS_PENDING'});
    assert.equal(time,outcome==='failed'?1000:120000);assert.equal(f.sends(),0);
  }
  assert.equal(f.pastes(),1);assert.equal(f.received.length,7);
  const observations=records.filter(r=>r.event==='observation' && r.attachmentsPresent===7);
  assert.ok(observations.some(r=>r.attachmentsReady===false && r.attachmentsFailed===false));
  if(outcome==='ready')assert.ok(observations.some(r=>r.attachmentsReady===true));
  if(outcome==='failed')assert.ok(observations.some(r=>r.attachmentsFailed===true));
  const serialized=JSON.stringify(records);
  for(const file of f.request.attachments){assert.equal(serialized.includes(file.name),false);assert.equal(serialized.includes(file.text),false);}
  assert.equal(serialized.includes(f.request.text),false);
  f.dom.window.close();
});

test('text readiness retains its twelve-second deadline',async()=>{
  const f=fixture();let time=0;
  f.document.querySelector('button').disabled=true;
  const pageState={version:0,waitForChange:async(version,{timeoutMs})=>{
    assert.equal(timeoutMs,12000);time+=timeoutMs;return {timeout:true,version};
  }};
  const composer=new ChatGPTComposer(f.view,{now:()=>time,pageState});
  assert.equal((await composer.deliver(request)).reason,'SEND_UNAVAILABLE');
  assert.equal(time,12000);assert.equal(f.sends(),0);
  f.dom.window.close();
});

test('exception after actual Send is uncertain and never dispatched again',async()=>{
  const f=attachmentFixture(),execute=f.view.executeJavaScript;
  f.view.executeJavaScript=async script=>{const value=await execute(script);if(value.action==='clicked')throw Error('lost renderer reply');return value;};
  assert.equal((await f.composer.deliver(f.request)).state,'unknown');
  assert.equal((await f.composer.deliver(f.request)).state,'unknown');
  assert.equal(f.sends(),1);assert.equal(f.pastes(),1);
});

function fixture({ draft = '', stop = false, emitMessage = true } = {}) {
  const dom = new JSDOM('<!doctype html><form><textarea id="prompt-textarea"></textarea><button data-testid="send-button" type="submit">Send</button></form>',
    { url:'https://chatgpt.com/', runScripts:'outside-only' });
  dom.window.HTMLElement.prototype.getClientRects=function(){return this.style.display==='none'?[]:[{width:100,height:40}];};
  const document=dom.window.document;
  const editor=document.querySelector('textarea'); editor.value=draft;
  if(stop){const button=document.createElement('button');button.dataset.testid='stop-button';document.body.append(button);}
  let sends=0;
  document.querySelector('form').addEventListener('submit',event=>{
    event.preventDefault();sends++;
    if(emitMessage){const user=document.createElement('div');user.setAttribute('data-message-author-role','user');user.textContent=editor.value;document.body.append(user);editor.value='';}
  });
  let time=0;
  const view={getURL:()=>dom.window.location.href,executeJavaScript:async script=>dom.window.eval(script)};
  const composer=new ChatGPTComposer(view,{settleMs:1,timeoutMs:5,attachmentTimeoutMs:5,now:()=>time,wait:async ms=>{time+=ms;}});
  return {dom,document,editor,view,composer,sends:()=>sends};
}
test('Sidebar can import pageOperation and reconstruct the exact pageScript wire format', () => {
  const args = { action: 'inspect', text: 'Контекст\n"Sidebar"', requestId: 'sidebar-contract' };
  assert.equal(typeof pageOperation, 'function');
  assert.equal(pageOperation.name, 'pageOperation');
  assert.equal(pageScript(args), `(${pageOperation})(${JSON.stringify(args)}, ${chatGPTDOMScript()})`);
});

const message='Read project context. Request: opaque-request-123';
const request={text:message,requestId:'opaque-request-123'};

test('inserts and dispatches Send once, after persisting the attempt',async()=>{
  const f=fixture();let persisted=false;
  const result=await f.composer.deliver({...request,onBeforeSend:async()=>{assert.equal(f.sends(),0);persisted=true;}});
  assert.equal(result.state,'sent');assert.equal(persisted,true);assert.equal(f.sends(),1);
  assert.equal((await f.composer.deliver(request)).state,'sent');assert.equal(f.sends(),1);
});

test('active generation defers recovery without clicking',async()=>{
  for(const options of [{stop:true}]){
    const f=fixture(options);const result=await f.composer.deliver(request);
    assert.equal(result.state,'deferred');assert.equal(f.sends(),0);assert.equal(f.editor.value,options.draft??'');
  }
});

test('user additions after insertion are sent immediately with recovery',async()=>{
  const f=fixture();const result=await f.composer.deliver({...request,onBeforeSend:async()=>{f.editor.value+='Новая мысль пользователя';}});
  assert.equal(result.state,'sent');assert.equal(f.sends(),1);
  assert.equal(f.document.querySelector('[data-message-author-role="user"]').textContent,message+'Новая мысль пользователя');
});

test('attachment Send completes immediately without a DOM marker, waiting or duplicate click',async()=>{
  const f=fixture({emitMessage:false});
  f.composer.waitForObservedChange=()=>{throw Error('post-Send wait forbidden');};
  const execute=f.view.executeJavaScript;
  f.view.executeJavaScript=async script=>{
    assert.equal(f.sends(),0,'no DOM reads after Send');
    return execute(script);
  };
  const result=await f.composer.deliver(request);
  assert.equal(result.state,'sent');assert.equal(result.completion,'send-dispatched');assert.equal(f.sends(),1);
  assert.equal((await f.composer.deliver(request)).state,'sent');assert.equal(f.sends(),1);
  assert.equal(f.composer.inFlight,false);
});

test('serializes sends and cancels before mutation when the project changes',async()=>{
  const f=fixture();let resolve;const barrier=new Promise(r=>{resolve=r;});
  const first=f.composer.deliver({...request,onBeforeSend:()=>barrier});
  await assert.rejects(f.composer.deliver(request),{code:'SEND_IN_PROGRESS'});resolve();await first;
  const f2=fixture();assert.equal((await f2.composer.deliver({...request,canContinue:()=>false})).state,'cancelled');assert.equal(f2.editor.value,'');
});

test('only a user-role message is evidence; an assistant quote cannot acknowledge delivery',async()=>{
  const f=fixture();const assistant=f.document.createElement('div');assistant.setAttribute('data-message-author-role','assistant');assistant.textContent=message;f.document.body.append(assistant);
  assert.equal((await f.composer.inspect(request)).messageSeen,false);
  const login=fixture();login.view.getURL=()=> 'https://auth.openai.com/log-in';
  assert.equal((await login.composer.deliver(request)).reason,'LOGIN_REQUIRED');
});

test('normal contenteditable receives text through the visible composer input path',async()=>{
  const f=fixture();const editor=f.document.createElement('div');editor.id='prompt-textarea';editor.setAttribute('contenteditable','true');f.editor.replaceWith(editor);
  f.dom.window.document.execCommand=()=>{throw Error('slow execCommand must not run');};
  installPasteAPI(f);
  editor.addEventListener('paste', event=>{
    event.preventDefault(); editor.textContent=event.clipboardData.getData('text/plain');
    editor.dispatchEvent(new f.dom.window.InputEvent('input',{bubbles:true}));
  });
  f.view.insertText=()=>{throw Error('native insertion must not run');};
  const result=await f.composer.inspect({action:'fill',...request});
  assert.equal(result.action,'filled');assert.equal(editor.textContent,message);
});

test('Chromium paragraph spacing is normalized without accepting changed text or path spaces',()=>{
  const f=fixture();const editor=f.document.createElement('div');editor.id='prompt-textarea';editor.setAttribute('contenteditable','true');f.editor.replaceWith(editor);
  Object.defineProperty(editor,'innerText',{value:'Workspace: /My  Folder\n\nRequest: r-123',configurable:true});
  assert.equal(f.dom.window.eval(pageScript({action:'inspect',text:'Workspace: /My  Folder\nRequest: r-123'})).draftMatches,true);
  assert.equal(f.dom.window.eval(pageScript({action:'inspect',text:'Workspace: /My Folder\nRequest: r-123'})).draftMatches,false);
  assert.equal(f.dom.window.eval(pageScript({action:'inspect',text:'Workspace: /Another\nRequest: r-123'})).draftMatches,false);
});


test('sends a normal user message without a request marker and confirms a new user message', async()=>{
  const f=fixture(); const text='Принимаю текущий план. Закрой scope и оставь NONE.';
  const result=await f.composer.sendUserMessage({text});
  assert.equal(result.state,'sent'); assert.equal(f.sends(),1);
  assert.equal(f.document.querySelector('[data-message-author-role="user"]').textContent,text);
  assert.equal((await f.composer.inspect()).userMessageCount,1);
});

test('normal user message preserves drafts and active generation', async()=>{
  for(const options of [{draft:'Мой черновик'},{stop:true}]){
    const f=fixture(options); const result=await f.composer.sendUserMessage({text:'Принять план'});
    assert.equal(result.state,'deferred'); assert.equal(f.sends(),0);
    assert.equal(f.editor.value,options.draft??'');
    assert.equal(result.reason, options.stop ? 'GENERATION_ACTIVE' : 'DRAFT_PRESENT');
  }
});

test('normal user message does not retry an unobserved click and respects cancellation', async()=>{
  const f=fixture({emitMessage:false}); const result=await f.composer.sendUserMessage({text:'Принять план'});
  assert.equal(result.state,'unknown'); assert.equal(f.sends(),1);
  const f2=fixture(); assert.equal((await f2.composer.sendUserMessage({text:'Принять план',canContinue:()=>false})).state,'cancelled');
  assert.equal(f2.sends(),0); assert.equal(f2.editor.value,'');
});

function nativeMode(f, initial = 'work', fallback = false) {
  const group = f.document.createElement('div');
  group.setAttribute('aria-label', 'Выберите режим чата');
  for (const [mode, value, label] of [['chat', 'chatgpt', 'Чат'], ['work', 'work', 'Работа']]) {
    const button = f.document.createElement('button');
    button.type = 'button'; button.textContent = label;
    if (!fallback) button.setAttribute('data-tpp-toggle-value', value);
    button.setAttribute('data-state', mode === initial ? 'on' : 'off');
    button.addEventListener('click', () => {
      for (const item of group.children) item.setAttribute('data-state', item === button ? 'on' : 'off');
    });
    group.append(button);
  }
  f.document.body.prepend(group);
  return group;
}
test('native mode selection changes Work to Chat before filling and observes confirmation separately', async () => {
  for (const fallback of [false, true]) {
    const f = fixture(); nativeMode(f, 'work', fallback);
    assert.equal((await f.composer.inspect()).experience, 'work');
    assert.equal((await f.composer.inspect({action:'select-experience',expectedExperience:'chat'})).action, 'experience-selecting');
    assert.equal(f.editor.value, ''); assert.equal(f.sends(), 0);
    assert.equal((await f.composer.inspect({action:'select-experience',expectedExperience:'chat'})).action, 'experience-confirmed');
    assert.equal((await f.composer.deliver({...request,expectedExperience:'chat'})).state, 'sent');
    assert.equal(f.sends(), 1);
  }
});
test('missing, disabled, or conflicting native mode controls fail closed without a send', async () => {
  for (const kind of ['missing', 'disabled', 'conflicting']) {
    const f = fixture();
    if (kind !== 'missing') {
      const group = nativeMode(f);
      if (kind === 'disabled') group.children[0].disabled = true;
      else group.children[0].setAttribute('data-state', 'on');
    }
    const result = await f.composer.deliver({...request,expectedExperience:'chat'});
    assert.equal(result.state, 'deferred'); assert.equal(f.sends(), 0); assert.equal(f.editor.value, '');
  }
  const f = fixture({draft:'Мой черновик'}); nativeMode(f);
  assert.equal((await f.composer.inspect({action:'select-experience',expectedExperience:'chat'})).reason, 'DRAFT_PRESENT');
  assert.equal((await f.composer.inspect()).experience, 'work'); assert.equal(f.editor.value, 'Мой черновик');
});
test('switching mode or opening a foreign conversation immediately before Send blocks the click', async () => {
  for (const change of ['mode', 'url']) {
    const f = fixture(); const group = nativeMode(f, 'chat');
    const result = await f.composer.deliver({...request,expectedExperience:'chat',onBeforeSend:async()=>{
      if (change === 'mode') group.children[1].click();
      else f.dom.reconfigure({url:'https://chatgpt.com/c/foreign-chat'});
    }});
    assert.equal(result.state, 'deferred'); assert.equal(f.sends(), 0); assert.equal(f.editor.value, message);
  }
});

test('event-driven composer confirms its marker without using the polling wait', async () => {
  const f = fixture();
  const source = new PageStateSource();
  f.dom.window.reportObservation = message => source.accept(message);
  const dispose = f.dom.window.eval('(' + installPageObserver.toString() + ')(' + chatGPTDOMScript() + ', reportObservation)');
  const composer = new ChatGPTComposer(f.view, { pageState: source, timeoutMs: 100,
    wait: () => { throw Error('Polling wait must not run'); } });
  try {
    assert.equal((await composer.deliver(request)).state, 'sent');
    assert.equal(f.sends(), 1);
    assert.equal((await composer.deliver(request)).state, 'sent');
    assert.equal(f.sends(), 1);
  } finally { dispose(); f.dom.window.close(); }
});

test('event-driven Send waits for late editor readiness instead of assuming a fixed settle delay', async () => {
  const f = fixture(), source = new PageStateSource();
  f.dom.window.reportObservation = message => source.accept(message);
  const dispose = f.dom.window.eval('(' + installPageObserver.toString() + ')(' + chatGPTDOMScript() + ', reportObservation)');
  const button = f.document.querySelector('button'); button.disabled = true;
  const composer = new ChatGPTComposer(f.view, { pageState: source, timeoutMs: 3000,
    wait: () => { throw Error('No polling'); } });
  const ready = setTimeout(() => { button.disabled = false; }, 300);
  try {
    const result = await composer.deliver(request);
    assert.equal(result.state, 'sent'); assert.equal(f.sends(), 1);
  } finally { clearTimeout(ready); dispose(); f.dom.window.close(); }
});

test('event-driven readiness sends changed text without waiting for equality', async () => {
  const f = fixture(), source = new PageStateSource();
  f.dom.window.reportObservation = message => source.accept(message);
  const dispose = f.dom.window.eval('(' + installPageObserver.toString() + ')(' + chatGPTDOMScript() + ', reportObservation)');
  const execute = f.view.executeJavaScript;
  f.view.executeJavaScript = async script => {
    const result = await execute(script);
    if (result.action === 'filled') f.editor.value += 'Текст пользователя';
    return result;
  };
  source.waitForChange=()=>{throw Error('enabled Send must not wait for draft equality');};
  const composer = new ChatGPTComposer(f.view, { pageState: source, timeoutMs: 30 });
  // Keep the test alive; production has its Electron event loop.
  const keepAlive = setTimeout(() => {}, 100);
  try {
    const result = await composer.deliver(request);
    assert.equal(result.state, 'sent'); assert.equal(f.sends(), 1);
    assert.equal(f.document.querySelector('[data-message-author-role="user"]').textContent, message+'Текст пользователя');
  } finally { clearTimeout(keepAlive); dispose(); f.dom.window.close(); }
});

test('explicit new conversation clears textarea through input, never the clipboard or an existing chat', async () => {
  const f = fixture({ draft: 'Контекст архивной сессии' });
  let input = 0; f.editor.addEventListener('input', () => input++);
  f.dom.window.__webPilotObserverDocumentId = 'fresh-document';
  f.view.executeJavaScriptInIsolatedWorld = async (world, scripts) => {
    assert.equal(world, 999); return f.dom.window.eval(scripts[0].code);
  };
  f.composer.pageState = { current: { documentId: 'fresh-document' } };
  assert.equal((await f.composer.clearNewSessionDraft()).action, 'draft-cleared');
  assert.equal(f.editor.value, ''); assert.equal(input, 1); assert.equal(f.sends(), 0);
  f.editor.value = 'Сохранить';
  assert.equal((await f.composer.clearNewSessionDraft({ canContinue: () => false })).reason, 'CHAT_CHANGED');
  assert.equal(f.editor.value, 'Сохранить');
  f.dom.window.__webPilotObserverDocumentId = 'other-document';
  assert.equal((await f.composer.clearNewSessionDraft()).reason, 'CHAT_CHANGED');
  assert.equal(f.editor.value, 'Сохранить');
  f.dom.window.__webPilotObserverDocumentId = 'fresh-document';
  f.dom.reconfigure({ url: 'https://chatgpt.com/c/existing' });
  assert.equal((await f.composer.clearNewSessionDraft()).reason, 'CHAT_CHANGED');
  assert.equal(f.editor.value, 'Сохранить'); f.dom.window.close();
});

test('new conversation clearing preserves active generation and messages at entrypoint', () => {
  for (const kind of ['busy', 'message']) {
    const f = fixture({ draft: 'Сохранить', stop: kind === 'busy' });
    if (kind === 'message') {
      const m = f.document.createElement('article'); m.dataset.messageAuthorRole = 'user';
      m.textContent = 'already sent'; f.document.body.append(m);
    }
    assert.equal(f.dom.window.eval(pageScript({ action: 'clear-new-draft' })).action, 'deferred');
    assert.equal(f.editor.value, 'Сохранить'); f.dom.window.close();
  }
});

test('diagnostics record actual clicks despite user edits without logging text', async () => {
  for (const changed of [false, true]) {
    const f=fixture(), records=[]; f.composer.onDiagnostic=r=>records.push(r);
    const text='PRIVATE_RECOVERY_TEXT /private/two  spaces\nwp-request-trace';
    const result=await f.composer.deliver({text,requestId:'wp-request-trace',
      onBeforeSend:async()=>{if(changed)f.editor.value+='PRIVATE_USER_EDIT';}});
    assert.equal(result.state,'sent');
    assert.equal(records.some(r=>r.outcome==='clicked'),true);
    assert.ok(records.some(r=>r.event==='delivery-result'&&r.state===result.state));
    if(changed)assert.ok(records.some(r=>r.outcome==='clicked'&&r.draftMatches===false));
    for(const value of ['PRIVATE_RECOVERY_TEXT','PRIVATE_USER_EDIT','/private/two'])assert.equal(JSON.stringify(records).includes(value),false);
  }
});
test('whitespace diagnostics are observational and do not block delivery', async () => {
  const f=fixture(),records=[];f.composer.onDiagnostic=r=>records.push(r);
  f.editor.value='Workspace: /My Folder\nwp-request-space';
  const result=await f.composer.deliver({text:'Workspace: /My  Folder\nwp-request-space',requestId:'wp-request-space'});
  assert.equal(result.state,'sent');assert.equal(f.sends(),1);
  const d=records.find(r=>r.diagnostic).diagnostic;
  assert.equal(d.nonWhitespaceMatches,true);assert.equal(d.expectedKind,'space');assert.equal(d.actualKind,'text');
});
test('diagnostics distinguish absent Send and failed before-send validation', async () => {
  const f=fixture(),records=[];f.composer.onDiagnostic=r=>records.push(r);f.document.querySelector('button').remove();
  assert.equal((await f.composer.deliver(request)).reason,'SEND_UNAVAILABLE');
  assert.ok(records.some(r=>r.diagnostic?.button.found===false));assert.equal(records.some(r=>r.action==='send'),false);
  const g=fixture(),errors=[];g.composer.onDiagnostic=r=>errors.push(r);
  await assert.rejects(g.composer.deliver({...request,onBeforeSend:()=>{throw Object.assign(new Error('SECRET exception text'),{code:'CONTEXT_CHANGED_BEFORE_SEND'});}}),{code:'CONTEXT_CHANGED_BEFORE_SEND'});
  assert.equal(g.sends(),0);assert.ok(errors.some(r=>r.event==='delivery-error'&&r.code==='CONTEXT_CHANGED_BEFORE_SEND'));assert.equal(JSON.stringify(errors).includes('SECRET'),false);
});
test('duplicate observations are deduplicated and logger errors never block Send', async () => {
  const f=fixture(),records=[];f.composer.onDiagnostic=r=>records.push(r);
  await f.composer.inspect(request);await f.composer.inspect(request);assert.equal(records.length,1);
  f.composer.onDiagnostic=()=>{throw Error('logger failed');};assert.equal((await f.composer.deliver(request)).state,'sent');
});

test('recovery appends to additions already present at insertion', async () => {
  const f=fixture({draft:'Дополнение пользователя. '});
  assert.equal((await f.composer.deliver(request)).state,'sent');
  assert.equal(f.document.querySelector('[data-message-author-role="user"]').textContent,'Дополнение пользователя. '+message);
});

test('retry after unavailable Send never inserts the packet twice or revalidates it', async () => {
  const f=fixture(); let fills=0, beforeFill=0;
  f.editor.addEventListener('input',()=>fills++);
  const button=f.document.querySelector('button'); button.disabled=true;
  assert.equal((await f.composer.deliver({...request,onBeforeFill:async()=>beforeFill++})).reason,'SEND_UNAVAILABLE');
  assert.equal(f.composer.hasFilled(request.requestId),true);
  f.editor.value+=' Дополнение'; button.disabled=false;
  assert.equal((await f.composer.deliver({...request,onBeforeFill:async()=>{throw Error('already filled');}})).state,'sent');
  assert.equal(fills,1); assert.equal(beforeFill,1); assert.equal(f.sends(),1);
  assert.equal(f.document.querySelector('[data-message-author-role="user"]').textContent,message+' Дополнение');
});

test('document change cancels paste and invalidates the insertion marker', async () => {
  const f=fixture(); const editor=f.document.createElement('div');
  editor.id='prompt-textarea'; editor.setAttribute('contenteditable','true'); f.editor.replaceWith(editor);
  f.composer.pageState={current:{documentId:'first'}};
  let inserts=0; f.view.insertText=async()=>inserts++;
  const execute=f.view.executeJavaScript;
  f.view.executeJavaScript=async script=>{
    const result=await execute(script);
    if(result.action==='paste-ready') f.composer.pageState.current={documentId:'next'};
    return result;
  };
  assert.equal((await f.composer.inspect({action:'fill',...request})).reason,'CHAT_CHANGED');
  assert.equal(inserts,0);
  f.composer.filledRequest={requestId:request.requestId,documentKey:'first'};
  assert.equal(f.composer.hasFilled(request.requestId),false);
});

test('restored exact recovery is reused instead of inserting a second copy', async () => {
  const f=fixture({draft:message}); let fills=0;
  f.editor.addEventListener('input',()=>fills++);
  assert.equal((await f.composer.deliver(request)).state,'sent');
  assert.equal(fills,0); assert.equal(f.sends(),1);
  assert.equal(f.document.querySelector('[data-message-author-role="user"]').textContent,message);
});

// jsdom lacks browser clipboard constructors; this fixture tests event semantics.
// Installed Electron uses real ClipboardEvent/DataTransfer and real ProseMirror.
function installPasteAPI(f) {
  f.dom.window.DataTransfer=class {
    constructor(){this.data=new Map();}
    setData(type,value){this.data.set(type,value);}
    getData(type){return this.data.get(type)||'';}
  };
  f.dom.window.ClipboardEvent=class extends f.dom.window.Event {
    constructor(type,options){super(type,options);this.clipboardData=options.clipboardData;}
  };
}
test('paste provides escaped HTML and unchanged plain text, including empty lines and spaces', async () => {
  const f=fixture(); installPasteAPI(f);
  const editor=f.document.createElement('div');editor.id='prompt-textarea';
  editor.setAttribute('contenteditable','true'); f.editor.replaceWith(editor);
  const text='  A  & <script>alert(1)</script>\n\n\tB\nopaque-request-123\n';
  let pastes=0;
  editor.addEventListener('paste',event=>{
    pastes++;event.preventDefault();
    assert.equal(event.clipboardData.getData('text/plain'),text);
    const doc=new f.dom.window.DOMParser().parseFromString(event.clipboardData.getData('text/html'),'text/html');
    assert.equal(doc.querySelector('script'),null);
    assert.equal(doc.querySelector('p').getAttribute('data-pm-slice'),'0 0 []');
    assert.deepEqual([...doc.querySelectorAll('p')].map(p=>p.textContent),text.split('\n'));
  });
  const observation=await f.composer.inspect({action:'fill',text,requestId:request.requestId});
  assert.equal(observation.insertionMethod,'ClipboardEvent.paste');
  assert.equal(observation.pasteHandled,true); assert.equal(pastes,1);
});
test('unhandled paste is explicit and never falls back to the slow insertion', async () => {
  const f=fixture(); installPasteAPI(f);
  const editor=f.document.createElement('div');editor.id='prompt-textarea';
  editor.setAttribute('contenteditable','true');f.editor.replaceWith(editor);
  f.view.insertText=()=>{throw Error('no slow fallback');};
  await assert.rejects(f.composer.deliver(request),{code:'PASTE_UNHANDLED'});
  assert.equal(f.sends(),0);assert.equal(editor.textContent,'');
});

test('automatic Continue checks plan before click and returns immediately without acknowledgement polling', async () => {
  const f = fixture({ emitMessage: false }); let checks = 0;
  const result = await f.composer.sendUserMessage({ text: 'Продолжай', waitForAcknowledgement: false,
    onBeforeSend: async () => { checks++; return true; } });
  assert.equal(checks, 1); assert.equal(result.state, 'sent'); assert.equal(result.completion, 'send-dispatched');
  assert.equal(f.sends(), 1);
  const cancelled = fixture();
  assert.equal((await cancelled.composer.sendUserMessage({ text: 'Продолжай', onBeforeSend: async () => false })).state, 'cancelled');
  assert.equal(cancelled.sends(), 0);
});

test('cancelled automatic Paste cleans only its owned unchanged draft', async () => {
  for (const changed of [false, true]) {
    const f = fixture();
    const result = await f.composer.sendUserMessage({ text: 'Продолжай', cleanupOnCancel: true,
      onBeforeSend: async () => { if (changed) f.editor.value += ' моя правка'; return false; } });
    assert.equal(result.state, 'cancelled'); assert.equal(f.sends(), 0);
    assert.equal(f.editor.value, changed ? 'Продолжай моя правка' : '');
    f.dom.window.close();
  }
});
test('automatic Send exception after dispatch is unknown and never clears the editor', async () => {
  const f = fixture({ emitMessage: false });
  const execute = f.view.executeJavaScript;
  f.view.executeJavaScript = async script => {
    const result = await execute(script);
    if (result.action === 'clicked') throw Error('connection lost after click');
    return result;
  };
  const result = await f.composer.sendUserMessage({ text: 'Продолжай', cleanupOnCancel: true });
  assert.equal(result.state, 'unknown'); assert.equal(f.sends(), 1);
  assert.equal(f.editor.value, 'Продолжай');
  f.dom.window.close();
});
