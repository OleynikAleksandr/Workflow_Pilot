# Активный план — Workflow_Pilot

<!-- workflow-state:begin -->
```json
{
  "schema_version": 1,
  "plan_revision": 200,
  "project_id": "7411e192-943c-4529-bffb-3b081d9c242f",
  "project_name": "Workflow_Pilot",
  "scope_id": "workflow-pilot-remote-access",
  "execution_scope_status": "ACTIVE",
  "delivery_status": "IN_PROGRESS",
  "objective": "Интерфейс Workflow Pilot на iPad из любой точки интернета через Tailscale к backend на Mac; шаг мастера первого запуска.",
  "acceptance_criteria": [
    "R01 Удалённый доступ выключен по умолчанию; включение и выключение явные, состояние видно на Mac",
    "R02 Без Serve, заголовка владельца, с чужого аккаунта или без подтверждённого устройства доступ невозможен; отключённое устройство теряет доступ сразу",
    "R03 iPad из мобильной сети открывает интерфейс, видит те же проекты и страницу, берёт управление явно",
    "R04 Экранная клавиатура (русский, составной ввод), касания, прокрутка, меню работают; поздний ввод отвергается",
    "R05 Файлы с iPad и на iPad работают сквозным образом",
    "R06 Сон iPad, смена сети и обрыв не повторяют мутаций, Send и recovery",
    "R07 Объём кадров через интернет ограничен; чёткость и задержка приемлемы на живой проверке",
    "R08 Окно Mac, плагин ChatGPT и MCP работают как в 0.2.1; основной API остаётся loopback",
    "R09 Мастер первого запуска и Настройки проводят по шагам для компьютера и iPad с проверкой состояния; выключение снимает только свою настройку",
    "R10 DOCS, выпуск трёх ОС, установка и GitHub Release по обычному порядку; iPad и Tailscale — живая проверка пользователя"
  ],
  "approved_scope": {
    "functional_paths": [
      ".dependency-cruiser.cjs",
      "package-lock.json",
      "package.json",
      "release-manifest.json",
      "src/backend/control-lease.mjs",
      "src/backend/desktop-model.mjs",
      "src/backend/events.mjs",
      "src/backend/lifecycle.mjs",
      "src/backend/main.mjs",
      "src/backend/operations.mjs",
      "src/backend/protocol.mjs",
      "src/backend/remote-devices.mjs",
      "src/backend/remote-gateway.mjs",
      "src/backend/remote-surface.mjs",
      "src/backend/server.mjs",
      "src/backend/status-menu.mjs",
      "src/contracts/browser-presentation.mjs",
      "src/contracts/desktop.mjs",
      "src/contracts/remote.mjs",
      "src/control/facade.mjs",
      "src/control/startup/remote-access.mjs",
      "src/execution/browser/presentation/host.mjs",
      "src/execution/browser/presentation/transport.mjs",
      "src/execution/facade.mjs",
      "src/execution/platform/paths.mjs",
      "src/execution/runtime/tailscale.mjs",
      "src/frontend/client/browser-view.mjs",
      "src/frontend/client/connection.mjs",
      "src/frontend/desktop/client.mjs",
      "src/frontend/desktop/preload.cjs",
      "src/frontend/desktop/ui/archive.mjs",
      "src/frontend/desktop/ui/chat-colors.mjs",
      "src/frontend/desktop/ui/index.html",
      "src/frontend/desktop/ui/settings-panel.mjs",
      "src/frontend/desktop/ui/sidebar.mjs",
      "src/frontend/desktop/ui/startup.mjs",
      "src/frontend/desktop/ui/workspace-setup.mjs",
      "src/frontend/plugin/app.mjs",
      "src/frontend/plugin/index.html",
      "src/frontend/web/bridge.mjs",
      "src/frontend/web/browser-view.mjs",
      "src/frontend/web/connection.mjs",
      "src/frontend/web/index.html",
      "src/frontend/web/touch-input.mjs",
      "tests/backend-remote-devices.test.mjs",
      "tests/backend-remote-gateway.test.mjs",
      "tests/backend-upgrade.test.mjs",
      "tests/browser-presentation.test.mjs",
      "tests/fixtures/remote-serve-proxy.mjs",
      "tests/remote-access-setup.test.mjs",
      "tests/remote-end-to-end.test.mjs",
      "tests/remote-serve-probe.test.mjs",
      "tests/startup-ui.test.mjs",
      "tests/web-browser-view.test.mjs",
      "tests/web-client-electron.test.mjs",
      "tests/web-client.test.mjs",
      "src/frontend/desktop/ui/remote-access.mjs",
      "tests/fixtures/remote-backend.mjs",
      "src/frontend/web/app.mjs",
      "src/frontend/web/ipc.js",
      "tests/fixtures/web-client-browser.mjs",
      "src/backend/remote-access.mjs"
    ],
    "documentation_paths": [
      "docs/planning/remote-access-spec.md",
      "README.md",
      "docs/architecture/OVERVIEW.md",
      "docs/modules/backend.md",
      "docs/modules/desktop.md",
      "docs/modules/browser.md",
      "docs/modules/first-run-onboarding.md",
      "docs/modules/release.md",
      "docs/acceptance/remote-access.md",
      "resources/THIRD-PARTY.md"
    ]
  },
  "baseline_commit": "c9cb80e1ab1a5140705afb5a234c99082da5cf2d",
  "current_task_id": null,
  "context_pack": {
    "documents": [
      {
        "path": "docs/planning/remote-access-spec.md",
        "required": true,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/modules/backend.md",
        "required": true,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/architecture/OVERVIEW.md",
        "required": true,
        "revision": "WORKTREE"
      }
    ],
    "include_last_completed_task": false,
    "dependency_task_ids": []
  },
  "tasks": [
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-remote-access",
        "task_id": "T001",
        "role": "implementation"
      },
      "dependencies": [],
      "functional_paths": [
        "tests/remote-serve-probe.test.mjs",
        "tests/fixtures/remote-serve-proxy.mjs"
      ],
      "documentation_paths": [
        "docs/planning/remote-access-spec.md"
      ],
      "verification_ids": [
        "unit-all"
      ],
      "id": "T001",
      "title": "Сверить Tailscale Serve и формат кадров",
      "why": "Снять главные риски доступа через Tailscale до переноса кода.",
      "acceptance_criteria": [
        "Заголовки идентичности, Host/Origin/X-Forwarded-*, HTTPS и буферизация SSE через Tailscale Serve сверены по официальной документации и тестовому прокси; подмена заголовков в обход Serve описана",
        "Объём и чёткость PNG/JPEG/WebP кадров измерены на fixture, выбран формат с доступным кодировщиком (nativeImage: PNG и JPEG)",
        "Агент только читает состояние Tailscale; живую проверку Serve выполняет пользователь по инструкции либо агент после явного подтверждения с reset своей настройки, иначе pending manual",
        "Итог и решения записаны в спецификацию"
      ],
      "expected_commit_message": "test: Сверить Tailscale Serve и формат кадров",
      "parallel_safe": false,
      "actual_files": [
        "tests/remote-serve-probe.test.mjs",
        "tests/fixtures/remote-serve-proxy.mjs",
        "docs/planning/remote-access-spec.md"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-remote-access",
        "task_id": "T002",
        "role": "implementation"
      },
      "dependencies": [
        "T001"
      ],
      "functional_paths": [
        "src/backend/remote-gateway.mjs",
        "src/contracts/remote.mjs",
        "src/backend/main.mjs",
        "src/backend/lifecycle.mjs",
        "src/backend/server.mjs",
        "tests/backend-remote-gateway.test.mjs",
        ".dependency-cruiser.cjs",
        "src/backend/control-lease.mjs",
        "src/backend/operations.mjs",
        "src/backend/protocol.mjs",
        "src/execution/browser/presentation/transport.mjs"
      ],
      "documentation_paths": [
        "docs/planning/remote-access-spec.md"
      ],
      "verification_ids": [
        "unit-all",
        "architecture"
      ],
      "id": "T002",
      "title": "Удалённый шлюз и контракт доступа",
      "why": "Дать удалённому устройству тот же API без открытия основного порта.",
      "acceptance_criteria": [
        "Шлюз выключен по умолчанию, слушает только loopback на своём порту с проверкой владельца",
        "Запрос без заголовка владельца Serve, с чужим владельцем, неверным Host/Origin или без cookie устройства отвергается кодом REMOTE_*",
        "Команды, операции, события и /v1/browser/* проходят через существующие обработчики с allowlist и lease; основной API остаётся loopback с bearer",
        "Веб-клиент отдаётся только из собственного каталога пакета с CSP",
        "Шлюз назначает clientId устройства и подменяет args.clientId в control.*; мутации, ввод, вставка, файлы и viewport требуют, чтобы держателем lease было это устройство, иначе BACKEND_LEASE_STALE",
        "Viewer принадлежит создавшему устройству; тест: наблюдатель с подсмотренным generation получает отказ и не продлевает и не снимает lease окна Mac"
      ],
      "expected_commit_message": "feat: Удалённый шлюз и контракт доступа",
      "parallel_safe": false,
      "actual_files": [
        "src/backend/control-lease.mjs",
        "src/backend/operations.mjs",
        "src/backend/server.mjs",
        "src/backend/lifecycle.mjs",
        "src/backend/remote-gateway.mjs",
        "src/contracts/remote.mjs",
        "src/execution/browser/presentation/transport.mjs",
        "tests/backend-remote-gateway.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-remote-access",
        "task_id": "T003",
        "role": "implementation"
      },
      "dependencies": [
        "T002"
      ],
      "functional_paths": [
        "src/backend/remote-devices.mjs",
        "src/backend/remote-gateway.mjs",
        "src/backend/status-menu.mjs",
        "src/frontend/desktop/client.mjs",
        "tests/backend-remote-devices.test.mjs",
        "src/backend/events.mjs",
        "src/backend/desktop-model.mjs",
        "src/backend/control-lease.mjs",
        "src/backend/operations.mjs",
        "src/contracts/desktop.mjs",
        "src/frontend/desktop/preload.cjs",
        "src/frontend/desktop/ui/settings-panel.mjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/backend/lifecycle.mjs",
        "src/backend/main.mjs",
        "src/frontend/desktop/ui/index.html",
        "src/frontend/desktop/ui/remote-access.mjs",
        "tests/backend-remote-gateway.test.mjs",
        "tests/fixtures/remote-backend.mjs",
        "tests/fixtures/remote-serve-proxy.mjs"
      ],
      "documentation_paths": [
        "docs/planning/remote-access-spec.md"
      ],
      "verification_ids": [
        "unit-all",
        "architecture"
      ],
      "id": "T003",
      "title": "Пара устройств и управление устройствами",
      "why": "Каждое удалённое устройство явно подтверждается на Mac и может быть отключено.",
      "acceptance_criteria": [
        "Одноразовый код ограничен по времени и попыткам, подтверждается только на Mac (окно или значок)",
        "Токен устройства хранится хешем, cookie HttpOnly Secure SameSite=Strict",
        "Отзыв устройства сразу закрывает его потоки и снимает lease",
        "Журнал входов без токенов",
        "Запрос пары виден в окне Mac и в меню значка и подтверждается в любом из них",
        "Отзыв вызывает принудительный revoke(clientId): lease снят, viewers отсоединены, потоки событий устройства закрыты; тест"
      ],
      "expected_commit_message": "feat: Пара устройств и управление устройствами",
      "parallel_safe": false,
      "actual_files": [
        "src/backend/remote-devices.mjs",
        "src/backend/events.mjs",
        "src/backend/lifecycle.mjs",
        "src/backend/main.mjs",
        "src/backend/status-menu.mjs",
        "src/backend/desktop-model.mjs",
        "src/contracts/desktop.mjs",
        "src/frontend/desktop/preload.cjs",
        "src/frontend/desktop/ui/index.html",
        "src/frontend/desktop/ui/remote-access.mjs",
        "tests/backend-remote-devices.test.mjs",
        "tests/backend-remote-gateway.test.mjs",
        "tests/fixtures/remote-backend.mjs",
        "tests/fixtures/remote-serve-proxy.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-remote-access",
        "task_id": "T004",
        "role": "implementation"
      },
      "dependencies": [
        "T003"
      ],
      "functional_paths": [
        "src/frontend/web/index.html",
        "src/frontend/web/bridge.mjs",
        "src/frontend/web/connection.mjs",
        "src/frontend/client/connection.mjs",
        "src/frontend/desktop/ui/index.html",
        "tests/web-client.test.mjs",
        "src/backend/events.mjs",
        "src/backend/desktop-model.mjs",
        "src/backend/remote-surface.mjs",
        "src/backend/operations.mjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/frontend/desktop/ui/startup.mjs",
        "src/frontend/desktop/ui/workspace-setup.mjs",
        "src/frontend/desktop/ui/archive.mjs",
        "src/frontend/desktop/ui/chat-colors.mjs",
        "tests/web-client-electron.test.mjs",
        "src/backend/server.mjs",
        "src/backend/remote-gateway.mjs",
        "src/backend/main.mjs",
        "src/backend/remote-devices.mjs",
        "src/execution/browser/presentation/host.mjs",
        "src/execution/browser/presentation/transport.mjs",
        "src/frontend/client/browser-view.mjs",
        "src/frontend/web/app.mjs",
        "src/frontend/web/ipc.js",
        "src/frontend/web/touch-input.mjs",
        "tests/backend-remote-gateway.test.mjs",
        "tests/fixtures/web-client-browser.mjs"
      ],
      "documentation_paths": [
        "docs/planning/remote-access-spec.md"
      ],
      "verification_ids": [
        "unit-all",
        "architecture",
        "electron-smoke"
      ],
      "id": "T004",
      "title": "Веб-клиент: интерфейс и состояние связи",
      "why": "Тот же интерфейс Workflow Pilot в Safari без второй реализации логики.",
      "acceptance_criteria": [
        "Прослойка window.webPilot передаёт вызовы прежнего UI через ui.invoke и получает состояние из SSE",
        "Наблюдатель/управление, устаревание и переподключение ведут себя как окно Mac; мутации не повторяются",
        "Архив, Настройки, Доктор и цвета доступны; выбор папки проекта — ввод пути, не файловый диалог устройства",
        "Оконные команды (архив, цвета, focus, layout) адресуются клиенту-инициатору; тест: действие удалённого клиента не открывает окна на Mac",
        "У удалённого клиента архив и редактор цветов открываются внутри страницы; выбор папки — ввод пути или разрешённые корни без нативного диалога на Mac",
        "Веб-клиент проверен в Chromium-fixture",
        "/v1/events принимает clientId подписчика (клиент Mac передаёт свой, шлюз — clientId устройства); оконные события уходят только потоку этого клиента"
      ],
      "expected_commit_message": "feat: Веб-клиент интерфейса Workflow Pilot",
      "parallel_safe": false,
      "actual_files": [
        "src/backend/desktop-model.mjs",
        "src/backend/events.mjs",
        "src/backend/main.mjs",
        "src/backend/remote-devices.mjs",
        "src/backend/remote-gateway.mjs",
        "src/backend/remote-surface.mjs",
        "src/execution/browser/presentation/host.mjs",
        "src/execution/browser/presentation/transport.mjs",
        "src/frontend/client/browser-view.mjs",
        "src/frontend/client/connection.mjs",
        "src/frontend/web/index.html",
        "src/frontend/web/app.mjs",
        "src/frontend/web/ipc.js",
        "src/frontend/web/touch-input.mjs",
        "tests/backend-remote-gateway.test.mjs",
        "tests/fixtures/web-client-browser.mjs",
        "tests/web-client-electron.test.mjs",
        "tests/web-client.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-remote-access",
        "task_id": "T005",
        "role": "implementation"
      },
      "dependencies": [
        "T004"
      ],
      "functional_paths": [
        "src/frontend/web/browser-view.mjs",
        "src/frontend/web/touch-input.mjs",
        "src/frontend/client/browser-view.mjs",
        "tests/web-browser-view.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/remote-access-spec.md"
      ],
      "verification_ids": [
        "unit-all",
        "electron-smoke"
      ],
      "id": "T005",
      "title": "Изображение страницы на iPad: ввод и файлы",
      "why": "Полный интерактив ChatGPT с сенсорного устройства.",
      "acceptance_criteria": [
        "Касание, прокрутка, долгое нажатие для меню и масштаб кадра работают; поздний ввод другого документа отвергается",
        "Экранная и аппаратная клавиатура, русский и составной ввод доходят до страницы",
        "Буфер обмена по явному действию, вложение файла с устройства и скачивание на устройство работают сквозным образом",
        "Popups и авторизация ChatGPT показываются внутри веб-клиента"
      ],
      "expected_commit_message": "feat: Ввод и файлы на удалённом устройстве",
      "parallel_safe": false,
      "actual_files": [
        "src/frontend/web/touch-input.mjs",
        "tests/web-browser-view.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-remote-access",
        "task_id": "T006",
        "role": "implementation"
      },
      "dependencies": [
        "T005"
      ],
      "functional_paths": [
        "src/execution/browser/presentation/host.mjs",
        "src/execution/browser/presentation/transport.mjs",
        "src/contracts/browser-presentation.mjs",
        "src/frontend/client/browser-view.mjs",
        "tests/browser-presentation.test.mjs",
        "package.json",
        "package-lock.json"
      ],
      "documentation_paths": [
        "docs/planning/remote-access-spec.md"
      ],
      "verification_ids": [
        "unit-all",
        "electron-smoke",
        "architecture"
      ],
      "id": "T006",
      "title": "Сжатые адаптивные кадры",
      "why": "Комфортная работа через мобильную сеть.",
      "acceptance_criteria": [
        "Формат кадров по итогу T001, качество и частота ограничены и адаптируются",
        "Плотность кадра по устройству зрителя; кадр передаётся только при изменении",
        "Viewport задаёт управляющее устройство; смена управления не перезагружает страницу",
        "Окно Mac сохраняет чёткость 0.2.1",
        "Новая зависимость кодировщика добавляется только если выбранный в T001 формат её требует"
      ],
      "expected_commit_message": "feat: Сжатые адаптивные кадры",
      "parallel_safe": false,
      "actual_files": [
        "tests/browser-presentation.test.mjs",
        "docs/planning/remote-access-spec.md"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-remote-access",
        "task_id": "T007",
        "role": "implementation"
      },
      "dependencies": [
        "T006"
      ],
      "functional_paths": [
        "src/execution/runtime/tailscale.mjs",
        "src/execution/facade.mjs",
        "src/control/startup/remote-access.mjs",
        "src/control/facade.mjs",
        "src/backend/desktop-model.mjs",
        "src/frontend/desktop/ui/startup.mjs",
        "src/frontend/desktop/ui/settings-panel.mjs",
        "src/contracts/desktop.mjs",
        "tests/remote-access-setup.test.mjs",
        "tests/startup-ui.test.mjs",
        "package.json",
        "package-lock.json",
        "src/execution/platform/paths.mjs",
        "src/backend/remote-access.mjs",
        "src/backend/main.mjs",
        "src/frontend/desktop/ui/remote-access.mjs",
        "src/frontend/desktop/ui/index.html"
      ],
      "documentation_paths": [
        "docs/planning/remote-access-spec.md",
        "docs/modules/first-run-onboarding.md",
        "resources/THIRD-PARTY.md"
      ],
      "verification_ids": [
        "unit-all",
        "electron-smoke",
        "architecture"
      ],
      "id": "T007",
      "title": "Tailscale в мастере первого запуска и Настройках",
      "why": "Пользователь по шагам подключает iPad без ручной настройки.",
      "acceptance_criteria": [
        "Необязательный шаг мастера и раздел Настроек ведут по шагам для компьютера и iPad; каждый шаг проверяется фактическим состоянием Tailscale, допускаются пропуск и повтор",
        "Serve настраивается только по кнопке с подтверждением, только внутри tailnet; Funnel не используется; чужая настройка Serve не перезаписывается",
        "Адрес и QR-код, список устройств с отключением, запрет сна при включённом доступе; выключение снимает только собственную настройку",
        "Workflow Pilot не устанавливает Tailscale и не входит в аккаунт",
        "CLI Tailscale находится по известным путям трёх ОС (macOS — внутри Tailscale.app), иначе понятная ошибка TAILSCALE_NOT_INSTALLED",
        "QR-код строится проверенной библиотекой с лицензией в составе поставки"
      ],
      "expected_commit_message": "feat: Tailscale в мастере первого запуска",
      "parallel_safe": false,
      "actual_files": [
        "src/execution/runtime/tailscale.mjs",
        "src/execution/facade.mjs",
        "src/backend/remote-access.mjs",
        "src/backend/main.mjs",
        "src/frontend/desktop/ui/remote-access.mjs",
        "src/frontend/desktop/ui/index.html",
        "resources/THIRD-PARTY.md",
        "package.json",
        "package-lock.json",
        "tests/remote-access-setup.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-remote-access",
        "task_id": "T008",
        "role": "implementation"
      },
      "dependencies": [
        "T007"
      ],
      "functional_paths": [
        "tests/remote-end-to-end.test.mjs",
        "src/backend/main.mjs"
      ],
      "documentation_paths": [
        "docs/planning/remote-access-spec.md",
        "docs/acceptance/remote-access.md"
      ],
      "verification_ids": [
        "unit-all",
        "electron-smoke",
        "architecture",
        "chatgpt-plugin",
        "executor-channel"
      ],
      "id": "T008",
      "title": "Проверить общий результат удалённого доступа",
      "why": "Подтвердить критерии R01–R10 и регрессию 0.2.1 до DOCS.",
      "acceptance_criteria": [
        "Сквозной fixture: включение → пара → управление с удалённого клиента → обрыв → переподключение → отзыв устройства",
        "R01–R10 сопоставлены с доказательствами; iPad/Safari/Tailscale/мобильная сеть — pending manual",
        "Пользователю передан пошаговый сценарий проверки с iPad"
      ],
      "expected_commit_message": "feat: Проверить общий результат удалённого доступа",
      "parallel_safe": false,
      "actual_files": [
        "tests/remote-end-to-end.test.mjs",
        "docs/acceptance/remote-access.md",
        "src/backend/main.mjs"
      ]
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-remote-access",
        "task_id": "T009",
        "role": "implementation"
      },
      "dependencies": [
        "T008"
      ],
      "functional_paths": [
        "package.json",
        "package-lock.json",
        "src/frontend/plugin/index.html",
        "src/frontend/plugin/app.mjs",
        "tests/backend-upgrade.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/remote-access-spec.md"
      ],
      "verification_ids": [
        "release-tooling",
        "unit-all"
      ],
      "id": "T009",
      "title": "Подготовить версию выпуска",
      "why": "Номер выпуска согласован пользователем.",
      "acceptance_criteria": [
        "Версия, подтверждённая пользователем (предложение 0.3.0), согласована в package/lock и панели плагина",
        "Задача заблокирована до подтверждённого пользователем номера версии в user_decisions"
      ],
      "expected_commit_message": "feat: Подготовить версию выпуска",
      "parallel_safe": false
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-remote-access",
        "task_id": "DOCS",
        "role": "implementation",
        "iteration": 1
      },
      "id": "DOCS",
      "title": "Актуализация всех документов проекта",
      "why": "Перед выпуском сверить README, OVERVIEW и действующие контракты модулей с результатом; обновить устаревшее.",
      "dependencies": [
        "T001",
        "T002",
        "T003",
        "T004",
        "T005",
        "T006",
        "T007",
        "T008",
        "T009"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/architecture/OVERVIEW.md",
        "docs/planning/remote-access-spec.md",
        "docs/modules/first-run-onboarding.md",
        "docs/acceptance/remote-access.md",
        "docs/modules/backend.md",
        "docs/modules/desktop.md",
        "docs/modules/browser.md",
        "docs/modules/release.md",
        "README.md",
        "resources/THIRD-PARTY.md"
      ],
      "acceptance_criteria": [
        "Документы описывают текущий результат, существенное из выпущенных рабочих спецификаций перенесено в контракты модулей; история остаётся в Git."
      ],
      "verification_ids": [],
      "expected_commit_message": "docs: актуализировать документацию проекта",
      "parallel_safe": false
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-remote-access",
        "task_id": "T010",
        "role": "implementation"
      },
      "dependencies": [
        "T009",
        "DOCS"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "three-platform-release"
      ],
      "id": "T010",
      "title": "Собрать выпуск трёх ОС",
      "why": "Полный комплект после DOCS из одного sourceCommit.",
      "verification_kind": "package",
      "acceptance_criteria": [
        "Один штатный цикл macOS arm64, Windows x64, Linux x64 из одного sourceCommit после DOCS; manifest совпадает в staging, Downloads и корне"
      ],
      "expected_commit_message": "release: Собрать выпуск трёх ОС",
      "parallel_safe": false
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-remote-access",
        "task_id": "T011",
        "role": "implementation"
      },
      "dependencies": [
        "T010",
        "DOCS"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "release-installed"
      ],
      "id": "T011",
      "title": "Установить выпуск в Applications",
      "why": "Обновить установленное приложение штатным installer.",
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Установка готового комплекта без пересборки и без перезапуска backend; при работающей службе — pending-копия и инструкция пользователю"
      ],
      "expected_commit_message": "release: Установить выпуск в Applications",
      "parallel_safe": false
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-remote-access",
        "task_id": "T012",
        "role": "implementation"
      },
      "dependencies": [
        "T011",
        "DOCS"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "github-release"
      ],
      "id": "T012",
      "title": "Опубликовать GitHub Release",
      "why": "Опубликовать проверенный комплект.",
      "verification_kind": "package",
      "acceptance_criteria": [
        "Тег v<version> на sourceCommit, семь assets сверены по размеру и digest, remote main совпадает с local HEAD"
      ],
      "expected_commit_message": "release: Опубликовать GitHub Release",
      "parallel_safe": false
    }
  ],
  "blocked_reason": null,
  "user_decisions": [
    {
      "id": "9ebcbf1e-6021-4f26-bb03-be9190af987f",
      "text": "Прямое поручение пользователя 16.10.2026: по черновику создать план удалённого доступа через Tailscale с шагом мастера и отправить на Claude Review; реализацию до согласия пользователя не начинать.",
      "recorded_at": "2026-10-16T07:55:09.012Z"
    },
    {
      "id": "c3f1d7a2-5b8e-4c1a-9e2f-7a6b0d4e8f11",
      "text": "16.10.2026 пользователь согласился с планом: «Да, начинай. Выполнение плана и, пожалуйста, не останавливайся, не спрашивай у меня ничего, вплоть до публикации на GitHub релиза. Все вопросы принимай решение самостоятельно и записывай, чтобы обсудить в конце». Разрешены реализация, DOCS, сборка, установка в /Applications и GitHub Release без остановок; спорные решения агент принимает сам и выносит на обсуждение после выпуска.",
      "recorded_at": "2026-10-16T08:10:00.000Z"
    },
    {
      "id": "d4a2e8b3-6c9f-4d2b-8f3a-8b7c1e5f9a22",
      "text": "Номер выпуска 0.3.0 — решение агента по поручению пользователя принимать решения самостоятельно (предложение спецификации; пользователь не возражал). Выносится на обсуждение после выпуска.",
      "recorded_at": "2026-10-16T08:10:00.000Z"
    }
  ],
  "parallel_allowed": false,
  "max_workers": 1,
  "execution_strategy": "sequential",
  "execution_reason": "Задачи последовательно меняют общий backend API, lease, UI и представление страниц; каждая опирается на контракт предыдущей. Пользователь не просил параллельного выполнения."
}
```
<!-- workflow-state:end -->

