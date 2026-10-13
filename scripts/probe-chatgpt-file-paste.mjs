import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chatGPTDOMScript } from '../src/chatgpt-dom.mjs';

// Shared verbatim by Node checks and the generated browser-console probe.
export function makeProbeFiles() {
  const encoder = new TextEncoder();
  const bytes = text => encoder.encode(text).length;
  const fill = size => {
    const line = 'Это нейтральный русский текст для проверки доставки файла.\n';
    const count = Math.floor(size / bytes(line));
    return line.repeat(count) + ' '.repeat(size - count * bytes(line));
  };
  return Array.from({length:7}, (_,index) => {
    const number = index+1, label = String(number).padStart(2,'0');
    const start = '# Проверка вложения ' + label + '\nP' + label + '_START=' + (number*100+1) + '\n';
    const middle = '\nP' + label + '_MID=' + (number*100+2) + '\n';
    const end = '\nP' + label + '_END=' + (number*100+3) + '\n';
    const text = start + fill(14000-bytes(start)) + middle + fill(14000-bytes(middle+end)) + end;
    const file = new File([text], 'wp-file-probe-'+label+'.md', {type:'text/markdown',lastModified:0});
    if(file.size!==28000) throw new Error('PROBE_SIZE_MISMATCH');
    return file;
  });
}

// User runs this in a new empty ChatGPT page; no Send, API calls or account access.
export function pasteProbe(dom, makeFiles) {
  if(location.protocol!=='https:' || location.hostname!=='chatgpt.com') throw new Error('OPEN_CHATGPT_FIRST');
  if(!['/','/work','/work/'].includes(location.pathname) || dom.messages('user').length) throw new Error('OPEN_NEW_EMPTY_CHAT');
  const editor=dom.editor();
  if(!editor || editor.disabled || editor.readOnly || editor.getAttribute('contenteditable')==='false') throw new Error('EDITOR_NOT_READY');
  if(dom.busy() || dom.connectionError()) throw new Error('CHAT_NOT_READY');
  if((editor.value ?? editor.innerText ?? editor.textContent ?? '').trim()) throw new Error('DRAFT_NOT_EMPTY');
  const once=Symbol.for('web-pilot-file-paste-probe');
  if(globalThis[once]) throw new Error('PROBE_ALREADY_ATTEMPTED');
  if([...document.querySelectorAll('input[type="file"]')].some(input=>input.files?.length)) throw new Error('ATTACHMENTS_ALREADY_PRESENT');
  const files=makeFiles(), data=new DataTransfer();
  for(const file of files) data.items.add(file);
  if(data.files.length!==7 || [...data.files].some(file=>file.size!==28000)) throw new Error('DATA_TRANSFER_MISMATCH');
  const event=new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true});
  globalThis[once]={attempted:true}; // Never repeat automatically after an uncertain outcome.
  editor.focus();
  editor.dispatchEvent(event);
  const report={stage:'PASTE_DISPATCHED_NOT_UPLOAD_CONFIRMED',pasteHandled:event.defaultPrevented,
    count:files.length,totalBytes:files.reduce((total,file)=>total+file.size,0),
    files:files.map(file=>({name:file.name,bytes:file.size})),sendClicked:false};
  console.table(report.files);
  console.log(JSON.stringify(report));
  console.log('Проверьте все 7 карточек и завершение загрузки. Только после этого вручную отправьте сообщение один раз.');
  return report;
}

export const probeScript = () => '('+pasteProbe.toString()+')('+chatGPTDOMScript()+', '+makeProbeFiles.toString()+');\n';

if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if(process.argv[2]==='--check') {
    const files=makeProbeFiles();
    console.log(JSON.stringify({files:files.map(file=>({name:file.name,bytes:file.size})),
      totalBytes:files.reduce((total,file)=>total+file.size,0)},null,2));
  } else if(process.argv.length===2) process.stdout.write(probeScript());
  else {console.error('Usage: node scripts/probe-chatgpt-file-paste.mjs [--check]');process.exitCode=1;}
}
