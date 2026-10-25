# Активный план — Workflow_Pilot

<!-- workflow-state:begin -->
```json
{
  "schema_version": 1,
  "plan_revision": 1073,
  "project_id": "7411e192-943c-4529-bffb-3b081d9c242f",
  "project_name": "Workflow_Pilot",
  "scope_id": "release-0533-defects",
  "execution_scope_status": "ACTIVE",
  "delivery_status": "IN_PROGRESS",
  "objective": "Устранить все D001–D011 тестирования 0.5.33: восстановить канал и Continue, подготовить поручения до Start, убрать дубли и недостоверные статусы.",
  "acceptance_criteria": [
    "Все D001–D011 из трёх частей журнала перенесены без потери требований и имеют отдельные критерии/задачи.",
    "Канал O/E восстанавливает generation/lease без вечного ожидания и без повторного Send; истинные границы identity и manual pause сохранены.",
    "Подготовленный авторский пакет и контекст согласованы до Start; оба независимых E запускаются без обязательного нового хода O для подготовки.",
    "Один current action, полный перенос инструкций, точные actor/stage/recipient, нет дублирующих choice/startup в sidebar.",
    "Автоматические fixtures/обе части Kit проходят; pending live/native приёмка и отсутствие delivery явно указаны."
  ],
  "approved_scope": {
    "functional_paths": [
      "src/frontend/plugin/launch.mjs",
      "src/control/plugin/communication.mjs",
      "src/control/plugin/workflow-channel.mjs",
      "src/contracts/plugin-communication.mjs",
      "tools/codex-app-server-mcp/plugin.py",
      "tests/plugin-communication.test.mjs",
      "tests/workflow-channel.test.mjs",
      "tests/chatgpt-plugin.test.mjs",
      "tests/fixtures/plugin-host.mjs",
      "packages/workflow-kit/src/lib/installation-files.mjs",
      "packages/workflow-kit/src/lib/installer.mjs",
      "packages/workflow-kit/scripts/check-previous-upgrade-fixture.mjs",
      "tests/workflow-kit-upgrade.test.mjs",
      "tests/workflow-kit-source.test.mjs",
      "src/control/workflow/execution-control.mjs",
      "src/control/workflow/parallel-execution.mjs",
      "src/control/workflow/coordination.mjs",
      "src/backend/desktop-model.mjs",
      "tests/execution-control.test.mjs",
      "tests/parallel-execution.test.mjs",
      "tests/parallel-execution-recovery.test.mjs",
      "tests/backend-api.test.mjs",
      "src/control/workflow/parallel-kit.mjs",
      "src/control/projects/project-doctor.mjs",
      "src/frontend/desktop/ui/workspace-setup.mjs",
      "packages/workflow-kit/src/lib/plan.mjs",
      "packages/workflow-kit/src/lib/plan-review.mjs",
      "packages/workflow-kit/src/lib/review-state.mjs",
      "packages/workflow-kit/src/lib/assignment-dialogue.mjs",
      "packages/workflow-kit/src/lib/assignment-contract.mjs",
      "packages/workflow-kit/src/lib/role-protocol.mjs",
      "packages/workflow-kit/src/lib/actions.mjs",
      "packages/workflow-kit/src/schemas/plan.schema.json",
      "packages/workflow-kit/src/templates/PLAN.md",
      "src/control/plugin/assignment-dialogue.mjs",
      "src/control/workflow/dialogue-delivery.mjs",
      "src/control/plugin/startup-context.mjs",
      "tests/automatic-agent-dialogue.test.mjs",
      "tests/fixtures/automatic-agent-dialogue.mjs",
      "tests/dialogue-delivery.test.mjs",
      "packages/workflow-kit/scripts/check-plan-review-fixture.mjs",
      "packages/workflow-kit/src/lib/recovery.mjs",
      "packages/workflow-kit/src/lib/simple-workflow.mjs",
      "packages/workflow-kit/src/lib/dialogue-migration.mjs",
      "packages/workflow-kit/src/lib/validate.mjs",
      "packages/workflow-kit/src/lib/validation-rules.mjs",
      "src/contracts/startup-view.mjs",
      "src/control/context/context-session.mjs",
      "tests/startup-ui.test.mjs",
      "tests/context-session.test.mjs",
      "tests/backend-desktop-model.test.mjs",
      "src/control/sessions/workspace-session.mjs",
      "src/contracts/work-progress.mjs",
      "src/contracts/user-choice.mjs",
      "src/control/workflow/user-choices.mjs",
      "src/control/workflow/plan-review.mjs",
      "tests/work-progress.test.mjs",
      "tests/work-progress-scenario.test.mjs",
      "tests/session-roles.test.mjs",
      "tests/user-choices.test.mjs",
      "tests/user-choice-view.test.mjs",
      "src/frontend/desktop/ui/sidebar.mjs",
      "src/frontend/desktop/ui/index.html",
      "src/frontend/plugin/panel.mjs",
      "src/frontend/plugin/index.html",
      "src/frontend/desktop/client.mjs",
      "src/frontend/web/index.html",
      "tests/sidebar.test.mjs",
      "tests/panel-dialogue-view.test.mjs",
      "tests/desktop-client.test.mjs",
      "src/frontend/web/app.mjs",
      "src/frontend/desktop/browser-host.mjs",
      "src/frontend/client/browser-view.mjs",
      "tests/fixtures/web-client-browser.mjs",
      "tests/electron-smoke.mjs",
      "package.json",
      "package-lock.json",
      "packages/workflow-kit/package.json",
      "packages/workflow-kit/src/lib/common.mjs",
      "src/contracts/backend.mjs",
      "tests/codex-app-server-mcp.test.mjs",
      "tests/migration-compatibility.test.mjs",
      "release-manifest.json"
    ],
    "documentation_paths": [
      "docs/planning/release-0533-defects.md",
      "docs/planning/release-0533-defects-execution.md",
      "docs/planning/release-0533-defects-ui.md",
      "README.md",
      "docs/architecture/OVERVIEW.md",
      "docs/modules/assignment-dialogue.md",
      "docs/modules/assignment-dialogue-reliability.md",
      "docs/modules/chatgpt-plugin.md",
      "docs/modules/chat-only-startup.md",
      "docs/modules/orchestrator-startup.md",
      "docs/modules/dialogue-timing.md",
      "docs/modules/user-choice.md",
      "docs/modules/desktop.md",
      "docs/modules/native-window.md",
      "docs/modules/remote-access.md",
      "docs/modules/orchestrated-execution.md",
      "docs/modules/workflow-execution.md",
      "docs/modules/project-compatibility.md",
      "docs/acceptance/interruption-recovery.md",
      "packages/workflow-kit/docs/modules/orchestrated-plans.md",
      "packages/workflow-kit/docs/modules/workflow-kit-package.md"
    ]
  },
  "baseline_commit": "5f3ed62a14259308042754032a378503d461d0df",
  "current_task_id": null,
  "context_pack": {
    "documents": [
      {
        "path": "docs/planning/release-0533-defects-execution.md",
        "required": true,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/planning/release-0533-defects-ui.md",
        "required": true,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/architecture/OVERVIEW.md",
        "required": true,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/planning/release-0533-defects.md",
        "required": true,
        "revision": "WORKTREE"
      }
    ],
    "include_last_completed_task": false,
    "dependency_task_ids": []
  },
  "tasks": [
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "release-0533-defects",
        "task_id": "CHANNEL",
        "role": "implementation"
      },
      "dependencies": [],
      "functional_paths": [
        "src/frontend/plugin/launch.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/contracts/plugin-communication.mjs",
        "tools/codex-app-server-mcp/plugin.py",
        "tests/plugin-communication.test.mjs",
        "tests/workflow-channel.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/fixtures/plugin-host.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "chatgpt-plugin",
        "executor-channel",
        "codex-tools-live"
      ],
      "id": "CHANNEL",
      "title": "Восстановить канал после смены generation и lease",
      "why": "Исправить D011 по части execution: сначала воспроизвести generation/lease и generic MCP error на изолированном host fixture, затем исправить existing wait→status→sync без второго канала. Сохранить identity, grant, epoch/abort, UNKNOWN и изоляцию соседей; доказать работу O и двух E, terminal и manual pause.",
      "acceptance_criteria": [
        "D011 воспроизведён: generation/lease change с сохранённым и потерянным структурированным STOPPED больше не даёт вечного wait без sync.",
        "Один recovery/listen; поздний callback не меняет новый binding, pause/Stop/complete не обходятся.",
        "Безопасные причины readiness согласованы в status/progress/admission; уже записанный SDK intent не повторяется."
      ],
      "expected_commit_message": "fix: восстановить канал после смены generation и lease",
      "parallel_safe": false,
      "task_brief": "Исправить D011 по части execution: сначала воспроизвести generation/lease и generic MCP error на изолированном host fixture, затем исправить existing wait→status→sync без второго канала. Сохранить identity, grant, epoch/abort, UNKNOWN и изоляцию соседей; доказать работу O и двух E, terminal и manual pause. Перед изменениями прочитать перечисленные reference-only контракты по относящемуся механизму из checkout.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/release-0533-defects.md",
            "required": true
          },
          {
            "path": "docs/planning/release-0533-defects-execution.md",
            "required": true
          },
          {
            "path": "docs/planning/release-0533-defects-ui.md",
            "required": true
          },
          {
            "path": "docs/modules/chatgpt-plugin.md",
            "required": false
          },
          {
            "path": "docs/modules/assignment-dialogue-reliability.md",
            "required": false
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
        "scope_id": "release-0533-defects",
        "task_id": "GIT",
        "role": "implementation"
      },
      "dependencies": [],
      "functional_paths": [
        "packages/workflow-kit/src/lib/installation-files.mjs",
        "packages/workflow-kit/src/lib/installer.mjs",
        "packages/workflow-kit/scripts/check-previous-upgrade-fixture.mjs",
        "tests/workflow-kit-upgrade.test.mjs",
        "tests/workflow-kit-source.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "kit-check",
        "kit-assignments",
        "kit-upgrade",
        "unit-all"
      ],
      "id": "GIT",
      "title": "Исключить Finder metadata штатным installer Kit",
      "why": "Исправить D008 в исходниках installer Kit, точное общее .DS_Store, установка/обновление с сохранением user sections. Проверять настоящим Git и неизменяемыми consumer fixtures. Установленную .harness/kit вручную не менять, Test_001 и donor не трогать.",
      "acceptance_criteria": [
        "D008: .DS_Store root/nested игнорируется после install/upgrade в новых и существующих workspace/worktree.",
        "Installer идемпотентен, сохраняет пользовательские правила/manifest; нет глобальных Git-изменений, удаления файлов или untrack.",
        "Tracked .DS_Store, новый пользовательский файл и изменённый исходник по-прежнему блокируют запуск."
      ],
      "expected_commit_message": "fix: исключить finder metadata штатным installer kit",
      "parallel_safe": false,
      "task_brief": "Исправить D008 в исходниках installer Kit, точное общее .DS_Store, установка/обновление с сохранением user sections. Проверять настоящим Git и неизменяемыми consumer fixtures. Установленную .harness/kit вручную не менять, Test_001 и donor не трогать. Перед изменениями прочитать перечисленные reference-only контракты по относящемуся механизму из checkout.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/release-0533-defects.md",
            "required": true
          },
          {
            "path": "docs/planning/release-0533-defects-execution.md",
            "required": true
          },
          {
            "path": "docs/planning/release-0533-defects-ui.md",
            "required": true
          },
          {
            "path": "docs/modules/project-compatibility.md",
            "required": false
          },
          {
            "path": "packages/workflow-kit/docs/modules/workflow-kit-package.md",
            "required": false
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
        "scope_id": "release-0533-defects",
        "task_id": "BLOCK",
        "role": "implementation"
      },
      "dependencies": [
        "CHANNEL",
        "GIT"
      ],
      "functional_paths": [
        "src/control/workflow/execution-control.mjs",
        "src/control/workflow/parallel-execution.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/control/workflow/coordination.mjs",
        "src/backend/desktop-model.mjs",
        "tests/execution-control.test.mjs",
        "tests/parallel-execution.test.mjs",
        "tests/parallel-execution-recovery.test.mjs",
        "tests/backend-api.test.mjs",
        "src/control/workflow/parallel-kit.mjs",
        "src/control/projects/project-doctor.mjs",
        "src/frontend/desktop/ui/workspace-setup.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "architecture"
      ],
      "id": "BLOCK",
      "title": "Согласовать техническую паузу и действие Продолжить",
      "why": "Исправить D009 и связь с D008/D011 в существующем ExecutionControl. Согласовать persisted state, grant и preflight, техническую причину и безопасные paths. Доказать Start/Continue через API, не только внутреннюю функцию; сохранить manual pause и активные команды.",
      "acceptance_criteria": [
        "D009: MAIN_DIRTY до выдачи даёт paused/blocked и Continue, а не running/Пауза; мешающие пути доступны.",
        "Continue со свежим preflight: dirty сохраняет блокировку без эффектов; clean одним нажатием продолжает тот же scope.",
        "Пауза с активным E ждёт безопасную границу; restart/manual/UNKNOWN и повторные нажатия не создают лишних эффектов.",
        "При неприменённом managed .DS_Store правиле до Start доступно штатное предложение kit-update/project-doctor; обновление не обходит настоящую dirty-защиту."
      ],
      "expected_commit_message": "fix: согласовать техническую паузу и действие продолжить",
      "parallel_safe": false,
      "task_brief": "Исправить D009 и связь с D008/D011 в существующем ExecutionControl. Согласовать persisted state, grant и preflight, техническую причину и безопасные paths. Доказать Start/Continue через API, не только внутреннюю функцию; сохранить manual pause и активные команды. Перед изменениями прочитать перечисленные reference-only контракты по относящемуся механизму из checkout.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/release-0533-defects.md",
            "required": true
          },
          {
            "path": "docs/planning/release-0533-defects-execution.md",
            "required": true
          },
          {
            "path": "docs/planning/release-0533-defects-ui.md",
            "required": true
          },
          {
            "path": "docs/modules/orchestrated-execution.md",
            "required": false
          },
          {
            "path": "docs/modules/workflow-execution.md",
            "required": false
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
        "scope_id": "release-0533-defects",
        "task_id": "PREPARE",
        "role": "implementation"
      },
      "dependencies": [
        "CHANNEL",
        "BLOCK"
      ],
      "functional_paths": [
        "packages/workflow-kit/src/lib/plan.mjs",
        "packages/workflow-kit/src/lib/plan-review.mjs",
        "packages/workflow-kit/src/lib/review-state.mjs",
        "packages/workflow-kit/src/lib/assignment-dialogue.mjs",
        "packages/workflow-kit/src/lib/assignment-contract.mjs",
        "packages/workflow-kit/src/lib/role-protocol.mjs",
        "packages/workflow-kit/src/lib/actions.mjs",
        "packages/workflow-kit/src/schemas/plan.schema.json",
        "packages/workflow-kit/src/templates/PLAN.md",
        "src/control/plugin/assignment-dialogue.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/control/plugin/startup-context.mjs",
        "tools/codex-app-server-mcp/plugin.py",
        "tests/automatic-agent-dialogue.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/dialogue-delivery.test.mjs",
        "packages/workflow-kit/scripts/check-plan-review-fixture.mjs",
        "packages/workflow-kit/src/lib/recovery.mjs",
        "packages/workflow-kit/src/lib/simple-workflow.mjs",
        "packages/workflow-kit/src/lib/dialogue-migration.mjs",
        "packages/workflow-kit/src/lib/validate.mjs",
        "packages/workflow-kit/src/lib/validation-rules.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "kit-check",
        "kit-assignments",
        "executor-channel",
        "codex-tools-live",
        "architecture"
      ],
      "id": "PREPARE",
      "title": "Подготовить авторские поручения и контекст до Start",
      "why": "Реализовать D010 строго по execution-спецификации: готовое авторское содержание и проверяемые байты контекста до публикации, не формальный early brief. Переиспользовать план Kit, Review digest, content store и assignment/WAL; после Start только механическая binding/authorization с актуальным grant. Проверить два E, DOCS, зависимости, старые Chat-планы, повторное сохранение и сбои. Backend не сочиняет поручения и не обходит автора/Review.",
      "acceptance_criteria": [
        "D010: новые orchestrated-планы сохраняют task_brief+явный prepared_task и immutable context до Review/Start, включая DOCS; hash связан с author/project/scope/semantic task.",
        "Start механически связывает согласованный пакет с настоящим assignment/attempt, авторизует и доставляет независимо каждому E без обязательного дополнительного модельного хода O.",
        "Доказаны stale/cancel/revoke/UNKNOWN и crash points intent→Kit→WAL; зависимые факты только по принятому результату, brief-only планы не авторизуются задним числом.",
        "Единый role-protocol, recovery, startup, шаблоны, MCP contract и validation не противоречат ранней подготовке."
      ],
      "expected_commit_message": "fix: подготовить авторские поручения и контекст до start",
      "parallel_safe": false,
      "task_brief": "Реализовать D010 строго по execution-спецификации: готовое авторское содержание и проверяемые байты контекста до публикации, не формальный early brief. Переиспользовать план Kit, Review digest, content store и assignment/WAL; после Start только механическая binding/authorization с актуальным grant. Проверить два E, DOCS, зависимости, старые Chat-планы, повторное сохранение и сбои. Backend не сочиняет поручения и не обходит автора/Review. Перед изменениями прочитать перечисленные reference-only контракты по относящемуся механизму из checkout.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/release-0533-defects.md",
            "required": true
          },
          {
            "path": "docs/planning/release-0533-defects-execution.md",
            "required": true
          },
          {
            "path": "docs/planning/release-0533-defects-ui.md",
            "required": true
          },
          {
            "path": "docs/modules/assignment-dialogue.md",
            "required": false
          },
          {
            "path": "docs/modules/assignment-dialogue-reliability.md",
            "required": false
          },
          {
            "path": "docs/modules/dialogue-timing.md",
            "required": false
          },
          {
            "path": "docs/modules/orchestrator-startup.md",
            "required": false
          },
          {
            "path": "packages/workflow-kit/docs/modules/orchestrated-plans.md",
            "required": false
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
        "scope_id": "release-0533-defects",
        "task_id": "STARTUP",
        "role": "implementation"
      },
      "dependencies": [
        "BLOCK"
      ],
      "functional_paths": [
        "src/contracts/startup-view.mjs",
        "src/control/context/context-session.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/backend/desktop-model.mjs",
        "tests/startup-ui.test.mjs",
        "tests/context-session.test.mjs",
        "tests/dialogue-delivery.test.mjs",
        "tests/backend-desktop-model.test.mjs",
        "src/control/sessions/workspace-session.mjs",
        "src/control/plugin/communication.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "startup-recovery",
        "orchestrator-startup",
        "unit-all"
      ],
      "id": "STARTUP",
      "title": "Согласовать сохранённый адрес и жизненный цикл контекста",
      "why": "Исправить D001 и основание D007 в общей startup-проекции по UI-спецификации. Проверить сохранённый собственный address против исторического lost, реальные loss/conflict и stale snapshot. Не маскировать ошибку CSS и не расширять допуск, не повторять startup.",
      "acceptance_criteria": [
        "D001: свой сохранённый URL с действительной binding не объявляется lost из-за старого attempt; чужая страница/conflict не скрываются.",
        "D007: startup имеет актуальную проекцию прогресса и устойчивое completion/history событие; повторное открытие не порождает новый успех.",
        "Restart/renderer crash/stale snapshot/отмена не меняют identity, не открывают чужой чат и не повторяют q."
      ],
      "expected_commit_message": "fix: согласовать сохранённый адрес и жизненный цикл контекста",
      "parallel_safe": false,
      "task_brief": "Исправить D001 и основание D007 в общей startup-проекции по UI-спецификации. Проверить сохранённый собственный address против исторического lost, реальные loss/conflict и stale snapshot. Не маскировать ошибку CSS и не расширять допуск, не повторять startup. Перед изменениями прочитать перечисленные reference-only контракты по относящемуся механизму из checkout.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/release-0533-defects.md",
            "required": true
          },
          {
            "path": "docs/planning/release-0533-defects-execution.md",
            "required": true
          },
          {
            "path": "docs/planning/release-0533-defects-ui.md",
            "required": true
          },
          {
            "path": "docs/modules/chat-only-startup.md",
            "required": false
          },
          {
            "path": "docs/modules/orchestrator-startup.md",
            "required": false
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
        "scope_id": "release-0533-defects",
        "task_id": "STATUS",
        "role": "implementation"
      },
      "dependencies": [
        "PREPARE",
        "STARTUP"
      ],
      "functional_paths": [
        "src/contracts/work-progress.mjs",
        "src/contracts/user-choice.mjs",
        "src/backend/desktop-model.mjs",
        "src/control/sessions/workspace-session.mjs",
        "src/control/workflow/user-choices.mjs",
        "src/control/workflow/plan-review.mjs",
        "tests/work-progress.test.mjs",
        "tests/work-progress-scenario.test.mjs",
        "tests/session-roles.test.mjs",
        "tests/user-choices.test.mjs",
        "tests/user-choice-view.test.mjs",
        "tests/backend-desktop-model.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "architecture"
      ],
      "id": "STATUS",
      "title": "Дать всем клиентам единые роли, стадии и приоритет внимания",
      "why": "Исправить D002/D004/D005/D007 и текст D011 в существующих shared contracts и backend workProgress/planActivity. Роли не менять ради подписей. Одна причина внимания, конкретный recipient/action, время наблюдаемой стадии и устойчивый ID истории; raw payload/URL не отдавать. Проверить одинаковый snapshot для native/HTTP/plugin.",
      "acceptance_criteria": [
        "D002/D004: Агент до выбора, O сразу после orchestrated; реальные Review/operation имеют точную стадию, не generic busy.",
        "D005/D007: offered→persisted chosen→read→history и startup.complete проектируются по backend receipts; нет ложного действия/доставки.",
        "D011: именован адресат O/E; pending recovery O не выдаётся за доставляемый task E; независимая работа других участников не пропадает."
      ],
      "expected_commit_message": "fix: дать всем клиентам единые роли, стадии и приоритет внимания",
      "parallel_safe": false,
      "task_brief": "Исправить D002/D004/D005/D007 и текст D011 в существующих shared contracts и backend workProgress/planActivity. Роли не менять ради подписей. Одна причина внимания, конкретный recipient/action, время наблюдаемой стадии и устойчивый ID истории; raw payload/URL не отдавать. Проверить одинаковый snapshot для native/HTTP/plugin. Перед изменениями прочитать перечисленные reference-only контракты по относящемуся механизму из checkout.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/release-0533-defects.md",
            "required": true
          },
          {
            "path": "docs/planning/release-0533-defects-execution.md",
            "required": true
          },
          {
            "path": "docs/planning/release-0533-defects-ui.md",
            "required": true
          },
          {
            "path": "docs/modules/user-choice.md",
            "required": false
          },
          {
            "path": "docs/modules/desktop.md",
            "required": false
          },
          {
            "path": "docs/modules/chatgpt-plugin.md",
            "required": false
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
        "scope_id": "release-0533-defects",
        "task_id": "VIEW",
        "role": "implementation"
      },
      "dependencies": [
        "STATUS"
      ],
      "functional_paths": [
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/frontend/desktop/ui/index.html",
        "src/frontend/plugin/panel.mjs",
        "src/frontend/plugin/index.html",
        "src/frontend/desktop/client.mjs",
        "src/frontend/web/index.html",
        "src/contracts/user-choice.mjs",
        "tests/sidebar.test.mjs",
        "tests/panel-dialogue-view.test.mjs",
        "tests/user-choice-view.test.mjs",
        "tests/desktop-client.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "src/frontend/web/app.mjs",
        "src/frontend/desktop/browser-host.mjs",
        "src/frontend/client/browser-view.mjs",
        "tests/fixtures/web-client-browser.mjs",
        "tests/electron-smoke.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "chatgpt-plugin",
        "startup-recovery",
        "plan-review-ui",
        "architecture",
        "unit-all",
        "electron-smoke"
      ],
      "id": "VIEW",
      "title": "Убрать дубли и сделать инструкции читаемыми",
      "why": "Реализовать D003/D005/D006/D007 и отображение D002/D004/D009/D011 по UI-части. Shared choice/status, один видимый primary action; fallback вне sidebar и без нового модельного вызова, native webContents скрывается штатно на время клиентского представления. Реальный CSS layout проверять renderer, а не jsdom. Сохранить навигацию, опубликованный план, одну кнопку, Review и accessibility.",
      "acceptance_criteria": [
        "D003: до публикации слева нет plan/choice card, только нейтральный статус; после публикации сохраняется настоящий план и одна кнопка исполнения.",
        "D005/D007: chosen нейтрален сразу после persisted receipt, затем history; нет постоянной sidebar startup card и дубликатов текущего процесса.",
        "D006: полная инструкция/длинный ID без наложений и clipping при 320/480/900 px, light/dark, 100/200% текста; доказано renderer fixture.",
        "Закрытая/недоступная MCP-панель и HTTP сохраняют доступ к одному запросу через общую клиентскую область с CAS; разные сессии и focus не путаются."
      ],
      "expected_commit_message": "fix: убрать дубли и сделать инструкции читаемыми",
      "parallel_safe": false,
      "task_brief": "Реализовать D003/D005/D006/D007 и отображение D002/D004/D009/D011 по UI-части. Shared choice/status, один видимый primary action; fallback вне sidebar и без нового модельного вызова, native webContents скрывается штатно на время клиентского представления. Реальный CSS layout проверять renderer, а не jsdom. Сохранить навигацию, опубликованный план, одну кнопку, Review и accessibility. Перед изменениями прочитать перечисленные reference-only контракты по относящемуся механизму из checkout.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/release-0533-defects.md",
            "required": true
          },
          {
            "path": "docs/planning/release-0533-defects-execution.md",
            "required": true
          },
          {
            "path": "docs/planning/release-0533-defects-ui.md",
            "required": true
          },
          {
            "path": "docs/modules/desktop.md",
            "required": false
          },
          {
            "path": "docs/modules/native-window.md",
            "required": false
          },
          {
            "path": "docs/modules/remote-access.md",
            "required": false
          },
          {
            "path": "docs/modules/chatgpt-plugin.md",
            "required": false
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
        "scope_id": "release-0533-defects",
        "task_id": "PROOF",
        "role": "implementation"
      },
      "dependencies": [
        "VIEW"
      ],
      "functional_paths": [
        "tests/automatic-agent-dialogue.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/fixtures/plugin-host.mjs",
        "tests/work-progress-scenario.test.mjs",
        "tests/backend-api.test.mjs",
        "tests/execution-control.test.mjs",
        "tests/parallel-execution-recovery.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/sidebar.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "kit-check",
        "kit-assignments",
        "architecture",
        "chatgpt-plugin",
        "electron-smoke",
        "executor-channel",
        "codex-tools-live"
      ],
      "id": "PROOF",
      "title": "Проверить весь цикл и покрытие D001–D011",
      "why": "Закрыть проверками всю таблицу дефектов. Повторно не тестировать неизменное ради счётчика: сначала адресные regression, затем обязательный общий набор обеих частей Kit и app. Никаких реальных моделей, рабочих профилей/служб и Test_001. Сохранять релевантные timestamps/IDs/hash без секретов. Явно отметить pending живой приёмки.",
      "acceptance_criteria": [
        "Изолированный цикл prepared plan→Start/dirty→Continue→SDK recovery→2E→result/acceptance/integration→T003→DOCS→cleanup/complete проходит через пользовательские входы.",
        "Сбои на границах durable intent и повторные callbacks не дают дублирования; сохраняются ручная пауза и UNKNOWN.",
        "У каждого D001–D011 есть адресное доказательство; различены UI layout, host fixture и pending настоящих ChatGPT/native Windows/Linux."
      ],
      "expected_commit_message": "fix: проверить весь цикл и покрытие d001–d011",
      "parallel_safe": false,
      "task_brief": "Закрыть проверками всю таблицу дефектов. Повторно не тестировать неизменное ради счётчика: сначала адресные regression, затем обязательный общий набор обеих частей Kit и app. Никаких реальных моделей, рабочих профилей/служб и Test_001. Сохранять релевантные timestamps/IDs/hash без секретов. Явно отметить pending живой приёмки. Перед изменениями прочитать перечисленные reference-only контракты по относящемуся механизму из checkout.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/release-0533-defects.md",
            "required": true
          },
          {
            "path": "docs/planning/release-0533-defects-execution.md",
            "required": true
          },
          {
            "path": "docs/planning/release-0533-defects-ui.md",
            "required": true
          },
          {
            "path": "docs/modules/automatic-agent-dialogue-acceptance.md",
            "required": false
          },
          {
            "path": "docs/acceptance/interruption-recovery.md",
            "required": false
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      }
    },
    {
      "id": "VERSION",
      "title": "Подготовить версии приложения, Kit и панели для 0.5.34",
      "why": "Согласованный выпуск новых контрактов и immutable панели до DOCS/build.",
      "dependencies": [
        "PROOF"
      ],
      "functional_paths": [
        "package.json",
        "package-lock.json",
        "packages/workflow-kit/package.json",
        "packages/workflow-kit/src/lib/common.mjs",
        "src/contracts/backend.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/migration-compatibility.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/release-0533-defects.md"
      ],
      "verification_ids": [
        "unit-all",
        "kit-check",
        "kit-assignments",
        "executor-channel",
        "architecture"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "App 0.5.34, новая версия Kit/ролевых инструкций, package locks и panel build согласованы; fixtures и upgrade проходят.",
        "Нет зависимости от старого iframe; публичные версии/контракты проверены до DOCS."
      ],
      "expected_commit_message": "chore: подготовить выпуск 0.5.34",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "release-0533-defects",
        "task_id": "VERSION",
        "role": "implementation"
      },
      "parallel_safe": false
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "release-0533-defects",
        "task_id": "DOCS",
        "role": "implementation"
      },
      "dependencies": [
        "CHANNEL",
        "GIT",
        "BLOCK",
        "PREPARE",
        "STARTUP",
        "STATUS",
        "VIEW",
        "PROOF",
        "VERSION"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/assignment-dialogue.md",
        "docs/modules/assignment-dialogue-reliability.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/chat-only-startup.md",
        "docs/modules/orchestrator-startup.md",
        "docs/modules/dialogue-timing.md",
        "docs/modules/user-choice.md",
        "docs/modules/desktop.md",
        "docs/modules/native-window.md",
        "docs/modules/remote-access.md",
        "docs/modules/orchestrated-execution.md",
        "docs/modules/workflow-execution.md",
        "docs/modules/project-compatibility.md",
        "docs/acceptance/interruption-recovery.md",
        "packages/workflow-kit/docs/modules/orchestrated-plans.md",
        "packages/workflow-kit/docs/modules/workflow-kit-package.md",
        "docs/planning/release-0533-defects.md",
        "docs/planning/release-0533-defects-execution.md",
        "docs/planning/release-0533-defects-ui.md"
      ],
      "verification_ids": [],
      "id": "DOCS",
      "title": "Актуализация всех документов проекта",
      "why": "После проверенных исправлений сверить README/OVERVIEW и затронутые module contracts, Kit docs и acceptance. Действующие release-документы описывают последний выпуск, невыпущенное остаётся в planning/Git до отдельно разрешённого delivery. Не удалять незавершённые требования и не считать DOCS checks:[] запуском app suite. Ничего не публиковать и не архивировать без отдельного поручения.",
      "acceptance_criteria": [
        "Сверены все действующие модули, role-protocol/startup/MCP/шаблоны; фактические ограничения и NOT_RUN сохранены.",
        "Спецификация и план отражают фактическую реализацию без утерянных D001–D011; невыпущенное не приписано версии 0.5.33.",
        "Записан повторный пользовательский сценарий с критерием для каждого дефекта, проверками native/HTTP и closed-panel; нет вымышленного release/PASS."
      ],
      "expected_commit_message": "docs: актуализировать контракты и подготовить повторную приёмку",
      "parallel_safe": false,
      "task_brief": "После проверенных исправлений сверить README/OVERVIEW и затронутые module contracts, Kit docs и acceptance. Действующие release-документы описывают последний выпуск, невыпущенное остаётся в planning/Git до отдельно разрешённого delivery. Не удалять незавершённые требования и не считать DOCS checks:[] запуском app suite. Ничего не публиковать и не архивировать без отдельного поручения. Перед изменениями прочитать перечисленные reference-only контракты по относящемуся механизму из checkout.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/release-0533-defects.md",
            "required": true
          },
          {
            "path": "docs/planning/release-0533-defects-execution.md",
            "required": true
          },
          {
            "path": "docs/planning/release-0533-defects-ui.md",
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
      "id": "RELEASE",
      "title": "Собрать и проверить релиз macOS Windows Linux",
      "why": "Собрать и проверить релиз macOS Windows Linux",
      "dependencies": [
        "DOCS"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/release-0533-defects.md"
      ],
      "verification_ids": [
        "three-platform-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "Три платформы и все семь assets из одного sourceCommit проверены; manifest и Downloads согласованы.",
        "Перед каждой production-командой Python caches безопасно очищены; подпись и состав проверены без ослабления."
      ],
      "expected_commit_message": "build: собрать полный выпуск 0.5.34",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "release-0533-defects",
        "task_id": "RELEASE",
        "role": "implementation"
      },
      "parallel_safe": false
    },
    {
      "id": "INSTALL",
      "title": "Установить проверенный выпуск на этот Mac",
      "why": "Установить проверенный выпуск на этот Mac",
      "dependencies": [
        "RELEASE",
        "DOCS"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/release-0533-defects.md"
      ],
      "verification_ids": [
        "release-installed"
      ],
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Готовый bundle из проверенного комплекта доставлен в проект и /Applications с manifest/signature/rollback; installed или подтверждённый pending.",
        "Нет пересборки, переподписи, закрытия приложения или остановки действующей службы."
      ],
      "expected_commit_message": "delivery: установить проверенный выпуск 0.5.34",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "release-0533-defects",
        "task_id": "INSTALL",
        "role": "implementation"
      },
      "parallel_safe": false
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
        "docs/planning/release-0533-defects.md"
      ],
      "verification_ids": [
        "github-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "Собственный GitHub Release v0.5.34 published, семь assets проверены по size/digest, tag на manifest.sourceCommit, main актуален.",
        "Неизменный комплект, ограничения live/native приёмки отражены; итог по всем задачам."
      ],
      "expected_commit_message": "release: опубликовать полный комплект 0.5.34",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "release-0533-defects",
        "task_id": "PUBLISH",
        "role": "implementation"
      },
      "parallel_safe": false
    }
  ],
  "blocked_reason": null,
  "user_decisions": [
    {
      "id": "4c654c18-6b0d-4b8b-bbcd-1c1b29d3728c",
      "text": "25.10.2026 пользователь поручил перенести все исправления и замечания из трёх Desktop-журналов в спецификацию и новый to-do. Предыдущий scope закрыт. В текущем поручении подготовить и согласовать план; реализацию не начинать.",
      "recorded_at": "2026-10-25T07:16:59.186Z"
    },
    {
      "id": "delivery-2026-10-25",
      "text": "Пользователь поручил добавить выпуск для macOS Windows Linux, установку на этот Mac и GitHub публикацию; выполнить весь план без пауз.",
      "recorded_at": "2026-10-25T07:36:00.513Z"
    }
  ],
  "parallel_allowed": false,
  "max_workers": 1,
  "execution_strategy": "sequential",
  "execution_reason": "Разработка в этой внешней Codex-сессии без делегирования. Общие plan/WAL/status/UI contracts пересекаются; последовательные проверяемые задачи сохраняют целостность и пользовательское ограничение на модельных исполнителей."
}
```
<!-- workflow-state:end -->

