# Активный план — Workflow_Pilot

<!-- workflow-state:begin -->
```json
{
  "schema_version": 1,
  "plan_revision": 1221,
  "project_id": "7411e192-943c-4529-bffb-3b081d9c242f",
  "project_name": "Workflow_Pilot",
  "scope_id": "sdk-messaging",
  "execution_scope_status": "ACTIVE",
  "delivery_status": "IN_PROGRESS",
  "objective": "Полностью перевести O, E и сообщения приложения на постоянный SDK, передать очередь обработки ChatGPT, удалить опыт и выпустить новый комплект macOS/Windows/Linux с установкой на Mac и GitHub публикацией.",
  "acceptance_criteria": [
    "SDK единственный рабочий транспорт всех ролей без режима/скрипта и ожидания busy/idle.",
    "Идентичность, Stop/UNKNOWN, receipts, acceptance/integration и жизненный цикл сохранены и проверены отдельно.",
    "Три сборки одного sourceCommit, штатная установка/pending на Mac и GitHub публикация подтверждены; live новой версии отдельно."
  ],
  "approved_scope": {
    "functional_paths": [
      "src/control/plugin/workflow-channel.mjs",
      "src/control/plugin/communication.mjs",
      "src/control/plugin/assignment-dialogue.mjs",
      "src/control/plugin/service.mjs",
      "src/control/plugin/startup-context.mjs",
      "src/control/facade.mjs",
      "src/control/workflow/dialogue-delivery.mjs",
      "src/control/workflow/executor-session.mjs",
      "src/control/workflow/coordination.mjs",
      "src/control/workflow/command-activity.mjs",
      "src/contracts/plugin-communication.mjs",
      "src/contracts/backend.mjs",
      "src/contracts/dialogue-view.mjs",
      "src/execution/facade.mjs",
      "src/execution/plugin/bridge.mjs",
      "src/execution/plugin/communication-store.mjs",
      "src/execution/plugin/sdk-busy-experiment.mjs",
      "src/execution/plugin/sdk-busy-probe.mjs",
      "src/frontend/plugin/launch.mjs",
      "src/frontend/plugin/panel.mjs",
      "src/backend/desktop-model.mjs",
      "tools/codex-app-server-mcp/plugin.py",
      "scripts/prepare-sdk-busy-experiment.mjs",
      "scripts/analyze-sdk-busy-experiment.mjs",
      "packages/workflow-kit/src/lib/role-protocol.mjs",
      "tests/sdk-busy-experiment.test.mjs",
      "tests/sdk-busy-analysis.test.mjs",
      "tests/workflow-channel.test.mjs",
      "tests/plugin-communication.test.mjs",
      "tests/dialogue-delivery.test.mjs",
      "tests/chatgpt-plugin.test.mjs",
      "tests/codex-app-server-mcp.test.mjs",
      "tests/automatic-agent-dialogue.test.mjs",
      "tests/fixtures/automatic-agent-dialogue.mjs",
      "tests/command-activity.test.mjs",
      "tests/progress.test.mjs",
      "tests/startup-context.test.mjs",
      "tests/migration-compatibility.test.mjs",
      "tests/electron-smoke.mjs",
      "src/control/workflow/parallel-execution.mjs",
      "src/control/workflow/execution-control.mjs",
      "src/control/workflow/execution-projection.mjs",
      "src/control/workflow/user-choices.mjs",
      "src/control/workflow/plan-continuation.mjs",
      "src/control/workflow/project-plan-continuation.mjs",
      "src/control/workflow/project-session-plan-continuation.mjs",
      "src/control/workflow/review-continuation.mjs",
      "src/control/workflow/plan-review.mjs",
      "src/frontend/desktop/ui/current-actions.mjs",
      "packages/workflow-kit/package.json",
      "packages/workflow-kit/package-lock.json",
      "tests/execution-control.test.mjs",
      "tests/orchestrated-execution.test.mjs",
      "tests/parallel-execution-recovery.test.mjs",
      "tests/parallel-execution-ui.test.mjs",
      "tests/parallel-execution.test.mjs",
      "tests/plan-continuation.test.mjs",
      "tests/plan-review.test.mjs",
      "tests/project-plan-continuation.test.mjs",
      "tests/user-choice-view.test.mjs",
      "tests/user-choices.test.mjs",
      "package.json",
      "package-lock.json",
      "scripts/stage-chatgpt-plugin.mjs",
      "release-manifest.json",
      "src/control/context/context-session.mjs",
      "src/control/workflow/automation-send-state.mjs",
      "tests/automation-send-state.test.mjs",
      "tests/backend-api.test.mjs",
      "tests/backend-browser-lifecycle.test.mjs",
      "tests/panel-dialogue-view.test.mjs",
      "tests/parallel-finalization.test.mjs",
      "packages/workflow-kit/src/lib/common.mjs",
      "packages/workflow-kit/src/lib/installer.mjs",
      "tests/workflow-kit-upgrade.test.mjs",
      "tests/fixtures/released-kit/kit-1.10.2.tar.gz",
      "tests/fixtures/released-kit/manifest.json"
    ],
    "documentation_paths": [
      "docs/planning/sdk-messaging.md",
      "README.md",
      "docs/architecture/OVERVIEW.md",
      "docs/modules/sdk-busy-delivery.md",
      "docs/acceptance/sdk-busy-recipient.md",
      "docs/modules/chatgpt-plugin.md",
      "docs/modules/assignment-dialogue-reliability.md",
      "docs/modules/dialogue-timing.md",
      "docs/modules/current-actions.md",
      "docs/modules/user-choice.md",
      "docs/modules/prepared-tasks.md",
      "docs/modules/project-compatibility.md",
      "docs/modules/release.md",
      "docs/modules/orchestrated-execution.md",
      "docs/modules/assignment-dialogue.md",
      "docs/modules/plugin-communication-handoff.md",
      "docs/modules/automatic-agent-dialogue-acceptance.md",
      "docs/modules/sdk-messaging.md",
      "docs/acceptance/sdk-messaging.md",
      "docs/modules/workflow-execution.md",
      "docs/modules/execution.md",
      "docs/modules/orchestrator-startup.md",
      "docs/modules/session-titles.md",
      "docs/modules/chat-only-startup.md",
      "packages/workflow-kit/README.md",
      "packages/workflow-kit/docs/modules/workflow-kit-package.md",
      "packages/workflow-kit/docs/modules/orchestrated-plans.md"
    ]
  },
  "baseline_commit": "364543ae961165e5d05874639e4bc2599bc10a0d",
  "current_task_id": null,
  "context_pack": {
    "documents": [
      {
        "path": "docs/planning/sdk-messaging.md",
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
        "scope_id": "sdk-messaging",
        "task_id": "SDK",
        "role": "implementation"
      },
      "dependencies": [],
      "functional_paths": [
        "src/control/plugin/workflow-channel.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/assignment-dialogue.mjs",
        "src/control/plugin/service.mjs",
        "src/control/plugin/startup-context.mjs",
        "src/control/facade.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/control/workflow/executor-session.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/command-activity.mjs",
        "src/contracts/plugin-communication.mjs",
        "src/contracts/backend.mjs",
        "src/contracts/dialogue-view.mjs",
        "src/execution/facade.mjs",
        "src/execution/plugin/bridge.mjs",
        "src/execution/plugin/communication-store.mjs",
        "src/execution/plugin/sdk-busy-experiment.mjs",
        "src/execution/plugin/sdk-busy-probe.mjs",
        "src/frontend/plugin/launch.mjs",
        "src/frontend/plugin/panel.mjs",
        "src/backend/desktop-model.mjs",
        "tools/codex-app-server-mcp/plugin.py",
        "scripts/prepare-sdk-busy-experiment.mjs",
        "scripts/analyze-sdk-busy-experiment.mjs",
        "packages/workflow-kit/src/lib/role-protocol.mjs",
        "tests/sdk-busy-experiment.test.mjs",
        "tests/sdk-busy-analysis.test.mjs",
        "tests/workflow-channel.test.mjs",
        "tests/plugin-communication.test.mjs",
        "tests/dialogue-delivery.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/automatic-agent-dialogue.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/command-activity.test.mjs",
        "tests/progress.test.mjs",
        "tests/startup-context.test.mjs",
        "tests/migration-compatibility.test.mjs",
        "tests/electron-smoke.mjs",
        "src/control/workflow/parallel-execution.mjs",
        "src/control/workflow/execution-control.mjs",
        "src/control/workflow/execution-projection.mjs",
        "src/control/workflow/user-choices.mjs",
        "src/control/workflow/plan-continuation.mjs",
        "src/control/workflow/project-plan-continuation.mjs",
        "src/control/workflow/project-session-plan-continuation.mjs",
        "src/control/workflow/review-continuation.mjs",
        "src/control/workflow/plan-review.mjs",
        "src/frontend/desktop/ui/current-actions.mjs",
        "packages/workflow-kit/package.json",
        "packages/workflow-kit/package-lock.json",
        "tests/execution-control.test.mjs",
        "tests/orchestrated-execution.test.mjs",
        "tests/parallel-execution-recovery.test.mjs",
        "tests/parallel-execution-ui.test.mjs",
        "tests/parallel-execution.test.mjs",
        "tests/plan-continuation.test.mjs",
        "tests/plan-review.test.mjs",
        "tests/project-plan-continuation.test.mjs",
        "tests/user-choice-view.test.mjs",
        "tests/user-choices.test.mjs",
        "src/control/context/context-session.mjs",
        "src/control/workflow/automation-send-state.mjs",
        "tests/automation-send-state.test.mjs",
        "tests/backend-api.test.mjs",
        "tests/backend-browser-lifecycle.test.mjs",
        "tests/panel-dialogue-view.test.mjs",
        "tests/parallel-finalization.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/sdk-messaging.md"
      ],
      "verification_ids": [
        "unit-all",
        "chatgpt-plugin",
        "architecture",
        "executor-channel"
      ],
      "id": "SDK",
      "title": "Перевести весь адресный обмен на единый постоянный SDK",
      "why": "Для O/E/приложения все рабочие виды сообщений передаются SDK без busy/canSend/lastRole/commands/read/yield барьеров; bootstrap панели остаётся коротким q. Один путь без DOM fallback и без второго sender.",
      "acceptance_criteria": [
        "Для O/E/приложения все рабочие виды сообщений передаются SDK без busy/canSend/lastRole/commands/read/yield барьеров; bootstrap панели остаётся коротким q. Один путь без DOM fallback и без второго sender.",
        "После accepted следующий pending отправляется сразу; один in-flight на адресата, независимые адресаты, общие 90s SDK/120s claim/20s lease. UNKNOWN/identity/grant/Stop и идемпотентность сохранены; read/exact acceptance/integration/complete раздельны.",
        "Все handling gates независимы от транспортной очереди; старые WAL читаются без активации опыта. Удалены профиль/наблюдатель/cases/лимит2/активирующий скрипт/hold/checkpoint/probe, соответствующие MCP/API/descriptors и режимные тесты.",
        "Полный аудит вызовов отправки и UI: нет ожидания свободного чата и ложных статусов. Согласованность инструкций Kit/startup/MCP/backend проверена. Общий код и адресные regression fixtures подтверждены.",
        "parallel-execution relaySignals/diagnostic/finalization/delivery не ждут stopped/canSend/channelSettled перед SDK. Legacy sequential/parallel/orchestrated также переходят на SDK: безопасное восстановление identity, свежий Continue/grant, никаких повторов legacy sending/UNKNOWN и никакого DOM fallback. Семантика старого Kit не меняется без необходимости."
      ],
      "expected_commit_message": "feat: перевести весь адресный обмен на единый постоянный sdk",
      "parallel_safe": false,
      "task_brief": "Перевести весь адресный обмен на единый постоянный SDK. Для O/E/приложения все рабочие виды сообщений передаются SDK без busy/canSend/lastRole/commands/read/yield барьеров; bootstrap панели остаётся коротким q. Один путь без DOM fallback и без второго sender. После accepted следующий pending отправляется сразу; один in-flight на адресата, независимые адресаты, общие 90s SDK/120s claim/20s lease. UNKNOWN/identity/grant/Stop и идемпотентность сохранены; read/exact acceptance/integration/complete раздельны. Все handling gates независимы от транспортной очереди; старые WAL читаются без активации опыта. Удалены профиль/наблюдатель/cases/лимит2/активирующий скрипт/hold/checkpoint/probe, соответствующие MCP/API/descriptors и режимные тесты. Полный аудит вызовов отправки и UI: нет ожидания свободного чата и ложных статусов. Согласованность инструкций Kit/startup/MCP/backend проверена. Общий код и адресные regression fixtures подтверждены. parallel-execution relaySignals/diagnostic/finalization/delivery не ждут stopped/canSend/channelSettled перед SDK. Legacy sequential/parallel/orchestrated также переходят на SDK: безопасное восстановление identity, свежий Continue/grant, никаких повторов legacy sending/UNKNOWN и никакого DOM fallback. Семантика старого Kit не меняется без необходимости. Последовательная разработка в текущем checkout без делегирования, по полной спецификации; donor и работающую службу не менять; fixtures не живая приёмка.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/sdk-messaging.md",
            "required": true
          },
          {
            "path": "docs/architecture/OVERVIEW.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "actual_files": [
        "packages/workflow-kit/src/lib/role-protocol.mjs",
        "scripts/analyze-sdk-busy-experiment.mjs",
        "scripts/prepare-sdk-busy-experiment.mjs",
        "src/contracts/backend.mjs",
        "src/contracts/dialogue-view.mjs",
        "src/contracts/plugin-communication.mjs",
        "src/control/context/context-session.mjs",
        "src/control/facade.mjs",
        "src/control/plugin/assignment-dialogue.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/service.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/control/workflow/automation-send-state.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/control/workflow/execution-control.mjs",
        "src/control/workflow/executor-session.mjs",
        "src/control/workflow/parallel-execution.mjs",
        "src/control/workflow/plan-continuation.mjs",
        "src/control/workflow/project-plan-continuation.mjs",
        "src/control/workflow/project-session-plan-continuation.mjs",
        "src/control/workflow/review-continuation.mjs",
        "src/execution/facade.mjs",
        "src/execution/plugin/sdk-busy-experiment.mjs",
        "src/execution/plugin/sdk-busy-probe.mjs",
        "src/frontend/plugin/launch.mjs",
        "src/frontend/plugin/panel.mjs",
        "tests/automatic-agent-dialogue.test.mjs",
        "tests/automation-send-state.test.mjs",
        "tests/backend-api.test.mjs",
        "tests/backend-browser-lifecycle.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/dialogue-delivery.test.mjs",
        "tests/execution-control.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/orchestrated-execution.test.mjs",
        "tests/panel-dialogue-view.test.mjs",
        "tests/parallel-execution-ui.test.mjs",
        "tests/parallel-execution.test.mjs",
        "tests/parallel-finalization.test.mjs",
        "tests/plan-continuation.test.mjs",
        "tests/plan-review.test.mjs",
        "tests/project-plan-continuation.test.mjs",
        "tests/sdk-busy-analysis.test.mjs",
        "tests/sdk-busy-experiment.test.mjs",
        "tests/startup-context.test.mjs",
        "tests/workflow-channel.test.mjs",
        "tools/codex-app-server-mcp/plugin.py"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "sdk-messaging",
        "task_id": "PROOF",
        "role": "implementation"
      },
      "dependencies": [
        "SDK"
      ],
      "functional_paths": [
        "tests/sdk-busy-experiment.test.mjs",
        "tests/sdk-busy-analysis.test.mjs",
        "tests/workflow-channel.test.mjs",
        "tests/plugin-communication.test.mjs",
        "tests/dialogue-delivery.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/automatic-agent-dialogue.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/command-activity.test.mjs",
        "tests/progress.test.mjs",
        "tests/startup-context.test.mjs",
        "tests/migration-compatibility.test.mjs",
        "tests/electron-smoke.mjs",
        "tests/execution-control.test.mjs",
        "tests/orchestrated-execution.test.mjs",
        "tests/parallel-execution-recovery.test.mjs",
        "tests/parallel-execution-ui.test.mjs",
        "tests/parallel-execution.test.mjs",
        "tests/plan-continuation.test.mjs",
        "tests/plan-review.test.mjs",
        "tests/project-plan-continuation.test.mjs",
        "tests/user-choice-view.test.mjs",
        "tests/user-choices.test.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/control/workflow/coordination.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "electron-smoke",
        "executor-channel",
        "codex-tools-live",
        "architecture",
        "kit-check",
        "kit-assignments",
        "kit-upgrade"
      ],
      "id": "PROOF",
      "title": "Проверить полный обмен и восстановление на изолированных сценариях",
      "why": "Связный реальный API/MCP/SDK/Kit/Git fixture проверяет prepared Start, больше двух сообщений и оба направления, busy/active command, параллельные и зависимые E, acceptance exact SHA, DOCS и cleanup/complete; без режима или профильного скрипта.",
      "acceptance_criteria": [
        "Связный реальный API/MCP/SDK/Kit/Git fixture проверяет prepared Start, больше двух сообщений и оба направления, busy/active command, параллельные и зависимые E, acceptance exact SHA, DOCS и cleanup/complete; без режима или профильного скрипта.",
        "Две панели, restart/remount/lease loss, UNKNOWN, поздний Promise, Stop/Continue и identity mismatch не дают повтор SDK, ложных квитанций или межпроектного эффекта. Обе части Kit выполнены; Python cache preflight перед package проверками.",
        "Доказаны только фактически выполненные автоматические свойства; live ChatGPT и native Windows/Linux/iPad отмечены NOT_RUN. Продуктовые дефекты исправляются до DOCS, не маскируются ослаблением assertions. Продуктовое исправление: plan:extend корректирующей задачи до DOCS либо явное task:update области PROOF до изменения src.",
        "Сохранённый UNKNOWN прежнего глобального Review sender блокирует любой новый SDK тому же чату, а не только следующий Review. Проверить отдельную адресную регрессию, не затрагивая соседние чаты."
      ],
      "expected_commit_message": "feat: проверить полный обмен и восстановление на изолированных сценариях",
      "parallel_safe": false,
      "task_brief": "Проверить полный обмен и восстановление на изолированных сценариях. Связный реальный API/MCP/SDK/Kit/Git fixture проверяет prepared Start, больше двух сообщений и оба направления, busy/active command, параллельные и зависимые E, acceptance exact SHA, DOCS и cleanup/complete; без режима или профильного скрипта. Две панели, restart/remount/lease loss, UNKNOWN, поздний Promise, Stop/Continue и identity mismatch не дают повтор SDK, ложных квитанций или межпроектного эффекта. Обе части Kit выполнены; Python cache preflight перед package проверками. Доказаны только фактически выполненные автоматические свойства; live ChatGPT и native Windows/Linux/iPad отмечены NOT_RUN. Продуктовые дефекты исправляются до DOCS, не маскируются ослаблением assertions. Продуктовое исправление: plan:extend корректирующей задачи до DOCS либо явное task:update области PROOF до изменения src. Последовательная разработка в текущем checkout без делегирования, по полной спецификации; donor и работающую службу не менять; fixtures не живая приёмка.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/sdk-messaging.md",
            "required": true
          },
          {
            "path": "docs/architecture/OVERVIEW.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "actual_files": [
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "tests/dialogue-delivery.test.mjs",
        "tests/electron-smoke.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "sdk-messaging",
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
        "scripts/stage-chatgpt-plugin.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/migration-compatibility.test.mjs",
        "packages/workflow-kit/package.json",
        "packages/workflow-kit/package-lock.json",
        "packages/workflow-kit/src/lib/role-protocol.mjs",
        "packages/workflow-kit/src/lib/common.mjs",
        "packages/workflow-kit/src/lib/installer.mjs",
        "tests/workflow-kit-upgrade.test.mjs",
        "tests/fixtures/released-kit/kit-1.10.2.tar.gz",
        "tests/fixtures/released-kit/manifest.json",
        "tools/codex-app-server-mcp/plugin.py"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "architecture",
        "release-tooling",
        "chatgpt-plugin",
        "executor-channel",
        "kit-upgrade"
      ],
      "id": "VERSION",
      "title": "Согласовать новую версию и immutable панель",
      "why": "После проверки локальных/remote выпусков выбран свободный возрастающий номер; package/lock/backend/protocol/build и immutable resource согласованы. 0.5.36/0.5.37 артефакты не перезаписаны.",
      "acceptance_criteria": [
        "После проверки локальных/remote выпусков выбран свободный возрастающий номер; package/lock/backend/protocol/build и immutable resource согласованы. 0.5.36/0.5.37 артефакты не перезаписаны.",
        "Несовместимая старая панель отклоняется явно. Закреплённые SDK зависимости сохраняются; новый protocol только при изменении контракта. Релизные инструменты подтверждены.",
        "Если SDK меняет role-protocol/instructions Kit, повысить согласованные версии role/Kit, package/lock/templates и подтвердить kit-upgrade с выпущенных версий; installed Kit меняет installer. Без изменения контракта Kit версию не повышать.",
        "Фактический MCP каталог dispatch/yield описывает доставку без busy/конца ответа; terminal proof отделён от следующего SDK. Upgrade с выпущенных 1.10.1/1.10.2 подтверждает новые инструкции ролей без замены плана."
      ],
      "expected_commit_message": "feat: согласовать новую версию и immutable панель",
      "parallel_safe": false,
      "task_brief": "Согласовать новую версию и immutable панель. После проверки локальных/remote выпусков выбран свободный возрастающий номер; package/lock/backend/protocol/build и immutable resource согласованы. 0.5.36/0.5.37 артефакты не перезаписаны. Несовместимая старая панель отклоняется явно. Закреплённые SDK зависимости сохраняются; новый protocol только при изменении контракта. Релизные инструменты подтверждены. Если SDK меняет role-protocol/instructions Kit, повысить согласованные версии role/Kit, package/lock/templates и подтвердить kit-upgrade с выпущенных версий; installed Kit меняет installer. Без изменения контракта Kit версию не повышать. Последовательная разработка в текущем checkout без делегирования, по полной спецификации; donor и работающую службу не менять; fixtures не живая приёмка.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/sdk-messaging.md",
            "required": true
          },
          {
            "path": "docs/architecture/OVERVIEW.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "actual_files": [
        "package-lock.json",
        "package.json",
        "packages/workflow-kit/package.json",
        "packages/workflow-kit/src/lib/common.mjs",
        "packages/workflow-kit/src/lib/installer.mjs",
        "packages/workflow-kit/src/lib/role-protocol.mjs",
        "src/contracts/backend.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/fixtures/released-kit/kit-1.10.2.tar.gz",
        "tests/fixtures/released-kit/manifest.json",
        "tests/workflow-kit-upgrade.test.mjs",
        "tools/codex-app-server-mcp/plugin.py"
      ]
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "sdk-messaging",
        "task_id": "DOCS",
        "role": "implementation"
      },
      "dependencies": [
        "SDK",
        "PROOF",
        "VERSION"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/sdk-busy-delivery.md",
        "docs/acceptance/sdk-busy-recipient.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/assignment-dialogue-reliability.md",
        "docs/modules/dialogue-timing.md",
        "docs/modules/current-actions.md",
        "docs/modules/user-choice.md",
        "docs/modules/prepared-tasks.md",
        "docs/modules/project-compatibility.md",
        "docs/modules/release.md",
        "docs/planning/sdk-messaging.md",
        "docs/modules/orchestrated-execution.md",
        "docs/modules/assignment-dialogue.md",
        "docs/modules/plugin-communication-handoff.md",
        "docs/modules/automatic-agent-dialogue-acceptance.md",
        "docs/modules/sdk-messaging.md",
        "docs/acceptance/sdk-messaging.md",
        "docs/modules/workflow-execution.md",
        "docs/modules/execution.md",
        "docs/modules/orchestrator-startup.md",
        "docs/modules/session-titles.md",
        "docs/modules/chat-only-startup.md",
        "packages/workflow-kit/README.md",
        "packages/workflow-kit/docs/modules/workflow-kit-package.md",
        "packages/workflow-kit/docs/modules/orchestrated-plans.md"
      ],
      "verification_ids": [],
      "id": "DOCS",
      "title": "Актуализация всех документов проекта",
      "why": "Действующие контракты описывают постоянный SDK обмен всех ролей, UNKNOWN и отдельные стадии обработки; старые mode/scripts/test-pair требования удалены. Невыпущенная спецификация перенесена и удалена с exact Git blob ссылкой для required recovery.",
      "acceptance_criteria": [
        "Действующие контракты описывают постоянный SDK обмен всех ролей, UNKNOWN и отдельные стадии обработки; старые mode/scripts/test-pair требования удалены. Невыпущенная спецификация перенесена и удалена с exact Git blob ссылкой для required recovery.",
        "README/OVERVIEW/модули/startup/MCP/ошибки согласованы; каждый документ <=28000 UTF8. Старый опыт остаётся в Git; никаких новых архивных копий. Живая приёмка новой версии честно pending."
      ],
      "expected_commit_message": "docs: актуализация всех документов проекта",
      "parallel_safe": false,
      "task_brief": "Актуализация всех документов проекта. Действующие контракты описывают постоянный SDK обмен всех ролей, UNKNOWN и отдельные стадии обработки; старые mode/scripts/test-pair требования удалены. Невыпущенная спецификация перенесена и удалена с exact Git blob ссылкой для required recovery. README/OVERVIEW/модули/startup/MCP/ошибки согласованы; каждый документ <=28000 UTF8. Старый опыт остаётся в Git; никаких новых архивных копий. Живая приёмка новой версии честно pending. Последовательная разработка в текущем checkout без делегирования, по полной спецификации; donor и работающую службу не менять; fixtures не живая приёмка.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/sdk-messaging.md",
            "required": true
          },
          {
            "path": "docs/architecture/OVERVIEW.md",
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
        "scope_id": "sdk-messaging",
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
      "title": "Собрать macOS Windows Linux из одного исходного коммита",
      "why": "После DOCS закоммиченный sourceCommit один на три ОС; штатная сборка, семь assets, manifest/SHA/размеры/состав/macOS подпись и Downloads проверены. Перед каждой production командой exact Python cache preflight.",
      "acceptance_criteria": [
        "После DOCS закоммиченный sourceCommit один на три ОС; штатная сборка, семь assets, manifest/SHA/размеры/состав/macOS подпись и Downloads проверены. Перед каждой production командой exact Python cache preflight.",
        "Нет donor изменений, ослабленной composition проверки и перезаписи прежних комплектов. Новые исходники после сборки требуют нового корректного sourceCommit/комплекта."
      ],
      "expected_commit_message": "delivery: собрать macos windows linux из одного исходного коммита",
      "parallel_safe": false,
      "verification_kind": "package",
      "task_brief": "Собрать macOS Windows Linux из одного исходного коммита. После DOCS закоммиченный sourceCommit один на три ОС; штатная сборка, семь assets, manifest/SHA/размеры/состав/macOS подпись и Downloads проверены. Перед каждой production командой exact Python cache preflight. Нет donor изменений, ослабленной composition проверки и перезаписи прежних комплектов. Новые исходники после сборки требуют нового корректного sourceCommit/комплекта. Последовательная разработка в текущем checkout без делегирования, по полной спецификации; donor и работающую службу не менять; fixtures не живая приёмка.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/sdk-messaging.md",
            "required": true
          },
          {
            "path": "docs/architecture/OVERVIEW.md",
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
        "scope_id": "sdk-messaging",
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
      "title": "Установить проверенный готовый macOS комплект",
      "why": "Штатный installer доставляет готовую подписанную копию в собственные project/Applications; версия/manifest/signature/rollback проверены. Никаких rebuild/re-sign или закрытия/перезапуска app/backend.",
      "acceptance_criteria": [
        "Штатный installer доставляет готовую подписанную копию в собственные project/Applications; версия/manifest/signature/rollback проверены. Никаких rebuild/re-sign или закрытия/перезапуска app/backend.",
        "При работающем backend подтверждён verified pending; переключение выполняет пользователь. Installed и pending различены, живой тест не приписан установке."
      ],
      "expected_commit_message": "delivery: установить проверенный готовый macos комплект",
      "parallel_safe": false,
      "verification_kind": "installed",
      "task_brief": "Установить проверенный готовый macOS комплект. Штатный installer доставляет готовую подписанную копию в собственные project/Applications; версия/manifest/signature/rollback проверены. Никаких rebuild/re-sign или закрытия/перезапуска app/backend. При работающем backend подтверждён verified pending; переключение выполняет пользователь. Installed и pending различены, живой тест не приписан установке. Последовательная разработка в текущем checkout без делегирования, по полной спецификации; donor и работающую службу не менять; fixtures не живая приёмка.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/sdk-messaging.md",
            "required": true
          },
          {
            "path": "docs/architecture/OVERVIEW.md",
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
        "scope_id": "sdk-messaging",
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
      "title": "Опубликовать полный SDK выпуск на GitHub",
      "why": "После проверок опубликован согласованный полный комплект трёх ОС: draft, tag на sourceCommit, семь проверенных assets size/SHA и окончательный remote проверены, итоговый main после push равен HEAD.",
      "acceptance_criteria": [
        "После проверок опубликован согласованный полный комплект трёх ОС: draft, tag на sourceCommit, семь проверенных assets size/SHA и окончательный remote проверены, итоговый main после push равен HEAD.",
        "Release notes сообщают новый постоянный SDK контракт и честный предел: автоматические проверки пройдены, живая новая приёмка ещё не выполнена. Старые OFF/burst/GO не условия нового выпуска; пользователь прямо поручил публикацию после этого плана. Приватные профили/логи не опубликованы."
      ],
      "expected_commit_message": "delivery: опубликовать полный sdk выпуск на github",
      "parallel_safe": false,
      "verification_kind": "package",
      "task_brief": "Опубликовать полный SDK выпуск на GitHub. После проверок опубликован согласованный полный комплект трёх ОС: draft, tag на sourceCommit, семь проверенных assets size/SHA и окончательный remote проверены, итоговый main после push равен HEAD. Release notes сообщают новый постоянный SDK контракт и честный предел: автоматические проверки пройдены, живая новая приёмка ещё не выполнена. Старые OFF/burst/GO не условия нового выпуска; пользователь прямо поручил публикацию после этого плана. Приватные профили/логи не опубликованы. Последовательная разработка в текущем checkout без делегирования, по полной спецификации; donor и работающую службу не менять; fixtures не живая приёмка.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/sdk-messaging.md",
            "required": true
          },
          {
            "path": "docs/architecture/OVERVIEW.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      }
    }
  ],
  "blocked_reason": null,
  "user_decisions": [
    {
      "id": "sdk-all",
      "text": "Полный постоянный SDK во всех направлениях без экспериментального режима. После ревью выполнить весь план с тремя ОС, установкой и GitHub. Живые тесты новой версии обсудим после реализации.",
      "recorded_at": "2026-10-26T13:40:55.850Z"
    },
    {
      "id": "27f2a57b-3a3a-4f8e-9eb8-93fe8a6c95a6",
      "text": "26.10.2026 пользователь поручил закрыть старый план, согласовать новый с ревьюером и без пауз выполнить вплоть до трёх сборок и GitHub.",
      "recorded_at": "2026-10-26T13:47:30.240Z"
    }
  ],
  "parallel_allowed": false,
  "max_workers": 1,
  "execution_strategy": "sequential",
  "execution_reason": "Пользователь запретил делегирование текущей разработки; границы общего транспорта пересекаются. Параллельные E относятся к продукту и тестовым fixtures. Это внешняя последовательная Codex-разработка, не новый продуктовый O/E-план; задания сохранены в task_brief, backend assignments не создаются."
}
```
<!-- workflow-state:end -->

