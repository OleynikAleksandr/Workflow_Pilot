import { createHash } from 'node:crypto';
const digest = data => createHash('sha256').update(data).digest('hex');
const inputError = message => Object.assign(new Error(message), { code: 'CONTEXT_INPUTS_UNAVAILABLE' });

// The application shares readiness's complete input inventory with its addressed
// recovery cache. It still obtains every packet from the canonical CLI builder.
export async function readinessContextKey(setup, workspace) {
  const result = await setup.ready(workspace,{retain:true});
  if (result.ready !== true || result.workspace !== workspace || typeof result.inputKey !== 'string' || !result.inputKey)
    throw inputError('Workspace readiness could not be confirmed');
  return digest(JSON.stringify({ version: 4, workspace, readiness: result.inputKey }));
}
