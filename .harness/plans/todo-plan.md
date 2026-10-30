# Активный план — Workflow_Pilot

<!-- workflow-state:begin -->
```json
{
  "schema_version": 1,
  "plan_revision": 1361,
  "project_id": "7411e192-943c-4529-bffb-3b081d9c242f",
  "project_name": "Workflow_Pilot",
  "scope_id": "shared-conversation-mac",
  "execution_scope_status": "ACTIVE",
  "delivery_status": "IN_PROGRESS",
  "objective": "Один разговор O/E продолжается с любого клиента ChatGPT, автоматическую доставку выполняет только серверная страница backend; выпуск 0.6.0 трёх ОС, установка на Mac и публикация GitHub.",
  "acceptance_criteria": [
    "Автоматическую доставку участнику выполняет только аттестованная панель его серверной страницы; панели других клиентов — наблюдатели без SDK-отправок.",
    "Перед отправкой серверная страница свежая; перезагрузка безопасна и переносит подтверждение хода; ход на другом клиенте доходит до reply_observed и acceptance.",
    "Ветвление обнаруживается и останавливает доставку участнику с адресным действием; бюджет уведомлений, UNKNOWN, Stop и одна кнопка плана сохранены.",
    "Данные 0.6.0 читаются версией 0.5.41; переход и откат протокола 9 описаны; полный комплект трёх ОС, установка и публикация доказаны отдельно, живая проверка Mac — pending у пользователя."
  ],
  "approved_scope": {
    "functional_paths": [
      "package.json",
      "package-lock.json",
      "src/contracts/backend.mjs",
      "src/contracts/plugin-communication.mjs",
      "tools/codex-app-server-mcp/plugin.py",
      "tests/chatgpt-plugin.test.mjs",
      "tests/codex-app-server-mcp.test.mjs",
      "tests/panel-resource-upgrade.test.mjs",
      "src/execution/browser/panel-frame-attestation.mjs",
      "src/execution/browser/backend-host.mjs",
      "src/execution/browser/session-runtime.mjs",
      "src/execution/facade.mjs",
      "src/frontend/plugin/launch.mjs",
      "tests/panel-frame-attestation.test.mjs",
      "tests/fixtures/panel-frame-host.mjs",
      "src/control/plugin/delivery-ownership.mjs",
      "src/control/plugin/communication.mjs",
      "src/control/plugin/workflow-channel.mjs",
      "src/control/workflow/dialogue-delivery.mjs",
      "src/backend/bootstrap.mjs",
      "src/backend/desktop-model.mjs",
      "tests/plugin-delivery-ownership.test.mjs",
      "tests/plugin-communication.test.mjs",
      "tests/workflow-channel.test.mjs",
      "tests/dialogue-delivery.test.mjs",
      "tests/fixtures/automatic-agent-dialogue.mjs",
      "tests/automatic-agent-dialogue.test.mjs",
      "src/control/plugin/service.mjs",
      "src/control/workflow/coordination.mjs",
      "tests/startup-context.test.mjs",
      "tests/plugin-enrollment.test.mjs",
      "tests/plugin-communication-store.test.mjs",
      "tests/electron-smoke.mjs",
      "tests/backend-end-to-end.test.mjs",
      "src/frontend/plugin/panel.mjs",
      "src/contracts/dialogue-view.mjs",
      "tests/panel-dialogue-view.test.mjs",
      "src/control/plugin/conversation-freshness.mjs",
      "src/control/workflow/executor-session.mjs",
      "tests/conversation-freshness.test.mjs",
      "tests/session-runtime.test.mjs",
      "src/control/plugin/assignment-dialogue.mjs",
      "src/execution/browser/chatgpt-dom.mjs",
      "src/execution/browser/chatgpt-page-observer.mjs",
      "src/execution/browser/page-state.mjs",
      "tests/page-state.test.mjs",
      "tests/chatgpt-dom.test.mjs",
      "src/control/workflow/plan-continuation.mjs",
      "src/execution/plugin/bridge.mjs",
      "src/backend/diagnostics.mjs",
      "tests/backend-diagnostics.test.mjs",
      "src/contracts/work-progress.mjs",
      "src/control/workflow/execution-projection.mjs",
      "src/frontend/desktop/ui/current-actions.mjs",
      "tests/work-progress.test.mjs",
      "tests/work-progress-scenario.test.mjs",
      "tests/sidebar.test.mjs",
      "tests/shared-conversation-compat.test.mjs",
      "tests/fixtures/released-communication-0.5.41/communication-store.mjs",
      "tests/migration-compatibility.test.mjs",
      "src/execution/plugin/communication-store.mjs",
      "release-manifest.json",
      "tests/fixtures/panel-attestation.mjs",
      "src/backend/main.mjs",
      "src/control/plugin/identity-trace.mjs",
      "src/contracts/context.mjs",
      "src/control/context/context-session.mjs",
      "src/execution/browser/chatgpt-composer.mjs",
      "tests/context-session.test.mjs",
      "tests/chatgpt-composer.test.mjs",
      "src/frontend/desktop/ui/sidebar.mjs"
    ],
    "documentation_paths": [
      "docs/planning/shared-conversation-mac.md",
      "docs/planning/shared-conversation-mac-freshness.md",
      "docs/planning/shared-backend-mobile-followup.md",
      "README.md",
      "docs/architecture/OVERVIEW.md",
      "docs/modules/sdk-messaging.md",
      "docs/modules/chatgpt-plugin.md",
      "docs/modules/backend.md",
      "docs/modules/native-window.md",
      "docs/modules/browser.md",
      "docs/modules/current-actions.md",
      "docs/modules/release.md",
      "docs/acceptance/shared-conversation-mac.md",
      "docs/modules/shared-conversation.md",
      "docs/planning/restored-startup-draft.md",
      "docs/modules/chat-only-startup.md",
      "docs/planning/startup-freshness-loop.md",
      "docs/planning/start-not-sent-retry.md"
    ]
  },
  "baseline_commit": "05822a86a51b74e586e098cb477700fb64d7dd56",
  "current_task_id": null,
  "context_pack": {
    "documents": [
      {
        "path": "docs/architecture/OVERVIEW.md",
        "required": true,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/planning/shared-conversation-mac.md",
        "required": false,
        "revision": "e822c44c7154cd92881ad4aef032974f8b38bf41"
      },
      {
        "path": "docs/planning/shared-conversation-mac-freshness.md",
        "required": false,
        "revision": "e822c44c7154cd92881ad4aef032974f8b38bf41"
      },
      {
        "path": "docs/planning/shared-backend-mobile-followup.md",
        "required": false,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/planning/restored-startup-draft.md",
        "required": false,
        "revision": "98466f34cfb6632f81c0728d819f3097e3f720e2"
      },
      {
        "path": "docs/planning/startup-freshness-loop.md",
        "required": true,
        "revision": "56c9f913bba43ba053547a0ed511d98707bc0926"
      },
      {
        "path": "docs/planning/start-not-sent-retry.md",
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
        "scope_id": "shared-conversation-mac",
        "task_id": "CONTRACT",
        "role": "implementation"
      },
      "dependencies": [],
      "functional_paths": [
        "package.json",
        "package-lock.json",
        "src/contracts/backend.mjs",
        "src/contracts/plugin-communication.mjs",
        "tools/codex-app-server-mcp/plugin.py",
        "tests/chatgpt-plugin.test.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/panel-resource-upgrade.test.mjs",
        "src/control/plugin/communication.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "chatgpt-plugin",
        "executor-channel",
        "panel-resource-targeted"
      ],
      "id": "CONTRACT",
      "title": "Контракт протокола 9 и версия 0.6.0",
      "why": "Зафиксировать поля владельца доставки и коды ошибок до поведения; старый iframe отклоняется явно.",
      "acceptance_criteria": [
        "Версия приложения 0.6.0, COMMUNICATION_PROTOCOL=9, COMMUNICATION_BUILD 0.6.0-communication-9 согласованы в package/backend/HTML staging.",
        "Ответы bind/sync/wait/status допускают delivery_role owner|observer и delivery_owner_generation; новый код PLUGIN_COMMUNICATION_DELIVERY_OBSERVER описан; описания инструментов не расширяют полномочий.",
        "iframe протокола 8 получает существующий отказ версии с обеими версиями; поведение доставки пока не меняется."
      ],
      "expected_commit_message": "feat: контракт протокола 9 и версия 0.6.0",
      "task_brief": "Контракт протокола 9 и версия 0.6.0. Зафиксировать поля владельца доставки и коды ошибок до поведения; старый iframe отклоняется явно. Выполнить все критерии приёмки этой задачи по docs/planning/shared-conversation-mac.md и docs/planning/shared-conversation-mac-freshness.md с соблюдением AGENTS.md; без новых кнопок, режимов, DOM Send, подмены User-Agent и изменений donor/рабочего профиля; живую проверку выполняет пользователь. Проверки только назначенные: chatgpt-plugin, executor-channel, panel-resource-targeted.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/shared-conversation-mac.md",
            "required": true,
            "revision": "e822c44c7154cd92881ad4aef032974f8b38bf41"
          },
          {
            "path": "docs/planning/shared-conversation-mac-freshness.md",
            "required": true,
            "revision": "e822c44c7154cd92881ad4aef032974f8b38bf41"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "parallel_safe": false,
      "actual_files": [
        "package.json",
        "package-lock.json",
        "src/contracts/backend.mjs",
        "src/contracts/plugin-communication.mjs",
        "src/control/plugin/communication.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tools/codex-app-server-mcp/plugin.py"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "shared-conversation-mac",
        "task_id": "ATTEST",
        "role": "implementation"
      },
      "dependencies": [
        "CONTRACT"
      ],
      "functional_paths": [
        "src/execution/browser/panel-frame-attestation.mjs",
        "src/execution/browser/backend-host.mjs",
        "src/execution/browser/session-runtime.mjs",
        "src/execution/facade.mjs",
        "src/frontend/plugin/launch.mjs",
        "tests/panel-frame-attestation.test.mjs",
        "tests/fixtures/panel-frame-host.mjs",
        "tests/chatgpt-plugin.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "panel-frame-attestation",
        "native-startup-theme",
        "architecture",
        "chatgpt-plugin",
        "panel-resource-targeted"
      ],
      "id": "ATTEST",
      "title": "Аттестация собственного кадра панели в Execution",
      "why": "Backend должен сам доказать, что экземпляр панели смонтирован в его серверной странице.",
      "acceptance_criteria": [
        "Панель при mount создаёт неизменяемый на время жизни кадра frame_instance_id и публикует globalThis.__workflowPilotPanel {frame_instance_id, build_id, protocol_version}; bind передаёт frame_instance_id вместе с текущим panel_instance_id (он меняется при повторном recover, launch.mjs:328).",
        "Execution перечисляет подкадры только собственного webContents серверной страницы (framesInSubtree), выполняет постоянный read-only скрипт чтения этого значения и возвращает экземпляры, связанные с browserSessionId/incarnation/documentId; главный кадр chatgpt.com и DOM ChatGPT не читаются и не меняются.",
        "Кадр другого webContents, устаревшего документа или с невалидным значением не учитывается; reload сбрасывает результат; Execution не импортирует Control/Frontend.",
        "Тест: два recover в одном кадре → тот же кадр аттестован; кадр без значения или с чужим build не учитывается."
      ],
      "expected_commit_message": "feat: аттестовать кадр панели серверной страницы",
      "task_brief": "Аттестация собственного кадра панели в Execution. Backend должен сам доказать, что экземпляр панели смонтирован в его серверной странице. Выполнить все критерии приёмки этой задачи по docs/planning/shared-conversation-mac.md и docs/planning/shared-conversation-mac-freshness.md с соблюдением AGENTS.md; без новых кнопок, режимов, DOM Send, подмены User-Agent и изменений donor/рабочего профиля; живую проверку выполняет пользователь. Проверки только назначенные: panel-frame-attestation, native-startup-theme, architecture, chatgpt-plugin, panel-resource-targeted.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/shared-conversation-mac.md",
            "required": true,
            "revision": "e822c44c7154cd92881ad4aef032974f8b38bf41"
          },
          {
            "path": "docs/planning/shared-conversation-mac-freshness.md",
            "required": true,
            "revision": "e822c44c7154cd92881ad4aef032974f8b38bf41"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": [
          "CONTRACT"
        ]
      },
      "parallel_safe": false,
      "actual_files": [
        "src/execution/browser/panel-frame-attestation.mjs",
        "src/execution/browser/session-runtime.mjs",
        "src/frontend/plugin/launch.mjs",
        "tests/panel-frame-attestation.test.mjs",
        "tests/fixtures/panel-frame-host.mjs",
        "tests/chatgpt-plugin.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "shared-conversation-mac",
        "task_id": "OWNER",
        "role": "implementation"
      },
      "dependencies": [
        "ATTEST"
      ],
      "functional_paths": [
        "src/control/plugin/delivery-ownership.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/backend/bootstrap.mjs",
        "src/backend/desktop-model.mjs",
        "tests/plugin-delivery-ownership.test.mjs",
        "tests/plugin-communication.test.mjs",
        "tests/workflow-channel.test.mjs",
        "tests/dialogue-delivery.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/automatic-agent-dialogue.test.mjs",
        "src/control/plugin/service.mjs",
        "src/control/workflow/coordination.mjs",
        "tests/startup-context.test.mjs",
        "tests/plugin-enrollment.test.mjs",
        "tests/plugin-communication-store.test.mjs",
        "tests/electron-smoke.mjs",
        "tests/backend-end-to-end.test.mjs",
        "tests/fixtures/panel-attestation.mjs",
        "tests/chatgpt-plugin.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "delivery-ownership",
        "sdk-recovery-targeted",
        "intake-sdk-scenario",
        "prepared-flow-cycle",
        "architecture",
        "orchestrator-startup"
      ],
      "id": "OWNER",
      "title": "Единственный владелец доставки участника",
      "why": "Только аттестованная серверная панель выполняет автоматическую доставку; панели других клиентов — наблюдатели.",
      "acceptance_criteria": [
        "Владелец — аттестованный экземпляр серверной страницы участника; при нескольких аттестованных в документе — последний смонтированный; заявления клиента не учитываются.",
        "Наблюдатель не claim/claim_ready/verify (DELIVERY_OBSERVER без записи попытки и без расхода бюджета), не создаёт/не подтверждает recovery-инциденты, не продлевает аренду доставки; выбор и Stop scope=participant ему доступны.",
        "Поколение владельца влияет только на новые claim; report попытки в полёте принимается как раньше; бюджет 3+3 (максимум 6), legacy UNKNOWN, Stop, grant и identity не ослаблены.",
        "Нет владельца — нейтральное ожидание owner-unavailable, не отказ и не UNKNOWN; существующие fixtures получают аттестацию своих панелей, assertions не ослаблены.",
        "Владение связано с аттестованным кадром: новый panel_instance_id того же кадра (повторный recover) сохраняет владельца без нового поколения; порт аттестации передаётся в Control через PluginProjects/coordination без прямого импорта Execution."
      ],
      "expected_commit_message": "feat: единственный владелец доставки",
      "task_brief": "Единственный владелец доставки участника. Только аттестованная серверная панель выполняет автоматическую доставку; панели других клиентов — наблюдатели. Выполнить все критерии приёмки этой задачи по docs/planning/shared-conversation-mac.md и docs/planning/shared-conversation-mac-freshness.md с соблюдением AGENTS.md; без новых кнопок, режимов, DOM Send, подмены User-Agent и изменений donor/рабочего профиля; живую проверку выполняет пользователь. Проверки только назначенные: delivery-ownership, sdk-recovery-targeted, intake-sdk-scenario, prepared-flow-cycle, architecture, orchestrator-startup.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/shared-conversation-mac.md",
            "required": true,
            "revision": "e822c44c7154cd92881ad4aef032974f8b38bf41"
          },
          {
            "path": "docs/planning/shared-conversation-mac-freshness.md",
            "required": true,
            "revision": "e822c44c7154cd92881ad4aef032974f8b38bf41"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": [
          "ATTEST"
        ]
      },
      "parallel_safe": false,
      "actual_files": [
        "src/control/plugin/delivery-ownership.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/control/plugin/service.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/control/workflow/coordination.mjs",
        "src/backend/desktop-model.mjs",
        "tests/plugin-delivery-ownership.test.mjs",
        "tests/fixtures/panel-attestation.mjs",
        "tests/plugin-communication.test.mjs",
        "tests/workflow-channel.test.mjs",
        "tests/startup-context.test.mjs",
        "tests/plugin-enrollment.test.mjs",
        "tests/plugin-communication-store.test.mjs",
        "tests/dialogue-delivery.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/chatgpt-plugin.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "shared-conversation-mac",
        "task_id": "OBSERVER",
        "role": "implementation"
      },
      "dependencies": [
        "OWNER"
      ],
      "functional_paths": [
        "src/frontend/plugin/launch.mjs",
        "src/frontend/plugin/panel.mjs",
        "src/contracts/dialogue-view.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/panel-dialogue-view.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "chatgpt-plugin",
        "panel-resource-targeted",
        "delivery-ui-targeted"
      ],
      "id": "OBSERVER",
      "title": "Режим наблюдателя в панели",
      "why": "Панель на другом клиенте показывает работу и принимает явные действия человека без отправки SDK.",
      "acceptance_criteria": [
        "По delivery_role observer цикл доставки не запускается и message.send не вызывается; status/wait-состояние, история, выбор и явный Stop работают.",
        "Наблюдатель видит подпись «Доставку выполняет служба Workflow Pilot»; владелец — прежний вид; один HTML, новых кнопок нет.",
        "Смена роли (owner↔observer) при новом ответе backend применяется без перезагрузки и без повторной отправки."
      ],
      "expected_commit_message": "feat: режим наблюдателя панели",
      "task_brief": "Режим наблюдателя в панели. Панель на другом клиенте показывает работу и принимает явные действия человека без отправки SDK. Выполнить все критерии приёмки этой задачи по docs/planning/shared-conversation-mac.md и docs/planning/shared-conversation-mac-freshness.md с соблюдением AGENTS.md; без новых кнопок, режимов, DOM Send, подмены User-Agent и изменений donor/рабочего профиля; живую проверку выполняет пользователь. Проверки только назначенные: chatgpt-plugin, panel-resource-targeted, delivery-ui-targeted.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/shared-conversation-mac.md",
            "required": true,
            "revision": "e822c44c7154cd92881ad4aef032974f8b38bf41"
          },
          {
            "path": "docs/planning/shared-conversation-mac-freshness.md",
            "required": true,
            "revision": "e822c44c7154cd92881ad4aef032974f8b38bf41"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": [
          "OWNER"
        ]
      },
      "parallel_safe": false,
      "actual_files": [
        "src/frontend/plugin/launch.mjs",
        "src/frontend/plugin/panel.mjs",
        "src/contracts/dialogue-view.mjs",
        "tests/chatgpt-plugin.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "shared-conversation-mac",
        "task_id": "FRESH",
        "role": "implementation"
      },
      "dependencies": [
        "OBSERVER"
      ],
      "functional_paths": [
        "src/control/plugin/conversation-freshness.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/control/workflow/executor-session.mjs",
        "src/execution/browser/session-runtime.mjs",
        "src/execution/facade.mjs",
        "src/backend/desktop-model.mjs",
        "tests/conversation-freshness.test.mjs",
        "tests/session-runtime.test.mjs",
        "src/control/plugin/service.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/plugin/communication.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "conversation-freshness",
        "startup-recovery",
        "sdk-recovery-targeted",
        "intake-sdk-scenario",
        "prepared-flow-cycle",
        "architecture"
      ],
      "id": "FRESH",
      "title": "Свежесть серверной страницы перед отправкой",
      "why": "Служба отправляет только из документа, отражающего актуальный разговор после ходов на других клиентах.",
      "acceptance_criteria": [
        "Перед claim (кроме startup-context) нужен busy, либо первичное наблюдение документа и аттестация панели не старше FRESH_DOCUMENT_MS (20 с), либо это первый claim в документе, только что перезагруженном Control ради свежести, без признаков чужого хода; после первого claim действует только busy/возраст. Иначе claim.deferred freshness-reload без попытки и расхода бюджета, затем безопасная перезагрузка и повторная аттестация; время загрузки и монтирования в окно свежести не входит.",
        "safeReload открывает только канонический chatUrl без q; запрещён при composer.inFlight, SDK в полёте, навигации старта, недавнем ручном вводе во встроенном окне; непустой черновик — freshness-conflict draft-present без очистки.",
        "Перезагрузка не меняет attempt, ticket, UNKNOWN, бюджет, Stop и допуск; не чаще одного раза на FRESH_DOCUMENT_MS; правило «после accepted следующий pending сразу» сохраняется для свежего документа.",
        "Подряд не более 3 перезагрузок ради свежести без успешного claim, затем оранжевая причина «Серверная страница не готова к доставке»; fixture с монтированием панели дольше FRESH_DOCUMENT_MS доставляет без цикла.",
        "safeReload запрещён, пока у участника открыта базовая линия подтверждения (handlingGate/yielded.page без reply_observed), — нейтральная причина «ожидаем подтверждение конца хода»; REBASE снимает этот запрет только при возможности переноса.",
        "Fixture: перезагрузка Control → доставка → простой дольше FRESH_DOCUMENT_MS без yield → следующий claim даёт freshness-reload."
      ],
      "expected_commit_message": "feat: свежесть серверной страницы перед доставкой",
      "task_brief": "Свежесть серверной страницы перед отправкой. Служба отправляет только из документа, отражающего актуальный разговор после ходов на других клиентах. Выполнить все критерии приёмки этой задачи по docs/planning/shared-conversation-mac.md и docs/planning/shared-conversation-mac-freshness.md с соблюдением AGENTS.md; без новых кнопок, режимов, DOM Send, подмены User-Agent и изменений donor/рабочего профиля; живую проверку выполняет пользователь. Проверки только назначенные: conversation-freshness, startup-recovery, sdk-recovery-targeted, intake-sdk-scenario, prepared-flow-cycle, architecture.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/shared-conversation-mac.md",
            "required": true,
            "revision": "e822c44c7154cd92881ad4aef032974f8b38bf41"
          },
          {
            "path": "docs/planning/shared-conversation-mac-freshness.md",
            "required": true,
            "revision": "e822c44c7154cd92881ad4aef032974f8b38bf41"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": [
          "OBSERVER"
        ]
      },
      "parallel_safe": false,
      "actual_files": [
        "src/control/plugin/conversation-freshness.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/control/workflow/executor-session.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/control/workflow/coordination.mjs",
        "src/backend/desktop-model.mjs",
        "src/control/plugin/service.mjs",
        "src/execution/browser/session-runtime.mjs",
        "tests/conversation-freshness.test.mjs",
        "tests/session-runtime.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "shared-conversation-mac",
        "task_id": "REBASE",
        "role": "implementation"
      },
      "dependencies": [
        "FRESH"
      ],
      "functional_paths": [
        "src/control/plugin/workflow-channel.mjs",
        "src/control/plugin/conversation-freshness.mjs",
        "src/control/plugin/assignment-dialogue.mjs",
        "src/execution/browser/session-runtime.mjs",
        "tests/conversation-freshness.test.mjs",
        "tests/automatic-agent-dialogue.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/session-runtime.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "conversation-freshness",
        "intake-sdk-scenario",
        "prepared-flow-cycle",
        "sdk-recovery-targeted"
      ],
      "id": "REBASE",
      "title": "Перенос подтверждения хода на новый документ",
      "why": "Перезагрузка и ход на другом клиенте не должны оставлять обработанное сообщение без reply_observed.",
      "acceptance_criteria": [
        "После перезагрузки, выполненной Control, и восстановления renderer незакрытая базовая линия переносится на новый документ: двойное наблюдение (≥2 с) stopped/!busy/commandsIdle/canSend/lastMessageRole=assistant с нативными отпечатками → reply_observed; событие freshness.rebased.",
        "Без нативных отпечатков перенос не выполняется, а перезагрузка при незакрытом подтверждении запрещена с нейтральной причиной «ожидаем подтверждение конца хода».",
        "yield (read без yield не закрывает gate) без busy/роста assistantRevision серверной страницы 15 с запускает безопасную перезагрузку; пока gate открыт и новый документ не показал конец хода, перезагрузка повторяется с интервалом 20, 40, 80 с … до 5 минут; fixtures «ход на другом клиенте» и «перезагрузка во время ещё идущего чужого хода» доходят до acceptance и следующего шага без вмешательства; ветка после restart backend сохранена.",
        "Запрет FRESH на перезагрузку при открытой базовой линии снимается только когда перенос возможен (нативные отпечатки)."
      ],
      "expected_commit_message": "feat: перенос подтверждения хода после перезагрузки",
      "task_brief": "Перенос подтверждения хода на новый документ. Перезагрузка и ход на другом клиенте не должны оставлять обработанное сообщение без reply_observed. Выполнить все критерии приёмки этой задачи по docs/planning/shared-conversation-mac.md и docs/planning/shared-conversation-mac-freshness.md с соблюдением AGENTS.md; без новых кнопок, режимов, DOM Send, подмены User-Agent и изменений donor/рабочего профиля; живую проверку выполняет пользователь. Проверки только назначенные: conversation-freshness, intake-sdk-scenario, prepared-flow-cycle, sdk-recovery-targeted.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/shared-conversation-mac.md",
            "required": true,
            "revision": "e822c44c7154cd92881ad4aef032974f8b38bf41"
          },
          {
            "path": "docs/planning/shared-conversation-mac-freshness.md",
            "required": true,
            "revision": "e822c44c7154cd92881ad4aef032974f8b38bf41"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": [
          "FRESH"
        ]
      },
      "parallel_safe": false,
      "actual_files": [
        "src/control/plugin/workflow-channel.mjs",
        "src/control/plugin/conversation-freshness.mjs",
        "src/execution/browser/session-runtime.mjs",
        "tests/conversation-freshness.test.mjs",
        "tests/session-runtime.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "shared-conversation-mac",
        "task_id": "BRANCH",
        "role": "implementation"
      },
      "dependencies": [
        "REBASE"
      ],
      "functional_paths": [
        "src/execution/browser/chatgpt-dom.mjs",
        "src/execution/browser/chatgpt-page-observer.mjs",
        "src/execution/browser/page-state.mjs",
        "src/control/plugin/conversation-freshness.mjs",
        "src/control/workflow/executor-session.mjs",
        "tests/page-state.test.mjs",
        "tests/chatgpt-dom.test.mjs",
        "tests/conversation-freshness.test.mjs",
        "src/control/workflow/plan-continuation.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/plugin/workflow-channel.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "conversation-freshness",
        "startup-recovery",
        "intake-sdk-scenario",
        "plan-review-ui"
      ],
      "id": "BRANCH",
      "title": "Обнаружение ветвления разговора",
      "why": "Ветвь после серверной доставки должна быть видна и останавливать доставку участнику до решения пользователя.",
      "acceptance_criteria": [
        "Observer сообщает turnVariant последнего пользовательского хода single|multiple|unknown; публичные DOM-экспорты сохранены, DOM не меняется.",
        "multiple после reply_observed доставленного службой сообщения → freshness-conflict branch с запомненным нативным отпечатком хода: план ставится на «Паузу» штатной программной паузой executionControl.pause через coordination.mjs (как при unknown), кнопка показывает «Продолжить», оранжевая причина с инструкцией выбрать ветку; outbox текущих ходов сохраняется, UNKNOWN/история сохранены, повторной отправки нет.",
        "«Продолжить» после свежего наблюдения документа снимает конфликт запомненного хода; multiple на том же ходе больше не поднимает конфликт, на более новом ходе — поднимает; unknown не блокирует и журналируется."
      ],
      "expected_commit_message": "feat: обнаружить ветвление разговора",
      "task_brief": "Обнаружение ветвления разговора. Ветвь после серверной доставки должна быть видна и останавливать доставку участнику до решения пользователя. Выполнить все критерии приёмки этой задачи по docs/planning/shared-conversation-mac.md и docs/planning/shared-conversation-mac-freshness.md с соблюдением AGENTS.md; без новых кнопок, режимов, DOM Send, подмены User-Agent и изменений donor/рабочего профиля; живую проверку выполняет пользователь. Проверки только назначенные: conversation-freshness, startup-recovery, intake-sdk-scenario, plan-review-ui.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/shared-conversation-mac.md",
            "required": true,
            "revision": "e822c44c7154cd92881ad4aef032974f8b38bf41"
          },
          {
            "path": "docs/planning/shared-conversation-mac-freshness.md",
            "required": true,
            "revision": "e822c44c7154cd92881ad4aef032974f8b38bf41"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": [
          "REBASE"
        ]
      },
      "parallel_safe": false,
      "actual_files": [
        "src/execution/browser/chatgpt-dom.mjs",
        "src/execution/browser/chatgpt-page-observer.mjs",
        "src/execution/browser/page-state.mjs",
        "src/control/plugin/conversation-freshness.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/control/workflow/executor-session.mjs",
        "src/control/workflow/coordination.mjs",
        "tests/page-state.test.mjs",
        "tests/chatgpt-dom.test.mjs",
        "tests/conversation-freshness.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "shared-conversation-mac",
        "task_id": "DIAG",
        "role": "implementation"
      },
      "dependencies": [
        "OWNER"
      ],
      "functional_paths": [
        "tools/codex-app-server-mcp/plugin.py",
        "src/execution/plugin/bridge.mjs",
        "src/control/plugin/communication.mjs",
        "src/backend/diagnostics.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/backend-diagnostics.test.mjs",
        "tests/plugin-communication.test.mjs",
        "src/backend/desktop-model.mjs",
        "src/backend/main.mjs",
        "src/control/plugin/assignment-dialogue.mjs",
        "src/control/plugin/service.mjs",
        "src/control/plugin/identity-trace.mjs",
        "tests/chatgpt-plugin.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "executor-channel",
        "delivery-ownership",
        "sdk-recovery-targeted"
      ],
      "id": "DIAG",
      "title": "Диагностика identity клиентов",
      "why": "Живая проверка должна различать кандидатов причины нештатности второго клиента без раскрытия данных.",
      "acceptance_criteria": [
        "Для вызовов панели и модели журналируются только имена ключей _meta хоста и префикс 8 символов identityHash с источником, panel_instance_id и delivery_role; значения metadata, тексты, q/ticket и секреты не сохраняются.",
        "Отказ BINDING в инструменте модели пишет identity.unmatched в backend-events.jsonl без WAL; экспорт O дополнительно включает identity.* записи текущего boot за интервал времени своего run (только префиксы, имена ключей, источник, время); тест: несовпавшая identity модели → запись видна в экспорте O.",
        "Python-проверки выполняются без bytecode (PYTHONDONTWRITEBYTECODE=1 или -B)."
      ],
      "expected_commit_message": "feat: диагностика identity клиентов",
      "task_brief": "Диагностика identity клиентов. Живая проверка должна различать кандидатов причины нештатности второго клиента без раскрытия данных. Выполнить все критерии приёмки этой задачи по docs/planning/shared-conversation-mac.md и docs/planning/shared-conversation-mac-freshness.md с соблюдением AGENTS.md; без новых кнопок, режимов, DOM Send, подмены User-Agent и изменений donor/рабочего профиля; живую проверку выполняет пользователь. Проверки только назначенные: executor-channel, delivery-ownership, sdk-recovery-targeted.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/shared-conversation-mac.md",
            "required": true,
            "revision": "e822c44c7154cd92881ad4aef032974f8b38bf41"
          },
          {
            "path": "docs/planning/shared-conversation-mac-freshness.md",
            "required": true,
            "revision": "e822c44c7154cd92881ad4aef032974f8b38bf41"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": [
          "OWNER"
        ]
      },
      "parallel_safe": false,
      "actual_files": [
        "src/backend/desktop-model.mjs",
        "src/backend/diagnostics.mjs",
        "src/backend/main.mjs",
        "src/control/plugin/assignment-dialogue.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/service.mjs",
        "src/control/plugin/identity-trace.mjs",
        "tests/backend-diagnostics.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/plugin-communication.test.mjs",
        "tools/codex-app-server-mcp/plugin.py"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "shared-conversation-mac",
        "task_id": "UI",
        "role": "implementation"
      },
      "dependencies": [
        "BRANCH",
        "DIAG"
      ],
      "functional_paths": [
        "src/contracts/work-progress.mjs",
        "src/contracts/dialogue-view.mjs",
        "src/control/workflow/execution-projection.mjs",
        "src/frontend/desktop/ui/current-actions.mjs",
        "src/frontend/plugin/panel.mjs",
        "tests/work-progress.test.mjs",
        "tests/work-progress-scenario.test.mjs",
        "tests/panel-dialogue-view.test.mjs",
        "tests/sidebar.test.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "tests/plugin-delivery-ownership.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "delivery-ui-targeted",
        "chatgpt-plugin",
        "closed-card-targeted"
      ],
      "id": "UI",
      "title": "Состояния доставки в текущих действиях",
      "why": "Пользователь видит, кто доставляет и что требует его действия, без новых кнопок и дублей.",
      "acceptance_criteria": [
        "Нейтральные причины owner-unavailable, freshness-reload, «ожидаем подтверждение конца хода»; оранжевые freshness-conflict draft-present, branch (с паузой плана) и «Серверная страница не готова к доставке» с выполнимой инструкцией.",
        "Sidebar не дублирует ленту и причины; новых кнопок, режимов и панелей нет; закрытая карточка без изменений."
      ],
      "expected_commit_message": "feat: состояния серверной доставки в интерфейсе",
      "task_brief": "Состояния доставки в текущих действиях. Пользователь видит, кто доставляет и что требует его действия, без новых кнопок и дублей. Выполнить все критерии приёмки этой задачи по docs/planning/shared-conversation-mac.md и docs/planning/shared-conversation-mac-freshness.md с соблюдением AGENTS.md; без новых кнопок, режимов, DOM Send, подмены User-Agent и изменений donor/рабочего профиля; живую проверку выполняет пользователь. Проверки только назначенные: delivery-ui-targeted, chatgpt-plugin, closed-card-targeted.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/shared-conversation-mac.md",
            "required": true,
            "revision": "e822c44c7154cd92881ad4aef032974f8b38bf41"
          },
          {
            "path": "docs/planning/shared-conversation-mac-freshness.md",
            "required": true,
            "revision": "e822c44c7154cd92881ad4aef032974f8b38bf41"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": [
          "BRANCH",
          "DIAG"
        ]
      },
      "parallel_safe": false,
      "actual_files": [
        "src/contracts/dialogue-view.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "tests/panel-dialogue-view.test.mjs",
        "tests/plugin-delivery-ownership.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "shared-conversation-mac",
        "task_id": "COMPAT",
        "role": "implementation"
      },
      "dependencies": [
        "UI"
      ],
      "functional_paths": [
        "tests/shared-conversation-compat.test.mjs",
        "tests/fixtures/released-communication-0.5.41/communication-store.mjs",
        "tests/migration-compatibility.test.mjs",
        "src/execution/plugin/communication-store.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "shared-conversation-compat",
        "panel-resource-targeted"
      ],
      "id": "COMPAT",
      "title": "Совместимость, миграция и откат на 0.5.41",
      "why": "Откат должен быть настоящим: данные 0.6.0 читаются версией 0.5.41, переход на протокол 9 описан.",
      "acceptance_criteria": [
        "Фиксированная копия хранилища/валидатора communication из c7cc8be читает и восстанавливает WAL, записанный 0.6.0 с событиями delivery/freshness/identity и новыми полями, без отказа и потери сообщений/UNKNOWN.",
        "Схемы WAL, WorkspaceSessions, Kit, devices и журнала операций не изменены; если обнаружена несовместимость — она исправляется в этой задаче, а не скрывается.",
        "Пауза → установка → обновление коннектора → workflow_pilot_panel → Продолжить и обратный путь проверены fixture-сценарием до уровня протокола."
      ],
      "expected_commit_message": "test: совместимость и откат протокола 9",
      "task_brief": "Совместимость, миграция и откат на 0.5.41. Откат должен быть настоящим: данные 0.6.0 читаются версией 0.5.41, переход на протокол 9 описан. Выполнить все критерии приёмки этой задачи по docs/planning/shared-conversation-mac.md и docs/planning/shared-conversation-mac-freshness.md с соблюдением AGENTS.md; без новых кнопок, режимов, DOM Send, подмены User-Agent и изменений donor/рабочего профиля; живую проверку выполняет пользователь. Проверки только назначенные: shared-conversation-compat, panel-resource-targeted.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/shared-conversation-mac.md",
            "required": true,
            "revision": "e822c44c7154cd92881ad4aef032974f8b38bf41"
          },
          {
            "path": "docs/planning/shared-conversation-mac-freshness.md",
            "required": true,
            "revision": "e822c44c7154cd92881ad4aef032974f8b38bf41"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": [
          "UI"
        ]
      },
      "parallel_safe": false,
      "actual_files": [
        "tests/shared-conversation-compat.test.mjs",
        "tests/fixtures/released-communication-0.5.41/communication-store.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "shared-conversation-mac",
        "task_id": "VERIFY",
        "role": "implementation"
      },
      "dependencies": [
        "COMPAT"
      ],
      "functional_paths": [
        "tests/automatic-agent-dialogue.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/electron-smoke.mjs"
      ],
      "documentation_paths": [
        "docs/planning/shared-conversation-mac.md",
        "docs/planning/shared-conversation-mac-freshness.md",
        "docs/acceptance/shared-conversation-mac.md"
      ],
      "verification_ids": [
        "unit-all",
        "electron-smoke",
        "architecture",
        "chatgpt-plugin",
        "executor-channel",
        "native-startup-dock",
        "native-startup-theme",
        "orchestrator-startup",
        "startup-recovery",
        "search-extension-startup",
        "plan-review-ui",
        "migration-compatibility",
        "force-stop"
      ],
      "id": "VERIFY",
      "title": "Полная регрессия выпуска",
      "why": "Подтвердить, что существующие функции сохранены до DOCS и сборки.",
      "acceptance_criteria": [
        "Все назначенные проверки PASS без ослабления assertions; найденные регрессии исправлены в этой задаче с адресными тестами. Исправления допускаются в модулях, уже затронутых задачами этого плана; commit сохраняет фактический состав.",
        "Kit не менялся; если изменения Kit потребовались — добавлены kit-check и kit-assignments."
      ],
      "expected_commit_message": "test: регрессия выпуска 0.6.0",
      "task_brief": "Полная регрессия выпуска. Подтвердить, что существующие функции сохранены до DOCS и сборки. Выполнить все критерии приёмки этой задачи по docs/planning/shared-conversation-mac.md и docs/planning/shared-conversation-mac-freshness.md с соблюдением AGENTS.md; без новых кнопок, режимов, DOM Send, подмены User-Agent и изменений donor/рабочего профиля; живую проверку выполняет пользователь. Проверки только назначенные: unit-all, electron-smoke, architecture, chatgpt-plugin, executor-channel, native-startup-dock, native-startup-theme, orchestrator-startup, startup-recovery, search-extension-startup, plan-review-ui, migration-compatibility, force-stop.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/shared-conversation-mac.md",
            "required": true,
            "revision": "e822c44c7154cd92881ad4aef032974f8b38bf41"
          },
          {
            "path": "docs/planning/shared-conversation-mac-freshness.md",
            "required": true,
            "revision": "e822c44c7154cd92881ad4aef032974f8b38bf41"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": [
          "COMPAT"
        ]
      },
      "parallel_safe": false,
      "actual_files": [
        "docs/planning/shared-conversation-mac.md",
        "docs/planning/shared-conversation-mac-freshness.md",
        "docs/acceptance/shared-conversation-mac.md",
        "tests/electron-smoke.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "shared-conversation-mac",
        "task_id": "DOCS",
        "role": "implementation"
      },
      "dependencies": [
        "CONTRACT",
        "ATTEST",
        "OWNER",
        "OBSERVER",
        "FRESH",
        "REBASE",
        "BRANCH",
        "DIAG",
        "UI",
        "COMPAT",
        "VERIFY"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/planning/shared-conversation-mac.md",
        "docs/planning/shared-conversation-mac-freshness.md",
        "docs/planning/shared-backend-mobile-followup.md",
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/sdk-messaging.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/backend.md",
        "docs/modules/native-window.md",
        "docs/modules/browser.md",
        "docs/modules/current-actions.md",
        "docs/modules/release.md",
        "docs/acceptance/shared-conversation-mac.md",
        "docs/modules/shared-conversation.md"
      ],
      "verification_ids": [],
      "id": "DOCS",
      "title": "Актуализация всех документов проекта",
      "why": "Перенести результат в действующие контракты до production build.",
      "acceptance_criteria": [
        "Контракты модулей описывают владельца доставки, наблюдателей, свежесть, перенос подтверждения, ветвление, диагностику и переход/откат протокола 9; ограничение «второй браузер того же разговора не штатный» в backend.md и OVERVIEW сохраняется действующим до PASS шагов 1–4 живой проверки, новый контракт описан рядом с пометкой NOT_RUN.",
        "Выпущенные части двух spec перенесены и удалены с точной Git blob ссылкой; followup с невыпущенными требованиями сохранён; сценарий живой проверки — docs/acceptance/shared-conversation-mac.md; каждый документ ≤ 28000 байт.",
        "Живое поведение настоящего ChatGPT и native Windows/Linux отмечены NOT_RUN; DOCS завершена до production build."
      ],
      "expected_commit_message": "docs: актуализация документов выпуска 0.6.0",
      "task_brief": "Актуализация всех документов проекта. Перенести результат в действующие контракты до production build. Выполнить все критерии приёмки этой задачи по docs/planning/shared-conversation-mac.md и docs/planning/shared-conversation-mac-freshness.md с соблюдением AGENTS.md; без новых кнопок, режимов, DOM Send, подмены User-Agent и изменений donor/рабочего профиля; живую проверку выполняет пользователь. Проверки только назначенные: схема и состав документационного коммита.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/shared-conversation-mac.md",
            "required": true,
            "revision": "e822c44c7154cd92881ad4aef032974f8b38bf41"
          },
          {
            "path": "docs/planning/shared-conversation-mac-freshness.md",
            "required": true,
            "revision": "e822c44c7154cd92881ad4aef032974f8b38bf41"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": [
          "DIAG",
          "UI",
          "COMPAT",
          "VERIFY"
        ]
      },
      "parallel_safe": false,
      "actual_files": [
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/backend.md",
        "docs/modules/browser.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/current-actions.md",
        "docs/modules/native-window.md",
        "docs/modules/release.md",
        "docs/modules/sdk-messaging.md",
        "docs/modules/shared-conversation.md",
        "docs/planning/shared-backend-mobile-followup.md",
        "docs/planning/shared-conversation-mac.md",
        "docs/planning/shared-conversation-mac-freshness.md"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "shared-conversation-mac",
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
      "title": "Собрать macOS Windows Linux",
      "why": "Проверенный полный комплект из одного sourceCommit.",
      "verification_kind": "package",
      "acceptance_criteria": [
        "Перед каждой production/package проверкой cache preflight tools/codex-app-server-mcp без перехода по симлинкам, Python без bytecode.",
        "Три ОС после DOCS, семь assets, общий sourceCommit, manifest/SHA/size/composition/macOS подпись подтверждены."
      ],
      "expected_commit_message": "delivery: собрать macos windows linux",
      "task_brief": "Собрать macOS Windows Linux. Проверенный полный комплект из одного sourceCommit. Выполнить все критерии приёмки этой задачи по docs/planning/shared-conversation-mac.md и docs/planning/shared-conversation-mac-freshness.md с соблюдением AGENTS.md; без новых кнопок, режимов, DOM Send, подмены User-Agent и изменений donor/рабочего профиля; живую проверку выполняет пользователь. Проверки только назначенные: three-platform-release.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/shared-conversation-mac.md",
            "required": true,
            "revision": "e822c44c7154cd92881ad4aef032974f8b38bf41"
          },
          {
            "path": "docs/planning/shared-conversation-mac-freshness.md",
            "required": true,
            "revision": "e822c44c7154cd92881ad4aef032974f8b38bf41"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": [
          "DOCS"
        ]
      },
      "parallel_safe": false,
      "actual_files": [
        "release-manifest.json"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "shared-conversation-mac",
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
      "title": "Установить выпуск на этот Mac",
      "why": "Поставить готовый комплект с rollback без остановки службы.",
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Applications и checkout штатным installer: версии/manifest/подпись/rollback; без пересборки и переподписи.",
        "При BACKEND_RUNNING verified pending; не закрывать/не перезапускать приложение и backend, не менять donor; отчёт напоминает о переходе на протокол 9 (пауза, обновление коннектора, workflow_pilot_panel)."
      ],
      "expected_commit_message": "delivery: установить выпуск на этот mac",
      "task_brief": "Установить выпуск на этот Mac. Поставить готовый комплект с rollback без остановки службы. Выполнить все критерии приёмки этой задачи по docs/planning/shared-conversation-mac.md и docs/planning/shared-conversation-mac-freshness.md с соблюдением AGENTS.md; без новых кнопок, режимов, DOM Send, подмены User-Agent и изменений donor/рабочего профиля; живую проверку выполняет пользователь. Проверки только назначенные: release-installed.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/shared-conversation-mac.md",
            "required": true,
            "revision": "e822c44c7154cd92881ad4aef032974f8b38bf41"
          },
          {
            "path": "docs/planning/shared-conversation-mac-freshness.md",
            "required": true,
            "revision": "e822c44c7154cd92881ad4aef032974f8b38bf41"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": [
          "RELEASE",
          "DOCS"
        ]
      },
      "parallel_safe": false,
      "actual_files": []
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "shared-conversation-mac",
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
      "why": "Публичная доставка и проверка remote main.",
      "verification_kind": "package",
      "acceptance_criteria": [
        "Tag равен sourceCommit, семь публичных assets проверены по SHA/size, remote main и итоговый push подтверждены.",
        "Живая проверка и native Windows/Linux не объявляются пройденными; план остаётся READY_FOR_ACCEPTANCE до приёмки."
      ],
      "expected_commit_message": "delivery: опубликовать выпуск на github",
      "task_brief": "Опубликовать выпуск на GitHub. Публичная доставка и проверка remote main. Выполнить все критерии приёмки этой задачи по docs/planning/shared-conversation-mac.md и docs/planning/shared-conversation-mac-freshness.md с соблюдением AGENTS.md; без новых кнопок, режимов, DOM Send, подмены User-Agent и изменений donor/рабочего профиля; живую проверку выполняет пользователь. Проверки только назначенные: github-release.",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/shared-conversation-mac.md",
            "required": true,
            "revision": "e822c44c7154cd92881ad4aef032974f8b38bf41"
          },
          {
            "path": "docs/planning/shared-conversation-mac-freshness.md",
            "required": true,
            "revision": "e822c44c7154cd92881ad4aef032974f8b38bf41"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": [
          "INSTALL",
          "DOCS"
        ]
      },
      "parallel_safe": false,
      "actual_files": []
    },
    {
      "id": "DRAFT",
      "title": "Очистка восстановленной стартовой команды",
      "why": "Новый Chat и фоновый исполнитель не стартуют из-за чужой команды, восстановленной ChatGPT в поле ввода.",
      "dependencies": [],
      "functional_paths": [
        "src/contracts/context.mjs",
        "src/control/context/context-session.mjs",
        "src/execution/browser/chatgpt-composer.mjs",
        "src/control/workflow/execution-projection.mjs",
        "src/contracts/backend.mjs",
        "package.json",
        "package-lock.json",
        "tests/context-session.test.mjs",
        "tests/chatgpt-composer.test.mjs",
        "tests/panel-dialogue-view.test.mjs",
        "tests/chatgpt-plugin.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/restored-startup-draft.md"
      ],
      "verification_ids": [
        "startup-recovery",
        "orchestrator-startup",
        "attachment-retry",
        "chatgpt-plugin",
        "delivery-ui-targeted"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Точная стартовая команда Workflow Pilot с любым тикетом в поле нового чата / очищается перед решением о черновике и повторно перед q-навигацией; старт доходит до q.",
        "Пользовательский текст и команда с добавленным текстом не стираются; старт ждёт, задача исполнителя показывает оранжевую причину с инструкцией.",
        "Шаблон команды общий для формирования и распознавания; текст черновика не покидает страницу; версия 0.6.1."
      ],
      "expected_commit_message": "feat: Очистка восстановленной стартовой команды",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "shared-conversation-mac",
        "task_id": "DRAFT",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "src/contracts/context.mjs",
        "src/control/context/context-session.mjs",
        "src/execution/browser/chatgpt-composer.mjs",
        "src/control/workflow/execution-projection.mjs",
        "src/contracts/backend.mjs",
        "package.json",
        "package-lock.json",
        "tests/context-session.test.mjs",
        "tests/chatgpt-composer.test.mjs",
        "tests/panel-dialogue-view.test.mjs",
        "tests/chatgpt-plugin.test.mjs"
      ]
    },
    {
      "id": "VERIFY-2",
      "title": "Полная регрессия выпуска 0.6.1",
      "why": "Подтвердить сохранность функций до DOCS-2 и сборки.",
      "dependencies": [
        "DRAFT"
      ],
      "functional_paths": [
        "tests/electron-smoke.mjs"
      ],
      "documentation_paths": [
        "docs/planning/restored-startup-draft.md"
      ],
      "verification_ids": [
        "unit-all",
        "electron-smoke",
        "architecture",
        "chatgpt-plugin",
        "executor-channel",
        "native-startup-dock",
        "native-startup-theme",
        "orchestrator-startup",
        "startup-recovery",
        "search-extension-startup",
        "plan-review-ui",
        "migration-compatibility",
        "force-stop"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Все назначенные проверки PASS без ослабления assertions; найденные регрессии исправлены адресно."
      ],
      "expected_commit_message": "feat: Полная регрессия выпуска 0.6.1",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "shared-conversation-mac",
        "task_id": "VERIFY-2",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": []
    },
    {
      "id": "DOCS-2",
      "title": "Актуализация всех документов проекта",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "shared-conversation-mac",
        "task_id": "DOCS-2",
        "role": "implementation",
        "iteration": 2
      },
      "why": "Перед выпуском сверить README, OVERVIEW и действующие контракты модулей с результатом; обновить устаревшее.",
      "dependencies": [
        "DRAFT",
        "VERIFY-2"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/architecture/OVERVIEW.md",
        "docs/planning/restored-startup-draft.md",
        "README.md",
        "docs/modules/chat-only-startup.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/current-actions.md",
        "docs/modules/release.md",
        "docs/modules/sdk-messaging.md",
        "docs/modules/shared-conversation.md",
        "docs/acceptance/shared-conversation-mac.md"
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
        "docs/modules/chat-only-startup.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/current-actions.md",
        "docs/modules/release.md",
        "docs/modules/sdk-messaging.md",
        "docs/modules/shared-conversation.md",
        "docs/acceptance/shared-conversation-mac.md",
        "docs/planning/restored-startup-draft.md"
      ]
    },
    {
      "id": "RELEASE-2",
      "title": "Собрать macOS Windows Linux 0.6.1",
      "why": "Собрать macOS Windows Linux 0.6.1",
      "dependencies": [
        "VERIFY-2",
        "DOCS-2"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/restored-startup-draft.md"
      ],
      "verification_ids": [
        "three-platform-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "Три ОС после DOCS-2 из одного sourceCommit, семь assets, manifest/SHA/подпись подтверждены; preflight кэша Python."
      ],
      "expected_commit_message": "feat: Собрать macOS Windows Linux 0.6.1",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "shared-conversation-mac",
        "task_id": "RELEASE-2",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "release-manifest.json"
      ]
    },
    {
      "id": "INSTALL-2",
      "title": "Установить выпуск 0.6.1 на этот Mac",
      "why": "Установить выпуск 0.6.1 на этот Mac",
      "dependencies": [
        "RELEASE-2",
        "DOCS-2"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/restored-startup-draft.md"
      ],
      "verification_ids": [
        "release-installed"
      ],
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Штатный installer без пересборки и переподписи; при работающей службе verified pending."
      ],
      "expected_commit_message": "feat: Установить выпуск 0.6.1 на этот Mac",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "shared-conversation-mac",
        "task_id": "INSTALL-2",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": []
    },
    {
      "id": "PUBLISH-2",
      "title": "Опубликовать выпуск 0.6.1 на GitHub",
      "why": "Опубликовать выпуск 0.6.1 на GitHub",
      "dependencies": [
        "INSTALL-2",
        "DOCS-2"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/restored-startup-draft.md"
      ],
      "verification_ids": [
        "github-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "Tag равен sourceCommit, семь assets проверены, remote main подтверждён; живая проверка не объявляется пройденной."
      ],
      "expected_commit_message": "feat: Опубликовать выпуск 0.6.1 на GitHub",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "shared-conversation-mac",
        "task_id": "PUBLISH-2",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": []
    },
    {
      "id": "FIRST-TASK",
      "title": "Доставка первого поручения после q-старта",
      "why": "Фоновый исполнитель после старта не получает поручение: перезагрузка свежести бесконечно отклоняется страницей с владельцем стартовой навигации.",
      "dependencies": [],
      "functional_paths": [
        "src/execution/browser/session-runtime.mjs",
        "src/control/context/context-session.mjs",
        "src/control/plugin/conversation-freshness.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/contracts/backend.mjs",
        "package.json",
        "package-lock.json",
        "tests/session-runtime.test.mjs",
        "tests/context-session.test.mjs",
        "tests/conversation-freshness.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/dialogue-delivery.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/startup-freshness-loop.md"
      ],
      "verification_ids": [
        "conversation-freshness",
        "startup-recovery",
        "orchestrator-startup",
        "sdk-recovery-targeted",
        "shared-conversation-compat",
        "chatgpt-plugin",
        "delivery-ui-targeted"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "После привязки адреса отправленной попытки владелец стартовой навигации снят; safeReload выполняется, чужой токен владельца не снимает.",
        "Документ собственного q-старта свеж для первой доставки в течение 5 минут; поручение доставляется без перезагрузки.",
        "Отказ перезагрузки учитывается и журналируется с причиной; после лимита — freshness-unavailable с редким повтором, бесконечного цикла нет; версия 0.6.2."
      ],
      "expected_commit_message": "feat: Доставка первого поручения после q-старта",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "shared-conversation-mac",
        "task_id": "FIRST-TASK",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "src/execution/browser/session-runtime.mjs",
        "src/control/context/context-session.mjs",
        "src/control/plugin/conversation-freshness.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/contracts/backend.mjs",
        "package.json",
        "package-lock.json",
        "tests/session-runtime.test.mjs",
        "tests/context-session.test.mjs",
        "tests/conversation-freshness.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/dialogue-delivery.test.mjs"
      ]
    },
    {
      "id": "VERIFY-3",
      "title": "Полная регрессия выпуска 0.6.2",
      "why": "Подтвердить сохранность функций до DOCS-3 и сборки.",
      "dependencies": [
        "FIRST-TASK"
      ],
      "functional_paths": [
        "tests/electron-smoke.mjs"
      ],
      "documentation_paths": [
        "docs/planning/startup-freshness-loop.md"
      ],
      "verification_ids": [
        "unit-all",
        "electron-smoke",
        "architecture",
        "chatgpt-plugin",
        "executor-channel",
        "native-startup-dock",
        "native-startup-theme",
        "orchestrator-startup",
        "startup-recovery",
        "search-extension-startup",
        "plan-review-ui",
        "migration-compatibility",
        "force-stop"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Все назначенные проверки PASS без ослабления assertions; найденные регрессии исправлены адресно."
      ],
      "expected_commit_message": "feat: Полная регрессия выпуска 0.6.2",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "shared-conversation-mac",
        "task_id": "VERIFY-3",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": []
    },
    {
      "id": "DOCS-3",
      "title": "Актуализация всех документов проекта",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "shared-conversation-mac",
        "task_id": "DOCS-3",
        "role": "implementation",
        "iteration": 3
      },
      "why": "Перед выпуском сверить README, OVERVIEW и действующие контракты модулей с результатом; обновить устаревшее.",
      "dependencies": [
        "FIRST-TASK",
        "VERIFY-3"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/architecture/OVERVIEW.md",
        "docs/planning/startup-freshness-loop.md",
        "README.md",
        "docs/modules/chat-only-startup.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/current-actions.md",
        "docs/modules/release.md",
        "docs/modules/sdk-messaging.md",
        "docs/modules/shared-conversation.md",
        "docs/acceptance/shared-conversation-mac.md"
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
        "docs/modules/chat-only-startup.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/current-actions.md",
        "docs/modules/release.md",
        "docs/modules/sdk-messaging.md",
        "docs/modules/shared-conversation.md",
        "docs/acceptance/shared-conversation-mac.md",
        "docs/planning/startup-freshness-loop.md"
      ]
    },
    {
      "id": "RELEASE-3",
      "title": "Собрать macOS Windows Linux 0.6.2",
      "why": "Собрать macOS Windows Linux 0.6.2",
      "dependencies": [
        "VERIFY-3",
        "DOCS-3"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/startup-freshness-loop.md"
      ],
      "verification_ids": [
        "three-platform-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "Три ОС после DOCS-3 из одного sourceCommit, семь assets, manifest/SHA/подпись подтверждены; preflight кэша Python."
      ],
      "expected_commit_message": "feat: Собрать macOS Windows Linux 0.6.2",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "shared-conversation-mac",
        "task_id": "RELEASE-3",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "release-manifest.json"
      ]
    },
    {
      "id": "INSTALL-3",
      "title": "Установить выпуск 0.6.2 на этот Mac",
      "why": "Установить выпуск 0.6.2 на этот Mac",
      "dependencies": [
        "RELEASE-3",
        "DOCS-3"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/startup-freshness-loop.md"
      ],
      "verification_ids": [
        "release-installed"
      ],
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Штатный installer без пересборки и переподписи; при работающей службе verified pending."
      ],
      "expected_commit_message": "feat: Установить выпуск 0.6.2 на этот Mac",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "shared-conversation-mac",
        "task_id": "INSTALL-3",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": []
    },
    {
      "id": "PUBLISH-3",
      "title": "Опубликовать выпуск 0.6.2 на GitHub",
      "why": "Опубликовать выпуск 0.6.2 на GitHub",
      "dependencies": [
        "INSTALL-3",
        "DOCS-3"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/startup-freshness-loop.md"
      ],
      "verification_ids": [
        "github-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "Tag равен sourceCommit, семь assets проверены, remote main подтверждён; живая проверка не объявляется пройденной."
      ],
      "expected_commit_message": "feat: Опубликовать выпуск 0.6.2 на GitHub",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "shared-conversation-mac",
        "task_id": "PUBLISH-3",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": []
    },
    {
      "id": "NOT-SENT",
      "title": "Повтор неотправленной стартовой команды",
      "why": "ChatGPT иногда не отправляет q-команду («Учетная запись сменилась»); старт молча ждёт регистрацию и через 180 с становится неизвестным.",
      "dependencies": [],
      "functional_paths": [
        "src/control/context/context-session.mjs",
        "src/control/workflow/execution-projection.mjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/contracts/backend.mjs",
        "package.json",
        "package-lock.json",
        "tests/context-session.test.mjs",
        "tests/panel-dialogue-view.test.mjs",
        "tests/chatgpt-plugin.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/start-not-sent-retry.md"
      ],
      "verification_ids": [
        "startup-recovery",
        "orchestrator-startup",
        "attachment-retry",
        "chatgpt-plugin",
        "delivery-ui-targeted",
        "architecture"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Доказанная неотправка (30 с, тот же документ, временный адрес, нет генерации, адреса и регистрации) распознаётся по таймеру; удачный и медленный старт не задеты.",
        "Приглашение отзывается; только при revoked — один новый старт с новым приглашением из чистого чата, переживает перезапуск; registered-stopped и второй сбой — оранжевая причина без повтора.",
        "Без DOM Send и повторной отправки отправленного; версия 0.6.3; полная регрессия не выполняется по решению пользователя."
      ],
      "expected_commit_message": "feat: Повтор неотправленной стартовой команды",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "shared-conversation-mac",
        "task_id": "NOT-SENT",
        "role": "implementation"
      },
      "parallel_safe": false
    },
    {
      "id": "DOCS-4",
      "title": "Актуализация всех документов проекта",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "shared-conversation-mac",
        "task_id": "DOCS-4",
        "role": "implementation",
        "iteration": 4
      },
      "why": "Перед выпуском сверить README, OVERVIEW и действующие контракты модулей с результатом; обновить устаревшее.",
      "dependencies": [
        "NOT-SENT"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/architecture/OVERVIEW.md",
        "docs/planning/start-not-sent-retry.md"
      ],
      "acceptance_criteria": [
        "Документы описывают текущий результат, существенное из выпущенных рабочих спецификаций перенесено в контракты модулей; история остаётся в Git."
      ],
      "verification_ids": [],
      "expected_commit_message": "docs: актуализировать документацию проекта",
      "parallel_safe": false
    },
    {
      "id": "RELEASE-4",
      "title": "Собрать macOS Windows Linux 0.6.3",
      "why": "Собрать macOS Windows Linux 0.6.3",
      "dependencies": [
        "NOT-SENT",
        "DOCS-4"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/start-not-sent-retry.md"
      ],
      "verification_ids": [
        "three-platform-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "Три ОС после DOCS-4 из одного sourceCommit, семь assets, manifest/SHA/подпись подтверждены; preflight кэша Python."
      ],
      "expected_commit_message": "feat: Собрать macOS Windows Linux 0.6.3",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "shared-conversation-mac",
        "task_id": "RELEASE-4",
        "role": "implementation"
      },
      "parallel_safe": false
    },
    {
      "id": "INSTALL-4",
      "title": "Установить выпуск 0.6.3 на этот Mac",
      "why": "Установить выпуск 0.6.3 на этот Mac",
      "dependencies": [
        "RELEASE-4",
        "DOCS-4"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/start-not-sent-retry.md"
      ],
      "verification_ids": [
        "release-installed"
      ],
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Штатный installer без пересборки и переподписи; при работающей службе verified pending."
      ],
      "expected_commit_message": "feat: Установить выпуск 0.6.3 на этот Mac",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "shared-conversation-mac",
        "task_id": "INSTALL-4",
        "role": "implementation"
      },
      "parallel_safe": false
    },
    {
      "id": "PUBLISH-4",
      "title": "Опубликовать выпуск 0.6.3 на GitHub",
      "why": "Опубликовать выпуск 0.6.3 на GitHub",
      "dependencies": [
        "INSTALL-4",
        "DOCS-4"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/start-not-sent-retry.md"
      ],
      "verification_ids": [
        "github-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "Tag равен sourceCommit, семь assets проверены, remote main подтверждён; живая проверка не объявляется пройденной."
      ],
      "expected_commit_message": "feat: Опубликовать выпуск 0.6.3 на GitHub",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "shared-conversation-mac",
        "task_id": "PUBLISH-4",
        "role": "implementation"
      },
      "parallel_safe": false
    }
  ],
  "blocked_reason": null,
  "user_decisions": [
    "29.10.2026: реализовать сразу в продукте и выпустить новую версию без отдельного стенда и пробных приложений; при принципиальной неработоспособности — откат, при ошибках — исправления.",
    "29.10.2026: сначала всё для Mac; телефоны/iPad проверяются через ChatGPT Web и адаптируются позже; мобильные приложения, API v2, автозапуск и Linux-сервер — followup.",
    "Пользователь разрешил весь цикл после Claude Review до сборки трёх ОС, установки на Mac и GitHub-публикации.",
    {
      "id": "4737b8c4-c1f8-4da6-bed1-9f546facacd6",
      "text": "Пользователь 29.10.2026 поручил подготовить спецификацию и план в workspace и внедрить изменения сразу в новый выпуск (сначала Mac; мобильные позже), с откатом на 0.5.41 при принципиальной неработоспособности.",
      "recorded_at": "2026-10-29T19:31:58.545Z"
    }
  ],
  "parallel_allowed": false,
  "max_workers": 1,
  "execution_strategy": "sequential",
  "execution_reason": "Внешняя разработка Claude Code в текущем checkout; задачи последовательно меняют общие модули доставки; модельное делегирование запрещено. Claude Review через Kit разрешён."
}
```
<!-- workflow-state:end -->

