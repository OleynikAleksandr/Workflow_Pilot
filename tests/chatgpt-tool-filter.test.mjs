import test from 'node:test';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';
import {toolFilterScript} from '../src/chatgpt-tool-filter.mjs';
const setup = html => new JSDOM(html,{runScripts:'outside-only',pretendToBeVisual:true});
test('new activity is hidden and restored without hiding answer, user content or permission controls',()=>{
 const d=setup(`<div class="group/activity-header" id="activity" style="display:inline-flex"><button aria-expanded="false" aria-labelledby="label"></button><span id="label">Прочитан файл</span><svg></svg></div>
 <div data-markdown-text-style="assistant-message" id="answer">Готовый ответ</div>
 <div class="group/activity-header" id="permission"><button>Разрешить</button></div>
 <div class="group/activity-header" id="file"><a href="/file">Документ</a></div>
 <div data-user-message-bubble><button id="user">called tool</button></div>`);
 d.window.eval(toolFilterScript(true));const q=id=>d.window.document.getElementById(id);
 assert.equal(q('activity').style.display,'none');for(const id of ['answer','permission','file','user'])assert.notEqual(q(id).style.display,'none');
 d.window.eval(toolFilterScript(false));assert.equal(q('activity').style.display,'inline-flex');d.window.__webPilotToolCallFilter?.disconnect();d.window.close();
});
test('legacy footprint preserves mixed answer and repeated passes do not trigger follow again',()=>{
 const d=setup('<article data-message-author-role="assistant"><p id="answer">Ответ</p><div id="row"><button>Получен ответ приложения</button></div></article>');
 let refresh=0;d.window.__webPilotConversationAutoScroll={refresh:()=>refresh++};d.window.eval(toolFilterScript(true));
 assert.equal(d.window.document.getElementById('row').style.display,'none');assert.notEqual(d.window.document.querySelector('article').style.display,'none');
 const before=refresh;d.window.__webPilotToolCallFilter.apply();assert.equal(refresh,before);d.window.__webPilotToolCallFilter?.disconnect();d.window.close();
});
test('streaming service row gets hidden after insertion; disabling disconnects observer',async()=>{
 const d=setup('<main></main>');d.window.eval(toolFilterScript(true));
 const e=d.window.document.createElement('div');e.className='group/activity-header';e.textContent='Чтение файла';d.window.document.querySelector('main').append(e);
 await new Promise(r=>d.window.setTimeout(r,40));assert.equal(e.style.display,'none');d.window.eval(toolFilterScript(false));
 e.textContent='Прочитан файл';await new Promise(r=>d.window.setTimeout(r,40));assert.notEqual(e.style.display,'none');d.window.__webPilotToolCallFilter?.disconnect();d.window.close();
});
