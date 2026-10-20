# Активный план — Workflow_Pilot

<!-- workflow-state:begin -->
```json
{
  "schema_version": 1,
  "plan_revision": 675,
  "project_id": "7411e192-943c-4529-bffb-3b081d9c242f",
  "project_name": "Workflow_Pilot",
  "scope_id": "dialogue-latency-visibility",
  "execution_scope_status": "ACTIVE",
  "delivery_status": "IN_PROGRESS",
  "objective": "Сократить лишние последовательные ожидания O↔E и сделать все стадии, тайминги и приёмку плана понятными до завершения и архива.",
  "acceptance_criteria": [
    "Выполнен контракт docs/planning/dialogue-latency-visibility.md",
    "Опубликован проверенный комплект трёх ОС и установлен готовый macOS bundle.",
    "Независимый анализ рецензента проверен основным агентом и сообщён пользователю до финализации spec/plan; выводы и ограничения перенесены в спецификацию."
  ],
  "approved_scope": {
    "functional_paths": [
      "package-lock.json",
      "package.json",
      "packages/workflow-kit/package.json",
      "packages/workflow-kit/src/lib/common.mjs",
      "packages/workflow-kit/src/lib/installer.mjs",
      "packages/workflow-kit/src/lib/role-protocol.mjs",
      "release-manifest.json",
      "src/backend/desktop-model.mjs",
      "src/contracts/backend.mjs",
      "src/contracts/dialogue-view.mjs",
      "src/contracts/plugin-communication.mjs",
      "src/contracts/workflow-view.mjs",
      "src/control/plugin/assignment-dialogue.mjs",
      "src/control/plugin/communication.mjs",
      "src/control/plugin/enrollment.mjs",
      "src/control/plugin/service.mjs",
      "src/control/plugin/workflow-channel.mjs",
      "src/control/projects/service.mjs",
      "src/control/sessions/workspace-session.mjs",
      "src/control/workflow/dialogue-delivery.mjs",
      "src/control/workflow/execution-projection.mjs",
      "src/control/workflow/parallel-execution.mjs",
      "src/execution/plugin/bridge.mjs",
      "src/frontend/desktop/ui/index.html",
      "src/frontend/desktop/ui/sidebar.mjs",
      "src/frontend/plugin/launch.mjs",
      "src/frontend/plugin/panel.mjs",
      "tests/automatic-agent-dialogue.test.mjs",
      "tests/backend-lifecycle.test.mjs",
      "tests/chatgpt-plugin.test.mjs",
      "tests/codex-app-server-mcp.test.mjs",
      "tests/dialogue-delivery.test.mjs",
      "tests/electron-smoke.mjs",
      "tests/executor-startup-lifecycle.test.mjs",
      "tests/fixtures/automatic-agent-dialogue.mjs",
      "tests/fixtures/released-kit/README.md",
      "tests/fixtures/released-kit/kit-1.9.1.tar.gz",
      "tests/fixtures/released-kit/manifest.json",
      "tests/panel-dialogue-view.test.mjs",
      "tests/parallel-execution-ui.test.mjs",
      "tests/plugin-communication.test.mjs",
      "tests/session-roles.test.mjs",
      "tests/sidebar.test.mjs",
      "tests/workflow-channel.test.mjs",
      "tests/workflow-kit-upgrade.test.mjs",
      "tests/workspace-deletion.test.mjs",
      "tests/workspace-session.test.mjs",
      "tools/codex-app-server-mcp/plugin.py",
      "src/control/workflow/coordination.mjs",
      "src/control/workflow/parallel-kit.mjs",
      "src/control/workflow/session-plans.mjs",
      "tests/parallel-execution.test.mjs",
      "src/control/sessions/session-plans.mjs",
      "tests/session-plans.test.mjs",
      "packages/workflow-kit/scripts/check-parallel-execution-fixture.mjs",
      "tests/parallel-finalization.test.mjs"
    ],
    "documentation_paths": [
      "README.md",
      "docs/architecture/OVERVIEW.md",
      "docs/modules/assignment-dialogue-reliability.md",
      "docs/modules/assignment-dialogue.md",
      "docs/modules/automatic-agent-dialogue-acceptance.md",
      "docs/modules/chatgpt-plugin.md",
      "docs/modules/desktop.md",
      "docs/modules/orchestrated-execution.md",
      "docs/modules/plugin-communication-handoff.md",
      "docs/modules/project-compatibility.md",
      "docs/modules/project-lifecycle.md",
      "docs/modules/release.md",
      "docs/modules/workflow-execution.md",
      "docs/planning/dialogue-latency-visibility.md",
      "packages/workflow-kit/docs/modules/orchestrated-plans.md",
      "packages/workflow-kit/docs/modules/parallel-assignments.md",
      "packages/workflow-kit/docs/modules/workflow-kit-package.md",
      "tests/fixtures/released-kit/README.md",
      "docs/acceptance/orchestrated-execution.md"
    ]
  },
  "baseline_commit": "d920ff1db644d6c218a58f0f7cfde5f8af7743e8",
  "current_task_id": null,
  "context_pack": {
    "documents": [
      {
        "path": "docs/planning/dialogue-latency-visibility.md",
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
        "scope_id": "dialogue-latency-visibility",
        "task_id": "T001",
        "role": "implementation"
      },
      "dependencies": [],
      "functional_paths": [
        "src/control/plugin/assignment-dialogue.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/control/plugin/enrollment.mjs",
        "src/control/plugin/service.mjs",
        "tools/codex-app-server-mcp/plugin.py",
        "packages/workflow-kit/src/lib/role-protocol.mjs",
        "tests/workflow-channel.test.mjs",
        "tests/dialogue-delivery.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "src/contracts/backend.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "src/control/workflow/parallel-execution.mjs"
      ],
      "documentation_paths": [
        "docs/planning/dialogue-latency-visibility.md"
      ],
      "verification_ids": [
        "unit-all",
        "architecture",
        "chatgpt-plugin",
        "executor-channel"
      ],
      "id": "T001",
      "title": "Разрешить подготовленный dispatch по готовности без лишнего хода O",
      "why": "Разрешить подготовленный dispatch по готовности без лишнего хода O",
      "acceptance_criteria": [
        "Prepare до enrollment; O явно разрешает долговечный dispatch при готовности, backend сохраняет авторство и текст.",
        "Generation/attempt/digest/identity/Stop/UNKNOWN проверяются перед эффектом; старое разрешение требует повторного подтверждения, без polling модели.",
        "Ready уже готового/разрешённого пакета не вызывает лишний модельный ход; инструкции и actual MCP согласованы.",
        "Итоговое поручение и канонические правила O используют подтверждённые proof точных SHA; неизменившиеся проверки не повторяются без причины.",
        "Prepare с явной авторизацией O сохраняет и отправляет при готовности одним вызовом; обычный prepare остаётся черновиком. Пакет до ready отправляется механически без дополнительного хода O.",
        "Служебное уведомление содержит recipient_ref; небольшой полный текст inline в read_message снимает лишний read_context. Большие части сохраняют обязательное полное чтение.",
        "Ненужные ещё не начатые ready/recovery того же assignment/attempt гасятся после авторизации; уже прочитанные требуют yield, SDK intent/UNKNOWN не получают выдуманного завершения.",
        "Отдельная фаза авторизации связана с generation/boot/recipient/attempt/digest; при смене требуется подтверждение O. Полные ролевые правила не исключаются на основании одного прежнего чтения."
      ],
      "expected_commit_message": "feat: Разрешить подготовленный dispatch по готовности без лишнего хода O",
      "parallel_safe": false,
      "actual_files": [
        "packages/workflow-kit/src/lib/role-protocol.mjs",
        "src/control/plugin/assignment-dialogue.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/control/workflow/parallel-execution.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/dialogue-delivery.test.mjs",
        "tests/workflow-channel.test.mjs",
        "tools/codex-app-server-mcp/plugin.py"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "dialogue-latency-visibility",
        "task_id": "T002",
        "role": "implementation"
      },
      "dependencies": [
        "T001"
      ],
      "functional_paths": [
        "src/frontend/plugin/launch.mjs",
        "src/frontend/plugin/panel.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "tools/codex-app-server-mcp/plugin.py",
        "src/execution/plugin/bridge.mjs",
        "src/contracts/plugin-communication.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/plugin-communication.test.mjs",
        "tests/workflow-channel.test.mjs",
        "src/contracts/backend.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "src/control/plugin/service.mjs",
        "src/control/plugin/enrollment.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/control/workflow/parallel-kit.mjs",
        "src/control/workflow/session-plans.mjs",
        "src/control/sessions/session-plans.mjs",
        "tests/dialogue-delivery.test.mjs",
        "tests/session-plans.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "architecture",
        "chatgpt-plugin",
        "executor-channel"
      ],
      "id": "T002",
      "title": "Ускорить доставку и измерять границы панели и backend",
      "why": "Ускорить доставку и измерять границы панели и backend",
      "acceptance_criteria": [
        "UI refresh/диагностика не блокируют функциональный цикл; coalescing ограничен и безопасен после rebind/dispose.",
        "Пакетная ограниченная telemetry связывает spans message/attempt и clocks, экспорт сохраняет gaps без секретов; SDK UNKNOWN не повторяется.",
        "Интервалы очереди/панели/SDK/хоста/агента различены; скрытое рассуждение не выдумывается.",
        "Панель использует объединённый claim/verify с прежними проверками и durable intent, старые API остаются. Wait продлевает только действующую lease того же поколения; sync не нужен перед каждым циклом.",
        "Диагностические и чужие события не создают функциональные пробуждения; изменение разрешения/удаление/ошибка будит нужных участников. UI refresh не запускает полный Kit roster на каждый wake.",
        "Queue/handler/Kit/observer spans и причины deferred измеряются отдельно; mount duration не выдаётся за длительность операции. Не менее одного fixture с медленной диагностикой/Kit status проверяет отсутствие блокировки доставки соседу.",
        "Медленные чтения выводятся из общей очереди только при повторной проверке актуального поколения/ревизии перед эффектом. TTL-кэш не заменяет разрешение; оставшиеся последовательные проверки измеряются.",
        "Измерение вызовов SessionPlans относится к существующему src/control/sessions/session-plans.mjs; путь src/control/workflow/session-plans.mjs в исходном перечне — опечатка, не создавать такой файл."
      ],
      "expected_commit_message": "feat: Ускорить доставку и измерять границы панели и backend",
      "parallel_safe": false,
      "actual_files": [
        "src/contracts/backend.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/service.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/control/sessions/session-plans.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/parallel-kit.mjs",
        "src/frontend/plugin/launch.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/dialogue-delivery.test.mjs",
        "tests/session-plans.test.mjs",
        "tests/workflow-channel.test.mjs",
        "tools/codex-app-server-mcp/plugin.py"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "dialogue-latency-visibility",
        "task_id": "T006",
        "role": "implementation"
      },
      "dependencies": [
        "T002"
      ],
      "functional_paths": [
        "src/control/workflow/parallel-execution.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/control/plugin/assignment-dialogue.mjs",
        "packages/workflow-kit/src/lib/role-protocol.mjs",
        "tests/parallel-execution.test.mjs",
        "tests/workflow-channel.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/automatic-agent-dialogue.test.mjs",
        "packages/workflow-kit/scripts/check-parallel-execution-fixture.mjs",
        "src/control/workflow/parallel-kit.mjs",
        "tests/parallel-finalization.test.mjs",
        "tests/dialogue-delivery.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "architecture",
        "executor-channel"
      ],
      "id": "T006",
      "title": "Перекрыть запуск DOCS и финализацию с независимыми хвостами диалога",
      "why": "Снять барьер конца текстового ответа O для bootstrap DOCS и перекрыть итоговый ход с terminal acceptance, сохранив подтверждённую очистку и complete.",
      "acceptance_criteria": [
        "В dialogue v1 bootstrap DOCS начинается после подтверждённых интеграций при ещё активном текстовом ходе O, но не при грязном main, активной команде, интеграции/транзакции, Stop или stale базе; Kit сохраняет единственного writer и повторяемый ID.",
        "Финальное поручение может обрабатываться параллельно acceptance E после всех обязательных интеграций/delivery; его факты о SHA/proof/cleanup актуальны. Delivery с побочными эффектами сохраняет прежние ограничения.",
        "Cleanup вызывается при null/PENDING, пропускается только при явном DONE всех назначений. Ранний cleanup оставляет PENDING и продолжается backend после terminal receipt; transport_closed не считается cleanup DONE.",
        "Complete сохраняется только после channelSettled, всех cleanup DONE, чистого подтверждённого main, отсутствия команд и конца O. Ошибка, новая задача, restart/Stop/UNKNOWN не вызывают повторный итог или ложное завершение.",
        "Fixtures отдельно проверяют overlap DOCS/O и final/E, нулевые/ожидающие/завершённые cleanup, отсутствие повторных проверок неизменившегося SHA; истинный новый main требует новой проверки.",
        "Проверить Kit-команду O во время длительного setup DOCS: WORKFLOW_LOCKED означает повторяемое ожидание занятости без эскалации пользователю и без повтора уже совершённого эффекта. Ролевой протокол явно объясняет временную блокировку при подготовке назначения; повтор использует прежний operation/idempotency key и актуальное состояние."
      ],
      "expected_commit_message": "fix: перекрыть независимые стадии DOCS и завершения",
      "parallel_safe": false,
      "actual_files": [
        "packages/workflow-kit/scripts/check-parallel-execution-fixture.mjs",
        "packages/workflow-kit/src/lib/role-protocol.mjs",
        "src/control/workflow/parallel-execution.mjs",
        "src/control/workflow/parallel-kit.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/parallel-execution.test.mjs",
        "tests/parallel-finalization.test.mjs",
        "tests/dialogue-delivery.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "dialogue-latency-visibility",
        "task_id": "T003",
        "role": "implementation"
      },
      "dependencies": [
        "T006"
      ],
      "functional_paths": [
        "src/contracts/dialogue-view.mjs",
        "src/contracts/workflow-view.mjs",
        "src/control/workflow/execution-projection.mjs",
        "src/backend/desktop-model.mjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/frontend/desktop/ui/index.html",
        "src/frontend/plugin/panel.mjs",
        "tests/sidebar.test.mjs",
        "tests/panel-dialogue-view.test.mjs",
        "tests/parallel-execution-ui.test.mjs",
        "tests/electron-smoke.mjs",
        "tests/executor-startup-lifecycle.test.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "tests/workflow-channel.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "architecture",
        "electron-smoke",
        "chatgpt-plugin"
      ],
      "id": "T003",
      "title": "Показывать текущие действия и отличать интеграции от завершения плана",
      "why": "Показывать текущие действия и отличать интеграции от завершения плана",
      "acceptance_criteria": [
        "Orchestrated sidebar показывает известные стадии O/E, причину и время этапа; нет фиктивных процентов/модельных сообщений.",
        "3/3 интеграции при active не означают завершение плана; complete показан отдельно с приёмкой пользователя.",
        "Native/HTTP contract одинаков, старые переключатели не возвращаются."
      ],
      "expected_commit_message": "feat: Показывать текущие действия и отличать интеграции от завершения плана",
      "parallel_safe": false,
      "actual_files": [
        "src/backend/desktop-model.mjs",
        "src/contracts/dialogue-view.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/frontend/plugin/panel.mjs",
        "tests/panel-dialogue-view.test.mjs",
        "tests/sidebar.test.mjs",
        "tests/workflow-channel.test.mjs"
      ]
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "dialogue-latency-visibility",
        "task_id": "T004",
        "role": "implementation"
      },
      "dependencies": [
        "T003"
      ],
      "functional_paths": [
        "src/control/sessions/workspace-session.mjs",
        "src/control/projects/service.mjs",
        "src/backend/desktop-model.mjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "tests/sidebar.test.mjs",
        "tests/workspace-session.test.mjs",
        "tests/workspace-deletion.test.mjs",
        "tests/session-roles.test.mjs",
        "tests/backend-lifecycle.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "architecture"
      ],
      "id": "T004",
      "title": "Согласовать приёмку плана и архивирование завершённого проекта",
      "why": "Согласовать приёмку плана и архивирование завершённого проекта",
      "acceptance_criteria": [
        "Complete+ACTIVE scope не считается работающим планом при архивировании; предупреждение stop только при незавершённом выполнении.",
        "Понятная инструкция пользовательской приёмки; архив проекта не подменяет Kit archive scope.",
        "Возврат complete не возобновляет grant; running/paused/stale состояния защищены.",
        "Finalizing защищён как незавершённое выполнение; актуальный backend проверяется независимо от устаревшей UI-карточки."
      ],
      "expected_commit_message": "feat: Согласовать приёмку плана и архивирование завершённого проекта",
      "parallel_safe": false
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "dialogue-latency-visibility",
        "task_id": "T005",
        "role": "implementation"
      },
      "dependencies": [
        "T004"
      ],
      "functional_paths": [
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/automatic-agent-dialogue.test.mjs",
        "tests/electron-smoke.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/fixtures/released-kit/manifest.json",
        "tests/fixtures/released-kit/kit-1.9.1.tar.gz",
        "tests/workflow-kit-upgrade.test.mjs",
        "packages/workflow-kit/src/lib/installer.mjs",
        "packages/workflow-kit/src/lib/common.mjs",
        "package.json",
        "package-lock.json",
        "packages/workflow-kit/package.json",
        "src/contracts/backend.mjs",
        "tests/fixtures/released-kit/README.md"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "architecture",
        "kit-check",
        "kit-assignments",
        "electron-smoke",
        "chatgpt-plugin",
        "executor-channel",
        "release-tooling",
        "kit-upgrade"
      ],
      "id": "T005",
      "title": "Проверить полный быстрый цикл и согласовать новый выпуск",
      "why": "Проверить полный быстрый цикл и согласовать новый выпуск",
      "acceptance_criteria": [
        "Полный 2E→DOCS→cleanup→complete с явной отложенной отправкой, поздними квитанциями и задержками UI проходит реальные API/Kit/Git fixtures.",
        "Свободные номера app/Kit согласованы, обновление предыдущего Kit сохраняет задачи и блокирует незавершённые назначения.",
        "Живая скорость и host thinking не объявлены доказанными; экспорт и UI проверены на измеренные факты.",
        "Финальный путь не требует повторять неизменившиеся проверки точных SHA, при изменении исходников повтор обязателен.",
        "Полный fixture доказывает отсутствие лишнего ready-хода, inline служебные данные, bootstrap DOCS при активном ответе O и итог до terminal E без преждевременного complete. Контролируемые задержки проверяют число вызовов и границы, не скорость живой модели."
      ],
      "expected_commit_message": "feat: Проверить полный быстрый цикл и согласовать новый выпуск",
      "parallel_safe": false
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "dialogue-latency-visibility",
        "task_id": "DOCS",
        "role": "implementation"
      },
      "dependencies": [
        "T001",
        "T002",
        "T006",
        "T003",
        "T004",
        "T005"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/assignment-dialogue.md",
        "docs/modules/assignment-dialogue-reliability.md",
        "docs/modules/automatic-agent-dialogue-acceptance.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/desktop.md",
        "docs/modules/project-lifecycle.md",
        "docs/planning/dialogue-latency-visibility.md",
        "docs/modules/orchestrated-execution.md",
        "docs/modules/release.md",
        "docs/modules/project-compatibility.md",
        "docs/modules/workflow-execution.md",
        "packages/workflow-kit/docs/modules/workflow-kit-package.md",
        "packages/workflow-kit/docs/modules/orchestrated-plans.md",
        "packages/workflow-kit/docs/modules/parallel-assignments.md",
        "docs/modules/plugin-communication-handoff.md",
        "tests/fixtures/released-kit/README.md",
        "docs/acceptance/orchestrated-execution.md"
      ],
      "verification_ids": [],
      "id": "DOCS",
      "title": "Актуализация всех документов проекта",
      "why": "Актуализировать документацию перед выпуском",
      "acceptance_criteria": [
        "Действующие контракты и README/OVERVIEW соответствуют выпуску; спецификация перенесена в модули и удалена с точным required Git blob.",
        "Сверены версии app/Kit/build_id и отсутствие прежних требований ждать отдельный ready или останавливать complete при архивировании."
      ],
      "expected_commit_message": "docs: Актуализировать документацию перед выпуском",
      "parallel_safe": false
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "dialogue-latency-visibility",
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
      "title": "Собрать единый комплект трёх ОС",
      "why": "Собрать единый комплект трёх ОС",
      "acceptance_criteria": [
        "После DOCS общий sourceCommit, строгий состав/signature/digests; Python-кэши удалены по AGENTS."
      ],
      "expected_commit_message": "feat: Собрать единый комплект трёх ОС",
      "verification_kind": "package",
      "parallel_safe": false
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "dialogue-latency-visibility",
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
      "why": "Установить готовый macOS-комплект",
      "acceptance_criteria": [
        "Штатный installer в /Applications без пересборки/остановки службы; pending отделён от активной установки."
      ],
      "expected_commit_message": "feat: Установить готовый macOS-комплект",
      "verification_kind": "installed",
      "parallel_safe": false
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "dialogue-latency-visibility",
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
      "title": "Опубликовать выпуск на GitHub",
      "why": "Опубликовать выпуск на GitHub",
      "acceptance_criteria": [
        "Тег и полный набор assets проверены, remote main актуален; пользователь получает ограничения и следующий тест."
      ],
      "expected_commit_message": "feat: Опубликовать выпуск на GitHub",
      "verification_kind": "package",
      "parallel_safe": false
    }
  ],
  "blocked_reason": null,
  "user_decisions": [
    {
      "id": "8182372d-3a1e-4b5e-b559-7e0def8f5dd5",
      "text": "Пользователь 20.10.2026 поручил закрыть предыдущий план и реализовать новый до публикации GitHub; добавил ясную приёмку и корректное архивирование. Работа одним агентом.",
      "recorded_at": "2026-10-20T11:42:49.782Z"
    }
  ],
  "parallel_allowed": false,
  "max_workers": 1,
  "execution_strategy": "sequential",
  "execution_reason": "Прямое решение пользователя и AGENTS: разработка одним агентом; связанные контракты доставки, диагностики и UI."
}
```
<!-- workflow-state:end -->