## Состояние

Execution Scope Status: ACTIVE
Delivery Status: IN_PROGRESS
Scope: sdk-messaging
Current Task: нет
Revision: 1221

## Цель

Полностью перевести O, E и сообщения приложения на постоянный SDK, передать очередь обработки ChatGPT, удалить опыт и выпустить новый комплект macOS/Windows/Linux с установкой на Mac и GitHub публикацией.

## Критерии приёмки

- SDK единственный рабочий транспорт всех ролей без режима/скрипта и ожидания busy/idle.
- Идентичность, Stop/UNKNOWN, receipts, acceptance/integration и жизненный цикл сохранены и проверены отдельно.
- Три сборки одного sourceCommit, штатная установка/pending на Mac и GitHub публикация подтверждены; live новой версии отдельно.

## Микрозадачи

Выполнение: sequential; разрешено: false; лимит: 1
Причина: Пользователь запретил делегирование текущей разработки; границы общего транспорта пересекаются. Параллельные E относятся к продукту и тестовым fixtures. Это внешняя последовательная Codex-разработка, не новый продуктовый O/E-план; задания сохранены в task_brief, backend assignments не создаются.

- [DONE] SDK: Перевести весь адресный обмен на единый постоянный SDK — Завершено
  - Git Commit: [DONE] feat: перевести весь адресный обмен на единый постоянный sdk
  - Reference: sdk-messaging / SDK / implementation
  - Файлы: src/control/plugin/workflow-channel.mjs, src/control/plugin/communication.mjs, src/control/plugin/assignment-dialogue.mjs, src/control/plugin/service.mjs, src/control/plugin/startup-context.mjs, src/control/facade.mjs, src/control/workflow/dialogue-delivery.mjs, src/control/workflow/executor-session.mjs, src/control/workflow/coordination.mjs, src/control/workflow/command-activity.mjs, src/contracts/plugin-communication.mjs, src/contracts/backend.mjs, src/contracts/dialogue-view.mjs, src/execution/facade.mjs, src/execution/plugin/bridge.mjs, src/execution/plugin/communication-store.mjs, src/execution/plugin/sdk-busy-experiment.mjs, src/execution/plugin/sdk-busy-probe.mjs, src/frontend/plugin/launch.mjs, src/frontend/plugin/panel.mjs, src/backend/desktop-model.mjs, tools/codex-app-server-mcp/plugin.py, scripts/prepare-sdk-busy-experiment.mjs, scripts/analyze-sdk-busy-experiment.mjs, packages/workflow-kit/src/lib/role-protocol.mjs, tests/sdk-busy-experiment.test.mjs, tests/sdk-busy-analysis.test.mjs, tests/workflow-channel.test.mjs, tests/plugin-communication.test.mjs, tests/dialogue-delivery.test.mjs, tests/chatgpt-plugin.test.mjs, tests/codex-app-server-mcp.test.mjs, tests/automatic-agent-dialogue.test.mjs, tests/fixtures/automatic-agent-dialogue.mjs, tests/command-activity.test.mjs, tests/progress.test.mjs, tests/startup-context.test.mjs, tests/migration-compatibility.test.mjs, tests/electron-smoke.mjs, src/control/workflow/parallel-execution.mjs, src/control/workflow/execution-control.mjs, src/control/workflow/execution-projection.mjs, src/control/workflow/user-choices.mjs, src/control/workflow/plan-continuation.mjs, src/control/workflow/project-plan-continuation.mjs, src/control/workflow/project-session-plan-continuation.mjs, src/control/workflow/review-continuation.mjs, src/control/workflow/plan-review.mjs, src/frontend/desktop/ui/current-actions.mjs, packages/workflow-kit/package.json, packages/workflow-kit/package-lock.json, tests/execution-control.test.mjs, tests/orchestrated-execution.test.mjs, tests/parallel-execution-recovery.test.mjs, tests/parallel-execution-ui.test.mjs, tests/parallel-execution.test.mjs, tests/plan-continuation.test.mjs, tests/plan-review.test.mjs, tests/project-plan-continuation.test.mjs, tests/user-choice-view.test.mjs, tests/user-choices.test.mjs, src/control/context/context-session.mjs, src/control/workflow/automation-send-state.mjs, tests/automation-send-state.test.mjs, tests/backend-api.test.mjs, tests/backend-browser-lifecycle.test.mjs, tests/panel-dialogue-view.test.mjs, tests/parallel-finalization.test.mjs, docs/planning/sdk-messaging.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] PROOF: Проверить полный обмен и восстановление на изолированных сценариях — Завершено
  - Git Commit: [DONE] feat: проверить полный обмен и восстановление на изолированных сценариях
  - Reference: sdk-messaging / PROOF / implementation
  - Файлы: tests/sdk-busy-experiment.test.mjs, tests/sdk-busy-analysis.test.mjs, tests/workflow-channel.test.mjs, tests/plugin-communication.test.mjs, tests/dialogue-delivery.test.mjs, tests/chatgpt-plugin.test.mjs, tests/codex-app-server-mcp.test.mjs, tests/automatic-agent-dialogue.test.mjs, tests/fixtures/automatic-agent-dialogue.mjs, tests/command-activity.test.mjs, tests/progress.test.mjs, tests/startup-context.test.mjs, tests/migration-compatibility.test.mjs, tests/electron-smoke.mjs, tests/execution-control.test.mjs, tests/orchestrated-execution.test.mjs, tests/parallel-execution-recovery.test.mjs, tests/parallel-execution-ui.test.mjs, tests/parallel-execution.test.mjs, tests/plan-continuation.test.mjs, tests/plan-review.test.mjs, tests/project-plan-continuation.test.mjs, tests/user-choice-view.test.mjs, tests/user-choices.test.mjs, src/control/workflow/dialogue-delivery.mjs, src/control/workflow/coordination.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: SDK
