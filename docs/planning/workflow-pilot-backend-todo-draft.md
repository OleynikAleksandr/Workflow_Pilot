# Workflow Pilot — черновик to-do plan независимого backend

Дата: 15.10.2026. Статус: ЧЕРНОВИК, НЕ АКТИВНЫЙ ПЛАН.
Спецификация: [workflow-pilot-backend-spec-draft.md](workflow-pilot-backend-spec-draft.md).
База: 0.1.6; предыдущий план закрыт. Предлагаемый выпуск: 0.2.0.

## Цель и исполнение

Основной результат — backend Mac + frontend Mac на одном Mac. Одно открытие приложения запускает оба. Закрытие frontend оставляет backend, браузер, MCP, туннель и автоматическую работу на этом же Mac. VPS не нужен.

Черновик охватывает рефакторинг, полную поставку трёх ОС, установку Mac и GitHub Release. Публичный web/mobile, VPS, передача проектов и новые правила ручных конфликтов остаются следующим этапам.

Все задачи TODO. Подготовка документа не выполняет их и не меняет .harness/plans/todo-plan.md. Публикация плана и реализация — после отдельного поручения.

Снимок будущего плана:
- parallel_allowed: false; max_workers: 2.
- execution_strategy: sequential.
- execution_reason: Снимок основной сессии запрещает параллельность. Перенос lifecycle, browser host и общего Control/API затрагивает одних владельцев состояния; результат каждого шага требуется следующему. Работа самостоятельная, без модельных исполнителей.
- execution_origin_session_id: web-pilot-428429f5-d6d4-45c6-9e4a-4c7ed9003a88.

Review ON подтверждён перед отправкой. Пользователь разрешил Claude Review этих двух черновиков через Kit; публикация и реализация требуют отдельного поручения. recipient_session_id верхнего уровня review:prepare: web-pilot-428429f5-d6d4-45c6-9e4a-4c7ed9003a88. Origin не является владельцем/адресатом плана.

Будущее выполнение: task:start → работа → commit --task → status, один коммит микрозадачи. 

## Контекст и проверки

Контекст по необходимости: AGENTS.md, OVERVIEW и module docs control/execution/browser/desktop/workflow-execution/first-run-onboarding/chatgpt-plugin/release/linux/project-compatibility, спецификация и относящийся код/диффы.

Существующие check IDs:
| ID | Команда |
| --- | --- |
| unit-all | npm test |
| electron-smoke | npm run smoke |
| architecture | npm run check:architecture |
| kit-check | npm run check --prefix packages/workflow-kit |
| executor-channel | node --test tests/codex-app-server-mcp.test.mjs |
| codex-tools-live | npm run check:codex-tools |
| migration-compatibility | node --test tests/migration-compatibility.test.mjs |
| linux-platform | node --test tests/linux-runtime.test.mjs tests/linux-startup.test.mjs |
| chatgpt-plugin | node --test tests/chatgpt-plugin.test.mjs |
| release-tooling | node --test tests/release-all.test.mjs tests/release-mac.test.mjs tests/release-linux.test.mjs |
| three-platform-release | npm run build |
| release-installed | node scripts/check-installed-release.mjs |
| github-release | node scripts/check-github-release.mjs |

Для отдельного plugin test обеспечить stage:chatgpt-plugin; test/smoke имеют pre-стадии. Новые *.test.mjs запускает unit-all; отдельные check IDs при необходимости вводятся через config:apply/task:update до commit. Новые пути уточняются по T001.

## Последовательность

| Шаг | Проверяемый результат |
| --- | --- |
| T001 | Доказан способ независимого интерактивного браузера |
| T002 | Закреплены сетевые контракты и владельцы |
| T003–T004 | Backend/browser живут без frontend |
| T005–T007 | API, изображение и весь клиент работают через контракт |
| T008–T010 | MCP/плагин, lifecycle, reconnect и права завершены |
| T011–T012 | Upgrade, поставка и общая регрессия подготовлены |
| DOCS | Документы выпуска актуальны |
| T013–T015 | Сборка, установка Mac, GitHub Release |

