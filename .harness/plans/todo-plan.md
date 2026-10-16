# Активный план — Workflow_Pilot

<!-- workflow-state:begin -->
```json
{
  "schema_version": 1,
  "plan_revision": 163,
  "project_id": "7411e192-943c-4529-bffb-3b081d9c242f",
  "project_name": "Workflow_Pilot",
  "scope_id": "workflow-pilot-backend-independence",
  "execution_scope_status": "ACTIVE",
  "delivery_status": "READY_FOR_ACCEPTANCE",
  "objective": "Независимый frontend и постоянно работающий backend/browser на одном Mac; совместимая поставка трёх ОС.",
  "acceptance_criteria": [
    "A01: Launcher поднимает ровно один backend; конкурентный запуск безопасен",
    "A02: Закрытие/kill frontend сохраняет страницу, её состояние, тестовую работу и MCP/bridge",
    "A03: Reconnect возвращает ту же страницу/операцию; reload/recovery/Send не растут",
    "A04: Независимый API-клиент без preload получает те же разрешённые операции",
    "A05: Fixture-цепочка микрозадач продолжает переходы без frontend",
    "A06: Два клиента: общий state, один writer, позднее старое поколение отклонено",
    "A07: Пропуск событий/restart/reconnect не повторяют мутации и ввод",
    "A08: Меню, русский ввод, выделение, clipboard, upload/download работают сквозным образом",
    "A09: Popups/авторизация не требуют видимого серверного окна; ноль зрителей допустим",
    "A10: MCP-инструменты и plugin resource/list/open/connect работают без frontend",
    "A11: Stop ждёт безопасную точку, не убивает текущую работу, подтверждает остановку своих служб",
    "A12: Upgrade, занятый профиль/порт, старый descriptor, несовместимость и отказ записи не теряют данные",
    "A13: Проверены auth/Origin/Host, границы файлов, очереди и медленный клиент",
    "A14: Три пакета одного sourceCommit содержат полный backend/client и корректный запуск"
  ],
  "approved_scope": {
    "functional_paths": [
      "tests/fixtures/backend-browser-page.html",
      "tests/backend-browser-prototype.test.mjs",
      "src/contracts/backend.mjs",
      "src/contracts/browser-presentation.mjs",
      "src/backend/protocol.mjs",
      "tests/backend-protocol.test.mjs",
      ".dependency-cruiser.cjs",
      "src/main.mjs",
      "src/frontend/desktop/bootstrap.mjs",
      "src/frontend/desktop/application.mjs",
      "src/backend/main.mjs",
      "src/backend/bootstrap.mjs",
      "src/backend/lifecycle.mjs",
      "src/backend/identity.mjs",
      "src/control/facade.mjs",
      "src/execution/facade.mjs",
      "tests/backend-lifecycle.test.mjs",
      "src/frontend/desktop/browser-host.mjs",
      "src/execution/browser/session-runtime.mjs",
      "src/execution/browser/backend-host.mjs",
      "src/control/sessions/service.mjs",
      "src/control/workflow/coordination.mjs",
      "tests/session-runtime.test.mjs",
      "tests/backend-browser-lifecycle.test.mjs",
      "src/backend/server.mjs",
      "src/backend/operations.mjs",
      "src/backend/events.mjs",
      "src/frontend/client/connection.mjs",
      "tests/backend-api.test.mjs",
      "src/execution/browser/presentation/host.mjs",
      "src/execution/browser/presentation/input.mjs",
      "src/execution/browser/presentation/transport.mjs",
      "src/frontend/client/browser-view.mjs",
      "src/backend/transfers.mjs",
      "tests/browser-presentation.test.mjs",
      "src/frontend/desktop/ipc.mjs",
      "src/frontend/desktop/preload.cjs",
      "src/frontend/desktop/ui/sidebar.mjs",
      "src/frontend/desktop/ui/startup.mjs",
      "src/frontend/desktop/ui/index.html",
      "src/frontend/desktop/ui/settings-panel.mjs",
      "src/frontend/desktop/ui/project-doctor.mjs",
      "src/frontend/desktop/ui/archive.mjs",
      "src/frontend/desktop/ui/archive.html",
      "src/frontend/desktop/archive-preload.cjs",
      "src/frontend/desktop/chat-colors-window.mjs",
      "src/frontend/desktop/chat-colors-preload.cjs",
      "src/frontend/desktop/ui/chat-colors.mjs",
      "src/frontend/desktop/ui/chat-colors.html",
      "tests/desktop-boundaries.test.mjs",
      "tests/electron-smoke.mjs",
      "src/execution/plugin/bridge.mjs",
      "src/control/plugin/service.mjs",
      "src/control/plugin/launch.mjs",
      "src/execution/runtime/service.mjs",
      "src/execution/runtime/vps.mjs",
      "tools/codex-app-server-mcp/plugin.py",
      "tests/chatgpt-plugin.test.mjs",
      "tests/codex-app-server-mcp.test.mjs",
      "src/backend/launcher.mjs",
      "src/backend/status-menu.mjs",
      "src/execution/platform/paths.mjs",
      "tests/backend-launcher.test.mjs",
      "tests/backend-shutdown.test.mjs",
      "src/backend/control-lease.mjs",
      "tests/backend-reconnect.test.mjs",
      "package.json",
      "package-lock.json",
      "scripts/release-all.mjs",
      "scripts/release-package.mjs",
      "scripts/release-mac.mjs",
      "scripts/release-linux.mjs",
      "scripts/verify-windows-package.mjs",
      "scripts/verify-linux-package.mjs",
      "scripts/check-installed-release.mjs",
      "scripts/stage-vendor-notices.mjs",
      "tests/release-all.test.mjs",
      "tests/release-mac.test.mjs",
      "tests/release-linux.test.mjs",
      "tests/backend-upgrade.test.mjs",
      "tests/backend-end-to-end.test.mjs",
      "release-manifest.json",
      "tests/fixtures/backend-browser-client.mjs",
      "tests/fixtures/backend-browser-probe.mjs",
      "tests/fixtures/backend-browser-viewer-preload.cjs",
      "tests/fixtures/backend-browser-viewer.html",
      "tests/fixtures/backend-browser-viewer.mjs",
      "tests/execution-architecture.test.mjs",
      "src/execution/browser/diagnostics.mjs",
      "tests/backend-owner-recovery.test.mjs",
      "src/backend/desktop-model.mjs",
      "src/backend/remote-surface.mjs",
      "src/contracts/desktop.mjs",
      "src/execution/desktop-dependencies.mjs",
      "src/frontend/desktop/browser-view-preload.cjs",
      "src/frontend/desktop/client.mjs",
      "src/frontend/desktop/ui/browser-view.html",
      "src/frontend/desktop/ui/browser-view.mjs",
      "tests/backend-desktop-model.test.mjs",
      "tests/desktop-client.test.mjs",
      "src/backend/shutdown.mjs",
      "src/control/workflow/executor-session.mjs",
      "src/control/workflow/project-session-auto-plan.mjs",
      "src/contracts/launch.mjs",
      "src/frontend/plugin/app.mjs",
      "src/frontend/plugin/index.html"
    ],
    "documentation_paths": [
      "README.md",
      "AGENTS.md",
      "docs/architecture/OVERVIEW.md",
      "docs/modules/backend.md",
      "docs/modules/browser.md",
      "docs/modules/desktop.md",
      "docs/modules/control.md",
      "docs/modules/execution.md",
      "docs/modules/workflow-execution.md",
      "docs/modules/first-run-onboarding.md",
      "docs/modules/chatgpt-plugin.md",
      "docs/modules/release.md",
      "docs/modules/linux.md",
      "docs/modules/project-compatibility.md",
      "docs/acceptance/backend-independence.md",
      "docs/planning/workflow-pilot-backend-spec-draft.md",
      "docs/planning/workflow-pilot-backend-todo-draft.md",
      "docs/planning/workflow-pilot-backend-t001-evidence.md",
      "docs/modules/chatgpt-plugin-acceptance.md",
      "docs/acceptance/migration-0.1.0.md",
      "docs/planning/backend-independence-followup.md"
    ]
  },
  "baseline_commit": "e01124c2bb74ab86c8f67b19bfbf79404694add6",
  "current_task_id": null,
  "context_pack": {
    "documents": [
      {
        "path": "docs/planning/workflow-pilot-backend-todo-draft.md",
        "required": false,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/architecture/OVERVIEW.md",
        "required": true,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/modules/desktop.md",
        "required": false,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/modules/browser.md",
        "required": false,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/modules/control.md",
        "required": false,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/modules/execution.md",
        "required": false,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/modules/release.md",
        "required": false,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/modules/workflow-execution.md",
        "required": false,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/modules/first-run-onboarding.md",
        "required": false,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/modules/chatgpt-plugin.md",
        "required": false,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/modules/linux.md",
        "required": false,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/modules/project-compatibility.md",
        "required": false,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/planning/workflow-pilot-backend-spec-draft.md",
        "required": true,
        "revision": "0ce57c2b9b8d472ab11570bcb6c948b0f5c94809"
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
        "scope_id": "workflow-pilot-backend-independence",
        "task_id": "T001",
        "role": "implementation"
      },
      "dependencies": [],
      "functional_paths": [
        "tests/fixtures/backend-browser-page.html",
        "tests/backend-browser-prototype.test.mjs",
        "tests/fixtures/backend-browser-client.mjs",
        "tests/fixtures/backend-browser-probe.mjs",
        "tests/fixtures/backend-browser-viewer-preload.cjs",
        "tests/fixtures/backend-browser-viewer.html",
        "tests/fixtures/backend-browser-viewer.mjs"
      ],
      "documentation_paths": [
        "docs/planning/workflow-pilot-backend-spec-draft.md",
        "docs/planning/workflow-pilot-backend-todo-draft.md",
        "docs/planning/workflow-pilot-backend-t001-evidence.md"
      ],
      "verification_ids": [
        "unit-all",
        "electron-smoke",
        "architecture"
      ],
      "id": "T001",
      "title": "Проверить независимый браузер и выбрать транспорт",
      "why": "снять главный риск до массового переноса.",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Сверены реальные lifecycle/ownership desktop, browser host, runtime и bridge.",
        "Сопоставлены готовые решения, лицензии, платформы и стоимость поставки; собственный видеокодек не создаётся.",
        "Изолированные backend/client: закрытие процесса клиента сохраняет страницу/таймер/черновик; новый клиент подключается к ним.",
        "Через реальное представление проверены ввод без фокусировки окна ОС, русский/составной текст, меню/popups, clipboard и файлы (A02/A03/A08/A09).",
        "Измерены читаемость, задержка, idle. Результат/транспорт переданы пользователю; после T001 план BLOCKED до живой проверки и записанного user_decision. T002 запрещён до согласия; прежнее правило переноса вопросов после релиза здесь не действует.",
        "Выбрана macOS-топология: helper-bundle/identity или activate/reopen backend. Учтены LaunchServices, locks/profiles, Dock и подпись; повторное открытие возвращает клиент.",
        "Непроверенные ОС не объявлены готовыми. Неуспех обязательного интерактива останавливает зависимые задачи до пересмотра решения; скрытое старое окно не заменяет результат.",
        "Живые графические проверки выполняет пользователь; автоматические — только fixtures, без модельных ходов."
      ],
      "expected_commit_message": "feat: Проверить независимый браузер и выбрать транспорт",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/modules/desktop.md",
            "required": true,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/modules/browser.md",
            "required": true,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/modules/execution.md",
            "required": true,
            "revision": "WORKTREE"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "actual_files": [
        "docs/planning/workflow-pilot-backend-spec-draft.md",
        "docs/planning/workflow-pilot-backend-t001-evidence.md",
        "tests/backend-browser-prototype.test.mjs",
        "tests/fixtures/backend-browser-client.mjs",
        "tests/fixtures/backend-browser-page.html",
        "tests/fixtures/backend-browser-probe.mjs",
        "tests/fixtures/backend-browser-viewer-preload.cjs",
        "tests/fixtures/backend-browser-viewer.html",
        "tests/fixtures/backend-browser-viewer.mjs"
      ]
    },
    {
      "id": "T001R",
      "title": "Автоматически подбирать Retina-плотность кадра для проверочного клиента",
      "why": "Устранить замеченную пользователем размытость raster-viewer до согласования транспорта, не трогая реальный backend и ChatGPT.",
      "dependencies": [
        "T001"
      ],
      "functional_paths": [
        "tests/fixtures/backend-browser-probe.mjs",
        "tests/fixtures/backend-browser-viewer.mjs",
        "tests/fixtures/backend-browser-viewer.html",
        "tests/backend-browser-prototype.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/workflow-pilot-backend-t001-evidence.md"
      ],
      "verification_ids": [
        "unit-all",
        "electron-smoke",
        "architecture"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Offscreen backend выбирает плотность кадров по экранным scaleFactor, без ручной цифры и без изменения логического viewport.",
        "Отдельный viewer определяет масштаб собственного монитора и отображает серверный кадр с корректными координатами клика; подключение/разрыв не перезагружает страницу.",
        "Автоматизированный fixture проверяет реальный размер PNG при разных доступных масштабах, Retina-координаты, прежние операции и ограничения мониторинга; пользователь повторяет живое сравнение чёткости.",
        "После завершения текущий план возвращается в BLOCKED до пользовательской приёмки транспорта; T002 не запускается."
      ],
      "expected_commit_message": "test: Автонастройка чёткости независимого браузера под Retina",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-backend-independence",
        "task_id": "T001R",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "docs/planning/workflow-pilot-backend-t001-evidence.md",
        "tests/backend-browser-prototype.test.mjs",
        "tests/fixtures/backend-browser-probe.mjs",
        "tests/fixtures/backend-browser-viewer.html",
        "tests/fixtures/backend-browser-viewer.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-backend-independence",
        "task_id": "T002",
        "role": "implementation"
      },
      "dependencies": [
        "T001",
        "T001R"
      ],
      "functional_paths": [
        "src/contracts/backend.mjs",
        "src/contracts/browser-presentation.mjs",
        "src/backend/protocol.mjs",
        "tests/backend-protocol.test.mjs",
        ".dependency-cruiser.cjs",
        "tests/execution-architecture.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/workflow-pilot-backend-spec-draft.md",
        "docs/planning/workflow-pilot-backend-todo-draft.md",
        "docs/planning/workflow-pilot-backend-t001-evidence.md"
      ],
      "verification_ids": [
        "unit-all",
        "architecture"
      ],
      "id": "T002",
      "title": "Закрепить контракт и границы",
      "why": "Закрепить контракт и границы",
      "verification_kind": "code",
      "acceptance_criteria": [
        "В user_decisions записано согласие пользователя с живой проверкой и транспортом T001; до этого task:start запрещён.",
        "Handshake/version/boot generation, snapshot/events, command/result/operation/errors и browser input валидируются.",
        "Нет потери событий между snapshot и подпиской; пропуск вызывает resync.",
        "Определены requestId/dedup/UNKNOWN, пределы очередей, transferId и несовместимость версий.",
        "Определены auth/Host/Origin, lease generation, владельцы stores/partition и поколение документа.",
        "Нет прямого UI → Control, секретов или произвольного JS/shell API.",
        "Классифицированы plugin UI-мутации и агентские MCP-вызовы: отсутствие клиента не блокирует работу агента."
      ],
      "expected_commit_message": "feat: Закрепить контракт и границы",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/modules/control.md",
            "required": true,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/modules/execution.md",
            "required": true,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/modules/browser.md",
            "required": true,
            "revision": "WORKTREE"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "actual_files": [
        ".dependency-cruiser.cjs",
        "docs/planning/workflow-pilot-backend-spec-draft.md",
        "docs/planning/workflow-pilot-backend-t001-evidence.md",
        "src/backend/protocol.mjs",
        "src/contracts/backend.mjs",
        "src/contracts/browser-presentation.mjs",
        "tests/backend-protocol.test.mjs",
        "tests/execution-architecture.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-backend-independence",
        "task_id": "T003",
        "role": "implementation"
      },
      "dependencies": [
        "T002"
      ],
      "functional_paths": [
        "src/main.mjs",
        "src/frontend/desktop/bootstrap.mjs",
        "src/frontend/desktop/application.mjs",
        "src/backend/main.mjs",
        "src/backend/bootstrap.mjs",
        "src/backend/lifecycle.mjs",
        "src/backend/identity.mjs",
        "src/control/facade.mjs",
        "src/execution/facade.mjs",
        "tests/backend-lifecycle.test.mjs",
        ".dependency-cruiser.cjs",
        "tests/execution-architecture.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/workflow-pilot-backend-spec-draft.md",
        "docs/planning/workflow-pilot-backend-todo-draft.md"
      ],
      "verification_ids": [
        "unit-all",
        "architecture"
      ],
      "id": "T003",
      "title": "Выделить самостоятельный backend host",
      "why": "Выделить самостоятельный backend host",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Самостоятельный entrypoint/identity/profile и единственный владелец backend; повторный запуск не создаёт stores/runtime заново.",
        "Backend не погибает вместе с frontend или его process group.",
        "Control/Execution/Kit wiring перенесены из Desktop; browser подключается отдельным портом.",
        "Допуск фоновой работы не требует window/sidebarReady; предметные проверки готовности сохранены.",
        "Чужой владелец, повреждённые stores и незавершённая транзакция дают отказ без сброса данных."
      ],
      "expected_commit_message": "feat: Выделить самостоятельный backend host",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/modules/desktop.md",
            "required": true,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/modules/control.md",
            "required": true,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/modules/execution.md",
            "required": true,
            "revision": "WORKTREE"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "actual_files": [
        ".dependency-cruiser.cjs",
        "docs/planning/workflow-pilot-backend-spec-draft.md",
        "src/backend/bootstrap.mjs",
        "src/backend/identity.mjs",
        "src/backend/lifecycle.mjs",
        "src/backend/main.mjs",
        "src/frontend/desktop/bootstrap.mjs",
        "src/main.mjs",
        "tests/backend-lifecycle.test.mjs",
        "tests/execution-architecture.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-backend-independence",
        "task_id": "T004",
        "role": "implementation"
      },
      "dependencies": [
        "T003"
      ],
      "functional_paths": [
        "src/frontend/desktop/browser-host.mjs",
        "src/execution/browser/session-runtime.mjs",
        "src/execution/browser/backend-host.mjs",
        "src/control/sessions/service.mjs",
        "src/control/workflow/coordination.mjs",
        "src/frontend/desktop/application.mjs",
        "tests/session-runtime.test.mjs",
        "tests/backend-browser-lifecycle.test.mjs",
        "src/backend/bootstrap.mjs",
        "src/backend/identity.mjs",
        "src/backend/lifecycle.mjs",
        "src/backend/main.mjs",
        "src/execution/facade.mjs"
      ],
      "documentation_paths": [
        "docs/planning/workflow-pilot-backend-spec-draft.md",
        "docs/planning/workflow-pilot-backend-todo-draft.md"
      ],
      "verification_ids": [
        "unit-all",
        "electron-smoke",
        "architecture"
      ],
      "id": "T004",
      "title": "Передать backend страницы и автоматизацию",
      "why": "Передать backend страницы и автоматизацию",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Backend владеет WebContents/partition/observer/records/ожиданиями и cleanup.",
        "Detach/закрытие клиента не вызывает release/dispose/recovery reset/cancel.",
        "Reconnect адресует прежнюю страницу без reload/recovery; фоновые cwd/identity сохранены.",
        "Fixture-цепочка продолжает следующие шаги без зрителей/клиента.",
        "Crash страницы отличается от detach; UNKNOWN не повторяется.",
        "Публичные DOM exports и staged observer сохранены."
      ],
      "expected_commit_message": "feat: Передать backend страницы и автоматизацию",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/modules/browser.md",
            "required": true,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/modules/execution.md",
            "required": true,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/modules/workflow-execution.md",
            "required": true,
            "revision": "WORKTREE"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "actual_files": [
        "docs/planning/workflow-pilot-backend-spec-draft.md",
        "src/backend/bootstrap.mjs",
        "src/backend/identity.mjs",
        "src/backend/lifecycle.mjs",
        "src/backend/main.mjs",
        "src/execution/browser/backend-host.mjs",
        "src/execution/browser/session-runtime.mjs",
        "src/execution/facade.mjs",
        "tests/backend-browser-lifecycle.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-backend-independence",
        "task_id": "T005",
        "role": "implementation"
      },
      "dependencies": [
        "T004"
      ],
      "functional_paths": [
        "src/backend/server.mjs",
        "src/backend/operations.mjs",
        "src/backend/events.mjs",
        "src/frontend/client/connection.mjs",
        "src/contracts/backend.mjs",
        "tests/backend-api.test.mjs",
        "src/backend/bootstrap.mjs",
        "src/backend/lifecycle.mjs",
        "src/backend/main.mjs"
      ],
      "documentation_paths": [
        "docs/planning/workflow-pilot-backend-spec-draft.md",
        "docs/planning/workflow-pilot-backend-todo-draft.md"
      ],
      "verification_ids": [
        "unit-all",
        "architecture"
      ],
      "id": "T005",
      "title": "Провести команды и состояние через API",
      "why": "Провести команды и состояние через API",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Настоящие loopback server/client выполняют разрешённые операции проектов/сессий/настроек/плана.",
        "Allowlist/валидация не слабее прежнего IPC; неправильные auth/Host/Origin отвергнуты.",
        "Операции живут после disconnect; повтор requestId не создаёт второй эффект.",
        "Принятие мутации фиксируется до эффекта; crash/смена boot generation требует сверки, не повтора Send.",
        "Медленный клиент/переполнение/повреждённое сообщение не блокируют backend.",
        "Control остаётся единственным источником stores, Kit — плана."
      ],
      "expected_commit_message": "feat: Провести команды и состояние через API",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/modules/control.md",
            "required": true,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/modules/execution.md",
            "required": true,
            "revision": "WORKTREE"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "actual_files": [
        "docs/planning/workflow-pilot-backend-spec-draft.md",
        "src/backend/bootstrap.mjs",
        "src/backend/events.mjs",
        "src/backend/lifecycle.mjs",
        "src/backend/main.mjs",
        "src/backend/operations.mjs",
        "src/backend/server.mjs",
        "src/frontend/client/connection.mjs",
        "tests/backend-api.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-backend-independence",
        "task_id": "T006",
        "role": "implementation"
      },
      "dependencies": [
        "T005"
      ],
      "functional_paths": [
        "src/execution/browser/presentation/host.mjs",
        "src/execution/browser/presentation/input.mjs",
        "src/execution/browser/presentation/transport.mjs",
        "src/frontend/client/browser-view.mjs",
        "src/backend/transfers.mjs",
        "src/contracts/browser-presentation.mjs",
        "tests/browser-presentation.test.mjs",
        "tests/fixtures/backend-browser-page.html",
        "src/backend/events.mjs",
        "src/backend/lifecycle.mjs",
        "src/backend/main.mjs",
        "src/backend/operations.mjs",
        "src/backend/server.mjs",
        "src/execution/browser/backend-host.mjs",
        "src/execution/browser/diagnostics.mjs",
        "src/execution/facade.mjs",
        "src/frontend/client/connection.mjs",
        "tests/backend-browser-lifecycle.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/workflow-pilot-backend-spec-draft.md",
        "docs/planning/workflow-pilot-backend-todo-draft.md"
      ],
      "verification_ids": [
        "unit-all",
        "electron-smoke",
        "architecture"
      ],
      "id": "T006",
      "title": "Реализовать полный интерактив браузера",
      "why": "Реализовать полный интерактив браузера",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Отображается настоящая страница, ввод адресуется сессии/поколению; поздний ввод не попадает в другую.",
        "Работают меню ответов и разговора, подсказки, русский/составной ввод, прокрутка/выделение.",
        "Clipboard/upload/download/popups имеют сквозной клиентский путь.",
        "При disconnect нет зажатых клавиш и replay; наблюдатель не меняет viewport/scroll.",
        "Фоновая работа не требует видимого/сфокусированного пользовательского окна.",
        "Сохраняются draft/Stop/UNKNOWN; новые правила ручного вмешательства не вводятся."
      ],
      "expected_commit_message": "feat: Реализовать полный интерактив браузера",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/modules/browser.md",
            "required": true,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/modules/desktop.md",
            "required": true,
            "revision": "WORKTREE"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "actual_files": [
        "docs/planning/workflow-pilot-backend-spec-draft.md",
        "src/backend/events.mjs",
        "src/backend/lifecycle.mjs",
        "src/backend/main.mjs",
        "src/backend/operations.mjs",
        "src/backend/server.mjs",
        "src/backend/transfers.mjs",
        "src/execution/browser/backend-host.mjs",
        "src/execution/browser/diagnostics.mjs",
        "src/execution/browser/presentation/host.mjs",
        "src/execution/browser/presentation/input.mjs",
        "src/execution/browser/presentation/transport.mjs",
        "src/execution/facade.mjs",
        "src/frontend/client/browser-view.mjs",
        "src/frontend/client/connection.mjs",
        "tests/backend-browser-lifecycle.test.mjs",
        "tests/browser-presentation.test.mjs",
        "tests/fixtures/backend-browser-page.html"
      ]
    },
    {
      "id": "T006R",
      "title": "Освобождать профиль backend и восстанавливаться после падения",
      "why": "Решение пользователя: исправить ловушку owner.json до T007, чтобы клиент работал на настоящем профиле.",
      "dependencies": [],
      "functional_paths": [
        "src/backend/main.mjs",
        "src/backend/identity.mjs",
        "src/backend/lifecycle.mjs",
        "src/frontend/desktop/bootstrap.mjs",
        "tests/backend-lifecycle.test.mjs",
        "tests/backend-owner-recovery.test.mjs",
        "tests/backend-browser-lifecycle.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/workflow-pilot-backend-spec-draft.md"
      ],
      "verification_ids": [
        "unit-all",
        "architecture"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Штатное завершение backend (quit, SIGTERM, SIGINT, выход из системы) после остановки собственных служб удаляет owner.json и service.json только при доказанном владении.",
        "После crash/kill устаревший owner с завершённым процессом восстанавливается безопасно: операции прошлого запуска читаются как UNKNOWN и не повторяются; незавершённая транзакция Kit по-прежнему даёт отказ без сброса данных.",
        "Живой владелец, чужой продукт, повреждённый или неподтверждённый descriptor дают отказ без изменения данных; Desktop не блокируется навсегда устаревшим owner.",
        "Запрет настоящего профиля снят; legacy Desktop и backend никогда не владеют профилем одновременно."
      ],
      "expected_commit_message": "feat: Освобождать профиль backend и восстанавливаться после падения",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-backend-independence",
        "task_id": "T006R",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "docs/planning/workflow-pilot-backend-spec-draft.md",
        "src/backend/identity.mjs",
        "src/backend/main.mjs",
        "tests/backend-browser-lifecycle.test.mjs",
        "tests/backend-lifecycle.test.mjs",
        "tests/backend-owner-recovery.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-backend-independence",
        "task_id": "T007",
        "role": "implementation"
      },
      "dependencies": [
        "T006",
        "T006R"
      ],
      "functional_paths": [
        "src/frontend/desktop/bootstrap.mjs",
        "src/frontend/desktop/application.mjs",
        "src/frontend/desktop/ipc.mjs",
        "src/frontend/desktop/preload.cjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/frontend/desktop/ui/startup.mjs",
        "src/frontend/desktop/ui/index.html",
        "src/frontend/desktop/ui/settings-panel.mjs",
        "src/frontend/desktop/ui/project-doctor.mjs",
        "src/frontend/desktop/ui/archive.mjs",
        "src/frontend/desktop/ui/archive.html",
        "src/frontend/desktop/archive-preload.cjs",
        "src/frontend/desktop/chat-colors-window.mjs",
        "src/frontend/desktop/chat-colors-preload.cjs",
        "src/frontend/desktop/ui/chat-colors.mjs",
        "src/frontend/desktop/ui/chat-colors.html",
        "src/frontend/client/connection.mjs",
        "tests/desktop-boundaries.test.mjs",
        "tests/electron-smoke.mjs",
        ".dependency-cruiser.cjs",
        "src/backend/bootstrap.mjs",
        "src/backend/desktop-model.mjs",
        "src/backend/events.mjs",
        "src/backend/lifecycle.mjs",
        "src/backend/main.mjs",
        "src/backend/operations.mjs",
        "src/backend/remote-surface.mjs",
        "src/contracts/backend.mjs",
        "src/contracts/desktop.mjs",
        "src/execution/browser/backend-host.mjs",
        "src/execution/desktop-dependencies.mjs",
        "src/execution/facade.mjs",
        "src/frontend/desktop/browser-host.mjs",
        "src/frontend/desktop/browser-view-preload.cjs",
        "src/frontend/desktop/client.mjs",
        "src/frontend/desktop/ui/browser-view.html",
        "src/frontend/desktop/ui/browser-view.mjs",
        "src/main.mjs",
        "tests/backend-api.test.mjs",
        "tests/backend-desktop-model.test.mjs",
        "tests/desktop-client.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/workflow-pilot-backend-spec-draft.md",
        "docs/planning/workflow-pilot-backend-todo-draft.md",
        "docs/modules/chatgpt-plugin-acceptance.md",
        "docs/modules/chatgpt-plugin.md"
      ],
      "verification_ids": [
        "unit-all",
        "electron-smoke",
        "architecture"
      ],
      "id": "T007",
      "title": "Перевести desktop в отдельный клиент",
      "why": "Перевести desktop в отдельный клиент",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Целостное окно сохраняет панели и реальный браузер; завершение процесса frontend не завершает backend.",
        "Все обращения UI к Control через API; preload только для разрешённых клиентских OS-возможностей.",
        "Настройки, архив, удаление, Доктор, recovery и onboarding работают через новую границу.",
        "UI доступен при setup-required/ошибке службы и показывает состояние.",
        "Серверный путь проекта не подменяется локальным файловым диалогом удалённого клиента.",
        "Закрытие, Cmd+Q и Quit завершают только клиент; подписи меню поясняют поведение."
      ],
      "expected_commit_message": "feat: Перевести desktop в отдельный клиент",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/modules/desktop.md",
            "required": true,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/modules/first-run-onboarding.md",
            "required": true,
            "revision": "WORKTREE"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "actual_files": [
        ".dependency-cruiser.cjs",
        "docs/modules/chatgpt-plugin-acceptance.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/planning/workflow-pilot-backend-spec-draft.md",
        "src/backend/bootstrap.mjs",
        "src/backend/desktop-model.mjs",
        "src/backend/events.mjs",
        "src/backend/lifecycle.mjs",
        "src/backend/main.mjs",
        "src/backend/operations.mjs",
        "src/backend/remote-surface.mjs",
        "src/contracts/backend.mjs",
        "src/contracts/desktop.mjs",
        "src/execution/browser/backend-host.mjs",
        "src/execution/desktop-dependencies.mjs",
        "src/execution/facade.mjs",
        "src/frontend/client/connection.mjs",
        "src/frontend/desktop/application.mjs",
        "src/frontend/desktop/bootstrap.mjs",
        "src/frontend/desktop/browser-host.mjs",
        "src/frontend/desktop/browser-view-preload.cjs",
        "src/frontend/desktop/client.mjs",
        "src/frontend/desktop/ui/browser-view.html",
        "src/frontend/desktop/ui/browser-view.mjs",
        "src/main.mjs",
        "tests/backend-api.test.mjs",
        "tests/backend-desktop-model.test.mjs",
        "tests/desktop-client.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-backend-independence",
        "task_id": "T008",
        "role": "implementation"
      },
      "dependencies": [
        "T007"
      ],
      "functional_paths": [
        "src/execution/plugin/bridge.mjs",
        "src/control/plugin/service.mjs",
        "src/control/plugin/launch.mjs",
        "src/execution/runtime/service.mjs",
        "src/execution/runtime/vps.mjs",
        "src/backend/lifecycle.mjs",
        "tools/codex-app-server-mcp/plugin.py",
        "tests/chatgpt-plugin.test.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "src/backend/desktop-model.mjs",
        "src/backend/main.mjs"
      ],
      "documentation_paths": [
        "docs/planning/workflow-pilot-backend-spec-draft.md",
        "docs/planning/workflow-pilot-backend-todo-draft.md"
      ],
      "verification_ids": [
        "chatgpt-plugin",
        "executor-channel",
        "unit-all",
        "architecture"
      ],
      "id": "T008",
      "title": "Сохранить MCP, туннель и плагин без frontend",
      "why": "Сохранить MCP, туннель и плагин без frontend",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Bridge/descriptor принадлежат backend, MCP доступен при нуле frontend.",
        "Выбранные настроенные службы переиспользуются, без дубликатов/всех альтернативных туннелей.",
        "Plugin resource/list/open/connect/recovery сохраняют контракт; ошибки отражают backend availability.",
        "Запуск не создаёт чат и не требует открытой панели; агентские инструменты продолжаются без клиента.",
        "UI плагина не обходит определённые права, agent MCP не требует frontend lease.",
        "UNKNOWN запуска не повторяется; внешние сессии автоматически не открываются второй страницей.",
        "Донорские службы/profile не меняются."
      ],
      "expected_commit_message": "feat: Сохранить MCP, туннель и плагин без frontend",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/modules/chatgpt-plugin.md",
            "required": true,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/modules/execution.md",
            "required": true,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/modules/workflow-execution.md",
            "required": true,
            "revision": "WORKTREE"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "actual_files": [
        "docs/planning/workflow-pilot-backend-spec-draft.md",
        "src/backend/desktop-model.mjs",
        "src/backend/main.mjs",
        "src/execution/plugin/bridge.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tools/codex-app-server-mcp/plugin.py"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-backend-independence",
        "task_id": "T009",
        "role": "implementation"
      },
      "dependencies": [
        "T008"
      ],
      "functional_paths": [
        "src/main.mjs",
        "src/backend/launcher.mjs",
        "src/backend/lifecycle.mjs",
        "src/backend/status-menu.mjs",
        "src/execution/platform/paths.mjs",
        "tests/backend-launcher.test.mjs",
        "tests/backend-shutdown.test.mjs",
        "src/backend/desktop-model.mjs",
        "src/backend/events.mjs",
        "src/backend/main.mjs",
        "src/backend/operations.mjs",
        "src/backend/shutdown.mjs",
        "src/contracts/backend.mjs",
        "src/control/facade.mjs",
        "src/control/sessions/service.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/executor-session.mjs",
        "src/control/workflow/project-session-auto-plan.mjs",
        "src/frontend/desktop/client.mjs"
      ],
      "documentation_paths": [
        "docs/planning/workflow-pilot-backend-spec-draft.md",
        "docs/planning/workflow-pilot-backend-todo-draft.md"
      ],
      "verification_ids": [
        "unit-all",
        "electron-smoke",
        "linux-platform",
        "architecture"
      ],
      "id": "T009",
      "title": "Завершить launcher, значок и остановку",
      "why": "Завершить launcher, значок и остановку",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Привычный запуск поднимает/подключает один backend; конкурирующие launcher/старые descriptors проверены.",
        "Постоянный значок/меню живут без frontend и показывают фактическое состояние.",
        "Повторное открытие .app через Finder/Dock/Spotlight при живом backend открывает клиент без перезапуска страницы; лишней Dock-иконки нет, locks процессов независимы.",
        "При отсутствии Linux tray статус/остановка доступны через launcher/клиент; ограничение отражено в DOCS и платформенной приёмке.",
        "Stop переходит в draining: новых назначений нет, текущий ответ и инструменты могут закончиться.",
        "Ожидание/причина/отмена stop видны; нет автоматического kill по timeout.",
        "В безопасной точке остановлены только собственные службы, подтверждение проверено.",
        "Живые системные действия выполняет пользователь; fixture не управляет его окнами.",
        "Штатное завершение backend вне fixture (quit/SIGTERM/выход системы) освобождает owner.json и service.json; после crash/kill устаревший owner.json не блокирует Desktop/клиент навсегда: есть проверенный безопасный путь восстановления без потери незавершённой транзакции."
      ],
      "expected_commit_message": "feat: Завершить launcher, значок и остановку",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/modules/desktop.md",
            "required": true,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/modules/execution.md",
            "required": true,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/modules/linux.md",
            "required": true,
            "revision": "WORKTREE"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "actual_files": [
        "docs/planning/workflow-pilot-backend-spec-draft.md",
        "src/backend/desktop-model.mjs",
        "src/backend/events.mjs",
        "src/backend/main.mjs",
        "src/backend/operations.mjs",
        "src/backend/shutdown.mjs",
        "src/backend/status-menu.mjs",
        "src/contracts/backend.mjs",
        "src/control/facade.mjs",
        "src/control/sessions/service.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/executor-session.mjs",
        "src/control/workflow/project-session-auto-plan.mjs",
        "src/frontend/desktop/client.mjs",
        "src/main.mjs",
        "tests/backend-launcher.test.mjs",
        "tests/backend-shutdown.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-backend-independence",
        "task_id": "T010",
        "role": "implementation"
      },
      "dependencies": [
        "T009"
      ],
      "functional_paths": [
        "src/backend/control-lease.mjs",
        "src/backend/server.mjs",
        "src/backend/events.mjs",
        "src/frontend/client/connection.mjs",
        "src/frontend/client/browser-view.mjs",
        "tests/backend-reconnect.test.mjs",
        "src/backend/lifecycle.mjs",
        "src/backend/main.mjs",
        "src/backend/operations.mjs",
        "src/contracts/backend.mjs",
        "src/frontend/desktop/client.mjs",
        "tests/backend-api.test.mjs",
        "tests/browser-presentation.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/workflow-pilot-backend-spec-draft.md",
        "docs/planning/workflow-pilot-backend-todo-draft.md"
      ],
      "verification_ids": [
        "unit-all",
        "electron-smoke",
        "architecture"
      ],
      "id": "T010",
      "title": "Проверить reconnect и управляющее право",
      "why": "Проверить reconnect и управляющее право",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Два настоящих клиента видят согласованный state; управление берётся/освобождается явно.",
        "Каждая UI-мутация/ввод проверяют generation; поздний запрос старого владельца отвергнут.",
        "Проверены короткий обрыв, истечение lease, crash клиента, пропуск событий и restart backend.",
        "Длительные операции сохраняют ID; нет повторного Send/recovery/создания проекта.",
        "Подписка не захватывает управление, отсутствие клиента не выключает AutoPlan.",
        "UI обозначает устаревание и блокирует непроверяемые изменения."
      ],
      "expected_commit_message": "feat: Проверить reconnect и управляющее право",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/modules/control.md",
            "required": true,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/modules/workflow-execution.md",
            "required": true,
            "revision": "WORKTREE"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "actual_files": [
        "docs/planning/workflow-pilot-backend-spec-draft.md",
        "src/backend/control-lease.mjs",
        "src/backend/lifecycle.mjs",
        "src/backend/main.mjs",
        "src/backend/operations.mjs",
        "src/backend/server.mjs",
        "src/contracts/backend.mjs",
        "src/frontend/client/connection.mjs",
        "src/frontend/desktop/client.mjs",
        "tests/backend-api.test.mjs",
        "tests/backend-reconnect.test.mjs",
        "tests/browser-presentation.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-backend-independence",
        "task_id": "T011",
        "role": "implementation"
      },
      "dependencies": [
        "T010"
      ],
      "functional_paths": [
        "package.json",
        "package-lock.json",
        "scripts/release-all.mjs",
        "scripts/release-package.mjs",
        "scripts/release-mac.mjs",
        "scripts/release-linux.mjs",
        "scripts/verify-windows-package.mjs",
        "scripts/verify-linux-package.mjs",
        "scripts/check-installed-release.mjs",
        "scripts/stage-vendor-notices.mjs",
        "tests/release-all.test.mjs",
        "tests/release-mac.test.mjs",
        "tests/release-linux.test.mjs",
        "tests/backend-upgrade.test.mjs",
        ".dependency-cruiser.cjs",
        "src/backend/lifecycle.mjs",
        "src/backend/main.mjs",
        "src/backend/server.mjs",
        "src/contracts/backend.mjs",
        "src/contracts/launch.mjs",
        "src/frontend/desktop/client.mjs",
        "src/frontend/plugin/app.mjs",
        "src/frontend/plugin/index.html",
        "src/main.mjs"
      ],
      "documentation_paths": [
        "docs/planning/workflow-pilot-backend-spec-draft.md",
        "docs/planning/workflow-pilot-backend-todo-draft.md"
      ],
      "verification_ids": [
        "release-tooling",
        "migration-compatibility",
        "unit-all"
      ],
      "id": "T011",
      "title": "Подготовить upgrade и поставку процессов",
      "why": "Подготовить upgrade и поставку процессов",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Применена версия из user_decisions, согласованная до публикации; package/lock согласованы; production build не запускается.",
        "Три платформы включают launcher/backend/client/transport/resources и лицензии; macOS bundle/helper identity, signing и reopen соответствуют T001/T009.",
        "Upgrade своей 0.1.6 сохраняет stores/profile/Kit; старый активный владелец не допускает второго.",
        "Installer не заменяет runtime под живым backend: реализована проверенная стратегия версии/отложенного переключения.",
        "Несовместимость видна; нет убийства процесса или скрытого fallback.",
        "Откат совместим с состоянием и не затирает новую работу.",
        "Paths/executable bits/symlinks/signature/resource lookup проверены fixtures.",
        "Packaged backend отвергает тестовые флаги (--backend-fixture-root и подобные): не загружает fixture, не печатает token и не меняет профиль."
      ],
      "expected_commit_message": "feat: Подготовить upgrade и поставку процессов",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/modules/release.md",
            "required": true,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/modules/linux.md",
            "required": true,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/modules/project-compatibility.md",
            "required": true,
            "revision": "WORKTREE"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "actual_files": [
        ".dependency-cruiser.cjs",
        "docs/planning/workflow-pilot-backend-spec-draft.md",
        "package-lock.json",
        "package.json",
        "scripts/release-mac.mjs",
        "src/backend/lifecycle.mjs",
        "src/backend/main.mjs",
        "src/backend/server.mjs",
        "src/contracts/backend.mjs",
        "src/contracts/launch.mjs",
        "src/frontend/desktop/client.mjs",
        "src/frontend/plugin/app.mjs",
        "src/frontend/plugin/index.html",
        "src/main.mjs",
        "tests/backend-upgrade.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-backend-independence",
        "task_id": "T012",
        "role": "implementation"
      },
      "dependencies": [
        "T011"
      ],
      "functional_paths": [
        "tests/backend-end-to-end.test.mjs",
        "tests/electron-smoke.mjs",
        ".dependency-cruiser.cjs",
        "src/backend/main.mjs",
        "src/frontend/desktop/client.mjs",
        "tests/backend-launcher.test.mjs",
        "tests/backend-upgrade.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/workflow-pilot-backend-spec-draft.md",
        "docs/planning/workflow-pilot-backend-todo-draft.md",
        "docs/acceptance/backend-independence.md"
      ],
      "verification_ids": [
        "unit-all",
        "electron-smoke",
        "architecture",
        "kit-check",
        "executor-channel",
        "codex-tools-live",
        "migration-compatibility",
        "linux-platform",
        "release-tooling",
        "chatgpt-plugin"
      ],
      "id": "T012",
      "title": "Проверить общий результат и убрать временные пути",
      "why": "Проверить общий результат и убрать временные пути",
      "verification_kind": "code",
      "acceptance_criteria": [
        "A01–A14 сопоставлены с доказательствами; названы pass/fail и pending manual/native.",
        "Сквозной launcher → fixture-план → закрытие/kill клиента → продолжение → reconnect к той же странице/операции → безопасный stop.",
        "Независимый API-клиент без preload и настоящий MCP/HTML bridge работают при отсутствии desktop.",
        "Удалены временные прямые вызовы и window-owned cleanup с проверкой динамических входов.",
        "Обязательные дефекты исправлены до DOCS; fixtures не выданы за живой ChatGPT.",
        "Пользователю передан сценарий Mac с меню, файлами, clipboard и reconnect."
      ],
      "expected_commit_message": "feat: Проверить общий результат и убрать временные пути",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/modules/control.md",
            "required": true,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/modules/execution.md",
            "required": true,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/modules/workflow-execution.md",
            "required": true,
            "revision": "WORKTREE"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "actual_files": [
        ".dependency-cruiser.cjs",
        "docs/acceptance/backend-independence.md",
        "docs/planning/workflow-pilot-backend-spec-draft.md",
        "src/backend/main.mjs",
        "src/frontend/desktop/client.mjs",
        "tests/backend-end-to-end.test.mjs",
        "tests/backend-launcher.test.mjs",
        "tests/backend-upgrade.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-backend-independence",
        "task_id": "DOCS",
        "role": "implementation"
      },
      "dependencies": [
        "T001",
        "T001R",
        "T002",
        "T003",
        "T004",
        "T005",
        "T006",
        "T006R",
        "T007",
        "T008",
        "T009",
        "T010",
        "T011",
        "T012"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "README.md",
        "AGENTS.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/backend.md",
        "docs/modules/browser.md",
        "docs/modules/desktop.md",
        "docs/modules/control.md",
        "docs/modules/execution.md",
        "docs/modules/workflow-execution.md",
        "docs/modules/first-run-onboarding.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/release.md",
        "docs/modules/linux.md",
        "docs/modules/project-compatibility.md",
        "docs/acceptance/backend-independence.md",
        "docs/planning/workflow-pilot-backend-spec-draft.md",
        "docs/planning/workflow-pilot-backend-todo-draft.md",
        "docs/planning/workflow-pilot-backend-t001-evidence.md",
        "docs/modules/chatgpt-plugin-acceptance.md",
        "docs/acceptance/migration-0.1.0.md",
        "docs/planning/backend-independence-followup.md"
      ],
      "verification_ids": [],
      "id": "DOCS",
      "title": "Актуализация всех документов проекта",
      "why": "Актуализировать документы выпуска",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Описаны фактические процессы, запуск/выход/stop, один источник страницы и границы поддержки.",
        "Устаревшее требование держать desktop открытым заменено; нет штатного продолжения того же чата во втором браузере.",
        "Переход версии учитывает живой backend и действия пользователя.",
        "Выпущенные требования перенесены в module contracts, временные документы удалены без потери отложенных этапов.",
        "Required-ссылки удалённых документов ведут на существующий Git blob; каждый документ до 28000 bytes.",
        "DOCS завершена до sourceCommit и production build."
      ],
      "expected_commit_message": "docs: Актуализировать документы выпуска",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/modules/release.md",
            "required": true,
            "revision": "WORKTREE"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "actual_files": [
        "README.md",
        "AGENTS.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/backend.md",
        "docs/modules/browser.md",
        "docs/modules/desktop.md",
        "docs/modules/control.md",
        "docs/modules/execution.md",
        "docs/modules/workflow-execution.md",
        "docs/modules/first-run-onboarding.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/chatgpt-plugin-acceptance.md",
        "docs/modules/release.md",
        "docs/modules/linux.md",
        "docs/acceptance/backend-independence.md",
        "docs/acceptance/migration-0.1.0.md",
        "docs/planning/backend-independence-followup.md",
        "docs/planning/workflow-pilot-backend-spec-draft.md",
        "docs/planning/workflow-pilot-backend-todo-draft.md",
        "docs/planning/workflow-pilot-backend-t001-evidence.md"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-backend-independence",
        "task_id": "T013",
        "role": "implementation"
      },
      "dependencies": [
        "DOCS"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/workflow-pilot-backend-spec-draft.md",
        "docs/planning/workflow-pilot-backend-todo-draft.md"
      ],
      "verification_ids": [
        "three-platform-release"
      ],
      "id": "T013",
      "title": "Собрать новый выпуск трёх ОС",
      "why": "Собрать новый выпуск трёх ОС",
      "verification_kind": "package",
      "acceptance_criteria": [
        "Один штатный цикл macOS arm64/Windows x64/Linux x64 из одного sourceCommit.",
        "Полный состав процессов/resources, подпись, лицензии, инструкции, SHA256SUMS/manifest.",
        "Архивы распакованы и проверены по version/sourceCommit/size/digest; комплект в Downloads/WorkflowPilot-<version>.",
        "Корневой/staging/поставочный manifest совпадают; предыдущие выпуски сохранены.",
        "Частичный комплект не выпуск; исправление исходников требует новой базы и общего цикла.",
        "Native/clean ограничения названы фактически."
      ],
      "expected_commit_message": "release: Собрать новый выпуск трёх ОС",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/modules/release.md",
            "required": true,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/modules/linux.md",
            "required": true,
            "revision": "WORKTREE"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "actual_files": [
        "release-manifest.json"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-backend-independence",
        "task_id": "T014",
        "role": "implementation"
      },
      "dependencies": [
        "T013",
        "DOCS"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/workflow-pilot-backend-spec-draft.md",
        "docs/planning/workflow-pilot-backend-todo-draft.md"
      ],
      "verification_ids": [
        "release-installed"
      ],
      "id": "T014",
      "title": "Установить готовый macOS выпуск",
      "why": "Установить готовый macOS выпуск",
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Готовая app установлена штатно в проект и /Applications/Workflow Pilot.app без пересборки/переподписи.",
        "Сверены version/sourceCommit/manifest/signature/composition и откат.",
        "Агент не завершает клиент/backend, runtime активной версии не повреждён.",
        "Даны точные действия безопасного переключения пользователя.",
        "Установка не объявлена живой приёмкой."
      ],
      "expected_commit_message": "release: Установить готовый macOS выпуск",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/modules/release.md",
            "required": true,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/modules/project-compatibility.md",
            "required": true,
            "revision": "WORKTREE"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "actual_files": []
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-backend-independence",
        "task_id": "T015",
        "role": "implementation"
      },
      "dependencies": [
        "T014",
        "DOCS"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/workflow-pilot-backend-spec-draft.md",
        "docs/planning/workflow-pilot-backend-todo-draft.md"
      ],
      "verification_ids": [
        "github-release"
      ],
      "id": "T015",
      "title": "Опубликовать и сверить GitHub Release",
      "why": "Опубликовать и сверить GitHub Release",
      "verification_kind": "package",
      "acceptance_criteria": [
        "Собственный main отправлен fast-forward, тег на manifest.sourceCommit.",
        "Полный готовый комплект T013 опубликован без пересборки; assets/manifest/size/digests сверены.",
        "После финального коммита remote main соответствует local HEAD.",
        "Даны результаты и сценарий приёмки, pending Windows/Linux/clean без ложного native-tested.",
        "План READY_FOR_ACCEPTANCE; закрытие только по прямому поручению."
      ],
      "expected_commit_message": "release: Опубликовать и сверить GitHub Release",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/modules/release.md",
            "required": true,
            "revision": "WORKTREE"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "actual_files": []
    }
  ],
  "blocked_reason": null,
  "user_decisions": [
    {
      "id": "draft-review-only",
      "text": "Ревью только черновиков. Публикация, версия 0.2.0 и исполнение не подтверждены; новая задача про уведомление Review отложена.",
      "recorded_at": "2026-10-15T00:00:00Z"
    },
    {
      "id": "prototype-approval-gate",
      "text": "Обязательное ограничение проекта: после T001 BLOCKED до записанного пользовательского согласия с транспортом/живой проверкой. Версия, lease и draining согласуются до публикации. Самого согласия пока нет.",
      "recorded_at": "2026-10-15T00:00:00Z"
    },
    {
      "id": "e8b2493e-ae40-448d-a4c8-ffb062a4a012",
      "text": "Пользователь поручил подготовить и передать на Claude Review два черновика. Это разрешение на ревью, не на публикацию активного плана, реализацию или выпуск.",
      "recorded_at": "2026-10-15T12:56:20.016Z"
    },
    {
      "id": "recovery-context-by-task",
      "recorded_at": "2026-10-15T13:12:44Z",
      "text": "По поручению пользователя разгрузить recovery: общими оставить спецификацию и OVERVIEW, повторный to-do передавать ссылкой, документацию модулей подключать только для соответствующих задач. Задачи, критерии, зависимости и проверки не менять; реализацию не начинать. Документы по ссылкам читаются по необходимости, включая DOCS и общую регрессию."
    },
    {
      "id": "t001-transport-manual-approval",
      "recorded_at": "2026-10-15T15:03:44Z",
      "text": "Пользователь в живом испытании macOS подтвердил сохранение черновика и продолжающийся счётчик при закрытии/повторном открытии отдельного клиента; после автоматического Retina-масштабирования 2x подтвердил идентичную чёткость текста серверного кадра и клиентского UI и прямо разрешил продолжать план. Для T002 принят проверенный локальный транспорт Electron offscreen PNG/CDP с автоматической плотностью кадра (не фиксированный 2x). Прочие живые интерактивные сценарии, macOS helper, Windows/Linux, версия выпуска, lease и draining не считаются подтверждёнными этой проверкой и остаются в соответствующих задачах/до отдельного решения."
    },
    {
      "id": "t007-thin-client",
      "recorded_at": "2026-10-15T16:53:57.240Z",
      "text": "T007: тонкий клиент. Логика application.mjs переносится в backend с тем же набором каналов pilot:*/archive:*/цветов и снимком состояния; клиент передаёт вызовы через API и показывает страницу кадрами; поведение 0.6.115 сохраняется."
    },
    {
      "id": "owner-release-before-t007",
      "recorded_at": "2026-10-15T16:53:57.240Z",
      "text": "Ловушку owner.json исправить отдельной задачей перед T007: освобождение профиля при штатном выходе и безопасное восстановление после падения, затем снять запрет на настоящий профиль. В T009 остаются launcher, значок и draining."
    },
    {
      "id": "release-version-0.2.0",
      "recorded_at": "2026-10-15T16:53:57.240Z",
      "text": "Версия выпуска 0.2.0 (для T011)."
    },
    {
      "id": "lease-timing",
      "recorded_at": "2026-10-15T16:53:57.240Z",
      "text": "Lease: продление каждые 10 с, истечение через 45 с. Draining как в спецификации: ожидание безопасной точки, без автоматического kill."
    }
  ],
  "parallel_allowed": false,
  "max_workers": 2,
  "execution_strategy": "sequential",
  "execution_reason": "Снимок основной сессии запрещает параллельность. Последовательный перенос общих lifecycle, browser host, Control/API требует завершения предыдущей задачи.",
  "execution_origin_session_id": "web-pilot-428429f5-d6d4-45c6-9e4a-4c7ed9003a88"
}
```
<!-- workflow-state:end -->

