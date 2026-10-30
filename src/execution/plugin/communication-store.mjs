import fs from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const digest=value=>createHash('sha256').update(value).digest('hex');
const failure=code=>Object.assign(new Error('Журнал связи недоступен. Отправка заблокирована; исходные файлы сохранены.'),{code});
const encode=value=>JSON.stringify(value);
const FILE_LIMIT=512*1024*1024,COMPACT_BYTES=32*1024*1024;
const journal=name=>/^[a-f0-9]{64}\.jsonl$/.test(name);
// Lines are read in chunks: a journal close to FILE_LIMIT must not become one V8 string.
async function* readLines(handle) {
  const chunk=Buffer.alloc(1024*1024);let parts=[],position=0;
  for(;;) {
    const {bytesRead}=await handle.read(chunk,0,chunk.length,position);if(!bytesRead)break;position+=bytesRead;
    const view=chunk.subarray(0,bytesRead);let start=0,end;
    while((end=view.indexOf(10,start))!==-1) {
      parts.push(Buffer.from(view.subarray(start,end)));yield {text:Buffer.concat(parts).toString('utf8'),terminated:true};parts=[];start=end+1;
    }
    if(start<bytesRead)parts.push(Buffer.from(view.subarray(start)));
  }
  if(parts.length)yield {text:Buffer.concat(parts).toString('utf8'),terminated:false};
}
const supportedState=state=>state?.registry_version===undefined&&!state?.mode||state?.registry_version===2&&state.mode==='workflow'
  &&state.enrollments&&typeof state.enrollments==='object'
  &&Object.entries(state.members??{}).every(([id,member])=>id===member.id&&member.target&&['O','E','S'].includes(member.role));

