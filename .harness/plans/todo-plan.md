# Активный план — Workflow_Pilot

<!-- workflow-state:begin -->
```json
{
  "schema_version": 1,
  "plan_revision": 1154,
  "project_id": "7411e192-943c-4529-bffb-3b081d9c242f",
  "project_name": "Workflow_Pilot",
  "scope_id": "release-0534-defects",
  "execution_scope_status": "ACTIVE",
  "delivery_status": "IN_PROGRESS",
  "objective": "Устранить семь замечаний тестирования 0.5.34: убрать дублирующую кнопку, согласовать Review и восстановить доставку результатов оркестратору.",
  "acceptance_criteria": [
    "Все семь UI001/REVIEW001–003/EXEC001–002/STATUS001 перенесены в критерии и проверки без потерь; UI-CONTROLS первый.",
    "Выбор до публикации без user bubble не блокирует два result после Start; E подключаются без ложного RECIPIENT; реальные identity/UNKNOWN/pause барьеры сохранены.",
    "Событие Review ON/OFF сразу записывается в существующий адресный канал; агент читает актуальное решение, которое не разрешает реализацию.",
    "Фактический Review/раунды/отзывы/позиция/публикация видны в основной панели и долговечной истории; нет дубля sidebar или выдуманного события.",
    "Один понятный current status показывает настоящую причину ожидания, нужное внимание и полную инструкцию; технические receipts находятся в диагностике.",
    "Изолированный доплановый цикл и назначенные checks, включая обе части Kit, подтверждены; live/native pending отделены от собственных доказательств RELEASE/INSTALL/PUBLISH."
  ],
  "approved_scope": {
    "functional_paths": [
      "src/frontend/desktop/ui/sidebar.mjs",
      "src/frontend/desktop/ui/index.html",
      "src/frontend/desktop/preload.cjs",
      "src/frontend/desktop/application.mjs",
      "src/frontend/desktop/client.mjs",
      "src/frontend/desktop/browser-host.mjs",
      "src/frontend/web/app.mjs",
      "src/frontend/web/index.html",
      "src/contracts/desktop.mjs",
      "tests/sidebar.test.mjs",
      "tests/electron-smoke.mjs",
      "tests/web-client-electron.test.mjs",
      "tests/desktop-boundaries.test.mjs",
      "tests/work-progress-scenario.test.mjs",
      "tests/parallel-execution-ui.test.mjs",
      "src/control/plugin/workflow-channel.mjs",
      "src/control/plugin/communication.mjs",
      "src/control/plugin/assignment-dialogue.mjs",
      "src/control/workflow/dialogue-delivery.mjs",
      "src/frontend/plugin/launch.mjs",
      "tests/workflow-channel.test.mjs",
      "tests/automatic-agent-dialogue.test.mjs",
      "tests/fixtures/automatic-agent-dialogue.mjs",
      "tests/chatgpt-plugin.test.mjs",
      "src/control/workflow/coordination.mjs",
      "src/control/workflow/parallel-execution.mjs",
      "src/control/plugin/enrollment.mjs",
      "tests/prepared-task-flow.test.mjs",
      "tests/dialogue-delivery.test.mjs",
      "tests/parallel-execution-recovery.test.mjs",
      "src/control/workflow/plan-review.mjs",
      "src/control/workflow/review-continuation.mjs",
      "src/control/plugin/startup-context.mjs",
      "src/control/context/context-session.mjs",
      "src/contracts/plugin-communication.mjs",
      "packages/workflow-kit/src/lib/role-protocol.mjs",
      "packages/workflow-kit/src/lib/review-state.mjs",
      "tools/codex-app-server-mcp/plugin.py",
      "tests/plan-review.test.mjs",
      "tests/startup-context.test.mjs",
      "src/backend/desktop-model.mjs",
      "tests/backend-desktop-model.test.mjs",
      "src/control/workflow/plan-monitor.mjs",
      "src/contracts/work-progress.mjs",
      "src/frontend/plugin/panel.mjs",
      "packages/workflow-kit/src/lib/plan-review.mjs",
      "packages/workflow-kit/src/lib/claude-review.mjs",
      "packages/workflow-kit/scripts/check-plan-review-fixture.mjs",
      "tests/work-progress.test.mjs",
      "tests/panel-dialogue-view.test.mjs",
      "src/execution/files/project-input-watch.mjs",
      "src/contracts/dialogue-view.mjs",
      "src/frontend/desktop/ui/current-actions.mjs",
      "tests/fixtures/current-actions-layout.mjs",
      "tests/backend-api.test.mjs",
      "package.json",
      "package-lock.json",
      "packages/workflow-kit/package.json",
      "packages/workflow-kit/src/lib/common.mjs",
      "src/contracts/backend.mjs",
      "tests/codex-app-server-mcp.test.mjs",
      "tests/migration-compatibility.test.mjs",
      "release-manifest.json",
      "packages/workflow-kit/src/lib/installer.mjs",
      "tests/fixtures/remote-serve-proxy.mjs"
    ],
    "documentation_paths": [
      "docs/planning/release-0534-defects.md",
      "packages/workflow-kit/src/templates/PLAN.md",
      "docs/planning/review-instructions-followup.md",
      "README.md",
      "docs/architecture/OVERVIEW.md",
      "docs/modules/current-actions.md",
      "docs/modules/desktop.md",
      "docs/modules/native-window.md",
      "docs/modules/remote-access.md",
      "docs/modules/user-choice.md",
      "docs/modules/chatgpt-plugin.md",
      "docs/modules/dialogue-timing.md",
      "docs/modules/assignment-dialogue.md",
      "docs/modules/assignment-dialogue-reliability.md",
      "docs/modules/prepared-tasks.md",
      "docs/modules/workflow-execution.md",
      "packages/workflow-kit/docs/modules/workflow-kit-package.md",
      "docs/modules/orchestrated-execution.md",
      "docs/acceptance/release-0534-defects.md",
      "docs/modules/release.md",
      "packages/workflow-kit/README.md",
      "docs/acceptance/release-0535-defects.md",
      "docs/modules/project-compatibility.md",
      "docs/modules/orchestrator-startup.md",
      "docs/modules/chat-only-startup.md",
      "packages/workflow-kit/docs/modules/orchestrated-plans.md"
    ]
  },
  "baseline_commit": "b94b7c7c0fb9da928c40666add51c49e0f394577",
  "current_task_id": "PUBLISH",
  "context_pack": {
    "documents": [
      {
        "path": "docs/architecture/OVERVIEW.md",
        "required": true,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/planning/release-0534-defects.md",
        "required": true,
        "revision": "ef9f037757f89ff5adf7fea88adc2e31d4bc09f3"
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
        "scope_id": "release-0534-defects",
        "task_id": "UI-CONTROLS",
        "role": "implementation"
      },
      "dependencies": [],
      "functional_paths": [
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/frontend/desktop/ui/index.html",
        "src/frontend/desktop/preload.cjs",
        "src/frontend/desktop/application.mjs",
        "src/frontend/desktop/client.mjs",
        "src/frontend/desktop/browser-host.mjs",
        "src/frontend/web/app.mjs",
        "src/frontend/web/index.html",
        "src/contracts/desktop.mjs",
        "tests/sidebar.test.mjs",
        "tests/electron-smoke.mjs",
        "tests/web-client-electron.test.mjs",
        "tests/desktop-boundaries.test.mjs",
        "tests/work-progress-scenario.test.mjs",
        "tests/parallel-execution-ui.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "electron-smoke",
        "architecture"
      ],
      "id": "UI-CONTROLS",
      "title": "Удалить кнопку Текущие действия и дублирующее представление",
      "why": "UI001. Первый пункт нового плана. Удалить только дублирующий клиентский экран и его plumbing, сохранить основную панель и прежнее расположение Review.",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Кнопка, dialog-копия, открытие/фокус/закрытие, соответствующие IPC/preload/HTTP и скрытие основной страницы удалены; замена в меню и новый вход не добавлены.",
        "Общий renderer настоящей MCP-панели, навигация, независимые нужные startup/recovery операции, опубликованный план и одна кнопка выполнения сохранены; скрытые элементы не выдаются за доступные действия.",
        "Review остаётся на прежнем месте; изменения проверены native/HTTP fixtures, без миграции от Electron.",
        "Явная опись: plan-choice и sidebar mountCurrentActions удалены; session-notice с retry/cancel/observe/return и conversation-recovery с reconnect остаются в исходных index.html узлах с условиями допустимого восстановления, без постоянного успешного startup.",
        "plan-attention/plan-run-message/plan-continuation-message остаются в исходной карточке опубликованного плана с условиями нужного действия; без второй ленты. HTTP без MCP iframe не получает удалённый fallback выбора: ограничение описано, новый вход не создан."
      ],
      "expected_commit_message": "fix: удалить кнопку текущие действия и дублирующее представление",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/modules/current-actions.md",
            "required": false
          },
          {
            "path": "docs/modules/desktop.md",
            "required": false
          },
          {
            "path": "docs/modules/native-window.md",
            "required": false
          },
          {
            "path": "docs/modules/remote-access.md",
            "required": false
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "task_brief": "UI001. Первый пункт нового плана. Удалить только дублирующий клиентский экран и его plumbing, сохранить основную панель и прежнее расположение Review.\nОбъём: src/frontend/desktop/ui/sidebar.mjs, src/frontend/desktop/ui/index.html, src/frontend/desktop/preload.cjs, src/frontend/desktop/application.mjs, src/frontend/desktop/client.mjs, src/frontend/desktop/browser-host.mjs, src/frontend/web/app.mjs, src/frontend/web/index.html, src/contracts/desktop.mjs, tests/sidebar.test.mjs, tests/electron-smoke.mjs, tests/web-client-electron.test.mjs, tests/desktop-boundaries.test.mjs, tests/work-progress-scenario.test.mjs, tests/parallel-execution-ui.test.mjs\nКритерии: Кнопка, dialog-копия, открытие/фокус/закрытие, соответствующие IPC/preload/HTTP и скрытие основной страницы удалены; замена в меню и новый вход не добавлены. Общий renderer настоящей MCP-панели, навигация, независимые нужные startup/recovery операции, опубликованный план и одна кнопка выполнения сохранены; скрытые элементы не выдаются за доступные действия. Review остаётся на прежнем месте; изменения проверены native/HTTP fixtures, без миграции от Electron. Явная опись: plan-choice и sidebar mountCurrentActions удалены; session-notice с retry/cancel/observe/return и conversation-recovery с reconnect остаются в исходных index.html узлах с условиями допустимого восстановления, без постоянного успешного startup. plan-attention/plan-run-message/plan-continuation-message остаются в исходной карточке опубликованного плана с условиями нужного действия; без второй ленты. HTTP без MCP iframe не получает удалённый fallback выбора: ограничение описано, новый вход не создан.\nПроверки: unit-all, electron-smoke, architecture.\nДействовать по общей спецификации. Пользователь разрешил реализацию и новый выпуск 0.5.35. При реализации — Kit, временные fixtures без моделей/рабочих профилей; чужие/удалённые проекты не трогать.",
      "actual_files": [
        "src/contracts/desktop.mjs",
        "src/frontend/desktop/application.mjs",
        "src/frontend/desktop/browser-host.mjs",
        "src/frontend/desktop/client.mjs",
        "src/frontend/desktop/preload.cjs",
        "src/frontend/desktop/ui/index.html",
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/frontend/web/app.mjs",
        "src/frontend/web/index.html",
        "tests/desktop-boundaries.test.mjs",
        "tests/electron-smoke.mjs",
        "tests/sidebar.test.mjs",
        "tests/web-client-electron.test.mjs",
        "tests/work-progress-scenario.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "release-0534-defects",
        "task_id": "RESULT-DELIVERY",
        "role": "implementation"
      },
      "dependencies": [
        "UI-CONTROLS"
      ],
      "functional_paths": [
        "src/control/plugin/workflow-channel.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/assignment-dialogue.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/frontend/plugin/launch.mjs",
        "tests/workflow-channel.test.mjs",
        "tests/automatic-agent-dialogue.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/chatgpt-plugin.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "chatgpt-plugin",
        "architecture"
      ],
      "id": "RESULT-DELIVERY",
      "title": "Освободить очередь результатов после допланового выбора",
      "why": "EXEC002. Воспроизвести старый choice gate без нового user bubble, затем подтвердить свежий конец ответа, сохранив реальные барьеры.",
      "verification_kind": "code",
      "acceptance_criteria": [
        "На fixture до публикации user-choice принят/прочитан, ответ завершён без нового user bubble; после Review/публикации/Start оба result доходят и читаются O.",
        "Завершение подтверждено свежими фактами своего разговора/события: read не заменяет конец хода, task yield E не навязывается доплановому выбору; Start сам gates не обнуляет.",
        "Restart/поздний callback/активная команда/manual Stop/UNKNOWN/смена document не создают повтор Send и не освобождают чужое событие."
      ],
      "expected_commit_message": "fix: освободить очередь результатов после допланового выбора",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/modules/assignment-dialogue.md",
            "required": false
          },
          {
            "path": "docs/modules/assignment-dialogue-reliability.md",
            "required": false
          },
          {
            "path": "docs/modules/user-choice.md",
            "required": false
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "task_brief": "EXEC002. Воспроизвести старый choice gate без нового user bubble, затем подтвердить свежий конец ответа, сохранив реальные барьеры.\nОбъём: src/control/plugin/workflow-channel.mjs, src/control/plugin/communication.mjs, src/control/plugin/assignment-dialogue.mjs, src/control/workflow/dialogue-delivery.mjs, src/frontend/plugin/launch.mjs, tests/workflow-channel.test.mjs, tests/automatic-agent-dialogue.test.mjs, tests/fixtures/automatic-agent-dialogue.mjs, tests/chatgpt-plugin.test.mjs\nКритерии: На fixture до публикации user-choice принят/прочитан, ответ завершён без нового user bubble; после Review/публикации/Start оба result доходят и читаются O. Завершение подтверждено свежими фактами своего разговора/события: read не заменяет конец хода, task yield E не навязывается доплановому выбору; Start сам gates не обнуляет. Restart/поздний callback/активная команда/manual Stop/UNKNOWN/смена document не создают повтор Send и не освобождают чужое событие.\nПроверки: unit-all, chatgpt-plugin, architecture.\nДействовать по общей спецификации. Пользователь разрешил реализацию и новый выпуск 0.5.35. При реализации — Kit, временные fixtures без моделей/рабочих профилей; чужие/удалённые проекты не трогать.",
      "actual_files": [
        "src/control/plugin/communication.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "tests/workflow-channel.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "release-0534-defects",
        "task_id": "EXECUTOR-START",
        "role": "implementation"
      },
      "dependencies": [
        "RESULT-DELIVERY"
      ],
      "functional_paths": [
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/control/workflow/parallel-execution.mjs",
        "src/control/plugin/assignment-dialogue.mjs",
        "src/control/plugin/enrollment.mjs",
        "tests/prepared-task-flow.test.mjs",
        "tests/dialogue-delivery.test.mjs",
        "tests/parallel-execution-recovery.test.mjs",
        "tests/automatic-agent-dialogue.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/workflow-channel.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "chatgpt-plugin",
        "architecture"
      ],
      "id": "EXECUTOR-START",
      "title": "Согласовать регистрацию исполнителей и привязку поручений",
      "why": "EXEC001. Ранняя подготовка сохраняется; отсутствие ещё регистрируемого собственного адресата — ожидание, настоящий конфликт — отказ.",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Задержанные/переставленные reservation и bootstrap двух E не порождают RECIPIENT/attention для ожидаемой стадии и не требуют дополнительного авторского хода O.",
        "Успех того же assignment/attempt завершает прежнюю текущую ошибку; сохранённый исторический отказ не возвращается как действующий.",
        "Чужой target/identity, stale пакет, отмена и UNKNOWN не скрываются; одна выдача каждому E, без общего таймера подавления ошибок."
      ],
      "expected_commit_message": "fix: согласовать регистрацию исполнителей и привязку поручений",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/modules/prepared-tasks.md",
            "required": false
          },
          {
            "path": "docs/modules/orchestrated-execution.md",
            "required": false
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "task_brief": "EXEC001. Ранняя подготовка сохраняется; отсутствие ещё регистрируемого собственного адресата — ожидание, настоящий конфликт — отказ.\nОбъём: src/control/workflow/coordination.mjs, src/control/workflow/dialogue-delivery.mjs, src/control/workflow/parallel-execution.mjs, src/control/plugin/assignment-dialogue.mjs, src/control/plugin/enrollment.mjs, tests/prepared-task-flow.test.mjs, tests/dialogue-delivery.test.mjs, tests/parallel-execution-recovery.test.mjs, tests/automatic-agent-dialogue.test.mjs, tests/fixtures/automatic-agent-dialogue.mjs\nКритерии: Задержанные/переставленные reservation и bootstrap двух E не порождают RECIPIENT/attention для ожидаемой стадии и не требуют дополнительного авторского хода O. Успех того же assignment/attempt завершает прежнюю текущую ошибку; сохранённый исторический отказ не возвращается как действующий. Чужой target/identity, stale пакет, отмена и UNKNOWN не скрываются; одна выдача каждому E, без общего таймера подавления ошибок.\nПроверки: unit-all, chatgpt-plugin, architecture.\nДействовать по общей спецификации. Пользователь разрешил реализацию и новый выпуск 0.5.35. При реализации — Kit, временные fixtures без моделей/рабочих профилей; чужие/удалённые проекты не трогать.",
      "actual_files": [
        "src/control/plugin/assignment-dialogue.mjs",
        "src/control/workflow/parallel-execution.mjs",
        "tests/parallel-execution-recovery.test.mjs",
        "tests/workflow-channel.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "release-0534-defects",
        "task_id": "UI-EVENTS",
        "role": "implementation"
      },
      "dependencies": [
        "EXECUTOR-START"
      ],
      "functional_paths": [
        "src/control/workflow/plan-review.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/review-continuation.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/startup-context.mjs",
        "src/control/context/context-session.mjs",
        "src/contracts/plugin-communication.mjs",
        "src/frontend/plugin/launch.mjs",
        "packages/workflow-kit/src/lib/role-protocol.mjs",
        "packages/workflow-kit/src/lib/review-state.mjs",
        "tools/codex-app-server-mcp/plugin.py",
        "tests/plan-review.test.mjs",
        "tests/workflow-channel.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/startup-context.test.mjs",
        "src/backend/desktop-model.mjs",
        "tests/backend-desktop-model.test.mjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "tests/electron-smoke.mjs"
      ],
      "documentation_paths": [
        "packages/workflow-kit/src/templates/PLAN.md"
      ],
      "verification_ids": [
        "unit-all",
        "chatgpt-plugin",
        "executor-channel",
        "codex-tools-live",
        "architecture",
        "kit-check",
        "kit-assignments",
        "kit-upgrade",
        "electron-smoke"
      ],
      "id": "UI-EVENTS",
      "title": "Передавать изменение Review агенту через существующий канал",
      "why": "REVIEW001. Долговечно сохранить ON/OFF, сразу поставить адресное событие, уведомить через панель и отдельно подтвердить чтение.",
      "verification_kind": "code",
      "acceptance_criteria": [
        "После IDLE-переключения Review ON/OFF событие сразу сохранено в штатной очереди адресата; agent read отличён от записи и SDK accepted, новое выполнение не разрешено.",
        "Rapid toggle/смена проекта/ошибка сохранения/restart/закрытая панель/активный ответ и manual Stop не меняют адресата, порядок решений и не повторяют неизвестную отправку.",
        "Kit проверяет актуальный Review при публикации; агент сверяет status. Согласованы затронутые startup/read_message/role-protocol/шаблоны/MCP; нет нового транспорта или дублирования startup."
      ],
      "expected_commit_message": "fix: передавать изменение review агенту через существующий канал",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/modules/chatgpt-plugin.md",
            "required": false
          },
          {
            "path": "docs/modules/user-choice.md",
            "required": false
          },
          {
            "path": "docs/planning/review-instructions-followup.md",
            "required": false
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "task_brief": "REVIEW001. Долговечно сохранить ON/OFF, сразу поставить адресное событие, уведомить через панель и отдельно подтвердить чтение.\nОбъём: src/control/workflow/plan-review.mjs, src/control/workflow/coordination.mjs, src/control/workflow/review-continuation.mjs, src/control/workflow/dialogue-delivery.mjs, src/control/plugin/workflow-channel.mjs, src/control/plugin/communication.mjs, src/control/plugin/startup-context.mjs, src/control/context/context-session.mjs, src/contracts/plugin-communication.mjs, src/frontend/plugin/launch.mjs, packages/workflow-kit/src/lib/role-protocol.mjs, packages/workflow-kit/src/lib/review-state.mjs, tools/codex-app-server-mcp/plugin.py, tests/plan-review.test.mjs, tests/workflow-channel.test.mjs, tests/chatgpt-plugin.test.mjs, tests/startup-context.test.mjs, src/backend/desktop-model.mjs, tests/backend-desktop-model.test.mjs, packages/workflow-kit/src/templates/PLAN.md\nКритерии: После IDLE-переключения Review ON/OFF событие сразу сохранено в штатной очереди адресата; agent read отличён от записи и SDK accepted, новое выполнение не разрешено. Rapid toggle/смена проекта/ошибка сохранения/restart/закрытая панель/активный ответ и manual Stop не меняют адресата, порядок решений и не повторяют неизвестную отправку. Kit проверяет актуальный Review при публикации; агент сверяет status. Согласованы затронутые startup/read_message/role-protocol/шаблоны/MCP; нет нового транспорта или дублирования startup.\nПроверки: unit-all, chatgpt-plugin, executor-channel, codex-tools-live, architecture, kit-check, kit-assignments, kit-upgrade.\nДействовать по общей спецификации. Пользователь разрешил реализацию и новый выпуск 0.5.35. При реализации — Kit, временные fixtures без моделей/рабочих профилей; чужие/удалённые проекты не трогать.",
      "actual_files": [
        "packages/workflow-kit/src/lib/review-state.mjs",
        "packages/workflow-kit/src/lib/role-protocol.mjs",
        "packages/workflow-kit/src/templates/PLAN.md",
        "src/backend/desktop-model.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/control/workflow/plan-review.mjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "tests/electron-smoke.mjs",
        "tests/plan-review.test.mjs",
        "tests/workflow-channel.test.mjs",
        "tools/codex-app-server-mcp/plugin.py"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "release-0534-defects",
        "task_id": "REVIEW-VIEW",
        "role": "implementation"
      },
      "dependencies": [
        "UI-EVENTS"
      ],
      "functional_paths": [
        "src/backend/desktop-model.mjs",
        "src/control/workflow/plan-review.mjs",
        "src/control/workflow/plan-monitor.mjs",
        "src/contracts/work-progress.mjs",
        "src/frontend/plugin/panel.mjs",
        "src/frontend/plugin/launch.mjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/frontend/desktop/ui/index.html",
        "packages/workflow-kit/src/lib/review-state.mjs",
        "packages/workflow-kit/src/lib/plan-review.mjs",
        "packages/workflow-kit/src/lib/claude-review.mjs",
        "packages/workflow-kit/scripts/check-plan-review-fixture.mjs",
        "tests/plan-review.test.mjs",
        "tests/work-progress.test.mjs",
        "tests/work-progress-scenario.test.mjs",
        "tests/panel-dialogue-view.test.mjs",
        "tests/backend-desktop-model.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "src/control/plugin/communication.mjs",
        "src/execution/files/project-input-watch.mjs",
        "tests/workflow-channel.test.mjs",
        "tests/electron-smoke.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "kit-check",
        "kit-assignments",
        "chatgpt-plugin",
        "architecture",
        "kit-upgrade",
        "executor-channel",
        "codex-tools-live",
        "electron-smoke"
      ],
      "id": "REVIEW-VIEW",
      "title": "Показать раунды Review и сохранить историю согласования",
      "why": "REVIEW002/REVIEW003. Воспроизвести полную доставку статуса в основную панель; построить историю по подтверждённым фактам Kit.",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Основная панель показывает реальную стадию/Claude/раунд своего проекта, затем доработку/повтор/публикацию; причина пропажи активной стадии воспроизведена, не выведена только из CSS sidebar.",
        "История содержит подготовку/передачу пары, фактический запуск, отзыв, позицию автора, повторный раунд, согласование и публикацию по отдельным подтверждённым фактам; есть changes_requested/error/cancel.",
        "Устойчивые ID/фактическое время исключают дубли; история переживает PUBLISHED/restart/очистку Review. Старым данным даты и события не выдумываются; нет второй подробной ленты в sidebar."
      ],
      "expected_commit_message": "fix: показать раунды review и сохранить историю согласования",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/modules/current-actions.md",
            "required": false
          },
          {
            "path": "docs/modules/workflow-execution.md",
            "required": false
          },
          {
            "path": "packages/workflow-kit/docs/modules/workflow-kit-package.md",
            "required": false
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "task_brief": "REVIEW002/REVIEW003. Воспроизвести полную доставку статуса в основную панель; построить историю по подтверждённым фактам Kit.\nОбъём: src/backend/desktop-model.mjs, src/control/workflow/plan-review.mjs, src/control/workflow/plan-monitor.mjs, src/contracts/work-progress.mjs, src/frontend/plugin/panel.mjs, src/frontend/plugin/launch.mjs, src/frontend/desktop/ui/sidebar.mjs, src/frontend/desktop/ui/index.html, packages/workflow-kit/src/lib/review-state.mjs, packages/workflow-kit/src/lib/plan-review.mjs, packages/workflow-kit/src/lib/claude-review.mjs, packages/workflow-kit/scripts/check-plan-review-fixture.mjs, tests/plan-review.test.mjs, tests/work-progress.test.mjs, tests/work-progress-scenario.test.mjs, tests/panel-dialogue-view.test.mjs, tests/backend-desktop-model.test.mjs, tests/chatgpt-plugin.test.mjs, src/control/plugin/communication.mjs, src/execution/files/project-input-watch.mjs, tests/workflow-channel.test.mjs\nКритерии: Основная панель показывает реальную стадию/Claude/раунд своего проекта, затем доработку/повтор/публикацию; причина пропажи активной стадии воспроизведена, не выведена только из CSS sidebar. История содержит подготовку/передачу пары, фактический запуск, отзыв, позицию автора, повторный раунд, согласование и публикацию по отдельным подтверждённым фактам; есть changes_requested/error/cancel. Устойчивые ID/фактическое время исключают дубли; история переживает PUBLISHED/restart/очистку Review. Старым данным даты и события не выдумываются; нет второй подробной ленты в sidebar.\nПроверки: unit-all, kit-check, kit-assignments, chatgpt-plugin, architecture, kit-upgrade, executor-channel, codex-tools-live.\nДействовать по общей спецификации. Пользователь разрешил реализацию и новый выпуск 0.5.35. При реализации — Kit, временные fixtures без моделей/рабочих профилей; чужие/удалённые проекты не трогать.",
      "actual_files": [
        "packages/workflow-kit/scripts/check-plan-review-fixture.mjs",
        "packages/workflow-kit/src/lib/claude-review.mjs",
        "packages/workflow-kit/src/lib/plan-review.mjs",
        "packages/workflow-kit/src/lib/review-state.mjs",
        "src/backend/desktop-model.mjs",
        "src/contracts/work-progress.mjs",
        "src/control/workflow/plan-review.mjs",
        "tests/electron-smoke.mjs",
        "tests/plan-review.test.mjs",
        "tests/work-progress.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "release-0534-defects",
        "task_id": "STATUS",
        "role": "implementation"
      },
      "dependencies": [
        "REVIEW-VIEW"
      ],
      "functional_paths": [
        "src/contracts/dialogue-view.mjs",
        "src/contracts/work-progress.mjs",
        "src/backend/desktop-model.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/frontend/plugin/panel.mjs",
        "src/frontend/desktop/ui/current-actions.mjs",
        "tests/work-progress.test.mjs",
        "tests/panel-dialogue-view.test.mjs",
        "tests/work-progress-scenario.test.mjs",
        "tests/backend-desktop-model.test.mjs",
        "tests/fixtures/current-actions-layout.mjs",
        "tests/electron-smoke.mjs",
        "tests/workflow-channel.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "chatgpt-plugin",
        "electron-smoke",
        "architecture"
      ],
      "id": "STATUS",
      "title": "Объяснять текущую работу и реальную причину задержки",
      "why": "STATUS001. Показать фактический blocker предыдущего gate и понятный смысл этапа, технические квитанции оставить в диагностике.",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Обычная передача/подключение/восстановление нейтральны; блокировка объясняет причину, участника и доступное действие. Не выдавать pending за проверку O и read за недоставленность.",
        "Старый gate вне текущего scope отражается как фактическая причина ожидания; не остаётся бесконечного spinner нормальной работы или технического fallback вместо объяснения.",
        "Оранжевый акцент означает нужное внимание; разрешённое событие идёт в историю. Полные тексты и таймер проходят renderer-проверку без clipping на 320/480/900 px."
      ],
      "expected_commit_message": "fix: объяснять текущую работу и реальную причину задержки",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/modules/current-actions.md",
            "required": false
          },
          {
            "path": "docs/modules/dialogue-timing.md",
            "required": false
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "task_brief": "STATUS001. Показать фактический blocker предыдущего gate и понятный смысл этапа, технические квитанции оставить в диагностике.\nОбъём: src/contracts/dialogue-view.mjs, src/contracts/work-progress.mjs, src/backend/desktop-model.mjs, src/control/plugin/workflow-channel.mjs, src/frontend/plugin/panel.mjs, src/frontend/desktop/ui/current-actions.mjs, tests/work-progress.test.mjs, tests/panel-dialogue-view.test.mjs, tests/work-progress-scenario.test.mjs, tests/backend-desktop-model.test.mjs, tests/fixtures/current-actions-layout.mjs, tests/electron-smoke.mjs\nКритерии: Обычная передача/подключение/восстановление нейтральны; блокировка объясняет причину, участника и доступное действие. Не выдавать pending за проверку O и read за недоставленность. Старый gate вне текущего scope отражается как фактическая причина ожидания; не остаётся бесконечного spinner нормальной работы или технического fallback вместо объяснения. Оранжевый акцент означает нужное внимание; разрешённое событие идёт в историю. Полные тексты и таймер проходят renderer-проверку без clipping на 320/480/900 px.\nПроверки: unit-all, chatgpt-plugin, electron-smoke, architecture.\nДействовать по общей спецификации. Пользователь разрешил реализацию и новый выпуск 0.5.35. При реализации — Kit, временные fixtures без моделей/рабочих профилей; чужие/удалённые проекты не трогать.",
      "actual_files": [
        "src/backend/desktop-model.mjs",
        "src/contracts/dialogue-view.mjs",
        "src/contracts/work-progress.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "tests/fixtures/current-actions-layout.mjs",
        "tests/panel-dialogue-view.test.mjs",
        "tests/work-progress.test.mjs",
        "tests/workflow-channel.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "release-0534-defects",
        "task_id": "PROOF",
        "role": "implementation"
      },
      "dependencies": [
        "STATUS"
      ],
      "functional_paths": [
        "tests/automatic-agent-dialogue.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/workflow-channel.test.mjs",
        "tests/plan-review.test.mjs",
        "tests/backend-api.test.mjs",
        "tests/electron-smoke.mjs",
        "tests/web-client-electron.test.mjs",
        "tests/fixtures/current-actions-layout.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "kit-check",
        "kit-assignments",
        "architecture",
        "chatgpt-plugin",
        "electron-smoke",
        "executor-channel",
        "codex-tools-live",
        "kit-upgrade"
      ],
      "id": "PROOF",
      "title": "Проверить путь от обсуждения до двух результатов и завершения",
      "why": "Регрессия всех UI001/REVIEW001–003/EXEC001–002/STATUS001 через API/MCP/SDK/Kit/Git/Electron, без моделей и живых проектов. Найденный дефект продукта получает отдельную штатную задачу до DOCS; scope тестовой задачи не расширяется молча.",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Связный fixture начинается до публикации: OFF→ON→read события→выбор без user bubble→два Review→публикация→один Start→задержка регистрации 2E→task/read→result→O read/acceptance→интеграции→зависимая задача→DOCS→cleanup/complete.",
        "Fault injection вокруг WAL/intent/SDK/read, rapid toggle, stale identity/attempt, pause/Stop/UNKNOWN и повторные callbacks сохраняют один эффект и изоляцию соседей.",
        "Каждый из семи дефектов имеет доказательство; полный набор Kit включает обе части. Настоящий ChatGPT/macOS/native Windows/Linux остаётся NOT_RUN до пользователя."
      ],
      "expected_commit_message": "fix: проверить путь от обсуждения до двух результатов и завершения",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/modules/automatic-agent-dialogue-acceptance.md",
            "required": false
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "task_brief": "Регрессия всех UI001/REVIEW001–003/EXEC001–002/STATUS001 через API/MCP/SDK/Kit/Git/Electron, без моделей и живых проектов. Найденный дефект продукта получает отдельную штатную задачу до DOCS; scope тестовой задачи не расширяется молча.\nОбъём: tests/automatic-agent-dialogue.test.mjs, tests/fixtures/automatic-agent-dialogue.mjs, tests/workflow-channel.test.mjs, tests/plan-review.test.mjs, tests/backend-api.test.mjs, tests/electron-smoke.mjs, tests/web-client-electron.test.mjs, tests/fixtures/current-actions-layout.mjs\nКритерии: Связный fixture начинается до публикации: OFF→ON→read события→выбор без user bubble→два Review→публикация→один Start→задержка регистрации 2E→task/read→result→O read/acceptance→интеграции→зависимая задача→DOCS→cleanup/complete. Fault injection вокруг WAL/intent/SDK/read, rapid toggle, stale identity/attempt, pause/Stop/UNKNOWN и повторные callbacks сохраняют один эффект и изоляцию соседей. Каждый из семи дефектов имеет доказательство; полный набор Kit включает обе части. Настоящий ChatGPT/macOS/native Windows/Linux остаётся NOT_RUN до пользователя.\nПроверки: unit-all, kit-check, kit-assignments, architecture, chatgpt-plugin, electron-smoke, executor-channel, codex-tools-live, kit-upgrade.\nДействовать по общей спецификации. Пользователь разрешил реализацию и новый выпуск 0.5.35. При реализации — Kit, временные fixtures без моделей/рабочих профилей; чужие/удалённые проекты не трогать.",
      "actual_files": [
        "tests/automatic-agent-dialogue.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs"
      ]
    },
    {
      "id": "VERSION",
      "title": "Подготовить версии приложения, Kit и панели для 0.5.35",
      "why": "Согласованный выпуск новых контрактов и immutable панели до DOCS/build.",
      "dependencies": [
        "PROOF"
      ],
      "functional_paths": [
        "package.json",
        "package-lock.json",
        "packages/workflow-kit/package.json",
        "packages/workflow-kit/src/lib/common.mjs",
        "src/contracts/backend.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/migration-compatibility.test.mjs",
        "packages/workflow-kit/src/lib/installer.mjs",
        "packages/workflow-kit/src/lib/role-protocol.mjs",
        "tests/fixtures/remote-serve-proxy.mjs"
      ],
      "documentation_paths": [
        "docs/planning/release-0534-defects.md"
      ],
      "verification_ids": [
        "unit-all",
        "kit-check",
        "kit-assignments",
        "executor-channel",
        "architecture"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "App 0.5.35, новая версия Kit/ролевых инструкций, package locks и panel build согласованы; fixtures и upgrade проходят.",
        "Нет зависимости от старого iframe; публичные версии/контракты проверены до DOCS."
      ],
      "expected_commit_message": "chore: подготовить выпуск 0.5.35",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "release-0534-defects",
        "task_id": "VERSION",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "package-lock.json",
        "package.json",
        "packages/workflow-kit/package.json",
        "packages/workflow-kit/src/lib/common.mjs",
        "packages/workflow-kit/src/lib/installer.mjs",
        "packages/workflow-kit/src/lib/role-protocol.mjs",
        "src/contracts/backend.mjs",
        "tests/fixtures/remote-serve-proxy.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "release-0534-defects",
        "task_id": "DOCS",
        "role": "implementation"
      },
      "dependencies": [
        "UI-CONTROLS",
        "RESULT-DELIVERY",
        "EXECUTOR-START",
        "UI-EVENTS",
        "REVIEW-VIEW",
        "STATUS",
        "PROOF",
        "VERSION"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/planning/release-0534-defects.md",
        "docs/planning/review-instructions-followup.md",
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/current-actions.md",
        "docs/modules/desktop.md",
        "docs/modules/native-window.md",
        "docs/modules/remote-access.md",
        "docs/modules/user-choice.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/dialogue-timing.md",
        "docs/modules/assignment-dialogue.md",
        "docs/modules/assignment-dialogue-reliability.md",
        "docs/modules/prepared-tasks.md",
        "docs/modules/workflow-execution.md",
        "packages/workflow-kit/docs/modules/workflow-kit-package.md",
        "packages/workflow-kit/src/templates/PLAN.md",
        "docs/modules/orchestrated-execution.md",
        "docs/acceptance/release-0534-defects.md",
        "docs/modules/release.md",
        "packages/workflow-kit/README.md",
        "docs/acceptance/release-0535-defects.md",
        "docs/modules/project-compatibility.md",
        "docs/modules/orchestrator-startup.md",
        "docs/modules/chat-only-startup.md",
        "packages/workflow-kit/docs/modules/orchestrated-plans.md"
      ],
      "verification_ids": [],
      "id": "DOCS",
      "title": "Актуализация всех документов проекта",
      "why": "Сверить контракты реализованных исправлений без объявления невыпущенной версии установленной; сохранить pending и отложенные требования.",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Сверены действующие контракты реализованных семи замечаний и версии 0.5.35, незавершённое и pending живой приёмки сохранены.",
        "Полные инструкции role-protocol/startup/MCP/Kit согласованы; документы ≤28000 байт; DOCS до production.",
        "Выпущенная приёмка 0.5.34 не переписана как факт нового выпуска; удаление HTTP fallback явно описано."
      ],
      "expected_commit_message": "docs: актуализация всех документов проекта",
      "parallel_safe": false,
      "context_pack": {
        "documents": [],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "task_brief": "Сверить контракты реализованных исправлений без объявления невыпущенной версии установленной; сохранить pending и отложенные требования.\nОбъём: docs/planning/release-0534-defects.md, docs/planning/review-instructions-followup.md, README.md, docs/architecture/OVERVIEW.md, docs/modules/current-actions.md, docs/modules/desktop.md, docs/modules/native-window.md, docs/modules/remote-access.md, docs/modules/user-choice.md, docs/modules/chatgpt-plugin.md, docs/modules/dialogue-timing.md, docs/modules/assignment-dialogue.md, docs/modules/assignment-dialogue-reliability.md, docs/modules/prepared-tasks.md, docs/modules/workflow-execution.md, packages/workflow-kit/docs/modules/workflow-kit-package.md, packages/workflow-kit/src/templates/PLAN.md, docs/modules/orchestrated-execution.md, docs/acceptance/release-0534-defects.md, docs/modules/release.md, packages/workflow-kit/README.md\nКритерии: Сверены действующие контракты реализованных семи замечаний и версии 0.5.35, незавершённое и pending живой приёмки сохранены. Полные инструкции role-protocol/startup/MCP/Kit согласованы; документы ≤28000 байт; DOCS до production. Выпущенная приёмка 0.5.34 не переписана как факт нового выпуска; удаление HTTP fallback явно описано.\nПроверки: схема и состав документационного коммита.\nПользователь разрешил реализацию, выпуск 0.5.35 и GitHub публикацию. DOCS предшествует RELEASE; документальный коммит не доказывает сборку, установку или живую приёмку.",
      "actual_files": [
        "README.md",
        "docs/acceptance/release-0535-defects.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/assignment-dialogue-reliability.md",
        "docs/modules/assignment-dialogue.md",
        "docs/modules/chat-only-startup.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/current-actions.md",
        "docs/modules/desktop.md",
        "docs/modules/dialogue-timing.md",
        "docs/modules/native-window.md",
        "docs/modules/orchestrated-execution.md",
        "docs/modules/orchestrator-startup.md",
        "docs/modules/prepared-tasks.md",
        "docs/modules/project-compatibility.md",
        "docs/modules/release.md",
        "docs/modules/remote-access.md",
        "docs/modules/user-choice.md",
        "docs/modules/workflow-execution.md",
        "docs/planning/release-0534-defects.md",
        "docs/planning/review-instructions-followup.md",
        "packages/workflow-kit/README.md",
        "packages/workflow-kit/docs/modules/orchestrated-plans.md",
        "packages/workflow-kit/docs/modules/workflow-kit-package.md"
      ]
    },
    {
      "id": "RELEASE",
      "title": "Собрать и проверить релиз macOS Windows Linux",
      "why": "Собрать и проверить релиз macOS Windows Linux",
      "dependencies": [
        "DOCS"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/release-0534-defects.md"
      ],
      "verification_ids": [
        "three-platform-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "Три платформы и все семь assets из одного sourceCommit проверены; manifest и Downloads согласованы.",
        "Перед каждой production-командой Python caches безопасно очищены; подпись и состав проверены без ослабления."
      ],
      "expected_commit_message": "build: собрать полный выпуск 0.5.35",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "release-0534-defects",
        "task_id": "RELEASE",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "release-manifest.json"
      ]
    },
    {
      "id": "INSTALL",
      "title": "Установить проверенный выпуск на этот Mac",
      "why": "Установить проверенный выпуск на этот Mac",
      "dependencies": [
        "RELEASE",
        "DOCS"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/release-0534-defects.md"
      ],
      "verification_ids": [
        "release-installed"
      ],
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Готовый bundle из проверенного комплекта доставлен в проект и /Applications с manifest/signature/rollback; installed или подтверждённый pending.",
        "Нет пересборки, переподписи, закрытия приложения или остановки действующей службы."
      ],
      "expected_commit_message": "delivery: установить проверенный выпуск 0.5.35",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "release-0534-defects",
        "task_id": "INSTALL",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": []
    },
    {
      "id": "PUBLISH",
      "title": "Опубликовать полный выпуск на GitHub",
      "why": "Опубликовать полный выпуск на GitHub",
      "dependencies": [
        "INSTALL",
        "DOCS"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/release-0534-defects.md"
      ],
      "verification_ids": [
        "github-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "Собственный GitHub Release v0.5.35 published, семь assets проверены по size/digest, tag на manifest.sourceCommit, main актуален.",
        "Неизменный комплект, ограничения live/native приёмки отражены; итог по всем задачам."
      ],
      "expected_commit_message": "release: опубликовать полный комплект 0.5.35",
      "implementation_status": "IN_PROGRESS",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "release-0534-defects",
        "task_id": "PUBLISH",
        "role": "implementation"
      },
      "parallel_safe": false
    }
  ],
  "blocked_reason": null,
  "user_decisions": [
    {
      "id": "ff83a74c-fea1-4ee6-8394-6262e589b91f",
      "text": "25.10.2026 пользователь поручил закрыть прежний план и подготовить отдельный новый по всем обсуждённым замечаниям. Первым пунктом удалить кнопку Текущие действия. Публикация этого плана не разрешает реализацию, сборку, установку или GitHub delivery.",
      "recorded_at": "2026-10-25T14:51:42.514Z"
    },
    {
      "id": "execute-release-0535",
      "text": "25.10.2026 пользователь разрешил выполнение всего плана, macOS Windows Linux, установку на Mac и GitHub публикацию; действующую службу не останавливать.",
      "recorded_at": "2026-10-25T15:01:36.643Z"
    }
  ],
  "parallel_allowed": false,
  "max_workers": 1,
  "execution_strategy": "sequential",
  "execution_reason": "Эта внешняя Codex-сессия готовит и затем по отдельному поручению ведёт последовательную разработку через Kit. Делегирование не разрешено; общие очередь, lifecycle и проекция пересекаются."
}
```
<!-- workflow-state:end -->

