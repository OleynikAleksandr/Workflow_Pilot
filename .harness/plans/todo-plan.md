# Активный план — Workflow_Pilot

<!-- workflow-state:begin -->
```json
{
  "schema_version": 1,
  "plan_revision": 359,
  "project_id": "7411e192-943c-4529-bffb-3b081d9c242f",
  "project_name": "Workflow_Pilot",
  "scope_id": "workflow-pilot-orchestrated-execution",
  "execution_scope_status": "ACTIVE",
  "delivery_status": "IN_PROGRESS",
  "objective": "Оркестрованное выполнение плана 0.4.0: сессия без плана — оркестратор; одна кнопка запуска/паузы; обычные задачи и DOCS — исполнителями в worktree (последовательные после барьера, параллельные до max_workers), delivery-хвост и итоговая очистка — оркестратором в main; дерево проекта по планам.",
  "acceptance_criteria": [
    "R01 Новая сессия проекта без активного плана — оркестратор, при активном плане — чат обсуждения; роль назначает приложение, оркестратор плана подтверждается по execution_origin_session_id",
    "R02 Kit принимает orchestrated-план с метками parallel_safe, всегда добавляет DOCS и проверяет delivery-хвост по delivery_tail при release: true",
    "R03 Все обычные задачи и DOCS выполняются отдельными исполнителями в worktree с проверенной интеграцией; последовательная — одна после барьера; delivery-хвост выполняет оркестратор в main после всех остальных задач; worktree и ветка удаляются после проверенного слияния, итоговую очистку выполняет оркестратор",
    "R04 Исполнитель получает служебную часть Kit, задачу и её context_pack; оркестратор и чат обсуждения — полный recovery с блоком роли; .workflow-temp/ вне Git и recovery",
    "R05 Одна кнопка в шапке плана: «Начать выполнение плана» → «Пауза» → «Продолжить»; пауза останавливает только новые выдачи; состояние переживает перезапуск backend без повторного Send; работает с iPad при праве управления",
    "R06 Сбой: исполнитель → task:block → оркестратор (интеграция, assignment:message, plan:extend) → plan:escalate и автопауза; UNKNOWN — сразу автопауза без повторов",
    "R07 Дерево: оркестраторы и чаты обсуждения, микрозадачи под оркестратором; клик по начатой задаче — сессия исполнителя, по не начатой — карточка; «Выполнено» сохраняется после archive; оркестратор активного плана нельзя архивировать",
    "R08 Выпуск трёх ОС упаковывает платформы параллельно внутри release-all из одного sourceCommit с одним manifest",
    "R09 Legacy sequential/parallel-планы и донорские проекты работают по прежним правилам; Kit 1.7.x обновляется до 1.8.0 с активным планом",
    "R10 DOCS, выпуск трёх ОС, установка в Applications и GitHub Release по обычному порядку; живую приёмку выполняет пользователь"
  ],
  "approved_scope": {
    "functional_paths": [
      "packages/workflow-kit/src/lib/plan.mjs",
      "packages/workflow-kit/src/lib/validate.mjs",
      "packages/workflow-kit/src/lib/validation-rules.mjs",
      "packages/workflow-kit/src/lib/extend-plan.mjs",
      "packages/workflow-kit/src/lib/actions.mjs",
      "packages/workflow-kit/src/lib/simple-workflow.mjs",
      "packages/workflow-kit/src/lib/task-update.mjs",
      "packages/workflow-kit/src/lib/plan-review.mjs",
      "packages/workflow-kit/src/lib/command-help.mjs",
      "packages/workflow-kit/src/schemas/plan.schema.json",
      "packages/workflow-kit/src/schemas/workflow.schema.json",
      "packages/workflow-kit/scripts/check-parallel-plan-fixture.mjs",
      "packages/workflow-kit/scripts/check-runtime-fixture.mjs",
      "packages/workflow-kit/scripts/check-plan-review-fixture.mjs",
      "packages/workflow-kit/src/lib/task-assignment.mjs",
      "packages/workflow-kit/src/lib/assignment-contract.mjs",
      "packages/workflow-kit/src/lib/task-integration.mjs",
      "packages/workflow-kit/src/lib/signals.mjs",
      "packages/workflow-kit/src/cli.mjs",
      "packages/workflow-kit/scripts/check-orchestrated-execution-fixture.mjs",
      "packages/workflow-kit/package.json",
      "packages/workflow-kit/src/lib/integration-proof.mjs",
      "packages/workflow-kit/src/lib/recovery.mjs",
      "packages/workflow-kit/src/lib/installer.mjs",
      "packages/workflow-kit/src/lib/installation-files.mjs",
      "packages/workflow-kit/scripts/check-project-recovery-fixture.mjs",
      "packages/workflow-kit/scripts/check-previous-upgrade-fixture.mjs",
      "packages/workflow-kit/scripts/check-package.mjs",
      "tests/workflow-kit-recovery.test.mjs",
      "tests/workflow-kit-upgrade.test.mjs",
      "tests/workflow-kit-source.test.mjs",
      "tests/migration-compatibility.test.mjs",
      "src/control/sessions/workspace-session.mjs",
      "src/control/sessions/session-plans.mjs",
      "src/control/projects/service.mjs",
      "src/control/context/service.mjs",
      "src/control/context/context-cache.mjs",
      "src/control/context/context-session.mjs",
      "src/control/facade.mjs",
      "tests/session-roles.test.mjs",
      "tests/workspace-session.test.mjs",
      "tests/session-plans.test.mjs",
      "tests/context-session.test.mjs",
      "tests/control-facade.test.mjs",
      "src/control/projects/workspace-deletion.mjs",
      "src/control/workflow/execution-control.mjs",
      "src/control/workflow/project-auto-plan.mjs",
      "src/control/workflow/coordination.mjs",
      "src/contracts/desktop.mjs",
      "src/backend/desktop-model.mjs",
      "src/frontend/desktop/preload.cjs",
      "src/frontend/desktop/ipc.mjs",
      "tests/execution-control.test.mjs",
      "tests/project-auto-plan.test.mjs",
      "tests/backend-desktop-model.test.mjs",
      "tests/desktop-boundaries.test.mjs",
      "src/control/workflow/auto-plan-state.mjs",
      "src/control/workflow/project-session-auto-plan.mjs",
      "src/control/workflow/parallel-execution.mjs",
      "src/control/workflow/parallel-kit.mjs",
      "src/control/workflow/executor-session.mjs",
      "src/control/workflow/execution-projection.mjs",
      "tests/parallel-execution.test.mjs",
      "tests/parallel-execution-recovery.test.mjs",
      "tests/parallel-finalization.test.mjs",
      "src/control/workflow/plan-monitor.mjs",
      "tests/plan-monitor.test.mjs",
      "src/execution/files/project-input-watch.mjs",
      "src/frontend/desktop/ui/sidebar.mjs",
      "src/frontend/desktop/ui/index.html",
      "src/frontend/desktop/ui/progress.mjs",
      "src/contracts/workflow-view.mjs",
      "tests/sidebar.test.mjs",
      "tests/parallel-execution-ui.test.mjs",
      "tests/electron-smoke.mjs",
      "tests/web-client.test.mjs",
      "src/frontend/desktop/ui/archive.mjs",
      "src/frontend/desktop/ui/settings-panel.mjs",
      "scripts/release-all.mjs",
      "package.json",
      "tests/release-all.test.mjs",
      "tests/orchestrated-execution.test.mjs",
      "package-lock.json",
      "src/frontend/plugin/index.html",
      "src/frontend/plugin/app.mjs",
      "tests/backend-upgrade.test.mjs",
      "release-manifest.json",
      "packages/workflow-kit/src/lib/transaction-state.mjs",
      "packages/workflow-kit/src/lib/common.mjs",
      "tests/release-linux.test.mjs",
      "src/frontend/desktop/client.mjs",
      "src/frontend/desktop/ui/browser-view.mjs",
      "src/frontend/desktop/browser-view-preload.cjs",
      "tests/desktop-client.test.mjs",
      "src/execution/browser/presentation/host.mjs",
      "src/execution/browser/presentation/transport.mjs",
      "src/frontend/client/browser-view.mjs",
      "tests/browser-presentation.test.mjs",
      "tests/fixtures/backend-browser-page.html",
      "tests/fixtures/backend-browser-probe.mjs",
      "src/backend/lifecycle.mjs",
      "src/backend/bootstrap.mjs",
      "src/frontend/client/connection.mjs",
      "tests/backend-connection.test.mjs",
      "src/backend/main.mjs",
      "tests/backend-shutdown.test.mjs",
      "src/backend/shutdown.mjs",
      "src/control/workflow/auto-plan.mjs",
      "src/backend/operations.mjs",
      "tests/parallel-execution-smoke-fixture.cjs",
      "tests/backend-bootstrap.test.mjs"
    ],
    "documentation_paths": [
      "docs/architecture/OVERVIEW.md",
      "docs/modules/workflow-execution.md",
      "docs/modules/desktop.md",
      "docs/modules/control.md",
      "docs/modules/release.md",
      "docs/modules/project-compatibility.md",
      "docs/modules/remote-access.md",
      "docs/planning/backend-independence-followup.md",
      "README.md",
      "AGENTS.md",
      "docs/planning/orchestrated-execution-next.md",
      "docs/planning/orchestrated-execution-contracts.md",
      "packages/workflow-kit/docs/modules/orchestrated-plans.md",
      "packages/workflow-kit/docs/modules/workflow-kit-package.md",
      "packages/workflow-kit/docs/modules/parallel-assignments.md",
      "packages/workflow-kit/README.md",
      "docs/acceptance/orchestrated-execution.md",
      "packages/workflow-kit/src/WORKFLOW.md",
      "packages/workflow-kit/src/templates/PLAN.md",
      "packages/workflow-kit/src/templates/AGENTS.md",
      "packages/workflow-kit/src/templates/PROTOTYPE.md",
      "docs/modules/orchestrated-execution.md",
      "docs/planning/client-clipboard-drop.md",
      "docs/modules/browser.md",
      "docs/planning/orchestrated-executor-fixes.md",
      "docs/modules/backend.md",
      "docs/planning/orchestrated-archive-recovery.md",
      "docs/planning/single-plan-button.md",
      "docs/modules/project-lifecycle.md",
      "docs/acceptance/backend-independence.md",
      "docs/planning/startup-orphan-records.md"
    ]
  },
  "baseline_commit": "f2420803fca7b20789055f2e8743a60882260ff0",
  "current_task_id": null,
  "context_pack": {
    "documents": [
      {
        "path": "docs/planning/orchestrated-execution-next.md",
        "required": false,
        "revision": "f6e62cc0877bc66e4287a4a0d55b974510b8b77f"
      },
      {
        "path": "docs/planning/orchestrated-execution-contracts.md",
        "required": false,
        "revision": "f6e62cc0877bc66e4287a4a0d55b974510b8b77f"
      },
      {
        "path": "docs/modules/workflow-execution.md",
        "required": false,
        "revision": "WORKTREE"
      },
      {
        "path": "packages/workflow-kit/docs/modules/parallel-assignments.md",
        "required": false,
        "revision": "WORKTREE"
      },
      {
        "path": "packages/workflow-kit/docs/modules/workflow-kit-package.md",
        "required": false,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/modules/desktop.md",
        "required": false,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/modules/control.md",
        "required": false,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/architecture/OVERVIEW.md",
        "required": true,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/planning/client-clipboard-drop.md",
        "required": false,
        "revision": "541561d8218ac5de2d5011b6fa7ac7e7d149e8d6"
      },
      {
        "path": "docs/planning/orchestrated-executor-fixes.md",
        "required": false,
        "revision": "03b238701f8182c539483850347c1d4aa23c1489"
      },
      {
        "path": "docs/planning/orchestrated-archive-recovery.md",
        "required": false,
        "revision": "0ae5407c6ffffa5363df8b1a55813d6a599e8504"
      },
      {
        "path": "docs/planning/single-plan-button.md",
        "required": false,
        "revision": "4ca205b99612e9cd147487c46c9a58a43b8de7b4"
      },
      {
        "path": "docs/planning/startup-orphan-records.md",
        "required": true,
        "revision": "4dafc12c3d401f4dd04637e6c428e84290983a1c"
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
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T001",
        "role": "implementation"
      },
      "dependencies": [],
      "functional_paths": [
        "packages/workflow-kit/src/lib/plan.mjs",
        "packages/workflow-kit/src/lib/validate.mjs",
        "packages/workflow-kit/src/lib/validation-rules.mjs",
        "packages/workflow-kit/src/lib/extend-plan.mjs",
        "packages/workflow-kit/src/lib/actions.mjs",
        "packages/workflow-kit/src/lib/simple-workflow.mjs",
        "packages/workflow-kit/src/lib/task-update.mjs",
        "packages/workflow-kit/src/lib/plan-review.mjs",
        "packages/workflow-kit/src/lib/command-help.mjs",
        "packages/workflow-kit/src/schemas/plan.schema.json",
        "packages/workflow-kit/src/schemas/workflow.schema.json",
        "packages/workflow-kit/scripts/check-parallel-plan-fixture.mjs",
        "packages/workflow-kit/scripts/check-runtime-fixture.mjs",
        "packages/workflow-kit/scripts/check-plan-review-fixture.mjs"
      ],
      "documentation_paths": [
        "packages/workflow-kit/src/WORKFLOW.md",
        "packages/workflow-kit/src/templates/PLAN.md"
      ],
      "verification_ids": [
        "kit-check",
        "unit-all"
      ],
      "id": "T001",
      "title": "Kit: orchestrated-план, обязательная DOCS и хвост",
      "why": "Kit должен принимать и проверять план оркестратора до изменения выполнения.",
      "acceptance_criteria": [
        "execution_strategy orchestrated принимают схема, валидатор, plan:create, review:prepare/publish и plan:extend; execution_origin_session_id для него обязателен; sequential/parallel-планы валидируются как раньше",
        "Для orchestrated DONE обычной задачи и DOCS требует роли integration с operation_id и source_commit, delivery-задачи — implementation",
        "Для orchestrated Kit всегда добавляет DOCS: без delivery — последней, с delivery — перед ним; plan:extend ставит новые задачи перед DOCS",
        "Поле release и delivery_tail в workflow.json: при release: true состав и порядок delivery после DOCS сверяются с delivery_tail, без настройки — отказ с объяснением; при release: false delivery-задач нет",
        "parallel_safe: true в orchestrated-плане отклоняется при parallel_allowed false или max_workers 1; для прежних стратегий правило не применяется",
        "context_pack задачи принимают plan:create, review:prepare, plan:extend и task:update (только не начатая задача)",
        "Fixtures покрывают принятие, отказы и legacy-планы"
      ],
      "expected_commit_message": "feat: Kit принимает orchestrated-план с обязательной DOCS",
      "parallel_safe": false,
      "actual_files": [
        "packages/workflow-kit/scripts/check-parallel-plan-fixture.mjs",
        "packages/workflow-kit/src/WORKFLOW.md",
        "packages/workflow-kit/src/lib/actions.mjs",
        "packages/workflow-kit/src/lib/command-help.mjs",
        "packages/workflow-kit/src/lib/extend-plan.mjs",
        "packages/workflow-kit/src/lib/plan.mjs",
        "packages/workflow-kit/src/lib/simple-workflow.mjs",
        "packages/workflow-kit/src/lib/task-update.mjs",
        "packages/workflow-kit/src/lib/validate.mjs",
        "packages/workflow-kit/src/lib/validation-rules.mjs",
        "packages/workflow-kit/src/schemas/plan.schema.json",
        "packages/workflow-kit/src/schemas/workflow.schema.json",
        "packages/workflow-kit/src/templates/PLAN.md"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T002",
        "role": "implementation"
      },
      "dependencies": [
        "T001"
      ],
      "functional_paths": [
        "packages/workflow-kit/src/lib/task-assignment.mjs",
        "packages/workflow-kit/src/lib/assignment-contract.mjs",
        "packages/workflow-kit/src/lib/task-integration.mjs",
        "packages/workflow-kit/src/lib/signals.mjs",
        "packages/workflow-kit/src/lib/actions.mjs",
        "packages/workflow-kit/src/cli.mjs",
        "packages/workflow-kit/src/lib/command-help.mjs",
        "packages/workflow-kit/scripts/check-orchestrated-execution-fixture.mjs",
        "packages/workflow-kit/package.json",
        "packages/workflow-kit/src/lib/integration-proof.mjs",
        "packages/workflow-kit/src/lib/plan.mjs",
        "packages/workflow-kit/src/schemas/plan.schema.json",
        "packages/workflow-kit/scripts/check-parallel-plan-fixture.mjs",
        "packages/workflow-kit/src/lib/transaction-state.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "kit-check",
        "unit-all"
      ],
      "id": "T002",
      "title": "Kit: main только для delivery, барьер, сигналы и очистка worktree",
      "why": "Обычные задачи выполняются только исполнителями в worktree, оркестратор пишет в main лишь delivery, worktree не накапливаются.",
      "acceptance_criteria": [
        "В orchestrated-плане task:start в main обычной задачи и DOCS отклоняется до записи; delivery-задаче разрешён только при DONE всех остальных задач, без незавершённых назначений, при IDLE интеграции, чистом main и без транзакции",
        "Назначение parallel_safe: false задачи выдаётся только при DONE всех предыдущих задач и без незавершённых назначений; до её INTEGRATED другие назначения отклоняются",
        "После подтверждённого INTEGRATED worktree и влитая ветка удаляются без force; отказ удаления не отменяет интеграцию и помечает назначение для итоговой очистки; невлитые worktree не удаляются",
        "Интеграция DOCS, удалившей required-документ с ревизией WORKTREE, переносит закрепление точной ревизии в общий план main; recovery main не ссылается на удалённый файл",
        "Worktree DOCS без проверок создаётся без npm ci",
        "assignment:cleanup удаляет оставшиеся worktree и ветки только INTEGRATED-назначений и перечисляет остальные; повтор безопасен",
        "task:block сохраняет blocked_reason, задача остаётся IN_PROGRESS в worktree; assignment:message и plan:escalate пишут сигналы в журнал git-common-dir основного checkout без коммита, в том числе из worktree; повтор с тем же ID не дублирует",
        "Fixture на настоящем Git проверяет отказы, барьер, удаление после слияния, очистку, сигналы, прерывание и повтор; plan:extend во время работы исполнителя сохраняет его задачу",
        "Коммит delivery-задачи в main поверх merge-коммитов проходит HISTORY_NOT_LINEAR"
      ],
      "expected_commit_message": "feat: Kit ограничивает main delivery-задачами и чистит worktree",
      "parallel_safe": false,
      "actual_files": [
        "packages/workflow-kit/package.json",
        "packages/workflow-kit/scripts/check-orchestrated-execution-fixture.mjs",
        "packages/workflow-kit/scripts/check-parallel-plan-fixture.mjs",
        "packages/workflow-kit/src/cli.mjs",
        "packages/workflow-kit/src/lib/actions.mjs",
        "packages/workflow-kit/src/lib/assignment-contract.mjs",
        "packages/workflow-kit/src/lib/command-help.mjs",
        "packages/workflow-kit/src/lib/integration-proof.mjs",
        "packages/workflow-kit/src/lib/signals.mjs",
        "packages/workflow-kit/src/lib/task-assignment.mjs",
        "packages/workflow-kit/src/lib/task-integration.mjs",
        "packages/workflow-kit/src/lib/transaction-state.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T003",
        "role": "implementation"
      },
      "dependencies": [
        "T002"
      ],
      "functional_paths": [
        "packages/workflow-kit/src/lib/recovery.mjs",
        "packages/workflow-kit/src/lib/installer.mjs",
        "packages/workflow-kit/src/lib/installation-files.mjs",
        "packages/workflow-kit/package.json",
        "packages/workflow-kit/scripts/check-project-recovery-fixture.mjs",
        "packages/workflow-kit/scripts/check-previous-upgrade-fixture.mjs",
        "packages/workflow-kit/scripts/check-package.mjs",
        "tests/workflow-kit-recovery.test.mjs",
        "tests/workflow-kit-upgrade.test.mjs",
        "tests/workflow-kit-source.test.mjs",
        "tests/migration-compatibility.test.mjs",
        "package-lock.json",
        "packages/workflow-kit/scripts/check-orchestrated-execution-fixture.mjs",
        "packages/workflow-kit/src/cli.mjs",
        "packages/workflow-kit/src/lib/actions.mjs",
        "packages/workflow-kit/src/lib/command-help.mjs",
        "packages/workflow-kit/src/lib/common.mjs",
        "packages/workflow-kit/src/lib/transaction-state.mjs"
      ],
      "documentation_paths": [
        "packages/workflow-kit/docs/modules/orchestrated-plans.md",
        "packages/workflow-kit/docs/modules/workflow-kit-package.md",
        "packages/workflow-kit/docs/modules/parallel-assignments.md",
        "packages/workflow-kit/README.md",
        "packages/workflow-kit/src/templates/AGENTS.md",
        "packages/workflow-kit/src/templates/PROTOTYPE.md",
        "packages/workflow-kit/src/WORKFLOW.md"
      ],
      "verification_ids": [
        "kit-check",
        "unit-all",
        "migration-compatibility"
      ],
      "id": "T003",
      "title": "Kit: recovery по ролям и версия 1.8.0",
      "why": "Каждая роль получает свой контекст; Kit обновляется в проектах без потери активного плана.",
      "acceptance_criteria": [
        "recover --role orchestrator|discussion даёт полный recovery с блоком роли; executor — служебную часть, задачу и только её context_pack; без --role — прежний recovery",
        "recover --role executor берёт задачу из локального плана worktree; recovery оркестратора и чата обсуждения и status показывают работающих исполнителей и blocked_reason; recovery без роли для orchestrated-плана не предлагает task:start обычных задач",
        ".workflow-temp/ в управляемой секции .gitignore и вне recovery, посторонних изменений, проверок коммита и pre-push; конфликт ручной правки секции проверен в upgrade-fixture",
        "Версия Kit 1.8.0; upgrade с 1.7.0–1.7.3 сохраняет активный план и назначения",
        "Новые контракты описаны в orchestrated-plans.md; все документы Kit не больше 28000 байт; recovery проекта Workflow Pilot укладывается в бюджет fixture"
      ],
      "expected_commit_message": "feat: Kit 1.8.0 с recovery по ролям",
      "parallel_safe": false,
      "actual_files": [
        "package-lock.json",
        "packages/workflow-kit/README.md",
        "packages/workflow-kit/docs/modules/orchestrated-plans.md",
        "packages/workflow-kit/docs/modules/parallel-assignments.md",
        "packages/workflow-kit/docs/modules/workflow-kit-package.md",
        "packages/workflow-kit/package.json",
        "packages/workflow-kit/scripts/check-orchestrated-execution-fixture.mjs",
        "packages/workflow-kit/scripts/check-previous-upgrade-fixture.mjs",
        "packages/workflow-kit/src/cli.mjs",
        "packages/workflow-kit/src/lib/actions.mjs",
        "packages/workflow-kit/src/lib/command-help.mjs",
        "packages/workflow-kit/src/lib/common.mjs",
        "packages/workflow-kit/src/lib/installation-files.mjs",
        "packages/workflow-kit/src/lib/installer.mjs",
        "packages/workflow-kit/src/lib/recovery.mjs",
        "packages/workflow-kit/src/lib/transaction-state.mjs",
        "packages/workflow-kit/src/templates/PROTOTYPE.md"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T004",
        "role": "implementation"
      },
      "dependencies": [
        "T003"
      ],
      "functional_paths": [
        "src/control/sessions/workspace-session.mjs",
        "src/control/sessions/session-plans.mjs",
        "src/control/projects/service.mjs",
        "src/control/context/service.mjs",
        "src/control/context/context-cache.mjs",
        "src/control/context/context-session.mjs",
        "src/control/facade.mjs",
        "tests/session-roles.test.mjs",
        "tests/workspace-session.test.mjs",
        "tests/session-plans.test.mjs",
        "tests/context-session.test.mjs",
        "tests/control-facade.test.mjs",
        "src/control/projects/workspace-deletion.mjs",
        "src/control/workflow/coordination.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "architecture"
      ],
      "id": "T004",
      "title": "Control: роли сессий и хранилище",
      "why": "Приложение назначает роль сессии и запрашивает recovery по роли.",
      "acceptance_criteria": [
        "Новая сессия без активного плана — кандидат-оркестратор без scope_id, при активном плане — discussion; recovery запрашивается с ролью, кеш контекста учитывает роль",
        "После публикации orchestrated-плана кандидат из execution_origin_session_id получает scope_id плана; прочие кандидаты без scope_id и сессии без роли становятся discussion; оркестраторы прежних планов со своим scope_id не меняются; несовпадение даёт «Требует внимания»",
        "Сессия хранит роль, оркестратор — scope_id и коммит закрытия плана; запись исполнителя INTEGRATED-назначения с удалённым worktree считается завершённой, открывает чат и не попадает в восстановление исполнителей; схема хранилища мигрирует с backup; для такой записи inspect и selectSession используют сохранённую проекцию без чтения диска, страница восстанавливается по chatUrl без повторной отправки контекста, inspectOrphan не считает её пропавшей",
        "Архивирование и удаление оркестратора активного плана и архивирование проекта при активном плане отклоняются во всех путях; «Назначить оркестратором» доступно при потерянном оркестраторе и при несовпадении origin, выбор записывается в хранилище",
        "Тесты покрывают роли, миграцию, запреты и назначение",
        "Внешняя сессия плагина ChatGPT роли не получает",
        "Тест: два кандидата и один оркестратор прежнего плана до и после публикации"
      ],
      "expected_commit_message": "feat: Control назначает роли сессий",
      "parallel_safe": false,
      "actual_files": [
        "src/control/context/context-session.mjs",
        "src/control/context/service.mjs",
        "src/control/facade.mjs",
        "src/control/projects/service.mjs",
        "src/control/sessions/session-plans.mjs",
        "src/control/sessions/workspace-session.mjs",
        "src/control/workflow/coordination.mjs",
        "tests/session-roles.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T005",
        "role": "implementation"
      },
      "dependencies": [
        "T004"
      ],
      "functional_paths": [
        "src/control/workflow/execution-control.mjs",
        "src/control/workflow/project-auto-plan.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/facade.mjs",
        "src/contracts/desktop.mjs",
        "src/backend/desktop-model.mjs",
        "src/frontend/desktop/preload.cjs",
        "src/frontend/desktop/ipc.mjs",
        "tests/execution-control.test.mjs",
        "tests/project-auto-plan.test.mjs",
        "tests/backend-desktop-model.test.mjs",
        "tests/desktop-boundaries.test.mjs",
        "src/control/workflow/auto-plan-state.mjs",
        "src/control/workflow/project-session-auto-plan.mjs",
        "src/control/projects/workspace-deletion.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "architecture"
      ],
      "id": "T005",
      "title": "Control: состояние кнопки выполнения",
      "why": "Запуск, пауза и продолжение плана оркестратора хранятся в backend.",
      "acceptance_criteria": [
        "Состояния not-started, running, pausing, paused, complete и причина паузы хранятся по проекту и scope и переживают перезапуск backend; публикация выполнение не запускает",
        "Команда кнопки проходит через allowlisted ui.invoke с lease; без опубликованного и согласованного плана — отказ",
        "Прежний ProjectAutoPlan работает для legacy-планов без изменений; для orchestrated переключатель AutoPlan и ProjectAutoPlan не используются, основной чат не получает «Продолжай» AutoPlan",
        "Каналы кнопки и «Назначить оркестратором» есть в контракте Desktop и preload; отказы архивирования оркестратора возвращаются через pilot:archive-session и окно архива",
        "Состояние очищается при удалении проекта и восстанавливается при старте фоновой работы",
        "Тесты переходов, отказов, перезапуска и границ preload"
      ],
      "expected_commit_message": "feat: Control хранит запуск и паузу плана",
      "parallel_safe": false,
      "actual_files": [
        "src/backend/desktop-model.mjs",
        "src/contracts/desktop.mjs",
        "src/control/workflow/auto-plan-state.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/execution-control.mjs",
        "src/control/workflow/project-session-auto-plan.mjs",
        "src/frontend/desktop/preload.cjs",
        "tests/execution-control.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T006",
        "role": "implementation"
      },
      "dependencies": [
        "T005"
      ],
      "functional_paths": [
        "src/control/workflow/parallel-execution.mjs",
        "src/control/workflow/parallel-kit.mjs",
        "src/control/workflow/executor-session.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/execution-projection.mjs",
        "tests/parallel-execution.test.mjs",
        "tests/parallel-execution-recovery.test.mjs",
        "tests/parallel-finalization.test.mjs",
        "src/control/workflow/execution-control.mjs",
        "tests/execution-control.test.mjs",
        "src/backend/desktop-model.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "architecture"
      ],
      "id": "T006",
      "title": "Control: волны, delivery-фаза и очистка",
      "why": "План оркестратора выполняется автоматически от первой задачи до очистки.",
      "acceptance_criteria": [
        "Каждая обычная задача и DOCS получают worktree-назначение и новый чат исполнителя; параллельные — до max_workers, последовательная — одна после барьера",
        "Пауза прекращает только новые выдачи; продолжения работающих исполнителей и интеграция готовых источников идут дальше; «Продолжить» выдаёт первую не начатую задачу",
        "Интеграция запускается только при остановленном исполнителе без активных команд; после INTEGRATED страница исполнителя закрывается, чат открывается снова по выбору сессии",
        "Итоговое поручение оркестратору — после DONE всех обычных задач и DOCS, delivery-задачи TODO не считаются недостающими источниками; затем execution-control по одной отправляет delivery-поручения через путь отправки оркестратору с учётом паузы, затем поручение итоговой очистки и ответа",
        "Проекция плана показывает число назначений, ожидающих очистки",
        "Тесты: последовательная → параллельные → последовательная, лимит, пауза, delivery-фаза, перезапуск без повторного Send"
      ],
      "expected_commit_message": "feat: Control ведёт план оркестратора до очистки",
      "parallel_safe": false,
      "actual_files": [
        "src/backend/desktop-model.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/execution-projection.mjs",
        "src/control/workflow/parallel-execution.mjs",
        "src/control/workflow/parallel-kit.mjs",
        "tests/parallel-execution.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T007",
        "role": "implementation"
      },
      "dependencies": [
        "T006"
      ],
      "functional_paths": [
        "src/control/workflow/plan-monitor.mjs",
        "src/control/workflow/parallel-execution.mjs",
        "src/control/workflow/parallel-kit.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/execution-control.mjs",
        "tests/plan-monitor.test.mjs",
        "tests/parallel-execution.test.mjs",
        "tests/execution-control.test.mjs",
        "src/execution/files/project-input-watch.mjs",
        "src/control/workflow/executor-session.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "architecture"
      ],
      "id": "T007",
      "title": "Control: сигналы и эскалация сбоев",
      "why": "Сбой сначала исправляет исполнитель, затем оркестратор, затем решает пользователь.",
      "acceptance_criteria": [
        "task:block приводит к одному сообщению оркестратору с задачей, причиной и сессией исполнителя; assignment:message доставляется в чат исполнителя; доставка журналируется до Send и не повторяется после неизвестного исхода",
        "plan:escalate ставит автопаузу с причиной escalation; UNKNOWN отправки, назначения, слияния или команды записи — автопаузу с причиной unknown без повторов",
        "Конфликт и провал проверок интеграции передаются оркестратору как прежде; исправляющая задача через plan:extend подхватывается без паузы",
        "Тесты покрывают каждый шаг цепочки",
        "Наблюдатель файлов проекта видит журнал сигналов в git-common-dir основного checkout"
      ],
      "expected_commit_message": "feat: Control передаёт сбои оркестратору",
      "parallel_safe": false,
      "actual_files": [
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/executor-session.mjs",
        "src/control/workflow/parallel-execution.mjs",
        "src/control/workflow/parallel-kit.mjs",
        "tests/parallel-execution.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T008",
        "role": "implementation"
      },
      "dependencies": [
        "T007"
      ],
      "functional_paths": [
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/frontend/desktop/ui/index.html",
        "src/frontend/desktop/ui/progress.mjs",
        "src/contracts/workflow-view.mjs",
        "src/backend/desktop-model.mjs",
        "tests/sidebar.test.mjs",
        "tests/parallel-execution-ui.test.mjs",
        "tests/electron-smoke.mjs",
        "tests/web-client.test.mjs",
        "src/frontend/desktop/ui/archive.mjs",
        "src/frontend/desktop/ui/settings-panel.mjs",
        "src/control/context/context-cache.mjs",
        "src/control/context/service.mjs",
        "src/control/facade.mjs",
        "src/control/sessions/workspace-session.mjs",
        "src/control/workflow/execution-projection.mjs",
        "tests/parallel-execution.test.mjs",
        "tests/session-roles.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/orchestrated-execution-contracts.md",
        "docs/planning/orchestrated-execution-next.md"
      ],
      "verification_ids": [
        "unit-all",
        "electron-smoke"
      ],
      "id": "T008",
      "title": "Дерево планов и кнопка выполнения в интерфейсе",
      "why": "Пользователь видит планы и микрозадачи и управляет выполнением одной кнопкой.",
      "acceptance_criteria": [
        "Под проектом — оркестраторы и чаты обсуждения; микрозадачи в дереве не дублируются; группа «Исполнители» только у legacy parallel-планов",
        "To-do plan выбранного оркестратора: маркер ✓/●/○, метка →/∥/main, состояние и таймер; клик по начатой или завершённой задаче открывает сессию исполнителя (delivery — оркестратора), не начатая не кликабельна; при выбранном исполнителе показан план его оркестратора с подсвеченной задачей (решение пользователя 17.10.2026: карточка задачи не нужна)",
        "Шапка плана показывает одну кнопку с подписью по состоянию; у черновика, несогласованного и выполненного плана кнопки нет; переключатель AutoPlan скрыт для планов оркестратора",
        "Оркестратор выполненного плана помечен «Выполнено», его to-do plan читается из коммита закрытия; меню «Назначить оркестратором» при потерянном или несовпавшем оркестраторе",
        "Строка оркестратора показывает назначения, ожидающие очистки",
        "Тот же интерфейс в веб-клиенте iPad; кнопка требует права управления; jsdom-тесты и изолированный smoke"
      ],
      "expected_commit_message": "feat: Дерево планов и кнопка выполнения",
      "parallel_safe": false,
      "actual_files": [
        "docs/planning/orchestrated-execution-contracts.md",
        "docs/planning/orchestrated-execution-next.md",
        "src/backend/desktop-model.mjs",
        "src/control/context/context-cache.mjs",
        "src/control/context/service.mjs",
        "src/control/facade.mjs",
        "src/control/sessions/workspace-session.mjs",
        "src/control/workflow/execution-projection.mjs",
        "src/frontend/desktop/ui/index.html",
        "src/frontend/desktop/ui/sidebar.mjs",
        "tests/parallel-execution.test.mjs",
        "tests/session-roles.test.mjs",
        "tests/sidebar.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T009",
        "role": "implementation"
      },
      "dependencies": [],
      "functional_paths": [
        "scripts/release-all.mjs",
        "package.json",
        "tests/release-all.test.mjs",
        "tests/release-linux.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "release-tooling",
        "unit-all"
      ],
      "id": "T009",
      "title": "Параллельная упаковка платформ в release-all",
      "why": "Выпуск трёх ОС одной транзакцией быстрее за счёт параллельной упаковки.",
      "acceptance_criteria": [
        "Общие ресурсы раскладываются один раз; build:mac, build:win и build:linux в совместной сборке не повторяют stage-шаги и идут одновременно в отдельные папки",
        "Ошибка любой платформы останавливает выпуск без частичного manifest; один manifest с одним sourceCommit; проверки пакетов не ослаблены",
        "Тесты на заглушках платформ"
      ],
      "expected_commit_message": "feat: Параллельная упаковка платформ выпуска",
      "parallel_safe": false,
      "actual_files": [
        "scripts/release-all.mjs",
        "tests/release-all.test.mjs",
        "tests/release-linux.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T010",
        "role": "implementation"
      },
      "dependencies": [
        "T008",
        "T009"
      ],
      "functional_paths": [
        "tests/orchestrated-execution.test.mjs",
        "packages/workflow-kit/scripts/check-parallel-plan-fixture.mjs",
        "packages/workflow-kit/src/lib/actions.mjs"
      ],
      "documentation_paths": [
        "docs/planning/orchestrated-execution-next.md",
        "docs/planning/orchestrated-execution-contracts.md"
      ],
      "verification_ids": [
        "unit-all",
        "kit-check",
        "electron-smoke",
        "architecture",
        "migration-compatibility",
        "release-tooling"
      ],
      "id": "T010",
      "title": "Проверить общий результат оркестрации",
      "why": "Сквозная проверка всех слоёв перед выпуском.",
      "acceptance_criteria": [
        "Изолированный сценарий: orchestrated-план из нескольких волн проходит до конца по кнопке — исполнители в worktree, delivery-фаза оркестратора, удаление worktree и итоговая очистка — с паузой, блокировкой и эскалацией, без модельных ходов",
        "Ограничения и pending живой приёмки записаны в спецификацию"
      ],
      "expected_commit_message": "test: Проверить общий результат оркестрации",
      "parallel_safe": false,
      "actual_files": [
        "docs/planning/orchestrated-execution-contracts.md",
        "packages/workflow-kit/scripts/check-parallel-plan-fixture.mjs",
        "packages/workflow-kit/src/lib/actions.mjs",
        "tests/orchestrated-execution.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T011",
        "role": "implementation"
      },
      "dependencies": [
        "T010"
      ],
      "functional_paths": [
        "package.json",
        "package-lock.json",
        "src/frontend/plugin/index.html",
        "src/frontend/plugin/app.mjs",
        "tests/backend-upgrade.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "release-tooling",
        "unit-all"
      ],
      "id": "T011",
      "title": "Подготовить версию 0.4.0",
      "why": "Номер выпуска для этапа оркестрации.",
      "acceptance_criteria": [
        "Версия 0.4.0 согласована в package/lock и панели плагина"
      ],
      "expected_commit_message": "feat: Подготовить версию 0.4.0",
      "parallel_safe": false,
      "actual_files": [
        "package-lock.json",
        "package.json",
        "src/frontend/plugin/app.mjs",
        "src/frontend/plugin/index.html",
        "tests/backend-upgrade.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
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
        "T010",
        "T011"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "README.md",
        "AGENTS.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/workflow-execution.md",
        "docs/modules/control.md",
        "docs/modules/desktop.md",
        "docs/modules/release.md",
        "docs/modules/project-compatibility.md",
        "docs/modules/remote-access.md",
        "docs/planning/backend-independence-followup.md",
        "docs/planning/orchestrated-execution-next.md",
        "docs/planning/orchestrated-execution-contracts.md",
        "docs/acceptance/orchestrated-execution.md",
        "packages/workflow-kit/README.md",
        "packages/workflow-kit/docs/modules/workflow-kit-package.md",
        "packages/workflow-kit/docs/modules/parallel-assignments.md",
        "packages/workflow-kit/docs/modules/orchestrated-plans.md",
        "packages/workflow-kit/src/WORKFLOW.md",
        "packages/workflow-kit/src/templates/PLAN.md",
        "packages/workflow-kit/src/templates/AGENTS.md",
        "packages/workflow-kit/src/templates/PROTOTYPE.md",
        "docs/modules/orchestrated-execution.md"
      ],
      "verification_ids": [],
      "id": "DOCS",
      "title": "Актуализация всех документов проекта",
      "why": "Перед выпуском сверить README, OVERVIEW, AGENTS и действующие контракты модулей с результатом; обновить устаревшее.",
      "acceptance_criteria": [
        "Документы описывают текущий результат, существенное из выпущенных рабочих спецификаций перенесено в контракты модулей; история остаётся в Git",
        "Pending живой приёмки перенесён в docs/acceptance/orchestrated-execution.md, включая обновление Kit проекта до 1.8.0 в приложении 0.4.0 и config:apply delivery_tail (three-platform-release → release-installed → github-release)"
      ],
      "expected_commit_message": "docs: актуализировать документацию проекта",
      "parallel_safe": false,
      "actual_files": [
        "AGENTS.md",
        "README.md",
        "docs/acceptance/orchestrated-execution.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/control.md",
        "docs/modules/desktop.md",
        "docs/modules/orchestrated-execution.md",
        "docs/modules/project-compatibility.md",
        "docs/modules/release.md",
        "docs/modules/workflow-execution.md",
        "docs/planning/backend-independence-followup.md",
        "docs/planning/orchestrated-execution-contracts.md",
        "docs/planning/orchestrated-execution-next.md"
      ]
    },
    {
      "id": "T015",
      "title": "Исправить параллельную упаковку и отложенный выпуск",
      "why": "Реальная сборка T012 показала: параллельные electron-packager очищают общий временный каталог; начатую delivery-задачу Kit не мог отложить для исправления кода.",
      "dependencies": [],
      "functional_paths": [
        "package.json",
        "scripts/release-all.mjs",
        "tests/release-all.test.mjs",
        "packages/workflow-kit/src/lib/actions.mjs",
        "packages/workflow-kit/scripts/check-parallel-plan-fixture.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "release-tooling",
        "kit-check",
        "unit-all"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Каждая платформа упаковывается со своим временным каталогом electron-packager; параллельная упаковка не стирает чужие временные файлы",
        "Добавление обычной работы откладывает начатую delivery-задачу без её незакоммиченных изменений: она возвращается в TODO, Kit добавляет следующий раунд DOCS, delivery зависит от него",
        "Fixtures покрывают отдельный временный каталог платформ и отложенную delivery-задачу"
      ],
      "expected_commit_message": "fix: Исправить параллельную упаковку и отложенный выпуск",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T015",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "package.json",
        "tests/release-all.test.mjs",
        "packages/workflow-kit/src/lib/actions.mjs",
        "packages/workflow-kit/scripts/check-parallel-plan-fixture.mjs"
      ]
    },
    {
      "id": "DOCS-2",
      "title": "Актуализация всех документов проекта",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "DOCS-2",
        "role": "implementation",
        "iteration": 2
      },
      "why": "Перед выпуском сверить README, OVERVIEW и действующие контракты модулей с результатом; обновить устаревшее.",
      "dependencies": [
        "T015"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/architecture/OVERVIEW.md",
        "packages/workflow-kit/docs/modules/orchestrated-plans.md",
        "docs/modules/release.md",
        "docs/modules/orchestrated-execution.md"
      ],
      "acceptance_criteria": [
        "Документы описывают текущий результат, существенное из выпущенных рабочих спецификаций перенесено в контракты модулей; история остаётся в Git."
      ],
      "verification_ids": [],
      "expected_commit_message": "docs: актуализировать документацию проекта",
      "parallel_safe": false,
      "actual_files": [
        "docs/modules/orchestrated-execution.md",
        "docs/modules/release.md",
        "packages/workflow-kit/docs/modules/orchestrated-plans.md"
      ]
    },
    {
      "id": "T016",
      "title": "Временный каталог упаковки через TMPDIR",
      "why": "Опция --tmpdir CLI electron-packager ломает разбор следующих аргументов: --extra-resource теряется, пакеты Windows и Linux выходят без ресурсов.",
      "dependencies": [],
      "functional_paths": [
        "package.json",
        "scripts/release-all.mjs",
        "tests/release-all.test.mjs",
        "tests/release-linux.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "release-tooling",
        "unit-all"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Скрипты упаковки снова без --tmpdir; buildPlatforms запускает каждую платформу со своим TMPDIR в .harness/runtime/packager-tmp/<платформа>",
        "Одиночная упаковка платформы содержит extra-resource (resources, codex-app-server-mcp и toolchain)",
        "Тест проверяет отдельный TMPDIR каждой платформы и отсутствие --tmpdir в скриптах"
      ],
      "expected_commit_message": "fix: Временный каталог упаковки через TMPDIR",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T016",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "package.json",
        "scripts/release-all.mjs",
        "tests/release-all.test.mjs",
        "tests/release-linux.test.mjs"
      ]
    },
    {
      "id": "DOCS-3",
      "title": "Актуализация всех документов проекта",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "DOCS-3",
        "role": "implementation",
        "iteration": 3
      },
      "why": "Перед выпуском сверить README, OVERVIEW и действующие контракты модулей с результатом; обновить устаревшее.",
      "dependencies": [
        "T016"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/architecture/OVERVIEW.md",
        "docs/modules/release.md"
      ],
      "acceptance_criteria": [
        "Документы описывают текущий результат, существенное из выпущенных рабочих спецификаций перенесено в контракты модулей; история остаётся в Git."
      ],
      "verification_ids": [],
      "expected_commit_message": "docs: актуализировать документацию проекта",
      "parallel_safe": false,
      "actual_files": [
        "docs/modules/release.md"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T012",
        "role": "implementation"
      },
      "dependencies": [
        "T011",
        "DOCS",
        "DOCS-2",
        "DOCS-3"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "three-platform-release"
      ],
      "id": "T012",
      "title": "Собрать выпуск трёх ОС",
      "why": "Полный комплект после DOCS из одного sourceCommit.",
      "acceptance_criteria": [
        "Один штатный цикл macOS arm64, Windows x64, Linux x64 из одного sourceCommit после DOCS; manifest совпадает в staging, Downloads и корне",
        "Длительность сборки зафиксирована в отчёте задачи и сравнена с выпуском 0.3.1; manifest для этого не меняется"
      ],
      "expected_commit_message": "release: Собрать выпуск 0.4.0 трёх ОС",
      "verification_kind": "package",
      "parallel_safe": false,
      "actual_files": [
        "release-manifest.json"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T013",
        "role": "implementation"
      },
      "dependencies": [
        "T012",
        "DOCS",
        "DOCS-2",
        "DOCS-3"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "release-installed"
      ],
      "id": "T013",
      "title": "Установить выпуск в Applications",
      "why": "Обновить установленное приложение штатным installer.",
      "acceptance_criteria": [
        "Установка готового комплекта без пересборки и без перезапуска backend; при работающей службе — pending-копия и инструкция пользователю"
      ],
      "expected_commit_message": "release: Установить 0.4.0 в Applications",
      "verification_kind": "installed",
      "parallel_safe": false,
      "actual_files": []
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T014",
        "role": "implementation"
      },
      "dependencies": [
        "T013",
        "DOCS",
        "DOCS-2",
        "DOCS-3"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "github-release"
      ],
      "id": "T014",
      "title": "Опубликовать GitHub Release",
      "why": "Опубликовать проверенный комплект.",
      "acceptance_criteria": [
        "Тег v0.4.0 на sourceCommit, assets сверены по размеру и digest, remote main совпадает с local HEAD",
        "Итоговый отчёт напоминает пользователю о pending-шагах: обновление Kit проекта до 1.8.0 в приложении 0.4.0 и config:apply delivery_tail"
      ],
      "expected_commit_message": "release: Опубликовать GitHub Release 0.4.0",
      "verification_kind": "package",
      "parallel_safe": false,
      "actual_files": []
    },
    {
      "id": "T017",
      "title": "Исправить вставку и добавить контекстное меню",
      "why": "В 0.4.0 Cmd+V не вставлял текст (асинхронный clipboard Electron 44), правая кнопка не показывала меню.",
      "dependencies": [],
      "functional_paths": [
        "src/frontend/desktop/client.mjs",
        "src/frontend/desktop/ui/browser-view.mjs",
        "src/frontend/desktop/browser-view-preload.cjs",
        "tests/desktop-client.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/client-clipboard-drop.md"
      ],
      "verification_ids": [
        "unit-all",
        "electron-smoke"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Вставка текста идёт через событие paste скрытого поля: Cmd+V, меню Правка и контекстное меню доходят до страницы",
        "Контекстное меню по правой кнопке: Вырезать, Копировать, Вставить, Выделить всё; Копировать и Вырезать доступны при непустом выделении",
        "Ошибки вставки и меню пишутся в client-events и показываются статусом; clipboard основного процесса вызывается с await",
        "Тест desktop-client проверяет вставку текста через настоящий renderer клиента и состав меню без записи в системный буфер"
      ],
      "expected_commit_message": "fix: Вставка и контекстное меню в отдельном клиенте",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T017",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "src/frontend/desktop/client.mjs",
        "src/frontend/desktop/ui/browser-view.mjs",
        "src/frontend/desktop/browser-view-preload.cjs",
        "tests/desktop-client.test.mjs",
        "docs/planning/client-clipboard-drop.md"
      ]
    },
    {
      "id": "T018",
      "title": "Перетаскивание файлов и вставка картинок",
      "why": "Прикрепление файлов к ChatGPT перетаскиванием и вставкой скриншота, как во встроенном браузере до 0.2.0.",
      "dependencies": [
        "T017"
      ],
      "functional_paths": [
        "src/execution/browser/presentation/host.mjs",
        "src/execution/browser/presentation/transport.mjs",
        "src/frontend/client/browser-view.mjs",
        "src/frontend/desktop/client.mjs",
        "src/frontend/desktop/ui/browser-view.mjs",
        "src/frontend/desktop/browser-view-preload.cjs",
        "tests/browser-presentation.test.mjs",
        "tests/fixtures/backend-browser-page.html",
        "tests/fixtures/backend-browser-probe.mjs",
        "tests/desktop-client.test.mjs",
        "src/backend/lifecycle.mjs"
      ],
      "documentation_paths": [
        "docs/planning/client-clipboard-drop.md"
      ],
      "verification_ids": [
        "unit-all",
        "architecture"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "POST /v1/browser/drop после полной передачи файлов выполняет dragEnter, dragOver и drop в точке страницы; без lease отклоняется",
        "Перетаскивание до 10 файлов по 32 МБ на изображение страницы доходит до страницы",
        "Картинка или файл из события paste передаётся странице в точке последнего нажатия",
        "browser-presentation проверяет drop двух файлов на fixture-странице; desktop-client — вставку картинки через renderer"
      ],
      "expected_commit_message": "feat: Перетаскивание файлов и вставка картинок в клиенте",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T018",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "src/execution/browser/presentation/host.mjs",
        "src/execution/browser/presentation/transport.mjs",
        "src/frontend/client/browser-view.mjs",
        "src/frontend/desktop/client.mjs",
        "src/frontend/desktop/ui/browser-view.mjs",
        "src/frontend/desktop/browser-view-preload.cjs",
        "tests/browser-presentation.test.mjs",
        "tests/fixtures/backend-browser-page.html",
        "tests/desktop-client.test.mjs",
        "src/backend/lifecycle.mjs"
      ]
    },
    {
      "id": "T019",
      "title": "Подготовить версию 0.4.1",
      "why": "Номер исправляющего выпуска.",
      "dependencies": [
        "T018"
      ],
      "functional_paths": [
        "package.json",
        "package-lock.json",
        "src/frontend/plugin/index.html",
        "src/frontend/plugin/app.mjs",
        "tests/backend-upgrade.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/client-clipboard-drop.md"
      ],
      "verification_ids": [
        "release-tooling",
        "unit-all"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Версия 0.4.1 согласована в package/lock и панели плагина"
      ],
      "expected_commit_message": "feat: Подготовить версию 0.4.1",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T019",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "package.json",
        "package-lock.json",
        "src/frontend/plugin/index.html",
        "src/frontend/plugin/app.mjs",
        "tests/backend-upgrade.test.mjs"
      ]
    },
    {
      "id": "DOCS-4",
      "title": "Актуализация всех документов проекта",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "DOCS-4",
        "role": "implementation",
        "iteration": 4
      },
      "why": "Перед выпуском сверить README, OVERVIEW и действующие контракты модулей с результатом; обновить устаревшее.",
      "dependencies": [
        "T017",
        "T018",
        "T019"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/architecture/OVERVIEW.md",
        "docs/planning/client-clipboard-drop.md",
        "README.md",
        "docs/modules/browser.md",
        "docs/modules/desktop.md"
      ],
      "acceptance_criteria": [
        "Документы описывают текущий результат, существенное из выпущенных рабочих спецификаций перенесено в контракты модулей; история остаётся в Git."
      ],
      "verification_ids": [],
      "expected_commit_message": "docs: актуализировать документацию проекта",
      "parallel_safe": false,
      "actual_files": [
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/browser.md",
        "docs/modules/desktop.md",
        "docs/planning/client-clipboard-drop.md"
      ]
    },
    {
      "id": "T020",
      "title": "Собрать выпуск 0.4.1 трёх ОС",
      "why": "Полный комплект после DOCS из одного sourceCommit.",
      "dependencies": [
        "T019",
        "DOCS-4"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/client-clipboard-drop.md"
      ],
      "verification_ids": [
        "three-platform-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "Один штатный цикл macOS arm64, Windows x64, Linux x64 из одного sourceCommit после DOCS; manifest совпадает в staging, Downloads и корне"
      ],
      "expected_commit_message": "release: Собрать выпуск 0.4.1 трёх ОС",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T020",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "release-manifest.json"
      ]
    },
    {
      "id": "T021",
      "title": "Установить 0.4.1 в Applications",
      "why": "Обновить установленное приложение штатным installer.",
      "dependencies": [
        "T020",
        "DOCS-4"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/client-clipboard-drop.md"
      ],
      "verification_ids": [
        "release-installed"
      ],
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Установка готового комплекта без пересборки и без перезапуска backend; при работающей службе — pending-копия и инструкция пользователю"
      ],
      "expected_commit_message": "release: Установить 0.4.1 в Applications",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T021",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": []
    },
    {
      "id": "T022",
      "title": "Опубликовать GitHub Release 0.4.1",
      "why": "Опубликовать проверенный комплект.",
      "dependencies": [
        "T021",
        "DOCS-4"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/client-clipboard-drop.md"
      ],
      "verification_ids": [
        "github-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "Тег v0.4.1 на sourceCommit, assets сверены по размеру и digest, remote main совпадает с local HEAD"
      ],
      "expected_commit_message": "release: Опубликовать GitHub Release 0.4.1",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T022",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": []
    },
    {
      "id": "T023",
      "title": "Исполнитель запускается кнопкой плана и в режиме Chat",
      "why": "Живая приёмка 0.4.1: исполнитель T001 ждал выключенный AutoPlan и открылся в режиме Work оркестратора.",
      "dependencies": [],
      "functional_paths": [
        "src/backend/desktop-model.mjs",
        "src/backend/bootstrap.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/facade.mjs",
        "src/control/sessions/workspace-session.mjs",
        "tests/session-roles.test.mjs",
        "tests/orchestrated-execution.test.mjs",
        "tests/workspace-session.test.mjs",
        "tests/execution-control.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/orchestrated-executor-fixes.md"
      ],
      "verification_ids": [
        "unit-all"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Разрешение первого сообщения и продолжений исполнителя плана оркестратора следует только кнопке плана; AutoPlan в новой схеме не участвует",
        "Изменение состояния кнопки сразу применяется к живым исполнителям",
        "Исполнитель плана оркестратора создаётся в Chat при оркестраторе в Work; не начатый исполнитель в Work переводится в Chat",
        "Прежние планы AutoPlan/sequential/parallel не меняются"
      ],
      "expected_commit_message": "fix: Исполнитель плана оркестратора запускается кнопкой плана в режиме Chat",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T023",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "src/control/workflow/coordination.mjs",
        "src/backend/desktop-model.mjs",
        "src/backend/bootstrap.mjs",
        "src/control/sessions/workspace-session.mjs",
        "tests/workspace-session.test.mjs",
        "tests/execution-control.test.mjs",
        "docs/planning/orchestrated-executor-fixes.md"
      ]
    },
    {
      "id": "T024",
      "title": "Выбор сессий и восстановление окна после разрыва потока",
      "why": "Живая приёмка 0.4.1: после выбора исполнителя окно осталось в состоянии «нет связи», to-do plan заменился карточкой назначения, клик по оркестратору не загружал диалог.",
      "dependencies": [
        "T023"
      ],
      "functional_paths": [
        "src/frontend/client/connection.mjs",
        "src/frontend/desktop/client.mjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "tests/backend-connection.test.mjs",
        "tests/sidebar.test.mjs",
        "tests/desktop-client.test.mjs",
        "src/backend/desktop-model.mjs"
      ],
      "documentation_paths": [
        "docs/planning/orchestrated-executor-fixes.md"
      ],
      "verification_ids": [
        "unit-all",
        "electron-smoke"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Переподключение потока по снимку или по номеру события снимает состояние «нет связи»; исключение обработчика не обрывает поток и пишется в журнал",
        "При выборе исполнителя плана оркестратора карточка плана с to-do plan остаётся, карточка назначения скрыта",
        "Клик по сессии оркестратора после выбора исполнителя загружает диалог оркестратора"
      ],
      "expected_commit_message": "fix: Выбор сессий и восстановление окна после разрыва потока",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T024",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "src/frontend/client/connection.mjs",
        "src/frontend/desktop/client.mjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/backend/desktop-model.mjs",
        "tests/backend-connection.test.mjs",
        "tests/sidebar.test.mjs"
      ]
    },
    {
      "id": "T029",
      "title": "Остановка службы не ждёт неотправленную подготовку контекста",
      "why": "Живая приёмка 0.4.1: остановка фоновой службы бесконечно ждала зависшую подготовку первого сообщения исполнителя, которая ещё ничего не отправила в ChatGPT.",
      "dependencies": [
        "T024"
      ],
      "functional_paths": [
        "src/backend/desktop-model.mjs",
        "src/backend/main.mjs",
        "tests/backend-shutdown.test.mjs",
        "src/backend/shutdown.mjs"
      ],
      "documentation_paths": [
        "docs/planning/orchestrated-executor-fixes.md"
      ],
      "verification_ids": [
        "unit-all"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Остановка ждёт идущий ответ, отправку и команды Kit, но не подготовку контекста без начатой отправки",
        "Причины ожидания остановки (коды без данных) пишутся в backend-events.jsonl при изменении"
      ],
      "expected_commit_message": "fix: Остановка службы не ждёт неотправленную подготовку контекста",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T029",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "src/backend/shutdown.mjs",
        "src/backend/desktop-model.mjs",
        "src/backend/main.mjs",
        "tests/backend-shutdown.test.mjs",
        "docs/planning/orchestrated-executor-fixes.md"
      ]
    },
    {
      "id": "T025",
      "title": "Подготовить версию 0.4.2",
      "why": "Номер исправляющего выпуска.",
      "dependencies": [
        "T024",
        "T029"
      ],
      "functional_paths": [
        "package.json",
        "package-lock.json",
        "src/frontend/plugin/index.html",
        "src/frontend/plugin/app.mjs",
        "tests/backend-upgrade.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/orchestrated-executor-fixes.md"
      ],
      "verification_ids": [
        "release-tooling",
        "unit-all"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Версия 0.4.2 согласована в package/lock и панели плагина"
      ],
      "expected_commit_message": "feat: Подготовить версию 0.4.2",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T025",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "package.json",
        "package-lock.json",
        "src/frontend/plugin/index.html",
        "src/frontend/plugin/app.mjs",
        "tests/backend-upgrade.test.mjs"
      ]
    },
    {
      "id": "DOCS-5",
      "title": "Актуализация всех документов проекта",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "DOCS-5",
        "role": "implementation",
        "iteration": 5
      },
      "why": "Перед выпуском сверить README, OVERVIEW и действующие контракты модулей с результатом; обновить устаревшее.",
      "dependencies": [
        "T023",
        "T024",
        "T029",
        "T025"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/architecture/OVERVIEW.md",
        "docs/planning/orchestrated-executor-fixes.md",
        "README.md",
        "docs/modules/orchestrated-execution.md",
        "docs/modules/desktop.md",
        "docs/modules/backend.md",
        "docs/acceptance/orchestrated-execution.md"
      ],
      "acceptance_criteria": [
        "Документы описывают текущий результат, существенное из выпущенных рабочих спецификаций перенесено в контракты модулей; история остаётся в Git."
      ],
      "verification_ids": [],
      "expected_commit_message": "docs: актуализировать документацию проекта",
      "parallel_safe": false,
      "actual_files": [
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/orchestrated-execution.md",
        "docs/modules/desktop.md",
        "docs/modules/backend.md",
        "docs/acceptance/orchestrated-execution.md",
        "docs/planning/orchestrated-executor-fixes.md"
      ]
    },
    {
      "id": "T026",
      "title": "Собрать выпуск 0.4.2 трёх ОС",
      "why": "Полный комплект после DOCS из одного sourceCommit.",
      "dependencies": [
        "T025",
        "DOCS-5"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/orchestrated-executor-fixes.md"
      ],
      "verification_ids": [
        "three-platform-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "Один штатный цикл macOS arm64, Windows x64, Linux x64 из одного sourceCommit после DOCS; manifest совпадает в staging, Downloads и корне"
      ],
      "expected_commit_message": "release: Собрать выпуск 0.4.2 трёх ОС",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T026",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "release-manifest.json"
      ]
    },
    {
      "id": "T027",
      "title": "Установить 0.4.2 в Applications",
      "why": "Обновить установленное приложение штатным installer.",
      "dependencies": [
        "T026",
        "DOCS-5"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/orchestrated-executor-fixes.md"
      ],
      "verification_ids": [
        "release-installed"
      ],
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Установка готового комплекта без пересборки и без перезапуска backend; при работающей службе — pending-копия и инструкция пользователю"
      ],
      "expected_commit_message": "release: Установить 0.4.2 в Applications",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T027",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": []
    },
    {
      "id": "T028",
      "title": "Опубликовать GitHub Release 0.4.2",
      "why": "Опубликовать проверенный комплект.",
      "dependencies": [
        "T027",
        "DOCS-5"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/orchestrated-executor-fixes.md"
      ],
      "verification_ids": [
        "github-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "Тег v0.4.2 на sourceCommit, assets сверены по размеру и digest, remote main совпадает с local HEAD"
      ],
      "expected_commit_message": "release: Опубликовать GitHub Release 0.4.2",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T028",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": []
    },
    {
      "id": "T030",
      "title": "Архив и удаление проекта с активным планом",
      "why": "Живая приёмка 0.4.2: проект с застрявшим планом оркестратора нельзя было ни архивировать, ни удалить.",
      "dependencies": [],
      "functional_paths": [
        "src/control/sessions/workspace-session.mjs",
        "src/control/workflow/execution-control.mjs",
        "src/control/workflow/coordination.mjs",
        "src/backend/desktop-model.mjs",
        "src/frontend/desktop/preload.cjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "tests/workspace-session.test.mjs",
        "tests/execution-control.test.mjs",
        "tests/sidebar.test.mjs",
        "tests/session-roles.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/orchestrated-archive-recovery.md"
      ],
      "verification_ids": [
        "unit-all",
        "electron-smoke"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Архив проекта с активным планом без подтверждения отвечает PLAN_ACTIVE, после подтверждения выполняется",
        "Подтверждённый архив сразу ставит выполнение плана на паузу; план и назначения Kit не меняются; возврат из архива оставляет паузу",
        "Боковая панель спрашивает подтверждение; отказ ничего не отправляет"
      ],
      "expected_commit_message": "fix: Архив и удаление проекта с активным планом после подтверждения",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T030",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "src/control/sessions/workspace-session.mjs",
        "src/control/workflow/execution-control.mjs",
        "src/control/workflow/coordination.mjs",
        "src/backend/desktop-model.mjs",
        "src/frontend/desktop/preload.cjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "tests/execution-control.test.mjs",
        "tests/session-roles.test.mjs",
        "tests/sidebar.test.mjs",
        "docs/planning/orchestrated-archive-recovery.md"
      ]
    },
    {
      "id": "T031",
      "title": "Исполнитель без отправки перезапускается",
      "why": "Живая приёмка 0.4.2: исполнитель без единой отправки после перезапуска считался неизвестным и вечно держал паузу.",
      "dependencies": [
        "T030"
      ],
      "functional_paths": [
        "src/control/workflow/coordination.mjs",
        "src/control/sessions/workspace-session.mjs",
        "tests/workspace-session.test.mjs",
        "tests/orchestrated-execution.test.mjs",
        "src/control/projects/service.mjs"
      ],
      "documentation_paths": [
        "docs/planning/orchestrated-archive-recovery.md"
      ],
      "verification_ids": [
        "unit-all"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Исполнитель без адреса чата, начатой отправки и ручного старта при восстановлении открывается заново в Chat с новым черновиком и получает задачу по кнопке плана",
        "Исполнитель с адресом чата или начатой отправкой автоматически не переотправляется"
      ],
      "expected_commit_message": "fix: Исполнитель без отправки перезапускается в Chat",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T031",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "src/control/workflow/coordination.mjs",
        "src/control/sessions/workspace-session.mjs",
        "src/control/projects/service.mjs",
        "tests/workspace-session.test.mjs"
      ]
    },
    {
      "id": "T032",
      "title": "Подготовить версию 0.4.3",
      "why": "Номер исправляющего выпуска.",
      "dependencies": [
        "T031"
      ],
      "functional_paths": [
        "package.json",
        "package-lock.json",
        "src/frontend/plugin/index.html",
        "src/frontend/plugin/app.mjs",
        "tests/backend-upgrade.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/orchestrated-archive-recovery.md"
      ],
      "verification_ids": [
        "release-tooling",
        "unit-all"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Версия 0.4.3 согласована в package/lock и панели плагина"
      ],
      "expected_commit_message": "feat: Подготовить версию 0.4.3",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T032",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "package.json",
        "package-lock.json",
        "src/frontend/plugin/index.html",
        "src/frontend/plugin/app.mjs",
        "tests/backend-upgrade.test.mjs"
      ]
    },
    {
      "id": "DOCS-6",
      "title": "Актуализация всех документов проекта",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "DOCS-6",
        "role": "implementation",
        "iteration": 6
      },
      "why": "Перед выпуском сверить README, OVERVIEW и действующие контракты модулей с результатом; обновить устаревшее.",
      "dependencies": [
        "T030",
        "T031",
        "T032"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/architecture/OVERVIEW.md",
        "docs/planning/orchestrated-archive-recovery.md"
      ],
      "acceptance_criteria": [
        "Документы описывают текущий результат, существенное из выпущенных рабочих спецификаций перенесено в контракты модулей; история остаётся в Git."
      ],
      "verification_ids": [],
      "expected_commit_message": "docs: актуализировать документацию проекта",
      "parallel_safe": false,
      "actual_files": []
    },
    {
      "id": "T033",
      "title": "Собрать выпуск 0.4.3 трёх ОС",
      "why": "Полный комплект после DOCS из одного sourceCommit.",
      "dependencies": [
        "T032",
        "DOCS-6"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/orchestrated-archive-recovery.md"
      ],
      "verification_ids": [
        "three-platform-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "Один штатный цикл macOS arm64, Windows x64, Linux x64 из одного sourceCommit после DOCS; manifest совпадает в staging, Downloads и корне"
      ],
      "expected_commit_message": "release: Собрать выпуск 0.4.3 трёх ОС",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T033",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "release-manifest.json"
      ]
    },
    {
      "id": "T034",
      "title": "Установить 0.4.3 в Applications",
      "why": "Обновить установленное приложение штатным installer.",
      "dependencies": [
        "T033",
        "DOCS-6"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/orchestrated-archive-recovery.md"
      ],
      "verification_ids": [
        "release-installed"
      ],
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Установка готового комплекта без пересборки и без перезапуска backend; при работающей службе — pending-копия и инструкция пользователю"
      ],
      "expected_commit_message": "release: Установить 0.4.3 в Applications",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T034",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": []
    },
    {
      "id": "T035",
      "title": "Опубликовать GitHub Release 0.4.3",
      "why": "Опубликовать проверенный комплект.",
      "dependencies": [
        "T034",
        "DOCS-6"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/orchestrated-archive-recovery.md"
      ],
      "verification_ids": [
        "github-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "Тег v0.4.3 на sourceCommit, assets сверены по размеру и digest, remote main совпадает с local HEAD"
      ],
      "expected_commit_message": "release: Опубликовать GitHub Release 0.4.3",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T035",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": []
    },
    {
      "id": "T036",
      "title": "Одна кнопка выполнения плана вместо AutoPlan",
      "why": "Решение пользователя: AutoPlan как отдельной функции и кнопки нет; у любого плана одна кнопка запуска, паузы и продолжения.",
      "dependencies": [],
      "functional_paths": [
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/auto-plan.mjs",
        "src/control/workflow/parallel-execution.mjs",
        "src/backend/desktop-model.mjs",
        "src/backend/operations.mjs",
        "src/contracts/desktop.mjs",
        "src/frontend/desktop/preload.cjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/frontend/desktop/ui/index.html",
        "tests/sidebar.test.mjs",
        "tests/execution-control.test.mjs",
        "tests/electron-smoke.mjs",
        "tests/parallel-execution-smoke-fixture.cjs",
        "tests/parallel-execution-ui.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/single-plan-button.md"
      ],
      "verification_ids": [
        "unit-all",
        "electron-smoke"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Переключателя и канала AutoPlan нет в интерфейсе, preload и DESKTOP_CHANNELS",
        "Одна кнопка у любого активного плана; без плана, во время планирования и после выполнения её нет",
        "Прежний план запускается, ставится на паузу и продолжается той же кнопкой; план оркестратора — без изменений",
        "Тексты состояний не упоминают автовыполнение"
      ],
      "expected_commit_message": "feat: Одна кнопка выполнения плана вместо AutoPlan",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T036",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "src/backend/desktop-model.mjs",
        "src/backend/operations.mjs",
        "src/contracts/desktop.mjs",
        "src/control/workflow/auto-plan.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/parallel-execution.mjs",
        "src/frontend/desktop/preload.cjs",
        "src/frontend/desktop/ui/index.html",
        "src/frontend/desktop/ui/sidebar.mjs",
        "tests/electron-smoke.mjs",
        "tests/execution-control.test.mjs",
        "tests/parallel-execution-smoke-fixture.cjs",
        "tests/parallel-execution-ui.test.mjs",
        "tests/sidebar.test.mjs",
        "docs/planning/single-plan-button.md"
      ]
    },
    {
      "id": "T041",
      "title": "Архив проекта из списка без выбора",
      "why": "Живая приёмка 0.4.3: запись проекта с очищенной папкой нельзя было убрать — архив доступен только у выбранного проекта, а выбрать его нельзя.",
      "dependencies": [
        "T036"
      ],
      "functional_paths": [
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/frontend/desktop/ui/index.html",
        "tests/sidebar.test.mjs",
        "tests/workspace-session.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "electron-smoke"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "В списке проектов у каждой записи есть «Перенести в архив» без выбора проекта и чтения папки",
        "Проект с активным планом архивируется из списка только после подтверждения",
        "Запись проекта с отсутствующей или очищенной папкой архивируется и убирается из списка"
      ],
      "expected_commit_message": "fix: Архив проекта из списка без выбора",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T041",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/frontend/desktop/ui/index.html",
        "tests/sidebar.test.mjs",
        "tests/workspace-session.test.mjs"
      ]
    },
    {
      "id": "T037",
      "title": "Подготовить версию 0.4.4",
      "why": "Номер выпуска.",
      "dependencies": [
        "T036",
        "T041"
      ],
      "functional_paths": [
        "package.json",
        "package-lock.json",
        "src/frontend/plugin/index.html",
        "src/frontend/plugin/app.mjs",
        "tests/backend-upgrade.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/single-plan-button.md"
      ],
      "verification_ids": [
        "release-tooling",
        "unit-all"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Версия 0.4.4 согласована в package/lock и панели плагина"
      ],
      "expected_commit_message": "feat: Подготовить версию 0.4.4",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T037",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "package.json",
        "package-lock.json",
        "src/frontend/plugin/index.html",
        "src/frontend/plugin/app.mjs",
        "tests/backend-upgrade.test.mjs"
      ]
    },
    {
      "id": "DOCS-7",
      "title": "Актуализация всех документов проекта",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "DOCS-7",
        "role": "implementation",
        "iteration": 7
      },
      "why": "Перед выпуском сверить README, OVERVIEW и действующие контракты модулей с результатом; обновить устаревшее.",
      "dependencies": [
        "T036",
        "T041",
        "T037"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/architecture/OVERVIEW.md",
        "docs/planning/single-plan-button.md",
        "README.md",
        "AGENTS.md",
        "docs/modules/orchestrated-execution.md",
        "docs/modules/workflow-execution.md",
        "docs/modules/desktop.md",
        "docs/modules/project-lifecycle.md",
        "docs/acceptance/backend-independence.md",
        "docs/acceptance/orchestrated-execution.md"
      ],
      "acceptance_criteria": [
        "Документы описывают текущий результат, существенное из выпущенных рабочих спецификаций перенесено в контракты модулей; история остаётся в Git."
      ],
      "verification_ids": [],
      "expected_commit_message": "docs: актуализировать документацию проекта",
      "parallel_safe": false,
      "actual_files": [
        "README.md",
        "AGENTS.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/orchestrated-execution.md",
        "docs/modules/workflow-execution.md",
        "docs/modules/desktop.md",
        "docs/modules/project-lifecycle.md",
        "docs/acceptance/backend-independence.md",
        "docs/acceptance/orchestrated-execution.md",
        "docs/planning/single-plan-button.md"
      ]
    },
    {
      "id": "T038",
      "title": "Собрать выпуск 0.4.4 трёх ОС",
      "why": "Полный комплект после DOCS из одного sourceCommit.",
      "dependencies": [
        "T037",
        "DOCS-7"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/single-plan-button.md"
      ],
      "verification_ids": [
        "three-platform-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "Один штатный цикл macOS arm64, Windows x64, Linux x64 из одного sourceCommit после DOCS; manifest совпадает в staging, Downloads и корне"
      ],
      "expected_commit_message": "release: Собрать выпуск 0.4.4 трёх ОС",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T038",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "release-manifest.json"
      ]
    },
    {
      "id": "T039",
      "title": "Установить 0.4.4 в Applications",
      "why": "Обновить установленное приложение штатным installer.",
      "dependencies": [
        "T038",
        "DOCS-7"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/single-plan-button.md"
      ],
      "verification_ids": [
        "release-installed"
      ],
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Установка готового комплекта без пересборки и без перезапуска backend; при работающей службе — pending-копия и инструкция пользователю"
      ],
      "expected_commit_message": "release: Установить 0.4.4 в Applications",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T039",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": []
    },
    {
      "id": "T040",
      "title": "Опубликовать GitHub Release 0.4.4",
      "why": "Опубликовать проверенный комплект.",
      "dependencies": [
        "T039",
        "DOCS-7"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/single-plan-button.md"
      ],
      "verification_ids": [
        "github-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "Тег v0.4.4 на sourceCommit, assets сверены по размеру и digest, remote main совпадает с local HEAD"
      ],
      "expected_commit_message": "release: Опубликовать GitHub Release 0.4.4",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T040",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": []
    },
    {
      "id": "T042",
      "title": "Старт службы не зависит от битого проекта",
      "why": "Приёмка 0.4.4: битый worktree останавливал старт.",
      "dependencies": [],
      "functional_paths": [
        "src/backend/bootstrap.mjs",
        "tests/backend-bootstrap.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/startup-orphan-records.md"
      ],
      "verification_ids": [
        "unit-all"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Проект, чьё состояние транзакции Kit нельзя прочитать (нет папки, битый git), пропускается при проверке старта",
        "Незавершённая транзакция Kit по-прежнему останавливает старт"
      ],
      "expected_commit_message": "fix: Старт службы не зависит от битого проекта",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T042",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "src/backend/bootstrap.mjs",
        "tests/backend-bootstrap.test.mjs",
        "docs/planning/startup-orphan-records.md"
      ]
    },
    {
      "id": "T043",
      "title": "Удаление проекта убирает записи его исполнителей",
      "why": "Записи исполнителей оставались.",
      "dependencies": [
        "T042"
      ],
      "functional_paths": [
        "src/control/sessions/workspace-session.mjs",
        "tests/workspace-session.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/startup-orphan-records.md"
      ],
      "verification_ids": [
        "unit-all"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Убрать из списка и удаление убирают записи всех исполнителей проекта; соседи не затронуты"
      ],
      "expected_commit_message": "fix: Удаление проекта убирает записи его исполнителей",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T043",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "src/control/sessions/workspace-session.mjs",
        "tests/workspace-session.test.mjs",
        "docs/planning/startup-orphan-records.md"
      ]
    },
    {
      "id": "T044",
      "title": "Подготовить версию 0.4.5",
      "why": "Номер выпуска.",
      "dependencies": [
        "T043"
      ],
      "functional_paths": [
        "package.json",
        "package-lock.json",
        "src/frontend/plugin/index.html",
        "src/frontend/plugin/app.mjs",
        "tests/backend-upgrade.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/startup-orphan-records.md"
      ],
      "verification_ids": [
        "release-tooling",
        "unit-all"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Версия 0.4.5 в package/lock и панели плагина"
      ],
      "expected_commit_message": "feat: Подготовить версию 0.4.5",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T044",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "package.json",
        "package-lock.json",
        "src/frontend/plugin/index.html",
        "src/frontend/plugin/app.mjs",
        "tests/backend-upgrade.test.mjs"
      ]
    },
    {
      "id": "DOCS-8",
      "title": "Актуализация всех документов проекта",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "DOCS-8",
        "role": "implementation",
        "iteration": 8
      },
      "why": "Перед выпуском сверить README, OVERVIEW и действующие контракты модулей с результатом; обновить устаревшее.",
      "dependencies": [
        "T042",
        "T043",
        "T044"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/architecture/OVERVIEW.md",
        "docs/planning/startup-orphan-records.md",
        "README.md",
        "docs/modules/backend.md",
        "docs/modules/project-lifecycle.md"
      ],
      "acceptance_criteria": [
        "Документы описывают текущий результат, существенное из выпущенных рабочих спецификаций перенесено в контракты модулей; история остаётся в Git."
      ],
      "verification_ids": [],
      "expected_commit_message": "docs: актуализировать документацию проекта",
      "parallel_safe": false,
      "actual_files": [
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/backend.md",
        "docs/modules/project-lifecycle.md",
        "docs/planning/startup-orphan-records.md"
      ]
    },
    {
      "id": "T045",
      "title": "Собрать выпуск 0.4.5 трёх ОС",
      "why": "Комплект после DOCS.",
      "dependencies": [
        "T044",
        "DOCS-8"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/startup-orphan-records.md"
      ],
      "verification_ids": [
        "three-platform-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "Три ОС из одного sourceCommit после DOCS; manifest совпадает"
      ],
      "expected_commit_message": "release: Собрать выпуск 0.4.5 трёх ОС",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T045",
        "role": "implementation"
      },
      "parallel_safe": false
    },
    {
      "id": "T046",
      "title": "Установить 0.4.5 в Applications",
      "why": "Обновить приложение.",
      "dependencies": [
        "T045",
        "DOCS-8"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/startup-orphan-records.md"
      ],
      "verification_ids": [
        "release-installed"
      ],
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Установка готового комплекта без пересборки; при работающей службе — pending"
      ],
      "expected_commit_message": "release: Установить 0.4.5 в Applications",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T046",
        "role": "implementation"
      },
      "parallel_safe": false
    },
    {
      "id": "T047",
      "title": "Опубликовать GitHub Release 0.4.5",
      "why": "Опубликовать комплект.",
      "dependencies": [
        "T046",
        "DOCS-8"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/startup-orphan-records.md"
      ],
      "verification_ids": [
        "github-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "Тег v0.4.5 на sourceCommit, assets сверены, remote main = HEAD"
      ],
      "expected_commit_message": "release: Опубликовать GitHub Release 0.4.5",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-orchestrated-execution",
        "task_id": "T047",
        "role": "implementation"
      },
      "parallel_safe": false
    }
  ],
  "blocked_reason": null,
  "user_decisions": [
    {
      "id": "78121853-4ef7-4bf1-8478-36ca445516a8",
      "text": "Пользователь 16.10.2026 поручил реализовать оркестрацию выполнения по согласованной в диалоге спецификации; решения пользователя: все обычные задачи в worktree, delivery-хвост и итоговая очистка — оркестратор, удаление worktree после каждого проверенного слияния. Спецификацию и план проверил субагент Fable 5.1, затем Review Kit (ON). Версия выпуска 0.4.0.",
      "recorded_at": "2026-10-16T15:59:33.235Z"
    }
  ],
  "parallel_allowed": false,
  "max_workers": 1,
  "execution_strategy": "sequential",
  "execution_reason": "Этап сам вводит оркестрованное выполнение, поэтому выполняется прежним последовательным циклом Kit в main одним агентом; задачи опираются на контракты предыдущих (Kit → Control → Frontend), модельные исполнители без поручения запрещены AGENTS."
}
```
<!-- workflow-state:end -->

