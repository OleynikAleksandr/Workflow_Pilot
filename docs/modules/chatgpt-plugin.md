# Плагин Workflow Pilot — автоматический диалог

Workflow Pilot 0.5.14 (экспериментальная сборка), Kit 1.9.3, протокол панели `3`, build `0.5.14-communication-3`. Ресурс — `ui://workflow-pilot/panel-<sha256 полного HTML>.html`. Константы находятся в contracts/backend; staging сверяет package и подставляет их в HTML. Рабочий контракт 0.5.12 сохранён; [приёмка A–D](automatic-agent-dialogue-acceptance.md) не заменяется проверкой PiP.

В MCP добавлены пассивные `pip_probe_open_dialogue`, `pip_probe_open_plan` и app-only `pip_probe_status`: отдельные ресурсы и синтетические данные без backend-моста. [Опыт PiP](pip-probe.md): закрытие останавливает только обновления пробника; совместную видимость и работу агентов проверяет пользователь.

## Пользовательский путь

1. Пользователь открывает локальный проект и будущего оркестратора Chat или Work. Первое полное recovery через существующий DOM-путь содержит ограниченное приглашение. Агент вызывает `workflow_pilot_panel` и открывает панель; это не разрешение выполнять план.
2. Обсуждение, Review и публикация сохраняют прежний путь. Публикация связывает scope с точным `execution_origin_session_id`, но не запускает работу.
3. Одна кнопка Start разрешает scope. Control/ParallelExecution через Kit создаёт назначения, worktree и Chat-исполнителей в пределах max_workers. Пока E проходит bootstrap, O выбирает задачу/контекст и вызывает prepare с dispatch_when_ready=true. Backend сохраняет явную авторизацию и отправляет неизменяемый пакет после SDK/bind и конца bootstrap, без отдельного ready-хода. Без флага prepare остаётся черновиком. Backend assignment-start сохранён только для прежнего контракта.
4. Поручения, продолжения, вопросы/решения, интеграции, delivery и итог передаются через канал. Пользователь не переносит run/participant, не открывает панели исполнителей, не вызывает join/Enable и не пишет «продолжай» при обычной технической блокировке.

Панель не создаёт второй scheduler. Kit остаётся источником задач, назначений, проверок и DONE; локальный коммит исполнителя требует проверенной интеграции. [Оркестрация](orchestrated-execution.md) определяет волны и итоговую очистку. DOM передаёт полный начальный контекст O, минимальные обязательные правила/identity/bootstrap E, прежний Review и legacy. [Роли, рабочий API и приёмка результатов](assignment-dialogue.md) определяют dialogue_version=1. Выбранный маршрут `plugin-v1`/`legacy-dom` сохраняется; ошибки канала не переключают его скрыто на DOM.

## Регистрация и адресация

Control резервирует случайное 32-байтовое приглашение на 30 минут для точных project/local session/origin/role/scope/assignment/task. Backend хранит только hash; значение передаётся целевым bootstrap и не включается в общий журнал, экспорт или Git. Регистрация существующей локальной сессии не создаёт external-дубликат. Повтор той же identity идемпотентен, в том числе после потери ответа; перенос в другой разговор, истёкшее приглашение и заменённое назначение запрещены.

Участники индексируются по participant_id: один O и несколько E, код и fixtures проверяют пять E. Роль выбирает сервер. Рабочий run связан с проектом и исходной сессией O, разрешение — с текущим scope и поколением. Чужой кандидат не захватывает опубликованный план. Состояние публикации проверяется свежим чтением даже до сохранения role reconciliation.

Каждый MCP-запрос использует свежие host metadata. `openai/session` обязателен, organization/subject могут отсутствовать; нормализованная identity хешируется, исходные значения не сохраняются. Название/URL чата, sidebar, клиентские IDs и заявление роли не удостоверяют адресата. При регистрации, чтении и перед Send проверяется действующее назначение; завершённый/заменённый исполнитель не получает новые поручения. Оркестратор видит реестр своего плана, исполнитель — своё назначение. Реестр не выдаёт приглашения, raw metadata или чужие worktree.

Конверт содержит message_id, scope, assignment/task/attempt, проверенного автора/адресата, kind, in_reply_to, block_id/signal_id, idempotency key и ссылки на контекст. Рабочие типы: task, context_request, context, question, clarification, decision, result, revision_request, acceptance; service ready/recovery/finalization имеет автора backend. Legacy сохраняет прежние assignment-start/continue/integration. Содержимое не расширяет полномочия.

## Разрешение и срок жизни

Start/Continue выдаёт допуск текущему плану. Лимит 30 минут к нему не применяется. Lease SDK — 60 секунд: sync подтверждает её, wait продлевает только ещё действующую lease того же поколения. Истёкшая lease/restart требуют свежего sync; wait не возобновляет допуск. Старая авторизация draft после смены generation/boot требует подтверждения O.

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

