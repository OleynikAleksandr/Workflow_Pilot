# Активный план — Workflow_Pilot

<!-- workflow-state:begin -->
```json
{
  "schema_version": 1,
  "plan_revision": 797,
  "project_id": "7411e192-943c-4529-bffb-3b081d9c242f",
  "project_name": "Workflow_Pilot",
  "scope_id": "restore-stable-release",
  "execution_scope_status": "ACTIVE",
  "delivery_status": "READY_FOR_ACCEPTANCE",
  "objective": "Выдать проверенный новый выпуск без PiP экспериментов на основе стабильной 0.5.12",
  "acceptance_criteria": [
    "0.5.17 без экспериментальных исходников и ресурсов, основной канал сохранён.",
    "Проверены три ОС из одного sourceCommit; штатная установка macOS либо проверенный pending без остановки службы."
  ],
  "approved_scope": {
    "functional_paths": [
      "package.json",
      "package-lock.json",
      "src/contracts/backend.mjs",
      "release-manifest.json",
      "tests/backend-shutdown.test.mjs",
      "tests/desktop-client.test.mjs",
      "src/execution/browser/chatgpt-composer.mjs",
      "src/control/context/context-session.mjs",
      "src/control/sessions/service.mjs",
      "src/control/sessions/workspace-session.mjs",
      "src/backend/desktop-model.mjs",
      "src/contracts/desktop.mjs",
      "src/frontend/desktop/preload.cjs",
      "src/frontend/desktop/ui/index.html",
      "src/frontend/desktop/ui/sidebar.mjs",
      "src/frontend/desktop/ui/progress.mjs",
      "tests/chatgpt-composer.test.mjs",
      "tests/context-session.test.mjs",
      "tests/session-runtime.test.mjs",
      "tests/workspace-session.test.mjs",
      "tests/sidebar.test.mjs",
      "tests/progress.test.mjs",
      "tests/backend-desktop-model.test.mjs",
      "src/backend/shutdown.mjs",
      "src/backend/status-menu.mjs",
      "src/backend/main.mjs",
      "src/backend/host.mjs",
      "src/frontend/desktop/client.mjs",
      "src/backend/operations.mjs",
      "src/backend/force-stop.mjs",
      "src/frontend/client/service-stop.mjs",
      "src/execution/browser/diagnostics.mjs",
      "tests/chromium-diagnostics.test.mjs",
      "src/execution/browser/attachment-diagnostics.mjs"
    ],
    "documentation_paths": [
      "docs/planning/restore-stable-release.md",
      "README.md",
      "docs/architecture/OVERVIEW.md",
      "docs/modules/chatgpt-plugin.md",
      "docs/modules/release.md",
      "docs/modules/assignment-dialogue.md",
      "docs/modules/assignment-dialogue-reliability.md",
      "docs/modules/automatic-agent-dialogue-acceptance.md",
      "docs/modules/dialogue-timing.md",
      "docs/modules/orchestrated-execution.md",
      "docs/modules/chatgpt-plugin-acceptance.md",
      "docs/modules/plugin-communication-handoff.md",
      "docs/acceptance/orchestrated-execution.md",
      "docs/planning/startup-recovery.md",
      "docs/modules/backend.md",
      "docs/modules/browser.md",
      "docs/modules/control.md",
      "docs/modules/native-window.md",
      "docs/modules/backend-shutdown.md",
      "docs/planning/attachment-retry-diagnostics.md"
    ]
  },
  "baseline_commit": "f4ca5a07ecdc0c604fa2c45d45636c2e5dafcf1e",
  "current_task_id": null,
  "context_pack": {
    "documents": [
      {
        "path": "docs/planning/restore-stable-release.md",
        "required": true,
        "revision": "acc0e778b2b0aa79de7c911be82df5a38f2d37ff"
      },
      {
        "path": "docs/architecture/OVERVIEW.md",
        "required": true,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/planning/startup-recovery.md",
        "required": true,
        "revision": "ba8a87ccbf5e7ac00eaf7ed24d19e1bf62505703"
      },
      {
        "path": "docs/modules/release.md",
        "required": true,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/planning/attachment-retry-diagnostics.md",
        "required": true,
        "revision": "5171468d291a6d295c3313f6c9e6e1e6ba74ff5f"
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
        "scope_id": "restore-stable-release",
        "task_id": "VERSION",
        "role": "implementation"
      },
      "dependencies": [],
      "functional_paths": [
        "package.json",
        "package-lock.json",
        "src/contracts/backend.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "chatgpt-plugin"
      ],
      "id": "VERSION",
      "title": "Согласовать версию 0.5.17 без PiP",
      "why": "Согласовать версию 0.5.17 без PiP",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Согласовать версию 0.5.17 без PiP согласно спецификации; фактические ограничения сохранены."
      ],
      "expected_commit_message": "chore: Согласовать версию 0.5.17 без PiP",
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
        "scope_id": "restore-stable-release",
        "task_id": "DOCS",
        "role": "implementation"
      },
      "dependencies": [
        "VERSION"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/planning/restore-stable-release.md",
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/release.md",
        "docs/modules/assignment-dialogue.md",
        "docs/modules/assignment-dialogue-reliability.md",
        "docs/modules/automatic-agent-dialogue-acceptance.md",
        "docs/modules/dialogue-timing.md",
        "docs/modules/orchestrated-execution.md",
        "docs/modules/chatgpt-plugin-acceptance.md",
        "docs/modules/plugin-communication-handoff.md",
        "docs/acceptance/orchestrated-execution.md"
      ],
      "verification_ids": [],
      "id": "DOCS",
      "title": "Актуализация всех документов проекта",
      "why": "Актуализировать документацию стабильного выпуска",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Актуализировать документацию стабильного выпуска согласно спецификации; фактические ограничения сохранены."
      ],
      "expected_commit_message": "docs: Актуализировать документацию стабильного выпуска",
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
        "docs/modules/plugin-communication-handoff.md",
        "docs/modules/release.md",
        "docs/planning/restore-stable-release.md"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "restore-stable-release",
        "task_id": "BUILD",
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
      "id": "BUILD",
      "title": "Собрать проверенный комплект 0.5.17 для трёх ОС",
      "why": "Собрать проверенный комплект 0.5.17 для трёх ОС",
      "verification_kind": "package",
      "acceptance_criteria": [
        "Собрать проверенный комплект 0.5.17 для трёх ОС согласно спецификации; фактические ограничения сохранены."
      ],
      "expected_commit_message": "chore: Собрать проверенный комплект 0.5.17 для трёх ОС",
      "parallel_safe": false,
      "actual_files": [
        "release-manifest.json"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "restore-stable-release",
        "task_id": "INSTALL",
        "role": "implementation"
      },
      "dependencies": [
        "BUILD",
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
      "title": "Установить готовый macOS комплект 0.5.17",
      "why": "Установить готовый macOS комплект 0.5.17",
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Установить готовый macOS комплект 0.5.17 согласно спецификации; фактические ограничения сохранены."
      ],
      "expected_commit_message": "chore: Установить готовый macOS комплект 0.5.17",
      "parallel_safe": false,
      "actual_files": []
    },
    {
      "id": "FIX-STARTUP",
      "title": "Восстановить автоматическую подготовку и повтор загрузки контекста",
      "why": "Восстановить автоматическую подготовку и повтор загрузки контекста",
      "dependencies": [],
      "functional_paths": [
        "src/execution/browser/chatgpt-composer.mjs",
        "src/control/context/context-session.mjs",
        "src/control/sessions/service.mjs",
        "src/control/sessions/workspace-session.mjs",
        "src/backend/desktop-model.mjs",
        "src/contracts/desktop.mjs",
        "src/frontend/desktop/preload.cjs",
        "src/frontend/desktop/ui/index.html",
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/frontend/desktop/ui/progress.mjs",
        "tests/chatgpt-composer.test.mjs",
        "tests/context-session.test.mjs",
        "tests/session-runtime.test.mjs",
        "tests/workspace-session.test.mjs",
        "tests/sidebar.test.mjs",
        "tests/progress.test.mjs",
        "tests/backend-desktop-model.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/startup-recovery.md"
      ],
      "verification_ids": [
        "startup-recovery"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Новая сессия видима и запускается без ручного выбора; retry и отмена не блокируют управление.",
        "Зависшее собственное вложение повторяется только после проверенного удаления; готовые и чужие сохраняются; UNKNOWN и удаление пользователем не дают повторного Send."
      ],
      "expected_commit_message": "feat: Восстановить автоматическую подготовку и повтор загрузки контекста",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "restore-stable-release",
        "task_id": "FIX-STARTUP",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "src/backend/desktop-model.mjs",
        "src/contracts/desktop.mjs",
        "src/control/context/context-session.mjs",
        "src/control/sessions/service.mjs",
        "src/control/sessions/workspace-session.mjs",
        "src/execution/browser/chatgpt-composer.mjs",
        "src/frontend/desktop/preload.cjs",
        "src/frontend/desktop/ui/index.html",
        "src/frontend/desktop/ui/progress.mjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "tests/chatgpt-composer.test.mjs",
        "tests/context-session.test.mjs",
        "tests/session-runtime.test.mjs",
        "tests/sidebar.test.mjs",
        "tests/workspace-session.test.mjs",
        "docs/planning/startup-recovery.md"
      ]
    },
    {
      "id": "FORCE-STOP",
      "title": "Добавить подтверждаемую принудительную остановку собственной службы",
      "why": "Добавить подтверждаемую принудительную остановку собственной службы",
      "dependencies": [
        "FIX-STARTUP"
      ],
      "functional_paths": [
        "src/backend/shutdown.mjs",
        "src/backend/status-menu.mjs",
        "src/backend/main.mjs",
        "src/backend/host.mjs",
        "src/frontend/desktop/client.mjs",
        "tests/backend-shutdown.test.mjs",
        "tests/desktop-client.test.mjs",
        "src/backend/operations.mjs",
        "src/contracts/backend.mjs",
        "src/backend/force-stop.mjs",
        "src/frontend/client/service-stop.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "force-stop"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Принудительная остановка доступна при зависшей работе, не ждёт drain; отмена подтверждения ничего не останавливает."
      ],
      "expected_commit_message": "feat: Добавить подтверждаемую принудительную остановку собственной службы",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "restore-stable-release",
        "task_id": "FORCE-STOP",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "src/backend/main.mjs",
        "src/backend/operations.mjs",
        "src/backend/status-menu.mjs",
        "src/contracts/backend.mjs",
        "src/frontend/desktop/client.mjs",
        "tests/backend-shutdown.test.mjs",
        "tests/desktop-client.test.mjs",
        "src/backend/force-stop.mjs",
        "src/frontend/client/service-stop.mjs"
      ]
    },
    {
      "id": "VERSION-2",
      "title": "Согласовать версию приложения и панели 0.5.18",
      "why": "Согласовать версию приложения и панели 0.5.18",
      "dependencies": [
        "FORCE-STOP"
      ],
      "functional_paths": [
        "package.json",
        "package-lock.json",
        "src/contracts/backend.mjs"
      ],
      "documentation_paths": [
        "docs/modules/release.md",
        "docs/architecture/OVERVIEW.md",
        "docs/planning/startup-recovery.md"
      ],
      "verification_ids": [
        "chatgpt-plugin"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Согласовать версию приложения и панели 0.5.18"
      ],
      "expected_commit_message": "feat: Согласовать версию приложения и панели 0.5.18",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "restore-stable-release",
        "task_id": "VERSION-2",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "package.json",
        "package-lock.json",
        "src/contracts/backend.mjs"
      ]
    },
    {
      "id": "DOCS-2",
      "title": "Актуализация всех документов проекта",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "restore-stable-release",
        "task_id": "DOCS-2",
        "role": "implementation",
        "iteration": 2
      },
      "why": "Перед выпуском сверить README, OVERVIEW и действующие контракты модулей с результатом; обновить устаревшее.",
      "dependencies": [
        "FIX-STARTUP",
        "FORCE-STOP",
        "VERSION-2"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/architecture/OVERVIEW.md",
        "docs/planning/startup-recovery.md",
        "docs/modules/release.md",
        "README.md",
        "docs/acceptance/orchestrated-execution.md",
        "docs/modules/assignment-dialogue-reliability.md",
        "docs/modules/assignment-dialogue.md",
        "docs/modules/automatic-agent-dialogue-acceptance.md",
        "docs/modules/backend.md",
        "docs/modules/browser.md",
        "docs/modules/chatgpt-plugin-acceptance.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/control.md",
        "docs/modules/dialogue-timing.md",
        "docs/modules/native-window.md",
        "docs/modules/orchestrated-execution.md",
        "docs/modules/plugin-communication-handoff.md",
        "docs/modules/backend-shutdown.md"
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
        "docs/modules/backend.md",
        "docs/modules/browser.md",
        "docs/modules/chatgpt-plugin-acceptance.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/control.md",
        "docs/modules/dialogue-timing.md",
        "docs/modules/native-window.md",
        "docs/modules/orchestrated-execution.md",
        "docs/modules/plugin-communication-handoff.md",
        "docs/modules/release.md",
        "docs/planning/startup-recovery.md",
        "docs/modules/backend-shutdown.md"
      ]
    },
    {
      "id": "BUILD-2",
      "title": "Собрать проверенный выпуск 0.5.18 для трёх ОС",
      "why": "Собрать проверенный выпуск 0.5.18 для трёх ОС",
      "dependencies": [
        "DOCS-2"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/startup-recovery.md"
      ],
      "verification_ids": [
        "three-platform-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "Собрать проверенный выпуск 0.5.18 для трёх ОС"
      ],
      "expected_commit_message": "feat: Собрать проверенный выпуск 0.5.18 для трёх ОС",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "restore-stable-release",
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
      "title": "Установить проверенный комплект 0.5.18",
      "why": "Установить проверенный комплект 0.5.18",
      "dependencies": [
        "BUILD-2",
        "DOCS-2"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/startup-recovery.md"
      ],
      "verification_ids": [
        "release-installed"
      ],
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Установить проверенный комплект 0.5.18"
      ],
      "expected_commit_message": "feat: Установить проверенный комплект 0.5.18",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "restore-stable-release",
        "task_id": "INSTALL-2",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": []
    },
    {
      "id": "FIX-RETRY",
      "title": "Исправить распознавание повторных вложений",
      "why": "Исправить распознавание повторных вложений",
      "dependencies": [],
      "functional_paths": [
        "src/execution/browser/chatgpt-composer.mjs",
        "tests/chatgpt-composer.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/attachment-retry-diagnostics.md"
      ],
      "verification_ids": [
        "attachment-retry"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Исправить распознавание повторных вложений"
      ],
      "expected_commit_message": "feat: Исправить распознавание повторных вложений",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "restore-stable-release",
        "task_id": "FIX-RETRY",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "src/execution/browser/chatgpt-composer.mjs",
        "tests/chatgpt-composer.test.mjs",
        "docs/planning/attachment-retry-diagnostics.md"
      ]
    },
    {
      "id": "DIAG-ATTACH",
      "title": "Добавить ограниченную диагностику обработки вложений",
      "why": "Добавить ограниченную диагностику обработки вложений",
      "dependencies": [
        "FIX-RETRY"
      ],
      "functional_paths": [
        "src/execution/browser/diagnostics.mjs",
        "tests/chromium-diagnostics.test.mjs",
        "src/execution/browser/attachment-diagnostics.mjs"
      ],
      "documentation_paths": [
        "docs/planning/attachment-retry-diagnostics.md"
      ],
      "verification_ids": [
        "attachment-diagnostics"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Добавить ограниченную диагностику обработки вложений"
      ],
      "expected_commit_message": "feat: Добавить ограниченную диагностику обработки вложений",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "restore-stable-release",
        "task_id": "DIAG-ATTACH",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "src/execution/browser/attachment-diagnostics.mjs",
        "src/execution/browser/diagnostics.mjs",
        "tests/chromium-diagnostics.test.mjs"
      ]
    },
    {
      "id": "VERSION-3",
      "title": "Согласовать версию 0.5.19",
      "why": "Согласовать версию 0.5.19",
      "dependencies": [
        "DIAG-ATTACH"
      ],
      "functional_paths": [
        "package.json",
        "package-lock.json",
        "src/contracts/backend.mjs"
      ],
      "documentation_paths": [
        "docs/planning/attachment-retry-diagnostics.md"
      ],
      "verification_ids": [
        "chatgpt-plugin"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Согласовать версию 0.5.19"
      ],
      "expected_commit_message": "feat: Согласовать версию 0.5.19",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "restore-stable-release",
        "task_id": "VERSION-3",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "package-lock.json",
        "package.json",
        "src/contracts/backend.mjs"
      ]
    },
    {
      "id": "DOCS-3",
      "title": "Актуализация всех документов проекта",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "restore-stable-release",
        "task_id": "DOCS-3",
        "role": "implementation",
        "iteration": 3
      },
      "why": "Перед выпуском сверить README, OVERVIEW и действующие контракты модулей с результатом; обновить устаревшее.",
      "dependencies": [
        "FIX-RETRY",
        "DIAG-ATTACH",
        "VERSION-3"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/architecture/OVERVIEW.md",
        "docs/planning/attachment-retry-diagnostics.md",
        "README.md",
        "docs/acceptance/orchestrated-execution.md",
        "docs/modules/assignment-dialogue-reliability.md",
        "docs/modules/assignment-dialogue.md",
        "docs/modules/automatic-agent-dialogue-acceptance.md",
        "docs/modules/browser.md",
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
        "docs/modules/browser.md",
        "docs/modules/chatgpt-plugin-acceptance.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/dialogue-timing.md",
        "docs/modules/orchestrated-execution.md",
        "docs/modules/plugin-communication-handoff.md",
        "docs/modules/release.md",
        "docs/planning/attachment-retry-diagnostics.md"
      ]
    },
    {
      "id": "BUILD-3",
      "title": "Собрать проверенный выпуск 0.5.19 для трёх ОС",
      "why": "Собрать проверенный выпуск 0.5.19 для трёх ОС",
      "dependencies": [
        "DOCS-3"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/attachment-retry-diagnostics.md"
      ],
      "verification_ids": [
        "three-platform-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "Собрать проверенный выпуск 0.5.19 для трёх ОС"
      ],
      "expected_commit_message": "feat: Собрать проверенный выпуск 0.5.19 для трёх ОС",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "restore-stable-release",
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
      "title": "Установить проверенный комплект 0.5.19",
      "why": "Установить проверенный комплект 0.5.19",
      "dependencies": [
        "BUILD-3",
        "DOCS-3"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/attachment-retry-diagnostics.md"
      ],
      "verification_ids": [
        "release-installed"
      ],
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Установить проверенный комплект 0.5.19"
      ],
      "expected_commit_message": "feat: Установить проверенный комплект 0.5.19",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "restore-stable-release",
        "task_id": "INSTALL-3",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": []
    }
  ],
  "blocked_reason": null,
  "user_decisions": [
    {
      "id": "34183606-ebb0-4e6f-b166-8dea1232f280",
      "text": "Пользователь 21.10.2026 поручил удалить эксперименты и собрать новый релиз для тестов.",
      "recorded_at": "2026-10-21T10:06:07.519Z"
    }
  ],
  "parallel_allowed": false,
  "max_workers": 1,
  "execution_strategy": "sequential",
  "execution_reason": "Продолжение разработки одним агентом по правилам проекта; последовательная поставка после очистки."
}
```
<!-- workflow-state:end -->

