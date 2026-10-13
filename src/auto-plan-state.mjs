import fs from 'node:fs/promises';
import { readReview } from '@webpilot/workflow-kit/lib/plan-review';
export const reviewBlocksExecution=(review,scopeId)=>review?.enabled && review.scope_id===scopeId && review.stage!=='PUBLISHED';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readWorkspace } from './workspace-session.mjs';
const execute = promisify(execFile);
// The next unfinished task with the fields an agent needs to continue. Read together with the plan check;
// a plan that changed in between gives no task, and the continuation falls back to the plain text.
async function readNextTask(view) {
  try {
    const text = await fs.readFile(path.join(view.workspace, '.harness/plans/todo-plan.md'), 'utf8');
    const plan = JSON.parse(text.match(/<!-- workflow-state:begin -->\s*```json\s*([\s\S]*?)```\s*<!-- workflow-state:end -->/)?.[1] ?? '');
    if (plan.plan_revision !== view.planRevision || plan.scope_id !== view.scopeId) return null;
    const task = plan.tasks.find(candidate => candidate?.id === view.nextTaskId);
    if (!task || task.commit_status === 'DONE') return null;
    const strings = value => Array.isArray(value) ? value.filter(item => typeof item === 'string' && item) : [];
    return { id: task.id, title: task.title, why: typeof task.why === 'string' ? task.why : '',
      acceptance: strings(task.acceptance_criteria),
      files: [...strings(task.functional_paths), ...strings(task.documentation_paths)],
      checks: strings(task.verification_ids) };
  } catch { return null; }
}

// Only on relevant idle events and immediately before Send; never a Git polling loop.
export async function readAutoPlanState(selected, environment = process.env) {
  const { workspace, sessionId } = selected;
  const before = await readWorkspace(workspace, sessionId);
  const git = async args => (await execute(environment.WORKFLOW_GIT_BIN || 'git', ['-C', workspace, ...args],
    { env: environment, windowsHide: true, encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024 })).stdout.trim();
  const journal = path.join(await git(['rev-parse', '--absolute-git-dir']), 'workflow-kit', 'transaction.json');
  let pending = false;
  try { await fs.access(journal); pending = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const dirty = await git(['status', '--porcelain', '--', '.harness/plans/todo-plan.md']);
  const after = await readWorkspace(workspace, sessionId);
  return { ...after, nextTask: await readNextTask(after), confirmed: after.planExecution?.execution_strategy !== 'parallel'
    && !pending && !reviewBlocksExecution(readReview(workspace),after.scopeId) && (!after.planView.tasks.every(t => t.status === 'done') || !dirty) && before.planRevision === after.planRevision
    && before.scopeId === after.scopeId };
}
