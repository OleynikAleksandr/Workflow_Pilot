# Workflow Pilot 0.1.0 — перенос и первый общий выпуск

## Результат и границы

Самостоятельное desktop-приложение `/Users/oleksandroliinyk/VSCODE/Workflow_Pilot`, https://github.com/OleynikAleksandr/Workflow_Pilot. 0.1.0: macOS arm64, Windows x64, Linux x64 из одного коммита; одно окно с локальной панелью и Chromium/ChatGPT Web, модель через веб-аккаунт без API.

Сохранить AutoPlan (кнопку/настройки), Review, sequential/parallel, recovery, проекты, Доктор, onboarding и оба подключения. Меняются архитектура, identity и платформы. База 0.6.115 переиздаёт 0.6.112; исправления 0.6.113/114 не возвращать автоматически, ограничения не объявлять исправленными. Удаление AutoPlan отменено пользователем 13.10.2026.

[Следующий этап](orchestrated-execution-next.md): оркестратор планирует, пользователь запускает, отдельный агент/чат/worktree на микрозадачу, зависимые волны последовательны; в 0.1.0 не реализуется. Плагин ChatGPT Web — отдельный будущий проект. Сейчас только сериализуемые границы Control, без плагина, нового MCP, UI-сервера и инфраструктуры коннекторов.

## Донор и подтверждённая база

Донор `/Users/oleksandroliinyk/VSCODE/Project Web Pilot`, https://github.com/OleynikAleksandr/Project-Web-Pilot; чистый HEAD `98a874236c3d5027e3be1de1faeae1d6c135f4c7` проверен 13.10.2026. Electron 44.5.1, Node 24.21.0, исходный Kit 1.7.2; сохранить locks и `tools/codex-app-server-mcp/codex-tools.lock.json`, не смешивать перенос с обновлением зависимостей.

Исходное поручение `/Users/oleksandroliinyk/Desktop/Workflow-Pilot-Migration-Planning-2026-10-13.md`; эта спецификация учитывает последующие решения и приоритетна. Пользователь разрешил самостоятельные решения до первого GitHub Release; вопросы следующего этапа не блокируют перенос. Разрешение не включает новую оркестрацию или серверную настройку VPS.

Донор/app/профиль/службы/настройки/Kit заморожены; при смене checkout читать закреплённые Git blobs. Записывающие тесты/сборки — только в новом проекте. Сохранить лицензии и provenance repo/path/SHA, не заменять новую историю донорской. Не копировать .git/.harness, проекты/сессии, cookies/профили/ключи, подпись, адрес коннектора, runtime/node_modules/.venv и app. Исключение — публичный Windows vendor-архив с закреплённым digest из платформенной спецификации. Managed Kit меняет installer.

До npm-запуска дополнить .gitignore вне managed-секции: /Workflow Pilot.app/, /.workflow-pilot-install-*/, /resources/workflow-kit/, /resources/chatgpt-page-observer-preload.cjs, windows-app/, __pycache__/, .DS_Store, *.log. Сохранить исключения node_modules/.harness/runtime, актуализировать выходные пути; исходники/locks не исключать. После test/start/smoke только намеренные правки, без generated/app/runtime в index; после коммита чистое дерево.

Новые коммиты: локальная identity Oleksandr Oliinyk, `31826606+OleynikAleksandr@users.noreply.github.com`, проверена T001; placeholders запрещены. Историю до `dcb2703c8a766d9f1cf7030f6fc69a8af1c8e9be` включительно не переписывать. T014 проверяет новых авторов перед push.

## Архитектура и ответственность

- ControlFacade: проекты, логические сессии/привязки, задания, AutoPlan/Review, recovery и проекция выполнения.
- ExecutionFacade: команды/файлы/процессы/stdin/terminal evidence, службы и технические исполнители; Execution/browser — страницы/observer/Send.
- Frontend: окна/preload/IPC/экраны/ввод, клиент Control. Bootstrap только собирает зависимости и lifecycle.
- Kit: единственный current plan и транзакции checkout, не чата; проекция не дублирует план.

