# Активный план — Workflow_Pilot

<!-- workflow-state:begin -->
```json
{
  "schema_version": 1,
  "plan_revision": 1234,
  "project_id": "7411e192-943c-4529-bffb-3b081d9c242f",
  "project_name": "Workflow_Pilot",
  "scope_id": "sdk-recovery-identity",
  "execution_scope_status": "ACTIVE",
  "delivery_status": "IN_PROGRESS",
  "objective": "Устранить остановку SDK доставки после ошибки и смешение разных workspace, выпустить и установить новый комплект трёх ОС.",
  "acceptance_criteria": [
    "Временное исключение SDK не останавливает весь диалог, повторов эффектов нет.",
    "Проект/workspace/session имеют собственную идентичность, путь/имя не связывают разные экземпляры.",
    "Полный проверенный выпуск трёх ОС установлен либо verified pending и опубликован."
  ],
  "approved_scope": {
    "functional_paths": [
      "src/control/sessions/workspace-session.mjs",
      "src/control/projects/project-state-cleanup.mjs",
      "src/control/projects/workspace-deletion.mjs",
      "src/control/workflow/user-choices.mjs",
      "src/control/workflow/coordination.mjs",
      "src/backend/desktop-model.mjs",
      "src/control/plugin/enrollment.mjs",
      "tests/workspace-session.test.mjs",
      "tests/user-choices.test.mjs",
      "tests/project-state-cleanup.test.mjs",
      "tests/plugin-enrollment.test.mjs",
      "src/control/plugin/communication.mjs",
      "src/control/plugin/service.mjs",
      "tests/plugin-communication.test.mjs",
      "tests/chatgpt-plugin.test.mjs",
      "tests/backend-desktop-model.test.mjs",
      "src/control/plugin/workflow-channel.mjs",
      "src/control/plugin/assignment-dialogue.mjs",
      "src/contracts/plugin-communication.mjs",
      "src/contracts/user-choice.mjs",
      "src/frontend/plugin/launch.mjs",
      "src/frontend/plugin/panel.mjs",
      "src/contracts/dialogue-view.mjs",
      "src/frontend/desktop/ui/current-actions.mjs",
      "packages/workflow-kit/src/lib/role-protocol.mjs",
      "tools/codex-app-server-mcp/plugin.py",
      "tests/workflow-channel.test.mjs",
      "tests/user-choice-view.test.mjs",
      "tests/progress.test.mjs",
      "src/control/workflow/parallel-execution.mjs",
      "src/control/workflow/execution-projection.mjs",
      "tests/parallel-execution.test.mjs",
      "tests/panel-dialogue-view.test.mjs",
      "tests/startup-context.test.mjs",
      "tests/codex-app-server-mcp.test.mjs",
      "tests/automatic-agent-dialogue.test.mjs",
      "tests/fixtures/automatic-agent-dialogue.mjs",
      "tests/electron-smoke.mjs",
      "tests/migration-compatibility.test.mjs",
      "tests/fixtures/plugin-host.mjs",
      "tests/fixtures/plugin-server.py",
      "package.json",
      "package-lock.json",
      "src/contracts/backend.mjs",
      "packages/workflow-kit/package.json",
      "packages/workflow-kit/package-lock.json",
      "packages/workflow-kit/src/lib/common.mjs",
      "packages/workflow-kit/src/lib/installer.mjs",
      "tests/workflow-kit-upgrade.test.mjs",
      "tests/fixtures/released-kit/manifest.json",
      "tests/panel-resource-upgrade.test.mjs",
      "release-manifest.json",
      "tests/backend-upgrade.test.mjs",
      "tests/dialogue-delivery.test.mjs",
      "src/control/workflow/execution-control.mjs",
      "tests/execution-control.test.mjs"
    ],
    "documentation_paths": [
      "docs/planning/sdk-recovery-identity.md",
      "README.md",
      "docs/architecture/OVERVIEW.md",
      "docs/modules/sdk-messaging.md",
      "docs/modules/user-choice.md",
      "docs/modules/project-lifecycle.md",
      "docs/acceptance/sdk-messaging.md",
      "docs/modules/chatgpt-plugin.md",
      "docs/modules/assignment-dialogue-reliability.md",
      "docs/modules/plugin-communication-handoff.md",
      "docs/modules/orchestrated-execution.md"
    ]
  },
  "baseline_commit": "7305405db34c9aaf54880029774a238efd2859c5",
  "current_task_id": null,
  "context_pack": {
    "documents": [
      {
        "path": "docs/planning/sdk-recovery-identity.md",
        "required": true,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/modules/sdk-messaging.md",
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
        "scope_id": "sdk-recovery-identity",
        "task_id": "IDENTITY",
        "role": "implementation"
      },
      "dependencies": [],
      "functional_paths": [
        "src/control/sessions/workspace-session.mjs",
        "src/control/projects/project-state-cleanup.mjs",
        "src/control/projects/workspace-deletion.mjs",
        "src/control/workflow/user-choices.mjs",
        "src/control/workflow/coordination.mjs",
        "src/backend/desktop-model.mjs",
        "src/control/plugin/enrollment.mjs",
        "tests/workspace-session.test.mjs",
        "tests/user-choices.test.mjs",
        "tests/project-state-cleanup.test.mjs",
        "tests/plugin-enrollment.test.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/service.mjs",
        "tests/plugin-communication.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/backend-desktop-model.test.mjs",
        "tests/backend-upgrade.test.mjs",
        "tests/dialogue-delivery.test.mjs",
        "src/control/workflow/execution-control.mjs",
        "tests/execution-control.test.mjs",
        "src/control/plugin/assignment-dialogue.mjs"
      ],
      "documentation_paths": [
        "docs/planning/sdk-recovery-identity.md"
      ],
      "verification_ids": [
        "unit-all",
        "architecture"
      ],
      "id": "IDENTITY",
      "title": "Изолировать проекты workspace и историю по устойчивым ID",
      "why": "Отдельный сохраняемый workspaceId, projectId и sessionId; имена/пути не авторизация. Миграция и новые worktree сохраняют нужную идентичность.",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Отдельный сохраняемый workspaceId, projectId и sessionId; имена/пути не авторизация. Миграция и новые worktree сохраняют нужную идентичность.",
        "История/choices/cleanup/API/binding сверяют конкретное владение; повтор пути не наследует старые события/разрешения. Legacy только по доказанной живой сессии.",
        "Разрешение выполнения и адресная проекция проверяют workspaceId; общий projectId двух копий не выбирает чужой канал."
      ],
      "expected_commit_message": "fix: изолировать проекты workspace и историю по устойчивым id",
      "task_brief": "Изолировать проекты workspace и историю по устойчивым ID. Отдельный сохраняемый workspaceId, projectId и sessionId; имена/пути не авторизация. Миграция и новые worktree сохраняют нужную идентичность. История/choices/cleanup/API/binding сверяют конкретное владение; повтор пути не наследует старые события/разрешения. Legacy только по доказанной живой сессии. Соблюдать полную согласованную спецификацию docs/planning/sdk-recovery-identity.md. Рабочие профили и donor не менять. Разработка последовательная в текущем checkout без модельного делегирования.",
      "parallel_safe": false,
      "actual_files": [
        "src/backend/desktop-model.mjs",
        "src/control/plugin/assignment-dialogue.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/enrollment.mjs",
        "src/control/plugin/service.mjs",
        "src/control/projects/project-state-cleanup.mjs",
        "src/control/projects/workspace-deletion.mjs",
        "src/control/sessions/workspace-session.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/execution-control.mjs",
        "src/control/workflow/user-choices.mjs",
        "tests/backend-upgrade.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/dialogue-delivery.test.mjs",
        "tests/execution-control.test.mjs",
        "tests/plugin-enrollment.test.mjs",
        "tests/project-state-cleanup.test.mjs",
        "tests/user-choices.test.mjs",
        "tests/workspace-session.test.mjs"
      ]
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "sdk-recovery-identity",
        "task_id": "DELIVERY",
        "role": "implementation"
      },
      "dependencies": [
        "IDENTITY"
      ],
      "functional_paths": [
        "src/control/plugin/communication.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/control/plugin/assignment-dialogue.mjs",
        "src/contracts/plugin-communication.mjs",
        "src/contracts/user-choice.mjs",
        "src/control/workflow/user-choices.mjs",
        "src/frontend/plugin/launch.mjs",
        "src/frontend/plugin/panel.mjs",
        "src/backend/desktop-model.mjs",
        "src/contracts/dialogue-view.mjs",
        "src/frontend/desktop/ui/current-actions.mjs",
        "packages/workflow-kit/src/lib/role-protocol.mjs",
        "tools/codex-app-server-mcp/plugin.py",
        "tests/workflow-channel.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/plugin-communication.test.mjs",
        "tests/user-choice-view.test.mjs",
        "tests/progress.test.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/parallel-execution.mjs",
        "src/control/workflow/execution-projection.mjs",
        "tests/parallel-execution.test.mjs",
        "tests/panel-dialogue-view.test.mjs",
        "tests/startup-context.test.mjs",
        "tests/backend-desktop-model.test.mjs",
        "tests/codex-app-server-mcp.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/sdk-recovery-identity.md"
      ],
      "verification_ids": [
        "unit-all",
        "architecture",
        "executor-channel"
      ],
      "id": "DELIVERY",
      "title": "Восстанавливать SDK уведомления без вечной блокировки и повторных эффектов",
      "why": "Ошибки отдельных SDK attempts не блокируют новые сообщения; до трёх попыток уведомления сохранённого message_id, без busy gates и повторного поручения.",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Ошибки отдельных SDK attempts не блокируют новые сообщения; до трёх попыток уведомления сохранённого message_id, без busy gates и повторного поручения.",
        "Идемпотентные реальные эффекты, read/handled отдельно; pending входящие и актуальные UI решения доступны адресату, UNKNOWN история не стирается. Stop/identity/grant/legacy неизвестный эффект не обходятся.",
        "Очищенная диагностика исходного исключения; до плана и после него видна фактическая стадия и конкретная ошибка."
      ],
      "expected_commit_message": "fix: восстанавливать sdk уведомления без вечной блокировки и повторных эффектов",
      "task_brief": "Восстанавливать SDK уведомления без вечной блокировки и повторных эффектов. Ошибки отдельных SDK attempts не блокируют новые сообщения; до трёх попыток уведомления сохранённого message_id, без busy gates и повторного поручения. Идемпотентные реальные эффекты, read/handled отдельно; pending входящие и актуальные UI решения доступны адресату, UNKNOWN история не стирается. Stop/identity/grant/legacy неизвестный эффект не обходятся. Очищенная диагностика исходного исключения; до плана и после него видна фактическая стадия и конкретная ошибка. Соблюдать полную согласованную спецификацию docs/planning/sdk-recovery-identity.md. Рабочие профили и donor не менять. Разработка последовательная в текущем checkout без модельного делегирования.",
      "parallel_safe": false
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "sdk-recovery-identity",
        "task_id": "PROOF",
        "role": "implementation"
      },
      "dependencies": [
        "DELIVERY"
      ],
      "functional_paths": [
        "tests/automatic-agent-dialogue.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/workflow-channel.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/backend-desktop-model.test.mjs",
        "tests/electron-smoke.mjs",
        "tests/migration-compatibility.test.mjs",
        "tests/fixtures/plugin-host.mjs",
        "tests/fixtures/plugin-server.py"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "electron-smoke",
        "architecture",
        "executor-channel",
        "codex-tools-live",
        "kit-check",
        "kit-assignments",
        "kit-upgrade"
      ],
      "id": "PROOF",
      "title": "Проверить восстановление и полный жизненный цикл",
      "why": "Полный цикл и injected SDK отказ Review→выбор; lost response/late/read/restart/две панели/Stop и три результата без двойных эффектов.",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Полный цикл и injected SDK отказ Review→выбор; lost response/late/read/restart/две панели/Stop и три результата без двойных эффектов.",
        "Изоляция одинаковых имён/повторного пути/общего projectId worktree проверена. Живой ChatGPT не объявляется PASS. Продуктовые исправления в PROOF требуют task:update области до правок."
      ],
      "expected_commit_message": "fix: проверить восстановление и полный жизненный цикл",
      "task_brief": "Проверить восстановление и полный жизненный цикл. Полный цикл и injected SDK отказ Review→выбор; lost response/late/read/restart/две панели/Stop и три результата без двойных эффектов. Изоляция одинаковых имён/повторного пути/общего projectId worktree проверена. Живой ChatGPT не объявляется PASS. Продуктовые исправления в PROOF требуют task:update области до правок. Соблюдать полную согласованную спецификацию docs/planning/sdk-recovery-identity.md. Рабочие профили и donor не менять. Разработка последовательная в текущем checkout без модельного делегирования.",
      "parallel_safe": false
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "sdk-recovery-identity",
        "task_id": "VERSION",
        "role": "implementation"
      },
      "dependencies": [
        "PROOF"
      ],
      "functional_paths": [
        "package.json",
        "package-lock.json",
        "src/contracts/backend.mjs",
        "packages/workflow-kit/package.json",
        "packages/workflow-kit/package-lock.json",
        "packages/workflow-kit/src/lib/common.mjs",
        "packages/workflow-kit/src/lib/role-protocol.mjs",
        "packages/workflow-kit/src/lib/installer.mjs",
        "tools/codex-app-server-mcp/plugin.py",
        "tests/chatgpt-plugin.test.mjs",
        "tests/workflow-kit-upgrade.test.mjs",
        "tests/fixtures/released-kit/manifest.json",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/panel-resource-upgrade.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "architecture",
        "release-tooling",
        "kit-upgrade"
      ],
      "id": "VERSION",
      "title": "Согласовать версии выпуска панели и Kit",
      "why": "Новая свободная версия и immutable panel, новый согласованный протокол и Kit/role при изменённом контракте; upgrade с 1.10.3 и старого store сохраняет планы.",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Новая свободная версия и immutable panel, новый согласованный протокол и Kit/role при изменённом контракте; upgrade с 1.10.3 и старого store сохраняет планы."
      ],
      "expected_commit_message": "fix: согласовать версии выпуска панели и kit",
      "task_brief": "Согласовать версии выпуска панели и Kit. Новая свободная версия и immutable panel, новый согласованный протокол и Kit/role при изменённом контракте; upgrade с 1.10.3 и старого store сохраняет планы. Соблюдать полную согласованную спецификацию docs/planning/sdk-recovery-identity.md. Рабочие профили и donor не менять. Разработка последовательная в текущем checkout без модельного делегирования.",
      "parallel_safe": false
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "sdk-recovery-identity",
        "task_id": "DOCS",
        "role": "implementation"
      },
      "dependencies": [
        "IDENTITY",
        "DELIVERY",
        "PROOF",
        "VERSION"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/planning/sdk-recovery-identity.md",
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/sdk-messaging.md",
        "docs/modules/user-choice.md",
        "docs/modules/project-lifecycle.md",
        "docs/acceptance/sdk-messaging.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/assignment-dialogue-reliability.md",
        "docs/modules/plugin-communication-handoff.md",
        "docs/modules/orchestrated-execution.md"
      ],
      "verification_ids": [],
      "id": "DOCS",
      "title": "Актуализация всех документов проекта",
      "why": "Документы описывают новый контракт, ограничение retry и идентичность; спецификация перенесена в модули, live pending явно.",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Документы описывают новый контракт, ограничение retry и идентичность; спецификация перенесена в модули, live pending явно."
      ],
      "expected_commit_message": "docs: актуализировать действующие контракты",
      "task_brief": "Актуализировать действующие контракты. Документы описывают новый контракт, ограничение retry и идентичность; спецификация перенесена в модули, live pending явно. Соблюдать полную согласованную спецификацию docs/planning/sdk-recovery-identity.md. Рабочие профили и donor не менять. Разработка последовательная в текущем checkout без модельного делегирования.",
      "parallel_safe": false
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "sdk-recovery-identity",
        "task_id": "RELEASE",
        "role": "implementation"
      },
      "dependencies": [
        "DOCS"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "three-platform-release"
      ],
      "id": "RELEASE",
      "title": "Собрать выпуск macOS Windows Linux",
      "why": "После DOCS три ОС из одного sourceCommit, семь assets, SHA/size/composition/macOS подпись; cache preflight выполнен.",
      "verification_kind": "package",
      "acceptance_criteria": [
        "После DOCS три ОС из одного sourceCommit, семь assets, SHA/size/composition/macOS подпись; cache preflight выполнен."
      ],
      "expected_commit_message": "delivery: собрать выпуск macos windows linux",
      "task_brief": "Собрать выпуск macOS Windows Linux. После DOCS три ОС из одного sourceCommit, семь assets, SHA/size/composition/macOS подпись; cache preflight выполнен. Соблюдать полную согласованную спецификацию docs/planning/sdk-recovery-identity.md. Рабочие профили и donor не менять. Разработка последовательная в текущем checkout без модельного делегирования.",
      "parallel_safe": false
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "sdk-recovery-identity",
        "task_id": "INSTALL",
        "role": "implementation"
      },
      "dependencies": [
        "RELEASE",
        "DOCS"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "release-installed"
      ],
      "id": "INSTALL",
      "title": "Установить готовый macOS комплект",
      "why": "Штатная установка готового подписанного bundle в /Applications и checkout, либо проверенный pending; rollback, версия и manifest проверены, служба не остановлена.",
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Штатная установка готового подписанного bundle в /Applications и checkout, либо проверенный pending; rollback, версия и manifest проверены, служба не остановлена."
      ],
      "expected_commit_message": "delivery: установить готовый macos комплект",
      "task_brief": "Установить готовый macOS комплект. Штатная установка готового подписанного bundle в /Applications и checkout, либо проверенный pending; rollback, версия и manifest проверены, служба не остановлена. Соблюдать полную согласованную спецификацию docs/planning/sdk-recovery-identity.md. Рабочие профили и donor не менять. Разработка последовательная в текущем checkout без модельного делегирования.",
      "parallel_safe": false
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "sdk-recovery-identity",
        "task_id": "PUBLISH",
        "role": "implementation"
      },
      "dependencies": [
        "INSTALL",
        "DOCS"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "github-release"
      ],
      "id": "PUBLISH",
      "title": "Опубликовать выпуск на GitHub",
      "why": "GitHub tag на sourceCommit, полный набор assets проверен, опубликован release; итоговый push подтверждён. Live ограничения честно указаны.",
      "verification_kind": "package",
      "acceptance_criteria": [
        "GitHub tag на sourceCommit, полный набор assets проверен, опубликован release; итоговый push подтверждён. Live ограничения честно указаны."
      ],
      "expected_commit_message": "delivery: опубликовать выпуск на github",
      "task_brief": "Опубликовать выпуск на GitHub. GitHub tag на sourceCommit, полный набор assets проверен, опубликован release; итоговый push подтверждён. Live ограничения честно указаны. Соблюдать полную согласованную спецификацию docs/planning/sdk-recovery-identity.md. Рабочие профили и donor не менять. Разработка последовательная в текущем checkout без модельного делегирования.",
      "parallel_safe": false
    }
  ],
  "blocked_reason": null,
  "user_decisions": [
    {
      "id": "a6cf70a8-0e0a-4bfb-bbfe-a44c4d149081",
      "text": "27.10.2026 пользователь поручил спецификацию, новый план, Claude Review и выполнение без пауз включая три ОС, Mac и GitHub.",
      "recorded_at": "2026-10-27T06:54:17.983Z"
    }
  ],
  "parallel_allowed": false,
  "max_workers": 1,
  "execution_strategy": "sequential",
  "execution_reason": "Внешняя последовательная Codex-разработка. Пользователь запретил модельное делегирование; общий транспорт и identity пересекаются. Продуктовые назначения не создаются."
}
```
<!-- workflow-state:end -->

