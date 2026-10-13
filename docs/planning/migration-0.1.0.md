# Workflow Pilot 0.1.0 — перенос и первый общий выпуск

## Результат и границы

Workflow Pilot — самостоятельное desktop-приложение в `/Users/oleksandroliinyk/VSCODE/Workflow_Pilot`, репозиторий https://github.com/OleynikAleksandr/Workflow_Pilot. Выпуск 0.1.0: macOS arm64, Windows x64, Linux x64 из одного коммита; одно окно с локальной панелью и Chromium/ChatGPT Web, модель через веб-аккаунт без API.

Сохранить донорские AutoPlan (кнопку/настройки), Review, sequential/parallel, recovery, проекты, Доктор, onboarding и оба подключения. Меняются архитектура, identity, платформы. Исправления 0.6.113/0.6.114 не возвращать автоматически; ограничения базы не объявлять исправленными.

[Следующий этап](orchestrated-execution-next.md): оркестратор планирует, пользователь запускает, отдельный агент/чат/worktree на микрозадачу, зависимые волны последовательны. В 0.1.0 не реализуется. Удаление AutoPlan отменено пользователем 13.10.2026.

Плагин ChatGPT Web — будущий отдельный проект. Сейчас нужны сериализуемые границы Control для адаптера, без плагина, нового MCP, UI-сервера и инфраструктуры коннекторов.

## Донор и подтверждённая база

- Project Web Pilot: `/Users/oleksandroliinyk/VSCODE/Project Web Pilot`.
- Репозиторий https://github.com/OleynikAleksandr/Project-Web-Pilot.
- Зафиксированный donor commit: `98a874236c3d5027e3be1de1faeae1d6c135f4c7`, релиз 0.6.115, переиздание базы 0.6.112; рабочее дерево было чистым при проверке 13.10.2026.
- Electron 44.5.1, Node 24.21.0, исходный Workflow Kit 1.7.2. Сохранять lock-файлы и закреплённый контракт Codex из `tools/codex-app-server-mcp/codex-tools.lock.json`; обновления зависимостей не смешивать с переносом.
- Исходное поручение: `/Users/oleksandroliinyk/Desktop/Workflow-Pilot-Migration-Planning-2026-10-13.md`. Настоящая спецификация учитывает последующие решения пользователя и имеет приоритет при расхождении.

Донор, его app/профиль/службы/настройки/Kit заморожены. При изменении checkout читать закреплённые Git blobs. Тесты и сборки с записью — только в новом проекте. Сохранить лицензии и provenance repo/path/SHA; новую Git-историю не заменять донорской.

Не копировать .git, .harness, проекты/сессии, cookies/профили/ключи, подпись, адрес коннектора, runtime/node_modules/.venv и приложения донора. Новый Kit установлен, managed-файлы меняет installer. Исключение: публичный Windows vendor-архив как зависимость; источник/digest — в платформенной спецификации.

До npm-запуска дополнить .gitignore вне managed-секции: /Workflow Pilot.app/, /.workflow-pilot-install-*/, /resources/workflow-kit/, /resources/chatgpt-page-observer-preload.cjs, windows-app/, __pycache__/, .DS_Store, *.log. Сохранить node_modules/.harness/runtime; актуализировать выходные пути, не исключать исходники/locks. После test/start/smoke — только намеренные правки, без generated/app/runtime в index; после коммита дерево чистое.

Новые коммиты используют локальную identity донора: Oleksandr Oliinyk, GitHub noreply; placeholder «Ваше Имя»/you@example.com запрещён. Историю до dcb2703c8a766d9f1cf7030f6fc69a8af1c8e9be включительно не переписывать: это исключение для старых коммитов. T001 проверяет identity, T014 — всех новых авторов перед push.

## Архитектура и ответственность

| Кластер | Ответственность | Граница |
| --- | --- | --- |
| Control | Проекты, логические сессии, привязки к чатам, задания, AutoPlan, Review, recovery, пользовательская проекция выполнения | ControlFacade |
| Execution | Команды, файлы, процессы, службы, технические исполнители, браузер и наблюдение страниц | ExecutionFacade и узкий browser-контракт |
| Frontend | Desktop bootstrap, окна, preload/IPC, представление и ввод пользователя | Клиент ControlFacade |

Frontend → Control → предоставленные операции Execution → подтверждённые результаты/события → проекция Control. Bootstrap собирает зависимости/жизненный цикл, без продуктовых решений. Запрещены импорты Electron/renderer в Control, внутренностей Control в Execution и запись Frontend во внутренние stores.

Владельцы: проекты/сессии/привязки/назначения — Control; current plan/транзакции — Kit; процессы/stdin/terminal evidence — Execution; страницы/observer/Send — Execution/browser; экраны — Frontend. Один current plan на checkout, не на чат; проекция его не дублирует.