## Состояние

Execution Scope Status: ACTIVE
Delivery Status: READY_FOR_ACCEPTANCE
Scope: restore-stable-release
Current Task: нет
Revision: 797

## Цель

Выдать проверенный новый выпуск без PiP экспериментов на основе стабильной 0.5.12

## Критерии приёмки

- 0.5.17 без экспериментальных исходников и ресурсов, основной канал сохранён.
- Проверены три ОС из одного sourceCommit; штатная установка macOS либо проверенный pending без остановки службы.

## Микрозадачи

Выполнение: sequential; разрешено: false; лимит: 1
Причина: Продолжение разработки одним агентом по правилам проекта; последовательная поставка после очистки.

- [DONE] VERSION: Согласовать версию 0.5.17 без PiP — Завершено
  - Git Commit: [DONE] chore: Согласовать версию 0.5.17 без PiP
  - Reference: restore-stable-release / VERSION / implementation
  - Файлы: package.json, package-lock.json, src/contracts/backend.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] DOCS: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: Актуализировать документацию стабильного выпуска
  - Reference: restore-stable-release / DOCS / implementation
  - Файлы: docs/planning/restore-stable-release.md, README.md, docs/architecture/OVERVIEW.md, docs/modules/chatgpt-plugin.md, docs/modules/release.md, docs/modules/assignment-dialogue.md, docs/modules/assignment-dialogue-reliability.md, docs/modules/automatic-agent-dialogue-acceptance.md, docs/modules/dialogue-timing.md, docs/modules/orchestrated-execution.md, docs/modules/chatgpt-plugin-acceptance.md, docs/modules/plugin-communication-handoff.md, docs/acceptance/orchestrated-execution.md
  - Параллельность: исключительное выполнение
  - Зависимости: VERSION
