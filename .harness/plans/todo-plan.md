# Активный план — Workflow_Pilot

<!-- workflow-state:begin -->
```json
{
  "schema_version": 1,
  "plan_revision": 88,
  "project_id": "7411e192-943c-4529-bffb-3b081d9c242f",
  "project_name": "Workflow_Pilot",
  "scope_id": "workflow-pilot-migration-0.1.0",
  "execution_scope_status": "ACTIVE",
  "delivery_status": "IN_PROGRESS",
  "objective": "Перенести Project Web Pilot 0.6.115 в самостоятельный Workflow Pilot 0.1.0 с Control/Execution/Frontend, сохранив поведение и выпустив macOS, Windows и Linux из одной базы.",
  "acceptance_criteria": [
    "Самостоятельное приложение 0.1.0 сохраняет поведение 0.6.115, AutoPlan/Review/sequential/parallel, recovery и оба способа подключения; состояние донора не изменено.",
    "Control/Execution/Frontend реально разделены, фасады закрывают внутреннее состояние, Kit единственный владелец плана; динамические/пакетные входы не потеряны.",
    "Проект базового Kit 1.7.2 открывается и продолжается без импорта старого app-state и потери плана; изменения Kit только в новом проекте.",
    "Первый общий выпуск содержит macOS arm64, Windows x64 и Linux x64 Ubuntu24.04/X11 с одним sourceCommit и проверенными artifacts; native/VM/clean приёмка отмечена фактически.",
    "Будущая оркестрация сохранена отдельным невыполненным документом; первый план не реализует новую схему и не удаляет AutoPlan."
  ],
  "approved_scope": {
    "functional_paths": [
      "package.json",
      "package-lock.json",
      ".gitignore",
      "src/main.mjs",
      "src/common.mjs",
      "src/platform.mjs",
      "src/control/facade.mjs",
      "src/execution/facade.mjs",
      "src/frontend/desktop/bootstrap.mjs",
      "scripts/release-all.mjs",
      "scripts/prepare-windows-toolchain.mjs",
      "scripts/prepare-mac-toolchain.mjs",
      "scripts/stage-workflow-kit.mjs",
      "scripts/stage-page-observer.mjs",
      "resources/mac-permissions.plist",
      "resources/workspace-setup-worker.mjs",
      "resources/runtime-control/windows-control.py",
      "tools/codex-app-server-mcp/control.py",
      "tools/codex-app-server-mcp/server.py",
      "tools/codex-app-server-mcp/app_server_client.py",
      "tools/codex-app-server-mcp/codex-tools.lock.json",
      "tools/codex-app-server-mcp/requirements.txt",
      "tools/codex-app-server-mcp/windows_desktop.py",
      "tools/codex-app-server-mcp/linux_desktop.py",
      "packages/workflow-kit/package.json",
      "packages/workflow-kit/src/cli.mjs",
      "packages/workflow-kit/src/install.mjs",
      "packages/workflow-kit/src/lib/transaction.mjs",
      "packages/workflow-kit/src/lib/task-integration.mjs",
      "packages/workflow-kit/src/lib/validate.mjs",
      "packages/workflow-kit/src/lib/task-assignment.mjs",
      "packages/workflow-kit/src/lib/actions.mjs",
      "packages/workflow-kit/src/lib/plan-review.mjs",
      "packages/workflow-kit/src/lib/recovery.mjs",
      "tests/workspace-session.test.mjs",
      "tests/session-runtime.test.mjs",
      "tests/parallel-execution.test.mjs",
      "tests/project-auto-plan.test.mjs",
      "tests/electron-smoke.mjs",
      "tests/codex-app-server-mcp.test.mjs",
      "LICENSE",
      "src/execution/commands/service.mjs",
      "src/execution/files/adapter.mjs",
      "src/execution/runtime/service.mjs",
      "src/execution/platform/paths.mjs",
      "src/execution/browser/session-runtime.mjs",
      "src/contracts/control.mjs",
      "src/contracts/execution.mjs",
      "src/contracts/errors.mjs",
      "src/mac-runtime-switch.mjs",
      "src/windows-runtime.mjs",
      "src/vps-tunnel.mjs",
      "resources/runtime-control/linux-control.py",
      ".dependency-cruiser.cjs",
      "tests/command-activity.test.mjs",
      "tests/mcp-runtime.test.mjs",
      "tests/mac-runtime-switch.test.mjs",
      "tests/windows-runtime.test.mjs",
      "tests/vps-tunnel.test.mjs",
      "src/mcp-runtime.mjs",
      "src/execution/browser/chatgpt-dom.mjs",
      "src/execution/browser/chatgpt-composer.mjs",
      "src/execution/browser/chatgpt-experience.mjs",
      "src/execution/browser/chatgpt-page-observer.mjs",
      "src/execution/browser/page-state.mjs",
      "src/session-runtime.mjs",
      "src/conversation-recovery.mjs",
      "src/chatgpt-dom.mjs",
      "src/chatgpt-composer.mjs",
      "src/chatgpt-experience.mjs",
      "src/chatgpt-page-observer.mjs",
      "tests/chatgpt-dom.test.mjs",
      "tests/chatgpt-composer.test.mjs",
      "tests/page-state.test.mjs",
      "tests/conversation-recovery.test.mjs",
      "src/page-state.mjs",
      "src/page-state-bridge.mjs",
      "src/chatgpt-auto-scroll.mjs",
      "src/chatgpt-colors.mjs",
      "src/chatgpt-title.mjs",
      "src/chatgpt-tool-filter.mjs",
      "src/automation-send-state.mjs",
      "src/agent-timer.mjs",
      "src/control/projects/service.mjs",
      "src/control/projects/workspace-setup.mjs",
      "src/control/projects/workspace-deletion.mjs",
      "src/control/projects/project-doctor.mjs",
      "src/control/sessions/service.mjs",
      "src/control/sessions/workspace-session.mjs",
      "src/control/sessions/conversation-recovery.mjs",
      "src/control/context/service.mjs",
      "src/control/context/context-session.mjs",
      "src/control/context/context-inputs.mjs",
      "src/control/context/context-cache.mjs",
      "src/workspace-session.mjs",
      "src/session-plans.mjs",
      "src/context-session.mjs",
      "src/context-inputs.mjs",
      "src/context-cache.mjs",
      "tests/session-plans.test.mjs",
      "tests/context-session.test.mjs",
      "tests/context-cache.test.mjs",
      "src/control/workflow/coordination.mjs",
      "src/control/workflow/auto-plan.mjs",
      "src/control/workflow/plan-review.mjs",
      "src/control/workflow/parallel-execution.mjs",
      "src/control/workflow/parallel-kit.mjs",
      "src/auto-plan.mjs",
      "src/project-auto-plan.mjs",
      "src/project-session-auto-plan.mjs",
      "src/plan-review.mjs",
      "src/review-continuation.mjs",
      "src/parallel-execution.mjs",
      "src/parallel-kit.mjs",
      "src/executor-session.mjs",
      "tests/auto-plan.test.mjs",
      "tests/plan-review.test.mjs",
      "tests/parallel-finalization.test.mjs",
      "src/parallel-settings.mjs",
      "src/auto-plan-state.mjs",
      "src/execution-projection.mjs",
      "src/plan-monitor.mjs",
      "tests/migration-compatibility.test.mjs",
      "tests/workflow-kit-upgrade.test.mjs",
      "src/frontend/desktop/preload.cjs",
      "src/frontend/desktop/ipc.mjs",
      "src/frontend/desktop/ui/index.html",
      "src/frontend/desktop/ui/sidebar.mjs",
      "src/frontend/desktop/ui/startup.mjs",
      "src/preload.cjs",
      "src/ui/index.html",
      "src/ui/sidebar.mjs",
      "src/ui/startup.mjs",
      "src/ui/settings-panel.mjs",
      "tests/sidebar.test.mjs",
      "tests/startup-ui.test.mjs",
      "tests/workspace-setup.test.mjs",
      "tests/project-doctor.test.mjs",
      "tests/workspace-deletion.test.mjs",
      "tests/project-state-cleanup.test.mjs",
      "src/workspace-setup.mjs",
      "src/project-doctor.mjs",
      "src/workspace-deletion.mjs",
      "src/project-state-cleanup.mjs",
      "src/startup-readiness.mjs",
      "src/startup-platform.mjs",
      "src/browser-startup.mjs",
      "src/tunnel-setup.mjs",
      "src/tunnel-clipboard.mjs",
      "src/archive-preload.cjs",
      "src/execution/platform/linux/runtime.mjs",
      "src/execution/platform/linux/startup.mjs",
      "src/execution/platform/linux/services.mjs",
      "src/execution/runtime/mcp-runtime.mjs",
      "src/execution/runtime/vps-tunnel.mjs",
      "scripts/prepare-linux-toolchain.mjs",
      "tests/linux-runtime.test.mjs",
      "tests/linux-startup.test.mjs",
      "src/execution/commands/command-activity.mjs",
      "scripts/release-mac.mjs",
      "scripts/release-linux.mjs",
      "scripts/verify-linux-package.mjs",
      "scripts/check-installed-release.mjs",
      "scripts/check-github-release.mjs",
      "scripts/sign-mac-bundle.mjs",
      "tests/release-all.test.mjs",
      "tests/release-mac.test.mjs",
      "tests/release-linux.test.mjs",
      "scripts/verify-windows-package.mjs",
      "scripts/check-mac-signature.mjs",
      "src/execution/platform/mac-runtime.mjs",
      "src/execution/platform/windows-runtime.mjs",
      "release-manifest.json",
      ".node-version",
      "BUILD_WINDOWS.cmd",
      "RUN_WINDOWS.cmd",
      "packages/workflow-kit/LICENSE",
      "packages/workflow-kit/index.mjs",
      "packages/workflow-kit/scripts/check-carryover-fixture.mjs",
      "packages/workflow-kit/scripts/check-consumer-contract.mjs",
      "packages/workflow-kit/scripts/check-document-fixture.mjs",
      "packages/workflow-kit/scripts/check-package.mjs",
      "packages/workflow-kit/scripts/check-parallel-execution-fixture.mjs",
      "packages/workflow-kit/scripts/check-parallel-plan-fixture.mjs",
      "packages/workflow-kit/scripts/check-plan-review-fixture.mjs",
      "packages/workflow-kit/scripts/check-previous-upgrade-fixture.mjs",
      "packages/workflow-kit/scripts/check-project-recovery-fixture.mjs",
      "packages/workflow-kit/scripts/check-runtime-fixture.mjs",
      "packages/workflow-kit/scripts/check-task-assignment-fixture.mjs",
      "packages/workflow-kit/scripts/check-task-handoff-fixture.mjs",
      "packages/workflow-kit/scripts/check-task-integration-fixture.mjs",
      "packages/workflow-kit/src/examples/verify-package.mjs",
      "packages/workflow-kit/src/lib/claude-review.mjs",
      "packages/workflow-kit/src/lib/command-help.mjs",
      "packages/workflow-kit/src/lib/common.mjs",
      "packages/workflow-kit/src/lib/extend-plan.mjs",
      "packages/workflow-kit/src/lib/git-hooks.mjs",
      "packages/workflow-kit/src/lib/git.mjs",
      "packages/workflow-kit/src/lib/inspection-inputs.mjs",
      "packages/workflow-kit/src/lib/installation-files.mjs",
      "packages/workflow-kit/src/lib/installer.mjs",
      "packages/workflow-kit/src/lib/plan.mjs",
      "packages/workflow-kit/src/lib/platform.mjs",
      "packages/workflow-kit/src/lib/project-facts.mjs",
      "packages/workflow-kit/src/lib/session-plans.mjs",
      "packages/workflow-kit/src/lib/simple-workflow.mjs",
      "packages/workflow-kit/src/lib/task-files.mjs",
      "packages/workflow-kit/src/lib/task-handoff.mjs",
      "packages/workflow-kit/src/lib/task-update.mjs",
      "packages/workflow-kit/src/schemas/plan.schema.json",
      "packages/workflow-kit/src/schemas/workflow.schema.json",
      "resources/project-doctor-worker.mjs",
      "resources/project-doctor/core.mjs",
      "resources/project-doctor/files.mjs",
      "scripts/check-codex-tools.mjs",
      "scripts/check-mac-screen-capture.mjs",
      "scripts/check-workflow-kit-archive.mjs",
      "scripts/check-workflow-kit-dependency.mjs",
      "scripts/check-workflow-kit-staging.mjs",
      "scripts/probe-chatgpt-file-paste.mjs",
      "src/chat-colors-preload.cjs",
      "src/chat-colors-window.mjs",
      "src/chromium-diagnostics.mjs",
      "src/command-activity.mjs",
      "src/project-input-watch.mjs",
      "src/startup-network-trace.mjs",
      "src/ui/archive.html",
      "src/ui/archive.mjs",
      "src/ui/chat-colors.html",
      "src/ui/chat-colors.mjs",
      "src/ui/progress.mjs",
      "src/ui/project-doctor.mjs",
      "src/ui/workspace-setup.mjs",
      "src/workspace-readiness.mjs",
      "src/zip-archive.mjs",
      "tests/agent-timer.test.mjs",
      "tests/auto-plan-restart-fixture.cjs",
      "tests/automation-send-state.test.mjs",
      "tests/browser-startup.test.mjs",
      "tests/chatgpt-auto-scroll.test.mjs",
      "tests/chatgpt-colors.test.mjs",
      "tests/chatgpt-experience.test.mjs",
      "tests/chatgpt-file-paste-probe.test.mjs",
      "tests/chatgpt-title.test.mjs",
      "tests/chatgpt-tool-filter.test.mjs",
      "tests/check-codex-tools.test.mjs",
      "tests/chromium-diagnostics.test.mjs",
      "tests/common.test.mjs",
      "tests/event-runtime-baseline.mjs",
      "tests/fixtures/released-kit/kit-1.5.6.tar.gz",
      "tests/fixtures/released-kit/kit-1.6.3.tar.gz",
      "tests/fixtures/released-kit/kit-1.6.4.tar.gz",
      "tests/fixtures/released-kit/kit-1.7.0.tar.gz",
      "tests/fixtures/released-kit/manifest.json",
      "tests/installed-observer-fixture.cjs",
      "tests/mac-toolchain.test.mjs",
      "tests/parallel-execution-recovery.test.mjs",
      "tests/parallel-execution-smoke-fixture.cjs",
      "tests/parallel-execution-ui.test.mjs",
      "tests/plan-monitor.test.mjs",
      "tests/product-identity.test.mjs",
      "tests/progress.test.mjs",
      "tests/project-doctor-ui.test.mjs",
      "tests/project-input-watch.test.mjs",
      "tests/prosemirror-composer-fixture.mjs",
      "tests/protected-preview-fixture.cjs",
      "tests/session-opening-performance.test.mjs",
      "tests/settings-chatgpt-channel.test.mjs",
      "tests/settings-parallel-execution.test.mjs",
      "tests/sign-mac-bundle.test.mjs",
      "tests/startup-network-trace.test.mjs",
      "tests/startup-platform.test.mjs",
      "tests/startup-readiness.test.mjs",
      "tests/tunnel-clipboard.test.mjs",
      "tests/tunnel-id-prompt.test.mjs",
      "tests/tunnel-id-runtime.test.mjs",
      "tests/tunnel-prompt.test.mjs",
      "tests/windows-autostart.test.mjs",
      "tests/workflow-kit-recovery.test.mjs",
      "tests/workflow-kit-source.test.mjs",
      "tests/workspace-readiness.test.mjs",
      "tools/codex-app-server-mcp/tunnel_prompt.py",
      "tools/codex-app-server-mcp/windows_notify.ps1",
      "src/contracts/context.mjs",
      "src/execution/files/zip-archive.mjs",
      "src/execution/runtime/mcp-client.mjs",
      "src/execution/runtime/tunnel-setup.mjs",
      "src/execution/runtime/vps-config.mjs",
      "src/execution/runtime/vps.mjs",
      "src/execution/runtime/windows.mjs",
      "tests/execution-architecture.test.mjs",
      "tests/execution-facade.test.mjs",
      "src/contracts/browser.mjs",
      "src/execution/browser/browser-startup.mjs",
      "src/execution/browser/chatgpt-auto-scroll.mjs",
      "src/execution/browser/chatgpt-colors.mjs",
      "src/execution/browser/chatgpt-title.mjs",
      "src/execution/browser/chatgpt-tool-filter.mjs",
      "src/execution/browser/page-state-bridge.mjs",
      "src/frontend/desktop/browser-host.mjs",
      "src/control/projects/project-state-cleanup.mjs",
      "src/control/projects/workspace-readiness.mjs",
      "src/control/sessions/agent-timer.mjs",
      "src/control/sessions/session-plans.mjs",
      "src/execution/files/diagnostics.mjs",
      "tests/control-facade.test.mjs",
      "src/control/workflow/auto-plan-state.mjs",
      "src/control/workflow/automation-send-state.mjs",
      "src/control/workflow/command-activity.mjs",
      "src/control/workflow/execution-projection.mjs",
      "src/control/workflow/executor-session.mjs",
      "src/control/workflow/parallel-settings.mjs",
      "src/control/workflow/plan-monitor.mjs",
      "src/control/workflow/project-auto-plan.mjs",
      "src/control/workflow/project-session-auto-plan.mjs",
      "src/control/workflow/review-continuation.mjs",
      "src/execution/commands/activity-probe.mjs",
      "src/execution/files/project-input-watch.mjs",
      "packages/workflow-kit/src/lib/assignment-contract.mjs",
      "packages/workflow-kit/src/lib/commit-references.mjs",
      "packages/workflow-kit/src/lib/integration-proof.mjs",
      "packages/workflow-kit/src/lib/review-state.mjs",
      "packages/workflow-kit/src/lib/transaction-state.mjs",
      "packages/workflow-kit/src/lib/validation-rules.mjs",
      "tests/fixtures/released-kit/kit-1.7.2.tar.gz",
      "src/contracts/chat-colors.mjs",
      "src/contracts/desktop.mjs",
      "src/contracts/parallel-settings.mjs",
      "src/contracts/tunnel.mjs",
      "src/contracts/workflow-view.mjs",
      "src/control/projects/lifecycle.mjs",
      "src/control/settings/service.mjs",
      "src/control/startup/platform.mjs",
      "src/control/startup/public-state.mjs",
      "src/control/startup/readiness.mjs",
      "src/control/startup/tunnel-clipboard.mjs",
      "src/execution/browser/diagnostics.mjs",
      "src/execution/browser/startup-network-trace.mjs",
      "src/execution/platform/mac-setup.mjs",
      "src/frontend/desktop/application.mjs",
      "src/frontend/desktop/archive-preload.cjs",
      "src/frontend/desktop/chat-colors-preload.cjs",
      "src/frontend/desktop/chat-colors-window.mjs",
      "src/frontend/desktop/mac-installation.mjs",
      "src/frontend/desktop/ui/archive.html",
      "src/frontend/desktop/ui/archive.mjs",
      "src/frontend/desktop/ui/chat-colors.html",
      "src/frontend/desktop/ui/chat-colors.mjs",
      "src/frontend/desktop/ui/progress.mjs",
      "src/frontend/desktop/ui/project-doctor.mjs",
      "src/frontend/desktop/ui/settings-panel.mjs",
      "src/frontend/desktop/ui/workspace-setup.mjs",
      "tests/desktop-boundaries.test.mjs",
      "src/execution/platform/linux/toolchain.mjs",
      "tests/fixtures/linux-platform.py",
      "tools/codex-app-server-mcp/linux_runtime.py",
      "tools/codex-app-server-mcp/requirements-linux.in",
      "tools/codex-app-server-mcp/requirements-linux.lock",
      "scripts/release-archive.mjs",
      "scripts/release-package.mjs",
      "scripts/stage-vendor-notices.mjs",
      "scripts/copy-linux-toolchain.mjs",
      "src/control/plugin/service.mjs",
      "src/execution/plugin/bridge.mjs",
      "src/frontend/plugin/app.mjs",
      "src/frontend/plugin/index.html",
      "tools/codex-app-server-mcp/plugin.py",
      "scripts/stage-chatgpt-plugin.mjs",
      "tests/chatgpt-plugin.test.mjs",
      "src/frontend/plugin/panel.mjs",
      "tests/fixtures/plugin-server.py",
      "src/frontend/plugin/navigation-probe.mjs"
    ],
    "documentation_paths": [
      "docs/planning/migration-0.1.0.md",
      "docs/planning/migration-platforms.md",
      "docs/planning/orchestrated-execution-next.md",
      "docs/architecture/OVERVIEW.md",
      "README.md",
      "AGENTS.md",
      "docs/modules/execution.md",
      "docs/modules/browser.md",
      "docs/modules/control.md",
      "docs/modules/workflow-execution.md",
      "docs/modules/project-compatibility.md",
      "docs/modules/desktop.md",
      "docs/modules/first-run-onboarding.md",
      "docs/modules/project-lifecycle.md",
      "docs/modules/linux.md",
      "docs/modules/release.md",
      "PROVENANCE.md",
      "packages/workflow-kit/README.md",
      "packages/workflow-kit/docs/modules/parallel-assignments.md",
      "packages/workflow-kit/docs/modules/workflow-kit-package.md",
      "packages/workflow-kit/src/WORKFLOW.md",
      "packages/workflow-kit/src/examples/PACKAGING.md",
      "packages/workflow-kit/src/templates/AGENTS.md",
      "packages/workflow-kit/src/templates/CONTINUE.md",
      "packages/workflow-kit/src/templates/PLAN.md",
      "packages/workflow-kit/src/templates/PROTOTYPE.md",
      "packages/workflow-kit/src/templates/SPEC.md",
      "packages/workflow-kit/src/templates/STAGES.md",
      "tests/fixtures/released-kit/README.md",
      "resources/THIRD-PARTY.md",
      "docs/acceptance/migration-0.1.0.md",
      "docs/planning/chatgpt-plugin.md",
      "docs/modules/chatgpt-plugin.md"
    ]
  },
  "baseline_commit": "dcb2703c8a766d9f1cf7030f6fc69a8af1c8e9be",
  "current_task_id": null,
  "context_pack": {
    "documents": [
      {
        "path": "docs/planning/migration-0.1.0.md",
        "required": false,
        "revision": "1f734caff5144f97fe7ebd4b0ff46f30db660402"
      },
      {
        "path": "docs/planning/migration-platforms.md",
        "required": false,
        "revision": "1f734caff5144f97fe7ebd4b0ff46f30db660402"
      },
      {
        "path": "docs/planning/orchestrated-execution-next.md",
        "required": true,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/architecture/OVERVIEW.md",
        "required": true,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/modules/first-run-onboarding.md",
        "required": true,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/modules/control.md",
        "required": true,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/modules/chatgpt-plugin.md",
        "required": true,
        "revision": "WORKTREE"
      }
    ],
    "include_last_completed_task": false,
    "dependency_task_ids": []
  },
  "tasks": [
    {
      "id": "T001",
      "title": "Закрепить карту переноса и платформенные зависимости",
      "why": "Закрепить карту переноса и платформенные зависимости",
      "dependencies": [],
      "parallel_safe": false,
      "functional_paths": [],
      "documentation_paths": [
        "docs/planning/migration-0.1.0.md",
        "docs/planning/migration-platforms.md",
        "docs/planning/orchestrated-execution-next.md"
      ],
      "verification_ids": [],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Сверены donor commit 98a874236c3d5027e3be1de1faeae1d6c135f4c7, происхождение/лицензии, исходные блоки и реальные test entrypoints; карта в спецификации учитывает динамические входы, внешние DOM-экспорты, циклы Kit и старые runtime-пути. Донор не меняется.",
        "До массового копирования проверены официальные Linux x64 артефакты закреплённых Electron/Node/Codex/uv/Python/rg/Git/tunnel-client, X11-наблюдение и способы поставки; зафиксированы конкретные решения/блокеры, Ubuntu 24.04 LTS и статус UTM x64. Матрица приёмки отличает baseline-ограничения от регрессий.",
        "Проверены собственная identity, конфликт VPS 17842 и границы серверной настройки; будущая оркестрация остаётся отдельным требованием. Для этой документальной задачи suite не требуется.",
        "До копирования подтверждены конкретный Windows vendor asset v0.6.115 и SHA-256 из платформенной спецификации; архив войдёт отдельным asset 0.1.0. Локальная Git identity проверена по принятому донорскому авторству, новые placeholder-коммиты запрещены."
      ],
      "expected_commit_message": "docs: Закрепить карту переноса и платформенные зависимости",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T001",
        "role": "implementation"
      },
      "actual_files": [
        "docs/planning/migration-0.1.0.md",
        "docs/planning/migration-platforms.md"
      ]
    },
    {
      "id": "T002",
      "title": "Перенести запускаемую базу с собственной identity",
      "why": "Перенести запускаемую базу с собственной identity",
      "dependencies": [
        "T001"
      ],
      "parallel_safe": false,
      "functional_paths": [
        "package.json",
        "package-lock.json",
        ".gitignore",
        "src/main.mjs",
        "src/common.mjs",
        "src/platform.mjs",
        "src/control/facade.mjs",
        "src/execution/facade.mjs",
        "src/frontend/desktop/bootstrap.mjs",
        "scripts/release-all.mjs",
        "scripts/prepare-windows-toolchain.mjs",
        "scripts/prepare-mac-toolchain.mjs",
        "scripts/stage-workflow-kit.mjs",
        "scripts/stage-page-observer.mjs",
        "resources/mac-permissions.plist",
        "resources/workspace-setup-worker.mjs",
        "resources/runtime-control/windows-control.py",
        "tools/codex-app-server-mcp/control.py",
        "tools/codex-app-server-mcp/server.py",
        "tools/codex-app-server-mcp/app_server_client.py",
        "tools/codex-app-server-mcp/codex-tools.lock.json",
        "tools/codex-app-server-mcp/requirements.txt",
        "tools/codex-app-server-mcp/windows_desktop.py",
        "tools/codex-app-server-mcp/linux_desktop.py",
        "packages/workflow-kit/package.json",
        "packages/workflow-kit/src/cli.mjs",
        "packages/workflow-kit/src/install.mjs",
        "packages/workflow-kit/src/lib/transaction.mjs",
        "packages/workflow-kit/src/lib/task-integration.mjs",
        "packages/workflow-kit/src/lib/validate.mjs",
        "packages/workflow-kit/src/lib/task-assignment.mjs",
        "packages/workflow-kit/src/lib/actions.mjs",
        "packages/workflow-kit/src/lib/plan-review.mjs",
        "packages/workflow-kit/src/lib/recovery.mjs",
        "tests/workspace-session.test.mjs",
        "tests/session-runtime.test.mjs",
        "tests/parallel-execution.test.mjs",
        "tests/project-auto-plan.test.mjs",
        "tests/electron-smoke.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "LICENSE",
        ".node-version",
        "BUILD_WINDOWS.cmd",
        "RUN_WINDOWS.cmd",
        "packages/workflow-kit/LICENSE",
        "packages/workflow-kit/index.mjs",
        "packages/workflow-kit/scripts/check-carryover-fixture.mjs",
        "packages/workflow-kit/scripts/check-consumer-contract.mjs",
        "packages/workflow-kit/scripts/check-document-fixture.mjs",
        "packages/workflow-kit/scripts/check-package.mjs",
        "packages/workflow-kit/scripts/check-parallel-execution-fixture.mjs",
        "packages/workflow-kit/scripts/check-parallel-plan-fixture.mjs",
        "packages/workflow-kit/scripts/check-plan-review-fixture.mjs",
        "packages/workflow-kit/scripts/check-previous-upgrade-fixture.mjs",
        "packages/workflow-kit/scripts/check-project-recovery-fixture.mjs",
        "packages/workflow-kit/scripts/check-runtime-fixture.mjs",
        "packages/workflow-kit/scripts/check-task-assignment-fixture.mjs",
        "packages/workflow-kit/scripts/check-task-handoff-fixture.mjs",
        "packages/workflow-kit/scripts/check-task-integration-fixture.mjs",
        "packages/workflow-kit/src/examples/verify-package.mjs",
        "packages/workflow-kit/src/lib/claude-review.mjs",
        "packages/workflow-kit/src/lib/command-help.mjs",
        "packages/workflow-kit/src/lib/common.mjs",
        "packages/workflow-kit/src/lib/extend-plan.mjs",
        "packages/workflow-kit/src/lib/git-hooks.mjs",
        "packages/workflow-kit/src/lib/git.mjs",
        "packages/workflow-kit/src/lib/inspection-inputs.mjs",
        "packages/workflow-kit/src/lib/installation-files.mjs",
        "packages/workflow-kit/src/lib/installer.mjs",
        "packages/workflow-kit/src/lib/plan.mjs",
        "packages/workflow-kit/src/lib/platform.mjs",
        "packages/workflow-kit/src/lib/project-facts.mjs",
        "packages/workflow-kit/src/lib/session-plans.mjs",
        "packages/workflow-kit/src/lib/simple-workflow.mjs",
        "packages/workflow-kit/src/lib/task-files.mjs",
        "packages/workflow-kit/src/lib/task-handoff.mjs",
        "packages/workflow-kit/src/lib/task-update.mjs",
        "packages/workflow-kit/src/schemas/plan.schema.json",
        "packages/workflow-kit/src/schemas/workflow.schema.json",
        "resources/project-doctor-worker.mjs",
        "resources/project-doctor/core.mjs",
        "resources/project-doctor/files.mjs",
        "scripts/check-codex-tools.mjs",
        "scripts/check-github-release.mjs",
        "scripts/check-installed-release.mjs",
        "scripts/check-mac-screen-capture.mjs",
        "scripts/check-mac-signature.mjs",
        "scripts/check-workflow-kit-archive.mjs",
        "scripts/check-workflow-kit-dependency.mjs",
        "scripts/check-workflow-kit-staging.mjs",
        "scripts/probe-chatgpt-file-paste.mjs",
        "scripts/release-mac.mjs",
        "scripts/sign-mac-bundle.mjs",
        "scripts/verify-windows-package.mjs",
        "src/agent-timer.mjs",
        "src/archive-preload.cjs",
        "src/auto-plan-state.mjs",
        "src/auto-plan.mjs",
        "src/automation-send-state.mjs",
        "src/browser-startup.mjs",
        "src/chat-colors-preload.cjs",
        "src/chat-colors-window.mjs",
        "src/chatgpt-auto-scroll.mjs",
        "src/chatgpt-colors.mjs",
        "src/chatgpt-composer.mjs",
        "src/chatgpt-dom.mjs",
        "src/chatgpt-experience.mjs",
        "src/chatgpt-page-observer.mjs",
        "src/chatgpt-title.mjs",
        "src/chatgpt-tool-filter.mjs",
        "src/chromium-diagnostics.mjs",
        "src/command-activity.mjs",
        "src/context-cache.mjs",
        "src/context-inputs.mjs",
        "src/context-session.mjs",
        "src/conversation-recovery.mjs",
        "src/execution-projection.mjs",
        "src/executor-session.mjs",
        "src/mac-runtime-switch.mjs",
        "src/mcp-runtime.mjs",
        "src/page-state-bridge.mjs",
        "src/page-state.mjs",
        "src/parallel-execution.mjs",
        "src/parallel-kit.mjs",
        "src/parallel-settings.mjs",
        "src/plan-monitor.mjs",
        "src/plan-review.mjs",
        "src/preload.cjs",
        "src/project-auto-plan.mjs",
        "src/project-doctor.mjs",
        "src/project-input-watch.mjs",
        "src/project-session-auto-plan.mjs",
        "src/project-state-cleanup.mjs",
        "src/review-continuation.mjs",
        "src/session-plans.mjs",
        "src/session-runtime.mjs",
        "src/startup-network-trace.mjs",
        "src/startup-platform.mjs",
        "src/startup-readiness.mjs",
        "src/tunnel-clipboard.mjs",
        "src/tunnel-setup.mjs",
        "src/ui/archive.html",
        "src/ui/archive.mjs",
        "src/ui/chat-colors.html",
        "src/ui/chat-colors.mjs",
        "src/ui/index.html",
        "src/ui/progress.mjs",
        "src/ui/project-doctor.mjs",
        "src/ui/settings-panel.mjs",
        "src/ui/sidebar.mjs",
        "src/ui/startup.mjs",
        "src/ui/workspace-setup.mjs",
        "src/vps-tunnel.mjs",
        "src/windows-runtime.mjs",
        "src/workspace-deletion.mjs",
        "src/workspace-readiness.mjs",
        "src/workspace-session.mjs",
        "src/workspace-setup.mjs",
        "src/zip-archive.mjs",
        "tests/agent-timer.test.mjs",
        "tests/auto-plan-restart-fixture.cjs",
        "tests/auto-plan.test.mjs",
        "tests/automation-send-state.test.mjs",
        "tests/browser-startup.test.mjs",
        "tests/chatgpt-auto-scroll.test.mjs",
        "tests/chatgpt-colors.test.mjs",
        "tests/chatgpt-composer.test.mjs",
        "tests/chatgpt-dom.test.mjs",
        "tests/chatgpt-experience.test.mjs",
        "tests/chatgpt-file-paste-probe.test.mjs",
        "tests/chatgpt-title.test.mjs",
        "tests/chatgpt-tool-filter.test.mjs",
        "tests/check-codex-tools.test.mjs",
        "tests/chromium-diagnostics.test.mjs",
        "tests/command-activity.test.mjs",
        "tests/common.test.mjs",
        "tests/context-cache.test.mjs",
        "tests/context-session.test.mjs",
        "tests/conversation-recovery.test.mjs",
        "tests/event-runtime-baseline.mjs",
        "tests/fixtures/released-kit/kit-1.5.6.tar.gz",
        "tests/fixtures/released-kit/kit-1.6.3.tar.gz",
        "tests/fixtures/released-kit/kit-1.6.4.tar.gz",
        "tests/fixtures/released-kit/kit-1.7.0.tar.gz",
        "tests/fixtures/released-kit/manifest.json",
        "tests/installed-observer-fixture.cjs",
        "tests/mac-runtime-switch.test.mjs",
        "tests/mac-toolchain.test.mjs",
        "tests/mcp-runtime.test.mjs",
        "tests/page-state.test.mjs",
        "tests/parallel-execution-recovery.test.mjs",
        "tests/parallel-execution-smoke-fixture.cjs",
        "tests/parallel-execution-ui.test.mjs",
        "tests/parallel-finalization.test.mjs",
        "tests/plan-monitor.test.mjs",
        "tests/plan-review.test.mjs",
        "tests/product-identity.test.mjs",
        "tests/progress.test.mjs",
        "tests/project-doctor-ui.test.mjs",
        "tests/project-doctor.test.mjs",
        "tests/project-input-watch.test.mjs",
        "tests/project-state-cleanup.test.mjs",
        "tests/prosemirror-composer-fixture.mjs",
        "tests/protected-preview-fixture.cjs",
        "tests/release-all.test.mjs",
        "tests/release-mac.test.mjs",
        "tests/session-opening-performance.test.mjs",
        "tests/session-plans.test.mjs",
        "tests/settings-chatgpt-channel.test.mjs",
        "tests/settings-parallel-execution.test.mjs",
        "tests/sidebar.test.mjs",
        "tests/sign-mac-bundle.test.mjs",
        "tests/startup-network-trace.test.mjs",
        "tests/startup-platform.test.mjs",
        "tests/startup-readiness.test.mjs",
        "tests/startup-ui.test.mjs",
        "tests/tunnel-clipboard.test.mjs",
        "tests/tunnel-id-prompt.test.mjs",
        "tests/tunnel-id-runtime.test.mjs",
        "tests/tunnel-prompt.test.mjs",
        "tests/vps-tunnel.test.mjs",
        "tests/windows-autostart.test.mjs",
        "tests/windows-runtime.test.mjs",
        "tests/workflow-kit-recovery.test.mjs",
        "tests/workflow-kit-source.test.mjs",
        "tests/workflow-kit-upgrade.test.mjs",
        "tests/workspace-deletion.test.mjs",
        "tests/workspace-readiness.test.mjs",
        "tests/workspace-setup.test.mjs",
        "tools/codex-app-server-mcp/tunnel_prompt.py",
        "tools/codex-app-server-mcp/windows_notify.ps1"
      ],
      "documentation_paths": [
        "AGENTS.md",
        "docs/modules/control.md",
        "docs/modules/execution.md",
        "docs/modules/browser.md",
        "docs/modules/workflow-execution.md",
        "docs/modules/desktop.md",
        "PROVENANCE.md",
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "docs/planning/migration-0.1.0.md",
        "docs/planning/migration-platforms.md",
        "packages/workflow-kit/README.md",
        "packages/workflow-kit/docs/modules/parallel-assignments.md",
        "packages/workflow-kit/docs/modules/workflow-kit-package.md",
        "packages/workflow-kit/src/WORKFLOW.md",
        "packages/workflow-kit/src/examples/PACKAGING.md",
        "packages/workflow-kit/src/templates/AGENTS.md",
        "packages/workflow-kit/src/templates/CONTINUE.md",
        "packages/workflow-kit/src/templates/PLAN.md",
        "packages/workflow-kit/src/templates/PROTOTYPE.md",
        "packages/workflow-kit/src/templates/SPEC.md",
        "packages/workflow-kit/src/templates/STAGES.md",
        "tests/fixtures/released-kit/README.md"
      ],
      "verification_ids": [
        "unit-all",
        "electron-smoke",
        "kit-check",
        "executor-channel",
        "codex-tools-live"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Перенесён только согласованный исходный код/тесты из закреплённой базы; сохранены лицензии/provenance и новый installed Kit. package/product/version = workflow-pilot / Workflow Pilot / 0.1.0; Electron/Node закреплены; создана воспроизводимая npm-установка, npm start запускает собственный каркас.",
        "ДО запуска исключены donor userData/profile/runtime, автоматический захват legacy-служб, donor app paths и общий VPS label; новые профиль/службы/пути/порты изолированы. Нет копирования ключей, cookies, .harness донора и конфигурации подписи; тесты не трогают реальное состояние.",
        "Базовый сценарий проект→сессия→контекст подтверждён fixture и доступен пользователю на Mac; исходные AutoPlan/Review/sequential/parallel сохранены. Новый документ AGENTS закрепляет принятые ограничения, managed-секция Kit не правится вручную. Документы >28000 байт разделены без потери требований.",
        "До первого npm-запуска проектная секция .gitignore покрывает постоянный /Workflow Pilot.app/, временную установку, generated Kit/observer, windows-app, Python/cache/log/OS мусор. Проверены git check-ignore и status после тестов/старта: только намеренные исходники, никаких generated/app/runtime в index; после коммита дерево чистое."
      ],
      "expected_commit_message": "refactor: Перенести запускаемую базу с собственной identity",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T002",
        "role": "implementation"
      },
      "actual_files": [
        ".gitignore",
        ".node-version",
        "AGENTS.md",
        "BUILD_WINDOWS.cmd",
        "LICENSE",
        "PROVENANCE.md",
        "README.md",
        "RUN_WINDOWS.cmd",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/browser.md",
        "docs/modules/control.md",
        "docs/modules/desktop.md",
        "docs/modules/execution.md",
        "docs/modules/workflow-execution.md",
        "docs/planning/migration-0.1.0.md",
        "docs/planning/migration-platforms.md",
        "package-lock.json",
        "package.json",
        "packages/workflow-kit/LICENSE",
        "packages/workflow-kit/README.md",
        "packages/workflow-kit/docs/modules/parallel-assignments.md",
        "packages/workflow-kit/docs/modules/workflow-kit-package.md",
        "packages/workflow-kit/index.mjs",
        "packages/workflow-kit/package.json",
        "packages/workflow-kit/scripts/check-carryover-fixture.mjs",
        "packages/workflow-kit/scripts/check-consumer-contract.mjs",
        "packages/workflow-kit/scripts/check-document-fixture.mjs",
        "packages/workflow-kit/scripts/check-package.mjs",
        "packages/workflow-kit/scripts/check-parallel-execution-fixture.mjs",
        "packages/workflow-kit/scripts/check-parallel-plan-fixture.mjs",
        "packages/workflow-kit/scripts/check-plan-review-fixture.mjs",
        "packages/workflow-kit/scripts/check-previous-upgrade-fixture.mjs",
        "packages/workflow-kit/scripts/check-project-recovery-fixture.mjs",
        "packages/workflow-kit/scripts/check-runtime-fixture.mjs",
        "packages/workflow-kit/scripts/check-task-assignment-fixture.mjs",
        "packages/workflow-kit/scripts/check-task-handoff-fixture.mjs",
        "packages/workflow-kit/scripts/check-task-integration-fixture.mjs",
        "packages/workflow-kit/src/WORKFLOW.md",
        "packages/workflow-kit/src/cli.mjs",
        "packages/workflow-kit/src/examples/PACKAGING.md",
        "packages/workflow-kit/src/examples/verify-package.mjs",
        "packages/workflow-kit/src/install.mjs",
        "packages/workflow-kit/src/lib/actions.mjs",
        "packages/workflow-kit/src/lib/claude-review.mjs",
        "packages/workflow-kit/src/lib/command-help.mjs",
        "packages/workflow-kit/src/lib/common.mjs",
        "packages/workflow-kit/src/lib/extend-plan.mjs",
        "packages/workflow-kit/src/lib/git-hooks.mjs",
        "packages/workflow-kit/src/lib/git.mjs",
        "packages/workflow-kit/src/lib/inspection-inputs.mjs",
        "packages/workflow-kit/src/lib/installation-files.mjs",
        "packages/workflow-kit/src/lib/installer.mjs",
        "packages/workflow-kit/src/lib/plan-review.mjs",
        "packages/workflow-kit/src/lib/plan.mjs",
        "packages/workflow-kit/src/lib/platform.mjs",
        "packages/workflow-kit/src/lib/project-facts.mjs",
        "packages/workflow-kit/src/lib/recovery.mjs",
        "packages/workflow-kit/src/lib/session-plans.mjs",
        "packages/workflow-kit/src/lib/simple-workflow.mjs",
        "packages/workflow-kit/src/lib/task-assignment.mjs",
        "packages/workflow-kit/src/lib/task-files.mjs",
        "packages/workflow-kit/src/lib/task-handoff.mjs",
        "packages/workflow-kit/src/lib/task-integration.mjs",
        "packages/workflow-kit/src/lib/task-update.mjs",
        "packages/workflow-kit/src/lib/transaction.mjs",
        "packages/workflow-kit/src/lib/validate.mjs",
        "packages/workflow-kit/src/schemas/plan.schema.json",
        "packages/workflow-kit/src/schemas/workflow.schema.json",
        "packages/workflow-kit/src/templates/AGENTS.md",
        "packages/workflow-kit/src/templates/CONTINUE.md",
        "packages/workflow-kit/src/templates/PLAN.md",
        "packages/workflow-kit/src/templates/PROTOTYPE.md",
        "packages/workflow-kit/src/templates/SPEC.md",
        "packages/workflow-kit/src/templates/STAGES.md",
        "resources/mac-permissions.plist",
        "resources/project-doctor-worker.mjs",
        "resources/project-doctor/core.mjs",
        "resources/project-doctor/files.mjs",
        "resources/runtime-control/windows-control.py",
        "resources/workspace-setup-worker.mjs",
        "scripts/check-codex-tools.mjs",
        "scripts/check-github-release.mjs",
        "scripts/check-installed-release.mjs",
        "scripts/check-mac-screen-capture.mjs",
        "scripts/check-mac-signature.mjs",
        "scripts/check-workflow-kit-archive.mjs",
        "scripts/check-workflow-kit-dependency.mjs",
        "scripts/check-workflow-kit-staging.mjs",
        "scripts/prepare-mac-toolchain.mjs",
        "scripts/prepare-windows-toolchain.mjs",
        "scripts/probe-chatgpt-file-paste.mjs",
        "scripts/release-all.mjs",
        "scripts/release-mac.mjs",
        "scripts/sign-mac-bundle.mjs",
        "scripts/stage-page-observer.mjs",
        "scripts/stage-workflow-kit.mjs",
        "scripts/verify-windows-package.mjs",
        "src/agent-timer.mjs",
        "src/archive-preload.cjs",
        "src/auto-plan-state.mjs",
        "src/auto-plan.mjs",
        "src/automation-send-state.mjs",
        "src/browser-startup.mjs",
        "src/chat-colors-preload.cjs",
        "src/chat-colors-window.mjs",
        "src/chatgpt-auto-scroll.mjs",
        "src/chatgpt-colors.mjs",
        "src/chatgpt-composer.mjs",
        "src/chatgpt-dom.mjs",
        "src/chatgpt-experience.mjs",
        "src/chatgpt-page-observer.mjs",
        "src/chatgpt-title.mjs",
        "src/chatgpt-tool-filter.mjs",
        "src/chromium-diagnostics.mjs",
        "src/command-activity.mjs",
        "src/common.mjs",
        "src/context-cache.mjs",
        "src/context-inputs.mjs",
        "src/context-session.mjs",
        "src/conversation-recovery.mjs",
        "src/execution-projection.mjs",
        "src/executor-session.mjs",
        "src/frontend/desktop/bootstrap.mjs",
        "src/mac-runtime-switch.mjs",
        "src/main.mjs",
        "src/mcp-runtime.mjs",
        "src/page-state-bridge.mjs",
        "src/page-state.mjs",
        "src/parallel-execution.mjs",
        "src/parallel-kit.mjs",
        "src/parallel-settings.mjs",
        "src/plan-monitor.mjs",
        "src/plan-review.mjs",
        "src/platform.mjs",
        "src/preload.cjs",
        "src/project-auto-plan.mjs",
        "src/project-doctor.mjs",
        "src/project-input-watch.mjs",
        "src/project-session-auto-plan.mjs",
        "src/project-state-cleanup.mjs",
        "src/review-continuation.mjs",
        "src/session-plans.mjs",
        "src/session-runtime.mjs",
        "src/startup-network-trace.mjs",
        "src/startup-platform.mjs",
        "src/startup-readiness.mjs",
        "src/tunnel-clipboard.mjs",
        "src/tunnel-setup.mjs",
        "src/ui/archive.html",
        "src/ui/archive.mjs",
        "src/ui/chat-colors.html",
        "src/ui/chat-colors.mjs",
        "src/ui/index.html",
        "src/ui/progress.mjs",
        "src/ui/project-doctor.mjs",
        "src/ui/settings-panel.mjs",
        "src/ui/sidebar.mjs",
        "src/ui/startup.mjs",
        "src/ui/workspace-setup.mjs",
        "src/vps-tunnel.mjs",
        "src/windows-runtime.mjs",
        "src/workspace-deletion.mjs",
        "src/workspace-readiness.mjs",
        "src/workspace-session.mjs",
        "src/workspace-setup.mjs",
        "src/zip-archive.mjs",
        "tests/agent-timer.test.mjs",
        "tests/auto-plan-restart-fixture.cjs",
        "tests/auto-plan.test.mjs",
        "tests/automation-send-state.test.mjs",
        "tests/browser-startup.test.mjs",
        "tests/chatgpt-auto-scroll.test.mjs",
        "tests/chatgpt-colors.test.mjs",
        "tests/chatgpt-composer.test.mjs",
        "tests/chatgpt-dom.test.mjs",
        "tests/chatgpt-experience.test.mjs",
        "tests/chatgpt-file-paste-probe.test.mjs",
        "tests/chatgpt-title.test.mjs",
        "tests/chatgpt-tool-filter.test.mjs",
        "tests/check-codex-tools.test.mjs",
        "tests/chromium-diagnostics.test.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/command-activity.test.mjs",
        "tests/common.test.mjs",
        "tests/context-cache.test.mjs",
        "tests/context-session.test.mjs",
        "tests/conversation-recovery.test.mjs",
        "tests/electron-smoke.mjs",
        "tests/event-runtime-baseline.mjs",
        "tests/fixtures/released-kit/README.md",
        "tests/fixtures/released-kit/kit-1.5.6.tar.gz",
        "tests/fixtures/released-kit/kit-1.6.3.tar.gz",
        "tests/fixtures/released-kit/kit-1.6.4.tar.gz",
        "tests/fixtures/released-kit/kit-1.7.0.tar.gz",
        "tests/fixtures/released-kit/manifest.json",
        "tests/installed-observer-fixture.cjs",
        "tests/mac-runtime-switch.test.mjs",
        "tests/mac-toolchain.test.mjs",
        "tests/mcp-runtime.test.mjs",
        "tests/page-state.test.mjs",
        "tests/parallel-execution-recovery.test.mjs",
        "tests/parallel-execution-smoke-fixture.cjs",
        "tests/parallel-execution-ui.test.mjs",
        "tests/parallel-execution.test.mjs",
        "tests/parallel-finalization.test.mjs",
        "tests/plan-monitor.test.mjs",
        "tests/plan-review.test.mjs",
        "tests/product-identity.test.mjs",
        "tests/progress.test.mjs",
        "tests/project-auto-plan.test.mjs",
        "tests/project-doctor-ui.test.mjs",
        "tests/project-doctor.test.mjs",
        "tests/project-input-watch.test.mjs",
        "tests/project-state-cleanup.test.mjs",
        "tests/prosemirror-composer-fixture.mjs",
        "tests/protected-preview-fixture.cjs",
        "tests/release-all.test.mjs",
        "tests/release-mac.test.mjs",
        "tests/session-opening-performance.test.mjs",
        "tests/session-plans.test.mjs",
        "tests/session-runtime.test.mjs",
        "tests/settings-chatgpt-channel.test.mjs",
        "tests/settings-parallel-execution.test.mjs",
        "tests/sidebar.test.mjs",
        "tests/sign-mac-bundle.test.mjs",
        "tests/startup-network-trace.test.mjs",
        "tests/startup-platform.test.mjs",
        "tests/startup-readiness.test.mjs",
        "tests/startup-ui.test.mjs",
        "tests/tunnel-clipboard.test.mjs",
        "tests/tunnel-id-prompt.test.mjs",
        "tests/tunnel-id-runtime.test.mjs",
        "tests/tunnel-prompt.test.mjs",
        "tests/vps-tunnel.test.mjs",
        "tests/windows-autostart.test.mjs",
        "tests/windows-runtime.test.mjs",
        "tests/workflow-kit-recovery.test.mjs",
        "tests/workflow-kit-source.test.mjs",
        "tests/workflow-kit-upgrade.test.mjs",
        "tests/workspace-deletion.test.mjs",
        "tests/workspace-readiness.test.mjs",
        "tests/workspace-session.test.mjs",
        "tests/workspace-setup.test.mjs",
        "tools/codex-app-server-mcp/app_server_client.py",
        "tools/codex-app-server-mcp/codex-tools.lock.json",
        "tools/codex-app-server-mcp/control.py",
        "tools/codex-app-server-mcp/requirements.txt",
        "tools/codex-app-server-mcp/server.py",
        "tools/codex-app-server-mcp/tunnel_prompt.py",
        "tools/codex-app-server-mcp/windows_desktop.py",
        "tools/codex-app-server-mcp/windows_notify.ps1"
      ]
    },
    {
      "id": "T003",
      "title": "Выделить Execution для команд, файлов и служб",
      "why": "Выделить Execution для команд, файлов и служб",
      "dependencies": [
        "T002"
      ],
      "parallel_safe": false,
      "functional_paths": [
        "src/execution/facade.mjs",
        "src/execution/commands/service.mjs",
        "src/execution/files/adapter.mjs",
        "src/execution/runtime/service.mjs",
        "src/execution/platform/paths.mjs",
        "src/execution/browser/session-runtime.mjs",
        "src/contracts/control.mjs",
        "src/contracts/execution.mjs",
        "src/contracts/errors.mjs",
        "src/main.mjs",
        "src/platform.mjs",
        "src/mac-runtime-switch.mjs",
        "src/windows-runtime.mjs",
        "src/vps-tunnel.mjs",
        "tools/codex-app-server-mcp/control.py",
        "tools/codex-app-server-mcp/server.py",
        "tools/codex-app-server-mcp/app_server_client.py",
        "tools/codex-app-server-mcp/codex-tools.lock.json",
        "tools/codex-app-server-mcp/requirements.txt",
        "tools/codex-app-server-mcp/windows_desktop.py",
        "tools/codex-app-server-mcp/linux_desktop.py",
        "resources/runtime-control/windows-control.py",
        "resources/runtime-control/linux-control.py",
        "package.json",
        "package-lock.json",
        ".dependency-cruiser.cjs",
        "tests/command-activity.test.mjs",
        "tests/mcp-runtime.test.mjs",
        "tests/mac-runtime-switch.test.mjs",
        "tests/windows-runtime.test.mjs",
        "tests/vps-tunnel.test.mjs",
        "src/mcp-runtime.mjs",
        "scripts/release-all.mjs",
        "scripts/prepare-windows-toolchain.mjs",
        "scripts/prepare-mac-toolchain.mjs",
        "scripts/stage-workflow-kit.mjs",
        "scripts/stage-page-observer.mjs",
        "src/common.mjs",
        "src/contracts/context.mjs",
        "src/execution/files/zip-archive.mjs",
        "src/execution/runtime/mcp-client.mjs",
        "src/execution/runtime/tunnel-setup.mjs",
        "src/execution/runtime/vps-config.mjs",
        "src/execution/runtime/vps.mjs",
        "src/execution/runtime/windows.mjs",
        "src/parallel-kit.mjs",
        "src/session-plans.mjs",
        "src/tunnel-setup.mjs",
        "src/workspace-setup.mjs",
        "src/zip-archive.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/execution-architecture.test.mjs",
        "tests/execution-facade.test.mjs"
      ],
      "documentation_paths": [
        "docs/modules/execution.md",
        "docs/architecture/OVERVIEW.md"
      ],
      "verification_ids": [
        "unit-all",
        "executor-channel",
        "architecture"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "ExecutionFacade обслуживает команды/stdin/файлы/службы с точными ID и исходом success/error/cancel/UNKNOWN; JS/Python runtime не импортирует внутренности Control. Mac/Windows сохраняют семантику; process/session owners и освобождение ресурсов явны.",
        "Собственные runtime identity и оба канала не захватывают службы/порты донора; VPS endpoint/alias/loopback mapping конфигурируются явно, конфликт даёт отказ. Настройки сервера не меняются.",
        "На готовом анализаторе настроен npm run check:architecture; правило уже проверяет выделенную границу, временные legacy-исключения конкретны и удаляются T011. Переключены потребители, проверки через пользовательские/IPC входы не заменены внутренними вызовами."
      ],
      "expected_commit_message": "refactor: Выделить Execution для команд, файлов и служб",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T003",
        "role": "implementation"
      },
      "actual_files": [
        ".dependency-cruiser.cjs",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/execution.md",
        "package-lock.json",
        "package.json",
        "src/common.mjs",
        "src/contracts/context.mjs",
        "src/contracts/errors.mjs",
        "src/contracts/execution.mjs",
        "src/execution/commands/service.mjs",
        "src/execution/facade.mjs",
        "src/execution/files/adapter.mjs",
        "src/execution/files/zip-archive.mjs",
        "src/execution/platform/paths.mjs",
        "src/execution/runtime/mcp-client.mjs",
        "src/execution/runtime/service.mjs",
        "src/execution/runtime/tunnel-setup.mjs",
        "src/execution/runtime/vps-config.mjs",
        "src/execution/runtime/vps.mjs",
        "src/execution/runtime/windows.mjs",
        "src/mac-runtime-switch.mjs",
        "src/main.mjs",
        "src/mcp-runtime.mjs",
        "src/parallel-kit.mjs",
        "src/platform.mjs",
        "src/session-plans.mjs",
        "src/tunnel-setup.mjs",
        "src/vps-tunnel.mjs",
        "src/windows-runtime.mjs",
        "src/workspace-setup.mjs",
        "src/zip-archive.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/execution-architecture.test.mjs",
        "tests/execution-facade.test.mjs",
        "tests/mac-runtime-switch.test.mjs",
        "tests/vps-tunnel.test.mjs",
        "tests/windows-runtime.test.mjs",
        "tools/codex-app-server-mcp/control.py"
      ]
    },
    {
      "id": "T004",
      "title": "Выделить браузерный модуль Execution",
      "why": "Выделить браузерный модуль Execution",
      "dependencies": [
        "T003"
      ],
      "parallel_safe": false,
      "functional_paths": [
        "src/execution/browser/session-runtime.mjs",
        "src/execution/browser/chatgpt-dom.mjs",
        "src/execution/browser/chatgpt-composer.mjs",
        "src/execution/browser/chatgpt-experience.mjs",
        "src/execution/browser/chatgpt-page-observer.mjs",
        "src/execution/browser/page-state.mjs",
        "src/contracts/control.mjs",
        "src/contracts/execution.mjs",
        "src/contracts/errors.mjs",
        "src/main.mjs",
        "src/session-runtime.mjs",
        "src/conversation-recovery.mjs",
        "src/chatgpt-dom.mjs",
        "src/chatgpt-composer.mjs",
        "src/chatgpt-experience.mjs",
        "src/chatgpt-page-observer.mjs",
        "scripts/stage-page-observer.mjs",
        "tests/chatgpt-dom.test.mjs",
        "tests/chatgpt-composer.test.mjs",
        "tests/page-state.test.mjs",
        "tests/session-runtime.test.mjs",
        "tests/conversation-recovery.test.mjs",
        "src/page-state.mjs",
        "src/page-state-bridge.mjs",
        "src/chatgpt-auto-scroll.mjs",
        "src/chatgpt-colors.mjs",
        "src/chatgpt-title.mjs",
        "src/chatgpt-tool-filter.mjs",
        "src/automation-send-state.mjs",
        "src/agent-timer.mjs",
        ".dependency-cruiser.cjs",
        "scripts/check-installed-release.mjs",
        "scripts/probe-chatgpt-file-paste.mjs",
        "src/browser-startup.mjs",
        "src/context-session.mjs",
        "src/contracts/browser.mjs",
        "src/execution/browser/browser-startup.mjs",
        "src/execution/browser/chatgpt-auto-scroll.mjs",
        "src/execution/browser/chatgpt-colors.mjs",
        "src/execution/browser/chatgpt-title.mjs",
        "src/execution/browser/chatgpt-tool-filter.mjs",
        "src/execution/browser/page-state-bridge.mjs",
        "src/execution/facade.mjs",
        "src/frontend/desktop/browser-host.mjs",
        "src/workspace-session.mjs",
        "tests/auto-plan-restart-fixture.cjs",
        "tests/browser-startup.test.mjs",
        "tests/chatgpt-auto-scroll.test.mjs",
        "tests/chatgpt-colors.test.mjs",
        "tests/chatgpt-title.test.mjs",
        "tests/chatgpt-tool-filter.test.mjs",
        "tests/context-session.test.mjs",
        "tests/electron-smoke.mjs",
        "tests/execution-architecture.test.mjs",
        "tests/parallel-execution-smoke-fixture.cjs"
      ],
      "documentation_paths": [
        "docs/modules/browser.md",
        "docs/architecture/OVERVIEW.md"
      ],
      "verification_ids": [
        "unit-all",
        "electron-smoke",
        "architecture"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Execution/browser владеет страницами/observer/Send/attachment и техническим lifecycle; Control получает сериализуемые результаты/события, логика привязки/recovery остаётся вне браузера. Desktop предоставляет место WebContentsView через узкий host-контракт.",
        "Сохранены публичные DOM-экспорты/pageScript, запрет новых скрытых опросов, full-context once и UNKNOWN no-retry; подписки освобождаются, скрытая сессия сохраняет cwd. Web Pilot Sidebar и внешние профили не меняются.",
        "Стадированный observer и пути preload/ресурсов корректны; базовый сценарий продолжает работать, удалён заменённый мост данного блока."
      ],
      "expected_commit_message": "refactor: Выделить браузерный модуль Execution",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T004",
        "role": "implementation"
      },
      "actual_files": [
        ".dependency-cruiser.cjs",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/browser.md",
        "scripts/check-installed-release.mjs",
        "scripts/probe-chatgpt-file-paste.mjs",
        "scripts/stage-page-observer.mjs",
        "src/browser-startup.mjs",
        "src/chatgpt-auto-scroll.mjs",
        "src/chatgpt-colors.mjs",
        "src/chatgpt-composer.mjs",
        "src/chatgpt-dom.mjs",
        "src/chatgpt-experience.mjs",
        "src/chatgpt-page-observer.mjs",
        "src/chatgpt-title.mjs",
        "src/chatgpt-tool-filter.mjs",
        "src/context-session.mjs",
        "src/contracts/browser.mjs",
        "src/execution/browser/browser-startup.mjs",
        "src/execution/browser/chatgpt-auto-scroll.mjs",
        "src/execution/browser/chatgpt-colors.mjs",
        "src/execution/browser/chatgpt-composer.mjs",
        "src/execution/browser/chatgpt-dom.mjs",
        "src/execution/browser/chatgpt-experience.mjs",
        "src/execution/browser/chatgpt-page-observer.mjs",
        "src/execution/browser/chatgpt-title.mjs",
        "src/execution/browser/chatgpt-tool-filter.mjs",
        "src/execution/browser/page-state-bridge.mjs",
        "src/execution/browser/page-state.mjs",
        "src/execution/browser/session-runtime.mjs",
        "src/execution/facade.mjs",
        "src/frontend/desktop/browser-host.mjs",
        "src/main.mjs",
        "src/page-state-bridge.mjs",
        "src/page-state.mjs",
        "src/session-runtime.mjs",
        "src/workspace-session.mjs",
        "tests/auto-plan-restart-fixture.cjs",
        "tests/browser-startup.test.mjs",
        "tests/chatgpt-auto-scroll.test.mjs",
        "tests/chatgpt-colors.test.mjs",
        "tests/chatgpt-composer.test.mjs",
        "tests/chatgpt-title.test.mjs",
        "tests/chatgpt-tool-filter.test.mjs",
        "tests/context-session.test.mjs",
        "tests/electron-smoke.mjs",
        "tests/execution-architecture.test.mjs",
        "tests/page-state.test.mjs",
        "tests/parallel-execution-smoke-fixture.cjs",
        "tests/session-runtime.test.mjs"
      ]
    },
    {
      "id": "T005",
      "title": "Выделить Control проектов, сессий и контекста",
      "why": "Выделить Control проектов, сессий и контекста",
      "dependencies": [
        "T004"
      ],
      "parallel_safe": false,
      "functional_paths": [
        "src/control/projects/service.mjs",
        "src/control/projects/workspace-setup.mjs",
        "src/control/projects/workspace-deletion.mjs",
        "src/control/projects/project-doctor.mjs",
        "src/control/sessions/service.mjs",
        "src/control/sessions/workspace-session.mjs",
        "src/control/sessions/conversation-recovery.mjs",
        "src/control/context/service.mjs",
        "src/control/context/context-session.mjs",
        "src/control/context/context-inputs.mjs",
        "src/control/context/context-cache.mjs",
        "src/control/facade.mjs",
        "src/contracts/control.mjs",
        "src/contracts/execution.mjs",
        "src/contracts/errors.mjs",
        "src/main.mjs",
        "src/workspace-session.mjs",
        "src/session-plans.mjs",
        "src/context-session.mjs",
        "src/context-inputs.mjs",
        "src/context-cache.mjs",
        "tests/workspace-session.test.mjs",
        "tests/session-plans.test.mjs",
        "tests/context-session.test.mjs",
        "tests/context-cache.test.mjs",
        ".dependency-cruiser.cjs",
        "src/agent-timer.mjs",
        "src/common.mjs",
        "src/control/projects/project-state-cleanup.mjs",
        "src/control/projects/workspace-readiness.mjs",
        "src/control/sessions/agent-timer.mjs",
        "src/control/sessions/session-plans.mjs",
        "src/conversation-recovery.mjs",
        "src/execution/facade.mjs",
        "src/execution/files/adapter.mjs",
        "src/execution/files/diagnostics.mjs",
        "src/project-doctor.mjs",
        "src/project-state-cleanup.mjs",
        "src/session-runtime.mjs",
        "src/workspace-deletion.mjs",
        "src/workspace-readiness.mjs",
        "src/workspace-setup.mjs",
        "tests/control-facade.test.mjs",
        "tests/electron-smoke.mjs",
        "tests/execution-architecture.test.mjs",
        "tests/parallel-execution-smoke-fixture.cjs"
      ],
      "documentation_paths": [
        "docs/modules/control.md",
        "docs/architecture/OVERVIEW.md"
      ],
      "verification_ids": [
        "unit-all",
        "electron-smoke",
        "architecture"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Control владеет проектами/логическими сессиями/привязками и подготовкой recovery; один checkout имеет один plan Kit. Физический IO/страницы предоставляются Execution; Control не импортирует Electron.",
        "Фасад реально используется для создания/выбора проекта и Chat/Work, открытия прежнего чата и восстановления. Нет доступа клиента к внутренним Map/stores, второй копии плана и смены cwd фоновой сессии.",
        "При restart и частичном сбое сохраняется точная принадлежность; нет повторного полного контекста в прежний чат и повторного Send после UNKNOWN; базовый пользовательский сценарий и его ошибки проверены."
      ],
      "expected_commit_message": "refactor: Выделить Control проектов, сессий и контекста",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T005",
        "role": "implementation"
      },
      "actual_files": [
        ".dependency-cruiser.cjs",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/control.md",
        "src/agent-timer.mjs",
        "src/common.mjs",
        "src/context-cache.mjs",
        "src/context-inputs.mjs",
        "src/context-session.mjs",
        "src/contracts/control.mjs",
        "src/contracts/errors.mjs",
        "src/control/context/context-cache.mjs",
        "src/control/context/context-inputs.mjs",
        "src/control/context/context-session.mjs",
        "src/control/context/service.mjs",
        "src/control/facade.mjs",
        "src/control/projects/project-doctor.mjs",
        "src/control/projects/project-state-cleanup.mjs",
        "src/control/projects/service.mjs",
        "src/control/projects/workspace-deletion.mjs",
        "src/control/projects/workspace-readiness.mjs",
        "src/control/projects/workspace-setup.mjs",
        "src/control/sessions/agent-timer.mjs",
        "src/control/sessions/conversation-recovery.mjs",
        "src/control/sessions/service.mjs",
        "src/control/sessions/session-plans.mjs",
        "src/control/sessions/workspace-session.mjs",
        "src/conversation-recovery.mjs",
        "src/execution/facade.mjs",
        "src/execution/files/adapter.mjs",
        "src/execution/files/diagnostics.mjs",
        "src/main.mjs",
        "src/project-doctor.mjs",
        "src/project-state-cleanup.mjs",
        "src/session-plans.mjs",
        "src/session-runtime.mjs",
        "src/workspace-deletion.mjs",
        "src/workspace-readiness.mjs",
        "src/workspace-session.mjs",
        "src/workspace-setup.mjs",
        "tests/control-facade.test.mjs",
        "tests/electron-smoke.mjs",
        "tests/execution-architecture.test.mjs",
        "tests/parallel-execution-smoke-fixture.cjs"
      ]
    },
    {
      "id": "T006",
      "title": "Перенести координацию AutoPlan, Review и исполнителей в Control",
      "why": "Перенести координацию AutoPlan, Review и исполнителей в Control",
      "dependencies": [
        "T005"
      ],
      "parallel_safe": false,
      "functional_paths": [
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/auto-plan.mjs",
        "src/control/workflow/plan-review.mjs",
        "src/control/workflow/parallel-execution.mjs",
        "src/control/workflow/parallel-kit.mjs",
        "src/control/facade.mjs",
        "src/contracts/control.mjs",
        "src/contracts/execution.mjs",
        "src/contracts/errors.mjs",
        "src/main.mjs",
        "src/auto-plan.mjs",
        "src/project-auto-plan.mjs",
        "src/project-session-auto-plan.mjs",
        "src/plan-review.mjs",
        "src/review-continuation.mjs",
        "src/parallel-execution.mjs",
        "src/parallel-kit.mjs",
        "src/executor-session.mjs",
        "tests/auto-plan.test.mjs",
        "tests/project-auto-plan.test.mjs",
        "tests/plan-review.test.mjs",
        "tests/parallel-execution.test.mjs",
        "tests/parallel-finalization.test.mjs",
        "tests/electron-smoke.mjs",
        "src/parallel-settings.mjs",
        "src/auto-plan-state.mjs",
        "src/execution-projection.mjs",
        "src/plan-monitor.mjs",
        "src/execution/facade.mjs",
        "src/execution/commands/service.mjs",
        "src/execution/files/adapter.mjs",
        "src/execution/runtime/service.mjs",
        "src/execution/platform/paths.mjs",
        "src/execution/browser/session-runtime.mjs",
        ".dependency-cruiser.cjs",
        "src/automation-send-state.mjs",
        "src/command-activity.mjs",
        "src/control/context/context-session.mjs",
        "src/control/sessions/workspace-session.mjs",
        "src/control/workflow/auto-plan-state.mjs",
        "src/control/workflow/automation-send-state.mjs",
        "src/control/workflow/command-activity.mjs",
        "src/control/workflow/execution-projection.mjs",
        "src/control/workflow/executor-session.mjs",
        "src/control/workflow/parallel-settings.mjs",
        "src/control/workflow/plan-monitor.mjs",
        "src/control/workflow/project-auto-plan.mjs",
        "src/control/workflow/project-session-auto-plan.mjs",
        "src/control/workflow/review-continuation.mjs",
        "src/execution/commands/activity-probe.mjs",
        "src/execution/files/project-input-watch.mjs",
        "src/project-input-watch.mjs",
        "tests/control-facade.test.mjs",
        "tests/execution-architecture.test.mjs"
      ],
      "documentation_paths": [
        "docs/modules/workflow-execution.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/control.md"
      ],
      "verification_ids": [
        "unit-all",
        "electron-smoke",
        "kit-check",
        "architecture"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Сохранено поведение релиза 0.6.115: кнопки/настройки AutoPlan и Review, sequential в main и parallel через отдельные worktree, снимки max_workers/origin, запреты OFF/Stop/draft/UNKNOWN; новые правила оркестратора не включены.",
        "Control принимает решения о назначениях/Review/допуске интеграции; Execution запускает процессы/страницы, Kit единственный меняет план/транзакции. Явный recipient не подменяется origin/выбранным чатом.",
        "Проходят donor F01–F20/A01–A06 по применимым базовым сценариям: source ready ≠ merge safe, writer/UNKNOWN, диагностическое поручение, последовательная интеграция, final handoff без повтора. Отложенные 0.6.113/114 не возвращены."
      ],
      "expected_commit_message": "refactor: Перенести координацию AutoPlan, Review и исполнителей в Control",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T006",
        "role": "implementation"
      },
      "actual_files": [
        ".dependency-cruiser.cjs",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/control.md",
        "docs/modules/workflow-execution.md",
        "src/auto-plan-state.mjs",
        "src/auto-plan.mjs",
        "src/automation-send-state.mjs",
        "src/command-activity.mjs",
        "src/control/context/context-session.mjs",
        "src/control/facade.mjs",
        "src/control/sessions/workspace-session.mjs",
        "src/control/workflow/auto-plan-state.mjs",
        "src/control/workflow/auto-plan.mjs",
        "src/control/workflow/automation-send-state.mjs",
        "src/control/workflow/command-activity.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/execution-projection.mjs",
        "src/control/workflow/executor-session.mjs",
        "src/control/workflow/parallel-execution.mjs",
        "src/control/workflow/parallel-kit.mjs",
        "src/control/workflow/parallel-settings.mjs",
        "src/control/workflow/plan-monitor.mjs",
        "src/control/workflow/plan-review.mjs",
        "src/control/workflow/project-auto-plan.mjs",
        "src/control/workflow/project-session-auto-plan.mjs",
        "src/control/workflow/review-continuation.mjs",
        "src/execution-projection.mjs",
        "src/execution/commands/activity-probe.mjs",
        "src/execution/facade.mjs",
        "src/execution/files/adapter.mjs",
        "src/execution/files/project-input-watch.mjs",
        "src/executor-session.mjs",
        "src/main.mjs",
        "src/parallel-execution.mjs",
        "src/parallel-kit.mjs",
        "src/parallel-settings.mjs",
        "src/plan-monitor.mjs",
        "src/plan-review.mjs",
        "src/project-auto-plan.mjs",
        "src/project-input-watch.mjs",
        "src/project-session-auto-plan.mjs",
        "src/review-continuation.mjs",
        "tests/control-facade.test.mjs",
        "tests/electron-smoke.mjs",
        "tests/execution-architecture.test.mjs"
      ]
    },
    {
      "id": "T007",
      "title": "Разделить зависимости Kit и обеспечить продолжение донорских проектов",
      "why": "Разделить зависимости Kit и обеспечить продолжение донорских проектов",
      "dependencies": [
        "T006"
      ],
      "parallel_safe": false,
      "functional_paths": [
        "packages/workflow-kit/package.json",
        "packages/workflow-kit/src/cli.mjs",
        "packages/workflow-kit/src/install.mjs",
        "packages/workflow-kit/src/lib/transaction.mjs",
        "packages/workflow-kit/src/lib/task-integration.mjs",
        "packages/workflow-kit/src/lib/validate.mjs",
        "packages/workflow-kit/src/lib/task-assignment.mjs",
        "packages/workflow-kit/src/lib/actions.mjs",
        "packages/workflow-kit/src/lib/plan-review.mjs",
        "packages/workflow-kit/src/lib/recovery.mjs",
        "scripts/stage-workflow-kit.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/auto-plan.mjs",
        "src/control/workflow/plan-review.mjs",
        "src/control/workflow/parallel-execution.mjs",
        "src/control/workflow/parallel-kit.mjs",
        "src/control/projects/service.mjs",
        "src/control/projects/workspace-setup.mjs",
        "src/control/projects/workspace-deletion.mjs",
        "src/control/projects/project-doctor.mjs",
        "src/execution/files/adapter.mjs",
        "tests/migration-compatibility.test.mjs",
        "tests/workflow-kit-upgrade.test.mjs",
        ".dependency-cruiser.cjs",
        "package-lock.json",
        "packages/workflow-kit/src/lib/assignment-contract.mjs",
        "packages/workflow-kit/src/lib/commit-references.mjs",
        "packages/workflow-kit/src/lib/common.mjs",
        "packages/workflow-kit/src/lib/inspection-inputs.mjs",
        "packages/workflow-kit/src/lib/installer.mjs",
        "packages/workflow-kit/src/lib/integration-proof.mjs",
        "packages/workflow-kit/src/lib/review-state.mjs",
        "packages/workflow-kit/src/lib/transaction-state.mjs",
        "packages/workflow-kit/src/lib/validation-rules.mjs",
        "resources/workspace-setup-worker.mjs",
        "src/control/projects/workspace-readiness.mjs",
        "tests/fixtures/released-kit/kit-1.7.2.tar.gz",
        "tests/fixtures/released-kit/manifest.json"
      ],
      "documentation_paths": [
        "docs/modules/project-compatibility.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/workflow-execution.md"
      ],
      "verification_ids": [
        "unit-all",
        "kit-check",
        "migration-compatibility",
        "architecture",
        "electron-smoke"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Исследованные циклы Kit разделены по ответственности; исключение для необходимого цикла точно обосновано/ограничено. packages/workflow-kit — единственный источник; version повышена при изменении owned-файлов, installer обновляет generated/runtime копии штатно.",
        "Новые fixtures на формате донора 1.7.2 подтверждают NONE/ACTIVE/частично DONE, recovery и продолжение без потери identity/плана/истории; неизвестная версия, чужая активная операция и незавершённая транзакция не сбрасываются.",
        "Пользователь открывает папку существующего проекта и создаёт новую сессию без импорта старого app-state; отдельные старые репозитории и реальные проекты не изменяются. Сохраняется безопасный отказ при одновременной работе донора."
      ],
      "expected_commit_message": "refactor: Разделить зависимости Kit и обеспечить продолжение донорских проектов",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T007",
        "role": "implementation"
      },
      "actual_files": [
        ".dependency-cruiser.cjs",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/project-compatibility.md",
        "docs/modules/workflow-execution.md",
        "package-lock.json",
        "packages/workflow-kit/package.json",
        "packages/workflow-kit/src/lib/actions.mjs",
        "packages/workflow-kit/src/lib/assignment-contract.mjs",
        "packages/workflow-kit/src/lib/commit-references.mjs",
        "packages/workflow-kit/src/lib/common.mjs",
        "packages/workflow-kit/src/lib/inspection-inputs.mjs",
        "packages/workflow-kit/src/lib/installer.mjs",
        "packages/workflow-kit/src/lib/integration-proof.mjs",
        "packages/workflow-kit/src/lib/plan-review.mjs",
        "packages/workflow-kit/src/lib/recovery.mjs",
        "packages/workflow-kit/src/lib/review-state.mjs",
        "packages/workflow-kit/src/lib/task-assignment.mjs",
        "packages/workflow-kit/src/lib/task-integration.mjs",
        "packages/workflow-kit/src/lib/transaction-state.mjs",
        "packages/workflow-kit/src/lib/transaction.mjs",
        "packages/workflow-kit/src/lib/validate.mjs",
        "packages/workflow-kit/src/lib/validation-rules.mjs",
        "resources/workspace-setup-worker.mjs",
        "src/control/projects/workspace-readiness.mjs",
        "tests/fixtures/released-kit/kit-1.7.2.tar.gz",
        "tests/fixtures/released-kit/manifest.json",
        "tests/migration-compatibility.test.mjs",
        "tests/workflow-kit-upgrade.test.mjs"
      ]
    },
    {
      "id": "T008",
      "title": "Завершить Frontend, первый запуск и управление проектами",
      "why": "Завершить Frontend, первый запуск и управление проектами",
      "dependencies": [
        "T007"
      ],
      "parallel_safe": false,
      "functional_paths": [
        "src/frontend/desktop/bootstrap.mjs",
        "src/frontend/desktop/preload.cjs",
        "src/frontend/desktop/ipc.mjs",
        "src/frontend/desktop/ui/index.html",
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/frontend/desktop/ui/startup.mjs",
        "src/control/facade.mjs",
        "src/control/projects/service.mjs",
        "src/control/sessions/service.mjs",
        "src/control/context/service.mjs",
        "src/control/workflow/coordination.mjs",
        "src/execution/facade.mjs",
        "src/execution/commands/service.mjs",
        "src/execution/files/adapter.mjs",
        "src/execution/runtime/service.mjs",
        "src/execution/platform/paths.mjs",
        "src/execution/browser/session-runtime.mjs",
        "src/contracts/control.mjs",
        "src/contracts/execution.mjs",
        "src/contracts/errors.mjs",
        "src/main.mjs",
        "src/preload.cjs",
        "src/ui/index.html",
        "src/ui/sidebar.mjs",
        "src/ui/startup.mjs",
        "src/ui/settings-panel.mjs",
        "resources/mac-permissions.plist",
        "resources/workspace-setup-worker.mjs",
        "resources/runtime-control/windows-control.py",
        "tests/sidebar.test.mjs",
        "tests/startup-ui.test.mjs",
        "tests/workspace-setup.test.mjs",
        "tests/project-doctor.test.mjs",
        "tests/workspace-deletion.test.mjs",
        "tests/project-state-cleanup.test.mjs",
        "src/workspace-setup.mjs",
        "src/project-doctor.mjs",
        "src/workspace-deletion.mjs",
        "src/project-state-cleanup.mjs",
        "src/startup-readiness.mjs",
        "src/startup-platform.mjs",
        "src/browser-startup.mjs",
        "src/tunnel-setup.mjs",
        "src/tunnel-clipboard.mjs",
        "src/archive-preload.cjs",
        "package.json",
        ".dependency-cruiser.cjs",
        "scripts/check-installed-release.mjs",
        "src/chat-colors-preload.cjs",
        "src/chat-colors-window.mjs",
        "src/chromium-diagnostics.mjs",
        "src/contracts/chat-colors.mjs",
        "src/contracts/desktop.mjs",
        "src/contracts/parallel-settings.mjs",
        "src/contracts/tunnel.mjs",
        "src/contracts/workflow-view.mjs",
        "src/control/projects/lifecycle.mjs",
        "src/control/settings/service.mjs",
        "src/control/startup/platform.mjs",
        "src/control/startup/public-state.mjs",
        "src/control/startup/readiness.mjs",
        "src/control/startup/tunnel-clipboard.mjs",
        "src/control/workflow/execution-projection.mjs",
        "src/control/workflow/parallel-settings.mjs",
        "src/execution/browser/chatgpt-colors.mjs",
        "src/execution/browser/diagnostics.mjs",
        "src/execution/browser/startup-network-trace.mjs",
        "src/execution/platform/mac-setup.mjs",
        "src/execution/runtime/tunnel-setup.mjs",
        "src/frontend/desktop/application.mjs",
        "src/frontend/desktop/archive-preload.cjs",
        "src/frontend/desktop/chat-colors-preload.cjs",
        "src/frontend/desktop/chat-colors-window.mjs",
        "src/frontend/desktop/mac-installation.mjs",
        "src/frontend/desktop/ui/archive.html",
        "src/frontend/desktop/ui/archive.mjs",
        "src/frontend/desktop/ui/chat-colors.html",
        "src/frontend/desktop/ui/chat-colors.mjs",
        "src/frontend/desktop/ui/progress.mjs",
        "src/frontend/desktop/ui/project-doctor.mjs",
        "src/frontend/desktop/ui/settings-panel.mjs",
        "src/frontend/desktop/ui/workspace-setup.mjs",
        "src/startup-network-trace.mjs",
        "src/ui/archive.html",
        "src/ui/archive.mjs",
        "src/ui/chat-colors.html",
        "src/ui/chat-colors.mjs",
        "src/ui/progress.mjs",
        "src/ui/project-doctor.mjs",
        "src/ui/workspace-setup.mjs",
        "tests/desktop-boundaries.test.mjs",
        "tests/parallel-execution-ui.test.mjs",
        "tests/progress.test.mjs",
        "tests/project-doctor-ui.test.mjs",
        "tests/release-all.test.mjs",
        "tests/settings-chatgpt-channel.test.mjs",
        "tests/settings-parallel-execution.test.mjs",
        "tests/startup-readiness.test.mjs"
      ],
      "documentation_paths": [
        "docs/modules/desktop.md",
        "docs/modules/first-run-onboarding.md",
        "docs/modules/project-lifecycle.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/control.md",
        "docs/planning/migration-0.1.0.md",
        "docs/planning/migration-platforms.md"
      ],
      "verification_ids": [
        "unit-all",
        "electron-smoke",
        "architecture"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Desktop bootstrap только собирает зависимости; renderer/preload/IPC используют узкие защищённые границы Control. Перенесены настройки, план/исполнители, архив/удаление и Доктор; один владелец состояния, работающее одно окно с Chromium.",
        "Перенесён мастер входа/регистрации ChatGPT, подготовки компьютера, Secure MCP Tunnel/VPS, туннельного ID/адреса и коннектора; секреты не попадают в snapshot/диагностику. Реальные действия пользователя не имитируются.",
        "Сохранены адресная остановка, old boot/пропавший исполнитель/UNKNOWN, identity ребёнка/родителя и соседнего проекта; неподтверждённые команды автоматически не списываются. UI доступен пользователю для первой проверки Mac, fixtures не меняют реальные службы.",
        "Готовые конфигурации не захватываются из донора; собственный VPS маршрут пока не настроен — видимый setup-required. Локальное приложение может работать с собственным Secure MCP Tunnel."
      ],
      "expected_commit_message": "refactor: Завершить Frontend, первый запуск и управление проектами",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T008",
        "role": "implementation"
      },
      "actual_files": [
        ".dependency-cruiser.cjs",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/control.md",
        "docs/modules/desktop.md",
        "docs/modules/first-run-onboarding.md",
        "docs/modules/project-lifecycle.md",
        "docs/planning/migration-0.1.0.md",
        "docs/planning/migration-platforms.md",
        "scripts/check-installed-release.mjs",
        "src/archive-preload.cjs",
        "src/chat-colors-preload.cjs",
        "src/chat-colors-window.mjs",
        "src/chromium-diagnostics.mjs",
        "src/contracts/chat-colors.mjs",
        "src/contracts/desktop.mjs",
        "src/contracts/parallel-settings.mjs",
        "src/contracts/tunnel.mjs",
        "src/contracts/workflow-view.mjs",
        "src/control/facade.mjs",
        "src/control/projects/lifecycle.mjs",
        "src/control/settings/service.mjs",
        "src/control/startup/platform.mjs",
        "src/control/startup/public-state.mjs",
        "src/control/startup/readiness.mjs",
        "src/control/startup/tunnel-clipboard.mjs",
        "src/control/workflow/execution-projection.mjs",
        "src/control/workflow/parallel-settings.mjs",
        "src/execution/browser/chatgpt-colors.mjs",
        "src/execution/browser/diagnostics.mjs",
        "src/execution/browser/startup-network-trace.mjs",
        "src/execution/platform/mac-setup.mjs",
        "src/execution/runtime/tunnel-setup.mjs",
        "src/frontend/desktop/application.mjs",
        "src/frontend/desktop/archive-preload.cjs",
        "src/frontend/desktop/bootstrap.mjs",
        "src/frontend/desktop/chat-colors-preload.cjs",
        "src/frontend/desktop/chat-colors-window.mjs",
        "src/frontend/desktop/ipc.mjs",
        "src/frontend/desktop/mac-installation.mjs",
        "src/frontend/desktop/preload.cjs",
        "src/frontend/desktop/ui/archive.html",
        "src/frontend/desktop/ui/archive.mjs",
        "src/frontend/desktop/ui/chat-colors.html",
        "src/frontend/desktop/ui/chat-colors.mjs",
        "src/frontend/desktop/ui/index.html",
        "src/frontend/desktop/ui/progress.mjs",
        "src/frontend/desktop/ui/project-doctor.mjs",
        "src/frontend/desktop/ui/settings-panel.mjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/frontend/desktop/ui/startup.mjs",
        "src/frontend/desktop/ui/workspace-setup.mjs",
        "src/main.mjs",
        "src/preload.cjs",
        "src/startup-network-trace.mjs",
        "src/startup-platform.mjs",
        "src/startup-readiness.mjs",
        "src/tunnel-clipboard.mjs",
        "src/ui/archive.html",
        "src/ui/archive.mjs",
        "src/ui/chat-colors.html",
        "src/ui/chat-colors.mjs",
        "src/ui/index.html",
        "src/ui/progress.mjs",
        "src/ui/project-doctor.mjs",
        "src/ui/settings-panel.mjs",
        "src/ui/sidebar.mjs",
        "src/ui/startup.mjs",
        "src/ui/workspace-setup.mjs",
        "tests/desktop-boundaries.test.mjs",
        "tests/parallel-execution-ui.test.mjs",
        "tests/progress.test.mjs",
        "tests/project-doctor-ui.test.mjs",
        "tests/release-all.test.mjs",
        "tests/settings-chatgpt-channel.test.mjs",
        "tests/settings-parallel-execution.test.mjs",
        "tests/sidebar.test.mjs",
        "tests/startup-readiness.test.mjs",
        "tests/startup-ui.test.mjs"
      ]
    },
    {
      "id": "T009",
      "title": "Реализовать Linux runtime и первый запуск Ubuntu x64",
      "why": "Реализовать Linux runtime и первый запуск Ubuntu x64",
      "dependencies": [
        "T008"
      ],
      "parallel_safe": false,
      "functional_paths": [
        "src/execution/platform/linux/runtime.mjs",
        "src/execution/platform/linux/startup.mjs",
        "src/execution/platform/linux/services.mjs",
        "src/execution/runtime/service.mjs",
        "src/execution/runtime/mcp-runtime.mjs",
        "src/execution/runtime/vps-tunnel.mjs",
        "src/frontend/desktop/bootstrap.mjs",
        "src/frontend/desktop/preload.cjs",
        "src/frontend/desktop/ipc.mjs",
        "src/frontend/desktop/ui/index.html",
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/frontend/desktop/ui/startup.mjs",
        "src/control/facade.mjs",
        "src/control/projects/service.mjs",
        "src/control/sessions/service.mjs",
        "src/control/context/service.mjs",
        "src/control/workflow/coordination.mjs",
        "tools/codex-app-server-mcp/control.py",
        "tools/codex-app-server-mcp/server.py",
        "tools/codex-app-server-mcp/app_server_client.py",
        "tools/codex-app-server-mcp/codex-tools.lock.json",
        "tools/codex-app-server-mcp/requirements.txt",
        "tools/codex-app-server-mcp/windows_desktop.py",
        "tools/codex-app-server-mcp/linux_desktop.py",
        "resources/runtime-control/windows-control.py",
        "resources/runtime-control/linux-control.py",
        "scripts/prepare-linux-toolchain.mjs",
        "tests/linux-runtime.test.mjs",
        "tests/linux-startup.test.mjs",
        "src/execution/commands/service.mjs",
        "src/execution/commands/command-activity.mjs",
        "src/execution/browser/session-runtime.mjs",
        "src/execution/browser/chatgpt-dom.mjs",
        "src/execution/browser/chatgpt-composer.mjs",
        "src/execution/browser/chatgpt-experience.mjs",
        "src/execution/browser/chatgpt-page-observer.mjs",
        "src/execution/browser/page-state.mjs",
        "src/contracts/control.mjs",
        "src/contracts/execution.mjs",
        "src/contracts/errors.mjs",
        "src/control/startup/platform.mjs",
        "src/control/startup/readiness.mjs",
        "src/execution/platform/linux/toolchain.mjs",
        "src/execution/platform/paths.mjs",
        "src/execution/runtime/vps.mjs",
        "src/frontend/desktop/application.mjs",
        "src/frontend/desktop/ui/settings-panel.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/fixtures/linux-platform.py",
        "tests/settings-chatgpt-channel.test.mjs",
        "tests/startup-platform.test.mjs",
        "tools/codex-app-server-mcp/linux_runtime.py",
        "tools/codex-app-server-mcp/requirements-linux.in",
        "tools/codex-app-server-mcp/requirements-linux.lock",
        "tools/codex-app-server-mcp/tunnel_prompt.py"
      ],
      "documentation_paths": [
        "docs/modules/linux.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/first-run-onboarding.md"
      ],
      "verification_ids": [
        "unit-all",
        "linux-platform",
        "architecture",
        "electron-smoke"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Linux Ubuntu 24.04 LTS x64/X11 поддерживает реальный Codex executor, Node/Python/uv/rg/Git/tunnel-client, XDG-пути/права, user-службы, stdin/группы процессов/terminal evidence и оба канала без hardcoded darwin fallback.",
        "Мастер подключён к Linux, Chromium/preload/observer и команды пользователя имеют реальную реализацию. Наблюдение окон/экрана X11 реализовано; Wayland/неподдерживаемая среда дают явное ограничение, без обхода sandbox и управления UI.",
        "Проверены ошибки отсутствующих компонентов, Unicode/пробелы, executable bits, register case и restart. Fixtures на Mac отделены от native Linux; живую VM проверяет пользователь позднее. VPS пользователя не переоборудован в desktop."
      ],
      "expected_commit_message": "refactor: Реализовать Linux runtime и первый запуск Ubuntu x64",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T009",
        "role": "implementation"
      },
      "actual_files": [
        "docs/architecture/OVERVIEW.md",
        "docs/modules/first-run-onboarding.md",
        "docs/modules/linux.md",
        "scripts/prepare-linux-toolchain.mjs",
        "src/control/startup/platform.mjs",
        "src/control/startup/readiness.mjs",
        "src/execution/platform/linux/runtime.mjs",
        "src/execution/platform/linux/services.mjs",
        "src/execution/platform/linux/startup.mjs",
        "src/execution/platform/linux/toolchain.mjs",
        "src/execution/platform/paths.mjs",
        "src/execution/runtime/service.mjs",
        "src/execution/runtime/vps.mjs",
        "src/frontend/desktop/application.mjs",
        "src/frontend/desktop/bootstrap.mjs",
        "src/frontend/desktop/ui/settings-panel.mjs",
        "src/frontend/desktop/ui/startup.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/fixtures/linux-platform.py",
        "tests/linux-runtime.test.mjs",
        "tests/linux-startup.test.mjs",
        "tests/settings-chatgpt-channel.test.mjs",
        "tests/startup-platform.test.mjs",
        "tools/codex-app-server-mcp/app_server_client.py",
        "tools/codex-app-server-mcp/control.py",
        "tools/codex-app-server-mcp/linux_desktop.py",
        "tools/codex-app-server-mcp/linux_runtime.py",
        "tools/codex-app-server-mcp/requirements-linux.in",
        "tools/codex-app-server-mcp/requirements-linux.lock",
        "tools/codex-app-server-mcp/requirements.txt",
        "tools/codex-app-server-mcp/server.py",
        "tools/codex-app-server-mcp/tunnel_prompt.py"
      ]
    },
    {
      "id": "T010",
      "title": "Подготовить единую поставку трёх платформ",
      "why": "Подготовить единую поставку трёх платформ",
      "dependencies": [
        "T009"
      ],
      "parallel_safe": false,
      "functional_paths": [
        "package.json",
        "package-lock.json",
        "scripts/release-all.mjs",
        "scripts/release-mac.mjs",
        "scripts/release-linux.mjs",
        "scripts/prepare-linux-toolchain.mjs",
        "scripts/verify-linux-package.mjs",
        "scripts/check-installed-release.mjs",
        "scripts/check-github-release.mjs",
        "scripts/sign-mac-bundle.mjs",
        "tests/release-all.test.mjs",
        "tests/release-mac.test.mjs",
        "tests/release-linux.test.mjs",
        "scripts/prepare-windows-toolchain.mjs",
        "scripts/verify-windows-package.mjs",
        "scripts/prepare-mac-toolchain.mjs",
        "scripts/check-mac-signature.mjs",
        "src/execution/platform/paths.mjs",
        "src/execution/platform/mac-runtime.mjs",
        "src/execution/platform/windows-runtime.mjs",
        "src/execution/platform/linux/runtime.mjs",
        "src/execution/runtime/service.mjs",
        "src/execution/runtime/mcp-runtime.mjs",
        "src/execution/runtime/vps-tunnel.mjs",
        ".gitignore",
        "scripts/release-archive.mjs",
        "scripts/release-package.mjs",
        "scripts/stage-vendor-notices.mjs"
      ],
      "documentation_paths": [
        "docs/modules/release.md",
        "docs/architecture/OVERVIEW.md",
        "resources/THIRD-PARTY.md"
      ],
      "verification_ids": [
        "unit-all",
        "release-tooling"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "npm run build настроен на обязательные macOS arm64, Windows x64, Linux x64; единые version/sourceCommit/lock, полный manifest, artifacts по size/digest, исходники/Kit/preload/HTML/workers/observer проверяются на трёх платформах.",
        "Инструменты используют только Workflow Pilot identity/пути/repo, набор assets вычисляется для новой матрицы; неизвестный исход/ошибка платформы не публикует частичный выпуск. Подпись нового продукта явная, без автовыбора пользовательского сертификата.",
        "Fixture-проверки подтверждают отсутствие donor path/force-lease наследия, вложенного app, runtime/секретов в пакетах; собственная установка с rollback и no-rebuild проверена. Production-сборка, подпись, установка и push здесь не выполняются.",
        "Windows vendor архив скачивается только из закреплённого asset v0.6.115 по SHA, без donor runtime/latest и самоссылки на ещё отсутствующий Release; историческое имя архива сохраняется отдельным asset. Собственные WEB_PILOT_*/.web-pilot-* runtime/env/marker имена заменены на Workflow Pilot.",
        "Корневой release-manifest.json — tracked byte-copy manifest комплекта, не входит в source snapshot; T012 создаёт её, T013/T014 только сверяют digest с staging/Downloads/asset, статусы операций сохраняются в evidence Kit без изменения manifest."
      ],
      "expected_commit_message": "refactor: Подготовить единую поставку трёх платформ",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T010",
        "role": "implementation"
      },
      "actual_files": [
        ".gitignore",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/release.md",
        "package.json",
        "resources/THIRD-PARTY.md",
        "scripts/check-github-release.mjs",
        "scripts/check-installed-release.mjs",
        "scripts/check-mac-signature.mjs",
        "scripts/release-all.mjs",
        "scripts/release-archive.mjs",
        "scripts/release-linux.mjs",
        "scripts/release-mac.mjs",
        "scripts/release-package.mjs",
        "scripts/stage-vendor-notices.mjs",
        "scripts/verify-linux-package.mjs",
        "scripts/verify-windows-package.mjs",
        "tests/release-all.test.mjs",
        "tests/release-linux.test.mjs",
        "tests/release-mac.test.mjs"
      ]
    },
    {
      "id": "T011",
      "title": "Проверить общий результат и удалить временные мосты",
      "why": "Проверить общий результат и удалить временные мосты",
      "dependencies": [
        "T010"
      ],
      "parallel_safe": false,
      "functional_paths": [
        "src/main.mjs",
        "src/common.mjs",
        "src/platform.mjs",
        "src/control/facade.mjs",
        "src/execution/facade.mjs",
        "src/frontend/desktop/bootstrap.mjs",
        "resources/mac-permissions.plist",
        "resources/workspace-setup-worker.mjs",
        "resources/runtime-control/windows-control.py",
        "scripts/release-all.mjs",
        "scripts/prepare-windows-toolchain.mjs",
        "scripts/prepare-mac-toolchain.mjs",
        "scripts/stage-workflow-kit.mjs",
        "scripts/stage-page-observer.mjs",
        "tools/codex-app-server-mcp/control.py",
        "tools/codex-app-server-mcp/server.py",
        "tools/codex-app-server-mcp/app_server_client.py",
        "tools/codex-app-server-mcp/codex-tools.lock.json",
        "tools/codex-app-server-mcp/requirements.txt",
        "tools/codex-app-server-mcp/windows_desktop.py",
        "tools/codex-app-server-mcp/linux_desktop.py",
        "packages/workflow-kit/package.json",
        "packages/workflow-kit/src/cli.mjs",
        "packages/workflow-kit/src/install.mjs",
        "packages/workflow-kit/src/lib/transaction.mjs",
        "packages/workflow-kit/src/lib/task-integration.mjs",
        "packages/workflow-kit/src/lib/validate.mjs",
        "packages/workflow-kit/src/lib/task-assignment.mjs",
        "packages/workflow-kit/src/lib/actions.mjs",
        "packages/workflow-kit/src/lib/plan-review.mjs",
        "packages/workflow-kit/src/lib/recovery.mjs",
        "tests/electron-smoke.mjs",
        "tests/parallel-execution.test.mjs",
        "tests/migration-compatibility.test.mjs",
        "tests/linux-runtime.test.mjs",
        "tests/linux-startup.test.mjs",
        ".dependency-cruiser.cjs",
        "scripts/check-github-release.mjs",
        "scripts/check-mac-screen-capture.mjs",
        "scripts/check-mac-signature.mjs",
        "scripts/release-archive.mjs",
        "scripts/release-linux.mjs",
        "scripts/release-mac.mjs",
        "scripts/release-package.mjs",
        "scripts/stage-vendor-notices.mjs",
        "scripts/verify-windows-package.mjs",
        "src/agent-timer.mjs",
        "src/auto-plan-state.mjs",
        "src/auto-plan.mjs",
        "src/automation-send-state.mjs",
        "src/chromium-diagnostics.mjs",
        "src/command-activity.mjs",
        "src/context-cache.mjs",
        "src/context-inputs.mjs",
        "src/context-session.mjs",
        "src/conversation-recovery.mjs",
        "src/execution-projection.mjs",
        "src/execution/platform/paths.mjs",
        "src/executor-session.mjs",
        "src/mac-runtime-switch.mjs",
        "src/mcp-runtime.mjs",
        "src/parallel-execution.mjs",
        "src/parallel-kit.mjs",
        "src/parallel-settings.mjs",
        "src/plan-monitor.mjs",
        "src/plan-review.mjs",
        "src/project-auto-plan.mjs",
        "src/project-doctor.mjs",
        "src/project-input-watch.mjs",
        "src/project-session-auto-plan.mjs",
        "src/project-state-cleanup.mjs",
        "src/review-continuation.mjs",
        "src/session-plans.mjs",
        "src/session-runtime.mjs",
        "src/startup-network-trace.mjs",
        "src/startup-platform.mjs",
        "src/startup-readiness.mjs",
        "src/tunnel-clipboard.mjs",
        "src/tunnel-setup.mjs",
        "src/vps-tunnel.mjs",
        "src/windows-runtime.mjs",
        "src/workspace-deletion.mjs",
        "src/workspace-readiness.mjs",
        "src/workspace-session.mjs",
        "src/workspace-setup.mjs",
        "src/zip-archive.mjs",
        "tests/agent-timer.test.mjs",
        "tests/auto-plan-restart-fixture.cjs",
        "tests/auto-plan.test.mjs",
        "tests/automation-send-state.test.mjs",
        "tests/chatgpt-experience.test.mjs",
        "tests/chromium-diagnostics.test.mjs",
        "tests/command-activity.test.mjs",
        "tests/common.test.mjs",
        "tests/context-cache.test.mjs",
        "tests/context-session.test.mjs",
        "tests/conversation-recovery.test.mjs",
        "tests/execution-architecture.test.mjs",
        "tests/installed-observer-fixture.cjs",
        "tests/mac-runtime-switch.test.mjs",
        "tests/mac-toolchain.test.mjs",
        "tests/mcp-runtime.test.mjs",
        "tests/parallel-execution-recovery.test.mjs",
        "tests/parallel-execution-smoke-fixture.cjs",
        "tests/parallel-execution-ui.test.mjs",
        "tests/parallel-finalization.test.mjs",
        "tests/plan-monitor.test.mjs",
        "tests/plan-review.test.mjs",
        "tests/product-identity.test.mjs",
        "tests/project-auto-plan.test.mjs",
        "tests/project-doctor-ui.test.mjs",
        "tests/project-doctor.test.mjs",
        "tests/project-input-watch.test.mjs",
        "tests/project-state-cleanup.test.mjs",
        "tests/release-linux.test.mjs",
        "tests/session-opening-performance.test.mjs",
        "tests/session-plans.test.mjs",
        "tests/session-runtime.test.mjs",
        "tests/settings-parallel-execution.test.mjs",
        "tests/sidebar.test.mjs",
        "tests/startup-network-trace.test.mjs",
        "tests/startup-platform.test.mjs",
        "tests/startup-readiness.test.mjs",
        "tests/startup-ui.test.mjs",
        "tests/tunnel-clipboard.test.mjs",
        "tests/tunnel-id-runtime.test.mjs",
        "tests/vps-tunnel.test.mjs",
        "tests/windows-autostart.test.mjs",
        "tests/windows-runtime.test.mjs",
        "tests/workspace-deletion.test.mjs",
        "tests/workspace-readiness.test.mjs",
        "tests/workspace-session.test.mjs",
        "tests/workspace-setup.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/migration-0.1.0.md",
        "docs/planning/migration-platforms.md",
        "docs/acceptance/migration-0.1.0.md"
      ],
      "verification_ids": [
        "unit-all",
        "electron-smoke",
        "kit-check",
        "executor-channel",
        "codex-tools-live",
        "architecture",
        "migration-compatibility",
        "linux-platform",
        "release-tooling"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Все сценарии матрицы сопоставлены с фактическими проверками; полный набор пройден в новом проекте, указаны pass/fail и pending native/VM/clean. Не создаются модельные ходы и не управляется компьютер пользователя.",
        "Удалены временные legacy-пути, обходы фасадов, повторные реализации и неиспользуемые файлы только после проверки динамических/пакетных/внешних входов. Итоговые границы и циклы проверяются готовым анализатором без безразмерных исключений.",
        "Пользователю дан сценарий первой проверки Mac; Windows/Linux/чистая установка остаются его последующими проверками, не заменёнными fixture. Блокирующие регрессии исправлены до DOCS; новая оркестрация не реализована."
      ],
      "expected_commit_message": "refactor: Проверить общий результат и удалить временные мосты",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T011",
        "role": "implementation"
      },
      "actual_files": [
        ".dependency-cruiser.cjs",
        "docs/acceptance/migration-0.1.0.md",
        "docs/planning/migration-0.1.0.md",
        "docs/planning/migration-platforms.md",
        "resources/runtime-control/windows-control.py",
        "scripts/check-github-release.mjs",
        "scripts/check-mac-screen-capture.mjs",
        "scripts/check-mac-signature.mjs",
        "scripts/prepare-mac-toolchain.mjs",
        "scripts/prepare-windows-toolchain.mjs",
        "scripts/release-all.mjs",
        "scripts/release-archive.mjs",
        "scripts/release-linux.mjs",
        "scripts/release-mac.mjs",
        "scripts/release-package.mjs",
        "scripts/stage-vendor-notices.mjs",
        "scripts/verify-windows-package.mjs",
        "src/agent-timer.mjs",
        "src/auto-plan-state.mjs",
        "src/auto-plan.mjs",
        "src/automation-send-state.mjs",
        "src/chromium-diagnostics.mjs",
        "src/command-activity.mjs",
        "src/common.mjs",
        "src/context-cache.mjs",
        "src/context-inputs.mjs",
        "src/context-session.mjs",
        "src/conversation-recovery.mjs",
        "src/execution-projection.mjs",
        "src/execution/platform/paths.mjs",
        "src/executor-session.mjs",
        "src/mac-runtime-switch.mjs",
        "src/mcp-runtime.mjs",
        "src/parallel-execution.mjs",
        "src/parallel-kit.mjs",
        "src/parallel-settings.mjs",
        "src/plan-monitor.mjs",
        "src/plan-review.mjs",
        "src/platform.mjs",
        "src/project-auto-plan.mjs",
        "src/project-doctor.mjs",
        "src/project-input-watch.mjs",
        "src/project-session-auto-plan.mjs",
        "src/project-state-cleanup.mjs",
        "src/review-continuation.mjs",
        "src/session-plans.mjs",
        "src/session-runtime.mjs",
        "src/startup-network-trace.mjs",
        "src/startup-platform.mjs",
        "src/startup-readiness.mjs",
        "src/tunnel-clipboard.mjs",
        "src/tunnel-setup.mjs",
        "src/vps-tunnel.mjs",
        "src/windows-runtime.mjs",
        "src/workspace-deletion.mjs",
        "src/workspace-readiness.mjs",
        "src/workspace-session.mjs",
        "src/workspace-setup.mjs",
        "src/zip-archive.mjs",
        "tests/agent-timer.test.mjs",
        "tests/auto-plan-restart-fixture.cjs",
        "tests/auto-plan.test.mjs",
        "tests/automation-send-state.test.mjs",
        "tests/chatgpt-experience.test.mjs",
        "tests/chromium-diagnostics.test.mjs",
        "tests/command-activity.test.mjs",
        "tests/common.test.mjs",
        "tests/context-cache.test.mjs",
        "tests/context-session.test.mjs",
        "tests/conversation-recovery.test.mjs",
        "tests/electron-smoke.mjs",
        "tests/execution-architecture.test.mjs",
        "tests/installed-observer-fixture.cjs",
        "tests/mac-runtime-switch.test.mjs",
        "tests/mac-toolchain.test.mjs",
        "tests/mcp-runtime.test.mjs",
        "tests/parallel-execution-recovery.test.mjs",
        "tests/parallel-execution-smoke-fixture.cjs",
        "tests/parallel-execution-ui.test.mjs",
        "tests/parallel-execution.test.mjs",
        "tests/parallel-finalization.test.mjs",
        "tests/plan-monitor.test.mjs",
        "tests/plan-review.test.mjs",
        "tests/product-identity.test.mjs",
        "tests/project-auto-plan.test.mjs",
        "tests/project-doctor-ui.test.mjs",
        "tests/project-doctor.test.mjs",
        "tests/project-input-watch.test.mjs",
        "tests/project-state-cleanup.test.mjs",
        "tests/release-linux.test.mjs",
        "tests/session-opening-performance.test.mjs",
        "tests/session-plans.test.mjs",
        "tests/session-runtime.test.mjs",
        "tests/settings-parallel-execution.test.mjs",
        "tests/sidebar.test.mjs",
        "tests/startup-network-trace.test.mjs",
        "tests/startup-platform.test.mjs",
        "tests/startup-readiness.test.mjs",
        "tests/startup-ui.test.mjs",
        "tests/tunnel-clipboard.test.mjs",
        "tests/tunnel-id-runtime.test.mjs",
        "tests/vps-tunnel.test.mjs",
        "tests/windows-autostart.test.mjs",
        "tests/windows-runtime.test.mjs",
        "tests/workspace-deletion.test.mjs",
        "tests/workspace-readiness.test.mjs",
        "tests/workspace-session.test.mjs",
        "tests/workspace-setup.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "DOCS",
        "role": "implementation",
        "iteration": 1
      },
      "id": "DOCS",
      "title": "Актуализация всех документов проекта",
      "why": "Перед выпуском сверить README, OVERVIEW и действующие контракты модулей с результатом; обновить устаревшее.",
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
        "docs/architecture/OVERVIEW.md",
        "docs/planning/migration-0.1.0.md",
        "docs/planning/migration-platforms.md",
        "docs/planning/orchestrated-execution-next.md",
        "AGENTS.md",
        "docs/modules/execution.md",
        "docs/modules/browser.md",
        "docs/modules/control.md",
        "docs/modules/workflow-execution.md",
        "docs/modules/project-compatibility.md",
        "docs/modules/desktop.md",
        "docs/modules/first-run-onboarding.md",
        "docs/modules/project-lifecycle.md",
        "docs/modules/linux.md",
        "docs/modules/release.md",
        "PROVENANCE.md",
        "README.md",
        "packages/workflow-kit/README.md",
        "packages/workflow-kit/docs/modules/parallel-assignments.md",
        "packages/workflow-kit/docs/modules/workflow-kit-package.md",
        "packages/workflow-kit/src/WORKFLOW.md",
        "packages/workflow-kit/src/examples/PACKAGING.md",
        "packages/workflow-kit/src/templates/AGENTS.md",
        "packages/workflow-kit/src/templates/CONTINUE.md",
        "packages/workflow-kit/src/templates/PLAN.md",
        "packages/workflow-kit/src/templates/PROTOTYPE.md",
        "packages/workflow-kit/src/templates/SPEC.md",
        "packages/workflow-kit/src/templates/STAGES.md",
        "tests/fixtures/released-kit/README.md",
        "resources/THIRD-PARTY.md",
        "docs/acceptance/migration-0.1.0.md"
      ],
      "acceptance_criteria": [
        "Документы описывают текущий результат, существенное из выпущенных рабочих спецификаций перенесено в контракты модулей; история остаётся в Git."
      ],
      "verification_ids": [],
      "expected_commit_message": "docs: актуализировать документацию проекта",
      "parallel_safe": false,
      "actual_files": [
        "AGENTS.md",
        "PROVENANCE.md",
        "README.md",
        "docs/acceptance/migration-0.1.0.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/browser.md",
        "docs/modules/control.md",
        "docs/modules/desktop.md",
        "docs/modules/execution.md",
        "docs/modules/linux.md",
        "docs/modules/release.md",
        "docs/modules/workflow-execution.md",
        "docs/planning/migration-0.1.0.md",
        "docs/planning/migration-platforms.md",
        "packages/workflow-kit/README.md",
        "packages/workflow-kit/docs/modules/parallel-assignments.md",
        "packages/workflow-kit/docs/modules/workflow-kit-package.md",
        "tests/fixtures/released-kit/README.md"
      ]
    },
    {
      "id": "T012",
      "title": "Исправить перенос ссылок Linux toolchain перед общим выпуском",
      "why": "Production gate обнаружил абсолютные ссылки из пакета на build-host из-за копирования extraResource в Electron Packager.",
      "dependencies": [
        "T011",
        "DOCS"
      ],
      "parallel_safe": false,
      "functional_paths": [
        "package.json",
        "scripts/copy-linux-toolchain.mjs",
        "tests/release-linux.test.mjs"
      ],
      "documentation_paths": [
        "docs/modules/release.md"
      ],
      "verification_ids": [
        "release-tooling"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Копирование Linux toolchain сохраняет относительные внутренние ссылки и executable bits; ссылки наружу отклоняются до копирования.",
        "Fixture воспроизводит ошибку штатного fs.cp и подтверждает независимость пакета после удаления исходной папки toolchain.",
        "Все release-tooling проверки проходят; production выпуск выполняет отдельная T012-RELEASE после повторной DOCS из новой исходной базы."
      ],
      "expected_commit_message": "fix: сохранить внутренние ссылки Linux toolchain",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T012",
        "role": "implementation"
      },
      "actual_files": [
        "package.json",
        "scripts/copy-linux-toolchain.mjs",
        "tests/release-linux.test.mjs"
      ]
    },
    {
      "id": "DOCS-2",
      "title": "Актуализация всех документов проекта",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "DOCS-2",
        "role": "implementation",
        "iteration": 2
      },
      "why": "Перед выпуском сверить README, OVERVIEW и действующие контракты модулей с результатом; обновить устаревшее.",
      "dependencies": [
        "T012"
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
        "docs/architecture/OVERVIEW.md",
        "docs/modules/release.md"
      ]
    },
    {
      "id": "T012-RELEASE",
      "title": "Проверять штатные ресурсы Electron macOS в общем выпуске",
      "why": "Production gate ошибочно отклоняет штатные локализации и иконку закреплённого Electron.",
      "dependencies": [
        "T012",
        "DOCS",
        "DOCS-2"
      ],
      "parallel_safe": false,
      "functional_paths": [
        "scripts/release-package.mjs",
        "tests/release-all.test.mjs",
        "tests/release-linux.test.mjs"
      ],
      "documentation_paths": [
        "docs/modules/release.md"
      ],
      "verification_ids": [
        "release-tooling"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Языковые ресурсы и иконка macOS сверяются по точному составу и содержимому с закреплённым Electron; неизвестные и повреждённые ресурсы отклоняются.",
        "Fixtures подтверждают штатный macOS layout и отказ при повреждении/пропаже/лишней локализации.",
        "Проверки поставки проходят; T012-BUILD создаёт полный комплект после DOCS из новой исходной базы."
      ],
      "expected_commit_message": "fix: сверять штатные ресурсы Electron macOS",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T012-RELEASE",
        "role": "implementation"
      },
      "actual_files": [
        "scripts/release-package.mjs",
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
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "DOCS-3",
        "role": "implementation",
        "iteration": 3
      },
      "why": "Перед выпуском сверить README, OVERVIEW и действующие контракты модулей с результатом; обновить устаревшее.",
      "dependencies": [
        "T012-RELEASE"
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
        "docs/architecture/OVERVIEW.md",
        "docs/modules/release.md"
      ]
    },
    {
      "id": "T012-BUILD",
      "title": "Собрать общий выпуск Workflow Pilot 0.1.0",
      "why": "Собрать общий выпуск Workflow Pilot 0.1.0",
      "dependencies": [
        "T012-RELEASE",
        "DOCS-2",
        "DOCS-3"
      ],
      "parallel_safe": false,
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "three-platform-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "DOCS завершена до sourceCommit; проверка Kit запускает один общий цикл всех трёх платформ. Получены macOS .app/ZIP, Windows ZIP/компоненты, Linux tar.gz, инструкции/SHA256SUMS/manifest; все artifacts из одной базы.",
        "Состав/staging/архивы/поставка ~/Downloads/WorkflowPilot-0.1.0 сверены по sourceCommit/version/size/digest и необходимым executable/Kit/ресурсам. Нет скрытого пропуска Linux или ложного native-tested.",
        "Новые пути/симлинки/подпись проверены; донор не изменён. Долгая сборка продолжается через session ID. При исправлении исходников весь комплект собирается заново из новой базы; частичные результаты не объявляются выпуском.",
        "Корневой release-manifest.json совпадает побайтово с manifest staging и Downloads, vendor Windows asset включён и проверен по закреплённому SHA."
      ],
      "expected_commit_message": "release: Собрать общий выпуск Workflow Pilot 0.1.0",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T012-BUILD",
        "role": "implementation"
      },
      "actual_files": [
        "release-manifest.json"
      ]
    },
    {
      "id": "T015",
      "title": "Исправить распознавание входа и диагностику первого запуска в 0.1.1",
      "why": "Исправить распознавание входа и диагностику первого запуска в 0.1.1",
      "dependencies": [
        "T012-BUILD"
      ],
      "functional_paths": [
        "src/execution/browser/chatgpt-dom.mjs",
        "src/execution/browser/chatgpt-page-observer.mjs",
        "src/execution/browser/page-state.mjs",
        "src/execution/browser/diagnostics.mjs",
        "src/frontend/desktop/application.mjs",
        "src/frontend/desktop/ui/startup.mjs",
        "src/frontend/desktop/ui/index.html",
        "tests/page-state.test.mjs",
        "tests/startup-ui.test.mjs",
        "tests/chromium-diagnostics.test.mjs",
        "tests/electron-smoke.mjs",
        "scripts/release-all.mjs",
        "tests/release-linux.test.mjs",
        "package.json",
        "package-lock.json"
      ],
      "documentation_paths": [
        "docs/modules/first-run-onboarding.md",
        "AGENTS.md"
      ],
      "verification_ids": [
        "unit-all",
        "electron-smoke",
        "architecture"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Подтверждение входа использует явные признаки профиля либо совокупность личной навигации и редактора; гостевой редактор и ссылки внутри сообщений не подтверждают вход. Наблюдаются поздние изменения доступных имён и ссылок, подписки не создают polling.",
        "Загруженное unknown состояние показывает отдельную повторную проверку входа без перезагрузки и подготовки служб; дальнейшие шаги требуют подтверждённого входа.",
        "Диагностика первого запуска содержит состояние входа, безопасные признаки, актуальное состояние мастера и причины отклонения наблюдения/ошибки observer без текста диалогов, имён, cookies, ключей или полных личных URL.",
        "Пользовательский путь проверен через изолированные DOM и Electron fixtures; живая проверка текущего ChatGPT остаётся за пользователем. Донор только прочитан.",
        "Версия 0.1.1; поставщик допускает замену корневого manifest только при новом номере и совпадении предыдущего manifest с сохранённым проверенным комплектом. Архивы 0.1.0 остаются неизменными.",
        "По уточнению пользователя установка нового готового macOS выпуска в /Applications/Workflow Pilot.app обязательна после сборки; постоянное правило записано в AGENTS.md. Установку выполняет T013 после T016, без перезапуска приложения и изменения донора."
      ],
      "expected_commit_message": "fix: восстановить первый вход и диагностику Workflow Pilot 0.1.1",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T015",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "AGENTS.md",
        "package-lock.json",
        "package.json",
        "scripts/release-all.mjs",
        "src/execution/browser/chatgpt-dom.mjs",
        "src/execution/browser/chatgpt-page-observer.mjs",
        "src/execution/browser/diagnostics.mjs",
        "src/execution/browser/page-state.mjs",
        "src/frontend/desktop/application.mjs",
        "src/frontend/desktop/ui/index.html",
        "src/frontend/desktop/ui/startup.mjs",
        "tests/chromium-diagnostics.test.mjs",
        "tests/electron-smoke.mjs",
        "tests/page-state.test.mjs",
        "tests/release-linux.test.mjs",
        "tests/startup-ui.test.mjs"
      ]
    },
    {
      "id": "DOCS-4",
      "title": "Актуализация всех документов проекта",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "DOCS-4",
        "role": "implementation",
        "iteration": 4
      },
      "why": "Перед выпуском сверить README, OVERVIEW и действующие контракты модулей с результатом; обновить устаревшее.",
      "dependencies": [
        "T015"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/architecture/OVERVIEW.md",
        "docs/modules/first-run-onboarding.md",
        "AGENTS.md",
        "README.md",
        "docs/acceptance/migration-0.1.0.md",
        "docs/modules/browser.md",
        "docs/modules/linux.md",
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
        "docs/acceptance/migration-0.1.0.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/browser.md",
        "docs/modules/first-run-onboarding.md",
        "docs/modules/linux.md",
        "docs/modules/release.md"
      ]
    },
    {
      "id": "T016",
      "title": "Пересобрать исправленный комплект 0.1.1 для macOS, Windows и Linux",
      "why": "Пересобрать исправленный комплект 0.1.1 для macOS, Windows и Linux",
      "dependencies": [
        "T015",
        "DOCS-4"
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
        "После DOCS собраны macOS arm64, Windows x64 и Linux x64 из одного sourceCommit, включающего исправление входа и диагностику; все архивы распакованы и сверены штатной проверкой.",
        "Полный комплект доставлен в Downloads/WorkflowPilot-0.1.1; корневой, staging и поставочный manifest совпадают. Полный комплект 0.1.0 сохранён.",
        "Native/VM/clean-install остаются pending; после сборки T013 обновляет /Applications/Workflow Pilot.app готовым macOS-комплектом. Перезапуск выполняет пользователь; GitHub-публикация остаётся отдельной задачей."
      ],
      "expected_commit_message": "release: собрать исправленный Workflow Pilot 0.1.1 для трёх ОС",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T016",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "release-manifest.json"
      ]
    },
    {
      "id": "T013",
      "title": "Установить готовый macOS выпуск рядом с донором",
      "why": "Установить готовый macOS выпуск рядом с донором",
      "dependencies": [
        "T012-BUILD",
        "DOCS",
        "DOCS-2",
        "DOCS-3",
        "DOCS-4",
        "T016"
      ],
      "parallel_safe": false,
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "release-installed"
      ],
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Установлены только готовые проверенные пакеты T016 версии 0.1.1 без пересборки в <workspace>/Workflow Pilot.app и /Applications/Workflow Pilot.app; sourceCommit, version, manifest/подпись/состав соответствуют.",
        "Назначения и симлинки проверены, предусмотрен откат, донор/его подпись/службы не затронуты. Приложения не перезапускаются и не управляются агентом; запуск и разрешения выполняет пользователь.",
        "Пользователю переданы порядок Mac→Windows→Linux→clean, точные пакеты/пути и ограничения x64 UTM/VPS setup/первого запуска. Неподтверждённая живая приёмка не отмечена выполненной.",
        "Корневой/staging/поставочный manifest имеют одинаковый digest; установочная задача не меняет байты manifest комплекта и не добавляет app bundle в Git."
      ],
      "expected_commit_message": "release: Установить готовый macOS выпуск рядом с донором",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T013",
        "role": "implementation"
      },
      "actual_files": []
    },
    {
      "id": "T014",
      "title": "Опубликовать и сверить полный GitHub Release",
      "why": "Опубликовать и сверить полный GitHub Release",
      "dependencies": [
        "T013",
        "DOCS",
        "DOCS-2",
        "DOCS-3",
        "DOCS-4"
      ],
      "parallel_safe": false,
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "github-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "После DOCS новый origin = https://github.com/OleynikAleksandr/Workflow_Pilot.git; main отправлен fast-forward без force. Тег v0.1.1 на manifest.sourceCommit, Release публикуется после сверки полного комплекта трёх ОС по именам/размерам/digest.",
        "Использованы готовые assets T016, пересборки нет; в Release/manifest честно указаны pending nativeWindows/nativeLinux/clean и режим подписи. После финального коммита выполнены обычный push и повторная сверка remote main=local HEAD, тега и assets.",
        "Даны результат, пути, тесты и дальнейшие действия пользователя; план READY_FOR_ACCEPTANCE, не архивирован без приёмки. Донорский репозиторий и старые теги не менялись.",
        "Manifest asset, корневая и поставочная копии побайтно одинаковы; новые коммиты после dcb2703c8a766d9f1cf7030f6fc69a8af1c8e9be не имеют placeholder-автора. Начальная история до этой границы сохраняется, force/rewrite не выполняются."
      ],
      "expected_commit_message": "release: Опубликовать и сверить полный GitHub Release",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T014",
        "role": "implementation"
      },
      "actual_files": []
    },
    {
      "id": "T017",
      "title": "Добавить плагин ChatGPT для открытия проекта и создания внешней сессии",
      "why": "Добавить плагин ChatGPT для открытия проекта и создания внешней сессии",
      "dependencies": [],
      "functional_paths": [
        "src/control/facade.mjs",
        "src/control/projects/service.mjs",
        "src/control/sessions/workspace-session.mjs",
        "src/control/plugin/service.mjs",
        "src/execution/plugin/bridge.mjs",
        "src/execution/facade.mjs",
        "src/frontend/plugin/app.mjs",
        "src/frontend/plugin/index.html",
        "src/frontend/desktop/application.mjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "tools/codex-app-server-mcp/plugin.py",
        "tools/codex-app-server-mcp/server.py",
        "scripts/stage-chatgpt-plugin.mjs",
        "package.json",
        "package-lock.json",
        "tests/chatgpt-plugin.test.mjs",
        ".gitignore",
        "src/control/sessions/service.mjs",
        "src/frontend/plugin/panel.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/electron-smoke.mjs",
        "tests/fixtures/plugin-server.py",
        "tests/sidebar.test.mjs"
      ],
      "documentation_paths": [
        "docs/modules/control.md",
        "docs/planning/chatgpt-plugin.md"
      ],
      "verification_ids": [
        "unit-all",
        "electron-smoke",
        "architecture"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Один вертикальный сценарий: плагин в том же репозитории показывает зарегистрированные локальные проекты, открывает выбранный и создаёт новый разговор через официальный MCP Apps SDK с передачей recovery через тот же MCP.",
        "Control остаётся единственным владельцем workspaces.json; плагин не читает и не пишет отдельную копию проектов. Привязка внешней сессии идемпотентна, проверяет project identity и данные контекста; внешний разговор не запускает встроенный браузер или AutoPlan.",
        "Границы Control/Execution/Frontend сохранены. Есть изолированные проверки UI→MCP→Control, повторов/конкуренции/restart/ошибок и отказа неподдерживаемого клиента.",
        "Добавлены инструкции подключения через существующий Secure MCP Tunnel и матрица ручной проверки Chat/Work/Codex. Живая приёмка выполняется пользователем; выпуск/установка/публикация релиза в этот раунд не входят."
      ],
      "expected_commit_message": "feat: добавить плагин ChatGPT для проектов и внешних сессий",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T017",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        ".gitignore",
        "docs/modules/control.md",
        "docs/planning/chatgpt-plugin.md",
        "package-lock.json",
        "package.json",
        "scripts/stage-chatgpt-plugin.mjs",
        "src/control/facade.mjs",
        "src/control/plugin/service.mjs",
        "src/control/projects/service.mjs",
        "src/control/sessions/service.mjs",
        "src/control/sessions/workspace-session.mjs",
        "src/execution/facade.mjs",
        "src/execution/plugin/bridge.mjs",
        "src/frontend/desktop/application.mjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/frontend/plugin/app.mjs",
        "src/frontend/plugin/index.html",
        "src/frontend/plugin/panel.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/electron-smoke.mjs",
        "tests/fixtures/plugin-server.py",
        "tests/sidebar.test.mjs",
        "tools/codex-app-server-mcp/plugin.py",
        "tools/codex-app-server-mcp/server.py"
      ]
    },
    {
      "id": "T018",
      "title": "Подготовить версию 0.1.2 с плагином ChatGPT",
      "why": "Подготовить версию 0.1.2 с плагином ChatGPT",
      "dependencies": [],
      "functional_paths": [
        "package.json",
        "package-lock.json"
      ],
      "documentation_paths": [
        "docs/modules/control.md"
      ],
      "verification_ids": [
        "release-tooling"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Версия приложения и lock согласованы: 0.1.2; проверенная реализация T017 включается без изменения поведения."
      ],
      "expected_commit_message": "chore: подготовить Workflow Pilot 0.1.2 с плагином ChatGPT",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T018",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "package-lock.json",
        "package.json"
      ]
    },
    {
      "id": "DOCS-5",
      "title": "Актуализация всех документов проекта",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "DOCS-5",
        "role": "implementation",
        "iteration": 5
      },
      "why": "Перед выпуском сверить README, OVERVIEW и действующие контракты модулей с результатом; обновить устаревшее.",
      "dependencies": [
        "T017",
        "T018"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/architecture/OVERVIEW.md",
        "docs/modules/control.md",
        "README.md",
        "docs/acceptance/migration-0.1.0.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/desktop.md",
        "docs/modules/release.md",
        "docs/planning/chatgpt-plugin.md",
        "docs/planning/orchestrated-execution-next.md"
      ],
      "acceptance_criteria": [
        "Документы описывают текущий результат, существенное из выпущенных рабочих спецификаций перенесено в контракты модулей; история остаётся в Git."
      ],
      "verification_ids": [],
      "expected_commit_message": "docs: актуализировать документацию проекта",
      "parallel_safe": false,
      "actual_files": [
        "README.md",
        "docs/acceptance/migration-0.1.0.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/control.md",
        "docs/modules/desktop.md",
        "docs/modules/release.md",
        "docs/planning/chatgpt-plugin.md",
        "docs/planning/orchestrated-execution-next.md"
      ]
    },
    {
      "id": "T019",
      "title": "Собрать выпуск 0.1.2 с плагином для трёх ОС",
      "why": "Собрать выпуск 0.1.2 с плагином для трёх ОС",
      "dependencies": [
        "T018",
        "DOCS-5"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/modules/control.md"
      ],
      "verification_ids": [
        "three-platform-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "После DOCS полный комплект macOS arm64, Windows x64 и Linux x64 создан из одного sourceCommit; панель и MCP плагина включены, архивы и manifest проверены и доставлены в Downloads/WorkflowPilot-0.1.2. Предыдущие выпуски сохранены; живая приёмка плагина и Windows/Linux pending."
      ],
      "expected_commit_message": "release: собрать Workflow Pilot 0.1.2 для трёх ОС",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T019",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "release-manifest.json"
      ]
    },
    {
      "id": "T020",
      "title": "Установить готовый Workflow Pilot 0.1.2 на Mac",
      "why": "Установить готовый Workflow Pilot 0.1.2 на Mac",
      "dependencies": [
        "T019",
        "DOCS-5"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/modules/control.md"
      ],
      "verification_ids": [
        "release-installed"
      ],
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Штатный installer обновил собственные копии в проекте и /Applications из готового комплекта T019 без пересборки или переподписи. Version/source/manifest/signature проверены, предусмотрен rollback; приложение не перезапущено, donor не изменён. Пользователю переданы инструкции Refresh существующего MCP и проверки ChatGPT Desktop."
      ],
      "expected_commit_message": "release: установить готовый Workflow Pilot 0.1.2 на Mac",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T020",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": []
    },
    {
      "id": "T021",
      "title": "Исправить повреждение HTML панели ChatGPT при сборке",
      "why": "Исправить повреждение HTML панели ChatGPT при сборке",
      "dependencies": [],
      "functional_paths": [
        "scripts/stage-chatgpt-plugin.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "src/frontend/plugin/app.mjs",
        "package.json",
        "package-lock.json"
      ],
      "documentation_paths": [
        "docs/modules/control.md"
      ],
      "verification_ids": [
        "architecture",
        "release-tooling"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Зафиксирован отказ 0.1.2 в Chat и Work: панель открывается пустой, MCP возвращает проект. Установленный HTML воспроизводит синтаксическую ошибку из-за подстановок String.replace; Codex не входит в целевую приёмку.",
        "Сборка сохраняет JavaScript буквально, проверяет синтаксис перед записью. Regression проверяет специальные последовательности замены и запускает полный собранный HTML, полученный через настоящий MCP, с handshake SDK и действиями панели. Версия 0.1.3."
      ],
      "expected_commit_message": "fix: сохранить код панели ChatGPT при упаковке HTML",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T021",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "package-lock.json",
        "package.json",
        "scripts/stage-chatgpt-plugin.mjs",
        "tests/chatgpt-plugin.test.mjs"
      ]
    },
    {
      "id": "DOCS-6",
      "title": "Актуализация всех документов проекта",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "DOCS-6",
        "role": "implementation",
        "iteration": 6
      },
      "why": "Перед выпуском сверить README, OVERVIEW и действующие контракты модулей с результатом; обновить устаревшее.",
      "dependencies": [
        "T021"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/architecture/OVERVIEW.md",
        "docs/modules/control.md",
        "README.md",
        "docs/acceptance/migration-0.1.0.md",
        "docs/modules/chatgpt-plugin.md",
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
        "docs/acceptance/migration-0.1.0.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/release.md"
      ]
    },
    {
      "id": "T022",
      "title": "Собрать исправленный выпуск панели 0.1.3 для трёх ОС",
      "why": "Собрать исправленный выпуск панели 0.1.3 для трёх ОС",
      "dependencies": [
        "T021",
        "DOCS-6"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/modules/control.md"
      ],
      "verification_ids": [
        "three-platform-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "После DOCS собраны и проверены три платформы из одного sourceCommit, полный комплект 0.1.3 доставлен в Downloads, прежние выпуски сохранены. Живая проверка исправления Chat/Work pending."
      ],
      "expected_commit_message": "release: собрать исправленную панель Workflow Pilot 0.1.3",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T022",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "release-manifest.json"
      ]
    },
    {
      "id": "T023",
      "title": "Установить готовый Workflow Pilot 0.1.3 на Mac",
      "why": "Установить готовый Workflow Pilot 0.1.3 на Mac",
      "dependencies": [
        "T022",
        "DOCS-6"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/modules/control.md"
      ],
      "verification_ids": [
        "release-installed"
      ],
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Штатный installer обновил собственные приложения готовым пакетом, проверены подпись, версия, manifest и rollback; без пересборки и перезапуска. Переданы действия Refresh и повторная проверка Chat/Work, Codex исключён."
      ],
      "expected_commit_message": "release: установить Workflow Pilot 0.1.3 на Mac",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T023",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": []
    },
    {
      "id": "T024",
      "title": "Открывать панель нового разговора с актуальными сессиями проекта",
      "why": "Открывать панель нового разговора с актуальными сессиями проекта",
      "dependencies": [],
      "functional_paths": [
        "src/frontend/plugin/panel.mjs",
        "tools/codex-app-server-mcp/plugin.py",
        "tests/chatgpt-plugin.test.mjs",
        "package.json",
        "package-lock.json"
      ],
      "documentation_paths": [
        "docs/modules/control.md"
      ],
      "verification_ids": [
        "architecture",
        "release-tooling"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Пользователь подтвердил работу 0.1.3 в Chat/Work и отдельное состояние панели каждого разговора. Новое сообщение требует после успешного подключения и чтения recovery открыть workflow_pilot_panel с точным project_id, затем подтвердить готовность; закрепление и автоматический переход не обещаются.",
        "Панель принимает необязательный project_id, возвращает свежие список проектов и выбранный проект с сессиями. Обновление не оставляет старые сессии, удалённый проект сбрасывается, UNKNOWN send не повторяется. Проверки через реальные MCP и собранный HTML; без модельных ходов. Версия 0.1.4."
      ],
      "expected_commit_message": "fix: открывать панель проекта в новом разговоре и обновлять сессии",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T024",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "package-lock.json",
        "package.json",
        "src/frontend/plugin/panel.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tools/codex-app-server-mcp/plugin.py"
      ]
    },
    {
      "id": "DOCS-7",
      "title": "Актуализация всех документов проекта",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "DOCS-7",
        "role": "implementation",
        "iteration": 7
      },
      "why": "Перед выпуском сверить README, OVERVIEW и действующие контракты модулей с результатом; обновить устаревшее.",
      "dependencies": [
        "T024"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/architecture/OVERVIEW.md",
        "docs/modules/control.md",
        "README.md",
        "docs/acceptance/migration-0.1.0.md",
        "docs/modules/chatgpt-plugin.md",
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
        "docs/acceptance/migration-0.1.0.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/release.md"
      ]
    },
    {
      "id": "T025",
      "title": "Собрать Workflow Pilot 0.1.4 для трёх ОС",
      "why": "Собрать Workflow Pilot 0.1.4 для трёх ОС",
      "dependencies": [
        "T024",
        "DOCS-7"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/modules/control.md"
      ],
      "verification_ids": [
        "three-platform-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "После DOCS собраны три платформы из одного sourceCommit, комплект проверен и доставлен в Downloads; новая живая проверка Chat/Work pending."
      ],
      "expected_commit_message": "release: собрать Workflow Pilot 0.1.4 для трёх ОС",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T025",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "release-manifest.json"
      ]
    },
    {
      "id": "T026",
      "title": "Установить готовый Workflow Pilot 0.1.4 на Mac",
      "why": "Установить готовый Workflow Pilot 0.1.4 на Mac",
      "dependencies": [
        "T025",
        "DOCS-7"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/modules/control.md"
      ],
      "verification_ids": [
        "release-installed"
      ],
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Собственные приложения обновлены штатным installer из готового комплекта, проверены версия/manifest/подпись и rollback; без перезапуска и изменения донора."
      ],
      "expected_commit_message": "release: установить Workflow Pilot 0.1.4 на Mac",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T026",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": []
    },
    {
      "id": "T027",
      "title": "Подготовить проверку открытия прежнего диалога из панели ChatGPT",
      "why": "Подготовить проверку открытия прежнего диалога из панели ChatGPT",
      "dependencies": [],
      "functional_paths": [
        "src/frontend/plugin/app.mjs",
        "src/frontend/plugin/index.html",
        "src/frontend/plugin/navigation-probe.mjs",
        "tools/codex-app-server-mcp/plugin.py",
        "tests/chatgpt-plugin.test.mjs",
        "package.json",
        "package-lock.json"
      ],
      "documentation_paths": [
        "docs/modules/chatgpt-plugin.md"
      ],
      "verification_ids": [
        "architecture",
        "release-tooling"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "В сворачиваемом разделе панели пользователь вводит обычную ссылку на существующий диалог и отдельно проверяет стандартный MCP openLink, совместимый openExternal в двух режимах и обычные ссылки. Никаких новых диалогов, модельных ходов или управления окнами агентом.",
        "Результат транспорта не объявляется успешной навигацией; видны доступность API, ограниченное ожидание и безопасный журнал без URL и идентификаторов. Валидация разрешает только обычные https://chatgpt.com/c/... ссылки, без Share и сторонних адресов. Изолированный тест исполняет настоящий SDK из полного MCP HTML, проверяет маршруты и ошибки. Версия 0.1.5.",
        "Тестовую версию пользователь проверяет в Chat и Work. Автоматическое получение URL и навигация в Desktop остаются неподтверждёнными до живой проверки."
      ],
      "expected_commit_message": "feat: Подготовить проверку открытия прежнего диалога из панели ChatGPT",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T027",
        "role": "implementation"
      },
      "parallel_safe": false
    },
    {
      "id": "DOCS-8",
      "title": "Актуализация всех документов проекта",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "DOCS-8",
        "role": "implementation",
        "iteration": 8
      },
      "why": "Перед выпуском сверить README, OVERVIEW и действующие контракты модулей с результатом; обновить устаревшее.",
      "dependencies": [
        "T027"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/architecture/OVERVIEW.md",
        "docs/modules/chatgpt-plugin.md"
      ],
      "acceptance_criteria": [
        "Документы описывают текущий результат, существенное из выпущенных рабочих спецификаций перенесено в контракты модулей; история остаётся в Git."
      ],
      "verification_ids": [],
      "expected_commit_message": "docs: актуализировать документацию проекта",
      "parallel_safe": false
    },
    {
      "id": "T028",
      "title": "Собрать диагностический Workflow Pilot 0.1.5 для трёх ОС",
      "why": "Собрать диагностический Workflow Pilot 0.1.5 для трёх ОС",
      "dependencies": [
        "T027",
        "DOCS-8"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/modules/chatgpt-plugin.md"
      ],
      "verification_ids": [
        "three-platform-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "После DOCS собран и проверен полный комплект трёх платформ из одного sourceCommit; живые переходы в ChatGPT не объявляются принятыми."
      ],
      "expected_commit_message": "feat: Собрать диагностический Workflow Pilot 0.1.5 для трёх ОС",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T028",
        "role": "implementation"
      },
      "parallel_safe": false
    },
    {
      "id": "T029",
      "title": "Установить готовый Workflow Pilot 0.1.5 для проверки переходов",
      "why": "Установить готовый Workflow Pilot 0.1.5 для проверки переходов",
      "dependencies": [
        "T028",
        "DOCS-8"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/modules/chatgpt-plugin.md"
      ],
      "verification_ids": [
        "release-installed"
      ],
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Штатный installer обновляет собственные app в проекте и Applications готовым комплектом без пересборки/перезапуска, проверяя подпись, manifest и rollback. Пользователю переданы шаги сравнительного теста."
      ],
      "expected_commit_message": "feat: Установить готовый Workflow Pilot 0.1.5 для проверки переходов",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T029",
        "role": "implementation"
      },
      "parallel_safe": false
    }
  ],
  "blocked_reason": null,
  "user_decisions": [
    {
      "id": "migration-decisions-20261013",
      "text": "Собственная версия 0.1.0 и repo Workflow_Pilot. AutoPlan полностью сохранён, прежнее удаление отменено. Kit развивается только в новом проекте. Проекты донора продолжаются через их папки. Сохраняются VPS/OpenAI и onboarding. Три ОС в каждом выпуске; живые проверки пользователь выполняет Mac→Windows→Linux, чистые установки позже. Оркестратор/ручной запуск/каждая задача в отдельном чате — следующий этап.",
      "recorded_at": "2026-10-13T09:20:00Z"
    },
    {
      "id": "dc49e0a4-3486-4a3d-9559-af6600383e5e",
      "text": "Пользователь поручил подготовить план переноса и полный выпуск трёх платформ; 13.10.2026 подтвердил сохранение всего поведения донора, включая AutoPlan. В этой сессии публикуется только план; реализация начинается по следующему поручению.",
      "recorded_at": "2026-10-13T09:16:26.097Z"
    }
  ],
  "parallel_allowed": true,
  "max_workers": 4,
  "execution_strategy": "sequential",
  "execution_reason": "Перенос затрагивает общие main, stores, фасады и Kit; зависимости и пересечения записи требуют последовательного переключения потребителей. Будущая схема отдельного агента на каждую задачу относится к продукту следующего этапа и не меняет стратегию текущего переноса.",
  "execution_origin_session_id": "web-pilot-47512b41-f21b-4c76-a8a3-f1cb9b9dba3b"
}
```
<!-- workflow-state:end -->