## Состояние

Execution Scope Status: ACTIVE
Delivery Status: IN_PROGRESS
Scope: dialogue-latency-visibility
Current Task: нет
Revision: 675

## Цель

Сократить лишние последовательные ожидания O↔E и сделать все стадии, тайминги и приёмку плана понятными до завершения и архива.

## Критерии приёмки

- Выполнен контракт docs/planning/dialogue-latency-visibility.md
- Опубликован проверенный комплект трёх ОС и установлен готовый macOS bundle.
- Независимый анализ рецензента проверен основным агентом и сообщён пользователю до финализации spec/plan; выводы и ограничения перенесены в спецификацию.

## Микрозадачи

Выполнение: sequential; разрешено: false; лимит: 1
Причина: Прямое решение пользователя и AGENTS: разработка одним агентом; связанные контракты доставки, диагностики и UI.

- [DONE] T001: Разрешить подготовленный dispatch по готовности без лишнего хода O — Завершено
  - Git Commit: [DONE] feat: Разрешить подготовленный dispatch по готовности без лишнего хода O
  - Reference: dialogue-latency-visibility / T001 / implementation
  - Файлы: src/control/plugin/assignment-dialogue.mjs, src/control/plugin/communication.mjs, src/control/plugin/workflow-channel.mjs, src/control/workflow/dialogue-delivery.mjs, src/control/plugin/enrollment.mjs, src/control/plugin/service.mjs, tools/codex-app-server-mcp/plugin.py, packages/workflow-kit/src/lib/role-protocol.mjs, tests/workflow-channel.test.mjs, tests/dialogue-delivery.test.mjs, tests/chatgpt-plugin.test.mjs, src/contracts/backend.mjs, tests/codex-app-server-mcp.test.mjs, src/control/workflow/parallel-execution.mjs, docs/planning/dialogue-latency-visibility.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] T002: Ускорить доставку и измерять границы панели и backend — Завершено
  - Git Commit: [DONE] feat: Ускорить доставку и измерять границы панели и backend
  - Reference: dialogue-latency-visibility / T002 / implementation
  - Файлы: src/frontend/plugin/launch.mjs, src/frontend/plugin/panel.mjs, src/control/plugin/communication.mjs, src/control/plugin/workflow-channel.mjs, tools/codex-app-server-mcp/plugin.py, src/execution/plugin/bridge.mjs, src/contracts/plugin-communication.mjs, tests/chatgpt-plugin.test.mjs, tests/plugin-communication.test.mjs, tests/workflow-channel.test.mjs, src/contracts/backend.mjs, tests/codex-app-server-mcp.test.mjs, src/control/plugin/service.mjs, src/control/plugin/enrollment.mjs, src/control/workflow/coordination.mjs, src/control/workflow/dialogue-delivery.mjs, src/control/workflow/parallel-kit.mjs, src/control/workflow/session-plans.mjs, src/control/sessions/session-plans.mjs, tests/dialogue-delivery.test.mjs, tests/session-plans.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: T001
