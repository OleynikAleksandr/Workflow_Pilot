# Плагин Workflow Pilot — автоматический диалог

Workflow Pilot 0.5.38, Kit 1.10.3, протокол панели `6`, build `0.5.38-communication-6`. Ресурс — `ui://workflow-pilot/panel-<sha256 полного HTML>.html`. Константы находятся в contracts/backend; staging сверяет package и подставляет их в HTML. [Приёмка A–D](automatic-agent-dialogue-acceptance.md) пока NOT_RUN: fixtures не доказывают автономность настоящего ChatGPT. [Постоянный SDK](sdk-messaging.md) обслуживает все рабочие сообщения без режима включения.

## Пользовательский путь

Основная панель Workflow Pilot обслуживает стартовый контекст любой локальной сессии и рабочий диалог. PiP-пробник отсутствует.

1. Пользователь создаёт новый обычный Chat. [URL-команда с тикетом](chat-only-startup.md) открывает workflow_pilot_panel без DOM-ввода/вложений. Ответ включает первую часть recovery; агент дочитывает остальные и подтверждает SHA в том же ходе. Iframe/SDK и разрешение плана проверяются отдельно.
2. До окончательного Review/публикации автор сохраняет полные [подготовленные поручения](prepared-tasks.md) всех обычных задач и DOCS: байты, hash, автор/project/scope и semantic digest. Публикация связывает scope с execution_origin_session_id и не запускает работу.
3. Одна кнопка Start после preflight разрешает scope. Control/ParallelExecution создаёт настоящие назначения/worktree/Chat E; backend механически связывает и авторизует согласованный пакет, доставляя после SDK/bind и подтверждения принадлежности документа без нового хода O для сочинения. Старые brief-only планы сохраняют поздний prepare O. Backend assignment-start — только прежний контракт.
4. Поручения, продолжения, вопросы/решения, интеграции, delivery и итог передаются через канал. Пользователь не переносит run/participant, не открывает панели исполнителей, не вызывает join/Enable и не пишет «продолжай» при обычной технической блокировке.

Панель не создаёт второй scheduler. Kit остаётся источником задач, назначений, проверок и DONE; локальный коммит исполнителя требует проверенной интеграции. [Оркестрация](orchestrated-execution.md) определяет волны и итоговую очистку. URL передаёт только приглашение панели. Правила и identity всех ролей читаются через MCP; прежние Review/legacy сохраняют отдельные контракты. [Роли, рабочий API и приёмка результатов](assignment-dialogue.md) определяют dialogue_version=1. Рабочий маршрут только `plugin-v1`, включая старые планы. Старые отправки sending/UNKNOWN сохраняют запрет повтора; без доказанной identity возникает предметный отказ подключения, без DOM fallback.

## Регистрация и адресация

Control резервирует случайное 32-байтовое приглашение на 30 минут для точных project/local session/origin/role/scope/assignment/task. Backend хранит только hash; значение передаётся целевым bootstrap и не включается в общий журнал, экспорт или Git. Регистрация существующей локальной сессии не создаёт external-дубликат. Повтор той же identity идемпотентен, в том числе после потери ответа; перенос в другой разговор, истёкшее приглашение и заменённое назначение запрещены.

Участники индексируются по participant_id: один O и несколько E (fixtures — пять E). Роль выбирает сервер. Run связан с проектом и исходной сессией O, разрешение — с scope и поколением. Чужой кандидат не захватывает план; с 0.5.29 уступивший планирование получает `role_update` в ответе панели. Публикация проверяется свежим чтением до role reconciliation.

Каждый MCP-запрос использует свежие host metadata. `openai/session` обязателен, organization/subject могут отсутствовать; нормализованная identity хешируется, исходные значения не сохраняются. Название/URL чата, sidebar, клиентские IDs и заявление роли не удостоверяют адресата. При регистрации, чтении и перед Send проверяется действующее назначение; завершённый/заменённый исполнитель не получает новые поручения. Оркестратор видит реестр своего плана, исполнитель — своё назначение. Реестр не выдаёт приглашения, raw metadata или чужие worktree.

Конверт содержит message_id, scope, assignment/task/attempt, проверенного автора/адресата, kind, in_reply_to, block_id/signal_id, idempotency key и ссылки на контекст. Рабочие типы: task, context_request, context, question, clarification, decision, result, revision_request, acceptance; service ready/recovery/finalization имеет автора backend. Legacy сохраняет прежние assignment-start/continue/integration. Содержимое не расширяет полномочия.

## Разрешение и срок жизни

