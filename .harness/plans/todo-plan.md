# Активный план — Workflow_Pilot

<!-- workflow-state:begin -->
```json
{
  "schema_version": 1,
  "plan_revision": 558,
  "project_id": "7411e192-943c-4529-bffb-3b081d9c242f",
  "project_name": "Workflow_Pilot",
  "scope_id": "workflow-pilot-automatic-agent-dialogue",
  "execution_scope_status": "ACTIVE",
  "delivery_status": "IN_PROGRESS",
  "objective": "Пользователь одним запуском плана автоматически подключает оркестратора и исполнителей; исполнитель сообщает техническую блокировку, получает решение и продолжает задачу без ручных ID, Enable и пользовательского продолжения.",
  "acceptance_criteria": [
    "Первое сообщение автоматически открывает панель будущего оркестратора; обсуждение/Review/публикация сохраняются, публикация сама выполнение не запускает.",
    "Один Start создаёт и связывает исполнителей с назначениями; пользователь не вводит ID, не открывает их панели и не включает связь отдельно. Один O и пять E поддержаны в коде и fixtures.",
    "Вопрос/решение привязаны к конкретной блокировке и назначению; исполнитель после ответа продолжает ту же задачу, оркестратор устраняет обычные технические препятствия без пользователя.",
    "Готовность SDK/identity, срок плана, занятость/черновик, Stop/пауза/restart/завершение и unknown-no-retry проверены; DOM-дублей нет, Kit сохраняет полномочия и доказательства DONE.",
    "Единый выпуск трёх платформ, штатная установка и сценарии S1–S3 переданы; живая автономность требует отдельного пользовательского PASS и не выводится из fixtures."
  ],
  "approved_scope": {
    "functional_paths": [
      "src/control/plugin/communication.mjs",
      "src/control/plugin/service.mjs",
      "src/control/plugin/enrollment.mjs",
      "src/control/sessions/workspace-session.mjs",
      "src/control/projects/service.mjs",
      "src/execution/plugin/communication-store.mjs",
      "src/execution/plugin/bridge.mjs",
      "src/contracts/backend.mjs",
      "src/backend/desktop-model.mjs",
      "tools/codex-app-server-mcp/plugin.py",
      "tests/plugin-communication.test.mjs",
      "tests/plugin-communication-store.test.mjs",
      "tests/plugin-enrollment.test.mjs",
      "tests/codex-app-server-mcp.test.mjs",
      "tests/session-roles.test.mjs",
      "src/control/context/context-session.mjs",
      "src/control/context/service.mjs",
      "src/control/workflow/coordination.mjs",
      "src/control/workflow/executor-session.mjs",
      "src/frontend/plugin/app.mjs",
      "src/frontend/plugin/launch.mjs",
      "src/frontend/plugin/panel.mjs",
      "src/frontend/plugin/index.html",
      "tests/context-session.test.mjs",
      "tests/chatgpt-plugin.test.mjs",
      "tests/orchestrated-execution.test.mjs",
      "tests/electron-smoke.mjs",
      "src/control/workflow/parallel-execution.mjs",
      "src/control/workflow/execution-control.mjs",
      "src/control/workflow/project-session-plan-continuation.mjs",
      "src/control/workflow/plan-continuation.mjs",
      "src/control/workflow/automation-send-state.mjs",
      "src/control/workflow/dialogue-delivery.mjs",
      "src/control/facade.mjs",
      "src/execution/facade.mjs",
      "tests/execution-control.test.mjs",
      "tests/parallel-execution.test.mjs",
      "tests/parallel-execution-recovery.test.mjs",
      "tests/plan-continuation.test.mjs",
      "tests/backend-end-to-end.test.mjs",
      "packages/workflow-kit/src/lib/signals.mjs",
      "packages/workflow-kit/src/lib/recovery.mjs",
      "packages/workflow-kit/src/cli.mjs",
      "packages/workflow-kit/src/lib/command-help.mjs",
      "packages/workflow-kit/scripts/check-orchestrated-execution-fixture.mjs",
      "packages/workflow-kit/scripts/check-project-recovery-fixture.mjs",
      "src/control/workflow/parallel-kit.mjs",
      "src/execution/runtime/service.mjs",
      "tools/codex-app-server-mcp/server.py",
      "tests/workflow-kit-recovery.test.mjs",
      "tests/automatic-agent-dialogue.test.mjs",
      "tests/fixtures/automatic-agent-dialogue.mjs",
      "scripts/prepare-agent-dialogue-experiment.mjs",
      "package.json",
      "package-lock.json",
      "packages/workflow-kit/package.json",
      "packages/workflow-kit/src/lib/common.mjs",
      "scripts/stage-workflow-kit.mjs",
      "scripts/stage-chatgpt-plugin.mjs",
      "tests/backend-upgrade.test.mjs",
      "tests/mcp-runtime.test.mjs",
      "packages/workflow-kit/scripts/check-previous-upgrade-fixture.mjs",
      "release-manifest.json",
      "tests/backend-protocol.test.mjs",
      "src/control/workflow/plan-continuation-state.mjs",
      "src/control/plugin/workflow-channel.mjs",
      "tests/workflow-channel.test.mjs",
      "src/frontend/desktop/bootstrap.mjs",
      "tests/product-identity.test.mjs",
      "tests/web-client-electron.test.mjs",
      "packages/workflow-kit/src/lib/role-protocol.mjs",
      "packages/workflow-kit/src/lib/signal-state.mjs",
      "tests/workflow-signals.test.mjs",
      "packages/workflow-kit/scripts/check-parallel-plan-fixture.mjs",
      "packages/workflow-kit/src/lib/simple-workflow.mjs",
      "tests/dialogue-experiment.test.mjs",
      "tests/fixtures/plugin-host.mjs",
      "tests/mac-runtime-switch.test.mjs",
      "packages/workflow-kit/src/lib/installer.mjs",
      "scripts/check-installed-release.mjs",
      "scripts/release-mac.mjs",
      "tests/release-mac.test.mjs",
      "tests/workflow-kit-upgrade.test.mjs",
      "tests/fixtures/released-kit/manifest.json",
      "tests/fixtures/released-kit/kit-1.8.1.tar.gz",
      "tests/panel-resource-upgrade.test.mjs",
      "scripts/release-package.mjs",
      "scripts/check-plugin-resource.mjs",
      "tests/release-all.test.mjs",
      "tests/release-linux.test.mjs"
    ],
    "documentation_paths": [
      "docs/planning/automatic-agent-dialogue.md",
      "docs/planning/automatic-agent-dialogue-acceptance.md",
      "packages/workflow-kit/src/WORKFLOW.md",
      "packages/workflow-kit/src/templates/PROTOTYPE.md",
      "packages/workflow-kit/docs/modules/orchestrated-plans.md",
      "AGENTS.md",
      "docs/modules/automatic-agent-dialogue-acceptance.md",
      "docs/modules/plugin-communication-handoff.md",
      "README.md",
      "docs/architecture/OVERVIEW.md",
      "docs/modules/chatgpt-plugin.md",
      "docs/modules/chatgpt-plugin-acceptance.md",
      "docs/modules/orchestrated-execution.md",
      "docs/modules/workflow-execution.md",
      "docs/acceptance/orchestrated-execution.md",
      "docs/modules/execution.md",
      "docs/modules/control.md",
      "docs/modules/backend.md",
      "docs/modules/browser.md",
      "docs/modules/desktop.md",
      "docs/modules/project-compatibility.md",
      "docs/modules/release.md",
      "packages/workflow-kit/docs/modules/parallel-assignments.md",
      "packages/workflow-kit/docs/modules/workflow-kit-package.md",
      "docs/planning/plugin-plan-lifetime.md",
      "docs/planning/panel-resource-upgrade.md"
    ]
  },
  "baseline_commit": "87a92ea22963dd1af1a23a2cb2451e096af732d5",
  "current_task_id": null,
  "context_pack": {
    "documents": [
      {
        "path": "docs/planning/automatic-agent-dialogue.md",
        "required": true,
        "revision": "c9271f8f0866b122784cc05e5f47f1b4d8332ec5"
      },
      {
        "path": "docs/planning/automatic-agent-dialogue-acceptance.md",
        "required": true,
        "revision": "c9271f8f0866b122784cc05e5f47f1b4d8332ec5"
      },
      {
        "path": "docs/architecture/OVERVIEW.md",
        "required": true,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/planning/panel-resource-upgrade.md",
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
        "scope_id": "workflow-pilot-automatic-agent-dialogue",
        "task_id": "T001",
        "role": "implementation"
      },
      "dependencies": [],
      "functional_paths": [
        "src/control/plugin/communication.mjs",
        "src/control/plugin/service.mjs",
        "src/control/plugin/enrollment.mjs",
        "src/control/sessions/workspace-session.mjs",
        "src/control/projects/service.mjs",
        "src/execution/plugin/communication-store.mjs",
        "src/execution/plugin/bridge.mjs",
        "src/contracts/backend.mjs",
        "src/backend/desktop-model.mjs",
        "tools/codex-app-server-mcp/plugin.py",
        "tests/plugin-communication.test.mjs",
        "tests/plugin-communication-store.test.mjs",
        "tests/plugin-enrollment.test.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/session-roles.test.mjs",
        "tests/backend-protocol.test.mjs",
        "tests/chatgpt-plugin.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "architecture",
        "executor-channel"
      ],
      "id": "T001",
      "title": "Реестр участников и регистрация по назначению",
      "why": "Убрать ручной перенос ID и ограничение пары O/E; подтвердить связь локальной сессии и host identity.",
      "acceptance_criteria": [
        "Сервер резервирует scoped enrollment для существующей локальной сессии и отдельно для назначения; расширенный workflow_pilot_panel проверяет свежую host identity и возвращает UI, не создаёт дубликат external-сессии.",
        "Участники индексируются по ID; один оркестратор и пять исполнителей разных назначений разрешены, чужая identity/проект/scope/заменённое назначение отклонены; роли не выбираются произвольно клиентом.",
        "Приглашение ограничено областью/сроком, хранится хеш; повтор того же связывания идемпотентен, перенос в другой разговор запрещён; секрет приглашения отсутствует в общем журнале/экспорте/Git.",
        "Очередь и реестр переживают restart; старый экспериментальный журнал доступен без автоматической выдачи нового разрешения; неподдерживаемый формат отклонён до записи.",
        "Регистрация workflow_pilot_panel имеет readOnlyHint=false и правдивые annotations; экспериментальные join/probe допускаются backend только для legacy-запусков, каталог явно отделяет их от рабочего режима. Проверка executor-channel подтверждает новый контракт без ослабления."
      ],
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/automatic-agent-dialogue.md",
            "required": true,
            "revision": "c9271f8f0866b122784cc05e5f47f1b4d8332ec5"
          },
          {
            "path": "docs/planning/automatic-agent-dialogue-acceptance.md",
            "required": true,
            "revision": "c9271f8f0866b122784cc05e5f47f1b4d8332ec5"
          },
          {
            "path": "docs/modules/chatgpt-plugin.md",
            "required": false,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/modules/orchestrated-execution.md",
            "required": false,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/modules/control.md",
            "required": false,
            "revision": "WORKTREE"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "expected_commit_message": "feat: Реестр участников и регистрация по назначению",
      "actual_files": [
        "src/control/plugin/enrollment.mjs",
        "tests/plugin-enrollment.test.mjs",
        "src/backend/desktop-model.mjs",
        "src/contracts/backend.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/service.mjs",
        "src/execution/plugin/bridge.mjs",
        "src/execution/plugin/communication-store.mjs",
        "tests/backend-protocol.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/plugin-communication-store.test.mjs",
        "tools/codex-app-server-mcp/plugin.py"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-automatic-agent-dialogue",
        "task_id": "T002",
        "role": "implementation"
      },
      "dependencies": [
        "T001"
      ],
      "functional_paths": [
        "src/control/context/context-session.mjs",
        "src/control/context/service.mjs",
        "src/control/sessions/workspace-session.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/executor-session.mjs",
        "src/control/plugin/enrollment.mjs",
        "src/control/plugin/service.mjs",
        "src/control/plugin/communication.mjs",
        "src/frontend/plugin/app.mjs",
        "src/frontend/plugin/launch.mjs",
        "src/frontend/plugin/panel.mjs",
        "src/frontend/plugin/index.html",
        "src/backend/desktop-model.mjs",
        "src/contracts/backend.mjs",
        "src/execution/plugin/bridge.mjs",
        "tools/codex-app-server-mcp/plugin.py",
        "tests/context-session.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/plugin-enrollment.test.mjs",
        "tests/orchestrated-execution.test.mjs",
        "tests/electron-smoke.mjs",
        "src/control/workflow/execution-control.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/execution-control.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "architecture",
        "electron-smoke",
        "executor-channel"
      ],
      "id": "T002",
      "title": "Автоматический запуск панели оркестратора и исполнителей",
      "why": "Подключать новые разговоры без посещения пользователем и без цикла ожидания модели.",
      "acceptance_criteria": [
        "Первый recovery оркестратора содержит точное приглашение и узкое разрешение вызова панели; bootstrap до scope не разрешает исполнение плана, публикация связывает только правильный origin.",
        "Новый исполнитель получает приглашение автоматически в штатном первоначальном контексте, открывает панель и завершает загрузочный ход; работа не начинается до наблюдаемых SDK/bind и рабочего уведомления.",
        "Панель сама получает актуальное назначение свежим запросом и делает bind; нет ручных ID/join/подтверждения/выбора старых runs. Ошибка нового фонового mount видна и не объявляется готовностью.",
        "Настоящие staged HTML/SDK/MCP проверяют порядок bootstrap, потерю ответа, поздний SDK, восстановление экземпляра и отсутствие дублированного контекста; исторический tool-result не выдаёт разрешение.",
        "Открытие пользователя не используется для fixture-готовности фонового исполнителя; поддержка этого поведения реальным ChatGPT остаётся явным живым S1.",
        "До готовности доставки T003 новый режим не включён по умолчанию; маршрут фиксируется в состоянии плана, legacy остаётся рабочим, новый bootstrap проверен изолированно. Промежуточные проверки проходят без зависания задания и ослабления assertions."
      ],
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/automatic-agent-dialogue.md",
            "required": true,
            "revision": "c9271f8f0866b122784cc05e5f47f1b4d8332ec5"
          },
          {
            "path": "docs/planning/automatic-agent-dialogue-acceptance.md",
            "required": true,
            "revision": "c9271f8f0866b122784cc05e5f47f1b4d8332ec5"
          },
          {
            "path": "docs/modules/chatgpt-plugin.md",
            "required": false,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/modules/browser.md",
            "required": false,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/modules/orchestrated-execution.md",
            "required": false,
            "revision": "WORKTREE"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "expected_commit_message": "feat: Автоматический запуск панели оркестратора и исполнителей",
      "actual_files": [
        "src/backend/desktop-model.mjs",
        "src/contracts/backend.mjs",
        "src/control/context/context-session.mjs",
        "src/control/context/service.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/enrollment.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/execution-control.mjs",
        "src/frontend/plugin/app.mjs",
        "src/frontend/plugin/index.html",
        "src/frontend/plugin/launch.mjs",
        "src/frontend/plugin/panel.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/context-session.test.mjs",
        "tests/execution-control.test.mjs",
        "tools/codex-app-server-mcp/plugin.py"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-automatic-agent-dialogue",
        "task_id": "T003",
        "role": "implementation"
      },
      "dependencies": [
        "T002"
      ],
      "functional_paths": [
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/parallel-execution.mjs",
        "src/control/workflow/executor-session.mjs",
        "src/control/workflow/execution-control.mjs",
        "src/control/workflow/project-session-plan-continuation.mjs",
        "src/control/workflow/plan-continuation.mjs",
        "src/control/workflow/automation-send-state.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/enrollment.mjs",
        "src/control/plugin/service.mjs",
        "src/control/facade.mjs",
        "src/execution/facade.mjs",
        "src/backend/desktop-model.mjs",
        "src/contracts/backend.mjs",
        "src/frontend/plugin/launch.mjs",
        "src/frontend/plugin/panel.mjs",
        "src/frontend/plugin/index.html",
        "tools/codex-app-server-mcp/plugin.py",
        "tests/plugin-communication.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/orchestrated-execution.test.mjs",
        "tests/execution-control.test.mjs",
        "tests/parallel-execution.test.mjs",
        "tests/parallel-execution-recovery.test.mjs",
        "tests/plan-continuation.test.mjs",
        "tests/backend-end-to-end.test.mjs",
        "src/control/projects/service.mjs",
        "src/control/sessions/workspace-session.mjs",
        "src/control/workflow/plan-continuation-state.mjs",
        "src/execution/plugin/communication-store.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "tests/workflow-channel.test.mjs",
        "src/frontend/desktop/bootstrap.mjs",
        "tests/product-identity.test.mjs",
        "tests/web-client-electron.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "architecture",
        "electron-smoke",
        "executor-channel"
      ],
      "id": "T003",
      "title": "Связать разрешение и доставку с выполнением плана",
      "why": "Одна кнопка управляет связью всех назначений; рабочие уведомления заменяют DOM Send.",
      "acceptance_criteria": [
        "Один Start выдаёт сохранённый допуск текущему плану и всем его назначениям; панели включаются автоматически, рабочий срок не ограничен 30 минутами, новая задача этого scope не требует нового Enable.",
        "Начальные рабочие, промежуточные, сигнальные и финальные/delivery уведомления передаются через канал; DOM остаётся для первого контекста и прежнего Review/legacy, скрытых fallback и двойных отправок нет. Контекст сверх лимита уведомления передаётся ссылкой и полностью читается через MCP с проверкой участника/назначения; тест превышения лимита и чужой identity подтверждает отсутствие обрезания и утечки.",
        "Сервер адресует по назначению/исходному событию, подтверждает отправителя и сериализует очередь каждого разговора; observer занятости/черновика блокирует преждевременный Send без опроса моделью.",
        "Пауза, Stop, архив, restart с одним Continue, замена назначения и финальное завершение соблюдают спецификацию; припаркованная блокировка не создаёт бесконечную паузу, финальный обязательный ход не отрезается.",
        "Сбой между сигналом Kit и записью канала не теряет и не дублирует событие; UNKNOWN/потеря claim/report не повторяются через SDK или DOM, прежние рабочие планы сохраняют свой маршрут."
      ],
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/automatic-agent-dialogue.md",
            "required": true,
            "revision": "c9271f8f0866b122784cc05e5f47f1b4d8332ec5"
          },
          {
            "path": "docs/planning/automatic-agent-dialogue-acceptance.md",
            "required": true,
            "revision": "c9271f8f0866b122784cc05e5f47f1b4d8332ec5"
          },
          {
            "path": "docs/modules/workflow-execution.md",
            "required": false,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/modules/orchestrated-execution.md",
            "required": false,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/modules/chatgpt-plugin.md",
            "required": false,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/planning/plugin-plan-lifetime.md",
            "required": true,
            "revision": "c9271f8f0866b122784cc05e5f47f1b4d8332ec5"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "expected_commit_message": "feat: Связать разрешение и доставку с выполнением плана",
      "actual_files": [
        "src/backend/desktop-model.mjs",
        "src/contracts/backend.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/enrollment.mjs",
        "src/control/plugin/service.mjs",
        "src/control/projects/service.mjs",
        "src/control/sessions/workspace-session.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/execution-control.mjs",
        "src/control/workflow/executor-session.mjs",
        "src/control/workflow/parallel-execution.mjs",
        "src/control/workflow/plan-continuation-state.mjs",
        "src/control/workflow/plan-continuation.mjs",
        "src/execution/plugin/communication-store.mjs",
        "src/frontend/plugin/launch.mjs",
        "src/frontend/plugin/panel.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/execution-control.test.mjs",
        "tests/parallel-execution-recovery.test.mjs",
        "tests/plan-continuation.test.mjs",
        "tools/codex-app-server-mcp/plugin.py",
        "src/control/plugin/workflow-channel.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "tests/workflow-channel.test.mjs",
        "src/frontend/desktop/bootstrap.mjs",
        "tests/product-identity.test.mjs",
        "tests/web-client-electron.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-automatic-agent-dialogue",
        "task_id": "T004",
        "role": "implementation"
      },
      "dependencies": [
        "T003"
      ],
      "functional_paths": [
        "packages/workflow-kit/src/lib/signals.mjs",
        "packages/workflow-kit/src/lib/recovery.mjs",
        "packages/workflow-kit/src/cli.mjs",
        "packages/workflow-kit/src/lib/command-help.mjs",
        "packages/workflow-kit/scripts/check-orchestrated-execution-fixture.mjs",
        "packages/workflow-kit/scripts/check-project-recovery-fixture.mjs",
        "src/control/context/context-session.mjs",
        "src/control/workflow/parallel-kit.mjs",
        "src/control/workflow/parallel-execution.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/control/workflow/executor-session.mjs",
        "src/control/plugin/communication.mjs",
        "src/execution/runtime/service.mjs",
        "tools/codex-app-server-mcp/plugin.py",
        "tools/codex-app-server-mcp/server.py",
        "tests/context-session.test.mjs",
        "tests/workflow-kit-recovery.test.mjs",
        "tests/orchestrated-execution.test.mjs",
        "tests/parallel-execution.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "src/backend/desktop-model.mjs",
        "src/control/plugin/service.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/plan-continuation-state.mjs",
        "src/frontend/plugin/index.html",
        "src/frontend/plugin/launch.mjs",
        "src/frontend/plugin/panel.mjs",
        "tests/workflow-channel.test.mjs",
        "packages/workflow-kit/src/lib/role-protocol.mjs",
        "packages/workflow-kit/src/lib/signal-state.mjs",
        "tests/workflow-signals.test.mjs"
      ],
      "documentation_paths": [
        "packages/workflow-kit/src/WORKFLOW.md",
        "packages/workflow-kit/src/templates/PROTOTYPE.md",
        "packages/workflow-kit/docs/modules/orchestrated-plans.md",
        "AGENTS.md",
        "docs/acceptance/orchestrated-execution.md"
      ],
      "verification_ids": [
        "unit-all",
        "architecture",
        "kit-check",
        "executor-channel"
      ],
      "id": "T004",
      "title": "Автономное разрешение блокировок и согласованные инструкции",
      "why": "Исполнитель получает решение оркестратора и продолжает ту же задачу без пользователя.",
      "acceptance_criteria": [
        "Ролевой recovery требует самостоятельной попытки, затем task:block с фактической ошибкой/попытками/точкой продолжения; завершение хода не означает DONE или прекращение назначения.",
        "Оркестратор автоматически получает блокировку, уточняет задание, исправляет разрешённую среду с исключительным владением либо организует корректирующее назначение; после решения проверяет возобновление.",
        "Решение адресовано конкретному block_id/question_id; поздний ответ и повторная ошибка не снимают новую блокировку, идентичные циклы без прогресса ограничены и эскалируются осмысленно.",
        "Прежние сигналы совместимы по явному правилу; запреты main/worktree, права пользователя и проверка DONE не обходятся, другие исполнители не останавливаются из-за обычного вопроса.",
        "Получаемые агентом startup/role recovery/шаблоны/MCP инструкции согласованы: нет запрета bootstrap, ручного копирования ID, требования пользователя продолжить обычную блокировку; открытые сессии обновляют инструкции без повторного выполнения. Каталог отделяет legacy join/probe от рабочего режима и честно обозначает мутации регистрации; host-confirmations не обходятся.",
        "Смысловые изменения WORKFLOW.md/PROTOTYPE.md завершены здесь, итогово проверяются T006; документ приёмки оркестрации отражает block_id, автоматическое продолжение и парковку при паузе."
      ],
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/automatic-agent-dialogue.md",
            "required": true,
            "revision": "c9271f8f0866b122784cc05e5f47f1b4d8332ec5"
          },
          {
            "path": "docs/planning/automatic-agent-dialogue-acceptance.md",
            "required": true,
            "revision": "c9271f8f0866b122784cc05e5f47f1b4d8332ec5"
          },
          {
            "path": "docs/modules/orchestrated-execution.md",
            "required": false,
            "revision": "WORKTREE"
          },
          {
            "path": "packages/workflow-kit/docs/modules/orchestrated-plans.md",
            "required": false,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/modules/workflow-execution.md",
            "required": false,
            "revision": "WORKTREE"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "expected_commit_message": "feat: Автономное разрешение блокировок и согласованные инструкции",
      "actual_files": [
        "AGENTS.md",
        "docs/acceptance/orchestrated-execution.md",
        "packages/workflow-kit/docs/modules/orchestrated-plans.md",
        "packages/workflow-kit/scripts/check-orchestrated-execution-fixture.mjs",
        "packages/workflow-kit/src/WORKFLOW.md",
        "packages/workflow-kit/src/cli.mjs",
        "packages/workflow-kit/src/lib/command-help.mjs",
        "packages/workflow-kit/src/lib/recovery.mjs",
        "packages/workflow-kit/src/lib/signals.mjs",
        "packages/workflow-kit/src/templates/PROTOTYPE.md",
        "src/backend/desktop-model.mjs",
        "src/control/context/context-session.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/service.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/control/workflow/parallel-execution.mjs",
        "src/control/workflow/parallel-kit.mjs",
        "src/control/workflow/plan-continuation-state.mjs",
        "src/frontend/plugin/index.html",
        "src/frontend/plugin/launch.mjs",
        "src/frontend/plugin/panel.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/orchestrated-execution.test.mjs",
        "tests/workflow-channel.test.mjs",
        "tools/codex-app-server-mcp/plugin.py",
        "packages/workflow-kit/src/lib/role-protocol.mjs",
        "packages/workflow-kit/src/lib/signal-state.mjs",
        "tests/workflow-signals.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-automatic-agent-dialogue",
        "task_id": "T005",
        "role": "implementation"
      },
      "dependencies": [
        "T004"
      ],
      "functional_paths": [
        "tests/automatic-agent-dialogue.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/plugin-communication.test.mjs",
        "tests/plugin-communication-store.test.mjs",
        "tests/orchestrated-execution.test.mjs",
        "tests/execution-control.test.mjs",
        "tests/context-session.test.mjs",
        "tests/electron-smoke.mjs",
        "scripts/prepare-agent-dialogue-experiment.mjs",
        "packages/workflow-kit/scripts/check-parallel-plan-fixture.mjs",
        "packages/workflow-kit/src/lib/simple-workflow.mjs",
        "src/control/plugin/enrollment.mjs",
        "tests/dialogue-experiment.test.mjs",
        "tests/fixtures/plugin-host.mjs",
        "tests/mac-runtime-switch.test.mjs"
      ],
      "documentation_paths": [
        "docs/modules/automatic-agent-dialogue-acceptance.md",
        "docs/modules/plugin-communication-handoff.md",
        "docs/modules/execution.md"
      ],
      "verification_ids": [
        "unit-all",
        "architecture",
        "electron-smoke",
        "kit-check",
        "executor-channel"
      ],
      "id": "T005",
      "title": "Сквозная матрица и комплект трёх живых сценариев",
      "why": "Проверить единый путь через реальные SDK/MCP/Kit и подготовить воспроизводимую внешнюю приёмку.",
      "acceptance_criteria": [
        "Интеграционный fixture проходит пользовательские входы startup/Start, два исполнителя, question/decision/продолжение, коммиты/интеграции и третье назначение; отдельная проверка одного O и пяти E.",
        "Матрица включает холодные панели, права/идемпотентность/блокировки/занятого адресата, restart, новые поколения и отсутствие DOM-дублей; существующие assertions/каталог не ослаблены. Отдельные fixtures проверяют bootstrap и доставку для оркестратора Chat и Work с Chat-исполнителями; неподдерживаемый host показывает конкретное препятствие.",
        "Подготовщик создаёт только явно заданный новый изолированный тестовый репозиторий с конкретными задачами и локальной зависимостью; не запускает модели/окна/службы, не пишет в продуктовый или старый экспериментальный run.",
        "Сценарии S1–S3 и форма отчёта требуют новых неподключённых разговоров, одного Start и отсутствия ручных ID/Enable; реальный результат и коммит после блокировки обязательны.",
        "Живые сценарии остаются NOT_RUN до отчёта пользователя; ручное открытие панели исполнителя означает FAIL автоматизации, отсутствие evidence не превращается в PASS. Обязательное host-confirmation нового чата фиксируется отдельно и также означает FAIL автоматизации S1."
      ],
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/automatic-agent-dialogue.md",
            "required": true,
            "revision": "c9271f8f0866b122784cc05e5f47f1b4d8332ec5"
          },
          {
            "path": "docs/planning/automatic-agent-dialogue-acceptance.md",
            "required": true,
            "revision": "c9271f8f0866b122784cc05e5f47f1b4d8332ec5"
          },
          {
            "path": "docs/modules/chatgpt-plugin.md",
            "required": false,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/modules/orchestrated-execution.md",
            "required": false,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/modules/plugin-communication-handoff.md",
            "required": false,
            "revision": "WORKTREE"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "expected_commit_message": "feat: Сквозная матрица и комплект трёх живых сценариев",
      "actual_files": [
        "docs/modules/automatic-agent-dialogue-acceptance.md",
        "docs/modules/plugin-communication-handoff.md",
        "packages/workflow-kit/scripts/check-parallel-plan-fixture.mjs",
        "packages/workflow-kit/src/lib/simple-workflow.mjs",
        "src/control/plugin/enrollment.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "scripts/prepare-agent-dialogue-experiment.mjs",
        "tests/automatic-agent-dialogue.test.mjs",
        "tests/dialogue-experiment.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/fixtures/plugin-host.mjs",
        "tests/mac-runtime-switch.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-automatic-agent-dialogue",
        "task_id": "T006",
        "role": "implementation"
      },
      "dependencies": [
        "T005"
      ],
      "functional_paths": [
        "package.json",
        "package-lock.json",
        "packages/workflow-kit/package.json",
        "packages/workflow-kit/src/lib/common.mjs",
        "scripts/stage-workflow-kit.mjs",
        "scripts/stage-chatgpt-plugin.mjs",
        "src/contracts/backend.mjs",
        "tests/backend-upgrade.test.mjs",
        "tests/mcp-runtime.test.mjs",
        "tests/workflow-kit-recovery.test.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "packages/workflow-kit/scripts/check-previous-upgrade-fixture.mjs",
        "tools/codex-app-server-mcp/plugin.py",
        "tests/chatgpt-plugin.test.mjs",
        "tests/parallel-execution-recovery.test.mjs",
        "packages/workflow-kit/src/lib/installer.mjs",
        "tests/backend-end-to-end.test.mjs",
        "scripts/check-installed-release.mjs",
        "scripts/release-mac.mjs",
        "tests/release-mac.test.mjs",
        "tests/workflow-kit-upgrade.test.mjs",
        "tests/fixtures/released-kit/manifest.json",
        "tests/fixtures/released-kit/kit-1.8.1.tar.gz"
      ],
      "documentation_paths": [
        "docs/modules/release.md"
      ],
      "verification_ids": [
        "unit-all",
        "architecture",
        "electron-smoke",
        "kit-check",
        "executor-channel",
        "chatgpt-plugin"
      ],
      "id": "T006",
      "title": "Согласовать версии и совместимость поставки",
      "why": "Подготовить единый релиз приложения, MCP, панели и обновлённого Kit.",
      "acceptance_criteria": [
        "Следующая свободная версия проверена и согласована в package/lock/backend/HTML/MCP; протокол и формат хранилища различают старый клиент и новый без ошибочного разрешения.",
        "Изменённый Kit имеет корректную версию и штатный upgrade: сохраняет планы/назначения/сигналы, managed-файлы обновляет installer; отсутствие ручных правок установленного Kit.",
        "Итоговые проверки полного исходного комплекта, включая окончательные WORKFLOW.md/PROTOTYPE.md, проходят; фактические pass/fail/skip и внешняя NOT_RUN-приёмка разделены; production build ещё не выполняется.",
        "Описания MCP Enable/Stop явно различают эксперимент и рабочий план; полный recovery сохраняет обязательные документы и не менее 20% запаса без повышения бюджета.",
        "Ожидание реального события файловой системы в F04 учитывает нагрузку полного suite; проверки доставки события, terminal receipt и закрытия watcher сохранены без polling."
      ],
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/automatic-agent-dialogue.md",
            "required": true,
            "revision": "c9271f8f0866b122784cc05e5f47f1b4d8332ec5"
          },
          {
            "path": "docs/planning/automatic-agent-dialogue-acceptance.md",
            "required": true,
            "revision": "c9271f8f0866b122784cc05e5f47f1b4d8332ec5"
          },
          {
            "path": "docs/modules/release.md",
            "required": false,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/modules/chatgpt-plugin.md",
            "required": false,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/modules/project-compatibility.md",
            "required": false,
            "revision": "WORKTREE"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "expected_commit_message": "feat: Согласовать версии и совместимость поставки",
      "actual_files": [
        "package.json",
        "package-lock.json",
        "packages/workflow-kit/package.json",
        "packages/workflow-kit/src/lib/common.mjs",
        "packages/workflow-kit/src/lib/installer.mjs",
        "src/contracts/backend.mjs",
        "tests/backend-upgrade.test.mjs",
        "tests/backend-end-to-end.test.mjs",
        "scripts/check-installed-release.mjs",
        "scripts/release-mac.mjs",
        "tests/release-mac.test.mjs",
        "tests/workflow-kit-upgrade.test.mjs",
        "tests/fixtures/released-kit/manifest.json",
        "tests/fixtures/released-kit/kit-1.8.1.tar.gz",
        "tools/codex-app-server-mcp/plugin.py",
        "tests/chatgpt-plugin.test.mjs",
        "docs/modules/release.md",
        "tests/parallel-execution-recovery.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-automatic-agent-dialogue",
        "task_id": "DOCS",
        "role": "implementation"
      },
      "dependencies": [
        "T001",
        "T002",
        "T003",
        "T004",
        "T005",
        "T006"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "README.md",
        "AGENTS.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/chatgpt-plugin-acceptance.md",
        "docs/modules/automatic-agent-dialogue-acceptance.md",
        "docs/modules/plugin-communication-handoff.md",
        "docs/modules/orchestrated-execution.md",
        "docs/modules/workflow-execution.md",
        "docs/acceptance/orchestrated-execution.md",
        "docs/modules/execution.md",
        "docs/modules/control.md",
        "docs/modules/backend.md",
        "docs/modules/browser.md",
        "docs/modules/desktop.md",
        "docs/modules/project-compatibility.md",
        "docs/modules/release.md",
        "packages/workflow-kit/docs/modules/orchestrated-plans.md",
        "packages/workflow-kit/docs/modules/parallel-assignments.md",
        "packages/workflow-kit/docs/modules/workflow-kit-package.md",
        "docs/planning/plugin-plan-lifetime.md",
        "docs/planning/automatic-agent-dialogue.md",
        "docs/planning/automatic-agent-dialogue-acceptance.md",
        "packages/workflow-kit/src/WORKFLOW.md",
        "packages/workflow-kit/src/templates/PROTOTYPE.md"
      ],
      "verification_ids": [],
      "id": "DOCS",
      "title": "Актуализация всех документов проекта",
      "why": "Согласовать действующие контракты и инструкции до единой сборки.",
      "acceptance_criteria": [
        "Документы описывают окончательный маршрут startup/план/назначение/диалог/завершение и согласованные инструкции, устаревшие ручные действия удалены из рабочего режима.",
        "Действующие требования временных спецификаций и plugin-plan-lifetime перенесены в контракты/приёмку до удаления; незавершённое сохранено, required ссылки закреплены на существующий Git blob.",
        "Отмечены границы SDK/готовности/UNKNOWN/перезапуска, живые S1–S3 и тест пяти участников не смешаны; документы не превышают 28000 байт и лишняя история не копируется.",
        "WORKFLOW.md/PROTOTYPE.md смыслово завершены в T004/T006; DOCS исправляет в них только ссылки. Если исходники инструкций Kit изменены после T006, до RELEASE обязательно повторить unit-all и kit-check и сохранить результаты; сверить также приёмку оркестрации и контракт Execution."
      ],
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/automatic-agent-dialogue.md",
            "required": true,
            "revision": "c9271f8f0866b122784cc05e5f47f1b4d8332ec5"
          },
          {
            "path": "docs/planning/automatic-agent-dialogue-acceptance.md",
            "required": true,
            "revision": "c9271f8f0866b122784cc05e5f47f1b4d8332ec5"
          },
          {
            "path": "docs/architecture/OVERVIEW.md",
            "required": true
          },
          {
            "path": "docs/modules/release.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "expected_commit_message": "docs: Актуализация всех документов проекта",
      "actual_files": [
        "README.md",
        "docs/acceptance/orchestrated-execution.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/automatic-agent-dialogue-acceptance.md",
        "docs/modules/backend.md",
        "docs/modules/browser.md",
        "docs/modules/chatgpt-plugin-acceptance.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/control.md",
        "docs/modules/desktop.md",
        "docs/modules/execution.md",
        "docs/modules/orchestrated-execution.md",
        "docs/modules/plugin-communication-handoff.md",
        "docs/modules/project-compatibility.md",
        "docs/modules/release.md",
        "docs/modules/workflow-execution.md",
        "docs/planning/automatic-agent-dialogue-acceptance.md",
        "docs/planning/automatic-agent-dialogue.md",
        "docs/planning/plugin-plan-lifetime.md",
        "packages/workflow-kit/docs/modules/orchestrated-plans.md",
        "packages/workflow-kit/docs/modules/parallel-assignments.md",
        "packages/workflow-kit/docs/modules/workflow-kit-package.md"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-automatic-agent-dialogue",
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
      "title": "Собрать единый проверочный выпуск",
      "why": "Доставить пользователю согласованную версию для реального опыта.",
      "acceptance_criteria": [
        "Штатная общая сборка macOS arm64/Windows x64/Linux x64 после DOCS из одного sourceCommit; проверены подпись/состав/архивы/digests и комплект в Downloads.",
        "Перед каждой production-сборкой, включая повтор и проверки Kit, удалены только проверенные Python-кэши tools/codex-app-server-mcp без перехода по симлинкам; Python-проверки -B/PYTHONDONTWRITEBYTECODE, строгий состав сохранён."
      ],
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/automatic-agent-dialogue.md",
            "required": true,
            "revision": "c9271f8f0866b122784cc05e5f47f1b4d8332ec5"
          },
          {
            "path": "docs/planning/automatic-agent-dialogue-acceptance.md",
            "required": true,
            "revision": "c9271f8f0866b122784cc05e5f47f1b4d8332ec5"
          },
          {
            "path": "docs/modules/release.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "expected_commit_message": "release: Собрать единый проверочный выпуск",
      "verification_kind": "package",
      "actual_files": [
        "release-manifest.json"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-automatic-agent-dialogue",
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
      "title": "Установить готовый macOS-комплект",
      "why": "Обновить собственную установленную копию для пользовательской проверки.",
      "acceptance_criteria": [
        "Штатный installer готового комплекта обновляет /Applications/Workflow Pilot.app и собственную копию с проверкой manifest/версии/подписи/отката без пересборки и переподписи.",
        "Работающая служба и окно не останавливаются агентом; BACKEND_RUNNING оставляет pending, завершение установки и смену активной версии выполняет пользователь, pending не выдан за активный выпуск."
      ],
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/automatic-agent-dialogue.md",
            "required": true,
            "revision": "c9271f8f0866b122784cc05e5f47f1b4d8332ec5"
          },
          {
            "path": "docs/planning/automatic-agent-dialogue-acceptance.md",
            "required": true,
            "revision": "c9271f8f0866b122784cc05e5f47f1b4d8332ec5"
          },
          {
            "path": "docs/modules/release.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "expected_commit_message": "release: Установить готовый macOS-комплект",
      "verification_kind": "installed",
      "actual_files": []
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-automatic-agent-dialogue",
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
      "title": "Опубликовать выпуск и передать S1–S3 пользователю",
      "why": "Завершить поставку и передать конкретный эксперимент без объявления непроверенной автономности.",
      "acceptance_criteria": [
        "Собственный GitHub Release: tag на sourceCommit, полный состав assets/size/digest, remote main проверен, без пересборки.",
        "Пользователь получает комплект, статус установки и инструкции S1–S3; автоматические проверки не объявлены живой приёмкой. После отчёта — принятие либо plan:extend; scope не архивируется автоматически."
      ],
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/automatic-agent-dialogue.md",
            "required": true,
            "revision": "c9271f8f0866b122784cc05e5f47f1b4d8332ec5"
          },
          {
            "path": "docs/planning/automatic-agent-dialogue-acceptance.md",
            "required": true,
            "revision": "c9271f8f0866b122784cc05e5f47f1b4d8332ec5"
          },
          {
            "path": "docs/modules/release.md",
            "required": true
          },
          {
            "path": "docs/modules/automatic-agent-dialogue-acceptance.md",
            "required": false
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "expected_commit_message": "release: Опубликовать выпуск и передать S1–S3 пользователю",
      "verification_kind": "package",
      "actual_files": []
    },
    {
      "id": "T007",
      "title": "Версионировать ресурс панели и объяснить несовместимость",
      "why": "Новый HTML не должен получать старый ключ кэша ChatGPT.",
      "dependencies": [
        "PUBLISH"
      ],
      "functional_paths": [
        "tools/codex-app-server-mcp/plugin.py",
        "src/contracts/backend.mjs",
        "src/control/plugin/communication.mjs",
        "src/frontend/plugin/launch.mjs",
        "tests/fixtures/plugin-host.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/plugin-communication.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/panel-resource-upgrade.md"
      ],
      "verification_ids": [
        "unit-all",
        "architecture"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "URI зависит от SHA-256 полного HTML; tools/list и resources/read используют один неизменяемый снимок.",
        "Прежний URI возвращает безопасное сообщение перехода без действий связи; новый инструмент не ссылается на него.",
        "Строгий отказ несовместимых build/protocol сохранён; ошибка содержит обе версии и корректные действия."
      ],
      "expected_commit_message": "feat: Версионировать ресурс панели и объяснить несовместимость",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-automatic-agent-dialogue",
        "task_id": "T007",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "docs/planning/panel-resource-upgrade.md",
        "tools/codex-app-server-mcp/plugin.py",
        "src/contracts/backend.mjs",
        "src/control/plugin/communication.mjs",
        "src/frontend/plugin/launch.mjs",
        "tests/fixtures/plugin-host.mjs",
        "tests/chatgpt-plugin.test.mjs"
      ]
    },
    {
      "id": "T008",
      "title": "Проверить переход со старого кэша и подготовить 0.5.6",
      "why": "Проверить обновление каталога и ресурса с сохранённой прежней панелью и согласованность поставки.",
      "dependencies": [
        "T007"
      ],
      "functional_paths": [
        "tests/chatgpt-plugin.test.mjs",
        "tests/fixtures/plugin-host.mjs",
        "tests/panel-resource-upgrade.test.mjs",
        "scripts/stage-chatgpt-plugin.mjs",
        "scripts/release-package.mjs",
        "scripts/check-plugin-resource.mjs",
        "tests/release-all.test.mjs",
        "tests/release-linux.test.mjs",
        "package.json",
        "package-lock.json",
        "src/contracts/backend.mjs",
        "tests/backend-upgrade.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/panel-resource-upgrade.md"
      ],
      "verification_ids": [
        "unit-all",
        "architecture",
        "electron-smoke"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Изолированный host с кэшем прежнего URI после обновления настоящего каталога загружает новый HTML и автоматически связывает O без ручных полей.",
        "Изменения HTML/JS/CSS дают новый URI; текущий MCP не меняет содержимое опубликованного снимка.",
        "Проверка комплекта отвергает несогласованный HTML/build/protocol/ресурс; app/package/lock/backend согласованы на 0.5.6.",
        "Живая панель ChatGPT остаётся отдельной пользовательской проверкой; исходники Kit не меняются."
      ],
      "expected_commit_message": "feat: Проверить переход со старого кэша и подготовить 0.5.6",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-automatic-agent-dialogue",
        "task_id": "T008",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "docs/planning/panel-resource-upgrade.md",
        "package-lock.json",
        "package.json",
        "scripts/check-plugin-resource.mjs",
        "scripts/release-package.mjs",
        "scripts/stage-chatgpt-plugin.mjs",
        "src/contracts/backend.mjs",
        "tests/backend-upgrade.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/fixtures/plugin-host.mjs",
        "tests/panel-resource-upgrade.test.mjs",
        "tests/release-all.test.mjs"
      ]
    },
    {
      "id": "DOCS-2",
      "title": "Актуализация всех документов проекта",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-automatic-agent-dialogue",
        "task_id": "DOCS-2",
        "role": "implementation",
        "iteration": 2
      },
      "why": "Перед выпуском сверить README, OVERVIEW и действующие контракты модулей с результатом; обновить устаревшее.",
      "dependencies": [
        "T007",
        "T008"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/architecture/OVERVIEW.md",
        "docs/planning/panel-resource-upgrade.md"
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
      "title": "Собрать исправленный единый выпуск 0.5.6",
      "why": "Собрать исправленный единый выпуск 0.5.6",
      "dependencies": [
        "T008",
        "DOCS-2"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/panel-resource-upgrade.md"
      ],
      "verification_ids": [
        "three-platform-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "После DOCS-2 собраны macOS arm64, Windows x64, Linux x64 из одного sourceCommit; комплект и архивы проверены.",
        "Перед production build проверены и удалены только Python-кэши tools/codex-app-server-mcp без симлинков."
      ],
      "expected_commit_message": "feat: Собрать исправленный единый выпуск 0.5.6",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-automatic-agent-dialogue",
        "task_id": "RELEASE-2",
        "role": "implementation"
      },
      "parallel_safe": false
    },
    {
      "id": "INSTALL-2",
      "title": "Установить готовый комплект 0.5.6",
      "why": "Установить готовый комплект 0.5.6",
      "dependencies": [
        "RELEASE-2",
        "DOCS-2"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/panel-resource-upgrade.md"
      ],
      "verification_ids": [
        "release-installed"
      ],
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Штатный installer обновляет собственные копии готовым bundle без пересборки; подпись, состав и rollback проверены.",
        "Работающая служба не останавливается; подтверждённый pending явно отличён от активной новой версии."
      ],
      "expected_commit_message": "feat: Установить готовый комплект 0.5.6",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-automatic-agent-dialogue",
        "task_id": "INSTALL-2",
        "role": "implementation"
      },
      "parallel_safe": false
    },
    {
      "id": "PUBLISH-2",
      "title": "Опубликовать 0.5.6 и передать повторную проверку",
      "why": "Опубликовать 0.5.6 и передать повторную проверку",
      "dependencies": [
        "INSTALL-2",
        "DOCS-2"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/panel-resource-upgrade.md"
      ],
      "verification_ids": [
        "github-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "GitHub Release опубликован в собственном репозитории; тег на sourceCommit, все assets, размеры и digests совпадают; remote main проверен.",
        "Пользователю переданы статус установки и шаги свежего вызова панели после обновления инструментов; живая приёмка не объявлена пройденной."
      ],
      "expected_commit_message": "feat: Опубликовать 0.5.6 и передать повторную проверку",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-automatic-agent-dialogue",
        "task_id": "PUBLISH-2",
        "role": "implementation"
      },
      "parallel_safe": false
    }
  ],
  "blocked_reason": null,
  "user_decisions": [
    {
      "id": "b348c675-4352-4966-be8a-32cb9f23f275",
      "text": "19.10.2026 пользователь поручил закрыть прежний план как предположительно выполненный и составить спецификацию и новый to-do модификации Workflow Pilot, панели, backend и инструкций оркестратора/исполнителей. Отдельно подтвердил реализацию здесь одним агентом, как предыдущего плана. Подготовка плана не запускает реализацию или живые модели; тестирование нового механизма включает 2–3 исполнителя.",
      "recorded_at": "2026-10-19T07:56:38.484Z"
    }
  ],
  "parallel_allowed": false,
  "max_workers": 1,
  "execution_strategy": "sequential",
  "execution_reason": "Прямой выбор пользователя 19.10.2026: здесь одним агентом, как предыдущий план. Реализация меняет общие контракты регистрации/доставки/Kit и выполняется последовательно; несколько исполнителей относятся к продуктовым fixtures и внешней приёмке, не к делегированию этой разработки."
}
```
<!-- workflow-state:end -->

