import { execFile as execFileCallback } from 'node:child_process';

export const TUNNEL_ID_PATTERN = /^tunnel_[A-Za-z0-9_-]{16,100}$/;

// Secrets enter the worker through its pipe, never argv or environment.
export function executePrivateInput(file, args, options, input) {
 return new Promise((resolve, reject) => {
  const child = execFileCallback(file, args, options, (error, stdout, stderr) => {
   if (error) { error.stderr = stderr; reject(error); } else resolve({ stdout, stderr });
  });
  child.stdin.on('error', () => {}); // The process callback owns early-exit failure.
  child.stdin.end(input);
 });
}

export async function runTunnelHelper({ python, helper, options, credentials, idOnly = false,
  execute, executeInput = executePrivateInput, errorPrefix, ErrorType, errorMessages }) {
  const invalidDataCode = errorPrefix + '_TUNNEL_INVALID_DATA';
  const failureCode = errorPrefix + '_TUNNEL_SETUP_FAILED';
  try {
    let result;
    if (credentials === undefined) result = await execute(python, ['-B', helper, ...(idOnly ? ['--tunnel-id'] : [])], options);
    else {
      if (!credentials || typeof credentials.tunnelId !== 'string' || credentials.tunnelId.length > 150
          || (credentials.key !== undefined && (typeof credentials.key !== 'string' || credentials.key.length > 4096))) {
        throw { stderr: JSON.stringify({ ok: false, code: invalidDataCode }) };
      }
      result = await executeInput(python, ['-B', helper, '--stdin'], options,
        JSON.stringify({ tunnel_id: credentials.tunnelId, ...(credentials.key === undefined ? {} : { api_key: credentials.key }) }));
    }
    const value = JSON.parse(result.stdout);
    if (value.cancelled === true) return { cancelled: true };
    if (idOnly && typeof value.tunnel_id === 'string' && TUNNEL_ID_PATTERN.test(value.tunnel_id))
      return { tunnelId: value.tunnel_id };
    if (!idOnly && value.configured === true) return { configured: true };
    throw new Error('Unexpected setup result');
  } catch (failure) {
    let code = failureCode;
    try {
      const report = JSON.parse(failure.stderr);
      if (report?.ok === false && Object.hasOwn(errorMessages, report.code)) code = report.code;
    } catch { /* Only known codes may cross the secret-input boundary. */ }
    const error = new ErrorType(code, errorMessages[code]);
    error.publicMessage = error.message; throw error;
  }
}
