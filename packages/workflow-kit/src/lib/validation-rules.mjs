import path from 'node:path';
import { check, CONFIG, PLAN, planPath, readJSON, textFile, relativePath } from './common.mjs';
import { git, documentText } from './git.mjs';
export function defaultConfig() {
  return { schema_version: 1, profile: 'DISCOVERY', stack: null, checks: [],
    budget: { document_bytes: 28000, hard_bytes: 180000 },
    documentation: { mappings: [] } };
}
export const documentByteLimit = config => config.budget.document_bytes ?? defaultConfig().budget.document_bytes;
export function retryCommand(transaction) {
  const commands = {documentation:'docs:commit',bootstrap:'install:commit', 'kit-update':'install --update',
    'scope-plan':'plan:create', 'plan-carryover':'plan:carryover',archive:'archive',repair:'repair --apply <repair_id>'};
  if (transaction.role === 'implementation') return 'commit --task ' + transaction.task_id;
  if (transaction.role === 'plan-adjustment') return transaction.selected.includes(CONFIG) ? 'config:apply' : 'plan:apply';
  return commands[transaction.role] ?? 'исходную команду';
}
export function validateDocumentSizes(root, files, transaction) {
  const configBlob = git(root, ['show', ':' + CONFIG]);
  const config = validateConfig(JSON.parse(configBlob.stdout));
  const limit = documentByteLimit(config);
  for (const file of files.filter(p => /\.(md|markdown)$/i.test(p) && p !== PLAN)) {
    const entry = git(root, ['ls-files','--stage','-z','--',file]).stdout;
    if (!entry) continue; // Deleted document has no candidate blob.
    const oid = entry.split(' ')[1];
    const bytes = Number(git(root, ['cat-file','-s',oid]).stdout.trim());
    check(Number.isSafeInteger(bytes) && bytes <= limit, 'DOCUMENT_TOO_LARGE',
      file + ': ' + bytes + ' байт UTF-8, предел ' + limit + '. Разделите документ и повторите ' + retryCommand(transaction) + '; правки сохранены.',
      {path:file,bytes,limit,retry_command:retryCommand(transaction)});
  }
}
// Read the candidate from Git's index, never the possibly newer working tree.
export function validateDocumentationCommit(root, files, plan) {
  check(plan.current_task_id === null && ['NONE', 'ACTIVE'].includes(plan.execution_scope_status)
    && !plan.tasks.some(t => t.implementation_status === 'IN_PROGRESS'), 'TASK_ACTIVE', 'docs:commit запрещён во время задачи.');
  for (const file of files.filter(p => p !== PLAN)) {
    const candidate = git(root, ['show', ':' + file], {allowFailure:true, encoding:null});
    if (!['AGENTS.md', 'AGENTS.override.md'].includes(file)) continue;
    const previous = git(root, ['show', 'HEAD:' + file], {allowFailure:true, encoding:null});
    const section = buffer => {
      const start = Buffer.from('<!-- workflow-kit:begin -->'), end = Buffer.from('<!-- workflow-kit:end -->');
      const i = buffer.indexOf(start), j = buffer.indexOf(end, i + start.length);
      check(i >= 0 && j >= i && buffer.indexOf(start, i + start.length) < 0 && buffer.indexOf(end, j + end.length) < 0,
        'MODIFIED_INTEGRATION', file + ' должен сохранять единственную управляемую секцию Kit.');
      return buffer.subarray(i, j + end.length);
    };
    check(previous.status === 0 && candidate.status === 0 && section(previous.stdout).equals(section(candidate.stdout)),
      'MODIFIED_INTEGRATION', 'Управляемая секция ' + file + ' в index должна побайтно совпадать с HEAD.');
  }
}
export function validateConfig(c) {
  check(c?.schema_version === 1, 'CONFIG_SCHEMA', 'Неподдерживаемая схема настройки workflow.');
  check(['DISCOVERY', 'DEVELOPMENT'].includes(c.profile), 'CONFIG_SCHEMA', 'Профиль должен быть DISCOVERY или DEVELOPMENT.');
  check(Array.isArray(c.checks), 'CONFIG_SCHEMA', 'checks должен быть массивом.');
  const ids = new Set();
  for (const test of c.checks) {
    check(typeof test.id === 'string' && test.id && !ids.has(test.id), 'CONFIG_SCHEMA', 'Нужны уникальные ID проверок.'); ids.add(test.id);
    check(typeof test.executable === 'string' && test.executable && Array.isArray(test.args) && test.args.every(a => typeof a === 'string'), 'CONFIG_SCHEMA', 'Проверка задаётся исполняемым файлом и массивом аргументов.');
    check(typeof test.required === 'boolean' && Number.isInteger(test.timeout_ms) && test.timeout_ms > 0 && test.timeout_ms <= 600000, 'CONFIG_SCHEMA', 'У проверки нужны required и timeout_ms до 600000.');
    check(test.kind === undefined || ['syntax','test','package','installed'].includes(test.kind), 'CONFIG_SCHEMA', 'kind проверки: syntax, test, package или installed.');
    if (['package','installed'].includes(test.kind)) check(typeof test.evidence === 'string' && test.evidence.trim(), 'CONFIG_SCHEMA', 'Для package/installed опишите проверяемый артефакт и сценарий в evidence.', {field:'checks.'+test.id+'.evidence'});
    if (test.cwd && test.cwd !== '.') relativePath(test.cwd);
    check(!test.stage || ['commit', 'push'].includes(test.stage), 'CONFIG_SCHEMA', 'Неизвестный этап проверки.');
  }
  check(c.budget && Number.isSafeInteger(c.budget.hard_bytes) && c.budget.hard_bytes > 0 && c.budget.hard_bytes <= 1024 * 1024,
    'CONFIG_SCHEMA', 'Некорректный бюджет контекста в байтах.');
  check(Number.isSafeInteger(documentByteLimit(c)) && documentByteLimit(c) > 0, 'CONFIG_SCHEMA', 'document_bytes должен быть положительным целым числом.');
  // Legacy token fields are accepted for the 1.5.6 transition, but impose no second limit.
  for (const field of ['soft_tokens','hard_tokens']) if (c.budget[field] !== undefined)
    check(Number.isSafeInteger(c.budget[field]) && c.budget[field] > 0, 'CONFIG_SCHEMA', 'Некорректное поле ' + field);
  check(c.documentation && Array.isArray(c.documentation.mappings), 'CONFIG_SCHEMA', 'Нужна карта документации.');
  if (c.documentation.index !== undefined) relativePath(c.documentation.index);
  for (const m of c.documentation.mappings) {
    check(typeof m.code === 'string' && m.code.length > 0 && !m.code.startsWith('/') && !m.code.includes('..'), 'CONFIG_SCHEMA', 'Некорректный селектор документации.');
    check(Array.isArray(m.documents), 'CONFIG_SCHEMA', 'Нужен список документов.'); m.documents.forEach(relativePath);
  }
  if (c.delivery_tail !== undefined) {
    check(Array.isArray(c.delivery_tail), 'CONFIG_SCHEMA', 'delivery_tail должен быть массивом шагов выпуска.');
    for (const [index, step] of c.delivery_tail.entries()) {
      const field = 'delivery_tail[' + index + ']';
      check(step && typeof step === 'object' && Object.keys(step).every(k => ['verification_ids', 'verification_kind'].includes(k)), 'CONFIG_SCHEMA',
        field + ': допустимы только verification_ids и verification_kind.', {field});
      check(['package', 'installed'].includes(step.verification_kind), 'CONFIG_SCHEMA', field + '.verification_kind: package или installed.', {field});
      check(Array.isArray(step.verification_ids) && step.verification_ids.length > 0 && new Set(step.verification_ids).size === step.verification_ids.length
        && step.verification_ids.every(id => ids.has(id)), 'CONFIG_SCHEMA', field + '.verification_ids: непустой список настроенных проверок без повторов.', {field});
      check(step.verification_ids.some(id => c.checks.find(test => test.id === id).kind === step.verification_kind), 'CONFIG_SCHEMA',
        field + ': нужна проверка вида ' + step.verification_kind + '.', {field});
    }
  }
  if (c.profile === 'DEVELOPMENT') check(typeof c.stack === 'string' && c.stack.trim(), 'CONFIG_SCHEMA', 'Укажите выбранный стек.');
  return c;
}
export const readConfig = root => validateConfig(readJSON(path.join(root, CONFIG)));
export function matches(pattern, value) {
  const pieces = pattern.split('**').map(p => p.split('*').map(v => v.replace(/[|\\{}()[\]^$+?.]/g, '\\$&')).join('[^/]*'));
  return new RegExp('^' + pieces.join('.*') + '$').test(value);
}
export function validateDocs(root, changed, task, config, reader = p => textFile(root, p)) {
  const PLAN = planPath(root);
  // Required context documents are validated by recovery; documentation mappings
  // are guidance, not an obligation to manufacture a text edit for every commit.
  for (const document of (task.context_pack?.documents ?? []).filter(d=>d.required)) {
    if ((document.revision ?? 'WORKTREE') === 'WORKTREE') reader(document.path);
    else documentText(root, document);
  }

  return true;
}
export function taskChecks(task, config, stage = 'commit') {
  for (const key of task.verification_ids) check(config.checks.some(c => c.id === key), 'NOT_CONFIGURED', 'Проверка ещё не настроена: ' + key);
  const checks = config.checks.filter(c => (c.stage ?? 'commit') === stage && (stage === 'push' ? c.required : task.verification_ids.includes(c.id)));
  const actual = task.actual_files ?? task.functional_paths;
  const functional = actual.filter(p => !p.endsWith('.md'));
  const ignoreOnly = functional.length > 0 && functional.every(p => p === '.gitignore' || p.endsWith('/.gitignore'));
  if (functional.length && !ignoreOnly && stage === 'commit') {
    check(config.profile === 'DEVELOPMENT', 'STACK_NOT_CONFIGURED', 'Укажите выбранный стек и подключите применимые проверки через config:apply или plan:create.');
    check(checks.length > 0, 'NOT_CONFIGURED', 'Для изменения функционального кода нужна хотя бы одна настроенная проверка.');
  }
  if (stage === 'commit' && task.verification_kind && task.verification_kind !== 'code') {
    check(checks.some(c=>c.kind===task.verification_kind), 'VERIFICATION_KIND', 'Нужна проверка '+task.verification_kind+'; синтаксис не подтверждает готовность артефакта.', {task_id:task.id,field:'checks',expected:task.verification_kind,received:checks.map(c=>({id:c.id,kind:c.kind??'unspecified'})),next_action:'Настройте соответствующую проверку через config:apply и добавьте её через task:update.'});
  }
  if (stage === 'commit' && ignoreOnly && checks.length === 0) return [{id:'gitignore-format',kind:'code',executable:'git',args:['diff','--cached','--check'],timeout_ms:10000}];
  return checks;
}
