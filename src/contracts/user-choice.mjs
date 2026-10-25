// Shared contract of the user's choice card: Control builds it, the panel and the window render it.
export const CHOICE_KINDS = Object.freeze(['refused', 'review', 'acceptance', 'mode', 'second-session']);
// One card per session: the most urgent cause is shown, the others wait.
export const CHOICE_PRIORITY = Object.freeze({ review: 0, refused: 1, acceptance: 2, mode: 3, 'second-session': 4 });
export const CHOICE_STATES = Object.freeze(['offered', 'saving', 'postponed', 'chosen', 'declined', 'stale']);
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
  if(record.state==='chosen'&&delivery==='read')return null;
  const chosen = record.options.find(o => o.id === record.chosen_option) ?? null;
  return { choice_id: record.choice_id, generation: record.generation, kind: record.kind, state: record.state,
    question: record.question, reason: record.reason ?? null,error:record.save_error??null,
    options: record.options.map((o, index) => ({ id: o.id, label: o.label, detail: o.detail, recommended: index === 0 })),
    chosen: chosen ? { id: chosen.id, label: chosen.label, delivered: delivery === 'read',uncertain:record.effect_state==='unknown', error: record.error ?? null } : null };
}
export const choiceSender = 'Пользователь';

// The card markup shared by the plugin panel and the window: same contract, same look.
export const choiceCardCss=`
.wp-choice{display:grid;gap:8px;padding:10px 12px;border:1.5px solid var(--wp-choice);border-radius:10px;background:var(--wp-choice-soft)}
.wp-choice.pulse{animation:wp-choice-pulse 1s ease-in-out 3}
@keyframes wp-choice-pulse{0%,100%{box-shadow:0 0 0 0 var(--wp-choice-glow)}50%{box-shadow:0 0 0 6px var(--wp-choice-glow)}}
@media(prefers-reduced-motion:reduce){.wp-choice.pulse{animation:none}}
.wp-choice-title{display:flex;gap:6px;align-items:baseline;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--wp-choice)}
.wp-choice-question{margin:0;font-weight:600;color:var(--wp-fg);line-height:1.4}
.wp-choice-reason{margin:0;font-size:12px;color:var(--wp-muted)}
.wp-choice-options{display:grid;gap:6px;margin:0;padding:0;list-style:none}
.wp-choice-option{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;padding:7px 9px;border:1px solid var(--wp-line);border-radius:8px;background:var(--wp-card)}
.wp-choice-option b{font-weight:600;color:var(--wp-fg)}.wp-choice-option small{display:block;margin-top:2px;font-size:12px;color:var(--wp-muted);line-height:1.35}
.wp-choice-mark{color:var(--wp-choice);font-weight:600}
.wp-choice-option button{font:inherit;font-size:12px;cursor:pointer;border-radius:7px;padding:5px 10px;border:1px solid var(--wp-choice);background:transparent;color:var(--wp-choice);white-space:nowrap}
.wp-choice-option.recommended button{background:var(--wp-choice);color:var(--wp-choice-on)}
.wp-choice-option button:disabled{opacity:.5;cursor:default}
.wp-choice-hint,.wp-choice-state{margin:0;font-size:12px;color:var(--wp-muted)}
.wp-choice-state.error{color:var(--wp-warn)}
`;
// Renders a choice view into container; returns nothing. pick(optionId) and reopen() are the client's calls.
export function renderChoiceCard(document,container,view,{pick,reopen,busy=false}={}) {
  const make=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
  container.replaceChildren();
  if(!view){container.hidden=true;delete container.dataset.choice;return;}
  container.hidden=false;
  // A new card pulses three times; redraws of the same card stay still.
  const fresh=container.dataset.choice!==view.choice_id;container.dataset.choice=view.choice_id;
  container.className='wp-choice'+(fresh&&view.state==='offered'?' pulse':'');
  container.setAttribute('role','group');container.setAttribute('aria-label','Выбор пользователя');
  const title=make('p','wp-choice-title');title.append(make('span',null,'Выбор пользователя'));
  container.append(title,make('p','wp-choice-question',view.question));
  if(view.state==='postponed'){
    const again=make('button',null,'Показать варианты');again.type='button';again.disabled=busy;again.addEventListener('click',()=>reopen?.());
    const row=make('div','wp-choice-option');row.append(make('span','wp-choice-state','Ждёт приёмки: вы решили проверить сами.'),again);
    container.append(row);return;
  }
  if(view.state==='chosen'){
    const text=view.chosen?.error?'Выбор не выполнен: '+view.chosen.error:'Выбрано: «'+view.chosen?.label+'» · '+(view.chosen?.delivered?'передано агенту':'передаётся агенту');
    container.append(make('p','wp-choice-state'+(view.chosen?.error?' error':''),text));return;
  }
  if(view.reason)container.append(make('p','wp-choice-reason','Почему рекомендует агент: '+view.reason));
  const list=make('ul','wp-choice-options');
  for(const option of view.options){
    const row=make('li','wp-choice-option'+(option.recommended?' recommended':'')),text=make('span');
    const name=make('b',null,option.label);text.append(name);
    if(option.recommended)text.append(' ',make('span','wp-choice-mark','(рекомендую)'));
    if(option.detail)text.append(make('small',null,option.detail));
    const button=make('button',null,'Выбрать');button.type='button';button.disabled=busy;
    button.setAttribute('aria-label','Выбрать: '+option.label);button.addEventListener('click',()=>pick?.(option.id));
    row.append(text,button);list.append(row);
  }
  container.append(list,make('p','wp-choice-hint','или напишите ответ в чат своими словами'));
}
