// Shared contract of the user's choice card: Control builds it, the panel and the window render it.
export const CHOICE_KINDS = Object.freeze(['refused', 'review', 'acceptance', 'mode', 'second-session']);
// One card per session: the most urgent cause is shown, the others wait.
export const CHOICE_PRIORITY = Object.freeze({ review: 0, refused: 1, acceptance: 2, mode: 3, 'second-session': 4 });
export const CHOICE_STATES = Object.freeze(['offered', 'postponed', 'chosen', 'declined', 'stale']);
const MODE_TEXT = {
  sequential: { label: 'Выполнить самому, последовательно', detail: 'Эта сессия выполняет задачи по порядку в основном checkout. Меньше координации; для небольших и связанных задач.' },
  orchestrated: { label: 'Оркестрация с исполнителями', detail: 'Сессия становится оркестратором, задачи выполняют исполнители в своих worktree, возможна параллельность. Для больших или независимых задач.' },
};
const clip = (text, size) => typeof text === 'string' && text.length > size ? text.slice(0, size - 1) + '…' : text ?? '';
// Each option: label, detail, optional app action and optional message to the agent.
export function choiceOptions(kind, facts = {}) {
  if (kind === 'refused') return {
    question: 'Kit отказал в назначении' + (facts.task_id ? ' ' + facts.task_id : '') + ': ' + clip(facts.message || 'причина не указана', 300),
    options: [
      { id: 'fix', label: 'Поручить оркестратору устранить причину', detail: 'Оркестратор разберёт отказ и исправит причину в границах плана; затем скажет, что можно продолжить.',
        message: 'Kit отказал в назначении' + (facts.task_id ? ' ' + facts.task_id : '') + ': ' + clip(facts.message, 1000) + '. Устрани причину в границах плана. Если нужно изменить scope, спроси пользователя. Когда готово, скажи пользователю, что можно нажать «Продолжить».' },
      { id: 'continue', label: 'Причина устранена — продолжить', detail: 'Приложение снимет паузу, как кнопка «Продолжить».', action: 'continue' },
      { id: 'discuss', label: 'Обсудить с оркестратором', detail: 'Оркестратор объяснит причину и варианты, ничего не меняя.',
        message: 'Kit отказал в назначении' + (facts.task_id ? ' ' + facts.task_id : '') + ': ' + clip(facts.message, 1000) + '. Объясни пользователю причину и варианты. Ничего не меняй.' },
    ] };
  if (kind === 'acceptance') return {
    question: 'Работа по плану завершена. Принять результат?',
    options: [
      { id: 'accept', label: 'Принять результат и закрыть план', detail: 'Агент закроет план командой archive с вашим решением.',
        message: 'Пользователь принимает результат. Закрой план: ./scripts/workflow archive --scope ' + (facts.scope_id ?? '<scope>') + ' --approval-note "Выбор пользователя в панели: принять и закрыть".' },
      { id: 'revise', label: 'Нужна доработка', detail: 'План остаётся открытым; агент спросит, что доработать.',
        message: 'Пользователь просит доработку. План не закрывай; спроси пользователя, что именно доработать.' },
      { id: 'later', label: 'Проверю сам и вернусь', detail: 'Карточка свернётся; варианты можно открыть снова.', action: 'postpone' },
    ] };
  if (kind === 'second-session') return {
    question: 'План проекта готовит другая сессия. Как поступить с этой?',
    options: [
      { id: 'discussion', label: 'Оставить эту сессию обсуждением', detail: 'Здесь можно обсуждать и исследовать; план готовит другая сессия.', action: 'dismiss' },
      { id: 'transfer', label: 'Передать планирование этой сессии', detail: 'Эта сессия станет владельцем планирования; прежний выбор режима сбросится.', action: 'transfer' },
    ] };
  if (kind === 'review') return {
    question: 'Ревью плана ждёт вашего решения: автор и рецензент не согласились.',
    options: [
      { id: 'discuss', label: 'Сначала обсудить спор', detail: 'Агент изложит суть спора, позиции и свою рекомендацию; ничего не опубликует.',
        message: 'Изложи пользователю суть спора ревью, позиции автора и рецензента и свою рекомендацию. Ничего не публикуй.' },
      { id: 'publish', label: 'Опубликовать с позицией автора', detail: 'Публикация со спором: review:resolve publish и review:publish.',
        message: 'Пользователь разрешает публикацию со спором: ./scripts/workflow review:resolve --action publish --note "Выбор пользователя в панели: опубликовать с позицией автора", затем ./scripts/workflow review:publish.' },
      { id: 'reviewer', label: 'Принять замечания рецензента', detail: 'Агент исправит спецификацию и план и начнёт новый раунд.',
        message: 'Пользователь принимает замечания рецензента: ./scripts/workflow review:resolve --action retry --note "Выбор пользователя в панели: принять замечания рецензента", исправь спецификацию и план, затем review:prepare и review:run.' },
    ] };
  if (kind === 'mode') {
    const modes = [facts.recommended, facts.recommended === 'orchestrated' ? 'sequential' : 'orchestrated'];
    return { question: 'Как выполнять план этой сессии?', reason: clip(facts.reason, 300),
      options: [...modes.map(mode => ({ id: mode, ...MODE_TEXT[mode], action: 'mode', strategy: mode,
        message: 'Режим выбран пользователем: ' + (mode === 'sequential' ? 'выполнить самому, последовательно' : 'оркестрация с исполнителями')
          + '. Составь план с execution_strategy ' + mode + ' и execution_origin_session_id этой сессии.' })),
      { id: 'spec', label: 'Сначала доработать спецификацию', detail: 'Режим не выбран; обсуждение спецификации продолжается.',
        message: 'Пользователь пока не выбрал режим: сначала доработаем спецификацию. План не составляй; продолжи обсуждение.' }] };
  }
  throw Object.assign(new Error('Неизвестный вид выбора: ' + kind), { code: 'USER_CHOICE_KIND' });
}
// The first option is the recommended one in every card.
export function choiceView(record, delivery = null) {
  if (!record || !['offered', 'postponed', 'chosen'].includes(record.state)) return null;
  const chosen = record.options.find(o => o.id === record.chosen_option) ?? null;
  return { choice_id: record.choice_id, generation: record.generation, kind: record.kind, state: record.state,
    question: record.question, reason: record.reason ?? null,
    options: record.options.map((o, index) => ({ id: o.id, label: o.label, detail: o.detail, recommended: index === 0 })),
    chosen: chosen ? { id: chosen.id, label: chosen.label, delivered: delivery === 'read', error: record.error ?? null } : null };
}
export const choiceSender = 'Пользователь';
