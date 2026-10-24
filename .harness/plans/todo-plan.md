# Активный план — Workflow_Pilot

<!-- workflow-state:begin -->
```json
{
  "schema_version": 1,
  "plan_revision": 1035,
  "project_id": "7411e192-943c-4529-bffb-3b081d9c242f",
  "project_name": "Workflow_Pilot",
  "scope_id": "chat-only-url-bootstrap",
  "execution_scope_status": "ACTIVE",
  "delivery_status": "IN_PROGRESS",
  "objective": "Оставить только Chat-сессии и заменить DOM-ввод первого сообщения одним URL-bootstrap с тикетом, сохранив идентичность, отмену и получение контекста.",
  "acceptance_criteria": [
    "Work упразднён; история сохранена без исполнения и потери назначений.",
    "Один q-bootstrap после preflight; sent только по текущему тикету; адрес и startup ack независимы.",
    "Долговечный revoke/cancel и runtime no-q-reload выдерживают гонки/рестарты без подмены identity.",
    "Изолированные suites и Electron smoke пройдены; непроведённая живая приёмка явно отражена в документах и выпуске согласно новому поручению пользователя."
  ],
  "approved_scope": {
    "functional_paths": [
      "scripts/stage-page-observer.mjs",
      "scripts/stage-chatgpt-plugin.mjs",
      "src/backend/bootstrap.mjs",
      "src/backend/desktop-model.mjs",
      "src/backend/operations.mjs",
      "src/contracts/browser.mjs",
      "src/contracts/context.mjs",
      "src/contracts/desktop.mjs",
      "src/contracts/plugin-communication.mjs",
      "src/control/context/context-session.mjs",
      "src/control/context/service.mjs",
      "src/control/facade.mjs",
      "src/control/plugin/communication.mjs",
      "src/control/plugin/enrollment.mjs",
      "src/control/plugin/service.mjs",
      "src/control/plugin/startup-context.mjs",
      "src/control/plugin/workflow-channel.mjs",
      "src/control/projects/workspace-setup.mjs",
      "src/control/sessions/conversation-recovery.mjs",
      "src/control/sessions/service.mjs",
      "src/control/sessions/workspace-session.mjs",
      "src/control/workflow/coordination.mjs",
      "src/control/workflow/dialogue-delivery.mjs",
      "src/control/workflow/execution-control.mjs",
      "src/control/workflow/executor-session.mjs",
      "src/control/workflow/parallel-execution.mjs",
      "src/control/workflow/project-session-plan-continuation.mjs",
      "src/execution/browser/browser-startup.mjs",
      "src/execution/browser/chatgpt-composer.mjs",
      "src/execution/browser/chatgpt-experience.mjs",
      "src/execution/browser/diagnostics.mjs",
      "src/execution/browser/session-runtime.mjs",
      "src/execution/facade.mjs",
      "src/execution/plugin/communication-store.mjs",
      "src/frontend/desktop/client.mjs",
      "src/frontend/desktop/preload.cjs",
      "src/frontend/desktop/ui/archive.html",
      "src/frontend/desktop/ui/archive.mjs",
      "src/frontend/desktop/ui/index.html",
      "src/frontend/desktop/ui/sidebar.mjs",
      "src/frontend/desktop/ui/workspace-setup.mjs",
      "src/frontend/plugin/launch.mjs",
      "src/frontend/plugin/panel.mjs",
      "tests/automatic-agent-dialogue.test.mjs",
      "tests/backend-api.test.mjs",
      "tests/backend-browser-lifecycle.test.mjs",
      "tests/backend-desktop-model.test.mjs",
      "tests/browser-startup.test.mjs",
      "tests/chatgpt-composer.test.mjs",
      "tests/chatgpt-experience.test.mjs",
      "tests/chromium-diagnostics.test.mjs",
      "tests/context-session.test.mjs",
      "tests/control-facade.test.mjs",
      "tests/desktop-boundaries.test.mjs",
      "tests/desktop-client.test.mjs",
      "tests/dialogue-delivery.test.mjs",
      "tests/electron-smoke.mjs",
      "tests/executor-background-startup.test.mjs",
      "tests/executor-startup-lifecycle.test.mjs",
      "tests/fixtures/automatic-agent-dialogue.mjs",
      "tests/fixtures/executor-background-startup.mjs",
      "tests/fixtures/dialogue-runtime.mjs",
      "tests/fixtures/plugin-host.mjs",
      "tests/fixtures/backend-browser-viewer.mjs",
      "tests/fixtures/backend-browser-client.mjs",
      "tests/fixtures/backend-browser-viewer.html",
      "tests/fixtures/backend-browser-viewer-preload.cjs",
      "tests/fixtures/backend-browser-page.html",
      "tests/fixtures/backend-browser-probe.mjs",
      "tests/migration-compatibility.test.mjs",
      "tests/parallel-execution-ui.test.mjs",
      "tests/parallel-execution.test.mjs",
      "tests/plugin-communication-store.test.mjs",
      "tests/plugin-enrollment.test.mjs",
      "tests/progress.test.mjs",
      "tests/project-doctor-ui.test.mjs",
      "tests/session-roles.test.mjs",
      "tests/session-runtime.test.mjs",
      "tests/sidebar.test.mjs",
      "tests/startup-context.test.mjs",
      "tests/startup-ui.test.mjs",
      "tests/workspace-session.test.mjs",
      "tools/codex-app-server-mcp/plugin.py",
      "package.json",
      "package-lock.json",
      "release-manifest.json",
      "scripts/release-all.mjs",
      "scripts/release-package.mjs",
      "tests/backend-upgrade.test.mjs",
      "tests/chatgpt-plugin.test.mjs",
      "src/control/projects/service.mjs",
      "src/execution/files/adapter.mjs",
      "tests/files-adapter.test.mjs",
      "tests/session-opening-performance.test.mjs",
      "src/contracts/startup-view.mjs",
      "src/frontend/desktop/ui/project-doctor.mjs",
      "src/contracts/backend.mjs",
      "src/execution/browser/chatgpt-search-extension.mjs",
      "src/execution/browser/search-extension-pin.mjs",
      "tests/chatgpt-search-extension.test.mjs",
      "src/backend/main.mjs",
      "scripts/check-search-extension.mjs",
      "tests/fixtures/search-extension-electron.cjs",
      "src/frontend/desktop/bootstrap.mjs",
      "tests/product-identity.test.mjs"
    ],
    "documentation_paths": [
      "docs/planning/chat-only-url-start.md",
      "docs/planning/chat-only-url-lifecycle.md",
      "docs/planning/chat-only-url-acceptance.md",
      "docs/architecture/OVERVIEW.md",
      "docs/modules/release.md",
      "README.md",
      "docs/modules/browser.md",
      "docs/modules/orchestrator-startup.md",
      "docs/modules/chatgpt-plugin.md",
      "docs/modules/project-lifecycle.md",
      "docs/modules/desktop.md",
      "docs/modules/first-run-onboarding.md",
      "docs/modules/control.md",
      "docs/acceptance/chat-only-startup.md",
      "docs/modules/chat-only-startup.md",
      "docs/planning/chatgpt-search-extension.md"
    ]
  },
  "baseline_commit": "df015ce35abff912a444c967639adfff667abeda",
  "current_task_id": null,
  "context_pack": {
    "documents": [
      {
        "path": "docs/planning/chat-only-url-lifecycle.md",
        "required": false,
        "revision": "9f52057e96d09c738ba75cff82803f4d9544207d"
      },
      {
        "path": "docs/planning/chat-only-url-acceptance.md",
        "required": false,
        "revision": "9f52057e96d09c738ba75cff82803f4d9544207d"
      },
      {
        "path": "docs/architecture/OVERVIEW.md",
        "required": true,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/modules/browser.md",
        "required": false,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/modules/orchestrator-startup.md",
        "required": false,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/modules/chatgpt-plugin.md",
        "required": false,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/modules/project-lifecycle.md",
        "required": false,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/modules/user-choice.md",
        "required": false,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/modules/release.md",
        "required": false,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/planning/chat-only-url-start.md",
        "required": false,
        "revision": "9f52057e96d09c738ba75cff82803f4d9544207d"
      },
      {
        "path": "docs/modules/chat-only-startup.md",
        "required": true,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/planning/chatgpt-search-extension.md",
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
        "scope_id": "chat-only-url-bootstrap",
        "task_id": "T001",
        "role": "implementation"
      },
      "dependencies": [],
      "functional_paths": [
        "src/control/sessions/workspace-session.mjs",
        "src/control/sessions/service.mjs",
        "src/control/projects/workspace-setup.mjs",
        "src/control/facade.mjs",
        "src/control/workflow/executor-session.mjs",
        "src/control/workflow/project-session-plan-continuation.mjs",
        "src/control/plugin/enrollment.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/backend/desktop-model.mjs",
        "src/contracts/browser.mjs",
        "tests/workspace-session.test.mjs",
        "tests/session-roles.test.mjs",
        "tests/backend-desktop-model.test.mjs",
        "tests/plugin-enrollment.test.mjs",
        "tests/automatic-agent-dialogue.test.mjs",
        "src/backend/operations.mjs",
        "src/backend/bootstrap.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/parallel-execution.mjs",
        "src/control/workflow/execution-control.mjs",
        "tests/backend-api.test.mjs",
        "tests/control-facade.test.mjs",
        "tests/migration-compatibility.test.mjs",
        "tests/parallel-execution.test.mjs",
        "tests/parallel-execution-ui.test.mjs",
        "tests/context-session.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/backend-upgrade.test.mjs",
        "tests/chatgpt-plugin.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "architecture"
      ],
      "id": "T001",
      "title": "Упразднить активные Work-сессии и мигрировать историю",
      "why": "Единый допуск Chat-only должен действовать до запуска страниц и MCP.",
      "acceptance_criteria": [
        "Новые сессии только chat; явный work отклонён во всех backend-входах без побочных действий.",
        "Миграция атомарна и идемпотентна: legacy-work/mode-unverified сохранены как история, не получают runtime/контекст/сообщения.",
        "Зависимый проект удержан до восстановления; назначения/worktrees/results не потеряны, чужие проекты и ручной OFF сохранены.",
        "Изолированный backend upgrade v6→v7 сохраняет точный v6-backup для отката, исходные identity и настройки; чужой lock по-прежнему блокирует второй backend.",
        "Интеграционный тест реальной проекции origin использует Chat и сохраняет проверку владения до и после публикации плана."
      ],
      "expected_commit_message": "feat: Упразднить активные Work-сессии и мигрировать историю",
      "parallel_safe": false,
      "task_brief": "Выполнить Chat-only и миграцию по основной spec. Проверить реальные входы первой/новой/внешней сессии, reopen/restore и startup admission. Не стирать Work и не переименовывать его в Chat; не менять режимы исполнения Kit. Добавить fixtures миграции старых схем и restart. UI обрабатывается T005; существующие проверки адаптировать к новым отказам. Backend operations/bootstrap и workflow coordination/execution вызывают единый admission до открытия runtime, grant, dispatch и интеграции. Адаптировать все перечисленные Work-тесты к историческому чтению/отказу; не отключать assertions. Текущая схема v6, новая v7; проверить старый v3, уже мигрированный chat v4–v6 и null chatUrl.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/chat-only-url-start.md",
            "required": true,
            "revision": "9f52057e96d09c738ba75cff82803f4d9544207d"
          },
          {
            "path": "docs/planning/chat-only-url-lifecycle.md",
            "required": true,
            "revision": "9f52057e96d09c738ba75cff82803f4d9544207d"
          },
          {
            "path": "docs/planning/chat-only-url-acceptance.md",
            "required": true,
            "revision": "9f52057e96d09c738ba75cff82803f4d9544207d"
          },
          {
            "path": "docs/architecture/OVERVIEW.md",
            "required": false
          },
          {
            "path": "docs/modules/browser.md",
            "required": false
          },
          {
            "path": "docs/modules/orchestrator-startup.md",
            "required": false
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "actual_files": [
        "src/backend/bootstrap.mjs",
        "src/backend/operations.mjs",
        "src/control/facade.mjs",
        "src/control/plugin/enrollment.mjs",
        "src/control/sessions/service.mjs",
        "src/control/sessions/workspace-session.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/executor-session.mjs",
        "src/control/workflow/project-session-plan-continuation.mjs",
        "tests/automatic-agent-dialogue.test.mjs",
        "tests/backend-api.test.mjs",
        "tests/backend-upgrade.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/control-facade.test.mjs",
        "tests/migration-compatibility.test.mjs",
        "tests/parallel-execution.test.mjs",
        "tests/plugin-enrollment.test.mjs",
        "tests/session-roles.test.mjs",
        "tests/workspace-session.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "chat-only-url-bootstrap",
        "task_id": "T002",
        "role": "implementation"
      },
      "dependencies": [
        "T001"
      ],
      "functional_paths": [
        "src/execution/browser/session-runtime.mjs",
        "src/execution/browser/browser-startup.mjs",
        "src/execution/browser/chatgpt-experience.mjs",
        "src/execution/browser/diagnostics.mjs",
        "src/execution/facade.mjs",
        "src/contracts/browser.mjs",
        "tests/session-runtime.test.mjs",
        "tests/browser-startup.test.mjs",
        "tests/chromium-diagnostics.test.mjs",
        "tests/backend-browser-lifecycle.test.mjs",
        "tests/chatgpt-experience.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "startup-recovery",
        "architecture",
        "unit-all"
      ],
      "id": "T002",
      "title": "Расширить навигационный порт и защитить обновление от повторного q",
      "why": "Control нужны фактические переходы, а безопасный reload не должен знать attempt.",
      "acceptance_criteria": [
        "Один порт сообщает url/isMainFrame/kind/sequence для in-page, полной навигации и redirect; iframe/late/release не подтверждают адрес.",
        "Crash и ручное refresh/reload с q открывают чистый entrypoint независимо от control-state; первоначальный dispatch не блокируется этой защитой.",
        "Секреты q отсутствуют в диагностике и ошибках; Execution не импортирует control/store."
      ],
      "expected_commit_message": "feat: Расширить навигационный порт и защитить обновление от повторного q",
      "parallel_safe": false,
      "task_brief": "Расширить существующий порт, не второй механизм binding. Сверить сигнатуры Electron; сохранить epoch/dispose. Проверять current и refresh target URL, включая пустое q. Fixtures проверяют промежуточный redirect, sequence, crash до удаления q, отсутствие повторной команды и редактирование safeUrl.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/chat-only-url-start.md",
            "required": true,
            "revision": "9f52057e96d09c738ba75cff82803f4d9544207d"
          },
          {
            "path": "docs/planning/chat-only-url-lifecycle.md",
            "required": true,
            "revision": "9f52057e96d09c738ba75cff82803f4d9544207d"
          },
          {
            "path": "docs/planning/chat-only-url-acceptance.md",
            "required": true,
            "revision": "9f52057e96d09c738ba75cff82803f4d9544207d"
          },
          {
            "path": "docs/architecture/OVERVIEW.md",
            "required": false
          },
          {
            "path": "docs/modules/browser.md",
            "required": false
          },
          {
            "path": "docs/modules/orchestrator-startup.md",
            "required": false
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": [
          "T001"
        ]
      },
      "actual_files": [
        "src/execution/browser/chatgpt-experience.mjs",
        "src/execution/browser/session-runtime.mjs",
        "tests/session-runtime.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "chat-only-url-bootstrap",
        "task_id": "T003",
        "role": "implementation"
      },
      "dependencies": [
        "T002"
      ],
      "functional_paths": [
        "src/control/plugin/enrollment.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/startup-context.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/control/plugin/service.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/execution/plugin/communication-store.mjs",
        "src/contracts/plugin-communication.mjs",
        "tests/plugin-enrollment.test.mjs",
        "tests/plugin-communication-store.test.mjs",
        "tests/startup-context.test.mjs",
        "tests/dialogue-delivery.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "orchestrator-startup",
        "unit-all"
      ],
      "id": "T003",
      "title": "Добавить долговечный отзыв приглашения и отмену startup",
      "why": "Отмена без отзыва допускает позднюю регистрацию и блокировку следующей попытки.",
      "acceptance_criteria": [
        "Корреляция request/attempt/ticket_hash сохранена; revoke идемпотентен в WAL и проверяется до возврата existing participant.",
        "Оба порядка enroll/revoke и read/cancel дают определённый результат; revoked не оживает через stage/resume или restart.",
        "После выигрыша enroll участник не удалён; отменённый контекст недоступен, BINDING не обходится. Ошибка WAL не выдаёт успешную отмену.",
        "Старые model-pull/SDK пакеты сохраняют контракт; raw ticket не добавлен в WAL."
      ],
      "expected_commit_message": "feat: Добавить долговечный отзыв приглашения и отмену startup",
      "parallel_safe": false,
      "task_brief": "Реализовать narrow backend revoke без удаления сессии, корреляцию reserve и атомарные guards. Проверить cancellation admission всех read/ack/claim путей, race и crash между stores. Доотменные чтения не скрывать. Не открывать модели инструмент произвольного отзыва чужого тикета.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/chat-only-url-start.md",
            "required": false,
            "revision": "9f52057e96d09c738ba75cff82803f4d9544207d"
          },
          {
            "path": "docs/planning/chat-only-url-lifecycle.md",
            "required": true,
            "revision": "9f52057e96d09c738ba75cff82803f4d9544207d"
          },
          {
            "path": "docs/planning/chat-only-url-acceptance.md",
            "required": false,
            "revision": "9f52057e96d09c738ba75cff82803f4d9544207d"
          },
          {
            "path": "docs/architecture/OVERVIEW.md",
            "required": true
          },
          {
            "path": "docs/modules/browser.md",
            "required": false
          },
          {
            "path": "docs/modules/orchestrator-startup.md",
            "required": false
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": [
          "T002"
        ]
      },
      "actual_files": [
        "src/control/plugin/communication.mjs",
        "src/control/plugin/enrollment.mjs",
        "src/control/plugin/service.mjs",
        "src/control/plugin/startup-context.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "tests/dialogue-delivery.test.mjs",
        "tests/plugin-enrollment.test.mjs",
        "tests/startup-context.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "chat-only-url-bootstrap",
        "task_id": "T004",
        "role": "implementation"
      },
      "dependencies": [
        "T003"
      ],
      "functional_paths": [
        "src/control/context/context-session.mjs",
        "src/control/context/service.mjs",
        "src/control/sessions/service.mjs",
        "src/control/sessions/conversation-recovery.mjs",
        "src/control/sessions/workspace-session.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/control/workflow/executor-session.mjs",
        "src/execution/browser/session-runtime.mjs",
        "src/execution/browser/chatgpt-composer.mjs",
        "src/backend/desktop-model.mjs",
        "src/contracts/context.mjs",
        "tests/context-session.test.mjs",
        "tests/dialogue-delivery.test.mjs",
        "tests/executor-startup-lifecycle.test.mjs",
        "tests/backend-desktop-model.test.mjs",
        "tests/chatgpt-composer.test.mjs",
        "tests/chatgpt-experience.test.mjs",
        "tests/desktop-boundaries.test.mjs",
        "src/control/projects/service.mjs",
        "src/backend/bootstrap.mjs",
        "src/execution/files/adapter.mjs",
        "tests/workspace-session.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/fixtures/executor-background-startup.mjs",
        "tests/automatic-agent-dialogue.test.mjs",
        "tests/executor-background-startup.test.mjs",
        "tests/files-adapter.test.mjs",
        "src/execution/facade.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/startup-context.mjs",
        "tests/startup-context.test.mjs",
        "src/control/workflow/coordination.mjs",
        "tests/session-runtime.test.mjs",
        "tests/session-opening-performance.test.mjs",
        "tests/parallel-execution.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "startup-recovery",
        "orchestrator-startup",
        "architecture",
        "unit-all"
      ],
      "id": "T004",
      "title": "Запускать новый Chat через q с подтверждением sent по тикету",
      "why": "Заменить DOM-ввод без потери подтверждений, корреляции и защиты от повторов.",
      "acceptance_criteria": [
        "Preflight на корне без q проверяет свежий documentId, signed-in и пустой draft; state старого разговора не используется.",
        "Контекст/attempt сохранены до одного dispatch. Собственная navigation-start не отменяет dispatch и не создаёт вторую попытку.",
        "sent подтверждает только текущий enrollmentRef; оба порядка URL/регистрации показываются независимо, без вечного send-unknown.",
        "Work redirect, чужая навигация, отмена/ошибка/restart не привязывают чужой URL и не повторяют q; legacy sent/unknown не конвертируются.",
        "Контекст, O/E/S, SHA, пользовательский Start и дальнейший SDK-путь не ослаблены.",
        "Навигационные события и регистрация обновляют текущую попытку атомарным patch с проверкой request/generation; старое событие не затирает sent и не возрождает отмену.",
        "Перед первой выдачей контекста подтверждены свежие Chat/signed-in после q; unknown/Work не дают контекст. Fake-host fixtures используют URL и настоящий тикет текущей попытки без модели."
      ],
      "expected_commit_message": "feat: Запускать новый Chat через q с подтверждением sent по тикету",
      "parallel_safe": false,
      "task_brief": "Интегрировать runtime T002 и revoke T003 через существующий ContextSession, не параллельный scheduler. Полный bootstrap только в panel/MCP; q содержит точный короткий текст spec. Не удалять общие DOM наблюдатели или composer API. Адрес потерян/неоднозначен — явный pending/conflict, а не догадка.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/chat-only-url-start.md",
            "required": false,
            "revision": "9f52057e96d09c738ba75cff82803f4d9544207d"
          },
          {
            "path": "docs/planning/chat-only-url-lifecycle.md",
            "required": true,
            "revision": "9f52057e96d09c738ba75cff82803f4d9544207d"
          },
          {
            "path": "docs/planning/chat-only-url-acceptance.md",
            "required": false,
            "revision": "9f52057e96d09c738ba75cff82803f4d9544207d"
          },
          {
            "path": "docs/architecture/OVERVIEW.md",
            "required": true
          },
          {
            "path": "docs/modules/browser.md",
            "required": false
          },
          {
            "path": "docs/modules/orchestrator-startup.md",
            "required": false
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": [
          "T003"
        ]
      },
      "actual_files": [
        "src/backend/bootstrap.mjs",
        "src/backend/desktop-model.mjs",
        "src/control/context/context-session.mjs",
        "src/control/context/service.mjs",
        "src/control/projects/service.mjs",
        "src/control/sessions/service.mjs",
        "src/control/sessions/workspace-session.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/control/workflow/executor-session.mjs",
        "src/execution/browser/chatgpt-composer.mjs",
        "src/execution/facade.mjs",
        "src/execution/files/adapter.mjs",
        "tests/context-session.test.mjs",
        "tests/files-adapter.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/fixtures/executor-background-startup.mjs",
        "tests/parallel-execution.test.mjs",
        "tests/session-opening-performance.test.mjs",
        "tests/workspace-session.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "chat-only-url-bootstrap",
        "task_id": "T005",
        "role": "implementation"
      },
      "dependencies": [
        "T004"
      ],
      "functional_paths": [
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/frontend/desktop/ui/workspace-setup.mjs",
        "src/frontend/desktop/ui/index.html",
        "src/frontend/desktop/ui/archive.mjs",
        "src/frontend/desktop/ui/archive.html",
        "src/frontend/desktop/client.mjs",
        "src/backend/desktop-model.mjs",
        "src/frontend/plugin/panel.mjs",
        "src/frontend/plugin/launch.mjs",
        "tools/codex-app-server-mcp/plugin.py",
        "tests/sidebar.test.mjs",
        "tests/startup-ui.test.mjs",
        "tests/progress.test.mjs",
        "tests/desktop-client.test.mjs",
        "tests/backend-desktop-model.test.mjs",
        "src/frontend/desktop/preload.cjs",
        "src/contracts/desktop.mjs",
        "tests/project-doctor-ui.test.mjs",
        "src/contracts/startup-view.mjs",
        "src/backend/bootstrap.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/control/plugin/communication.mjs",
        "src/frontend/desktop/ui/project-doctor.mjs",
        "tests/backend-browser-lifecycle.test.mjs",
        "src/control/context/context-session.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "startup-recovery",
        "unit-all"
      ],
      "id": "T005",
      "title": "Убрать Work из интерфейса и показать независимые этапы старта",
      "why": "Пользователь должен видеть только поддерживаемый Chat и точное состояние запуска.",
      "acceptance_criteria": [
        "Первый проект, меню, doctor, archive и ошибки не предлагают новый Work; история обозначает неподдерживаемый режим без запуска.",
        "URL pending, sent по регистрации, context reading/complete, cancellation pending и конфликт адреса различимы в Desktop/HTTP/панели.",
        "Нет ручного копирования ID/Enable, скрытого fallback или кнопки автоматического запуска плана."
      ],
      "expected_commit_message": "feat: Убрать Work из интерфейса и показать независимые этапы старта",
      "parallel_safe": false,
      "task_brief": "Сохранить общий backend контракт и доступность/тему UI. Удалить активные элементы Work, не следы исторических данных. Проверить реальные action handlers, а не только строковые снимки. MCP descriptions обновлять только если они обещают удалённый сценарий. IPC/preload allowlist сверить явно: совместимые каналы допустимо сохранить, но они не обходят отказ work на backend; UI больше не предлагает Work.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/chat-only-url-start.md",
            "required": false,
            "revision": "9f52057e96d09c738ba75cff82803f4d9544207d"
          },
          {
            "path": "docs/planning/chat-only-url-lifecycle.md",
            "required": true,
            "revision": "9f52057e96d09c738ba75cff82803f4d9544207d"
          },
          {
            "path": "docs/planning/chat-only-url-acceptance.md",
            "required": false,
            "revision": "9f52057e96d09c738ba75cff82803f4d9544207d"
          },
          {
            "path": "docs/architecture/OVERVIEW.md",
            "required": true
          },
          {
            "path": "docs/modules/browser.md",
            "required": false
          },
          {
            "path": "docs/modules/orchestrator-startup.md",
            "required": false
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": [
          "T004"
        ]
      },
      "actual_files": [
        "src/backend/bootstrap.mjs",
        "src/backend/desktop-model.mjs",
        "src/contracts/startup-view.mjs",
        "src/control/context/context-session.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/frontend/desktop/ui/archive.mjs",
        "src/frontend/desktop/ui/index.html",
        "src/frontend/desktop/ui/project-doctor.mjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/frontend/desktop/ui/workspace-setup.mjs",
        "src/frontend/plugin/panel.mjs",
        "tests/backend-browser-lifecycle.test.mjs",
        "tests/backend-desktop-model.test.mjs",
        "tests/project-doctor-ui.test.mjs",
        "tests/sidebar.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "chat-only-url-bootstrap",
        "task_id": "T006",
        "role": "implementation"
      },
      "dependencies": [
        "T005"
      ],
      "functional_paths": [
        "tests/electron-smoke.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/fixtures/executor-background-startup.mjs",
        "tests/fixtures/dialogue-runtime.mjs",
        "tests/fixtures/plugin-host.mjs",
        "tests/fixtures/backend-browser-viewer.mjs",
        "tests/fixtures/backend-browser-client.mjs",
        "tests/fixtures/backend-browser-viewer.html",
        "tests/fixtures/backend-browser-viewer-preload.cjs",
        "tests/fixtures/backend-browser-page.html",
        "tests/fixtures/backend-browser-probe.mjs",
        "tests/automatic-agent-dialogue.test.mjs",
        "tests/executor-background-startup.test.mjs",
        "tests/executor-startup-lifecycle.test.mjs",
        "tests/session-runtime.test.mjs",
        "tests/plugin-enrollment.test.mjs",
        "tests/startup-context.test.mjs",
        "tests/backend-desktop-model.test.mjs",
        "scripts/stage-page-observer.mjs",
        "scripts/stage-chatgpt-plugin.mjs",
        "tools/codex-app-server-mcp/plugin.py",
        "src/control/context/context-session.mjs",
        "src/contracts/startup-view.mjs",
        "tests/context-session.test.mjs",
        "src/control/sessions/service.mjs",
        "src/frontend/desktop/ui/sidebar.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "electron-smoke",
        "unit-all",
        "architecture"
      ],
      "id": "T006",
      "title": "Проверить Chat-only bootstrap сквозными fixtures и обновить smoke",
      "why": "Нужна проверка пользовательского входа и настоящей навигации Electron.",
      "acceptance_criteria": [
        "Изолированный Electron smoke проходит first-project/newChat, один dispatch и все этапы регистрации/адреса/контекста без настоящей модели.",
        "Проверены 2 сессии, restart, revoke/enroll в обоих порядках, foreign navigation, Work redirect, draft/login и q reload.",
        "Устаревшие assertions вложений/Work заменены контрактными тестами без снижения гарантий. Live ChatGPT остаётся NOT_RUN до свидетельства пользователя.",
        "Остановка backend блокирует q между подготовкой и dispatch; возобновление не повторяет попытку.",
        "Собственное ручное первое сообщение сохраняет manualStart до постоянного адреса; pending/restart не запускают автоматическую панель и не открывают корень повторно."
      ],
      "expected_commit_message": "feat: Проверить Chat-only bootstrap сквозными fixtures и обновить smoke",
      "parallel_safe": false,
      "task_brief": "Обновить существующий smoke для model-pull/URL. Только временные fixtures и локальный fake-host, без рабочих профилей и команд модели. Не исправлять посторонние проблемы скрыто; относящиеся регрессии исправлять в пределах scope через штатное уточнение задачи. Сохранить различие fake-host и реального q.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/chat-only-url-start.md",
            "required": false,
            "revision": "9f52057e96d09c738ba75cff82803f4d9544207d"
          },
          {
            "path": "docs/planning/chat-only-url-lifecycle.md",
            "required": true,
            "revision": "9f52057e96d09c738ba75cff82803f4d9544207d"
          },
          {
            "path": "docs/planning/chat-only-url-acceptance.md",
            "required": false,
            "revision": "9f52057e96d09c738ba75cff82803f4d9544207d"
          },
          {
            "path": "docs/architecture/OVERVIEW.md",
            "required": true
          },
          {
            "path": "docs/modules/browser.md",
            "required": false
          },
          {
            "path": "docs/modules/orchestrator-startup.md",
            "required": false
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": [
          "T005"
        ]
      },
      "actual_files": [
        "src/contracts/startup-view.mjs",
        "src/control/context/context-session.mjs",
        "src/control/sessions/service.mjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "tests/context-session.test.mjs",
        "tests/electron-smoke.mjs",
        "tests/session-runtime.test.mjs",
        "tools/codex-app-server-mcp/plugin.py"
      ]
    },
    {
      "id": "VERSION",
      "title": "Подготовить версию 0.5.31 для единого выпуска",
      "why": "Версия и lock должны быть закоммичены до DOCS и production build из одного sourceCommit.",
      "dependencies": [
        "T006"
      ],
      "functional_paths": [
        "package.json",
        "package-lock.json",
        "src/contracts/backend.mjs"
      ],
      "documentation_paths": [
        "docs/planning/chat-only-url-start.md"
      ],
      "verification_ids": [
        "chatgpt-plugin",
        "release-tooling"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Версия 0.5.31 согласована в package и lock; штатный staging панели и выпускные fixtures проходят."
      ],
      "expected_commit_message": "chore: подготовить Workflow Pilot 0.5.31",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "chat-only-url-bootstrap",
        "task_id": "VERSION",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "package-lock.json",
        "package.json",
        "src/contracts/backend.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "chat-only-url-bootstrap",
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
        "VERSION"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/planning/chat-only-url-start.md",
        "docs/planning/chat-only-url-lifecycle.md",
        "docs/planning/chat-only-url-acceptance.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/release.md",
        "README.md",
        "docs/modules/browser.md",
        "docs/modules/orchestrator-startup.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/project-lifecycle.md",
        "docs/modules/desktop.md",
        "docs/modules/first-run-onboarding.md",
        "docs/modules/control.md",
        "docs/acceptance/chat-only-startup.md",
        "docs/modules/chat-only-startup.md"
      ],
      "verification_ids": [],
      "id": "DOCS",
      "title": "Актуализация всех документов проекта",
      "why": "Зафиксировать фактический невыпущенный результат и условия внешней приёмки.",
      "acceptance_criteria": [
        "Действующие документы согласованы с фактической реализацией Chat-only и версией 0.5.31; устаревшие обещания Work удалены.",
        "Живые ChatGPT/native проверки честно NOT_RUN; новое прямое поручение пользователя разрешает выпуск с явно указанными ограничениями, не означает внешнюю приёмку.",
        "Все документы <=28000 байт UTF-8; удаленные required specs читаются по точным Git blob refs."
      ],
      "expected_commit_message": "docs: уточнить результат Chat-only и условия приёмки URL-старта",
      "parallel_safe": false,
      "task_brief": "Сверить реализацию и проверки всех задач, подготовить действующие README/module contracts и условия приёмки к выпуску 0.5.31. Перенести реализованные временные specs в контракты и удалить их только после переноса; невыполненную живую приёмку сохранить отдельным acceptance-документом. Публикацию и установку выполняют следующие delivery-задачи по новому поручению пользователя.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/chat-only-url-start.md",
            "required": false,
            "revision": "9f52057e96d09c738ba75cff82803f4d9544207d"
          },
          {
            "path": "docs/planning/chat-only-url-lifecycle.md",
            "required": false,
            "revision": "9f52057e96d09c738ba75cff82803f4d9544207d"
          },
          {
            "path": "docs/planning/chat-only-url-acceptance.md",
            "required": false,
            "revision": "9f52057e96d09c738ba75cff82803f4d9544207d"
          },
          {
            "path": "docs/modules/chat-only-startup.md",
            "required": true
          }
        ],
        "include_last_completed_task": true,
        "dependency_task_ids": [
          "T006"
        ]
      },
      "actual_files": [
        "README.md",
        "docs/acceptance/chat-only-startup.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/browser.md",
        "docs/modules/chat-only-startup.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/control.md",
        "docs/modules/desktop.md",
        "docs/modules/first-run-onboarding.md",
        "docs/modules/orchestrator-startup.md",
        "docs/modules/project-lifecycle.md",
        "docs/modules/release.md",
        "docs/planning/chat-only-url-acceptance.md",
        "docs/planning/chat-only-url-lifecycle.md",
        "docs/planning/chat-only-url-start.md"
      ]
    },
    {
      "id": "RELEASE",
      "title": "Собрать и проверить единый выпуск Chat-only для macOS Windows Linux",
      "why": "Пользователь прямо поручил выполнить весь план и выпустить все поддерживаемые ОС без промежуточных остановок.",
      "dependencies": [
        "DOCS"
      ],
      "functional_paths": [
        "package.json",
        "package-lock.json",
        "release-manifest.json",
        "scripts/release-all.mjs",
        "scripts/release-package.mjs"
      ],
      "documentation_paths": [
        "docs/modules/release.md"
      ],
      "verification_ids": [
        "three-platform-release",
        "kit-check",
        "kit-assignments"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "Версия повышена, macOS arm64 Windows x64 Linux x64 собраны из одного sourceCommit и весь комплект сверён штатным скриптом.",
        "Живые ChatGPT и native Windows/Linux остаются честно NOT_RUN; прямое новое поручение пользователя разрешает поставку с явно указанными ограничениями, без объявления внешней приёмки PASS."
      ],
      "expected_commit_message": "feat: Собрать и проверить единый выпуск Chat-only для macOS Windows Linux",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "chat-only-url-bootstrap",
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
      "title": "Обновить собственную установленную копию готовым macOS bundle",
      "why": "Обновить собственную установленную копию готовым macOS bundle",
      "dependencies": [
        "RELEASE",
        "DOCS"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/modules/release.md"
      ],
      "verification_ids": [
        "release-installed"
      ],
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Штатный installer проверил установленную либо pending копию и rollback; backend не остановлен, приложение не перезапущено."
      ],
      "expected_commit_message": "feat: Обновить собственную установленную копию готовым macOS bundle",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "chat-only-url-bootstrap",
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
        "docs/modules/release.md"
      ],
      "verification_ids": [
        "github-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "main отправлен fast-forward в собственный origin, тег ссылается на sourceCommit; опубликованы семь проверенных assets с совпадающими digest.",
        "Описание выпуска явно содержит непроведённую живую приёмку ChatGPT и native Windows/Linux."
      ],
      "expected_commit_message": "feat: Опубликовать полный выпуск на GitHub",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "chat-only-url-bootstrap",
        "task_id": "PUBLISH",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": []
    },
    {
      "id": "EXT01",
      "title": "Автоматически загружать и атомарно устанавливать официальное расширение",
      "why": "Автоматически загружать и атомарно устанавливать официальное расширение",
      "dependencies": [],
      "functional_paths": [
        "src/execution/browser/chatgpt-search-extension.mjs",
        "src/execution/browser/search-extension-pin.mjs",
        "tests/chatgpt-search-extension.test.mjs",
        "package.json",
        "package-lock.json"
      ],
      "documentation_paths": [
        "docs/planning/chatgpt-search-extension.md"
      ],
      "verification_ids": [
        "search-extension-unit",
        "architecture"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Закреплённый официальный CRX проверяется до безопасной распаковки; полный кэш проверяется перед загрузкой, offline/concurrency/retry и повреждение покрыты."
      ],
      "expected_commit_message": "feat: Автоматически загружать и атомарно устанавливать официальное расширение",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "chat-only-url-bootstrap",
        "task_id": "EXT01",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "docs/planning/chatgpt-search-extension.md",
        "src/execution/browser/chatgpt-search-extension.mjs",
        "src/execution/browser/search-extension-pin.mjs",
        "tests/chatgpt-search-extension.test.mjs",
        "package.json",
        "package-lock.json"
      ]
    },
    {
      "id": "EXT02",
      "title": "Подключать расширение перед навигацией ChatGPT в браузерной сессии",
      "why": "Подключать расширение перед навигацией ChatGPT в браузерной сессии",
      "dependencies": [
        "EXT01"
      ],
      "functional_paths": [
        "src/backend/main.mjs",
        "src/backend/desktop-model.mjs",
        "src/execution/browser/session-runtime.mjs",
        "src/execution/facade.mjs",
        "tests/session-runtime.test.mjs",
        "tests/backend-browser-lifecycle.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/chatgpt-search-extension.md"
      ],
      "verification_ids": [
        "search-extension-startup",
        "architecture"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Persistent session получает расширение до первой страницы; после ожидания сохраняется адресность/cancel/release, q не отправляется раньше готовности."
      ],
      "expected_commit_message": "feat: Подключать расширение перед навигацией ChatGPT в браузерной сессии",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "chat-only-url-bootstrap",
        "task_id": "EXT02",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "src/backend/desktop-model.mjs",
        "src/backend/main.mjs",
        "src/execution/browser/session-runtime.mjs",
        "src/execution/facade.mjs",
        "tests/session-runtime.test.mjs"
      ]
    },
    {
      "id": "EXT03",
      "title": "Проверить настоящий Electron и регрессии запуска с расширением",
      "why": "Проверить настоящий Electron и регрессии запуска с расширением",
      "dependencies": [
        "EXT02"
      ],
      "functional_paths": [
        "scripts/check-search-extension.mjs",
        "tests/fixtures/search-extension-electron.cjs",
        "tests/electron-smoke.mjs",
        "src/frontend/desktop/bootstrap.mjs",
        "tests/product-identity.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/chatgpt-search-extension.md"
      ],
      "verification_ids": [
        "search-extension-native",
        "unit-all",
        "electron-smoke",
        "architecture"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Cold install официального расширения и offline restart проходят на local HTTPS; q обрабатывается один раз с marker. Полные suites не ослаблены; реальный ChatGPT/native Windows/Linux отмечены отдельно."
      ],
      "expected_commit_message": "feat: Проверить настоящий Electron и регрессии запуска с расширением",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "chat-only-url-bootstrap",
        "task_id": "EXT03",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "scripts/check-search-extension.mjs",
        "src/frontend/desktop/bootstrap.mjs",
        "tests/electron-smoke.mjs",
        "tests/fixtures/search-extension-electron.cjs",
        "tests/product-identity.test.mjs"
      ]
    },
    {
      "id": "VERSION-2",
      "title": "Подготовить версию 0.5.32",
      "why": "Подготовить версию 0.5.32",
      "dependencies": [
        "EXT03"
      ],
      "functional_paths": [
        "package.json",
        "package-lock.json",
        "src/backend/desktop-model.mjs"
      ],
      "documentation_paths": [
        "docs/planning/chatgpt-search-extension.md"
      ],
      "verification_ids": [
        "chatgpt-plugin",
        "release-tooling"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Версия приложения, backend и staged панели 0.5.32; Kit и протокол не изменены."
      ],
      "expected_commit_message": "feat: Подготовить версию 0.5.32",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "chat-only-url-bootstrap",
        "task_id": "VERSION-2",
        "role": "implementation"
      },
      "parallel_safe": false
    },
    {
      "id": "DOCS-2",
      "title": "Актуализация всех документов проекта",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "chat-only-url-bootstrap",
        "task_id": "DOCS-2",
        "role": "implementation",
        "iteration": 2
      },
      "why": "Перед выпуском сверить README, OVERVIEW и действующие контракты модулей с результатом; обновить устаревшее.",
      "dependencies": [
        "EXT01",
        "EXT02",
        "EXT03",
        "VERSION-2"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/architecture/OVERVIEW.md",
        "docs/planning/chatgpt-search-extension.md",
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
      "id": "RELEASE-2",
      "title": "Собрать проверенный выпуск 0.5.32 для трёх ОС",
      "why": "Собрать проверенный выпуск 0.5.32 для трёх ОС",
      "dependencies": [
        "VERSION-2",
        "DOCS-2"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/chatgpt-search-extension.md"
      ],
      "verification_ids": [
        "kit-check",
        "kit-assignments",
        "three-platform-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "DOCS своего раунда завершён; три проверенных пакета одного sourceCommit, pinned downloader включён в каждый."
      ],
      "expected_commit_message": "feat: Собрать проверенный выпуск 0.5.32 для трёх ОС",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "chat-only-url-bootstrap",
        "task_id": "RELEASE-2",
        "role": "implementation"
      },
      "parallel_safe": false
    },
    {
      "id": "INSTALL-2",
      "title": "Обновить собственные macOS-копии выпуском 0.5.32",
      "why": "Обновить собственные macOS-копии выпуском 0.5.32",
      "dependencies": [
        "RELEASE-2",
        "DOCS-2"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/chatgpt-search-extension.md",
        "docs/modules/release.md"
      ],
      "verification_ids": [
        "release-installed"
      ],
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Штатная установка готового bundle либо подтверждённый pending, без пересборки/перезапуска/остановки backend."
      ],
      "expected_commit_message": "feat: Обновить собственные macOS-копии выпуском 0.5.32",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "chat-only-url-bootstrap",
        "task_id": "INSTALL-2",
        "role": "implementation"
      },
      "parallel_safe": false
    },
    {
      "id": "PUBLISH-2",
      "title": "Опубликовать выпуск 0.5.32 на GitHub",
      "why": "Опубликовать выпуск 0.5.32 на GitHub",
      "dependencies": [
        "INSTALL-2",
        "DOCS-2"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/chatgpt-search-extension.md",
        "docs/modules/release.md"
      ],
      "verification_ids": [
        "github-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "Семь assets GitHub совпадают по размеру и SHA, тег sourceCommit, main совпадает с HEAD, ограничения приёмки указаны."
      ],
      "expected_commit_message": "feat: Опубликовать выпуск 0.5.32 на GitHub",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "chat-only-url-bootstrap",
        "task_id": "PUBLISH-2",
        "role": "implementation"
      },
      "parallel_safe": false
    }
  ],
  "blocked_reason": null,
  "user_decisions": [
    {
      "id": "0c766f16-9532-47c6-af3c-995fb357fcd0",
      "text": "Пользователь 24.10.2026 поручил подготовить спецификацию и to-do план по согласованному документу, провести все раунды Claude Review и опубликовать план. Выполнение задач и выпуск приложения сейчас не поручены.",
      "recorded_at": "2026-10-24T14:05:42.485Z"
    },
    "24.10.2026 пользователь прямо поручил выполнить весь план непрерывно, собрать все поддерживаемые ОС, штатно обновить собственную macOS-копию и опубликовать GitHub Release. Выпуск с честными NOT_RUN разрешён новым поручением; живой интерфейс проверяет пользователь."
  ],
  "parallel_allowed": false,
  "max_workers": 1,
  "execution_strategy": "sequential",
  "execution_reason": "Внешний CLI-план без Workflow Pilot session origin. Шаги последовательно меняют общий session store, admission, runtime и ContextSession; последовательная интеграция снижает риск конфликтующих контрактов. Публикация не запускает работу."
}
```
<!-- workflow-state:end -->

