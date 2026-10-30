# Активный план — Workflow_Pilot

<!-- workflow-state:begin -->
```json
{
  "schema_version": 1,
  "plan_revision": 1384,
  "project_id": "7411e192-943c-4529-bffb-3b081d9c242f",
  "project_name": "Workflow_Pilot",
  "scope_id": "cdp-startup-input",
  "execution_scope_status": "ACTIVE",
  "delivery_status": "IN_PROGRESS",
  "objective": "Первая команда каждой сессии Workflow Pilot (обсуждение, оркестратор, исполнитель) отправляется доверенным CDP-вводом в проверенный документ вместо q-адреса; выпуск 0.6.4 трёх ОС, установка на Mac и публикация GitHub.",
  "acceptance_criteria": [
    "Для всех ролей первая команда отправляется CDP-вводом в проверенный документ; навигаций ?q= нет.",
    "Один токен — не более одного Enter; неудача до Enter не отправляет и даёт один автоматический новый старт; ошибка после Enter не повторяется.",
    "Выпуск 0.6.4 трёх ОС из одного sourceCommit установлен на Mac и опубликован; живая проверка — pending у пользователя."
  ],
  "approved_scope": {
    "functional_paths": [
      "src/execution/browser/chatgpt-composer.mjs",
      "src/execution/browser/session-runtime.mjs",
      "src/control/context/context-session.mjs",
      "src/contracts/context.mjs",
      "src/contracts/startup-view.mjs",
      "src/control/sessions/service.mjs",
      "src/control/workflow/dialogue-delivery.mjs",
      "src/backend/desktop-model.mjs",
      "src/contracts/backend.mjs",
      "package.json",
      "package-lock.json",
      "tests/chatgpt-composer.test.mjs",
      "tests/session-runtime.test.mjs",
      "tests/context-session.test.mjs",
      "tests/chatgpt-plugin.test.mjs",
      "tests/startup-context.test.mjs",
      "tests/dialogue-delivery.test.mjs",
      "tests/session-opening-performance.test.mjs",
      "tests/workspace-session.test.mjs",
      "tests/backend-desktop-model.test.mjs",
      "release-manifest.json",
      "tests/fixtures/automatic-agent-dialogue.mjs",
      "tests/fixtures/executor-background-startup.mjs",
      "tests/executor-background-startup.test.mjs",
      "tests/electron-smoke.mjs",
      "tests/fixtures/search-extension-electron.cjs",
      "scripts/check-search-extension.mjs",
      "src/control/projects/service.mjs"
    ],
    "documentation_paths": [
      "docs/planning/cdp-startup-input.md",
      "README.md",
      "docs/architecture/OVERVIEW.md",
      "docs/modules/chat-only-startup.md",
      "docs/modules/browser.md",
      "docs/modules/chatgpt-plugin.md",
      "docs/modules/current-actions.md",
      "docs/modules/release.md",
      "docs/modules/shared-conversation.md",
      "docs/modules/orchestrator-startup.md",
      "docs/modules/control.md",
      "docs/modules/sdk-messaging.md",
      "docs/modules/chatgpt-search-extension.md",
      "docs/acceptance/chat-only-startup.md",
      "docs/acceptance/shared-conversation-mac.md"
    ]
  },
  "baseline_commit": "1d1651d34c61ef956d0947526f719ddbac13d9d8",
  "current_task_id": null,
  "context_pack": {
    "documents": [
      {
        "path": "docs/planning/cdp-startup-input.md",
        "required": true,
        "revision": "d5ffd6ca16396ebe18d871a0cb5e9fd0f7e01942"
      },
      {
        "path": "docs/modules/chat-only-startup.md",
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
        "scope_id": "cdp-startup-input",
        "task_id": "CDP-START",
        "role": "implementation"
      },
      "dependencies": [],
      "functional_paths": [
        "src/execution/browser/chatgpt-composer.mjs",
        "src/execution/browser/session-runtime.mjs",
        "src/control/context/context-session.mjs",
        "src/contracts/context.mjs",
        "src/contracts/startup-view.mjs",
        "src/control/sessions/service.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/backend/desktop-model.mjs",
        "src/contracts/backend.mjs",
        "package.json",
        "package-lock.json",
        "tests/chatgpt-composer.test.mjs",
        "tests/session-runtime.test.mjs",
        "tests/context-session.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/startup-context.test.mjs",
        "tests/dialogue-delivery.test.mjs",
        "tests/session-opening-performance.test.mjs",
        "tests/workspace-session.test.mjs",
        "tests/backend-desktop-model.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/fixtures/executor-background-startup.mjs",
        "tests/executor-background-startup.test.mjs",
        "tests/electron-smoke.mjs",
        "tests/fixtures/search-extension-electron.cjs",
        "scripts/check-search-extension.mjs",
        "src/control/projects/service.mjs"
      ],
      "documentation_paths": [
        "docs/planning/cdp-startup-input.md"
      ],
      "verification_ids": [
        "startup-recovery",
        "orchestrator-startup",
        "conversation-freshness",
        "chatgpt-plugin",
        "architecture",
        "prepared-flow-cycle",
        "search-extension-startup",
        "background-startup",
        "electron-smoke",
        "search-extension-native"
      ],
      "id": "CDP-START",
      "title": "Старт сессии через CDP-ввод",
      "why": "Автоотправка ?q= при загрузке страницы ChatGPT третий выпуск подряд даёт сбои старта.",
      "acceptance_criteria": [
        "Для всех ролей (обсуждение, оркестратор, исполнитель) первая команда вводится через CDP Input.insertText в проверенный предварительный документ, Enter только после точной проверки текста в том же документе; навигаций ?q= нет, второго пути отправки нет.",
        "Один токен — не более одного Enter (BOOTSTRAP_ALREADY_DISPATCHED); ошибка после начала Enter — unknown без повтора; неудача до Enter очищает только свою точную команду и даёт один автоматический новый старт (start-not-sent).",
        "Runtime пропускает ровно свой keyDown Enter (счётчик собственных нажатий); любой другой ввод до Enter отменяет попытку, после Enter снимает владельца стартовой навигации; корень с неотправленной командой или локальный разговор через 30 с ведут к одному повтору; попытки url-query прежних версий распознаются; версия 0.6.4.",
        "Настоящий Electron (background-startup, electron-smoke, search-extension-native) стартует фоновые страницы через CDP-ввод; fixtures реагируют на ввод и Enter вместо q."
      ],
      "expected_commit_message": "feat: Старт сессии через CDP-ввод",
      "actual_files": [
        "package-lock.json",
        "package.json",
        "src/backend/desktop-model.mjs",
        "src/contracts/backend.mjs",
        "src/contracts/startup-view.mjs",
        "src/control/context/context-session.mjs",
        "src/control/projects/service.mjs",
        "src/control/sessions/service.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/execution/browser/chatgpt-composer.mjs",
        "src/execution/browser/session-runtime.mjs",
        "tests/chatgpt-composer.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/context-session.test.mjs",
        "tests/electron-smoke.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/fixtures/executor-background-startup.mjs",
        "tests/fixtures/search-extension-electron.cjs",
        "tests/session-opening-performance.test.mjs",
        "tests/session-runtime.test.mjs",
        "tests/workspace-session.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "cdp-startup-input",
        "task_id": "DOCS",
        "role": "implementation"
      },
      "dependencies": [
        "CDP-START"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/planning/cdp-startup-input.md",
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/chat-only-startup.md",
        "docs/modules/browser.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/current-actions.md",
        "docs/modules/release.md",
        "docs/modules/shared-conversation.md",
        "docs/modules/orchestrator-startup.md",
        "docs/modules/control.md",
        "docs/modules/sdk-messaging.md",
        "docs/modules/chatgpt-search-extension.md",
        "docs/acceptance/chat-only-startup.md",
        "docs/acceptance/shared-conversation-mac.md"
      ],
      "verification_ids": [],
      "id": "DOCS",
      "title": "Актуализация всех документов проекта",
      "why": "Перенести результат в действующие контракты до production build.",
      "acceptance_criteria": [
        "Контракты старта описывают CDP-ввод вместо q-адреса и уточнённое правило клавиатуры; выпущенная spec удалена с точной Git blob ссылкой; каждый документ ≤ 28000 байт; живая проверка отмечена pending."
      ],
      "expected_commit_message": "docs: актуализировать документацию проекта",
      "actual_files": [
        "README.md",
        "docs/acceptance/chat-only-startup.md",
        "docs/acceptance/shared-conversation-mac.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/browser.md",
        "docs/modules/chat-only-startup.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/chatgpt-search-extension.md",
        "docs/modules/control.md",
        "docs/modules/current-actions.md",
        "docs/modules/orchestrator-startup.md",
        "docs/modules/release.md",
        "docs/modules/sdk-messaging.md",
        "docs/modules/shared-conversation.md",
        "docs/planning/cdp-startup-input.md"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "cdp-startup-input",
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
      "title": "Собрать macOS Windows Linux 0.6.4",
      "why": "Проверенный полный комплект из одного sourceCommit.",
      "verification_kind": "package",
      "acceptance_criteria": [
        "Три ОС после DOCS из одного sourceCommit, семь assets, manifest/SHA/подпись подтверждены; preflight кэша Python."
      ],
      "expected_commit_message": "feat: Собрать macOS Windows Linux 0.6.4",
      "actual_files": [
        "release-manifest.json"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "cdp-startup-input",
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
      "title": "Установить выпуск 0.6.4 на этот Mac",
      "why": "Поставить готовый комплект с rollback без остановки службы.",
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Штатный installer без пересборки и переподписи; при работающей службе verified pending."
      ],
      "expected_commit_message": "feat: Установить выпуск 0.6.4 на этот Mac",
      "actual_files": []
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "cdp-startup-input",
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
      "title": "Опубликовать выпуск 0.6.4 на GitHub",
      "why": "Публичная доставка и проверка remote main.",
      "verification_kind": "package",
      "acceptance_criteria": [
        "Tag равен sourceCommit, семь assets проверены, remote main подтверждён; живая проверка не объявляется пройденной."
      ],
      "expected_commit_message": "feat: Опубликовать выпуск 0.6.4 на GitHub"
    }
  ],
  "blocked_reason": null,
  "user_decisions": [
    {
      "id": "bc35b9e0-4e58-4af5-887b-1518df2e1b06",
      "text": "Пользователь 30.10.2026 поручил закрыть прежний план, создать новый и сделать CDP-старт для стартового агента и исполнителей; полный VERIFY не выполнять.",
      "recorded_at": "2026-10-30T12:25:10.402Z"
    }
  ]
}
```
<!-- workflow-state:end -->

