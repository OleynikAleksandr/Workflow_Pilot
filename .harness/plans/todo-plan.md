# Активный план — Workflow_Pilot

<!-- workflow-state:begin -->
```json
{
  "schema_version": 1,
  "plan_revision": 726,
  "project_id": "7411e192-943c-4529-bffb-3b081d9c242f",
  "project_name": "Workflow_Pilot",
  "scope_id": "prepared-task-flow",
  "execution_scope_status": "ACTIVE",
  "delivery_status": "IN_PROGRESS",
  "objective": "Заранее готовить поручения, сократить последовательные ходы и итог, останавливать ожидание после complete; опубликовать новый выпуск.",
  "acceptance_criteria": [
    "Выполнен контракт docs/planning/prepared-task-flow.md",
    "Проверены и опубликованы комплекты трёх ОС, выполнена штатная установка macOS."
  ],
  "approved_scope": {
    "functional_paths": [
      "packages/workflow-kit/src/lib/plan.mjs",
      "packages/workflow-kit/src/lib/simple-workflow.mjs",
      "packages/workflow-kit/src/lib/assignment-dialogue.mjs",
      "packages/workflow-kit/src/lib/role-protocol.mjs",
      "packages/workflow-kit/src/lib/command-help.mjs",
      "src/control/plugin/communication.mjs",
      "src/control/workflow/dialogue-delivery.mjs",
      "tools/codex-app-server-mcp/plugin.py",
      "tests/workflow-channel.test.mjs",
      "tests/dialogue-delivery.test.mjs",
      "tests/codex-app-server-mcp.test.mjs",
      "tests/prepared-task-flow.test.mjs",
      "src/control/plugin/assignment-dialogue.mjs",
      "packages/workflow-kit/src/schemas/plan.schema.json",
      "packages/workflow-kit/src/lib/recovery.mjs",
      "tests/fixtures/automatic-agent-dialogue.mjs",
      "tests/chatgpt-plugin.test.mjs",
      "src/frontend/plugin/launch.mjs",
      "src/control/workflow/parallel-execution.mjs",
      "src/contracts/dialogue-view.mjs",
      "tests/parallel-finalization.test.mjs",
      "tests/panel-dialogue-view.test.mjs",
      "tests/sidebar.test.mjs",
      "tests/fixtures/plugin-host.mjs",
      "package.json",
      "package-lock.json",
      "packages/workflow-kit/package.json",
      "packages/workflow-kit/src/lib/common.mjs",
      "packages/workflow-kit/src/lib/installer.mjs",
      "src/contracts/backend.mjs",
      "tests/automatic-agent-dialogue.test.mjs",
      "tests/workflow-kit-upgrade.test.mjs",
      "tests/fixtures/released-kit/manifest.json",
      "tests/fixtures/released-kit/kit-1.9.2.tar.gz",
      "release-manifest.json",
      "tools/experiments/pip-probe/server.mjs",
      "tools/experiments/pip-probe/view.mjs",
      "tests/pip-probe.test.mjs",
      "tools/codex-app-server-mcp/pip_probe.py",
      "scripts/stage-chatgpt-plugin.mjs",
      "scripts/check-pip-probe.mjs",
      ".gitignore"
    ],
    "documentation_paths": [
      "packages/workflow-kit/src/templates/PLAN.md",
      "docs/planning/prepared-task-flow.md",
      "tests/fixtures/released-kit/README.md",
      "README.md",
      "docs/architecture/OVERVIEW.md",
      "docs/modules/dialogue-timing.md",
      "docs/modules/assignment-dialogue.md",
      "docs/modules/chatgpt-plugin.md",
      "docs/modules/automatic-agent-dialogue-acceptance.md",
      "docs/modules/release.md",
      "docs/modules/project-compatibility.md",
      "packages/workflow-kit/docs/modules/orchestrated-plans.md",
      "packages/workflow-kit/docs/modules/parallel-assignments.md",
      "packages/workflow-kit/docs/modules/workflow-kit-package.md",
      "docs/modules/orchestrated-execution.md",
      "docs/modules/assignment-dialogue-reliability.md",
      "docs/modules/chatgpt-plugin-acceptance.md",
      "docs/acceptance/orchestrated-execution.md",
      "docs/modules/plugin-communication-handoff.md",
      "docs/modules/workflow-execution.md",
      "docs/planning/pip-probe.md",
      "docs/modules/pip-probe.md"
    ]
  },
  "baseline_commit": "68d47baf472b218c37cce32db4c484a5b342e243",
  "current_task_id": null,
  "context_pack": {
    "documents": [
      {
        "path": "docs/planning/prepared-task-flow.md",
        "required": true,
        "revision": "d6bd34db680b335756dd5d3df8eec01cb3ed3911"
      },
      {
        "path": "docs/architecture/OVERVIEW.md",
        "required": true,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/modules/chatgpt-plugin.md",
        "required": true,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/planning/pip-probe.md",
        "required": true,
        "revision": "f3f208ebe33b1794517e1ddadff5242d488524ee"
      },
      {
        "path": "docs/modules/pip-probe.md",
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
        "scope_id": "prepared-task-flow",
        "task_id": "T001",
        "role": "implementation"
      },
      "dependencies": [],
      "functional_paths": [
        "packages/workflow-kit/src/lib/plan.mjs",
        "packages/workflow-kit/src/lib/simple-workflow.mjs",
        "packages/workflow-kit/src/lib/assignment-dialogue.mjs",
        "packages/workflow-kit/src/lib/role-protocol.mjs",
        "packages/workflow-kit/src/lib/command-help.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "tools/codex-app-server-mcp/plugin.py",
        "tests/workflow-channel.test.mjs",
        "tests/dialogue-delivery.test.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/prepared-task-flow.test.mjs",
        "src/control/plugin/assignment-dialogue.mjs",
        "packages/workflow-kit/src/schemas/plan.schema.json",
        "packages/workflow-kit/src/lib/recovery.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/chatgpt-plugin.test.mjs"
      ],
      "documentation_paths": [
        "packages/workflow-kit/src/templates/PLAN.md",
        "docs/planning/prepared-task-flow.md"
      ],
      "verification_ids": [
        "architecture",
        "executor-channel",
        "unit-all",
        "kit-check",
        "kit-assignments"
      ],
      "id": "T001",
      "title": "Сохранять ранние поручения и обрабатывать назначения одним ходом",
      "why": "Сохранять ранние поручения и обрабатывать назначения одним ходом",
      "acceptance_criteria": [
        "task_brief сохраняется, проверяется и доступен только O; старые планы совместимы; digest меняется с brief.",
        "Один read возвращает ограниченную очередь независимых подготовок без фиктивного read; O читает и авторизует их в одном ходе.",
        "Канонические роли, Kit help, MCP и ошибки согласованы; до Start нет отправки; DOCS дополняется подтверждёнными фактами.",
        "Версия ролей повышена; brief остаётся в child contract, но не выдаётся E через recovery/bootstrap/status. Интеграция с неизменённым brief проходит; изменение контракта отвергается.",
        "O-only brief запрашивается parent Kit с полномочием O и выдаётся только member.role=O. Simple plan:create сохраняет task_brief указанной DOCS, schema и runtime проверяют поле."
      ],
      "expected_commit_message": "feat: Сохранять ранние поручения и обрабатывать назначения одним ходом",
      "parallel_safe": false,
      "actual_files": [
        "packages/workflow-kit/src/lib/assignment-dialogue.mjs",
        "packages/workflow-kit/src/lib/plan.mjs",
        "packages/workflow-kit/src/lib/recovery.mjs",
        "packages/workflow-kit/src/lib/role-protocol.mjs",
        "packages/workflow-kit/src/lib/simple-workflow.mjs",
        "packages/workflow-kit/src/schemas/plan.schema.json",
        "packages/workflow-kit/src/templates/PLAN.md",
        "src/control/plugin/assignment-dialogue.mjs",
        "src/control/plugin/communication.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/prepared-task-flow.test.mjs",
        "tests/workflow-channel.test.mjs",
        "tools/codex-app-server-mcp/plugin.py"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "prepared-task-flow",
        "task_id": "T002",
        "role": "implementation"
      },
      "dependencies": [
        "T001"
      ],
      "functional_paths": [
        "src/frontend/plugin/launch.mjs",
        "src/control/workflow/parallel-execution.mjs",
        "src/contracts/dialogue-view.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/parallel-finalization.test.mjs",
        "tests/panel-dialogue-view.test.mjs",
        "tests/sidebar.test.mjs",
        "tests/fixtures/plugin-host.mjs"
      ],
      "documentation_paths": [
        "docs/planning/prepared-task-flow.md"
      ],
      "verification_ids": [
        "architecture",
        "chatgpt-plugin",
        "unit-all"
      ],
      "id": "T002",
      "title": "Сократить обязательный итог и корректно завершать ожидание панели",
      "why": "Сократить обязательный итог и корректно завершать ожидание панели",
      "acceptance_criteria": [
        "Короткий итог по умолчанию и точная видимая стадия без ослабления complete.",
        "STOPPED сохраняет код; подтверждённый complete прекращает wait/sync без Stop; pause→Continue и network recovery работают.",
        "Поздние ответы не изменяют новую привязку; восстановление нового scope возможно."
      ],
      "expected_commit_message": "feat: Сократить обязательный итог и корректно завершать ожидание панели",
      "parallel_safe": false,
      "actual_files": [
        "src/contracts/dialogue-view.mjs",
        "src/control/workflow/parallel-execution.mjs",
        "src/frontend/plugin/launch.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/fixtures/plugin-host.mjs",
        "tests/panel-dialogue-view.test.mjs",
        "tests/parallel-finalization.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "prepared-task-flow",
        "task_id": "T003",
        "role": "implementation"
      },
      "dependencies": [
        "T002"
      ],
      "functional_paths": [
        "package.json",
        "package-lock.json",
        "packages/workflow-kit/package.json",
        "packages/workflow-kit/src/lib/common.mjs",
        "packages/workflow-kit/src/lib/installer.mjs",
        "src/contracts/backend.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/automatic-agent-dialogue.test.mjs",
        "tests/workflow-kit-upgrade.test.mjs",
        "tests/fixtures/released-kit/manifest.json",
        "tests/fixtures/released-kit/kit-1.9.2.tar.gz"
      ],
      "documentation_paths": [
        "tests/fixtures/released-kit/README.md",
        "docs/planning/prepared-task-flow.md"
      ],
      "verification_ids": [
        "prepared-flow-cycle"
      ],
      "id": "T003",
      "title": "Проверить полный цикл и согласовать версии выпуска",
      "why": "Проверить полный цикл и согласовать версии выпуска",
      "acceptance_criteria": [
        "Полный fixture доказывает 2E/DOCS/finalization без лишних ходов и без ожидания после complete.",
        "Свободные версии app/Kit/role согласованы, upgrade сохраняет предыдущие планы; живая скорость не объявляется доказанной.",
        "По уточнению пользователя не повторять полный набор без относящихся изменений: T001 уже прошла unit-all и обе части Kit, T002 — unit-all. Здесь адресный полный цикл, SDK, upgrade и архитектура; готовые пакеты проверяются delivery.",
        "Architecture, chatgpt-plugin и kit-upgrade прошли на candidate 8fb1dd120329d8a1423c18839981d778a56fa43d; после них менялся только сквозной fixture. Повторяется только prepared-flow-cycle."
      ],
      "expected_commit_message": "feat: Проверить полный цикл и согласовать версии выпуска",
      "parallel_safe": false,
      "actual_files": [
        "docs/planning/prepared-task-flow.md",
        "package-lock.json",
        "package.json",
        "packages/workflow-kit/package.json",
        "packages/workflow-kit/src/lib/common.mjs",
        "packages/workflow-kit/src/lib/installer.mjs",
        "src/contracts/backend.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/fixtures/released-kit/README.md",
        "tests/fixtures/released-kit/kit-1.9.2.tar.gz",
        "tests/fixtures/released-kit/manifest.json",
        "tests/workflow-kit-upgrade.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "prepared-task-flow",
        "task_id": "DOCS",
        "role": "implementation"
      },
      "dependencies": [
        "T001",
        "T002",
        "T003"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/dialogue-timing.md",
        "docs/modules/assignment-dialogue.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/automatic-agent-dialogue-acceptance.md",
        "docs/modules/release.md",
        "docs/modules/project-compatibility.md",
        "packages/workflow-kit/docs/modules/orchestrated-plans.md",
        "packages/workflow-kit/docs/modules/parallel-assignments.md",
        "packages/workflow-kit/docs/modules/workflow-kit-package.md",
        "docs/planning/prepared-task-flow.md",
        "docs/modules/orchestrated-execution.md",
        "docs/modules/assignment-dialogue-reliability.md",
        "docs/modules/chatgpt-plugin-acceptance.md",
        "docs/acceptance/orchestrated-execution.md",
        "docs/modules/plugin-communication-handoff.md",
        "docs/modules/workflow-execution.md",
        "packages/workflow-kit/src/templates/PLAN.md",
        "tests/fixtures/released-kit/README.md"
      ],
      "verification_ids": [],
      "id": "DOCS",
      "title": "Актуализация всех документов проекта",
      "why": "Актуализация всех документов проекта",
      "acceptance_criteria": [
        "Контракты соответствуют выпуску; spec перенесена и удалена с required Git blob."
      ],
      "expected_commit_message": "docs: Актуализация всех документов проекта",
      "parallel_safe": false,
      "actual_files": [
        "README.md",
        "docs/acceptance/orchestrated-execution.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/assignment-dialogue-reliability.md",
        "docs/modules/assignment-dialogue.md",
        "docs/modules/automatic-agent-dialogue-acceptance.md",
        "docs/modules/chatgpt-plugin-acceptance.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/dialogue-timing.md",
        "docs/modules/orchestrated-execution.md",
        "docs/modules/plugin-communication-handoff.md",
        "docs/modules/project-compatibility.md",
        "docs/modules/release.md",
        "docs/modules/workflow-execution.md",
        "docs/planning/prepared-task-flow.md",
        "packages/workflow-kit/docs/modules/orchestrated-plans.md",
        "packages/workflow-kit/docs/modules/parallel-assignments.md",
        "packages/workflow-kit/docs/modules/workflow-kit-package.md"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "prepared-task-flow",
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
      "title": "Собрать комплект трёх ОС",
      "why": "Собрать комплект трёх ОС",
      "acceptance_criteria": [
        "Проверены фактические артефакты, единый sourceCommit и ограничения поставки."
      ],
      "expected_commit_message": "feat: Собрать комплект трёх ОС",
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
        "scope_id": "prepared-task-flow",
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
      "title": "Установить готовое macOS приложение",
      "why": "Установить готовое macOS приложение",
      "acceptance_criteria": [
        "Проверены фактические артефакты, единый sourceCommit и ограничения поставки."
      ],
      "expected_commit_message": "feat: Установить готовое macOS приложение",
      "verification_kind": "installed",
      "parallel_safe": false,
      "actual_files": []
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "prepared-task-flow",
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
      "title": "Опубликовать проверенный GitHub Release",
      "why": "Опубликовать проверенный GitHub Release",
      "acceptance_criteria": [
        "Проверены фактические артефакты, единый sourceCommit и ограничения поставки."
      ],
      "expected_commit_message": "feat: Опубликовать проверенный GitHub Release",
      "verification_kind": "package",
      "parallel_safe": false,
      "actual_files": []
    },
    {
      "id": "PIP-PROBE",
      "title": "Подготовить изолированный опыт основной панели и отдельного PiP",
      "why": "Подготовить изолированный опыт основной панели и отдельного PiP",
      "dependencies": [],
      "functional_paths": [
        "tools/experiments/pip-probe/server.mjs",
        "tools/experiments/pip-probe/view.mjs",
        "tests/pip-probe.test.mjs"
      ],
      "documentation_paths": [
        "docs/modules/chatgpt-plugin.md",
        "docs/planning/pip-probe.md"
      ],
      "verification_ids": [
        "architecture"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Два отдельных MCP UI ресурса; PiP запрашивается через установленный SDK, показывается фактический режим и отказ.",
        "Тестовый сервер не подключается к рабочему backend и не имеет средств отправки агентам или остановки плана.",
        "Закрытие PiP завершает только собственные таймеры; изолированный тест проверяет продолжающееся обновление основной панели.",
        "Живое одновременное отображение ChatGPT и сохранение реального канала не объявляются подтвержденными из fixture; подготовлен конкретный порядок пользовательской проверки."
      ],
      "expected_commit_message": "feat: Подготовить изолированный опыт основной панели и отдельного PiP",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "prepared-task-flow",
        "task_id": "PIP-PROBE",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "docs/planning/pip-probe.md",
        "tests/pip-probe.test.mjs",
        "tools/experiments/pip-probe/server.mjs",
        "tools/experiments/pip-probe/view.mjs"
      ]
    },
    {
      "id": "PIP-INTEGRATE",
      "title": "Включить пассивный PiP пробник в экспериментальную версию 0.5.13",
      "why": "Включить пассивный PiP пробник в экспериментальную версию 0.5.13",
      "dependencies": [],
      "functional_paths": [
        "tools/experiments/pip-probe/server.mjs",
        "tools/experiments/pip-probe/view.mjs",
        "tools/codex-app-server-mcp/pip_probe.py",
        "tools/codex-app-server-mcp/plugin.py",
        "scripts/stage-chatgpt-plugin.mjs",
        "scripts/check-pip-probe.mjs",
        "tests/pip-probe.test.mjs",
        ".gitignore",
        "package.json",
        "package-lock.json",
        "src/contracts/backend.mjs"
      ],
      "documentation_paths": [
        "docs/planning/pip-probe.md"
      ],
      "verification_ids": [
        "pip-probe",
        "architecture"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Пробник доступен в реальном каталоге рабочего MCP отдельно от основной панели, только синтетические данные.",
        "Закрытие PiP не вызывает Stop или отправку агенту; UI показывает фактически предоставленный режим; версии согласованы."
      ],
      "expected_commit_message": "feat: Включить пассивный PiP пробник в экспериментальную версию 0.5.13",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "prepared-task-flow",
        "task_id": "PIP-INTEGRATE",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        ".gitignore",
        "package-lock.json",
        "package.json",
        "scripts/check-pip-probe.mjs",
        "scripts/stage-chatgpt-plugin.mjs",
        "src/contracts/backend.mjs",
        "tests/pip-probe.test.mjs",
        "tools/codex-app-server-mcp/pip_probe.py",
        "tools/codex-app-server-mcp/plugin.py",
        "tools/experiments/pip-probe/server.mjs"
      ]
    },
    {
      "id": "DOCS-2",
      "title": "Актуализация всех документов проекта",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "prepared-task-flow",
        "task_id": "DOCS-2",
        "role": "implementation",
        "iteration": 2
      },
      "why": "Перед выпуском сверить README, OVERVIEW и действующие контракты модулей с результатом; обновить устаревшее.",
      "dependencies": [
        "PIP-PROBE",
        "PIP-INTEGRATE"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/architecture/OVERVIEW.md",
        "docs/planning/pip-probe.md",
        "README.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/pip-probe.md"
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
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/pip-probe.md",
        "docs/planning/pip-probe.md"
      ]
    },
    {
      "id": "BUILD-PIP",
      "title": "Собрать экспериментальный комплект трёх ОС 0.5.13",
      "why": "Собрать экспериментальный комплект трёх ОС 0.5.13",
      "dependencies": [
        "DOCS-2"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/pip-probe.md"
      ],
      "verification_ids": [
        "three-platform-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "Комплекты трёх ОС из одного sourceCommit проверены; публикация GitHub не требуется."
      ],
      "expected_commit_message": "feat: Собрать экспериментальный комплект трёх ОС 0.5.13",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "prepared-task-flow",
        "task_id": "BUILD-PIP",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "release-manifest.json"
      ]
    },
    {
      "id": "INSTALL-PIP",
      "title": "Установить готовую экспериментальную macOS сборку",
      "why": "Установить готовую экспериментальную macOS сборку",
      "dependencies": [
        "BUILD-PIP",
        "DOCS-2"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/pip-probe.md"
      ],
      "verification_ids": [
        "release-installed"
      ],
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Штатный installer проверяет версию, manifest, подпись и rollback; при работающем backend проверенная pending копия без остановки службы."
      ],
      "expected_commit_message": "feat: Установить готовую экспериментальную macOS сборку",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "prepared-task-flow",
        "task_id": "INSTALL-PIP",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": []
    },
    {
      "id": "PIP-INLINE",
      "title": "Открывать пробник из ленты без fullscreen",
      "why": "Открывать пробник из ленты без fullscreen",
      "dependencies": [],
      "functional_paths": [
        "tools/experiments/pip-probe/server.mjs",
        "tools/experiments/pip-probe/view.mjs",
        "tools/codex-app-server-mcp/pip_probe.py",
        "tests/pip-probe.test.mjs",
        "package.json",
        "package-lock.json",
        "src/contracts/backend.mjs"
      ],
      "documentation_paths": [
        "docs/modules/pip-probe.md"
      ],
      "verification_ids": [
        "pip-probe",
        "architecture"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Переписка объявляет только inline/pip в ресурсе и SDK initialize; вызов модели предпочитает inline, без thread entrypoint.",
        "Сохраняется запрос PiP и честная диагностика режима; версия 0.5.14; основная рабочая панель не меняется."
      ],
      "expected_commit_message": "feat: Открывать пробник из ленты без fullscreen",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "prepared-task-flow",
        "task_id": "PIP-INLINE",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "package-lock.json",
        "package.json",
        "src/contracts/backend.mjs",
        "tests/pip-probe.test.mjs",
        "tools/codex-app-server-mcp/pip_probe.py",
        "tools/experiments/pip-probe/server.mjs",
        "tools/experiments/pip-probe/view.mjs"
      ]
    },
    {
      "id": "DOCS-3",
      "title": "Актуализация всех документов проекта",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "prepared-task-flow",
        "task_id": "DOCS-3",
        "role": "implementation",
        "iteration": 3
      },
      "why": "Перед выпуском сверить README, OVERVIEW и действующие контракты модулей с результатом; обновить устаревшее.",
      "dependencies": [
        "PIP-INLINE"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/architecture/OVERVIEW.md",
        "docs/modules/pip-probe.md",
        "README.md",
        "docs/modules/chatgpt-plugin.md"
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
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/pip-probe.md"
      ]
    },
    {
      "id": "BUILD-PIP2",
      "title": "Собрать экспериментальную 0.5.14 для трёх ОС",
      "why": "Собрать экспериментальную 0.5.14 для трёх ОС",
      "dependencies": [
        "DOCS-3"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/modules/pip-probe.md"
      ],
      "verification_ids": [
        "three-platform-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "Единый sourceCommit и проверенные комплекты трёх ОС, без публикации GitHub."
      ],
      "expected_commit_message": "feat: Собрать экспериментальную 0.5.14 для трёх ОС",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "prepared-task-flow",
        "task_id": "BUILD-PIP2",
        "role": "implementation"
      },
      "parallel_safe": false
    },
    {
      "id": "INSTALL-PIP2",
      "title": "Установить готовую экспериментальную 0.5.14",
      "why": "Установить готовую экспериментальную 0.5.14",
      "dependencies": [
        "BUILD-PIP2",
        "DOCS-3"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/modules/pip-probe.md"
      ],
      "verification_ids": [
        "release-installed"
      ],
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Штатная установка с подписью и откатом; работающая служба не останавливается, при необходимости pending."
      ],
      "expected_commit_message": "feat: Установить готовую экспериментальную 0.5.14",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "prepared-task-flow",
        "task_id": "INSTALL-PIP2",
        "role": "implementation"
      },
      "parallel_safe": false
    }
  ],
  "blocked_reason": null,
  "user_decisions": [
    {
      "id": "374e8b1d-bb31-448d-bcf0-044353642a91",
      "text": "Пользователь 20.10.2026 поручил закрыть прежний план и реализовать эти улучшения до публикации нового релиза без пауз.",
      "recorded_at": "2026-10-20T15:33:56.950Z"
    }
  ],
  "parallel_allowed": false,
  "max_workers": 1,
  "execution_strategy": "sequential",
  "execution_reason": "Прямое поручение работать одним агентом; тесно связанные контракты Kit, канала и панели."
}
```
<!-- workflow-state:end -->

