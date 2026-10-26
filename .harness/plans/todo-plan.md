# Активный план — Workflow_Pilot

<!-- workflow-state:begin -->
```json
{
  "schema_version": 1,
  "plan_revision": 1208,
  "project_id": "7411e192-943c-4529-bffb-3b081d9c242f",
  "project_name": "Workflow_Pilot",
  "scope_id": "sdk-busy-recipient",
  "execution_scope_status": "ACTIVE",
  "delivery_status": "IN_PROGRESS",
  "objective": "Проверить два уведомления о готовых результатах занятому O через SDK и полный цикл до cleanup/complete, с публикацией лишь после живого GO и возвратом к поведению 0.5.36 при неудаче.",
  "acceptance_criteria": [
    "Эксперимент прекращён по прямому поручению пользователя; достигнутые факты и невыполненные проверки сохранены без объявления GO или публикации."
  ],
  "approved_scope": {
    "functional_paths": [
      "src/execution/plugin/sdk-busy-experiment.mjs",
      "scripts/prepare-sdk-busy-experiment.mjs",
      "src/execution/facade.mjs",
      "src/control/facade.mjs",
      "src/backend/desktop-model.mjs",
      "src/control/plugin/service.mjs",
      "src/control/workflow/coordination.mjs",
      "src/contracts/plugin-communication.mjs",
      "tests/sdk-busy-experiment.test.mjs",
      "tests/backend-desktop-model.test.mjs",
      "tests/desktop-boundaries.test.mjs",
      "src/control/plugin/workflow-channel.mjs",
      "src/control/plugin/communication.mjs",
      "src/control/workflow/dialogue-delivery.mjs",
      "src/control/workflow/executor-session.mjs",
      "src/execution/plugin/communication-store.mjs",
      "src/frontend/plugin/launch.mjs",
      "src/frontend/plugin/panel.mjs",
      "tests/workflow-channel.test.mjs",
      "tests/plugin-communication.test.mjs",
      "tests/dialogue-delivery.test.mjs",
      "tests/chatgpt-plugin.test.mjs",
      "src/execution/plugin/sdk-busy-probe.mjs",
      "src/execution/plugin/bridge.mjs",
      "src/contracts/backend.mjs",
      "tools/codex-app-server-mcp/plugin.py",
      "scripts/analyze-sdk-busy-experiment.mjs",
      "tests/sdk-busy-analysis.test.mjs",
      "tests/codex-app-server-mcp.test.mjs",
      "tests/automatic-agent-dialogue.test.mjs",
      "tests/fixtures/automatic-agent-dialogue.mjs",
      "tests/electron-smoke.mjs",
      "tests/migration-compatibility.test.mjs",
      "package.json",
      "package-lock.json",
      "scripts/stage-chatgpt-plugin.mjs",
      "release-manifest.json",
      "src/control/workflow/command-activity.mjs",
      "tests/command-activity.test.mjs"
    ],
    "documentation_paths": [
      "docs/planning/sdk-busy-recipient.md",
      "docs/planning/sdk-busy-recipient-acceptance.md",
      "docs/planning/sdk-busy-recipient-delivery.md",
      "README.md",
      "docs/architecture/OVERVIEW.md",
      "docs/modules/sdk-busy-delivery.md",
      "docs/acceptance/sdk-busy-recipient.md",
      "docs/modules/chatgpt-plugin.md",
      "docs/modules/assignment-dialogue-reliability.md",
      "docs/modules/dialogue-timing.md",
      "docs/modules/current-actions.md",
      "docs/modules/project-compatibility.md",
      "docs/modules/release.md",
      "docs/planning/sdk-messaging.md"
    ]
  },
  "baseline_commit": "2b98a5a0745a7f85c103ec9b88ca2dd7d2b1bbe5",
  "current_task_id": null,
  "context_pack": {
    "documents": [
      {
        "path": "docs/modules/sdk-busy-delivery.md",
        "required": true,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/architecture/OVERVIEW.md",
        "required": true,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/acceptance/sdk-busy-recipient.md",
        "required": false,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/planning/sdk-busy-recipient.md",
        "required": false,
        "revision": "f51752ab25451636fc71c780c0ec735a9d3b0d61"
      },
      {
        "path": "docs/planning/sdk-busy-recipient-acceptance.md",
        "required": false,
        "revision": "f51752ab25451636fc71c780c0ec735a9d3b0d61"
      },
      {
        "path": "docs/planning/sdk-busy-recipient-delivery.md",
        "required": false,
        "revision": "f51752ab25451636fc71c780c0ec735a9d3b0d61"
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
        "scope_id": "sdk-busy-recipient",
        "task_id": "POLICY",
        "role": "implementation"
      },
      "dependencies": [],
      "functional_paths": [
        "src/execution/plugin/sdk-busy-experiment.mjs",
        "scripts/prepare-sdk-busy-experiment.mjs",
        "src/execution/facade.mjs",
        "src/control/facade.mjs",
        "src/backend/desktop-model.mjs",
        "src/control/plugin/service.mjs",
        "src/control/workflow/coordination.mjs",
        "src/contracts/plugin-communication.mjs",
        "tests/sdk-busy-experiment.test.mjs",
        "tests/backend-desktop-model.test.mjs",
        "tests/desktop-boundaries.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "architecture"
      ],
      "id": "POLICY",
      "title": "Ограничить опыт точным тестовым scope и двумя result",
      "why": "Единый проверяемый профиль без глобального обхода",
      "acceptance_criteria": [
        "Базис 0.5.36, все assets/signature и manifest проверены и сохранены; отдельная codex/sdk-busy-recipient ветка от опубликованного плана, без чужих правок.",
        "Профиль off|sdk-busy-burst, exact own workspace/project/scope/O/build; mode off равен базе. Локальное вооружение case, лимит 2 на case, атомарная проверенная запись и отказ на симлинки/чужой scope; модель/панель не могут включить опыт.",
        "Execution читает IO и передаёт проверенную конфигурацию Control через фасады, без нового scheduler. При Start фиксируется допуск; rearm только локально в тех же пределах; restart не восстанавливает разрешение новых отправок.",
        "Сохранены ручной Stop/Пауза, draft, identity/document/login/connection, grant/attempt/proof и UNKNOWN. Конфигурация не меняет Kit и других проектов."
      ],
      "expected_commit_message": "feat: ограничить опыт точным тестовым scope и двумя result",
      "parallel_safe": false,
      "task_brief": "Разрешены пока только подготовка и Review; исполнение после отдельного поручения пользователя. Разработка последовательная через Kit без делегирования/моделей/UI control, donor и рабочие профили не менять. Сохранить 0.5.36, отдельные SDK/read/yield/exact-SHA/integration/complete и UNKNOWN без повтора. Реализовать профиль/IO/подготовительный скрипт и маршрутизацию по основному контракту. До кода перепроверить комплект BASE и git; runtime baseline-info не присваивать пользовательскому тесту live PASS. Тесты через существующие границы API/fixtures. Политика разработки sequential, два E только в тестовом продукте.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/sdk-busy-recipient.md",
            "required": true,
            "revision": "f51752ab25451636fc71c780c0ec735a9d3b0d61"
          },
          {
            "path": "docs/planning/sdk-busy-recipient-acceptance.md",
            "required": false
          },
          {
            "path": "docs/planning/sdk-busy-recipient-delivery.md",
            "required": false
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "actual_files": [
        "scripts/prepare-sdk-busy-experiment.mjs",
        "src/contracts/plugin-communication.mjs",
        "src/control/facade.mjs",
        "src/control/plugin/service.mjs",
        "src/execution/facade.mjs",
        "src/execution/plugin/sdk-busy-experiment.mjs",
        "tests/sdk-busy-experiment.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "sdk-busy-recipient",
        "task_id": "DISPATCH",
        "role": "implementation"
      },
      "dependencies": [
        "POLICY"
      ],
      "functional_paths": [
        "src/control/plugin/workflow-channel.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/control/workflow/executor-session.mjs",
        "src/control/workflow/coordination.mjs",
        "src/contracts/plugin-communication.mjs",
        "src/execution/plugin/communication-store.mjs",
        "src/frontend/plugin/launch.mjs",
        "src/frontend/plugin/panel.mjs",
        "tests/workflow-channel.test.mjs",
        "tests/plugin-communication.test.mjs",
        "tests/dialogue-delivery.test.mjs",
        "tests/sdk-busy-experiment.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "src/control/workflow/command-activity.mjs",
        "tests/command-activity.test.mjs",
        "src/control/plugin/service.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "chatgpt-plugin",
        "architecture"
      ],
      "id": "DISPATCH",
      "title": "Доставлять два результата занятому O без потери gates",
      "why": "Сквозной допуск и ограниченное исключение FIFO",
      "acceptance_criteria": [
        "Один узкий допуск проведён через pending/first/claimBlockReason/physicalBlock/admit/_verify с alreadyChecked=true и false, reservation не возвращает скрытый canSend. Busy/writable/lastRole обходятся лишь для своих selected result.",
        "Второе из двух result того же case отправляется последовательно после быстрого SDK Promise первого без ожидания его read/yield/idle; иные непрочитанные/UNKNOWN/старые startup/вопросы остаются барьером. Порядок сохранения и два слота долговечны; третьего вызова/двойной попытки нет.",
        "Прежний member.deliveryGate сохранён; оба accepted+read+yielded message.handlingGate наблюдаются/восстанавливаются штатно, включая progress, probes и settled, без подделки reply_observed и снятия обычных acceptance/complete барьеров.",
        "90-секундный экспериментальный SDK не истекает из-за 60-секундного lease: адресный штатный sync, Stop/expiry/remount/generation не дают нового Send; ordinary 10 секунд сохранены. Late report/Promise не меняет терминальный исход самовольно.",
        "Mode off, choice/read 0.5.36, startup и остальные сообщения без регрессий; read-only команда пока остаётся запретом без отдельно доказанной точной probe-авторизации.",
        "В экспериментальном допуске учитываются все активные команды, включая read_only_verified/services, а не только commandActive/blocksIntegration: tool-wait/generation блокируются любой командой; исключение только единственная закреплённая probe с совпавшими command_hash/nonce/command-id. Mode off не меняется."
      ],
      "expected_commit_message": "feat: доставлять два результата занятому o без потери gates",
      "parallel_safe": false,
      "task_brief": "Разрешены пока только подготовка и Review; исполнение после отдельного поручения пользователя. Разработка последовательная через Kit без делегирования/моделей/UI control, donor и рабочие профили не менять. Сохранить 0.5.36, отдельные SDK/read/yield/exact-SHA/integration/complete и UNKNOWN без повтора. Реализовать ограниченное исключение для двух заранее выбранных независимых result, общий реальный SDK-путь и хранение gates. Не делать все сообщения complete по accepted/read. Измерение/hold не заменяет разрешения; без повторов при UNKNOWN. Проверить текущие named точки кода и настоящие renderer/SDK fixtures. Учитывать ранний model-pull: выбранная пара INCONCLUSIVE, не посылать прочитанное уведомление; сохранить отправленные intents. Полный снимок команд включает verified read-only/services; ordinary off не меняется.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/sdk-busy-recipient.md",
            "required": true,
            "revision": "f51752ab25451636fc71c780c0ec735a9d3b0d61"
          },
          {
            "path": "docs/planning/sdk-busy-recipient-acceptance.md",
            "required": false
          },
          {
            "path": "docs/planning/sdk-busy-recipient-delivery.md",
            "required": false
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": [
          "POLICY"
        ]
      },
      "actual_files": [
        "src/control/plugin/communication.mjs",
        "src/control/plugin/service.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/control/workflow/command-activity.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/control/workflow/executor-session.mjs",
        "src/frontend/plugin/launch.mjs",
        "tests/command-activity.test.mjs",
        "tests/dialogue-delivery.test.mjs",
        "tests/workflow-channel.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "sdk-busy-recipient",
        "task_id": "PROBE",
        "role": "implementation"
      },
      "dependencies": [
        "DISPATCH"
      ],
      "functional_paths": [
        "src/execution/plugin/sdk-busy-experiment.mjs",
        "src/execution/plugin/sdk-busy-probe.mjs",
        "src/execution/plugin/bridge.mjs",
        "src/execution/facade.mjs",
        "src/backend/desktop-model.mjs",
        "src/control/plugin/service.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/control/workflow/coordination.mjs",
        "src/contracts/backend.mjs",
        "src/contracts/plugin-communication.mjs",
        "src/frontend/plugin/launch.mjs",
        "src/frontend/plugin/panel.mjs",
        "tools/codex-app-server-mcp/plugin.py",
        "scripts/analyze-sdk-busy-experiment.mjs",
        "tests/sdk-busy-experiment.test.mjs",
        "tests/sdk-busy-analysis.test.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/plugin-communication.test.mjs",
        "src/control/workflow/command-activity.mjs",
        "tests/command-activity.test.mjs",
        "scripts/prepare-sdk-busy-experiment.mjs",
        "src/control/facade.mjs",
        "tests/workflow-channel.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "chatgpt-plugin",
        "executor-channel",
        "codex-tools-live",
        "architecture"
      ],
      "id": "PROBE",
      "title": "Измерять занятость и анализировать оба SDK уведомления",
      "why": "Причинные логи и валидные измерительные стимулы",
      "acceptance_criteria": [
        "hold/checkpoint ограничены своим вооружённым O/case, полный Python MCP/bridge, strict schemas. Асинхронный hold 15/макс30 секунд вне очереди мутаций, два result удержаны только измерением; идемпотентность не создаёт новый интервал.",
        "Отдельные tool-wait и generation со свежими фактическими границами; подготовительный checkpoint/nonce и конец прежней работы наблюдаемы, отсутствие границы даёт INCONCLUSIVE.",
        "Одна точная безопасная read-only probe с argv/digest/nonce/command-id, без записи/Kit, после предварительного GO основных случаев; любая другая или дополнительная команда блокирует. Нет универсальной классификации shell.",
        "WAL/telemetry/export сохраняют case/attempt/generation и SDK вызов непосредственно у effects; late Promise, разная доставка telemetry, frontend.gap/пагинация и несовместимый resource не маскируются.",
        "Read-only анализатор выдаёт timeline JSON/Markdown для каждого result и burst; все семь классов, занятость/сохранение прежней работы/обработка/один эффект/full complete доказаны раздельно. 120 секунд относится к доставке, не времени выполнения всего плана.",
        "Исполняемый probe не зависит от файлов в app.asar: собственный поставляемый Python -B -c, фиксированный inline-код и позиционные nonce/duration, точный argv/hash. Изменение произвольных аргументов и дополнительная команда не авторизованы.",
        "Скрипт до Start задаёт case/task IDs, backend связывает реальные assignment/attempt/message/SHA. Read/model-pull до своего SDK аннулирует пару как INCONCLUSIVE без повторного SDK и сброса read; анализатор указывает причину."
      ],
      "expected_commit_message": "feat: измерять занятость и анализировать оба sdk уведомления",
      "parallel_safe": false,
      "task_brief": "Разрешены пока только подготовка и Review; исполнение после отдельного поручения пользователя. Разработка последовательная через Kit без делегирования/моделей/UI control, donor и рабочие профили не менять. Сохранить 0.5.36, отдельные SDK/read/yield/exact-SHA/integration/complete и UNKNOWN без повтора. Реализовать измерительные инструменты, безопасный probe и полный журнал без второго log store. Поля Python extra=forbid и JS allowlist согласовать, роль инструкции не менять без причины. Не использовать личные WAL/профили; analyzer не управляет приложением. Цепочка localhost bridge и live tools проверяется без модели. Обязательны command-activity.mjs/его тест: command_hash и все активные процессы. Probe запускается поставляемым Python -B -c с фиксированным кодом, не файлом внутри ASAR. До Start только task IDs; однократная runtime привязка после real result.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/sdk-busy-recipient.md",
            "required": true,
            "revision": "f51752ab25451636fc71c780c0ec735a9d3b0d61"
          },
          {
            "path": "docs/planning/sdk-busy-recipient-acceptance.md",
            "required": false
          },
          {
            "path": "docs/planning/sdk-busy-recipient-delivery.md",
            "required": false
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": [
          "DISPATCH"
        ]
      },
      "actual_files": [
        "scripts/prepare-sdk-busy-experiment.mjs",
        "scripts/analyze-sdk-busy-experiment.mjs",
        "src/contracts/backend.mjs",
        "src/contracts/plugin-communication.mjs",
        "src/control/facade.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/service.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/control/workflow/command-activity.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/execution/facade.mjs",
        "src/execution/plugin/sdk-busy-probe.mjs",
        "src/frontend/plugin/launch.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/sdk-busy-analysis.test.mjs",
        "tests/sdk-busy-experiment.test.mjs",
        "tests/workflow-channel.test.mjs",
        "tools/codex-app-server-mcp/plugin.py"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "sdk-busy-recipient",
        "task_id": "PROOF",
        "role": "implementation"
      },
      "dependencies": [
        "POLICY",
        "DISPATCH",
        "PROBE"
      ],
      "functional_paths": [
        "tests/sdk-busy-experiment.test.mjs",
        "tests/sdk-busy-analysis.test.mjs",
        "tests/automatic-agent-dialogue.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/workflow-channel.test.mjs",
        "tests/plugin-communication.test.mjs",
        "tests/dialogue-delivery.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/electron-smoke.mjs",
        "tests/migration-compatibility.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "electron-smoke",
        "chatgpt-plugin",
        "architecture",
        "executor-channel",
        "codex-tools-live",
        "kit-check",
        "kit-assignments",
        "kit-upgrade"
      ],
      "id": "PROOF",
      "title": "Проверить полный цикл и отказы на изолированных fixtures",
      "why": "Не допустить ложного успеха на отдельных обработчиках",
      "acceptance_criteria": [
        "Полный связный API/MCP/SDK/Kit/Git/Electron fixture проходит early title/choice/Review, один Start, 2E и два уведомления при busy, read/exact-SHA acceptance/merge, T003/DOCS, terminal receipts, cleanup/complete без прямой подделки квитанций.",
        "Отказы busy/commands/lease/identity/UNKNOWN/два клиента/перестановка телеметрии/потерянный report/late callback/remount/restart/rearm и соседний scope проверены. Два SDK последовательны; no extra Send и прежний gate сохранён.",
        "Обе части Kit обязательны; cache preflight и Python -B, строгие assertions не ослаблены. Совместимость новых необязательных WAL/профиля с обычным поведением 0.5.36 проверена изолированно без продолжения активного опыта старым кодом.",
        "Живые ChatGPT/native macOS/Windows/Linux/iPad не объявлены пройденными. Новый продуктовый дефект — отдельная задача до DOCS, не скрытая правка внутри PROOF.",
        "Отдельные fixtures проверяют ранний read/model-pull до hold/до SDK второго result, отсутствие повторной отправки, запрет всех дополнительных команд (включая verified read-only) и исполнение probe вне ASAR."
      ],
      "expected_commit_message": "feat: проверить полный цикл и отказы на изолированных fixtures",
      "parallel_safe": false,
      "task_brief": "Разрешены пока только подготовка и Review; исполнение после отдельного поручения пользователя. Разработка последовательная через Kit без делегирования/моделей/UI control, donor и рабочие профили не менять. Сохранить 0.5.36, отдельные SDK/read/yield/exact-SHA/integration/complete и UNKNOWN без повтора. Событийные end-to-end/fault fixtures с управляемыми часами, действительными sdk/bridge вызовами и независимыми Git/Kit proofs. Перед Kit production-package проверкой caches по AGENTS. Не менять продукт в тестовой задаче; найденное оформить отдельно до DOCS.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/sdk-busy-recipient.md",
            "required": true,
            "revision": "f51752ab25451636fc71c780c0ec735a9d3b0d61"
          },
          {
            "path": "docs/planning/sdk-busy-recipient-acceptance.md",
            "required": false
          },
          {
            "path": "docs/planning/sdk-busy-recipient-delivery.md",
            "required": false
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": [
          "POLICY",
          "DISPATCH",
          "PROBE"
        ]
      },
      "actual_files": [
        "tests/automatic-agent-dialogue.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/sdk-busy-analysis.test.mjs",
        "tests/workflow-channel.test.mjs"
      ]
    },
    {
      "id": "EVIDENCE",
      "title": "Исключить ложный GO и учесть ранний model-pull",
      "why": "Сверка экспортов в PROOF выявила неучтённый backend UNKNOWN и чтение контекста без read_message; это исправление доказательности существующего согласованного опыта.",
      "dependencies": [
        "PROOF"
      ],
      "functional_paths": [
        "scripts/analyze-sdk-busy-experiment.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "tests/sdk-busy-analysis.test.mjs",
        "tests/workflow-channel.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/sdk-busy-recipient.md"
      ],
      "verification_ids": [
        "unit-all",
        "architecture"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Backend send.unknown сохраняет UNKNOWN при позднем sdk.accepted/read; invalidated и повторное разрешение плана не превращаются в QUEUED_OBSERVED/GO.",
        "Явное чтение контекста выбранного result до уведомления допускается штатно, но измерение логирует model-pull и аннулирует явно раннюю пару; статусы не раскрывают unread selected body через preview. Действует и до получения второго result, без поддельных read или повторного Send.",
        "Анализатор принимает реальный JSONL с полным captured export summary, сохраняет пагинацию/идентичность/часы; mode off контроль получается из тех же независимых Kit/Git/terminal proofs, а не ручного флага.",
        "Семь классов, sourceCommit/manifest/build/case/attempt, full cycle и ограничения live/fixture остаются раздельны; обычный mode off без регрессий."
      ],
      "expected_commit_message": "fix: исключить ложный GO и учесть ранний model-pull",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "sdk-busy-recipient",
        "task_id": "EVIDENCE",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "scripts/analyze-sdk-busy-experiment.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "tests/sdk-busy-analysis.test.mjs",
        "tests/workflow-channel.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "sdk-busy-recipient",
        "task_id": "VERSION",
        "role": "implementation"
      },
      "dependencies": [
        "PROOF",
        "EVIDENCE"
      ],
      "functional_paths": [
        "package.json",
        "package-lock.json",
        "src/contracts/backend.mjs",
        "scripts/stage-chatgpt-plugin.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/migration-compatibility.test.mjs",
        "tests/chatgpt-plugin.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "architecture",
        "release-tooling"
      ],
      "id": "VERSION",
      "title": "Согласовать версию проверочной сборки",
      "why": "Не подменять 0.5.36 и immutable panel",
      "acceptance_criteria": [
        "Следующий фактически свободный возрастающий номер выбран после сверки локальных/remote выпусков; прежний комплект 0.5.36 не изменён.",
        "Package/lock/backend/build/immutable staged resource согласованы, SDK/Kit/role записаны; protocol меняется лишь при реальной несовместимости.",
        "Проверочный статус до live не объявлен stable/latest; новых зависимостей и изменений Kit ради опыта нет.",
        "Новый immutable HTML через настоящий MCP/SDK подтверждает long-ticket90: два sync во время pending Promise и accepted; при lease pause поздний Promise только журналируется, UNKNOWN/read=false и один intent сохранены. Это renderer contract fixture с reserved-ticket metadata; настоящий допуск двух result и 89 секунд backend проверены отдельно полным циклом и workflow-channel."
      ],
      "expected_commit_message": "feat: согласовать версию проверочной сборки",
      "parallel_safe": false,
      "task_brief": "Разрешены пока только подготовка и Review; исполнение после отдельного поручения пользователя. Разработка последовательная через Kit без делегирования/моделей/UI control, donor и рабочие профили не менять. Сохранить 0.5.36, отдельные SDK/read/yield/exact-SHA/integration/complete и UNKNOWN без повтора. Сверить свободную версию и связанные exact assertions. Установленный Kit и приложение не менять. Все кодовые изменения до DOCS/production; выбранная версия одна для трёх ОС.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/sdk-busy-recipient.md",
            "required": true,
            "revision": "f51752ab25451636fc71c780c0ec735a9d3b0d61"
          },
          {
            "path": "docs/planning/sdk-busy-recipient-acceptance.md",
            "required": false
          },
          {
            "path": "docs/planning/sdk-busy-recipient-delivery.md",
            "required": false
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": [
          "PROOF"
        ]
      },
      "actual_files": [
        "package-lock.json",
        "package.json",
        "src/contracts/backend.mjs",
        "tests/chatgpt-plugin.test.mjs"
      ]
    },
    {
      "id": "INSTRUCTIONS",
      "title": "Исключить искусственное откладывание входящих уведомлений",
      "why": "Сверка измерительного текста перед DOCS выявила двусмысленное «результаты пока не читай», способное подменить наблюдение очереди инструкцией игнорировать фактический SDK.",
      "dependencies": [
        "VERSION"
      ],
      "functional_paths": [
        "src/control/plugin/workflow-channel.mjs"
      ],
      "documentation_paths": [
        "docs/planning/sdk-busy-recipient-acceptance.md"
      ],
      "verification_ids": [
        "architecture",
        "chatgpt-plugin"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Checkpoint generation не требует игнорировать пришедшее SDK-уведомление; нормальное адресное чтение допускается, MID_TURN остаётся измеримым исходом, ранний speculative model-pull до уведомления не считается доставкой.",
        "Алгоритм допуска, nonce, gates, ролевой протокол и UI не меняются; буквальный измерительный текст и описания hold/checkpoint согласованы с запретом искусственного откладывания.",
        "Неизменность читателя communication-store относительно 0.5.36 сверена; изолированное чтение нового WAL не продолжает активный опыт и не меняет его байты."
      ],
      "expected_commit_message": "fix: не откладывать входящие уведомления ради измерения",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "sdk-busy-recipient",
        "task_id": "INSTRUCTIONS",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "src/control/plugin/workflow-channel.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "sdk-busy-recipient",
        "task_id": "DOCS",
        "role": "implementation"
      },
      "dependencies": [
        "POLICY",
        "DISPATCH",
        "PROBE",
        "PROOF",
        "EVIDENCE",
        "VERSION",
        "INSTRUCTIONS"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/planning/sdk-busy-recipient.md",
        "docs/planning/sdk-busy-recipient-acceptance.md",
        "docs/planning/sdk-busy-recipient-delivery.md",
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/sdk-busy-delivery.md",
        "docs/acceptance/sdk-busy-recipient.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/assignment-dialogue-reliability.md",
        "docs/modules/dialogue-timing.md",
        "docs/modules/current-actions.md",
        "docs/modules/project-compatibility.md",
        "docs/modules/release.md"
      ],
      "verification_ids": [],
      "id": "DOCS",
      "title": "Актуализация всех документов проекта",
      "why": "Действующие контракты и будущая живая приёмка до production",
      "acceptance_criteria": [
        "README/OVERVIEW и действующие модули сверены с реализованным опытом; отдельные module/acceptance контракты полны, default off/test scope и pending live явно описаны.",
        "Реализованное из временных specs перенесено, полностью отработанное удалено без архива с exact Git blob для required-ссылок; pending требования/ветка возврата не потеряны.",
        "Каждый документ <=28000 UTF-8 байт, Kit checked tests не приписаны DOCS checks:[], native NOT_RUN и read/acceptance/merge/complete различимы. DOCS до RELEASE; отказавшие измерения не стали GO."
      ],
      "expected_commit_message": "docs: актуализация всех документов проекта",
      "parallel_safe": false,
      "task_brief": "Разрешены пока только подготовка и Review; исполнение после отдельного поручения пользователя. Разработка последовательная через Kit без делегирования/моделей/UI control, donor и рабочие профили не менять. Сохранить 0.5.36, отдельные SDK/read/yield/exact-SHA/integration/complete и UNKNOWN без повтора. Сверить реальные коммиты POLICY/DISPATCH/PROBE/PROOF/VERSION и документацию, а не переписать её механически. Подготовить self-contained контракт и playbook для fresh панели. Условие live GO и возврат сохранить после удаления specs. Ни приложение, ни пользовательские журналы не запускать/не менять.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/modules/sdk-busy-delivery.md",
            "required": true,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/architecture/OVERVIEW.md",
            "required": true,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/acceptance/sdk-busy-recipient.md",
            "required": false,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/planning/sdk-busy-recipient.md",
            "required": false,
            "revision": "f51752ab25451636fc71c780c0ec735a9d3b0d61"
          },
          {
            "path": "docs/planning/sdk-busy-recipient-acceptance.md",
            "required": false,
            "revision": "f51752ab25451636fc71c780c0ec735a9d3b0d61"
          },
          {
            "path": "docs/planning/sdk-busy-recipient-delivery.md",
            "required": false,
            "revision": "f51752ab25451636fc71c780c0ec735a9d3b0d61"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "actual_files": [
        "README.md",
        "docs/acceptance/sdk-busy-recipient.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/assignment-dialogue-reliability.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/current-actions.md",
        "docs/modules/dialogue-timing.md",
        "docs/modules/project-compatibility.md",
        "docs/modules/release.md",
        "docs/modules/sdk-busy-delivery.md",
        "docs/planning/sdk-busy-recipient-acceptance.md",
        "docs/planning/sdk-busy-recipient-delivery.md",
        "docs/planning/sdk-busy-recipient.md"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "sdk-busy-recipient",
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
      "title": "Собрать проверочный комплект macOS Windows Linux",
      "why": "Одна кодовая основа для трёх ОС",
      "acceptance_criteria": [
        "После DOCS все source/locks закоммичены; готовый полный комплект трёх ОС и семь assets из одного sourceCommit, strict composition/macOS signature/SHA/staging/Downloads проверены.",
        "Перед каждой production-командой exact Python cache preflight без symlink traversal; не переписаны ни 0.5.36, ни ранее занятый номер.",
        "До live комплект остаётся локальным проверочным, никакой автоматической публикации latest и никаких заявлений native/live PASS."
      ],
      "expected_commit_message": "delivery: собрать проверочный комплект macos windows linux",
      "parallel_safe": false,
      "task_brief": "Разрешены пока только подготовка и Review; исполнение после отдельного поручения пользователя. Разработка последовательная через Kit без делегирования/моделей/UI control, donor и рабочие профили не менять. Сохранить 0.5.36, отдельные SDK/read/yield/exact-SHA/integration/complete и UNKNOWN без повтора. Использовать штатный build и проверку состава/manifest, сохранить проверочную поставку и baseline. При изменении исходников повторная доставка требует нового выпуска; успех fixtures не подтверждает ChatGPT.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/modules/sdk-busy-delivery.md",
            "required": true,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/architecture/OVERVIEW.md",
            "required": true,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/acceptance/sdk-busy-recipient.md",
            "required": false,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/planning/sdk-busy-recipient.md",
            "required": false,
            "revision": "f51752ab25451636fc71c780c0ec735a9d3b0d61"
          },
          {
            "path": "docs/planning/sdk-busy-recipient-acceptance.md",
            "required": false,
            "revision": "f51752ab25451636fc71c780c0ec735a9d3b0d61"
          },
          {
            "path": "docs/planning/sdk-busy-recipient-delivery.md",
            "required": false,
            "revision": "f51752ab25451636fc71c780c0ec735a9d3b0d61"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "verification_kind": "package",
      "actual_files": [
        "release-manifest.json"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "sdk-busy-recipient",
        "task_id": "INSTALL",
        "role": "implementation"
      },
      "dependencies": [
        "RELEASE",
        "DOCS"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/planning/sdk-messaging.md"
      ],
      "verification_ids": [],
      "id": "INSTALL",
      "title": "Зафиксировать установку 0.5.37 и остановку экспериментальной приёмки",
      "why": "26.10.2026 пользователь прямо поручил закрыть текущий эксперимент и создать новый план полного SDK-перехода со сборкой и публикацией. Незавершённые INSTALL/PUBLISH переопределены как фиксация фактов и отмены; живой GO и публикация 0.5.37 не заявляются.",
      "acceptance_criteria": [
        "В новой спецификации записаны факты установки, два SDK accepted во время hold и предел доказательства: полный GO не получен; тест остановлен пользователем."
      ],
      "expected_commit_message": "docs: зафиксировать установку 0.5.37 и остановку экспериментальной приёмки",
      "parallel_safe": false,
      "task_brief": "В новой спецификации записаны факты установки, два SDK accepted во время hold и предел доказательства: полный GO не получен; тест остановлен пользователем.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/modules/sdk-busy-delivery.md",
            "required": true,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/architecture/OVERVIEW.md",
            "required": true,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/acceptance/sdk-busy-recipient.md",
            "required": false,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/planning/sdk-busy-recipient.md",
            "required": false,
            "revision": "f51752ab25451636fc71c780c0ec735a9d3b0d61"
          },
          {
            "path": "docs/planning/sdk-busy-recipient-acceptance.md",
            "required": false,
            "revision": "f51752ab25451636fc71c780c0ec735a9d3b0d61"
          },
          {
            "path": "docs/planning/sdk-busy-recipient-delivery.md",
            "required": false,
            "revision": "f51752ab25451636fc71c780c0ec735a9d3b0d61"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "actual_files": [
        "docs/planning/sdk-messaging.md"
      ]
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "sdk-busy-recipient",
        "task_id": "PUBLISH",
        "role": "implementation"
      },
      "dependencies": [
        "INSTALL",
        "DOCS"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/planning/sdk-messaging.md"
      ],
      "verification_ids": [],
      "id": "PUBLISH",
      "title": "Зафиксировать отмену публикации ограниченного опыта",
      "why": "26.10.2026 пользователь прямо поручил закрыть текущий эксперимент и создать новый план полного SDK-перехода со сборкой и публикацией. Незавершённые INSTALL/PUBLISH переопределены как фиксация фактов и отмены; живой GO и публикация 0.5.37 не заявляются.",
      "acceptance_criteria": [
        "В новой спецификации записана отмена публикации экспериментальной 0.5.37; GitHub публикация переносится в новый согласуемый план полного SDK. Старые критерии не объявлены пройденными."
      ],
      "expected_commit_message": "docs: зафиксировать отмену публикации ограниченного опыта",
      "parallel_safe": false,
      "task_brief": "В новой спецификации записана отмена публикации экспериментальной 0.5.37; GitHub публикация переносится в новый согласуемый план полного SDK. Старые критерии не объявлены пройденными.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/modules/sdk-busy-delivery.md",
            "required": true,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/architecture/OVERVIEW.md",
            "required": true,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/acceptance/sdk-busy-recipient.md",
            "required": false,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/planning/sdk-busy-recipient.md",
            "required": false,
            "revision": "f51752ab25451636fc71c780c0ec735a9d3b0d61"
          },
          {
            "path": "docs/planning/sdk-busy-recipient-acceptance.md",
            "required": false,
            "revision": "f51752ab25451636fc71c780c0ec735a9d3b0d61"
          },
          {
            "path": "docs/planning/sdk-busy-recipient-delivery.md",
            "required": false,
            "revision": "f51752ab25451636fc71c780c0ec735a9d3b0d61"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      }
    }
  ],
  "blocked_reason": null,
  "user_decisions": [
    "Предыдущий session-choice-and-delivery принят и закрыт коммитом 2b98a5a; новый scope с нуля.",
    "26.10.2026 выбран полный сценарий вместо отдельного single; два result занятому O и завершение всех зависимых стадий.",
    "Успех означает проверенный выпуск; при неудаче возврат к поведению 0.5.36 без потери независимых исправлений. Не переписывать опубликованные номера.",
    "Сейчас поручены документы и Claude Review, выполнение и delivery ожидают отдельного поручения. Положение Review принадлежит пользователю.",
    {
      "id": "e542cf51-16fd-45df-b477-09dfb4eb7ccd",
      "text": "26.10.2026 пользователь выбрал полный сценарий вместо single и поручил подготовить спецификацию, to-do и Claude Review. Публикация плана не разрешает реализацию, сборку или переключение службы.",
      "recorded_at": "2026-10-26T09:58:19.007Z"
    },
    "При выполнении POLICY полный recovery превысил обязательный резерв теста: 157 КБ при пределе 144 КБ. Спецификации и критерии не сокращаются: основной контракт и OVERVIEW передаются полностью, acceptance/delivery читаются по требованию до зависимого действия. Изменяется только повторная доставка read-only контекста внешней sequential-сессии; подготовленные продуктовые назначения не изменяются.",
    {
      "id": "full-sdk-request",
      "text": "26.10.2026 пользователь прямо поручил закрыть текущий эксперимент и создать новый план полного SDK-перехода со сборкой и публикацией. Незавершённые INSTALL/PUBLISH переопределены как фиксация фактов и отмены; живой GO и публикация 0.5.37 не заявляются.",
      "recorded_at": "2026-10-26T13:37:58.019Z"
    }
  ],
  "scope_title": "Полный SDK-опыт с занятым оркестратором",
  "parallel_allowed": false,
  "max_workers": 1,
  "execution_strategy": "sequential",
  "execution_reason": "Внешняя Codex-сессия готовит последовательную разработку без разрешения делегировать модели; общий транспорт, FIFO, gates и мост пересекаются. Два E относятся к продуктовой живой приёмке и fixtures."
}
```
<!-- workflow-state:end -->

