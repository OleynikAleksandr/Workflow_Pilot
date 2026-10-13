import fs from 'node:fs';
import path from 'node:path';
import { spawn as nodeSpawn } from 'node:child_process';
import { atomic, check, id, json, safePath, hash } from './common.mjs';
import { readPlan } from './plan.mjs';
import { locked } from './transaction.mjs';
import { readReview, saveReview, reviewDirectory, checkReviewInputs, cleanupReview, reviewHistory, assertAuthorResponses } from './plan-review.mjs';

export const REVIEW_MODEL='claude-opus-5-5';
export const verdictSchema={type:'object',additionalProperties:false,required:['verdict','summary','findings'],properties:{
  verdict:{type:'string',enum:['approved','changes_requested']},summary:{type:'string'},
  findings:{type:'array',items:{type:'object',additionalProperties:false,required:['id','severity','status','reason'],properties:{
    id:{type:'string'},severity:{type:'string',enum:['critical','major','minor']},
    status:{type:'string',enum:['open','resolved','accepted_limitation']},reason:{type:'string'}
  }}}
}};
export function parseVerdict(result) {
  let v=result.structured_output;
  if(!v && typeof result.result==='string') {
    const match=result.result.match(/```json\s*([\s\S]*?)```\s*$/);
    try{v=JSON.parse(match?match[1]:result.result);}catch{ /* Classified below. */ }
  }
  check(v && ['approved','changes_requested'].includes(v.verdict) && typeof v.summary==='string' && v.summary.trim()
    && Array.isArray(v.findings),'REVIEW_FORMAT','Claude не вернул корректный машинный вердикт.');
  const ids=new Set();
  for(const f of v.findings) {
    check(f && typeof f.id==='string' && f.id.trim() && !ids.has(f.id) && ['critical','major','minor'].includes(f.severity)
      && ['open','resolved','accepted_limitation'].includes(f.status) && typeof f.reason==='string' && f.reason.trim(),
    'REVIEW_FORMAT','Некорректное или повторное замечание Claude.');
    ids.add(f.id);
  }
  check(v.verdict!=='approved' || !v.findings.some(f=>['critical','major'].includes(f.severity) && f.status!=='resolved'),
    'REVIEW_FORMAT','Согласие Claude противоречит существенным незакрытым замечаниям.');
  return v;
}
function promptFor(root,s,dir) {
  return [
    'Ты внешний рецензент нового плана проекта. Только чтение; не меняй файлы, не запускай других агентов и не выполняй план.',
    'Прочитай полностью все перечисленные снимки спецификации и нормализованный план, при обрезке продолжи чтение. Сверяй необходимые участки кода проекта.',
    'Проверь соответствие задаче, зависимости, пропуски, проверки и противоречия между спецификацией и задачами. Предлагай минимальные практические исправления.',
    'Свежие решения пользователя в документах имеют приоритет над прошлым контекстом. Память и история сессии разрешены.',
    'Не требуй идеальной изоляции, криптографического арбитра или новой исследовательской программы, если задача этого не требует.',
    'Существенные нерешённые замечания требуют changes_requested. accepted_limitation допускается только для minor.',
    'Дай summary на русском и findings с постоянными id, severity critical|major|minor, status open|resolved|accepted_limitation, reason с доказательством и минимальной правкой.',
    'Если замечаний нет, verdict approved. Ответ только по запрошенной JSON-схеме. SHA вычисляет runner, от тебя это не требуется.',
    'Проект: '+root,'Раунд: '+s.round,
    ...s.documents.map(d=>'Спецификация: '+path.join(dir,d.snapshot)),
    'Нормализованный to-do plan: '+path.join(dir,s.plan_file),
    ...(s.response_file?['Позиция автора / описание изменений: '+path.join(dir,s.response_file)]:[]),
    ...reviewHistory(root,s).filter(r=>r.author_response).map(r=>'Сохранённая позиция раунда '+r.round+': '+path.join(dir,r.author_response.file))
  ].join('\n');
}
export async function runReview(root,{maxTurns=30,timeoutMs=900000}={}, {spawn=nodeSpawn}={}) {
  check(Number.isSafeInteger(maxTurns) && maxTurns>=1 && maxTurns<=100,'REVIEW_LIMIT','max-turns: целое 1–100.');
  check(Number.isSafeInteger(timeoutMs) && timeoutMs>=100 && timeoutMs<=900000,'REVIEW_LIMIT','timeout-ms: 100–900000.');
  const s=locked(root,()=>{
    const old=readReview(root);
    check(old.enabled,'REVIEW_DISABLED','Review выключен; используйте обычную публикацию.');
    check(old.stage==='PREPARED','REVIEW_NOT_READY','Сначала review:status и review:prepare; работающий запуск повторять нельзя.');
    checkReviewInputs(root,old);
    const review_history=assertAuthorResponses(root,old);
    check(old.round<old.max_rounds,'REVIEW_ROUND_LIMIT','Лимит раундов; спросите пользователя о продолжении.');
    return saveReview(root,{...old,review_history,user_decision:null,stage:'RUNNING',round:old.round+1,launch_id:id(),runner_pid:process.pid,
      requested_session_id:old.claude_session_id??old.requested_session_id??id(),started_at:new Date().toISOString(),error:null,notification_handled:false});
  });
  const dir=reviewDirectory(root,s.run_id), prefix='round-'+s.round;
  const request=promptFor(root,s,dir), requestFile=prefix+'-request.txt', resultFile=prefix+'-result.json', stderrFile=prefix+'-stderr.txt';
  const argv=['-p','--model',REVIEW_MODEL,'--effort','high',s.round>1?'--resume':'--session-id',s.requested_session_id,
    '--output-format','json','--json-schema',JSON.stringify(verdictSchema),'--tools','Read,Glob,Grep','--allowedTools','Read,Glob,Grep',
    '--permission-mode','dontAsk','--permission-prompts','none','--strict-mcp-config','--settings','{"disableAllHooks":true}',
    '--disable-slash-commands','--no-chrome','--max-turns',String(maxTurns)];
  const metadata={model:REVIEW_MODEL,effort:'high',argv,launch_id:s.launch_id,started_at:s.started_at,request_sha256:hash(request),input_hashes:s.input_hashes,documents:s.documents};
  const started=Date.now();let exitCode=null, verdict=null, failure=null, result=null, out, err;
  try {
    atomic(safePath(dir,requestFile),request);
    out=fs.openSync(safePath(dir,resultFile),'wx');err=fs.openSync(safePath(dir,stderrFile),'wx');
    const command=process.platform==='win32'?'claude.exe':'claude';
    exitCode=await new Promise((resolve,reject)=>{
      let child,timer,killTimer,timedOut=false;
      const finish=()=>{clearTimeout(timer);clearTimeout(killTimer);};
      try{child=spawn(command,argv,{cwd:root,stdio:['pipe',out,err],windowsHide:true,shell:false});}
      catch(e){reject(e);return;}
      child.once('error',e=>{finish();reject(e);});
      child.once('close',code=>{finish();timedOut?reject(Object.assign(new Error('Claude превысил время ожидания.'),{code:'REVIEW_TIMEOUT'})):resolve(code);});
      child.stdin.on('error',()=>{});
      child.stdin.end(request);
      timer=setTimeout(()=>{timedOut=true;child.kill('SIGTERM');killTimer=setTimeout(()=>child.kill('SIGKILL'),5000);},timeoutMs);
    });
    check(exitCode===0,'REVIEW_CLI_ERROR','Claude завершился с ошибкой. Проверьте stderr раунда, сообщите пользователю и спросите о дальнейшем действии.');
    check(fs.statSync(safePath(dir,resultFile)).size<=32*1024*1024,'REVIEW_OUTPUT','Слишком большой ответ Claude.');
    result=JSON.parse(fs.readFileSync(safePath(dir,resultFile),'utf8'));
    check(result.subtype==='success' && result.is_error===false,'REVIEW_CLI_ERROR','Claude не завершил ревью успешно: '+String(result.subtype));
    check(result.session_id===s.requested_session_id,'REVIEW_SESSION','Claude вернул другой session ID.');
    check(Object.hasOwn(result.modelUsage??{},REVIEW_MODEL),'REVIEW_MODEL','Ответ не подтверждает запрошенную модель.');
    verdict=parseVerdict(result);
    // Structured data is stored as text, not an oversized Markdown context attachment.
    atomic(safePath(dir,prefix+'-review.txt'),json(verdict));
  } catch(e) {failure={code:e.code??'REVIEW_ERROR',message:e.message};}
  finally{if(out!==undefined)fs.closeSync(out);if(err!==undefined)fs.closeSync(err);}
  const finished=locked(root,()=>{
    const latest=readReview(root);
    check(latest.launch_id===s.launch_id && latest.stage==='RUNNING','REVIEW_CHANGED','Состояние запуска изменилось; результат сохранён, не повторяйте вызов.');
    try{if(!latest.published_scope)checkReviewInputs(root,latest);}catch(e){failure={code:e.code??'REVIEW_STALE',message:e.message};}
    const limit=!failure && verdict.verdict!=='approved' && latest.round>=latest.max_rounds;
    const stage=latest.published_scope?'PUBLISHED':failure||limit?'NEEDS_USER':verdict.verdict==='approved'?'AGREED':'AUTHOR_PENDING';
    atomic(safePath(dir,prefix+'-metadata.json'),json({...metadata,exit_code:exitCode,session_id:result?.session_id,models:Object.keys(result?.modelUsage??{}),duration_ms:Date.now()-started,stage,error:failure}));
    return saveReview(root,{...latest,stage,runner_pid:null,claude_session_id:result?.session_id===s.requested_session_id?s.requested_session_id:latest.claude_session_id,
      result_file:resultFile,review_file:verdict?prefix+'-review.txt':null,stderr_file:stderrFile,
      review_history:!failure && verdict?[...s.review_history,{round:s.round,verdict:verdict.verdict,review_file:prefix+'-review.txt',
        review_sha256:hash(fs.readFileSync(safePath(dir,prefix+'-review.txt'))),plan_digest:s.plan_digest,documents:s.documents,author_response:null}]:s.review_history,
      error:failure??(limit?{code:'REVIEW_ROUND_LIMIT',message:'Существенные замечания остались после '+latest.round+' раундов. Спросите пользователя, что делать дальше.'}:null),
      verdict:verdict?.verdict??null,ended_at:new Date().toISOString(),notification_handled:false});
  });
  if(finished.stage==='PUBLISHED')locked(root,()=>cleanupReview(root,readPlan(root)));
  return {ok:true,...finished,run_directory:dir,next_action:finished.stage==='PUBLISHED'?'План опубликован при Review OFF; продолжайте обычный workflow.':finished.stage==='NEEDS_USER'?'Если получен успешный отзыв, сохраните позицию через review:respond. Выполните review:acknowledge, сообщите проблему и спросите пользователя. Не повторяйте запуск автоматически.':'Прочитайте review_file полностью и сохраните позицию через review:respond, включая approved. Согласованная неизменённая пара — review:publish без нового раунда. Исправления и существенные решения внесите в spec/критерии; затем review:prepare и review:run.'};
}