## Состояние

Execution Scope Status: ACTIVE
Delivery Status: IN_PROGRESS
Scope: shared-conversation-mac
Current Task: нет
Revision: 1361

## Цель

Один разговор O/E продолжается с любого клиента ChatGPT, автоматическую доставку выполняет только серверная страница backend; выпуск 0.6.0 трёх ОС, установка на Mac и публикация GitHub.

## Критерии приёмки

- Автоматическую доставку участнику выполняет только аттестованная панель его серверной страницы; панели других клиентов — наблюдатели без SDK-отправок.
- Перед отправкой серверная страница свежая; перезагрузка безопасна и переносит подтверждение хода; ход на другом клиенте доходит до reply_observed и acceptance.
- Ветвление обнаруживается и останавливает доставку участнику с адресным действием; бюджет уведомлений, UNKNOWN, Stop и одна кнопка плана сохранены.
- Данные 0.6.0 читаются версией 0.5.41; переход и откат протокола 9 описаны; полный комплект трёх ОС, установка и публикация доказаны отдельно, живая проверка Mac — pending у пользователя.

## Микрозадачи

Выполнение: sequential; разрешено: false; лимит: 1
Причина: Внешняя разработка Claude Code в текущем checkout; задачи последовательно меняют общие модули доставки; модельное делегирование запрещено. Claude Review через Kit разрешён.