## Состояние

Execution Scope Status: ACTIVE
Delivery Status: IN_PROGRESS
Scope: prepared-task-flow
Current Task: нет
Revision: 726

## Цель

Заранее готовить поручения, сократить последовательные ходы и итог, останавливать ожидание после complete; опубликовать новый выпуск.

## Критерии приёмки

- Выполнен контракт docs/planning/prepared-task-flow.md
- Проверены и опубликованы комплекты трёх ОС, выполнена штатная установка macOS.

## Микрозадачи

Выполнение: sequential; разрешено: false; лимит: 1
Причина: Прямое поручение работать одним агентом; тесно связанные контракты Kit, канала и панели.

- [DONE] T001: Сохранять ранние поручения и обрабатывать назначения одним ходом — Завершено
  - Git Commit: [DONE] feat: Сохранять ранние поручения и обрабатывать назначения одним ходом
  - Reference: prepared-task-flow / T001 / implementation
  - Файлы: packages/workflow-kit/src/lib/plan.mjs, packages/workflow-kit/src/lib/simple-workflow.mjs, packages/workflow-kit/src/lib/assignment-dialogue.mjs, packages/workflow-kit/src/lib/role-protocol.mjs, packages/workflow-kit/src/lib/command-help.mjs, src/control/plugin/communication.mjs, src/control/workflow/dialogue-delivery.mjs, tools/codex-app-server-mcp/plugin.py, tests/workflow-channel.test.mjs, tests/dialogue-delivery.test.mjs, tests/codex-app-server-mcp.test.mjs, tests/prepared-task-flow.test.mjs, src/control/plugin/assignment-dialogue.mjs, packages/workflow-kit/src/schemas/plan.schema.json, packages/workflow-kit/src/lib/recovery.mjs, tests/fixtures/automatic-agent-dialogue.mjs, tests/chatgpt-plugin.test.mjs, packages/workflow-kit/src/templates/PLAN.md, docs/planning/prepared-task-flow.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] T002: Сократить обязательный итог и корректно завершать ожидание панели — Завершено
  - Git Commit: [DONE] feat: Сократить обязательный итог и корректно завершать ожидание панели
  - Reference: prepared-task-flow / T002 / implementation
  - Файлы: src/frontend/plugin/launch.mjs, src/control/workflow/parallel-execution.mjs, src/contracts/dialogue-view.mjs, tests/chatgpt-plugin.test.mjs, tests/parallel-finalization.test.mjs, tests/panel-dialogue-view.test.mjs, tests/sidebar.test.mjs, tests/fixtures/plugin-host.mjs, docs/planning/prepared-task-flow.md
  - Параллельность: исключительное выполнение
  - Зависимости: T001
