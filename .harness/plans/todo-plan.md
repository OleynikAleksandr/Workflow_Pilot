# Активный план — Workflow_Pilot

<!-- workflow-state:begin -->
```json
{
  "schema_version": 1,
  "plan_revision": 1060,
  "project_id": "7411e192-943c-4529-bffb-3b081d9c242f",
  "project_name": "Workflow_Pilot",
  "scope_id": "chat-session-without-modes",
  "execution_scope_status": "ACTIVE",
  "delivery_status": "IN_PROGRESS",
  "objective": "Полностью удалить зависимость от Work и выбора поверхности: надёжный Chat bootstrap, полная выдача контекста, диагностика Tray и выпуск 0.5.33 для трёх ОС.",
  "acceptance_criteria": [
    "Только Chat во всех активных контрактах, без чтения/миграции/архива Work.",
    "Первый проект и новая сессия проходят q → enroll → startup_context → SHA → chatUrl без переключателя.",
    "Идентичность, WAL, отмена, свежесть и no-replay сохранены.",
    "Изолированные проверки и полный Kit пройдены, опубликован полный проверенный комплект трёх ОС."
  ],
  "approved_scope": {
    "functional_paths": [
      "src/backend/bootstrap.mjs",
      "src/backend/desktop-model.mjs",
      "src/backend/operations.mjs",
      "src/chatgpt-experience.mjs",
      "src/contracts/desktop.mjs",
      "src/contracts/startup-view.mjs",
      "src/control/context/context-session.mjs",
      "src/control/facade.mjs",
      "src/control/plugin/enrollment.mjs",
      "src/control/sessions/service.mjs",
      "src/control/sessions/workspace-session.mjs",
      "src/control/workflow/coordination.mjs",
      "src/control/workflow/dialogue-delivery.mjs",
      "src/control/workflow/execution-projection.mjs",
      "src/control/workflow/executor-session.mjs",
      "src/control/workflow/project-session-plan-continuation.mjs",
      "src/execution/browser/chatgpt-composer.mjs",
      "src/execution/browser/chatgpt-dom.mjs",
      "src/execution/browser/chatgpt-experience.mjs",
      "src/execution/browser/chatgpt-page-observer.mjs",
      "src/execution/browser/page-state.mjs",
      "src/execution/browser/session-runtime.mjs",
      "src/execution/desktop-dependencies.mjs",
      "src/execution/facade.mjs",
      "src/frontend/desktop/preload.cjs",
      "src/frontend/desktop/ui/archive.html",
      "src/frontend/desktop/ui/archive.mjs",
      "src/frontend/desktop/ui/index.html",
      "src/frontend/desktop/ui/sidebar.mjs",
      "src/frontend/desktop/ui/workspace-setup.mjs",
      "tests/automatic-agent-dialogue.test.mjs",
      "tests/backend-api.test.mjs",
      "tests/backend-browser-lifecycle.test.mjs",
      "tests/backend-desktop-model.test.mjs",
      "tests/backend-upgrade.test.mjs",
      "tests/chatgpt-composer.test.mjs",
      "tests/chatgpt-dom.test.mjs",
      "tests/chatgpt-experience.test.mjs",
      "tests/context-session.test.mjs",
      "tests/control-facade.test.mjs",
      "tests/electron-smoke.mjs",
      "tests/fixtures/automatic-agent-dialogue.mjs",
      "tests/fixtures/executor-background-startup.mjs",
      "tests/migration-compatibility.test.mjs",
      "tests/page-state.test.mjs",
      "tests/parallel-execution-ui.test.mjs",
      "tests/parallel-execution.test.mjs",
      "tests/plugin-enrollment.test.mjs",
      "tests/project-doctor-ui.test.mjs",
      "tests/session-opening-performance.test.mjs",
      "tests/session-plans.test.mjs",
      "tests/session-runtime.test.mjs",
      "tests/sidebar.test.mjs",
      "tests/workspace-session.test.mjs",
      "src/contracts/browser.mjs",
      "src/execution/browser/chatgpt-title.mjs",
      "resources/chatgpt-page-observer-preload.cjs",
      "scripts/prepare-agent-dialogue-experiment.mjs",
      "packages/workflow-kit/src/lib/plan.mjs",
      "tests/startup-context.test.mjs",
      "scripts/check-search-extension.mjs",
      "src/backend/main.mjs",
      "src/backend/status-menu.mjs",
      "src/contracts/backend.mjs",
      "tests/backend-diagnostics.test.mjs",
      "tests/backend-shutdown.test.mjs",
      "package.json",
      "package-lock.json",
      "packages/workflow-kit/package.json",
      "packages/workflow-kit/src/lib/common.mjs",
      "packages/workflow-kit/src/lib/installation-files.mjs",
      "scripts/stage-workflow-kit.mjs",
      "tests/workflow-kit-upgrade.test.mjs",
      "release-manifest.json",
      "tests/chatgpt-plugin.test.mjs",
      "tests/chatgpt-title.test.mjs",
      "tests/dialogue-delivery.test.mjs",
      "tests/session-roles.test.mjs",
      "src/control/workflow/plan-continuation.mjs",
      "tests/fixtures/status-menu-electron.cjs",
      "packages/workflow-kit/src/lib/installer.mjs",
      "scripts/probe-chatgpt-file-paste.mjs",
      "tests/fixtures/released-kit/kit-1.9.8.tar.gz",
      "tests/fixtures/released-kit/manifest.json"
    ],
    "documentation_paths": [
      "README.md",
      "docs/acceptance/backend-independence.md",
      "docs/acceptance/chat-only-startup.md",
      "docs/acceptance/interruption-recovery.md",
      "docs/acceptance/migration-0.1.0.md",
      "docs/acceptance/orchestrated-execution.md",
      "docs/acceptance/remote-access.md",
      "docs/architecture/OVERVIEW.md",
      "docs/modules/assignment-dialogue-reliability.md",
      "docs/modules/assignment-dialogue.md",
      "docs/modules/automatic-agent-dialogue-acceptance.md",
      "docs/modules/backend-shutdown.md",
      "docs/modules/backend.md",
      "docs/modules/browser.md",
      "docs/modules/chat-only-startup.md",
      "docs/modules/chatgpt-plugin-acceptance.md",
      "docs/modules/chatgpt-plugin.md",
      "docs/modules/chatgpt-search-extension.md",
      "docs/modules/control.md",
      "docs/modules/desktop.md",
      "docs/modules/dialogue-timing.md",
      "docs/modules/execution.md",
      "docs/modules/first-run-onboarding.md",
      "docs/modules/linux.md",
      "docs/modules/native-window.md",
      "docs/modules/orchestrated-execution.md",
      "docs/modules/orchestrator-startup.md",
      "docs/modules/plugin-communication-handoff.md",
      "docs/modules/project-compatibility.md",
      "docs/modules/project-lifecycle.md",
      "docs/modules/release.md",
      "docs/modules/remote-access.md",
      "docs/modules/user-choice.md",
      "docs/modules/workflow-execution.md",
      "docs/planning/backend-independence-followup.md",
      "docs/planning/chat-session-without-modes.md",
      "docs/planning/executor-readiness-recovery.md",
      "docs/planning/native-startup-followup.md",
      "docs/planning/phased-plans-recovery-followup.md",
      "docs/planning/plan-start-recovery.md",
      "docs/planning/recovery-and-interruption-2026-10.md",
      "docs/planning/recovery-and-interruption-todo-draft.md",
      "docs/planning/review-instructions-followup.md",
      "packages/workflow-kit/README.md",
      "packages/workflow-kit/docs/modules/orchestrated-plans.md",
      "packages/workflow-kit/docs/modules/parallel-assignments.md",
      "packages/workflow-kit/docs/modules/workflow-kit-package.md"
    ]
  },
  "baseline_commit": "2abec8cab8dc8308ee8d96b4f5fdbaee0b045a12",
  "current_task_id": null,
  "context_pack": {
    "documents": [
      {
        "path": "docs/planning/chat-session-without-modes.md",
        "required": true,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/modules/chat-only-startup.md",
        "required": false,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/modules/release.md",
        "required": false,
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
        "scope_id": "chat-session-without-modes",
        "task_id": "CORE",
        "role": "implementation"
      },
      "dependencies": [],
      "functional_paths": [
        "src/backend/bootstrap.mjs",
        "src/backend/desktop-model.mjs",
        "src/backend/operations.mjs",
        "src/chatgpt-experience.mjs",
        "src/contracts/desktop.mjs",
        "src/contracts/startup-view.mjs",
        "src/control/context/context-session.mjs",
        "src/control/facade.mjs",
        "src/control/plugin/enrollment.mjs",
        "src/control/sessions/service.mjs",
        "src/control/sessions/workspace-session.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/control/workflow/execution-projection.mjs",
        "src/control/workflow/executor-session.mjs",
        "src/control/workflow/project-session-plan-continuation.mjs",
        "src/execution/browser/chatgpt-composer.mjs",
        "src/execution/browser/chatgpt-dom.mjs",
        "src/execution/browser/chatgpt-experience.mjs",
        "src/execution/browser/chatgpt-page-observer.mjs",
        "src/execution/browser/page-state.mjs",
        "src/execution/browser/session-runtime.mjs",
        "src/execution/desktop-dependencies.mjs",
        "src/execution/facade.mjs",
        "src/frontend/desktop/preload.cjs",
        "src/frontend/desktop/ui/archive.html",
        "src/frontend/desktop/ui/archive.mjs",
        "src/frontend/desktop/ui/index.html",
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/frontend/desktop/ui/workspace-setup.mjs",
        "tests/automatic-agent-dialogue.test.mjs",
        "tests/backend-api.test.mjs",
        "tests/backend-browser-lifecycle.test.mjs",
        "tests/backend-desktop-model.test.mjs",
        "tests/backend-upgrade.test.mjs",
        "tests/chatgpt-composer.test.mjs",
        "tests/chatgpt-dom.test.mjs",
        "tests/chatgpt-experience.test.mjs",
        "tests/context-session.test.mjs",
        "tests/control-facade.test.mjs",
        "tests/electron-smoke.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/fixtures/executor-background-startup.mjs",
        "tests/migration-compatibility.test.mjs",
        "tests/page-state.test.mjs",
        "tests/parallel-execution-ui.test.mjs",
        "tests/parallel-execution.test.mjs",
        "tests/plugin-enrollment.test.mjs",
        "tests/project-doctor-ui.test.mjs",
        "tests/session-opening-performance.test.mjs",
        "tests/session-plans.test.mjs",
        "tests/session-runtime.test.mjs",
        "tests/sidebar.test.mjs",
        "tests/workspace-session.test.mjs",
        "src/contracts/browser.mjs",
        "src/execution/browser/chatgpt-title.mjs",
        "resources/chatgpt-page-observer-preload.cjs",
        "scripts/prepare-agent-dialogue-experiment.mjs",
        "packages/workflow-kit/src/lib/plan.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/chatgpt-title.test.mjs",
        "tests/dialogue-delivery.test.mjs",
        "tests/session-roles.test.mjs",
        "tests/startup-context.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "startup-recovery",
        "architecture"
      ],
      "id": "CORE",
      "title": "fix: удалить режимы сессии из всех слоёв приложения",
      "why": "Chat запускается, связывается и получает полный контекст без переключателя и modeConfirmed.",
      "acceptance_criteria": [
        "Chat запускается, связывается и получает полный контекст без переключателя и modeConfirmed.",
        "API/UI/DOM/store/URL/планировщик не поддерживают Work, его историю или выбор поверхности.",
        "Chat-записи обновляются без изменения ID, повторного q и обхода свежести/принадлежности/отзыва.",
        "Инструкции scripts/prepare-agent-dialogue-experiment.mjs описывают только Chat.",
        "Причины stale/cancel/pause/login/ownership различаются; неподдерживаемые URL дают общий отказ без определения режима."
      ],
      "expected_commit_message": "fix: удалить режимы сессии из всех слоёв приложения",
      "parallel_safe": false,
      "actual_files": [
        "packages/workflow-kit/src/lib/plan.mjs",
        "scripts/prepare-agent-dialogue-experiment.mjs",
        "src/backend/bootstrap.mjs",
        "src/backend/desktop-model.mjs",
        "src/backend/operations.mjs",
        "src/contracts/browser.mjs",
        "src/contracts/desktop.mjs",
        "src/contracts/startup-view.mjs",
        "src/control/context/context-session.mjs",
        "src/control/facade.mjs",
        "src/control/plugin/enrollment.mjs",
        "src/control/sessions/service.mjs",
        "src/control/sessions/workspace-session.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/control/workflow/execution-projection.mjs",
        "src/control/workflow/executor-session.mjs",
        "src/control/workflow/project-session-plan-continuation.mjs",
        "src/execution/browser/chatgpt-composer.mjs",
        "src/execution/browser/chatgpt-dom.mjs",
        "src/execution/browser/chatgpt-experience.mjs",
        "src/execution/browser/chatgpt-page-observer.mjs",
        "src/execution/browser/chatgpt-title.mjs",
        "src/execution/browser/page-state.mjs",
        "src/execution/desktop-dependencies.mjs",
        "src/execution/facade.mjs",
        "src/frontend/desktop/preload.cjs",
        "src/frontend/desktop/ui/archive.html",
        "src/frontend/desktop/ui/archive.mjs",
        "src/frontend/desktop/ui/index.html",
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/frontend/desktop/ui/workspace-setup.mjs",
        "tests/backend-desktop-model.test.mjs",
        "tests/chatgpt-composer.test.mjs",
        "tests/chatgpt-dom.test.mjs",
        "tests/chatgpt-experience.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/chatgpt-title.test.mjs",
        "tests/context-session.test.mjs",
        "tests/control-facade.test.mjs",
        "tests/dialogue-delivery.test.mjs",
        "tests/electron-smoke.mjs",
        "tests/migration-compatibility.test.mjs",
        "tests/session-roles.test.mjs",
        "tests/session-runtime.test.mjs",
        "tests/sidebar.test.mjs",
        "tests/startup-context.test.mjs",
        "tests/workspace-session.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "chat-session-without-modes",
        "task_id": "PROOF",
        "role": "implementation"
      },
      "dependencies": [
        "CORE"
      ],
      "functional_paths": [
        "tests/electron-smoke.mjs",
        "tests/context-session.test.mjs",
        "tests/startup-context.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/fixtures/executor-background-startup.mjs",
        "scripts/check-search-extension.mjs",
        "src/backend/desktop-model.mjs",
        "src/control/sessions/workspace-session.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/control/workflow/plan-continuation.mjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "tests/automatic-agent-dialogue.test.mjs",
        "tests/backend-api.test.mjs",
        "tests/backend-browser-lifecycle.test.mjs",
        "tests/backend-upgrade.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/control-facade.test.mjs",
        "tests/page-state.test.mjs",
        "tests/parallel-execution-ui.test.mjs",
        "tests/parallel-execution.test.mjs",
        "tests/plugin-enrollment.test.mjs",
        "tests/project-doctor-ui.test.mjs",
        "tests/session-opening-performance.test.mjs",
        "tests/session-runtime.test.mjs",
        "tests/sidebar.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "electron-smoke",
        "search-extension-native",
        "architecture"
      ],
      "id": "PROOF",
      "title": "test: проверить полный Chat bootstrap без переключателя",
      "why": "Настоящий изолированный Electron с официальным расширением проходит первый проект и новый Chat без mode controls.",
      "acceptance_criteria": [
        "Настоящий изолированный Electron с официальным расширением проходит первый проект и новый Chat без mode controls.",
        "Первый panel возвращает полный контекст, адрес связывается при обоих порядках enroll/URL; q и первоначальное сообщение ровно один раз.",
        "Отмена, вход, draft, смена попытки, stale packet и crash/restart не обходят ограничения.",
        "Fixtures проверяют точные причины отказа, строгий URL allowlist и refresh без q.",
        "Fixtures проверяют точные причины отказа, строгий URL allowlist и refresh без q. Полная Node suite пройдена в первом запуске PROOF; её финальная проверка перенесена в VERSION после всех функциональных правок и до DOCS."
      ],
      "expected_commit_message": "test: проверить полный Chat bootstrap без переключателя",
      "parallel_safe": false,
      "actual_files": [
        "src/backend/desktop-model.mjs",
        "src/control/sessions/workspace-session.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/control/workflow/plan-continuation.mjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "tests/automatic-agent-dialogue.test.mjs",
        "tests/backend-api.test.mjs",
        "tests/backend-browser-lifecycle.test.mjs",
        "tests/backend-upgrade.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/context-session.test.mjs",
        "tests/control-facade.test.mjs",
        "tests/electron-smoke.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/fixtures/executor-background-startup.mjs",
        "tests/page-state.test.mjs",
        "tests/parallel-execution-ui.test.mjs",
        "tests/parallel-execution.test.mjs",
        "tests/plugin-enrollment.test.mjs",
        "tests/project-doctor-ui.test.mjs",
        "tests/session-opening-performance.test.mjs",
        "tests/session-runtime.test.mjs",
        "tests/sidebar.test.mjs",
        "tests/startup-context.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "chat-session-without-modes",
        "task_id": "TRAY",
        "role": "implementation"
      },
      "dependencies": [
        "PROOF"
      ],
      "functional_paths": [
        "src/backend/main.mjs",
        "src/backend/status-menu.mjs",
        "src/contracts/backend.mjs",
        "tests/backend-diagnostics.test.mjs",
        "tests/backend-shutdown.test.mjs",
        "tests/fixtures/status-menu-electron.cjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "force-stop",
        "native-startup-dock",
        "architecture"
      ],
      "id": "TRAY",
      "title": "fix: диагностировать и восстанавливать значок службы",
      "why": "Результат создания Tray и безопасные причины отказа наблюдаемы.",
      "acceptance_criteria": [
        "Доступность значка, число попыток и безопасный этап отказа публикуются в диагностике и service.status backend; без чувствительных данных.",
        "Повтор ограничен и отменяется при dispose; меню статуса корректно и без значка.",
        "Работающую пользовательскую службу не останавливать."
      ],
      "expected_commit_message": "fix: диагностировать и восстанавливать значок службы",
      "parallel_safe": false,
      "actual_files": [
        "src/backend/main.mjs",
        "src/backend/status-menu.mjs",
        "tests/backend-diagnostics.test.mjs",
        "tests/backend-shutdown.test.mjs",
        "tests/fixtures/status-menu-electron.cjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "chat-session-without-modes",
        "task_id": "VERSION",
        "role": "implementation"
      },
      "dependencies": [
        "TRAY"
      ],
      "functional_paths": [
        "package.json",
        "package-lock.json",
        "src/contracts/backend.mjs",
        "packages/workflow-kit/package.json",
        "packages/workflow-kit/src/lib/common.mjs",
        "packages/workflow-kit/src/lib/installation-files.mjs",
        "scripts/stage-workflow-kit.mjs",
        "tests/workflow-kit-upgrade.test.mjs",
        "packages/workflow-kit/src/lib/installer.mjs",
        "scripts/probe-chatgpt-file-paste.mjs",
        "tests/fixtures/released-kit/kit-1.9.8.tar.gz",
        "tests/fixtures/released-kit/manifest.json"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "chatgpt-plugin",
        "release-tooling",
        "kit-check",
        "kit-assignments",
        "kit-upgrade",
        "unit-all"
      ],
      "id": "VERSION",
      "title": "chore: подготовить версии приложения и Kit",
      "why": "Приложение 0.5.33 и новая версия Kit согласованы в исходниках, lock и генерируемых ресурсах.",
      "acceptance_criteria": [
        "Приложение 0.5.33 и новая версия Kit согласованы в исходниках, lock и генерируемых ресурсах."
      ],
      "expected_commit_message": "chore: подготовить версии приложения и Kit",
      "parallel_safe": false,
      "actual_files": [
        "package-lock.json",
        "package.json",
        "packages/workflow-kit/package.json",
        "packages/workflow-kit/src/lib/common.mjs",
        "packages/workflow-kit/src/lib/installer.mjs",
        "scripts/probe-chatgpt-file-paste.mjs",
        "src/contracts/backend.mjs",
        "tests/fixtures/released-kit/kit-1.9.8.tar.gz",
        "tests/fixtures/released-kit/manifest.json",
        "tests/workflow-kit-upgrade.test.mjs"
      ]
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "chat-session-without-modes",
        "task_id": "DOCS",
        "role": "implementation"
      },
      "dependencies": [
        "CORE",
        "PROOF",
        "TRAY",
        "VERSION"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "README.md",
        "docs/acceptance/backend-independence.md",
        "docs/acceptance/chat-only-startup.md",
        "docs/acceptance/interruption-recovery.md",
        "docs/acceptance/migration-0.1.0.md",
        "docs/acceptance/orchestrated-execution.md",
        "docs/acceptance/remote-access.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/assignment-dialogue-reliability.md",
        "docs/modules/assignment-dialogue.md",
        "docs/modules/automatic-agent-dialogue-acceptance.md",
        "docs/modules/backend-shutdown.md",
        "docs/modules/backend.md",
        "docs/modules/browser.md",
        "docs/modules/chat-only-startup.md",
        "docs/modules/chatgpt-plugin-acceptance.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/chatgpt-search-extension.md",
        "docs/modules/control.md",
        "docs/modules/desktop.md",
        "docs/modules/dialogue-timing.md",
        "docs/modules/execution.md",
        "docs/modules/first-run-onboarding.md",
        "docs/modules/linux.md",
        "docs/modules/native-window.md",
        "docs/modules/orchestrated-execution.md",
        "docs/modules/orchestrator-startup.md",
        "docs/modules/plugin-communication-handoff.md",
        "docs/modules/project-compatibility.md",
        "docs/modules/project-lifecycle.md",
        "docs/modules/release.md",
        "docs/modules/remote-access.md",
        "docs/modules/user-choice.md",
        "docs/modules/workflow-execution.md",
        "docs/planning/backend-independence-followup.md",
        "docs/planning/chat-session-without-modes.md",
        "docs/planning/executor-readiness-recovery.md",
        "docs/planning/native-startup-followup.md",
        "docs/planning/phased-plans-recovery-followup.md",
        "docs/planning/plan-start-recovery.md",
        "docs/planning/recovery-and-interruption-2026-10.md",
        "docs/planning/recovery-and-interruption-todo-draft.md",
        "docs/planning/review-instructions-followup.md",
        "packages/workflow-kit/README.md",
        "packages/workflow-kit/docs/modules/orchestrated-plans.md",
        "packages/workflow-kit/docs/modules/parallel-assignments.md",
        "packages/workflow-kit/docs/modules/workflow-kit-package.md"
      ],
      "verification_ids": [],
      "id": "DOCS",
      "title": "Актуализация всех документов проекта",
      "why": "Все действующие контракты описывают Chat без определения режима.",
      "acceptance_criteria": [
        "Все действующие контракты описывают Chat без определения режима.",
        "Спецификация перенесена в модули и удалена, ограничения live/native сохранены."
      ],
      "expected_commit_message": "docs: обновить контракты единственного Chat",
      "parallel_safe": false
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "chat-session-without-modes",
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
        "kit-check",
        "kit-assignments",
        "three-platform-release"
      ],
      "id": "RELEASE",
      "title": "build: собрать и проверить три платформы",
      "why": "Полный Kit: kit-check и kit-assignments PASSED.",
      "acceptance_criteria": [
        "Полный Kit: kit-check и kit-assignments PASSED.",
        "После DOCS из одного sourceCommit собраны macOS arm64, Windows x64, Linux x64; состав, подпись, архивы и SHA проверены.",
        "Перед каждой production-сборкой удалены только точные Python-кэши tools/codex-app-server-mcp без симлинков."
      ],
      "expected_commit_message": "build: собрать и проверить три платформы",
      "parallel_safe": false,
      "verification_kind": "package"
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "chat-session-without-modes",
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
      "title": "delivery: установить проверенное приложение macOS",
      "why": "Обе собственные macOS-копии установлены штатным installer либо pending при активном backend, подтверждены manifest/подпись/версия и rollback.",
      "acceptance_criteria": [
        "Обе собственные macOS-копии установлены штатным installer либо pending при активном backend, подтверждены manifest/подпись/версия и rollback.",
        "Никакой пересборки, переподписи, остановки службы или окна."
      ],
      "expected_commit_message": "delivery: установить проверенное приложение macOS",
      "parallel_safe": false,
      "verification_kind": "installed"
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "chat-session-without-modes",
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
      "title": "release: опубликовать полный GitHub комплект",
      "why": "Опубликован полный GitHub Release 0.5.33; все assets сверены по SHA/size, тег указывает на sourceCommit.",
      "acceptance_criteria": [
        "Опубликован полный GitHub Release 0.5.33; все assets сверены по SHA/size, тег указывает на sourceCommit.",
        "Финальный main отправлен в remote, после metadata-коммита повторён read-only verifier; план READY_FOR_ACCEPTANCE."
      ],
      "expected_commit_message": "release: опубликовать полный GitHub комплект",
      "parallel_safe": false,
      "verification_kind": "package"
    }
  ],
  "blocked_reason": null,
  "user_decisions": [
    {
      "id": "a0566a8b-c55d-4aa8-aa22-c46b33b00653",
      "text": "Пользователь поручил закрыть прежний план, выполнить все исправления без поддержки старых Work-сессий, собрать и опубликовать релизы.",
      "recorded_at": "2026-10-24T18:45:02.783Z"
    }
  ],
  "parallel_allowed": false,
  "max_workers": 1,
  "execution_strategy": "sequential",
  "execution_reason": "Пользователь поручил выполнить всю разработку самому агенту; изменения проходят сквозные контракты общих файлов и не допускают независимой выдачи без интеграционных промежутков."
}
```
<!-- workflow-state:end -->