- [DONE] VERSION: Согласовать новую версию и immutable панель — Завершено
  - Git Commit: [DONE] feat: согласовать новую версию и immutable панель
  - Reference: sdk-messaging / VERSION / implementation
  - Файлы: package.json, package-lock.json, src/contracts/backend.mjs, scripts/stage-chatgpt-plugin.mjs, tests/chatgpt-plugin.test.mjs, tests/codex-app-server-mcp.test.mjs, tests/migration-compatibility.test.mjs, packages/workflow-kit/package.json, packages/workflow-kit/package-lock.json, packages/workflow-kit/src/lib/role-protocol.mjs, packages/workflow-kit/src/lib/common.mjs, packages/workflow-kit/src/lib/installer.mjs, tests/workflow-kit-upgrade.test.mjs, tests/fixtures/released-kit/kit-1.10.2.tar.gz, tests/fixtures/released-kit/manifest.json, tools/codex-app-server-mcp/plugin.py
  - Параллельность: исключительное выполнение
  - Зависимости: PROOF
- [TODO] DOCS: Актуализация всех документов проекта — Ожидает
  - Git Commit: [PENDING] docs: актуализация всех документов проекта
  - Reference: sdk-messaging / DOCS / implementation
  - Файлы: README.md, docs/architecture/OVERVIEW.md, docs/modules/sdk-busy-delivery.md, docs/acceptance/sdk-busy-recipient.md, docs/modules/chatgpt-plugin.md, docs/modules/assignment-dialogue-reliability.md, docs/modules/dialogue-timing.md, docs/modules/current-actions.md, docs/modules/user-choice.md, docs/modules/prepared-tasks.md, docs/modules/project-compatibility.md, docs/modules/release.md, docs/planning/sdk-messaging.md, docs/modules/orchestrated-execution.md, docs/modules/assignment-dialogue.md, docs/modules/plugin-communication-handoff.md, docs/modules/automatic-agent-dialogue-acceptance.md, docs/modules/sdk-messaging.md, docs/acceptance/sdk-messaging.md, docs/modules/workflow-execution.md, docs/modules/execution.md, docs/modules/orchestrator-startup.md, docs/modules/session-titles.md, docs/modules/chat-only-startup.md, packages/workflow-kit/README.md, packages/workflow-kit/docs/modules/workflow-kit-package.md, packages/workflow-kit/docs/modules/orchestrated-plans.md
  - Параллельность: исключительное выполнение
  - Зависимости: SDK, PROOF, VERSION
- [TODO] RELEASE: Собрать macOS Windows Linux из одного исходного коммита — Ожидает
  - Git Commit: [PENDING] delivery: собрать macos windows linux из одного исходного коммита
  - Reference: sdk-messaging / RELEASE / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: DOCS
- [TODO] INSTALL: Установить проверенный готовый macOS комплект — Ожидает
  - Git Commit: [PENDING] delivery: установить проверенный готовый macos комплект
  - Reference: sdk-messaging / INSTALL / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: RELEASE, DOCS
- [TODO] PUBLISH: Опубликовать полный SDK выпуск на GitHub — Ожидает
  - Git Commit: [PENDING] delivery: опубликовать полный sdk выпуск на github
  - Reference: sdk-messaging / PUBLISH / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: INSTALL, DOCS

## Context Pack For This Cycle

- docs/planning/sdk-messaging.md
- docs/architecture/OVERVIEW.md

Служебные состояния меняются только командами workflow. Приёмка не архивирует scope.
