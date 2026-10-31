# Активный план — Workflow_Pilot

<!-- workflow-state:begin -->
```json
{
  "schema_version": 1,
  "plan_revision": 1404,
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
      "src/control/projects/service.mjs",
      "src/execution/plugin/communication-store.mjs",
      "src/control/plugin/communication.mjs",
      "src/frontend/plugin/launch.mjs",
      "tests/plugin-communication-store.test.mjs",
      "tests/plugin-communication.test.mjs",
      "tests/workflow-channel.test.mjs",
      "packages/workflow-kit/src/lib/role-protocol.mjs",
      "packages/workflow-kit/package.json",
      "packages/workflow-kit/src/lib/common.mjs",
      "packages/workflow-kit/src/lib/installer.mjs",
      "tests/role-protocol.test.mjs",
      "tests/workflow-kit-upgrade.test.mjs",
      "tests/fixtures/released-kit/manifest.json",
      "tests/fixtures/released-kit/kit-1.10.5.tar.gz",
      "src/execution/browser/panel-frame-attestation.mjs",
      "src/control/plugin/panel-recovery.mjs",
      "src/control/plugin/service.mjs",
      "src/control/workflow/coordination.mjs",
      "tools/codex-app-server-mcp/plugin.py",
      "tools/codex-app-server-mcp/plugin-ui.html",
      "tests/panel-frame-attestation.test.mjs",
      "tests/fixtures/panel-frame-host.mjs",
      "tests/plugin-delivery-ownership.test.mjs"
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
      "docs/acceptance/shared-conversation-mac.md",
      "docs/planning/communication-journal-growth.md",
      "docs/modules/dialogue-timing.md",
      "docs/modules/assignment-dialogue.md",
      "docs/planning/panel-recovery-066.md"
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
        "required": false,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/architecture/OVERVIEW.md",
        "required": true,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/planning/communication-journal-growth.md",
        "required": true,
        "revision": "6c59cc5a0cfea87bf9fc225feb6dadd9c12ca9e0"
      },
      {
        "path": "docs/modules/assignment-dialogue.md",
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
      "implementation_status": "DONE",
      "commit_status": "DONE",
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
      "expected_commit_message": "feat: Опубликовать выпуск 0.6.4 на GitHub",
      "actual_files": []
    },
    {
      "id": "JOURNAL",
      "title": "Линейный рост журнала связи",
      "why": "Прогон T_003 остановился на пределе 512 МиБ файла журнала.",
      "dependencies": [],
      "functional_paths": [
        "src/execution/plugin/communication-store.mjs",
        "src/control/plugin/communication.mjs",
        "src/frontend/plugin/launch.mjs",
        "src/contracts/backend.mjs",
        "package.json",
        "package-lock.json",
        "tests/plugin-communication-store.test.mjs",
        "tests/plugin-communication.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/workflow-channel.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/communication-journal-growth.md"
      ],
      "verification_ids": [
        "sdk-recovery-targeted",
        "shared-conversation-compat"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Сжатие журнала в снимок совместимого формата: рост файла линейный, снимок читают текущий загрузчик и валидатор 0.5.41.",
        "Потоковое чтение журнала без строки размером с файл; хвост и повреждения дают прежние коды.",
        "clientEvents хранит отпечатки, не более 1024; тайминги Kit реже; диагностика после 16000 событий не останавливает прогон.",
        "Пауза повторов ожидания панели растёт до 30 с; версия 0.6.5."
      ],
      "expected_commit_message": "feat: Линейный рост журнала связи",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "cdp-startup-input",
        "task_id": "JOURNAL",
        "role": "implementation"
      },
      "actual_files": [
        "src/execution/plugin/communication-store.mjs",
        "src/control/plugin/communication.mjs",
        "src/frontend/plugin/launch.mjs",
        "src/contracts/backend.mjs",
        "package.json",
        "package-lock.json",
        "tests/plugin-communication-store.test.mjs",
        "tests/plugin-communication.test.mjs",
        "tests/workflow-channel.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "docs/planning/communication-journal-growth.md"
      ]
    },
    {
      "id": "DOCS-2",
      "title": "Актуализация всех документов проекта",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "cdp-startup-input",
        "task_id": "DOCS-2",
        "role": "implementation",
        "iteration": 2
      },
      "why": "Перед выпуском сверить README, OVERVIEW и действующие контракты модулей с результатом; обновить устаревшее.",
      "dependencies": [
        "JOURNAL"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/architecture/OVERVIEW.md",
        "docs/planning/communication-journal-growth.md",
        "README.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/dialogue-timing.md",
        "docs/modules/sdk-messaging.md",
        "docs/modules/shared-conversation.md",
        "docs/modules/current-actions.md",
        "docs/acceptance/shared-conversation-mac.md",
        "docs/modules/chat-only-startup.md",
        "docs/modules/release.md"
      ],
      "acceptance_criteria": [
        "Документы описывают текущий результат, существенное из выпущенных рабочих спецификаций перенесено в контракты модулей; история остаётся в Git."
      ],
      "verification_ids": [],
      "expected_commit_message": "docs: актуализировать документацию проекта",
      "actual_files": [
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/dialogue-timing.md",
        "docs/modules/sdk-messaging.md",
        "docs/modules/shared-conversation.md",
        "docs/modules/current-actions.md",
        "docs/acceptance/shared-conversation-mac.md",
        "docs/modules/chat-only-startup.md",
        "docs/modules/release.md",
        "docs/planning/communication-journal-growth.md"
      ]
    },
    {
      "id": "RELEASE-2",
      "title": "Собрать macOS Windows Linux 0.6.5",
      "why": "Проверенный полный комплект из одного sourceCommit.",
      "dependencies": [
        "JOURNAL",
        "DOCS-2"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/communication-journal-growth.md"
      ],
      "verification_ids": [
        "three-platform-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "Три ОС после DOCS из одного sourceCommit, семь assets, manifest/SHA/подпись подтверждены; preflight кэша Python."
      ],
      "expected_commit_message": "feat: Собрать macOS Windows Linux 0.6.5",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "cdp-startup-input",
        "task_id": "RELEASE-2",
        "role": "implementation"
      },
      "actual_files": [
        "release-manifest.json"
      ]
    },
    {
      "id": "INSTALL-2",
      "title": "Установить выпуск 0.6.5 на этот Mac",
      "why": "Поставить готовый комплект с rollback без остановки службы.",
      "dependencies": [
        "RELEASE-2",
        "DOCS-2"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/communication-journal-growth.md"
      ],
      "verification_ids": [
        "release-installed"
      ],
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Штатный installer без пересборки и переподписи; при работающей службе verified pending."
      ],
      "expected_commit_message": "feat: Установить выпуск 0.6.5 на этот Mac",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "cdp-startup-input",
        "task_id": "INSTALL-2",
        "role": "implementation"
      },
      "actual_files": []
    },
    {
      "id": "PUBLISH-2",
      "title": "Опубликовать выпуск 0.6.5 на GitHub",
      "why": "Публичная доставка и проверка remote main.",
      "dependencies": [
        "INSTALL-2",
        "DOCS-2"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/communication-journal-growth.md"
      ],
      "verification_ids": [
        "github-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "Tag равен sourceCommit, семь assets проверены, remote main подтверждён; живая проверка не объявляется пройденной."
      ],
      "expected_commit_message": "feat: Опубликовать выпуск 0.6.5 на GitHub",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "cdp-startup-input",
        "task_id": "PUBLISH-2",
        "role": "implementation"
      },
      "actual_files": []
    },
    {
      "id": "GIT-READ",
      "title": "Оркестратор получает правило отдельных проверочных Git-вызовов",
      "why": "В T_005 результат был прочитан, а составной вызов для проверки Git был отклонён. Выдавать проверенный формат в инструкциях роли при старте и чтении результата.",
      "dependencies": [],
      "functional_paths": [
        "packages/workflow-kit/src/lib/role-protocol.mjs",
        "packages/workflow-kit/package.json",
        "packages/workflow-kit/src/lib/common.mjs",
        "packages/workflow-kit/src/lib/installer.mjs",
        "package-lock.json",
        "tests/role-protocol.test.mjs",
        "tests/workflow-channel.test.mjs",
        "tests/workflow-kit-upgrade.test.mjs",
        "tests/fixtures/released-kit/manifest.json",
        "tests/fixtures/released-kit/kit-1.10.5.tar.gz"
      ],
      "documentation_paths": [
        "docs/modules/assignment-dialogue.md"
      ],
      "verification_ids": [
        "intake-instructions",
        "kit-upgrade",
        "kit-check",
        "kit-assignments"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Одна строка с !!! требует у оркестратора одну проверочную Git-команду на exec_command, отдельные cmd, абсолютный workdir и read_only: true. Команды Workflow Kit отделены.",
        "Реальный recovery для O и readMessage результата возвращают правило. Проверяется также отсутствие правила у исполнителя и сохранение приёмки перед интеграцией.",
        "Установка обновляет неизменённый Kit 1.10.5 в существующем проекте; план сохраняется, роль обновляется. Выпуск приложения не входит в задачу."
      ],
      "expected_commit_message": "feat: уточнить вызовы Git в инструкции оркестратора",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "cdp-startup-input",
        "task_id": "GIT-READ",
        "role": "implementation"
      },
      "actual_files": [
        "package-lock.json",
        "packages/workflow-kit/package.json",
        "packages/workflow-kit/src/lib/common.mjs",
        "packages/workflow-kit/src/lib/installer.mjs",
        "packages/workflow-kit/src/lib/role-protocol.mjs",
        "tests/fixtures/released-kit/kit-1.10.5.tar.gz",
        "tests/fixtures/released-kit/manifest.json",
        "tests/role-protocol.test.mjs",
        "tests/workflow-channel.test.mjs",
        "tests/workflow-kit-upgrade.test.mjs"
      ]
    },
    {
      "id": "PANEL-RECOVER",
      "title": "Восстанавливать отсутствующую панель O и E без очереди",
      "why": "Восстанавливать отсутствующую панель O и E без очереди",
      "dependencies": [],
      "functional_paths": [
        "package.json",
        "package-lock.json",
        "src/contracts/backend.mjs",
        "src/contracts/context.mjs",
        "src/execution/browser/panel-frame-attestation.mjs",
        "src/execution/browser/session-runtime.mjs",
        "src/execution/browser/chatgpt-composer.mjs",
        "src/control/plugin/panel-recovery.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/service.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/control/workflow/coordination.mjs",
        "src/backend/desktop-model.mjs",
        "tools/codex-app-server-mcp/plugin.py",
        "tools/codex-app-server-mcp/plugin-ui.html",
        "packages/workflow-kit/src/lib/role-protocol.mjs",
        "tests/workflow-kit-upgrade.test.mjs",
        "tests/role-protocol.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/chatgpt-composer.test.mjs",
        "tests/panel-frame-attestation.test.mjs",
        "tests/fixtures/panel-frame-host.mjs",
        "tests/plugin-delivery-ownership.test.mjs",
        "tests/session-runtime.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/panel-recovery-066.md"
      ],
      "verification_ids": [
        "panel-frame-attestation",
        "delivery-ownership",
        "conversation-freshness",
        "attachment-retry",
        "intake-instructions",
        "chatgpt-plugin",
        "architecture"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Три состояния: ошибка, тайм-аут, навигация и загрузка не подтверждают отсутствие. Фоновая проверка активных O/E независима от поступления сообщений.",
        "Повторная проверка того же документа, однократная адресная команда без ticket через CDP; защита черновика, занятого чата, Stop, и неизвестного Enter. Агент в своём ходе может проверить свою панель через MCP без ручных ID.",
        "Инструкция Git с !!! сохраняется. Проверки с настоящими кадрами Electron и имитатором чата выполняются без рабочего профиля."
      ],
      "expected_commit_message": "feat: восстанавливать панели оркестратора и исполнителей",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "cdp-startup-input",
        "task_id": "PANEL-RECOVER",
        "role": "implementation"
      },
      "actual_files": [
        "docs/planning/panel-recovery-066.md",
        "package-lock.json",
        "package.json",
        "packages/workflow-kit/src/lib/role-protocol.mjs",
        "src/backend/desktop-model.mjs",
        "src/contracts/backend.mjs",
        "src/contracts/context.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/panel-recovery.mjs",
        "src/control/plugin/service.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/execution/browser/chatgpt-composer.mjs",
        "src/execution/browser/panel-frame-attestation.mjs",
        "src/execution/browser/session-runtime.mjs",
        "tests/chatgpt-composer.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/fixtures/panel-frame-host.mjs",
        "tests/panel-frame-attestation.test.mjs",
        "tests/plugin-delivery-ownership.test.mjs",
        "tests/role-protocol.test.mjs",
        "tests/workflow-kit-upgrade.test.mjs",
        "tools/codex-app-server-mcp/plugin.py"
      ]
    },
    {
      "id": "DOCS-3",
      "title": "Актуализация всех документов проекта",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "cdp-startup-input",
        "task_id": "DOCS-3",
        "role": "implementation",
        "iteration": 3
      },
      "why": "Перед выпуском сверить README, OVERVIEW и действующие контракты модулей с результатом; обновить устаревшее.",
      "dependencies": [
        "GIT-READ",
        "PANEL-RECOVER"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/architecture/OVERVIEW.md",
        "docs/planning/panel-recovery-066.md"
      ],
      "acceptance_criteria": [
        "Документы описывают текущий результат, существенное из выпущенных рабочих спецификаций перенесено в контракты модулей; история остаётся в Git."
      ],
      "verification_ids": [],
      "expected_commit_message": "docs: актуализировать документацию проекта"
    },
    {
      "id": "RELEASE-3",
      "title": "Собрать Workflow Pilot 0.6.6 для трёх ОС",
      "why": "Собрать Workflow Pilot 0.6.6 для трёх ОС",
      "dependencies": [
        "PANEL-RECOVER",
        "DOCS-3"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "three-platform-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "Единый sourceCommit, macOS arm64, Windows и Linux x64, manifest, хеши и комплект Downloads."
      ],
      "expected_commit_message": "feat: Собрать Workflow Pilot 0.6.6 для трёх ОС",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "cdp-startup-input",
        "task_id": "RELEASE-3",
        "role": "implementation"
      }
    },
    {
      "id": "INSTALL-3",
      "title": "Установить проверенный комплект 0.6.6 на Mac",
      "why": "Установить проверенный комплект 0.6.6 на Mac",
      "dependencies": [
        "RELEASE-3",
        "DOCS-3"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "release-installed"
      ],
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Installer проверяет обе цели, оставляет pending при занятой службе и не обрывает активный прогон."
      ],
      "expected_commit_message": "feat: Установить проверенный комплект 0.6.6 на Mac",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "cdp-startup-input",
        "task_id": "INSTALL-3",
        "role": "implementation"
      }
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
Revision: 1404

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
- [DONE] PUBLISH: Опубликовать выпуск 0.6.4 на GitHub — Завершено
  - Git Commit: [DONE] feat: Опубликовать выпуск 0.6.4 на GitHub
  - Reference: cdp-startup-input / PUBLISH / implementation
  - Файлы: release-manifest.json
- [DONE] JOURNAL: Линейный рост журнала связи — Завершено
  - Git Commit: [DONE] feat: Линейный рост журнала связи
  - Reference: cdp-startup-input / JOURNAL / implementation
  - Файлы: src/execution/plugin/communication-store.mjs, src/control/plugin/communication.mjs, src/frontend/plugin/launch.mjs, src/contracts/backend.mjs, package.json, package-lock.json, tests/plugin-communication-store.test.mjs, tests/plugin-communication.test.mjs, tests/chatgpt-plugin.test.mjs, tests/workflow-channel.test.mjs, docs/planning/communication-journal-growth.md
- [DONE] DOCS-2: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: актуализировать документацию проекта
  - Reference: cdp-startup-input / DOCS-2 / implementation
  - Файлы: docs/architecture/OVERVIEW.md, docs/planning/communication-journal-growth.md, README.md, docs/modules/chatgpt-plugin.md, docs/modules/dialogue-timing.md, docs/modules/sdk-messaging.md, docs/modules/shared-conversation.md, docs/modules/current-actions.md, docs/acceptance/shared-conversation-mac.md, docs/modules/chat-only-startup.md, docs/modules/release.md
- [DONE] RELEASE-2: Собрать macOS Windows Linux 0.6.5 — Завершено
  - Git Commit: [DONE] feat: Собрать macOS Windows Linux 0.6.5
  - Reference: cdp-startup-input / RELEASE-2 / implementation
  - Файлы: release-manifest.json, docs/planning/communication-journal-growth.md
- [DONE] INSTALL-2: Установить выпуск 0.6.5 на этот Mac — Завершено
  - Git Commit: [DONE] feat: Установить выпуск 0.6.5 на этот Mac
  - Reference: cdp-startup-input / INSTALL-2 / implementation
  - Файлы: release-manifest.json, docs/planning/communication-journal-growth.md
- [DONE] PUBLISH-2: Опубликовать выпуск 0.6.5 на GitHub — Завершено
  - Git Commit: [DONE] feat: Опубликовать выпуск 0.6.5 на GitHub
  - Reference: cdp-startup-input / PUBLISH-2 / implementation
  - Файлы: release-manifest.json, docs/planning/communication-journal-growth.md
- [DONE] GIT-READ: Оркестратор получает правило отдельных проверочных Git-вызовов — Завершено
  - Git Commit: [DONE] feat: уточнить вызовы Git в инструкции оркестратора
  - Reference: cdp-startup-input / GIT-READ / implementation
  - Файлы: packages/workflow-kit/src/lib/role-protocol.mjs, packages/workflow-kit/package.json, packages/workflow-kit/src/lib/common.mjs, packages/workflow-kit/src/lib/installer.mjs, package-lock.json, tests/role-protocol.test.mjs, tests/workflow-channel.test.mjs, tests/workflow-kit-upgrade.test.mjs, tests/fixtures/released-kit/manifest.json, tests/fixtures/released-kit/kit-1.10.5.tar.gz, docs/modules/assignment-dialogue.md
- [DONE] PANEL-RECOVER: Восстанавливать отсутствующую панель O и E без очереди — Завершено
  - Git Commit: [DONE] feat: восстанавливать панели оркестратора и исполнителей
  - Reference: cdp-startup-input / PANEL-RECOVER / implementation
  - Файлы: package.json, package-lock.json, src/contracts/backend.mjs, src/contracts/context.mjs, src/execution/browser/panel-frame-attestation.mjs, src/execution/browser/session-runtime.mjs, src/execution/browser/chatgpt-composer.mjs, src/control/plugin/panel-recovery.mjs, src/control/plugin/communication.mjs, src/control/plugin/service.mjs, src/control/workflow/dialogue-delivery.mjs, src/control/workflow/coordination.mjs, src/backend/desktop-model.mjs, tools/codex-app-server-mcp/plugin.py, tools/codex-app-server-mcp/plugin-ui.html, packages/workflow-kit/src/lib/role-protocol.mjs, tests/workflow-kit-upgrade.test.mjs, tests/role-protocol.test.mjs, tests/chatgpt-plugin.test.mjs, tests/chatgpt-composer.test.mjs, tests/panel-frame-attestation.test.mjs, tests/fixtures/panel-frame-host.mjs, tests/plugin-delivery-ownership.test.mjs, tests/session-runtime.test.mjs, docs/planning/panel-recovery-066.md
- [TODO] DOCS-3: Актуализация всех документов проекта — Ожидает
  - Git Commit: [PENDING] docs: актуализировать документацию проекта
  - Reference: cdp-startup-input / DOCS-3 / implementation
  - Файлы: docs/architecture/OVERVIEW.md, docs/planning/panel-recovery-066.md
- [TODO] RELEASE-3: Собрать Workflow Pilot 0.6.6 для трёх ОС — Ожидает
  - Git Commit: [PENDING] feat: Собрать Workflow Pilot 0.6.6 для трёх ОС
  - Reference: cdp-startup-input / RELEASE-3 / implementation
  - Файлы: release-manifest.json
- [TODO] INSTALL-3: Установить проверенный комплект 0.6.6 на Mac — Ожидает
  - Git Commit: [PENDING] feat: Установить проверенный комплект 0.6.6 на Mac
  - Reference: cdp-startup-input / INSTALL-3 / implementation
  - Файлы: release-manifest.json

## Context Pack For This Cycle

- docs/planning/cdp-startup-input.md
- docs/modules/chat-only-startup.md
- docs/architecture/OVERVIEW.md
- docs/planning/communication-journal-growth.md
- docs/modules/assignment-dialogue.md

Служебные состояния меняются только командами workflow. Приёмка не архивирует scope.