- [DONE] CONTRACT: Контракт протокола 9 и версия 0.6.0 — Завершено
  - Git Commit: [DONE] feat: контракт протокола 9 и версия 0.6.0
  - Reference: shared-conversation-mac / CONTRACT / implementation
  - Файлы: package.json, package-lock.json, src/contracts/backend.mjs, src/contracts/plugin-communication.mjs, tools/codex-app-server-mcp/plugin.py, tests/chatgpt-plugin.test.mjs, tests/codex-app-server-mcp.test.mjs, tests/panel-resource-upgrade.test.mjs, src/control/plugin/communication.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] ATTEST: Аттестация собственного кадра панели в Execution — Завершено
  - Git Commit: [DONE] feat: аттестовать кадр панели серверной страницы
  - Reference: shared-conversation-mac / ATTEST / implementation
  - Файлы: src/execution/browser/panel-frame-attestation.mjs, src/execution/browser/backend-host.mjs, src/execution/browser/session-runtime.mjs, src/execution/facade.mjs, src/frontend/plugin/launch.mjs, tests/panel-frame-attestation.test.mjs, tests/fixtures/panel-frame-host.mjs, tests/chatgpt-plugin.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: CONTRACT
- [DONE] OWNER: Единственный владелец доставки участника — Завершено
  - Git Commit: [DONE] feat: единственный владелец доставки
  - Reference: shared-conversation-mac / OWNER / implementation
  - Файлы: src/control/plugin/delivery-ownership.mjs, src/control/plugin/communication.mjs, src/control/plugin/workflow-channel.mjs, src/control/workflow/dialogue-delivery.mjs, src/backend/bootstrap.mjs, src/backend/desktop-model.mjs, tests/plugin-delivery-ownership.test.mjs, tests/plugin-communication.test.mjs, tests/workflow-channel.test.mjs, tests/dialogue-delivery.test.mjs, tests/fixtures/automatic-agent-dialogue.mjs, tests/automatic-agent-dialogue.test.mjs, src/control/plugin/service.mjs, src/control/workflow/coordination.mjs, tests/startup-context.test.mjs, tests/plugin-enrollment.test.mjs, tests/plugin-communication-store.test.mjs, tests/electron-smoke.mjs, tests/backend-end-to-end.test.mjs, tests/fixtures/panel-attestation.mjs, tests/chatgpt-plugin.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: ATTEST