Методы: открыть сессию, получить состояние, продолжить, остановить точную операцию, подготовить контекст, удалить проект. Контракт задаёт аргументы/результат/ошибки, состояния, порядок, повторы и отписку. Только сериализуемые snapshots/ID, без Map/изменяемых records/Electron. Успех, ошибка, отмена, UNKNOWN различимы; потеря связи не равна завершению. Один владелец запуска/остановки.

Никаких универсального execute(action), DI-контейнера, общей шины событий, скрытого polling или фреймворка ради будущего плагина. Классы — для состояния/жизненного цикла, чистые функции — обычные модули.

Целевая раскладка:
- `src/control/{projects,sessions,workflow,context}/`, `src/control/facade.mjs`;
- `src/execution/{commands,files,browser,runtime,platform}/`, `src/execution/facade.mjs`;
- `src/frontend/desktop/` — bootstrap, окна, preload, IPC и renderer;
- `src/contracts/` — только общие сообщения/ошибки/валидация границ;
- `packages/workflow-kit/` — единственный исходный Kit, логически Control;
- `tools/codex-app-server-mcp/` — исполнитель, логически Execution;
- `resources/` — ресурсы и автономные workers; `scripts/` — разработка/поставка.

Подпапки — по необходимости; packages/tools/resources — технологические границы, не кластеры. contracts не превращать в shared/common, Python — в JS-каталог. src не импортирует scripts; workers автономны от недоступного src.

## Карта переноса и порядок

T001 уточняет экспорты, зависимости и динамические входы до копирования; отсутствие статического импорта не разрешает удаление.

| Донорский блок | Целевое размещение и разделение |
| --- | --- |
| main, preload, ui, окна | bootstrap и Frontend; продуктовые решения — Control |
| workspace-session, session-plans | Control/projects, sessions, workflow; физический IO — Execution |
| context-session, context-inputs, context-cache | Control/context; чтение и attachment — Execution |
| session-runtime, conversation-recovery | Control решает привязку/recovery; Execution/browser ведёт страницу |
| auto-plan, project-auto-plan, project-session-auto-plan | Control/workflow с прежней семантикой |
| plan-review, review-continuation | Control/workflow; запуск Claude — Execution |
| parallel-execution, parallel-kit, executor-session | Назначения/интеграция — Control/Kit; страницы/процессы — Execution |
| chatgpt-dom/composer/experience, page-observer, page-state | Execution/browser; сохраняются публичные экспорты и pageScript |
| mcp-runtime, mac-runtime-switch, windows-runtime, vps-tunnel | Execution/runtime и platform |
| workspace-setup, project-doctor, deletion, state-cleanup | Сценарий Control, worker Execution, экран Frontend |
| startup-readiness, startup-platform, browser-startup, tunnel-setup | Первый запуск через те же границы, без отдельного установщика |

Сначала безопасная запускаемая копия, затем по блокам: контракт → реализация/тесты → потребители → сценарий → удаление моста. Старые пути временно допустимы с условием удаления адаптера. Каждая задача сохраняет запускаемость.

Циклы Kit перечислены в результатах T001 ниже. Устранить смешанные обязанности; необходимый остаточный цикл требует обоснования и теста против расширения. Kit целиком не переписывать.

План sequential: фасады/main/stores/Kit взаимозависимы, worktree умножат временные мосты. Снимок допускает до четырёх исполнителей, но не требует их. Будущий алгоритм не разрешает делегировать этот перенос.

## Identity, подключение и существующие проекты

Identity: package `workflow-pilot`, product `Workflow Pilot`, bundle `com.oleynik.WorkflowPilot`; собственные userData/browser/runtime/службы. macOS: `<workspace>/Workflow Pilot.app` и `/Applications/Workflow Pilot.app`. Проверять цель/симлинки до записи; донорские пути запрещены.

Запретить автозахват/остановку legacy-служб. Проверять доступность портов и владельца. Закрытие окна сохраняет службы как в базе; stop адресует свою операцию. Продолжать старый проект только после остановки его работы в доноре: два приложения не пишут один план.

VPS (SSH, 13.10.2026): Ubuntu 24.04.5 LTS x86_64, проект `/Users/oleksandroliinyk/VSCODE/vps-server`; это канал, не Linux desktop. Донорские `com.oleynik.vps-mcp-tunnel`, alias `vps-mcp-tunnel`, loopback 17842 и адрес vps-server запрещено присваивать/перезаписывать.

Сохранить переключатель Secure MCP Tunnel/VPS. Новый VPS требует явных собственных alias/службы/конфига/loopback-маршрута; конфликт владельца виден, дефолты не меняют работающий канал. Сервер/пользователь/SSH на VPS настраиваются отдельно в vps-server, вне этого плана. До этого использовать свой Secure Tunnel и статус VPS «требуется настройка»; донор не отключать. Документировать подключение без действующих секретов.

Старый проект: выбор папки → inspect Kit → сохранение current plan/истории → новая локальная сессия → recovery один раз → незавершённая задача. Не импортировать чаты/профиль/список проектов. Чужие execution/transaction/assignment дают диагностируемый запрет без сброса/переприсвоения.

