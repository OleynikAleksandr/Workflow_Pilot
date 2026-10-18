# Backend и отдельный клиент

## Ответственность и поведение

С 0.2.0 Workflow Pilot состоит из двух процессов одного приложения на одном компьютере. С 0.3.0 тот же API доступен удалённому устройству через шлюз и Tailscale Serve — [удалённый доступ](remote-access.md); основной API остаётся loopback с bearer. **Backend** (`--backend-host`) — постоянно работающая фоновая служба: Control, Execution, Kit, stores, модель Desktop, выполнение планов, Review, sequential/parallel, страницы ChatGPT, observer, MCP-исполнитель, выбранный туннель и мост плагина. **Клиент** (обычный запуск) — окно с панелями и интерактивным изображением страницы backend. VPS не нужен; доступ ограничен loopback.

Закрытие окна, Cmd+Q («Закрыть окно (работа продолжится в фоне)») и падение клиента отключают только интерфейс: страницы, команды, выполнение планов, Review, исполнители, MCP и туннель продолжают работу. Повторное открытие подключается к тем же страницам без reload, второго разговора и повторного recovery. Сон, logout, выключение и падение backend не равны закрытию клиента. Требование держать окно открытым для работы плана или плагина больше не действует.

Один рабочий диалог — один живой экземпляр страницы в backend; все окна подключаются к его изображению и вводу. Продолжение того же диалога в отдельно открытом ChatGPT.com или мобильном приложении — не штатный сценарий (наблюдение пользователя: второй браузер нарушает устойчивость больших планов; причина не установлена). Новые правила конфликтов ручных действий с автоматизацией не вводились; защиты draft/Stop/UNKNOWN сохранены.

| Компонент | Код | Ответственность |
| --- | --- | --- |
| Точка входа | `src/main.mjs`, `src/contracts/launch.mjs` | Выбор режима: backend (с фабрикой встроенного окна), клиент (процесс запуска встроенного окна), HTTP-клиент (`--http-client`) или in-process smoke (только разработка) |
| Backend host | `src/backend/main.mjs` | Identity, lock, композиция, API-порт, значок, остановка, открытие клиента |
| Профиль и владелец | `src/backend/identity.mjs` | `owner.json`/`service.json`, восстановление после падения |
| Композиция | `src/backend/bootstrap.mjs`, `desktop-model.mjs`, `remote-surface.mjs` | Control/Execution; модель Desktop без окна |
| API | `src/backend/{server,operations,events,protocol,control-lease,transfers}.mjs` | HTTP-команды, журнал, SSE, lease, передачи файлов |
| Остановка и значок | `src/backend/{shutdown,status-menu}.mjs` | Draining и системный значок |
| Диагностика | `src/backend/diagnostics.mjs` | Ограниченный журнал процессов backend, тип LaunchServices |
| Клиент | `src/frontend/desktop/client.mjs`, `src/frontend/client/*` | Окно, запуск/подключение backend, кадры и ввод; режим embedded — [встроенное окно](native-window.md) |

Модель Desktop (`desktop-model.mjs`) — прежняя логика `application.mjs`, перенесённая в backend с теми же каналами pilot:*/archive:*/colors и снимками состояния; поведение 0.1.6 сохранено. Окно ей не нужно: состояние уходит в поток событий, просьбы открыть архив, редактор цветов, сменить тему или раскладку адресуются подключённому клиенту. Путь проекта выбирает диалог backend: это папка компьютера backend, а не файловый диалог удалённого клиента.

### Процессы и профиль

Профиль backend — прежний `<appData>/Workflow Pilot` с Chromium `browser/` и partition `persist:workflow-pilot-chatgpt`; профиль 0.1.6 используется на месте без смены схемы. Клиент хранит только собственные окна в `<appData>/Workflow Pilot Client`. Одновременно профилем владеет один процесс: Electron single-instance lock плюс `.backend-host/owner.json` (product, pid, boot generation, права 0600). После доказанного владения backend публикует приватный descriptor `.backend-host/service.json` (port, token, pid, generation) атомарной записью.

Штатное завершение (quit, SIGTERM, SIGINT, SIGHUP, выход из системы) останавливает собственные службы, затем удаляет descriptor и owner только при совпадении pid/generation. Owner завершённого процесса восстанавливается следующим запуском; операции прошлого boot читаются как UNKNOWN и не повторяются. Живой владелец, чужой product, повреждённый owner, descriptor без owner, symlink в профиле или store дают отказ без изменения данных. Незавершённая транзакция Kit в любом зарегистрированном проекте останавливает запуск (`BACKEND_KIT_TRANSACTION_PENDING`) до восстановления средствами Kit. Проект, чьё состояние транзакции прочитать нельзя (папки нет, битый git или worktree удалённого проекта), запуск не останавливает: его ошибка видна при выборе проекта.

