# Активный план — Workflow_Pilot

<!-- workflow-state:begin -->
```json
{
  "schema_version": 1,
  "plan_revision": 1440,
  "project_id": "7411e192-943c-4529-bffb-3b081d9c242f",
  "project_name": "Workflow_Pilot",
  "scope_id": "panel-inbox-068",
  "execution_scope_status": "ACTIVE",
  "delivery_status": "IN_PROGRESS",
  "objective": "Устранить остановку доставки из прогона T001 и выпустить 0.6.8.",
  "acceptance_criteria": [
    "Две совместимые работы одного адресата в очереди получают одно пробуждение и отдельное адресное чтение/подтверждение. При пополнении во время обработки следующее сообщение остаётся доступно, пропущенное чтение не считается доставкой.",
    "Конец одного хода проверяется совместно для покрытых им сообщений, по свежим наблюдениям одного документа и хода при завершённой генерации, пустом вводе и отсутствии команд. Точная служебная подсказка в хвосте не блокирует. Настоящий ввод пользователя, неизвестная страница и работающий агент сохраняют защиту.",
    "У каждого O/E в рабочем режиме один вызов панели на четвёртом ходе с последнего открытия, включая стартовый ход; обычный bootstrap сохраняется. Старый автоматический обход по отсутствию iframe и CDP-команда открытия удалены. Повторы одного хода, параллельные участники, перезагрузка и перезапуск не создают дубли. Если агент уже спит, новый вызов требует нового хода; этот предел указывается явно.",
    "T002/T003, DOCS, финализация и очистка: при подтверждённых условиях итог в интерфейсе — ожидание пользовательской приёмки, старые таймеры не подменяют текущий этап. План не архивируется автоматически.",
    "Выпуск 0.6.8, комплект трёх ОС с одним sourceCommit и штатная установка на Mac с поддержкой pending при работающей службе. Изолированные проверки отделены от живой приёмки.",
    "В CHANNEL сохранить WAL и адресацию 0.6.7, старые panel_reopen и события принимать как исторические без повторного исполнения. Сохранять назначения, активный план и подтверждения. Не начинать новый ход во время работы, ревью или ручного ввода. В уже начавшемся ходе периодическое открытие панели разрешено. Неизвестный SDK send не повторять для пробуждения группы.",
    "Нумерацию своих ходов ведёт агент в текущем диалоге; сервер сохраняет на участнике последний разрешённый периодический вызов (4, затем через 4), повтор того же хода безопасен. Открытие панели не равно её отрисовке или факту прочтения. После обновления для новых чатов действие начинается с bootstrap; старое отсутствие iframe не инициирует CDP никаких действий.",
    "Workflow Pilot 0.6.8, протокол связи 9 при совместимых адресных схемах; Kit 1.10.8 / роли 18. Сохранить реальный архив Kit 1.10.7 из sourceCommit 0.6.7 для upgrade-теста.",
    "Проверить адресное чтение накопившихся сообщений на участке result T002/T003 → DOCS → финализация. Отложенные по общему пробуждению ID возвращаются в доступную очередь при неуспехе / истечении ожидания; каждый ID требует собственной квитанции. При настоящей ручной реплике или несвежем документе не признавать работу завершённой.",
    "DOCS включает действующие контракты Pilot/Kit, удаление авто-CDP, ограничение для уже спящего агента и живую проверку пользователем. Перед тестами подготовить ресурс панели. Полные проверки через Kit, Python без кэша."
  ],
  "approved_scope": {
    "functional_paths": [
      "src/control/plugin/communication.mjs",
      "src/control/plugin/workflow-channel.mjs",
      "src/control/plugin/assignment-dialogue.mjs",
      "src/control/plugin/conversation-freshness.mjs",
      "src/control/plugin/panel-recovery.mjs",
      "src/control/plugin/service.mjs",
      "src/control/workflow/coordination.mjs",
      "src/control/workflow/dialogue-delivery.mjs",
      "src/backend/desktop-model.mjs",
      "src/contracts/dialogue-view.mjs",
      "src/contracts/backend.mjs",
      "src/frontend/plugin/launch.mjs",
      "src/execution/browser/session-runtime.mjs",
      "src/execution/browser/chatgpt-dom.mjs",
      "src/execution/browser/chatgpt-page-observer.mjs",
      "src/execution/browser/page-state.mjs",
      "packages/workflow-kit/src/lib/role-protocol.mjs",
      "packages/workflow-kit/src/lib/common.mjs",
      "packages/workflow-kit/package.json",
      "package.json",
      "package-lock.json",
      "tools/codex-app-server-mcp/plugin.py",
      "tests/plugin-delivery-ownership.test.mjs",
      "tests/workflow-channel.test.mjs",
      "tests/conversation-freshness.test.mjs",
      "tests/role-protocol.test.mjs",
      "tests/automatic-agent-dialogue.test.mjs",
      "tests/chatgpt-plugin.test.mjs",
      "release-manifest.json",
      "src/contracts/context.mjs",
      "src/contracts/workflow-wake.mjs",
      "src/control/workflow/executor-session.mjs",
      "tests/panel-frame-attestation.test.mjs",
      "tests/fixtures/panel-frame-host.mjs",
      "tests/codex-app-server-mcp.test.mjs",
      "tests/fixtures/automatic-agent-dialogue.mjs",
      "src/contracts/work-progress.mjs",
      "src/contracts/workflow-view.mjs",
      "src/frontend/plugin/panel.mjs",
      "src/frontend/desktop/ui/sidebar.mjs",
      "tests/panel-dialogue-view.test.mjs",
      "tests/sidebar.test.mjs",
      "src/control/plugin/startup-context.mjs",
      "packages/workflow-kit/src/lib/installer.mjs",
      "tests/workflow-kit-upgrade.test.mjs",
      "tests/fixtures/released-kit/manifest.json",
      "tests/fixtures/released-kit/kit-1.10.7.tar.gz",
      "tests/plugin-communication-store.test.mjs",
      "tests/shared-conversation-compat.test.mjs",
      "tests/page-state.test.mjs",
      "tests/dialogue-delivery.test.mjs",
      "tests/work-progress-scenario.test.mjs",
      "tests/work-progress.test.mjs",
      "src/control/plugin/context-files.mjs",
      "packages/workflow-kit/src/lib/plan.mjs",
      "packages/workflow-kit/src/lib/prepared-task.mjs",
      "packages/workflow-kit/src/schemas/plan.schema.json",
      "tests/startup-context.test.mjs",
      "tests/fixtures/released-kit/kit-1.10.8.tar.gz",
      "src/contracts/startup-view.mjs",
      "src/control/context/context-session.mjs",
      "src/execution/browser/chatgpt-composer.mjs",
      "tests/chatgpt-composer.test.mjs",
      "tests/fixtures/plugin-host.mjs",
      "tests/prepared-task-flow.test.mjs"
    ],
    "documentation_paths": [
      "docs/planning/panel-inbox-068.md",
      "README.md",
      "docs/modules/sdk-messaging.md",
      "docs/modules/current-actions.md",
      "docs/modules/release.md",
      "docs/modules/chatgpt-plugin.md",
      "docs/modules/shared-conversation.md",
      "docs/architecture/OVERVIEW.md",
      "docs/acceptance/shared-conversation-mac.md",
      "docs/modules/assignment-dialogue.md",
      "docs/modules/dialogue-timing.md",
      "docs/modules/user-choice.md",
      "docs/modules/project-compatibility.md",
      "docs/modules/chat-only-startup.md",
      "packages/workflow-kit/README.md",
      "packages/workflow-kit/docs/modules/workflow-kit-package.md",
      "packages/workflow-kit/docs/modules/orchestrated-plans.md",
      "packages/workflow-kit/src/templates/PLAN.md"
    ]
  },
  "baseline_commit": "831d91090f00ac5110d8c561d6c3aa2fcb7aed67",
  "current_task_id": null,
  "context_pack": {
    "documents": [
      {
        "path": "docs/planning/panel-inbox-068.md",
        "required": true,
        "revision": "04f081bea33c914b29d936dd2b023c0923949c82"
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
        "scope_id": "panel-inbox-068",
        "task_id": "CHANNEL",
        "role": "implementation"
      },
      "dependencies": [],
      "functional_paths": [
        "src/control/plugin/communication.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/control/plugin/assignment-dialogue.mjs",
        "src/control/plugin/conversation-freshness.mjs",
        "src/control/plugin/panel-recovery.mjs",
        "src/control/plugin/service.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/backend/desktop-model.mjs",
        "src/contracts/dialogue-view.mjs",
        "src/contracts/backend.mjs",
        "src/frontend/plugin/launch.mjs",
        "src/execution/browser/session-runtime.mjs",
        "src/execution/browser/chatgpt-dom.mjs",
        "src/execution/browser/chatgpt-page-observer.mjs",
        "src/execution/browser/page-state.mjs",
        "packages/workflow-kit/src/lib/role-protocol.mjs",
        "packages/workflow-kit/src/lib/common.mjs",
        "packages/workflow-kit/package.json",
        "package.json",
        "package-lock.json",
        "tools/codex-app-server-mcp/plugin.py",
        "tests/plugin-delivery-ownership.test.mjs",
        "tests/workflow-channel.test.mjs",
        "tests/conversation-freshness.test.mjs",
        "tests/role-protocol.test.mjs",
        "tests/automatic-agent-dialogue.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "src/contracts/context.mjs",
        "src/contracts/workflow-wake.mjs",
        "src/control/workflow/executor-session.mjs",
        "tests/panel-frame-attestation.test.mjs",
        "tests/fixtures/panel-frame-host.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "src/contracts/work-progress.mjs",
        "src/contracts/workflow-view.mjs",
        "src/frontend/plugin/panel.mjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "tests/panel-dialogue-view.test.mjs",
        "tests/sidebar.test.mjs",
        "src/control/plugin/startup-context.mjs",
        "packages/workflow-kit/src/lib/installer.mjs",
        "tests/workflow-kit-upgrade.test.mjs",
        "tests/fixtures/released-kit/manifest.json",
        "tests/fixtures/released-kit/kit-1.10.7.tar.gz",
        "tests/plugin-communication-store.test.mjs",
        "tests/shared-conversation-compat.test.mjs",
        "tests/page-state.test.mjs",
        "tests/dialogue-delivery.test.mjs",
        "tests/work-progress-scenario.test.mjs",
        "tests/work-progress.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "electron-smoke",
        "architecture",
        "kit-check",
        "kit-assignments"
      ],
      "id": "CHANNEL",
      "title": "Исправить доставку входящих и периодическое открытие панели",
      "why": "Единый проверяемый цикл от открытия карточки до завершения плана",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Две совместимые работы одного адресата в очереди получают одно пробуждение и отдельное адресное чтение/подтверждение. При пополнении во время обработки следующее сообщение остаётся доступно, пропущенное чтение не считается доставкой.",
        "Конец одного хода проверяется совместно для покрытых им сообщений, по свежим наблюдениям одного документа и хода при завершённой генерации, пустом вводе и отсутствии команд. Точная служебная подсказка в хвосте не блокирует. Настоящий ввод пользователя, неизвестная страница и работающий агент сохраняют защиту.",
        "У каждого O/E в рабочем режиме один вызов панели на четвёртом ходе с последнего открытия, включая стартовый ход; обычный bootstrap сохраняется. Старый автоматический обход по отсутствию iframe и CDP-команда открытия удалены. Повторы одного хода, параллельные участники, перезагрузка и перезапуск не создают дубли. Если агент уже спит, новый вызов требует нового хода; этот предел указывается явно.",
        "T002/T003, DOCS, финализация и очистка: при подтверждённых условиях итог в интерфейсе — ожидание пользовательской приёмки, старые таймеры не подменяют текущий этап. План не архивируется автоматически.",
        "В CHANNEL сохранить WAL и адресацию 0.6.7, старые panel_reopen и события принимать как исторические без повторного исполнения. Сохранять назначения, активный план и подтверждения. Не начинать новый ход во время работы, ревью или ручного ввода. В уже начавшемся ходе периодическое открытие панели разрешено. Неизвестный SDK send не повторять для пробуждения группы.",
        "Нумерацию своих ходов ведёт агент в текущем диалоге; сервер сохраняет на участнике последний разрешённый периодический вызов (4, затем через 4), повтор того же хода безопасен. Открытие панели не равно её отрисовке или факту прочтения. После обновления для новых чатов действие начинается с bootstrap; старое отсутствие iframe не инициирует CDP никаких действий.",
        "Workflow Pilot 0.6.8, протокол связи 9 при совместимых адресных схемах; Kit 1.10.8 / роли 18. Сохранить реальный архив Kit 1.10.7 из sourceCommit 0.6.7 для upgrade-теста.",
        "Проверить адресное чтение накопившихся сообщений на участке result T002/T003 → DOCS → финализация. Отложенные по общему пробуждению ID возвращаются в доступную очередь при неуспехе / истечении ожидания; каждый ID требует собственной квитанции. При настоящей ручной реплике или несвежем документе не признавать работу завершённой."
      ],
      "expected_commit_message": "feat: Исправить доставку входящих и периодическое открытие панели",
      "task_brief": "Единый проверяемый цикл от открытия карточки до завершения плана\nДве совместимые работы одного адресата в очереди получают одно пробуждение и отдельное адресное чтение/подтверждение. При пополнении во время обработки следующее сообщение остаётся доступно, пропущенное чтение не считается доставкой.\nКонец одного хода проверяется совместно для покрытых им сообщений, по свежим наблюдениям одного документа и хода при завершённой генерации, пустом вводе и отсутствии команд. Точная служебная подсказка в хвосте не блокирует. Настоящий ввод пользователя, неизвестная страница и работающий агент сохраняют защиту.\nУ каждого O/E в рабочем режиме один вызов панели на четвёртом ходе с последнего открытия, включая стартовый ход; обычный bootstrap сохраняется. Старый автоматический обход по отсутствию iframe и CDP-команда открытия удалены. Повторы одного хода, параллельные участники, перезагрузка и перезапуск не создают дубли. Если агент уже спит, новый вызов требует нового хода; этот предел указывается явно.\nT002/T003, DOCS, финализация и очистка: при подтверждённых условиях итог в интерфейсе — ожидание пользовательской приёмки, старые таймеры не подменяют текущий этап. План не архивируется автоматически.\nВ CHANNEL сохранить WAL и адресацию 0.6.7, старые panel_reopen и события принимать как исторические без повторного исполнения. Сохранять назначения, активный план и подтверждения. Не начинать новый ход во время работы, ревью или ручного ввода. В уже начавшемся ходе периодическое открытие панели разрешено. Неизвестный SDK send не повторять для пробуждения группы.\nНумерацию своих ходов ведёт агент в текущем диалоге; сервер сохраняет на участнике последний разрешённый периодический вызов (4, затем через 4), повтор того же хода безопасен. Открытие панели не равно её отрисовке или факту прочтения. После обновления для новых чатов действие начинается с bootstrap; старое отсутствие iframe не инициирует CDP никаких действий.\nWorkflow Pilot 0.6.8, протокол связи 9 при совместимых адресных схемах; Kit 1.10.8 / роли 18. Сохранить реальный архив Kit 1.10.7 из sourceCommit 0.6.7 для upgrade-теста.\nПроверить адресное чтение накопившихся сообщений на участке result T002/T003 → DOCS → финализация. Отложенные по общему пробуждению ID возвращаются в доступную очередь при неуспехе / истечении ожидания; каждый ID требует собственной квитанции. При настоящей ручной реплике или несвежем документе не признавать работу завершённой.\nDOCS включает действующие контракты Pilot/Kit, удаление авто-CDP, ограничение для уже спящего агента и живую проверку пользователем. Перед тестами подготовить ресурс панели. Полные проверки через Kit, Python без кэша.",
      "parallel_safe": false,
      "actual_files": [
        "package-lock.json",
        "package.json",
        "packages/workflow-kit/package.json",
        "packages/workflow-kit/src/lib/common.mjs",
        "packages/workflow-kit/src/lib/installer.mjs",
        "packages/workflow-kit/src/lib/role-protocol.mjs",
        "src/backend/desktop-model.mjs",
        "src/contracts/backend.mjs",
        "src/contracts/context.mjs",
        "src/contracts/dialogue-view.mjs",
        "src/contracts/workflow-wake.mjs",
        "src/control/plugin/assignment-dialogue.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/panel-recovery.mjs",
        "src/control/plugin/service.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/control/workflow/executor-session.mjs",
        "src/execution/browser/chatgpt-dom.mjs",
        "src/execution/browser/chatgpt-page-observer.mjs",
        "src/execution/browser/page-state.mjs",
        "src/execution/browser/session-runtime.mjs",
        "src/frontend/plugin/launch.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/conversation-freshness.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/fixtures/panel-frame-host.mjs",
        "tests/fixtures/released-kit/kit-1.10.7.tar.gz",
        "tests/fixtures/released-kit/manifest.json",
        "tests/page-state.test.mjs",
        "tests/panel-dialogue-view.test.mjs",
        "tests/panel-frame-attestation.test.mjs",
        "tests/plugin-delivery-ownership.test.mjs",
        "tests/role-protocol.test.mjs",
        "tests/workflow-channel.test.mjs",
        "tests/workflow-kit-upgrade.test.mjs",
        "tools/codex-app-server-mcp/plugin.py"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "panel-inbox-068",
        "task_id": "DOCS",
        "role": "implementation"
      },
      "dependencies": [
        "CHANNEL"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "README.md",
        "docs/modules/sdk-messaging.md",
        "docs/modules/current-actions.md",
        "docs/modules/release.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/shared-conversation.md",
        "docs/architecture/OVERVIEW.md",
        "docs/planning/panel-inbox-068.md",
        "docs/acceptance/shared-conversation-mac.md",
        "docs/modules/assignment-dialogue.md",
        "docs/modules/dialogue-timing.md",
        "docs/modules/user-choice.md",
        "docs/modules/project-compatibility.md",
        "docs/modules/chat-only-startup.md",
        "packages/workflow-kit/README.md",
        "packages/workflow-kit/docs/modules/workflow-kit-package.md",
        "packages/workflow-kit/docs/modules/orchestrated-plans.md"
      ],
      "verification_ids": [],
      "id": "DOCS",
      "title": "Актуализация всех документов проекта",
      "why": "Синхронизировать документацию с реализованным поведением",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Описаны периодичность, очередь, условия приёмки и ограничения iPad",
        "DOCS включает действующие контракты Pilot/Kit, удаление авто-CDP, ограничение для уже спящего агента и живую проверку пользователем. Перед тестами подготовить ресурс панели. Полные проверки через Kit, Python без кэша."
      ],
      "expected_commit_message": "docs: Актуализировать контракты выпуска 0.6.8",
      "task_brief": "Синхронизировать документацию с реализованным поведением\nОписаны периодичность, очередь, условия приёмки и ограничения iPad\nDOCS включает действующие контракты Pilot/Kit, удаление авто-CDP, ограничение для уже спящего агента и живую проверку пользователем. Перед тестами подготовить ресурс панели. Полные проверки через Kit, Python без кэша.",
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
        "docs/modules/project-compatibility.md",
        "docs/modules/release.md",
        "docs/modules/sdk-messaging.md",
        "docs/modules/shared-conversation.md",
        "docs/modules/user-choice.md",
        "docs/planning/panel-inbox-068.md",
        "packages/workflow-kit/README.md",
        "packages/workflow-kit/docs/modules/orchestrated-plans.md",
        "packages/workflow-kit/docs/modules/workflow-kit-package.md"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "panel-inbox-068",
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
      "title": "Собрать выпуск 0.6.8 для трёх платформ",
      "why": "Выдать проверенный комплект",
      "verification_kind": "package",
      "acceptance_criteria": [
        "Выпуск 0.6.8, комплект трёх ОС с одним sourceCommit и штатная установка на Mac с поддержкой pending при работающей службе. Изолированные проверки отделены от живой приёмки."
      ],
      "expected_commit_message": "feat: Собрать выпуск 0.6.8 для трёх платформ",
      "task_brief": "Выдать проверенный комплект\nВыпуск 0.6.8, комплект трёх ОС с одним sourceCommit и штатная установка на Mac с поддержкой pending при работающей службе. Изолированные проверки отделены от живой приёмки.",
      "parallel_safe": false,
      "actual_files": [
        "release-manifest.json"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "panel-inbox-068",
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
      "title": "Установить комплект 0.6.8 на Mac",
      "why": "Проверить готовую копию и учесть запущенную службу",
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Установлена или подготовлена к замене проверенная сборка"
      ],
      "expected_commit_message": "feat: Установить комплект 0.6.8 на Mac",
      "task_brief": "Проверить готовую копию и учесть запущенную службу\nУстановлена или подготовлена к замене проверенная сборка",
      "parallel_safe": false,
      "actual_files": []
    },
    {
      "id": "BUNDLE",
      "title": "Выдавать весь Markdown-контекст в одном ответе панели или чтения задания",
      "why": "Выдавать весь Markdown-контекст в одном ответе панели или чтения задания",
      "dependencies": [],
      "functional_paths": [
        "src/control/plugin/startup-context.mjs",
        "src/control/plugin/context-files.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/control/plugin/service.mjs",
        "src/contracts/context.mjs",
        "src/contracts/backend.mjs",
        "tools/codex-app-server-mcp/plugin.py",
        "src/backend/desktop-model.mjs",
        "packages/workflow-kit/src/lib/role-protocol.mjs",
        "packages/workflow-kit/src/lib/plan.mjs",
        "packages/workflow-kit/src/lib/prepared-task.mjs",
        "packages/workflow-kit/src/schemas/plan.schema.json",
        "packages/workflow-kit/src/lib/common.mjs",
        "packages/workflow-kit/src/lib/installer.mjs",
        "packages/workflow-kit/package.json",
        "package.json",
        "package-lock.json",
        "tests/startup-context.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/workflow-kit-upgrade.test.mjs",
        "tests/fixtures/released-kit/manifest.json",
        "tests/fixtures/released-kit/kit-1.10.8.tar.gz",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "src/contracts/startup-view.mjs",
        "src/control/context/context-session.mjs",
        "src/control/plugin/assignment-dialogue.mjs",
        "src/execution/browser/chatgpt-composer.mjs",
        "tests/chatgpt-composer.test.mjs",
        "tests/fixtures/plugin-host.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "tests/prepared-task-flow.test.mjs",
        "tests/role-protocol.test.mjs"
      ],
      "documentation_paths": [
        "packages/workflow-kit/src/templates/PLAN.md"
      ],
      "verification_ids": [
        "unit-all",
        "electron-smoke",
        "kit-check",
        "kit-assignments",
        "architecture"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Новая O/E/S-сессия и подтверждённое рабочее поручение используют штатные инструменты и роли. Для одного авторского текста и зависимостей Pilot формирует пронумерованные UTF-8 файлы не более 24 000 байт, возвращает весь комплект один раз за вызов, исключает дублирование большого текста в JSON. Одна итоговая квитанция старта, отдельное исполнение разрешённого рабочего задания. Реальный хост и отсутствие обрезки проверяет пользователь на новом релизе.",
        "Свежий адресат, все файлы и исходный текст проверяются. Пропущенная часть не подтверждает старт. Повтор чтения, частичный прежний старт и предыдущий комплект для отката сохраняются. Проверить фактический публичный MCP для старта/рабочего сообщения, границу UTF-8, большой авторский Markdown и неизменность подготовленных источников.",
        "Сборка 0.6.9 через обычные panel/read_message, публичный MCP и запуск с контекстом 5×24 kB. Получатель подтверждает конечные метки целиком. Неполное чтение блокирует подтверждение. Проверить совместимость с черновиком 0.6.8.",
        "Подтверждение уже выданного S-снимка после смены ревизии и перезапуска проверено на долговечном журнале.",
        "План и Review сохраняют один авторский Markdown длиннее 24 000 байт, лимит UTF-8 и дайджест проверяются раздельно."
      ],
      "expected_commit_message": "feat: Выдавать весь Markdown-контекст в одном ответе панели или чтения задания",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "panel-inbox-068",
        "task_id": "BUNDLE",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "package-lock.json",
        "package.json",
        "packages/workflow-kit/package.json",
        "packages/workflow-kit/src/lib/common.mjs",
        "packages/workflow-kit/src/lib/installer.mjs",
        "packages/workflow-kit/src/lib/plan.mjs",
        "packages/workflow-kit/src/lib/prepared-task.mjs",
        "packages/workflow-kit/src/lib/role-protocol.mjs",
        "packages/workflow-kit/src/schemas/plan.schema.json",
        "packages/workflow-kit/src/templates/PLAN.md",
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
        "tests/chatgpt-composer.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/fixtures/plugin-host.mjs",
        "tests/fixtures/released-kit/kit-1.10.8.tar.gz",
        "tests/fixtures/released-kit/manifest.json",
        "tests/prepared-task-flow.test.mjs",
        "tests/role-protocol.test.mjs",
        "tests/startup-context.test.mjs",
        "tests/workflow-kit-upgrade.test.mjs",
        "tools/codex-app-server-mcp/plugin.py"
      ]
    },
    {
      "id": "DOCS-2",
      "title": "Актуализация всех документов проекта",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "panel-inbox-068",
        "task_id": "DOCS-2",
        "role": "implementation",
        "iteration": 2
      },
      "why": "Перед выпуском сверить README, OVERVIEW и действующие контракты модулей с результатом; обновить устаревшее.",
      "dependencies": [
        "BUNDLE"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/architecture/OVERVIEW.md",
        "packages/workflow-kit/src/templates/PLAN.md"
      ],
      "acceptance_criteria": [
        "Документы описывают текущий результат, существенное из выпущенных рабочих спецификаций перенесено в контракты модулей; история остаётся в Git."
      ],
      "verification_ids": [],
      "expected_commit_message": "docs: актуализировать документацию проекта",
      "parallel_safe": false
    },
    {
      "id": "RELEASE-2",
      "title": "Собрать комплект Workflow Pilot 0.6.9 для трёх платформ",
      "why": "Собрать комплект Workflow Pilot 0.6.9 для трёх платформ",
      "dependencies": [
        "BUNDLE",
        "DOCS-2"
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
        "Собрать комплект Workflow Pilot 0.6.9 для трёх платформ"
      ],
      "expected_commit_message": "feat: Собрать комплект Workflow Pilot 0.6.9 для трёх платформ",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "panel-inbox-068",
        "task_id": "RELEASE-2",
        "role": "implementation"
      },
      "parallel_safe": false
    },
    {
      "id": "INSTALL-2",
      "title": "Установить проверенный комплект 0.6.9 с возможностью отката",
      "why": "Установить проверенный комплект 0.6.9 с возможностью отката",
      "dependencies": [
        "RELEASE-2",
        "DOCS-2"
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
        "Установить проверенный комплект 0.6.9 с возможностью отката"
      ],
      "expected_commit_message": "feat: Установить проверенный комплект 0.6.9 с возможностью отката",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "panel-inbox-068",
        "task_id": "INSTALL-2",
        "role": "implementation"
      },
      "parallel_safe": false
    }
  ],
  "blocked_reason": null,
  "user_decisions": [
    {
      "id": "8cafb21e-7ec3-4ce7-8288-ba7bbb4b369a",
      "text": "Пользователь поручил самостоятельно исправить согласованные проблемы, заменить старый механизм панели и собрать релиз.",
      "recorded_at": "2026-11-01T08:56:10.579Z"
    }
  ],
  "scope_title": "Доставка и обновление панели Workflow Pilot 0.6.8",
  "parallel_allowed": false,
  "max_workers": 1,
  "execution_strategy": "sequential",
  "execution_reason": "Общие контракты панели и очереди, реализация напрямую в текущем checkout, затем последовательный выпуск."
}
```
<!-- workflow-state:end -->

