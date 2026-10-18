# Плагин Workflow Pilot для ChatGPT — первый прототип

Мост плагина и MCP принадлежат фоновой службе ([backend](backend.md)) и работают без окна. Комплект подтверждает release-manifest.json, установку — delivery-проверка. Приёмка: Chat и Work в ChatGPT Desktop; Codex исключён пользователем.

## Назначение и границы

Плагин находится в этом репозитории и использует существующий MCP и backend Workflow Pilot. Панель показывает зарегистрированные локальные проекты, открывает выбранный проект и просит ChatGPT создать новый разговор. Агент подключает разговор к проекту и получает полный recovery. Разговор может оставаться в Recents: связь с локальной папкой хранит Workflow Pilot. Принадлежность к облачным проектам ChatGPT не изменяется.

Для проверки MCP отдельно от интерфейса можно подключить уже открытый разговор прямой просьбой агенту. Плагин не переносит историю, не обнаруживает автоматически все разговоры ChatGPT, не управляет его окнами. Существующие внешние сессии пока показаны списком без перехода по ссылке: анонимизированный идентификатор разговора не является URL. Режим нового разговора выбирает хост; переключение Chat/Work/Codex не реализовано. Автовыполнение через DOM для внешних сессий не поддерживается. Встроенный браузер и прежние сессии сохраняются.

## Контракт

### Невыпущенная связь участников: контракт T001–T002

Следующий выпуск готовит эксперимент связи по [спецификации](../planning/plugin-communication-panel.md) в том же MCP и ресурсе `ui://workflow-pilot/projects-v1.html`. Старый интерфейс сохранён до T003. Протокол `1`, build `communication-v1-t001`; это промежуточная метка, не выпущенная версия. Живые P0/P1 пока NOT_RUN.

Control `PluginCommunication` владеет участниками, разрешениями, сообщениями, probe и событиями; он не читает файлы, проекты, Kit или Electron. Backend создаёт его вместе с `PluginProjects`. Execution обслуживает только классифицированные действия приватного моста, включая отмену ожидания при закрытии соединения. Python проверяет схемы и отдельно извлекает host metadata каждого MCP-запроса. Frontend вызывает MCP через настоящий `App.callServerTool` и отправляет уведомление через `OpenAIExtensions.message.send`.

