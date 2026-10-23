import fs from 'node:fs';
import path from 'node:path';
import { atomic, check, hash, json, safePath, readJSON } from './common.mjs';
import { readPlan } from './plan.mjs';
import { head, git } from './git.mjs';
import { locked } from './transaction-state.mjs';
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
// Shown whenever a plan is published while the user has Review on but no review run exists yet.
export const REVIEW_ON_PUBLICATION = 'Review включён пользователем: положение переключателя в момент публикации — его действующее решение, даже если recovery показывал OFF. Не просите выключить Review: подготовьте полную форму scope через review:prepare --help, затем review:run, review:respond и review:publish. Конфигурация проверок не изменена.';
export function setReviewEnabled(root, enabled) {
  check(typeof enabled === 'boolean', 'REVIEW_POLICY', 'enabled должен быть boolean.');
  return locked(root, () => {
    const s = readReview(root);
    if (s.enabled === enabled) return s;
    // Review gates only the publication of a new plan; a published plan keeps the decision it was published with.
    check(readPlan(root).execution_scope_status === 'NONE', 'REVIEW_LOCKED',
      'Review применяется к новому плану; текущий план уже опубликован. Переключение доступно после закрытия плана.');
    check(!['RUNNING','PUBLISHING'].includes(s.stage), 'REVIEW_BUSY', 'Идёт ревью или публикация плана; переключите Review после их завершения.');
    // Switching Review off cancels an unfinished review; the agent then publishes the plan normally.
    const open = !enabled && s.run_id && ['PREPARED','AUTHOR_PENDING','AGREED','NEEDS_USER','STALE'].includes(s.stage);
    return saveReview(root, open ? {...s, enabled, stage:'CANCELLED', error:null,
      user_decision:{action:'cancel',note:'Пользователь выключил Review до публикации плана.'}} : {...s, enabled});
  });
}
export function assertSimpleReview(root) {
  check(!readReview(root).enabled, 'REVIEW_REQUIRED', REVIEW_ON_PUBLICATION);
}
export function reviewPlanDigest(plan) {
  // Publication appends an approval decision; task statuses/commit records are otherwise identical.
  const {user_decisions, ...content} = plan;
  return hash(json(content));
}
export function fingerprint(root, source) {
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
export function sameReviewPair(s, review) {
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
export function assertReviewPublication(root, candidate) {
  const s = readReview(root);
  if (!s.enabled) return null;
  check(s.run_id && !['IDLE','CANCELLED','PUBLISHED'].includes(s.stage), 'REVIEW_REQUIRED', REVIEW_ON_PUBLICATION);
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
export function reviewSummary(root) {
  const s=readReview(root);
  const next = s.stage==='PREPARED'?'review:run':s.stage==='AGREED'?'review:respond на approved; затем review:publish без лишнего раунда':s.stage==='NEEDS_USER'?'Если есть успешный отзыв — review:respond; сообщить проблему, спросить пользователя; затем review:resolve':s.stage==='AUTHOR_PENDING'?'Прочитать ревью; review:respond, затем исправления и review:prepare':'review:status';
  return 'Review: '+(s.enabled?'ON (пользователь разрешил рецензента Claude)':'OFF (обычная публикация без согласия Claude)')
    +'; стадия '+s.stage+'; раунд '+(s.round??0)+'. '+(s.enabled?next:'')
    +'\nДля нового плана при ON: review:prepare --help. Переключатель принадлежит пользователю и до публикации может измениться: действует его положение в момент публикации. REVIEW_REQUIRED — пройдите ревью, не прося выключить Review; REVIEW_DISABLED — публикуйте обычным способом. После публикации Review не переключается до закрытия плана. Не меняйте enabled от имени агента. Память разрешена; свежие решения пользователя имеют приоритет.'
    +'\nПосле каждого успешного отзыва, включая approved: review:respond --help. Сохраните позицию через Kit; существенные решения перенесите в spec/критерии до окончательного ревью. Изменение пары требует нового согласия; ошибка без успешного отзыва не требует позиции.'
    +'\nПолучатель Review — recipient_session_id из стартового сообщения (или совпадающий scope.session_id), только для доставки. Вне Web Pilot: recipient_mode: manual. Смена адресата — лишь с recipient_change_note по поручению пользователя.'
    +(s.run_id && !['PUBLISHED','CANCELLED'].includes(s.stage)?'\nТекущий получатель: '+(s.recipient_session_id??(s.recipient_mode==='manual'?'ручной режим, без отправки':'не задан; автоматическая доставка невозможна')):'')
    +(s.cleanup_error?'\n'+s.cleanup_error:'');
}