## Состояние

Execution Scope Status: ACTIVE
Delivery Status: IN_PROGRESS
Scope: workflow-pilot-orchestrated-execution
Current Task: нет
Revision: 359

## Цель

Оркестрованное выполнение плана 0.4.0: сессия без плана — оркестратор; одна кнопка запуска/паузы; обычные задачи и DOCS — исполнителями в worktree (последовательные после барьера, параллельные до max_workers), delivery-хвост и итоговая очистка — оркестратором в main; дерево проекта по планам.

## Критерии приёмки

- R01 Новая сессия проекта без активного плана — оркестратор, при активном плане — чат обсуждения; роль назначает приложение, оркестратор плана подтверждается по execution_origin_session_id
- R02 Kit принимает orchestrated-план с метками parallel_safe, всегда добавляет DOCS и проверяет delivery-хвост по delivery_tail при release: true
- R03 Все обычные задачи и DOCS выполняются отдельными исполнителями в worktree с проверенной интеграцией; последовательная — одна после барьера; delivery-хвост выполняет оркестратор в main после всех остальных задач; worktree и ветка удаляются после проверенного слияния, итоговую очистку выполняет оркестратор
- R04 Исполнитель получает служебную часть Kit, задачу и её context_pack; оркестратор и чат обсуждения — полный recovery с блоком роли; .workflow-temp/ вне Git и recovery
- R05 Одна кнопка в шапке плана: «Начать выполнение плана» → «Пауза» → «Продолжить»; пауза останавливает только новые выдачи; состояние переживает перезапуск backend без повторного Send; работает с iPad при праве управления
- R06 Сбой: исполнитель → task:block → оркестратор (интеграция, assignment:message, plan:extend) → plan:escalate и автопауза; UNKNOWN — сразу автопауза без повторов
- R07 Дерево: оркестраторы и чаты обсуждения, микрозадачи под оркестратором; клик по начатой задаче — сессия исполнителя, по не начатой — карточка; «Выполнено» сохраняется после archive; оркестратор активного плана нельзя архивировать
- R08 Выпуск трёх ОС упаковывает платформы параллельно внутри release-all из одного sourceCommit с одним manifest
- R09 Legacy sequential/parallel-планы и донорские проекты работают по прежним правилам; Kit 1.7.x обновляется до 1.8.0 с активным планом
- R10 DOCS, выпуск трёх ОС, установка в Applications и GitHub Release по обычному порядку; живую приёмку выполняет пользователь

