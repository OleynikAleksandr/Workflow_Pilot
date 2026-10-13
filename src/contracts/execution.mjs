import { RuntimeError } from './errors.mjs';

export const EXECUTION_OUTCOMES = Object.freeze(['running', 'success', 'error', 'cancel', 'UNKNOWN']);
export function operationId(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,100}$/.test(value))
    throw new RuntimeError('EXECUTION_ID_INVALID', 'Нужен точный ID операции.');
  return value;
}
export function unknownOperation(id) {
  return { operationId: operationId(id), sessionId: null, outcome: 'UNKNOWN', exitCode: null, signal: null,
    stdout: '', stderr: '', error: { code: 'EXECUTION_SESSION_UNKNOWN', message: 'Нет доказательства состояния этой операции.' } };
}
