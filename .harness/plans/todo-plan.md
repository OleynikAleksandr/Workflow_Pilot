# Активный план — Workflow_Pilot

<!-- workflow-state:begin -->
```json
{
  "schema_version": 1,
  "plan_revision": 395,
  "project_id": "7411e192-943c-4529-bffb-3b081d9c242f",
  "project_name": "Workflow_Pilot",
  "scope_id": "workflow-pilot-0-4-6",
  "execution_scope_status": "ACTIVE",
  "delivery_status": "IN_PROGRESS",
  "objective": "Выпуск 0.4.6: строка списка проектов показывает название по горизонтали, «В архив» — компактная кнопка справа",
  "acceptance_criteria": [
    "Выпуск 0.4.6: строка списка проектов показывает название по горизонтали, «В архив» — компактная кнопка справа"
  ],
  "approved_scope": {
    "functional_paths": [
      "src/frontend/desktop/ui/index.html",
      "tests/electron-smoke.mjs",
      "package.json",
      "package-lock.json",
      "src/frontend/plugin/index.html",
      "src/frontend/plugin/app.mjs",
      "tests/backend-upgrade.test.mjs",
      "release-manifest.json",
      "packages/workflow-kit/src/lib/recovery.mjs",
      "packages/workflow-kit/src/lib/command-help.mjs",
      "packages/workflow-kit/src/lib/actions.mjs",
      "packages/workflow-kit/src/lib/common.mjs",
      "packages/workflow-kit/package.json",
      "src/control/workflow/coordination.mjs",
      "src/backend/desktop-model.mjs",
      "src/frontend/desktop/ui/sidebar.mjs",
      "packages/workflow-kit/src/lib/installer.mjs",
      "tests/sidebar.test.mjs",
      "src/backend/bootstrap.mjs",
      "src/backend/operations.mjs",
      "src/control/projects/project-state-cleanup.mjs",
      "src/control/sessions/workspace-session.mjs",
      "src/control/settings/service.mjs",
      "src/control/workflow/automation-send-state.mjs",
      "src/control/workflow/executor-session.mjs",
      "src/control/workflow/parallel-execution.mjs",
      "src/control/workflow/parallel-kit.mjs",
      "src/control/workflow/auto-plan-state.mjs",
      "src/control/workflow/plan-continuation-state.mjs",
      "src/control/workflow/auto-plan.mjs",
      "src/control/workflow/plan-continuation.mjs",
      "src/control/workflow/project-auto-plan.mjs",
      "src/control/workflow/project-plan-continuation.mjs",
      "src/control/workflow/project-session-auto-plan.mjs",
      "src/control/workflow/project-session-plan-continuation.mjs",
      "src/control/workflow/review-continuation.mjs",
      "src/frontend/desktop/client.mjs",
      "tests/backend-api.test.mjs",
      "tests/backend-browser-lifecycle.test.mjs",
      "tests/context-session.test.mjs",
      "tests/control-facade.test.mjs",
      "tests/desktop-boundaries.test.mjs",
      "tests/execution-architecture.test.mjs",
      "tests/execution-control.test.mjs",
      "tests/parallel-execution-recovery.test.mjs",
      "tests/parallel-execution-smoke-fixture.cjs",
      "tests/parallel-execution-ui.test.mjs",
      "tests/parallel-execution.test.mjs",
      "tests/parallel-finalization.test.mjs",
      "tests/auto-plan-restart-fixture.cjs",
      "tests/plan-continuation-restart-fixture.cjs",
      "tests/auto-plan.test.mjs",
      "tests/plan-continuation.test.mjs",
      "tests/plan-review.test.mjs",
      "tests/project-auto-plan.test.mjs",
      "tests/project-plan-continuation.test.mjs",
      "tests/project-state-cleanup.test.mjs",
      "tests/settings-parallel-execution.test.mjs",
      "tests/workspace-deletion.test.mjs",
      "tests/workspace-session.test.mjs",
      "tests/legacy-continuation-keys.test.mjs"
    ],
    "documentation_paths": [
      "docs/planning/project-list-layout.md",
      "README.md",
      "docs/architecture/OVERVIEW.md",
      "docs/modules/desktop.md",
      "docs/planning/no-autoplan.md",
      "packages/workflow-kit/src/templates/PLAN.md",
      "packages/workflow-kit/src/templates/PROTOTYPE.md",
      "packages/workflow-kit/docs/modules/parallel-assignments.md",
      "AGENTS.md",
      "docs/acceptance/backend-independence.md",
      "docs/acceptance/migration-0.1.0.md",
      "docs/modules/backend.md",
      "docs/modules/browser.md",
      "docs/modules/control.md",
      "docs/modules/execution.md",
      "docs/modules/orchestrated-execution.md",
      "docs/modules/project-compatibility.md",
      "docs/modules/remote-access.md",
      "docs/modules/workflow-execution.md",
      "docs/planning/phased-plans-recovery-followup.md",
      "packages/workflow-kit/README.md",
      "packages/workflow-kit/docs/modules/orchestrated-plans.md",
      "packages/workflow-kit/docs/modules/workflow-kit-package.md"
    ]
  },
  "baseline_commit": "b43bedbdafe67cd2a957aba9412929899c2b19cc",
  "current_task_id": null,
  "context_pack": {
    "documents": [
      {
        "path": "docs/planning/project-list-layout.md",
        "required": true,
        "revision": "46e7e9c37475325da7b5d514c6bcce08e679a02f"
      },
      {
        "path": "docs/architecture/OVERVIEW.md",
        "required": true,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/planning/no-autoplan.md",
        "required": true,
        "revision": "4fea65372b7e3dcd9caeeabc21d50c437e64ec89"
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
        "scope_id": "workflow-pilot-0-4-6",
        "task_id": "T001",
        "role": "implementation"
      },
      "dependencies": [],
      "functional_paths": [
        "src/frontend/desktop/ui/index.html",
        "tests/electron-smoke.mjs"
      ],
      "documentation_paths": [
        "docs/planning/project-list-layout.md"
      ],
      "verification_ids": [
        "unit-all",
        "electron-smoke"
      ],
      "id": "T001",
      "title": "Раскладка строки списка проектов",
      "why": "Приёмка 0.4.5: названия проектов выводились вертикально.",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Название проекта занимает свободную ширину строки, «В архив» — по ширине текста; smoke проверяет раскладку на настоящей боковой панели"
      ],
      "expected_commit_message": "fix: Раскладка строки списка проектов",
      "actual_files": [
        "src/frontend/desktop/ui/index.html",
        "tests/electron-smoke.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-0-4-6",
        "task_id": "T002",
        "role": "implementation"
      },
      "dependencies": [
        "T001"
      ],
      "functional_paths": [
        "package.json",
        "package-lock.json",
        "src/frontend/plugin/index.html",
        "src/frontend/plugin/app.mjs",
        "tests/backend-upgrade.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/project-list-layout.md"
      ],
      "verification_ids": [
        "release-tooling",
        "unit-all"
      ],
      "id": "T002",
      "title": "Подготовить версию 0.4.6",
      "why": "Номер выпуска.",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Версия 0.4.6 в package/lock и панели плагина"
      ],
      "expected_commit_message": "feat: Подготовить версию 0.4.6",
      "actual_files": [
        "package.json",
        "package-lock.json",
        "src/frontend/plugin/index.html",
        "src/frontend/plugin/app.mjs",
        "tests/backend-upgrade.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-0-4-6",
        "task_id": "DOCS",
        "role": "implementation"
      },
      "dependencies": [
        "T001",
        "T002"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/planning/project-list-layout.md",
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/desktop.md"
      ],
      "verification_ids": [],
      "id": "DOCS",
      "title": "Актуализация всех документов проекта",
      "why": "Сохранить актуальный контекст для следующего агента",
      "acceptance_criteria": [
        "Документы соответствуют результату"
      ],
      "expected_commit_message": "docs: актуализировать контекст проекта",
      "actual_files": [
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/desktop.md",
        "docs/planning/project-list-layout.md"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-0-4-6",
        "task_id": "T003",
        "role": "implementation"
      },
      "dependencies": [
        "T002",
        "DOCS"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/project-list-layout.md"
      ],
      "verification_ids": [
        "three-platform-release"
      ],
      "id": "T003",
      "title": "Собрать выпуск 0.4.6 трёх ОС",
      "why": "Комплект после DOCS.",
      "verification_kind": "package",
      "acceptance_criteria": [
        "Три ОС из одного sourceCommit после DOCS; manifest совпадает"
      ],
      "expected_commit_message": "release: Собрать выпуск 0.4.6 трёх ОС",
      "actual_files": [
        "release-manifest.json"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-0-4-6",
        "task_id": "T004",
        "role": "implementation"
      },
      "dependencies": [
        "T003",
        "DOCS"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/project-list-layout.md"
      ],
      "verification_ids": [
        "release-installed"
      ],
      "id": "T004",
      "title": "Установить 0.4.6 в Applications",
      "why": "Обновить приложение.",
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Установка готового комплекта без пересборки; при работающей службе — pending"
      ],
      "expected_commit_message": "release: Установить 0.4.6 в Applications",
      "actual_files": []
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-0-4-6",
        "task_id": "T005",
        "role": "implementation"
      },
      "dependencies": [
        "T004",
        "DOCS"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/project-list-layout.md"
      ],
      "verification_ids": [
        "github-release"
      ],
      "id": "T005",
      "title": "Опубликовать GitHub Release 0.4.6",
      "why": "Опубликовать комплект.",
      "verification_kind": "package",
      "acceptance_criteria": [
        "Тег v0.4.6 на sourceCommit, assets сверены, remote main = HEAD"
      ],
      "expected_commit_message": "release: Опубликовать GitHub Release 0.4.6",
      "actual_files": []
    },
    {
      "id": "T006",
      "title": "Kit без AutoPlan: запуск плана кнопкой",
      "why": "Оркестратор по инструкциям Kit советовал включить AutoPlan.",
      "dependencies": [],
      "functional_paths": [
        "packages/workflow-kit/src/lib/recovery.mjs",
        "packages/workflow-kit/src/lib/command-help.mjs",
        "packages/workflow-kit/src/lib/actions.mjs",
        "packages/workflow-kit/src/lib/common.mjs",
        "packages/workflow-kit/package.json",
        "package-lock.json",
        "packages/workflow-kit/src/lib/installer.mjs"
      ],
      "documentation_paths": [
        "docs/planning/no-autoplan.md",
        "packages/workflow-kit/src/templates/PLAN.md",
        "packages/workflow-kit/src/templates/PROTOTYPE.md",
        "packages/workflow-kit/docs/modules/parallel-assignments.md"
      ],
      "verification_ids": [
        "kit-check",
        "unit-all"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Kit 1.8.1: ни один текст для агента не упоминает AutoPlan; запуск, пауза и продолжение плана — кнопка выполнения плана пользователя"
      ],
      "expected_commit_message": "fix: Kit без AutoPlan — запуск плана кнопкой",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-0-4-6",
        "task_id": "T006",
        "role": "implementation"
      },
      "actual_files": [
        "packages/workflow-kit/src/templates/PLAN.md",
        "packages/workflow-kit/src/templates/PROTOTYPE.md",
        "packages/workflow-kit/src/lib/recovery.mjs",
        "packages/workflow-kit/src/lib/command-help.mjs",
        "packages/workflow-kit/src/lib/actions.mjs",
        "packages/workflow-kit/src/lib/common.mjs",
        "packages/workflow-kit/package.json",
        "packages/workflow-kit/docs/modules/parallel-assignments.md",
        "package-lock.json",
        "docs/planning/no-autoplan.md",
        "packages/workflow-kit/src/lib/installer.mjs"
      ]
    },
    {
      "id": "T008",
      "title": "Раскладка to-do plan и проверка проекта без сдвига",
      "why": "Приёмка 0.4.6: названия задач в столбик, окно дёргалось.",
      "dependencies": [],
      "functional_paths": [
        "src/frontend/desktop/ui/index.html",
        "src/frontend/desktop/ui/sidebar.mjs",
        "tests/electron-smoke.mjs",
        "tests/sidebar.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/no-autoplan.md"
      ],
      "verification_ids": [
        "unit-all",
        "electron-smoke"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Строка начатой задачи to-do plan во всю ширину, название по ширине панели; проверка проекта при переключении не сдвигает карточку"
      ],
      "expected_commit_message": "fix: Раскладка to-do plan и проверка проекта без сдвига",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-0-4-6",
        "task_id": "T008",
        "role": "implementation"
      },
      "actual_files": [
        "src/frontend/desktop/ui/index.html",
        "src/frontend/desktop/ui/sidebar.mjs",
        "tests/electron-smoke.mjs",
        "tests/sidebar.test.mjs",
        "docs/planning/no-autoplan.md"
      ]
    },
    {
      "id": "T007",
      "title": "Убрать AutoPlan из кода приложения",
      "why": "Механизм продолжения прежних планов назывался AutoPlan.",
      "dependencies": [
        "T006",
        "T008"
      ],
      "functional_paths": [
        "src/control/workflow/coordination.mjs",
        "src/backend/desktop-model.mjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/backend/bootstrap.mjs",
        "src/backend/operations.mjs",
        "src/control/projects/project-state-cleanup.mjs",
        "src/control/sessions/workspace-session.mjs",
        "src/control/settings/service.mjs",
        "src/control/workflow/automation-send-state.mjs",
        "src/control/workflow/executor-session.mjs",
        "src/control/workflow/parallel-execution.mjs",
        "src/control/workflow/parallel-kit.mjs",
        "src/control/workflow/auto-plan-state.mjs",
        "src/control/workflow/plan-continuation-state.mjs",
        "src/control/workflow/auto-plan.mjs",
        "src/control/workflow/plan-continuation.mjs",
        "src/control/workflow/project-auto-plan.mjs",
        "src/control/workflow/project-plan-continuation.mjs",
        "src/control/workflow/project-session-auto-plan.mjs",
        "src/control/workflow/project-session-plan-continuation.mjs",
        "src/control/workflow/review-continuation.mjs",
        "src/frontend/desktop/client.mjs",
        "src/frontend/desktop/ui/index.html",
        "tests/backend-api.test.mjs",
        "tests/backend-browser-lifecycle.test.mjs",
        "tests/context-session.test.mjs",
        "tests/control-facade.test.mjs",
        "tests/desktop-boundaries.test.mjs",
        "tests/electron-smoke.mjs",
        "tests/execution-architecture.test.mjs",
        "tests/execution-control.test.mjs",
        "tests/parallel-execution-recovery.test.mjs",
        "tests/parallel-execution-smoke-fixture.cjs",
        "tests/parallel-execution-ui.test.mjs",
        "tests/parallel-execution.test.mjs",
        "tests/parallel-finalization.test.mjs",
        "tests/auto-plan-restart-fixture.cjs",
        "tests/plan-continuation-restart-fixture.cjs",
        "tests/auto-plan.test.mjs",
        "tests/plan-continuation.test.mjs",
        "tests/plan-review.test.mjs",
        "tests/project-auto-plan.test.mjs",
        "tests/project-plan-continuation.test.mjs",
        "tests/project-state-cleanup.test.mjs",
        "tests/settings-parallel-execution.test.mjs",
        "tests/sidebar.test.mjs",
        "tests/workspace-deletion.test.mjs",
        "tests/workspace-session.test.mjs",
        "tests/legacy-continuation-keys.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/no-autoplan.md"
      ],
      "verification_ids": [
        "unit-all",
        "electron-smoke",
        "architecture"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "В коде приложения нет AutoPlan: механизм, файлы, состояние UI, журналы и ключи переименованы; прежние сохранённые ключи читаются и записываются под новыми именами; поведение не меняется"
      ],
      "expected_commit_message": "refactor: Убрать AutoPlan из кода приложения",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-0-4-6",
        "task_id": "T007",
        "role": "implementation"
      },
      "actual_files": [
        "src/backend/bootstrap.mjs",
        "src/backend/desktop-model.mjs",
        "src/backend/operations.mjs",
        "src/control/projects/project-state-cleanup.mjs",
        "src/control/sessions/workspace-session.mjs",
        "src/control/settings/service.mjs",
        "src/control/workflow/automation-send-state.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/executor-session.mjs",
        "src/control/workflow/parallel-execution.mjs",
        "src/control/workflow/parallel-kit.mjs",
        "src/control/workflow/auto-plan-state.mjs",
        "src/control/workflow/plan-continuation-state.mjs",
        "src/control/workflow/auto-plan.mjs",
        "src/control/workflow/plan-continuation.mjs",
        "src/control/workflow/project-auto-plan.mjs",
        "src/control/workflow/project-plan-continuation.mjs",
        "src/control/workflow/project-session-auto-plan.mjs",
        "src/control/workflow/project-session-plan-continuation.mjs",
        "src/control/workflow/review-continuation.mjs",
        "src/frontend/desktop/client.mjs",
        "src/frontend/desktop/ui/index.html",
        "src/frontend/desktop/ui/sidebar.mjs",
        "tests/backend-api.test.mjs",
        "tests/backend-browser-lifecycle.test.mjs",
        "tests/context-session.test.mjs",
        "tests/control-facade.test.mjs",
        "tests/desktop-boundaries.test.mjs",
        "tests/electron-smoke.mjs",
        "tests/execution-architecture.test.mjs",
        "tests/execution-control.test.mjs",
        "tests/parallel-execution-recovery.test.mjs",
        "tests/parallel-execution-smoke-fixture.cjs",
        "tests/parallel-execution-ui.test.mjs",
        "tests/parallel-execution.test.mjs",
        "tests/parallel-finalization.test.mjs",
        "tests/auto-plan-restart-fixture.cjs",
        "tests/plan-continuation-restart-fixture.cjs",
        "tests/auto-plan.test.mjs",
        "tests/plan-continuation.test.mjs",
        "tests/plan-review.test.mjs",
        "tests/project-auto-plan.test.mjs",
        "tests/project-plan-continuation.test.mjs",
        "tests/project-state-cleanup.test.mjs",
        "tests/settings-parallel-execution.test.mjs",
        "tests/sidebar.test.mjs",
        "tests/workspace-deletion.test.mjs",
        "tests/workspace-session.test.mjs",
        "tests/legacy-continuation-keys.test.mjs"
      ]
    },
    {
      "id": "T009",
      "title": "Подготовить версию 0.4.7",
      "why": "Номер выпуска.",
      "dependencies": [
        "T007"
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
      "verification_kind": "code",
      "acceptance_criteria": [
        "Версия 0.4.7 в package/lock и панели плагина"
      ],
      "expected_commit_message": "feat: Подготовить версию 0.4.7",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-0-4-6",
        "task_id": "T009",
        "role": "implementation"
      },
      "actual_files": [
        "package.json",
        "package-lock.json",
        "src/frontend/plugin/index.html",
        "src/frontend/plugin/app.mjs",
        "tests/backend-upgrade.test.mjs"
      ]
    },
    {
      "id": "DOCS-2",
      "title": "Актуализация всех документов проекта",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-0-4-6",
        "task_id": "DOCS-2",
        "role": "implementation",
        "iteration": 2
      },
      "why": "Перед выпуском сверить README, OVERVIEW и действующие контракты модулей с результатом; обновить устаревшее.",
      "dependencies": [
        "T006",
        "T008",
        "T007",
        "T009"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/architecture/OVERVIEW.md",
        "AGENTS.md",
        "README.md",
        "docs/acceptance/backend-independence.md",
        "docs/acceptance/migration-0.1.0.md",
        "docs/modules/backend.md",
        "docs/modules/browser.md",
        "docs/modules/control.md",
        "docs/modules/desktop.md",
        "docs/modules/execution.md",
        "docs/modules/orchestrated-execution.md",
        "docs/modules/project-compatibility.md",
        "docs/modules/remote-access.md",
        "docs/modules/workflow-execution.md",
        "docs/planning/no-autoplan.md",
        "docs/planning/phased-plans-recovery-followup.md",
        "packages/workflow-kit/README.md",
        "packages/workflow-kit/docs/modules/orchestrated-plans.md",
        "packages/workflow-kit/docs/modules/parallel-assignments.md",
        "packages/workflow-kit/docs/modules/workflow-kit-package.md"
      ],
      "acceptance_criteria": [
        "Документы описывают текущий результат, существенное из выпущенных рабочих спецификаций перенесено в контракты модулей; история остаётся в Git."
      ],
      "verification_ids": [],
      "expected_commit_message": "docs: актуализировать документацию проекта",
      "actual_files": [
        "AGENTS.md",
        "README.md",
        "docs/acceptance/backend-independence.md",
        "docs/acceptance/migration-0.1.0.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/backend.md",
        "docs/modules/browser.md",
        "docs/modules/control.md",
        "docs/modules/desktop.md",
        "docs/modules/execution.md",
        "docs/modules/orchestrated-execution.md",
        "docs/modules/project-compatibility.md",
        "docs/modules/remote-access.md",
        "docs/modules/workflow-execution.md",
        "docs/planning/no-autoplan.md",
        "docs/planning/phased-plans-recovery-followup.md",
        "packages/workflow-kit/README.md",
        "packages/workflow-kit/docs/modules/orchestrated-plans.md",
        "packages/workflow-kit/docs/modules/parallel-assignments.md",
        "packages/workflow-kit/docs/modules/workflow-kit-package.md"
      ]
    },
    {
      "id": "T010",
      "title": "Собрать выпуск 0.4.7 трёх ОС",
      "why": "Комплект после DOCS.",
      "dependencies": [
        "T009",
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
        "Три ОС из одного sourceCommit после DOCS; manifest совпадает"
      ],
      "expected_commit_message": "release: Собрать выпуск 0.4.7 трёх ОС",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-0-4-6",
        "task_id": "T010",
        "role": "implementation"
      },
      "actual_files": [
        "release-manifest.json"
      ]
    },
    {
      "id": "T011",
      "title": "Установить 0.4.7 в Applications",
      "why": "Обновить приложение.",
      "dependencies": [
        "T010",
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
        "Установка готового комплекта без пересборки; при работающей службе — pending"
      ],
      "expected_commit_message": "release: Установить 0.4.7 в Applications",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-0-4-6",
        "task_id": "T011",
        "role": "implementation"
      }
    },
    {
      "id": "T012",
      "title": "Опубликовать GitHub Release 0.4.7",
      "why": "Опубликовать комплект.",
      "dependencies": [
        "T011",
        "DOCS-2"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "github-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "Тег v0.4.7 на sourceCommit, assets сверены, remote main = HEAD"
      ],
      "expected_commit_message": "release: Опубликовать GitHub Release 0.4.7",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-0-4-6",
        "task_id": "T012",
        "role": "implementation"
      }
    }
  ],
  "blocked_reason": null,
  "user_decisions": [
    {
      "id": "b32e79c4-54b2-4028-88fc-bcd72d210d70",
      "text": "Пользователь поручил выполнить описанную задачу и план.",
      "recorded_at": "2026-10-17T13:34:56.499Z"
    }
  ]
}
```
<!-- workflow-state:end -->