## Микрозадачи

Выполнение: sequential; разрешено: false; лимит: 1
Причина: Этап сам вводит оркестрованное выполнение, поэтому выполняется прежним последовательным циклом Kit в main одним агентом; задачи опираются на контракты предыдущих (Kit → Control → Frontend), модельные исполнители без поручения запрещены AGENTS.

- [DONE] T001: Kit: orchestrated-план, обязательная DOCS и хвост — Завершено
  - Git Commit: [DONE] feat: Kit принимает orchestrated-план с обязательной DOCS
  - Reference: workflow-pilot-orchestrated-execution / T001 / implementation
  - Файлы: packages/workflow-kit/src/lib/plan.mjs, packages/workflow-kit/src/lib/validate.mjs, packages/workflow-kit/src/lib/validation-rules.mjs, packages/workflow-kit/src/lib/extend-plan.mjs, packages/workflow-kit/src/lib/actions.mjs, packages/workflow-kit/src/lib/simple-workflow.mjs, packages/workflow-kit/src/lib/task-update.mjs, packages/workflow-kit/src/lib/plan-review.mjs, packages/workflow-kit/src/lib/command-help.mjs, packages/workflow-kit/src/schemas/plan.schema.json, packages/workflow-kit/src/schemas/workflow.schema.json, packages/workflow-kit/scripts/check-parallel-plan-fixture.mjs, packages/workflow-kit/scripts/check-runtime-fixture.mjs, packages/workflow-kit/scripts/check-plan-review-fixture.mjs, packages/workflow-kit/src/WORKFLOW.md, packages/workflow-kit/src/templates/PLAN.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] T002: Kit: main только для delivery, барьер, сигналы и очистка worktree — Завершено
  - Git Commit: [DONE] feat: Kit ограничивает main delivery-задачами и чистит worktree
  - Reference: workflow-pilot-orchestrated-execution / T002 / implementation
  - Файлы: packages/workflow-kit/src/lib/task-assignment.mjs, packages/workflow-kit/src/lib/assignment-contract.mjs, packages/workflow-kit/src/lib/task-integration.mjs, packages/workflow-kit/src/lib/signals.mjs, packages/workflow-kit/src/lib/actions.mjs, packages/workflow-kit/src/cli.mjs, packages/workflow-kit/src/lib/command-help.mjs, packages/workflow-kit/scripts/check-orchestrated-execution-fixture.mjs, packages/workflow-kit/package.json, packages/workflow-kit/src/lib/integration-proof.mjs, packages/workflow-kit/src/lib/plan.mjs, packages/workflow-kit/src/schemas/plan.schema.json, packages/workflow-kit/scripts/check-parallel-plan-fixture.mjs, packages/workflow-kit/src/lib/transaction-state.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: T001