## Состояние

Execution Scope Status: ACTIVE
Delivery Status: IN_PROGRESS
Scope: sdk-busy-recipient
Current Task: нет
Revision: 1208

## Цель

Проверить два уведомления о готовых результатах занятому O через SDK и полный цикл до cleanup/complete, с публикацией лишь после живого GO и возвратом к поведению 0.5.36 при неудаче.

## Критерии приёмки

- Эксперимент прекращён по прямому поручению пользователя; достигнутые факты и невыполненные проверки сохранены без объявления GO или публикации.

## Микрозадачи

Выполнение: sequential; разрешено: false; лимит: 1
Причина: Внешняя Codex-сессия готовит последовательную разработку без разрешения делегировать модели; общий транспорт, FIFO, gates и мост пересекаются. Два E относятся к продуктовой живой приёмке и fixtures.

- [DONE] POLICY: Ограничить опыт точным тестовым scope и двумя result — Завершено
  - Git Commit: [DONE] feat: ограничить опыт точным тестовым scope и двумя result
  - Reference: sdk-busy-recipient / POLICY / implementation
  - Файлы: src/execution/plugin/sdk-busy-experiment.mjs, scripts/prepare-sdk-busy-experiment.mjs, src/execution/facade.mjs, src/control/facade.mjs, src/backend/desktop-model.mjs, src/control/plugin/service.mjs, src/control/workflow/coordination.mjs, src/contracts/plugin-communication.mjs, tests/sdk-busy-experiment.test.mjs, tests/backend-desktop-model.test.mjs, tests/desktop-boundaries.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] DISPATCH: Доставлять два результата занятому O без потери gates — Завершено
  - Git Commit: [DONE] feat: доставлять два результата занятому o без потери gates
  - Reference: sdk-busy-recipient / DISPATCH / implementation
  - Файлы: src/control/plugin/workflow-channel.mjs, src/control/plugin/communication.mjs, src/control/workflow/dialogue-delivery.mjs, src/control/workflow/executor-session.mjs, src/control/workflow/coordination.mjs, src/contracts/plugin-communication.mjs, src/execution/plugin/communication-store.mjs, src/frontend/plugin/launch.mjs, src/frontend/plugin/panel.mjs, tests/workflow-channel.test.mjs, tests/plugin-communication.test.mjs, tests/dialogue-delivery.test.mjs, tests/sdk-busy-experiment.test.mjs, tests/chatgpt-plugin.test.mjs, src/control/workflow/command-activity.mjs, tests/command-activity.test.mjs, src/control/plugin/service.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: POLICY