## Состояние

Execution Scope Status: ACTIVE
Delivery Status: IN_PROGRESS
Scope: cdp-startup-input
Current Task: нет
Revision: 1384

## Цель

Первая команда каждой сессии Workflow Pilot (обсуждение, оркестратор, исполнитель) отправляется доверенным CDP-вводом в проверенный документ вместо q-адреса; выпуск 0.6.4 трёх ОС, установка на Mac и публикация GitHub.

## Критерии приёмки

- Для всех ролей первая команда отправляется CDP-вводом в проверенный документ; навигаций ?q= нет.
- Один токен — не более одного Enter; неудача до Enter не отправляет и даёт один автоматический новый старт; ошибка после Enter не повторяется.
- Выпуск 0.6.4 трёх ОС из одного sourceCommit установлен на Mac и опубликован; живая проверка — pending у пользователя.

## Микрозадачи

- [DONE] CDP-START: Старт сессии через CDP-ввод — Завершено
  - Git Commit: [DONE] feat: Старт сессии через CDP-ввод
  - Reference: cdp-startup-input / CDP-START / implementation
  - Файлы: src/execution/browser/chatgpt-composer.mjs, src/execution/browser/session-runtime.mjs, src/control/context/context-session.mjs, src/contracts/context.mjs, src/contracts/startup-view.mjs, src/control/sessions/service.mjs, src/control/workflow/dialogue-delivery.mjs, src/backend/desktop-model.mjs, src/contracts/backend.mjs, package.json, package-lock.json, tests/chatgpt-composer.test.mjs, tests/session-runtime.test.mjs, tests/context-session.test.mjs, tests/chatgpt-plugin.test.mjs, tests/startup-context.test.mjs, tests/dialogue-delivery.test.mjs, tests/session-opening-performance.test.mjs, tests/workspace-session.test.mjs, tests/backend-desktop-model.test.mjs, tests/fixtures/automatic-agent-dialogue.mjs, tests/fixtures/executor-background-startup.mjs, tests/executor-background-startup.test.mjs, tests/electron-smoke.mjs, tests/fixtures/search-extension-electron.cjs, scripts/check-search-extension.mjs, src/control/projects/service.mjs, docs/planning/cdp-startup-input.md