## Состояние

Execution Scope Status: ACTIVE
Delivery Status: READY_FOR_ACCEPTANCE
Scope: workflow-pilot-backend-independence
Current Task: нет
Revision: 163

## Цель

Независимый frontend и постоянно работающий backend/browser на одном Mac; совместимая поставка трёх ОС.

## Критерии приёмки

- A01: Launcher поднимает ровно один backend; конкурентный запуск безопасен
- A02: Закрытие/kill frontend сохраняет страницу, её состояние, тестовую работу и MCP/bridge
- A03: Reconnect возвращает ту же страницу/операцию; reload/recovery/Send не растут
- A04: Независимый API-клиент без preload получает те же разрешённые операции
- A05: Fixture-цепочка микрозадач продолжает переходы без frontend
- A06: Два клиента: общий state, один writer, позднее старое поколение отклонено
- A07: Пропуск событий/restart/reconnect не повторяют мутации и ввод
- A08: Меню, русский ввод, выделение, clipboard, upload/download работают сквозным образом
- A09: Popups/авторизация не требуют видимого серверного окна; ноль зрителей допустим
- A10: MCP-инструменты и plugin resource/list/open/connect работают без frontend
- A11: Stop ждёт безопасную точку, не убивает текущую работу, подтверждает остановку своих служб
- A12: Upgrade, занятый профиль/порт, старый descriptor, несовместимость и отказ записи не теряют данные
- A13: Проверены auth/Origin/Host, границы файлов, очереди и медленный клиент
- A14: Три пакета одного sourceCommit содержат полный backend/client и корректный запуск