- [DONE] PROBE: Измерять занятость и анализировать оба SDK уведомления — Завершено
  - Git Commit: [DONE] feat: измерять занятость и анализировать оба sdk уведомления
  - Reference: sdk-busy-recipient / PROBE / implementation
  - Файлы: src/execution/plugin/sdk-busy-experiment.mjs, src/execution/plugin/sdk-busy-probe.mjs, src/execution/plugin/bridge.mjs, src/execution/facade.mjs, src/backend/desktop-model.mjs, src/control/plugin/service.mjs, src/control/plugin/communication.mjs, src/control/plugin/workflow-channel.mjs, src/control/workflow/dialogue-delivery.mjs, src/control/workflow/coordination.mjs, src/contracts/backend.mjs, src/contracts/plugin-communication.mjs, src/frontend/plugin/launch.mjs, src/frontend/plugin/panel.mjs, tools/codex-app-server-mcp/plugin.py, scripts/analyze-sdk-busy-experiment.mjs, tests/sdk-busy-experiment.test.mjs, tests/sdk-busy-analysis.test.mjs, tests/codex-app-server-mcp.test.mjs, tests/chatgpt-plugin.test.mjs, tests/plugin-communication.test.mjs, src/control/workflow/command-activity.mjs, tests/command-activity.test.mjs, scripts/prepare-sdk-busy-experiment.mjs, src/control/facade.mjs, tests/workflow-channel.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: DISPATCH