Поток Frontend → Control → предоставленные операции Execution → подтверждённые результаты/события → проекция Control. Запрещены Electron/renderer в Control, внутренности Control в Execution и запись Frontend во внутренние stores. Один владелец запуска/остановки.

Методы открытия сессии, состояния, продолжения, адресной остановки, контекста и удаления задают аргументы/результат/ошибки, состояния, порядок, повторы, отписку. Только сериализуемые snapshots/ID, без Map/изменяемых records/Electron. Успех/ошибка/отмена/UNKNOWN различимы; потеря связи не равна завершению. Запрещены универсальный execute(action), DI-контейнер, общая шина, скрытый polling и фреймворк ради будущего плагина. Классы — для состояния/lifecycle; чистые функции — модули.

Раскладка: `src/control/{projects,sessions,workflow,context}/` и facade.mjs; `src/execution/{commands,files,browser,runtime,platform}/` и facade.mjs; `src/frontend/desktop/`; `src/contracts/` только сообщения/ошибки/валидация. `packages/workflow-kit/` — единственный исходный Kit, логически Control; `tools/codex-app-server-mcp/` — Execution; `resources/` — ресурсы/автономные workers, `scripts/` — разработка/поставка. Подпапки по необходимости; packages/tools/resources — технологические границы. Не превращать contracts в shared/common, Python в JS-каталог; src не импортирует scripts, workers не зависят от недоступного src.

## Карта переноса и порядок

| Донорский блок | Цель |
| --- | --- |
| main, preload, ui, окна | Frontend/bootstrap; продуктовые решения Control |
| workspace-session, session-plans | Control/projects,sessions,workflow; IO Execution |
| context-session, context-inputs, context-cache | Control/context; чтение/attachment Execution |
| session-runtime, conversation-recovery | Control привязки/recovery, Execution/browser страницы |
| auto-plan, project-auto-plan, project-session-auto-plan | Control/workflow, прежняя семантика |
| plan-review, review-continuation | Control/workflow, Claude через Execution |
| parallel-execution, parallel-kit, executor-session | Control/Kit назначения/интеграция, Execution страницы/процессы |
| chatgpt-dom/composer/experience, page-observer, page-state | Execution/browser, публичные экспорты/pageScript сохранены |
| mcp-runtime, mac-runtime-switch, windows-runtime, vps-tunnel | Execution/runtime,platform |
| workspace-setup, project-doctor, deletion, state-cleanup | Control сценарий, Execution worker, Frontend экран |
| startup-readiness, startup-platform, browser-startup, tunnel-setup | Те же границы, без отдельного установщика |

T001 сверяет экспорты/зависимости/динамические входы; отсутствие статического импорта не разрешает удаление. Сначала запускаемая копия, затем блоками: контракт → реализация/тесты → потребители → сценарий → удаление моста. Временные старые пути допустимы до удаления адаптера; каждая задача сохраняет запускаемость. Kit целиком не переписывать; необходимый остаточный цикл требует точного обоснования и теста против расширения.

План sequential из-за общих main/фасадов/stores/Kit; снимок допускает до четырёх исполнителей, но не требует их. Будущий алгоритм не разрешает делегировать перенос.

## Identity, подключение и существующие проекты

Package `workflow-pilot`, product `Workflow Pilot`, bundle `com.oleynik.WorkflowPilot`; собственные userData/browser/runtime/службы. macOS app: `<workspace>/Workflow Pilot.app` и `/Applications/Workflow Pilot.app`. Проверять цели/симлинки до записи; донорские пути запрещены. Не захватывать/останавливать legacy-службы, проверять порты/владельца. Закрытие окна сохраняет службы как в базе; stop адресует свою операцию. Два приложения не пишут один план: перед продолжением старого проекта остановить его работу в доноре.

VPS (SSH, 13.10.2026): Ubuntu 24.04.5 LTS x86_64, проект `/Users/oleksandroliinyk/VSCODE/vps-server`; канал, не Linux desktop. Запрещено присваивать/перезаписывать донорские `com.oleynik.vps-mcp-tunnel`, alias `vps-mcp-tunnel`, loopback 17842 и адрес vps-server.