## Состояние

Execution Scope Status: ACTIVE
Delivery Status: IN_PROGRESS
Scope: release-0533-defects
Current Task: нет
Revision: 1073

## Цель

Устранить все D001–D011 тестирования 0.5.33: восстановить канал и Continue, подготовить поручения до Start, убрать дубли и недостоверные статусы.

## Критерии приёмки

- Все D001–D011 из трёх частей журнала перенесены без потери требований и имеют отдельные критерии/задачи.
- Канал O/E восстанавливает generation/lease без вечного ожидания и без повторного Send; истинные границы identity и manual pause сохранены.
- Подготовленный авторский пакет и контекст согласованы до Start; оба независимых E запускаются без обязательного нового хода O для подготовки.
- Один current action, полный перенос инструкций, точные actor/stage/recipient, нет дублирующих choice/startup в sidebar.
- Автоматические fixtures/обе части Kit проходят; pending live/native приёмка и отсутствие delivery явно указаны.

## Микрозадачи

Выполнение: sequential; разрешено: false; лимит: 1
Причина: Разработка в этой внешней Codex-сессии без делегирования. Общие plan/WAL/status/UI contracts пересекаются; последовательные проверяемые задачи сохраняют целостность и пользовательское ограничение на модельных исполнителей.

- [TODO] CHANNEL: Восстановить канал после смены generation и lease — Ожидает
  - Git Commit: [PENDING] fix: восстановить канал после смены generation и lease
  - Reference: release-0533-defects / CHANNEL / implementation
  - Файлы: src/frontend/plugin/launch.mjs, src/control/plugin/communication.mjs, src/control/plugin/workflow-channel.mjs, src/contracts/plugin-communication.mjs, tools/codex-app-server-mcp/plugin.py, tests/plugin-communication.test.mjs, tests/workflow-channel.test.mjs, tests/chatgpt-plugin.test.mjs, tests/fixtures/plugin-host.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [TODO] GIT: Исключить Finder metadata штатным installer Kit — Ожидает
  - Git Commit: [PENDING] fix: исключить finder metadata штатным installer kit
  - Reference: release-0533-defects / GIT / implementation
  - Файлы: packages/workflow-kit/src/lib/installation-files.mjs, packages/workflow-kit/src/lib/installer.mjs, packages/workflow-kit/scripts/check-previous-upgrade-fixture.mjs, tests/workflow-kit-upgrade.test.mjs, tests/workflow-kit-source.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [TODO] BLOCK: Согласовать техническую паузу и действие Продолжить — Ожидает
  - Git Commit: [PENDING] fix: согласовать техническую паузу и действие продолжить
  - Reference: release-0533-defects / BLOCK / implementation
  - Файлы: src/control/workflow/execution-control.mjs, src/control/workflow/parallel-execution.mjs, src/control/plugin/workflow-channel.mjs, src/control/workflow/coordination.mjs, src/backend/desktop-model.mjs, tests/execution-control.test.mjs, tests/parallel-execution.test.mjs, tests/parallel-execution-recovery.test.mjs, tests/backend-api.test.mjs, src/control/workflow/parallel-kit.mjs, src/control/projects/project-doctor.mjs, src/frontend/desktop/ui/workspace-setup.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: CHANNEL, GIT