## Микрозадачи

Выполнение: sequential; разрешено: false; лимит: 2
Причина: Снимок основной сессии запрещает параллельность. Последовательный перенос общих lifecycle, browser host, Control/API требует завершения предыдущей задачи.

- [DONE] T001: Проверить независимый браузер и выбрать транспорт — Завершено
  - Git Commit: [DONE] feat: Проверить независимый браузер и выбрать транспорт
  - Reference: workflow-pilot-backend-independence / T001 / implementation
  - Файлы: tests/fixtures/backend-browser-page.html, tests/backend-browser-prototype.test.mjs, tests/fixtures/backend-browser-client.mjs, tests/fixtures/backend-browser-probe.mjs, tests/fixtures/backend-browser-viewer-preload.cjs, tests/fixtures/backend-browser-viewer.html, tests/fixtures/backend-browser-viewer.mjs, docs/planning/workflow-pilot-backend-spec-draft.md, docs/planning/workflow-pilot-backend-todo-draft.md, docs/planning/workflow-pilot-backend-t001-evidence.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] T001R: Автоматически подбирать Retina-плотность кадра для проверочного клиента — Завершено
  - Git Commit: [DONE] test: Автонастройка чёткости независимого браузера под Retina
  - Reference: workflow-pilot-backend-independence / T001R / implementation
  - Файлы: tests/fixtures/backend-browser-probe.mjs, tests/fixtures/backend-browser-viewer.mjs, tests/fixtures/backend-browser-viewer.html, tests/backend-browser-prototype.test.mjs, docs/planning/workflow-pilot-backend-t001-evidence.md
  - Параллельность: исключительное выполнение
  - Зависимости: T001