- [DONE] T003: Проверить полный цикл и согласовать версии выпуска — Завершено
  - Git Commit: [DONE] feat: Проверить полный цикл и согласовать версии выпуска
  - Reference: prepared-task-flow / T003 / implementation
  - Файлы: package.json, package-lock.json, packages/workflow-kit/package.json, packages/workflow-kit/src/lib/common.mjs, packages/workflow-kit/src/lib/installer.mjs, src/contracts/backend.mjs, tests/fixtures/automatic-agent-dialogue.mjs, tests/automatic-agent-dialogue.test.mjs, tests/workflow-kit-upgrade.test.mjs, tests/fixtures/released-kit/manifest.json, tests/fixtures/released-kit/kit-1.9.2.tar.gz, tests/fixtures/released-kit/README.md, docs/planning/prepared-task-flow.md
  - Параллельность: исключительное выполнение
  - Зависимости: T002
- [DONE] DOCS: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: Актуализация всех документов проекта
  - Reference: prepared-task-flow / DOCS / implementation
  - Файлы: README.md, docs/architecture/OVERVIEW.md, docs/modules/dialogue-timing.md, docs/modules/assignment-dialogue.md, docs/modules/chatgpt-plugin.md, docs/modules/automatic-agent-dialogue-acceptance.md, docs/modules/release.md, docs/modules/project-compatibility.md, packages/workflow-kit/docs/modules/orchestrated-plans.md, packages/workflow-kit/docs/modules/parallel-assignments.md, packages/workflow-kit/docs/modules/workflow-kit-package.md, docs/planning/prepared-task-flow.md, docs/modules/orchestrated-execution.md, docs/modules/assignment-dialogue-reliability.md, docs/modules/chatgpt-plugin-acceptance.md, docs/acceptance/orchestrated-execution.md, docs/modules/plugin-communication-handoff.md, docs/modules/workflow-execution.md, packages/workflow-kit/src/templates/PLAN.md, tests/fixtures/released-kit/README.md
  - Параллельность: исключительное выполнение
  - Зависимости: T001, T002, T003
