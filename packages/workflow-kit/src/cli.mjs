#!/usr/bin/env node
import fs from 'node:fs';
import { handoffParallelTask, assertHandoffCommand } from './lib/task-handoff.mjs';
import { startIntegration, continueIntegration, integrationStatus, assertIntegrationCommand } from './lib/task-integration.mjs';
import { createAssignment, assignmentStatus, setupAssignment, assertAssignmentCommand } from './lib/task-assignment.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { errorResult, check, readJSON, json, withPlanFile, PLAN } from './lib/common.mjs';
import { repoRoot } from './lib/git.mjs';
import { status, createScope, startTask, applyPlan, applyConfig, archive, carryoverPlan, repair, acknowledgeHook, renameProject, commitDocumentation } from './lib/actions.mjs';
import { journal } from './lib/validate.mjs';
import { withSessionPlan, sessionPlanView } from './lib/session-plans.mjs';
import { validate } from './lib/validate.mjs';
import { recover, sessionStart, contextPacket } from './lib/recovery.mjs';
import { updateTask } from './lib/task-update.mjs';
import { extendPlan } from './lib/extend-plan.mjs';
import { commandHelp } from './lib/command-help.mjs';
import { createSimplePlan } from './lib/simple-workflow.mjs';
import { reviewStatus, prepareReview, respondReview, resolveReview, publishReview, cancelReview, acknowledgeReview } from './lib/plan-review.mjs';
import { commitTask } from './lib/transaction.mjs';
import { preCommit, commitMessage, postCommit, prePush } from './lib/git-hooks.mjs';