## Состояние

Execution Scope Status: ACTIVE
Delivery Status: IN_PROGRESS
Scope: workflow-pilot-remote-access
Current Task: нет
Revision: 200

## Цель

Интерфейс Workflow Pilot на iPad из любой точки интернета через Tailscale к backend на Mac; шаг мастера первого запуска.

## Критерии приёмки

- R01 Удалённый доступ выключен по умолчанию; включение и выключение явные, состояние видно на Mac
- R02 Без Serve, заголовка владельца, с чужого аккаунта или без подтверждённого устройства доступ невозможен; отключённое устройство теряет доступ сразу
- R03 iPad из мобильной сети открывает интерфейс, видит те же проекты и страницу, берёт управление явно
- R04 Экранная клавиатура (русский, составной ввод), касания, прокрутка, меню работают; поздний ввод отвергается
- R05 Файлы с iPad и на iPad работают сквозным образом
- R06 Сон iPad, смена сети и обрыв не повторяют мутаций, Send и recovery
- R07 Объём кадров через интернет ограничен; чёткость и задержка приемлемы на живой проверке
- R08 Окно Mac, плагин ChatGPT и MCP работают как в 0.2.1; основной API остаётся loopback
- R09 Мастер первого запуска и Настройки проводят по шагам для компьютера и iPad с проверкой состояния; выключение снимает только свою настройку
- R10 DOCS, выпуск трёх ОС, установка и GitHub Release по обычному порядку; iPad и Tailscale — живая проверка пользователя