- [DONE] T002: Закрепить контракт и границы — Завершено
  - Git Commit: [DONE] feat: Закрепить контракт и границы
  - Reference: workflow-pilot-backend-independence / T002 / implementation
  - Файлы: src/contracts/backend.mjs, src/contracts/browser-presentation.mjs, src/backend/protocol.mjs, tests/backend-protocol.test.mjs, .dependency-cruiser.cjs, tests/execution-architecture.test.mjs, docs/planning/workflow-pilot-backend-spec-draft.md, docs/planning/workflow-pilot-backend-todo-draft.md, docs/planning/workflow-pilot-backend-t001-evidence.md
  - Параллельность: исключительное выполнение
  - Зависимости: T001, T001R
- [DONE] T003: Выделить самостоятельный backend host — Завершено
  - Git Commit: [DONE] feat: Выделить самостоятельный backend host
  - Reference: workflow-pilot-backend-independence / T003 / implementation
  - Файлы: src/main.mjs, src/frontend/desktop/bootstrap.mjs, src/frontend/desktop/application.mjs, src/backend/main.mjs, src/backend/bootstrap.mjs, src/backend/lifecycle.mjs, src/backend/identity.mjs, src/control/facade.mjs, src/execution/facade.mjs, tests/backend-lifecycle.test.mjs, .dependency-cruiser.cjs, tests/execution-architecture.test.mjs, docs/planning/workflow-pilot-backend-spec-draft.md, docs/planning/workflow-pilot-backend-todo-draft.md
  - Параллельность: исключительное выполнение
  - Зависимости: T002