## Состояние

Execution Scope Status: ACTIVE
Delivery Status: IN_PROGRESS
Scope: chat-only-url-bootstrap
Current Task: нет
Revision: 1035

## Цель

Оставить только Chat-сессии и заменить DOM-ввод первого сообщения одним URL-bootstrap с тикетом, сохранив идентичность, отмену и получение контекста.

## Критерии приёмки

- Work упразднён; история сохранена без исполнения и потери назначений.
- Один q-bootstrap после preflight; sent только по текущему тикету; адрес и startup ack независимы.
- Долговечный revoke/cancel и runtime no-q-reload выдерживают гонки/рестарты без подмены identity.
- Изолированные suites и Electron smoke пройдены; непроведённая живая приёмка явно отражена в документах и выпуске согласно новому поручению пользователя.

## Микрозадачи

Выполнение: sequential; разрешено: false; лимит: 1
Причина: Внешний CLI-план без Workflow Pilot session origin. Шаги последовательно меняют общий session store, admission, runtime и ContextSession; последовательная интеграция снижает риск конфликтующих контрактов. Публикация не запускает работу.

- [DONE] T001: Упразднить активные Work-сессии и мигрировать историю — Завершено
  - Git Commit: [DONE] feat: Упразднить активные Work-сессии и мигрировать историю
  - Reference: chat-only-url-bootstrap / T001 / implementation
  - Файлы: src/control/sessions/workspace-session.mjs, src/control/sessions/service.mjs, src/control/projects/workspace-setup.mjs, src/control/facade.mjs, src/control/workflow/executor-session.mjs, src/control/workflow/project-session-plan-continuation.mjs, src/control/plugin/enrollment.mjs, src/control/plugin/workflow-channel.mjs, src/backend/desktop-model.mjs, src/contracts/browser.mjs, tests/workspace-session.test.mjs, tests/session-roles.test.mjs, tests/backend-desktop-model.test.mjs, tests/plugin-enrollment.test.mjs, tests/automatic-agent-dialogue.test.mjs, src/backend/operations.mjs, src/backend/bootstrap.mjs, src/control/workflow/coordination.mjs, src/control/workflow/parallel-execution.mjs, src/control/workflow/execution-control.mjs, tests/backend-api.test.mjs, tests/control-facade.test.mjs, tests/migration-compatibility.test.mjs, tests/parallel-execution.test.mjs, tests/parallel-execution-ui.test.mjs, tests/context-session.test.mjs, tests/fixtures/automatic-agent-dialogue.mjs, tests/backend-upgrade.test.mjs, tests/chatgpt-plugin.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] T002: Расширить навигационный порт и защитить обновление от повторного q — Завершено
  - Git Commit: [DONE] feat: Расширить навигационный порт и защитить обновление от повторного q
  - Reference: chat-only-url-bootstrap / T002 / implementation
  - Файлы: src/execution/browser/session-runtime.mjs, src/execution/browser/browser-startup.mjs, src/execution/browser/chatgpt-experience.mjs, src/execution/browser/diagnostics.mjs, src/execution/facade.mjs, src/contracts/browser.mjs, tests/session-runtime.test.mjs, tests/browser-startup.test.mjs, tests/chromium-diagnostics.test.mjs, tests/backend-browser-lifecycle.test.mjs, tests/chatgpt-experience.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: T001
