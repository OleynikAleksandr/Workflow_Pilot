import { fail } from './common.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { WorkspaceSetup } from './workspace-setup.mjs';
const execute = promisify(execFile);

export class SessionPlans {
  constructor({ setup = new WorkspaceSetup(), run = execute, onWorkerStart = () => {} } = {}) {
    Object.assign(this, { setup, run, onWorkerStart });
  }
  async call(workspace, command, args = [], input = null, { timeout = 120000 } = {}) {
    if (!path.isAbsolute(workspace)) throw fail('WORKSPACE_REQUIRED', 'Нужна абсолютная папка проекта.');
    const node = await this.setup.node();
    let inputFile;
    try {
      if (input) {
        const directory = path.join(workspace, '.harness/runtime/session-plans');
        await fs.mkdir(directory, { recursive: true });
        inputFile = path.join(directory, randomUUID() + '.json');
        await fs.writeFile(inputFile, JSON.stringify(input), { mode: 0o600, flag: 'wx' });
        args = [...args, '--input', inputFile];
      }
      let stdout;
      try {
        this.onWorkerStart('workflow');
        ({ stdout } = await this.run(node, [path.join(workspace, 'scripts/workflow.mjs'), command, ...args],
          { cwd: workspace, env: this.setup.environment, timeout, maxBuffer: 4 * 1024 * 1024, windowsHide: true, encoding: 'utf8' }));
      }
      catch (error) { if (!error.stdout) throw error; stdout = error.stdout; }
      let result;
      try { result = JSON.parse(stdout); } catch { throw fail('PLAN_COMMAND_FAILED', 'Workflow Kit вернул неполный ответ.'); }
      if (!result.ok) throw fail(result.code ?? 'PLAN_COMMAND_FAILED', result.message ?? 'Команда плана не выполнена.');
      return result;
    } finally { if (inputFile) await fs.unlink(inputFile).catch(() => {}); }
  }
  async loadContext(workspace) {
    try {
      return await this.call(workspace, 'recover', ['--format', 'packet']);
    } catch (error) {
      if (error.code !== 'SESSION_REQUIRED') throw error;
      const text = await fs.readFile(path.join(workspace, '.harness/plans/todo-plan.md'), 'utf8');
      const raw = text.match(/<!-- workflow-state:begin -->\s*```json\s*([\s\S]*?)```/)?.[1];
      let plan;
      try { plan = JSON.parse(raw ?? ''); } catch { throw fail('WORKFLOW_PLAN_INVALID', 'Не удалось прочитать current plan для совместимости со старым Workflow Kit.'); }
      const sessionId = plan.owner_session_id ?? null;
      if (!sessionId) throw error;
      return this.call(workspace, 'recover', ['--session', sessionId, ...(plan.scope_id ? ['--plan', plan.scope_id] : []), '--format', 'packet']);
    }
  }

}