## Состояние

Execution Scope Status: ACTIVE
Delivery Status: IN_PROGRESS
Scope: workflow-pilot-0-4-6
Current Task: нет
Revision: 395

## Цель

Выпуск 0.4.6: строка списка проектов показывает название по горизонтали, «В архив» — компактная кнопка справа

## Критерии приёмки

- Выпуск 0.4.6: строка списка проектов показывает название по горизонтали, «В архив» — компактная кнопка справа

## Микрозадачи

- [DONE] T001: Раскладка строки списка проектов — Завершено
  - Git Commit: [DONE] fix: Раскладка строки списка проектов
  - Reference: workflow-pilot-0-4-6 / T001 / implementation
  - Файлы: src/frontend/desktop/ui/index.html, tests/electron-smoke.mjs, docs/planning/project-list-layout.md
- [DONE] T002: Подготовить версию 0.4.6 — Завершено
  - Git Commit: [DONE] feat: Подготовить версию 0.4.6
  - Reference: workflow-pilot-0-4-6 / T002 / implementation
  - Файлы: package.json, package-lock.json, src/frontend/plugin/index.html, src/frontend/plugin/app.mjs, tests/backend-upgrade.test.mjs, docs/planning/project-list-layout.md
- [DONE] DOCS: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: актуализировать контекст проекта
  - Reference: workflow-pilot-0-4-6 / DOCS / implementation
  - Файлы: docs/planning/project-list-layout.md, README.md, docs/architecture/OVERVIEW.md, docs/modules/desktop.md