- [DONE] BUILD: Собрать проверенный комплект 0.5.17 для трёх ОС — Завершено
  - Git Commit: [DONE] chore: Собрать проверенный комплект 0.5.17 для трёх ОС
  - Reference: restore-stable-release / BUILD / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: DOCS
- [DONE] INSTALL: Установить готовый macOS комплект 0.5.17 — Завершено
  - Git Commit: [DONE] chore: Установить готовый macOS комплект 0.5.17
  - Reference: restore-stable-release / INSTALL / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: BUILD, DOCS
- [DONE] FIX-STARTUP: Восстановить автоматическую подготовку и повтор загрузки контекста — Завершено
  - Git Commit: [DONE] feat: Восстановить автоматическую подготовку и повтор загрузки контекста
  - Reference: restore-stable-release / FIX-STARTUP / implementation
  - Файлы: src/execution/browser/chatgpt-composer.mjs, src/control/context/context-session.mjs, src/control/sessions/service.mjs, src/control/sessions/workspace-session.mjs, src/backend/desktop-model.mjs, src/contracts/desktop.mjs, src/frontend/desktop/preload.cjs, src/frontend/desktop/ui/index.html, src/frontend/desktop/ui/sidebar.mjs, src/frontend/desktop/ui/progress.mjs, tests/chatgpt-composer.test.mjs, tests/context-session.test.mjs, tests/session-runtime.test.mjs, tests/workspace-session.test.mjs, tests/sidebar.test.mjs, tests/progress.test.mjs, tests/backend-desktop-model.test.mjs, docs/planning/startup-recovery.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] FORCE-STOP: Добавить подтверждаемую принудительную остановку собственной службы — Завершено
  - Git Commit: [DONE] feat: Добавить подтверждаемую принудительную остановку собственной службы
  - Reference: restore-stable-release / FORCE-STOP / implementation
  - Файлы: src/backend/shutdown.mjs, src/backend/status-menu.mjs, src/backend/main.mjs, src/backend/host.mjs, src/frontend/desktop/client.mjs, tests/backend-shutdown.test.mjs, tests/desktop-client.test.mjs, src/backend/operations.mjs, src/contracts/backend.mjs, src/backend/force-stop.mjs, src/frontend/client/service-stop.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: FIX-STARTUP