## T001 — Проверить независимый браузер и выбрать транспорт

Зависимости: нет.
Зачем: снять главный риск до массового переноса.

Пути: tests/fixtures/backend-browser-page.html, tests/backend-browser-prototype.test.mjs (новые), спецификация; необходимые prototype-модули определить до task:start. Generated output — .harness/runtime.
Проверки: unit-all запускает backend-browser-prototype.test.mjs с реальным transport/renderer; electron-smoke; architecture.

Приёмка:
- Сверены реальные lifecycle/ownership desktop, browser host, runtime и bridge.
- Сопоставлены готовые решения, лицензии, платформы и стоимость поставки; собственный видеокодек не создаётся.
- Изолированные backend/client: закрытие процесса клиента сохраняет страницу/таймер/черновик; новый клиент подключается к ним.
- Через реальное представление проверены ввод без фокусировки окна ОС, русский/составной текст, меню/popups, clipboard и файлы (A02/A03/A08/A09).
- Измерены читаемость, задержка, idle. Результат/транспорт переданы пользователю; после T001 план BLOCKED до живой проверки и записанного user_decision. T002 запрещён до согласия; прежнее правило переноса вопросов после релиза здесь не действует.
- Выбрана macOS-топология: helper-bundle/identity или activate/reopen backend. Учтены LaunchServices, locks/profiles, Dock и подпись; повторное открытие возвращает клиент.
- Непроверенные ОС не объявлены готовыми. Неуспех обязательного интерактива останавливает зависимые задачи до пересмотра решения; скрытое старое окно не заменяет результат.
- Живые графические проверки выполняет пользователь; автоматические — только fixtures, без модельных ходов.

## T002 — Закрепить контракт и границы

Зависимости: T001 и записанное согласие пользователя с результатом его живой проверки/транспортом.
Пути: src/contracts/backend.mjs, src/contracts/browser-presentation.mjs, src/backend/protocol.mjs, tests/backend-protocol.test.mjs, .dependency-cruiser.cjs, спецификация.
Проверки: новая backend-protocol — node --test tests/backend-protocol.test.mjs; architecture.

Приёмка:
- Handshake/version/boot generation, snapshot/events, command/result/operation/errors и browser input валидируются.
- Нет потери событий между snapshot и подпиской; пропуск вызывает resync.
- Определены requestId/dedup/UNKNOWN, пределы очередей, transferId и несовместимость версий.
- Определены auth/Host/Origin, lease generation, владельцы stores/partition и поколение документа.
- Нет прямого UI → Control, секретов или произвольного JS/shell API.
- Классифицированы plugin UI-мутации и агентские MCP-вызовы: отсутствие клиента не блокирует работу агента.

## T003 — Выделить самостоятельный backend host

Зависимости: T002.
Пути: src/main.mjs, frontend/desktop/{bootstrap,application}.mjs, src/backend/{main,bootstrap,lifecycle,identity}.mjs, src/control/facade.mjs, src/execution/facade.mjs, tests/backend-lifecycle.test.mjs. Сокращённые пути здесь и далее относятся к src/.
Проверки: новая backend-lifecycle — node --test tests/backend-lifecycle.test.mjs; unit-all; architecture.

Приёмка:
- Самостоятельный entrypoint/identity/profile и единственный владелец backend; повторный запуск не создаёт stores/runtime заново.
- Backend не погибает вместе с frontend или его process group.
- Control/Execution/Kit wiring перенесены из Desktop; browser подключается отдельным портом.
- Допуск фоновой работы не требует window/sidebarReady; предметные проверки готовности сохранены.
- Чужой владелец, повреждённые stores и незавершённая транзакция дают отказ без сброса данных.

## T004 — Передать backend страницы и автоматизацию

Зависимости: T003.
Пути: frontend/desktop/browser-host.mjs, execution/browser/{session-runtime,backend-host}.mjs, control/sessions/service.mjs, control/workflow/coordination.mjs, frontend/desktop/application.mjs, tests/session-runtime.test.mjs, tests/backend-browser-lifecycle.test.mjs.
Проверки: unit-all; electron-smoke с browser lifecycle fixture; architecture.

