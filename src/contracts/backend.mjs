// Wire protocol shared by an unprivileged frontend and the independent backend.
// No Electron, filesystem, shell, store or secret crosses this boundary.
export const BACKEND_API_VERSION = 1;
export const COMMUNICATION_PROTOCOL = 9;
export const COMMUNICATION_APP_VERSION = '0.6.0';
export const COMMUNICATION_BUILD = '0.6.0-communication-9';
export function communicationVersionMessage(panel, server={build_id:COMMUNICATION_BUILD,protocol_version:COMMUNICATION_PROTOCOL}) {
  const build=value=>typeof value==='string'&&/^[A-Za-z0-9._-]{1,128}$/.test(value)?value:'неизвестна';
  const protocol=value=>Number.isSafeInteger(value)&&value>=0&&value<=9999?value:'неизвестен';
  return `Несовместимая панель: ${build(panel?.build_id)} (протокол ${protocol(panel?.protocol_version)}); `
    +`служба: ${build(server?.build_id)} (протокол ${protocol(server?.protocol_version)}). `
    +'Обновите инструменты подключения Workflow Pilot в ChatGPT, затем попросите агента заново вызвать workflow_pilot_panel в этом разговоре. '
    +'Если служба старее панели, сначала завершите установку нового выпуска. Переустановка приложения сама по себе не обновляет сохранённую панель.';
}
export const COMMUNICATION_PERMISSION_MS = 30 * 60 * 1000;
export const BACKEND_LIMITS = Object.freeze({
  messageBytes: 64 * 1024,
  pendingEvents: 256,
  pendingCommands: 64,
  transferBytes: 32 * 1024 * 1024,
  transferChunkBytes: 256 * 1024,
});

export const FORCE_STOP_DIALOG = Object.freeze({type:'warning',buttons:['Остановить принудительно','Отмена'],defaultId:1,cancelId:1,
  message:'Принудительно остановить службу Workflow Pilot?',
  detail:'Текущие ответы, загрузки и команды будут прерваны. Несохранённые данные могут быть потеряны. Будет закрыто и окно приложения. Сохранённые проекты останутся на диске.'});

export const BACKEND_OPERATIONS = Object.freeze({
  'projects.list': 'read', 'projects.create': 'mutate', 'projects.open': 'mutate',
  'projects.rename': 'mutate', 'projects.delete': 'mutate',
  'sessions.list': 'read', 'sessions.create': 'mutate', 'sessions.open': 'mutate',
  'sessions.rename': 'mutate', 'sessions.delete': 'mutate', 'sessions.select': 'mutate',
  'settings.get': 'read', 'settings.update': 'mutate',
  'plan.snapshot': 'read', 'plan.continue': 'mutate', 'plan.stop': 'mutate',
  'control.acquire': 'control', 'control.renew': 'control', 'control.release': 'control',
  'browser.input': 'input', 'browser.transfer.start': 'transfer',
  'browser.transfer.complete': 'transfer',
  'plugin.list': 'read', 'plugin.open': 'mutate', 'plugin.connect': 'mutate',
  'plugin.claim': 'mutate', 'plugin.report': 'mutate', 'plugin.wait': 'read',
  // The Desktop client: the same allowlisted channels as the former local IPC.
  'ui.state': 'read', 'ui.invoke': 'mutate',
  // Explicit stop of the background service (draining, never a kill).
  'service.status': 'read', 'service.stop': 'mutate', 'service.cancel-stop': 'mutate', 'service.force-stop': 'mutate',
  // Showing the backend's native window on this computer: presentation, not work.
  'window.open': 'window',
});

// Enabled only when working notifications use the channel (T003).
export const PLUGIN_ACTION_CLASS = Object.freeze({
  panel: 'ui-mutation', list: 'read', open: 'read', connect: 'ui-mutation', sessionTitle:'ui-mutation',
  'communication.join':'ui-mutation', 'communication.bind':'ui-mutation',
  'communication.enable':'ui-mutation', 'communication.stop':'ui-mutation',
  'communication.send':'ui-mutation', 'communication.read':'ui-mutation', 'communication.probe':'ui-mutation',
  'communication.wait':'ui-mutation', 'communication.claim':'ui-mutation', 'communication.verify':'ui-mutation',
  'communication.report':'ui-mutation', 'communication.status':'read', 'communication.journal':'read',
  'communication.telemetry':'ui-mutation', 'communication.export':'read', 'communication.recover':'read',
  'communication.sync':'ui-mutation', 'communication.readMessage':'ui-mutation',
  'communication.content':'read', 'communication.roster':'read',
  'communication.startupComplete':'ui-mutation',
  'communication.assignmentSend':'ui-mutation','communication.assignmentYield':'ui-mutation','communication.assignmentStatus':'read',
  'communication.assignmentMigrate':'ui-mutation',
  'communication.assignmentPrepare':'ui-mutation','communication.assignmentDispatch':'ui-mutation',
  'communication.claimReady':'ui-mutation','communication.telemetryBatch':'ui-mutation','communication.choose':'ui-mutation',
  // The separate MCP executor channel is NOT an operation of the UI API.
  'mcp.context': 'agent-independent', 'mcp.tools': 'agent-independent',
});