## Состояние

Execution Scope Status: ACTIVE
Delivery Status: IN_PROGRESS
Scope: release-0534-defects
Current Task: PUBLISH
Revision: 1154

## Цель

Устранить семь замечаний тестирования 0.5.34: убрать дублирующую кнопку, согласовать Review и восстановить доставку результатов оркестратору.

## Критерии приёмки

- Все семь UI001/REVIEW001–003/EXEC001–002/STATUS001 перенесены в критерии и проверки без потерь; UI-CONTROLS первый.
- Выбор до публикации без user bubble не блокирует два result после Start; E подключаются без ложного RECIPIENT; реальные identity/UNKNOWN/pause барьеры сохранены.
- Событие Review ON/OFF сразу записывается в существующий адресный канал; агент читает актуальное решение, которое не разрешает реализацию.
- Фактический Review/раунды/отзывы/позиция/публикация видны в основной панели и долговечной истории; нет дубля sidebar или выдуманного события.
- Один понятный current status показывает настоящую причину ожидания, нужное внимание и полную инструкцию; технические receipts находятся в диагностике.
- Изолированный доплановый цикл и назначенные checks, включая обе части Kit, подтверждены; live/native pending отделены от собственных доказательств RELEASE/INSTALL/PUBLISH.

## Микрозадачи

