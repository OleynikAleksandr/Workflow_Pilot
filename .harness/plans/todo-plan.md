# Активный план — Workflow_Pilot

<!-- workflow-state:begin -->
```json
{
  "schema_version": 1,
  "plan_revision": 613,
  "project_id": "7411e192-943c-4529-bffb-3b081d9c242f",
  "project_name": "Workflow_Pilot",
  "scope_id": "orchestrator-owned-dialogue-refactor",
  "execution_scope_status": "ACTIVE",
  "delivery_status": "IN_PROGRESS",
  "objective": "Один Start запускает исполнителей, которым оркестратор адресно выдаёт задачи и выбранный контекст; двусторонний диалог разрешает блокировки и доставляет результаты для приёмки, интеграции и завершения плана без участия пользователя в обычных шагах.",
  "acceptance_criteria": [
    "Планирование O, полный начальный DOM-контекст, Review и одна кнопка Start сохранены. E получают через DOM только правила/identity/bootstrap; рабочую задачу и минимальный контекст выбирает и отправляет O.",
    "Два-пять E автоматически подключаются без посещения карточек/ID/Enable, видны и адресуются независимо. Рабочий model API поддерживает O↔E задачи, вопросы, уточнения, решения и результат; авторство подтверждено.",
    "Обычная техническая блокировка разрешается настоящим многоходовым диалогом без пользователя. SDK не требует новой пользовательской реплики, очередь и busy/idle не создают взаимную блокировку.",
    "Проверенный commit E сопровождается его result O. O проверяет, принимает конкретную версию или требует доработку и выполняет интеграцию через Kit; DONE main не выводится из текста или READY.",
    "Pause/restart/UNKNOWN/миграция/удаление безопасны и идемпотентны; DOCS, delivery и итог предшествуют закрытию связи. Полный комплект трёх ОС и установка проверены, живые A–D принимаются отдельно."
  ],
  "approved_scope": {
    "functional_paths": [
      "packages/workflow-kit/src/lib/plan.mjs",
      "packages/workflow-kit/src/lib/actions.mjs",
      "packages/workflow-kit/src/lib/assignment-contract.mjs",
      "packages/workflow-kit/src/lib/task-assignment.mjs",
      "packages/workflow-kit/src/lib/task-integration.mjs",
      "packages/workflow-kit/src/lib/integration-proof.mjs",
      "packages/workflow-kit/src/lib/signals.mjs",
      "packages/workflow-kit/src/lib/signal-state.mjs",
      "packages/workflow-kit/src/lib/transaction-state.mjs",
      "packages/workflow-kit/src/lib/assignment-dialogue.mjs",
      "packages/workflow-kit/src/cli.mjs",
      "packages/workflow-kit/src/lib/command-help.mjs",
      "packages/workflow-kit/scripts/check-task-assignment-fixture.mjs",
      "packages/workflow-kit/scripts/check-task-integration-fixture.mjs",
      "packages/workflow-kit/scripts/check-orchestrated-execution-fixture.mjs",
      "packages/workflow-kit/src/schemas/plan.schema.json",
      "packages/workflow-kit/src/lib/validate.mjs",
      "packages/workflow-kit/src/lib/validation-rules.mjs",
      "tools/codex-app-server-mcp/plugin.py",
      "tools/codex-app-server-mcp/server.py",
      "src/control/plugin/communication.mjs",
      "src/control/plugin/workflow-channel.mjs",
      "src/control/plugin/enrollment.mjs",
      "src/control/plugin/service.mjs",
      "src/control/workflow/dialogue-delivery.mjs",
      "src/control/workflow/parallel-kit.mjs",
      "src/execution/facade.mjs",
      "src/execution/plugin/communication-store.mjs",
      "src/contracts/plugin-communication.mjs",
      "tests/workflow-channel.test.mjs",
      "tests/plugin-communication.test.mjs",
      "tests/codex-app-server-mcp.test.mjs",
      "tests/chatgpt-plugin.test.mjs",
      "src/contracts/backend.mjs",
      "tests/plugin-communication-store.test.mjs",
      "tests/plugin-enrollment.test.mjs",
      "tests/fixtures/plugin-host.mjs",
      "src/control/workflow/executor-session.mjs",
      "src/control/workflow/coordination.mjs",
      "src/execution/browser/chatgpt-page-observer.mjs",
      "src/frontend/plugin/panel.mjs",
      "tests/automatic-agent-dialogue.test.mjs",
      "tests/fixtures/automatic-agent-dialogue.mjs",
      "tests/fixtures/dialogue-runtime.mjs",
      "src/control/context/context-session.mjs",
      "src/control/context/service.mjs",
      "src/control/context/context-cache.mjs",
      "src/control/sessions/service.mjs",
      "src/backend/desktop-model.mjs",
      "src/execution/browser/backend-host.mjs",
      "src/execution/browser/session-runtime.mjs",
      "packages/workflow-kit/src/lib/recovery.mjs",
      "src/contracts/context.mjs",
      "tests/context-session.test.mjs",
      "tests/context-cache.test.mjs",
      "tests/session-runtime.test.mjs",
      "tests/backend-native-pages.test.mjs",
      "tests/electron-smoke.mjs",
      "tests/executor-startup-lifecycle.test.mjs",
      "src/execution/browser/chatgpt-experience.mjs",
      "tests/chatgpt-experience.test.mjs",
      "packages/workflow-kit/src/lib/role-protocol.mjs",
      "packages/workflow-kit/src/templates/PROTOTYPE.md",
      "packages/workflow-kit/src/WORKFLOW.md",
      "packages/workflow-kit/scripts/check-project-recovery-fixture.mjs",
      "packages/workflow-kit/src/templates/PLAN.md",
      "src/control/workflow/parallel-execution.mjs",
      "src/control/workflow/plan-continuation.mjs",
      "tests/parallel-execution.test.mjs",
      "tests/parallel-finalization.test.mjs",
      "tests/orchestrated-execution.test.mjs",
      "tests/workflow-signals.test.mjs",
      "src/control/workflow/execution-control.mjs",
      "src/control/projects/project-compatibility.mjs",
      "src/control/projects/workspace-deletion.mjs",
      "src/backend/bootstrap.mjs",
      "packages/workflow-kit/src/lib/installer.mjs",
      "packages/workflow-kit/scripts/check-previous-upgrade-fixture.mjs",
      "tests/parallel-execution-recovery.test.mjs",
      "tests/migration-compatibility.test.mjs",
      "tests/workspace-deletion.test.mjs",
      "tests/backend-upgrade.test.mjs",
      "tests/panel-resource-upgrade.test.mjs",
      "tests/workflow-kit-upgrade.test.mjs",
      "src/control/workflow/execution-projection.mjs",
      "src/frontend/desktop/ui/sidebar.mjs",
      "src/frontend/plugin/app.mjs",
      "tests/sidebar.test.mjs",
      "tests/parallel-execution-ui.test.mjs",
      "tests/backend-end-to-end.test.mjs",
      "package.json",
      "package-lock.json",
      "packages/workflow-kit/package.json",
      "scripts/stage-chatgpt-plugin.mjs",
      "packages/workflow-kit/src/lib/common.mjs",
      "release-manifest.json",
      "tests/workflow-kit-recovery.test.mjs",
      "src/control/plugin/assignment-dialogue.mjs",
      "src/control/facade.mjs",
      "src/execution/plugin/bridge.mjs",
      "src/execution/browser/chatgpt-composer.mjs",
      "tests/chatgpt-composer.test.mjs",
      "tests/page-state.test.mjs",
      "tests/executor-background-startup.test.mjs",
      "tests/fixtures/executor-background-startup.mjs",
      "packages/workflow-kit/src/lib/simple-workflow.mjs",
      "src/control/sessions/workspace-session.mjs",
      "tests/workspace-session.test.mjs",
      "packages/workflow-kit/src/lib/assignment-command-safety.mjs",
      "packages/workflow-kit/src/lib/task-handoff.mjs",
      "resources/workspace-setup-worker.mjs",
      "src/control/projects/workspace-setup.mjs",
      "tests/fixtures/released-kit/manifest.json",
      "packages/workflow-kit/src/lib/dialogue-migration-state.mjs",
      "packages/workflow-kit/src/lib/dialogue-migration.mjs",
      "packages/workflow-kit/src/lib/plan-permission.mjs",
      "tests/dialogue-migration.test.mjs",
      "tests/fixtures/released-kit/kit-1.8.2.tar.gz",
      "src/frontend/plugin/index.html",
      "src/frontend/plugin/launch.mjs",
      "src/contracts/dialogue-view.mjs",
      "tests/panel-dialogue-view.test.mjs"
    ],
    "documentation_paths": [
      "docs/planning/orchestrator-owned-dialogue.md",
      "docs/planning/orchestrator-owned-dialogue-reliability.md",
      "docs/planning/orchestrator-owned-dialogue-results.md",
      "README.md",
      "AGENTS.md",
      "docs/architecture/OVERVIEW.md",
      "docs/modules/chatgpt-plugin.md",
      "docs/modules/workflow-execution.md",
      "docs/modules/orchestrated-execution.md",
      "docs/modules/automatic-agent-dialogue-acceptance.md",
      "docs/modules/chatgpt-plugin-acceptance.md",
      "docs/modules/backend.md",
      "docs/modules/browser.md",
      "docs/modules/desktop.md",
      "docs/modules/project-compatibility.md",
      "docs/modules/release.md",
      "docs/acceptance/orchestrated-execution.md",
      "packages/workflow-kit/docs/modules/orchestrated-plans.md",
      "packages/workflow-kit/docs/modules/parallel-assignments.md",
      "docs/modules/plugin-communication-handoff.md",
      "docs/modules/control.md",
      "docs/modules/execution.md",
      "packages/workflow-kit/docs/modules/workflow-kit-package.md",
      "docs/planning/executor-readiness-recovery.md",
      "packages/workflow-kit/src/templates/PROTOTYPE.md",
      "packages/workflow-kit/src/WORKFLOW.md",
      "packages/workflow-kit/src/templates/PLAN.md"
    ]
  },
  "baseline_commit": "99e36fd1df663fb269ddf6f695423f5bd5a44fe9",
  "current_task_id": null,
  "context_pack": {
    "documents": [
      {
        "path": "docs/planning/orchestrator-owned-dialogue.md",
        "required": true,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/planning/orchestrator-owned-dialogue-reliability.md",
        "required": true,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/planning/orchestrator-owned-dialogue-results.md",
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
        "scope_id": "orchestrator-owned-dialogue-refactor",
        "task_id": "T001",
        "role": "implementation"
      },
      "dependencies": [],
      "functional_paths": [
        "packages/workflow-kit/src/lib/plan.mjs",
        "packages/workflow-kit/src/lib/actions.mjs",
        "packages/workflow-kit/src/lib/assignment-contract.mjs",
        "packages/workflow-kit/src/lib/task-assignment.mjs",
        "packages/workflow-kit/src/lib/task-integration.mjs",
        "packages/workflow-kit/src/lib/integration-proof.mjs",
        "packages/workflow-kit/src/lib/signals.mjs",
        "packages/workflow-kit/src/lib/signal-state.mjs",
        "packages/workflow-kit/src/lib/transaction-state.mjs",
        "packages/workflow-kit/src/lib/assignment-dialogue.mjs",
        "packages/workflow-kit/src/cli.mjs",
        "packages/workflow-kit/src/lib/command-help.mjs",
        "packages/workflow-kit/scripts/check-task-assignment-fixture.mjs",
        "packages/workflow-kit/scripts/check-task-integration-fixture.mjs",
        "packages/workflow-kit/scripts/check-orchestrated-execution-fixture.mjs",
        "packages/workflow-kit/src/schemas/plan.schema.json",
        "packages/workflow-kit/src/lib/validate.mjs",
        "packages/workflow-kit/src/lib/validation-rules.mjs",
        "packages/workflow-kit/src/lib/recovery.mjs",
        "tests/workflow-kit-recovery.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/orchestrator-owned-dialogue.md",
        "docs/planning/orchestrator-owned-dialogue-reliability.md"
      ],
      "verification_ids": [
        "kit-check",
        "unit-all",
        "architecture"
      ],
      "id": "T001",
      "title": "Ввести контракт назначений с диалогом и приёмкой в Kit",
      "why": "Сделать поручение, попытку, доказательство результата и решение O проверяемыми переходами без второго плана.",
      "parallel_safe": false,
      "acceptance_criteria": [
        "Закреплены версия нового режима, schema конверта и машинные ошибки, собственная identity/назначение/попытка, task grant, result proof, acceptance и revision request; старые sequential/parallel и legacy не меняют контракт молча.",
        "Новые Kit операции идемпотентны по operation ID, не расширяют разрешённые пути и не объявляют DONE по сообщению. task:start нового E требует текущего поручения O; source_commit/attempt/result_id проверяются до приёмки и integration:start.",
        "До интеграции доработка открывается только O как новая попытка того же задания при безопасном состоянии; прежние проверки/коммит/результат сохраняются, прежняя приёмка отзывается. После интеграции нужна новая задача. Allowlist E, recovery/commit provenance и повтор после сбоя согласованы.",
        "Запрещены чужое назначение, устаревшая попытка, самоприёмка E, интеграция без приёмки и изменённый SHA. Сохранены single writer, pending transaction, merge conflict/check failure и проверенные доказательства main."
      ],
      "expected_commit_message": "feat: Ввести контракт назначений с диалогом и приёмкой в Kit",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/orchestrator-owned-dialogue.md",
            "required": true
          },
          {
            "path": "docs/planning/orchestrator-owned-dialogue-reliability.md",
            "required": true
          },
          {
            "path": "docs/planning/orchestrator-owned-dialogue-results.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "actual_files": [
        "docs/planning/orchestrator-owned-dialogue-reliability.md",
        "docs/planning/orchestrator-owned-dialogue.md",
        "packages/workflow-kit/scripts/check-orchestrated-execution-fixture.mjs",
        "packages/workflow-kit/src/cli.mjs",
        "packages/workflow-kit/src/lib/actions.mjs",
        "packages/workflow-kit/src/lib/assignment-contract.mjs",
        "packages/workflow-kit/src/lib/assignment-dialogue.mjs",
        "packages/workflow-kit/src/lib/command-help.mjs",
        "packages/workflow-kit/src/lib/integration-proof.mjs",
        "packages/workflow-kit/src/lib/plan.mjs",
        "packages/workflow-kit/src/lib/recovery.mjs",
        "packages/workflow-kit/src/lib/task-assignment.mjs",
        "packages/workflow-kit/src/lib/task-integration.mjs",
        "packages/workflow-kit/src/schemas/plan.schema.json",
        "tests/workflow-kit-recovery.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "orchestrator-owned-dialogue-refactor",
        "task_id": "T002",
        "role": "implementation"
      },
      "dependencies": [
        "T001"
      ],
      "functional_paths": [
        "tools/codex-app-server-mcp/plugin.py",
        "tools/codex-app-server-mcp/server.py",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/control/plugin/enrollment.mjs",
        "src/control/plugin/service.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/control/workflow/parallel-kit.mjs",
        "src/execution/facade.mjs",
        "src/execution/plugin/communication-store.mjs",
        "src/contracts/plugin-communication.mjs",
        "tests/workflow-channel.test.mjs",
        "tests/plugin-communication.test.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "src/contracts/backend.mjs",
        "tests/plugin-communication-store.test.mjs",
        "tests/plugin-enrollment.test.mjs",
        "tests/fixtures/plugin-host.mjs",
        "src/control/plugin/assignment-dialogue.mjs",
        "src/control/facade.mjs",
        "src/execution/plugin/bridge.mjs",
        "packages/workflow-kit/src/lib/recovery.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "architecture",
        "executor-channel",
        "chatgpt-plugin"
      ],
      "id": "T002",
      "title": "Добавить рабочий адресный API и долговечные сообщения агентов",
      "why": "Дать O и E реальный инструмент отправки поручений, вопросов и результатов в рабочих планах.",
      "parallel_safe": false,
      "acceptance_criteria": [
        "workflow_assignment_send/yield/status доступны в фактическом MCP; read_message/read_context/participants согласованы. O выбирает конкретного E из реестра, E — своего O; автор определяется host identity без run/participant ID от пользователя.",
        "Поддержаны task/context_request/context/question/clarification/decision/result/revision_request/acceptance и service-события. Реестр показывает все назначения O; содержательные сообщения имеют автора O/E, service — backend.",
        "Сохранён intent до Kit эффекта и сообщение после него, единый operation/idempotency ID; сбои между каждым шагом восстанавливают тот же эффект и receipt. Kit остаётся источником assignment/proof, WAL — текста/доставки. Отдельный scheduler не создан.",
        "Контекст O сохраняется неизменяемыми частями с источником/commit/digest/размером; переполнение не обрезается, чтение требует собственного актуального адресата. Ошибки stale/denied/conflict/stopped/unknown предметны. Legacy send сохраняет свой контракт."
      ],
      "expected_commit_message": "feat: Добавить рабочий адресный API и долговечные сообщения агентов",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/orchestrator-owned-dialogue.md",
            "required": true
          },
          {
            "path": "docs/planning/orchestrator-owned-dialogue-reliability.md",
            "required": true
          },
          {
            "path": "docs/planning/orchestrator-owned-dialogue-results.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "actual_files": [
        "packages/workflow-kit/src/lib/recovery.mjs",
        "src/contracts/backend.mjs",
        "src/contracts/plugin-communication.mjs",
        "src/control/facade.mjs",
        "src/control/plugin/assignment-dialogue.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/service.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/execution/plugin/bridge.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/workflow-channel.test.mjs",
        "tools/codex-app-server-mcp/plugin.py"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "orchestrator-owned-dialogue-refactor",
        "task_id": "T003",
        "role": "implementation"
      },
      "dependencies": [
        "T002"
      ],
      "functional_paths": [
        "src/control/plugin/workflow-channel.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/control/workflow/executor-session.mjs",
        "src/control/workflow/coordination.mjs",
        "src/execution/browser/chatgpt-page-observer.mjs",
        "src/frontend/plugin/panel.mjs",
        "tests/workflow-channel.test.mjs",
        "tests/automatic-agent-dialogue.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/fixtures/dialogue-runtime.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "src/backend/desktop-model.mjs",
        "src/control/plugin/assignment-dialogue.mjs",
        "src/control/plugin/service.mjs",
        "src/execution/browser/chatgpt-composer.mjs",
        "src/execution/browser/session-runtime.mjs",
        "tests/chatgpt-composer.test.mjs",
        "tests/page-state.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/orchestrator-owned-dialogue-reliability.md",
        "docs/planning/orchestrator-owned-dialogue-results.md"
      ],
      "verification_ids": [
        "unit-all",
        "architecture",
        "electron-smoke",
        "chatgpt-plugin"
      ],
      "id": "T003",
      "title": "Исправить обработку ходов и последовательное пробуждение",
      "why": "Устранить зависимость SDK-хода от пользовательской реплики и взаимную блокировку вопроса с ответом.",
      "parallel_safe": false,
      "acceptance_criteria": [
        "Доставка без нового user bubble/userTurnId обрабатывается по read + собственному коррелированному yield + подтверждённому завершению физического хода; ранний yield и старый idle не открывают следующий вход.",
        "Входящий gate не запрещает текущему агенту исходящий question/result/task. После вопроса и окончания хода E получает clarification/decision; исходное task не удерживается до DONE. Нет циклического ожидания.",
        "Несколько готовых E и одновременные результаты не теряются при занятом O; FIFO получателя, пробуждение после завершения текущего хода и независимость разных получателей проверены.",
        "Неопределённая доставка не повторяется; read/yield того же ID уточняют исход без resend. Observer имеет ограниченную read-only сверку только для текущего gate; нет модельного polling или рабочих DOM fallback. Проверены busy/draft, поздний callback, restart и stale generation."
      ],
      "expected_commit_message": "feat: Исправить обработку ходов и последовательное пробуждение",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/orchestrator-owned-dialogue.md",
            "required": true
          },
          {
            "path": "docs/planning/orchestrator-owned-dialogue-reliability.md",
            "required": true
          },
          {
            "path": "docs/planning/orchestrator-owned-dialogue-results.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "actual_files": [
        "docs/planning/orchestrator-owned-dialogue-reliability.md",
        "docs/planning/orchestrator-owned-dialogue-results.md",
        "src/backend/desktop-model.mjs",
        "src/control/plugin/assignment-dialogue.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/service.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/execution/browser/chatgpt-composer.mjs",
        "src/execution/browser/chatgpt-page-observer.mjs",
        "src/execution/browser/session-runtime.mjs",
        "tests/chatgpt-composer.test.mjs",
        "tests/page-state.test.mjs",
        "tests/workflow-channel.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "orchestrator-owned-dialogue-refactor",
        "task_id": "T004",
        "role": "implementation"
      },
      "dependencies": [
        "T003"
      ],
      "functional_paths": [
        "src/control/context/context-session.mjs",
        "src/control/context/service.mjs",
        "src/control/context/context-cache.mjs",
        "src/control/sessions/service.mjs",
        "src/backend/desktop-model.mjs",
        "src/execution/browser/backend-host.mjs",
        "src/execution/browser/session-runtime.mjs",
        "packages/workflow-kit/src/lib/recovery.mjs",
        "src/contracts/context.mjs",
        "tests/context-session.test.mjs",
        "tests/context-cache.test.mjs",
        "tests/session-runtime.test.mjs",
        "tests/backend-native-pages.test.mjs",
        "tests/electron-smoke.mjs",
        "tests/executor-startup-lifecycle.test.mjs",
        "src/execution/browser/chatgpt-experience.mjs",
        "src/execution/browser/chatgpt-page-observer.mjs",
        "src/control/workflow/executor-session.mjs",
        "tests/chatgpt-experience.test.mjs",
        "packages/workflow-kit/src/lib/role-protocol.mjs",
        "packages/workflow-kit/scripts/check-orchestrated-execution-fixture.mjs",
        "tests/executor-background-startup.test.mjs",
        "tests/fixtures/executor-background-startup.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "architecture",
        "kit-check",
        "electron-smoke"
      ],
      "id": "T004",
      "title": "Автоматически запускать E с минимальным bootstrap",
      "why": "Убрать необходимость посещения карточек и передачу исполнителю всего проектного recovery через DOM.",
      "parallel_safe": false,
      "acceptance_criteria": [
        "Причина фонового ожидания воспроизведена на изолированном реальном контуре page/observer/experience/runtime; Start двух и пяти E проходит без select/show/focus/ручного открытия. Readiness страницы, binding и SDK различаются.",
        "DOM E содержит только общие канонические правила, обязательные ограничения, workspace/назначение и приглашение панели; без полного recovery/context_pack/содержательного задания. Bootstrap заканчивается до task:start.",
        "O сохраняет полный начальный DOM-контекст и прежнее планирование/Review. Recovery E, повторный task:start/commit и compact не подмешивают весь проект; обязательные ограничения не теряются.",
        "Существующие sending/sent/unknown не повторяются; выбор карточки не заменяет страницу, постоянный URL сохраняется. Lifecycle lock/shared ensure, Stop/смена поколения/удаление и восстановление страницы не регрессируют."
      ],
      "expected_commit_message": "feat: Автоматически запускать E с минимальным bootstrap",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/orchestrator-owned-dialogue.md",
            "required": true
          },
          {
            "path": "docs/planning/orchestrator-owned-dialogue-reliability.md",
            "required": true
          },
          {
            "path": "docs/planning/orchestrator-owned-dialogue-results.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "actual_files": [
        "packages/workflow-kit/src/lib/recovery.mjs",
        "packages/workflow-kit/src/lib/role-protocol.mjs",
        "packages/workflow-kit/scripts/check-orchestrated-execution-fixture.mjs",
        "src/contracts/context.mjs",
        "src/control/context/context-session.mjs",
        "src/control/sessions/service.mjs",
        "tests/executor-background-startup.test.mjs",
        "tests/fixtures/executor-background-startup.mjs",
        "tests/context-session.test.mjs",
        "tests/session-runtime.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "orchestrator-owned-dialogue-refactor",
        "task_id": "T005",
        "role": "implementation"
      },
      "dependencies": [
        "T004"
      ],
      "functional_paths": [
        "packages/workflow-kit/src/lib/role-protocol.mjs",
        "packages/workflow-kit/src/lib/recovery.mjs",
        "packages/workflow-kit/src/lib/command-help.mjs",
        "src/control/context/context-session.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/control/plugin/communication.mjs",
        "tools/codex-app-server-mcp/plugin.py",
        "tools/codex-app-server-mcp/server.py",
        "packages/workflow-kit/scripts/check-project-recovery-fixture.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/context-session.test.mjs",
        "packages/workflow-kit/scripts/check-orchestrated-execution-fixture.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/workflow-channel.test.mjs"
      ],
      "documentation_paths": [
        "packages/workflow-kit/src/templates/PROTOTYPE.md",
        "packages/workflow-kit/src/WORKFLOW.md",
        "packages/workflow-kit/src/templates/PLAN.md"
      ],
      "verification_ids": [
        "kit-check",
        "unit-all",
        "architecture",
        "executor-channel",
        "chatgpt-plugin"
      ],
      "id": "T005",
      "title": "Согласовать роли и передачу выбранного контекста",
      "why": "Закрепить поведение O/E в одном источнике и исключить противоречия между startup, Kit и MCP.",
      "parallel_safe": false,
      "acceptance_criteria": [
        "Канонический versioned role-protocol предписывает O дозировать контекст, выдавать задания, вести уточнения, принимать результат и интегрировать; E ждать поручение, спрашивать O, отправлять result и yield без пользовательского продолжения.",
        "Фактические startup/recovery/templates/MCP instructions/tool descriptions/backend errors проверены на согласованность: нет ручного join/ID/Enable, ложного обещания автоматического merge и запрета рабочего result.",
        "Нехватка контекста до task:start допускает адресный вопрос; обновления правил открытого чата не повторяют выполненную работу. Выбранные документы/фрагменты O читаются целиком и не заменяют обязательные ограничения проекта.",
        "Инструкции различают получение сообщения, конец хода, результат E, приёмку O и DONE main; обычное ожидание не расходует модельные ходы. Изменены только исходники Kit, установленная managed-копия обновляется installer.",
        "PLAN.md описывает task.context_pack нового режима как рекомендуемый список O без автоматической доставки E; обязательные ограничения полны отдельно, результат принимает O до каждой интеграции без ожидания общего финального поручения. Legacy семантика сохранена."
      ],
      "expected_commit_message": "feat: Согласовать роли и передачу выбранного контекста",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/orchestrator-owned-dialogue.md",
            "required": true
          },
          {
            "path": "docs/planning/orchestrator-owned-dialogue-reliability.md",
            "required": true
          },
          {
            "path": "docs/planning/orchestrator-owned-dialogue-results.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "actual_files": [
        "packages/workflow-kit/scripts/check-orchestrated-execution-fixture.mjs",
        "packages/workflow-kit/src/WORKFLOW.md",
        "packages/workflow-kit/src/lib/command-help.mjs",
        "packages/workflow-kit/src/lib/recovery.mjs",
        "packages/workflow-kit/src/lib/role-protocol.mjs",
        "packages/workflow-kit/src/templates/PLAN.md",
        "packages/workflow-kit/src/templates/PROTOTYPE.md",
        "src/control/plugin/communication.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/workflow-channel.test.mjs",
        "tools/codex-app-server-mcp/plugin.py",
        "tools/codex-app-server-mcp/server.py"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "orchestrator-owned-dialogue-refactor",
        "task_id": "T006",
        "role": "implementation"
      },
      "dependencies": [
        "T005"
      ],
      "functional_paths": [
        "src/control/workflow/parallel-execution.mjs",
        "src/control/workflow/parallel-kit.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/control/workflow/plan-continuation.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "tests/automatic-agent-dialogue.test.mjs",
        "tests/parallel-execution.test.mjs",
        "tests/parallel-finalization.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/orchestrated-execution.test.mjs",
        "packages/workflow-kit/scripts/check-orchestrated-execution-fixture.mjs",
        "packages/workflow-kit/src/lib/simple-workflow.mjs",
        "packages/workflow-kit/src/lib/task-integration.mjs",
        "src/control/plugin/assignment-dialogue.mjs",
        "src/control/plugin/enrollment.mjs",
        "src/control/plugin/service.mjs",
        "src/control/sessions/workspace-session.mjs",
        "src/control/workflow/executor-session.mjs",
        "tests/workspace-session.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "architecture",
        "kit-check",
        "electron-smoke",
        "executor-channel"
      ],
      "id": "T006",
      "title": "Передать O выдачу заданий и управление интеграцией",
      "why": "Соединить существующий scheduler с настоящими решениями оркестратора до итогового ответа.",
      "parallel_safe": false,
      "acceptance_criteria": [
        "Один Start механически создаёт допустимые назначения и durable ready-события O; только O-authored task/context разрешает рабочий ход E. Backend assignment-start с готовым поручением удалён из нового маршрута.",
        "E result автоматически доставляется O; O проверяет и принимает конкретный source_commit, затем вызывает Kit integration. Автоматический merge по одному READY отключён только в новом режиме, Kit повторно проверяет приёмку.",
        "Один O и 2–5 E сохраняют зависимости/лимиты/исключительные пути и последовательный main. Последующая зависимая задача не получает task до интеграции предшественников.",
        "DOCS получает задание и контекст от O после остальных интеграций; O выполняет delivery/cleanup/итог. Grant не закрывается до финальной обработки и нужных receipts, отсутствие сообщений не означает complete. Повторные ready/result не создают работу повторно.",
        "Существующие legacy assertions автоматической интеграции не удаляются: новая версия диалога проверяется отдельными случаями O-authored task/result/acceptance/integration."
      ],
      "expected_commit_message": "feat: Передать O выдачу заданий и управление интеграцией",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/orchestrator-owned-dialogue.md",
            "required": true
          },
          {
            "path": "docs/planning/orchestrator-owned-dialogue-reliability.md",
            "required": true
          },
          {
            "path": "docs/planning/orchestrator-owned-dialogue-results.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "actual_files": [
        "packages/workflow-kit/scripts/check-orchestrated-execution-fixture.mjs",
        "packages/workflow-kit/src/lib/simple-workflow.mjs",
        "packages/workflow-kit/src/lib/task-integration.mjs",
        "src/control/plugin/assignment-dialogue.mjs",
        "src/control/plugin/enrollment.mjs",
        "src/control/plugin/service.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/control/sessions/workspace-session.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/control/workflow/executor-session.mjs",
        "src/control/workflow/parallel-execution.mjs",
        "tests/automatic-agent-dialogue.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/parallel-finalization.test.mjs",
        "tests/workspace-session.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "orchestrator-owned-dialogue-refactor",
        "task_id": "T007",
        "role": "implementation"
      },
      "dependencies": [
        "T006"
      ],
      "functional_paths": [
        "packages/workflow-kit/src/lib/signals.mjs",
        "packages/workflow-kit/src/lib/signal-state.mjs",
        "packages/workflow-kit/src/lib/assignment-dialogue.mjs",
        "src/control/workflow/parallel-execution.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "tests/automatic-agent-dialogue.test.mjs",
        "tests/workflow-signals.test.mjs",
        "packages/workflow-kit/scripts/check-orchestrated-execution-fixture.mjs",
        "packages/workflow-kit/src/lib/role-protocol.mjs",
        "packages/workflow-kit/src/lib/task-integration.mjs",
        "src/control/plugin/assignment-dialogue.mjs",
        "src/control/workflow/parallel-kit.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/orchestrated-execution.test.mjs",
        "tools/codex-app-server-mcp/plugin.py",
        "packages/workflow-kit/src/lib/assignment-command-safety.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "kit-check",
        "unit-all",
        "architecture",
        "electron-smoke",
        "chatgpt-plugin"
      ],
      "id": "T007",
      "title": "Замкнуть диалог блокировок и доработки результата",
      "why": "Позволить E и O обменяться несколькими уточнениями и продолжить работу без пользователя.",
      "parallel_safe": false,
      "acceptance_criteria": [
        "Проверен context_request до task:start и E question → O clarification → E facts → O decision/context → E resume на одной блокировке; clarification не разблокирует и не увеличивает попытки ремонта.",
        "Старые task:block/assignment:message и новый MCP проходят единую корреляцию без двойных отправок. E не дублирует сигнал CLI-командой; stale block/attempt не возобновляет задачу.",
        "O исправляет общую среду только при безопасно припаркованных затронутых E; соседние независимые назначения продолжают. Полномочия/секреты/scope и третья неуспешная попытка требуют предметной эскалации.",
        "O revision_request приводит к новой разрешённой попытке E, сохранению прежних proof и новому result/acceptance. Pending integration/dirty/transaction не обходятся; после DONE коррекция идёт новой задачей. Проверены конфликты/check failure и адресное продолжение O."
      ],
      "expected_commit_message": "feat: Замкнуть диалог блокировок и доработки результата",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/orchestrator-owned-dialogue.md",
            "required": true
          },
          {
            "path": "docs/planning/orchestrator-owned-dialogue-reliability.md",
            "required": true
          },
          {
            "path": "docs/planning/orchestrator-owned-dialogue-results.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "actual_files": [
        "packages/workflow-kit/scripts/check-orchestrated-execution-fixture.mjs",
        "packages/workflow-kit/src/lib/assignment-dialogue.mjs",
        "packages/workflow-kit/src/lib/role-protocol.mjs",
        "packages/workflow-kit/src/lib/signal-state.mjs",
        "packages/workflow-kit/src/lib/signals.mjs",
        "packages/workflow-kit/src/lib/task-integration.mjs",
        "src/control/plugin/assignment-dialogue.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/control/workflow/parallel-execution.mjs",
        "src/control/workflow/parallel-kit.mjs",
        "tests/automatic-agent-dialogue.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/orchestrated-execution.test.mjs",
        "tests/workflow-signals.test.mjs",
        "tools/codex-app-server-mcp/plugin.py",
        "packages/workflow-kit/src/lib/assignment-command-safety.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "orchestrator-owned-dialogue-refactor",
        "task_id": "T008",
        "role": "implementation"
      },
      "dependencies": [
        "T007"
      ],
      "functional_paths": [
        "src/control/workflow/parallel-execution.mjs",
        "src/control/workflow/execution-control.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/plugin/enrollment.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/control/projects/project-compatibility.mjs",
        "src/control/projects/workspace-deletion.mjs",
        "src/backend/bootstrap.mjs",
        "packages/workflow-kit/src/lib/installer.mjs",
        "packages/workflow-kit/src/lib/assignment-dialogue.mjs",
        "packages/workflow-kit/scripts/check-previous-upgrade-fixture.mjs",
        "tests/parallel-execution-recovery.test.mjs",
        "tests/migration-compatibility.test.mjs",
        "tests/workspace-deletion.test.mjs",
        "tests/backend-upgrade.test.mjs",
        "tests/panel-resource-upgrade.test.mjs",
        "tests/workflow-kit-upgrade.test.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/execution/plugin/communication-store.mjs",
        "packages/workflow-kit/scripts/check-orchestrated-execution-fixture.mjs",
        "packages/workflow-kit/src/cli.mjs",
        "packages/workflow-kit/src/lib/assignment-contract.mjs",
        "packages/workflow-kit/src/lib/integration-proof.mjs",
        "packages/workflow-kit/src/lib/recovery.mjs",
        "packages/workflow-kit/src/lib/signals.mjs",
        "packages/workflow-kit/src/lib/task-assignment.mjs",
        "packages/workflow-kit/src/lib/task-handoff.mjs",
        "packages/workflow-kit/src/lib/task-integration.mjs",
        "packages/workflow-kit/src/lib/transaction-state.mjs",
        "resources/workspace-setup-worker.mjs",
        "src/backend/desktop-model.mjs",
        "src/contracts/backend.mjs",
        "src/control/facade.mjs",
        "src/control/plugin/assignment-dialogue.mjs",
        "src/control/plugin/service.mjs",
        "src/control/projects/workspace-setup.mjs",
        "src/control/workflow/parallel-kit.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/fixtures/released-kit/manifest.json",
        "tests/workflow-channel.test.mjs",
        "tools/codex-app-server-mcp/plugin.py",
        "packages/workflow-kit/src/lib/dialogue-migration-state.mjs",
        "packages/workflow-kit/src/lib/dialogue-migration.mjs",
        "packages/workflow-kit/src/lib/plan-permission.mjs",
        "tests/dialogue-migration.test.mjs",
        "tests/fixtures/released-kit/kit-1.8.2.tar.gz"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "kit-check",
        "unit-all",
        "architecture",
        "migration-compatibility",
        "electron-smoke"
      ],
      "id": "T008",
      "title": "Обеспечить восстановление и переход старых назначений",
      "why": "Сохранить работу после паузы/сбоя и обновления без повторных отправок и подделки отчётов.",
      "parallel_safe": false,
      "acceptance_criteria": [
        "Fault injection intent/Kit/WAL/SDK/read/yield/acceptance/integration восстанавливает существующий operation ID и очереди. UNKNOWN не resend; факты уточняются без фиктивного read/DONE.",
        "Пауза запрещает новые назначения/пробуждения/интеграции, активный агент может сохранить outbox; Continue восстанавливает актуальный scope/generation. Закрытие окна не останавливает backend, restart требует одного общего Continue.",
        "Старые планы не переключаются молча. Штатная адресная миграция orchestrated 0.5.7 только в безопасной паузе проверяет все назначения; READY E получает просьбу O прислать result существующего коммита, integrated E не повторяется. Busy/unknown даёт конкретный отказ/ожидание.",
        "Удаление/убрать незавершённый проект работает с pending intents и dirty/UNKNOWN, поздние callbacks не воскрешают запись. Соседи/donor сохранены; старые resource/SDK и несовместимый Kit дают предметные состояния. Test_02 и рабочий профиль не изменены."
      ],
      "expected_commit_message": "feat: Обеспечить восстановление и переход старых назначений",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/orchestrator-owned-dialogue.md",
            "required": true
          },
          {
            "path": "docs/planning/orchestrator-owned-dialogue-reliability.md",
            "required": true
          },
          {
            "path": "docs/planning/orchestrator-owned-dialogue-results.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "actual_files": [
        "packages/workflow-kit/scripts/check-orchestrated-execution-fixture.mjs",
        "packages/workflow-kit/src/cli.mjs",
        "packages/workflow-kit/src/lib/assignment-contract.mjs",
        "packages/workflow-kit/src/lib/assignment-dialogue.mjs",
        "packages/workflow-kit/src/lib/installer.mjs",
        "packages/workflow-kit/src/lib/integration-proof.mjs",
        "packages/workflow-kit/src/lib/recovery.mjs",
        "packages/workflow-kit/src/lib/signals.mjs",
        "packages/workflow-kit/src/lib/task-assignment.mjs",
        "packages/workflow-kit/src/lib/task-handoff.mjs",
        "packages/workflow-kit/src/lib/task-integration.mjs",
        "packages/workflow-kit/src/lib/transaction-state.mjs",
        "resources/workspace-setup-worker.mjs",
        "src/backend/bootstrap.mjs",
        "src/backend/desktop-model.mjs",
        "src/contracts/backend.mjs",
        "src/control/facade.mjs",
        "src/control/plugin/assignment-dialogue.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/service.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/control/projects/workspace-setup.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/control/workflow/parallel-execution.mjs",
        "src/control/workflow/parallel-kit.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/fixtures/released-kit/manifest.json",
        "tests/parallel-execution-recovery.test.mjs",
        "tests/workflow-channel.test.mjs",
        "tools/codex-app-server-mcp/plugin.py",
        "packages/workflow-kit/src/lib/dialogue-migration-state.mjs",
        "packages/workflow-kit/src/lib/dialogue-migration.mjs",
        "packages/workflow-kit/src/lib/plan-permission.mjs",
        "tests/dialogue-migration.test.mjs",
        "tests/fixtures/released-kit/kit-1.8.2.tar.gz"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "orchestrator-owned-dialogue-refactor",
        "task_id": "T009",
        "role": "implementation"
      },
      "dependencies": [
        "T008"
      ],
      "functional_paths": [
        "src/control/workflow/execution-projection.mjs",
        "src/contracts/backend.mjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/frontend/plugin/panel.mjs",
        "src/frontend/plugin/app.mjs",
        "src/control/plugin/communication.mjs",
        "src/backend/desktop-model.mjs",
        "tests/sidebar.test.mjs",
        "tests/parallel-execution-ui.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/plugin-communication.test.mjs",
        "tests/electron-smoke.mjs",
        "src/control/plugin/assignment-dialogue.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/frontend/plugin/index.html",
        "src/frontend/plugin/launch.mjs",
        "tests/workflow-channel.test.mjs",
        "src/contracts/dialogue-view.mjs",
        "tests/panel-dialogue-view.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "architecture",
        "chatgpt-plugin",
        "electron-smoke"
      ],
      "id": "T009",
      "title": "Показать адресный диалог и причины ожидания",
      "why": "Сделать работу O/E наблюдаемой без вмешательства пользователя в доставку.",
      "parallel_safe": false,
      "acceptance_criteria": [
        "Каждый E различим по задаче/назначению; стадии bootstrap, SDK, ожидание O, работа, вопрос, результат, проверка, доработка, интеграция отражают действительное состояние, не общий ярлык регистрации.",
        "Панель O показывает входящие/исходящие по всем собственным E, авторство O/E/backend и корреляцию; E видит свой диалог. Persisted/accepted/read/handled и result/accepted result/INTEGRATED различены.",
        "Фоновая диагностика всех страниц не зависит от выбора sidebar; SDK/observer/Kit и версия/URI/поколение сопоставимы. Export фиксирует through_seq, страницы и gaps; нет секретов/enrollment/raw host metadata.",
        "Native/HTTP клиенты имеют одинаковые контракты; одна кнопка плана, без индивидуального Enable и копирования ID. Ручная приёмка не подменена UI fixture."
      ],
      "expected_commit_message": "feat: Показать адресный диалог и причины ожидания",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/orchestrator-owned-dialogue.md",
            "required": true
          },
          {
            "path": "docs/planning/orchestrator-owned-dialogue-reliability.md",
            "required": true
          },
          {
            "path": "docs/planning/orchestrator-owned-dialogue-results.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "actual_files": [
        "src/control/plugin/assignment-dialogue.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/control/workflow/execution-projection.mjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/frontend/plugin/index.html",
        "src/frontend/plugin/launch.mjs",
        "src/frontend/plugin/panel.mjs",
        "tests/workflow-channel.test.mjs",
        "src/contracts/dialogue-view.mjs",
        "tests/panel-dialogue-view.test.mjs"
      ]
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "orchestrator-owned-dialogue-refactor",
        "task_id": "T010",
        "role": "implementation"
      },
      "dependencies": [
        "T009"
      ],
      "functional_paths": [
        "tests/automatic-agent-dialogue.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/fixtures/dialogue-runtime.mjs",
        "tests/electron-smoke.mjs",
        "tests/backend-end-to-end.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/migration-compatibility.test.mjs",
        "tests/backend-upgrade.test.mjs",
        "package.json",
        "package-lock.json",
        "packages/workflow-kit/package.json",
        "tools/codex-app-server-mcp/plugin.py",
        "src/contracts/backend.mjs",
        "scripts/stage-chatgpt-plugin.mjs",
        "packages/workflow-kit/scripts/check-previous-upgrade-fixture.mjs",
        "packages/workflow-kit/src/lib/common.mjs",
        "tests/plugin-communication-store.test.mjs",
        "tests/plugin-enrollment.test.mjs",
        "tests/fixtures/plugin-host.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "architecture",
        "kit-check",
        "electron-smoke",
        "executor-channel",
        "chatgpt-plugin",
        "migration-compatibility",
        "release-tooling"
      ],
      "id": "T010",
      "title": "Проверить полный диалог и подготовить согласованный выпуск",
      "why": "Закрыть сквозной пользовательский сценарий и регрессии перед DOCS и сборкой.",
      "parallel_safe": false,
      "acceptance_criteria": [
        "Матрица 1–8 спецификации проходит реальные Start/API/Kit/Git/SDK/MCP пути с подставленной только физической моделью/хостом, без select/show и рабочих DOM-дублей. Фикстура не синтезирует user message для каждого SDK запуска.",
        "Проверены 2 и 5 E, минимальный контекст, вопрос/уточнение/решение, одновременные результаты, доработка, acceptance/merge, DOCS/итог, пауза/restart/UNKNOWN/удаление и переход старого scope.",
        "Выбран следующий свободный app/Kit номер, согласованы capability/backend/panel/MCP и content-addressed HTML. Installer штатно обновляет managed Kit; actual tools/recovery/roles соответствуют контракту.",
        "Подготовлены живые опыты A–D с границами доказательств: fixtures и Review не объявлены PASS ChatGPT, новые команды моделей и рабочие профили не использованы."
      ],
      "expected_commit_message": "feat: Проверить полный диалог и подготовить согласованный выпуск",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/orchestrator-owned-dialogue.md",
            "required": true
          },
          {
            "path": "docs/planning/orchestrator-owned-dialogue-reliability.md",
            "required": true
          },
          {
            "path": "docs/planning/orchestrator-owned-dialogue-results.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      }
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "orchestrator-owned-dialogue-refactor",
        "task_id": "DOCS",
        "role": "implementation"
      },
      "dependencies": [
        "T001",
        "T002",
        "T003",
        "T004",
        "T005",
        "T006",
        "T007",
        "T008",
        "T009",
        "T010"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/planning/orchestrator-owned-dialogue.md",
        "docs/planning/orchestrator-owned-dialogue-reliability.md",
        "docs/planning/orchestrator-owned-dialogue-results.md",
        "README.md",
        "AGENTS.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/workflow-execution.md",
        "docs/modules/orchestrated-execution.md",
        "docs/modules/automatic-agent-dialogue-acceptance.md",
        "docs/modules/chatgpt-plugin-acceptance.md",
        "docs/modules/backend.md",
        "docs/modules/browser.md",
        "docs/modules/desktop.md",
        "docs/modules/project-compatibility.md",
        "docs/modules/release.md",
        "docs/acceptance/orchestrated-execution.md",
        "packages/workflow-kit/docs/modules/orchestrated-plans.md",
        "packages/workflow-kit/docs/modules/parallel-assignments.md",
        "docs/modules/plugin-communication-handoff.md",
        "docs/modules/control.md",
        "docs/modules/execution.md",
        "packages/workflow-kit/docs/modules/workflow-kit-package.md",
        "docs/planning/executor-readiness-recovery.md",
        "packages/workflow-kit/src/templates/PROTOTYPE.md",
        "packages/workflow-kit/src/WORKFLOW.md",
        "packages/workflow-kit/src/templates/PLAN.md"
      ],
      "verification_ids": [],
      "id": "DOCS",
      "title": "Актуализация всех документов проекта",
      "why": "Перенести итоговый контракт в действующие документы до production build.",
      "parallel_safe": false,
      "acceptance_criteria": [
        "Сверены все действующие источники: README/OVERVIEW/modules/Kit инструкции/MCP ошибки. Выпущенные требования трёх спецификаций перенесены в модули, временные документы удалены с точными Git blob для required context.",
        "Сохранены невыполненные follow-up и FAIL текущего живого опыта. Новая приёмка A–D отмечена NOT_RUN до фактического опыта. Документы компактны, не более 28000 UTF-8 байт, история в Git.",
        "Связанная спецификация executor-readiness-recovery.md сверена по фактическому результату T004, невыполненные требования сохранены; legacy handoff отделён от нового рабочего API, версия Kit согласована в package/common/docs."
      ],
      "expected_commit_message": "docs: описать диалог под управлением оркестратора",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/orchestrator-owned-dialogue.md",
            "required": true
          },
          {
            "path": "docs/planning/orchestrator-owned-dialogue-reliability.md",
            "required": true
          },
          {
            "path": "docs/planning/orchestrator-owned-dialogue-results.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      }
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "orchestrator-owned-dialogue-refactor",
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
      "title": "Собрать единый выпуск рефакторинга",
      "why": "Подготовить проверенный комплект трёх ОС после DOCS.",
      "parallel_safe": false,
      "acceptance_criteria": [
        "После DOCS собраны macOS arm64, Windows x64, Linux x64 из одного sourceCommit; состав, signatures, архивы и digests проверены. Номер и тег не перезаписаны.",
        "Перед каждой production/Kit сборкой проверены и удалены только Python-кэши tools/codex-app-server-mcp без перехода по симлинкам; строгая extra-resource проверка сохранена."
      ],
      "expected_commit_message": "release: собрать выпуск рефакторинга диалога",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/orchestrator-owned-dialogue.md",
            "required": true
          },
          {
            "path": "docs/planning/orchestrator-owned-dialogue-reliability.md",
            "required": true
          },
          {
            "path": "docs/planning/orchestrator-owned-dialogue-results.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "verification_kind": "package"
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "orchestrator-owned-dialogue-refactor",
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
      "title": "Установить проверенный macOS-комплект",
      "why": "Доставить готовую копию в Applications штатным installer.",
      "parallel_safe": false,
      "acceptance_criteria": [
        "Готовый bundle устанавливается в собственную копию и /Applications/Workflow Pilot.app без пересборки/переподписи; manifest/version/signature/rollback проверены, donor не затронут.",
        "Окно и backend не останавливаются агентом; при занятой службе зафиксирован verified pending, активная версия не выдана за обновлённую. Переключение выполняет пользователь."
      ],
      "expected_commit_message": "release: установить проверенный macOS-комплект",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/orchestrator-owned-dialogue.md",
            "required": true
          },
          {
            "path": "docs/planning/orchestrator-owned-dialogue-reliability.md",
            "required": true
          },
          {
            "path": "docs/planning/orchestrator-owned-dialogue-results.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "verification_kind": "installed"
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "orchestrator-owned-dialogue-refactor",
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
      "title": "Опубликовать выпуск и передать живую приёмку",
      "why": "Завершить поставку с проверенными артефактами и честной границей автономности.",
      "parallel_safe": false,
      "acceptance_criteria": [
        "GitHub Release содержит полный согласованный комплект с digest/размерами и тегом на sourceCommit; remote main проверён, повторной сборки нет.",
        "Пользователь получает точный статус установки и готовые опыты A–D; до их выполнения автономность не объявлена принятой. Новый scope не архивируется автоматически."
      ],
      "expected_commit_message": "release: опубликовать рефакторинг диалога",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/orchestrator-owned-dialogue.md",
            "required": true
          },
          {
            "path": "docs/planning/orchestrator-owned-dialogue-reliability.md",
            "required": true
          },
          {
            "path": "docs/planning/orchestrator-owned-dialogue-results.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "verification_kind": "package"
    }
  ],
  "blocked_reason": null,
  "user_decisions": [
    {
      "id": "213cdb40-db41-42f9-8971-0cc99ee53690",
      "text": "Прямое поручение пользователя 19.10.2026: закрыть прежний план, открыть новый scope рефакторинга согласованного workflow, подробно описать роли O/E и Kit и провести Review. Сейчас подготовка/согласование плана; реализация и поставка требуют отдельного поручения. Выполнение здесь одним агентом согласно AGENTS.md.",
      "recorded_at": "2026-10-19T15:35:12.136Z"
    }
  ],
  "parallel_allowed": false,
  "max_workers": 1,
  "execution_strategy": "sequential",
  "execution_reason": "Разработка здесь одним агентом по прямому сохранённому решению пользователя и AGENTS.md; контракты Kit, Control и канала связаны. Два-пять E относятся к продукту/fixtures/живой приёмке, не делегированию этой разработки."
}
```
<!-- workflow-state:end -->