- [DONE] T003: Добавить долговечный отзыв приглашения и отмену startup — Завершено
  - Git Commit: [DONE] feat: Добавить долговечный отзыв приглашения и отмену startup
  - Reference: chat-only-url-bootstrap / T003 / implementation
  - Файлы: src/control/plugin/enrollment.mjs, src/control/plugin/communication.mjs, src/control/plugin/startup-context.mjs, src/control/plugin/workflow-channel.mjs, src/control/plugin/service.mjs, src/control/workflow/dialogue-delivery.mjs, src/execution/plugin/communication-store.mjs, src/contracts/plugin-communication.mjs, tests/plugin-enrollment.test.mjs, tests/plugin-communication-store.test.mjs, tests/startup-context.test.mjs, tests/dialogue-delivery.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: T002
- [DONE] T004: Запускать новый Chat через q с подтверждением sent по тикету — Завершено
  - Git Commit: [DONE] feat: Запускать новый Chat через q с подтверждением sent по тикету
  - Reference: chat-only-url-bootstrap / T004 / implementation
  - Файлы: src/control/context/context-session.mjs, src/control/context/service.mjs, src/control/sessions/service.mjs, src/control/sessions/conversation-recovery.mjs, src/control/sessions/workspace-session.mjs, src/control/workflow/dialogue-delivery.mjs, src/control/workflow/executor-session.mjs, src/execution/browser/session-runtime.mjs, src/execution/browser/chatgpt-composer.mjs, src/backend/desktop-model.mjs, src/contracts/context.mjs, tests/context-session.test.mjs, tests/dialogue-delivery.test.mjs, tests/executor-startup-lifecycle.test.mjs, tests/backend-desktop-model.test.mjs, tests/chatgpt-composer.test.mjs, tests/chatgpt-experience.test.mjs, tests/desktop-boundaries.test.mjs, src/control/projects/service.mjs, src/backend/bootstrap.mjs, src/execution/files/adapter.mjs, tests/workspace-session.test.mjs, tests/fixtures/automatic-agent-dialogue.mjs, tests/fixtures/executor-background-startup.mjs, tests/automatic-agent-dialogue.test.mjs, tests/executor-background-startup.test.mjs, tests/files-adapter.test.mjs, src/execution/facade.mjs, src/control/plugin/communication.mjs, src/control/plugin/startup-context.mjs, tests/startup-context.test.mjs, src/control/workflow/coordination.mjs, tests/session-runtime.test.mjs, tests/session-opening-performance.test.mjs, tests/parallel-execution.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: T003