Выполнение: sequential; разрешено: false; лимит: 1
Причина: Эта внешняя Codex-сессия готовит и затем по отдельному поручению ведёт последовательную разработку через Kit. Делегирование не разрешено; общие очередь, lifecycle и проекция пересекаются.

- [DONE] UI-CONTROLS: Удалить кнопку Текущие действия и дублирующее представление — Завершено
  - Git Commit: [DONE] fix: удалить кнопку текущие действия и дублирующее представление
  - Reference: release-0534-defects / UI-CONTROLS / implementation
  - Файлы: src/frontend/desktop/ui/sidebar.mjs, src/frontend/desktop/ui/index.html, src/frontend/desktop/preload.cjs, src/frontend/desktop/application.mjs, src/frontend/desktop/client.mjs, src/frontend/desktop/browser-host.mjs, src/frontend/web/app.mjs, src/frontend/web/index.html, src/contracts/desktop.mjs, tests/sidebar.test.mjs, tests/electron-smoke.mjs, tests/web-client-electron.test.mjs, tests/desktop-boundaries.test.mjs, tests/work-progress-scenario.test.mjs, tests/parallel-execution-ui.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] RESULT-DELIVERY: Освободить очередь результатов после допланового выбора — Завершено
  - Git Commit: [DONE] fix: освободить очередь результатов после допланового выбора
  - Reference: release-0534-defects / RESULT-DELIVERY / implementation
  - Файлы: src/control/plugin/workflow-channel.mjs, src/control/plugin/communication.mjs, src/control/plugin/assignment-dialogue.mjs, src/control/workflow/dialogue-delivery.mjs, src/frontend/plugin/launch.mjs, tests/workflow-channel.test.mjs, tests/automatic-agent-dialogue.test.mjs, tests/fixtures/automatic-agent-dialogue.mjs, tests/chatgpt-plugin.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: UI-CONTROLS
