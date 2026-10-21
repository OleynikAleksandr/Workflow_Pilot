import fs from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const digest=value=>createHash('sha256').update(value).digest('hex');
const failure=code=>Object.assign(new Error('Журнал связи недоступен. Отправка заблокирована; исходные файлы сохранены.'),{code});
const encode=value=>JSON.stringify(value);
const supportedState=state=>state?.registry_version===undefined&&!state?.mode||state?.registry_version===2&&state.mode==='workflow'
  &&state.enrollments&&typeof state.enrollments==='object'
  &&Object.entries(state.members??{}).every(([id,member])=>id===member.id&&member.target&&['O','E','S'].includes(member.role));

// One fsynced JSONL transaction contains the new state and its contiguous events.
// The WAL, not a separately replaced snapshot, is the only source of truth.
export async function openCommunicationStore(directory,{files=fs}={}) {
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
    if(!/^[a-f0-9]{64}\.jsonl$/.test(name))continue;
    const file=path.join(directory,name),stat=await files.lstat(file);
    if(!stat.isFile()||stat.isSymbolicLink()||stat.size>512*1024*1024)throw failure('PLUGIN_COMMUNICATION_STORE_UNSAFE');
    const text=await files.readFile(file,'utf8'),lines=text.split('\n');
    let previous=null,seq=0,state=null,events=[],code=null,validBytes=0;
    const ids=new Set();
    for(let i=0;i<lines.length;i++) {
      const line=lines[i];if(i===lines.length-1&&line==='')break;
      try {
        if(i===lines.length-1)throw Error('tail');
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
        seq=next;previous=checksum;state=record.state;events.push(...record.events);validBytes+=Buffer.byteLength(line+'\n');
      }catch(error){code=error.message==='version'?'PLUGIN_COMMUNICATION_STORE_VERSION':error.message==='tail'?'PLUGIN_COMMUNICATION_STORE_TAIL':'PLUGIN_COMMUNICATION_STORE_CORRUPT';break;}
    }
    if(code)issues.push({run_id:state?.id??null,error_code:code,last_seq:seq,valid_bytes:validBytes});
    if(state)records.set(state.id,{state,events,previous,size:stat.size});
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
        const record={schema_version:state.registry_version===2?2:1,run_id:state.id,seq:events.at(-1).seq,event_id:events.at(-1).event_id,
          previous:old?.previous??null,events:structuredClone(events),state:structuredClone(state)};
        const checksum=digest(encode(record)),line=encode({...record,checksum})+'\n';
        const file=path.join(directory,digest(state.id)+'.jsonl');let handle;
        try {
          handle=await files.open(file,constants.O_WRONLY|constants.O_APPEND|constants.O_CREAT|(constants.O_NOFOLLOW??0),0o600);
          const stat=await handle.stat();
          if(!stat.isFile()||stat.size!==(old?.size??0)||stat.size+Buffer.byteLength(line)>512*1024*1024)throw Error('size');
          await handle.writeFile(line,'utf8');await handle.sync();await handle.close();handle=null;
          if(!old&&process.platform!=='win32'){const dir=await files.open(directory,'r');try{await dir.sync();}finally{await dir.close();}}
          records.set(state.id,{state:structuredClone(state),events:[...(old?.events??[]),...structuredClone(events)],previous:checksum,
            size:(old?.size??0)+Buffer.byteLength(line)});
        }catch {broken=true;issues.push({run_id:state.id,error_code:'PLUGIN_COMMUNICATION_STORE_WRITE',last_seq:seq});
          throw failure('PLUGIN_COMMUNICATION_STORE_WRITE');
        }finally{await handle?.close().catch(()=>{});}
      });
      tail=work.catch(()=>{});return work;
    },
  });
}