- [DONE] T005: Убрать Work из интерфейса и показать независимые этапы старта — Завершено
  - Git Commit: [DONE] feat: Убрать Work из интерфейса и показать независимые этапы старта
  - Reference: chat-only-url-bootstrap / T005 / implementation
  - Файлы: src/frontend/desktop/ui/sidebar.mjs, src/frontend/desktop/ui/workspace-setup.mjs, src/frontend/desktop/ui/index.html, src/frontend/desktop/ui/archive.mjs, src/frontend/desktop/ui/archive.html, src/frontend/desktop/client.mjs, src/backend/desktop-model.mjs, src/frontend/plugin/panel.mjs, src/frontend/plugin/launch.mjs, tools/codex-app-server-mcp/plugin.py, tests/sidebar.test.mjs, tests/startup-ui.test.mjs, tests/progress.test.mjs, tests/desktop-client.test.mjs, tests/backend-desktop-model.test.mjs, src/frontend/desktop/preload.cjs, src/contracts/desktop.mjs, tests/project-doctor-ui.test.mjs, src/contracts/startup-view.mjs, src/backend/bootstrap.mjs, src/control/workflow/dialogue-delivery.mjs, src/control/plugin/communication.mjs, src/frontend/desktop/ui/project-doctor.mjs, tests/backend-browser-lifecycle.test.mjs, src/control/context/context-session.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: T004
