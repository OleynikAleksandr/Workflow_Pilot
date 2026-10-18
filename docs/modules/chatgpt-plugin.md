# Плагин Workflow Pilot — связь участников

Мост плагина и MCP принадлежат фоновой службе ([backend](backend.md)) и работают без окна. Комплект подтверждает release-manifest.json, установку — delivery-проверка. Приёмка: Chat и Work в ChatGPT Desktop; Codex исключён пользователем.

## Назначение и границы

Плагин использует существующий MCP и backend Workflow Pilot. Новая панель готовит внешний опыт связи двух участников: сохраняет сообщения, запрашивает уведомление текущего разговора официальным SDK и показывает независимые исход доставки и квитанцию чтения. Это невыпущенная реализация 0.5.2; P0/P1 в реальном ChatGPT здесь не запускаются.

Прямое подключение уже открытого разговора к локальному проекту остаётся отдельной операцией MCP. Облачные проекты ChatGPT, история, основной sidebar и внешние сессии сохраняются. Плагин не управляет окнами и не использует DOM для отправки. Старый интерфейс проектов, создание новых разговоров, навигационные пробы и пункт «Новый чат через плагин» удалены.

## Контракт

### Связь участников

Эксперимент по [спецификации](../planning/plugin-communication-panel.md) использует тот же MCP и ресурс `ui://workflow-pilot/projects-v1.html`. Протокол `1`, build `0.5.2-communication-1`, версия приложения/SDK App `0.5.2`. Общие константы находятся в contracts/backend; staging проверяет совпадение package и подставляет ту же метку в HTML.

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

События: schema/event/seq/run, component, severity, server_time UTC, backend_instance_id; нужные IDs/хеши. Backend start/restart включает версии. Отдельно фиксируются join/binding, enable, wait, probe, persisted/duplicate/conflict, claim, binding.verified, send.intent, send.report, read.requested/returned/receipt и stop.confirmed. Панель передаёт SDK, handshake/context, visibility, pagehide/dispose, wait/connection, report.failed и stop.local/failed; server_received_at отделён от часов клиента. Повтор event_id не дублируется, конфликт отклоняется, пропуск client_sequence виден как frontend.gap. Буфер панели ограничен 64 событиями; неподтверждённое событие повторяется с тем же ID после восстановления связи, переполнение видно в диагностике. Intent не доказывает SDK invocation, accepted не доказывает read; уничтоженная панель может потерять последние события.

Экспорт проверяет участника выбранного run и не принимает путь файла. Произвольные ошибки/host payload не сохраняются; неизвестный error_code заменяется MCP_ERROR. Тексты с распознаваемыми ключами, Bearer, cookies, паролем или URL credentials отклоняются без усечения. Это не универсальный детектор секретов: контрольный текст должен быть несекретным. Лимиты: 100 runs, 256 сообщений/run, 20000 событий/run, файл 512 MiB; превышение — явный отказ. Ошибки STORE_*, SECRET_INPUT, LIMIT дополняют протокольные коды ниже.

Отказы: `PLUGIN_COMMUNICATION_IDENTITY_REQUIRED` — отсутствуют host metadata; `BINDING` — чужой/сменившийся разговор, занятая роль или неподтверждённая панель; `VERSION` — старый HTML; `UNSUPPORTED` — нет расширения; `STOPPED` — Stop, expiry или generation; `CLAIM_DENIED` — чужая/повторная попытка; `READ_DENIED`, `REPLY`, `CONFLICT`, `INPUT`, `CURSOR`, `WAIT_ACTIVE`, `PROBE_PENDING`, `RUN_REQUIRED` — соответствующая проверка контракта. Полный префикс каждого кода — `PLUGIN_COMMUNICATION_`. Общие ошибки приватного моста остаются прежними.

Fixture исполняет настоящий HTML/SDK через кнопки bind/enable, Python, мост, durable Control и probe/wait/claim/verify/Send/report/read. Матрица включает конечный question/answer/result двух разговоров, две панели, смену metadata перед verify, потерянный ответ claim/report, timeout/rejection SDK, Stop по обе стороны Send, expiry/pagehide, восстановление wait, диск/restart и экспорт. Это не приёмка ChatGPT.

Stop и повторный enable отменяют как таймер probe, так и уже поставленную, но ещё не claimed probe. Status без ожидания тоже показывает истёкшее разрешение; событие permission.expired сохраняется следующей мутацией. Завершение ожидания старой панели не отзывает новое поколение другой панели.

### Панель и ожидание