База Kit 1.7.2; менять только новый packages/workflow-kit. Изменение поставляемых owned-файлов требует новой версии и штатного upgrade с 1.7.2, сохраняя ACTIVE/DONE/identity. resources/workflow-kit генерируется; .harness/kit меняет installer. Массово обновлять реальные проекты запрещено.

## Результаты T001 — сверка до копирования, 13.10.2026

Подтверждены точный HEAD донора и чистое рабочее дерево; исходники пока не копировались. Корневой LICENSE и packages/workflow-kit/LICENSE: MIT, Copyright 2026 Oleksandr Oliinyk. Корневое package.json донора содержит устаревшее `license: UNLICENSED`; в T002 привести метаданные нового продукта к фактическому MIT LICENSE, сохранить авторство и provenance repo/path/commit. Это не меняет лицензии внешних компонентов. Локальная Git identity повторно проверена: Oleksandr Oliinyk, 31826606+OleynikAleksandr@users.noreply.github.com.

Карта выше дополнена обязательными входами, которые статический граф не доказывает лишними:

| Вход донора | Условие сохранения при переносе |
| --- | --- |
| src/main.mjs → динамический tests/electron-smoke.mjs | Сохранить режим --smoke и загрузку тестового entrypoint после перемещения bootstrap |
| src/preload.cjs, src/archive-preload.cjs, ui/index.html, ui/archive.html | Обновлять BrowserWindow/webPreferences и file URL вместе с файлами; проверять packaged-пути |
| scripts/stage-page-observer.mjs → resources/chatgpt-page-observer-preload.cjs | Генерируемый observer включается в пакет; staging предшествует запуску/проверке |
| resources/workspace-setup-worker.mjs, resources/project-doctor-worker.mjs | Отдельные Node-процессы через execFile; cwd, ресурсы и standalone-импорты не зависят от dev checkout |
| chatgpt-dom/composer/experience, pageScript | Внешний Web Pilot Sidebar использует экспорты; сохранять имена/контракт, не удалять по отсутствию внутренних импортов |
| process.resourcesPath, platform.mjs, windows-runtime.mjs | Packaged payload и пути scripts проверяются отдельно от исходного запуска |

Реальные entrypoints базы: `npm test` → `node --test tests/*.test.mjs` (со staging Kit/observer); `npm run smoke` → Electron --smoke и tests/electron-smoke.mjs; `npm --prefix packages/workflow-kit run check` → пакетный scripts/check-package.mjs и consumer-contract/runtime/carryover/plan-review/parallel-plan/task-handoff/task-assignment/task-integration/parallel-execution/previous-upgrade fixtures. Executor-channel: `node --test tests/codex-app-server-mcp.test.mjs`; codex-tools-live: `npm run check:codex-tools` → scripts/check-codex-tools.mjs. T001 suite не запускает; все пять групп обязательны в новой копии T002 и на интеграции T011.

Циклы подтверждены прямыми импортами: transaction → task-integration/task-assignment/validate; task-integration и task-assignment → transaction/validate; validate → task-integration/task-assignment. Второй узел: actions → plan-review/recovery, plan-review → actions, recovery → plan-review. Решение T007: выделить низкоуровневое чтение/запись журнала и чистую проверку evidence/schema без импорта orchestration-модулей; вынести связывание review и actions на уровень вызывающего сценария. Не заменять цикл динамическим import и не менять CLI/транзакционные гарантии. Точную декомпозицию проверяют существующие fixtures и направленные import-проверки.

Старые runtime-пути не являются требованиями нового продукта: ~/Library и launchd в control.py, донорские PROJECT_WEB_PILOT-переменные/markers, Windows vendor install-state и process.resourcesPath, общий VPS alias/служба/17842. Их адаптация идёт через platform/identity, а не глобальную замену строк без проверки владельца. Linux control.py/setup и startupSupported пока отвергают Linux; загрузчик tunnel-client формирует darwin-имя. Это конкретные работы T009, не основание копировать рабочие службы донора.

Подтверждение пользователя распространяется на самостоятельные решения в этом плане до первого GitHub Release; вопросы для следующего этапа сохраняются, но не блокируют перенос. Оно не расширяет scope до смены серверной конфигурации или новой оркестрации. Документ следующего этапа проверен: отдельный агент/чат для каждой микрозадачи остаётся будущим требованием.

## Платформы, проверки и поставка

[migration-platforms.md](migration-platforms.md) — обязательная вторая часть того же scope/required context: Linux, onboarding, приёмка, выпуск.

## Готовность архитектурного переноса

Готовность: сохранены сценарии; фасады имеют потребителей; владельцы единственны; Control без Electron; нет необоснованных циклов/обходов; мосты/дубли удалены по доказательствам; пакет самодостаточен; проекты 1.7.2 продолжаются; три пакета из одной базы. Документы отражают результат, ссылки/якоря проверены. DOCS переносит выполненные требования в контракты, штатно удаляет временную спецификацию; будущая оркестрация остаётся невыполненной.
