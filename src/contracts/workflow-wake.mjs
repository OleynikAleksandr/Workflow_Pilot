// The DOM observer recognizes only an exact Pilot wake. The backend separately
// verifies that every extracted ID belongs to a handled send in this conversation.
export function workflowWakeText(messageId, legacy = false) {
  const args = JSON.stringify({message_id:messageId});
  if (legacy) return 'Адресное сообщение Workflow Pilot. Вызови workflow_communication_read_message с аргументами '+args+
    '. Не открывай другую панель и не повторяй уведомление. Чтение сообщения — отдельная квитанция.';
  return 'Workflow Pilot. Прочти входящие через workflow_communication_read_message с аргументами '+args+'. Обработай pending_incoming.';
}