`workflow_pilot_panel {}` возвращает `communication: {protocol_version,build_id,storage,critical_error}` и прежний UI resource; поля projects больше нет. Entry points global/thread сохранены. Панель показывает run, роль/участника/хеш привязки, версию, enable/Stop, поколение и срок разрешения, непрочитанные сообщения, последнее сообщение, исходы доставки и ленту. Светлая/тёмная тема приходит от хоста, на узкой ширине колонки складываются. Inputs блокируются после bind; другой участник требует нового экземпляра панели.

На экземпляр один long-poll; нормальный timeout повторяется, ошибки ожидания дают backoff 250–5000 мс. Terminal binding/version/Stop/storage прекращает цикл. События передаются с seq тем же ожиданием; отдельного частого опроса журнала нет. После ответа обновляются состояния сообщений. Когда связь выключена, «Обновить» делает один ручной запрос. Лента показывает последние 200 событий, фильтры сообщения/участника/ошибок; намеренное ограничение и обнаруженный пробел различаются. Экспорт собирает все страницы до фиксированного through_seq, показывает JSONL и сводку, предлагает скачивание и выделение текста, если хост блокирует download. Ошибка экспорта не стирает журнал.

Ошибка claim/verify/report останавливает локальную попытку и запрашивает Stop: повторный wait не повторяет неизвестный claim. SDK error/timeout означает unknown, без повторного Send. SDK invocation отмечается только после входа в реальный send. Stop до Send проверяется локальным epoch после каждого await; начатый SDK-запрос уже не отменяется, report может прийти после Stop и чтения. При pagehide/dispose отменяется ожидание и делается best-effort Stop; подтверждение от уничтоженного iframe не гарантируется. Любое наблюдаемое hostcontextchanged консервативно останавливает связь, включая смену темы. Неподдерживаемый SDK и несовпадение build/protocol видны в диагностике.

### Сохранённое прямое подключение проектов

`workflow_open_project {project_id?}` возвращает данные без UI: без аргумента список активных корневых проектов, с точным ID — проверенный проект и текущие сессии. `workflow_connect_project {project_id,request_id?}` связывает текущий разговор по host metadata, проверяет inline-context-v1 и возвращает полный recovery отдельным TextContent. При прямом подключении request_id создаёт сервер; повторы не дублируют сессию. Полнота, размер, SHA-256, identity и состав частей проверяются до создания сессии; выдача контекста не доказывает чтение моделью. Чужая привязка, архивная сессия и конфликт request_id отклоняются. Исходные metadata не сохраняются. Разговор может оставаться в Recents; облачная принадлежность не меняется.

Control единолично владеет workspaces.json. Python использует приватный loopback-мост Execution; descriptor с случайным токеном имеет права 0600 и удаляется при штатной остановке. Origin, чужой Host и неверный токен запрещены. Backend обслуживает мост без окна. PLUGIN_DESKTOP_REQUIRED/UNAVAILABLE сохраняют совместимые имена и указывают на недоступную фоновую службу. Donor-профиль не используется. Выбор внешней сессии в основном приложении не создаёт браузер и не пересылает recovery.

### Проверка и поставка

`npm run stage:chatgpt-plugin` собирает настоящий SDK в автономный HTML с лицензиями; синтаксическая ошибка блокирует запись. Generated HTML вне Git, входит в tools MCP и копируется Runtime.syncSource. Staging выполняется перед start/test/smoke/build. Строгий каталог MCP сохраняет инструменты исполнителя; старые workflow_plugin_wait/claim/report удалены. Автоматические проверки используют изолированный Python/FastMCP, JS MCP Client, Control/Execution, jsdom postMessage host и Electron fixtures, без живых модельных ходов и рабочих профилей.

DOCS предшествует общей сборке macOS/Windows/Linux из одного sourceCommit. Подменять только установленный HTML нельзя. Отдельная delivery-задача ставит проверенный готовый macOS-комплект; работающий backend не останавливается агентом. Ограничения живой приёмки остаются в [сценарии](chatgpt-plugin-acceptance.md); пользователь передаёт результаты внешнего эксперимента сюда.

Фактические схемы, установка/проверка версии, последовательности P0/P1 и формат возврата результата собраны в [инструкции передачи](plugin-communication-handoff.md). Опыты выполняются только в отдельном Workflow_Pilot_Plugin_Communication_Experiment; здесь их статус NOT_RUN. Техническое DONE означает готовность к эксперименту, а закрытие плана требует приёмки пользователя.