- [TODO] PREPARE: Подготовить авторские поручения и контекст до Start — Ожидает
  - Git Commit: [PENDING] fix: подготовить авторские поручения и контекст до start
  - Reference: release-0533-defects / PREPARE / implementation
  - Файлы: packages/workflow-kit/src/lib/plan.mjs, packages/workflow-kit/src/lib/plan-review.mjs, packages/workflow-kit/src/lib/review-state.mjs, packages/workflow-kit/src/lib/assignment-dialogue.mjs, packages/workflow-kit/src/lib/assignment-contract.mjs, packages/workflow-kit/src/lib/role-protocol.mjs, packages/workflow-kit/src/lib/actions.mjs, packages/workflow-kit/src/schemas/plan.schema.json, packages/workflow-kit/src/templates/PLAN.md, src/control/plugin/assignment-dialogue.mjs, src/control/plugin/workflow-channel.mjs, src/control/workflow/dialogue-delivery.mjs, src/control/plugin/startup-context.mjs, tools/codex-app-server-mcp/plugin.py, tests/automatic-agent-dialogue.test.mjs, tests/fixtures/automatic-agent-dialogue.mjs, tests/dialogue-delivery.test.mjs, packages/workflow-kit/scripts/check-plan-review-fixture.mjs, packages/workflow-kit/src/lib/recovery.mjs, packages/workflow-kit/src/lib/simple-workflow.mjs, packages/workflow-kit/src/lib/dialogue-migration.mjs, packages/workflow-kit/src/lib/validate.mjs, packages/workflow-kit/src/lib/validation-rules.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: CHANNEL, BLOCK