- [DONE] T003: Kit: recovery по ролям и версия 1.8.0 — Завершено
  - Git Commit: [DONE] feat: Kit 1.8.0 с recovery по ролям
  - Reference: workflow-pilot-orchestrated-execution / T003 / implementation
  - Файлы: packages/workflow-kit/src/lib/recovery.mjs, packages/workflow-kit/src/lib/installer.mjs, packages/workflow-kit/src/lib/installation-files.mjs, packages/workflow-kit/package.json, packages/workflow-kit/scripts/check-project-recovery-fixture.mjs, packages/workflow-kit/scripts/check-previous-upgrade-fixture.mjs, packages/workflow-kit/scripts/check-package.mjs, tests/workflow-kit-recovery.test.mjs, tests/workflow-kit-upgrade.test.mjs, tests/workflow-kit-source.test.mjs, tests/migration-compatibility.test.mjs, package-lock.json, packages/workflow-kit/scripts/check-orchestrated-execution-fixture.mjs, packages/workflow-kit/src/cli.mjs, packages/workflow-kit/src/lib/actions.mjs, packages/workflow-kit/src/lib/command-help.mjs, packages/workflow-kit/src/lib/common.mjs, packages/workflow-kit/src/lib/transaction-state.mjs, packages/workflow-kit/docs/modules/orchestrated-plans.md, packages/workflow-kit/docs/modules/workflow-kit-package.md, packages/workflow-kit/docs/modules/parallel-assignments.md, packages/workflow-kit/README.md, packages/workflow-kit/src/templates/AGENTS.md, packages/workflow-kit/src/templates/PROTOTYPE.md, packages/workflow-kit/src/WORKFLOW.md
  - Параллельность: исключительное выполнение
  - Зависимости: T002
