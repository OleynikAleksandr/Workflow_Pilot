import { fileURLToPath } from 'node:url';

export { VERSION, WorkflowError } from './src/lib/common.mjs';
export * as actions from './src/lib/actions.mjs';
export * as plan from './src/lib/plan.mjs';
export * as sessionPlans from './src/lib/session-plans.mjs';
export { currentPlanView, sessionPlanView } from './src/lib/session-plans.mjs';
export * as recovery from './src/lib/recovery.mjs';
export * as installer from './src/lib/installer.mjs';

export function getRuntimeRoot() {
  return fileURLToPath(new URL('./src/', import.meta.url));
}