- [TODO] STARTUP: Согласовать сохранённый адрес и жизненный цикл контекста — Ожидает
  - Git Commit: [PENDING] fix: согласовать сохранённый адрес и жизненный цикл контекста
  - Reference: release-0533-defects / STARTUP / implementation
  - Файлы: src/contracts/startup-view.mjs, src/control/context/context-session.mjs, src/control/workflow/dialogue-delivery.mjs, src/control/plugin/workflow-channel.mjs, src/backend/desktop-model.mjs, tests/startup-ui.test.mjs, tests/context-session.test.mjs, tests/dialogue-delivery.test.mjs, tests/backend-desktop-model.test.mjs, src/control/sessions/workspace-session.mjs, src/control/plugin/communication.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: BLOCK
- [TODO] STATUS: Дать всем клиентам единые роли, стадии и приоритет внимания — Ожидает
  - Git Commit: [PENDING] fix: дать всем клиентам единые роли, стадии и приоритет внимания
  - Reference: release-0533-defects / STATUS / implementation
  - Файлы: src/contracts/work-progress.mjs, src/contracts/user-choice.mjs, src/backend/desktop-model.mjs, src/control/sessions/workspace-session.mjs, src/control/workflow/user-choices.mjs, src/control/workflow/plan-review.mjs, tests/work-progress.test.mjs, tests/work-progress-scenario.test.mjs, tests/session-roles.test.mjs, tests/user-choices.test.mjs, tests/user-choice-view.test.mjs, tests/backend-desktop-model.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: PREPARE, STARTUP