## Состояние

Execution Scope Status: ACTIVE
Delivery Status: IN_PROGRESS
Scope: panel-inbox-068
Current Task: нет
Revision: 1440

## Цель

Устранить остановку доставки из прогона T001 и выпустить 0.6.8.

## Критерии приёмки

- Две совместимые работы одного адресата в очереди получают одно пробуждение и отдельное адресное чтение/подтверждение. При пополнении во время обработки следующее сообщение остаётся доступно, пропущенное чтение не считается доставкой.
- Конец одного хода проверяется совместно для покрытых им сообщений, по свежим наблюдениям одного документа и хода при завершённой генерации, пустом вводе и отсутствии команд. Точная служебная подсказка в хвосте не блокирует. Настоящий ввод пользователя, неизвестная страница и работающий агент сохраняют защиту.
- У каждого O/E в рабочем режиме один вызов панели на четвёртом ходе с последнего открытия, включая стартовый ход; обычный bootstrap сохраняется. Старый автоматический обход по отсутствию iframe и CDP-команда открытия удалены. Повторы одного хода, параллельные участники, перезагрузка и перезапуск не создают дубли. Если агент уже спит, новый вызов требует нового хода; этот предел указывается явно.
- T002/T003, DOCS, финализация и очистка: при подтверждённых условиях итог в интерфейсе — ожидание пользовательской приёмки, старые таймеры не подменяют текущий этап. План не архивируется автоматически.
- Выпуск 0.6.8, комплект трёх ОС с одним sourceCommit и штатная установка на Mac с поддержкой pending при работающей службе. Изолированные проверки отделены от живой приёмки.
- В CHANNEL сохранить WAL и адресацию 0.6.7, старые panel_reopen и события принимать как исторические без повторного исполнения. Сохранять назначения, активный план и подтверждения. Не начинать новый ход во время работы, ревью или ручного ввода. В уже начавшемся ходе периодическое открытие панели разрешено. Неизвестный SDK send не повторять для пробуждения группы.
- Нумерацию своих ходов ведёт агент в текущем диалоге; сервер сохраняет на участнике последний разрешённый периодический вызов (4, затем через 4), повтор того же хода безопасен. Открытие панели не равно её отрисовке или факту прочтения. После обновления для новых чатов действие начинается с bootstrap; старое отсутствие iframe не инициирует CDP никаких действий.
- Workflow Pilot 0.6.8, протокол связи 9 при совместимых адресных схемах; Kit 1.10.8 / роли 18. Сохранить реальный архив Kit 1.10.7 из sourceCommit 0.6.7 для upgrade-теста.
- Проверить адресное чтение накопившихся сообщений на участке result T002/T003 → DOCS → финализация. Отложенные по общему пробуждению ID возвращаются в доступную очередь при неуспехе / истечении ожидания; каждый ID требует собственной квитанции. При настоящей ручной реплике или несвежем документе не признавать работу завершённой.
- DOCS включает действующие контракты Pilot/Kit, удаление авто-CDP, ограничение для уже спящего агента и живую проверку пользователем. Перед тестами подготовить ресурс панели. Полные проверки через Kit, Python без кэша.