- [DONE] T004: Передать backend страницы и автоматизацию — Завершено
  - Git Commit: [DONE] feat: Передать backend страницы и автоматизацию
  - Reference: workflow-pilot-backend-independence / T004 / implementation
  - Файлы: src/frontend/desktop/browser-host.mjs, src/execution/browser/session-runtime.mjs, src/execution/browser/backend-host.mjs, src/control/sessions/service.mjs, src/control/workflow/coordination.mjs, src/frontend/desktop/application.mjs, tests/session-runtime.test.mjs, tests/backend-browser-lifecycle.test.mjs, src/backend/bootstrap.mjs, src/backend/identity.mjs, src/backend/lifecycle.mjs, src/backend/main.mjs, src/execution/facade.mjs, docs/planning/workflow-pilot-backend-spec-draft.md, docs/planning/workflow-pilot-backend-todo-draft.md
  - Параллельность: исключительное выполнение
  - Зависимости: T003
- [DONE] T005: Провести команды и состояние через API — Завершено
  - Git Commit: [DONE] feat: Провести команды и состояние через API
  - Reference: workflow-pilot-backend-independence / T005 / implementation
  - Файлы: src/backend/server.mjs, src/backend/operations.mjs, src/backend/events.mjs, src/frontend/client/connection.mjs, src/contracts/backend.mjs, tests/backend-api.test.mjs, src/backend/bootstrap.mjs, src/backend/lifecycle.mjs, src/backend/main.mjs, docs/planning/workflow-pilot-backend-spec-draft.md, docs/planning/workflow-pilot-backend-todo-draft.md
  - Параллельность: исключительное выполнение
  - Зависимости: T004