## Состояние

Execution Scope Status: ACTIVE
Delivery Status: IN_PROGRESS
Scope: orchestrator-owned-dialogue-refactor
Current Task: нет
Revision: 613

## Цель

Один Start запускает исполнителей, которым оркестратор адресно выдаёт задачи и выбранный контекст; двусторонний диалог разрешает блокировки и доставляет результаты для приёмки, интеграции и завершения плана без участия пользователя в обычных шагах.

## Критерии приёмки

- Планирование O, полный начальный DOM-контекст, Review и одна кнопка Start сохранены. E получают через DOM только правила/identity/bootstrap; рабочую задачу и минимальный контекст выбирает и отправляет O.
- Два-пять E автоматически подключаются без посещения карточек/ID/Enable, видны и адресуются независимо. Рабочий model API поддерживает O↔E задачи, вопросы, уточнения, решения и результат; авторство подтверждено.
- Обычная техническая блокировка разрешается настоящим многоходовым диалогом без пользователя. SDK не требует новой пользовательской реплики, очередь и busy/idle не создают взаимную блокировку.
- Проверенный commit E сопровождается его result O. O проверяет, принимает конкретную версию или требует доработку и выполняет интеграцию через Kit; DONE main не выводится из текста или READY.
- Pause/restart/UNKNOWN/миграция/удаление безопасны и идемпотентны; DOCS, delivery и итог предшествуют закрытию связи. Полный комплект трёх ОС и установка проверены, живые A–D принимаются отдельно.

