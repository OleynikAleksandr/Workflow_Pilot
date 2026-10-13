import fs from 'node:fs';
import { reviewSummary } from './plan-review.mjs';
import path from 'node:path';
import { VERSION, planPath, CONFIG, check, contextPath, textFile, atomic, json, hash, id, errorResult } from './common.mjs';
import { validate, documentByteLimit, resolveReferences } from './validate.mjs';
import { nextTask, PROJECT_CONTINUATION_OBJECTIVE, parsePlan, uniqueDocuments, isDeliveryTask, hasExecutionPolicy } from './plan.mjs';
import { snapshot, git, localPath, head, fileFingerprint, documentText, commitHistory } from './git.mjs';
import { projectFacts, projectFactPaths, planningDocuments } from './project-facts.mjs';
import { inspectionInputs } from './inspection-inputs.mjs';

export const TRANSPORT_HARD_BYTES = 180000;
export const TRANSPORT_MAX_PARTS = 7;
const LEGACY_REFERENCE_DOCUMENTS = new Set(['docs/MODULES.md', 'docs/DOCUMENTATION_INDEX.md']);
function withoutKitSection(text,file) {
  const begin = '<!-- workflow-kit:begin -->', end = '<!-- workflow-kit:end -->';
  const i = text.indexOf(begin), j = text.indexOf(end);
  check(i < 0 && j < 0 || i >= 0 && j > i && text.indexOf(begin,i+begin.length)<0 && text.indexOf(end,j+end.length)<0,
    'MODIFIED_INTEGRATION', 'Повреждена управляемая секция ' + file);
  return i < 0 ? text : (text.slice(0,i) + text.slice(j+end.length)).trim();
}
function projectInstructions(root) {
  const file = ['AGENTS.override.md','AGENTS.md'].find(p => fs.existsSync(path.join(root,p)) && textFile(root,p).trim());
  return file ? {file,text:withoutKitSection(textFile(root,file),file)} : null;
}

export function section(text, headings, file) {
  if (!headings?.length) return text;
  const lines = text.split('\n'); const found = []; const stack = [];
  let fenced = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*(```|~~~)/.test(lines[i])) { fenced = !fenced; continue; }
    if (fenced) continue;
    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(lines[i]); if (!match) continue;
    const level = match[1].length;
    while (stack.length && stack.at(-1).level >= level) stack.pop();
    stack.push({ level, name: match[2] });
    if (JSON.stringify(stack.map(s => s.name)) === JSON.stringify(headings)) found.push({ start: i, level });
  }
  check(found.length === 1, 'CONTEXT_SECTION', 'Раздел отсутствует или неоднозначен: ' + file + ' → ' + headings.join(' / '));
  const { start, level } = found[0]; let end = lines.length; fenced = false;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^\s*(```|~~~)/.test(lines[i])) { fenced = !fenced; continue; }
    const match = !fenced && /^(#{1,6})\s/.exec(lines[i]); if (match && match[1].length <= level) { end = i; break; }
  }
  return lines.slice(start, end).join('\n');
}

const measure = s => ({ bytes: Buffer.byteLength(s, 'utf8'), characters: [...s].length });
function referenceLine(doc) { return '- ' + doc.path + ' @ ' + (doc.revision ?? 'WORKTREE')
  + (doc.bytes === undefined ? '' : ' — ' + doc.bytes + ' байт'); }
