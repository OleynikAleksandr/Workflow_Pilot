# Общий разговор: серверная доставка

Контракт Workflow Pilot 0.6.0 (действует без изменений в 0.6.1), Kit 1.10.5, панель `0.6.1-communication-9`, протокол панели 9. Живая проверка с настоящим ChatGPT — **NOT_RUN**, сценарий: [приёмка](../acceptance/shared-conversation-mac.md). До PASS её шагов 1–4 действует прежнее ограничение [backend](backend.md): продолжение того же разговора во втором браузере или приложении — не штатный сценарий. Нативные Windows/Linux — NOT_RUN. Отложенная мобильная часть — [followup](../planning/shared-backend-mobile-followup.md).

## Назначение

Разговор O или E можно продолжать из любого клиента ChatGPT того же аккаунта: встроенное окно Workflow Pilot, Safari/Chrome, ChatGPT Desktop или ChatGPT Web на iPad/телефоне. Автоматическую доставку сообщений Workflow Pilot (поручения, вопросы, result, acceptance, выбор, Review, служебные) выполняет **только** серверная страница участника в backend. Панель, смонтированная в этом разговоре на другом клиенте, — наблюдатель: показывает ход работ, историю и диагностику, принимает явные действия человека, но не отправляет SDK-уведомлений. Закрытие всех окон и вкладок не останавливает обмен.

Без изменений остаются: старт Chat (q + ticket, расширение поиска), Kit, Review, одна кнопка плана, роли, бюджет уведомлений (3 + цикл до 3 после проверенного восстановления), UNKNOWN без автоматического повтора, DOM-экспорты и HTTP/iPad-клиент кадров. Новых кнопок, режимов, DOM/клавиатурного Send, приватных endpoints, подмены User-Agent и внедрения в DOM ChatGPT нет.

## Владелец доставки и наблюдатели

**Аттестация кадра (Execution).** Панель при mount создаёт неизменяемый `frame_instance_id` (UUID) и публикует только для чтения `globalThis.__workflowPilotPanel={frame_instance_id,build_id,protocol_version}`; `bind` передаёт его вместе с `panel_instance_id`. `src/execution/browser/panel-frame-attestation.mjs` перечисляет `webContents.mainFrame.framesInSubtree` собственной серверной страницы, пропускает главный кадр и кадры его origin и выполняет в каждом постоянный read-only `executeJavaScript` (таймаут 1 с). Порт `attestPanelFrames()` (`session-runtime.mjs`) возвращает `{browserSessionId,incarnation,documentId,frames,stale,attestedAt}`; результат устаревает при смене epoch, navigationSequence или документа. DOM ChatGPT не читается и не меняется; кадры чужих webContents и прежних документов не учитываются.

**Решение (Control).** `src/control/plugin/delivery-ownership.mjs` запрашивает аттестацию вне очереди транзакций (2,5 с) перед bind/sync/claim/claim_ready/verify. Владелец — последний привязанный экземпляр аттестованного кадра текущего документа. Заявления клиента (роль, UA, порядок подключения) не учитываются. `bind`/`sync`/`wait`/`status` возвращают `delivery_role: owner|observer` и `delivery_owner_generation`.

- Поколение растёт только при смене аттестованного кадра, документа или incarnation; повторный recover в том же кадре сохраняет владельца. Поколение влияет на новые claim; попытка в полёте закрывается своим `report`, перемонтирование виджета во время SDK не создаёт UNKNOWN и не тратит бюджет.
- Наблюдатель не получает `message_id` к доставке; `claim`/`claim_ready`/`verify` отвечают `PLUGIN_COMMUNICATION_DELIVERY_OBSERVER` (reason `delivery-observer`) без попытки, без события отказа и без расхода бюджета. Наблюдатель не создаёт и не подтверждает инцидент восстановления уведомлений, не вызывает `connectionWaited` и не учитывается в `livePanel`.
- Наблюдатель может показывать ход и историю, выбирать в карточке выбора (`workflow_communication_choose`, CAS) и выполнять явный Stop плана (`scope=participant`); `scope=panel` отсоединяет только его экземпляр. Цикл доставки панели-наблюдателя не запускается, текст роли — «Доставку выполняет служба Workflow Pilot».
- Нет аттестованного владельца — доставка ждёт с нейтральной причиной `owner-unavailable`; это не отказ и не UNKNOWN. Restart backend забывает экземпляры панелей (они в памяти), владелец появляется после повторных bind и аттестации серверной страницы.