## Микрозадачи

Выполнение: sequential; разрешено: false; лимит: 1
Причина: Разработка здесь одним агентом по прямому сохранённому решению пользователя и AGENTS.md; контракты Kit, Control и канала связаны. Два-пять E относятся к продукту/fixtures/живой приёмке, не делегированию этой разработки.

- [DONE] T001: Ввести контракт назначений с диалогом и приёмкой в Kit — Завершено
  - Git Commit: [DONE] feat: Ввести контракт назначений с диалогом и приёмкой в Kit
  - Reference: orchestrator-owned-dialogue-refactor / T001 / implementation
  - Файлы: packages/workflow-kit/src/lib/plan.mjs, packages/workflow-kit/src/lib/actions.mjs, packages/workflow-kit/src/lib/assignment-contract.mjs, packages/workflow-kit/src/lib/task-assignment.mjs, packages/workflow-kit/src/lib/task-integration.mjs, packages/workflow-kit/src/lib/integration-proof.mjs, packages/workflow-kit/src/lib/signals.mjs, packages/workflow-kit/src/lib/signal-state.mjs, packages/workflow-kit/src/lib/transaction-state.mjs, packages/workflow-kit/src/lib/assignment-dialogue.mjs, packages/workflow-kit/src/cli.mjs, packages/workflow-kit/src/lib/command-help.mjs, packages/workflow-kit/scripts/check-task-assignment-fixture.mjs, packages/workflow-kit/scripts/check-task-integration-fixture.mjs, packages/workflow-kit/scripts/check-orchestrated-execution-fixture.mjs, packages/workflow-kit/src/schemas/plan.schema.json, packages/workflow-kit/src/lib/validate.mjs, packages/workflow-kit/src/lib/validation-rules.mjs, packages/workflow-kit/src/lib/recovery.mjs, tests/workflow-kit-recovery.test.mjs, docs/planning/orchestrator-owned-dialogue.md, docs/planning/orchestrator-owned-dialogue-reliability.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] T002: Добавить рабочий адресный API и долговечные сообщения агентов — Завершено
  - Git Commit: [DONE] feat: Добавить рабочий адресный API и долговечные сообщения агентов
  - Reference: orchestrator-owned-dialogue-refactor / T002 / implementation
  - Файлы: tools/codex-app-server-mcp/plugin.py, tools/codex-app-server-mcp/server.py, src/control/plugin/communication.mjs, src/control/plugin/workflow-channel.mjs, src/control/plugin/enrollment.mjs, src/control/plugin/service.mjs, src/control/workflow/dialogue-delivery.mjs, src/control/workflow/parallel-kit.mjs, src/execution/facade.mjs, src/execution/plugin/communication-store.mjs, src/contracts/plugin-communication.mjs, tests/workflow-channel.test.mjs, tests/plugin-communication.test.mjs, tests/codex-app-server-mcp.test.mjs, tests/chatgpt-plugin.test.mjs, src/contracts/backend.mjs, tests/plugin-communication-store.test.mjs, tests/plugin-enrollment.test.mjs, tests/fixtures/plugin-host.mjs, src/control/plugin/assignment-dialogue.mjs, src/control/facade.mjs, src/execution/plugin/bridge.mjs, packages/workflow-kit/src/lib/recovery.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: T001