- [TODO] VIEW: Убрать дубли и сделать инструкции читаемыми — Ожидает
  - Git Commit: [PENDING] fix: убрать дубли и сделать инструкции читаемыми
  - Reference: release-0533-defects / VIEW / implementation
  - Файлы: src/frontend/desktop/ui/sidebar.mjs, src/frontend/desktop/ui/index.html, src/frontend/plugin/panel.mjs, src/frontend/plugin/index.html, src/frontend/desktop/client.mjs, src/frontend/web/index.html, src/contracts/user-choice.mjs, tests/sidebar.test.mjs, tests/panel-dialogue-view.test.mjs, tests/user-choice-view.test.mjs, tests/desktop-client.test.mjs, tests/chatgpt-plugin.test.mjs, src/frontend/web/app.mjs, src/frontend/desktop/browser-host.mjs, src/frontend/client/browser-view.mjs, tests/fixtures/web-client-browser.mjs, tests/electron-smoke.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: STATUS
- [TODO] PROOF: Проверить весь цикл и покрытие D001–D011 — Ожидает
  - Git Commit: [PENDING] fix: проверить весь цикл и покрытие d001–d011
  - Reference: release-0533-defects / PROOF / implementation
  - Файлы: tests/automatic-agent-dialogue.test.mjs, tests/fixtures/automatic-agent-dialogue.mjs, tests/fixtures/plugin-host.mjs, tests/work-progress-scenario.test.mjs, tests/backend-api.test.mjs, tests/execution-control.test.mjs, tests/parallel-execution-recovery.test.mjs, tests/chatgpt-plugin.test.mjs, tests/sidebar.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: VIEW