## Состояние

Execution Scope Status: ACTIVE
Delivery Status: IN_PROGRESS
Scope: workflow-pilot-migration-0.1.0
Current Task: нет
Revision: 88

## Цель

Перенести Project Web Pilot 0.6.115 в самостоятельный Workflow Pilot 0.1.0 с Control/Execution/Frontend, сохранив поведение и выпустив macOS, Windows и Linux из одной базы.

## Критерии приёмки

- Самостоятельное приложение 0.1.0 сохраняет поведение 0.6.115, AutoPlan/Review/sequential/parallel, recovery и оба способа подключения; состояние донора не изменено.
- Control/Execution/Frontend реально разделены, фасады закрывают внутреннее состояние, Kit единственный владелец плана; динамические/пакетные входы не потеряны.
- Проект базового Kit 1.7.2 открывается и продолжается без импорта старого app-state и потери плана; изменения Kit только в новом проекте.
- Первый общий выпуск содержит macOS arm64, Windows x64 и Linux x64 Ubuntu24.04/X11 с одним sourceCommit и проверенными artifacts; native/VM/clean приёмка отмечена фактически.
- Будущая оркестрация сохранена отдельным невыполненным документом; первый план не реализует новую схему и не удаляет AutoPlan.

## Микрозадачи

Выполнение: sequential; разрешено: true; лимит: 4
Причина: Перенос затрагивает общие main, stores, фасады и Kit; зависимости и пересечения записи требуют последовательного переключения потребителей. Будущая схема отдельного агента на каждую задачу относится к продукту следующего этапа и не меняет стратегию текущего переноса.