- [DONE] DOCS: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: актуализировать документацию проекта
  - Reference: cdp-startup-input / DOCS / implementation
  - Файлы: docs/planning/cdp-startup-input.md, README.md, docs/architecture/OVERVIEW.md, docs/modules/chat-only-startup.md, docs/modules/browser.md, docs/modules/chatgpt-plugin.md, docs/modules/current-actions.md, docs/modules/release.md, docs/modules/shared-conversation.md, docs/modules/orchestrator-startup.md, docs/modules/control.md, docs/modules/sdk-messaging.md, docs/modules/chatgpt-search-extension.md, docs/acceptance/chat-only-startup.md, docs/acceptance/shared-conversation-mac.md
- [DONE] RELEASE: Собрать macOS Windows Linux 0.6.4 — Завершено
  - Git Commit: [DONE] feat: Собрать macOS Windows Linux 0.6.4
  - Reference: cdp-startup-input / RELEASE / implementation
  - Файлы: release-manifest.json
- [DONE] INSTALL: Установить выпуск 0.6.4 на этот Mac — Завершено
  - Git Commit: [DONE] feat: Установить выпуск 0.6.4 на этот Mac
  - Reference: cdp-startup-input / INSTALL / implementation
  - Файлы: release-manifest.json
- [TODO] PUBLISH: Опубликовать выпуск 0.6.4 на GitHub — Ожидает
  - Git Commit: [PENDING] feat: Опубликовать выпуск 0.6.4 на GitHub
  - Reference: cdp-startup-input / PUBLISH / implementation
  - Файлы: release-manifest.json

## Context Pack For This Cycle

- docs/planning/cdp-startup-input.md
- docs/modules/chat-only-startup.md
- docs/architecture/OVERVIEW.md

Служебные состояния меняются только командами workflow. Приёмка не архивирует scope.
