export const DEFAULT_PARALLEL_SETTINGS = Object.freeze({ parallel_allowed: false, max_workers: 2 });

// Shared by the settings IPC, session storage and renderer; no platform dependencies.
export function validateParallelSettings(value = DEFAULT_PARALLEL_SETTINGS) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || Object.keys(value).some(key => !['parallel_allowed', 'max_workers'].includes(key))
      || typeof value.parallel_allowed !== 'boolean'
      || !Number.isSafeInteger(value.max_workers) || value.max_workers < 1) {
    throw Object.assign(new Error('Укажите разрешение и положительное целое число исполнителей.'), { code: 'PARALLEL_SETTINGS_INVALID' });
  }
  return { parallel_allowed: value.parallel_allowed, max_workers: value.max_workers };
}