## Микрозадачи

Выполнение: sequential; разрешено: false; лимит: 1
Причина: Задачи последовательно меняют общий backend API, lease, UI и представление страниц; каждая опирается на контракт предыдущей. Пользователь не просил параллельного выполнения.

- [DONE] T001: Сверить Tailscale Serve и формат кадров — Завершено
  - Git Commit: [DONE] test: Сверить Tailscale Serve и формат кадров
  - Reference: workflow-pilot-remote-access / T001 / implementation
  - Файлы: tests/remote-serve-probe.test.mjs, tests/fixtures/remote-serve-proxy.mjs, docs/planning/remote-access-spec.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] T002: Удалённый шлюз и контракт доступа — Завершено
  - Git Commit: [DONE] feat: Удалённый шлюз и контракт доступа
  - Reference: workflow-pilot-remote-access / T002 / implementation
  - Файлы: src/backend/remote-gateway.mjs, src/contracts/remote.mjs, src/backend/main.mjs, src/backend/lifecycle.mjs, src/backend/server.mjs, tests/backend-remote-gateway.test.mjs, .dependency-cruiser.cjs, src/backend/control-lease.mjs, src/backend/operations.mjs, src/backend/protocol.mjs, src/execution/browser/presentation/transport.mjs, docs/planning/remote-access-spec.md
  - Параллельность: исключительное выполнение
  - Зависимости: T001
