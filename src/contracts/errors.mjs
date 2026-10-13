export class RuntimeError extends Error {
  constructor(code, message) { super(message); this.name = 'RuntimeError'; this.code = code; }
}
export const fail = (code, message) => Object.assign(new Error(message), { code });