- [DONE] EXECUTOR-START: Согласовать регистрацию исполнителей и привязку поручений — Завершено
  - Git Commit: [DONE] fix: согласовать регистрацию исполнителей и привязку поручений
  - Reference: release-0534-defects / EXECUTOR-START / implementation
  - Файлы: src/control/workflow/coordination.mjs, src/control/workflow/dialogue-delivery.mjs, src/control/workflow/parallel-execution.mjs, src/control/plugin/assignment-dialogue.mjs, src/control/plugin/enrollment.mjs, tests/prepared-task-flow.test.mjs, tests/dialogue-delivery.test.mjs, tests/parallel-execution-recovery.test.mjs, tests/automatic-agent-dialogue.test.mjs, tests/fixtures/automatic-agent-dialogue.mjs, tests/workflow-channel.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: RESULT-DELIVERY
- [DONE] UI-EVENTS: Передавать изменение Review агенту через существующий канал — Завершено
  - Git Commit: [DONE] fix: передавать изменение review агенту через существующий канал
  - Reference: release-0534-defects / UI-EVENTS / implementation
  - Файлы: src/control/workflow/plan-review.mjs, src/control/workflow/coordination.mjs, src/control/workflow/review-continuation.mjs, src/control/workflow/dialogue-delivery.mjs, src/control/plugin/workflow-channel.mjs, src/control/plugin/communication.mjs, src/control/plugin/startup-context.mjs, src/control/context/context-session.mjs, src/contracts/plugin-communication.mjs, src/frontend/plugin/launch.mjs, packages/workflow-kit/src/lib/role-protocol.mjs, packages/workflow-kit/src/lib/review-state.mjs, tools/codex-app-server-mcp/plugin.py, tests/plan-review.test.mjs, tests/workflow-channel.test.mjs, tests/chatgpt-plugin.test.mjs, tests/startup-context.test.mjs, src/backend/desktop-model.mjs, tests/backend-desktop-model.test.mjs, src/frontend/desktop/ui/sidebar.mjs, tests/electron-smoke.mjs, packages/workflow-kit/src/templates/PLAN.md
  - Параллельность: исключительное выполнение
  - Зависимости: EXECUTOR-START