export function argumentsOf(argv) {
  const opts = {}; const args = [];
  for (let i = 0; i < argv.length; i++) {
    const value = argv[i];
    if (!value.startsWith('--')) { args.push(value); continue; }
    const key = value.slice(2);
    check(!Object.hasOwn(opts, key), 'ARGUMENTS', 'Параметр повторяется: ' + value);
    if (['json', 'dry-run', 'update', 'help', 'full', 'npm-ci'].includes(key)) opts[key] = true;
    else { check(i + 1 < argv.length && !argv[i + 1].startsWith('--'), 'ARGUMENTS', 'Не задано значение: ' + value); opts[key] = argv[++i]; }
  }
  return { opts, args };
}
export async function main(argv = process.argv.slice(2)) {
  let isHook = argv[0] === 'hook'; let opts = {};
  try {
    const parsed = argumentsOf(argv); opts = parsed.opts;
    const [raw = 'help', ...rest] = parsed.args;
    const aliases = { 'plan:status': 'status', 'plan:validate': 'validate', 'plan:commit': 'commit', 'plan:repair': 'repair', 'plan:archive': 'archive' };
    const command = aliases[raw] ?? raw;
    check(Number(process.versions.node.split('.')[0]) >= 22, 'NODE_VERSION', 'Требуется Node.js 22 или новее.');
    if (command === 'help' || opts.help || rest.includes('help')) return { value: commandHelp(command === 'help' ? (aliases[rest[0]] ?? rest[0] ?? 'help') : command), json: false };
    if (['install', 'install:commit', 'inspect', 'remove', 'doctor'].includes(command)) {
      if(opts.project && fs.existsSync(path.join(opts.project,'.git'))) {
        assertHandoffCommand(repoRoot(opts.project),command);
        assertAssignmentCommand(repoRoot(opts.project),command);
        assertIntegrationCommand(repoRoot(opts.project),command);
      }
      const { installerCommand } = await import('./lib/installer.mjs');
      return { value: await installerCommand(command, opts), json: true };
    }

    let event; if (isHook) event = JSON.parse(fs.readFileSync(0, 'utf8'));
    const root = repoRoot(opts.project || event?.cwd || process.cwd());
    assertHandoffCommand(root,command);
    assertAssignmentCommand(root,command);
    assertIntegrationCommand(root,command);
    let result;
    const input = () => { check(opts.input, 'INPUT_REQUIRED', 'Укажите --input <JSON-файл>.'); return readJSON(path.resolve(opts.input)); };
    if(command==='review:run') {
      const {runReview}=await import('./lib/claude-review.mjs');
      const value=await withSessionPlan(root,{sessionId:opts.session,planId:opts.plan},()=>runReview(root,{
        maxTurns:opts['max-turns']===undefined?30:Number(opts['max-turns']),
        timeoutMs:opts['timeout-ms']===undefined?900000:Number(opts['timeout-ms'])
      }));
      return {value,json:true};
    }
    const execute = () => {
    switch (command) {
      case 'integration:start': result = startIntegration(root,input()); break;
      case 'integration:continue': result = continueIntegration(root,opts.id); break;
      case 'integration:status': result = integrationStatus(root); break;
      case 'assignment:handoff': result = handoffParallelTask(root,input(),opts['expected-revision']); break;
      case 'assignment:create': result = createAssignment(root,input(),opts['expected-revision']); break;
      case 'assignment:status': result = assignmentStatus(root,opts.id); break;
      case 'assignment:setup': result = setupAssignment(root,opts.id,{npmCi:!!opts['npm-ci']}); break;
      case 'review:status': result = reviewStatus(root); break;
      case 'review:acknowledge': result = acknowledgeReview(root,opts.run); break;
      case 'review:prepare': result = prepareReview(root,input()); break;
      case 'review:respond': result = respondReview(root,input()); break;
      case 'review:resolve': result = resolveReview(root,opts.action,opts.note); break;
      case 'review:cancel': result = cancelReview(root,opts.note); break;
      case 'review:publish': result = publishReview(root); break;
      case 'status': { result = status(root); if (!opts.full) { delete result.recovery_text; delete result.last_hook_execution; delete result.resolved; } break; }
      case 'validate': { const r = validate(root); result = { ok: true, message: 'План и Git согласованы.', plan_revision: r.plan.plan_revision, resolved: r.resolved, transaction_pending: !!r.transaction }; break; }
      case 'recover': { if (opts.format === 'packet') return { value: contextPacket(root), json: true }; const p = recover(root); return { value: opts.format === 'json' || opts.json ? p : p.text, json: opts.format === 'json' || !!opts.json }; }
      case 'plan:view': result = sessionPlanView(root, opts.session); break;
      case 'plan:prepare':
      case 'plan:bind':
      case 'plan:adopt':
        check(false, 'COMMAND_REMOVED', command + ' удалена из single-active-plan workflow. Новый chat продолжает текущий checkout plan; для независимой работы используйте Git worktree.');
        break;
      case 'plan:extend': result = extendPlan(root,input(),opts['expected-revision']); break;
      case 'plan:carryover': result = carryoverPlan(root,input(),opts['expected-revision']); break;
      case 'project:rename': result = renameProject(root, opts.name, opts['expected-revision']); break;
      case 'plan:create': result = createSimplePlan(root,input()); break;
      case 'scope:create': result = createScope(root, input(), opts['expected-revision']); break;
      case 'task:update': result = updateTask(root,opts.task,input(),opts['expected-revision']); break;
      case 'task:start': result = startTask(root, rest[0], opts['expected-revision']); break;
      case 'plan:apply': result = applyPlan(root, input(), opts['expected-revision']); break;
      case 'config:apply': result = applyConfig(root, input()); break;
      case 'docs:commit':
      case 'commit': { if (command === 'commit') check(opts.task, 'TASK_REQUIRED', 'Укажите --task <id>.'); check(!(opts.files&&opts.input),'COMMIT_FILES','Используйте --files или --input, не оба.'); let files;
        if(opts.files!==undefined){try{files=JSON.parse(opts.files);}catch{check(false,'COMMIT_FILES','--files: нужен JSON-массив путей.',{example:['src/main.mjs','package.json']});}}
        else if(opts.input){const data=input();check(data&&Array.isArray(data.files),'COMMIT_FILES','--input: нужен объект с массивом files.',{example:{files:['src/main.mjs','package.json']}});files=data.files;}
         result = command === 'docs:commit' ? commitDocumentation(root, files, opts.message) : commitTask(root, opts.task, files); result.state = recover(root); break; }
      case 'repair': result = repair(root, opts.apply, opts.cancel); break;
      case 'archive': result = archive(root, opts.scope, opts['approval-note']); break;
      case 'hook:ack': result = acknowledgeHook(root, opts.marker, opts.client); break;
      case 'hook': check(rest[0] === 'session-start', 'HOOK_COMMAND', 'Неизвестный hook.'); return { value: sessionStart(root, event), json: true };
      case 'git-hook': {
        const handlers = { 'pre-commit': preCommit, 'commit-msg': r => commitMessage(r, rest[1]), 'post-commit': postCommit, 'pre-push': prePush };
        check(handlers[rest[0]], 'HOOK_COMMAND', 'Неизвестный Git hook.'); result = handlers[rest[0]](root); break;
      }
      default: check(false, 'UNKNOWN_COMMAND', 'Неизвестная команда: ' + command);
    }
    if (result?.state?.text) result = {...result,state:{...result.state.facts,next_task_id:result.state.next_task_id}};
    if (result?.text && result?.facts) result = {ok:true,...result.facts,next_task_id:result.next_task_id};
    return { value: result, json: true };
    };
    if (command === 'plan:view') return execute();
    if (command === 'git-hook') {
      const pending = journal(root);
      return withPlanFile(root, pending?.plan_path ?? PLAN, {}, execute);
    }
    return withSessionPlan(root, { sessionId: opts.session, planId: opts.plan }, execute);
  } catch (e) {
    if (isHook) return { value: { continue: false, stopReason: e.code ?? 'HOOK_ERROR', systemMessage: e.message + ' Диагностика: ./scripts/workflow doctor' }, json: true };
    return { value: errorResult(e), json: true, exitCode: 1 };
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await main(); process.stdout.write(result.json ? json(result.value) : result.value + '\n'); process.exitCode = result.exitCode ?? 0;
}