- [DONE] T006: Реализовать полный интерактив браузера — Завершено
  - Git Commit: [DONE] feat: Реализовать полный интерактив браузера
  - Reference: workflow-pilot-backend-independence / T006 / implementation
  - Файлы: src/execution/browser/presentation/host.mjs, src/execution/browser/presentation/input.mjs, src/execution/browser/presentation/transport.mjs, src/frontend/client/browser-view.mjs, src/backend/transfers.mjs, src/contracts/browser-presentation.mjs, tests/browser-presentation.test.mjs, tests/fixtures/backend-browser-page.html, src/backend/events.mjs, src/backend/lifecycle.mjs, src/backend/main.mjs, src/backend/operations.mjs, src/backend/server.mjs, src/execution/browser/backend-host.mjs, src/execution/browser/diagnostics.mjs, src/execution/facade.mjs, src/frontend/client/connection.mjs, tests/backend-browser-lifecycle.test.mjs, docs/planning/workflow-pilot-backend-spec-draft.md, docs/planning/workflow-pilot-backend-todo-draft.md
  - Параллельность: исключительное выполнение
  - Зависимости: T005
- [DONE] T006R: Освобождать профиль backend и восстанавливаться после падения — Завершено
  - Git Commit: [DONE] feat: Освобождать профиль backend и восстанавливаться после падения
  - Reference: workflow-pilot-backend-independence / T006R / implementation
  - Файлы: src/backend/main.mjs, src/backend/identity.mjs, src/backend/lifecycle.mjs, src/frontend/desktop/bootstrap.mjs, tests/backend-lifecycle.test.mjs, tests/backend-owner-recovery.test.mjs, tests/backend-browser-lifecycle.test.mjs, docs/planning/workflow-pilot-backend-spec-draft.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] T007: Перевести desktop в отдельный клиент — Завершено
  - Git Commit: [DONE] feat: Перевести desktop в отдельный клиент
  - Reference: workflow-pilot-backend-independence / T007 / implementation
  - Файлы: src/frontend/desktop/bootstrap.mjs, src/frontend/desktop/application.mjs, src/frontend/desktop/ipc.mjs, src/frontend/desktop/preload.cjs, src/frontend/desktop/ui/sidebar.mjs, src/frontend/desktop/ui/startup.mjs, src/frontend/desktop/ui/index.html, src/frontend/desktop/ui/settings-panel.mjs, src/frontend/desktop/ui/project-doctor.mjs, src/frontend/desktop/ui/archive.mjs, src/frontend/desktop/ui/archive.html, src/frontend/desktop/archive-preload.cjs, src/frontend/desktop/chat-colors-window.mjs, src/frontend/desktop/chat-colors-preload.cjs, src/frontend/desktop/ui/chat-colors.mjs, src/frontend/desktop/ui/chat-colors.html, src/frontend/client/connection.mjs, tests/desktop-boundaries.test.mjs, tests/electron-smoke.mjs, .dependency-cruiser.cjs, src/backend/bootstrap.mjs, src/backend/desktop-model.mjs, src/backend/events.mjs, src/backend/lifecycle.mjs, src/backend/main.mjs, src/backend/operations.mjs, src/backend/remote-surface.mjs, src/contracts/backend.mjs, src/contracts/desktop.mjs, src/execution/browser/backend-host.mjs, src/execution/desktop-dependencies.mjs, src/execution/facade.mjs, src/frontend/desktop/browser-host.mjs, src/frontend/desktop/browser-view-preload.cjs, src/frontend/desktop/client.mjs, src/frontend/desktop/ui/browser-view.html, src/frontend/desktop/ui/browser-view.mjs, src/main.mjs, tests/backend-api.test.mjs, tests/backend-desktop-model.test.mjs, tests/desktop-client.test.mjs, docs/planning/workflow-pilot-backend-spec-draft.md, docs/planning/workflow-pilot-backend-todo-draft.md, docs/modules/chatgpt-plugin-acceptance.md, docs/modules/chatgpt-plugin.md
  - Параллельность: исключительное выполнение
  - Зависимости: T006, T006R