## Свежесть серверной страницы

`src/control/plugin/conversation-freshness.mjs`. Перед каждым автоматическим claim (кроме `startup-context`) страница должна быть свежей: `busy`, либо первичное наблюдение документа не старше `FRESH_DOCUMENT_MS` (20 с), либо это первый claim в документе, перезагруженном самим Control. Время загрузки и монтирования панели в окно не входит. Иначе claim откладывается существующим `claim.deferred` с причиной `freshness-reload` (попытка не создаётся) и Control просит Execution о безопасной перезагрузке. Правило включено, только когда передан порт `reload` (production); изолированные fixtures без порта сохраняют прежнюю семантику.

**Безопасная перезагрузка** `safeReload(chatUrl)` (`session-runtime.mjs`): только сохранённый канонический `chatUrl` без q; не становится попыткой старта и не меняет attempt, ticket, UNKNOWN, бюджет, Stop и допуск плана. Отказ: некорректный адрес, `composer-in-flight`, навигация старта, загрузка, упавший renderer. Control не перезагружает, пока:
- на странице черновик — `freshness-conflict-draft`, черновик не стирается;
- у участника есть claimed-попытка SDK или за последние 10 с был ручной ввод — `freshness-reload-deferred`;
- открыта базовая линия подтверждения (`yielded.page` без `reply_observed`), а нативных отпечатков ходов нет — `awaiting-turn-end`.

Не чаще одной перезагрузки на окно свежести; подряд не более 3 без успешного claim, затем `freshness-unavailable` до ручного открытия разговора. Ожидание удерживается 1 с, чтобы не крутить цикл. После первого claim в перезагруженном документе снова действуют только busy или возраст.

**Ход на другом клиенте.** Если после `yield` страница 15 с не показала `busy` или рост `assistantRevision`, ход шёл на другом клиенте: Control запрашивает ту же перезагрузку и повторяет её через 20, 40, 80 с … до 5 минут, пока новый документ не покажет конец хода.

## Перенос подтверждения хода

Execution ведёт линию документов, связанных собственными перезагрузками (Control или восстановление renderer, до 8 звеньев). Базовая линия сообщения переносится на новый документ этой линии после двух наблюдений с интервалом не менее 2 с: `stopped`, `!busy`, `canSend`, `commandsIdle`, `lastMessageRole==='assistant'` и `turnIdentitySource==='native'`. Тогда пишутся `freshness.rebased` и `reply.observed` с evidence `rebased-fresh-idle`; acceptance, финализация и cleanup продолжаются как обычно. Без нативных отпечатков перенос не выполняется и перезагрузка запрещена (`awaiting-turn-end`). Любая другая смена документа перенос не разрешает.

## Ветвление разговора

Observer страницы публикует `turnVariant: single|multiple|unknown` последнего пользовательского хода (переключатель вариантов, `chatgpt-dom.mjs`). `multiple` после `reply_observed` сообщения, доставленного службой, ставит `branch_conflict` участника с отпечатком хода, пишет `freshness.branch` и ставит план на паузу через `ExecutionControl.block` с кодом `CONVERSATION_BRANCH` (во время хода — pausing). Используется существующая причина `blocked`, поэтому запись читается и версией 0.5.41. Причина: «Разговор разветвился: откройте его, выберите нужную ветку и нажмите «Продолжить»». «Продолжить» снимает конфликт запомненного хода (`branch_acknowledged`, `freshness.branch_resolved`); новый конфликт возможен только на более новом пользовательском ходе. Outbox, UNKNOWN и история сохраняются, повторной отправки нет. `unknown` не блокирует и однократно журналируется `freshness.variant_unknown`. Надёжность селектора на реальной странице не проверена (NOT_RUN).

## Причины в интерфейсе

Проекция общая для [текущих действий](current-actions.md) и MCP-панели; sidebar их не дублирует, новых кнопок нет.

| Причина | Вид | Текст |
| --- | --- | --- |
| `owner-unavailable` | нейтрально | Доставку выполняет служба; ожидаем панель её серверной страницы |
| `freshness-reload` | нейтрально | Обновляем серверную страницу разговора перед доставкой |
| `freshness-reload-deferred` | нейтрально | Обновление отложено до конца отправки или ручного ввода |
| `awaiting-turn-end` | нейтрально | Ожидаем подтверждение конца хода |
| `freshness-conflict-draft` | оранжево | Отправьте или очистите черновик в окне Workflow Pilot |
| `freshness-unavailable` | оранжево | Серверная страница не готова к доставке: откройте разговор во встроенном окне |
| `CONVERSATION_BRANCH` | оранжево, пауза плана | Выберите нужную ветку и нажмите «Продолжить» |