- [DONE] T003: Собрать выпуск 0.4.6 трёх ОС — Завершено
  - Git Commit: [DONE] release: Собрать выпуск 0.4.6 трёх ОС
  - Reference: workflow-pilot-0-4-6 / T003 / implementation
  - Файлы: release-manifest.json, docs/planning/project-list-layout.md
- [DONE] T004: Установить 0.4.6 в Applications — Завершено
  - Git Commit: [DONE] release: Установить 0.4.6 в Applications
  - Reference: workflow-pilot-0-4-6 / T004 / implementation
  - Файлы: release-manifest.json, docs/planning/project-list-layout.md
- [DONE] T005: Опубликовать GitHub Release 0.4.6 — Завершено
  - Git Commit: [DONE] release: Опубликовать GitHub Release 0.4.6
  - Reference: workflow-pilot-0-4-6 / T005 / implementation
  - Файлы: release-manifest.json, docs/planning/project-list-layout.md
- [DONE] T006: Kit без AutoPlan: запуск плана кнопкой — Завершено
  - Git Commit: [DONE] fix: Kit без AutoPlan — запуск плана кнопкой
  - Reference: workflow-pilot-0-4-6 / T006 / implementation
  - Файлы: packages/workflow-kit/src/lib/recovery.mjs, packages/workflow-kit/src/lib/command-help.mjs, packages/workflow-kit/src/lib/actions.mjs, packages/workflow-kit/src/lib/common.mjs, packages/workflow-kit/package.json, package-lock.json, packages/workflow-kit/src/lib/installer.mjs, docs/planning/no-autoplan.md, packages/workflow-kit/src/templates/PLAN.md, packages/workflow-kit/src/templates/PROTOTYPE.md, packages/workflow-kit/docs/modules/parallel-assignments.md