Start/Continue после свежего preflight выдаёт допуск текущему scope/generation без 30-минутного лимита. SDK lease — 60 секунд. Status/progress/admission используют единый предикат identity/run/member/generation/live lease/message_supported. Исторический handshake и running не означают готовность. При generation-mismatch/lease-expired выполняется один status→sync→wait с epoch/abort/single-flight/backoff; поздний callback не меняет новый binding. Sync подтверждает присутствие, не выдаёт grant и не снимает ручную паузу. Плановый пакет переавторизуется после Continue по свежему допуску, старый draft требует сверки O.

| Событие | Поведение |
| --- | --- |
| Публикация | Панель готова, рабочих уведомлений нет |
| Running | Новые назначения и адресные сообщения разрешены |
| Пауза запрошена | В dialogue_version=1 новые назначения/пробуждения/интеграции запрещены; текущий ход сохраняет outbox и безопасно заканчивает команды |
| Заблокированное назначение без активных команд | Может быть припарковано, чтобы пауза не ждала бесконечно; Continue возобновляет |
| Ручной Stop панели | Немедленно отзывает отправки всего плана и отражается паузой; уже переданный SDK-запрос не отменяет |
| pagehide/dispose/смена контекста | Отсоединяет экземпляр панели; не отзывает допуск плана или нового экземпляра |
| Закрытие окна Workflow Pilot | При живом backend страницы и разрешение сохраняются |
| Restart службы/компьютера | Сообщения/назначения сохранены, допуск отозван; одна кнопка «Продолжить» восстанавливает работу без повторного bootstrap и UNKNOWN Send |
| Архив/отмена/новый scope/замена назначения | Старое разрешение не наследуется |
| Завершение | Финальные интеграции, delivery, cleanup и итоговый ход завершаются до отзыва; ждать ручной приёмки/archive не нужно |

Ожидание не запускает модельные ходы и не расходует модельные токены само по себе; оно использует браузер, память, локальную службу, сеть и журнал. Доставленное уведомление запускает обычный ход ChatGPT. Уничтоженный хостом iframe не гарантирует фоновую доставку: восстановленная панель должна заново подтвердить готовность.

## Доставка и блокировки

Claim_ready проверяет identity/document/attempt/grant, Stop и UNKNOWN; intent сохраняется до SDK. После accepted следующий pending доступен без busy/read/yield/команд. Тайм-ауты, lease и отдельные terminal receipts — в [едином контракте SDK](sdk-messaging.md).

`pending → claimed → accepted/rejected/unknown`; чтение и наблюдённый ответ независимы. Потеря claim/report не возвращает pending. UNKNOWN и остальные терминальные исходы не повторяются через SDK или DOM. После restart claimed становится unknown. Стартовый контекст имеет [отдельный контракт](orchestrator-startup.md). Рабочий контекст хранится целиком, до 1 MiB, читается частями до 12000 байт UTF-8 с total/sha256; усечения нет, доступ проверяется на каждой части.

