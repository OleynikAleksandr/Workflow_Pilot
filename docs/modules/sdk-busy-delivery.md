# Измерение доставки занятому оркестратору

Workflow Pilot 0.5.37 / Kit 1.10.2 / role 11 / panel protocol 5, build `0.5.37-communication-5`. Это ограниченный опыт для отдельного тестового проекта. По умолчанию `mode=off`: действует обычный [диалог O/E](assignment-dialogue-reliability.md). Успех опыта не включает его глобально. Порядок живой проверки, форматы evidence и условие публикации — [приёмка](../acceptance/sdk-busy-recipient.md).

Проверяется полный сценарий: два независимых E → два проверенных result занятому O → read/yield → acceptance точных SHA → интеграции → T003/DOCS → терминальные квитанции → cleanup/complete. Предварительного single-сценария нет. SDK accepted, read, конец ответа, принятие результата, merge и complete — разные факты.

Официальный интерфейс сверён с [message.ts](https://github.com/openai/mcp-extensions/blob/36f8b38df179144b44d157133bbc5f7c6e353ace/typescript/src/app/message.ts), commit `36f8b38df179144b44d157133bbc5f7c6e353ace`. Поставляется закреплённый `@openai/mcp-extensions` 0.2.0, ext-apps 1.7.5, MCP SDK 1.32.1. `createMessage.send` передаёт запрос в `app.sendMessage`; гарантии очереди занятого ChatGPT нет. Именно её внешнее наблюдение исследуется. Work, API-модель, DOM-ввод, MCP Events и обход подтверждений хоста не добавляются.

## Подготовка и identity

`scripts/prepare-sdk-busy-experiment.mjs` получает явные абсолютный `--workspace` и `--test-workspace`; выбранный sidebar не используется. Отказывает development checkout, донору и вложенным в них путям, симлинкам, чужому/неопубликованному scope и неподходящим задачам. Из собственного Kit читает project/scope; два task IDs по умолчанию T001/T002 должны быть независимыми, parallel_safe и ещё не DONE. Conversation/participant IDs пользователь не копирует.

Файл `<workspace>/.harness/runtime/experiments/sdk-busy.json` записывает Execution: проверка цепочки путей и типа/размера, UTF-8 JSON, временный файл 0600, fsync, rename и синхронизация каталога. Чтение ограничено 32768 байтами; конечный файл не открывается через симлинк. Неизвестные поля/версия отвергаются. Отсутствующий файл означает off; испорченный файл не даёт разрешения.

Профиль version 1: `mode=off|sdk-busy-burst`; для burst обязательны `experiment_id`, свежий `activation_id`, точные `project_id`, `workspace`, `scope_id`, `recipient_role=O`, `build_id`, `test_workspace=true` и `cases` (1–16). Case: уникальный `case_id`, `busy_kind=tool-wait|generation|read-only-command`, `max_notifications=2`, ровно два разных `task_ids`. Для read-only-command обязателен SHA256 `preliminary_go` проверенного предварительного отчёта. Строковые ключи ограничены ASCII буквами/цифрами/точкой/подчёркиванием/дефисом, до 80 символов.

При первом настоящем Start закрепляется политика scope. Scope, начатый off, нельзя повысить до burst из панели, модели или поздней локальной записи. Следующий независимый case требует явной локальной подготовки, нового activation/case, того же scope и лимита 2. Использованный case и ранее выбранные/полученные model-pull результаты повторно не вооружаются. Пауза/Stop запрещают новые отправки. Restart делает сохранённый опыт неактивным: прежняя запись сама не включает его, intent/claimed/accepted/unknown не обнуляются. Continue не заменяет новую локальную подготовку после restart.

ExecutionFacade читает конфигурацию; ControlFacade сопоставляет собственный root project/O/build и передаёт проверенный профиль PluginCommunication. Control не читает fs. Существующий ProjectInputWatch наблюдает именованные config/command-activity входы, будит адресного получателя и обновляет снимок; нового scheduler или рекурсивного наблюдателя дерева нет.

До Start известны только task IDs. После двух настоящих проверенных result backend однократно связывает case с assignment/attempt/message/source SHA и Kit operation receipt, в порядке сохранения. До этого результаты удерживает только измерительный допуск. Обычные задачи не получают новых разрешений от измерения.

## Единый допуск и два слота

Используется обычный путь E: checked `commit --task` → `workflow_assignment_send(kind=result)` → Kit proof → WAL. SDK уведомляет O через `ui/message`, `role=user`, `target=active`, `send=true`; тело читается через MCP. Заключительного текста E для отправки result не требуется.

Один серверный допуск проходит pending/first/claimBlockReason/physicalBlock/admit/verify, включая combined claim_ready и обе ветви verify. Только выбранным result разрешено пересечь busy/idle, отсутствие writable/Send и lastRole, вызванные текущим ответом O. Глобальный canSend не меняется.

Обязательны собственные project/session/O/scope/generation/backend, актуальные grant и panel lease, настоящий Chat URL/документ/login, свежая identity, готовый документ, checked assignment/attempt/SHA. Черновик, manual Stop/Пауза, отмена/удаление/архив, connection error и неизвестное состояние блокируют. Last-minute admission повторно читает команды и проверяет currentMessage; cached observation — только предварительный сигнал.

Предыдущий вход пропускается лишь после собственного read (либо штатного superseded_read), когда мешает только физический конец старого хода. Непрочитанный старый вход, startup, claimed/UNKNOWN, чужая generation и нерешённый blocking вопрос остаются барьерами. Исключение FIFO действует только между двумя независимыми выбранными result: второй отправляется после быстрого SDK Promise первого, без ожидания его read/yield/idle. Вызовы последовательны; параллельных Send ради измерения нет. Слот долговечно резервируется до intent; повтор attempt и вторая панель не создают третий вызов.

Прежний `member.deliveryGate` не перезаписывается. У каждого отправленного экспериментального result свой `message.handlingGate`; accepted+read+yielded сообщения наблюдаются/восстанавливаются через штатные observed/probes/settled. Свежий общий конец ответа может завершить несколько собственных обработанных gates, но не выдумывает read/yield/reply_observed и не закрывает чужую работу. Обычный 120-probe предел и интеграционные/complete барьеры сохранены. Никакой эффект принятия/merge не следует из одного SDK accepted.

## Реальная занятость

Инструменты видны модели, но разрешены только своему локально вооружённому O/case со свежей host identity; workspace/run/participant и mode аргументами не задаются. Bridge принимает только типизированные действия. Новых рабочих кнопок нет; mode/case/slots выводятся в существующей диагностике.

`workflow_delivery_experiment_hold(case_id, duration_ms=15000)` — tool-wait. Максимум 30000 мс; одинаковый case/duration сохраняет исходный интервал/nonce. Начало сохраняется до wake; асинхронное ожидание идёт вне очереди мутаций, поэтому оба result могут пройти в этот интервал. Отмена не разрешает повтор SDK.

`workflow_delivery_experiment_checkpoint(case_id, marker=begin|resume|final, nonce?)`: begin возвращает nonce; resume/final требуют его же. Эти отметки не означают обработку уведомления. Generation после begin ждёт свежего same-document busy-наблюдения с продвижением assistantRevision. Это только кандидат генерации: tool-карточка/скрытое reasoning не доказываются по revision. Для строгого вывода нужна отдельная наблюдаемая граница прежней работы/хода. Инструкция не требует игнорировать реальное уведомление и не задаёт произвольное «думай N секунд».

В tool-wait/generation запрещены **все** активные команды, включая verified read-only/services, которые не повышают обычный commandActive. Обычные commandActive/blocksIntegration не меняются.

Read-only-command разрешён только после предварительного GO основных случаев. Execution создаёт точный cmd из собственного поставляемого Python, `-B -I -S -c`, фиксированного inline-кода, позиционных nonce/duration (до 30 с). Скрипт печатает start/end, ждёт и выходит; workspace не пишет, Kit не вызывает, произвольный код не принимает и из app.asar файл не запускает. POSIX/PowerShell quoting генерируется заранее. Модель вызывает `exec_command` с точными cmd/workdir, `read_only=true`, `login=false`. До выдачи закреплены command_hash/nonce; command-activity должен подтвердить единственный running процесс, свежий started_at, process_id и затем тот же command-id. Любая дополнительная/неизвестная команда запрещает отправку. Невозможность подтвердить процесс — NOT_RUN/INCONCLUSIVE, не общий GO.

## Раннее чтение и неопределённость

Read/model-pull до собственного SDK аннулирует измерение пары, не запрещая штатное чтение. Status не раскрывает preview тела выбранного unread result, включая первый до связывания пары. Явный read_context до read_message регистрирует `experiment.model_pull`: если intent ещё не было, case становится invalid, сообщение помечается model-pull без поддельного read и больше не отправляется SDK. Уже полученное тело нельзя включить в новую измерительную пару. Read_message остаётся доступен для настоящей квитанции. Между intent и реальным SDK вывод делается по коррелированным часам; неизвестная граница означает INCONCLUSIVE.

Уже отправленный intent не исчезает. При changed result, superseded, rejection/UNKNOWN, утрате lease или неизвестном исходе burst прекращается. Сохранённые результаты продолжают обычную обработку без переотправки старого Send. Повтор измерения требует новых case/реальной пары или плана.

Обычный SDK timeout 10 с и panel lease 60 с сохранены. Для фактически допущенного экспериментального attempt SDK timeout 90 с; действующая панель во время Promise делает адресный sync каждые 20 с. Sync не продлевает grant и не меняет generation. Stop/remount/expiry/потеря lease запрещают новые отправки; report своего intent допустим штатно и позднее. Claimed experimental attempt не истекает по обычному 35-секундному правилу: его предел 120 с. Окно case — 120 с от первой отправки; анализ использует реальные sdk.invoked. Это срок наблюдения **доставки**, не всего выполнения T003/DOCS.

SDK вызывается ровно один раз на attempt. Captured binding/attempt остаются у позднего Promise; late_accepted/late_rejected — отдельные события, не перезапись UNKNOWN. Потерянный report, рестарт и серверный send.unknown не маскируются поздним accepted или последующим read/yield. Разрешение host confirmation не обходится.

## Журнал и анализ

Используются прежние WAL, event_id, server seq, monotonic client sequence и постраничный export. Новые server experiment.* не принимаются от клиента. Python `CommunicationEvent(extra=forbid)` и JS allowlist согласованы; SDK события несут собственный attempt/case, остальные assignment/SHA backend выводит по message_id. sdk.invoked находится непосредственно у настоящего вызова, без промежуточного await. В диагностике нет raw SDK responses, тела разговора, билетов, credentials или аргументов shell.

Сохраняются armed/fixture_hold/case_started/hold_started/hold_finished/checkpoint/generation_candidate/command_observed/dispatch_admitted/model_pull/invalidated/handling_complete, intent/report/read/yield/terminal receipts. Транскрипт контрольной работы — отдельный явно сохранённый пользователем файл с digest. Client arrival order не является порядком выполнения; clock domain, pagination/frontend.gap, несовместимый ресурс и неизвестная граница хода сохраняют неопределённость.

`scripts/analyze-sdk-busy-experiment.mjs` только читает evidence; JSON выводится в stdout, `--markdown` выводит Markdown. Для обоих result и burst даёт QUEUED_OBSERVED / MID_TURN / SDK_DEFERRED / REJECTED / UNKNOWN / ACCEPTED_UNREAD / INCONCLUSIVE. Read calls считает отдельно от одного Git-эффекта. Full cycle проверяет отдельно по Kit/Git/terminal/cleanup; success fixtures не становится live GO. Полные входные схемы и команды — в приёмке.

Контракты заменили временные спецификации. Их исходные требования доступны в Git: [основной](https://github.com/OleynikAleksandr/Workflow_Pilot/blob/f51752ab25451636fc71c780c0ec735a9d3b0d61/docs/planning/sdk-busy-recipient.md), [приёмка](https://github.com/OleynikAleksandr/Workflow_Pilot/blob/f51752ab25451636fc71c780c0ec735a9d3b0d61/docs/planning/sdk-busy-recipient-acceptance.md), [поставка](https://github.com/OleynikAleksandr/Workflow_Pilot/blob/f51752ab25451636fc71c780c0ec735a9d3b0d61/docs/planning/sdk-busy-recipient-delivery.md). До push эти exact blobs доступны локальным `git show <SHA>:<path>`; копий-архивов в текущем дереве нет.