- [DONE] T001: Закрепить карту переноса и платформенные зависимости — Завершено
  - Git Commit: [DONE] docs: Закрепить карту переноса и платформенные зависимости
  - Reference: workflow-pilot-migration-0.1.0 / T001 / implementation
  - Файлы: docs/planning/migration-0.1.0.md, docs/planning/migration-platforms.md, docs/planning/orchestrated-execution-next.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] T002: Перенести запускаемую базу с собственной identity — Завершено
  - Git Commit: [DONE] refactor: Перенести запускаемую базу с собственной identity
  - Reference: workflow-pilot-migration-0.1.0 / T002 / implementation
  - Файлы: package.json, package-lock.json, .gitignore, src/main.mjs, src/common.mjs, src/platform.mjs, src/control/facade.mjs, src/execution/facade.mjs, src/frontend/desktop/bootstrap.mjs, scripts/release-all.mjs, scripts/prepare-windows-toolchain.mjs, scripts/prepare-mac-toolchain.mjs, scripts/stage-workflow-kit.mjs, scripts/stage-page-observer.mjs, resources/mac-permissions.plist, resources/workspace-setup-worker.mjs, resources/runtime-control/windows-control.py, tools/codex-app-server-mcp/control.py, tools/codex-app-server-mcp/server.py, tools/codex-app-server-mcp/app_server_client.py, tools/codex-app-server-mcp/codex-tools.lock.json, tools/codex-app-server-mcp/requirements.txt, tools/codex-app-server-mcp/windows_desktop.py, tools/codex-app-server-mcp/linux_desktop.py, packages/workflow-kit/package.json, packages/workflow-kit/src/cli.mjs, packages/workflow-kit/src/install.mjs, packages/workflow-kit/src/lib/transaction.mjs, packages/workflow-kit/src/lib/task-integration.mjs, packages/workflow-kit/src/lib/validate.mjs, packages/workflow-kit/src/lib/task-assignment.mjs, packages/workflow-kit/src/lib/actions.mjs, packages/workflow-kit/src/lib/plan-review.mjs, packages/workflow-kit/src/lib/recovery.mjs, tests/workspace-session.test.mjs, tests/session-runtime.test.mjs, tests/parallel-execution.test.mjs, tests/project-auto-plan.test.mjs, tests/electron-smoke.mjs, tests/codex-app-server-mcp.test.mjs, LICENSE, .node-version, BUILD_WINDOWS.cmd, RUN_WINDOWS.cmd, packages/workflow-kit/LICENSE, packages/workflow-kit/index.mjs, packages/workflow-kit/scripts/check-carryover-fixture.mjs, packages/workflow-kit/scripts/check-consumer-contract.mjs, packages/workflow-kit/scripts/check-document-fixture.mjs, packages/workflow-kit/scripts/check-package.mjs, packages/workflow-kit/scripts/check-parallel-execution-fixture.mjs, packages/workflow-kit/scripts/check-parallel-plan-fixture.mjs, packages/workflow-kit/scripts/check-plan-review-fixture.mjs, packages/workflow-kit/scripts/check-previous-upgrade-fixture.mjs, packages/workflow-kit/scripts/check-project-recovery-fixture.mjs, packages/workflow-kit/scripts/check-runtime-fixture.mjs, packages/workflow-kit/scripts/check-task-assignment-fixture.mjs, packages/workflow-kit/scripts/check-task-handoff-fixture.mjs, packages/workflow-kit/scripts/check-task-integration-fixture.mjs, packages/workflow-kit/src/examples/verify-package.mjs, packages/workflow-kit/src/lib/claude-review.mjs, packages/workflow-kit/src/lib/command-help.mjs, packages/workflow-kit/src/lib/common.mjs, packages/workflow-kit/src/lib/extend-plan.mjs, packages/workflow-kit/src/lib/git-hooks.mjs, packages/workflow-kit/src/lib/git.mjs, packages/workflow-kit/src/lib/inspection-inputs.mjs, packages/workflow-kit/src/lib/installation-files.mjs, packages/workflow-kit/src/lib/installer.mjs, packages/workflow-kit/src/lib/plan.mjs, packages/workflow-kit/src/lib/platform.mjs, packages/workflow-kit/src/lib/project-facts.mjs, packages/workflow-kit/src/lib/session-plans.mjs, packages/workflow-kit/src/lib/simple-workflow.mjs, packages/workflow-kit/src/lib/task-files.mjs, packages/workflow-kit/src/lib/task-handoff.mjs, packages/workflow-kit/src/lib/task-update.mjs, packages/workflow-kit/src/schemas/plan.schema.json, packages/workflow-kit/src/schemas/workflow.schema.json, resources/project-doctor-worker.mjs, resources/project-doctor/core.mjs, resources/project-doctor/files.mjs, scripts/check-codex-tools.mjs, scripts/check-github-release.mjs, scripts/check-installed-release.mjs, scripts/check-mac-screen-capture.mjs, scripts/check-mac-signature.mjs, scripts/check-workflow-kit-archive.mjs, scripts/check-workflow-kit-dependency.mjs, scripts/check-workflow-kit-staging.mjs, scripts/probe-chatgpt-file-paste.mjs, scripts/release-mac.mjs, scripts/sign-mac-bundle.mjs, scripts/verify-windows-package.mjs, src/agent-timer.mjs, src/archive-preload.cjs, src/auto-plan-state.mjs, src/auto-plan.mjs, src/automation-send-state.mjs, src/browser-startup.mjs, src/chat-colors-preload.cjs, src/chat-colors-window.mjs, src/chatgpt-auto-scroll.mjs, src/chatgpt-colors.mjs, src/chatgpt-composer.mjs, src/chatgpt-dom.mjs, src/chatgpt-experience.mjs, src/chatgpt-page-observer.mjs, src/chatgpt-title.mjs, src/chatgpt-tool-filter.mjs, src/chromium-diagnostics.mjs, src/command-activity.mjs, src/context-cache.mjs, src/context-inputs.mjs, src/context-session.mjs, src/conversation-recovery.mjs, src/execution-projection.mjs, src/executor-session.mjs, src/mac-runtime-switch.mjs, src/mcp-runtime.mjs, src/page-state-bridge.mjs, src/page-state.mjs, src/parallel-execution.mjs, src/parallel-kit.mjs, src/parallel-settings.mjs, src/plan-monitor.mjs, src/plan-review.mjs, src/preload.cjs, src/project-auto-plan.mjs, src/project-doctor.mjs, src/project-input-watch.mjs, src/project-session-auto-plan.mjs, src/project-state-cleanup.mjs, src/review-continuation.mjs, src/session-plans.mjs, src/session-runtime.mjs, src/startup-network-trace.mjs, src/startup-platform.mjs, src/startup-readiness.mjs, src/tunnel-clipboard.mjs, src/tunnel-setup.mjs, src/ui/archive.html, src/ui/archive.mjs, src/ui/chat-colors.html, src/ui/chat-colors.mjs, src/ui/index.html, src/ui/progress.mjs, src/ui/project-doctor.mjs, src/ui/settings-panel.mjs, src/ui/sidebar.mjs, src/ui/startup.mjs, src/ui/workspace-setup.mjs, src/vps-tunnel.mjs, src/windows-runtime.mjs, src/workspace-deletion.mjs, src/workspace-readiness.mjs, src/workspace-session.mjs, src/workspace-setup.mjs, src/zip-archive.mjs, tests/agent-timer.test.mjs, tests/auto-plan-restart-fixture.cjs, tests/auto-plan.test.mjs, tests/automation-send-state.test.mjs, tests/browser-startup.test.mjs, tests/chatgpt-auto-scroll.test.mjs, tests/chatgpt-colors.test.mjs, tests/chatgpt-composer.test.mjs, tests/chatgpt-dom.test.mjs, tests/chatgpt-experience.test.mjs, tests/chatgpt-file-paste-probe.test.mjs, tests/chatgpt-title.test.mjs, tests/chatgpt-tool-filter.test.mjs, tests/check-codex-tools.test.mjs, tests/chromium-diagnostics.test.mjs, tests/command-activity.test.mjs, tests/common.test.mjs, tests/context-cache.test.mjs, tests/context-session.test.mjs, tests/conversation-recovery.test.mjs, tests/event-runtime-baseline.mjs, tests/fixtures/released-kit/kit-1.5.6.tar.gz, tests/fixtures/released-kit/kit-1.6.3.tar.gz, tests/fixtures/released-kit/kit-1.6.4.tar.gz, tests/fixtures/released-kit/kit-1.7.0.tar.gz, tests/fixtures/released-kit/manifest.json, tests/installed-observer-fixture.cjs, tests/mac-runtime-switch.test.mjs, tests/mac-toolchain.test.mjs, tests/mcp-runtime.test.mjs, tests/page-state.test.mjs, tests/parallel-execution-recovery.test.mjs, tests/parallel-execution-smoke-fixture.cjs, tests/parallel-execution-ui.test.mjs, tests/parallel-finalization.test.mjs, tests/plan-monitor.test.mjs, tests/plan-review.test.mjs, tests/product-identity.test.mjs, tests/progress.test.mjs, tests/project-doctor-ui.test.mjs, tests/project-doctor.test.mjs, tests/project-input-watch.test.mjs, tests/project-state-cleanup.test.mjs, tests/prosemirror-composer-fixture.mjs, tests/protected-preview-fixture.cjs, tests/release-all.test.mjs, tests/release-mac.test.mjs, tests/session-opening-performance.test.mjs, tests/session-plans.test.mjs, tests/settings-chatgpt-channel.test.mjs, tests/settings-parallel-execution.test.mjs, tests/sidebar.test.mjs, tests/sign-mac-bundle.test.mjs, tests/startup-network-trace.test.mjs, tests/startup-platform.test.mjs, tests/startup-readiness.test.mjs, tests/startup-ui.test.mjs, tests/tunnel-clipboard.test.mjs, tests/tunnel-id-prompt.test.mjs, tests/tunnel-id-runtime.test.mjs, tests/tunnel-prompt.test.mjs, tests/vps-tunnel.test.mjs, tests/windows-autostart.test.mjs, tests/windows-runtime.test.mjs, tests/workflow-kit-recovery.test.mjs, tests/workflow-kit-source.test.mjs, tests/workflow-kit-upgrade.test.mjs, tests/workspace-deletion.test.mjs, tests/workspace-readiness.test.mjs, tests/workspace-setup.test.mjs, tools/codex-app-server-mcp/tunnel_prompt.py, tools/codex-app-server-mcp/windows_notify.ps1, AGENTS.md, docs/modules/control.md, docs/modules/execution.md, docs/modules/browser.md, docs/modules/workflow-execution.md, docs/modules/desktop.md, PROVENANCE.md, README.md, docs/architecture/OVERVIEW.md, docs/planning/migration-0.1.0.md, docs/planning/migration-platforms.md, packages/workflow-kit/README.md, packages/workflow-kit/docs/modules/parallel-assignments.md, packages/workflow-kit/docs/modules/workflow-kit-package.md, packages/workflow-kit/src/WORKFLOW.md, packages/workflow-kit/src/examples/PACKAGING.md, packages/workflow-kit/src/templates/AGENTS.md, packages/workflow-kit/src/templates/CONTINUE.md, packages/workflow-kit/src/templates/PLAN.md, packages/workflow-kit/src/templates/PROTOTYPE.md, packages/workflow-kit/src/templates/SPEC.md, packages/workflow-kit/src/templates/STAGES.md, tests/fixtures/released-kit/README.md
  - Параллельность: исключительное выполнение
  - Зависимости: T001