### Запуск и повторное открытие

Обычный запуск — клиент. Он читает `service.json`; если descriptor отсутствует или его процесс завершён, запускает `--backend-host` отдельным detached-процессом в своей группе и ждёт descriptor до 30 с. Конкурентные запуски сходятся на одном backend: проигравший получает отказ lock (код выхода 2) и подключается к descriptor победителя. Если через 5 с после такого отказа живого descriptor нет, профиль занят другой копией (например, 0.1.6) — клиент показывает `BACKEND_OWNER_CONFLICT` и просит закрыть её.

macOS: выбрана топология activate/reopen в одном bundle, отдельный helper не создан. Backend работает без Dock-иконки (`accessory`), кроме времени, когда открыто его [встроенное окно](native-window.md). С 0.2.1 политика `accessory` повторно применяется после каждого диалога backend, `activate`, `did-become-active` и создания окна; тип процесса в LaunchServices проверяется, а появление Foreground записывается в журнал. Packaged-клиент backend открывает через LaunchServices (`open -n -a <bundle> --args --http-client`, с 0.5.0 — только для «Окно через HTTP (тест)»), как щелчок в Dock, а не прямым запуском исполняемого файла. Повторное открытие `.app` через Finder/Dock/Spotlight доставляет `activate` уже запущенному процессу bundle: backend показывает встроенное окно (с 0.5.1 на всех ОС). Новый процесс-клиент при уже открытом окне передаёт фокус ему: у клиента собственный single-instance lock в своём профиле, независимый от lock backend; запуск в режиме backend при живом владельце вызывает в нём `second-instance` с тем же результатом. Fixtures не реагируют на события ОС.

Системный значок принадлежит backend и живёт без клиента: состояние «Фоновая служба работает · страниц: N», причины ожидания остановки, «Открыть Workflow Pilot», «Остановить фоновую службу…» с подтверждением, «Отменить остановку». Где системного tray нет (часть Linux-окружений), те же статус и остановка находятся в меню клиента.

### Явная остановка

Остановка — draining → безопасная точка → остановка своих служб → подтверждение выходом процесса. Draining прекращает новые отправки, контекст и назначения; текущий ответ ChatGPT, отправка и команды Kit завершаются. Подготовка контекста до начала отправки ничего не меняет в ChatGPT и остановку не держит. Причины ожидания (`ANSWER_RUNNING`, `SEND_RUNNING`, `COMMAND_RUNNING`) видны в значке и клиенте, их коды пишутся в журнал при изменении; остановку можно отменить, автоматика продолжается с места ожидания. Timeout и kill нет; ошибка остановки возвращает draining с сообщением. После выхода клиент показывает «нет связи» и предлагает «Запустить фоновую службу»; сам остановленную службу он не перезапускает.

### Переход версии

Handshake передаёт версию приложения. Клиент другой версии подключается наблюдателем: изменения заблокированы, заголовок и меню объясняют, что работает служба версии X и её нужно остановить (значок или меню), затем открыть новую версию. Backend не убивается и второй не создаётся. Установщик macOS не заменяет bundle живого backend: проверенная копия ждёт в pending-слоте, установка повторяется после остановки службы ([поставка](release.md)). Packaged-сборка игнорирует тестовые флаги (`--backend-fixture-root`, `--client-*`, `--smoke` и др.): не загружает fixture, не печатает token и не меняет профиль.

## Контракт и зависимости

API версии 1 (`BACKEND_API_VERSION`) слушает `127.0.0.1` на случайном порту. Каждый запрос, включая поток событий, несёт bearer token в заголовке, точный Host `127.0.0.1:<port>`; Origin запрещён, кроме явно разрешённых. Токены не передаются в URL. Клиент не получает CDP, JavaScript, shell, stores и локальные пути backend. Контракты: `src/contracts/backend.mjs`, `src/contracts/browser-presentation.mjs`, `src/contracts/desktop.mjs`, `src/backend/protocol.mjs`.