- [DONE] T003: Пара устройств и управление устройствами — Завершено
  - Git Commit: [DONE] feat: Пара устройств и управление устройствами
  - Reference: workflow-pilot-remote-access / T003 / implementation
  - Файлы: src/backend/remote-devices.mjs, src/backend/remote-gateway.mjs, src/backend/status-menu.mjs, src/frontend/desktop/client.mjs, tests/backend-remote-devices.test.mjs, src/backend/events.mjs, src/backend/desktop-model.mjs, src/backend/control-lease.mjs, src/backend/operations.mjs, src/contracts/desktop.mjs, src/frontend/desktop/preload.cjs, src/frontend/desktop/ui/settings-panel.mjs, src/frontend/desktop/ui/sidebar.mjs, src/backend/lifecycle.mjs, src/backend/main.mjs, src/frontend/desktop/ui/index.html, src/frontend/desktop/ui/remote-access.mjs, tests/backend-remote-gateway.test.mjs, tests/fixtures/remote-backend.mjs, tests/fixtures/remote-serve-proxy.mjs, docs/planning/remote-access-spec.md
  - Параллельность: исключительное выполнение
  - Зависимости: T002
- [DONE] T004: Веб-клиент: интерфейс и состояние связи — Завершено
  - Git Commit: [DONE] feat: Веб-клиент интерфейса Workflow Pilot
  - Reference: workflow-pilot-remote-access / T004 / implementation
  - Файлы: src/frontend/web/index.html, src/frontend/web/bridge.mjs, src/frontend/web/connection.mjs, src/frontend/client/connection.mjs, src/frontend/desktop/ui/index.html, tests/web-client.test.mjs, src/backend/events.mjs, src/backend/desktop-model.mjs, src/backend/remote-surface.mjs, src/backend/operations.mjs, src/frontend/desktop/ui/sidebar.mjs, src/frontend/desktop/ui/startup.mjs, src/frontend/desktop/ui/workspace-setup.mjs, src/frontend/desktop/ui/archive.mjs, src/frontend/desktop/ui/chat-colors.mjs, tests/web-client-electron.test.mjs, src/backend/server.mjs, src/backend/remote-gateway.mjs, src/backend/main.mjs, src/backend/remote-devices.mjs, src/execution/browser/presentation/host.mjs, src/execution/browser/presentation/transport.mjs, src/frontend/client/browser-view.mjs, src/frontend/web/app.mjs, src/frontend/web/ipc.js, src/frontend/web/touch-input.mjs, tests/backend-remote-gateway.test.mjs, tests/fixtures/web-client-browser.mjs, docs/planning/remote-access-spec.md
  - Параллельность: исключительное выполнение
  - Зависимости: T003
