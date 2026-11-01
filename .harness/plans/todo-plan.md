# Активный план — Workflow_Pilot

<!-- workflow-state:begin -->
```json
{
  "schema_version": 1,
  "plan_revision": 1467,
  "project_id": "7411e192-943c-4529-bffb-3b081d9c242f",
  "project_name": "Workflow_Pilot",
  "scope_id": "context-files-0611",
  "execution_scope_status": "ACTIVE",
  "delivery_status": "IN_PROGRESS",
  "objective": "Доставлять большой контекст агентам файлами ≤24000 байт на диске без запроса хоста и выпустить 0.6.11.",
  "acceptance_criteria": [
    "Старт и рабочее поручение доходят файлами ≤24000 байт на диске; ответ MCP без EmbeddedResource, со списком путей и размеров.",
    "Подтверждение полного комплекта метками сохраняет действующие запреты; совместимость с незавершёнными стартами 0.6.10.",
    "Выпуск 0.6.11 трёх ОС из одного sourceCommit, установка на Mac и публикация GitHub Release; живая приёмка за пользователем."
  ],
  "approved_scope": {
    "functional_paths": [
      ".dependency-cruiser.cjs",
      "package-lock.json",
      "package.json",
      "packages/workflow-kit/package.json",
      "packages/workflow-kit/src/lib/common.mjs",
      "packages/workflow-kit/src/lib/installer.mjs",
      "packages/workflow-kit/src/lib/plan.mjs",
      "packages/workflow-kit/src/lib/prepared-task.mjs",
      "packages/workflow-kit/src/lib/role-protocol.mjs",
      "release-manifest.json",
      "src/backend/desktop-model.mjs",
      "src/contracts/backend.mjs",
      "src/contracts/context.mjs",
      "src/contracts/startup-view.mjs",
      "src/control/context/context-session.mjs",
      "src/control/plugin/assignment-dialogue.mjs",
      "src/control/plugin/communication.mjs",
      "src/control/plugin/context-files.mjs",
      "src/control/plugin/service.mjs",
      "src/control/plugin/startup-context.mjs",
      "src/control/plugin/workflow-channel.mjs",
      "src/control/workflow/dialogue-delivery.mjs",
      "src/execution/browser/chatgpt-composer.mjs",
      "src/execution/facade.mjs",
      "src/execution/files/context-inbox.mjs",
      "tests/automatic-agent-dialogue.test.mjs",
      "tests/chatgpt-composer.test.mjs",
      "tests/chatgpt-plugin.test.mjs",
      "tests/context-files.test.mjs",
      "tests/context-inbox.test.mjs",
      "tests/execution-architecture.test.mjs",
      "tests/fixtures/automatic-agent-dialogue.mjs",
      "tests/fixtures/plugin-host.mjs",
      "tests/fixtures/released-kit/kit-1.10.9.tar.gz",
      "tests/fixtures/released-kit/manifest.json",
      "tests/plugin-communication.test.mjs",
      "tests/prepared-task-flow.test.mjs",
      "tests/role-protocol.test.mjs",
      "tests/startup-context.test.mjs",
      "tests/workflow-kit-upgrade.test.mjs",
      "tools/codex-app-server-mcp/plugin.py"
    ],
    "documentation_paths": [
      "README.md",
      "docs/acceptance/shared-conversation-mac.md",
      "docs/architecture/OVERVIEW.md",
      "docs/modules/assignment-dialogue.md",
      "docs/modules/chat-only-startup.md",
      "docs/modules/chatgpt-plugin.md",
      "docs/modules/current-actions.md",
      "docs/modules/dialogue-timing.md",
      "docs/modules/execution.md",
      "docs/modules/orchestrator-startup.md",
      "docs/modules/prepared-tasks.md",
      "docs/modules/project-compatibility.md",
      "docs/modules/release.md",
      "docs/modules/sdk-messaging.md",
      "docs/modules/shared-conversation.md",
      "docs/modules/user-choice.md",
      "docs/planning/context-files-0611.md",
      "packages/workflow-kit/README.md",
      "packages/workflow-kit/docs/modules/orchestrated-plans.md",
      "packages/workflow-kit/docs/modules/parallel-assignments.md",
      "packages/workflow-kit/docs/modules/workflow-kit-package.md",
      "packages/workflow-kit/src/templates/PLAN.md"
    ]
  },
  "baseline_commit": "7e20e913b2a8425ae92024064d12ab0892f797e6",
  "current_task_id": null,
  "context_pack": {
    "documents": [
      {
        "path": "docs/planning/context-files-0611.md",
        "required": true,
        "revision": "3633c8648e6ee459ccbb1a35ac1af4bba451c0b0"
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
        "scope_id": "context-files-0611",
        "task_id": "FILES",
        "role": "implementation"
      },
      "dependencies": [],
      "functional_paths": [
        "src/control/plugin/context-files.mjs",
        "src/control/plugin/startup-context.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/assignment-dialogue.mjs",
        "src/control/plugin/service.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/control/context/context-session.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/execution/facade.mjs",
        "src/execution/files/context-inbox.mjs",
        "src/contracts/context.mjs",
        "src/contracts/backend.mjs",
        "src/contracts/startup-view.mjs",
        "src/backend/desktop-model.mjs",
        "tools/codex-app-server-mcp/plugin.py",
        "packages/workflow-kit/src/lib/role-protocol.mjs",
        "packages/workflow-kit/src/lib/common.mjs",
        "packages/workflow-kit/src/lib/installer.mjs",
        "packages/workflow-kit/src/lib/plan.mjs",
        "packages/workflow-kit/src/lib/prepared-task.mjs",
        "packages/workflow-kit/package.json",
        "package.json",
        "package-lock.json",
        ".dependency-cruiser.cjs",
        "tests/context-files.test.mjs",
        "tests/context-inbox.test.mjs",
        "tests/startup-context.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/prepared-task-flow.test.mjs",
        "tests/role-protocol.test.mjs",
        "tests/workflow-kit-upgrade.test.mjs",
        "tests/fixtures/released-kit/manifest.json",
        "tests/fixtures/released-kit/kit-1.10.9.tar.gz",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/fixtures/plugin-host.mjs",
        "tests/execution-architecture.test.mjs",
        "src/execution/browser/chatgpt-composer.mjs",
        "tests/chatgpt-composer.test.mjs",
        "tests/plugin-communication.test.mjs",
        "tests/automatic-agent-dialogue.test.mjs"
      ],
      "documentation_paths": [
        "packages/workflow-kit/src/templates/PLAN.md"
      ],
      "verification_ids": [
        "unit-all",
        "electron-smoke",
        "architecture",
        "kit-check",
        "kit-assignments"
      ],
      "id": "FILES",
      "title": "Выдавать контекст агентам файлами на диске вместо вложений MCP",
      "why": "Убрать запрос хоста на скачивание и сбой подтверждения: файлы ≤24000 байт в рабочей копии получателя, чтение по одному через exec_command.",
      "acceptance_criteria": [
        "Один канонический генератор режет старт и поручение на context-NN-of-MM.md не больше 24000 байт UTF-8 по границам абзацев и строк, символы не разрываются; нарезка детерминирована, метки не раскрываются; выданные 0.6.9-0.6.10 комплекты записываются и подтверждаются прежним генератором.",
        "Execution атомарно и неизменяемо записывает файлы в .harness/runtime/inbox/<message_id>/ рабочей копии получателя до сигнала; путь определяется в service.mjs из зарегистрированной сессии (E - свой worktree, O и S - checkout проекта); путь вне копии и символические ссылки отклоняются; ошибка записи не запускает ход; Control не использует fs.",
        "Сообщения без записанного комплекта (опубликованные до обновления) получают ленивую запись при первом open или read_message; task, опубликованный до обновления, после рестарта читается и подтверждается.",
        "Настоящий MCP: ответы workflow_pilot_panel и read_message для старта и task не содержат EmbeddedResource и текста файлов, содержат context_files с workdir, абсолютными путями, размерами, message_id и context_ref и инструкцию читать строго по одному файлу последовательно.",
        "workflow_startup_complete и read_message с file_receipts принимают только полный набор; result и yield без files_confirmed запрещены; поручение 5x24 КБ и старт около 200 КБ проходят полным циклом на fixtures; read_context остаётся для старых частей и для не-task сообщений больше 12000 байт (большой result для O читается).",
        "Восстановленная стартовая команда 0.6.10 в новом Chat распознаётся списком прежних шаблонов и очищается.",
        "Каталоги подтверждённых, отменённых и заменённых сообщений в checkout O и S удаляются при отзыве или закрытии плана (workflow-channel.mjs) и при старте службы (desktop-model.mjs); актуальные неподтверждённые сохраняются.",
        "Роли, описания инструментов и PLAN согласованы; Workflow Pilot 0.6.11, Kit 1.10.10, ROLE_PROTOCOL_VERSION повышен, архив Kit 1.10.9 для теста обновления; периодическое открытие панели не изменено."
      ],
      "expected_commit_message": "feat: Выдавать контекст агентам файлами на диске вместо вложений MCP",
      "parallel_safe": false,
      "actual_files": [
        "package-lock.json",
        "package.json",
        "packages/workflow-kit/package.json",
        "packages/workflow-kit/src/lib/common.mjs",
        "packages/workflow-kit/src/lib/installer.mjs",
        "packages/workflow-kit/src/lib/role-protocol.mjs",
        "packages/workflow-kit/src/templates/PLAN.md",
        "src/backend/desktop-model.mjs",
        "src/contracts/backend.mjs",
        "src/contracts/context.mjs",
        "src/control/plugin/assignment-dialogue.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/context-files.mjs",
        "src/control/plugin/service.mjs",
        "src/control/plugin/startup-context.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/execution/browser/chatgpt-composer.mjs",
        "src/execution/facade.mjs",
        "src/execution/files/context-inbox.mjs",
        "tests/chatgpt-composer.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/context-files.test.mjs",
        "tests/context-inbox.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/fixtures/plugin-host.mjs",
        "tests/fixtures/released-kit/kit-1.10.9.tar.gz",
        "tests/fixtures/released-kit/manifest.json",
        "tests/role-protocol.test.mjs",
        "tests/startup-context.test.mjs",
        "tests/workflow-kit-upgrade.test.mjs",
        "tools/codex-app-server-mcp/plugin.py"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "context-files-0611",
        "task_id": "DOCS",
        "role": "implementation"
      },
      "dependencies": [
        "FILES"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/orchestrator-startup.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/prepared-tasks.md",
        "docs/modules/assignment-dialogue.md",
        "docs/modules/chat-only-startup.md",
        "docs/modules/execution.md",
        "docs/modules/release.md",
        "docs/planning/context-files-0611.md",
        "packages/workflow-kit/README.md",
        "packages/workflow-kit/docs/modules/workflow-kit-package.md",
        "packages/workflow-kit/docs/modules/orchestrated-plans.md",
        "packages/workflow-kit/docs/modules/parallel-assignments.md",
        "docs/modules/project-compatibility.md",
        "docs/modules/user-choice.md",
        "docs/modules/dialogue-timing.md",
        "docs/modules/shared-conversation.md",
        "docs/modules/current-actions.md",
        "docs/modules/sdk-messaging.md",
        "docs/acceptance/shared-conversation-mac.md",
        "packages/workflow-kit/src/templates/PLAN.md"
      ],
      "verification_ids": [],
      "id": "DOCS",
      "title": "Актуализация всех документов проекта",
      "why": "Перед выпуском сверить README, OVERVIEW и контракты модулей с результатом; перенести действующее из рабочей спецификации и удалить её.",
      "acceptance_criteria": [
        "Документы описывают 0.6.11: файлы на диске, последовательное чтение, отказ от EmbeddedResource и read_context для новых сообщений; живая приёмка отмечена NOT_RUN; спецификация удалена после переноса."
      ],
      "expected_commit_message": "docs: актуализировать документацию проекта",
      "parallel_safe": false,
      "actual_files": [
        "README.md",
        "docs/acceptance/shared-conversation-mac.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/assignment-dialogue.md",
        "docs/modules/chat-only-startup.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/current-actions.md",
        "docs/modules/dialogue-timing.md",
        "docs/modules/execution.md",
        "docs/modules/orchestrator-startup.md",
        "docs/modules/prepared-tasks.md",
        "docs/modules/project-compatibility.md",
        "docs/modules/release.md",
        "docs/modules/sdk-messaging.md",
        "docs/modules/shared-conversation.md",
        "docs/modules/user-choice.md",
        "docs/planning/context-files-0611.md",
        "packages/workflow-kit/README.md",
        "packages/workflow-kit/docs/modules/orchestrated-plans.md",
        "packages/workflow-kit/docs/modules/parallel-assignments.md",
        "packages/workflow-kit/docs/modules/workflow-kit-package.md"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "context-files-0611",
        "task_id": "RELEASE",
        "role": "implementation"
      },
      "dependencies": [
        "FILES",
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
      "title": "Собрать комплект Workflow Pilot 0.6.11 для трёх платформ",
      "verification_kind": "package",
      "acceptance_criteria": [
        "Три ОС после DOCS из одного sourceCommit, полный набор assets, manifest/SHA/подпись подтверждены; preflight кэша Python в tools/codex-app-server-mcp."
      ],
      "expected_commit_message": "feat: Собрать комплект Workflow Pilot 0.6.11 для трёх платформ",
      "why": "Собрать комплект Workflow Pilot 0.6.11 для трёх платформ",
      "parallel_safe": false,
      "actual_files": [
        "release-manifest.json"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "context-files-0611",
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
      "title": "Установить проверенный комплект 0.6.11 с возможностью отката",
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Штатный installer без пересборки и переподписи; при работающей службе проверенная копия оставлена pending; служба не останавливается."
      ],
      "expected_commit_message": "feat: Установить проверенный комплект 0.6.11 с возможностью отката",
      "why": "Установить проверенный комплект 0.6.11 с возможностью отката",
      "parallel_safe": false,
      "actual_files": []
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "context-files-0611",
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
      "title": "Опубликовать выпуск 0.6.11 на GitHub",
      "verification_kind": "package",
      "acceptance_criteria": [
        "origin/main fast-forward до проверенного HEAD, тег v0.6.11 на sourceCommit, GitHub Release не draft с полным набором assets по size/digest; живая проверка не объявляется пройденной."
      ],
      "expected_commit_message": "feat: Опубликовать выпуск 0.6.11 на GitHub",
      "why": "Опубликовать выпуск 0.6.11 на GitHub",
      "parallel_safe": false
    }
  ],
  "blocked_reason": null,
  "user_decisions": [
    {
      "id": "c3a25f7b-ee05-41d8-bd0a-6a637403aef2",
      "text": "Пользователь 01.11.2026 поручил подготовить спецификацию и to-do plan вплоть до сборки релизов трёх ОС и публикации на GitHub; схема согласована в диалоге и проверена живыми прогонами 3/6/9 вызовов.",
      "recorded_at": "2026-11-01T16:56:59.331Z"
    }
  ],
  "scope_title": "Контекст агентам файлами на диске — Workflow Pilot 0.6.11",
  "parallel_allowed": false,
  "max_workers": 1,
  "execution_strategy": "sequential",
  "execution_reason": "Одна связанная реализация общих контрактов контекста, MCP и ролей в текущем checkout, затем последовательный delivery."
}
```
<!-- workflow-state:end -->

