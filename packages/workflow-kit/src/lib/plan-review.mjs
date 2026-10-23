import fs from 'node:fs';
import path from 'node:path';
import { atomic, check, hash, id, json, safePath, textFile, contextPath, readJSON } from './common.mjs';
import { readPlan } from './plan.mjs';
import { head } from './git.mjs';
import { locked, journal } from './transaction-state.mjs';
import { readConfig, taskChecks } from './validation-rules.mjs';
import { assertPlanningOwner } from './planning-owner.mjs';
import { assertExecutionMode } from './execution-mode.mjs';
import { buildScopePlan, createScope } from './actions.mjs';

import { readReview, reviewDirectory, saveReview, reviewPlanDigest, fingerprint, checkReviewInputs, reviewHistory, sameReviewPair, assertAuthorResponses, finishReviewPublication, REVIEW_ON_PUBLICATION } from './review-state.mjs';
export { REVIEW_STATE, REVIEW_DIRECTORY, readReview, reviewDirectory, saveReview, setReviewEnabled, assertSimpleReview, reviewPlanDigest, fingerprint, checkReviewInputs, reviewHistory, sameReviewPair, assertAuthorResponses, assertReviewPublication, finishReviewPublication, cleanupReview, reviewSummary, REVIEW_ON_PUBLICATION } from './review-state.mjs';
export function respondReview(root, input) {
  return locked(root,()=>{
    const s=readReview(root);
    check(['PREPARED','AUTHOR_PENDING','AGREED','NEEDS_USER'].includes(s.stage), 'REVIEW_NOT_READY', 'Позиция сохраняется после завершённого отзыва; сначала review:status.');
    const history=reviewHistory(root,s), review=history.at(-1);
    check(review && Number.isSafeInteger(input.round) && input.round===review.round,
      'REVIEW_RESPONSE', 'Укажите round последнего успешного отзыва из review:status.');
    check(typeof input.position==='string' && input.position.trim().length>=40
      && ['accept','revise','needs_user'].includes(input.disposition), 'REVIEW_RESPONSE',
    'Нужны содержательная position (что принято/отклонено и почему, решения в spec/критериях) и disposition: accept|revise|needs_user.');
    const dir=reviewDirectory(root,s.run_id);
    check(fingerprint(dir,review.review_file)===review.review_sha256, 'REVIEW_RESPONSE_STALE', 'Отзыв изменён после получения.');
    const file='round-'+review.round+'-author-'+id().slice(0,8)+'.json';
    const content=json({round:review.round,review_file:review.review_file,review_sha256:review.review_sha256,
      plan_digest:review.plan_digest,documents:review.documents,disposition:input.disposition,position:input.position.trim()});
    atomic(safePath(dir,file),content);
    const updated={...review,author_response:{file,sha256:hash(content),disposition:input.disposition}};
    const overridden=s.user_decision?.action==='publish';
    const stage=overridden?s.stage:input.disposition==='needs_user'?'NEEDS_USER'
      :s.stage==='AGREED' && input.disposition==='revise'?'AUTHOR_PENDING'
      :s.stage==='AUTHOR_PENDING' && review.verdict==='approved' && input.disposition==='accept' && sameReviewPair(s,review)?'AGREED':s.stage;
    return {ok:true,...saveReview(root,{...s,stage,review_history:[...history.slice(0,-1),updated],
      error:!overridden && input.disposition==='needs_user'?{code:'REVIEW_DISPUTE',message:'Автор сообщил существенное разногласие. Спросите пользователя.'}:s.error,
      notification_handled:stage==='NEEDS_USER' && s.stage!=='NEEDS_USER'?false:s.notification_handled}),author_file:file};
  });
}
function reviewRecipient(input, old, continuing) {
  const ids=[input.recipient_session_id,input.scope?.session_id].filter(value=>value!=null);
  check(ids.every(value=>typeof value==='string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,180}$/.test(value)),
    'REVIEW_RECIPIENT','Укажите точный Session ID из стартового сообщения Web Pilot.');
  check(new Set(ids).size<=1,'REVIEW_RECIPIENT','recipient_session_id и scope.session_id должны совпадать.');
  check(input.recipient_mode==null || ['webpilot','manual'].includes(input.recipient_mode),
    'REVIEW_RECIPIENT','recipient_mode: webpilot или manual.');
  const manual=input.recipient_mode==='manual' || (input.recipient_mode==null && !ids.length && continuing && old.recipient_mode==='manual');
  check(!manual || !ids.length,'REVIEW_RECIPIENT','Ручной режим без доставки несовместим с Session ID.');
  const recipient_session_id=manual?null:ids[0]??(continuing?old.recipient_session_id:null);
  check(manual || typeof recipient_session_id==='string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,180}$/.test(recipient_session_id),'REVIEW_RECIPIENT',
    'Для Web Pilot нужен recipient_session_id из стартового сообщения (либо совпадающий scope.session_id). Вне Web Pilot явно укажите recipient_mode: manual.');
  const changed=continuing && (old.recipient_session_id??null)!==recipient_session_id;
  check(!changed || typeof input.recipient_change_note==='string' && input.recipient_change_note.trim().length>=10,
    'REVIEW_RECIPIENT','Смена получателя требует recipient_change_note с прямым поручением пользователя о подхвате. Не назначайте выбранный чат автоматически.');
  return {recipient_session_id,recipient_mode:manual?'manual':'webpilot',
    recipient_change:changed?{from:old.recipient_session_id??null,to:recipient_session_id,note:input.recipient_change_note.trim()}
      :continuing?old.recipient_change??null:null};
}
export function prepareReview(root, input) {
  return locked(root, () => {
    check(!journal(root), 'TRANSACTION_PENDING', 'Сначала завершите commit/repair.');
    const old = readReview(root), previous = readPlan(root);
    check(old.enabled, 'REVIEW_DISABLED', 'Review выключен; используйте обычное создание плана.');
    check(previous.execution_scope_status === 'NONE', 'SCOPE_EXISTS', 'Ревью первой версии предназначено только для нового плана из NONE.');
    check(!['RUNNING','PUBLISHING','NEEDS_USER'].includes(old.stage), 'REVIEW_BUSY', 'Сначала завершите запуск или ответьте через review:resolve.');
    const scope = input.scope;
    check(scope?.scope_id && typeof scope.approval_note === 'string' && scope.approval_note.trim().length >= 10,
      'REVIEW_INPUT', 'Нужны scope с явным scope_id и approval_note.');
    check(Array.isArray(input.documents) && input.documents.length > 0, 'REVIEW_INPUT', 'Нужен documents: список рабочих спецификаций docs/planning/*.md.');
    check(new Set(input.documents).size === input.documents.length, 'REVIEW_INPUT', 'Документы повторяются.');
    const candidate = buildScopePlan(root, scope, previous), config = readConfig(root);
    // Fail before any write: a plan that review approves must also start.
    for (const task of candidate.tasks) taskChecks(task, config);
    if (candidate.execution_strategy === 'orchestrated') assertPlanningOwner(root, candidate.execution_origin_session_id, 'execution_origin_session_id');
    // A Workflow Pilot plan is reviewed only in the mode the user chose.
    if (assertExecutionMode(root, candidate)) assertPlanningOwner(root, candidate.execution_origin_session_id, 'execution_origin_session_id');
    const limit = config.budget?.document_bytes ?? 28000;
    const texts = input.documents.map(source => {
      check(/^docs\/planning\/.+\.md$/i.test(source), 'REVIEW_INPUT', 'Спецификация должна находиться в docs/planning.');
      contextPath(root,source);
      check(candidate.approved_scope.documentation_paths.includes(source)
        && candidate.context_pack.documents.some(d => d.path === source && d.required),
      'REVIEW_INPUT', 'Каждая часть спецификации нужна в documentation_paths и required context_pack: ' + source);
      return textFile(root, source, limit);
    });
    const continuing = old.run_id && !['CANCELLED','PUBLISHED','IDLE'].includes(old.stage);
    check(!continuing || old.scope_id === scope.scope_id,'REVIEW_BUSY','Продолжите существующий scope или отмените его через review:cancel.');
    const recipient=reviewRecipient(input,old,continuing);
    // Manual mode only skips the recipient comparison; publication still checks the origin.
    if(recipient.recipient_mode!=='manual')assertPlanningOwner(root,recipient.recipient_session_id,'recipient_session_id');
    const history=continuing?assertAuthorResponses(root,old):[];
    const run_id = continuing ? old.run_id : id();
    const dir = reviewDirectory(root, run_id); fs.mkdirSync(dir, {recursive:true});
    const round = continuing ? old.round ?? 0 : 0;
    const prefix = 'input-' + (round+1) + '-' + id().slice(0,8);
    const scope_file = prefix+'-scope.json', plan_file = prefix+'-plan.json';
    atomic(safePath(dir,scope_file),json(scope)); atomic(safePath(dir,plan_file),json(candidate));
    const documents = input.documents.map((source,i) => {
      const snapshot = prefix+'-spec-'+(i+1)+'.md'; atomic(safePath(dir,snapshot),texts[i]);
      return {source,snapshot,sha256:hash(texts[i]),lf_sha256:hash(texts[i].replace(/\r\n/g,'\n'))};
    });
    // Author records have their own immutable hash/binding and are supplied from history.
    // Do not also freeze a previous response as the next pair's editable input.
    const response_file = typeof input.response === 'string' && input.response.trim() ? prefix+'-changes.txt' : null;
    if (typeof input.response==='string' && input.response.trim()) atomic(safePath(dir,response_file),input.response);
    const files = [scope_file,plan_file,...(response_file?[response_file]:[])];
    const s = saveReview(root, {version:1,enabled:old.enabled,generation:old.generation,stage:'PREPARED',run_id,
      scope_id:scope.scope_id,round,claude_session_id:continuing?old.claude_session_id:null,
      ...recipient,
      review_history:history,
      base_head:head(root),base_revision:previous.plan_revision,documents,scope_file,plan_file,response_file,
      error:null,
      plan_digest:reviewPlanDigest(candidate),input_hashes:Object.fromEntries(files.map(f=>[f,hash(fs.readFileSync(safePath(dir,f)))]))});
    return {ok:true,...s,run_directory:dir,next_action:'review:run'};
  });
}
export function resolveReview(root, action, note) {
  return locked(root, () => {
    const s = readReview(root);
    check(s.stage === 'NEEDS_USER', 'REVIEW_RESOLUTION', 'Решение ожидается только в NEEDS_USER.');
    check(['retry','publish','cancel'].includes(action) && typeof note === 'string' && note.trim().length >= 3,
      'REVIEW_RESOLUTION', 'Укажите action retry|publish|cancel и note с решением пользователя.');
    if (action !== 'cancel') checkReviewInputs(root,s);
    const stage = action === 'cancel' ? 'CANCELLED' : action === 'publish' ? 'AGREED' : 'PREPARED';
    return {ok:true,...saveReview(root,{...s,stage,user_decision:{action,note},error:null,notification_handled:false})};
  });
}
export function reviewStatus(root) {
  const s=readReview(root);
  if(s.stage!=='RUNNING' || !Number.isSafeInteger(s.runner_pid) || s.runner_pid<=0)return {ok:true,...s};
  try{process.kill(s.runner_pid,0);return {ok:true,...s};}
  catch(e){
    if(e.code!=='ESRCH')return {ok:true,...s};
    return locked(root,()=>{
      const current=readReview(root);
      if(current.stage!=='RUNNING' || current.launch_id!==s.launch_id)return {ok:true,...current};
      return {ok:true,...saveReview(root,{...current,stage:'NEEDS_USER',runner_pid:null,notification_handled:false,
        error:{code:'REVIEW_INTERRUPTED',message:'Процесс ожидания потерян. Проверьте результат раунда и спросите пользователя; автоматический повтор запрещён.'}})};
    });
  }
}
export function acknowledgeReview(root, runId) {
  return locked(root,()=>{
    const s=readReview(root);
    check(!runId || s.run_id===runId,'REVIEW_CHANGED','Цикл изменился.');
    if(s.stage!=='NEEDS_USER' || s.notification_handled)return {ok:true,...s};
    return {ok:true,...saveReview(root,{...s,notification_handled:true})};
  });
}
export function cancelReview(root, note) {
  return locked(root,()=>{
    const s=readReview(root);
    check(!['RUNNING','PUBLISHING','PUBLISHED'].includes(s.stage),'REVIEW_BUSY','Сначала установите результат текущего запуска/публикации.');
    check(typeof note==='string' && note.trim().length>=3,'REVIEW_RESOLUTION','Укажите решение пользователя.');
    return {ok:true,...saveReview(root,{...s,stage:'CANCELLED',user_decision:{action:'cancel',note}})};
  });
}
// Called by createScope under its lock, not just by the review CLI facade.
export function publishReview(root) {
  let s = readReview(root);
  if(s.stage==='PUBLISHING' && !journal(root) && readPlan(root).execution_scope_status==='NONE') {
    s=locked(root,()=>{
      const latest=readReview(root);checkReviewInputs(root,latest);
      return saveReview(root,{...latest,stage:'AGREED'});
    });
  }
  if (['PUBLISHING','PUBLISHED'].includes(s.stage)) {
    return locked(root,()=>{
      check(!journal(root),'TRANSACTION_PENDING','Сначала status/repair, затем повтор review:publish.');
      const latest=readReview(root), p=readPlan(root);
      check(p.scope_id===latest.scope_id && p.baseline_commit===latest.base_head,'REVIEW_PUBLICATION','Исход публикации не подтверждён.');
      if(latest.stage==='PUBLISHING') {
        check(reviewPlanDigest(p)===latest.plan_digest,'REVIEW_PUBLICATION','План после прерывания отличается от кандидата.');
        finishReviewPublication(root,p,head(root));
      }
      return {ok:true,already_published:true,...readReview(root)};
    });
  }
  check(s.run_id, 'REVIEW_REQUIRED', REVIEW_ON_PUBLICATION);
  const dir=reviewDirectory(root,s.run_id);
  // createScope repeats every check under the operation lock.
  return createScope(root,readJSON(safePath(dir,s.scope_file)),s.base_revision);
}