- [DONE] T003: Исправить обработку ходов и последовательное пробуждение — Завершено
  - Git Commit: [DONE] feat: Исправить обработку ходов и последовательное пробуждение
  - Reference: orchestrator-owned-dialogue-refactor / T003 / implementation
  - Файлы: src/control/plugin/workflow-channel.mjs, src/control/plugin/communication.mjs, src/control/workflow/dialogue-delivery.mjs, src/control/workflow/executor-session.mjs, src/control/workflow/coordination.mjs, src/execution/browser/chatgpt-page-observer.mjs, src/frontend/plugin/panel.mjs, tests/workflow-channel.test.mjs, tests/automatic-agent-dialogue.test.mjs, tests/fixtures/automatic-agent-dialogue.mjs, tests/fixtures/dialogue-runtime.mjs, tests/chatgpt-plugin.test.mjs, src/backend/desktop-model.mjs, src/control/plugin/assignment-dialogue.mjs, src/control/plugin/service.mjs, src/execution/browser/chatgpt-composer.mjs, src/execution/browser/session-runtime.mjs, tests/chatgpt-composer.test.mjs, tests/page-state.test.mjs, docs/planning/orchestrator-owned-dialogue-reliability.md, docs/planning/orchestrator-owned-dialogue-results.md
  - Параллельность: исключительное выполнение
  - Зависимости: T002