- [DONE] OBSERVER: Режим наблюдателя в панели — Завершено
  - Git Commit: [DONE] feat: режим наблюдателя панели
  - Reference: shared-conversation-mac / OBSERVER / implementation
  - Файлы: src/frontend/plugin/launch.mjs, src/frontend/plugin/panel.mjs, src/contracts/dialogue-view.mjs, tests/chatgpt-plugin.test.mjs, tests/panel-dialogue-view.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: OWNER
- [DONE] FRESH: Свежесть серверной страницы перед отправкой — Завершено
  - Git Commit: [DONE] feat: свежесть серверной страницы перед доставкой
  - Reference: shared-conversation-mac / FRESH / implementation
  - Файлы: src/control/plugin/conversation-freshness.mjs, src/control/plugin/workflow-channel.mjs, src/control/workflow/dialogue-delivery.mjs, src/control/workflow/executor-session.mjs, src/execution/browser/session-runtime.mjs, src/execution/facade.mjs, src/backend/desktop-model.mjs, tests/conversation-freshness.test.mjs, tests/session-runtime.test.mjs, src/control/plugin/service.mjs, src/control/workflow/coordination.mjs, src/control/plugin/communication.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: OBSERVER
- [DONE] REBASE: Перенос подтверждения хода на новый документ — Завершено
  - Git Commit: [DONE] feat: перенос подтверждения хода после перезагрузки
  - Reference: shared-conversation-mac / REBASE / implementation
  - Файлы: src/control/plugin/workflow-channel.mjs, src/control/plugin/conversation-freshness.mjs, src/control/plugin/assignment-dialogue.mjs, src/execution/browser/session-runtime.mjs, tests/conversation-freshness.test.mjs, tests/automatic-agent-dialogue.test.mjs, tests/fixtures/automatic-agent-dialogue.mjs, tests/session-runtime.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: FRESH