## Состояние

Execution Scope Status: ACTIVE
Delivery Status: IN_PROGRESS
Scope: sdk-recovery-identity
Current Task: нет
Revision: 1234

## Цель

Устранить остановку SDK доставки после ошибки и смешение разных workspace, выпустить и установить новый комплект трёх ОС.

## Критерии приёмки

- Временное исключение SDK не останавливает весь диалог, повторов эффектов нет.
- Проект/workspace/session имеют собственную идентичность, путь/имя не связывают разные экземпляры.
- Полный проверенный выпуск трёх ОС установлен либо verified pending и опубликован.

## Микрозадачи

Выполнение: sequential; разрешено: false; лимит: 1
Причина: Внешняя последовательная Codex-разработка. Пользователь запретил модельное делегирование; общий транспорт и identity пересекаются. Продуктовые назначения не создаются.

- [DONE] IDENTITY: Изолировать проекты workspace и историю по устойчивым ID — Завершено
  - Git Commit: [DONE] fix: изолировать проекты workspace и историю по устойчивым id
  - Reference: sdk-recovery-identity / IDENTITY / implementation
  - Файлы: src/control/sessions/workspace-session.mjs, src/control/projects/project-state-cleanup.mjs, src/control/projects/workspace-deletion.mjs, src/control/workflow/user-choices.mjs, src/control/workflow/coordination.mjs, src/backend/desktop-model.mjs, src/control/plugin/enrollment.mjs, tests/workspace-session.test.mjs, tests/user-choices.test.mjs, tests/project-state-cleanup.test.mjs, tests/plugin-enrollment.test.mjs, src/control/plugin/communication.mjs, src/control/plugin/service.mjs, tests/plugin-communication.test.mjs, tests/chatgpt-plugin.test.mjs, tests/backend-desktop-model.test.mjs, tests/backend-upgrade.test.mjs, tests/dialogue-delivery.test.mjs, src/control/workflow/execution-control.mjs, tests/execution-control.test.mjs, src/control/plugin/assignment-dialogue.mjs, docs/planning/sdk-recovery-identity.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [TODO] DELIVERY: Восстанавливать SDK уведомления без вечной блокировки и повторных эффектов — Ожидает
  - Git Commit: [PENDING] fix: восстанавливать sdk уведомления без вечной блокировки и повторных эффектов
  - Reference: sdk-recovery-identity / DELIVERY / implementation
  - Файлы: src/control/plugin/communication.mjs, src/control/plugin/workflow-channel.mjs, src/control/plugin/assignment-dialogue.mjs, src/contracts/plugin-communication.mjs, src/contracts/user-choice.mjs, src/control/workflow/user-choices.mjs, src/frontend/plugin/launch.mjs, src/frontend/plugin/panel.mjs, src/backend/desktop-model.mjs, src/contracts/dialogue-view.mjs, src/frontend/desktop/ui/current-actions.mjs, packages/workflow-kit/src/lib/role-protocol.mjs, tools/codex-app-server-mcp/plugin.py, tests/workflow-channel.test.mjs, tests/chatgpt-plugin.test.mjs, tests/plugin-communication.test.mjs, tests/user-choice-view.test.mjs, tests/progress.test.mjs, src/control/workflow/coordination.mjs, src/control/workflow/parallel-execution.mjs, src/control/workflow/execution-projection.mjs, tests/parallel-execution.test.mjs, tests/panel-dialogue-view.test.mjs, tests/startup-context.test.mjs, tests/backend-desktop-model.test.mjs, tests/codex-app-server-mcp.test.mjs, docs/planning/sdk-recovery-identity.md
  - Параллельность: исключительное выполнение
  - Зависимости: IDENTITY