| Маршрут | Назначение |
| --- | --- |
| `GET /v1/handshake` | apiVersion, identity, bootGeneration, capabilities, readiness (`ready`/`setup-required`/`degraded`/`draining`), appVersion |
| `GET /v1/status`, `GET /v1/snapshot` | Состояние службы; snapshot `{bootGeneration, revision, sequence, state}` |
| `GET /v1/events?generation&after` | SSE: `snapshot`, `event`, `ui`; heartbeat 15 с |
| `POST /v1/commands` | Команда `{requestId, operation, args, bootGeneration, revision?, leaseGeneration?}` |
| `GET /v1/operations/<op:id>` | Состояние операции |
| `/v1/browser/*` | Кадры, ввод, viewport, clipboard, файлы — [Browser](browser.md) |

**Snapshot и события.** Snapshot и подписка регистрируются синхронно, событие между ними не теряется. Подписка с `after` продолжает с последовательности, иначе — новый snapshot (resync); другой boot generation тоже resync. Изменения Control объединяются (40 мс). Состояние Desktop — последнее значение (`ui`), не история; новые потоки получают его сразу. Буфер потока ограничен 4 МБ: медленный клиент отключается и делает resync, writer не ждёт. События браузера несут только id и поколения, без содержимого страницы.

**Команды.** Операции — фиксированный allowlist `BACKEND_OPERATIONS` с классами read/mutate/control/input/transfer. Реализованный каталог: `projects.list/open/rename`, `sessions.list/create/select/rename`, `settings.get/update`, `plan.snapshot/continue/stop`, `ui.state`, `ui.invoke` (прежний IPC allowlist `DESKTOP_CHANNELS` для local/archive/colors), `service.status/stop/cancel-stop`, `control.acquire/renew/release`. `ui.invoke` возвращает `{ok, result, error}`: UI читает только ok/error и опубликованное состояние, поэтому `result` — лишь небольшое скалярное значение (boolean, число, строка до 1024 символов), иначе `null`. Внутренние записи Control (проект с сессиями может занимать сотни КБ) API не пересекают, и выполненное действие не становится ошибкой `BACKEND_MESSAGE_SIZE`. Остальные зарезервированные имена отвечают `BACKEND_OPERATION_NOT_AVAILABLE`; создание и удаление проектов идут через `ui.invoke`, плагин — через свой MCP-канал. Универсального диспетчера нет: каждая операция вызывает существующий метод Control/модели с собственной валидацией.

Read выполняется сразу и возвращает `completed`/`failed`. Изменение требует lease, затем запись в журнал `.backend-host/operations.jsonl` с fsync до эффекта и ответ `accepted` + operationId (HTTP 202). Повтор того же requestId с теми же аргументами возвращает прежний operationId, с другими — `BACKEND_REQUEST_CONFLICT`. Эффект выполняется не более одного раза и переживает разрыв соединения; `ui.invoke` сохраняет собственный порядок навигаций, остальные изменения последовательны. Записи прошлого boot со статусом accepted/running читаются как `unknown` и не повторяются: повторный Send, recovery или создание проекта требуют сверки пользователем. Команда с чужим bootGeneration отвергается `BACKEND_BOOT_STALE`. Повреждённый журнал (не только хвост) даёт `BACKEND_JOURNAL_CORRUPT`.

**Пределы.** Сообщение 64 КБ, 64 ожидающие команды (`BACKEND_QUEUE_LIMIT`, повтор с тем же requestId), 256 событий журнала, передача файла 32 МБ частями по 256 КБ; заголовки 5 с, запрос 10 с, 64 соединения.

**Ошибки.** Ответ `{error:{code,message}}` с фиксированным безопасным текстом, без стеков, текста чата и токенов. Основные коды: `BACKEND_ACCESS_DENIED` (403), `BACKEND_MESSAGE_SIZE` (413), `BACKEND_BOOT_STALE`, `BACKEND_LEASE_HELD`, `BACKEND_LEASE_STALE`, `BACKEND_LEASE_REQUIRED`, `BACKEND_REQUEST_CONFLICT`, `BROWSER_DOCUMENT_CHANGED`, `BROWSER_CHOOSER_STALE` (409), `BACKEND_QUEUE_LIMIT` (429), `BACKEND_UNAVAILABLE` (503). Несовпадение версии API в handshake — `BACKEND_VERSION_INCOMPATIBLE` на стороне клиента.

**Право управления.** Один управляющий клиент, остальные наблюдают. `control.acquire {clientId, takeover}` берёт свободный lease; занятый — только явным перехватом (меню «Взять управление»). Продление каждые 10 с, истечение через 45 с; каждая мутация и ввод несут leaseGeneration, поздний запрос старого владельца отвергается, принятые операции продолжаются. Смена владельца отпускает зажатые им клавиши и кнопки. Подписка не захватывает управление. Окно клиента держит один `clientId` на весь процесс, поэтому после переподключения сразу возвращает собственный lease. Одновременно выполняется один acquire; временная ошибка acquire или renew повторяется с задержкой 1→10 с, отказ продления сразу запускает повторный acquire. Режим «наблюдение (управление у другого окна)» показывается только при известном другом владельце, иначе — «получение управления…». Клиент без lease — наблюдатель; при обрыве он помечает данные устаревшими, блокирует изменения и переподключается к новому boot. Потеря lease не останавливает выполнение плана и агентские MCP-инструменты.