## Состояние

Execution Scope Status: ACTIVE
Delivery Status: IN_PROGRESS
Scope: workflow-pilot-automatic-agent-dialogue
Current Task: нет
Revision: 558

## Цель

Пользователь одним запуском плана автоматически подключает оркестратора и исполнителей; исполнитель сообщает техническую блокировку, получает решение и продолжает задачу без ручных ID, Enable и пользовательского продолжения.

## Критерии приёмки

- Первое сообщение автоматически открывает панель будущего оркестратора; обсуждение/Review/публикация сохраняются, публикация сама выполнение не запускает.
- Один Start создаёт и связывает исполнителей с назначениями; пользователь не вводит ID, не открывает их панели и не включает связь отдельно. Один O и пять E поддержаны в коде и fixtures.
- Вопрос/решение привязаны к конкретной блокировке и назначению; исполнитель после ответа продолжает ту же задачу, оркестратор устраняет обычные технические препятствия без пользователя.
- Готовность SDK/identity, срок плана, занятость/черновик, Stop/пауза/restart/завершение и unknown-no-retry проверены; DOM-дублей нет, Kit сохраняет полномочия и доказательства DONE.
- Единый выпуск трёх платформ, штатная установка и сценарии S1–S3 переданы; живая автономность требует отдельного пользовательского PASS и не выводится из fixtures.