export function protocolError(code, message = 'Операция недоступна.') {
  const error = new Error(message);
  error.code = code;
  return error;
}
const requireWire = (valid, code) => { if (!valid) throw protocolError(code, 'Некорректное сообщение протокола.'); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (value, keys) => Object.keys(value).every(key => keys.includes(key));
const id = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/.test(value);
const text = (value, max = 128) => typeof value === 'string' && value.length > 0 && value.length <= max;
const number = value => Number.isSafeInteger(value) && value >= 0;

export function wireCopy(value, maxBytes = BACKEND_LIMITS.messageBytes) {
  let serialized;
  try { serialized = JSON.stringify(value); } catch { throw protocolError('BACKEND_MESSAGE_INVALID'); }
  requireWire(typeof serialized === 'string' && new TextEncoder().encode(serialized).byteLength <= maxBytes,
    'BACKEND_MESSAGE_SIZE');
  let copy;
  try { copy = JSON.parse(serialized); } catch { throw protocolError('BACKEND_MESSAGE_INVALID'); }
  return copy;
}

export function validateHandshake(input) {
  requireWire(object(input) && own(input, ['apiVersion','identity','bootGeneration','capabilities','readiness','appVersion']), 'BACKEND_HANDSHAKE_INVALID');
  // The product version lets a client of another release explain the switch instead of guessing.
  requireWire(input.appVersion === undefined || typeof input.appVersion === 'string' && /^[0-9A-Za-z.+-]{1,32}$/.test(input.appVersion), 'BACKEND_HANDSHAKE_INVALID');
  requireWire(input.apiVersion === BACKEND_API_VERSION, 'BACKEND_VERSION_INCOMPATIBLE');
  requireWire(id(input.identity) && id(input.bootGeneration), 'BACKEND_HANDSHAKE_INVALID');
  requireWire(object(input.capabilities) && Object.values(input.capabilities).every(value => typeof value === 'boolean')
    && ['ready','setup-required','degraded','draining'].includes(input.readiness), 'BACKEND_HANDSHAKE_INVALID');
  return wireCopy(input);
}

export function validateSnapshot(input) {
  requireWire(object(input) && own(input, ['bootGeneration','revision','sequence','state'])
    && id(input.bootGeneration) && number(input.revision) && number(input.sequence)
    && object(input.state), 'BACKEND_SNAPSHOT_INVALID');
  return wireCopy(input);
}

export function validateEvent(input) {
  requireWire(object(input) && own(input, ['bootGeneration','sequence','revision','type','data'])
    && id(input.bootGeneration) && number(input.sequence) && input.sequence > 0
    && number(input.revision) && text(input.type,64) && object(input.data), 'BACKEND_EVENT_INVALID');
  return wireCopy(input);
}

export function validateCommand(input) {
  requireWire(object(input) && own(input, ['requestId','operation','args','bootGeneration','revision','leaseGeneration'])
    && id(input.requestId) && Object.hasOwn(BACKEND_OPERATIONS,input.operation)
    && object(input.args) && id(input.bootGeneration)
    && (input.revision === undefined || number(input.revision))
    && (input.leaseGeneration === undefined || number(input.leaseGeneration)), 'BACKEND_COMMAND_INVALID');
  const operationClass = BACKEND_OPERATIONS[input.operation];
  requireWire(operationClass === 'read' || operationClass === 'window' || input.operation === 'control.acquire' || number(input.leaseGeneration),
    'BACKEND_LEASE_REQUIRED');
  return wireCopy(input);
}

export function validateResult(input) {
  requireWire(object(input) && own(input,['requestId','status','operationId','value','error'])
    && id(input.requestId) && ['accepted','completed','failed','rejected','unknown'].includes(input.status)
    && (input.operationId === undefined || id(input.operationId))
    && (input.error === undefined || object(input.error))
    && (input.value === undefined || input.error === undefined), 'BACKEND_RESULT_INVALID');
  requireWire(input.status !== 'accepted' || id(input.operationId), 'BACKEND_RESULT_INVALID');
  if(input.error !== undefined)validateError(input.error);
  return wireCopy(input);
}

export function validateOperation(input) {
  requireWire(object(input) && own(input,['operationId','status','bootGeneration','requestId','result'])
    && id(input.operationId) && id(input.requestId) && id(input.bootGeneration)
    && ['accepted','running','completed','failed','unknown'].includes(input.status), 'BACKEND_OPERATION_INVALID');
  return wireCopy(input);
}

export function validateError(input) {
  // Only fixed public messages: never forward exception stacks, chat text or tokens.
  requireWire(object(input) && own(input,['code','message']) && id(input.code)
    && typeof input.message === 'string' && input.message.length <= 200,
    'BACKEND_ERROR_INVALID');
  return wireCopy(input);
}

export function validateTransfer(input) {
  requireWire(object(input) && own(input,['transferId','name','size','mime','direction'])
    && id(input.transferId) && text(input.name,180)
    && !/[\\/\u0000-\u001f]/.test(input.name) && input.name !== '.' && input.name !== '..'
    && number(input.size) && input.size <= BACKEND_LIMITS.transferBytes
    && ['upload','download'].includes(input.direction)
    && (input.mime === undefined || typeof input.mime === 'string' && input.mime.length <= 120),
    'BACKEND_TRANSFER_INVALID');
  return wireCopy(input);
}