- [TODO] PROOF: Проверить восстановление и полный жизненный цикл — Ожидает
  - Git Commit: [PENDING] fix: проверить восстановление и полный жизненный цикл
  - Reference: sdk-recovery-identity / PROOF / implementation
  - Файлы: tests/automatic-agent-dialogue.test.mjs, tests/fixtures/automatic-agent-dialogue.mjs, tests/workflow-channel.test.mjs, tests/chatgpt-plugin.test.mjs, tests/backend-desktop-model.test.mjs, tests/electron-smoke.mjs, tests/migration-compatibility.test.mjs, tests/fixtures/plugin-host.mjs, tests/fixtures/plugin-server.py
  - Параллельность: исключительное выполнение
  - Зависимости: DELIVERY
- [TODO] VERSION: Согласовать версии выпуска панели и Kit — Ожидает
  - Git Commit: [PENDING] fix: согласовать версии выпуска панели и kit
  - Reference: sdk-recovery-identity / VERSION / implementation
  - Файлы: package.json, package-lock.json, src/contracts/backend.mjs, packages/workflow-kit/package.json, packages/workflow-kit/package-lock.json, packages/workflow-kit/src/lib/common.mjs, packages/workflow-kit/src/lib/role-protocol.mjs, packages/workflow-kit/src/lib/installer.mjs, tools/codex-app-server-mcp/plugin.py, tests/chatgpt-plugin.test.mjs, tests/workflow-kit-upgrade.test.mjs, tests/fixtures/released-kit/manifest.json, tests/codex-app-server-mcp.test.mjs, tests/panel-resource-upgrade.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: PROOF
