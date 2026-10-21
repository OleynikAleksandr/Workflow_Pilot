# Активный план — Workflow_Pilot

<!-- workflow-state:begin -->
```json
{
  "schema_version": 1,
  "plan_revision": 800,
  "project_id": "7411e192-943c-4529-bffb-3b081d9c242f",
  "project_name": "Workflow_Pilot",
  "scope_id": "orchestrator-panel-startup",
  "execution_scope_status": "ACTIVE",
  "delivery_status": "IN_PROGRESS",
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
      "package-lock.json"
    ],
    "documentation_paths": [
      "docs/planning/orchestrator-panel-startup.md",
      "README.md",
      "docs/**",
      "docs/architecture/OVERVIEW.md"
    ]
  },
  "baseline_commit": "f2182b36578b1412cfb7d48985c91d449944d7aa",
  "current_task_id": null,
  "context_pack": {
    "documents": [
      {
        "path": "docs/planning/orchestrator-panel-startup.md",
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
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "orchestrator-panel-startup",
        "task_id": "STARTUP",
        "role": "implementation"
      },
      "dependencies": [],
      "functional_paths": [
        "src/**",
        "tools/codex-app-server-mcp/**",
        "tests/**"
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
      "parallel_safe": false
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
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
        "tests/**"
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
      "parallel_safe": false
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
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
        "docs/architecture/OVERVIEW.md"
      ],
      "verification_ids": [],
      "id": "DOCS",
      "title": "Актуализация всех документов проекта",
      "why": "Закрепить новый контракт и границы приёмки",
      "acceptance_criteria": [
        "README/OVERVIEW/модульные контракты отражают реализацию; live acceptance pending; временная выпущенная спецификация перенесена и удалена"
      ],
      "expected_commit_message": "docs: описать стартовый канал оркестратора",
      "parallel_safe": false
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "orchestrator-panel-startup",
        "task_id": "BUILD",
        "role": "implementation"
      },
      "dependencies": [
        "VERSION",
        "DOCS"
      ],
      "functional_paths": [],
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
      "parallel_safe": false
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
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
      "parallel_safe": false
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
Delivery Status: IN_PROGRESS
Scope: orchestrator-panel-startup
Current Task: нет
Revision: 800

## Цель

Стартовый контекст O через панель без DOM-вложений, проверенный выпуск и установка

## Критерии приёмки

- Новая O-сессия получает полный пакет через панель без вложений на изолированных fixtures; живая приёмка pending
- Все части подтверждены, grant плана не выдан
- Адресные проверки, комплект трёх ОС и установка проверены

## Микрозадачи

Выполнение: sequential; разрешено: false; лимит: 1
Причина: Пользователь поручил самостоятельную разработку; транспорт, bootstrap и MCP связаны одним контрактом.

- [TODO] STARTUP: Передавать полный контекст O через подтверждённую панель — Ожидает
  - Git Commit: [PENDING] feat: Передавать полный контекст O через подтверждённую панель
  - Reference: orchestrator-panel-startup / STARTUP / implementation
  - Файлы: src/**, tools/codex-app-server-mcp/**, tests/**, docs/planning/orchestrator-panel-startup.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [TODO] VERSION: Согласовать версию 0.5.20 и контракты инструкций — Ожидает
  - Git Commit: [PENDING] feat: Согласовать версию 0.5.20 и контракты инструкций
  - Reference: orchestrator-panel-startup / VERSION / implementation
  - Файлы: package.json, package-lock.json, src/**, tests/**, docs/planning/orchestrator-panel-startup.md
  - Параллельность: исключительное выполнение
  - Зависимости: STARTUP
- [TODO] DOCS: Актуализация всех документов проекта — Ожидает
  - Git Commit: [PENDING] docs: описать стартовый канал оркестратора
  - Reference: orchestrator-panel-startup / DOCS / implementation
  - Файлы: README.md, docs/**, docs/planning/orchestrator-panel-startup.md, docs/architecture/OVERVIEW.md
  - Параллельность: исключительное выполнение
  - Зависимости: STARTUP, VERSION
- [TODO] BUILD: Собрать проверенный комплект 0.5.20 для трёх ОС — Ожидает
  - Git Commit: [PENDING] build: Собрать проверенный комплект 0.5.20 для трёх ОС
  - Reference: orchestrator-panel-startup / BUILD / implementation
  - Файлы: docs/planning/orchestrator-panel-startup.md
  - Параллельность: исключительное выполнение
  - Зависимости: VERSION, DOCS
- [TODO] INSTALL: Установить готовое macOS-приложение 0.5.20 — Ожидает
  - Git Commit: [PENDING] build: Установить готовое macOS-приложение 0.5.20
  - Reference: orchestrator-panel-startup / INSTALL / implementation
  - Файлы: docs/planning/orchestrator-panel-startup.md
  - Параллельность: исключительное выполнение
  - Зависимости: BUILD, DOCS

## Context Pack For This Cycle

- docs/planning/orchestrator-panel-startup.md
- docs/architecture/OVERVIEW.md

Служебные состояния меняются только командами workflow. Приёмка не архивирует scope.