Сохранить Secure MCP Tunnel/VPS. Новый VPS требует собственных alias/службы/конфига/loopback-маршрута; конфликт виден, дефолты не меняют рабочий канал. Сервер/пользователь/SSH настраиваются отдельно в vps-server вне плана. Пока использовать свой Secure Tunnel, VPS «требуется настройка»; донор не отключать, действующие секреты не документировать.

Старый проект: выбор папки → inspect Kit → сохранённые plan/история → новая локальная сессия → recovery один раз → незавершённая задача. Не импортировать чаты/профиль/список проектов. Чужие execution/transaction/assignment дают диагностируемый отказ без сброса/переприсвоения. База Kit 1.7.2; менять только новый packages/workflow-kit. Изменение owned-файлов требует новой версии и штатного upgrade с сохранением ACTIVE/DONE/identity. resources/workflow-kit генерируется, .harness/kit меняет installer; массовые обновления реальных проектов запрещены.

## Результаты T001 — сверка до копирования, 13.10.2026

HEAD/чистота/identity подтверждены до копирования. Корневой и Kit LICENSE — MIT, Copyright 2026 Oleksandr Oliinyk; устаревшее package.json `UNLICENSED` исправить в T002, сохранив авторство/provenance и отдельные лицензии компонентов.

Обязательные динамические входы:
- main → tests/electron-smoke.mjs: сохранить --smoke и динамический entrypoint после переноса.
- preload.cjs, archive-preload.cjs, ui/index.html, ui/archive.html: перенос вместе с BrowserWindow/webPreferences/file URL, включая packaged-пути.
- stage-page-observer.mjs → resources/chatgpt-page-observer-preload.cjs: staging до запуска/проверки, observer включён в пакет.
- resources/workspace-setup-worker.mjs и project-doctor-worker.mjs: отдельные Node execFile, cwd/ресурсы/standalone-импорты без dev checkout.
- DOM/composer/experience/pageScript: внешние экспорты Web Pilot Sidebar сохранять независимо от внутреннего графа.
- process.resourcesPath, platform.mjs, windows-runtime.mjs: packaged payload/scripts проверять отдельно от dev-запуска.

Пять групп проверок новой копии T002 и интеграции T011 (T001 их не запускает): npm test → node --test tests/*.test.mjs со staging Kit/observer; npm run smoke → Electron --smoke; npm --prefix packages/workflow-kit run check → check-package и consumer-contract/runtime/carryover/plan-review/parallel-plan/task-handoff/task-assignment/task-integration/parallel-execution/previous-upgrade fixtures; node --test tests/codex-app-server-mcp.test.mjs; npm run check:codex-tools → scripts/check-codex-tools.mjs.

Подтверждённые циклы: transaction → task-integration/task-assignment/validate; task-integration/task-assignment → transaction/validate; validate → task-integration/task-assignment; actions → plan-review/recovery, plan-review → actions, recovery → plan-review. T007 выделяет IO журнала и чистые evidence/schema, связывает review/actions в вызывающем сценарии; без динамического import для маскировки циклов и смены CLI/гарантий. Проверка — существующие fixtures и направленные import-правила.

Адаптировать через platform/identity, проверяя владельца: ~/Library/launchd control.py, PROJECT_WEB_PILOT env/markers, Windows vendor install-state/process.resourcesPath, общий VPS alias/службу/17842. Глобальная замена строк недостаточна. Linux control.py/setup/startupSupported отвергают Linux, tunnel loader формирует darwin-имя: работы T009, не повод копировать службы донора.

## Платформы, проверки и поставка

[migration-platforms.md](migration-platforms.md) — обязательная вторая часть scope/required context: Linux, onboarding, приёмка, выпуск.

## Готовность архитектурного переноса

Сценарии сохранены; фасады используются; владельцы единственны; Control без Electron; нет необоснованных циклов/обходов; мосты/дубли удалены по доказательствам; пакет самодостаточен; проекты 1.7.2 продолжаются; три пакета одной базы. Документы отражают результат, ссылки/якоря проверены. DOCS переносит выполненные требования в контракты и штатно удаляет временную спецификацию; будущая оркестрация остаётся невыполненной.