- [DONE] PROOF: Проверить полный цикл и отказы на изолированных fixtures — Завершено
  - Git Commit: [DONE] feat: проверить полный цикл и отказы на изолированных fixtures
  - Reference: sdk-busy-recipient / PROOF / implementation
  - Файлы: tests/sdk-busy-experiment.test.mjs, tests/sdk-busy-analysis.test.mjs, tests/automatic-agent-dialogue.test.mjs, tests/fixtures/automatic-agent-dialogue.mjs, tests/workflow-channel.test.mjs, tests/plugin-communication.test.mjs, tests/dialogue-delivery.test.mjs, tests/chatgpt-plugin.test.mjs, tests/codex-app-server-mcp.test.mjs, tests/electron-smoke.mjs, tests/migration-compatibility.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: POLICY, DISPATCH, PROBE
- [DONE] EVIDENCE: Исключить ложный GO и учесть ранний model-pull — Завершено
  - Git Commit: [DONE] fix: исключить ложный GO и учесть ранний model-pull
  - Reference: sdk-busy-recipient / EVIDENCE / implementation
  - Файлы: scripts/analyze-sdk-busy-experiment.mjs, src/control/plugin/communication.mjs, src/control/plugin/workflow-channel.mjs, tests/sdk-busy-analysis.test.mjs, tests/workflow-channel.test.mjs, docs/planning/sdk-busy-recipient.md
  - Параллельность: исключительное выполнение
  - Зависимости: PROOF