## Микрозадачи

Выполнение: sequential; разрешено: false; лимит: 1
Причина: Общие контракты панели и очереди, реализация напрямую в текущем checkout, затем последовательный выпуск.

- [DONE] CHANNEL: Исправить доставку входящих и периодическое открытие панели — Завершено
  - Git Commit: [DONE] feat: Исправить доставку входящих и периодическое открытие панели
  - Reference: panel-inbox-068 / CHANNEL / implementation
  - Файлы: src/control/plugin/communication.mjs, src/control/plugin/workflow-channel.mjs, src/control/plugin/assignment-dialogue.mjs, src/control/plugin/conversation-freshness.mjs, src/control/plugin/panel-recovery.mjs, src/control/plugin/service.mjs, src/control/workflow/coordination.mjs, src/control/workflow/dialogue-delivery.mjs, src/backend/desktop-model.mjs, src/contracts/dialogue-view.mjs, src/contracts/backend.mjs, src/frontend/plugin/launch.mjs, src/execution/browser/session-runtime.mjs, src/execution/browser/chatgpt-dom.mjs, src/execution/browser/chatgpt-page-observer.mjs, src/execution/browser/page-state.mjs, packages/workflow-kit/src/lib/role-protocol.mjs, packages/workflow-kit/src/lib/common.mjs, packages/workflow-kit/package.json, package.json, package-lock.json, tools/codex-app-server-mcp/plugin.py, tests/plugin-delivery-ownership.test.mjs, tests/workflow-channel.test.mjs, tests/conversation-freshness.test.mjs, tests/role-protocol.test.mjs, tests/automatic-agent-dialogue.test.mjs, tests/chatgpt-plugin.test.mjs, src/contracts/context.mjs, src/contracts/workflow-wake.mjs, src/control/workflow/executor-session.mjs, tests/panel-frame-attestation.test.mjs, tests/fixtures/panel-frame-host.mjs, tests/codex-app-server-mcp.test.mjs, tests/fixtures/automatic-agent-dialogue.mjs, src/contracts/work-progress.mjs, src/contracts/workflow-view.mjs, src/frontend/plugin/panel.mjs, src/frontend/desktop/ui/sidebar.mjs, tests/panel-dialogue-view.test.mjs, tests/sidebar.test.mjs, src/control/plugin/startup-context.mjs, packages/workflow-kit/src/lib/installer.mjs, tests/workflow-kit-upgrade.test.mjs, tests/fixtures/released-kit/manifest.json, tests/fixtures/released-kit/kit-1.10.7.tar.gz, tests/plugin-communication-store.test.mjs, tests/shared-conversation-compat.test.mjs, tests/page-state.test.mjs, tests/dialogue-delivery.test.mjs, tests/work-progress-scenario.test.mjs, tests/work-progress.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] DOCS: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: Актуализировать контракты выпуска 0.6.8
  - Reference: panel-inbox-068 / DOCS / implementation
  - Файлы: README.md, docs/modules/sdk-messaging.md, docs/modules/current-actions.md, docs/modules/release.md, docs/modules/chatgpt-plugin.md, docs/modules/shared-conversation.md, docs/architecture/OVERVIEW.md, docs/planning/panel-inbox-068.md, docs/acceptance/shared-conversation-mac.md, docs/modules/assignment-dialogue.md, docs/modules/dialogue-timing.md, docs/modules/user-choice.md, docs/modules/project-compatibility.md, docs/modules/chat-only-startup.md, packages/workflow-kit/README.md, packages/workflow-kit/docs/modules/workflow-kit-package.md, packages/workflow-kit/docs/modules/orchestrated-plans.md
  - Параллельность: исключительное выполнение
  - Зависимости: CHANNEL