- [DONE] REVIEW-VIEW: Показать раунды Review и сохранить историю согласования — Завершено
  - Git Commit: [DONE] fix: показать раунды review и сохранить историю согласования
  - Reference: release-0534-defects / REVIEW-VIEW / implementation
  - Файлы: src/backend/desktop-model.mjs, src/control/workflow/plan-review.mjs, src/control/workflow/plan-monitor.mjs, src/contracts/work-progress.mjs, src/frontend/plugin/panel.mjs, src/frontend/plugin/launch.mjs, src/frontend/desktop/ui/sidebar.mjs, src/frontend/desktop/ui/index.html, packages/workflow-kit/src/lib/review-state.mjs, packages/workflow-kit/src/lib/plan-review.mjs, packages/workflow-kit/src/lib/claude-review.mjs, packages/workflow-kit/scripts/check-plan-review-fixture.mjs, tests/plan-review.test.mjs, tests/work-progress.test.mjs, tests/work-progress-scenario.test.mjs, tests/panel-dialogue-view.test.mjs, tests/backend-desktop-model.test.mjs, tests/chatgpt-plugin.test.mjs, src/control/plugin/communication.mjs, src/execution/files/project-input-watch.mjs, tests/workflow-channel.test.mjs, tests/electron-smoke.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: UI-EVENTS