- [DONE] T005: Изображение страницы на iPad: ввод и файлы — Завершено
  - Git Commit: [DONE] feat: Ввод и файлы на удалённом устройстве
  - Reference: workflow-pilot-remote-access / T005 / implementation
  - Файлы: src/frontend/web/browser-view.mjs, src/frontend/web/touch-input.mjs, src/frontend/client/browser-view.mjs, tests/web-browser-view.test.mjs, docs/planning/remote-access-spec.md
  - Параллельность: исключительное выполнение
  - Зависимости: T004
- [DONE] T006: Сжатые адаптивные кадры — Завершено
  - Git Commit: [DONE] feat: Сжатые адаптивные кадры
  - Reference: workflow-pilot-remote-access / T006 / implementation
  - Файлы: src/execution/browser/presentation/host.mjs, src/execution/browser/presentation/transport.mjs, src/contracts/browser-presentation.mjs, src/frontend/client/browser-view.mjs, tests/browser-presentation.test.mjs, package.json, package-lock.json, docs/planning/remote-access-spec.md
  - Параллельность: исключительное выполнение
  - Зависимости: T005
- [DONE] T007: Tailscale в мастере первого запуска и Настройках — Завершено
  - Git Commit: [DONE] feat: Tailscale в мастере первого запуска
  - Reference: workflow-pilot-remote-access / T007 / implementation
  - Файлы: src/execution/runtime/tailscale.mjs, src/execution/facade.mjs, src/control/startup/remote-access.mjs, src/control/facade.mjs, src/backend/desktop-model.mjs, src/frontend/desktop/ui/startup.mjs, src/frontend/desktop/ui/settings-panel.mjs, src/contracts/desktop.mjs, tests/remote-access-setup.test.mjs, tests/startup-ui.test.mjs, package.json, package-lock.json, src/execution/platform/paths.mjs, src/backend/remote-access.mjs, src/backend/main.mjs, src/frontend/desktop/ui/remote-access.mjs, src/frontend/desktop/ui/index.html, docs/planning/remote-access-spec.md, docs/modules/first-run-onboarding.md, resources/THIRD-PARTY.md
  - Параллельность: исключительное выполнение
  - Зависимости: T006