- [DONE] VERSION-2: Согласовать версию приложения и панели 0.5.18 — Завершено
  - Git Commit: [DONE] feat: Согласовать версию приложения и панели 0.5.18
  - Reference: restore-stable-release / VERSION-2 / implementation
  - Файлы: package.json, package-lock.json, src/contracts/backend.mjs, docs/modules/release.md, docs/architecture/OVERVIEW.md, docs/planning/startup-recovery.md
  - Параллельность: исключительное выполнение
  - Зависимости: FORCE-STOP
- [DONE] DOCS-2: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: актуализировать документацию проекта
  - Reference: restore-stable-release / DOCS-2 / implementation
  - Файлы: docs/architecture/OVERVIEW.md, docs/planning/startup-recovery.md, docs/modules/release.md, README.md, docs/acceptance/orchestrated-execution.md, docs/modules/assignment-dialogue-reliability.md, docs/modules/assignment-dialogue.md, docs/modules/automatic-agent-dialogue-acceptance.md, docs/modules/backend.md, docs/modules/browser.md, docs/modules/chatgpt-plugin-acceptance.md, docs/modules/chatgpt-plugin.md, docs/modules/control.md, docs/modules/dialogue-timing.md, docs/modules/native-window.md, docs/modules/orchestrated-execution.md, docs/modules/plugin-communication-handoff.md, docs/modules/backend-shutdown.md
  - Параллельность: исключительное выполнение
  - Зависимости: FIX-STARTUP, FORCE-STOP, VERSION-2