## Микрозадачи

Выполнение: sequential; разрешено: false; лимит: 1
Причина: Прямой выбор пользователя 19.10.2026: здесь одним агентом, как предыдущий план. Реализация меняет общие контракты регистрации/доставки/Kit и выполняется последовательно; несколько исполнителей относятся к продуктовым fixtures и внешней приёмке, не к делегированию этой разработки.

- [DONE] T001: Реестр участников и регистрация по назначению — Завершено
  - Git Commit: [DONE] feat: Реестр участников и регистрация по назначению
  - Reference: workflow-pilot-automatic-agent-dialogue / T001 / implementation
  - Файлы: src/control/plugin/communication.mjs, src/control/plugin/service.mjs, src/control/plugin/enrollment.mjs, src/control/sessions/workspace-session.mjs, src/control/projects/service.mjs, src/execution/plugin/communication-store.mjs, src/execution/plugin/bridge.mjs, src/contracts/backend.mjs, src/backend/desktop-model.mjs, tools/codex-app-server-mcp/plugin.py, tests/plugin-communication.test.mjs, tests/plugin-communication-store.test.mjs, tests/plugin-enrollment.test.mjs, tests/codex-app-server-mcp.test.mjs, tests/session-roles.test.mjs, tests/backend-protocol.test.mjs, tests/chatgpt-plugin.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] T002: Автоматический запуск панели оркестратора и исполнителей — Завершено
  - Git Commit: [DONE] feat: Автоматический запуск панели оркестратора и исполнителей
  - Reference: workflow-pilot-automatic-agent-dialogue / T002 / implementation
  - Файлы: src/control/context/context-session.mjs, src/control/context/service.mjs, src/control/sessions/workspace-session.mjs, src/control/workflow/coordination.mjs, src/control/workflow/executor-session.mjs, src/control/plugin/enrollment.mjs, src/control/plugin/service.mjs, src/control/plugin/communication.mjs, src/frontend/plugin/app.mjs, src/frontend/plugin/launch.mjs, src/frontend/plugin/panel.mjs, src/frontend/plugin/index.html, src/backend/desktop-model.mjs, src/contracts/backend.mjs, src/execution/plugin/bridge.mjs, tools/codex-app-server-mcp/plugin.py, tests/context-session.test.mjs, tests/chatgpt-plugin.test.mjs, tests/plugin-enrollment.test.mjs, tests/orchestrated-execution.test.mjs, tests/electron-smoke.mjs, src/control/workflow/execution-control.mjs, tests/codex-app-server-mcp.test.mjs, tests/execution-control.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: T001