## Диагностика identity

`plugin.py` передаёт для вызовов панели и модели только **имена** ключей `_meta` хоста (`meta_keys`, до 32); значения передаются лишь в прежнем `metadata` для проверки identity и не сохраняются. Control (`src/control/plugin/identity-trace.mjs`) хранит в памяти текущего boot до 500 записей `identity.observed`/`identity.unmatched`: время, источник (`panel-recover`, `panel-bind`, `model-panel`, `model-read`, `model-yield`, `model-call`), префикс 8 символов identityHash, `panel_instance_id`, `delivery_role`, имена ключей. Каждая запись также пишется в `dataDir/diagnostics/backend-events.jsonl`, а не в WAL. Отказ BINDING в инструменте модели даёт `identity.unmatched`. Экспорт `workflow_communication_export` для O добавляет в summary `identity` — записи текущего boot с начала своего run. Тексты, q/ticket, raw metadata и секреты исключены.

## Совместимость, переход и откат

- Схемы WAL `plugin-communication` (registry 2, schema 2), WorkspaceSessions, Kit, devices и журнала операций не изменены; добавлены только типы событий `freshness.*` и необязательные поля (`branch_conflict`, `claim_wait_reason` и др.). Тест читает журнал 0.6.0 замороженной копией хранилища 0.5.41 (`tests/fixtures/released-communication-0.5.41/`) без отказа и потери сообщений/UNKNOWN, а 0.6.0 читает дописанное ею.
- **Переход на протокол 9.** Поставить активный план на «Паузу» → установить 0.6.0 → обновить инструменты коннектора Workflow Pilot в ChatGPT → попросить агента в каждом активном разговоре O/E один раз вызвать `workflow_pilot_panel` → «Продолжить». Старый iframe протокола 8 получает отказ версии с обеими версиями и этой инструкцией.
- **Откат на 0.5.41.** «Пауза» → остановка службы → установка 0.5.41 штатным installer → обновление инструментов коннектора и повторный `workflow_pilot_panel` → «Продолжить». Сообщения, назначения, UNKNOWN и история сохраняются; признаки владельца, свежести и ветвления 0.5.41 игнорирует.

## Модули и проверки

Execution: `panel-frame-attestation.mjs`, `session-runtime.mjs` (аттестация, документ и линия, `safeReload`), `chatgpt-dom.mjs`/`chatgpt-page-observer.mjs`/`page-state.mjs` (`turnVariant`). Control: `delivery-ownership.mjs`, `conversation-freshness.mjs`, `identity-trace.mjs`, `communication.mjs`, `workflow-channel.mjs`, `coordination.mjs`, `dialogue-delivery.mjs`. Frontend: `launch.mjs`, `panel.mjs`. Контракты: `backend.mjs` (протокол 9), `plugin-communication.mjs`, `dialogue-view.mjs`. Проверки: `panel-frame-attestation` (настоящий Electron, HTTPS и вложенные кадры разных origin), `delivery-ownership`, `conversation-freshness`, `shared-conversation-compat`, `delivery-ui-targeted`, `chatgpt-plugin`.

Принятая спецификация: [основная](https://github.com/OleynikAleksandr/Workflow_Pilot/blob/bdc75faf014ce3d06c6d4e4bb615b5cb5e57977a/docs/planning/shared-conversation-mac.md) и [свежесть, откат, проверка](https://github.com/OleynikAleksandr/Workflow_Pilot/blob/bdc75faf014ce3d06c6d4e4bb615b5cb5e57977a/docs/planning/shared-conversation-mac-freshness.md).

## Ограничения

- Поведение настоящего ChatGPT не проверено: доступность кадра панели для аттестации, автообновление открытого документа, признак ветви и совпадение `openai/session` между клиентами. Если кадр панели недостижим (нет владельца), функция не работает и решение об откате принимает пользователь; запасной путь через preload в подкадрах в выпуск не входит.
- Гонка ручного хода на другом клиенте с серверной доставкой может создать ветку; она обнаруживается и ставит план на паузу, но не предотвращается.
- Мобильные приложения, API v2, автозапуск службы и публичный адрес — [followup](../planning/shared-backend-mobile-followup.md).
