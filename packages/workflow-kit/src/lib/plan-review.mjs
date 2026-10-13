import fs from 'node:fs';
import path from 'node:path';
import { atomic, check, hash, id, json, safePath, textFile, contextPath, readJSON } from './common.mjs';
import { readPlan } from './plan.mjs';
import { head, git } from './git.mjs';
import { locked } from './transaction.mjs';
import { journal, readConfig } from './validate.mjs';
import { buildScopePlan, createScope } from './actions.mjs';

export const REVIEW_STATE = '.harness/runtime/plan-review/state.json';
export const REVIEW_DIRECTORY = '.harness/runtime/plan-review';
const stages = ['IDLE','PREPARED','RUNNING','AUTHOR_PENDING','AGREED','NEEDS_USER','STALE','CANCELLED','PUBLISHING','PUBLISHED'];
export function readReview(root) {
  const file = safePath(root, REVIEW_STATE);
  if (!fs.existsSync(file)) return { version:1, enabled:false, stage:'IDLE', generation:0, round:0 };
  const s = readJSON(file);
  check(s.version === 1 && typeof s.enabled === 'boolean' && stages.includes(s.stage)
    && Number.isSafeInteger(s.generation), 'REVIEW_STATE', 'Повреждено состояние Review. Не публикуйте план до исправления.');
  if (s.run_id) check(typeof s.run_id==='string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,100}$/.test(s.run_id),'REVIEW_RUN','Некорректный run ID.');
  return s;
}
export function reviewDirectory(root, runId) {
  check(typeof runId === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,100}$/.test(runId), 'REVIEW_RUN', 'Некорректный run ID.');
  return safePath(root, REVIEW_DIRECTORY + '/' + runId);
}
// Call only while holding Kit's short operation lock. The CLI runner never holds it while waiting.
export function saveReview(root, state) {
  const next = {...state, generation:(state.generation ?? 0)+1};
  atomic(safePath(root, REVIEW_STATE), json(next));
  return next;
}
export function setReviewEnabled(root, enabled) {
  check(typeof enabled === 'boolean', 'REVIEW_POLICY', 'enabled должен быть boolean.');
  return locked(root, () => {
    const s = readReview(root);
    return s.enabled === enabled ? s : saveReview(root, {...s, enabled});
  });
}
export function assertSimpleReview(root) {
  check(!readReview(root).enabled, 'REVIEW_REQUIRED', 'Review включён: подготовьте полную форму scope через review:prepare, затем review:run и review:publish. Конфигурация проверок не изменена.');
}
export function reviewPlanDigest(plan) {
  // Publication appends an approval decision; task statuses/commit records are otherwise identical.
  const {user_decisions, ...content} = plan;
  return hash(json(content));
}
function fingerprint(root, source) {
  return hash(fs.readFileSync(safePath(root,source)));
}
export function checkReviewInputs(root, s, {base = true} = {}) {
  check(s.run_id && Array.isArray(s.documents), 'REVIEW_REQUIRED', 'Нет подготовленной пары документов.');
  if (base) check(head(root) === s.base_head && readPlan(root).plan_revision === s.base_revision,
    'REVIEW_STALE', 'HEAD или revision изменились; подготовьте актуальные входы через review:prepare.');
  const dir = reviewDirectory(root, s.run_id);
  for (const d of s.documents) {
    check(fingerprint(root,d.source) === d.sha256 && hash(fs.readFileSync(safePath(dir,d.snapshot))) === d.sha256,
      'REVIEW_STALE', 'Спецификация изменена после подготовки: ' + d.source);
  }
  for (const [name, expected] of Object.entries(s.input_hashes)) {
    check(hash(fs.readFileSync(safePath(dir,name))) === expected, 'REVIEW_STALE', 'Вход ревью изменён: ' + name);
  }
  return dir;
}
// Keep successful results across retries: a later CLI error must not erase an unanswered review.
export function reviewHistory(root, s) {
  if (Array.isArray(s.review_history)) return s.review_history;
  // Existing, unfinished runs may predate the explicit author-response command.
  return s.verdict && s.review_file ? [{round:s.round,verdict:s.verdict,review_file:s.review_file,
    review_sha256:fingerprint(reviewDirectory(root,s.run_id),s.review_file),
    plan_digest:s.plan_digest,documents:s.documents,author_response:null}] : [];
}
function sameReviewPair(s, review) {
  return s.plan_digest===review.plan_digest && s.documents.length===review.documents.length
    && s.documents.every(d=>review.documents.some(r=>r.source===d.source && r.sha256===d.sha256));
}
export function assertAuthorResponses(root, s) {
  const history=reviewHistory(root,s), dir=reviewDirectory(root,s.run_id);
  for (const review of history) {
    const author=review.author_response;
    check(author, 'REVIEW_RESPONSE', 'Сохраните содержательную позицию на раунд '+review.round+' через review:respond, включая approved.');
    check(fingerprint(dir,review.review_file)===review.review_sha256
      && fingerprint(dir,author.file)===author.sha256, 'REVIEW_RESPONSE_STALE', 'Отзыв или позиция изменены вне Kit; используйте review:respond.');
  }
  return history;
}
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
    const candidate = buildScopePlan(root, scope, previous);
    const limit = readConfig(root).budget?.document_bytes ?? 28000;
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
    const exhausted=continuing && round>=old.max_rounds;
    const s = saveReview(root, {version:1,enabled:old.enabled,generation:old.generation,stage:exhausted?'NEEDS_USER':'PREPARED',run_id,
      scope_id:scope.scope_id,round,max_rounds:continuing?old.max_rounds:4,claude_session_id:continuing?old.claude_session_id:null,
      ...recipient,
      review_history:history,
      base_head:head(root),base_revision:previous.plan_revision,documents,scope_file,plan_file,response_file,
      error:exhausted?{code:'REVIEW_ROUND_LIMIT',message:'Лимит раундов. Спросите пользователя о продолжении.'}:null,
      plan_digest:reviewPlanDigest(candidate),input_hashes:Object.fromEntries(files.map(f=>[f,hash(fs.readFileSync(safePath(dir,f)))]))});
    return {ok:true,...s,run_directory:dir,next_action:exhausted?'Спросить пользователя; review:resolve':'review:run'};
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
    return {ok:true,...saveReview(root,{...s,stage,user_decision:{action,note},error:null,notification_handled:false,
      max_rounds:action==='retry'?Math.max(s.max_rounds,s.round+1):s.max_rounds})};
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
export function assertReviewPublication(root, candidate) {
  const s = readReview(root);
  if (!s.enabled) return null;
  check(s.stage === 'AGREED', 'REVIEW_REQUIRED', 'Нужно согласование последней пары; выполните review:status.');
  checkReviewInputs(root,s);
  check(reviewPlanDigest(candidate) === s.plan_digest, 'REVIEW_STALE', 'Публикуемый план отличается от согласованного.');
  const history=assertAuthorResponses(root,s), current=history.filter(r=>sameReviewPair(s,r)), last=current.at(-1);
  check(s.user_decision?.action==='publish' || last?.verdict==='approved' && last.author_response.disposition==='accept',
    'REVIEW_REQUIRED', 'Нужны согласие на текущую пару и позиция accept; при споре — явное решение пользователя через review:resolve.');
  saveReview(root,{...s,stage:'PUBLISHING'});
  return s;
}
export function finishReviewPublication(root, plan, sha) {
  const s = readReview(root);
  if (!s.run_id || s.scope_id !== plan.scope_id) return;
  if (s.enabled) {
    for (const d of s.documents) check(hash(git(root,['show',sha+':'+d.source]).stdout.replace(/\r\n/g,'\n')) === (d.lf_sha256??d.sha256),
      'REVIEW_PUBLICATION', 'Закоммиченная спецификация отличается от одобренной.');
  }
  saveReview(root,{...s,stage:s.stage==='RUNNING'?'RUNNING':'PUBLISHED',published_scope:plan.scope_id,published_commit:sha,notification_handled:true});
}
// Runs under task:start's lock, AFTER the plan transition. Cleanup never rolls it back.
export function cleanupReview(root, plan) {
  const s=readReview(root);
  if(s.stage!=='PUBLISHED' || s.published_scope!==plan.scope_id || s.cleanup_status==='done'
    || !plan.tasks.some(t=>t.implementation_status!=='TODO'))return null;
  try {
    saveReview(root,{...s,cleanup_status:'pending',cleanup_error:null});
    const dir=reviewDirectory(root,s.run_id);
    const inspect=file=>{
      const st=fs.lstatSync(file,{throwIfNoEntry:false});if(!st)return;
      check(!st.isSymbolicLink(),'REVIEW_CLEANUP_PATH','В папке ревью найдена символическая ссылка; автоматическое удаление остановлено.');
      if(st.isDirectory())for(const name of fs.readdirSync(file))inspect(path.join(file,name));
      else check(st.isFile(),'REVIEW_CLEANUP_PATH','Необычный файл в папке ревью.');
    };
    inspect(dir);fs.rmSync(dir,{recursive:true,force:true});
    const latest=readReview(root);
    saveReview(root,{version:1,enabled:latest.enabled,generation:latest.generation,stage:'PUBLISHED',
      run_id:s.run_id,scope_id:s.scope_id,published_scope:s.published_scope,published_commit:s.published_commit,
      base_head:s.base_head,cleanup_status:'done',notification_handled:true});
    return {ok:true};
  } catch(e) {
    const error='Не удалось очистить материалы ревью: '+e.message+'. Повторите task:start текущей задачи после устранения причины.';
    try{saveReview(root,{...readReview(root),cleanup_status:'failed',cleanup_error:error});}catch{ /* Caller also returns the warning. */ }
    return {ok:false,error};
  }
}
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
  check(s.run_id, 'REVIEW_REQUIRED', 'Нет подготовленного плана.');
  const dir=reviewDirectory(root,s.run_id);
  // createScope repeats every check under the operation lock.
  return createScope(root,readJSON(safePath(dir,s.scope_file)),s.base_revision);
}
export function reviewSummary(root) {
  const s=readReview(root);
  const next = s.stage==='PREPARED'?'review:run':s.stage==='AGREED'?'review:respond на approved; затем review:publish без лишнего раунда':s.stage==='NEEDS_USER'?'Если есть успешный отзыв — review:respond; сообщить проблему, спросить пользователя; затем review:resolve':s.stage==='AUTHOR_PENDING'?'Прочитать ревью; review:respond, затем исправления и review:prepare':'review:status';
  return 'Review: '+(s.enabled?'ON (пользователь разрешил рецензента Claude)':'OFF (обычная публикация без согласия Claude)')
    +'; стадия '+s.stage+'; раунд '+(s.round??0)+'. '+(s.enabled?next:'')
    +'\nДля нового плана при ON: review:prepare --help. Не меняйте enabled от имени агента. Память разрешена; свежие решения пользователя имеют приоритет.'
    +'\nПосле каждого успешного отзыва, включая approved: review:respond --help. Сохраните позицию через Kit; существенные решения перенесите в spec/критерии до окончательного ревью. Изменение пары требует нового согласия; ошибка без успешного отзыва не требует позиции.'
    +'\nПолучатель Review — recipient_session_id из стартового сообщения (или совпадающий scope.session_id), только для доставки. Вне Web Pilot: recipient_mode: manual. Смена адресата — лишь с recipient_change_note по поручению пользователя.'
    +(s.run_id && !['PUBLISHED','CANCELLED'].includes(s.stage)?'\nТекущий получатель: '+(s.recipient_session_id??(s.recipient_mode==='manual'?'ручной режим, без отправки':'не задан; автоматическая доставка невозможна')):'')
    +(s.cleanup_error?'\n'+s.cleanup_error:'');
}