- [DONE] T003: Выделить Execution для команд, файлов и служб — Завершено
  - Git Commit: [DONE] refactor: Выделить Execution для команд, файлов и служб
  - Reference: workflow-pilot-migration-0.1.0 / T003 / implementation
  - Файлы: src/execution/facade.mjs, src/execution/commands/service.mjs, src/execution/files/adapter.mjs, src/execution/runtime/service.mjs, src/execution/platform/paths.mjs, src/execution/browser/session-runtime.mjs, src/contracts/control.mjs, src/contracts/execution.mjs, src/contracts/errors.mjs, src/main.mjs, src/platform.mjs, src/mac-runtime-switch.mjs, src/windows-runtime.mjs, src/vps-tunnel.mjs, tools/codex-app-server-mcp/control.py, tools/codex-app-server-mcp/server.py, tools/codex-app-server-mcp/app_server_client.py, tools/codex-app-server-mcp/codex-tools.lock.json, tools/codex-app-server-mcp/requirements.txt, tools/codex-app-server-mcp/windows_desktop.py, tools/codex-app-server-mcp/linux_desktop.py, resources/runtime-control/windows-control.py, resources/runtime-control/linux-control.py, package.json, package-lock.json, .dependency-cruiser.cjs, tests/command-activity.test.mjs, tests/mcp-runtime.test.mjs, tests/mac-runtime-switch.test.mjs, tests/windows-runtime.test.mjs, tests/vps-tunnel.test.mjs, src/mcp-runtime.mjs, scripts/release-all.mjs, scripts/prepare-windows-toolchain.mjs, scripts/prepare-mac-toolchain.mjs, scripts/stage-workflow-kit.mjs, scripts/stage-page-observer.mjs, src/common.mjs, src/contracts/context.mjs, src/execution/files/zip-archive.mjs, src/execution/runtime/mcp-client.mjs, src/execution/runtime/tunnel-setup.mjs, src/execution/runtime/vps-config.mjs, src/execution/runtime/vps.mjs, src/execution/runtime/windows.mjs, src/parallel-kit.mjs, src/session-plans.mjs, src/tunnel-setup.mjs, src/workspace-setup.mjs, src/zip-archive.mjs, tests/codex-app-server-mcp.test.mjs, tests/execution-architecture.test.mjs, tests/execution-facade.test.mjs, docs/modules/execution.md, docs/architecture/OVERVIEW.md
  - Параллельность: исключительное выполнение
  - Зависимости: T002