Приёмка:
- Backend владеет WebContents/partition/observer/records/ожиданиями и cleanup.
- Detach/закрытие клиента не вызывает release/dispose/recovery reset/cancel.
- Reconnect адресует прежнюю страницу без reload/recovery; фоновые cwd/identity сохранены.
- Fixture-цепочка продолжает следующие шаги без зрителей/клиента.
- Crash страницы отличается от detach; UNKNOWN не повторяется.
- Публичные DOM exports и staged observer сохранены.

## T005 — Провести команды и состояние через API

Зависимости: T004.
Пути: src/backend/{server,operations,events}.mjs, src/frontend/client/connection.mjs, src/contracts/backend.mjs, tests/backend-api.test.mjs.
Проверки: новая backend-api — node --test tests/backend-api.test.mjs; unit-all; architecture.

Приёмка:
- Настоящие loopback server/client выполняют разрешённые операции проектов/сессий/настроек/плана.
- Allowlist/валидация не слабее прежнего IPC; неправильные auth/Host/Origin отвергнуты.
- Операции живут после disconnect; повтор requestId не создаёт второй эффект.
- Принятие мутации фиксируется до эффекта; crash/смена boot generation требует сверки, не повтора Send.
- Медленный клиент/переполнение/повреждённое сообщение не блокируют backend.
- Control остаётся единственным источником stores, Kit — плана.

## T006 — Реализовать полный интерактив браузера

Зависимости: T005.
Пути: src/execution/browser/presentation/ (точные файлы по T001), src/frontend/client/browser-view.mjs, src/backend/transfers.mjs, src/contracts/browser-presentation.mjs, tests/browser-presentation.test.mjs, fixture-страница T001.
Проверки: новая browser-presentation через выбранный реальный transport/renderer; electron-smoke; architecture.

Приёмка:
- Отображается настоящая страница, ввод адресуется сессии/поколению; поздний ввод не попадает в другую.
- Работают меню ответов и разговора, подсказки, русский/составной ввод, прокрутка/выделение.
- Clipboard/upload/download/popups имеют сквозной клиентский путь.
- При disconnect нет зажатых клавиш и replay; наблюдатель не меняет viewport/scroll.
- Фоновая работа не требует видимого/сфокусированного пользовательского окна.
- Сохраняются draft/Stop/UNKNOWN; новые правила ручного вмешательства не вводятся.

## T007 — Перевести desktop в отдельный клиент

Зависимости: T006.
Пути: frontend/desktop/{bootstrap,application,ipc}.mjs, frontend/desktop/preload.cjs, frontend/desktop/ui/{sidebar,startup}.mjs и index.html; settings/archive/doctor/colors по инвентаризации T001; src/frontend/client/connection.mjs, tests/desktop-boundaries.test.mjs, tests/electron-smoke.mjs.
Проверки: unit-all; electron-smoke; architecture.

Приёмка:
- Целостное окно сохраняет панели и реальный браузер; завершение процесса frontend не завершает backend.
- Все обращения UI к Control через API; preload только для разрешённых клиентских OS-возможностей.
- Настройки, архив, удаление, Доктор, recovery и onboarding работают через новую границу.
- UI доступен при setup-required/ошибке службы и показывает состояние.
- Серверный путь проекта не подменяется локальным файловым диалогом удалённого клиента.
- Закрытие, Cmd+Q и Quit завершают только клиент; подписи меню поясняют поведение.

## T008 — Сохранить MCP, туннель и плагин без frontend

Зависимости: T007.
Пути: execution/plugin/bridge.mjs, control/plugin/{service,launch}.mjs, execution/runtime/{service,vps}.mjs, src/backend/lifecycle.mjs, tools/codex-app-server-mcp/plugin.py, tests/{chatgpt-plugin,codex-app-server-mcp}.test.mjs.
Проверки: chatgpt-plugin; executor-channel; unit-all; architecture.