- [DONE] T006: Перекрыть запуск DOCS и финализацию с независимыми хвостами диалога — Завершено
  - Git Commit: [DONE] fix: перекрыть независимые стадии DOCS и завершения
  - Reference: dialogue-latency-visibility / T006 / implementation
  - Файлы: src/control/workflow/parallel-execution.mjs, src/control/workflow/coordination.mjs, src/control/workflow/dialogue-delivery.mjs, src/control/plugin/assignment-dialogue.mjs, packages/workflow-kit/src/lib/role-protocol.mjs, tests/parallel-execution.test.mjs, tests/workflow-channel.test.mjs, tests/fixtures/automatic-agent-dialogue.mjs, tests/automatic-agent-dialogue.test.mjs, packages/workflow-kit/scripts/check-parallel-execution-fixture.mjs, src/control/workflow/parallel-kit.mjs, tests/parallel-finalization.test.mjs, tests/dialogue-delivery.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: T002
- [DONE] T003: Показывать текущие действия и отличать интеграции от завершения плана — Завершено
  - Git Commit: [DONE] feat: Показывать текущие действия и отличать интеграции от завершения плана
  - Reference: dialogue-latency-visibility / T003 / implementation
  - Файлы: src/contracts/dialogue-view.mjs, src/contracts/workflow-view.mjs, src/control/workflow/execution-projection.mjs, src/backend/desktop-model.mjs, src/frontend/desktop/ui/sidebar.mjs, src/frontend/desktop/ui/index.html, src/frontend/plugin/panel.mjs, tests/sidebar.test.mjs, tests/panel-dialogue-view.test.mjs, tests/parallel-execution-ui.test.mjs, tests/electron-smoke.mjs, tests/executor-startup-lifecycle.test.mjs, src/control/plugin/workflow-channel.mjs, tests/workflow-channel.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: T006