- [DONE] T004: Выделить браузерный модуль Execution — Завершено
  - Git Commit: [DONE] refactor: Выделить браузерный модуль Execution
  - Reference: workflow-pilot-migration-0.1.0 / T004 / implementation
  - Файлы: src/execution/browser/session-runtime.mjs, src/execution/browser/chatgpt-dom.mjs, src/execution/browser/chatgpt-composer.mjs, src/execution/browser/chatgpt-experience.mjs, src/execution/browser/chatgpt-page-observer.mjs, src/execution/browser/page-state.mjs, src/contracts/control.mjs, src/contracts/execution.mjs, src/contracts/errors.mjs, src/main.mjs, src/session-runtime.mjs, src/conversation-recovery.mjs, src/chatgpt-dom.mjs, src/chatgpt-composer.mjs, src/chatgpt-experience.mjs, src/chatgpt-page-observer.mjs, scripts/stage-page-observer.mjs, tests/chatgpt-dom.test.mjs, tests/chatgpt-composer.test.mjs, tests/page-state.test.mjs, tests/session-runtime.test.mjs, tests/conversation-recovery.test.mjs, src/page-state.mjs, src/page-state-bridge.mjs, src/chatgpt-auto-scroll.mjs, src/chatgpt-colors.mjs, src/chatgpt-title.mjs, src/chatgpt-tool-filter.mjs, src/automation-send-state.mjs, src/agent-timer.mjs, .dependency-cruiser.cjs, scripts/check-installed-release.mjs, scripts/probe-chatgpt-file-paste.mjs, src/browser-startup.mjs, src/context-session.mjs, src/contracts/browser.mjs, src/execution/browser/browser-startup.mjs, src/execution/browser/chatgpt-auto-scroll.mjs, src/execution/browser/chatgpt-colors.mjs, src/execution/browser/chatgpt-title.mjs, src/execution/browser/chatgpt-tool-filter.mjs, src/execution/browser/page-state-bridge.mjs, src/execution/facade.mjs, src/frontend/desktop/browser-host.mjs, src/workspace-session.mjs, tests/auto-plan-restart-fixture.cjs, tests/browser-startup.test.mjs, tests/chatgpt-auto-scroll.test.mjs, tests/chatgpt-colors.test.mjs, tests/chatgpt-title.test.mjs, tests/chatgpt-tool-filter.test.mjs, tests/context-session.test.mjs, tests/electron-smoke.mjs, tests/execution-architecture.test.mjs, tests/parallel-execution-smoke-fixture.cjs, docs/modules/browser.md, docs/architecture/OVERVIEW.md
  - Параллельность: исключительное выполнение
  - Зависимости: T003