- [DONE] BUILD-2: Собрать проверенный выпуск 0.5.18 для трёх ОС — Завершено
  - Git Commit: [DONE] feat: Собрать проверенный выпуск 0.5.18 для трёх ОС
  - Reference: restore-stable-release / BUILD-2 / implementation
  - Файлы: release-manifest.json, docs/planning/startup-recovery.md
  - Параллельность: исключительное выполнение
  - Зависимости: DOCS-2
- [DONE] INSTALL-2: Установить проверенный комплект 0.5.18 — Завершено
  - Git Commit: [DONE] feat: Установить проверенный комплект 0.5.18
  - Reference: restore-stable-release / INSTALL-2 / implementation
  - Файлы: release-manifest.json, docs/planning/startup-recovery.md
  - Параллельность: исключительное выполнение
  - Зависимости: BUILD-2, DOCS-2
- [DONE] FIX-RETRY: Исправить распознавание повторных вложений — Завершено
  - Git Commit: [DONE] feat: Исправить распознавание повторных вложений
  - Reference: restore-stable-release / FIX-RETRY / implementation
  - Файлы: src/execution/browser/chatgpt-composer.mjs, tests/chatgpt-composer.test.mjs, docs/planning/attachment-retry-diagnostics.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] DIAG-ATTACH: Добавить ограниченную диагностику обработки вложений — Завершено
  - Git Commit: [DONE] feat: Добавить ограниченную диагностику обработки вложений
  - Reference: restore-stable-release / DIAG-ATTACH / implementation
  - Файлы: src/execution/browser/diagnostics.mjs, tests/chromium-diagnostics.test.mjs, src/execution/browser/attachment-diagnostics.mjs, docs/planning/attachment-retry-diagnostics.md
  - Параллельность: исключительное выполнение
  - Зависимости: FIX-RETRY