## Состояние

Execution Scope Status: ACTIVE
Delivery Status: IN_PROGRESS
Scope: context-files-0611
Current Task: нет
Revision: 1467

## Цель

Доставлять большой контекст агентам файлами ≤24000 байт на диске без запроса хоста и выпустить 0.6.11.

## Критерии приёмки

- Старт и рабочее поручение доходят файлами ≤24000 байт на диске; ответ MCP без EmbeddedResource, со списком путей и размеров.
- Подтверждение полного комплекта метками сохраняет действующие запреты; совместимость с незавершёнными стартами 0.6.10.
- Выпуск 0.6.11 трёх ОС из одного sourceCommit, установка на Mac и публикация GitHub Release; живая приёмка за пользователем.

## Микрозадачи

Выполнение: sequential; разрешено: false; лимит: 1
Причина: Одна связанная реализация общих контрактов контекста, MCP и ролей в текущем checkout, затем последовательный delivery.

- [DONE] FILES: Выдавать контекст агентам файлами на диске вместо вложений MCP — Завершено
  - Git Commit: [DONE] feat: Выдавать контекст агентам файлами на диске вместо вложений MCP
  - Reference: context-files-0611 / FILES / implementation
  - Файлы: src/control/plugin/context-files.mjs, src/control/plugin/startup-context.mjs, src/control/plugin/communication.mjs, src/control/plugin/assignment-dialogue.mjs, src/control/plugin/service.mjs, src/control/plugin/workflow-channel.mjs, src/control/context/context-session.mjs, src/control/workflow/dialogue-delivery.mjs, src/execution/facade.mjs, src/execution/files/context-inbox.mjs, src/contracts/context.mjs, src/contracts/backend.mjs, src/contracts/startup-view.mjs, src/backend/desktop-model.mjs, tools/codex-app-server-mcp/plugin.py, packages/workflow-kit/src/lib/role-protocol.mjs, packages/workflow-kit/src/lib/common.mjs, packages/workflow-kit/src/lib/installer.mjs, packages/workflow-kit/src/lib/plan.mjs, packages/workflow-kit/src/lib/prepared-task.mjs, packages/workflow-kit/package.json, package.json, package-lock.json, .dependency-cruiser.cjs, tests/context-files.test.mjs, tests/context-inbox.test.mjs, tests/startup-context.test.mjs, tests/chatgpt-plugin.test.mjs, tests/prepared-task-flow.test.mjs, tests/role-protocol.test.mjs, tests/workflow-kit-upgrade.test.mjs, tests/fixtures/released-kit/manifest.json, tests/fixtures/released-kit/kit-1.10.9.tar.gz, tests/fixtures/automatic-agent-dialogue.mjs, tests/fixtures/plugin-host.mjs, tests/execution-architecture.test.mjs, src/execution/browser/chatgpt-composer.mjs, tests/chatgpt-composer.test.mjs, tests/plugin-communication.test.mjs, tests/automatic-agent-dialogue.test.mjs, packages/workflow-kit/src/templates/PLAN.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] DOCS: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: актуализировать документацию проекта
  - Reference: context-files-0611 / DOCS / implementation
  - Файлы: README.md, docs/architecture/OVERVIEW.md, docs/modules/orchestrator-startup.md, docs/modules/chatgpt-plugin.md, docs/modules/prepared-tasks.md, docs/modules/assignment-dialogue.md, docs/modules/chat-only-startup.md, docs/modules/execution.md, docs/modules/release.md, docs/planning/context-files-0611.md, packages/workflow-kit/README.md, packages/workflow-kit/docs/modules/workflow-kit-package.md, packages/workflow-kit/docs/modules/orchestrated-plans.md, packages/workflow-kit/docs/modules/parallel-assignments.md, docs/modules/project-compatibility.md, docs/modules/user-choice.md, docs/modules/dialogue-timing.md, docs/modules/shared-conversation.md, docs/modules/current-actions.md, docs/modules/sdk-messaging.md, docs/acceptance/shared-conversation-mac.md, packages/workflow-kit/src/templates/PLAN.md
  - Параллельность: исключительное выполнение
  - Зависимости: FILES
- [DONE] RELEASE: Собрать комплект Workflow Pilot 0.6.11 для трёх платформ — Завершено
  - Git Commit: [DONE] feat: Собрать комплект Workflow Pilot 0.6.11 для трёх платформ
  - Reference: context-files-0611 / RELEASE / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: FILES, DOCS
- [DONE] INSTALL: Установить проверенный комплект 0.6.11 с возможностью отката — Завершено
  - Git Commit: [DONE] feat: Установить проверенный комплект 0.6.11 с возможностью отката
  - Reference: context-files-0611 / INSTALL / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: RELEASE, DOCS
- [TODO] PUBLISH: Опубликовать выпуск 0.6.11 на GitHub — Ожидает
  - Git Commit: [PENDING] feat: Опубликовать выпуск 0.6.11 на GitHub
  - Reference: context-files-0611 / PUBLISH / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: INSTALL, DOCS

## Context Pack For This Cycle

- docs/planning/context-files-0611.md
- docs/architecture/OVERVIEW.md

Служебные состояния меняются только командами workflow. Приёмка не архивирует scope.