- [DONE] T004: Автоматически запускать E с минимальным bootstrap — Завершено
  - Git Commit: [DONE] feat: Автоматически запускать E с минимальным bootstrap
  - Reference: orchestrator-owned-dialogue-refactor / T004 / implementation
  - Файлы: src/control/context/context-session.mjs, src/control/context/service.mjs, src/control/context/context-cache.mjs, src/control/sessions/service.mjs, src/backend/desktop-model.mjs, src/execution/browser/backend-host.mjs, src/execution/browser/session-runtime.mjs, packages/workflow-kit/src/lib/recovery.mjs, src/contracts/context.mjs, tests/context-session.test.mjs, tests/context-cache.test.mjs, tests/session-runtime.test.mjs, tests/backend-native-pages.test.mjs, tests/electron-smoke.mjs, tests/executor-startup-lifecycle.test.mjs, src/execution/browser/chatgpt-experience.mjs, src/execution/browser/chatgpt-page-observer.mjs, src/control/workflow/executor-session.mjs, tests/chatgpt-experience.test.mjs, packages/workflow-kit/src/lib/role-protocol.mjs, packages/workflow-kit/scripts/check-orchestrated-execution-fixture.mjs, tests/executor-background-startup.test.mjs, tests/fixtures/executor-background-startup.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: T003