Рабочий model API — workflow_assignment_prepare/dispatch/send/yield/status: черновик O без grant, его отправка после готовности, вопрос, решение, result и acceptance. Intent сохраняется до идемпотентного эффекта Kit и публикации WAL. Yield.reason явно ограничен awaiting_reply/tasks_sent/result_sent/handled. Совместимые task:block/assignment:message используют ту же корреляцию без дублирования MCP-вызова агентом. Clarification не снимает block_id; только актуальный decision resume=true возобновляет. [Контракт сообщений](assignment-dialogue.md#model-api).

[Ролевой протокол Kit](../../packages/workflow-kit/docs/modules/orchestrated-plans.md#сигналы) — role-protocol.mjs, версия 12: O отбирает контекст, выдаёт task, уточняет и принимает result; E спрашивает O и обязательно отправляет result после проверенного commit. Общая среда — один владелец при припаркованных E; третья неудачная попытка требует эскалации. Обновление правил не повторяет task:start. Старые сигналы не переписываются и не снимают новую блокировку.

## MCP и SDK

SDK: ext-apps 1.7.5, mcp-extensions 0.2.0, MCP 1.32.1. Настоящий `App.callServerTool` вызывает MCP; `OpenAIExtensions.message.send` требует `experimental["openai/message"]`. Отправка — ui/message с role=user, target=active, send=true. Стандартного ui/message недостаточно. [Спецификация расширения](https://github.com/openai/mcp-extensions/blob/main/docs/spec.md), [metadata](https://developers.openai.com/plugins/reference).

| Операция | Доступ и контракт |
| --- | --- |
| workflow_assignment_send / yield / status | Model-only; task/context/вопросы/result/acceptance, квитанции обработки и свой реестр без user transport ID |
| workflow_assignment_prepare / dispatch | Model-only O; prepare(dispatch_when_ready=true) либо dispatch(when_ready=true) явно разрешает отправку при готовности; без флага только прежний контракт |
| workflow_assignment_migrate | Model-only; явный безопасный переход старого scope от O после паузы |

| workflow_pilot_panel | Model, optional enrollment_ticket; мутация регистрации и UI. Без приглашения открывает существующую панель. Успех вызова не доказывает mount/SDK |
| communication_read_message | Model, message_id; workflow выводит участника из identity, legacy принимает run_id/participant_id; сохраняет read, возвращает текущие инструкции роли |
| communication_read_context | Model, message_id/context_ref/part=0; прочитать 0…total−1 перед работой |
| communication_participants | Model, без аргументов; актуальный разрешённый реестр |
| communication_recover | App, свежая identity; автоматическое обнаружение своего назначения без выдачи допуска |
| communication_bind / sync | App, binding/message_supported; bind подтверждает новую панель, sync продлевает присутствие и читает существующий допуск |
| communication_wait | App, binding/after_seq; один long-poll до 25 секунд, продление живой lease своего поколения |
| communication_claim / verify / report | App, binding/message_id, для verify/report delivery_attempt_id; report: accepted/rejected/unknown |
| communication_claim_ready | App; объединённые claim/verify с durable intent до SDK |
| communication_choose | App; нажатие карточки [выбора пользователя](user-choice.md), CAS по choice_id и поколению |
| session_set_title | Model; первое содержательное имя своей сессии до плана, только title; [контракт](session-titles.md) |
| communication_stop | App, binding/scope; participant — явный Stop всего workflow-плана или одного legacy-участника; panel — отсоединение workflow-экземпляра или legacy Stop его поколения |
| communication_status / journal / export | Model/App, run_id/participant_id; journal/export по 100 событий, export фиксирует through_seq до complete |
| communication_telemetry / telemetry_batch | App; очищенное событие или до 16 событий с event_id/client_sequence |

Имена communication_* имеют префикс `workflow_`. Binding: run_id, participant_id, panel_instance_id, protocol_version, build_id и permission_generation для доставки; посторонние поля отклоняются. Read-only: status/journal/export/recover/participants/read_context. Регистрация, read-квитанция и остальные мутации имеют readOnlyHint=false. Ответы communication содержат panel_resource_uri текущего immutable MCP snapshot; это диагностика каталога, не новое UI-вложение или доказательство старого iframe. Recover также сообщает assignment_dialogue_version и role_protocol_version.

Legacy-only join/send_message/probe/enable — отдельный [ручной эксперимент P0/P1](plugin-communication-handoff.md) (Enable на 30 минут, body до 4096 байт); к рабочему плану backend их не применяет.

Свежая metadata подтверждает наблюдаемый момент, но verify и SDK target:active не атомарны; хост может не сообщить навигацию. Host confirmations не обходятся; необходимость подключать каждый новый чат вручную — FAIL автоматизации A–D.

## Хранение, UI и диагностика

Control PluginCommunication сериализует мутации и подтверждает после append+fsync. Проверенные факты проекта/назначения поступают через PluginProjects и узкий DialogueDelivery; протокол не читает Kit, fs или Electron. Execution обслуживает приватный мост и store; Frontend — SDK. Границы [Control](control.md)/[Execution](execution.md) сохраняются.

WAL в собственном `plugin-communication`: legacy schema 1, workflow registry/WAL 2; состояние и последовательные события с SHA-цепочкой, без второго snapshot. Неизвестный формат отклоняется до записи, старый журнал не мигрирует молча. Контекст — неизменяемый файл по hash с fsync/O_NOFOLLOW и проверкой SHA при чтении. Повреждение, неполный хвост, внешний размер или symlink блокируют запись и сохраняют исходник/доступный префикс. На POSIX синхронизируется также каталог. Лимиты: 100 runs, 256 приглашений, 2048 workflow-сообщений (256 legacy), 20000 событий/run, WAL до 512 MiB. Превышение — явный отказ.

Новый panel_instance_id создаётся при mount. Handshake → recover → bind → sync; поздний SDK восстанавливается ограниченно без модельных ходов. Исторический tool-result не управляет актуальным допуском. Sync при ожидании разрешения — раз в две секунды; рабочий wait продлевает живую lease сам. Backoff ошибок 250–5000 мс; binding/version/storage прекращает доставку, ошибка не повторяет Send. Refresh объединён (500 мс) и не блокирует доставку.

### Ход работ в панели

Основной вид O/E/S: название, счётчик main, одна главная причина и независимая работа; [выбор](user-choice.md), история и диагностика. WorkProgress приходит через status/sync/wait без секретов; права сырых сообщений прежние. Offered оранжевый, chosen нейтральный, read переносит выбор в историю; startup-успех исторический. [Инструкция и таймер](current-actions.md) не перекрываются. Клиентская кнопка/dialog удалены; HTTP без MCP iframe не имеет fallback выбора. Review читает канонический Kit; раунды и позиции сохраняются после публикации/cleanup. Стадии следуют квитанциям. Sidebar не дублирует ленту. Закрытый план без spinner/wait; complete ждёт приёмки. Диагностика сохраняет binding/SDK/Stop/roster/outbox/export; preview не отмечает read. Удаление отзывает допуск, поздний вызов — PROJECT_REMOVED. Палитра общая, host data-theme приоритетен.

Журнал «Диагностики» — последние 200 событий; экспорт фиксирует through_seq и полноту. Телеметрия идёт пакетами (буфер 64, пакет до 16) отдельно от доставки, с client_time/server_received_at, монотонными длительностями и frontend.gap/diagnostic.gap; она не будит функциональную очередь. Intent ≠ invocation, accepted ≠ read; секреты, raw metadata и аргументы инструментов в spans не входят. [Тайминги и экспорт](dialogue-timing.md).

Ошибки имеют isError/structuredContent.error и префикс PLUGIN_COMMUNICATION_: IDENTITY_REQUIRED, BINDING, VERSION, UNSUPPORTED, STOPPED, ASSIGNMENT_CHANGED, PROJECT_REMOVED, ENROLLMENT/ENROLLMENT_EXPIRED/ENROLLMENT_REVOKED, MODE, CLAIM_DENIED, READ_DENIED, STALE_MESSAGE, CONTEXT, CONFLICT, STORE_*, LIMIT и ошибки входа/курсора. Не маскировать их повторным join/Enable или DOM Send.

Код ошибки сохраняется при отклонении SDK Promise, включая структурированный STOPPED. При потере кода свежий status различает complete, pause и непригодную lease/generation конкретной панели; недоступный status не означает complete. Разрешённый recovery делает один sync с подтверждённой identity, затем заменяет binding до нового wait. Binding/version/storage/removal останавливают доставку с точной причиной; transient network повторяет безопасные чтения с backoff. Никакого повторного Send или обхода manual Stop; новый mount не оживляется старым callback.

## Прямое подключение и поставка

`workflow_open_project {project_id?}` читает проекты/сессии без UI. `workflow_connect_project {project_id,request_id?}` отдельно связывает уже открытый внешний разговор, проверяет inline-context-v1 (полноту/размер/SHA/identity), возвращает полный recovery; повторы не создают дубликат. Облачный проект/история не меняются, выбор внешней сессии не создаёт страницу и выполнение плана. Старые кнопки создания чатов и навигационные пробы удалены.

Мост backend: loopback, приватный descriptor 0600 с токеном, Host/Origin проверяются. Исторические PLUGIN_DESKTOP_REQUIRED/UNAVAILABLE означают недоступную службу. Окно не требуется; donor-профиль не используется.

## Ресурс панели и обновление

При регистрации MCP читает staged HTML один раз и вычисляет SHA-256 полных UTF-8 байтов. Каталог `workflow_pilot_panel._meta.ui.resourceUri` и `resources/read` используют один неизменяемый снимок: изменение файла не меняет уже объявленный ресурс, следующий запуск получает новый URI. Любая правка HTML/CSS/JS меняет ключ. Это следует [контракту кэширования OpenAI](https://developers.openai.com/plugins/build/chatgpt-ui#embed-the-component-in-the-server-response).

Прежний `ui://workflow-pilot/projects-v1.html` возвращает только безопасное сообщение об обновлении без SDK, полей, кнопок и отправок. Новые инструменты на него не ссылаются; неизвестные исторические хеши не подменяются текущим HTML. Уже сохранённая хостом копия не переписывается. Точное место хранения показанной пользователю старой панели не установлено.

После установки и запуска новой службы обновить инструменты подключения ChatGPT и выполнить свежий `workflow_pilot_panel` (старый результат не заменяет вызов); проверить build/протокол и привязку, профиль и cookies не очищать. При несовпадении версий ошибка показывает обе и предлагает обновить каталог; отстаёт сервер — завершить установку.

`check-plugin-resource.mjs` сверяет package/backend, метки HTML, видимый build и compiled script при staging и в готовом пакете. Fixtures настоящего MCP/SDK проверяют старый кэш → новый каталог → автоматическую привязку O без join/ID/Enable, неизменность снимка и отдельные изменения HTML/CSS/JS. Это не живая приёмка хоста.

Staging перед start/test/smoke/build собирает автономный HTML с лицензиями; Runtime.syncSource доставляет весь tools-комплект. DOCS предшествует общей сборке трёх ОС из одного commit и штатной установке ([поставка](release.md)). Автоматические проверки: настоящий SDK/HTML/Python MCP/Control/Kit/Git в изоляции, O и E в Chat, без моделей и рабочих профилей. [Матрица](chatgpt-plugin-acceptance.md) отделяет эту проверку от живой приёмки.