- [DONE] T008: Раскладка to-do plan и проверка проекта без сдвига — Завершено
  - Git Commit: [DONE] fix: Раскладка to-do plan и проверка проекта без сдвига
  - Reference: workflow-pilot-0-4-6 / T008 / implementation
  - Файлы: src/frontend/desktop/ui/index.html, src/frontend/desktop/ui/sidebar.mjs, tests/electron-smoke.mjs, tests/sidebar.test.mjs, docs/planning/no-autoplan.md
- [DONE] T007: Убрать AutoPlan из кода приложения — Завершено
  - Git Commit: [DONE] refactor: Убрать AutoPlan из кода приложения
  - Reference: workflow-pilot-0-4-6 / T007 / implementation
  - Файлы: src/control/workflow/coordination.mjs, src/backend/desktop-model.mjs, src/frontend/desktop/ui/sidebar.mjs, src/backend/bootstrap.mjs, src/backend/operations.mjs, src/control/projects/project-state-cleanup.mjs, src/control/sessions/workspace-session.mjs, src/control/settings/service.mjs, src/control/workflow/automation-send-state.mjs, src/control/workflow/executor-session.mjs, src/control/workflow/parallel-execution.mjs, src/control/workflow/parallel-kit.mjs, src/control/workflow/auto-plan-state.mjs, src/control/workflow/plan-continuation-state.mjs, src/control/workflow/auto-plan.mjs, src/control/workflow/plan-continuation.mjs, src/control/workflow/project-auto-plan.mjs, src/control/workflow/project-plan-continuation.mjs, src/control/workflow/project-session-auto-plan.mjs, src/control/workflow/project-session-plan-continuation.mjs, src/control/workflow/review-continuation.mjs, src/frontend/desktop/client.mjs, src/frontend/desktop/ui/index.html, tests/backend-api.test.mjs, tests/backend-browser-lifecycle.test.mjs, tests/context-session.test.mjs, tests/control-facade.test.mjs, tests/desktop-boundaries.test.mjs, tests/electron-smoke.mjs, tests/execution-architecture.test.mjs, tests/execution-control.test.mjs, tests/parallel-execution-recovery.test.mjs, tests/parallel-execution-smoke-fixture.cjs, tests/parallel-execution-ui.test.mjs, tests/parallel-execution.test.mjs, tests/parallel-finalization.test.mjs, tests/auto-plan-restart-fixture.cjs, tests/plan-continuation-restart-fixture.cjs, tests/auto-plan.test.mjs, tests/plan-continuation.test.mjs, tests/plan-review.test.mjs, tests/project-auto-plan.test.mjs, tests/project-plan-continuation.test.mjs, tests/project-state-cleanup.test.mjs, tests/settings-parallel-execution.test.mjs, tests/sidebar.test.mjs, tests/workspace-deletion.test.mjs, tests/workspace-session.test.mjs, tests/legacy-continuation-keys.test.mjs, docs/planning/no-autoplan.md
