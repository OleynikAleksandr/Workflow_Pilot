import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { makeProbeFiles, probeScript } from '../scripts/probe-chatgpt-file-paste.mjs';

test('live probe generates seven UTF-8 files of exactly 28000 bytes with intact markers', async () => {
  const files=makeProbeFiles();
  assert.equal(files.length,7);
  assert.equal(files.reduce((total,file)=>total+file.size,0),196000);
  for(const [index,file] of files.entries()) {
    const number=index+1,label=String(number).padStart(2,'0');
    const bytes=new Uint8Array(await file.arrayBuffer());
    const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
    assert.equal(bytes.length,28000);
    assert.equal(file.name,'wp-file-probe-'+label+'.md');
    assert.match(text,new RegExp('P'+label+'_START='+(number*100+1)));
    assert.match(text,new RegExp('P'+label+'_MID='+(number*100+2)));
    assert.ok(text.endsWith('P'+label+'_END='+(number*100+3)+'\n'));
  }
});

function page(url='https://chatgpt.com/') {
  const dom=new JSDOM('<form><div id="prompt-textarea" contenteditable="true"></div><button data-testid="send-button">Send</button></form>',{url,runScripts:'outside-only'});
  dom.window.HTMLElement.prototype.getClientRects=function(){return [{width:100,height:40}];};
  Object.assign(dom.window,{TextEncoder,File});
  dom.window.console={log(){},table(){}};
  dom.window.DataTransfer=class {
    constructor(){this.files=[];this.items={add:file=>this.files.push(file)};}
  };
  dom.window.ClipboardEvent=class extends dom.window.Event {
    constructor(type,options){super(type,options);this.clipboardData=options.clipboardData;}
  };
  return dom;
}

test('synthetic paste has seven File items and never clicks Send or retries', () => {
  const dom=page(),editor=dom.window.document.querySelector('#prompt-textarea');
  let pastes=0,sends=0;
  editor.addEventListener('paste',event=>{
    pastes++;
    assert.equal(event.clipboardData.files.length,7);
    assert.ok(event.clipboardData.files.every(file=>file.size===28000));
    event.preventDefault();
  });
  dom.window.document.querySelector('button').addEventListener('click',()=>sends++);
  const report=dom.window.eval(probeScript());
  assert.equal(report.stage,'PASTE_DISPATCHED_NOT_UPLOAD_CONFIRMED');
  assert.equal(report.pasteHandled,true);
  assert.equal(report.sendClicked,false);
  assert.equal(sends,0);
  assert.throws(()=>dom.window.eval(probeScript()),/PROBE_ALREADY_ATTEMPTED/);
  assert.equal(pastes,1);
  dom.window.close();
});

test('unhandled paste is not presented as successful upload', () => {
  const dom=page();
  const report=dom.window.eval(probeScript());
  assert.equal(report.pasteHandled,false);
  assert.equal(report.stage,'PASTE_DISPATCHED_NOT_UPLOAD_CONFIRMED');
  assert.throws(()=>dom.window.eval(probeScript()),/PROBE_ALREADY_ATTEMPTED/);
  dom.window.close();
});

test('probe preserves an existing draft and refuses an existing conversation', () => {
  const dom=page(),editor=dom.window.document.querySelector('#prompt-textarea');
  editor.textContent='User draft';
  assert.throws(()=>dom.window.eval(probeScript()),/DRAFT_NOT_EMPTY/);
  assert.equal(editor.textContent,'User draft');
  dom.window.close();
  const conversation=page('https://chatgpt.com/c/existing');
  assert.throws(()=>conversation.window.eval(probeScript()),/OPEN_NEW_EMPTY_CHAT/);
  conversation.window.close();
});
