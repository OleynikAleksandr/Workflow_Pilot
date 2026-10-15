import { createHash } from 'node:crypto';
import { validateContextPacket } from '../../contracts/context.mjs';
import { PluginLaunch } from './launch.mjs';

const fail = (code, message) => Object.assign(new Error(message), { code });
const key = value => typeof value === 'string' && value.length > 0 && value.length <= 512;
export function pluginConversationKey(metadata) {
  if (!key(metadata?.['openai/session'])) throw fail('PLUGIN_SESSION_REQUIRED',
    'Клиент не передал идентификатор разговора. Подключите плагин в поддерживаемом разговоре ChatGPT.');
  return createHash('sha256').update(JSON.stringify(['openai/organization', 'openai/subject', 'openai/session']
    .map(name => key(metadata[name]) ? metadata[name] : ''))).digest('hex');
}

// Both frontends use the same ProjectsService. No profile copies or browser operations.
export class PluginProjects {
  constructor({ projects, loadContext, onChange = () => {} }) {
    Object.assign(this, { projects, loadContext, onChange });
    this.launch = new PluginLaunch({onChange});
  }
  list() {
    return { projects: this.projects.snapshot().projects.filter(p => !p.archivedAt && !p.parentWorkspace)
      .map(p => ({ id: p.projectId, name: p.displayName || p.name,
        sessions: p.sessions.filter(s => !s.archivedAt).map(s => ({ id: s.sessionId, title: s.title || 'Новая сессия',
          external: s.external?.provider === 'chatgpt-plugin' })) })) };
  }
  project(id) {
    if (!key(id)) throw fail('PLUGIN_PROJECT_REQUIRED', 'Выберите проект из списка.');
    const matches = this.projects.snapshot().projects.filter(p => p.projectId === id && !p.archivedAt && !p.parentWorkspace);
    if (matches.length !== 1) throw fail('PLUGIN_PROJECT_UNAVAILABLE', 'Проект недоступен. Обновите список проектов.');
    return matches[0];
  }
  async open(projectId) {
    const p = this.project(projectId), info = await this.projects.inspect(p.workspace);
    if (info.projectId !== p.projectId) throw fail('PROJECT_REPLACED', 'В этой папке теперь другой проект.');
    return { project: { id: p.projectId, name: p.displayName || p.name },
      sessions: this.list().projects.find(v => v.id === p.projectId).sessions };
  }
  async connect({ projectId, requestId, metadata }) {
    if (!/^[0-9a-f-]{36}$/i.test(requestId ?? '')) throw fail('PLUGIN_REQUEST_INVALID', 'Создайте сессию кнопкой в панели Workflow Pilot.');
    const conversationKey = pluginConversationKey(metadata), p = this.project(projectId);
    const packet = validateContextPacket(await this.loadContext(p.workspace), p.workspace);
    if (packet.facts.project_id !== p.projectId) throw fail('PROJECT_REPLACED', 'Контекст принадлежит другому проекту.');
    const session = await this.projects.connectExternal(p.workspace, { projectId, requestId, conversationKey });
    this.launch.connected({projectId,requestId,contextBytes:packet.context_bytes,contextSha256:packet.context_sha256});
    this.onChange();
    return { project: { id: p.projectId, name: p.displayName || p.name }, sessionId: session.sessionId,
      workspace: p.workspace, context: packet.context, contextSha256: packet.context_sha256,
      contextBytes: packet.context_bytes, contextSignature: packet.signature,
      instructions: 'Контекст проекта получен через Workflow Pilot. Прочитайте его целиком до работы. Продолжайте в этом разговоре. Не создавайте другой диалог и не запускайте встроенный браузер. Правила и текущий план находятся в recovery.' };
  }
}