- [TODO] DOCS: Актуализация всех документов проекта — Ожидает
  - Git Commit: [PENDING] docs: актуализировать действующие контракты
  - Reference: sdk-recovery-identity / DOCS / implementation
  - Файлы: docs/planning/sdk-recovery-identity.md, README.md, docs/architecture/OVERVIEW.md, docs/modules/sdk-messaging.md, docs/modules/user-choice.md, docs/modules/project-lifecycle.md, docs/acceptance/sdk-messaging.md, docs/modules/chatgpt-plugin.md, docs/modules/assignment-dialogue-reliability.md, docs/modules/plugin-communication-handoff.md, docs/modules/orchestrated-execution.md
  - Параллельность: исключительное выполнение
  - Зависимости: IDENTITY, DELIVERY, PROOF, VERSION
- [TODO] RELEASE: Собрать выпуск macOS Windows Linux — Ожидает
  - Git Commit: [PENDING] delivery: собрать выпуск macos windows linux
  - Reference: sdk-recovery-identity / RELEASE / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: DOCS
- [TODO] INSTALL: Установить готовый macOS комплект — Ожидает
  - Git Commit: [PENDING] delivery: установить готовый macos комплект
  - Reference: sdk-recovery-identity / INSTALL / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: RELEASE, DOCS
- [TODO] PUBLISH: Опубликовать выпуск на GitHub — Ожидает
  - Git Commit: [PENDING] delivery: опубликовать выпуск на github
  - Reference: sdk-recovery-identity / PUBLISH / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: INSTALL, DOCS

## Context Pack For This Cycle

- docs/planning/sdk-recovery-identity.md
- docs/modules/sdk-messaging.md
- docs/architecture/OVERVIEW.md

Служебные состояния меняются только командами workflow. Приёмка не архивирует scope.