- [DONE] T003: Связать разрешение и доставку с выполнением плана — Завершено
  - Git Commit: [DONE] feat: Связать разрешение и доставку с выполнением плана
  - Reference: workflow-pilot-automatic-agent-dialogue / T003 / implementation
  - Файлы: src/control/workflow/coordination.mjs, src/control/workflow/parallel-execution.mjs, src/control/workflow/executor-session.mjs, src/control/workflow/execution-control.mjs, src/control/workflow/project-session-plan-continuation.mjs, src/control/workflow/plan-continuation.mjs, src/control/workflow/automation-send-state.mjs, src/control/workflow/dialogue-delivery.mjs, src/control/plugin/communication.mjs, src/control/plugin/enrollment.mjs, src/control/plugin/service.mjs, src/control/facade.mjs, src/execution/facade.mjs, src/backend/desktop-model.mjs, src/contracts/backend.mjs, src/frontend/plugin/launch.mjs, src/frontend/plugin/panel.mjs, src/frontend/plugin/index.html, tools/codex-app-server-mcp/plugin.py, tests/plugin-communication.test.mjs, tests/chatgpt-plugin.test.mjs, tests/orchestrated-execution.test.mjs, tests/execution-control.test.mjs, tests/parallel-execution.test.mjs, tests/parallel-execution-recovery.test.mjs, tests/plan-continuation.test.mjs, tests/backend-end-to-end.test.mjs, src/control/projects/service.mjs, src/control/sessions/workspace-session.mjs, src/control/workflow/plan-continuation-state.mjs, src/execution/plugin/communication-store.mjs, tests/codex-app-server-mcp.test.mjs, src/control/plugin/workflow-channel.mjs, tests/workflow-channel.test.mjs, src/frontend/desktop/bootstrap.mjs, tests/product-identity.test.mjs, tests/web-client-electron.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: T002