function sectionsForError(parts) {
  return parts.map(part => ({ label: part.label, ...measure(part.text) })).sort((a, b) => b.bytes - a.bytes).slice(0, 12);
}
function relevantEvidence(root, beforeHead, neededShas, transaction, lastCheckedSha) {
  const file = localPath(root, 'last-verification.json');
  if (!fs.existsSync(file)) return null;
  try {
    let evidence = JSON.parse(fs.readFileSync(file, 'utf8'));
    // A documentation/service commit has no product checks. Retrieve the last
    // checked task of this plan, never a global latest task from another checkout state.
    if (!transaction && !evidence.checks?.length && lastCheckedSha && /^[a-f0-9]{40,64}$/.test(lastCheckedSha)) {
      const archived = localPath(root, 'verification/by-commit/' + lastCheckedSha + '.json');
      if (fs.existsSync(archived)) {
        const previous = JSON.parse(fs.readFileSync(archived, 'utf8'));
        if (previous.commit === lastCheckedSha) evidence = previous;
      }
    }
    const related = (evidence.commit && new Set([beforeHead, ...neededShas, lastCheckedSha]).has(evidence.commit)) ||
      (transaction && evidence.transaction_id === transaction.id);
    if (!related) return null;
    return { commit: evidence.commit ?? null, candidate_tree: evidence.candidate_tree ?? null,
      verification_scope: evidence.verification_scope ?? 'unspecified', excluded_changes: evidence.excluded_changes ?? [],
      checks: Array.isArray(evidence.checks) ? evidence.checks.map(c => ({ id: c.id, kind: c.kind ?? 'unspecified', evidence: c.evidence ?? null, command: c.command, status: c.status, exit_code: c.exit_code, elapsed_ms: c.elapsed_ms, output: c.output })) : [],
      historical: Boolean(evidence.commit && evidence.commit !== beforeHead),
      note: evidence.commit && evidence.commit !== beforeHead ? "Результаты относятся к указанному коммиту; не подтверждают последующие изменения или текущее состояние артефакта." : evidence.note ?? undefined };
  } catch { return null; }
}

export function recover(root, reason = 'manual', options = {}) {
  return recoverState(root, reason, options).packet;
}

// Split text without dropping separators or breaking UTF-8 characters.