Приёмка:
- Bridge/descriptor принадлежат backend, MCP доступен при нуле frontend.
- Выбранные настроенные службы переиспользуются, без дубликатов/всех альтернативных туннелей.
- Plugin resource/list/open/connect/recovery сохраняют контракт; ошибки отражают backend availability.
- Запуск не создаёт чат и не требует открытой панели; агентские инструменты продолжаются без клиента.
- UI плагина не обходит определённые права, agent MCP не требует frontend lease.
- UNKNOWN запуска не повторяется; внешние сессии автоматически не открываются второй страницей.
- Донорские службы/profile не меняются.

## T009 — Завершить launcher, значок и остановку

Зависимости: T008.
Пути: src/main.mjs, src/backend/{launcher,lifecycle,status-menu}.mjs, execution/platform/paths.mjs; платформенные адаптеры по T001; tests/{backend-launcher,backend-shutdown}.test.mjs.
Проверки: unit-all (backend-launcher/shutdown); electron-smoke; linux-platform; architecture.

Приёмка:
- Привычный запуск поднимает/подключает один backend; конкурирующие launcher/старые descriptors проверены.
- Постоянный значок/меню живут без frontend и показывают фактическое состояние.
- Повторное открытие .app через Finder/Dock/Spotlight при живом backend открывает клиент без перезапуска страницы; лишней Dock-иконки нет, locks процессов независимы.
- При отсутствии Linux tray статус/остановка доступны через launcher/клиент; ограничение отражено в DOCS и платформенной приёмке.
- Stop переходит в draining: новых назначений нет, текущий ответ и инструменты могут закончиться.
- Ожидание/причина/отмена stop видны; нет автоматического kill по timeout.
- В безопасной точке остановлены только собственные службы, подтверждение проверено.
- Живые системные действия выполняет пользователь; fixture не управляет его окнами.

## T010 — Проверить reconnect и управляющее право

Зависимости: T009.
Пути: src/backend/{control-lease,server,events}.mjs, src/frontend/client/{connection,browser-view}.mjs, tests/backend-reconnect.test.mjs.
Проверки: unit-all (backend-reconnect); electron-smoke; architecture.

Приёмка:
- Два настоящих клиента видят согласованный state; управление берётся/освобождается явно.
- Каждая UI-мутация/ввод проверяют generation; поздний запрос старого владельца отвергнут.
- Проверены короткий обрыв, истечение lease, crash клиента, пропуск событий и restart backend.
- Длительные операции сохраняют ID; нет повторного Send/recovery/создания проекта.
- Подписка не захватывает управление, отсутствие клиента не выключает AutoPlan.
- UI обозначает устаревание и блокирует непроверяемые изменения.

## T011 — Подготовить upgrade и поставку процессов

Зависимости: T010.
Пути: package.json/package-lock.json, scripts/{release-all,release-package,release-mac,release-linux,verify-windows-package,verify-linux-package,check-installed-release,stage-vendor-notices}.mjs, tests/{release-all,release-mac,release-linux,backend-upgrade}.test.mjs.
Проверки: release-tooling; migration-compatibility; unit-all.

Приёмка:
- Применена версия из user_decisions, согласованная до публикации; package/lock согласованы; production build не запускается.
- Три платформы включают launcher/backend/client/transport/resources и лицензии; macOS bundle/helper identity, signing и reopen соответствуют T001/T009.
- Upgrade своей 0.1.6 сохраняет stores/profile/Kit; старый активный владелец не допускает второго.
- Installer не заменяет runtime под живым backend: реализована проверенная стратегия версии/отложенного переключения.
- Несовместимость видна; нет убийства процесса или скрытого fallback.
- Откат совместим с состоянием и не затирает новую работу.
- Paths/executable bits/symlinks/signature/resource lookup проверены fixtures.

## T012 — Проверить общий результат и убрать временные пути

Зависимости: T011.
Пути: tests/backend-end-to-end.test.mjs, tests/electron-smoke.mjs, .dependency-cruiser.cjs, docs/acceptance/backend-independence.md; относящиеся production-модули при выявленных дефектах.
Проверки: unit-all, electron-smoke, architecture, kit-check, executor-channel, codex-tools-live, migration-compatibility, linux-platform, release-tooling, chatgpt-plugin; новые профильные проверки по рискам.

