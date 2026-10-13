# Активный план — Workflow_Pilot

<!-- workflow-state:begin -->
```json
{
  "schema_version": 1,
  "plan_revision": 5,
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
      "release-manifest.json"
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
      "docs/modules/release.md"
    ]
  },
  "baseline_commit": "dcb2703c8a766d9f1cf7030f6fc69a8af1c8e9be",
  "current_task_id": null,
  "context_pack": {
    "documents": [
      {
        "path": "docs/planning/migration-0.1.0.md",
        "required": true,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/planning/migration-platforms.md",
        "required": true,
        "revision": "WORKTREE"
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
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T001",
        "role": "implementation"
      }
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
        "LICENSE"
      ],
      "documentation_paths": [
        "AGENTS.md",
        "docs/modules/control.md",
        "docs/modules/execution.md",
        "docs/modules/browser.md",
        "docs/modules/workflow-execution.md",
        "docs/modules/desktop.md"
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
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T002",
        "role": "implementation"
      }
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
        "scripts/stage-page-observer.mjs"
      ],
      "documentation_paths": [
        "docs/modules/execution.md"
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
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T003",
        "role": "implementation"
      }
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
        "src/agent-timer.mjs"
      ],
      "documentation_paths": [
        "docs/modules/browser.md"
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
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T004",
        "role": "implementation"
      }
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
        "tests/context-cache.test.mjs"
      ],
      "documentation_paths": [
        "docs/modules/control.md"
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
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T005",
        "role": "implementation"
      }
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
        "src/execution/browser/session-runtime.mjs"
      ],
      "documentation_paths": [
        "docs/modules/workflow-execution.md"
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
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T006",
        "role": "implementation"
      }
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
        "tests/workflow-kit-upgrade.test.mjs"
      ],
      "documentation_paths": [
        "docs/modules/project-compatibility.md"
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
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T007",
        "role": "implementation"
      }
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
        "package.json"
      ],
      "documentation_paths": [
        "docs/modules/desktop.md",
        "docs/modules/first-run-onboarding.md",
        "docs/modules/project-lifecycle.md"
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
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T008",
        "role": "implementation"
      }
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
        "src/contracts/errors.mjs"
      ],
      "documentation_paths": [
        "docs/modules/linux.md"
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
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T009",
        "role": "implementation"
      }
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
        "src/execution/runtime/vps-tunnel.mjs"
      ],
      "documentation_paths": [
        "docs/modules/release.md"
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
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T010",
        "role": "implementation"
      }
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
        ".dependency-cruiser.cjs"
      ],
      "documentation_paths": [
        "docs/planning/migration-0.1.0.md",
        "docs/planning/migration-platforms.md"
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
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T011",
        "role": "implementation"
      }
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
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
        "docs/modules/release.md"
      ],
      "acceptance_criteria": [
        "Документы описывают текущий результат, существенное из выпущенных рабочих спецификаций перенесено в контракты модулей; история остаётся в Git."
      ],
      "verification_ids": [],
      "expected_commit_message": "docs: актуализировать документацию проекта",
      "parallel_safe": false
    },
    {
      "id": "T012",
      "title": "Собрать общий выпуск Workflow Pilot 0.1.0",
      "why": "Собрать общий выпуск Workflow Pilot 0.1.0",
      "dependencies": [
        "T011",
        "DOCS"
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
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T012",
        "role": "implementation"
      }
    },
    {
      "id": "T013",
      "title": "Установить готовый macOS выпуск рядом с донором",
      "why": "Установить готовый macOS выпуск рядом с донором",
      "dependencies": [
        "T012",
        "DOCS"
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
        "Установлены только готовые проверенные пакеты T012 без пересборки в <workspace>/Workflow Pilot.app и /Applications/Workflow Pilot.app; sourceCommit, version, manifest/подпись/состав соответствуют.",
        "Назначения и симлинки проверены, предусмотрен откат, донор/его подпись/службы не затронуты. Приложения не перезапускаются и не управляются агентом; запуск и разрешения выполняет пользователь.",
        "Пользователю переданы порядок Mac→Windows→Linux→clean, точные пакеты/пути и ограничения x64 UTM/VPS setup/первого запуска. Неподтверждённая живая приёмка не отмечена выполненной.",
        "Корневой/staging/поставочный manifest имеют одинаковый digest; установочная задача не меняет байты manifest комплекта и не добавляет app bundle в Git."
      ],
      "expected_commit_message": "release: Установить готовый macOS выпуск рядом с донором",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T013",
        "role": "implementation"
      }
    },
    {
      "id": "T014",
      "title": "Опубликовать и сверить полный GitHub Release",
      "why": "Опубликовать и сверить полный GitHub Release",
      "dependencies": [
        "T013",
        "DOCS"
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
        "После DOCS новый origin = https://github.com/OleynikAleksandr/Workflow_Pilot.git; main отправлен fast-forward без force. Тег v0.1.0 на manifest.sourceCommit, Release публикуется после сверки полного комплекта трёх ОС по именам/размерам/digest.",
        "Использованы готовые assets T012, пересборки нет; в Release/manifest честно указаны pending nativeWindows/nativeLinux/clean и режим подписи. После финального коммита выполнены обычный push и повторная сверка remote main=local HEAD, тега и assets.",
        "Даны результат, пути, тесты и дальнейшие действия пользователя; план READY_FOR_ACCEPTANCE, не архивирован без приёмки. Донорский репозиторий и старые теги не менялись.",
        "Manifest asset, корневая и поставочная копии побайтно одинаковы; новые коммиты после dcb2703c8a766d9f1cf7030f6fc69a8af1c8e9be не имеют placeholder-автора. Начальная история до этой границы сохраняется, force/rewrite не выполняются."
      ],
      "expected_commit_message": "release: Опубликовать и сверить полный GitHub Release",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-migration-0.1.0",
        "task_id": "T014",
        "role": "implementation"
      }
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
Revision: 5

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

- [TODO] T001: Закрепить карту переноса и платформенные зависимости — Ожидает
  - Git Commit: [PENDING] docs: Закрепить карту переноса и платформенные зависимости
  - Reference: workflow-pilot-migration-0.1.0 / T001 / implementation
  - Файлы: docs/planning/migration-0.1.0.md, docs/planning/migration-platforms.md, docs/planning/orchestrated-execution-next.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [TODO] T002: Перенести запускаемую базу с собственной identity — Ожидает
  - Git Commit: [PENDING] refactor: Перенести запускаемую базу с собственной identity
  - Reference: workflow-pilot-migration-0.1.0 / T002 / implementation
  - Файлы: package.json, package-lock.json, .gitignore, src/main.mjs, src/common.mjs, src/platform.mjs, src/control/facade.mjs, src/execution/facade.mjs, src/frontend/desktop/bootstrap.mjs, scripts/release-all.mjs, scripts/prepare-windows-toolchain.mjs, scripts/prepare-mac-toolchain.mjs, scripts/stage-workflow-kit.mjs, scripts/stage-page-observer.mjs, resources/mac-permissions.plist, resources/workspace-setup-worker.mjs, resources/runtime-control/windows-control.py, tools/codex-app-server-mcp/control.py, tools/codex-app-server-mcp/server.py, tools/codex-app-server-mcp/app_server_client.py, tools/codex-app-server-mcp/codex-tools.lock.json, tools/codex-app-server-mcp/requirements.txt, tools/codex-app-server-mcp/windows_desktop.py, tools/codex-app-server-mcp/linux_desktop.py, packages/workflow-kit/package.json, packages/workflow-kit/src/cli.mjs, packages/workflow-kit/src/install.mjs, packages/workflow-kit/src/lib/transaction.mjs, packages/workflow-kit/src/lib/task-integration.mjs, packages/workflow-kit/src/lib/validate.mjs, packages/workflow-kit/src/lib/task-assignment.mjs, packages/workflow-kit/src/lib/actions.mjs, packages/workflow-kit/src/lib/plan-review.mjs, packages/workflow-kit/src/lib/recovery.mjs, tests/workspace-session.test.mjs, tests/session-runtime.test.mjs, tests/parallel-execution.test.mjs, tests/project-auto-plan.test.mjs, tests/electron-smoke.mjs, tests/codex-app-server-mcp.test.mjs, LICENSE, AGENTS.md, docs/modules/control.md, docs/modules/execution.md, docs/modules/browser.md, docs/modules/workflow-execution.md, docs/modules/desktop.md
  - Параллельность: исключительное выполнение
  - Зависимости: T001
- [TODO] T003: Выделить Execution для команд, файлов и служб — Ожидает
  - Git Commit: [PENDING] refactor: Выделить Execution для команд, файлов и служб
  - Reference: workflow-pilot-migration-0.1.0 / T003 / implementation
  - Файлы: src/execution/facade.mjs, src/execution/commands/service.mjs, src/execution/files/adapter.mjs, src/execution/runtime/service.mjs, src/execution/platform/paths.mjs, src/execution/browser/session-runtime.mjs, src/contracts/control.mjs, src/contracts/execution.mjs, src/contracts/errors.mjs, src/main.mjs, src/platform.mjs, src/mac-runtime-switch.mjs, src/windows-runtime.mjs, src/vps-tunnel.mjs, tools/codex-app-server-mcp/control.py, tools/codex-app-server-mcp/server.py, tools/codex-app-server-mcp/app_server_client.py, tools/codex-app-server-mcp/codex-tools.lock.json, tools/codex-app-server-mcp/requirements.txt, tools/codex-app-server-mcp/windows_desktop.py, tools/codex-app-server-mcp/linux_desktop.py, resources/runtime-control/windows-control.py, resources/runtime-control/linux-control.py, package.json, package-lock.json, .dependency-cruiser.cjs, tests/command-activity.test.mjs, tests/mcp-runtime.test.mjs, tests/mac-runtime-switch.test.mjs, tests/windows-runtime.test.mjs, tests/vps-tunnel.test.mjs, src/mcp-runtime.mjs, scripts/release-all.mjs, scripts/prepare-windows-toolchain.mjs, scripts/prepare-mac-toolchain.mjs, scripts/stage-workflow-kit.mjs, scripts/stage-page-observer.mjs, docs/modules/execution.md
  - Параллельность: исключительное выполнение
  - Зависимости: T002
- [TODO] T004: Выделить браузерный модуль Execution — Ожидает
  - Git Commit: [PENDING] refactor: Выделить браузерный модуль Execution
  - Reference: workflow-pilot-migration-0.1.0 / T004 / implementation
  - Файлы: src/execution/browser/session-runtime.mjs, src/execution/browser/chatgpt-dom.mjs, src/execution/browser/chatgpt-composer.mjs, src/execution/browser/chatgpt-experience.mjs, src/execution/browser/chatgpt-page-observer.mjs, src/execution/browser/page-state.mjs, src/contracts/control.mjs, src/contracts/execution.mjs, src/contracts/errors.mjs, src/main.mjs, src/session-runtime.mjs, src/conversation-recovery.mjs, src/chatgpt-dom.mjs, src/chatgpt-composer.mjs, src/chatgpt-experience.mjs, src/chatgpt-page-observer.mjs, scripts/stage-page-observer.mjs, tests/chatgpt-dom.test.mjs, tests/chatgpt-composer.test.mjs, tests/page-state.test.mjs, tests/session-runtime.test.mjs, tests/conversation-recovery.test.mjs, src/page-state.mjs, src/page-state-bridge.mjs, src/chatgpt-auto-scroll.mjs, src/chatgpt-colors.mjs, src/chatgpt-title.mjs, src/chatgpt-tool-filter.mjs, src/automation-send-state.mjs, src/agent-timer.mjs, docs/modules/browser.md
  - Параллельность: исключительное выполнение
  - Зависимости: T003
- [TODO] T005: Выделить Control проектов, сессий и контекста — Ожидает
  - Git Commit: [PENDING] refactor: Выделить Control проектов, сессий и контекста
  - Reference: workflow-pilot-migration-0.1.0 / T005 / implementation
  - Файлы: src/control/projects/service.mjs, src/control/projects/workspace-setup.mjs, src/control/projects/workspace-deletion.mjs, src/control/projects/project-doctor.mjs, src/control/sessions/service.mjs, src/control/sessions/workspace-session.mjs, src/control/sessions/conversation-recovery.mjs, src/control/context/service.mjs, src/control/context/context-session.mjs, src/control/context/context-inputs.mjs, src/control/context/context-cache.mjs, src/control/facade.mjs, src/contracts/control.mjs, src/contracts/execution.mjs, src/contracts/errors.mjs, src/main.mjs, src/workspace-session.mjs, src/session-plans.mjs, src/context-session.mjs, src/context-inputs.mjs, src/context-cache.mjs, tests/workspace-session.test.mjs, tests/session-plans.test.mjs, tests/context-session.test.mjs, tests/context-cache.test.mjs, docs/modules/control.md
  - Параллельность: исключительное выполнение
  - Зависимости: T004
- [TODO] T006: Перенести координацию AutoPlan, Review и исполнителей в Control — Ожидает
  - Git Commit: [PENDING] refactor: Перенести координацию AutoPlan, Review и исполнителей в Control
  - Reference: workflow-pilot-migration-0.1.0 / T006 / implementation
  - Файлы: src/control/workflow/coordination.mjs, src/control/workflow/auto-plan.mjs, src/control/workflow/plan-review.mjs, src/control/workflow/parallel-execution.mjs, src/control/workflow/parallel-kit.mjs, src/control/facade.mjs, src/contracts/control.mjs, src/contracts/execution.mjs, src/contracts/errors.mjs, src/main.mjs, src/auto-plan.mjs, src/project-auto-plan.mjs, src/project-session-auto-plan.mjs, src/plan-review.mjs, src/review-continuation.mjs, src/parallel-execution.mjs, src/parallel-kit.mjs, src/executor-session.mjs, tests/auto-plan.test.mjs, tests/project-auto-plan.test.mjs, tests/plan-review.test.mjs, tests/parallel-execution.test.mjs, tests/parallel-finalization.test.mjs, tests/electron-smoke.mjs, src/parallel-settings.mjs, src/auto-plan-state.mjs, src/execution-projection.mjs, src/plan-monitor.mjs, src/execution/facade.mjs, src/execution/commands/service.mjs, src/execution/files/adapter.mjs, src/execution/runtime/service.mjs, src/execution/platform/paths.mjs, src/execution/browser/session-runtime.mjs, docs/modules/workflow-execution.md
  - Параллельность: исключительное выполнение
  - Зависимости: T005
- [TODO] T007: Разделить зависимости Kit и обеспечить продолжение донорских проектов — Ожидает
  - Git Commit: [PENDING] refactor: Разделить зависимости Kit и обеспечить продолжение донорских проектов
  - Reference: workflow-pilot-migration-0.1.0 / T007 / implementation
  - Файлы: packages/workflow-kit/package.json, packages/workflow-kit/src/cli.mjs, packages/workflow-kit/src/install.mjs, packages/workflow-kit/src/lib/transaction.mjs, packages/workflow-kit/src/lib/task-integration.mjs, packages/workflow-kit/src/lib/validate.mjs, packages/workflow-kit/src/lib/task-assignment.mjs, packages/workflow-kit/src/lib/actions.mjs, packages/workflow-kit/src/lib/plan-review.mjs, packages/workflow-kit/src/lib/recovery.mjs, scripts/stage-workflow-kit.mjs, src/control/workflow/coordination.mjs, src/control/workflow/auto-plan.mjs, src/control/workflow/plan-review.mjs, src/control/workflow/parallel-execution.mjs, src/control/workflow/parallel-kit.mjs, src/control/projects/service.mjs, src/control/projects/workspace-setup.mjs, src/control/projects/workspace-deletion.mjs, src/control/projects/project-doctor.mjs, src/execution/files/adapter.mjs, tests/migration-compatibility.test.mjs, tests/workflow-kit-upgrade.test.mjs, docs/modules/project-compatibility.md
  - Параллельность: исключительное выполнение
  - Зависимости: T006
- [TODO] T008: Завершить Frontend, первый запуск и управление проектами — Ожидает
  - Git Commit: [PENDING] refactor: Завершить Frontend, первый запуск и управление проектами
  - Reference: workflow-pilot-migration-0.1.0 / T008 / implementation
  - Файлы: src/frontend/desktop/bootstrap.mjs, src/frontend/desktop/preload.cjs, src/frontend/desktop/ipc.mjs, src/frontend/desktop/ui/index.html, src/frontend/desktop/ui/sidebar.mjs, src/frontend/desktop/ui/startup.mjs, src/control/facade.mjs, src/control/projects/service.mjs, src/control/sessions/service.mjs, src/control/context/service.mjs, src/control/workflow/coordination.mjs, src/execution/facade.mjs, src/execution/commands/service.mjs, src/execution/files/adapter.mjs, src/execution/runtime/service.mjs, src/execution/platform/paths.mjs, src/execution/browser/session-runtime.mjs, src/contracts/control.mjs, src/contracts/execution.mjs, src/contracts/errors.mjs, src/main.mjs, src/preload.cjs, src/ui/index.html, src/ui/sidebar.mjs, src/ui/startup.mjs, src/ui/settings-panel.mjs, resources/mac-permissions.plist, resources/workspace-setup-worker.mjs, resources/runtime-control/windows-control.py, tests/sidebar.test.mjs, tests/startup-ui.test.mjs, tests/workspace-setup.test.mjs, tests/project-doctor.test.mjs, tests/workspace-deletion.test.mjs, tests/project-state-cleanup.test.mjs, src/workspace-setup.mjs, src/project-doctor.mjs, src/workspace-deletion.mjs, src/project-state-cleanup.mjs, src/startup-readiness.mjs, src/startup-platform.mjs, src/browser-startup.mjs, src/tunnel-setup.mjs, src/tunnel-clipboard.mjs, src/archive-preload.cjs, package.json, docs/modules/desktop.md, docs/modules/first-run-onboarding.md, docs/modules/project-lifecycle.md
  - Параллельность: исключительное выполнение
  - Зависимости: T007
- [TODO] T009: Реализовать Linux runtime и первый запуск Ubuntu x64 — Ожидает
  - Git Commit: [PENDING] refactor: Реализовать Linux runtime и первый запуск Ubuntu x64
  - Reference: workflow-pilot-migration-0.1.0 / T009 / implementation
  - Файлы: src/execution/platform/linux/runtime.mjs, src/execution/platform/linux/startup.mjs, src/execution/platform/linux/services.mjs, src/execution/runtime/service.mjs, src/execution/runtime/mcp-runtime.mjs, src/execution/runtime/vps-tunnel.mjs, src/frontend/desktop/bootstrap.mjs, src/frontend/desktop/preload.cjs, src/frontend/desktop/ipc.mjs, src/frontend/desktop/ui/index.html, src/frontend/desktop/ui/sidebar.mjs, src/frontend/desktop/ui/startup.mjs, src/control/facade.mjs, src/control/projects/service.mjs, src/control/sessions/service.mjs, src/control/context/service.mjs, src/control/workflow/coordination.mjs, tools/codex-app-server-mcp/control.py, tools/codex-app-server-mcp/server.py, tools/codex-app-server-mcp/app_server_client.py, tools/codex-app-server-mcp/codex-tools.lock.json, tools/codex-app-server-mcp/requirements.txt, tools/codex-app-server-mcp/windows_desktop.py, tools/codex-app-server-mcp/linux_desktop.py, resources/runtime-control/windows-control.py, resources/runtime-control/linux-control.py, scripts/prepare-linux-toolchain.mjs, tests/linux-runtime.test.mjs, tests/linux-startup.test.mjs, src/execution/commands/service.mjs, src/execution/commands/command-activity.mjs, src/execution/browser/session-runtime.mjs, src/execution/browser/chatgpt-dom.mjs, src/execution/browser/chatgpt-composer.mjs, src/execution/browser/chatgpt-experience.mjs, src/execution/browser/chatgpt-page-observer.mjs, src/execution/browser/page-state.mjs, src/contracts/control.mjs, src/contracts/execution.mjs, src/contracts/errors.mjs, docs/modules/linux.md
  - Параллельность: исключительное выполнение
  - Зависимости: T008
- [TODO] T010: Подготовить единую поставку трёх платформ — Ожидает
  - Git Commit: [PENDING] refactor: Подготовить единую поставку трёх платформ
  - Reference: workflow-pilot-migration-0.1.0 / T010 / implementation
  - Файлы: package.json, package-lock.json, scripts/release-all.mjs, scripts/release-mac.mjs, scripts/release-linux.mjs, scripts/prepare-linux-toolchain.mjs, scripts/verify-linux-package.mjs, scripts/check-installed-release.mjs, scripts/check-github-release.mjs, scripts/sign-mac-bundle.mjs, tests/release-all.test.mjs, tests/release-mac.test.mjs, tests/release-linux.test.mjs, scripts/prepare-windows-toolchain.mjs, scripts/verify-windows-package.mjs, scripts/prepare-mac-toolchain.mjs, scripts/check-mac-signature.mjs, src/execution/platform/paths.mjs, src/execution/platform/mac-runtime.mjs, src/execution/platform/windows-runtime.mjs, src/execution/platform/linux/runtime.mjs, src/execution/runtime/service.mjs, src/execution/runtime/mcp-runtime.mjs, src/execution/runtime/vps-tunnel.mjs, docs/modules/release.md
  - Параллельность: исключительное выполнение
  - Зависимости: T009
- [TODO] T011: Проверить общий результат и удалить временные мосты — Ожидает
  - Git Commit: [PENDING] refactor: Проверить общий результат и удалить временные мосты
  - Reference: workflow-pilot-migration-0.1.0 / T011 / implementation
  - Файлы: src/main.mjs, src/common.mjs, src/platform.mjs, src/control/facade.mjs, src/execution/facade.mjs, src/frontend/desktop/bootstrap.mjs, resources/mac-permissions.plist, resources/workspace-setup-worker.mjs, resources/runtime-control/windows-control.py, scripts/release-all.mjs, scripts/prepare-windows-toolchain.mjs, scripts/prepare-mac-toolchain.mjs, scripts/stage-workflow-kit.mjs, scripts/stage-page-observer.mjs, tools/codex-app-server-mcp/control.py, tools/codex-app-server-mcp/server.py, tools/codex-app-server-mcp/app_server_client.py, tools/codex-app-server-mcp/codex-tools.lock.json, tools/codex-app-server-mcp/requirements.txt, tools/codex-app-server-mcp/windows_desktop.py, tools/codex-app-server-mcp/linux_desktop.py, packages/workflow-kit/package.json, packages/workflow-kit/src/cli.mjs, packages/workflow-kit/src/install.mjs, packages/workflow-kit/src/lib/transaction.mjs, packages/workflow-kit/src/lib/task-integration.mjs, packages/workflow-kit/src/lib/validate.mjs, packages/workflow-kit/src/lib/task-assignment.mjs, packages/workflow-kit/src/lib/actions.mjs, packages/workflow-kit/src/lib/plan-review.mjs, packages/workflow-kit/src/lib/recovery.mjs, tests/electron-smoke.mjs, tests/parallel-execution.test.mjs, tests/migration-compatibility.test.mjs, tests/linux-runtime.test.mjs, tests/linux-startup.test.mjs, .dependency-cruiser.cjs, docs/planning/migration-0.1.0.md, docs/planning/migration-platforms.md
  - Параллельность: исключительное выполнение
  - Зависимости: T010
- [TODO] DOCS: Актуализация всех документов проекта — Ожидает
  - Git Commit: [PENDING] docs: актуализировать документацию проекта
  - Reference: workflow-pilot-migration-0.1.0 / DOCS / implementation
  - Файлы: docs/architecture/OVERVIEW.md, docs/planning/migration-0.1.0.md, docs/planning/migration-platforms.md, docs/planning/orchestrated-execution-next.md, AGENTS.md, docs/modules/execution.md, docs/modules/browser.md, docs/modules/control.md, docs/modules/workflow-execution.md, docs/modules/project-compatibility.md, docs/modules/desktop.md, docs/modules/first-run-onboarding.md, docs/modules/project-lifecycle.md, docs/modules/linux.md, docs/modules/release.md
  - Параллельность: исключительное выполнение
  - Зависимости: T001, T002, T003, T004, T005, T006, T007, T008, T009, T010, T011
- [TODO] T012: Собрать общий выпуск Workflow Pilot 0.1.0 — Ожидает
  - Git Commit: [PENDING] release: Собрать общий выпуск Workflow Pilot 0.1.0
  - Reference: workflow-pilot-migration-0.1.0 / T012 / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: T011, DOCS
- [TODO] T013: Установить готовый macOS выпуск рядом с донором — Ожидает
  - Git Commit: [PENDING] release: Установить готовый macOS выпуск рядом с донором
  - Reference: workflow-pilot-migration-0.1.0 / T013 / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: T012, DOCS
- [TODO] T014: Опубликовать и сверить полный GitHub Release — Ожидает
  - Git Commit: [PENDING] release: Опубликовать и сверить полный GitHub Release
  - Reference: workflow-pilot-migration-0.1.0 / T014 / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: T013, DOCS

## Context Pack For This Cycle

- docs/planning/migration-0.1.0.md
- docs/planning/migration-platforms.md
- docs/planning/orchestrated-execution-next.md
- docs/architecture/OVERVIEW.md

Служебные состояния меняются только командами workflow. Приёмка не архивирует scope.