## Состояние

Execution Scope Status: ACTIVE
Delivery Status: IN_PROGRESS
Scope: chat-session-without-modes
Current Task: нет
Revision: 1060

## Цель

Полностью удалить зависимость от Work и выбора поверхности: надёжный Chat bootstrap, полная выдача контекста, диагностика Tray и выпуск 0.5.33 для трёх ОС.

## Критерии приёмки

- Только Chat во всех активных контрактах, без чтения/миграции/архива Work.
- Первый проект и новая сессия проходят q → enroll → startup_context → SHA → chatUrl без переключателя.
- Идентичность, WAL, отмена, свежесть и no-replay сохранены.
- Изолированные проверки и полный Kit пройдены, опубликован полный проверенный комплект трёх ОС.

## Микрозадачи

Выполнение: sequential; разрешено: false; лимит: 1
Причина: Пользователь поручил выполнить всю разработку самому агенту; изменения проходят сквозные контракты общих файлов и не допускают независимой выдачи без интеграционных промежутков.

- [DONE] CORE: fix: удалить режимы сессии из всех слоёв приложения — Завершено
  - Git Commit: [DONE] fix: удалить режимы сессии из всех слоёв приложения
  - Reference: chat-session-without-modes / CORE / implementation
  - Файлы: src/backend/bootstrap.mjs, src/backend/desktop-model.mjs, src/backend/operations.mjs, src/chatgpt-experience.mjs, src/contracts/desktop.mjs, src/contracts/startup-view.mjs, src/control/context/context-session.mjs, src/control/facade.mjs, src/control/plugin/enrollment.mjs, src/control/sessions/service.mjs, src/control/sessions/workspace-session.mjs, src/control/workflow/coordination.mjs, src/control/workflow/dialogue-delivery.mjs, src/control/workflow/execution-projection.mjs, src/control/workflow/executor-session.mjs, src/control/workflow/project-session-plan-continuation.mjs, src/execution/browser/chatgpt-composer.mjs, src/execution/browser/chatgpt-dom.mjs, src/execution/browser/chatgpt-experience.mjs, src/execution/browser/chatgpt-page-observer.mjs, src/execution/browser/page-state.mjs, src/execution/browser/session-runtime.mjs, src/execution/desktop-dependencies.mjs, src/execution/facade.mjs, src/frontend/desktop/preload.cjs, src/frontend/desktop/ui/archive.html, src/frontend/desktop/ui/archive.mjs, src/frontend/desktop/ui/index.html, src/frontend/desktop/ui/sidebar.mjs, src/frontend/desktop/ui/workspace-setup.mjs, tests/automatic-agent-dialogue.test.mjs, tests/backend-api.test.mjs, tests/backend-browser-lifecycle.test.mjs, tests/backend-desktop-model.test.mjs, tests/backend-upgrade.test.mjs, tests/chatgpt-composer.test.mjs, tests/chatgpt-dom.test.mjs, tests/chatgpt-experience.test.mjs, tests/context-session.test.mjs, tests/control-facade.test.mjs, tests/electron-smoke.mjs, tests/fixtures/automatic-agent-dialogue.mjs, tests/fixtures/executor-background-startup.mjs, tests/migration-compatibility.test.mjs, tests/page-state.test.mjs, tests/parallel-execution-ui.test.mjs, tests/parallel-execution.test.mjs, tests/plugin-enrollment.test.mjs, tests/project-doctor-ui.test.mjs, tests/session-opening-performance.test.mjs, tests/session-plans.test.mjs, tests/session-runtime.test.mjs, tests/sidebar.test.mjs, tests/workspace-session.test.mjs, src/contracts/browser.mjs, src/execution/browser/chatgpt-title.mjs, resources/chatgpt-page-observer-preload.cjs, scripts/prepare-agent-dialogue-experiment.mjs, packages/workflow-kit/src/lib/plan.mjs, tests/chatgpt-plugin.test.mjs, tests/chatgpt-title.test.mjs, tests/dialogue-delivery.test.mjs, tests/session-roles.test.mjs, tests/startup-context.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] PROOF: test: проверить полный Chat bootstrap без переключателя — Завершено
  - Git Commit: [DONE] test: проверить полный Chat bootstrap без переключателя
  - Reference: chat-session-without-modes / PROOF / implementation
  - Файлы: tests/electron-smoke.mjs, tests/context-session.test.mjs, tests/startup-context.test.mjs, tests/fixtures/automatic-agent-dialogue.mjs, tests/fixtures/executor-background-startup.mjs, scripts/check-search-extension.mjs, src/backend/desktop-model.mjs, src/control/sessions/workspace-session.mjs, src/control/workflow/dialogue-delivery.mjs, src/control/workflow/plan-continuation.mjs, src/frontend/desktop/ui/sidebar.mjs, tests/automatic-agent-dialogue.test.mjs, tests/backend-api.test.mjs, tests/backend-browser-lifecycle.test.mjs, tests/backend-upgrade.test.mjs, tests/chatgpt-plugin.test.mjs, tests/control-facade.test.mjs, tests/page-state.test.mjs, tests/parallel-execution-ui.test.mjs, tests/parallel-execution.test.mjs, tests/plugin-enrollment.test.mjs, tests/project-doctor-ui.test.mjs, tests/session-opening-performance.test.mjs, tests/session-runtime.test.mjs, tests/sidebar.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: CORE
