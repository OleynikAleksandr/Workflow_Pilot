// Compatibility import path until consumer migration is complete (T011).
export * from './execution/runtime/mcp-client.mjs';
export { RuntimeError } from './contracts/errors.mjs';
export { CONTEXT_PROTOCOL, validateContextPacket } from './contracts/context.mjs';