- [DONE] T005: Выделить Control проектов, сессий и контекста — Завершено
  - Git Commit: [DONE] refactor: Выделить Control проектов, сессий и контекста
  - Reference: workflow-pilot-migration-0.1.0 / T005 / implementation
  - Файлы: src/control/projects/service.mjs, src/control/projects/workspace-setup.mjs, src/control/projects/workspace-deletion.mjs, src/control/projects/project-doctor.mjs, src/control/sessions/service.mjs, src/control/sessions/workspace-session.mjs, src/control/sessions/conversation-recovery.mjs, src/control/context/service.mjs, src/control/context/context-session.mjs, src/control/context/context-inputs.mjs, src/control/context/context-cache.mjs, src/control/facade.mjs, src/contracts/control.mjs, src/contracts/execution.mjs, src/contracts/errors.mjs, src/main.mjs, src/workspace-session.mjs, src/session-plans.mjs, src/context-session.mjs, src/context-inputs.mjs, src/context-cache.mjs, tests/workspace-session.test.mjs, tests/session-plans.test.mjs, tests/context-session.test.mjs, tests/context-cache.test.mjs, .dependency-cruiser.cjs, src/agent-timer.mjs, src/common.mjs, src/control/projects/project-state-cleanup.mjs, src/control/projects/workspace-readiness.mjs, src/control/sessions/agent-timer.mjs, src/control/sessions/session-plans.mjs, src/conversation-recovery.mjs, src/execution/facade.mjs, src/execution/files/adapter.mjs, src/execution/files/diagnostics.mjs, src/project-doctor.mjs, src/project-state-cleanup.mjs, src/session-runtime.mjs, src/workspace-deletion.mjs, src/workspace-readiness.mjs, src/workspace-setup.mjs, tests/control-facade.test.mjs, tests/electron-smoke.mjs, tests/execution-architecture.test.mjs, tests/parallel-execution-smoke-fixture.cjs, docs/modules/control.md, docs/architecture/OVERVIEW.md
  - Параллельность: исключительное выполнение
  - Зависимости: T004