- [DONE] T006: Проверить Chat-only bootstrap сквозными fixtures и обновить smoke — Завершено
  - Git Commit: [DONE] feat: Проверить Chat-only bootstrap сквозными fixtures и обновить smoke
  - Reference: chat-only-url-bootstrap / T006 / implementation
  - Файлы: tests/electron-smoke.mjs, tests/fixtures/automatic-agent-dialogue.mjs, tests/fixtures/executor-background-startup.mjs, tests/fixtures/dialogue-runtime.mjs, tests/fixtures/plugin-host.mjs, tests/fixtures/backend-browser-viewer.mjs, tests/fixtures/backend-browser-client.mjs, tests/fixtures/backend-browser-viewer.html, tests/fixtures/backend-browser-viewer-preload.cjs, tests/fixtures/backend-browser-page.html, tests/fixtures/backend-browser-probe.mjs, tests/automatic-agent-dialogue.test.mjs, tests/executor-background-startup.test.mjs, tests/executor-startup-lifecycle.test.mjs, tests/session-runtime.test.mjs, tests/plugin-enrollment.test.mjs, tests/startup-context.test.mjs, tests/backend-desktop-model.test.mjs, scripts/stage-page-observer.mjs, scripts/stage-chatgpt-plugin.mjs, tools/codex-app-server-mcp/plugin.py, src/control/context/context-session.mjs, src/contracts/startup-view.mjs, tests/context-session.test.mjs, src/control/sessions/service.mjs, src/frontend/desktop/ui/sidebar.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: T005