- [DONE] STATUS: Объяснять текущую работу и реальную причину задержки — Завершено
  - Git Commit: [DONE] fix: объяснять текущую работу и реальную причину задержки
  - Reference: release-0534-defects / STATUS / implementation
  - Файлы: src/contracts/dialogue-view.mjs, src/contracts/work-progress.mjs, src/backend/desktop-model.mjs, src/control/plugin/workflow-channel.mjs, src/frontend/plugin/panel.mjs, src/frontend/desktop/ui/current-actions.mjs, tests/work-progress.test.mjs, tests/panel-dialogue-view.test.mjs, tests/work-progress-scenario.test.mjs, tests/backend-desktop-model.test.mjs, tests/fixtures/current-actions-layout.mjs, tests/electron-smoke.mjs, tests/workflow-channel.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: REVIEW-VIEW
- [DONE] PROOF: Проверить путь от обсуждения до двух результатов и завершения — Завершено
  - Git Commit: [DONE] fix: проверить путь от обсуждения до двух результатов и завершения
  - Reference: release-0534-defects / PROOF / implementation
  - Файлы: tests/automatic-agent-dialogue.test.mjs, tests/fixtures/automatic-agent-dialogue.mjs, tests/workflow-channel.test.mjs, tests/plan-review.test.mjs, tests/backend-api.test.mjs, tests/electron-smoke.mjs, tests/web-client-electron.test.mjs, tests/fixtures/current-actions-layout.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: STATUS