- [DONE] T004: Control: роли сессий и хранилище — Завершено
  - Git Commit: [DONE] feat: Control назначает роли сессий
  - Reference: workflow-pilot-orchestrated-execution / T004 / implementation
  - Файлы: src/control/sessions/workspace-session.mjs, src/control/sessions/session-plans.mjs, src/control/projects/service.mjs, src/control/context/service.mjs, src/control/context/context-cache.mjs, src/control/context/context-session.mjs, src/control/facade.mjs, tests/session-roles.test.mjs, tests/workspace-session.test.mjs, tests/session-plans.test.mjs, tests/context-session.test.mjs, tests/control-facade.test.mjs, src/control/projects/workspace-deletion.mjs, src/control/workflow/coordination.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: T003
- [DONE] T005: Control: состояние кнопки выполнения — Завершено
  - Git Commit: [DONE] feat: Control хранит запуск и паузу плана
  - Reference: workflow-pilot-orchestrated-execution / T005 / implementation
  - Файлы: src/control/workflow/execution-control.mjs, src/control/workflow/project-auto-plan.mjs, src/control/workflow/coordination.mjs, src/control/facade.mjs, src/contracts/desktop.mjs, src/backend/desktop-model.mjs, src/frontend/desktop/preload.cjs, src/frontend/desktop/ipc.mjs, tests/execution-control.test.mjs, tests/project-auto-plan.test.mjs, tests/backend-desktop-model.test.mjs, tests/desktop-boundaries.test.mjs, src/control/workflow/auto-plan-state.mjs, src/control/workflow/project-session-auto-plan.mjs, src/control/projects/workspace-deletion.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: T004