- [TODO] T004: Согласовать приёмку плана и архивирование завершённого проекта — Ожидает
  - Git Commit: [PENDING] feat: Согласовать приёмку плана и архивирование завершённого проекта
  - Reference: dialogue-latency-visibility / T004 / implementation
  - Файлы: src/control/sessions/workspace-session.mjs, src/control/projects/service.mjs, src/backend/desktop-model.mjs, src/frontend/desktop/ui/sidebar.mjs, tests/sidebar.test.mjs, tests/workspace-session.test.mjs, tests/workspace-deletion.test.mjs, tests/session-roles.test.mjs, tests/backend-lifecycle.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: T003
- [TODO] T005: Проверить полный быстрый цикл и согласовать новый выпуск — Ожидает
  - Git Commit: [PENDING] feat: Проверить полный быстрый цикл и согласовать новый выпуск
  - Reference: dialogue-latency-visibility / T005 / implementation
  - Файлы: tests/fixtures/automatic-agent-dialogue.mjs, tests/automatic-agent-dialogue.test.mjs, tests/electron-smoke.mjs, tests/chatgpt-plugin.test.mjs, tests/codex-app-server-mcp.test.mjs, tests/fixtures/released-kit/manifest.json, tests/fixtures/released-kit/kit-1.9.1.tar.gz, tests/workflow-kit-upgrade.test.mjs, packages/workflow-kit/src/lib/installer.mjs, packages/workflow-kit/src/lib/common.mjs, package.json, package-lock.json, packages/workflow-kit/package.json, src/contracts/backend.mjs, tests/fixtures/released-kit/README.md
  - Параллельность: исключительное выполнение
  - Зависимости: T004