- [DONE] RELEASE: Собрать комплект трёх ОС — Завершено
  - Git Commit: [DONE] feat: Собрать комплект трёх ОС
  - Reference: prepared-task-flow / RELEASE / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: DOCS
- [DONE] INSTALL: Установить готовое macOS приложение — Завершено
  - Git Commit: [DONE] feat: Установить готовое macOS приложение
  - Reference: prepared-task-flow / INSTALL / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: RELEASE, DOCS
- [DONE] PUBLISH: Опубликовать проверенный GitHub Release — Завершено
  - Git Commit: [DONE] feat: Опубликовать проверенный GitHub Release
  - Reference: prepared-task-flow / PUBLISH / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: INSTALL, DOCS
- [DONE] PIP-PROBE: Подготовить изолированный опыт основной панели и отдельного PiP — Завершено
  - Git Commit: [DONE] feat: Подготовить изолированный опыт основной панели и отдельного PiP
  - Reference: prepared-task-flow / PIP-PROBE / implementation
  - Файлы: tools/experiments/pip-probe/server.mjs, tools/experiments/pip-probe/view.mjs, tests/pip-probe.test.mjs, docs/modules/chatgpt-plugin.md, docs/planning/pip-probe.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] PIP-INTEGRATE: Включить пассивный PiP пробник в экспериментальную версию 0.5.13 — Завершено
  - Git Commit: [DONE] feat: Включить пассивный PiP пробник в экспериментальную версию 0.5.13
  - Reference: prepared-task-flow / PIP-INTEGRATE / implementation
  - Файлы: tools/experiments/pip-probe/server.mjs, tools/experiments/pip-probe/view.mjs, tools/codex-app-server-mcp/pip_probe.py, tools/codex-app-server-mcp/plugin.py, scripts/stage-chatgpt-plugin.mjs, scripts/check-pip-probe.mjs, tests/pip-probe.test.mjs, .gitignore, package.json, package-lock.json, src/contracts/backend.mjs, docs/planning/pip-probe.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] DOCS-2: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: актуализировать документацию проекта
  - Reference: prepared-task-flow / DOCS-2 / implementation
  - Файлы: docs/architecture/OVERVIEW.md, docs/planning/pip-probe.md, README.md, docs/modules/chatgpt-plugin.md, docs/modules/pip-probe.md
  - Параллельность: исключительное выполнение
  - Зависимости: PIP-PROBE, PIP-INTEGRATE