- [DONE] BRANCH: Обнаружение ветвления разговора — Завершено
  - Git Commit: [DONE] feat: обнаружить ветвление разговора
  - Reference: shared-conversation-mac / BRANCH / implementation
  - Файлы: src/execution/browser/chatgpt-dom.mjs, src/execution/browser/chatgpt-page-observer.mjs, src/execution/browser/page-state.mjs, src/control/plugin/conversation-freshness.mjs, src/control/workflow/executor-session.mjs, tests/page-state.test.mjs, tests/chatgpt-dom.test.mjs, tests/conversation-freshness.test.mjs, src/control/workflow/plan-continuation.mjs, src/control/workflow/coordination.mjs, src/control/plugin/workflow-channel.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: REBASE
- [DONE] DIAG: Диагностика identity клиентов — Завершено
  - Git Commit: [DONE] feat: диагностика identity клиентов
  - Reference: shared-conversation-mac / DIAG / implementation
  - Файлы: tools/codex-app-server-mcp/plugin.py, src/execution/plugin/bridge.mjs, src/control/plugin/communication.mjs, src/backend/diagnostics.mjs, tests/codex-app-server-mcp.test.mjs, tests/backend-diagnostics.test.mjs, tests/plugin-communication.test.mjs, src/backend/desktop-model.mjs, src/backend/main.mjs, src/control/plugin/assignment-dialogue.mjs, src/control/plugin/service.mjs, src/control/plugin/identity-trace.mjs, tests/chatgpt-plugin.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: OWNER
