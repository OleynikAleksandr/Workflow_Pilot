# Активный план — Workflow_Pilot

<!-- workflow-state:begin -->
```json
{
  "schema_version": 1,
  "plan_revision": 966,
  "project_id": "7411e192-943c-4529-bffb-3b081d9c242f",
  "project_name": "Workflow_Pilot",
  "scope_id": "user-choice-plan-modes",
  "execution_scope_status": "ACTIVE",
  "delivery_status": "IN_PROGRESS",
  "objective": "Пользователь делает важные выборы одной кнопкой в карточке панели и окна; план сессии Workflow Pilot выполняется в выбранном пользователем режиме (сам или оркестрация); новые сессии нейтральны до запроса режима; выпуск 0.5.30 для трёх ОС опубликован.",
  "acceptance_criteria": [
    "Карточка выбора появляется по событиям Е1–Е5, решение доходит до агента внутренним каналом, своё сообщение пользователя снимает карточку.",
    "Kit не создаёт план сессии Workflow Pilot без выбора режима пользователем; оба режима выполняются.",
    "Новые сессии подписаны «Обсуждение» до запроса режима; захват по первой реплике удалён при Kit 1.9.8.",
    "Выпуск 0.5.30 трёх ОС собран, установлен и опубликован; живая приёмка — у пользователя."
  ],
  "approved_scope": {
    "functional_paths": [
      "package-lock.json",
      "package.json",
      "packages/workflow-kit/package.json",
      "packages/workflow-kit/scripts/check-carryover-fixture.mjs",
      "packages/workflow-kit/scripts/check-plan-review-fixture.mjs",
      "packages/workflow-kit/src/cli.mjs",
      "packages/workflow-kit/src/lib/actions.mjs",
      "packages/workflow-kit/src/lib/command-help.mjs",
      "packages/workflow-kit/src/lib/common.mjs",
      "packages/workflow-kit/src/lib/execution-mode.mjs",
      "packages/workflow-kit/src/lib/installer.mjs",
      "packages/workflow-kit/src/lib/plan-review.mjs",
      "packages/workflow-kit/src/lib/planning-owner.mjs",
      "packages/workflow-kit/src/lib/recovery.mjs",
      "packages/workflow-kit/src/lib/role-protocol.mjs",
      "packages/workflow-kit/src/lib/simple-workflow.mjs",
      "release-manifest.json",
      "src/backend/desktop-model.mjs",
      "src/contracts/backend.mjs",
      "src/contracts/palette.mjs",
      "src/contracts/user-choice.mjs",
      "src/contracts/work-progress.mjs",
      "src/control/context/context-session.mjs",
      "src/control/plugin/communication.mjs",
      "src/control/plugin/enrollment.mjs",
      "src/control/plugin/service.mjs",
      "src/control/plugin/startup-context.mjs",
      "src/control/plugin/workflow-channel.mjs",
      "src/control/sessions/workspace-session.mjs",
      "src/control/workflow/coordination.mjs",
      "src/control/workflow/dialogue-delivery.mjs",
      "src/control/workflow/execution-control.mjs",
      "src/control/workflow/planning-owner.mjs",
      "src/control/workflow/project-session-plan-continuation.mjs",
      "src/control/workflow/review-continuation.mjs",
      "src/control/workflow/user-choices.mjs",
      "src/execution/files/project-input-watch.mjs",
      "src/execution/plugin/communication-store.mjs",
      "src/frontend/desktop/ui/index.html",
      "src/frontend/desktop/ui/progress.mjs",
      "src/frontend/desktop/ui/sidebar.mjs",
      "src/frontend/plugin/index.html",
      "src/frontend/plugin/launch.mjs",
      "src/frontend/plugin/panel.mjs",
      "tests/backend-desktop-model.test.mjs",
      "tests/chatgpt-plugin.test.mjs",
      "tests/codex-app-server-mcp.test.mjs",
      "tests/context-session.test.mjs",
      "tests/dialogue-delivery.test.mjs",
      "tests/fixtures/automatic-agent-dialogue.mjs",
      "tests/fixtures/released-kit/kit-1.9.7.tar.gz",
      "tests/fixtures/released-kit/manifest.json",
      "tests/panel-dialogue-view.test.mjs",
      "tests/planning-owner.test.mjs",
      "tests/progress.test.mjs",
      "tests/project-input-watch.test.mjs",
      "tests/session-roles.test.mjs",
      "tests/sidebar.test.mjs",
      "tests/startup-context.test.mjs",
      "tests/user-choice-view.test.mjs",
      "tests/user-choices.test.mjs",
      "tests/work-progress.test.mjs",
      "tests/workflow-channel.test.mjs",
      "tests/workflow-kit-upgrade.test.mjs",
      "tools/codex-app-server-mcp/plugin-ui.html",
      "tools/codex-app-server-mcp/plugin.py",
      "packages/workflow-kit/scripts/check-orchestrated-execution-fixture.mjs",
      "packages/workflow-kit/scripts/check-parallel-plan-fixture.mjs",
      "tests/dialogue-migration.test.mjs",
      "tests/fixtures/execution-mode.mjs",
      "tests/orchestrated-execution.test.mjs",
      "tests/prepared-task-flow.test.mjs"
    ],
    "documentation_paths": [
      "docs/planning/user-choice-and-plan-modes.md",
      "README.md",
      "docs/architecture/OVERVIEW.md",
      "docs/modules/desktop.md",
      "docs/modules/workflow-execution.md",
      "docs/modules/orchestrated-execution.md",
      "docs/modules/orchestrator-startup.md",
      "docs/modules/chatgpt-plugin.md",
      "docs/modules/release.md",
      "docs/modules/project-compatibility.md",
      "packages/workflow-kit/README.md",
      "packages/workflow-kit/docs/modules/workflow-kit-package.md",
      "packages/workflow-kit/docs/modules/orchestrated-plans.md",
      "tests/fixtures/released-kit/README.md",
      "packages/workflow-kit/src/templates/PLAN.md"
    ]
  },
  "baseline_commit": "10979d5d9c2868e608ea9e061161e4ee01d90449",
  "current_task_id": null,
  "context_pack": {
    "documents": [
      {
        "path": "docs/planning/user-choice-and-plan-modes.md",
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
        "scope_id": "user-choice-plan-modes",
        "task_id": "T001",
        "role": "implementation"
      },
      "dependencies": [],
      "functional_paths": [
        "packages/workflow-kit/src/lib/execution-mode.mjs",
        "packages/workflow-kit/src/lib/actions.mjs",
        "packages/workflow-kit/src/lib/plan-review.mjs",
        "packages/workflow-kit/src/lib/planning-owner.mjs",
        "packages/workflow-kit/src/lib/recovery.mjs",
        "packages/workflow-kit/src/lib/role-protocol.mjs",
        "packages/workflow-kit/src/lib/common.mjs",
        "packages/workflow-kit/src/lib/installer.mjs",
        "packages/workflow-kit/src/lib/command-help.mjs",
        "packages/workflow-kit/src/cli.mjs",
        "packages/workflow-kit/package.json",
        "package-lock.json",
        "packages/workflow-kit/scripts/check-plan-review-fixture.mjs",
        "packages/workflow-kit/scripts/check-carryover-fixture.mjs",
        "tests/fixtures/released-kit/kit-1.9.7.tar.gz",
        "tests/fixtures/released-kit/manifest.json",
        "tests/workflow-kit-upgrade.test.mjs",
        "tests/workflow-channel.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "packages/workflow-kit/src/lib/simple-workflow.mjs",
        "packages/workflow-kit/scripts/check-orchestrated-execution-fixture.mjs",
        "packages/workflow-kit/scripts/check-parallel-plan-fixture.mjs",
        "tests/dialogue-migration.test.mjs",
        "tests/fixtures/execution-mode.mjs",
        "tests/orchestrated-execution.test.mjs",
        "tests/prepared-task-flow.test.mjs"
      ],
      "documentation_paths": [
        "packages/workflow-kit/src/templates/PLAN.md"
      ],
      "verification_ids": [
        "kit-check",
        "kit-assignments",
        "kit-upgrade",
        "unit-all"
      ],
      "id": "T001",
      "title": "Kit 1.9.8: запрос и выбор режима, владелец при запросе, роли 8",
      "why": "Kit записывает выбор режима пользователем и не создаёт план сессии Workflow Pilot без него; владелец планирования появляется при запросе режима.",
      "acceptance_criteria": [
        "plan:mode-request атомарно занимает владельца и пишет запрос; чужая сессия получает PLANNING_OWNED без записи; повторный запрос владельца сбрасывает выбор.",
        "plan:mode-choose записывает выбор по CAS поколения и владельца с approval-note.",
        "При существующей записи режима plan:create, scope:create и review:prepare основного плана без origin, с чужим origin, без выбора или с другой стратегией отказывают EXECUTION_MODE_REQUIRED/EXECUTION_MODE_MISMATCH до любой записи (включая applyConfig); план с origin всегда требует запись своей сессии; без записи и origin поведение прежнее; archive очищает запись.",
        "Передача и освобождение владельца удаляют запись режима; plan:mode-request при активном плане отказывает; PLAN.md и справка требуют origin и запрос режима для плана сессии Workflow Pilot; fixtures покрывают sequential без origin при наличии запроса.",
        "ROLE_PROTOCOL_VERSION 8: роли «Планирование» и «Выполняет план сам», правило развилок во всех ролях чатов; Kit 1.9.8 с fixture выпуска 1.9.7 и обновлением 1.9.7 → 1.9.8."
      ],
      "expected_commit_message": "feat: Kit 1.9.8 — выбор режима плана пользователем",
      "parallel_safe": false,
      "actual_files": [
        "package-lock.json",
        "packages/workflow-kit/package.json",
        "packages/workflow-kit/scripts/check-carryover-fixture.mjs",
        "packages/workflow-kit/scripts/check-orchestrated-execution-fixture.mjs",
        "packages/workflow-kit/scripts/check-parallel-plan-fixture.mjs",
        "packages/workflow-kit/scripts/check-plan-review-fixture.mjs",
        "packages/workflow-kit/src/cli.mjs",
        "packages/workflow-kit/src/lib/actions.mjs",
        "packages/workflow-kit/src/lib/command-help.mjs",
        "packages/workflow-kit/src/lib/common.mjs",
        "packages/workflow-kit/src/lib/execution-mode.mjs",
        "packages/workflow-kit/src/lib/installer.mjs",
        "packages/workflow-kit/src/lib/plan-review.mjs",
        "packages/workflow-kit/src/lib/planning-owner.mjs",
        "packages/workflow-kit/src/lib/recovery.mjs",
        "packages/workflow-kit/src/lib/role-protocol.mjs",
        "packages/workflow-kit/src/lib/simple-workflow.mjs",
        "packages/workflow-kit/src/templates/PLAN.md",
        "tests/dialogue-migration.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/fixtures/execution-mode.mjs",
        "tests/fixtures/released-kit/kit-1.9.7.tar.gz",
        "tests/fixtures/released-kit/manifest.json",
        "tests/orchestrated-execution.test.mjs",
        "tests/prepared-task-flow.test.mjs",
        "tests/workflow-kit-upgrade.test.mjs"
      ]
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "user-choice-plan-modes",
        "task_id": "T002",
        "role": "implementation"
      },
      "dependencies": [
        "T001"
      ],
      "functional_paths": [
        "src/control/workflow/user-choices.mjs",
        "src/contracts/user-choice.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/execution-control.mjs",
        "src/control/workflow/review-continuation.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/control/plugin/service.mjs",
        "src/execution/plugin/communication-store.mjs",
        "src/backend/desktop-model.mjs",
        "tools/codex-app-server-mcp/plugin.py",
        "src/contracts/backend.mjs",
        "tests/user-choices.test.mjs",
        "tests/workflow-channel.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/backend-desktop-model.test.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/frontend/plugin/launch.mjs",
        "tests/dialogue-delivery.test.mjs",
        "src/execution/files/project-input-watch.mjs",
        "tests/project-input-watch.test.mjs",
        "tools/codex-app-server-mcp/plugin-ui.html"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "chatgpt-plugin",
        "executor-channel",
        "architecture"
      ],
      "id": "T002",
      "title": "Выбор пользователя в Control и канале",
      "why": "Служба предлагает выбор по событиям Е1–Е5, хранит его жизненный цикл и передаёт решение агенту сообщением user-choice.",
      "acceptance_criteria": [
        "Записи выбора долговечны; одна карточка на сессию по старшинству; offered → chosen/declined/stale; choose идемпотентен и отвергает устаревшее поколение.",
        "Своя отправка пользователя отклоняет выбор; устойчивая причина предлагается снова после конца хода не чаще раза на отправку.",
        "user-choice: enqueue без grant и совпадения scope, отдельный допуск DialogueDelivery/claim_ready без plugin-v1 и running/pausing при прежних физических проверках, получатель любой роли, read_message возвращает ролевой текст фактической роли; панель не завершает ожидание при недоставленном user-choice; workflow_communication_choose и pilot:choose проверяют выбор.",
        "Действия Е1–Е5 выполняют только существующие операции и запись режима через Kit.",
        "Изменения execution-mode.json и planning-owner.json наблюдаются: plan:mode-request в fixture даёт offered Е5 и подпись «Планирование» без других изменений проекта."
      ],
      "expected_commit_message": "feat: выбор пользователя в службе и канале",
      "parallel_safe": false
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "user-choice-plan-modes",
        "task_id": "T003",
        "role": "implementation"
      },
      "dependencies": [
        "T001",
        "T002"
      ],
      "functional_paths": [
        "src/control/workflow/planning-owner.mjs",
        "src/control/sessions/workspace-session.mjs",
        "src/control/plugin/startup-context.mjs",
        "src/control/plugin/enrollment.mjs",
        "src/control/workflow/project-session-plan-continuation.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/user-choices.mjs",
        "src/backend/desktop-model.mjs",
        "src/contracts/work-progress.mjs",
        "src/control/plugin/service.mjs",
        "tests/planning-owner.test.mjs",
        "tests/session-roles.test.mjs",
        "tests/startup-context.test.mjs",
        "tests/work-progress.test.mjs",
        "tests/backend-desktop-model.test.mjs",
        "tests/user-choices.test.mjs",
        "src/control/context/context-session.mjs",
        "tests/context-session.test.mjs",
        "tools/codex-app-server-mcp/plugin-ui.html"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "orchestrator-startup",
        "startup-recovery",
        "architecture"
      ],
      "id": "T003",
      "title": "Нейтральные сессии и два режима в приложении",
      "why": "Новая сессия — «Обсуждение» до запроса режима; владелец берётся из Kit; sequential-владелец выполняет план сам существующим механизмом продолжений.",
      "acceptance_criteria": [
        "Захват владельца по первой ручной отправке удалён при Kit ≥ 1.9.8; при старом Kit — поведение 0.5.29.",
        "Стартовый контекст (context-session) новой сессии несёт роль «Планирование» по таблице спецификации и правило plan:mode-request вместо самостоятельного выбора способа; обновление роли до оркестратора или «Выполняет план» приходит с выбором режима.",
        "Подписи «Обсуждение», «Планирование», «Выполняет план», «Оркестратор» и фаза «Ждёт задачи» согласованы в окне и панели.",
        "Sequential-план владельца запускается той же кнопкой и продолжается в его сессии."
      ],
      "expected_commit_message": "feat: нейтральные сессии и режимы выполнения плана",
      "parallel_safe": false
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "user-choice-plan-modes",
        "task_id": "T004",
        "role": "implementation"
      },
      "dependencies": [
        "T002",
        "T003"
      ],
      "functional_paths": [
        "src/frontend/plugin/panel.mjs",
        "src/frontend/plugin/index.html",
        "src/frontend/plugin/launch.mjs",
        "src/contracts/palette.mjs",
        "src/contracts/user-choice.mjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/frontend/desktop/ui/progress.mjs",
        "src/frontend/desktop/ui/index.html",
        "src/backend/desktop-model.mjs",
        "tools/codex-app-server-mcp/plugin-ui.html",
        "package.json",
        "package-lock.json",
        "src/contracts/backend.mjs",
        "tests/sidebar.test.mjs",
        "tests/progress.test.mjs",
        "tests/panel-dialogue-view.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/user-choice-view.test.mjs",
        "src/contracts/work-progress.mjs",
        "tests/work-progress.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "chatgpt-plugin",
        "plan-review-ui",
        "electron-smoke",
        "architecture"
      ],
      "id": "T004",
      "title": "Карточка выбора в панели и окне",
      "why": "Пользователь замечает и делает выбор одним нажатием в панели чата или в окне Workflow Pilot.",
      "acceptance_criteria": [
        "Порядок блоков панели: Сейчас → Выбор пользователя → История → Диагностика (свёрнута).",
        "Оранжевая карточка с рекомендуемой первой строкой, пульсация 3 раза, без анимации при reduced motion, подсказка о свободном ответе, состояния «передаётся», «передано», снятие при отклонении и неактуальности.",
        "В окне — отметка «Ждёт вашего выбора» у сессии и та же карточка в ходе работ из общего контракта.",
        "Версия 0.5.30, протокол панели повышен, plugin-ui.html пересобран.",
        "Отправитель USER для user-choice в контракте хода работ, в Истории окна и в панели: «Пользователь → <роль> · выбор»."
      ],
      "expected_commit_message": "feat: карточка выбора пользователя в панели и окне",
      "parallel_safe": false
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "user-choice-plan-modes",
        "task_id": "DOCS",
        "role": "implementation"
      },
      "dependencies": [
        "T001",
        "T002",
        "T003",
        "T004"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/planning/user-choice-and-plan-modes.md",
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/desktop.md",
        "docs/modules/workflow-execution.md",
        "docs/modules/orchestrated-execution.md",
        "docs/modules/orchestrator-startup.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/release.md",
        "docs/modules/project-compatibility.md",
        "packages/workflow-kit/README.md",
        "packages/workflow-kit/docs/modules/workflow-kit-package.md",
        "packages/workflow-kit/docs/modules/orchestrated-plans.md",
        "tests/fixtures/released-kit/README.md",
        "packages/workflow-kit/src/templates/PLAN.md"
      ],
      "verification_ids": [],
      "id": "DOCS",
      "title": "Актуализация всех документов проекта",
      "why": "Документы описывают выбор пользователя, режимы плана и Kit 1.9.8 до production-сборки.",
      "acceptance_criteria": [
        "Документы описывают фактическое поведение 0.5.30 и Kit 1.9.8, каждый не более 28000 байт UTF-8; отработанная спецификация удалена после переноса."
      ],
      "expected_commit_message": "docs: Актуализация всех документов проекта",
      "parallel_safe": false
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "user-choice-plan-modes",
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
      "title": "Собрать выпуск 0.5.30 для трёх ОС",
      "why": "Один sourceCommit для macOS, Windows и Linux.",
      "acceptance_criteria": [
        "После DOCS собраны macOS arm64, Windows x64 и Linux x64 из одного sourceCommit; перед production-сборкой удалены только Python-кэши tools/codex-app-server-mcp."
      ],
      "expected_commit_message": "release: Собрать выпуск 0.5.30 для трёх ОС",
      "verification_kind": "package",
      "parallel_safe": false
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "user-choice-plan-modes",
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
      "title": "Установить выпуск 0.5.30",
      "why": "Обязательная установка собственной копии после выпуска.",
      "acceptance_criteria": [
        "Штатный installer проверил версию, manifest, подпись и откат; приложение и служба агентом не закрываются и не запускаются."
      ],
      "expected_commit_message": "release: Установить выпуск 0.5.30",
      "verification_kind": "installed",
      "parallel_safe": false
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "user-choice-plan-modes",
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
      "title": "Опубликовать выпуск 0.5.30 на GitHub",
      "why": "Выпуск доступен пользователям.",
      "acceptance_criteria": [
        "GitHub Release v0.5.30 опубликован с тегом на sourceCommit, семью assets и сверенными digest и размерами; scope не архивируется автоматически."
      ],
      "expected_commit_message": "release: Опубликовать выпуск 0.5.30 на GitHub",
      "verification_kind": "package",
      "parallel_safe": false
    }
  ],
  "blocked_reason": null,
  "user_decisions": [
    {
      "id": "7ba09ea4-5737-4a04-b40b-575be34ff70d",
      "text": "Прямое поручение пользователя 23.10.2026: закрыть review-publication-orchestrator, подготовить спецификацию и план выбора пользователя в панели и двух режимов плана, обязательно через Review; выпуск, установка и публикация как раньше.",
      "recorded_at": "2026-10-23T15:22:08.303Z"
    }
  ],
  "parallel_allowed": false,
  "max_workers": 1,
  "execution_strategy": "sequential",
  "execution_reason": "AGENTS.md предписывает работать самостоятельно; план выполняет этот агент последовательно. T002–T004 опираются на команды Kit из T001 и модель выбора из T002."
}
```
<!-- workflow-state:end -->