- [DONE] VERSION: Согласовать версию проверочной сборки — Завершено
  - Git Commit: [DONE] feat: согласовать версию проверочной сборки
  - Reference: sdk-busy-recipient / VERSION / implementation
  - Файлы: package.json, package-lock.json, src/contracts/backend.mjs, scripts/stage-chatgpt-plugin.mjs, tests/codex-app-server-mcp.test.mjs, tests/migration-compatibility.test.mjs, tests/chatgpt-plugin.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: PROOF, EVIDENCE
- [DONE] INSTRUCTIONS: Исключить искусственное откладывание входящих уведомлений — Завершено
  - Git Commit: [DONE] fix: не откладывать входящие уведомления ради измерения
  - Reference: sdk-busy-recipient / INSTRUCTIONS / implementation
  - Файлы: src/control/plugin/workflow-channel.mjs, docs/planning/sdk-busy-recipient-acceptance.md
  - Параллельность: исключительное выполнение
  - Зависимости: VERSION
- [DONE] DOCS: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: актуализация всех документов проекта
  - Reference: sdk-busy-recipient / DOCS / implementation
  - Файлы: docs/planning/sdk-busy-recipient.md, docs/planning/sdk-busy-recipient-acceptance.md, docs/planning/sdk-busy-recipient-delivery.md, README.md, docs/architecture/OVERVIEW.md, docs/modules/sdk-busy-delivery.md, docs/acceptance/sdk-busy-recipient.md, docs/modules/chatgpt-plugin.md, docs/modules/assignment-dialogue-reliability.md, docs/modules/dialogue-timing.md, docs/modules/current-actions.md, docs/modules/project-compatibility.md, docs/modules/release.md
  - Параллельность: исключительное выполнение
  - Зависимости: POLICY, DISPATCH, PROBE, PROOF, EVIDENCE, VERSION, INSTRUCTIONS