- [TODO] VERSION: Подготовить версии приложения, Kit и панели для 0.5.34 — Ожидает
  - Git Commit: [PENDING] chore: подготовить выпуск 0.5.34
  - Reference: release-0533-defects / VERSION / implementation
  - Файлы: package.json, package-lock.json, packages/workflow-kit/package.json, packages/workflow-kit/src/lib/common.mjs, src/contracts/backend.mjs, tests/codex-app-server-mcp.test.mjs, tests/migration-compatibility.test.mjs, docs/planning/release-0533-defects.md
  - Параллельность: исключительное выполнение
  - Зависимости: PROOF
- [TODO] DOCS: Актуализация всех документов проекта — Ожидает
  - Git Commit: [PENDING] docs: актуализировать контракты и подготовить повторную приёмку
  - Reference: release-0533-defects / DOCS / implementation
  - Файлы: README.md, docs/architecture/OVERVIEW.md, docs/modules/assignment-dialogue.md, docs/modules/assignment-dialogue-reliability.md, docs/modules/chatgpt-plugin.md, docs/modules/chat-only-startup.md, docs/modules/orchestrator-startup.md, docs/modules/dialogue-timing.md, docs/modules/user-choice.md, docs/modules/desktop.md, docs/modules/native-window.md, docs/modules/remote-access.md, docs/modules/orchestrated-execution.md, docs/modules/workflow-execution.md, docs/modules/project-compatibility.md, docs/acceptance/interruption-recovery.md, packages/workflow-kit/docs/modules/orchestrated-plans.md, packages/workflow-kit/docs/modules/workflow-kit-package.md, docs/planning/release-0533-defects.md, docs/planning/release-0533-defects-execution.md, docs/planning/release-0533-defects-ui.md
  - Параллельность: исключительное выполнение
  - Зависимости: CHANNEL, GIT, BLOCK, PREPARE, STARTUP, STATUS, VIEW, PROOF, VERSION