- [DONE] T004: Автономное разрешение блокировок и согласованные инструкции — Завершено
  - Git Commit: [DONE] feat: Автономное разрешение блокировок и согласованные инструкции
  - Reference: workflow-pilot-automatic-agent-dialogue / T004 / implementation
  - Файлы: packages/workflow-kit/src/lib/signals.mjs, packages/workflow-kit/src/lib/recovery.mjs, packages/workflow-kit/src/cli.mjs, packages/workflow-kit/src/lib/command-help.mjs, packages/workflow-kit/scripts/check-orchestrated-execution-fixture.mjs, packages/workflow-kit/scripts/check-project-recovery-fixture.mjs, src/control/context/context-session.mjs, src/control/workflow/parallel-kit.mjs, src/control/workflow/parallel-execution.mjs, src/control/workflow/dialogue-delivery.mjs, src/control/workflow/executor-session.mjs, src/control/plugin/communication.mjs, src/execution/runtime/service.mjs, tools/codex-app-server-mcp/plugin.py, tools/codex-app-server-mcp/server.py, tests/context-session.test.mjs, tests/workflow-kit-recovery.test.mjs, tests/orchestrated-execution.test.mjs, tests/parallel-execution.test.mjs, tests/chatgpt-plugin.test.mjs, src/backend/desktop-model.mjs, src/control/plugin/service.mjs, src/control/plugin/workflow-channel.mjs, src/control/workflow/coordination.mjs, src/control/workflow/plan-continuation-state.mjs, src/frontend/plugin/index.html, src/frontend/plugin/launch.mjs, src/frontend/plugin/panel.mjs, tests/workflow-channel.test.mjs, packages/workflow-kit/src/lib/role-protocol.mjs, packages/workflow-kit/src/lib/signal-state.mjs, tests/workflow-signals.test.mjs, packages/workflow-kit/src/WORKFLOW.md, packages/workflow-kit/src/templates/PROTOTYPE.md, packages/workflow-kit/docs/modules/orchestrated-plans.md, AGENTS.md, docs/acceptance/orchestrated-execution.md
  - Параллельность: исключительное выполнение
  - Зависимости: T003