- [DONE] VERSION: Подготовить версию 0.5.31 для единого выпуска — Завершено
  - Git Commit: [DONE] chore: подготовить Workflow Pilot 0.5.31
  - Reference: chat-only-url-bootstrap / VERSION / implementation
  - Файлы: package.json, package-lock.json, src/contracts/backend.mjs, docs/planning/chat-only-url-start.md
  - Параллельность: исключительное выполнение
  - Зависимости: T006
- [DONE] DOCS: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: уточнить результат Chat-only и условия приёмки URL-старта
  - Reference: chat-only-url-bootstrap / DOCS / implementation
  - Файлы: docs/planning/chat-only-url-start.md, docs/planning/chat-only-url-lifecycle.md, docs/planning/chat-only-url-acceptance.md, docs/architecture/OVERVIEW.md, docs/modules/release.md, README.md, docs/modules/browser.md, docs/modules/orchestrator-startup.md, docs/modules/chatgpt-plugin.md, docs/modules/project-lifecycle.md, docs/modules/desktop.md, docs/modules/first-run-onboarding.md, docs/modules/control.md, docs/acceptance/chat-only-startup.md, docs/modules/chat-only-startup.md
  - Параллельность: исключительное выполнение
  - Зависимости: T001, T002, T003, T004, T005, T006, VERSION