**Плагин и MCP.** Мост плагина и runtime MCP принадлежат backend и работают при нуле клиентов. Агентские MCP-вызовы не требуют клиента и lease; классы действий панели заданы в `PLUGIN_ACTION_CLASS`. Остановленная служба возвращает плагину `PLUGIN_DESKTOP_REQUIRED`/`PLUGIN_DESKTOP_UNAVAILABLE` (исторические коды) с просьбой открыть Workflow Pilot. Контракт плагина — [ChatGPT plugin](chatgpt-plugin.md).

| Событие | Поведение |
| --- | --- |
| Первый запуск | Один backend, затем клиент; setup-required и мастер в клиенте |
| Два запуска | Один backend; проигравший отказывается от владения |
| Закрытие / Cmd+Q / crash клиента | Только отключение |
| Разрыв связи | Устаревание показано; reconnect со свежим состоянием |
| Гибель renderer страницы | Через 1 с перезагрузка того же адреса, не более 3 раз за 10 мин; прерванный Send — UNKNOWN без повтора |
| Crash backend | Новый boot generation при следующем запуске; UNKNOWN без повторов |
| Явная остановка | Draining → безопасная точка → остановка своих служб → выход |

Зависимости: backend использует ControlFacade и ExecutionFacade как прежний Desktop ([Control](control.md), [Execution](execution.md)); Kit остаётся единственным владельцем плана и транзакций. Готовность подтверждают identity, boot generation, версия API и состояние служб, а не PID или порт. Dependency-cruiser запрещает доступ release-путей к in-process окну (`release-paths-never-reach-in-process-window`) и прямой UI → Control.

**Диагностика.** Backend ведёт `<профиль>/diagnostics/backend-events.jsonl` (`src/backend/diagnostics.mjs`, 1 МБ и одна ротация, права 0600): старт, число подключённых клиентов, наличие lease и поколение, открытие клиента с причиной (`activate`, `second-instance`, `status-menu`), шаги остановки со значка (`stop-menu`, `stop-dialog` с ответом, `stop-cancel-menu`) и смена фазы службы (`service`), тип процесса не UIElement, `child-process-gone` и `render-process-gone` с типом, причиной и кодом, сигналы и запросы выхода. Клиент ведёт `<профиль клиента>/client-events.jsonl` (512 КБ): подключение, потеря и восстановление потока, lease, отказы acquire/renew и шаги остановки из меню окна. Перед диалогом остановки со значка служба выводится на передний план и затем снова скрывается из Dock. В журналы попадают только короткие скалярные значения: без токенов, текста чата, адресов страниц и путей.

## Проверка

`npm test` включает backend-тесты на временных профилях и локальной fixture-странице вместо ChatGPT, без модельных ходов и управления окнами пользователя: `backend-protocol` (валидация, resync, очереди), `backend-api` (auth/Host/Origin, журнал, UNKNOWN, медленный клиент), `backend-lifecycle` и `backend-owner-recovery` (владелец, повреждённые stores, Kit journal), `backend-launcher` (два launcher, устаревший descriptor), `backend-browser-lifecycle`, `backend-desktop-model`, `desktop-client`, `backend-reconnect` (два клиента, lease, истечение, restart, общий clientId окна), `backend-diagnostics` (журнал и тип LaunchServices), `backend-shutdown` (draining, отмена, выход, освобождение профиля), `backend-upgrade` (профиль 0.1.6, pending-установка, тестовые флаги), `backend-end-to-end` (launcher → fixture-план → SIGKILL клиента → продолжение → reconnect к той же странице/операции → stop). `npm run smoke` использует in-process окно только как стенд разработки. Результаты A01–A14 и ручной сценарий Mac — [приёмка](../acceptance/backend-independence.md).

Живые проверки пользователя: reopen через Finder/Dock/Spotlight, отсутствие лишней Dock-иконки, значок, настоящий ChatGPT и авторизация, физическая клавиатура/IME, меню ответов. Windows и Linux нативно не проверены. Отказ записи диска не моделировался. Отложенные этапы — [backend-independence-followup](../planning/backend-independence-followup.md).