- [DONE] T005: Сквозная матрица и комплект трёх живых сценариев — Завершено
  - Git Commit: [DONE] feat: Сквозная матрица и комплект трёх живых сценариев
  - Reference: workflow-pilot-automatic-agent-dialogue / T005 / implementation
  - Файлы: tests/automatic-agent-dialogue.test.mjs, tests/fixtures/automatic-agent-dialogue.mjs, tests/chatgpt-plugin.test.mjs, tests/plugin-communication.test.mjs, tests/plugin-communication-store.test.mjs, tests/orchestrated-execution.test.mjs, tests/execution-control.test.mjs, tests/context-session.test.mjs, tests/electron-smoke.mjs, scripts/prepare-agent-dialogue-experiment.mjs, packages/workflow-kit/scripts/check-parallel-plan-fixture.mjs, packages/workflow-kit/src/lib/simple-workflow.mjs, src/control/plugin/enrollment.mjs, tests/dialogue-experiment.test.mjs, tests/fixtures/plugin-host.mjs, tests/mac-runtime-switch.test.mjs, docs/modules/automatic-agent-dialogue-acceptance.md, docs/modules/plugin-communication-handoff.md, docs/modules/execution.md
  - Параллельность: исключительное выполнение
  - Зависимости: T004
- [DONE] T006: Согласовать версии и совместимость поставки — Завершено
  - Git Commit: [DONE] feat: Согласовать версии и совместимость поставки
  - Reference: workflow-pilot-automatic-agent-dialogue / T006 / implementation
  - Файлы: package.json, package-lock.json, packages/workflow-kit/package.json, packages/workflow-kit/src/lib/common.mjs, scripts/stage-workflow-kit.mjs, scripts/stage-chatgpt-plugin.mjs, src/contracts/backend.mjs, tests/backend-upgrade.test.mjs, tests/mcp-runtime.test.mjs, tests/workflow-kit-recovery.test.mjs, tests/codex-app-server-mcp.test.mjs, packages/workflow-kit/scripts/check-previous-upgrade-fixture.mjs, tools/codex-app-server-mcp/plugin.py, tests/chatgpt-plugin.test.mjs, tests/parallel-execution-recovery.test.mjs, packages/workflow-kit/src/lib/installer.mjs, tests/backend-end-to-end.test.mjs, scripts/check-installed-release.mjs, scripts/release-mac.mjs, tests/release-mac.test.mjs, tests/workflow-kit-upgrade.test.mjs, tests/fixtures/released-kit/manifest.json, tests/fixtures/released-kit/kit-1.8.1.tar.gz, docs/modules/release.md
  - Параллельность: исключительное выполнение
  - Зависимости: T005