- [DONE] T008: Проверить общий результат удалённого доступа — Завершено
  - Git Commit: [DONE] feat: Проверить общий результат удалённого доступа
  - Reference: workflow-pilot-remote-access / T008 / implementation
  - Файлы: tests/remote-end-to-end.test.mjs, src/backend/main.mjs, docs/planning/remote-access-spec.md, docs/acceptance/remote-access.md
  - Параллельность: исключительное выполнение
  - Зависимости: T007
- [TODO] T009: Подготовить версию выпуска — Ожидает
  - Git Commit: [PENDING] feat: Подготовить версию выпуска
  - Reference: workflow-pilot-remote-access / T009 / implementation
  - Файлы: package.json, package-lock.json, src/frontend/plugin/index.html, src/frontend/plugin/app.mjs, tests/backend-upgrade.test.mjs, docs/planning/remote-access-spec.md
  - Параллельность: исключительное выполнение
  - Зависимости: T008
- [TODO] DOCS: Актуализация всех документов проекта — Ожидает
  - Git Commit: [PENDING] docs: актуализировать документацию проекта
  - Reference: workflow-pilot-remote-access / DOCS / implementation
  - Файлы: docs/architecture/OVERVIEW.md, docs/planning/remote-access-spec.md, docs/modules/first-run-onboarding.md, docs/acceptance/remote-access.md, docs/modules/backend.md, docs/modules/desktop.md, docs/modules/browser.md, docs/modules/release.md, README.md, resources/THIRD-PARTY.md
  - Параллельность: исключительное выполнение
  - Зависимости: T001, T002, T003, T004, T005, T006, T007, T008, T009
- [TODO] T010: Собрать выпуск трёх ОС — Ожидает
  - Git Commit: [PENDING] release: Собрать выпуск трёх ОС
  - Reference: workflow-pilot-remote-access / T010 / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: T009, DOCS
- [TODO] T011: Установить выпуск в Applications — Ожидает
  - Git Commit: [PENDING] release: Установить выпуск в Applications
  - Reference: workflow-pilot-remote-access / T011 / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: T010, DOCS
- [TODO] T012: Опубликовать GitHub Release — Ожидает
  - Git Commit: [PENDING] release: Опубликовать GitHub Release
  - Reference: workflow-pilot-remote-access / T012 / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: T011, DOCS

## Context Pack For This Cycle

- docs/planning/remote-access-spec.md
- docs/modules/backend.md
- docs/architecture/OVERVIEW.md

Служебные состояния меняются только командами workflow. Приёмка не архивирует scope.