Установленный `@openai/mcp-extensions` 0.2.0 проверяет `hostCapabilities.experimental["openai/message"]`; транспорт запроса — `ui/message`, расширение задаётся в `_meta`. Отправка: `{role:"user", content:[{type:"text",text}], _meta:{"openai/message":{target:"active",send:true}}}`. Наличие стандартного `ui/message` без расширения недостаточно. SDK подтверждает форму, но не поддержку хостом и не чтение агентом. См. [спецификацию расширения](https://github.com/openai/mcp-extensions/blob/main/docs/spec.md) и [справочник metadata](https://developers.openai.com/plugins/reference).

**Привязка.** Модель вызывает join с run и ролью O/E; одна роль принадлежит одному разговору, две роли требуют разных разговоров. Панель получает новый случайный `panel_instance_id` при каждом монтировании. Пользователь вводит возвращённые run/participant и нажимает «Подтвердить привязку». App-only bind сравнивает SHA-256 нормализованного массива `[openai/organization, openai/subject, openai/session]` с модельным join. Исходные значения не записываются и не возвращаются. Каждый следующий вызов, включая claim и verify, заново проверяет metadata текущего запроса; переданные аргументами IDs не заменяют проверку. За доверенный транспорт отвечает существующее подключение MCP и приватный мост, metadata сами по себе не являются удостоверением личности пользователя.

Перед каждым Send выполняется отдельный verify: свежая привязка, срок, поколение и одноразовое намерение. Frontend проверяет своё локальное поколение после каждого ожидания и непосредственно перед синхронным началом SDK-вызова. `hostcontextchanged`, `pagehide` и dispose прекращают локальную отправку и запрашивают Stop. Неизвестный/изменённый conversation key или отсутствующий `openai/session` запрещают отправку; выбор в sidebar ни на что не влияет.

**Граница доказательства.** Официальный справочник описывает `openai/session` как корреляцию разговора, а не атомарную адресацию SDK. Внешний P0 должен отдельно установить, что metadata app-only вызовов действительно отражает активный разговор, а не прежний разговор открытия панели. Привязка подтверждает только наблюдаемый момент. Между последним verify и внешним Send остаётся гонка; необъявленная хостом навигация не обнаруживается автоматически. Нет предполагаемого API busy, черновика или закрепления target за conversation id. Fixtures с обновляемыми metadata не доказывают эти свойства настоящего ChatGPT.

Все имена ниже имеют префикс `workflow_communication_`. `binding` — объект `{run_id,participant_id,panel_instance_id,protocol_version,build_id,permission_generation?}`; generation обязателен для доставки, остальные поля — для любой операции панели. `run_id` и ключ идемпотентности — до 128 ASCII-символов `[A-Za-z0-9_.:-]`, первый символ буквенно-цифровой; participant/panel/message/attempt — UUID. Дополнительные поля binding отклоняются. Ошибки возвращаются как `isError:true` и `structuredContent.error`.

| Операция | Доступ и параметры помимо ctx | Результат / эффект |
| --- | --- | --- |
| join | model: run_id, role O/E | participant_id, role, хеш привязки, protocol/build; повтор той же роли/разговора сохраняет участника |
| send_message | model: run_id, participant_id, recipient_id, kind question/answer/result, body, idempotency_key, in_reply_to? | message_id; текст до 4096 байт UTF-8, без усечения; тот же ключ/текст возвращает прежнее, конфликт отклоняется |
| read_message | model: run_id, participant_id, message_id | адресованное сообщение и read-квитанция; повтор не уведомляет заново |
| probe | model: run_id, participant_id, delay_ms 25–60000 | due_at; одна отложенная probe себе после явного enable, Stop отменяет таймер |
| status / journal | model и app: run_id, participant_id; journal: after_seq=0 | состояние участника либо до 100 событий run с seq/total_seq |
| export | model и app: run_id, participant_id, after_seq=0, through_seq? | UTF-8 JSONL по 100 событий; первый through_seq сохраняют до complete; summary с версиями/пробелами/ошибкой |
| telemetry | app: binding, event | фиксированный тип, UUID event_id, client_sequence≥1, client_time UTC, duration_ms; message_id/error_code/message_supported?; без произвольного текста |
| bind | app: binding | подтверждение model/app metadata без разрешения Send |
| enable | app: binding, message_supported | ручное разрешение на 10 минут, новое generation, expires_at; не восстанавливается из прежней панели |
| stop | app: binding | отзывает разрешение и probe; локальный Stop виден отдельно от ответа сервера |
| wait | app: binding, after_seq | одно ожидание до 25 секунд, события и message_id либо пустой ответ; timeout можно повторять |
| claim | app: binding, message_id | одноразовый delivery_attempt_id, состояние claimed |
| verify | app: binding, message_id, delivery_attempt_id | повторная привязка/разрешение, send.intent; повтор не разрешён |
| report | app: binding, message_id, delivery_attempt_id, outcome accepted/rejected/unknown | отдельный исход SDK; поздний report сохраняет read |

Только status/journal/export имеют `readOnlyHint:true`; остальные операции — false. Join/send/read/probe — model-only, управление доставкой — app-only. Ответы данных не прикладывают UI resource. Общий MCP-исполнитель и внешние сессии сохраняются.

Сообщения содержат run/message/sender/recipient, kind, body, created_at, in_reply_to и idempotency_key. Answer/result ссылаются на полученное от адресата сообщение. Доставка `pending → claimed → accepted/rejected/unknown`, read — независимая квитанция. После restart claimed становится unknown, probe отменяется, участники остановлены; новая панель требует bind и ручного enable. Второй enable отзывает прежнее поколение. Accepted/rejected/unknown не переотправляются.

Источник истины — append-only JSONL в `plugin-communication` собственного профиля. Execution `openCommunicationStore(directory)` возвращает load/append; Control сериализует мутации и подтверждает их после append+fsync. Одна строка содержит состояние и новые события, seq/event_id, SHA-256 и хеш предыдущей строки; отдельного snapshot нет. На POSIX синхронизируется и каталог нового файла, на Windows — файл. Перед SDK сохраняется send.intent. Ошибка записи блокирует новые мутации и Send, не подтверждает несохранённое. Неполный хвост, нарушение хешей/seq/IDs сохраняют доступный префикс и исходный файл без автоматического усечения; status/export показывают critical_error. Symlink и внешнее изменение размера отклоняются. Ошибка открытия блокирует только канал связи.

События: schema/event/seq/run, component, severity, server_time UTC, backend_instance_id; нужные IDs/хеши. Backend start/restart включает версии. Отдельно фиксируются join/binding, enable, wait, probe, persisted/duplicate/conflict, claim, binding.verified, send.intent, send.report, read.requested/returned/receipt и stop.confirmed. Telemetry принимает только SDK, handshake/context, visibility, pagehide/dispose, wait/connection, report.failed и stop.local/failed; server_received_at отделён от часов клиента. Повтор event_id не дублируется, конфликт отклоняется, пропуск client_sequence виден как frontend.gap. Подключение этих событий к окончательной панели — T003. Intent не доказывает SDK invocation, accepted не доказывает read; уничтоженная панель может потерять последние события.

Экспорт проверяет участника выбранного run и не принимает путь файла. Произвольные ошибки/host payload не сохраняются; неизвестный error_code заменяется MCP_ERROR. Тексты с распознаваемыми ключами, Bearer, cookies, паролем или URL credentials отклоняются без усечения. Это не универсальный детектор секретов: контрольный текст должен быть несекретным. Лимиты: 100 runs, 256 сообщений/run, 20000 событий/run, файл 512 MiB; превышение — явный отказ. Ошибки STORE_*, SECRET_INPUT, LIMIT дополняют протокольные коды ниже.

Отказы: `PLUGIN_COMMUNICATION_IDENTITY_REQUIRED` — отсутствуют host metadata; `BINDING` — чужой/сменившийся разговор, занятая роль или неподтверждённая панель; `VERSION` — старый HTML; `UNSUPPORTED` — нет расширения; `STOPPED` — Stop, expiry или generation; `CLAIM_DENIED` — чужая/повторная попытка; `READ_DENIED`, `REPLY`, `CONFLICT`, `INPUT`, `CURSOR`, `WAIT_ACTIVE`, `PROBE_PENDING`, `RUN_REQUIRED` — соответствующая проверка контракта. Полный префикс каждого кода — `PLUGIN_COMMUNICATION_`. Общие ошибки приватного моста остаются прежними.

Fixture исполняет настоящий HTML/SDK через кнопки bind/enable, Python, мост, durable Control и probe/wait/claim/verify/Send/report/read. Изолированные тесты проверяют диск, restart, Stop, две панели, ответы, экспорт и ошибки. Это не приёмка ChatGPT; окончательная панель и расширенная матрица — T003/T004.

### Выпущенное подключение проектов (до замены панели)

- `workflow_pilot_panel {project_id?}` — список зарегистрированных активных корневых проектов и панель `ui://workflow-pilot/projects-v1.html`. При точном project_id также проверяет identity и возвращает выбранный проект со свежими сессиями; недоступный проект возвращает ошибку. Без аргумента сохраняется прежний список. Объявлены global/thread entrypoints.
- `workflow_open_project {project_id}` — открытие существующего проекта в панели, проверка его identity. Не меняет выбранную в Desktop сессию.
- `workflow_connect_project {project_id, request_id?}` — связь текущего разговора с проектом, проверка и возврат полного recovery. Панель передаёт свой request_id; при прямой просьбе в чате его создаёт сервер. Повторы в том же разговоре возвращают ту же локальную сессию.

Прежняя последовательность: выбор проекта → новый разговор → workflow_pilot_panel с project_id → workflow_connect_project → чтение recovery → повторный workflow_pilot_panel → ожидание задачи. Видимость панели и чтение контекста проверяет пользователь. При неизвестном project_id сначала запрашивается список; IDs не выдумываются, конфликт не перепривязывается молча.

«Обновить» сохраняет выбор, обновляет сессии и скрывает пропавший проект. Ответ с project_id раскрывает его в новой панели. Успех MCP не доказывает видимость панели; закрепление между разговорами и автоматический переход без Open не гарантируются.

UI использует официальный `@modelcontextprotocol/ext-apps` и `@openai/mcp-extensions`, встроенные в HTML. Он проверяет наличие `openai/message`, затем посылает пользовательское сообщение с `target: new, send: true`. Поддержка capability сама по себе не доказывает поддержку target:new конкретным хостом: возможный отказ показывается пользователю. Неопределённый результат отправки не повторяется автоматически. Связь появляется после успешного MCP-вызова агентом, а не сразу по нажатию кнопки. Если новый разговор не получил подключение MCP, нужно включить плагин в нём и повторить исходную просьбу.

Привязка требует `_meta["openai/session"]` из MCP-запроса клиента. Из session/subject/organization сохраняется только SHA-256, исходные значения не записываются. Это идентификатор связи, а не авторизация и не транспортный Mcp-Session-Id. MCP остаётся stateless HTTP; доступ по-прежнему защищает собственное подключение туннеля. Если клиент не передал metadata, возвращается PLUGIN_SESSION_REQUIRED без создания сессии. Другой проект, архивная сессия или чужое повторное использование request_id дают PLUGIN_BINDING_CONFLICT.

Control остаётся единственным владельцем workspaces.json и очереди записи. Python MCP обращается к Execution через 127.0.0.1 со случайным портом и токеном; мост поднимает backend при запуске, descriptor находится в собственном runtime, имеет права 0600 и удаляется при штатной остановке службы. Запросы с Origin, неверным Host или токеном отклоняются. Закрытие клиента мост не затрагивает. Остановленная или недоступная фоновая служба возвращает PLUGIN_DESKTOP_REQUIRED/UNAVAILABLE (имена кодов сохранены для совместимости) с просьбой открыть Workflow Pilot, который запустит службу. Профиль донора не используется.

Контекст проверяется по существующему inline-context-v1: identity, полнота, размер, SHA-256 и состав частей; повреждённый пакет не создаёт сессию. Полный текст возвращается отдельным MCP TextContent, summary содержит проверочные значения. Успех транспорта не доказывает, что реальная модель прочла весь recovery: это пункт живой приёмки. Выбор внешней сессии в Desktop не создаёт DOM-клиент и не пересылает контекст.

## Новый чат из меню Workflow Pilot, без DOM

Прежний способ 0.5.1, запланированный к удалению T003: пользователь открывает панель, нажимает «Подготовить запуск из приложения» и в течение 45 секунд выбирает «Новый чат через плагин» в меню проекта. После перехода через Open/Recents агент получает recovery, пользователь сверяет проект и чтение полного контекста. 18.10.2026 этот отдельный сценарий подтверждён пользователем; это не подтверждает новый канал связи.

`workflow_plugin_wait {receiver_id}` явно ожидает одну команду не более 45 секунд; автоматического повторного ожидания нет. Меню проверяет проект и передаёт команду по существующему MCP/приватному мосту. `workflow_plugin_claim {receiver_id,request_id}` однократно принимает её в течение 15 секунд. Панель вызывает официальный message.send с target:new/send:true; ожидание ответа ограничено 10 секундами. `workflow_plugin_report {receiver_id,request_id,outcome}` сообщает accepted/unknown. Эти три инструмента объявлены только для app; server instructions и инструменты модели не меняются. Полный контекст по-прежнему проверяется при workflow_connect_project.

Состояние запуска хранится в памяти Control: ready → dispatched → sending → accepted/unknown → context-delivered. Последнее содержит размер/SHA-256; поздний отчёт API не понижает этот статус. Второй ожидающий приёмник отклоняется. Таймаут, потеря ответа и закрытие панели не вызывают повтор Send. После UNKNOWN сначала проверьте историю ChatGPT. Новый запуск требует отдельного нажатия подготовки; после закрытия или перезапуска команды не воспроизводятся.

Без подготовленной панели меню показывает инструкцию. DOM не используется, выбранная сессия не меняется. Режим определяет ChatGPT; запуск без панели, автоматический переход и фоновое выполнение плана не подтверждены.

## Автоматическая проверка и поставка

`npm run stage:chatgpt-plugin` и `node --test tests/chatgpt-plugin.test.mjs` проверяют настоящий Python FastMCP, JS MCP Client, loopback-мост и Control с изолированным профилем. Проверены metadata, контекст, идемпотентность, конкуренция, restart, повреждение пакета, мост backend без клиента и потеря backend. Полный HTML, полученный через MCP resources/read, исполняется в jsdom с настоящим SDK: handshake через postMessage, список проектов, открытие проекта и ui/message target:new. Хост тестовый; это не приёмка ChatGPT. Отдельный regression сохраняет $&, $`, $' и $$ буквально. Сборка отказывает при синтаксически неверном JavaScript до записи ресурса. Electron smoke проверяет выбор внешней сессии без нового браузера/отправки контекста.

Для MCP-тестов требуется изолированный `.harness/runtime/test-python` с зависимостями `tools/codex-app-server-mcp/requirements.txt`, как в существующих проверках проекта. `stage:chatgpt-plugin` собирает автономный HTML с лицензиями; он вызывается перед start/test/smoke и общей/платформенной сборкой. Generated HTML не хранится в Git, входит в существующий комплект tools MCP и копируется штатным Runtime.syncSource. Перед production build документацию и результаты живой приёмки актуализировать; затем выпускать три платформы из одного sourceCommit и выполнять отдельную macOS delivery-задачу.

Проверки меню покрывают конкуренцию, expiry, закрытие панели и UNKNOWN без повторной отправки; Electron smoke — меню/preload/IPC без DOM Send. Каталог MCP проверяет схемы и сохранность инструментов исполнителя. Живые модельные ходы не выполняются.

## Ручная приёмка
Подключение для живой проверки, матрица ручной приёмки и проверка переходов 0.1.5 — в [chatgpt-plugin-acceptance.md](chatgpt-plugin-acceptance.md).