- [DONE] DOCS: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: Актуализация всех документов проекта
  - Reference: workflow-pilot-automatic-agent-dialogue / DOCS / implementation
  - Файлы: README.md, AGENTS.md, docs/architecture/OVERVIEW.md, docs/modules/chatgpt-plugin.md, docs/modules/chatgpt-plugin-acceptance.md, docs/modules/automatic-agent-dialogue-acceptance.md, docs/modules/plugin-communication-handoff.md, docs/modules/orchestrated-execution.md, docs/modules/workflow-execution.md, docs/acceptance/orchestrated-execution.md, docs/modules/execution.md, docs/modules/control.md, docs/modules/backend.md, docs/modules/browser.md, docs/modules/desktop.md, docs/modules/project-compatibility.md, docs/modules/release.md, packages/workflow-kit/docs/modules/orchestrated-plans.md, packages/workflow-kit/docs/modules/parallel-assignments.md, packages/workflow-kit/docs/modules/workflow-kit-package.md, docs/planning/plugin-plan-lifetime.md, docs/planning/automatic-agent-dialogue.md, docs/planning/automatic-agent-dialogue-acceptance.md, packages/workflow-kit/src/WORKFLOW.md, packages/workflow-kit/src/templates/PROTOTYPE.md
  - Параллельность: исключительное выполнение
  - Зависимости: T001, T002, T003, T004, T005, T006