export function splitText(text, limit) {
  check(Number.isSafeInteger(limit) && limit > 0, 'CONTEXT_PART_LIMIT', 'Нет места для текста части recovery.');
  if (Buffer.byteLength(text) <= limit) return [text];
  const result = [];
  let rest = text;
  while (rest) {
    let end = 0, bytes = 0;
    for (const char of rest) {
      const size = Buffer.byteLength(char);
      if (bytes + size > limit) break;
      bytes += size; end += char.length;
    }
    check(end > 0, 'CONTEXT_PART_LIMIT', 'Предел меньше одного символа UTF-8.');
    if (end < rest.length) {
      const prefix = rest.slice(0,end);
      let boundary = 0, offset = 0, fence = null;
      for (const line of prefix.match(/[^\n]*\n|[^\n]+$/g) ?? []) {
        const marker = /^\s{0,3}(\x60{3,}|~{3,})/.exec(line)?.[1];
        if (marker) {
          if (!fence) fence = marker;
          else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null;
        } else if (!fence && /^#{1,6}\s/.test(line) && offset > 0) boundary = offset;
        offset += line.length;
      }
      if (!boundary) for (const match of prefix.matchAll(/\r?\n[ \t]*\r?\n/g)) boundary = match.index + match[0].length;
      if (!boundary) boundary = prefix.lastIndexOf('\n') + 1;
      if (boundary > 0) end = boundary;
    }
    result.push(rest.slice(0,end)); rest = rest.slice(end);
  }
  return result;
}

// Exact source fragments and their service headers share the same byte budget.
export function recoveryParts(units, limit) {
  const outer = (index,total) => 'WORKFLOW RECOVERY — часть ' + index + '/' + total + '\n\n';
  const outerReserve = Buffer.byteLength(outer('9999999999','9999999999'));
  const fragments = [];
  for (const unit of units) {
    const source = unit.label, revision = unit.revision ?? 'WORKTREE';
    const oversized = unit.document && Buffer.byteLength(unit.text) > limit;
    const header = (part,total) => '--- ИСТОЧНИК: ' + source + ' @ ' + revision + ' / ' + part + '/' + total
      + (oversized ? ' / разделить при следующей правке' : '') + ' ---\n';
    const footer = '\n--- КОНЕЦ ИСТОЧНИКА ---';
    const reserve = outerReserve + Buffer.byteLength(header('9999999999','9999999999') + footer);
    const singleSize = outerReserve + Buffer.byteLength(header(1,1) + unit.text + footer);
    const chunks = singleSize <= limit ? [unit.text] : splitText(unit.text, limit-reserve);
    chunks.forEach((content,index) => fragments.push({
      source, revision, part:index+1, total:chunks.length, content, oversized,
      rendered:header(index+1,chunks.length)+content+footer
    }));
  }
  const groups = [];
  let group = [], bytes = outerReserve;
  for (const fragment of fragments) {
    const addition = Buffer.byteLength(fragment.rendered) + (group.length ? 2 : 0);
    if (group.length && bytes+addition > limit) { groups.push(group); group=[]; bytes=outerReserve; }
    bytes += Buffer.byteLength(fragment.rendered) + (group.length ? 2 : 0);
    group.push(fragment);
  }
  if (group.length) groups.push(group);
  check(groups.length < 1e10, 'CONTEXT_PART_LIMIT', 'Слишком много частей recovery.');
  return groups.map((group,index)=>{
    const text = outer(index+1,groups.length) + group.map(fragment=>fragment.rendered).join('\n\n');
    check(Buffer.byteLength(text)<=limit, 'CONTEXT_PART_LIMIT', 'Часть recovery превышает предел.');
    return {index:index+1,total:groups.length,text,...measure(text),sha256:hash(text),
      sources:group.map(({rendered,...source})=>source)};
  });
}

function taskProjection(task, resolved) {
  const reference = resolved[task.id];
  const planned = [...new Set([...task.functional_paths,...task.documentation_paths])];
  const actual = task.actual_files;
  const added = actual?.filter(file=>!planned.includes(file)) ?? [];
  const unchanged = actual ? planned.filter(file=>!actual.includes(file)) : [];
  const actualDescription = !actual ? 'ещё не зафиксированы' :
    'плановый список' + (unchanged.length ? '; исключены: '+unchanged.join(', ') : '')
    + (added.length ? '; добавлены: '+added.join(', ') : '');
  return '# ' + task.id + ' — ' + task.title
    + '\nЗачем: ' + task.why
    + '\nСтатус: ' + task.implementation_status + ' / ' + task.commit_status
    + '\nЗависимости: ' + (task.dependencies.join(', ') || 'нет')
    + (task.parallel_safe === undefined ? '' : '\nПараллельность: ' + (task.parallel_safe ? 'допустима при непересекающихся областях' : 'исключительное выполнение; в parallel-плане отдельный исполнитель'))
    + (task.commit_ref.role === 'integration' ? '\nSource SHA: ' + task.commit_ref.source_commit + '\nИнтеграция: ' + task.commit_ref.operation_id : '')
    + '\nКритерии:\n' + task.acceptance_criteria.map(item=>'- '+item).join('\n')
    + '\nКоммит: ' + (reference?.sha ?? (reference?.pending ? 'COMMIT_PENDING' : 'не создан'))
    + (reference?.sha ? '\nРодитель: '+reference.parent+'\nЧтение: git show '+reference.sha : '')
    + '\nФайлы:\n' + planned.map(file=>'- '+file).join('\n')
    + '\nФактические файлы: ' + actualDescription
    + '\nПроверки: ' + (task.verification_ids.join(', ') || 'схема и состав коммита')
    + '\nСообщение коммита: ' + task.expected_commit_message;
}

function closedPlan(root, plan) {
  if (!plan.archived_scope_id) return null;
  const candidates = commitHistory(root,null).filter(commit=>
    commit.trailers['Workflow-Role']?.length === 1 && commit.trailers['Workflow-Role'][0] === 'archive'
    && commit.trailers['Workflow-Scope']?.length === 1 && commit.trailers['Workflow-Scope'][0] === plan.archived_scope_id);
  for (const commit of candidates) {
    check(commit.parents.length===1, 'CONTEXT_ARCHIVE', 'У коммита закрытия должен быть один родитель.');
    const file = planPath(root);
    const closed = parsePlan(documentText(root,{path:file,revision:commit.sha}));
    if (closed.project_id !== plan.project_id || closed.archived_scope_id !== plan.archived_scope_id || closed.execution_scope_status !== 'NONE') continue;
    const previous = parsePlan(documentText(root,{path:file,revision:commit.parents[0]}));
    check(previous.project_id===plan.project_id && previous.scope_id===plan.archived_scope_id,
      'CONTEXT_ARCHIVE','Коммит закрытия не подтверждает предыдущий план.');
    const resolved = resolveReferences(root,previous,null);
    const documents = uniqueDocuments([previous.context_pack,...previous.tasks.map(task=>task.context_pack)]
      .flatMap(pack=>pack?.documents??[]).filter(doc=>/^docs\/(planning|modules)\//.test(doc.path)))
      .map(doc=>({...doc, revision:doc.revision && doc.revision!=='WORKTREE'?doc.revision:commit.parents[0]}));
    for (const doc of documents) documentText(root,doc,{optional:!doc.required,referenceOnly:true});
    return {sha:commit.sha,parent:commit.parents[0],plan:previous,resolved,documents};
  }
  check(false,'CONTEXT_ARCHIVE','Не найден подтверждённый коммит закрытия: '+plan.archived_scope_id);
}

export function recoverState(root, reason = 'manual', options = {}) {
  const PLAN = planPath(root);
  for (let attempt = 0; attempt < 2; attempt++) {
    const started = Date.now(), marker = options.receipt ? id() : null;
    const initialInputs = inspectionInputs(root).key;
    const initialHead = head(root), initialPlan = fileFingerprint(root,PLAN), initialConfig = fileFingerprint(root,CONFIG);
    const journalFile = localPath(root,'transaction.json');
    const journalHash = () => fs.existsSync(journalFile) ? hash(fs.readFileSync(journalFile)) : null;
    const initialJournal = journalHash();
    let validation;
    try { validation = validate(root); } catch (error) {
      if (inspectionInputs(root).key === initialInputs) throw error;
      if (attempt === 0) continue;
      check(false,'CONCURRENT_CHANGE','Проект меняется во время проверки; повторите после завершения операции.');
    }
    const {plan,config,resolved,transaction} = validation;
    const task = transaction?.task ?? nextTask(plan);
    const rulesPath = '.harness/kit/WORKFLOW.md', policyPath = '.harness/kit/templates/PROTOTYPE.md';
    const instructions = projectInstructions(root);
    const documents = uniqueDocuments([...plan.context_pack.documents,...(task?.context_pack?.documents??[])]);
    documents.forEach(doc=>contextPath(root,doc.path));
    const planning = planningDocuments(root);
    const templatePaths = ['PLAN','SPEC','CONTINUE','STAGES'].map(name=>'.harness/kit/templates/'+name+'.md');
    const relevant = [...new Set([PLAN,CONFIG,rulesPath,policyPath,...(instructions?[instructions.file]:[]),
      ...templatePaths,...projectFactPaths(root),...planning.map(doc=>doc.path),
      ...documents.filter(doc=>doc.revision==='WORKTREE').map(doc=>doc.path),
      ...(task?[...task.functional_paths,...task.documentation_paths]:[])])];
    relevant.forEach(file=>contextPath(root,file));
    const before = snapshot(root,relevant);
    if (before.head!==initialHead || before.files[PLAN]!==initialPlan || before.files[CONFIG]!==initialConfig) {
      if (attempt===0) continue;
      check(false,'CONCURRENT_CHANGE','HEAD, план или конфигурация меняются во время проверки ссылок.');
    }
    const previous = plan.execution_scope_status==='NONE' ? closedPlan(root,plan) : null;
    const selected = new Set(task?[...task.functional_paths,...task.documentation_paths]:[]);
    const foreign = [...new Set([...before.staged,...before.unstaged,...before.untracked])].filter(file=>file!==PLAN&&!selected.has(file));
    let continuation;
    if (transaction) continuation = 'Есть незавершённый журнал commit. Сначала status и повтор commit/repair; новую задачу не начинать.';
    else if (plan.execution_scope_status==='NONE') continuation = PROJECT_CONTINUATION_OBJECTIVE;
    else if (plan.execution_scope_status==='BLOCKED') continuation = 'Разрешены обсуждение и диагностика. Причина: '+plan.blocked_reason;
    else if (plan.assignment && plan.delivery_status==='READY_FOR_ACCEPTANCE') continuation = 'Назначение готово к интеграции. Родительская задача не завершена. Сохраните ветку и worktree; новые задачи и вложенные исполнители запрещены.';
    else if (plan.delivery_status==='READY_FOR_ACCEPTANCE') continuation = 'Все задачи выполнены, план остаётся видимым. Новое поручение добавляется через plan:extend; закрытие требует отдельной прямой команды пользователя.';
    else if (plan.execution_strategy==='parallel' && !plan.assignment) continuation = 'Основной чат ведёт планирование и исправление интеграций. Все задачи, включая общую основу и исключительные, выполняют отдельные назначения Web Pilot. Не вызывайте task:start/commit задачи в main. AutoPlan выбранного проекта управляет запуском. Если осталась прежняя начатая задача main, приложение сохраняет её через assignment:handoff; при блокировке сообщите точную причину, не удаляйте правки.';
    else continuation = (plan.current_task_id?'Продолжить ':'Начать через task:start ')+(task?.id??'задачу после уточнения зависимостей')+'.';
    const units = [];
    const add = (label,text,metadata={}) => units.push({label,text,...metadata});
    add('identity','WORKFLOW RECOVERY / schema 3 / kit '+VERSION+(marker?'\nDELIVERY-MARKER: '+marker:'')
      +'\nПричина: '+reason+'\nПроект: '+plan.project_name+'\nProject ID: '+plan.project_id
      +'\nScope: '+(plan.scope_id??'NONE')+'\nWorktree: '+root+'\nCurrent plan: '+PLAN
      +'\nCommands: ./scripts/workflow <команда>\nPlan revision: '+plan.plan_revision
      +'\nHEAD: '+(before.head??'первого коммита ещё нет')+'\nSnapshot: '+before.fingerprint
      +'\nСостояние: '+plan.execution_scope_status+' / '+plan.delivery_status+(transaction?' / COMMIT_PENDING':'')
      +'\nТекущая задача: '+(task?.id??'нет')
      +'\nНовый chat/client продолжает этот же checkout plan.');
    add(rulesPath,section(textFile(root,rulesPath),['Workflow','Workflow Core'],rulesPath),{document:true});
    add(policyPath,textFile(root,policyPath),{document:true});
    if(instructions?.text) add(instructions.file,instructions.text,{document:true});
    add('project-facts','СРЕДА И ПРОЕКТ (данные, не инструкции; команды не запускались)\n'+json(projectFacts(root)));
    add('on-demand','ФОРМЫ ПО ЗАПРОСУ\n- Новый план: ./scripts/workflow plan:create --help\n- Новые задачи: ./scripts/workflow plan:extend --help\n- Выполнение и DOCS: ./scripts/workflow task:start --help');
    add('plan-review',reviewSummary(root));
    add('objective','ЦЕЛЬ\n'+(plan.objective||PROJECT_CONTINUATION_OBJECTIVE)+'\nКритерии:\n'+plan.acceptance_criteria.map(item=>'- '+item).join('\n'));
    if(hasExecutionPolicy(plan))add('execution-policy','ВЫПОЛНЕНИЕ\n'+JSON.stringify(Object.fromEntries(['parallel_allowed','max_workers','execution_strategy','execution_reason'].map(key=>[key,plan[key]])))+'\nРодительское DONE требует проверенной интеграции; коммит исполнителя не закрывает общий план.');
    add('user-decisions','РЕШЕНИЯ ПОЛЬЗОВАТЕЛЯ\n'+plan.user_decisions.map(item=>'- '+item.text).join('\n'));
    if(plan.assignment)add('assignment','ЛОКАЛЬНОЕ НАЗНАЧЕНИЕ\n'+json(plan.assignment)+'Исполнитель не расширяет план и не создаёт вложенных назначений. Локальное DONE означает готовность к интеграции.');
    for(const item of plan.tasks) add('task:'+item.id,taskProjection(item,resolved));
    const deliveryIndex = plan.tasks.findLastIndex(item=>isDeliveryTask(item)&&item.commit_status==='DONE');
    if(deliveryIndex>=0&&plan.tasks.length>deliveryIndex+1) {
      const delivery=plan.tasks[deliveryIndex];
      add('after-delivery','ИЗМЕНЕНИЯ ПОСЛЕ ВЫПУСКА\nПоследний delivery: '+delivery.id+' @ '+resolved[delivery.id]?.sha
        +'\nСледующие задачи: '+plan.tasks.slice(deliveryIndex+1).map(item=>item.id).join(', '));
    }
    if(previous) {
      add('previous-plan','ПРЕДЫДУЩИЙ ПЛАН\narchived_scope_id: '+plan.archived_scope_id+'\nКоммит закрытия: '+previous.sha
        +'\nЧтение плана: git show '+previous.sha+'^:'+PLAN
        +'\nСпецификации:\n'+previous.documents.map(referenceLine).join('\n'));
      add('previous-tasks',previous.plan.tasks.map(item=>item.id+' — '+item.title+' — '+item.implementation_status
        +' / '+item.commit_status+' — '+previous.resolved[item.id].sha).join('\n'),{revision:previous.parent});
    } else if(plan.execution_scope_status==='NONE') add('previous-plan','Предыдущего закрытого плана нет.');
    add('planning','РАБОЧИЕ СПЕЦИФИКАЦИИ docs/planning (содержимое по выбору)\n'
      +(planning.map(doc=>'- '+doc.path+' — '+doc.title+' — '+doc.bytes+' байт').join('\n')||'нет'));

    const included = [PLAN,CONFIG,rulesPath,policyPath,...(instructions?.text?[instructions.file]:[])];
    const omitted = templatePaths.map(file=>({path:file,reason:'ON_DEMAND'}));
    for(const doc of documents) {
      if (LEGACY_REFERENCE_DOCUMENTS.has(doc.path)) {
        const raw = documentText(root,doc,{optional:!doc.required});
        omitted.push({path:doc.path,revision:doc.revision,bytes:raw===null?undefined:Buffer.byteLength(raw),
          reason:raw===null?'MISSING_REFERENCE':'LEGACY_REFERENCE_ONLY'});
        continue;
      }
      const raw = documentText(root,doc,{optional:!doc.required,referenceOnly:!doc.required});
      if(!doc.required) {
        omitted.push({path:doc.path,revision:doc.revision,reason:raw===null?'MISSING_REFERENCE':'REFERENCE_ONLY'});
        continue;
      }
      if(doc.path===instructions?.file&&doc.revision==='WORKTREE') continue;
      check(doc.path!==PLAN,'CONTEXT_PLAN_DOCUMENT','todo-plan.md передаётся проекцией задач, не вторым JSON-документом.');
      const text = /^AGENTS(?:\.override)?\.md$/.test(doc.path)?withoutKitSection(raw,doc.path):raw;
      add('required:'+doc.path,text,{revision:doc.revision,document:true}); included.push(doc.path);
    }
    for(const kind of ['staged','unstaged','untracked']) add(kind,kind.toUpperCase()+':\n'+(before[kind].join('\n')||'нет'));
    add('foreign','ПОСТОРОННИЕ ИЗМЕНЕНИЯ\n'+(foreign.join('\n')||'нет'));
    if(transaction) add('transaction','ТРАНЗАКЦИЯ\n'+json({id:transaction.id,task:transaction.task_id,phase:transaction.phase,before_head:transaction.before_head}));
    const lastChecked = [...plan.tasks].reverse().find(item=>item.commit_status==='DONE'&&item.verification_ids.length&&resolved[item.id]?.sha);
    const neededShas = Object.values(resolved).flatMap(ref=>ref.sha?[ref.sha]:[]);
    const evidence = relevantEvidence(root,before.head,neededShas,transaction,lastChecked?resolved[lastChecked.id].sha:null);
    add('verification','ПРОВЕРКИ\n'+(evidence?json(evidence):'Нет verification evidence, относящейся к текущему snapshot. Это не означает PASSED.'));
    add('next-action','ПРОДОЛЖЕНИЕ\n'+continuation);
    add('completeness','ПОЛНОТА: COMPLETE\nВключено: '+included.join(', ')+'\nReference-only:\n'+omitted.map(doc=>referenceLine(doc)+' — '+doc.reason).join('\n'));
    const effectiveBudget = {document_bytes:documentByteLimit(config),hard_bytes:Math.min(config.budget.hard_bytes,TRANSPORT_HARD_BYTES)};
    const parts = recoveryParts(units,effectiveBudget.document_bytes);
    const body = parts.map(part=>part.text).join('\n\n'), size = measure(body);
    check(size.bytes<=effectiveBudget.hard_bytes && parts.length<=TRANSPORT_MAX_PARTS,'CONTEXT_TOO_LARGE',
      'Обязательный execution context превышает транспортный бюджет байтов или предел 7 частей. Уменьшите required module/task context или разделите scope; данные не обрезаны.',
      {...size,parts:parts.length,max_parts:TRANSPORT_MAX_PARTS,budget:effectiveBudget,largest_sections:sectionsForError(units)});
    options.beforeRecheck?.(attempt);
    const after = snapshot(root,relevant);
    if(after.fingerprint!==before.fingerprint||journalHash()!==initialJournal||inspectionInputs(root).key!==initialInputs) {
      if(attempt===0) continue;
      check(false,'CONCURRENT_CHANGE','Проект меняется во время восстановления. Повторите после завершения другой операции.');
    }
    const packet = {ok:true,transaction_pending:Boolean(transaction),session_id:null,plan_id:plan.scope_id,plan_path:PLAN,
      facts:{project_id:plan.project_id,project_name:plan.project_name,plan_revision:plan.plan_revision,scope_id:plan.scope_id,
        execution_scope_status:plan.execution_scope_status,delivery_status:plan.delivery_status,task_id:task?.id??null,task_title:task?.title??null},
      text:body,parts,marker,signature:hash(body),completeness:'COMPLETE',reason,head:before.head,plan_revision:plan.plan_revision,
      scope_id:plan.scope_id,task_id:plan.current_task_id,next_task_id:task?.id??null,included,omitted,size,budget:effectiveBudget,elapsed_ms:Date.now()-started};
    if(options.receipt) atomic(localPath(root,'recovery.json'),json({...packet,text:undefined,parts:undefined,worktree:root,created_at:new Date().toISOString()}));
    return {validation,snapshot:before,packet};
  }
}

export function sessionStart(root, event) {
  try {
    check(event?.hook_event_name === 'SessionStart' && ['startup', 'resume', 'clear', 'compact'].includes(event.source), 'HOOK_INPUT', 'Некорректное событие SessionStart.');
    const result = recover(root, event.source, { receipt: true });
    return { continue: true, hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: result.text } };
  } catch (e) { const error = errorResult(e); return { continue: false, stopReason: error.code, systemMessage: error.message + ' Диагностика: ./scripts/workflow status' }; }
}

export function contextPacket(root) {
  const packet = recover(root);
  return { ok: true, delivery_protocol: 'inline-context-v1', ack_required: false, status: 'ready', completeness: packet.completeness,
    workspace: root, session_id: packet.session_id, plan_id: packet.plan_id, plan_path: packet.plan_path,
    context: packet.text, context_bytes: Buffer.byteLength(packet.text, 'utf8'), context_sha256: hash(packet.text),
    parts: packet.parts, size: packet.size, budget: packet.budget,
    signature: packet.signature, generated_at_ms: Date.now(), head: packet.head, facts: packet.facts };
}