- [TODO] RELEASE: Собрать и проверить релиз macOS Windows Linux — Ожидает
  - Git Commit: [PENDING] build: собрать полный выпуск 0.5.34
  - Reference: release-0533-defects / RELEASE / implementation
  - Файлы: release-manifest.json, docs/planning/release-0533-defects.md
  - Параллельность: исключительное выполнение
  - Зависимости: DOCS
- [TODO] INSTALL: Установить проверенный выпуск на этот Mac — Ожидает
  - Git Commit: [PENDING] delivery: установить проверенный выпуск 0.5.34
  - Reference: release-0533-defects / INSTALL / implementation
  - Файлы: release-manifest.json, docs/planning/release-0533-defects.md
  - Параллельность: исключительное выполнение
  - Зависимости: RELEASE, DOCS
- [TODO] PUBLISH: Опубликовать полный выпуск на GitHub — Ожидает
  - Git Commit: [PENDING] release: опубликовать полный комплект 0.5.34
  - Reference: release-0533-defects / PUBLISH / implementation
  - Файлы: release-manifest.json, docs/planning/release-0533-defects.md
  - Параллельность: исключительное выполнение
  - Зависимости: INSTALL, DOCS

## Context Pack For This Cycle

- docs/planning/release-0533-defects-execution.md
- docs/planning/release-0533-defects-ui.md
- docs/architecture/OVERVIEW.md
- docs/planning/release-0533-defects.md

Служебные состояния меняются только командами workflow. Приёмка не архивирует scope.