- [DONE] T006: Control: волны, delivery-фаза и очистка — Завершено
  - Git Commit: [DONE] feat: Control ведёт план оркестратора до очистки
  - Reference: workflow-pilot-orchestrated-execution / T006 / implementation
  - Файлы: src/control/workflow/parallel-execution.mjs, src/control/workflow/parallel-kit.mjs, src/control/workflow/executor-session.mjs, src/control/workflow/coordination.mjs, src/control/workflow/execution-projection.mjs, tests/parallel-execution.test.mjs, tests/parallel-execution-recovery.test.mjs, tests/parallel-finalization.test.mjs, src/control/workflow/execution-control.mjs, tests/execution-control.test.mjs, src/backend/desktop-model.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: T005
- [DONE] T007: Control: сигналы и эскалация сбоев — Завершено
  - Git Commit: [DONE] feat: Control передаёт сбои оркестратору
  - Reference: workflow-pilot-orchestrated-execution / T007 / implementation
  - Файлы: src/control/workflow/plan-monitor.mjs, src/control/workflow/parallel-execution.mjs, src/control/workflow/parallel-kit.mjs, src/control/workflow/coordination.mjs, src/control/workflow/execution-control.mjs, tests/plan-monitor.test.mjs, tests/parallel-execution.test.mjs, tests/execution-control.test.mjs, src/execution/files/project-input-watch.mjs, src/control/workflow/executor-session.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: T006