- [DONE] UI: Состояния доставки в текущих действиях — Завершено
  - Git Commit: [DONE] feat: состояния серверной доставки в интерфейсе
  - Reference: shared-conversation-mac / UI / implementation
  - Файлы: src/contracts/work-progress.mjs, src/contracts/dialogue-view.mjs, src/control/workflow/execution-projection.mjs, src/frontend/desktop/ui/current-actions.mjs, src/frontend/plugin/panel.mjs, tests/work-progress.test.mjs, tests/work-progress-scenario.test.mjs, tests/panel-dialogue-view.test.mjs, tests/sidebar.test.mjs, src/control/plugin/workflow-channel.mjs, tests/plugin-delivery-ownership.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: BRANCH, DIAG
- [DONE] COMPAT: Совместимость, миграция и откат на 0.5.41 — Завершено
  - Git Commit: [DONE] test: совместимость и откат протокола 9
  - Reference: shared-conversation-mac / COMPAT / implementation
  - Файлы: tests/shared-conversation-compat.test.mjs, tests/fixtures/released-communication-0.5.41/communication-store.mjs, tests/migration-compatibility.test.mjs, src/execution/plugin/communication-store.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: UI
- [DONE] VERIFY: Полная регрессия выпуска — Завершено
  - Git Commit: [DONE] test: регрессия выпуска 0.6.0
  - Reference: shared-conversation-mac / VERIFY / implementation
  - Файлы: tests/automatic-agent-dialogue.test.mjs, tests/fixtures/automatic-agent-dialogue.mjs, tests/electron-smoke.mjs, docs/planning/shared-conversation-mac.md, docs/planning/shared-conversation-mac-freshness.md, docs/acceptance/shared-conversation-mac.md
  - Параллельность: исключительное выполнение
  - Зависимости: COMPAT