- [DONE] RELEASE: Собрать выпуск 0.6.8 для трёх платформ — Завершено
  - Git Commit: [DONE] feat: Собрать выпуск 0.6.8 для трёх платформ
  - Reference: panel-inbox-068 / RELEASE / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: DOCS
- [DONE] INSTALL: Установить комплект 0.6.8 на Mac — Завершено
  - Git Commit: [DONE] feat: Установить комплект 0.6.8 на Mac
  - Reference: panel-inbox-068 / INSTALL / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: RELEASE, DOCS
- [DONE] BUNDLE: Выдавать весь Markdown-контекст в одном ответе панели или чтения задания — Завершено
  - Git Commit: [DONE] feat: Выдавать весь Markdown-контекст в одном ответе панели или чтения задания
  - Reference: panel-inbox-068 / BUNDLE / implementation
  - Файлы: src/control/plugin/startup-context.mjs, src/control/plugin/context-files.mjs, src/control/plugin/communication.mjs, src/control/plugin/workflow-channel.mjs, src/control/plugin/service.mjs, src/contracts/context.mjs, src/contracts/backend.mjs, tools/codex-app-server-mcp/plugin.py, src/backend/desktop-model.mjs, packages/workflow-kit/src/lib/role-protocol.mjs, packages/workflow-kit/src/lib/plan.mjs, packages/workflow-kit/src/lib/prepared-task.mjs, packages/workflow-kit/src/schemas/plan.schema.json, packages/workflow-kit/src/lib/common.mjs, packages/workflow-kit/src/lib/installer.mjs, packages/workflow-kit/package.json, package.json, package-lock.json, tests/startup-context.test.mjs, tests/chatgpt-plugin.test.mjs, tests/workflow-kit-upgrade.test.mjs, tests/fixtures/released-kit/manifest.json, tests/fixtures/released-kit/kit-1.10.8.tar.gz, tests/fixtures/automatic-agent-dialogue.mjs, src/contracts/startup-view.mjs, src/control/context/context-session.mjs, src/control/plugin/assignment-dialogue.mjs, src/execution/browser/chatgpt-composer.mjs, tests/chatgpt-composer.test.mjs, tests/fixtures/plugin-host.mjs, src/control/workflow/dialogue-delivery.mjs, tests/prepared-task-flow.test.mjs, tests/role-protocol.test.mjs, packages/workflow-kit/src/templates/PLAN.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [TODO] DOCS-2: Актуализация всех документов проекта — Ожидает
  - Git Commit: [PENDING] docs: актуализировать документацию проекта
  - Reference: panel-inbox-068 / DOCS-2 / implementation
  - Файлы: docs/architecture/OVERVIEW.md, packages/workflow-kit/src/templates/PLAN.md
  - Параллельность: исключительное выполнение
  - Зависимости: BUNDLE
- [TODO] RELEASE-2: Собрать комплект Workflow Pilot 0.6.9 для трёх платформ — Ожидает
  - Git Commit: [PENDING] feat: Собрать комплект Workflow Pilot 0.6.9 для трёх платформ
  - Reference: panel-inbox-068 / RELEASE-2 / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: BUNDLE, DOCS-2
- [TODO] INSTALL-2: Установить проверенный комплект 0.6.9 с возможностью отката — Ожидает
  - Git Commit: [PENDING] feat: Установить проверенный комплект 0.6.9 с возможностью отката
  - Reference: panel-inbox-068 / INSTALL-2 / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: RELEASE-2, DOCS-2

## Context Pack For This Cycle

- docs/planning/panel-inbox-068.md
- docs/architecture/OVERVIEW.md

Служебные состояния меняются только командами workflow. Приёмка не архивирует scope.