- [DONE] TRAY: fix: диагностировать и восстанавливать значок службы — Завершено
  - Git Commit: [DONE] fix: диагностировать и восстанавливать значок службы
  - Reference: chat-session-without-modes / TRAY / implementation
  - Файлы: src/backend/main.mjs, src/backend/status-menu.mjs, src/contracts/backend.mjs, tests/backend-diagnostics.test.mjs, tests/backend-shutdown.test.mjs, tests/fixtures/status-menu-electron.cjs
  - Параллельность: исключительное выполнение
  - Зависимости: PROOF
- [DONE] VERSION: chore: подготовить версии приложения и Kit — Завершено
  - Git Commit: [DONE] chore: подготовить версии приложения и Kit
  - Reference: chat-session-without-modes / VERSION / implementation
  - Файлы: package.json, package-lock.json, src/contracts/backend.mjs, packages/workflow-kit/package.json, packages/workflow-kit/src/lib/common.mjs, packages/workflow-kit/src/lib/installation-files.mjs, scripts/stage-workflow-kit.mjs, tests/workflow-kit-upgrade.test.mjs, packages/workflow-kit/src/lib/installer.mjs, scripts/probe-chatgpt-file-paste.mjs, tests/fixtures/released-kit/kit-1.9.8.tar.gz, tests/fixtures/released-kit/manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: TRAY