- [DONE] DOCS: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: актуализация документов выпуска 0.6.0
  - Reference: shared-conversation-mac / DOCS / implementation
  - Файлы: docs/planning/shared-conversation-mac.md, docs/planning/shared-conversation-mac-freshness.md, docs/planning/shared-backend-mobile-followup.md, README.md, docs/architecture/OVERVIEW.md, docs/modules/sdk-messaging.md, docs/modules/chatgpt-plugin.md, docs/modules/backend.md, docs/modules/native-window.md, docs/modules/browser.md, docs/modules/current-actions.md, docs/modules/release.md, docs/acceptance/shared-conversation-mac.md, docs/modules/shared-conversation.md
  - Параллельность: исключительное выполнение
  - Зависимости: CONTRACT, ATTEST, OWNER, OBSERVER, FRESH, REBASE, BRANCH, DIAG, UI, COMPAT, VERIFY
- [DONE] RELEASE: Собрать macOS Windows Linux — Завершено
  - Git Commit: [DONE] delivery: собрать macos windows linux
  - Reference: shared-conversation-mac / RELEASE / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: DOCS
- [DONE] INSTALL: Установить выпуск на этот Mac — Завершено
  - Git Commit: [DONE] delivery: установить выпуск на этот mac
  - Reference: shared-conversation-mac / INSTALL / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: RELEASE, DOCS