- [DONE] T008: Дерево планов и кнопка выполнения в интерфейсе — Завершено
  - Git Commit: [DONE] feat: Дерево планов и кнопка выполнения
  - Reference: workflow-pilot-orchestrated-execution / T008 / implementation
  - Файлы: src/frontend/desktop/ui/sidebar.mjs, src/frontend/desktop/ui/index.html, src/frontend/desktop/ui/progress.mjs, src/contracts/workflow-view.mjs, src/backend/desktop-model.mjs, tests/sidebar.test.mjs, tests/parallel-execution-ui.test.mjs, tests/electron-smoke.mjs, tests/web-client.test.mjs, src/frontend/desktop/ui/archive.mjs, src/frontend/desktop/ui/settings-panel.mjs, src/control/context/context-cache.mjs, src/control/context/service.mjs, src/control/facade.mjs, src/control/sessions/workspace-session.mjs, src/control/workflow/execution-projection.mjs, tests/parallel-execution.test.mjs, tests/session-roles.test.mjs, docs/planning/orchestrated-execution-contracts.md, docs/planning/orchestrated-execution-next.md
  - Параллельность: исключительное выполнение
  - Зависимости: T007
- [DONE] T009: Параллельная упаковка платформ в release-all — Завершено
  - Git Commit: [DONE] feat: Параллельная упаковка платформ выпуска
  - Reference: workflow-pilot-orchestrated-execution / T009 / implementation
  - Файлы: scripts/release-all.mjs, package.json, tests/release-all.test.mjs, tests/release-linux.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] T010: Проверить общий результат оркестрации — Завершено
  - Git Commit: [DONE] test: Проверить общий результат оркестрации
  - Reference: workflow-pilot-orchestrated-execution / T010 / implementation
  - Файлы: tests/orchestrated-execution.test.mjs, packages/workflow-kit/scripts/check-parallel-plan-fixture.mjs, packages/workflow-kit/src/lib/actions.mjs, docs/planning/orchestrated-execution-next.md, docs/planning/orchestrated-execution-contracts.md
  - Параллельность: исключительное выполнение
  - Зависимости: T008, T009
- [DONE] T011: Подготовить версию 0.4.0 — Завершено
  - Git Commit: [DONE] feat: Подготовить версию 0.4.0
  - Reference: workflow-pilot-orchestrated-execution / T011 / implementation
  - Файлы: package.json, package-lock.json, src/frontend/plugin/index.html, src/frontend/plugin/app.mjs, tests/backend-upgrade.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: T010
- [DONE] DOCS: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: актуализировать документацию проекта
  - Reference: workflow-pilot-orchestrated-execution / DOCS / implementation
  - Файлы: README.md, AGENTS.md, docs/architecture/OVERVIEW.md, docs/modules/workflow-execution.md, docs/modules/control.md, docs/modules/desktop.md, docs/modules/release.md, docs/modules/project-compatibility.md, docs/modules/remote-access.md, docs/planning/backend-independence-followup.md, docs/planning/orchestrated-execution-next.md, docs/planning/orchestrated-execution-contracts.md, docs/acceptance/orchestrated-execution.md, packages/workflow-kit/README.md, packages/workflow-kit/docs/modules/workflow-kit-package.md, packages/workflow-kit/docs/modules/parallel-assignments.md, packages/workflow-kit/docs/modules/orchestrated-plans.md, packages/workflow-kit/src/WORKFLOW.md, packages/workflow-kit/src/templates/PLAN.md, packages/workflow-kit/src/templates/AGENTS.md, packages/workflow-kit/src/templates/PROTOTYPE.md, docs/modules/orchestrated-execution.md
  - Параллельность: исключительное выполнение
  - Зависимости: T001, T002, T003, T004, T005, T006, T007, T008, T009, T010, T011
- [DONE] T015: Исправить параллельную упаковку и отложенный выпуск — Завершено
  - Git Commit: [DONE] fix: Исправить параллельную упаковку и отложенный выпуск
  - Reference: workflow-pilot-orchestrated-execution / T015 / implementation
  - Файлы: package.json, scripts/release-all.mjs, tests/release-all.test.mjs, packages/workflow-kit/src/lib/actions.mjs, packages/workflow-kit/scripts/check-parallel-plan-fixture.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] DOCS-2: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: актуализировать документацию проекта
  - Reference: workflow-pilot-orchestrated-execution / DOCS-2 / implementation
  - Файлы: docs/architecture/OVERVIEW.md, packages/workflow-kit/docs/modules/orchestrated-plans.md, docs/modules/release.md, docs/modules/orchestrated-execution.md
  - Параллельность: исключительное выполнение
  - Зависимости: T015
- [DONE] T016: Временный каталог упаковки через TMPDIR — Завершено
  - Git Commit: [DONE] fix: Временный каталог упаковки через TMPDIR
  - Reference: workflow-pilot-orchestrated-execution / T016 / implementation
  - Файлы: package.json, scripts/release-all.mjs, tests/release-all.test.mjs, tests/release-linux.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] DOCS-3: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: актуализировать документацию проекта
  - Reference: workflow-pilot-orchestrated-execution / DOCS-3 / implementation
  - Файлы: docs/architecture/OVERVIEW.md, docs/modules/release.md
  - Параллельность: исключительное выполнение
  - Зависимости: T016
- [DONE] T012: Собрать выпуск трёх ОС — Завершено
  - Git Commit: [DONE] release: Собрать выпуск 0.4.0 трёх ОС
  - Reference: workflow-pilot-orchestrated-execution / T012 / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: T011, DOCS, DOCS-2, DOCS-3
- [DONE] T013: Установить выпуск в Applications — Завершено
  - Git Commit: [DONE] release: Установить 0.4.0 в Applications
  - Reference: workflow-pilot-orchestrated-execution / T013 / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: T012, DOCS, DOCS-2, DOCS-3
- [DONE] T014: Опубликовать GitHub Release — Завершено
  - Git Commit: [DONE] release: Опубликовать GitHub Release 0.4.0
  - Reference: workflow-pilot-orchestrated-execution / T014 / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: T013, DOCS, DOCS-2, DOCS-3
- [DONE] T017: Исправить вставку и добавить контекстное меню — Завершено
  - Git Commit: [DONE] fix: Вставка и контекстное меню в отдельном клиенте
  - Reference: workflow-pilot-orchestrated-execution / T017 / implementation
  - Файлы: src/frontend/desktop/client.mjs, src/frontend/desktop/ui/browser-view.mjs, src/frontend/desktop/browser-view-preload.cjs, tests/desktop-client.test.mjs, docs/planning/client-clipboard-drop.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] T018: Перетаскивание файлов и вставка картинок — Завершено
  - Git Commit: [DONE] feat: Перетаскивание файлов и вставка картинок в клиенте
  - Reference: workflow-pilot-orchestrated-execution / T018 / implementation
  - Файлы: src/execution/browser/presentation/host.mjs, src/execution/browser/presentation/transport.mjs, src/frontend/client/browser-view.mjs, src/frontend/desktop/client.mjs, src/frontend/desktop/ui/browser-view.mjs, src/frontend/desktop/browser-view-preload.cjs, tests/browser-presentation.test.mjs, tests/fixtures/backend-browser-page.html, tests/fixtures/backend-browser-probe.mjs, tests/desktop-client.test.mjs, src/backend/lifecycle.mjs, docs/planning/client-clipboard-drop.md
  - Параллельность: исключительное выполнение
  - Зависимости: T017
- [DONE] T019: Подготовить версию 0.4.1 — Завершено
  - Git Commit: [DONE] feat: Подготовить версию 0.4.1
  - Reference: workflow-pilot-orchestrated-execution / T019 / implementation
  - Файлы: package.json, package-lock.json, src/frontend/plugin/index.html, src/frontend/plugin/app.mjs, tests/backend-upgrade.test.mjs, docs/planning/client-clipboard-drop.md
  - Параллельность: исключительное выполнение
  - Зависимости: T018
- [DONE] DOCS-4: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: актуализировать документацию проекта
  - Reference: workflow-pilot-orchestrated-execution / DOCS-4 / implementation
  - Файлы: docs/architecture/OVERVIEW.md, docs/planning/client-clipboard-drop.md, README.md, docs/modules/browser.md, docs/modules/desktop.md
  - Параллельность: исключительное выполнение
  - Зависимости: T017, T018, T019
- [DONE] T020: Собрать выпуск 0.4.1 трёх ОС — Завершено
  - Git Commit: [DONE] release: Собрать выпуск 0.4.1 трёх ОС
  - Reference: workflow-pilot-orchestrated-execution / T020 / implementation
  - Файлы: release-manifest.json, docs/planning/client-clipboard-drop.md
  - Параллельность: исключительное выполнение
  - Зависимости: T019, DOCS-4
- [DONE] T021: Установить 0.4.1 в Applications — Завершено
  - Git Commit: [DONE] release: Установить 0.4.1 в Applications
  - Reference: workflow-pilot-orchestrated-execution / T021 / implementation
  - Файлы: release-manifest.json, docs/planning/client-clipboard-drop.md
  - Параллельность: исключительное выполнение
  - Зависимости: T020, DOCS-4
- [DONE] T022: Опубликовать GitHub Release 0.4.1 — Завершено
  - Git Commit: [DONE] release: Опубликовать GitHub Release 0.4.1
  - Reference: workflow-pilot-orchestrated-execution / T022 / implementation
  - Файлы: release-manifest.json, docs/planning/client-clipboard-drop.md
  - Параллельность: исключительное выполнение
  - Зависимости: T021, DOCS-4