- [DONE] T008: Сохранить MCP, туннель и плагин без frontend — Завершено
  - Git Commit: [DONE] feat: Сохранить MCP, туннель и плагин без frontend
  - Reference: workflow-pilot-backend-independence / T008 / implementation
  - Файлы: src/execution/plugin/bridge.mjs, src/control/plugin/service.mjs, src/control/plugin/launch.mjs, src/execution/runtime/service.mjs, src/execution/runtime/vps.mjs, src/backend/lifecycle.mjs, tools/codex-app-server-mcp/plugin.py, tests/chatgpt-plugin.test.mjs, tests/codex-app-server-mcp.test.mjs, src/backend/desktop-model.mjs, src/backend/main.mjs, docs/planning/workflow-pilot-backend-spec-draft.md, docs/planning/workflow-pilot-backend-todo-draft.md
  - Параллельность: исключительное выполнение
  - Зависимости: T007
- [DONE] T009: Завершить launcher, значок и остановку — Завершено
  - Git Commit: [DONE] feat: Завершить launcher, значок и остановку
  - Reference: workflow-pilot-backend-independence / T009 / implementation
  - Файлы: src/main.mjs, src/backend/launcher.mjs, src/backend/lifecycle.mjs, src/backend/status-menu.mjs, src/execution/platform/paths.mjs, tests/backend-launcher.test.mjs, tests/backend-shutdown.test.mjs, src/backend/desktop-model.mjs, src/backend/events.mjs, src/backend/main.mjs, src/backend/operations.mjs, src/backend/shutdown.mjs, src/contracts/backend.mjs, src/control/facade.mjs, src/control/sessions/service.mjs, src/control/workflow/coordination.mjs, src/control/workflow/executor-session.mjs, src/control/workflow/project-session-auto-plan.mjs, src/frontend/desktop/client.mjs, docs/planning/workflow-pilot-backend-spec-draft.md, docs/planning/workflow-pilot-backend-todo-draft.md
  - Параллельность: исключительное выполнение
  - Зависимости: T008