- [DONE] RELEASE: Собрать и проверить единый выпуск Chat-only для macOS Windows Linux — Завершено
  - Git Commit: [DONE] feat: Собрать и проверить единый выпуск Chat-only для macOS Windows Linux
  - Reference: chat-only-url-bootstrap / RELEASE / implementation
  - Файлы: package.json, package-lock.json, release-manifest.json, scripts/release-all.mjs, scripts/release-package.mjs, docs/modules/release.md
  - Параллельность: исключительное выполнение
  - Зависимости: DOCS
- [DONE] INSTALL: Обновить собственную установленную копию готовым macOS bundle — Завершено
  - Git Commit: [DONE] feat: Обновить собственную установленную копию готовым macOS bundle
  - Reference: chat-only-url-bootstrap / INSTALL / implementation
  - Файлы: release-manifest.json, docs/modules/release.md
  - Параллельность: исключительное выполнение
  - Зависимости: RELEASE, DOCS
- [DONE] PUBLISH: Опубликовать полный выпуск на GitHub — Завершено
  - Git Commit: [DONE] feat: Опубликовать полный выпуск на GitHub
  - Reference: chat-only-url-bootstrap / PUBLISH / implementation
  - Файлы: release-manifest.json, docs/modules/release.md
  - Параллельность: исключительное выполнение
  - Зависимости: INSTALL, DOCS