- [DONE] T005: Согласовать роли и передачу выбранного контекста — Завершено
  - Git Commit: [DONE] feat: Согласовать роли и передачу выбранного контекста
  - Reference: orchestrator-owned-dialogue-refactor / T005 / implementation
  - Файлы: packages/workflow-kit/src/lib/role-protocol.mjs, packages/workflow-kit/src/lib/recovery.mjs, packages/workflow-kit/src/lib/command-help.mjs, src/control/context/context-session.mjs, src/control/workflow/dialogue-delivery.mjs, src/control/plugin/communication.mjs, tools/codex-app-server-mcp/plugin.py, tools/codex-app-server-mcp/server.py, packages/workflow-kit/scripts/check-project-recovery-fixture.mjs, tests/chatgpt-plugin.test.mjs, tests/context-session.test.mjs, packages/workflow-kit/scripts/check-orchestrated-execution-fixture.mjs, tests/codex-app-server-mcp.test.mjs, tests/fixtures/automatic-agent-dialogue.mjs, tests/workflow-channel.test.mjs, packages/workflow-kit/src/templates/PROTOTYPE.md, packages/workflow-kit/src/WORKFLOW.md, packages/workflow-kit/src/templates/PLAN.md
  - Параллельность: исключительное выполнение
  - Зависимости: T004