- [DONE] T010: Проверить reconnect и управляющее право — Завершено
  - Git Commit: [DONE] feat: Проверить reconnect и управляющее право
  - Reference: workflow-pilot-backend-independence / T010 / implementation
  - Файлы: src/backend/control-lease.mjs, src/backend/server.mjs, src/backend/events.mjs, src/frontend/client/connection.mjs, src/frontend/client/browser-view.mjs, tests/backend-reconnect.test.mjs, src/backend/lifecycle.mjs, src/backend/main.mjs, src/backend/operations.mjs, src/contracts/backend.mjs, src/frontend/desktop/client.mjs, tests/backend-api.test.mjs, tests/browser-presentation.test.mjs, docs/planning/workflow-pilot-backend-spec-draft.md, docs/planning/workflow-pilot-backend-todo-draft.md
  - Параллельность: исключительное выполнение
  - Зависимости: T009
- [DONE] T011: Подготовить upgrade и поставку процессов — Завершено
  - Git Commit: [DONE] feat: Подготовить upgrade и поставку процессов
  - Reference: workflow-pilot-backend-independence / T011 / implementation
  - Файлы: package.json, package-lock.json, scripts/release-all.mjs, scripts/release-package.mjs, scripts/release-mac.mjs, scripts/release-linux.mjs, scripts/verify-windows-package.mjs, scripts/verify-linux-package.mjs, scripts/check-installed-release.mjs, scripts/stage-vendor-notices.mjs, tests/release-all.test.mjs, tests/release-mac.test.mjs, tests/release-linux.test.mjs, tests/backend-upgrade.test.mjs, .dependency-cruiser.cjs, src/backend/lifecycle.mjs, src/backend/main.mjs, src/backend/server.mjs, src/contracts/backend.mjs, src/contracts/launch.mjs, src/frontend/desktop/client.mjs, src/frontend/plugin/app.mjs, src/frontend/plugin/index.html, src/main.mjs, docs/planning/workflow-pilot-backend-spec-draft.md, docs/planning/workflow-pilot-backend-todo-draft.md
  - Параллельность: исключительное выполнение
  - Зависимости: T010
- [DONE] T012: Проверить общий результат и убрать временные пути — Завершено
  - Git Commit: [DONE] feat: Проверить общий результат и убрать временные пути
  - Reference: workflow-pilot-backend-independence / T012 / implementation
  - Файлы: tests/backend-end-to-end.test.mjs, tests/electron-smoke.mjs, .dependency-cruiser.cjs, src/backend/main.mjs, src/frontend/desktop/client.mjs, tests/backend-launcher.test.mjs, tests/backend-upgrade.test.mjs, docs/planning/workflow-pilot-backend-spec-draft.md, docs/planning/workflow-pilot-backend-todo-draft.md, docs/acceptance/backend-independence.md
  - Параллельность: исключительное выполнение
  - Зависимости: T011
- [DONE] DOCS: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: Актуализировать документы выпуска
  - Reference: workflow-pilot-backend-independence / DOCS / implementation
  - Файлы: README.md, AGENTS.md, docs/architecture/OVERVIEW.md, docs/modules/backend.md, docs/modules/browser.md, docs/modules/desktop.md, docs/modules/control.md, docs/modules/execution.md, docs/modules/workflow-execution.md, docs/modules/first-run-onboarding.md, docs/modules/chatgpt-plugin.md, docs/modules/release.md, docs/modules/linux.md, docs/modules/project-compatibility.md, docs/acceptance/backend-independence.md, docs/planning/workflow-pilot-backend-spec-draft.md, docs/planning/workflow-pilot-backend-todo-draft.md, docs/planning/workflow-pilot-backend-t001-evidence.md, docs/modules/chatgpt-plugin-acceptance.md, docs/acceptance/migration-0.1.0.md, docs/planning/backend-independence-followup.md
  - Параллельность: исключительное выполнение
  - Зависимости: T001, T001R, T002, T003, T004, T005, T006, T006R, T007, T008, T009, T010, T011, T012
- [DONE] T013: Собрать новый выпуск трёх ОС — Завершено
  - Git Commit: [DONE] release: Собрать новый выпуск трёх ОС
  - Reference: workflow-pilot-backend-independence / T013 / implementation
  - Файлы: release-manifest.json, docs/planning/workflow-pilot-backend-spec-draft.md, docs/planning/workflow-pilot-backend-todo-draft.md
  - Параллельность: исключительное выполнение
  - Зависимости: DOCS
- [DONE] T014: Установить готовый macOS выпуск — Завершено
  - Git Commit: [DONE] release: Установить готовый macOS выпуск
  - Reference: workflow-pilot-backend-independence / T014 / implementation
  - Файлы: release-manifest.json, docs/planning/workflow-pilot-backend-spec-draft.md, docs/planning/workflow-pilot-backend-todo-draft.md
  - Параллельность: исключительное выполнение
  - Зависимости: T013, DOCS
- [DONE] T015: Опубликовать и сверить GitHub Release — Завершено
  - Git Commit: [DONE] release: Опубликовать и сверить GitHub Release
  - Reference: workflow-pilot-backend-independence / T015 / implementation
  - Файлы: release-manifest.json, docs/planning/workflow-pilot-backend-spec-draft.md, docs/planning/workflow-pilot-backend-todo-draft.md
  - Параллельность: исключительное выполнение
  - Зависимости: T014, DOCS

## Context Pack For This Cycle

- docs/planning/workflow-pilot-backend-todo-draft.md
- docs/architecture/OVERVIEW.md
- docs/modules/desktop.md
- docs/modules/browser.md
- docs/modules/control.md
- docs/modules/execution.md
- docs/modules/release.md
- docs/modules/workflow-execution.md
- docs/modules/first-run-onboarding.md
- docs/modules/chatgpt-plugin.md
- docs/modules/linux.md
- docs/modules/project-compatibility.md
- docs/planning/workflow-pilot-backend-spec-draft.md

Служебные состояния меняются только командами workflow. Приёмка не архивирует scope.