- [TODO] DOCS: Актуализация всех документов проекта — Ожидает
  - Git Commit: [PENDING] docs: Актуализировать документацию перед выпуском
  - Reference: dialogue-latency-visibility / DOCS / implementation
  - Файлы: README.md, docs/architecture/OVERVIEW.md, docs/modules/assignment-dialogue.md, docs/modules/assignment-dialogue-reliability.md, docs/modules/automatic-agent-dialogue-acceptance.md, docs/modules/chatgpt-plugin.md, docs/modules/desktop.md, docs/modules/project-lifecycle.md, docs/planning/dialogue-latency-visibility.md, docs/modules/orchestrated-execution.md, docs/modules/release.md, docs/modules/project-compatibility.md, docs/modules/workflow-execution.md, packages/workflow-kit/docs/modules/workflow-kit-package.md, packages/workflow-kit/docs/modules/orchestrated-plans.md, packages/workflow-kit/docs/modules/parallel-assignments.md, docs/modules/plugin-communication-handoff.md, tests/fixtures/released-kit/README.md, docs/acceptance/orchestrated-execution.md
  - Параллельность: исключительное выполнение
  - Зависимости: T001, T002, T006, T003, T004, T005
- [TODO] RELEASE: Собрать единый комплект трёх ОС — Ожидает
  - Git Commit: [PENDING] feat: Собрать единый комплект трёх ОС
  - Reference: dialogue-latency-visibility / RELEASE / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: DOCS
- [TODO] INSTALL: Установить готовый macOS-комплект — Ожидает
  - Git Commit: [PENDING] feat: Установить готовый macOS-комплект
  - Reference: dialogue-latency-visibility / INSTALL / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: RELEASE, DOCS
- [TODO] PUBLISH: Опубликовать выпуск на GitHub — Ожидает
  - Git Commit: [PENDING] feat: Опубликовать выпуск на GitHub
  - Reference: dialogue-latency-visibility / PUBLISH / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: INSTALL, DOCS

## Context Pack For This Cycle

- docs/planning/dialogue-latency-visibility.md
- docs/architecture/OVERVIEW.md

Служебные состояния меняются только командами workflow. Приёмка не архивирует scope.
