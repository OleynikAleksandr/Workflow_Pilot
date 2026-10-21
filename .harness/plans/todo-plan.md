# Активный план — Workflow_Pilot

<!-- workflow-state:begin -->
```json
{
  "schema_version": 1,
  "plan_revision": 839,
  "project_id": "7411e192-943c-4529-bffb-3b081d9c242f",
  "project_name": "Workflow_Pilot",
  "scope_id": "orchestrator-panel-startup",
  "execution_scope_status": "ACTIVE",
  "delivery_status": "READY_FOR_ACCEPTANCE",
  "objective": "Стартовый контекст O через панель без DOM-вложений, проверенный выпуск и установка",
  "acceptance_criteria": [
    "Новая O-сессия получает полный пакет через панель без вложений на изолированных fixtures; живая приёмка pending",
    "Все части подтверждены, grant плана не выдан",
    "Адресные проверки, комплект трёх ОС и установка проверены"
  ],
  "approved_scope": {
    "functional_paths": [
      "src/**",
      "tools/codex-app-server-mcp/**",
      "tests/**",
      "package.json",
      "package-lock.json",
      "src/backend/desktop-model.mjs",
      "src/contracts/backend.mjs",
      "src/contracts/startup-view.mjs",
      "src/control/context/context-session.mjs",
      "src/control/context/service.mjs",
      "src/control/plugin/communication.mjs",
      "src/control/plugin/service.mjs",
      "src/control/plugin/startup-context.mjs",
      "src/control/plugin/workflow-channel.mjs",
      "src/control/workflow/coordination.mjs",
      "src/control/workflow/dialogue-delivery.mjs",
      "src/frontend/desktop/ui/progress.mjs",
      "src/frontend/desktop/ui/sidebar.mjs",
      "src/frontend/plugin/launch.mjs",
      "src/frontend/plugin/panel.mjs",
      "tests/chatgpt-plugin.test.mjs",
      "tests/codex-app-server-mcp.test.mjs",
      "tests/context-session.test.mjs",
      "tests/fixtures/automatic-agent-dialogue.mjs",
      "tests/sidebar.test.mjs",
      "tests/startup-context.test.mjs",
      "tools/codex-app-server-mcp/plugin.py",
      "release-manifest.json",
      "src/control/context/legacy-attachment-message.mjs",
      "src/control/plugin/enrollment.mjs",
      "tests/plugin-enrollment.test.mjs",
      "src/execution/plugin/communication-store.mjs",
      "tests/plugin-communication-store.test.mjs",
      "tests/plugin-communication.test.mjs"
    ],
    "documentation_paths": [
      "docs/planning/orchestrator-panel-startup.md",
      "README.md",
      "docs/**",
      "docs/architecture/OVERVIEW.md",
      "docs/acceptance/orchestrated-execution.md",
      "docs/modules/assignment-dialogue-reliability.md",
      "docs/modules/assignment-dialogue.md",
      "docs/modules/automatic-agent-dialogue-acceptance.md",
      "docs/modules/browser.md",
      "docs/modules/chatgpt-plugin-acceptance.md",
      "docs/modules/chatgpt-plugin.md",
      "docs/modules/control.md",
      "docs/modules/dialogue-timing.md",
      "docs/modules/orchestrated-execution.md",
      "docs/modules/orchestrator-startup.md",
      "docs/modules/plugin-communication-handoff.md",
      "docs/modules/release.md",
      "docs/modules/workflow-execution.md",
      "docs/planning/startup-latency.md",
      "docs/planning/universal-startup.md"
    ]
  },
  "baseline_commit": "f2182b36578b1412cfb7d48985c91d449944d7aa",
  "current_task_id": null,
  "context_pack": {
    "documents": [
      {
        "path": "docs/planning/orchestrator-panel-startup.md",
        "required": true,
        "revision": "8a0d8bd864f301d68683f5d11937fac45812ca11"
      },
      {
        "path": "docs/architecture/OVERVIEW.md",
        "required": true,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/planning/startup-latency.md",
        "required": true,
        "revision": "59ce9e40e7d7966fee33583d3b3d1bf2a1db7345"
      },
      {
        "path": "docs/modules/orchestrator-startup.md",
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
        "scope_id": "orchestrator-panel-startup",
        "task_id": "STARTUP",
        "role": "implementation"
      },
      "dependencies": [],
      "functional_paths": [
        "src/**",
        "tools/codex-app-server-mcp/**",
        "tests/**",
        "src/backend/desktop-model.mjs",
        "src/contracts/backend.mjs",
        "src/contracts/startup-view.mjs",
        "src/control/context/context-session.mjs",
        "src/control/context/service.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/service.mjs",
        "src/control/plugin/startup-context.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/frontend/desktop/ui/progress.mjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/frontend/plugin/launch.mjs",
        "src/frontend/plugin/panel.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/context-session.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/sidebar.test.mjs",
        "tests/startup-context.test.mjs",
        "tools/codex-app-server-mcp/plugin.py"
      ],
      "documentation_paths": [
        "docs/planning/orchestrator-panel-startup.md"
      ],
      "verification_ids": [
        "orchestrator-startup",
        "architecture",
        "chatgpt-plugin",
        "startup-recovery",
        "attachment-diagnostics",
        "prepared-flow-cycle",
        "executor-channel"
      ],
      "id": "STARTUP",
      "title": "Передавать полный контекст O через подтверждённую панель",
      "why": "Передавать полный контекст O через подтверждённую панель",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Создан tests/startup-context.test.mjs: bootstrap без вложений, bind/конец хода, UTF-8, ранний ack, чужой получатель, reconnect/restart, stale/удаление, UNKNOWN без повторного Send",
        "Контекст не выдаёт grant; регрессии E, вложений и старого recovery пройдены"
      ],
      "expected_commit_message": "feat: Передавать полный контекст O через подтверждённую панель",
      "parallel_safe": false,
      "actual_files": [
        "src/backend/desktop-model.mjs",
        "src/contracts/backend.mjs",
        "src/contracts/startup-view.mjs",
        "src/control/context/context-session.mjs",
        "src/control/context/service.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/service.mjs",
        "src/control/plugin/startup-context.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/frontend/desktop/ui/progress.mjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/frontend/plugin/launch.mjs",
        "src/frontend/plugin/panel.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/context-session.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/sidebar.test.mjs",
        "tests/startup-context.test.mjs",
        "tools/codex-app-server-mcp/plugin.py"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "orchestrator-panel-startup",
        "task_id": "VERSION",
        "role": "implementation"
      },
      "dependencies": [
        "STARTUP"
      ],
      "functional_paths": [
        "package.json",
        "package-lock.json",
        "src/**",
        "tests/**",
        "src/contracts/backend.mjs"
      ],
      "documentation_paths": [
        "docs/planning/orchestrator-panel-startup.md"
      ],
      "verification_ids": [
        "chatgpt-plugin",
        "orchestrator-startup"
      ],
      "id": "VERSION",
      "title": "Согласовать версию 0.5.20 и контракты инструкций",
      "why": "Согласовать версию 0.5.20 и контракты инструкций",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Версия 0.5.20, protocol 4; старая панель получает VERSION",
        "Сверены role-protocol и шаблоны Kit, startup/MCP/ошибки; Kit не меняется"
      ],
      "expected_commit_message": "feat: Согласовать версию 0.5.20 и контракты инструкций",
      "parallel_safe": false,
      "actual_files": [
        "package-lock.json",
        "package.json",
        "src/contracts/backend.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "orchestrator-panel-startup",
        "task_id": "DOCS",
        "role": "implementation"
      },
      "dependencies": [
        "STARTUP",
        "VERSION"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "README.md",
        "docs/**",
        "docs/planning/orchestrator-panel-startup.md",
        "docs/architecture/OVERVIEW.md",
        "docs/acceptance/orchestrated-execution.md",
        "docs/modules/assignment-dialogue-reliability.md",
        "docs/modules/assignment-dialogue.md",
        "docs/modules/automatic-agent-dialogue-acceptance.md",
        "docs/modules/browser.md",
        "docs/modules/chatgpt-plugin-acceptance.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/control.md",
        "docs/modules/dialogue-timing.md",
        "docs/modules/orchestrated-execution.md",
        "docs/modules/orchestrator-startup.md",
        "docs/modules/plugin-communication-handoff.md",
        "docs/modules/release.md",
        "docs/modules/workflow-execution.md"
      ],
      "verification_ids": [],
      "id": "DOCS",
      "title": "Актуализация всех документов проекта",
      "why": "Закрепить новый контракт и границы приёмки",
      "acceptance_criteria": [
        "README/OVERVIEW/модульные контракты отражают реализацию; live acceptance pending; временная выпущенная спецификация перенесена и удалена"
      ],
      "expected_commit_message": "docs: описать стартовый канал оркестратора",
      "parallel_safe": false,
      "actual_files": [
        "README.md",
        "docs/acceptance/orchestrated-execution.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/assignment-dialogue-reliability.md",
        "docs/modules/assignment-dialogue.md",
        "docs/modules/automatic-agent-dialogue-acceptance.md",
        "docs/modules/browser.md",
        "docs/modules/chatgpt-plugin-acceptance.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/control.md",
        "docs/modules/dialogue-timing.md",
        "docs/modules/orchestrated-execution.md",
        "docs/modules/orchestrator-startup.md",
        "docs/modules/plugin-communication-handoff.md",
        "docs/modules/release.md",
        "docs/modules/workflow-execution.md",
        "docs/planning/orchestrator-panel-startup.md"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "orchestrator-panel-startup",
        "task_id": "BUILD",
        "role": "implementation"
      },
      "dependencies": [
        "VERSION",
        "DOCS"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/orchestrator-panel-startup.md"
      ],
      "verification_ids": [
        "three-platform-release"
      ],
      "id": "BUILD",
      "title": "Собрать проверенный комплект 0.5.20 для трёх ОС",
      "why": "Собрать проверенный комплект 0.5.20 для трёх ОС",
      "verification_kind": "package",
      "acceptance_criteria": [
        "Перед каждой сборкой удалён только Python cache tools/codex-app-server-mcp без следования симлинкам",
        "Manifest и комплекты трёх ОС имеют один sourceCommit"
      ],
      "expected_commit_message": "build: Собрать проверенный комплект 0.5.20 для трёх ОС",
      "parallel_safe": false,
      "actual_files": [
        "release-manifest.json"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "orchestrator-panel-startup",
        "task_id": "INSTALL",
        "role": "implementation"
      },
      "dependencies": [
        "BUILD",
        "DOCS"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/planning/orchestrator-panel-startup.md"
      ],
      "verification_ids": [
        "release-installed"
      ],
      "id": "INSTALL",
      "title": "Установить готовое macOS-приложение 0.5.20",
      "why": "Установить готовое macOS-приложение 0.5.20",
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Готовая копия 0.5.20 проверена installer в /Applications либо staged pending при работающем backend; версия/signature/manifest/rollback подтверждены",
        "Приложение и backend не останавливались"
      ],
      "expected_commit_message": "build: Установить готовое macOS-приложение 0.5.20",
      "parallel_safe": false,
      "actual_files": []
    },
    {
      "id": "FAST-START",
      "title": "Получать стартовый контекст O в одном ходе через панель",
      "why": "Получать стартовый контекст O в одном ходе через панель",
      "dependencies": [],
      "functional_paths": [
        "src/**",
        "tools/codex-app-server-mcp/**",
        "tests/**",
        "package.json",
        "package-lock.json",
        "src/contracts/backend.mjs",
        "src/contracts/startup-view.mjs",
        "src/control/context/context-session.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/service.mjs",
        "src/control/plugin/startup-context.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/frontend/plugin/launch.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/context-session.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/startup-context.test.mjs",
        "tools/codex-app-server-mcp/plugin.py"
      ],
      "documentation_paths": [
        "docs/planning/startup-latency.md"
      ],
      "verification_ids": [
        "orchestrator-startup",
        "architecture",
        "chatgpt-plugin",
        "startup-recovery",
        "prepared-flow-cycle",
        "executor-channel"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Новый старт возвращает первую часть в panel и не выполняет SDK Send; остаток и ack в том же ходе",
        "Адресные проверки включают restart/stale/чужого получателя/старый UNKNOWN/отсутствие grant",
        "Версия 0.5.21; bootstrap, MCP и backend согласованы"
      ],
      "expected_commit_message": "feat: Получать стартовый контекст O в одном ходе через панель",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "orchestrator-panel-startup",
        "task_id": "FAST-START",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "docs/planning/startup-latency.md",
        "package-lock.json",
        "package.json",
        "src/contracts/backend.mjs",
        "src/contracts/startup-view.mjs",
        "src/control/context/context-session.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/service.mjs",
        "src/control/plugin/startup-context.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/frontend/plugin/launch.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/context-session.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/startup-context.test.mjs",
        "tools/codex-app-server-mcp/plugin.py"
      ]
    },
    {
      "id": "DOCS-2",
      "title": "Актуализация всех документов проекта",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "orchestrator-panel-startup",
        "task_id": "DOCS-2",
        "role": "implementation",
        "iteration": 2
      },
      "why": "Перед выпуском сверить README, OVERVIEW и действующие контракты модулей с результатом; обновить устаревшее.",
      "dependencies": [
        "FAST-START"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/architecture/OVERVIEW.md",
        "docs/planning/startup-latency.md",
        "README.md",
        "docs/acceptance/orchestrated-execution.md",
        "docs/modules/assignment-dialogue-reliability.md",
        "docs/modules/assignment-dialogue.md",
        "docs/modules/automatic-agent-dialogue-acceptance.md",
        "docs/modules/chatgpt-plugin-acceptance.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/dialogue-timing.md",
        "docs/modules/orchestrated-execution.md",
        "docs/modules/orchestrator-startup.md",
        "docs/modules/plugin-communication-handoff.md",
        "docs/modules/release.md"
      ],
      "acceptance_criteria": [
        "Документы описывают текущий результат, существенное из выпущенных рабочих спецификаций перенесено в контракты модулей; история остаётся в Git."
      ],
      "verification_ids": [],
      "expected_commit_message": "docs: актуализировать документацию проекта",
      "parallel_safe": false,
      "actual_files": [
        "README.md",
        "docs/acceptance/orchestrated-execution.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/assignment-dialogue-reliability.md",
        "docs/modules/assignment-dialogue.md",
        "docs/modules/automatic-agent-dialogue-acceptance.md",
        "docs/modules/chatgpt-plugin-acceptance.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/dialogue-timing.md",
        "docs/modules/orchestrated-execution.md",
        "docs/modules/orchestrator-startup.md",
        "docs/modules/plugin-communication-handoff.md",
        "docs/modules/release.md",
        "docs/planning/startup-latency.md"
      ]
    },
    {
      "id": "BUILD-2",
      "title": "Собрать комплект 0.5.21 для трёх ОС",
      "why": "Собрать комплект 0.5.21 для трёх ОС",
      "dependencies": [
        "FAST-START",
        "DOCS-2"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/startup-latency.md"
      ],
      "verification_ids": [
        "three-platform-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "После DOCS собран проверенный комплект из одного sourceCommit; Python cache исключён"
      ],
      "expected_commit_message": "feat: Собрать комплект 0.5.21 для трёх ОС",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "orchestrator-panel-startup",
        "task_id": "BUILD-2",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "release-manifest.json"
      ]
    },
    {
      "id": "INSTALL-2",
      "title": "Установить готовый выпуск 0.5.21",
      "why": "Установить готовый выпуск 0.5.21",
      "dependencies": [
        "BUILD-2",
        "DOCS-2"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/planning/startup-latency.md"
      ],
      "verification_ids": [
        "release-installed"
      ],
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Установка или pending подтверждены installer; служба и приложение не останавливались"
      ],
      "expected_commit_message": "feat: Установить готовый выпуск 0.5.21",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "orchestrator-panel-startup",
        "task_id": "INSTALL-2",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": []
    },
    {
      "id": "ALL-START",
      "title": "Единый старт любой сессии через панель без DOM-вложений",
      "why": "Единый старт любой сессии через панель без DOM-вложений",
      "dependencies": [],
      "functional_paths": [
        "src/**",
        "tools/codex-app-server-mcp/**",
        "tests/**",
        "package.json",
        "package-lock.json",
        "src/contracts/backend.mjs",
        "src/contracts/startup-view.mjs",
        "src/control/context/context-session.mjs",
        "src/control/context/legacy-attachment-message.mjs",
        "src/control/plugin/enrollment.mjs",
        "src/control/plugin/startup-context.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/frontend/plugin/launch.mjs",
        "src/frontend/plugin/panel.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/context-session.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/plugin-enrollment.test.mjs",
        "tests/startup-context.test.mjs",
        "tools/codex-app-server-mcp/plugin.py"
      ],
      "documentation_paths": [
        "docs/modules/orchestrator-startup.md",
        "docs/planning/universal-startup.md"
      ],
      "verification_ids": [
        "orchestrator-startup",
        "architecture",
        "chatgpt-plugin",
        "startup-recovery",
        "prepared-flow-cycle",
        "executor-channel"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Любая новая управляемая сессия O/E/обсуждение/legacy получает только короткое DOM-приглашение; весь ролевой контекст возвращается через panel/read/complete",
        "Нет плана, ACTIVE/BLOCKED/READY_FOR_ACCEPTANCE, sequential/parallel/orchestrated не меняют транспорт и не повышают полномочия",
        "Модуль DOM-вложений сохранён, новые и неотправленные попытки fail closed; отправленные/UNKNOWN не повторяются",
        "Адресные проверки чужого получателя, restart, grant, полного пакета, E bootstrap и обычного чата; версия 0.5.22"
      ],
      "expected_commit_message": "feat: Единый старт любой сессии через панель без DOM-вложений",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "orchestrator-panel-startup",
        "task_id": "ALL-START",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "docs/planning/universal-startup.md",
        "package-lock.json",
        "package.json",
        "src/contracts/backend.mjs",
        "src/contracts/startup-view.mjs",
        "src/control/context/context-session.mjs",
        "src/control/context/legacy-attachment-message.mjs",
        "src/control/plugin/enrollment.mjs",
        "src/control/plugin/startup-context.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/frontend/plugin/launch.mjs",
        "src/frontend/plugin/panel.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/context-session.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/plugin-enrollment.test.mjs",
        "tests/startup-context.test.mjs",
        "tools/codex-app-server-mcp/plugin.py"
      ]
    },
    {
      "id": "DOCS-3",
      "title": "Актуализация всех документов проекта",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "orchestrator-panel-startup",
        "task_id": "DOCS-3",
        "role": "implementation",
        "iteration": 3
      },
      "why": "Перед выпуском сверить README, OVERVIEW и действующие контракты модулей с результатом; обновить устаревшее.",
      "dependencies": [
        "ALL-START"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/architecture/OVERVIEW.md",
        "docs/modules/orchestrator-startup.md",
        "docs/planning/universal-startup.md",
        "README.md",
        "docs/acceptance/orchestrated-execution.md",
        "docs/modules/assignment-dialogue-reliability.md",
        "docs/modules/assignment-dialogue.md",
        "docs/modules/automatic-agent-dialogue-acceptance.md",
        "docs/modules/browser.md",
        "docs/modules/chatgpt-plugin-acceptance.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/control.md",
        "docs/modules/dialogue-timing.md",
        "docs/modules/orchestrated-execution.md",
        "docs/modules/plugin-communication-handoff.md",
        "docs/modules/release.md"
      ],
      "acceptance_criteria": [
        "Документы описывают текущий результат, существенное из выпущенных рабочих спецификаций перенесено в контракты модулей; история остаётся в Git."
      ],
      "verification_ids": [],
      "expected_commit_message": "docs: актуализировать документацию проекта",
      "parallel_safe": false,
      "actual_files": [
        "README.md",
        "docs/acceptance/orchestrated-execution.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/assignment-dialogue-reliability.md",
        "docs/modules/assignment-dialogue.md",
        "docs/modules/automatic-agent-dialogue-acceptance.md",
        "docs/modules/browser.md",
        "docs/modules/chatgpt-plugin-acceptance.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/control.md",
        "docs/modules/dialogue-timing.md",
        "docs/modules/orchestrated-execution.md",
        "docs/modules/orchestrator-startup.md",
        "docs/modules/plugin-communication-handoff.md",
        "docs/modules/release.md",
        "docs/planning/universal-startup.md"
      ]
    },
    {
      "id": "BUILD-3",
      "title": "Собрать выпуск 0.5.22 для трёх ОС",
      "why": "Собрать выпуск 0.5.22 для трёх ОС",
      "dependencies": [
        "ALL-START",
        "DOCS-3"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/modules/orchestrator-startup.md"
      ],
      "verification_ids": [
        "three-platform-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "После DOCS один sourceCommit и проверенный состав без Python cache"
      ],
      "expected_commit_message": "feat: Собрать выпуск 0.5.22 для трёх ОС",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "orchestrator-panel-startup",
        "task_id": "BUILD-3",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "release-manifest.json"
      ]
    },
    {
      "id": "INSTALL-3",
      "title": "Установить готовый macOS выпуск 0.5.22",
      "why": "Установить готовый macOS выпуск 0.5.22",
      "dependencies": [
        "BUILD-3",
        "DOCS-3"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/modules/orchestrator-startup.md",
        "docs/planning/universal-startup.md"
      ],
      "verification_ids": [
        "release-installed"
      ],
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Installer проверил подпись manifest rollback; приложение и служба не останавливаются, pending допускается"
      ],
      "expected_commit_message": "feat: Установить готовый macOS выпуск 0.5.22",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "orchestrator-panel-startup",
        "task_id": "INSTALL-3",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": []
    },
    {
      "id": "STARTUP-WAL",
      "title": "Исправить сохранение обычного чата S в журнале стартового канала",
      "why": "Исправить сохранение обычного чата S в журнале стартового канала",
      "dependencies": [],
      "functional_paths": [
        "src/execution/plugin/communication-store.mjs",
        "src/control/plugin/communication.mjs",
        "tests/startup-context.test.mjs",
        "tests/plugin-communication-store.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/plugin-communication.test.mjs",
        "package.json",
        "package-lock.json",
        "src/contracts/backend.mjs"
      ],
      "documentation_paths": [
        "docs/modules/orchestrator-startup.md"
      ],
      "verification_ids": [
        "orchestrator-startup",
        "chatgpt-plugin"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Публичный MCP panel/read/startup_complete работает с реальным файловым WAL для O/E/S; S сохраняется и восстанавливается без grant",
        "Проверка журнала разрешает только известные O/E/S; повреждённый и неизвестный формат отклоняется без изменения файлов",
        "Ошибка сохранения содержит безопасный код причины без исходного текста ошибки/секретов",
        "Версия 0.5.23; журнал живого проекта не редактируется"
      ],
      "expected_commit_message": "feat: Исправить сохранение обычного чата S в журнале стартового канала",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "orchestrator-panel-startup",
        "task_id": "STARTUP-WAL",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "package-lock.json",
        "package.json",
        "src/contracts/backend.mjs",
        "src/control/plugin/communication.mjs",
        "src/execution/plugin/communication-store.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/plugin-communication-store.test.mjs",
        "tests/plugin-communication.test.mjs",
        "tests/startup-context.test.mjs"
      ]
    },
    {
      "id": "DOCS-4",
      "title": "Актуализация всех документов проекта",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "orchestrator-panel-startup",
        "task_id": "DOCS-4",
        "role": "implementation",
        "iteration": 4
      },
      "why": "Перед выпуском сверить README, OVERVIEW и действующие контракты модулей с результатом; обновить устаревшее.",
      "dependencies": [
        "STARTUP-WAL"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/architecture/OVERVIEW.md",
        "docs/modules/orchestrator-startup.md",
        "README.md",
        "docs/acceptance/orchestrated-execution.md",
        "docs/modules/assignment-dialogue-reliability.md",
        "docs/modules/assignment-dialogue.md",
        "docs/modules/automatic-agent-dialogue-acceptance.md",
        "docs/modules/chatgpt-plugin-acceptance.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/dialogue-timing.md",
        "docs/modules/orchestrated-execution.md",
        "docs/modules/plugin-communication-handoff.md",
        "docs/modules/release.md"
      ],
      "acceptance_criteria": [
        "Документы описывают текущий результат, существенное из выпущенных рабочих спецификаций перенесено в контракты модулей; история остаётся в Git."
      ],
      "verification_ids": [],
      "expected_commit_message": "docs: актуализировать документацию проекта",
      "parallel_safe": false,
      "actual_files": [
        "README.md",
        "docs/acceptance/orchestrated-execution.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/assignment-dialogue-reliability.md",
        "docs/modules/assignment-dialogue.md",
        "docs/modules/automatic-agent-dialogue-acceptance.md",
        "docs/modules/chatgpt-plugin-acceptance.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/dialogue-timing.md",
        "docs/modules/orchestrated-execution.md",
        "docs/modules/orchestrator-startup.md",
        "docs/modules/plugin-communication-handoff.md",
        "docs/modules/release.md"
      ]
    },
    {
      "id": "BUILD-4",
      "title": "Собрать проверенный выпуск 0.5.23 для трёх ОС",
      "why": "Собрать проверенный выпуск 0.5.23 для трёх ОС",
      "dependencies": [
        "STARTUP-WAL",
        "DOCS-4"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/modules/orchestrator-startup.md"
      ],
      "verification_ids": [
        "three-platform-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "DOCS до сборки; один sourceCommit; перед каждой production сборкой исключён Python cache"
      ],
      "expected_commit_message": "feat: Собрать проверенный выпуск 0.5.23 для трёх ОС",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "orchestrator-panel-startup",
        "task_id": "BUILD-4",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "release-manifest.json"
      ]
    },
    {
      "id": "INSTALL-4",
      "title": "Установить готовый выпуск 0.5.23",
      "why": "Установить готовый выпуск 0.5.23",
      "dependencies": [
        "BUILD-4",
        "DOCS-4"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/modules/orchestrator-startup.md"
      ],
      "verification_ids": [
        "release-installed"
      ],
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Штатный installer проверил подпись manifest и rollback; приложение и служба не останавливаются"
      ],
      "expected_commit_message": "feat: Установить готовый выпуск 0.5.23",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "orchestrator-panel-startup",
        "task_id": "INSTALL-4",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": []
    }
  ],
  "blocked_reason": null,
  "user_decisions": [
    {
      "id": "24c7fa5e-870f-4788-8fc9-eeffc4d256e6",
      "text": "Пользователь поручил закрыть текущий план и выполнить новый до сборки и установки без пауз.",
      "recorded_at": "2026-10-21T13:05:31.945Z"
    }
  ],
  "parallel_allowed": false,
  "max_workers": 1,
  "execution_strategy": "sequential",
  "execution_reason": "Пользователь поручил самостоятельную разработку; транспорт, bootstrap и MCP связаны одним контрактом."
}
```
<!-- workflow-state:end -->