- [DONE] T006: Передать O выдачу заданий и управление интеграцией — Завершено
  - Git Commit: [DONE] feat: Передать O выдачу заданий и управление интеграцией
  - Reference: orchestrator-owned-dialogue-refactor / T006 / implementation
  - Файлы: src/control/workflow/parallel-execution.mjs, src/control/workflow/parallel-kit.mjs, src/control/workflow/coordination.mjs, src/control/workflow/dialogue-delivery.mjs, src/control/workflow/plan-continuation.mjs, src/control/plugin/workflow-channel.mjs, tests/automatic-agent-dialogue.test.mjs, tests/parallel-execution.test.mjs, tests/parallel-finalization.test.mjs, tests/fixtures/automatic-agent-dialogue.mjs, tests/orchestrated-execution.test.mjs, packages/workflow-kit/scripts/check-orchestrated-execution-fixture.mjs, packages/workflow-kit/src/lib/simple-workflow.mjs, packages/workflow-kit/src/lib/task-integration.mjs, src/control/plugin/assignment-dialogue.mjs, src/control/plugin/enrollment.mjs, src/control/plugin/service.mjs, src/control/sessions/workspace-session.mjs, src/control/workflow/executor-session.mjs, tests/workspace-session.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: T005
- [DONE] T007: Замкнуть диалог блокировок и доработки результата — Завершено
  - Git Commit: [DONE] feat: Замкнуть диалог блокировок и доработки результата
  - Reference: orchestrator-owned-dialogue-refactor / T007 / implementation
  - Файлы: packages/workflow-kit/src/lib/signals.mjs, packages/workflow-kit/src/lib/signal-state.mjs, packages/workflow-kit/src/lib/assignment-dialogue.mjs, src/control/workflow/parallel-execution.mjs, src/control/workflow/dialogue-delivery.mjs, src/control/plugin/communication.mjs, src/control/plugin/workflow-channel.mjs, tests/automatic-agent-dialogue.test.mjs, tests/workflow-signals.test.mjs, packages/workflow-kit/scripts/check-orchestrated-execution-fixture.mjs, packages/workflow-kit/src/lib/role-protocol.mjs, packages/workflow-kit/src/lib/task-integration.mjs, src/control/plugin/assignment-dialogue.mjs, src/control/workflow/parallel-kit.mjs, tests/fixtures/automatic-agent-dialogue.mjs, tests/orchestrated-execution.test.mjs, tools/codex-app-server-mcp/plugin.py, packages/workflow-kit/src/lib/assignment-command-safety.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: T006
