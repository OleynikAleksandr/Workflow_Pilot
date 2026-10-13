import { ProjectsService } from './projects/service.mjs';
import { WorkspaceSetup } from './projects/workspace-setup.mjs';
import { ProjectDoctor } from './projects/project-doctor.mjs';
import { SessionPlans } from './sessions/session-plans.mjs';
import { SessionRuntimes } from './sessions/service.mjs';
import { ContextService } from './context/service.mjs';
import { createWorkflowCoordination } from './workflow/coordination.mjs';
export { DEFAULT_PARALLEL_SETTINGS, validateParallelSettings } from './workflow/parallel-settings.mjs';
export { readCommandActivity, acknowledgeUnknownCommand } from './workflow/command-activity.mjs';
export { projectExecutors } from './workflow/execution-projection.mjs';

export { normalizeChatUrl, activeSessionsNewestFirst } from './sessions/workspace-session.mjs';
export { sessionRuntimeKey } from './sessions/service.mjs';
export { externalClientLine } from './context/context-session.mjs';
export { removeProjectSettings, pruneOrphanProjectSettings, belongsToProject, queueProjectStatePurge } from './projects/project-state-cleanup.mjs';

// Desktop supplies platform dependencies; Control constructs and retains product services.
export class ControlFacade {
  #execution;
  #setup;
  #plans;
  #sessions;
  #workflow;
  constructor({storageFile, execution, ...options}) {
    this.#execution = execution;
    this.projects = Object.freeze(new ProjectsService(storageFile, options));
  }
  configureProjects(options) {
    if (this.#setup) throw new Error('CONTROL_ALREADY_CONFIGURED');
    const setup = this.#setup = new WorkspaceSetup(options);
    // Explicit operation port; no tickets, readiness queues or mutable environment escape.
    this.setup = {
      get environment() { return {...setup.environment}; }, get resourceDir() { return setup.resourceDir; },
      node: () => setup.node(), setRuntimeEnvironment: values => setup.setRuntimeEnvironment(values),
      preview: input => setup.preview(input), apply: token => setup.apply(token), clear: () => setup.clear(),
      ready: (...args) => setup.ready(...args), invalidateReadiness: workspace => setup.invalidateReadiness(workspace),
    };
    this.#plans = new SessionPlans({setup:this.setup, run:this.#execution.executeFile,
      files:this.#execution.files, onWorkerStart:options.onWorkerStart});
    this.plans = Object.freeze({call:(...args)=>this.#plans.call(...args),loadContext:workspace=>this.#plans.loadContext(workspace)});
    const doctor = new ProjectDoctor({setup:this.setup,ensureServices:()=>this.#execution.ensureServices()});
    this.doctor = Object.freeze({run:(...args)=>doctor.run(...args)});
    return this.setup;
  }
  configureContext(options) {
    this.context = new ContextService({...options,execution:this.#execution,plans:this.plans,setup:this.setup});
    return this.context;
  }
  attachSessions(options) {
    if (this.#sessions) throw new Error('CONTROL_SESSIONS_ALREADY_ATTACHED');
    this.#sessions = new SessionRuntimes({...options,store:this.projects,execution:this.#execution,
      runtime:()=>this.context.runtime,contextCache:this.context.cache});
    const sessions = this.#sessions;
    // Composition port for workflow/desktop migration; the registry and storage stay private.
    return Object.freeze({
      get visible() { return sessions.visible; },
      all: () => sessions.all(), find: project => sessions.find(project),
      ensure: project => sessions.ensure(project), tick: (...args) => sessions.tick(...args),
      show: record => sessions.show(record), hide: () => sessions.hide(),
      navigate: (...args) => sessions.navigate(...args), release: (...args) => sessions.release(...args),
      observeManualConversation: (...args) => sessions.observeManualConversation(...args), dispose: () => sessions.dispose(),
    });
  }
  createDeletion(options) { return this.projects.createDeletion(options); }
  configureWorkflow(options) {
    if(this.#workflow)throw new Error('CONTROL_WORKFLOW_ALREADY_CONFIGURED');
    this.#workflow=createWorkflowCoordination({...options,store:this.projects,setup:this.setup,plans:this.plans});
    return this.#workflow;
  }
}