## Состояние

Execution Scope Status: ACTIVE
Delivery Status: IN_PROGRESS
Scope: user-choice-plan-modes
Current Task: нет
Revision: 966

## Цель

Пользователь делает важные выборы одной кнопкой в карточке панели и окна; план сессии Workflow Pilot выполняется в выбранном пользователем режиме (сам или оркестрация); новые сессии нейтральны до запроса режима; выпуск 0.5.30 для трёх ОС опубликован.

## Критерии приёмки

- Карточка выбора появляется по событиям Е1–Е5, решение доходит до агента внутренним каналом, своё сообщение пользователя снимает карточку.
- Kit не создаёт план сессии Workflow Pilot без выбора режима пользователем; оба режима выполняются.
- Новые сессии подписаны «Обсуждение» до запроса режима; захват по первой реплике удалён при Kit 1.9.8.
- Выпуск 0.5.30 трёх ОС собран, установлен и опубликован; живая приёмка — у пользователя.

## Микрозадачи

Выполнение: sequential; разрешено: false; лимит: 1
Причина: AGENTS.md предписывает работать самостоятельно; план выполняет этот агент последовательно. T002–T004 опираются на команды Kit из T001 и модель выбора из T002.

- [DONE] T001: Kit 1.9.8: запрос и выбор режима, владелец при запросе, роли 8 — Завершено
  - Git Commit: [DONE] feat: Kit 1.9.8 — выбор режима плана пользователем
  - Reference: user-choice-plan-modes / T001 / implementation
  - Файлы: packages/workflow-kit/src/lib/execution-mode.mjs, packages/workflow-kit/src/lib/actions.mjs, packages/workflow-kit/src/lib/plan-review.mjs, packages/workflow-kit/src/lib/planning-owner.mjs, packages/workflow-kit/src/lib/recovery.mjs, packages/workflow-kit/src/lib/role-protocol.mjs, packages/workflow-kit/src/lib/common.mjs, packages/workflow-kit/src/lib/installer.mjs, packages/workflow-kit/src/lib/command-help.mjs, packages/workflow-kit/src/cli.mjs, packages/workflow-kit/package.json, package-lock.json, packages/workflow-kit/scripts/check-plan-review-fixture.mjs, packages/workflow-kit/scripts/check-carryover-fixture.mjs, tests/fixtures/released-kit/kit-1.9.7.tar.gz, tests/fixtures/released-kit/manifest.json, tests/workflow-kit-upgrade.test.mjs, tests/workflow-channel.test.mjs, tests/chatgpt-plugin.test.mjs, tests/fixtures/automatic-agent-dialogue.mjs, packages/workflow-kit/src/lib/simple-workflow.mjs, packages/workflow-kit/scripts/check-orchestrated-execution-fixture.mjs, packages/workflow-kit/scripts/check-parallel-plan-fixture.mjs, tests/dialogue-migration.test.mjs, tests/fixtures/execution-mode.mjs, tests/orchestrated-execution.test.mjs, tests/prepared-task-flow.test.mjs, packages/workflow-kit/src/templates/PLAN.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [TODO] T002: Выбор пользователя в Control и канале — Ожидает
  - Git Commit: [PENDING] feat: выбор пользователя в службе и канале
  - Reference: user-choice-plan-modes / T002 / implementation
  - Файлы: src/control/workflow/user-choices.mjs, src/contracts/user-choice.mjs, src/control/workflow/coordination.mjs, src/control/workflow/execution-control.mjs, src/control/workflow/review-continuation.mjs, src/control/plugin/communication.mjs, src/control/plugin/workflow-channel.mjs, src/control/plugin/service.mjs, src/execution/plugin/communication-store.mjs, src/backend/desktop-model.mjs, tools/codex-app-server-mcp/plugin.py, src/contracts/backend.mjs, tests/user-choices.test.mjs, tests/workflow-channel.test.mjs, tests/chatgpt-plugin.test.mjs, tests/backend-desktop-model.test.mjs, tests/codex-app-server-mcp.test.mjs, src/control/workflow/dialogue-delivery.mjs, src/frontend/plugin/launch.mjs, tests/dialogue-delivery.test.mjs, src/execution/files/project-input-watch.mjs, tests/project-input-watch.test.mjs, tools/codex-app-server-mcp/plugin-ui.html
  - Параллельность: исключительное выполнение
  - Зависимости: T001