## Состояние

Execution Scope Status: ACTIVE
Delivery Status: READY_FOR_ACCEPTANCE
Scope: orchestrator-panel-startup
Current Task: нет
Revision: 839

## Цель

Стартовый контекст O через панель без DOM-вложений, проверенный выпуск и установка

## Критерии приёмки

- Новая O-сессия получает полный пакет через панель без вложений на изолированных fixtures; живая приёмка pending
- Все части подтверждены, grant плана не выдан
- Адресные проверки, комплект трёх ОС и установка проверены

## Микрозадачи

Выполнение: sequential; разрешено: false; лимит: 1
Причина: Пользователь поручил самостоятельную разработку; транспорт, bootstrap и MCP связаны одним контрактом.

- [DONE] STARTUP: Передавать полный контекст O через подтверждённую панель — Завершено
  - Git Commit: [DONE] feat: Передавать полный контекст O через подтверждённую панель
  - Reference: orchestrator-panel-startup / STARTUP / implementation
  - Файлы: src/**, tools/codex-app-server-mcp/**, tests/**, src/backend/desktop-model.mjs, src/contracts/backend.mjs, src/contracts/startup-view.mjs, src/control/context/context-session.mjs, src/control/context/service.mjs, src/control/plugin/communication.mjs, src/control/plugin/service.mjs, src/control/plugin/startup-context.mjs, src/control/plugin/workflow-channel.mjs, src/control/workflow/coordination.mjs, src/control/workflow/dialogue-delivery.mjs, src/frontend/desktop/ui/progress.mjs, src/frontend/desktop/ui/sidebar.mjs, src/frontend/plugin/launch.mjs, src/frontend/plugin/panel.mjs, tests/chatgpt-plugin.test.mjs, tests/codex-app-server-mcp.test.mjs, tests/context-session.test.mjs, tests/fixtures/automatic-agent-dialogue.mjs, tests/sidebar.test.mjs, tests/startup-context.test.mjs, tools/codex-app-server-mcp/plugin.py, docs/planning/orchestrator-panel-startup.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] VERSION: Согласовать версию 0.5.20 и контракты инструкций — Завершено
  - Git Commit: [DONE] feat: Согласовать версию 0.5.20 и контракты инструкций
  - Reference: orchestrator-panel-startup / VERSION / implementation
  - Файлы: package.json, package-lock.json, src/**, tests/**, src/contracts/backend.mjs, docs/planning/orchestrator-panel-startup.md
  - Параллельность: исключительное выполнение
  - Зависимости: STARTUP
- [DONE] DOCS: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: описать стартовый канал оркестратора
  - Reference: orchestrator-panel-startup / DOCS / implementation
  - Файлы: README.md, docs/**, docs/planning/orchestrator-panel-startup.md, docs/architecture/OVERVIEW.md, docs/acceptance/orchestrated-execution.md, docs/modules/assignment-dialogue-reliability.md, docs/modules/assignment-dialogue.md, docs/modules/automatic-agent-dialogue-acceptance.md, docs/modules/browser.md, docs/modules/chatgpt-plugin-acceptance.md, docs/modules/chatgpt-plugin.md, docs/modules/control.md, docs/modules/dialogue-timing.md, docs/modules/orchestrated-execution.md, docs/modules/orchestrator-startup.md, docs/modules/plugin-communication-handoff.md, docs/modules/release.md, docs/modules/workflow-execution.md
  - Параллельность: исключительное выполнение
  - Зависимости: STARTUP, VERSION
- [DONE] BUILD: Собрать проверенный комплект 0.5.20 для трёх ОС — Завершено
  - Git Commit: [DONE] build: Собрать проверенный комплект 0.5.20 для трёх ОС
  - Reference: orchestrator-panel-startup / BUILD / implementation
  - Файлы: release-manifest.json, docs/planning/orchestrator-panel-startup.md
  - Параллельность: исключительное выполнение
  - Зависимости: VERSION, DOCS
- [DONE] INSTALL: Установить готовое macOS-приложение 0.5.20 — Завершено
  - Git Commit: [DONE] build: Установить готовое macOS-приложение 0.5.20
  - Reference: orchestrator-panel-startup / INSTALL / implementation
  - Файлы: docs/planning/orchestrator-panel-startup.md
  - Параллельность: исключительное выполнение
  - Зависимости: BUILD, DOCS
- [DONE] FAST-START: Получать стартовый контекст O в одном ходе через панель — Завершено
  - Git Commit: [DONE] feat: Получать стартовый контекст O в одном ходе через панель
  - Reference: orchestrator-panel-startup / FAST-START / implementation
  - Файлы: src/**, tools/codex-app-server-mcp/**, tests/**, package.json, package-lock.json, src/contracts/backend.mjs, src/contracts/startup-view.mjs, src/control/context/context-session.mjs, src/control/plugin/communication.mjs, src/control/plugin/service.mjs, src/control/plugin/startup-context.mjs, src/control/plugin/workflow-channel.mjs, src/frontend/plugin/launch.mjs, tests/chatgpt-plugin.test.mjs, tests/context-session.test.mjs, tests/fixtures/automatic-agent-dialogue.mjs, tests/startup-context.test.mjs, tools/codex-app-server-mcp/plugin.py, docs/planning/startup-latency.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] DOCS-2: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: актуализировать документацию проекта
  - Reference: orchestrator-panel-startup / DOCS-2 / implementation
  - Файлы: docs/architecture/OVERVIEW.md, docs/planning/startup-latency.md, README.md, docs/acceptance/orchestrated-execution.md, docs/modules/assignment-dialogue-reliability.md, docs/modules/assignment-dialogue.md, docs/modules/automatic-agent-dialogue-acceptance.md, docs/modules/chatgpt-plugin-acceptance.md, docs/modules/chatgpt-plugin.md, docs/modules/dialogue-timing.md, docs/modules/orchestrated-execution.md, docs/modules/orchestrator-startup.md, docs/modules/plugin-communication-handoff.md, docs/modules/release.md
  - Параллельность: исключительное выполнение
  - Зависимости: FAST-START
- [DONE] BUILD-2: Собрать комплект 0.5.21 для трёх ОС — Завершено
  - Git Commit: [DONE] feat: Собрать комплект 0.5.21 для трёх ОС
  - Reference: orchestrator-panel-startup / BUILD-2 / implementation
  - Файлы: release-manifest.json, docs/planning/startup-latency.md
  - Параллельность: исключительное выполнение
  - Зависимости: FAST-START, DOCS-2
- [DONE] INSTALL-2: Установить готовый выпуск 0.5.21 — Завершено
  - Git Commit: [DONE] feat: Установить готовый выпуск 0.5.21
  - Reference: orchestrator-panel-startup / INSTALL-2 / implementation
  - Файлы: docs/planning/startup-latency.md
  - Параллельность: исключительное выполнение
  - Зависимости: BUILD-2, DOCS-2
- [DONE] ALL-START: Единый старт любой сессии через панель без DOM-вложений — Завершено
  - Git Commit: [DONE] feat: Единый старт любой сессии через панель без DOM-вложений
  - Reference: orchestrator-panel-startup / ALL-START / implementation
  - Файлы: src/**, tools/codex-app-server-mcp/**, tests/**, package.json, package-lock.json, src/contracts/backend.mjs, src/contracts/startup-view.mjs, src/control/context/context-session.mjs, src/control/context/legacy-attachment-message.mjs, src/control/plugin/enrollment.mjs, src/control/plugin/startup-context.mjs, src/control/plugin/workflow-channel.mjs, src/control/workflow/dialogue-delivery.mjs, src/frontend/plugin/launch.mjs, src/frontend/plugin/panel.mjs, tests/chatgpt-plugin.test.mjs, tests/context-session.test.mjs, tests/fixtures/automatic-agent-dialogue.mjs, tests/plugin-enrollment.test.mjs, tests/startup-context.test.mjs, tools/codex-app-server-mcp/plugin.py, docs/modules/orchestrator-startup.md, docs/planning/universal-startup.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] DOCS-3: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: актуализировать документацию проекта
  - Reference: orchestrator-panel-startup / DOCS-3 / implementation
  - Файлы: docs/architecture/OVERVIEW.md, docs/modules/orchestrator-startup.md, docs/planning/universal-startup.md, README.md, docs/acceptance/orchestrated-execution.md, docs/modules/assignment-dialogue-reliability.md, docs/modules/assignment-dialogue.md, docs/modules/automatic-agent-dialogue-acceptance.md, docs/modules/browser.md, docs/modules/chatgpt-plugin-acceptance.md, docs/modules/chatgpt-plugin.md, docs/modules/control.md, docs/modules/dialogue-timing.md, docs/modules/orchestrated-execution.md, docs/modules/plugin-communication-handoff.md, docs/modules/release.md
  - Параллельность: исключительное выполнение
  - Зависимости: ALL-START
- [DONE] BUILD-3: Собрать выпуск 0.5.22 для трёх ОС — Завершено
  - Git Commit: [DONE] feat: Собрать выпуск 0.5.22 для трёх ОС
  - Reference: orchestrator-panel-startup / BUILD-3 / implementation
  - Файлы: release-manifest.json, docs/modules/orchestrator-startup.md
  - Параллельность: исключительное выполнение
  - Зависимости: ALL-START, DOCS-3
- [DONE] INSTALL-3: Установить готовый macOS выпуск 0.5.22 — Завершено
  - Git Commit: [DONE] feat: Установить готовый macOS выпуск 0.5.22
  - Reference: orchestrator-panel-startup / INSTALL-3 / implementation
  - Файлы: docs/modules/orchestrator-startup.md, docs/planning/universal-startup.md
  - Параллельность: исключительное выполнение
  - Зависимости: BUILD-3, DOCS-3
- [DONE] STARTUP-WAL: Исправить сохранение обычного чата S в журнале стартового канала — Завершено
  - Git Commit: [DONE] feat: Исправить сохранение обычного чата S в журнале стартового канала
  - Reference: orchestrator-panel-startup / STARTUP-WAL / implementation
  - Файлы: src/execution/plugin/communication-store.mjs, src/control/plugin/communication.mjs, tests/startup-context.test.mjs, tests/plugin-communication-store.test.mjs, tests/chatgpt-plugin.test.mjs, tests/plugin-communication.test.mjs, package.json, package-lock.json, src/contracts/backend.mjs, docs/modules/orchestrator-startup.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] DOCS-4: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: актуализировать документацию проекта
  - Reference: orchestrator-panel-startup / DOCS-4 / implementation
  - Файлы: docs/architecture/OVERVIEW.md, docs/modules/orchestrator-startup.md, README.md, docs/acceptance/orchestrated-execution.md, docs/modules/assignment-dialogue-reliability.md, docs/modules/assignment-dialogue.md, docs/modules/automatic-agent-dialogue-acceptance.md, docs/modules/chatgpt-plugin-acceptance.md, docs/modules/chatgpt-plugin.md, docs/modules/dialogue-timing.md, docs/modules/orchestrated-execution.md, docs/modules/plugin-communication-handoff.md, docs/modules/release.md
  - Параллельность: исключительное выполнение
  - Зависимости: STARTUP-WAL
- [DONE] BUILD-4: Собрать проверенный выпуск 0.5.23 для трёх ОС — Завершено
  - Git Commit: [DONE] feat: Собрать проверенный выпуск 0.5.23 для трёх ОС
  - Reference: orchestrator-panel-startup / BUILD-4 / implementation
  - Файлы: release-manifest.json, docs/modules/orchestrator-startup.md
  - Параллельность: исключительное выполнение
  - Зависимости: STARTUP-WAL, DOCS-4
- [DONE] INSTALL-4: Установить готовый выпуск 0.5.23 — Завершено
  - Git Commit: [DONE] feat: Установить готовый выпуск 0.5.23
  - Reference: orchestrator-panel-startup / INSTALL-4 / implementation
  - Файлы: docs/modules/orchestrator-startup.md
  - Параллельность: исключительное выполнение
  - Зависимости: BUILD-4, DOCS-4

## Context Pack For This Cycle

- docs/planning/orchestrator-panel-startup.md
- docs/architecture/OVERVIEW.md
- docs/planning/startup-latency.md
- docs/modules/orchestrator-startup.md

Служебные состояния меняются только командами workflow. Приёмка не архивирует scope.