- [DONE] EXT01: Автоматически загружать и атомарно устанавливать официальное расширение — Завершено
  - Git Commit: [DONE] feat: Автоматически загружать и атомарно устанавливать официальное расширение
  - Reference: chat-only-url-bootstrap / EXT01 / implementation
  - Файлы: src/execution/browser/chatgpt-search-extension.mjs, src/execution/browser/search-extension-pin.mjs, tests/chatgpt-search-extension.test.mjs, package.json, package-lock.json, docs/planning/chatgpt-search-extension.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] EXT02: Подключать расширение перед навигацией ChatGPT в браузерной сессии — Завершено
  - Git Commit: [DONE] feat: Подключать расширение перед навигацией ChatGPT в браузерной сессии
  - Reference: chat-only-url-bootstrap / EXT02 / implementation
  - Файлы: src/backend/main.mjs, src/backend/desktop-model.mjs, src/execution/browser/session-runtime.mjs, src/execution/facade.mjs, tests/session-runtime.test.mjs, tests/backend-browser-lifecycle.test.mjs, docs/planning/chatgpt-search-extension.md
  - Параллельность: исключительное выполнение
  - Зависимости: EXT01
- [DONE] EXT03: Проверить настоящий Electron и регрессии запуска с расширением — Завершено
  - Git Commit: [DONE] feat: Проверить настоящий Electron и регрессии запуска с расширением
  - Reference: chat-only-url-bootstrap / EXT03 / implementation
  - Файлы: scripts/check-search-extension.mjs, tests/fixtures/search-extension-electron.cjs, tests/electron-smoke.mjs, src/frontend/desktop/bootstrap.mjs, tests/product-identity.test.mjs, docs/planning/chatgpt-search-extension.md
  - Параллельность: исключительное выполнение
  - Зависимости: EXT02
- [TODO] VERSION-2: Подготовить версию 0.5.32 — Ожидает
  - Git Commit: [PENDING] feat: Подготовить версию 0.5.32
  - Reference: chat-only-url-bootstrap / VERSION-2 / implementation
  - Файлы: package.json, package-lock.json, src/backend/desktop-model.mjs, docs/planning/chatgpt-search-extension.md
  - Параллельность: исключительное выполнение
  - Зависимости: EXT03
- [TODO] DOCS-2: Актуализация всех документов проекта — Ожидает
  - Git Commit: [PENDING] docs: актуализировать документацию проекта
  - Reference: chat-only-url-bootstrap / DOCS-2 / implementation
  - Файлы: docs/architecture/OVERVIEW.md, docs/planning/chatgpt-search-extension.md, docs/modules/release.md
  - Параллельность: исключительное выполнение
  - Зависимости: EXT01, EXT02, EXT03, VERSION-2
- [TODO] RELEASE-2: Собрать проверенный выпуск 0.5.32 для трёх ОС — Ожидает
  - Git Commit: [PENDING] feat: Собрать проверенный выпуск 0.5.32 для трёх ОС
  - Reference: chat-only-url-bootstrap / RELEASE-2 / implementation
  - Файлы: release-manifest.json, docs/planning/chatgpt-search-extension.md
  - Параллельность: исключительное выполнение
  - Зависимости: VERSION-2, DOCS-2
- [TODO] INSTALL-2: Обновить собственные macOS-копии выпуском 0.5.32 — Ожидает
  - Git Commit: [PENDING] feat: Обновить собственные macOS-копии выпуском 0.5.32
  - Reference: chat-only-url-bootstrap / INSTALL-2 / implementation
  - Файлы: release-manifest.json, docs/planning/chatgpt-search-extension.md, docs/modules/release.md
  - Параллельность: исключительное выполнение
  - Зависимости: RELEASE-2, DOCS-2
- [TODO] PUBLISH-2: Опубликовать выпуск 0.5.32 на GitHub — Ожидает
  - Git Commit: [PENDING] feat: Опубликовать выпуск 0.5.32 на GitHub
  - Reference: chat-only-url-bootstrap / PUBLISH-2 / implementation
  - Файлы: release-manifest.json, docs/planning/chatgpt-search-extension.md, docs/modules/release.md
  - Параллельность: исключительное выполнение
  - Зависимости: INSTALL-2, DOCS-2

## Context Pack For This Cycle

- docs/planning/chat-only-url-lifecycle.md
- docs/planning/chat-only-url-acceptance.md
- docs/architecture/OVERVIEW.md
- docs/modules/browser.md
- docs/modules/orchestrator-startup.md
- docs/modules/chatgpt-plugin.md
- docs/modules/project-lifecycle.md
- docs/modules/user-choice.md
- docs/modules/release.md
- docs/planning/chat-only-url-start.md
- docs/modules/chat-only-startup.md
- docs/planning/chatgpt-search-extension.md

Служебные состояния меняются только командами workflow. Приёмка не архивирует scope.