- [TODO] T003: Нейтральные сессии и два режима в приложении — Ожидает
  - Git Commit: [PENDING] feat: нейтральные сессии и режимы выполнения плана
  - Reference: user-choice-plan-modes / T003 / implementation
  - Файлы: src/control/workflow/planning-owner.mjs, src/control/sessions/workspace-session.mjs, src/control/plugin/startup-context.mjs, src/control/plugin/enrollment.mjs, src/control/workflow/project-session-plan-continuation.mjs, src/control/workflow/coordination.mjs, src/control/workflow/user-choices.mjs, src/backend/desktop-model.mjs, src/contracts/work-progress.mjs, src/control/plugin/service.mjs, tests/planning-owner.test.mjs, tests/session-roles.test.mjs, tests/startup-context.test.mjs, tests/work-progress.test.mjs, tests/backend-desktop-model.test.mjs, tests/user-choices.test.mjs, src/control/context/context-session.mjs, tests/context-session.test.mjs, tools/codex-app-server-mcp/plugin-ui.html
  - Параллельность: исключительное выполнение
  - Зависимости: T001, T002
- [TODO] T004: Карточка выбора в панели и окне — Ожидает
  - Git Commit: [PENDING] feat: карточка выбора пользователя в панели и окне
  - Reference: user-choice-plan-modes / T004 / implementation
  - Файлы: src/frontend/plugin/panel.mjs, src/frontend/plugin/index.html, src/frontend/plugin/launch.mjs, src/contracts/palette.mjs, src/contracts/user-choice.mjs, src/frontend/desktop/ui/sidebar.mjs, src/frontend/desktop/ui/progress.mjs, src/frontend/desktop/ui/index.html, src/backend/desktop-model.mjs, tools/codex-app-server-mcp/plugin-ui.html, package.json, package-lock.json, src/contracts/backend.mjs, tests/sidebar.test.mjs, tests/progress.test.mjs, tests/panel-dialogue-view.test.mjs, tests/chatgpt-plugin.test.mjs, tests/user-choice-view.test.mjs, src/contracts/work-progress.mjs, tests/work-progress.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: T002, T003