- [DONE] T006: Перенести координацию AutoPlan, Review и исполнителей в Control — Завершено
  - Git Commit: [DONE] refactor: Перенести координацию AutoPlan, Review и исполнителей в Control
  - Reference: workflow-pilot-migration-0.1.0 / T006 / implementation
  - Файлы: src/control/workflow/coordination.mjs, src/control/workflow/auto-plan.mjs, src/control/workflow/plan-review.mjs, src/control/workflow/parallel-execution.mjs, src/control/workflow/parallel-kit.mjs, src/control/facade.mjs, src/contracts/control.mjs, src/contracts/execution.mjs, src/contracts/errors.mjs, src/main.mjs, src/auto-plan.mjs, src/project-auto-plan.mjs, src/project-session-auto-plan.mjs, src/plan-review.mjs, src/review-continuation.mjs, src/parallel-execution.mjs, src/parallel-kit.mjs, src/executor-session.mjs, tests/auto-plan.test.mjs, tests/project-auto-plan.test.mjs, tests/plan-review.test.mjs, tests/parallel-execution.test.mjs, tests/parallel-finalization.test.mjs, tests/electron-smoke.mjs, src/parallel-settings.mjs, src/auto-plan-state.mjs, src/execution-projection.mjs, src/plan-monitor.mjs, src/execution/facade.mjs, src/execution/commands/service.mjs, src/execution/files/adapter.mjs, src/execution/runtime/service.mjs, src/execution/platform/paths.mjs, src/execution/browser/session-runtime.mjs, .dependency-cruiser.cjs, src/automation-send-state.mjs, src/command-activity.mjs, src/control/context/context-session.mjs, src/control/sessions/workspace-session.mjs, src/control/workflow/auto-plan-state.mjs, src/control/workflow/automation-send-state.mjs, src/control/workflow/command-activity.mjs, src/control/workflow/execution-projection.mjs, src/control/workflow/executor-session.mjs, src/control/workflow/parallel-settings.mjs, src/control/workflow/plan-monitor.mjs, src/control/workflow/project-auto-plan.mjs, src/control/workflow/project-session-auto-plan.mjs, src/control/workflow/review-continuation.mjs, src/execution/commands/activity-probe.mjs, src/execution/files/project-input-watch.mjs, src/project-input-watch.mjs, tests/control-facade.test.mjs, tests/execution-architecture.test.mjs, docs/modules/workflow-execution.md, docs/architecture/OVERVIEW.md, docs/modules/control.md
  - Параллельность: исключительное выполнение
  - Зависимости: T005
- [DONE] T007: Разделить зависимости Kit и обеспечить продолжение донорских проектов — Завершено
  - Git Commit: [DONE] refactor: Разделить зависимости Kit и обеспечить продолжение донорских проектов
  - Reference: workflow-pilot-migration-0.1.0 / T007 / implementation
  - Файлы: packages/workflow-kit/package.json, packages/workflow-kit/src/cli.mjs, packages/workflow-kit/src/install.mjs, packages/workflow-kit/src/lib/transaction.mjs, packages/workflow-kit/src/lib/task-integration.mjs, packages/workflow-kit/src/lib/validate.mjs, packages/workflow-kit/src/lib/task-assignment.mjs, packages/workflow-kit/src/lib/actions.mjs, packages/workflow-kit/src/lib/plan-review.mjs, packages/workflow-kit/src/lib/recovery.mjs, scripts/stage-workflow-kit.mjs, src/control/workflow/coordination.mjs, src/control/workflow/auto-plan.mjs, src/control/workflow/plan-review.mjs, src/control/workflow/parallel-execution.mjs, src/control/workflow/parallel-kit.mjs, src/control/projects/service.mjs, src/control/projects/workspace-setup.mjs, src/control/projects/workspace-deletion.mjs, src/control/projects/project-doctor.mjs, src/execution/files/adapter.mjs, tests/migration-compatibility.test.mjs, tests/workflow-kit-upgrade.test.mjs, .dependency-cruiser.cjs, package-lock.json, packages/workflow-kit/src/lib/assignment-contract.mjs, packages/workflow-kit/src/lib/commit-references.mjs, packages/workflow-kit/src/lib/common.mjs, packages/workflow-kit/src/lib/inspection-inputs.mjs, packages/workflow-kit/src/lib/installer.mjs, packages/workflow-kit/src/lib/integration-proof.mjs, packages/workflow-kit/src/lib/review-state.mjs, packages/workflow-kit/src/lib/transaction-state.mjs, packages/workflow-kit/src/lib/validation-rules.mjs, resources/workspace-setup-worker.mjs, src/control/projects/workspace-readiness.mjs, tests/fixtures/released-kit/kit-1.7.2.tar.gz, tests/fixtures/released-kit/manifest.json, docs/modules/project-compatibility.md, docs/architecture/OVERVIEW.md, docs/modules/workflow-execution.md
  - Параллельность: исключительное выполнение
  - Зависимости: T006
- [DONE] T008: Завершить Frontend, первый запуск и управление проектами — Завершено
  - Git Commit: [DONE] refactor: Завершить Frontend, первый запуск и управление проектами
  - Reference: workflow-pilot-migration-0.1.0 / T008 / implementation
  - Файлы: src/frontend/desktop/bootstrap.mjs, src/frontend/desktop/preload.cjs, src/frontend/desktop/ipc.mjs, src/frontend/desktop/ui/index.html, src/frontend/desktop/ui/sidebar.mjs, src/frontend/desktop/ui/startup.mjs, src/control/facade.mjs, src/control/projects/service.mjs, src/control/sessions/service.mjs, src/control/context/service.mjs, src/control/workflow/coordination.mjs, src/execution/facade.mjs, src/execution/commands/service.mjs, src/execution/files/adapter.mjs, src/execution/runtime/service.mjs, src/execution/platform/paths.mjs, src/execution/browser/session-runtime.mjs, src/contracts/control.mjs, src/contracts/execution.mjs, src/contracts/errors.mjs, src/main.mjs, src/preload.cjs, src/ui/index.html, src/ui/sidebar.mjs, src/ui/startup.mjs, src/ui/settings-panel.mjs, resources/mac-permissions.plist, resources/workspace-setup-worker.mjs, resources/runtime-control/windows-control.py, tests/sidebar.test.mjs, tests/startup-ui.test.mjs, tests/workspace-setup.test.mjs, tests/project-doctor.test.mjs, tests/workspace-deletion.test.mjs, tests/project-state-cleanup.test.mjs, src/workspace-setup.mjs, src/project-doctor.mjs, src/workspace-deletion.mjs, src/project-state-cleanup.mjs, src/startup-readiness.mjs, src/startup-platform.mjs, src/browser-startup.mjs, src/tunnel-setup.mjs, src/tunnel-clipboard.mjs, src/archive-preload.cjs, package.json, .dependency-cruiser.cjs, scripts/check-installed-release.mjs, src/chat-colors-preload.cjs, src/chat-colors-window.mjs, src/chromium-diagnostics.mjs, src/contracts/chat-colors.mjs, src/contracts/desktop.mjs, src/contracts/parallel-settings.mjs, src/contracts/tunnel.mjs, src/contracts/workflow-view.mjs, src/control/projects/lifecycle.mjs, src/control/settings/service.mjs, src/control/startup/platform.mjs, src/control/startup/public-state.mjs, src/control/startup/readiness.mjs, src/control/startup/tunnel-clipboard.mjs, src/control/workflow/execution-projection.mjs, src/control/workflow/parallel-settings.mjs, src/execution/browser/chatgpt-colors.mjs, src/execution/browser/diagnostics.mjs, src/execution/browser/startup-network-trace.mjs, src/execution/platform/mac-setup.mjs, src/execution/runtime/tunnel-setup.mjs, src/frontend/desktop/application.mjs, src/frontend/desktop/archive-preload.cjs, src/frontend/desktop/chat-colors-preload.cjs, src/frontend/desktop/chat-colors-window.mjs, src/frontend/desktop/mac-installation.mjs, src/frontend/desktop/ui/archive.html, src/frontend/desktop/ui/archive.mjs, src/frontend/desktop/ui/chat-colors.html, src/frontend/desktop/ui/chat-colors.mjs, src/frontend/desktop/ui/progress.mjs, src/frontend/desktop/ui/project-doctor.mjs, src/frontend/desktop/ui/settings-panel.mjs, src/frontend/desktop/ui/workspace-setup.mjs, src/startup-network-trace.mjs, src/ui/archive.html, src/ui/archive.mjs, src/ui/chat-colors.html, src/ui/chat-colors.mjs, src/ui/progress.mjs, src/ui/project-doctor.mjs, src/ui/workspace-setup.mjs, tests/desktop-boundaries.test.mjs, tests/parallel-execution-ui.test.mjs, tests/progress.test.mjs, tests/project-doctor-ui.test.mjs, tests/release-all.test.mjs, tests/settings-chatgpt-channel.test.mjs, tests/settings-parallel-execution.test.mjs, tests/startup-readiness.test.mjs, docs/modules/desktop.md, docs/modules/first-run-onboarding.md, docs/modules/project-lifecycle.md, docs/architecture/OVERVIEW.md, docs/modules/control.md, docs/planning/migration-0.1.0.md, docs/planning/migration-platforms.md
  - Параллельность: исключительное выполнение
  - Зависимости: T007