- [DONE] T009: Подготовить версию 0.4.7 — Завершено
  - Git Commit: [DONE] feat: Подготовить версию 0.4.7
  - Reference: workflow-pilot-0-4-6 / T009 / implementation
  - Файлы: package.json, package-lock.json, src/frontend/plugin/index.html, src/frontend/plugin/app.mjs, tests/backend-upgrade.test.mjs
- [DONE] DOCS-2: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: актуализировать документацию проекта
  - Reference: workflow-pilot-0-4-6 / DOCS-2 / implementation
  - Файлы: docs/architecture/OVERVIEW.md, AGENTS.md, README.md, docs/acceptance/backend-independence.md, docs/acceptance/migration-0.1.0.md, docs/modules/backend.md, docs/modules/browser.md, docs/modules/control.md, docs/modules/desktop.md, docs/modules/execution.md, docs/modules/orchestrated-execution.md, docs/modules/project-compatibility.md, docs/modules/remote-access.md, docs/modules/workflow-execution.md, docs/planning/no-autoplan.md, docs/planning/phased-plans-recovery-followup.md, packages/workflow-kit/README.md, packages/workflow-kit/docs/modules/orchestrated-plans.md, packages/workflow-kit/docs/modules/parallel-assignments.md, packages/workflow-kit/docs/modules/workflow-kit-package.md
- [DONE] T010: Собрать выпуск 0.4.7 трёх ОС — Завершено
  - Git Commit: [DONE] release: Собрать выпуск 0.4.7 трёх ОС
  - Reference: workflow-pilot-0-4-6 / T010 / implementation
  - Файлы: release-manifest.json
- [TODO] T011: Установить 0.4.7 в Applications — Ожидает
  - Git Commit: [PENDING] release: Установить 0.4.7 в Applications
  - Reference: workflow-pilot-0-4-6 / T011 / implementation
  - Файлы: release-manifest.json
- [TODO] T012: Опубликовать GitHub Release 0.4.7 — Ожидает
  - Git Commit: [PENDING] release: Опубликовать GitHub Release 0.4.7
  - Reference: workflow-pilot-0-4-6 / T012 / implementation
  - Файлы: release-manifest.json

## Context Pack For This Cycle

- docs/planning/project-list-layout.md
- docs/architecture/OVERVIEW.md
- docs/planning/no-autoplan.md

Служебные состояния меняются только командами workflow. Приёмка не архивирует scope.