- [DONE] RELEASE: Собрать единый проверочный выпуск — Завершено
  - Git Commit: [DONE] release: Собрать единый проверочный выпуск
  - Reference: workflow-pilot-automatic-agent-dialogue / RELEASE / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: DOCS
- [DONE] INSTALL: Установить готовый macOS-комплект — Завершено
  - Git Commit: [DONE] release: Установить готовый macOS-комплект
  - Reference: workflow-pilot-automatic-agent-dialogue / INSTALL / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: RELEASE, DOCS
- [DONE] PUBLISH: Опубликовать выпуск и передать S1–S3 пользователю — Завершено
  - Git Commit: [DONE] release: Опубликовать выпуск и передать S1–S3 пользователю
  - Reference: workflow-pilot-automatic-agent-dialogue / PUBLISH / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: INSTALL, DOCS
- [DONE] T007: Версионировать ресурс панели и объяснить несовместимость — Завершено
  - Git Commit: [DONE] feat: Версионировать ресурс панели и объяснить несовместимость
  - Reference: workflow-pilot-automatic-agent-dialogue / T007 / implementation
  - Файлы: tools/codex-app-server-mcp/plugin.py, src/contracts/backend.mjs, src/control/plugin/communication.mjs, src/frontend/plugin/launch.mjs, tests/fixtures/plugin-host.mjs, tests/chatgpt-plugin.test.mjs, tests/plugin-communication.test.mjs, docs/planning/panel-resource-upgrade.md
  - Параллельность: исключительное выполнение
  - Зависимости: PUBLISH
- [DONE] T008: Проверить переход со старого кэша и подготовить 0.5.6 — Завершено
  - Git Commit: [DONE] feat: Проверить переход со старого кэша и подготовить 0.5.6
  - Reference: workflow-pilot-automatic-agent-dialogue / T008 / implementation
  - Файлы: tests/chatgpt-plugin.test.mjs, tests/fixtures/plugin-host.mjs, tests/panel-resource-upgrade.test.mjs, scripts/stage-chatgpt-plugin.mjs, scripts/release-package.mjs, scripts/check-plugin-resource.mjs, tests/release-all.test.mjs, tests/release-linux.test.mjs, package.json, package-lock.json, src/contracts/backend.mjs, tests/backend-upgrade.test.mjs, docs/planning/panel-resource-upgrade.md
  - Параллельность: исключительное выполнение
  - Зависимости: T007
- [TODO] DOCS-2: Актуализация всех документов проекта — Ожидает
  - Git Commit: [PENDING] docs: актуализировать документацию проекта
  - Reference: workflow-pilot-automatic-agent-dialogue / DOCS-2 / implementation
  - Файлы: docs/architecture/OVERVIEW.md, docs/planning/panel-resource-upgrade.md
  - Параллельность: исключительное выполнение
  - Зависимости: T007, T008
- [TODO] RELEASE-2: Собрать исправленный единый выпуск 0.5.6 — Ожидает
  - Git Commit: [PENDING] feat: Собрать исправленный единый выпуск 0.5.6
  - Reference: workflow-pilot-automatic-agent-dialogue / RELEASE-2 / implementation
  - Файлы: release-manifest.json, docs/planning/panel-resource-upgrade.md
  - Параллельность: исключительное выполнение
  - Зависимости: T008, DOCS-2
- [TODO] INSTALL-2: Установить готовый комплект 0.5.6 — Ожидает
  - Git Commit: [PENDING] feat: Установить готовый комплект 0.5.6
  - Reference: workflow-pilot-automatic-agent-dialogue / INSTALL-2 / implementation
  - Файлы: release-manifest.json, docs/planning/panel-resource-upgrade.md
  - Параллельность: исключительное выполнение
  - Зависимости: RELEASE-2, DOCS-2
- [TODO] PUBLISH-2: Опубликовать 0.5.6 и передать повторную проверку — Ожидает
  - Git Commit: [PENDING] feat: Опубликовать 0.5.6 и передать повторную проверку
  - Reference: workflow-pilot-automatic-agent-dialogue / PUBLISH-2 / implementation
  - Файлы: release-manifest.json, docs/planning/panel-resource-upgrade.md
  - Параллельность: исключительное выполнение
  - Зависимости: INSTALL-2, DOCS-2

## Context Pack For This Cycle

- docs/planning/automatic-agent-dialogue.md
- docs/planning/automatic-agent-dialogue-acceptance.md
- docs/architecture/OVERVIEW.md
- docs/planning/panel-resource-upgrade.md

Служебные состояния меняются только командами workflow. Приёмка не архивирует scope.