- [DONE] T009: Реализовать Linux runtime и первый запуск Ubuntu x64 — Завершено
  - Git Commit: [DONE] refactor: Реализовать Linux runtime и первый запуск Ubuntu x64
  - Reference: workflow-pilot-migration-0.1.0 / T009 / implementation
  - Файлы: src/execution/platform/linux/runtime.mjs, src/execution/platform/linux/startup.mjs, src/execution/platform/linux/services.mjs, src/execution/runtime/service.mjs, src/execution/runtime/mcp-runtime.mjs, src/execution/runtime/vps-tunnel.mjs, src/frontend/desktop/bootstrap.mjs, src/frontend/desktop/preload.cjs, src/frontend/desktop/ipc.mjs, src/frontend/desktop/ui/index.html, src/frontend/desktop/ui/sidebar.mjs, src/frontend/desktop/ui/startup.mjs, src/control/facade.mjs, src/control/projects/service.mjs, src/control/sessions/service.mjs, src/control/context/service.mjs, src/control/workflow/coordination.mjs, tools/codex-app-server-mcp/control.py, tools/codex-app-server-mcp/server.py, tools/codex-app-server-mcp/app_server_client.py, tools/codex-app-server-mcp/codex-tools.lock.json, tools/codex-app-server-mcp/requirements.txt, tools/codex-app-server-mcp/windows_desktop.py, tools/codex-app-server-mcp/linux_desktop.py, resources/runtime-control/windows-control.py, resources/runtime-control/linux-control.py, scripts/prepare-linux-toolchain.mjs, tests/linux-runtime.test.mjs, tests/linux-startup.test.mjs, src/execution/commands/service.mjs, src/execution/commands/command-activity.mjs, src/execution/browser/session-runtime.mjs, src/execution/browser/chatgpt-dom.mjs, src/execution/browser/chatgpt-composer.mjs, src/execution/browser/chatgpt-experience.mjs, src/execution/browser/chatgpt-page-observer.mjs, src/execution/browser/page-state.mjs, src/contracts/control.mjs, src/contracts/execution.mjs, src/contracts/errors.mjs, src/control/startup/platform.mjs, src/control/startup/readiness.mjs, src/execution/platform/linux/toolchain.mjs, src/execution/platform/paths.mjs, src/execution/runtime/vps.mjs, src/frontend/desktop/application.mjs, src/frontend/desktop/ui/settings-panel.mjs, tests/codex-app-server-mcp.test.mjs, tests/fixtures/linux-platform.py, tests/settings-chatgpt-channel.test.mjs, tests/startup-platform.test.mjs, tools/codex-app-server-mcp/linux_runtime.py, tools/codex-app-server-mcp/requirements-linux.in, tools/codex-app-server-mcp/requirements-linux.lock, tools/codex-app-server-mcp/tunnel_prompt.py, docs/modules/linux.md, docs/architecture/OVERVIEW.md, docs/modules/first-run-onboarding.md
  - Параллельность: исключительное выполнение
  - Зависимости: T008
- [DONE] T010: Подготовить единую поставку трёх платформ — Завершено
  - Git Commit: [DONE] refactor: Подготовить единую поставку трёх платформ
  - Reference: workflow-pilot-migration-0.1.0 / T010 / implementation
  - Файлы: package.json, package-lock.json, scripts/release-all.mjs, scripts/release-mac.mjs, scripts/release-linux.mjs, scripts/prepare-linux-toolchain.mjs, scripts/verify-linux-package.mjs, scripts/check-installed-release.mjs, scripts/check-github-release.mjs, scripts/sign-mac-bundle.mjs, tests/release-all.test.mjs, tests/release-mac.test.mjs, tests/release-linux.test.mjs, scripts/prepare-windows-toolchain.mjs, scripts/verify-windows-package.mjs, scripts/prepare-mac-toolchain.mjs, scripts/check-mac-signature.mjs, src/execution/platform/paths.mjs, src/execution/platform/mac-runtime.mjs, src/execution/platform/windows-runtime.mjs, src/execution/platform/linux/runtime.mjs, src/execution/runtime/service.mjs, src/execution/runtime/mcp-runtime.mjs, src/execution/runtime/vps-tunnel.mjs, .gitignore, scripts/release-archive.mjs, scripts/release-package.mjs, scripts/stage-vendor-notices.mjs, docs/modules/release.md, docs/architecture/OVERVIEW.md, resources/THIRD-PARTY.md
  - Параллельность: исключительное выполнение
  - Зависимости: T009
- [DONE] T011: Проверить общий результат и удалить временные мосты — Завершено
  - Git Commit: [DONE] refactor: Проверить общий результат и удалить временные мосты
  - Reference: workflow-pilot-migration-0.1.0 / T011 / implementation
  - Файлы: src/main.mjs, src/common.mjs, src/platform.mjs, src/control/facade.mjs, src/execution/facade.mjs, src/frontend/desktop/bootstrap.mjs, resources/mac-permissions.plist, resources/workspace-setup-worker.mjs, resources/runtime-control/windows-control.py, scripts/release-all.mjs, scripts/prepare-windows-toolchain.mjs, scripts/prepare-mac-toolchain.mjs, scripts/stage-workflow-kit.mjs, scripts/stage-page-observer.mjs, tools/codex-app-server-mcp/control.py, tools/codex-app-server-mcp/server.py, tools/codex-app-server-mcp/app_server_client.py, tools/codex-app-server-mcp/codex-tools.lock.json, tools/codex-app-server-mcp/requirements.txt, tools/codex-app-server-mcp/windows_desktop.py, tools/codex-app-server-mcp/linux_desktop.py, packages/workflow-kit/package.json, packages/workflow-kit/src/cli.mjs, packages/workflow-kit/src/install.mjs, packages/workflow-kit/src/lib/transaction.mjs, packages/workflow-kit/src/lib/task-integration.mjs, packages/workflow-kit/src/lib/validate.mjs, packages/workflow-kit/src/lib/task-assignment.mjs, packages/workflow-kit/src/lib/actions.mjs, packages/workflow-kit/src/lib/plan-review.mjs, packages/workflow-kit/src/lib/recovery.mjs, tests/electron-smoke.mjs, tests/parallel-execution.test.mjs, tests/migration-compatibility.test.mjs, tests/linux-runtime.test.mjs, tests/linux-startup.test.mjs, .dependency-cruiser.cjs, scripts/check-github-release.mjs, scripts/check-mac-screen-capture.mjs, scripts/check-mac-signature.mjs, scripts/release-archive.mjs, scripts/release-linux.mjs, scripts/release-mac.mjs, scripts/release-package.mjs, scripts/stage-vendor-notices.mjs, scripts/verify-windows-package.mjs, src/agent-timer.mjs, src/auto-plan-state.mjs, src/auto-plan.mjs, src/automation-send-state.mjs, src/chromium-diagnostics.mjs, src/command-activity.mjs, src/context-cache.mjs, src/context-inputs.mjs, src/context-session.mjs, src/conversation-recovery.mjs, src/execution-projection.mjs, src/execution/platform/paths.mjs, src/executor-session.mjs, src/mac-runtime-switch.mjs, src/mcp-runtime.mjs, src/parallel-execution.mjs, src/parallel-kit.mjs, src/parallel-settings.mjs, src/plan-monitor.mjs, src/plan-review.mjs, src/project-auto-plan.mjs, src/project-doctor.mjs, src/project-input-watch.mjs, src/project-session-auto-plan.mjs, src/project-state-cleanup.mjs, src/review-continuation.mjs, src/session-plans.mjs, src/session-runtime.mjs, src/startup-network-trace.mjs, src/startup-platform.mjs, src/startup-readiness.mjs, src/tunnel-clipboard.mjs, src/tunnel-setup.mjs, src/vps-tunnel.mjs, src/windows-runtime.mjs, src/workspace-deletion.mjs, src/workspace-readiness.mjs, src/workspace-session.mjs, src/workspace-setup.mjs, src/zip-archive.mjs, tests/agent-timer.test.mjs, tests/auto-plan-restart-fixture.cjs, tests/auto-plan.test.mjs, tests/automation-send-state.test.mjs, tests/chatgpt-experience.test.mjs, tests/chromium-diagnostics.test.mjs, tests/command-activity.test.mjs, tests/common.test.mjs, tests/context-cache.test.mjs, tests/context-session.test.mjs, tests/conversation-recovery.test.mjs, tests/execution-architecture.test.mjs, tests/installed-observer-fixture.cjs, tests/mac-runtime-switch.test.mjs, tests/mac-toolchain.test.mjs, tests/mcp-runtime.test.mjs, tests/parallel-execution-recovery.test.mjs, tests/parallel-execution-smoke-fixture.cjs, tests/parallel-execution-ui.test.mjs, tests/parallel-finalization.test.mjs, tests/plan-monitor.test.mjs, tests/plan-review.test.mjs, tests/product-identity.test.mjs, tests/project-auto-plan.test.mjs, tests/project-doctor-ui.test.mjs, tests/project-doctor.test.mjs, tests/project-input-watch.test.mjs, tests/project-state-cleanup.test.mjs, tests/release-linux.test.mjs, tests/session-opening-performance.test.mjs, tests/session-plans.test.mjs, tests/session-runtime.test.mjs, tests/settings-parallel-execution.test.mjs, tests/sidebar.test.mjs, tests/startup-network-trace.test.mjs, tests/startup-platform.test.mjs, tests/startup-readiness.test.mjs, tests/startup-ui.test.mjs, tests/tunnel-clipboard.test.mjs, tests/tunnel-id-runtime.test.mjs, tests/vps-tunnel.test.mjs, tests/windows-autostart.test.mjs, tests/windows-runtime.test.mjs, tests/workspace-deletion.test.mjs, tests/workspace-readiness.test.mjs, tests/workspace-session.test.mjs, tests/workspace-setup.test.mjs, docs/planning/migration-0.1.0.md, docs/planning/migration-platforms.md, docs/acceptance/migration-0.1.0.md
  - Параллельность: исключительное выполнение
  - Зависимости: T010
- [DONE] DOCS: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: актуализировать документацию проекта
  - Reference: workflow-pilot-migration-0.1.0 / DOCS / implementation
  - Файлы: docs/architecture/OVERVIEW.md, docs/planning/migration-0.1.0.md, docs/planning/migration-platforms.md, docs/planning/orchestrated-execution-next.md, AGENTS.md, docs/modules/execution.md, docs/modules/browser.md, docs/modules/control.md, docs/modules/workflow-execution.md, docs/modules/project-compatibility.md, docs/modules/desktop.md, docs/modules/first-run-onboarding.md, docs/modules/project-lifecycle.md, docs/modules/linux.md, docs/modules/release.md, PROVENANCE.md, README.md, packages/workflow-kit/README.md, packages/workflow-kit/docs/modules/parallel-assignments.md, packages/workflow-kit/docs/modules/workflow-kit-package.md, packages/workflow-kit/src/WORKFLOW.md, packages/workflow-kit/src/examples/PACKAGING.md, packages/workflow-kit/src/templates/AGENTS.md, packages/workflow-kit/src/templates/CONTINUE.md, packages/workflow-kit/src/templates/PLAN.md, packages/workflow-kit/src/templates/PROTOTYPE.md, packages/workflow-kit/src/templates/SPEC.md, packages/workflow-kit/src/templates/STAGES.md, tests/fixtures/released-kit/README.md, resources/THIRD-PARTY.md, docs/acceptance/migration-0.1.0.md
  - Параллельность: исключительное выполнение
  - Зависимости: T001, T002, T003, T004, T005, T006, T007, T008, T009, T010, T011
- [DONE] T012: Исправить перенос ссылок Linux toolchain перед общим выпуском — Завершено
  - Git Commit: [DONE] fix: сохранить внутренние ссылки Linux toolchain
  - Reference: workflow-pilot-migration-0.1.0 / T012 / implementation
  - Файлы: package.json, scripts/copy-linux-toolchain.mjs, tests/release-linux.test.mjs, docs/modules/release.md
  - Параллельность: исключительное выполнение
  - Зависимости: T011, DOCS
- [DONE] DOCS-2: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: актуализировать документацию проекта
  - Reference: workflow-pilot-migration-0.1.0 / DOCS-2 / implementation
  - Файлы: docs/architecture/OVERVIEW.md, docs/modules/release.md
  - Параллельность: исключительное выполнение
  - Зависимости: T012
- [DONE] T012-RELEASE: Проверять штатные ресурсы Electron macOS в общем выпуске — Завершено
  - Git Commit: [DONE] fix: сверять штатные ресурсы Electron macOS
  - Reference: workflow-pilot-migration-0.1.0 / T012-RELEASE / implementation
  - Файлы: scripts/release-package.mjs, tests/release-all.test.mjs, tests/release-linux.test.mjs, docs/modules/release.md
  - Параллельность: исключительное выполнение
  - Зависимости: T012, DOCS, DOCS-2
- [DONE] DOCS-3: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: актуализировать документацию проекта
  - Reference: workflow-pilot-migration-0.1.0 / DOCS-3 / implementation
  - Файлы: docs/architecture/OVERVIEW.md, docs/modules/release.md
  - Параллельность: исключительное выполнение
  - Зависимости: T012-RELEASE
- [DONE] T012-BUILD: Собрать общий выпуск Workflow Pilot 0.1.0 — Завершено
  - Git Commit: [DONE] release: Собрать общий выпуск Workflow Pilot 0.1.0
  - Reference: workflow-pilot-migration-0.1.0 / T012-BUILD / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: T012-RELEASE, DOCS-2, DOCS-3
- [DONE] T015: Исправить распознавание входа и диагностику первого запуска в 0.1.1 — Завершено
  - Git Commit: [DONE] fix: восстановить первый вход и диагностику Workflow Pilot 0.1.1
  - Reference: workflow-pilot-migration-0.1.0 / T015 / implementation
  - Файлы: src/execution/browser/chatgpt-dom.mjs, src/execution/browser/chatgpt-page-observer.mjs, src/execution/browser/page-state.mjs, src/execution/browser/diagnostics.mjs, src/frontend/desktop/application.mjs, src/frontend/desktop/ui/startup.mjs, src/frontend/desktop/ui/index.html, tests/page-state.test.mjs, tests/startup-ui.test.mjs, tests/chromium-diagnostics.test.mjs, tests/electron-smoke.mjs, scripts/release-all.mjs, tests/release-linux.test.mjs, package.json, package-lock.json, docs/modules/first-run-onboarding.md, AGENTS.md
  - Параллельность: исключительное выполнение
  - Зависимости: T012-BUILD
- [DONE] DOCS-4: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: актуализировать документацию проекта
  - Reference: workflow-pilot-migration-0.1.0 / DOCS-4 / implementation
  - Файлы: docs/architecture/OVERVIEW.md, docs/modules/first-run-onboarding.md, AGENTS.md, README.md, docs/acceptance/migration-0.1.0.md, docs/modules/browser.md, docs/modules/linux.md, docs/modules/release.md
  - Параллельность: исключительное выполнение
  - Зависимости: T015
- [DONE] T016: Пересобрать исправленный комплект 0.1.1 для macOS, Windows и Linux — Завершено
  - Git Commit: [DONE] release: собрать исправленный Workflow Pilot 0.1.1 для трёх ОС
  - Reference: workflow-pilot-migration-0.1.0 / T016 / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: T015, DOCS-4
- [DONE] T013: Установить готовый macOS выпуск рядом с донором — Завершено
  - Git Commit: [DONE] release: Установить готовый macOS выпуск рядом с донором
  - Reference: workflow-pilot-migration-0.1.0 / T013 / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: T012-BUILD, DOCS, DOCS-2, DOCS-3, DOCS-4, T016
- [DONE] T014: Опубликовать и сверить полный GitHub Release — Завершено
  - Git Commit: [DONE] release: Опубликовать и сверить полный GitHub Release
  - Reference: workflow-pilot-migration-0.1.0 / T014 / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: T013, DOCS, DOCS-2, DOCS-3, DOCS-4
- [DONE] T017: Добавить плагин ChatGPT для открытия проекта и создания внешней сессии — Завершено
  - Git Commit: [DONE] feat: добавить плагин ChatGPT для проектов и внешних сессий
  - Reference: workflow-pilot-migration-0.1.0 / T017 / implementation
  - Файлы: src/control/facade.mjs, src/control/projects/service.mjs, src/control/sessions/workspace-session.mjs, src/control/plugin/service.mjs, src/execution/plugin/bridge.mjs, src/execution/facade.mjs, src/frontend/plugin/app.mjs, src/frontend/plugin/index.html, src/frontend/desktop/application.mjs, src/frontend/desktop/ui/sidebar.mjs, tools/codex-app-server-mcp/plugin.py, tools/codex-app-server-mcp/server.py, scripts/stage-chatgpt-plugin.mjs, package.json, package-lock.json, tests/chatgpt-plugin.test.mjs, .gitignore, src/control/sessions/service.mjs, src/frontend/plugin/panel.mjs, tests/codex-app-server-mcp.test.mjs, tests/electron-smoke.mjs, tests/fixtures/plugin-server.py, tests/sidebar.test.mjs, docs/modules/control.md, docs/planning/chatgpt-plugin.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] T018: Подготовить версию 0.1.2 с плагином ChatGPT — Завершено
  - Git Commit: [DONE] chore: подготовить Workflow Pilot 0.1.2 с плагином ChatGPT
  - Reference: workflow-pilot-migration-0.1.0 / T018 / implementation
  - Файлы: package.json, package-lock.json, docs/modules/control.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] DOCS-5: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: актуализировать документацию проекта
  - Reference: workflow-pilot-migration-0.1.0 / DOCS-5 / implementation
  - Файлы: docs/architecture/OVERVIEW.md, docs/modules/control.md, README.md, docs/acceptance/migration-0.1.0.md, docs/modules/chatgpt-plugin.md, docs/modules/desktop.md, docs/modules/release.md, docs/planning/chatgpt-plugin.md, docs/planning/orchestrated-execution-next.md
  - Параллельность: исключительное выполнение
  - Зависимости: T017, T018
- [DONE] T019: Собрать выпуск 0.1.2 с плагином для трёх ОС — Завершено
  - Git Commit: [DONE] release: собрать Workflow Pilot 0.1.2 для трёх ОС
  - Reference: workflow-pilot-migration-0.1.0 / T019 / implementation
  - Файлы: release-manifest.json, docs/modules/control.md
  - Параллельность: исключительное выполнение
  - Зависимости: T018, DOCS-5
- [DONE] T020: Установить готовый Workflow Pilot 0.1.2 на Mac — Завершено
  - Git Commit: [DONE] release: установить готовый Workflow Pilot 0.1.2 на Mac
  - Reference: workflow-pilot-migration-0.1.0 / T020 / implementation
  - Файлы: release-manifest.json, docs/modules/control.md
  - Параллельность: исключительное выполнение
  - Зависимости: T019, DOCS-5
- [DONE] T021: Исправить повреждение HTML панели ChatGPT при сборке — Завершено
  - Git Commit: [DONE] fix: сохранить код панели ChatGPT при упаковке HTML
  - Reference: workflow-pilot-migration-0.1.0 / T021 / implementation
  - Файлы: scripts/stage-chatgpt-plugin.mjs, tests/chatgpt-plugin.test.mjs, src/frontend/plugin/app.mjs, package.json, package-lock.json, docs/modules/control.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] DOCS-6: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: актуализировать документацию проекта
  - Reference: workflow-pilot-migration-0.1.0 / DOCS-6 / implementation
  - Файлы: docs/architecture/OVERVIEW.md, docs/modules/control.md, README.md, docs/acceptance/migration-0.1.0.md, docs/modules/chatgpt-plugin.md, docs/modules/release.md
  - Параллельность: исключительное выполнение
  - Зависимости: T021
- [DONE] T022: Собрать исправленный выпуск панели 0.1.3 для трёх ОС — Завершено
  - Git Commit: [DONE] release: собрать исправленную панель Workflow Pilot 0.1.3
  - Reference: workflow-pilot-migration-0.1.0 / T022 / implementation
  - Файлы: release-manifest.json, docs/modules/control.md
  - Параллельность: исключительное выполнение
  - Зависимости: T021, DOCS-6
- [DONE] T023: Установить готовый Workflow Pilot 0.1.3 на Mac — Завершено
  - Git Commit: [DONE] release: установить Workflow Pilot 0.1.3 на Mac
  - Reference: workflow-pilot-migration-0.1.0 / T023 / implementation
  - Файлы: release-manifest.json, docs/modules/control.md
  - Параллельность: исключительное выполнение
  - Зависимости: T022, DOCS-6
- [DONE] T024: Открывать панель нового разговора с актуальными сессиями проекта — Завершено
  - Git Commit: [DONE] fix: открывать панель проекта в новом разговоре и обновлять сессии
  - Reference: workflow-pilot-migration-0.1.0 / T024 / implementation
  - Файлы: src/frontend/plugin/panel.mjs, tools/codex-app-server-mcp/plugin.py, tests/chatgpt-plugin.test.mjs, package.json, package-lock.json, docs/modules/control.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] DOCS-7: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: актуализировать документацию проекта
  - Reference: workflow-pilot-migration-0.1.0 / DOCS-7 / implementation
  - Файлы: docs/architecture/OVERVIEW.md, docs/modules/control.md, README.md, docs/acceptance/migration-0.1.0.md, docs/modules/chatgpt-plugin.md, docs/modules/release.md
  - Параллельность: исключительное выполнение
  - Зависимости: T024
- [DONE] T025: Собрать Workflow Pilot 0.1.4 для трёх ОС — Завершено
  - Git Commit: [DONE] release: собрать Workflow Pilot 0.1.4 для трёх ОС
  - Reference: workflow-pilot-migration-0.1.0 / T025 / implementation
  - Файлы: release-manifest.json, docs/modules/control.md
  - Параллельность: исключительное выполнение
  - Зависимости: T024, DOCS-7
- [DONE] T026: Установить готовый Workflow Pilot 0.1.4 на Mac — Завершено
  - Git Commit: [DONE] release: установить Workflow Pilot 0.1.4 на Mac
  - Reference: workflow-pilot-migration-0.1.0 / T026 / implementation
  - Файлы: release-manifest.json, docs/modules/control.md
  - Параллельность: исключительное выполнение
  - Зависимости: T025, DOCS-7
- [TODO] T027: Подготовить проверку открытия прежнего диалога из панели ChatGPT — Ожидает
  - Git Commit: [PENDING] feat: Подготовить проверку открытия прежнего диалога из панели ChatGPT
  - Reference: workflow-pilot-migration-0.1.0 / T027 / implementation
  - Файлы: src/frontend/plugin/app.mjs, src/frontend/plugin/index.html, src/frontend/plugin/navigation-probe.mjs, tools/codex-app-server-mcp/plugin.py, tests/chatgpt-plugin.test.mjs, package.json, package-lock.json, docs/modules/chatgpt-plugin.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [TODO] DOCS-8: Актуализация всех документов проекта — Ожидает
  - Git Commit: [PENDING] docs: актуализировать документацию проекта
  - Reference: workflow-pilot-migration-0.1.0 / DOCS-8 / implementation
  - Файлы: docs/architecture/OVERVIEW.md, docs/modules/chatgpt-plugin.md
  - Параллельность: исключительное выполнение
  - Зависимости: T027
- [TODO] T028: Собрать диагностический Workflow Pilot 0.1.5 для трёх ОС — Ожидает
  - Git Commit: [PENDING] feat: Собрать диагностический Workflow Pilot 0.1.5 для трёх ОС
  - Reference: workflow-pilot-migration-0.1.0 / T028 / implementation
  - Файлы: release-manifest.json, docs/modules/chatgpt-plugin.md
  - Параллельность: исключительное выполнение
  - Зависимости: T027, DOCS-8
- [TODO] T029: Установить готовый Workflow Pilot 0.1.5 для проверки переходов — Ожидает
  - Git Commit: [PENDING] feat: Установить готовый Workflow Pilot 0.1.5 для проверки переходов
  - Reference: workflow-pilot-migration-0.1.0 / T029 / implementation
  - Файлы: release-manifest.json, docs/modules/chatgpt-plugin.md
  - Параллельность: исключительное выполнение
  - Зависимости: T028, DOCS-8

## Context Pack For This Cycle

- docs/planning/migration-0.1.0.md
- docs/planning/migration-platforms.md
- docs/planning/orchestrated-execution-next.md
- docs/architecture/OVERVIEW.md
- docs/modules/first-run-onboarding.md
- docs/modules/control.md
- docs/modules/chatgpt-plugin.md

Служебные состояния меняются только командами workflow. Приёмка не архивирует scope.