- [DONE] VERSION: Подготовить версии приложения, Kit и панели для 0.5.35 — Завершено
  - Git Commit: [DONE] chore: подготовить выпуск 0.5.35
  - Reference: release-0534-defects / VERSION / implementation
  - Файлы: package.json, package-lock.json, packages/workflow-kit/package.json, packages/workflow-kit/src/lib/common.mjs, src/contracts/backend.mjs, tests/codex-app-server-mcp.test.mjs, tests/migration-compatibility.test.mjs, packages/workflow-kit/src/lib/installer.mjs, packages/workflow-kit/src/lib/role-protocol.mjs, tests/fixtures/remote-serve-proxy.mjs, docs/planning/release-0534-defects.md
  - Параллельность: исключительное выполнение
  - Зависимости: PROOF
- [DONE] DOCS: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: актуализация всех документов проекта
  - Reference: release-0534-defects / DOCS / implementation
  - Файлы: docs/planning/release-0534-defects.md, docs/planning/review-instructions-followup.md, README.md, docs/architecture/OVERVIEW.md, docs/modules/current-actions.md, docs/modules/desktop.md, docs/modules/native-window.md, docs/modules/remote-access.md, docs/modules/user-choice.md, docs/modules/chatgpt-plugin.md, docs/modules/dialogue-timing.md, docs/modules/assignment-dialogue.md, docs/modules/assignment-dialogue-reliability.md, docs/modules/prepared-tasks.md, docs/modules/workflow-execution.md, packages/workflow-kit/docs/modules/workflow-kit-package.md, packages/workflow-kit/src/templates/PLAN.md, docs/modules/orchestrated-execution.md, docs/acceptance/release-0534-defects.md, docs/modules/release.md, packages/workflow-kit/README.md, docs/acceptance/release-0535-defects.md, docs/modules/project-compatibility.md, docs/modules/orchestrator-startup.md, docs/modules/chat-only-startup.md, packages/workflow-kit/docs/modules/orchestrated-plans.md
  - Параллельность: исключительное выполнение
  - Зависимости: UI-CONTROLS, RESULT-DELIVERY, EXECUTOR-START, UI-EVENTS, REVIEW-VIEW, STATUS, PROOF, VERSION
