import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { autoScrollPageScript, installChatGPTAutoScroll } from '../src/chatgpt-auto-scroll.mjs';

const waitFrames = window => new Promise(resolve => window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve))));

function fixture() {
  const dom = new JSDOM(`<!doctype html><html><body>
    <main id="scroller" style="height:200px;overflow-y:auto">
      <div id="messages"><article data-message-author-role="user">one</article></div>
      <form><div id="prompt-textarea" contenteditable="true" role="textbox"></div><button type="button" data-testid="send-button">Send</button></form>
    </main>
  </body></html>`, { url: 'https://chatgpt.com/c/test', runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;
  const scroller = window.document.getElementById('scroller');
  let scrollHeight = 1000;
  Object.defineProperty(scroller, 'clientHeight', { get: () => 200 });
  Object.defineProperty(scroller, 'scrollHeight', { get: () => scrollHeight });
  scroller.scrollTo = ({ top }) => { scroller.scrollTop = Math.max(0, Math.min(top, scrollHeight - 200)); };
  const mutate = (role = 'assistant', text = 'next') => {
    scrollHeight += 100;
    const message = window.document.createElement('article');
    message.setAttribute('data-message-author-role', role);
    message.textContent = text;
    window.document.getElementById('messages').append(message);
  };
  return { dom, window, scroller, mutate };
}

test('follows new messages while the conversation is at the bottom', async () => {
  const f = fixture();
  f.window.eval(autoScrollPageScript({ forceFollow: true }));
  await waitFrames(f.window);
  assert.equal(f.scroller.scrollTop, 800);
  f.mutate();
  await waitFrames(f.window);
  assert.equal(f.scroller.scrollTop, 900);
  assert.equal(f.window.__webPilotConversationAutoScroll.snapshot().following, true);
});

test('native programmatic scrolling does not trigger a competing corrective scroll', async () => {
  const f = fixture();
  f.window.eval(autoScrollPageScript({ forceFollow: true }));
  await waitFrames(f.window);
  assert.equal(f.scroller.scrollTop, 800);

  f.scroller.scrollTop = 260;
  f.scroller.dispatchEvent(new f.window.Event('scroll'));
  assert.equal(f.window.__webPilotConversationAutoScroll.snapshot().following, true, 'programmatic restore must not look like manual reading');
  await waitFrames(f.window);
  assert.equal(f.scroller.scrollTop, 260, 'scroll events cannot create a scroll feedback loop');
});

test('manual scroll up suspends following until the user returns to the bottom', async () => {
  const f = fixture();
  f.window.eval(autoScrollPageScript({ forceFollow: true }));
  await waitFrames(f.window);
  f.scroller.dispatchEvent(new f.window.WheelEvent('wheel', { bubbles: true, deltaY: -120 }));
  f.scroller.scrollTop = 400;
  f.scroller.dispatchEvent(new f.window.Event('scroll'));
  assert.equal(f.window.__webPilotConversationAutoScroll.snapshot().following, false);
  f.mutate();
  await waitFrames(f.window);
  assert.equal(f.scroller.scrollTop, 400, 'assistant output must not pull the user down');

  f.scroller.scrollTop = 900;
  f.scroller.dispatchEvent(new f.window.Event('scroll'));
  assert.equal(f.window.__webPilotConversationAutoScroll.snapshot().following, true);
  f.mutate();
  await waitFrames(f.window);
  assert.equal(f.scroller.scrollTop, 1000);
});

test('wheel, keyboard, touch and pointer gestures mark a scroll as manual', async () => {
  const gestures = [
    f => f.scroller.dispatchEvent(new f.window.WheelEvent('wheel', { bubbles: true, deltaY: -120 })),
    f => f.window.document.body.dispatchEvent(new f.window.KeyboardEvent('keydown', { bubbles: true, key: 'PageUp' })),
    f => f.scroller.dispatchEvent(new f.window.Event('touchstart', { bubbles: true })),
    f => f.scroller.dispatchEvent(new f.window.Event('pointerdown', { bubbles: true })),
  ];
  for (const gesture of gestures) {
    const f = fixture();
    f.window.eval(autoScrollPageScript({ forceFollow: true }));
    await waitFrames(f.window);
    gesture(f);
    f.scroller.scrollTop = 320;
    f.scroller.dispatchEvent(new f.window.Event('scroll'));
    assert.equal(f.window.__webPilotConversationAutoScroll.snapshot().following, false);
  }
});

test('sending a new prompt resumes following even when history was manually scrolled up', async () => {
  const f = fixture();
  f.window.eval(autoScrollPageScript({ forceFollow: true }));
  await waitFrames(f.window);
  f.scroller.dispatchEvent(new f.window.WheelEvent('wheel', { bubbles: true, deltaY: -120 }));
  f.scroller.scrollTop = 300;
  f.scroller.dispatchEvent(new f.window.Event('scroll'));
  assert.equal(f.window.__webPilotConversationAutoScroll.snapshot().following, false);

  f.window.document.querySelector('[data-testid="send-button"]').dispatchEvent(new f.window.MouseEvent('click', { bubbles: true }));
  await waitFrames(f.window);
  assert.equal(f.window.__webPilotConversationAutoScroll.snapshot().following, true);
  assert.equal(f.scroller.scrollTop, 800);
});

test('reinstall is idempotent and SPA navigation may force a fresh follow', async () => {
  const f = fixture();
  f.window.eval(autoScrollPageScript({ forceFollow: true }));
  await waitFrames(f.window);
  const first = f.window.__webPilotConversationAutoScroll;
  f.scroller.dispatchEvent(new f.window.WheelEvent('wheel', { bubbles: true, deltaY: -120 }));
  f.scroller.scrollTop = 250;
  f.scroller.dispatchEvent(new f.window.Event('scroll'));
  f.window.eval(autoScrollPageScript());
  assert.equal(f.window.__webPilotConversationAutoScroll, first);
  assert.equal(first.snapshot().following, false, 'same route preserves manual reading position');
  f.dom.reconfigure({ url: 'https://chatgpt.com/c/another-session' });
  f.window.eval(autoScrollPageScript());
  await waitFrames(f.window);
  assert.equal(first.snapshot().following, true, 'a different conversation starts in follow mode');
  assert.equal(f.scroller.scrollTop, 800);
});

test('Electron wrapper runs only on chatgpt.com and passes forceFollow', async () => {
  const scripts = [];
  const view = { isDestroyed: () => false, getURL: () => 'https://chatgpt.com/c/test', executeJavaScript: async script => { scripts.push(script); return { installed: true }; } };
  assert.deepEqual(await installChatGPTAutoScroll(view, { forceFollow: true }), { installed: true });
  assert.match(scripts[0], /forceFollow/);
  assert.equal(await installChatGPTAutoScroll({ ...view, getURL: () => 'https://example.com/' }), null);
});


test('reverse layout follows zero, respects negative manual position, and does not strobe', async () => {
  const f = fixture(); f.scroller.style.flexDirection = 'column-reverse';
  let writes = 0;
  f.scroller.scrollTo = ({top}) => { writes++; f.scroller.scrollTop = Math.min(0, Math.max(-2000, top)); f.scroller.dispatchEvent(new f.window.Event('scroll')); };
  f.scroller.scrollTop = -500;
  f.window.eval(autoScrollPageScript({forceFollow:true})); await waitFrames(f.window);
  assert.equal(f.scroller.scrollTop,0); assert.equal(writes,1); assert.equal(f.window.__webPilotConversationAutoScroll.snapshot().atBottom,true);
  for(let i=0;i<20;i++) f.mutate(); await waitFrames(f.window);
  assert.equal(writes,1,'mutations at the reverse bottom must not generate more scroll writes');
  // Wheel pauses before the next frame, even if the native scroll event has not fired yet.
  f.mutate();f.scroller.dispatchEvent(new f.window.WheelEvent('wheel',{bubbles:true,deltaY:-100}));f.scroller.scrollTop=-300;
  await waitFrames(f.window);assert.equal(f.scroller.scrollTop,-300);assert.equal(writes,1);
  f.scroller.scrollTop=0;f.scroller.dispatchEvent(new f.window.Event('scroll'));assert.equal(f.window.__webPilotConversationAutoScroll.snapshot().following,true);
  f.window.__webPilotConversationAutoScroll.disconnect();f.window.close();
});
test('disconnect cancels queued scroll frames', async()=>{
 const f=fixture();let writes=0;f.scroller.scrollTo=()=>writes++;
 f.window.eval(autoScrollPageScript({forceFollow:true}));f.window.__webPilotConversationAutoScroll.disconnect();
 await waitFrames(f.window);assert.equal(writes,0);f.window.close();
});