Observer и журнал команд сообщают занятость/черновик. Перед SDK объединённый claim_ready проверяет identity/назначение/generation/допуск и сохраняет durable send.intent; старые claim/verify сохранены. Между подтверждением и SDK нет ожидания UI refresh/telemetry. FIFO освобождается по read + yield + свежему физическому концу без user bubble. Ранний yield/старый idle не открывают вход; read-only сверка не запускает модель. [Контракт](assignment-dialogue-reliability.md#sdk-fifo-и-конец-хода).

`pending → claimed → accepted/rejected/unknown`; чтение и наблюдённый ответ независимы. Потеря claim/report не возвращает pending. UNKNOWN и остальные терминальные исходы не повторяются через SDK или DOM. После restart claimed становится unknown. Большой контекст хранится целиком, до 1 MiB, читается частями до 12000 байт UTF-8 с total/sha256; усечения нет, доступ проверяется на каждой части.

Рабочий model API — workflow_assignment_prepare/dispatch/send/yield/status: черновик O без grant, его отправка после готовности, вопрос, решение, result и acceptance. Intent сохраняется до идемпотентного эффекта Kit и публикации WAL. Yield.reason явно ограничен awaiting_reply/tasks_sent/result_sent/handled. Совместимые task:block/assignment:message используют ту же корреляцию без дублирования MCP-вызова агентом. Clarification не снимает block_id; только актуальный decision resume=true возобновляет. [Контракт сообщений](assignment-dialogue.md#model-api).

[Ролевой протокол Kit](../../packages/workflow-kit/docs/modules/orchestrated-plans.md#сигналы) — role-protocol.mjs, версия 6: O отбирает контекст, выдаёт task, уточняет и принимает result; E спрашивает O и обязательно отправляет result после проверенного commit. Общая среда — один владелец при припаркованных E; третья неудачная попытка требует эскалации. Обновление правил не повторяет task:start. Старые сигналы не переписываются и не снимают новую блокировку.

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
| communication_stop | App, binding/scope; participant — явный Stop всего workflow-плана или одного legacy-участника; panel — отсоединение workflow-экземпляра или legacy Stop его поколения |
| communication_status / journal / export | Model/App, run_id/participant_id; journal/export по 100 событий, export фиксирует through_seq до complete |
| communication_telemetry / telemetry_batch | App; очищенное событие или до 16 событий с event_id/client_sequence |

Имена communication_* имеют префикс `workflow_`. Binding: run_id, participant_id, panel_instance_id, protocol_version, build_id и permission_generation для доставки; посторонние поля отклоняются. Read-only: status/journal/export/recover/participants/read_context. Регистрация, read-квитанция и остальные мутации имеют readOnlyHint=false. Ответы communication содержат panel_resource_uri текущего immutable MCP snapshot; это диагностика каталога, не новое UI-вложение или доказательство старого iframe. Recover также сообщает assignment_dialogue_version и role_protocol_version.

Legacy-only join/send_message/probe/enable сохраняют отдельный [ручной эксперимент P0/P1](plugin-communication-handoff.md): два разных разговора O/E, Enable на 30 минут, body до 4096 UTF-8 байт. Backend отвергает применение этих операций к рабочему плану. Старые журналы и экспорт доступны без автоматического разрешения.

Свежая metadata подтверждает наблюдаемый момент, но verify и SDK target:active не атомарны. Хост может не сообщить навигацию. Собственный observer встроенной страницы не является предполагаемым API busy/черновика ChatGPT. Host confirmations не обходятся; необходимость посетить/подключить каждый новый чат означает FAIL автоматизации A–D.

## Хранение, UI и диагностика

Control PluginCommunication сериализует мутации и подтверждает после append+fsync. Проверенные факты проекта/назначения поступают через PluginProjects и узкий DialogueDelivery; протокол не читает Kit, fs или Electron. Execution обслуживает приватный мост и store; Frontend — SDK. Границы [Control](control.md)/[Execution](execution.md) сохраняются.

WAL в собственном `plugin-communication`: legacy schema 1, workflow registry/WAL 2; состояние и последовательные события с SHA-цепочкой, без второго snapshot. Неизвестный формат отклоняется до записи, старый журнал не мигрирует молча. Контекст — неизменяемый файл по hash с fsync/O_NOFOLLOW и проверкой SHA при чтении. Повреждение, неполный хвост, внешний размер или symlink блокируют запись и сохраняют исходник/доступный префикс. На POSIX синхронизируется также каталог. Лимиты: 100 runs, 256 приглашений, 2048 workflow-сообщений (256 legacy), 20000 событий/run, WAL до 512 MiB. Превышение — явный отказ.

Новый panel_instance_id создаётся при mount. Handshake → recover → bind → sync; поздний SDK восстанавливается ограниченно без модельных ходов. Исторический tool-result не управляет актуальным допуском. UI скрывает ручные поля/Enable, показывает роль/назначение и причину неготовности. Sync при ожидании разрешения — раз в две секунды; рабочий wait продлевает живую lease сам. Backoff ошибок 250–5000 мс; binding/version/storage прекращает доставку, ошибка не повторяет Send. UI refresh объединён с задержкой 500 мс, не блокирует доставку и не читает полный Kit roster. Светлая/тёмная тема и узкая раскладка сохранены.

Sidebar читает регистрацию, живой SDK, task/attempt/grant/result/acceptance и этап интеграции. Панель O показывает всех E и входящие/исходящие с авторами, адресатами и корреляцией; E — свой диалог. Read-only preview не отмечает read. После удаления сохранённый запрет сессий отзывает допуск, intent становится retired; поздние вызовы получают PROJECT_REMOVED. [Наблюдаемость](assignment-dialogue-reliability.md#наблюдаемость).

Лента показывает последние 200 событий; экспорт фиксирует through_seq и полноту. Пакетная телеметрия отправляется отдельно от доставки; буфер 64, пакет до 16. Разделены client_time/server_received_at и монотонные длительности операций, отмечены frontend.gap/diagnostic.gap. Измеряются очередь/handler/Kit/observer, RPC/SDK и причины отложенного claim. Диагностика не будит функциональную очередь; функциональные события адресны. Последние события уничтоженной панели могут отсутствовать. Intent ≠ invocation, accepted ≠ read; скрытое мышление модели неизвестно. Секреты/raw metadata/аргументы инструментов не входят в spans. [Тайминги и экспорт](dialogue-timing.md).

Ошибки имеют isError/structuredContent.error и префикс PLUGIN_COMMUNICATION_: IDENTITY_REQUIRED, BINDING, VERSION, UNSUPPORTED, STOPPED, ASSIGNMENT_CHANGED, PROJECT_REMOVED, ENROLLMENT/ENROLLMENT_EXPIRED, MODE, CLAIM_DENIED, READ_DENIED, STALE_MESSAGE, CONTEXT, CONFLICT, STORE_*, LIMIT и ошибки входа/курсора. Не маскировать их повторным join/Enable или DOM Send.

Код ошибки сохраняется также при отклонении SDK Promise. Свежий status/sync с complete прекращает wait/sync текущей привязки без Stop. При ошибке ожидания запрашивается status: pause сохраняет Continue; недоступный status не считается complete. Поздний ответ проверяется по binding/epoch. Recover позволяет явно получить новую привязку; старый допуск не возобновляется.

## Прямое подключение и поставка

`workflow_open_project {project_id?}` читает проекты/сессии без UI. `workflow_connect_project {project_id,request_id?}` отдельно связывает уже открытый внешний разговор, проверяет inline-context-v1 (полноту/размер/SHA/identity), возвращает полный recovery; повторы не создают дубликат. Облачный проект/история не меняются, выбор внешней сессии не создаёт страницу и выполнение плана. Старые кнопки создания чатов и навигационные пробы удалены.

Мост backend: loopback, приватный descriptor 0600 с токеном, Host/Origin проверяются. Исторические PLUGIN_DESKTOP_REQUIRED/UNAVAILABLE означают недоступную службу. Окно не требуется; donor-профиль не используется.

## Ресурс панели и обновление

При регистрации MCP читает staged HTML один раз и вычисляет SHA-256 полных UTF-8 байтов. Каталог `workflow_pilot_panel._meta.ui.resourceUri` и `resources/read` используют один неизменяемый снимок: изменение файла не меняет уже объявленный ресурс, следующий запуск получает новый URI. Любая правка HTML/CSS/JS меняет ключ. Это следует [контракту кэширования OpenAI](https://developers.openai.com/plugins/build/chatgpt-ui#embed-the-component-in-the-server-response).

Прежний `ui://workflow-pilot/projects-v1.html` возвращает только безопасное сообщение об обновлении без SDK, полей, кнопок и отправок. Новые инструменты на него не ссылаются; неизвестные исторические хеши не подменяются текущим HTML. Уже сохранённая хостом копия не переписывается. Точное место хранения показанной пользователю старой панели не установлено.

После установки и запуска новой службы обновить инструменты существующего подключения ChatGPT и выполнить свежий `workflow_pilot_panel`; открытие старого результата не заменяет новый вызов. Проверить видимый build/протокол и подтверждённую привязку. Профиль, cookies и историю не очищать. Строгая проверка версии остаётся: ошибка показывает обе версии, предлагает обновить каталог и заново вызвать панель; если отстаёт сервер — завершить установку. Переустановка приложения сама по себе не объявляется очисткой кэша ChatGPT.

`check-plugin-resource.mjs` сверяет package/backend, метки HTML, видимый build и compiled script при staging и в готовом пакете. Fixtures настоящего MCP/SDK проверяют старый кэш → новый каталог → автоматическую привязку O без join/ID/Enable, неизменность снимка и отдельные изменения HTML/CSS/JS. Это не живая приёмка хоста.

Staging перед start/test/smoke/build собирает автономный HTML с лицензиями; Runtime.syncSource доставляет весь tools-комплект. DOCS предшествует общей сборке трёх ОС из одного commit и штатной установке ([поставка](release.md)). Автоматические проверки: настоящий SDK/HTML/Python MCP/Control/Kit/Git в изоляции, O в Chat/Work и Chat-исполнители, без моделей и рабочих профилей. [Матрица](chatgpt-plugin-acceptance.md) отделяет эту проверку от живой приёмки.
