import { fail } from '../../contracts/errors.mjs';
import path from 'node:path';
import { executeFile as execute, desktopFiles } from '../../execution/facade.mjs';
import { randomUUID } from 'node:crypto';
import { WorkspaceSetup } from '../projects/workspace-setup.mjs';

export class SessionPlans {
  constructor({ setup = new WorkspaceSetup(), run = execute, files = desktopFiles, onWorkerStart = () => {} } = {}) {
    Object.assign(this, { setup, run, files, onWorkerStart });
  }
  async call(workspace, command, args = [], input = null, { timeout = 120000, readRetry = false, onTiming = null } = {}) {
    if (!path.isAbsolute(workspace)) throw fail('WORKSPACE_REQUIRED', 'Нужна абсолютная папка проекта.');
    const node = await this.setup.node();
    let inputFile,ok=false;const started=performance.now(),started_at=new Date().toISOString();
    try {
      if (input) {
        const directory = path.join(workspace, '.harness/runtime/session-plans');
        inputFile = path.join(directory, randomUUID() + '.json');
        await this.files.writeJson(inputFile, input, { exclusive: true });
        args = [...args, '--input', inputFile];
      }
      let stdout,killed=false;
      try {
        this.onWorkerStart('workflow');
        ({ stdout } = await this.run(node, [path.join(workspace, 'scripts/workflow.mjs'), command, ...args],
          { cwd: workspace, env: this.setup.environment, timeout, maxBuffer: 4 * 1024 * 1024, windowsHide: true, encoding: 'utf8' }));
      }
      catch (error) { if (!error.stdout) throw error; stdout = error.stdout; killed = !!(error.killed || error.signal); }
      let result;
      try { result = JSON.parse(stdout); } catch { throw fail('PLAN_COMMAND_FAILED', 'Workflow Kit вернул неполный ответ.'); }
      // Kit 1.8.2 can observe the transaction marker just before its owner removes
      // it. Re-read only inspection commands and this exact missing-marker race;
      // malformed data and all commands with effects keep their original failure.
      const missingTransaction=result.code==='INVALID_JSON'
        &&/(?:\/|\\)workflow-kit(?:\/|\\)transaction\.json$/.test(result.message??'')
        &&/^ENOENT:/.test(result.details?.reason??'');
      const replacedPlan=result.code==='MISSING_FILE'&&result.message==='Отсутствует навигационный план проекта.';
      if (!readRetry && !input && ['assignment:status','integration:status','validate'].includes(command)
          && (missingTransaction||replacedPlan))
        {
          if(replacedPlan)await new Promise(resolve=>setTimeout(resolve,50));
          const result=await this.call(workspace, command, args, null, { timeout, readRetry:true });
          ok=true;return result;
        }
      // A Kit process that ended on its own and answered with a code made a decision; a killed one did not.
      if (!result.ok) throw Object.assign(fail(result.code ?? 'PLAN_COMMAND_FAILED', result.message ?? 'Команда плана не выполнена.'), killed ? {} : { kitRefusal: true });
      ok=true;
      return result;
    } finally { if (inputFile) await this.files.removeFile(inputFile).catch(() => {});
      try{onTiming?.({operation:command,elapsed_ms:performance.now()-started,started_at,ended_at:new Date().toISOString(),ok});}catch{/* Diagnostics never alter a Kit outcome. */}
    }
  }
  async loadContext(workspace, role = null) {
    try {
      return await this.call(workspace, 'recover', ['--format', 'packet', ...(role ? ['--role', role] : [])]);
    } catch (error) {
      if (error.code !== 'SESSION_REQUIRED') throw error;
      const text = await this.files.readText(path.join(workspace, '.harness/plans/todo-plan.md'));
      const raw = text.match(/<!-- workflow-state:begin -->\s*```json\s*([\s\S]*?)```/)?.[1];
      let plan;
      try { plan = JSON.parse(raw ?? ''); } catch { throw fail('WORKFLOW_PLAN_INVALID', 'Не удалось прочитать current plan для совместимости со старым Workflow Kit.'); }
      const sessionId = plan.owner_session_id ?? null;
      if (!sessionId) throw error;
      return this.call(workspace, 'recover', ['--session', sessionId, ...(plan.scope_id ? ['--plan', plan.scope_id] : []), '--format', 'packet']);
    }
  }

}