- [DONE] T023: Исполнитель запускается кнопкой плана и в режиме Chat — Завершено
  - Git Commit: [DONE] fix: Исполнитель плана оркестратора запускается кнопкой плана в режиме Chat
  - Reference: workflow-pilot-orchestrated-execution / T023 / implementation
  - Файлы: src/backend/desktop-model.mjs, src/backend/bootstrap.mjs, src/control/workflow/coordination.mjs, src/control/facade.mjs, src/control/sessions/workspace-session.mjs, tests/session-roles.test.mjs, tests/orchestrated-execution.test.mjs, tests/workspace-session.test.mjs, tests/execution-control.test.mjs, docs/planning/orchestrated-executor-fixes.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] T024: Выбор сессий и восстановление окна после разрыва потока — Завершено
  - Git Commit: [DONE] fix: Выбор сессий и восстановление окна после разрыва потока
  - Reference: workflow-pilot-orchestrated-execution / T024 / implementation
  - Файлы: src/frontend/client/connection.mjs, src/frontend/desktop/client.mjs, src/frontend/desktop/ui/sidebar.mjs, tests/backend-connection.test.mjs, tests/sidebar.test.mjs, tests/desktop-client.test.mjs, src/backend/desktop-model.mjs, docs/planning/orchestrated-executor-fixes.md
  - Параллельность: исключительное выполнение
  - Зависимости: T023
- [DONE] T029: Остановка службы не ждёт неотправленную подготовку контекста — Завершено
  - Git Commit: [DONE] fix: Остановка службы не ждёт неотправленную подготовку контекста
  - Reference: workflow-pilot-orchestrated-execution / T029 / implementation
  - Файлы: src/backend/desktop-model.mjs, src/backend/main.mjs, tests/backend-shutdown.test.mjs, src/backend/shutdown.mjs, docs/planning/orchestrated-executor-fixes.md
  - Параллельность: исключительное выполнение
  - Зависимости: T024
- [DONE] T025: Подготовить версию 0.4.2 — Завершено
  - Git Commit: [DONE] feat: Подготовить версию 0.4.2
  - Reference: workflow-pilot-orchestrated-execution / T025 / implementation
  - Файлы: package.json, package-lock.json, src/frontend/plugin/index.html, src/frontend/plugin/app.mjs, tests/backend-upgrade.test.mjs, docs/planning/orchestrated-executor-fixes.md
  - Параллельность: исключительное выполнение
  - Зависимости: T024, T029
- [DONE] DOCS-5: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: актуализировать документацию проекта
  - Reference: workflow-pilot-orchestrated-execution / DOCS-5 / implementation
  - Файлы: docs/architecture/OVERVIEW.md, docs/planning/orchestrated-executor-fixes.md, README.md, docs/modules/orchestrated-execution.md, docs/modules/desktop.md, docs/modules/backend.md, docs/acceptance/orchestrated-execution.md
  - Параллельность: исключительное выполнение
  - Зависимости: T023, T024, T029, T025
- [DONE] T026: Собрать выпуск 0.4.2 трёх ОС — Завершено
  - Git Commit: [DONE] release: Собрать выпуск 0.4.2 трёх ОС
  - Reference: workflow-pilot-orchestrated-execution / T026 / implementation
  - Файлы: release-manifest.json, docs/planning/orchestrated-executor-fixes.md
  - Параллельность: исключительное выполнение
  - Зависимости: T025, DOCS-5
- [DONE] T027: Установить 0.4.2 в Applications — Завершено
  - Git Commit: [DONE] release: Установить 0.4.2 в Applications
  - Reference: workflow-pilot-orchestrated-execution / T027 / implementation
  - Файлы: release-manifest.json, docs/planning/orchestrated-executor-fixes.md
  - Параллельность: исключительное выполнение
  - Зависимости: T026, DOCS-5
- [DONE] T028: Опубликовать GitHub Release 0.4.2 — Завершено
  - Git Commit: [DONE] release: Опубликовать GitHub Release 0.4.2
  - Reference: workflow-pilot-orchestrated-execution / T028 / implementation
  - Файлы: release-manifest.json, docs/planning/orchestrated-executor-fixes.md
  - Параллельность: исключительное выполнение
  - Зависимости: T027, DOCS-5
- [DONE] T030: Архив и удаление проекта с активным планом — Завершено
  - Git Commit: [DONE] fix: Архив и удаление проекта с активным планом после подтверждения
  - Reference: workflow-pilot-orchestrated-execution / T030 / implementation
  - Файлы: src/control/sessions/workspace-session.mjs, src/control/workflow/execution-control.mjs, src/control/workflow/coordination.mjs, src/backend/desktop-model.mjs, src/frontend/desktop/preload.cjs, src/frontend/desktop/ui/sidebar.mjs, tests/workspace-session.test.mjs, tests/execution-control.test.mjs, tests/sidebar.test.mjs, tests/session-roles.test.mjs, docs/planning/orchestrated-archive-recovery.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] T031: Исполнитель без отправки перезапускается — Завершено
  - Git Commit: [DONE] fix: Исполнитель без отправки перезапускается в Chat
  - Reference: workflow-pilot-orchestrated-execution / T031 / implementation
  - Файлы: src/control/workflow/coordination.mjs, src/control/sessions/workspace-session.mjs, tests/workspace-session.test.mjs, tests/orchestrated-execution.test.mjs, src/control/projects/service.mjs, docs/planning/orchestrated-archive-recovery.md
  - Параллельность: исключительное выполнение
  - Зависимости: T030
- [DONE] T032: Подготовить версию 0.4.3 — Завершено
  - Git Commit: [DONE] feat: Подготовить версию 0.4.3
  - Reference: workflow-pilot-orchestrated-execution / T032 / implementation
  - Файлы: package.json, package-lock.json, src/frontend/plugin/index.html, src/frontend/plugin/app.mjs, tests/backend-upgrade.test.mjs, docs/planning/orchestrated-archive-recovery.md
  - Параллельность: исключительное выполнение
  - Зависимости: T031
- [DONE] DOCS-6: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: актуализировать документацию проекта
  - Reference: workflow-pilot-orchestrated-execution / DOCS-6 / implementation
  - Файлы: docs/architecture/OVERVIEW.md, docs/planning/orchestrated-archive-recovery.md
  - Параллельность: исключительное выполнение
  - Зависимости: T030, T031, T032
- [DONE] T033: Собрать выпуск 0.4.3 трёх ОС — Завершено
  - Git Commit: [DONE] release: Собрать выпуск 0.4.3 трёх ОС
  - Reference: workflow-pilot-orchestrated-execution / T033 / implementation
  - Файлы: release-manifest.json, docs/planning/orchestrated-archive-recovery.md
  - Параллельность: исключительное выполнение
  - Зависимости: T032, DOCS-6
- [DONE] T034: Установить 0.4.3 в Applications — Завершено
  - Git Commit: [DONE] release: Установить 0.4.3 в Applications
  - Reference: workflow-pilot-orchestrated-execution / T034 / implementation
  - Файлы: release-manifest.json, docs/planning/orchestrated-archive-recovery.md
  - Параллельность: исключительное выполнение
  - Зависимости: T033, DOCS-6
- [DONE] T035: Опубликовать GitHub Release 0.4.3 — Завершено
  - Git Commit: [DONE] release: Опубликовать GitHub Release 0.4.3
  - Reference: workflow-pilot-orchestrated-execution / T035 / implementation
  - Файлы: release-manifest.json, docs/planning/orchestrated-archive-recovery.md
  - Параллельность: исключительное выполнение
  - Зависимости: T034, DOCS-6
- [DONE] T036: Одна кнопка выполнения плана вместо AutoPlan — Завершено
  - Git Commit: [DONE] feat: Одна кнопка выполнения плана вместо AutoPlan
  - Reference: workflow-pilot-orchestrated-execution / T036 / implementation
  - Файлы: src/control/workflow/coordination.mjs, src/control/workflow/auto-plan.mjs, src/control/workflow/parallel-execution.mjs, src/backend/desktop-model.mjs, src/backend/operations.mjs, src/contracts/desktop.mjs, src/frontend/desktop/preload.cjs, src/frontend/desktop/ui/sidebar.mjs, src/frontend/desktop/ui/index.html, tests/sidebar.test.mjs, tests/execution-control.test.mjs, tests/electron-smoke.mjs, tests/parallel-execution-smoke-fixture.cjs, tests/parallel-execution-ui.test.mjs, docs/planning/single-plan-button.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] T041: Архив проекта из списка без выбора — Завершено
  - Git Commit: [DONE] fix: Архив проекта из списка без выбора
  - Reference: workflow-pilot-orchestrated-execution / T041 / implementation
  - Файлы: src/frontend/desktop/ui/sidebar.mjs, src/frontend/desktop/ui/index.html, tests/sidebar.test.mjs, tests/workspace-session.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: T036
- [DONE] T037: Подготовить версию 0.4.4 — Завершено
  - Git Commit: [DONE] feat: Подготовить версию 0.4.4
  - Reference: workflow-pilot-orchestrated-execution / T037 / implementation
  - Файлы: package.json, package-lock.json, src/frontend/plugin/index.html, src/frontend/plugin/app.mjs, tests/backend-upgrade.test.mjs, docs/planning/single-plan-button.md
  - Параллельность: исключительное выполнение
  - Зависимости: T036, T041
- [DONE] DOCS-7: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: актуализировать документацию проекта
  - Reference: workflow-pilot-orchestrated-execution / DOCS-7 / implementation
  - Файлы: docs/architecture/OVERVIEW.md, docs/planning/single-plan-button.md, README.md, AGENTS.md, docs/modules/orchestrated-execution.md, docs/modules/workflow-execution.md, docs/modules/desktop.md, docs/modules/project-lifecycle.md, docs/acceptance/backend-independence.md, docs/acceptance/orchestrated-execution.md
  - Параллельность: исключительное выполнение
  - Зависимости: T036, T041, T037
- [DONE] T038: Собрать выпуск 0.4.4 трёх ОС — Завершено
  - Git Commit: [DONE] release: Собрать выпуск 0.4.4 трёх ОС
  - Reference: workflow-pilot-orchestrated-execution / T038 / implementation
  - Файлы: release-manifest.json, docs/planning/single-plan-button.md
  - Параллельность: исключительное выполнение
  - Зависимости: T037, DOCS-7
- [DONE] T039: Установить 0.4.4 в Applications — Завершено
  - Git Commit: [DONE] release: Установить 0.4.4 в Applications
  - Reference: workflow-pilot-orchestrated-execution / T039 / implementation
  - Файлы: release-manifest.json, docs/planning/single-plan-button.md
  - Параллельность: исключительное выполнение
  - Зависимости: T038, DOCS-7
- [DONE] T040: Опубликовать GitHub Release 0.4.4 — Завершено
  - Git Commit: [DONE] release: Опубликовать GitHub Release 0.4.4
  - Reference: workflow-pilot-orchestrated-execution / T040 / implementation
  - Файлы: release-manifest.json, docs/planning/single-plan-button.md
  - Параллельность: исключительное выполнение
  - Зависимости: T039, DOCS-7
- [DONE] T042: Старт службы не зависит от битого проекта — Завершено
  - Git Commit: [DONE] fix: Старт службы не зависит от битого проекта
  - Reference: workflow-pilot-orchestrated-execution / T042 / implementation
  - Файлы: src/backend/bootstrap.mjs, tests/backend-bootstrap.test.mjs, docs/planning/startup-orphan-records.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] T043: Удаление проекта убирает записи его исполнителей — Завершено
  - Git Commit: [DONE] fix: Удаление проекта убирает записи его исполнителей
  - Reference: workflow-pilot-orchestrated-execution / T043 / implementation
  - Файлы: src/control/sessions/workspace-session.mjs, tests/workspace-session.test.mjs, docs/planning/startup-orphan-records.md
  - Параллельность: исключительное выполнение
  - Зависимости: T042
- [DONE] T044: Подготовить версию 0.4.5 — Завершено
  - Git Commit: [DONE] feat: Подготовить версию 0.4.5
  - Reference: workflow-pilot-orchestrated-execution / T044 / implementation
  - Файлы: package.json, package-lock.json, src/frontend/plugin/index.html, src/frontend/plugin/app.mjs, tests/backend-upgrade.test.mjs, docs/planning/startup-orphan-records.md
  - Параллельность: исключительное выполнение
  - Зависимости: T043
- [DONE] DOCS-8: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: актуализировать документацию проекта
  - Reference: workflow-pilot-orchestrated-execution / DOCS-8 / implementation
  - Файлы: docs/architecture/OVERVIEW.md, docs/planning/startup-orphan-records.md, README.md, docs/modules/backend.md, docs/modules/project-lifecycle.md
  - Параллельность: исключительное выполнение
  - Зависимости: T042, T043, T044
- [TODO] T045: Собрать выпуск 0.4.5 трёх ОС — Ожидает
  - Git Commit: [PENDING] release: Собрать выпуск 0.4.5 трёх ОС
  - Reference: workflow-pilot-orchestrated-execution / T045 / implementation
  - Файлы: release-manifest.json, docs/planning/startup-orphan-records.md
  - Параллельность: исключительное выполнение
  - Зависимости: T044, DOCS-8
- [TODO] T046: Установить 0.4.5 в Applications — Ожидает
  - Git Commit: [PENDING] release: Установить 0.4.5 в Applications
  - Reference: workflow-pilot-orchestrated-execution / T046 / implementation
  - Файлы: release-manifest.json, docs/planning/startup-orphan-records.md
  - Параллельность: исключительное выполнение
  - Зависимости: T045, DOCS-8
- [TODO] T047: Опубликовать GitHub Release 0.4.5 — Ожидает
  - Git Commit: [PENDING] release: Опубликовать GitHub Release 0.4.5
  - Reference: workflow-pilot-orchestrated-execution / T047 / implementation
  - Файлы: release-manifest.json, docs/planning/startup-orphan-records.md
  - Параллельность: исключительное выполнение
  - Зависимости: T046, DOCS-8

## Context Pack For This Cycle

- docs/planning/orchestrated-execution-next.md
- docs/planning/orchestrated-execution-contracts.md
- docs/modules/workflow-execution.md
- packages/workflow-kit/docs/modules/parallel-assignments.md
- packages/workflow-kit/docs/modules/workflow-kit-package.md
- docs/modules/desktop.md
- docs/modules/control.md
- docs/architecture/OVERVIEW.md
- docs/planning/client-clipboard-drop.md
- docs/planning/orchestrated-executor-fixes.md
- docs/planning/orchestrated-archive-recovery.md
- docs/planning/single-plan-button.md
- docs/planning/startup-orphan-records.md

Служебные состояния меняются только командами workflow. Приёмка не архивирует scope.