- [DONE] PUBLISH: Опубликовать выпуск на GitHub — Завершено
  - Git Commit: [DONE] delivery: опубликовать выпуск на github
  - Reference: shared-conversation-mac / PUBLISH / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: INSTALL, DOCS
- [DONE] DRAFT: Очистка восстановленной стартовой команды — Завершено
  - Git Commit: [DONE] feat: Очистка восстановленной стартовой команды
  - Reference: shared-conversation-mac / DRAFT / implementation
  - Файлы: src/contracts/context.mjs, src/control/context/context-session.mjs, src/execution/browser/chatgpt-composer.mjs, src/control/workflow/execution-projection.mjs, src/contracts/backend.mjs, package.json, package-lock.json, tests/context-session.test.mjs, tests/chatgpt-composer.test.mjs, tests/panel-dialogue-view.test.mjs, tests/chatgpt-plugin.test.mjs, docs/planning/restored-startup-draft.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] VERIFY-2: Полная регрессия выпуска 0.6.1 — Завершено
  - Git Commit: [DONE] feat: Полная регрессия выпуска 0.6.1
  - Reference: shared-conversation-mac / VERIFY-2 / implementation
  - Файлы: tests/electron-smoke.mjs, docs/planning/restored-startup-draft.md
  - Параллельность: исключительное выполнение
  - Зависимости: DRAFT
- [DONE] DOCS-2: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: актуализировать документацию проекта
  - Reference: shared-conversation-mac / DOCS-2 / implementation
  - Файлы: docs/architecture/OVERVIEW.md, docs/planning/restored-startup-draft.md, README.md, docs/modules/chat-only-startup.md, docs/modules/chatgpt-plugin.md, docs/modules/current-actions.md, docs/modules/release.md, docs/modules/sdk-messaging.md, docs/modules/shared-conversation.md, docs/acceptance/shared-conversation-mac.md
  - Параллельность: исключительное выполнение
  - Зависимости: DRAFT, VERIFY-2
- [DONE] RELEASE-2: Собрать macOS Windows Linux 0.6.1 — Завершено
  - Git Commit: [DONE] feat: Собрать macOS Windows Linux 0.6.1
  - Reference: shared-conversation-mac / RELEASE-2 / implementation
  - Файлы: release-manifest.json, docs/planning/restored-startup-draft.md
  - Параллельность: исключительное выполнение
  - Зависимости: VERIFY-2, DOCS-2
- [DONE] INSTALL-2: Установить выпуск 0.6.1 на этот Mac — Завершено
  - Git Commit: [DONE] feat: Установить выпуск 0.6.1 на этот Mac
  - Reference: shared-conversation-mac / INSTALL-2 / implementation
  - Файлы: release-manifest.json, docs/planning/restored-startup-draft.md
  - Параллельность: исключительное выполнение
  - Зависимости: RELEASE-2, DOCS-2
- [DONE] PUBLISH-2: Опубликовать выпуск 0.6.1 на GitHub — Завершено
  - Git Commit: [DONE] feat: Опубликовать выпуск 0.6.1 на GitHub
  - Reference: shared-conversation-mac / PUBLISH-2 / implementation
  - Файлы: release-manifest.json, docs/planning/restored-startup-draft.md
  - Параллельность: исключительное выполнение
  - Зависимости: INSTALL-2, DOCS-2
- [DONE] FIRST-TASK: Доставка первого поручения после q-старта — Завершено
  - Git Commit: [DONE] feat: Доставка первого поручения после q-старта
  - Reference: shared-conversation-mac / FIRST-TASK / implementation
  - Файлы: src/execution/browser/session-runtime.mjs, src/control/context/context-session.mjs, src/control/plugin/conversation-freshness.mjs, src/control/workflow/dialogue-delivery.mjs, src/contracts/backend.mjs, package.json, package-lock.json, tests/session-runtime.test.mjs, tests/context-session.test.mjs, tests/conversation-freshness.test.mjs, tests/chatgpt-plugin.test.mjs, tests/dialogue-delivery.test.mjs, docs/planning/startup-freshness-loop.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] VERIFY-3: Полная регрессия выпуска 0.6.2 — Завершено
  - Git Commit: [DONE] feat: Полная регрессия выпуска 0.6.2
  - Reference: shared-conversation-mac / VERIFY-3 / implementation
  - Файлы: tests/electron-smoke.mjs, docs/planning/startup-freshness-loop.md
  - Параллельность: исключительное выполнение
  - Зависимости: FIRST-TASK
- [DONE] DOCS-3: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: актуализировать документацию проекта
  - Reference: shared-conversation-mac / DOCS-3 / implementation
  - Файлы: docs/architecture/OVERVIEW.md, docs/planning/startup-freshness-loop.md, README.md, docs/modules/chat-only-startup.md, docs/modules/chatgpt-plugin.md, docs/modules/current-actions.md, docs/modules/release.md, docs/modules/sdk-messaging.md, docs/modules/shared-conversation.md, docs/acceptance/shared-conversation-mac.md
  - Параллельность: исключительное выполнение
  - Зависимости: FIRST-TASK, VERIFY-3
- [DONE] RELEASE-3: Собрать macOS Windows Linux 0.6.2 — Завершено
  - Git Commit: [DONE] feat: Собрать macOS Windows Linux 0.6.2
  - Reference: shared-conversation-mac / RELEASE-3 / implementation
  - Файлы: release-manifest.json, docs/planning/startup-freshness-loop.md
  - Параллельность: исключительное выполнение
  - Зависимости: VERIFY-3, DOCS-3
- [DONE] INSTALL-3: Установить выпуск 0.6.2 на этот Mac — Завершено
  - Git Commit: [DONE] feat: Установить выпуск 0.6.2 на этот Mac
  - Reference: shared-conversation-mac / INSTALL-3 / implementation
  - Файлы: release-manifest.json, docs/planning/startup-freshness-loop.md
  - Параллельность: исключительное выполнение
  - Зависимости: RELEASE-3, DOCS-3
- [DONE] PUBLISH-3: Опубликовать выпуск 0.6.2 на GitHub — Завершено
  - Git Commit: [DONE] feat: Опубликовать выпуск 0.6.2 на GitHub
  - Reference: shared-conversation-mac / PUBLISH-3 / implementation
  - Файлы: release-manifest.json, docs/planning/startup-freshness-loop.md
  - Параллельность: исключительное выполнение
  - Зависимости: INSTALL-3, DOCS-3
- [TODO] NOT-SENT: Повтор неотправленной стартовой команды — Ожидает
  - Git Commit: [PENDING] feat: Повтор неотправленной стартовой команды
  - Reference: shared-conversation-mac / NOT-SENT / implementation
  - Файлы: src/control/context/context-session.mjs, src/control/workflow/execution-projection.mjs, src/frontend/desktop/ui/sidebar.mjs, src/contracts/backend.mjs, package.json, package-lock.json, tests/context-session.test.mjs, tests/panel-dialogue-view.test.mjs, tests/chatgpt-plugin.test.mjs, docs/planning/start-not-sent-retry.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [TODO] DOCS-4: Актуализация всех документов проекта — Ожидает
  - Git Commit: [PENDING] docs: актуализировать документацию проекта
  - Reference: shared-conversation-mac / DOCS-4 / implementation
  - Файлы: docs/architecture/OVERVIEW.md, docs/planning/start-not-sent-retry.md
  - Параллельность: исключительное выполнение
  - Зависимости: NOT-SENT
- [TODO] RELEASE-4: Собрать macOS Windows Linux 0.6.3 — Ожидает
  - Git Commit: [PENDING] feat: Собрать macOS Windows Linux 0.6.3
  - Reference: shared-conversation-mac / RELEASE-4 / implementation
  - Файлы: release-manifest.json, docs/planning/start-not-sent-retry.md
  - Параллельность: исключительное выполнение
  - Зависимости: NOT-SENT, DOCS-4
- [TODO] INSTALL-4: Установить выпуск 0.6.3 на этот Mac — Ожидает
  - Git Commit: [PENDING] feat: Установить выпуск 0.6.3 на этот Mac
  - Reference: shared-conversation-mac / INSTALL-4 / implementation
  - Файлы: release-manifest.json, docs/planning/start-not-sent-retry.md
  - Параллельность: исключительное выполнение
  - Зависимости: RELEASE-4, DOCS-4
- [TODO] PUBLISH-4: Опубликовать выпуск 0.6.3 на GitHub — Ожидает
  - Git Commit: [PENDING] feat: Опубликовать выпуск 0.6.3 на GitHub
  - Reference: shared-conversation-mac / PUBLISH-4 / implementation
  - Файлы: release-manifest.json, docs/planning/start-not-sent-retry.md
  - Параллельность: исключительное выполнение
  - Зависимости: INSTALL-4, DOCS-4

## Context Pack For This Cycle

- docs/architecture/OVERVIEW.md
- docs/planning/shared-conversation-mac.md
- docs/planning/shared-conversation-mac-freshness.md
- docs/planning/shared-backend-mobile-followup.md
- docs/planning/restored-startup-draft.md
- docs/planning/startup-freshness-loop.md
- docs/planning/start-not-sent-retry.md

Служебные состояния меняются только командами workflow. Приёмка не архивирует scope.
