import { createHash } from 'node:crypto';
import { RuntimeError } from './errors.mjs';
export const CONTEXT_PROTOCOL = 'inline-context-v1';

export function validateContextPacket(packet, workspace) {
  if(packet?.recovery_profile!==undefined&&packet.recovery_profile!=='assignment-dialogue-v1')
    throw new RuntimeError('MCP_CONTEXT_PROFILE','Неизвестный профиль recovery. Контекст не отправлен.');
  if (packet?.delivery_protocol !== CONTEXT_PROTOCOL || packet.ack_required !== false) {
    throw new RuntimeError('MCP_UPDATE_REQUIRED', 'Нужна обновлённая версия локальных инструментов с прямой передачей контекста.');
  }
  if (packet.workspace !== workspace) throw new RuntimeError('MCP_CONTEXT_MISMATCH', 'Получен контекст другой папки.');
  const facts = packet.facts;
  const factNames = ['project_id', 'project_name', 'plan_revision', 'scope_id', 'execution_scope_status', 'delivery_status', 'task_id', 'task_title'];
  if (packet.status !== 'ready' || packet.completeness !== 'COMPLETE' || typeof packet.context !== 'string'
      || !packet.context.trim() || typeof packet.signature !== 'string' || !packet.signature
      || !facts || factNames.some(key => !(key in facts)) || Object.keys(facts).length !== factNames.length
      || typeof facts.project_id !== 'string' || !facts.project_id || typeof facts.project_name !== 'string'
      || !Number.isSafeInteger(facts.plan_revision) || facts.plan_revision < 0
      || !Number.isFinite(packet.generated_at_ms) || ['probe_id', 'challenge'].some(key => key in packet)) {
    throw new RuntimeError('MCP_CONTEXT_INCOMPLETE', 'Получен неполный пакет контекста.');
  }
  const bytes = Buffer.byteLength(packet.context, 'utf8');
  if (bytes > 180000) throw new RuntimeError('MCP_CONTEXT_TOO_LARGE', 'Пакет контекста слишком велик. Нужно уменьшить его состав в Workflow Kit.');
  if (bytes !== packet.context_bytes || createHash('sha256').update(packet.context, 'utf8').digest('hex') !== packet.context_sha256) {
    throw new RuntimeError('MCP_CONTEXT_DAMAGED', 'Полный текст контекста не прошёл проверку целостности.');
  }
  const parts = packet.parts, limit = packet.budget?.document_bytes ?? 28000;
  if (!Number.isSafeInteger(limit) || limit < 1 || !Array.isArray(parts) || !parts.length)
    throw new RuntimeError('MCP_UPDATE_REQUIRED', 'Workflow Kit должен подготовить части контекста для вложений.');
  if (parts.some((part, index) => typeof part.text !== 'string' || part.index !== index + 1
      || part.total !== parts.length || Buffer.byteLength(part.text, 'utf8') !== part.bytes
      || part.bytes > limit || createHash('sha256').update(part.text, 'utf8').digest('hex') !== part.sha256)
      || parts.map(part => part.text).join('\n\n') !== packet.context)
    throw new RuntimeError('MCP_CONTEXT_DAMAGED', 'Части контекста не прошли проверку состава, размера или целостности.');
  return packet;
}