// One fsynced JSONL transaction contains the new state and its contiguous events.
// The WAL is the only source of truth. Because every line repeats the state, a
// journal that outgrows its last snapshot is atomically replaced by one ordinary
// record with the current state and all events, so the file grows linearly and
// released validators still read it.
export async function openCommunicationStore(directory,{files=fs,compactBytes=COMPACT_BYTES}={}) {
  directory=path.resolve(directory);
  let current=path.parse(directory).root;
  for(const part of directory.slice(current.length).split(path.sep)) {
    current=path.join(current,part);
    const stat=await files.lstat(current).catch(e=>{if(e.code!=='ENOENT')throw e;return null;});
    if(stat?.isSymbolicLink()||stat&&!stat.isDirectory())throw failure('PLUGIN_COMMUNICATION_STORE_UNSAFE');
  }
  await files.mkdir(directory,{recursive:true,mode:0o700});
  const records=new Map(),issues=[];
  for(const name of (await files.readdir(directory)).sort()) {
    // An unfinished snapshot never replaced its journal, which stays authoritative.
    if(journal(name.replace(/\.compact$/,''))&&name.endsWith('.compact')){await files.unlink(path.join(directory,name));continue;}
    if(!journal(name))continue;
    const file=path.join(directory,name),stat=await files.lstat(file);
    if(!stat.isFile()||stat.isSymbolicLink()||stat.size>FILE_LIMIT)throw failure('PLUGIN_COMMUNICATION_STORE_UNSAFE');
    let previous=null,seq=0,state=null,events=[],code=null,validBytes=0,base=0;
    const ids=new Set(),handle=await files.open(file,constants.O_RDONLY|(constants.O_NOFOLLOW??0));
    try{for await(const {text:line,terminated} of readLines(handle)) {
      try {
        if(!terminated)throw Error('tail');
        const {checksum,...record}=JSON.parse(line);
        if(!supportedState(record.state)||record.schema_version!==(record.state.registry_version===2?2:1))throw Error('version');
        if(checksum!==digest(encode(record))||record.previous!==previous
          ||!record.state||!record.state.members||!Array.isArray(record.state.messages)||!record.state.probes
          ||!record.state.clientEvents||!record.state.clientSequences||!Array.isArray(record.events)||!record.events.length
          ||digest(record.run_id)+'.jsonl'!==name||record.state.id!==record.run_id)throw Error('record');
        let next=seq;
        for(const event of record.events) {
          if(event.seq!==++next||event.run_id!==record.run_id||typeof event.event_id!=='string'||ids.has(event.event_id))throw Error('sequence');
          ids.add(event.event_id);
        }
        if(record.seq!==next||record.event_id!==record.events.at(-1).event_id)throw Error('sequence');
        if(!validBytes)base=Buffer.byteLength(line+'\n');
        seq=next;previous=checksum;state=record.state;events.push(...record.events);validBytes+=Buffer.byteLength(line+'\n');
      }catch(error){code=error.message==='version'?'PLUGIN_COMMUNICATION_STORE_VERSION':error.message==='tail'?'PLUGIN_COMMUNICATION_STORE_TAIL':'PLUGIN_COMMUNICATION_STORE_CORRUPT';break;}
    }}finally{await handle.close();}
    if(code)issues.push({run_id:state?.id??null,error_code:code,last_seq:seq,valid_bytes:validBytes});
    if(state)records.set(state.id,{state,events,previous,size:stat.size,base});
  }
  let broken=issues.length>0,tail=Promise.resolve();
  async function readContent(ref) {
    if(!/^[a-f0-9]{64}$/.test(ref??''))throw failure('PLUGIN_COMMUNICATION_CONTEXT');
    let handle;
    try {
      const file=path.join(directory,ref+'.context'),before=await files.lstat(file);
      if(!before.isFile()||before.isSymbolicLink())throw Error('unsafe');
      handle=await files.open(file,constants.O_RDONLY|(constants.O_NOFOLLOW??0));
      const stat=await handle.stat();if(!stat.isFile()||stat.size>1048576)throw Error('size');
      const text=await handle.readFile('utf8');if(digest(text)!==ref)throw Error('digest');return text;
    }catch{throw failure('PLUGIN_COMMUNICATION_CONTEXT');}finally{await handle?.close();}
  }
  return Object.freeze({
    readContent,
    async putContent(text) {
      if(typeof text!=='string'||Buffer.byteLength(text)>1048576)throw failure('PLUGIN_COMMUNICATION_CONTEXT');
      if(broken)throw failure('PLUGIN_COMMUNICATION_STORE_BLOCKED');
      const ref=digest(text);let handle;
      try {
        try{handle=await files.open(path.join(directory,ref+'.context'),constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|(constants.O_NOFOLLOW??0),0o600);}
        catch(error){if(error.code!=='EEXIST')throw error;await readContent(ref);return ref;}
        await handle.writeFile(text,'utf8');await handle.sync();await handle.close();handle=null;
        if(process.platform!=='win32'){const dir=await files.open(directory,'r');try{await dir.sync();}finally{await dir.close();}}
        return ref;
      }catch{throw failure('PLUGIN_COMMUNICATION_CONTEXT');}finally{await handle?.close();}
    },
    load:()=>({runs:[...records.values()].map(({state,events})=>structuredClone({...state,events})),issues:structuredClone(issues)}),
    append(state,events) {
      const work=tail.then(async()=>{
        if(broken)throw failure('PLUGIN_COMMUNICATION_STORE_BLOCKED');
        if(!supportedState(state))throw failure('PLUGIN_COMMUNICATION_STORE_VERSION');
        const old=records.get(state.id),seq=old?.events.at(-1)?.seq??0;
        const ids=new Set(old?.events.map(e=>e.event_id)??[]);
        if(!events.length||events.some((e,i)=>{const duplicate=ids.has(e.event_id);ids.add(e.event_id);return duplicate||e.run_id!==state.id||e.seq!==seq+i+1;}))throw failure('PLUGIN_COMMUNICATION_STORE_SEQUENCE');
        const header={schema_version:state.registry_version===2?2:1,run_id:state.id,seq:events.at(-1).seq,event_id:events.at(-1).event_id};
        const encoded=record=>{const checksum=digest(encode(record));return {checksum,line:encode({...record,checksum})+'\n'};};
        let {checksum,line}=encoded({...header,previous:old?.previous??null,events:structuredClone(events),state:structuredClone(state)});
        const file=path.join(directory,digest(state.id)+'.jsonl'),temporary=file+'.compact';let handle,size=(old?.size??0)+Buffer.byteLength(line),base=old?.base??0,compacting=false;
        try {
          if(old&&size>Math.max(compactBytes,4*base)) {
            compacting=true;
            ({checksum,line}=encoded({...header,previous:null,events:[...old.events,...structuredClone(events)],state:structuredClone(state)}));
            size=base=Buffer.byteLength(line);if(size>FILE_LIMIT)throw Error('size');
            const current=await files.lstat(file);
            if(!current.isFile()||current.isSymbolicLink()||current.size!==old.size)throw Error('size');
            handle=await files.open(temporary,constants.O_WRONLY|constants.O_CREAT|constants.O_TRUNC|(constants.O_NOFOLLOW??0),0o600);
            await handle.writeFile(line,'utf8');await handle.sync();await handle.close();handle=null;
            await files.rename(temporary,file);
          }else {
            handle=await files.open(file,constants.O_WRONLY|constants.O_APPEND|constants.O_CREAT|(constants.O_NOFOLLOW??0),0o600);
            const stat=await handle.stat();
            if(!stat.isFile()||stat.size!==(old?.size??0)||size>FILE_LIMIT)throw Error('size');
            if(!old)base=Buffer.byteLength(line);
            await handle.writeFile(line,'utf8');await handle.sync();await handle.close();handle=null;
          }
          if((!old||compacting)&&process.platform!=='win32'){const dir=await files.open(directory,'r');try{await dir.sync();}finally{await dir.close();}}
          records.set(state.id,{state:structuredClone(state),events:[...(old?.events??[]),...structuredClone(events)],previous:checksum,size,base});
        }catch {broken=true;issues.push({run_id:state.id,error_code:'PLUGIN_COMMUNICATION_STORE_WRITE',last_seq:seq});
          if(compacting)await files.unlink(temporary).catch(()=>{});
          throw failure('PLUGIN_COMMUNICATION_STORE_WRITE');
        }finally{await handle?.close().catch(()=>{});}
      });
      tail=work.catch(()=>{});return work;
    },
  });
}