- [TODO] DOCS: Актуализация всех документов проекта — Ожидает
  - Git Commit: [PENDING] docs: Актуализация всех документов проекта
  - Reference: user-choice-plan-modes / DOCS / implementation
  - Файлы: docs/planning/user-choice-and-plan-modes.md, README.md, docs/architecture/OVERVIEW.md, docs/modules/desktop.md, docs/modules/workflow-execution.md, docs/modules/orchestrated-execution.md, docs/modules/orchestrator-startup.md, docs/modules/chatgpt-plugin.md, docs/modules/release.md, docs/modules/project-compatibility.md, packages/workflow-kit/README.md, packages/workflow-kit/docs/modules/workflow-kit-package.md, packages/workflow-kit/docs/modules/orchestrated-plans.md, tests/fixtures/released-kit/README.md, packages/workflow-kit/src/templates/PLAN.md
  - Параллельность: исключительное выполнение
  - Зависимости: T001, T002, T003, T004
- [TODO] RELEASE: Собрать выпуск 0.5.30 для трёх ОС — Ожидает
  - Git Commit: [PENDING] release: Собрать выпуск 0.5.30 для трёх ОС
  - Reference: user-choice-plan-modes / RELEASE / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: DOCS
- [TODO] INSTALL: Установить выпуск 0.5.30 — Ожидает
  - Git Commit: [PENDING] release: Установить выпуск 0.5.30
  - Reference: user-choice-plan-modes / INSTALL / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: RELEASE, DOCS
- [TODO] PUBLISH: Опубликовать выпуск 0.5.30 на GitHub — Ожидает
  - Git Commit: [PENDING] release: Опубликовать выпуск 0.5.30 на GitHub
  - Reference: user-choice-plan-modes / PUBLISH / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: INSTALL, DOCS

## Context Pack For This Cycle

- docs/planning/user-choice-and-plan-modes.md
- docs/architecture/OVERVIEW.md

Служебные состояния меняются только командами workflow. Приёмка не архивирует scope.