- [DONE] RELEASE: Собрать и проверить релиз macOS Windows Linux — Завершено
  - Git Commit: [DONE] build: собрать полный выпуск 0.5.35
  - Reference: release-0534-defects / RELEASE / implementation
  - Файлы: release-manifest.json, docs/planning/release-0534-defects.md
  - Параллельность: исключительное выполнение
  - Зависимости: DOCS
- [DONE] INSTALL: Установить проверенный выпуск на этот Mac — Завершено
  - Git Commit: [DONE] delivery: установить проверенный выпуск 0.5.35
  - Reference: release-0534-defects / INSTALL / implementation
  - Файлы: release-manifest.json, docs/planning/release-0534-defects.md
  - Параллельность: исключительное выполнение
  - Зависимости: RELEASE, DOCS
- [IN_PROGRESS] PUBLISH: Опубликовать полный выпуск на GitHub — В работе
  - Git Commit: [PENDING] release: опубликовать полный комплект 0.5.35
  - Reference: release-0534-defects / PUBLISH / implementation
  - Файлы: release-manifest.json, docs/planning/release-0534-defects.md
  - Параллельность: исключительное выполнение
  - Зависимости: INSTALL, DOCS

## Context Pack For This Cycle

- docs/architecture/OVERVIEW.md
- docs/planning/release-0534-defects.md

Служебные состояния меняются только командами workflow. Приёмка не архивирует scope.