- [DONE] BUILD-PIP: Собрать экспериментальный комплект трёх ОС 0.5.13 — Завершено
  - Git Commit: [DONE] feat: Собрать экспериментальный комплект трёх ОС 0.5.13
  - Reference: prepared-task-flow / BUILD-PIP / implementation
  - Файлы: release-manifest.json, docs/planning/pip-probe.md
  - Параллельность: исключительное выполнение
  - Зависимости: DOCS-2
- [DONE] INSTALL-PIP: Установить готовую экспериментальную macOS сборку — Завершено
  - Git Commit: [DONE] feat: Установить готовую экспериментальную macOS сборку
  - Reference: prepared-task-flow / INSTALL-PIP / implementation
  - Файлы: release-manifest.json, docs/planning/pip-probe.md
  - Параллельность: исключительное выполнение
  - Зависимости: BUILD-PIP, DOCS-2
- [DONE] PIP-INLINE: Открывать пробник из ленты без fullscreen — Завершено
  - Git Commit: [DONE] feat: Открывать пробник из ленты без fullscreen
  - Reference: prepared-task-flow / PIP-INLINE / implementation
  - Файлы: tools/experiments/pip-probe/server.mjs, tools/experiments/pip-probe/view.mjs, tools/codex-app-server-mcp/pip_probe.py, tests/pip-probe.test.mjs, package.json, package-lock.json, src/contracts/backend.mjs, docs/modules/pip-probe.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] DOCS-3: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: актуализировать документацию проекта
  - Reference: prepared-task-flow / DOCS-3 / implementation
  - Файлы: docs/architecture/OVERVIEW.md, docs/modules/pip-probe.md, README.md, docs/modules/chatgpt-plugin.md
  - Параллельность: исключительное выполнение
  - Зависимости: PIP-INLINE
- [TODO] BUILD-PIP2: Собрать экспериментальную 0.5.14 для трёх ОС — Ожидает
  - Git Commit: [PENDING] feat: Собрать экспериментальную 0.5.14 для трёх ОС
  - Reference: prepared-task-flow / BUILD-PIP2 / implementation
  - Файлы: release-manifest.json, docs/modules/pip-probe.md
  - Параллельность: исключительное выполнение
  - Зависимости: DOCS-3
- [TODO] INSTALL-PIP2: Установить готовую экспериментальную 0.5.14 — Ожидает
  - Git Commit: [PENDING] feat: Установить готовую экспериментальную 0.5.14
  - Reference: prepared-task-flow / INSTALL-PIP2 / implementation
  - Файлы: release-manifest.json, docs/modules/pip-probe.md
  - Параллельность: исключительное выполнение
  - Зависимости: BUILD-PIP2, DOCS-3

## Context Pack For This Cycle

- docs/planning/prepared-task-flow.md
- docs/architecture/OVERVIEW.md
- docs/modules/chatgpt-plugin.md
- docs/planning/pip-probe.md
- docs/modules/pip-probe.md

Служебные состояния меняются только командами workflow. Приёмка не архивирует scope.