- [DONE] RELEASE: Собрать проверочный комплект macOS Windows Linux — Завершено
  - Git Commit: [DONE] delivery: собрать проверочный комплект macos windows linux
  - Reference: sdk-busy-recipient / RELEASE / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: DOCS
- [DONE] INSTALL: Зафиксировать установку 0.5.37 и остановку экспериментальной приёмки — Завершено
  - Git Commit: [DONE] docs: зафиксировать установку 0.5.37 и остановку экспериментальной приёмки
  - Reference: sdk-busy-recipient / INSTALL / implementation
  - Файлы: docs/planning/sdk-messaging.md
  - Параллельность: исключительное выполнение
  - Зависимости: RELEASE, DOCS
- [TODO] PUBLISH: Зафиксировать отмену публикации ограниченного опыта — Ожидает
  - Git Commit: [PENDING] docs: зафиксировать отмену публикации ограниченного опыта
  - Reference: sdk-busy-recipient / PUBLISH / implementation
  - Файлы: docs/planning/sdk-messaging.md
  - Параллельность: исключительное выполнение
  - Зависимости: INSTALL, DOCS

## Context Pack For This Cycle

- docs/modules/sdk-busy-delivery.md
- docs/architecture/OVERVIEW.md
- docs/acceptance/sdk-busy-recipient.md
- docs/planning/sdk-busy-recipient.md
- docs/planning/sdk-busy-recipient-acceptance.md
- docs/planning/sdk-busy-recipient-delivery.md

Служебные состояния меняются только командами workflow. Приёмка не архивирует scope.