- [DONE] T008: Обеспечить восстановление и переход старых назначений — Завершено
  - Git Commit: [DONE] feat: Обеспечить восстановление и переход старых назначений
  - Reference: orchestrator-owned-dialogue-refactor / T008 / implementation
  - Файлы: src/control/workflow/parallel-execution.mjs, src/control/workflow/execution-control.mjs, src/control/workflow/coordination.mjs, src/control/plugin/enrollment.mjs, src/control/plugin/workflow-channel.mjs, src/control/projects/project-compatibility.mjs, src/control/projects/workspace-deletion.mjs, src/backend/bootstrap.mjs, packages/workflow-kit/src/lib/installer.mjs, packages/workflow-kit/src/lib/assignment-dialogue.mjs, packages/workflow-kit/scripts/check-previous-upgrade-fixture.mjs, tests/parallel-execution-recovery.test.mjs, tests/migration-compatibility.test.mjs, tests/workspace-deletion.test.mjs, tests/backend-upgrade.test.mjs, tests/panel-resource-upgrade.test.mjs, tests/workflow-kit-upgrade.test.mjs, src/control/plugin/communication.mjs, src/control/workflow/dialogue-delivery.mjs, src/execution/plugin/communication-store.mjs, packages/workflow-kit/scripts/check-orchestrated-execution-fixture.mjs, packages/workflow-kit/src/cli.mjs, packages/workflow-kit/src/lib/assignment-contract.mjs, packages/workflow-kit/src/lib/integration-proof.mjs, packages/workflow-kit/src/lib/recovery.mjs, packages/workflow-kit/src/lib/signals.mjs, packages/workflow-kit/src/lib/task-assignment.mjs, packages/workflow-kit/src/lib/task-handoff.mjs, packages/workflow-kit/src/lib/task-integration.mjs, packages/workflow-kit/src/lib/transaction-state.mjs, resources/workspace-setup-worker.mjs, src/backend/desktop-model.mjs, src/contracts/backend.mjs, src/control/facade.mjs, src/control/plugin/assignment-dialogue.mjs, src/control/plugin/service.mjs, src/control/projects/workspace-setup.mjs, src/control/workflow/parallel-kit.mjs, tests/codex-app-server-mcp.test.mjs, tests/fixtures/released-kit/manifest.json, tests/workflow-channel.test.mjs, tools/codex-app-server-mcp/plugin.py, packages/workflow-kit/src/lib/dialogue-migration-state.mjs, packages/workflow-kit/src/lib/dialogue-migration.mjs, packages/workflow-kit/src/lib/plan-permission.mjs, tests/dialogue-migration.test.mjs, tests/fixtures/released-kit/kit-1.8.2.tar.gz
  - Параллельность: исключительное выполнение
  - Зависимости: T007
- [DONE] T009: Показать адресный диалог и причины ожидания — Завершено
  - Git Commit: [DONE] feat: Показать адресный диалог и причины ожидания
  - Reference: orchestrator-owned-dialogue-refactor / T009 / implementation
  - Файлы: src/control/workflow/execution-projection.mjs, src/contracts/backend.mjs, src/frontend/desktop/ui/sidebar.mjs, src/frontend/plugin/panel.mjs, src/frontend/plugin/app.mjs, src/control/plugin/communication.mjs, src/backend/desktop-model.mjs, tests/sidebar.test.mjs, tests/parallel-execution-ui.test.mjs, tests/chatgpt-plugin.test.mjs, tests/plugin-communication.test.mjs, tests/electron-smoke.mjs, src/control/plugin/assignment-dialogue.mjs, src/control/plugin/workflow-channel.mjs, src/frontend/plugin/index.html, src/frontend/plugin/launch.mjs, tests/workflow-channel.test.mjs, src/contracts/dialogue-view.mjs, tests/panel-dialogue-view.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: T008
- [TODO] T010: Проверить полный диалог и подготовить согласованный выпуск — Ожидает
  - Git Commit: [PENDING] feat: Проверить полный диалог и подготовить согласованный выпуск
  - Reference: orchestrator-owned-dialogue-refactor / T010 / implementation
  - Файлы: tests/automatic-agent-dialogue.test.mjs, tests/fixtures/automatic-agent-dialogue.mjs, tests/fixtures/dialogue-runtime.mjs, tests/electron-smoke.mjs, tests/backend-end-to-end.test.mjs, tests/chatgpt-plugin.test.mjs, tests/codex-app-server-mcp.test.mjs, tests/migration-compatibility.test.mjs, tests/backend-upgrade.test.mjs, package.json, package-lock.json, packages/workflow-kit/package.json, tools/codex-app-server-mcp/plugin.py, src/contracts/backend.mjs, scripts/stage-chatgpt-plugin.mjs, packages/workflow-kit/scripts/check-previous-upgrade-fixture.mjs, packages/workflow-kit/src/lib/common.mjs, tests/plugin-communication-store.test.mjs, tests/plugin-enrollment.test.mjs, tests/fixtures/plugin-host.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: T009
- [TODO] DOCS: Актуализация всех документов проекта — Ожидает
  - Git Commit: [PENDING] docs: описать диалог под управлением оркестратора
  - Reference: orchestrator-owned-dialogue-refactor / DOCS / implementation
  - Файлы: docs/planning/orchestrator-owned-dialogue.md, docs/planning/orchestrator-owned-dialogue-reliability.md, docs/planning/orchestrator-owned-dialogue-results.md, README.md, AGENTS.md, docs/architecture/OVERVIEW.md, docs/modules/chatgpt-plugin.md, docs/modules/workflow-execution.md, docs/modules/orchestrated-execution.md, docs/modules/automatic-agent-dialogue-acceptance.md, docs/modules/chatgpt-plugin-acceptance.md, docs/modules/backend.md, docs/modules/browser.md, docs/modules/desktop.md, docs/modules/project-compatibility.md, docs/modules/release.md, docs/acceptance/orchestrated-execution.md, packages/workflow-kit/docs/modules/orchestrated-plans.md, packages/workflow-kit/docs/modules/parallel-assignments.md, docs/modules/plugin-communication-handoff.md, docs/modules/control.md, docs/modules/execution.md, packages/workflow-kit/docs/modules/workflow-kit-package.md, docs/planning/executor-readiness-recovery.md, packages/workflow-kit/src/templates/PROTOTYPE.md, packages/workflow-kit/src/WORKFLOW.md, packages/workflow-kit/src/templates/PLAN.md
  - Параллельность: исключительное выполнение
  - Зависимости: T001, T002, T003, T004, T005, T006, T007, T008, T009, T010
- [TODO] RELEASE: Собрать единый выпуск рефакторинга — Ожидает
  - Git Commit: [PENDING] release: собрать выпуск рефакторинга диалога
  - Reference: orchestrator-owned-dialogue-refactor / RELEASE / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: DOCS
- [TODO] INSTALL: Установить проверенный macOS-комплект — Ожидает
  - Git Commit: [PENDING] release: установить проверенный macOS-комплект
  - Reference: orchestrator-owned-dialogue-refactor / INSTALL / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: RELEASE, DOCS
- [TODO] PUBLISH: Опубликовать выпуск и передать живую приёмку — Ожидает
  - Git Commit: [PENDING] release: опубликовать рефакторинг диалога
  - Reference: orchestrator-owned-dialogue-refactor / PUBLISH / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: INSTALL, DOCS

## Context Pack For This Cycle

- docs/planning/orchestrator-owned-dialogue.md
- docs/planning/orchestrator-owned-dialogue-reliability.md
- docs/planning/orchestrator-owned-dialogue-results.md
- docs/architecture/OVERVIEW.md

Служебные состояния меняются только командами workflow. Приёмка не архивирует scope.
