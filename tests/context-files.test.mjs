import test from 'node:test';
import assert from 'node:assert/strict';
import {contextFileBundle,requireFileReceipts,contextFilesView,CONTEXT_FILE_LIMIT} from '../src/control/plugin/context-files.mjs';

const id='0b1f9c1e-5d2a-4c3b-9e8f-7a6b5c4d3e2f';
const end=/\n\nWorkflow Pilot receipt: ([a-f0-9]{12})\n$/;
const payloads=bundle=>bundle.files.map(file=>file.text.slice(0,file.text.match(end).index));
const marks=bundle=>bundle.files.map(file=>file.text.match(end)[1]);

test('version 2 keeps every file within 24000 UTF-8 bytes and loses nothing at the byte boundaries',()=>{
  const footer=Buffer.byteLength('\n\nWorkflow Pilot receipt: ')+13;
  for(const size of [CONTEXT_FILE_LIMIT-footer-1,CONTEXT_FILE_LIMIT-footer,CONTEXT_FILE_LIMIT-footer+1,23999,24000,24001]){
    const text='a'.repeat(size),bundle=contextFileBundle(id,text);
    assert.ok(bundle.files.every(file=>file.bytes<=CONTEXT_FILE_LIMIT&&file.bytes===Buffer.byteLength(file.text)),String(size));
    assert.equal(payloads(bundle).join(''),text);
    assert.equal(bundle.files.length,size<=CONTEXT_FILE_LIMIT-footer?1:2,String(size));
  }
});

test('Cyrillic and emoji are never split and the bundle restores the exact text',()=>{
  for(const text of ['я'.repeat(30011),'😀'.repeat(13007),('ж😀'.repeat(4001)+'\n').repeat(9)]){
    const bundle=contextFileBundle(id,text);
    for(const file of bundle.files){
      assert.ok(file.bytes<=CONTEXT_FILE_LIMIT);
      assert.equal(Buffer.from(file.text,'utf8').toString('utf8'),file.text);
      assert.doesNotMatch(file.text,/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/);
    }
    assert.equal(payloads(bundle).join(''),text);
  }
});

test('version 2 prefers a paragraph, then a line, then a character boundary',()=>{
  const paragraphs=contextFileBundle(id,('Абзац поручения с требованием. '.repeat(25)+'\n\n').repeat(80));
  assert.ok(paragraphs.files.length>2);
  for(const part of payloads(paragraphs).slice(0,-1))assert.match(part,/\n\n$/);
  const lines=contextFileBundle(id,('| A01 | Север | 3 | 6 |\n').repeat(3000));
  for(const part of payloads(lines).slice(0,-1))assert.match(part,/\|\n$/);
  const flat='x'.repeat(70000),single=contextFileBundle(id,flat);
  assert.equal(payloads(single).join(''),flat);assert.equal(single.files.length,3);
});

test('the bundle is deterministic, named in order and never exposes markers in its manifest',()=>{
  const text='Задача\n\n'+'контекст '.repeat(9000),a=contextFileBundle(id,text),b=contextFileBundle(id,text);
  assert.deepEqual(a,b);
  assert.deepEqual(a.files.map(file=>file.name),a.files.map((_,i)=>'context-0'+(i+1)+'-of-0'+a.files.length+'.md'));
  const view=contextFilesView({messageId:id,contextRef:'c'.repeat(64),written:{workdir:'/w',directory:'/w/d',
    files:a.files.map(file=>({index:file.index,name:file.name,path:'/w/d/'+file.name,bytes:file.bytes}))}});
  assert.equal(view.count,a.files.length);assert.equal(view.total_bytes,a.files.reduce((s,f)=>s+f.bytes,0));
  for(const mark of marks(a))assert.equal(JSON.stringify(view).includes(mark),false);
  requireFileReceipts({count:a.files.length,digest:a.receiptHash},marks(a));
  assert.throws(()=>requireFileReceipts({count:a.files.length,digest:a.receiptHash,directory:'/w/d'},marks(a).slice(1)),
    error=>error.code==='PLUGIN_COMMUNICATION_INCOMPLETE'&&error.message.includes('/w/d'));
});

test('version 1 reproduces bundles issued by 0.6.9-0.6.10 with the same receipts',()=>{
  // Receipt digests computed by the released 0.6.10 generator for the same inputs.
  const startup=contextFileBundle(id,'Старт 🪟 '.repeat(7000),{startup:true,version:1});
  assert.equal(startup.receiptHash,'6d3bd06fd347680d9e9e07e0736e15ed4610ea86965af7709e974ecf14624d77');assert.equal(startup.files.length,5);
  assert.match(startup.files[0].text,/Прочитай все приложенные файлы по порядку/);
  const task=contextFileBundle(id,('строка задачи\n').repeat(4000),{version:1});
  assert.equal(task.receiptHash,'9117f905be20cd98f367b2062327c4e7cd0a80449929b1539c3263b13402f775');assert.equal(task.files.length,5);
  const current=contextFileBundle(id,'Старт 🪟 '.repeat(7000),{startup:true});
  assert.notEqual(current.receiptHash,startup.receiptHash);assert.match(current.files[0].text,/по одному и по порядку/);
  assert.throws(()=>contextFileBundle(id,'x',{version:3}),{code:'PLUGIN_COMMUNICATION_CONTEXT'});
});