- [TODO] DOCS: Актуализация всех документов проекта — Ожидает
  - Git Commit: [PENDING] docs: обновить контракты единственного Chat
  - Reference: chat-session-without-modes / DOCS / implementation
  - Файлы: README.md, docs/acceptance/backend-independence.md, docs/acceptance/chat-only-startup.md, docs/acceptance/interruption-recovery.md, docs/acceptance/migration-0.1.0.md, docs/acceptance/orchestrated-execution.md, docs/acceptance/remote-access.md, docs/architecture/OVERVIEW.md, docs/modules/assignment-dialogue-reliability.md, docs/modules/assignment-dialogue.md, docs/modules/automatic-agent-dialogue-acceptance.md, docs/modules/backend-shutdown.md, docs/modules/backend.md, docs/modules/browser.md, docs/modules/chat-only-startup.md, docs/modules/chatgpt-plugin-acceptance.md, docs/modules/chatgpt-plugin.md, docs/modules/chatgpt-search-extension.md, docs/modules/control.md, docs/modules/desktop.md, docs/modules/dialogue-timing.md, docs/modules/execution.md, docs/modules/first-run-onboarding.md, docs/modules/linux.md, docs/modules/native-window.md, docs/modules/orchestrated-execution.md, docs/modules/orchestrator-startup.md, docs/modules/plugin-communication-handoff.md, docs/modules/project-compatibility.md, docs/modules/project-lifecycle.md, docs/modules/release.md, docs/modules/remote-access.md, docs/modules/user-choice.md, docs/modules/workflow-execution.md, docs/planning/backend-independence-followup.md, docs/planning/chat-session-without-modes.md, docs/planning/executor-readiness-recovery.md, docs/planning/native-startup-followup.md, docs/planning/phased-plans-recovery-followup.md, docs/planning/plan-start-recovery.md, docs/planning/recovery-and-interruption-2026-10.md, docs/planning/recovery-and-interruption-todo-draft.md, docs/planning/review-instructions-followup.md, packages/workflow-kit/README.md, packages/workflow-kit/docs/modules/orchestrated-plans.md, packages/workflow-kit/docs/modules/parallel-assignments.md, packages/workflow-kit/docs/modules/workflow-kit-package.md
  - Параллельность: исключительное выполнение
  - Зависимости: CORE, PROOF, TRAY, VERSION
- [TODO] RELEASE: build: собрать и проверить три платформы — Ожидает
  - Git Commit: [PENDING] build: собрать и проверить три платформы
  - Reference: chat-session-without-modes / RELEASE / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: DOCS
- [TODO] INSTALL: delivery: установить проверенное приложение macOS — Ожидает
  - Git Commit: [PENDING] delivery: установить проверенное приложение macOS
  - Reference: chat-session-without-modes / INSTALL / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: RELEASE, DOCS
- [TODO] PUBLISH: release: опубликовать полный GitHub комплект — Ожидает
  - Git Commit: [PENDING] release: опубликовать полный GitHub комплект
  - Reference: chat-session-without-modes / PUBLISH / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: INSTALL, DOCS

## Context Pack For This Cycle

- docs/planning/chat-session-without-modes.md
- docs/modules/chat-only-startup.md
- docs/modules/release.md
- docs/architecture/OVERVIEW.md

Служебные состояния меняются только командами workflow. Приёмка не архивирует scope.