- [DONE] VERSION-3: Согласовать версию 0.5.19 — Завершено
  - Git Commit: [DONE] feat: Согласовать версию 0.5.19
  - Reference: restore-stable-release / VERSION-3 / implementation
  - Файлы: package.json, package-lock.json, src/contracts/backend.mjs, docs/planning/attachment-retry-diagnostics.md
  - Параллельность: исключительное выполнение
  - Зависимости: DIAG-ATTACH
- [DONE] DOCS-3: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: актуализировать документацию проекта
  - Reference: restore-stable-release / DOCS-3 / implementation
  - Файлы: docs/architecture/OVERVIEW.md, docs/planning/attachment-retry-diagnostics.md, README.md, docs/acceptance/orchestrated-execution.md, docs/modules/assignment-dialogue-reliability.md, docs/modules/assignment-dialogue.md, docs/modules/automatic-agent-dialogue-acceptance.md, docs/modules/browser.md, docs/modules/chatgpt-plugin-acceptance.md, docs/modules/chatgpt-plugin.md, docs/modules/dialogue-timing.md, docs/modules/orchestrated-execution.md, docs/modules/plugin-communication-handoff.md, docs/modules/release.md
  - Параллельность: исключительное выполнение
  - Зависимости: FIX-RETRY, DIAG-ATTACH, VERSION-3
- [DONE] BUILD-3: Собрать проверенный выпуск 0.5.19 для трёх ОС — Завершено
  - Git Commit: [DONE] feat: Собрать проверенный выпуск 0.5.19 для трёх ОС
  - Reference: restore-stable-release / BUILD-3 / implementation
  - Файлы: release-manifest.json, docs/planning/attachment-retry-diagnostics.md
  - Параллельность: исключительное выполнение
  - Зависимости: DOCS-3
- [DONE] INSTALL-3: Установить проверенный комплект 0.5.19 — Завершено
  - Git Commit: [DONE] feat: Установить проверенный комплект 0.5.19
  - Reference: restore-stable-release / INSTALL-3 / implementation
  - Файлы: release-manifest.json, docs/planning/attachment-retry-diagnostics.md
  - Параллельность: исключительное выполнение
  - Зависимости: BUILD-3, DOCS-3

## Context Pack For This Cycle

- docs/planning/restore-stable-release.md
- docs/architecture/OVERVIEW.md
- docs/planning/startup-recovery.md
- docs/modules/release.md
- docs/planning/attachment-retry-diagnostics.md

Служебные состояния меняются только командами workflow. Приёмка не архивирует scope.