Приёмка:
- A01–A14 сопоставлены с доказательствами; названы pass/fail и pending manual/native.
- Сквозной launcher → fixture-план → закрытие/kill клиента → продолжение → reconnect к той же странице/операции → безопасный stop.
- Независимый API-клиент без preload и настоящий MCP/HTML bridge работают при отсутствии desktop.
- Удалены временные прямые вызовы и window-owned cleanup с проверкой динамических входов.
- Обязательные дефекты исправлены до DOCS; fixtures не выданы за живой ChatGPT.
- Пользователю передан сценарий Mac с меню, файлами, clipboard и reconnect.

## DOCS — Актуализировать документы выпуска

Зависимости: T001–T012.
Пути: README, OVERVIEW, собственная часть AGENTS, docs/modules/backend.md; действующие browser/desktop/control/execution/workflow-execution/first-run-onboarding/chatgpt-plugin/release/linux и acceptance; эти черновики после переноса требований.
Проверки: штатные схема/состав/размер документов Kit.

Приёмка:
- Описаны фактические процессы, запуск/выход/stop, один источник страницы и границы поддержки.
- Устаревшее требование держать desktop открытым заменено; нет штатного продолжения того же чата во втором браузере.
- Переход версии учитывает живой backend и действия пользователя.
- Выпущенные требования перенесены в module contracts, временные документы удалены без потери отложенных этапов.
- Required-ссылки удалённых документов ведут на существующий Git blob; каждый документ до 28000 bytes.
- DOCS завершена до sourceCommit и production build.

## T013 — Собрать новый выпуск трёх ОС

Зависимости: DOCS.
Тип: delivery/package. Проверка: three-platform-release.
Пути: release-manifest.json; generated вне Git.

Приёмка:
- Один штатный цикл macOS arm64/Windows x64/Linux x64 из одного sourceCommit.
- Полный состав процессов/resources, подпись, лицензии, инструкции, SHA256SUMS/manifest.
- Архивы распакованы и проверены по version/sourceCommit/size/digest; комплект в Downloads/WorkflowPilot-<version>.
- Корневой/staging/поставочный manifest совпадают; предыдущие выпуски сохранены.
- Частичный комплект не выпуск; исправление исходников требует новой базы и общего цикла.
- Native/clean ограничения названы фактически.

## T014 — Установить готовый macOS выпуск

Зависимости: T013.
Тип: delivery/installed. Проверка: release-installed.
Пути: manifest только для сверки; evidence Kit.

Приёмка:
- Готовая app установлена штатно в проект и /Applications/Workflow Pilot.app без пересборки/переподписи.
- Сверены version/sourceCommit/manifest/signature/composition и откат.
- Агент не завершает клиент/backend, runtime активной версии не повреждён.
- Даны точные действия безопасного переключения пользователя.
- Установка не объявлена живой приёмкой.

## T015 — Опубликовать и сверить GitHub Release

Зависимости: T014.
Тип: delivery/package. Проверка: github-release.
Пути: manifest только для сверки; evidence Kit.

Приёмка:
- Собственный main отправлен fast-forward, тег на manifest.sourceCommit.
- Полный готовый комплект T013 опубликован без пересборки; assets/manifest/size/digests сверены.
- После финального коммита remote main соответствует local HEAD.
- Даны результаты и сценарий приёмки, pending Windows/Linux/clean без ложного native-tested.
- План READY_FOR_ACCEPTANCE; закрытие только по прямому поручению.

## Переход от черновика к плану

До публикации сверить status/Review и записать user_decisions с подтверждёнными версией, границами, lease 10/45 с и описанным draining. Сейчас согласие не предполагается. Затем подготовить JSON по plan:create --help. Перенести задачи, зависимости, точные files/checks/context_pack и снимок исполнения. Не заполнять будущие commit_ref или доказательства.

Если транспорт ещё не подтверждён, T001 остаётся первой задачей с обязательной остановкой зависимых работ при неуспехе. Новые проверки вводятся их задачами и штатной конфигурацией Kit. DOCS и delivery имеют явные зависимости.
