# Активный план — Workflow_Pilot

<!-- workflow-state:begin -->
```json
{
  "schema_version": 1,
  "plan_revision": 1274,
  "project_id": "7411e192-943c-4529-bffb-3b081d9c242f",
  "project_name": "Workflow_Pilot",
  "scope_id": "incoming-obligations-and-sdk-recovery",
  "execution_scope_status": "ACTIVE",
  "delivery_status": "IN_PROGRESS",
  "objective": "Не терять принятые входящие поручения при Review и SDK сбое; освобождать закрытую карточку; выпустить три ОС, установить Mac и опубликовать GitHub.",
  "acceptance_criteria": [
    "Все неотменённые входящие сохраняют обязательство результата, Review не обрывает исходный запрос.",
    "Проверенное восстановление соединения ограниченно возобновляет сохранённое SDK уведомление без потери ID, дубликатов эффектов и возврата очереди приложения.",
    "Закрытая карточка свободна от старых задач/прогресса; parser и идентичность сохранены.",
    "Назначены только относящиеся тесты; полный комплект трёх ОС/установка/публичный release доказаны отдельно."
  ],
  "approved_scope": {
    "functional_paths": [
      "packages/workflow-kit/src/lib/role-protocol.mjs",
      "packages/workflow-kit/src/templates/PLAN.md",
      "packages/workflow-kit/package.json",
      "package-lock.json",
      "src/control/workflow/plan-review.mjs",
      "src/control/plugin/communication.mjs",
      "src/control/plugin/startup-context.mjs",
      "tools/codex-app-server-mcp/plugin.py",
      "tests/role-protocol.test.mjs",
      "tests/plan-review.test.mjs",
      "tests/workflow-channel.test.mjs",
      "packages/workflow-kit/src/lib/common.mjs",
      "packages/workflow-kit/src/lib/installer.mjs",
      "packages/workflow-kit/src/WORKFLOW.md",
      "src/control/plugin/assignment-dialogue.mjs",
      "src/contracts/plugin-communication.mjs",
      "src/control/plugin/workflow-channel.mjs",
      "src/execution/plugin/communication-store.mjs",
      "src/frontend/plugin/launch.mjs",
      "src/frontend/plugin/panel.mjs",
      "src/contracts/dialogue-view.mjs",
      "src/backend/desktop-model.mjs",
      "tests/plugin-communication.test.mjs",
      "tests/plugin-communication-store.test.mjs",
      "tests/chatgpt-plugin.test.mjs",
      "tests/dialogue-delivery.test.mjs",
      "src/frontend/desktop/ui/sidebar.mjs",
      "src/frontend/desktop/ui/index.html",
      "tests/sidebar.test.mjs",
      "tests/workflow-plan.test.mjs",
      "tests/backend-desktop-model.test.mjs",
      "package.json",
      "src/contracts/backend.mjs",
      "tests/automatic-agent-dialogue.test.mjs",
      "tests/fixtures/automatic-agent-dialogue.mjs",
      "tests/workflow-kit-upgrade.test.mjs",
      "tests/panel-resource-upgrade.test.mjs",
      "tests/fixtures/released-kit/kit-1.10.4.tar.gz",
      "tests/fixtures/released-kit/manifest.json",
      "release-manifest.json"
    ],
    "documentation_paths": [
      "docs/planning/incoming-obligations-and-sdk-recovery.md",
      "README.md",
      "docs/architecture/OVERVIEW.md",
      "docs/modules/sdk-messaging.md",
      "docs/modules/user-choice.md",
      "docs/modules/current-actions.md",
      "docs/modules/desktop.md",
      "docs/modules/project-lifecycle.md",
      "docs/modules/chatgpt-plugin.md",
      "docs/modules/release.md",
      "packages/workflow-kit/docs/modules/workflow-kit-package.md",
      "packages/workflow-kit/docs/modules/orchestrated-plans.md",
      "docs/acceptance/sdk-messaging.md",
      "docs/modules/project-compatibility.md",
      "tests/fixtures/released-kit/README.md"
    ]
  },
  "baseline_commit": "a19412ac108be465926ffb057495d39558826296",
  "current_task_id": null,
  "context_pack": {
    "documents": [
      {
        "path": "docs/planning/incoming-obligations-and-sdk-recovery.md",
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
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "incoming-obligations-and-sdk-recovery",
        "task_id": "INPUTS",
        "role": "implementation"
      },
      "dependencies": [],
      "functional_paths": [
        "packages/workflow-kit/src/lib/role-protocol.mjs",
        "packages/workflow-kit/src/templates/PLAN.md",
        "packages/workflow-kit/package.json",
        "package-lock.json",
        "src/control/workflow/plan-review.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/startup-context.mjs",
        "tools/codex-app-server-mcp/plugin.py",
        "tests/role-protocol.test.mjs",
        "tests/plan-review.test.mjs",
        "tests/workflow-channel.test.mjs",
        "packages/workflow-kit/src/lib/common.mjs",
        "packages/workflow-kit/src/lib/installer.mjs",
        "packages/workflow-kit/src/WORKFLOW.md",
        "src/control/plugin/assignment-dialogue.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "intake-instructions",
        "intake-mcp-contract"
      ],
      "id": "INPUTS",
      "title": "Сохранять обязательства по всем входящим поручениям",
      "why": "Единое короткое правило для пользователя, исполнителей и приложения; Review не обрывает исходное задание.",
      "acceptance_criteria": [
        "Каноническое правило действует для всех принятых неотменённых входящих O/E/S; новый вход не отменяет прежний, порядок выбирает агент в рамках зависимостей.",
        "Review учитывается без прекращения доступной работы и пользовательского Продолжай; task:start/yield ради настройки не требуются.",
        "Recovery, адресные инструкции, startup/PLAN/MCP согласованы; bootstrap, Stop, Start и ограничения полномочий сохранены.",
        "Kit и role protocol обновлены штатно; managed файлы только installer. Не строить вторую книгу запросов и не читать их через DOM.",
        "Сохранена граница одной задачи плана S; WORKFLOW/self/recovery/yield не противоречат правилу входящих. common.VERSION и upgradeFrom с 1.10.4 согласованы; server.py не меняется."
      ],
      "parallel_safe": false,
      "expected_commit_message": "fix: сохранять обязательства по всем входящим поручениям",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/incoming-obligations-and-sdk-recovery.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "task_brief": "Сохранять обязательства по всем входящим поручениям. Единое короткое правило для пользователя, исполнителей и приложения; Review не обрывает исходное задание. Требования: Каноническое правило действует для всех принятых неотменённых входящих O/E/S; новый вход не отменяет прежний, порядок выбирает агент в рамках зависимостей. Review учитывается без прекращения доступной работы и пользовательского Продолжай; task:start/yield ради настройки не требуются. Recovery, адресные инструкции, startup/PLAN/MCP согласованы; bootstrap, Stop, Start и ограничения полномочий сохранены. Kit и role protocol обновлены штатно; managed файлы только installer. Не строить вторую книгу запросов и не читать их через DOM. Полностью соблюдать docs/planning/incoming-obligations-and-sdk-recovery.md и AGENTS.md. Никаких несогласованных UX/режимов/очередей. Donor, пользовательский 002_Test и рабочий профиль не менять. Проверки только назначенные: intake-instructions. Сохранить одну задачу S на ход, согласовать WORKFLOW/self/assignment yield. Повысить common.VERSION и upgradeFrom 1.10.4. server.py не менять. Дополнительно intake-mcp-contract."
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "incoming-obligations-and-sdk-recovery",
        "task_id": "SDK",
        "role": "implementation"
      },
      "dependencies": [
        "INPUTS"
      ],
      "functional_paths": [
        "src/contracts/plugin-communication.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/control/plugin/assignment-dialogue.mjs",
        "src/execution/plugin/communication-store.mjs",
        "src/frontend/plugin/launch.mjs",
        "src/frontend/plugin/panel.mjs",
        "src/contracts/dialogue-view.mjs",
        "src/backend/desktop-model.mjs",
        "tools/codex-app-server-mcp/plugin.py",
        "tests/workflow-channel.test.mjs",
        "tests/plugin-communication.test.mjs",
        "tests/plugin-communication-store.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/dialogue-delivery.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "sdk-recovery-targeted"
      ],
      "id": "SDK",
      "title": "Восстанавливать SDK уведомление после разрыва соединения",
      "why": "Исключить молчаливое застревание сохранённого результата при исчерпанном бюджете до восстановления связи.",
      "acceptance_criteria": [
        "Повторяется только совместимое SDK уведомление того же message_id: три начальные попытки и один цикл до трёх по подтверждённому lost/restored, максимум шесть; состояние долговечно.",
        "Проверенный сигнал связан с адресным сбоем и новым sync/wait; повтор status/remount/restart и дубликат сигнала лимит не сбрасывают. Оба порядка сигнала/ошибки покрыты.",
        "Один in-flight на получателя, независимость соседей, read/already_handled, поздние исходы, identity/scope/grant/Stop и legacy UNKNOWN сохраняются.",
        "Нормальная доставка не ждёт занятость модели и чужие квитанции. Нет новой кнопки/панели/таймерного диспетчера/DOM Send.",
        "Постоянный отказ не скрыт, accepted/read не выдумываются; исходная причина -32000 не объявляется установленной без новых доказательств."
      ],
      "parallel_safe": false,
      "expected_commit_message": "fix: восстанавливать sdk уведомление после разрыва соединения",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/incoming-obligations-and-sdk-recovery.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": [
          "INPUTS"
        ]
      },
      "task_brief": "Восстанавливать SDK уведомление после разрыва соединения. Исключить молчаливое застревание сохранённого результата при исчерпанном бюджете до восстановления связи. Требования: Повторяется только совместимое SDK уведомление того же message_id: три начальные попытки и один цикл до трёх по подтверждённому lost/restored, максимум шесть; состояние долговечно. Проверенный сигнал связан с адресным сбоем и новым sync/wait; повтор status/remount/restart и дубликат сигнала лимит не сбрасывают. Оба порядка сигнала/ошибки покрыты. Один in-flight на получателя, независимость соседей, read/already_handled, поздние исходы, identity/scope/grant/Stop и legacy UNKNOWN сохраняются. Нормальная доставка не ждёт занятость модели и чужие квитанции. Нет новой кнопки/панели/таймерного диспетчера/DOM Send. Постоянный отказ не скрыт, accepted/read не выдумываются; исходная причина -32000 не объявляется установленной без новых доказательств. Полностью соблюдать docs/planning/incoming-obligations-and-sdk-recovery.md и AGENTS.md. Никаких несогласованных UX/режимов/очередей. Donor, пользовательский 002_Test и рабочий профиль не менять. Проверки только назначенные: sdk-recovery-targeted."
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "incoming-obligations-and-sdk-recovery",
        "task_id": "CLOSED",
        "role": "implementation"
      },
      "dependencies": [
        "SDK"
      ],
      "functional_paths": [
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/frontend/desktop/ui/index.html",
        "src/backend/desktop-model.mjs",
        "tests/sidebar.test.mjs",
        "tests/workflow-plan.test.mjs",
        "tests/backend-desktop-model.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "closed-card-targeted"
      ],
      "id": "CLOSED",
      "title": "Освобождать карточку после закрытия плана",
      "why": "Показывать готовность нового обсуждения без старого списка и прогресса.",
      "acceptance_criteria": [
        "После current=false/NONE только нейтральные План закрыт и готовность нового плана; старые title/задачи/счётчик/прогресс/действия скрыты.",
        "Review и имя сессии сохранены, новый план автоматически не создаётся. История Git и безопасный целый parser не удаляются.",
        "Новый план, SSE/restart/loading/error и поздний cache response не возвращают закрытый список; чужой workspace не подменяет карточку.",
        "Изменение закрытой карточки относится только к sidebar; панель ChatGPT закрытого разговора не меняется."
      ],
      "parallel_safe": false,
      "expected_commit_message": "fix: освобождать карточку после закрытия плана",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/incoming-obligations-and-sdk-recovery.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": [
          "SDK"
        ]
      },
      "task_brief": "Освобождать карточку после закрытия плана. Показывать готовность нового обсуждения без старого списка и прогресса. Требования: После current=false/NONE только нейтральные План закрыт и готовность нового плана; старые title/задачи/счётчик/прогресс/действия скрыты. Review и имя сессии сохранены, новый план автоматически не создаётся. История Git и безопасный целый parser не удаляются. Новый план, SSE/restart/loading/error и поздний cache response не возвращают закрытый список; чужой workspace не подменяет карточку. Полностью соблюдать docs/planning/incoming-obligations-and-sdk-recovery.md и AGENTS.md. Никаких несогласованных UX/режимов/очередей. Donor, пользовательский 002_Test и рабочий профиль не менять. Проверки только назначенные: closed-card-targeted."
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "incoming-obligations-and-sdk-recovery",
        "task_id": "VERIFY",
        "role": "implementation"
      },
      "dependencies": [
        "CLOSED"
      ],
      "functional_paths": [
        "package.json",
        "package-lock.json",
        "src/contracts/backend.mjs",
        "tests/automatic-agent-dialogue.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/workflow-kit-upgrade.test.mjs",
        "tests/panel-resource-upgrade.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/fixtures/released-kit/kit-1.10.4.tar.gz",
        "tests/fixtures/released-kit/manifest.json"
      ],
      "documentation_paths": [
        "tests/fixtures/released-kit/README.md"
      ],
      "verification_ids": [
        "intake-sdk-scenario",
        "kit-upgrade",
        "architecture",
        "chatgpt-plugin",
        "kit-package-targeted",
        "kit-review-targeted",
        "kit-roles-targeted",
        "panel-resource-targeted"
      ],
      "id": "VERIFY",
      "title": "Проверить совместный сценарий и версии",
      "why": "Одно адресное совместное доказательство вместо всей suite.",
      "acceptance_criteria": [
        "Один выбранный real MCP/SDK/Kit fixture: исходный вход и Review, ошибки -32000, восстановление и обработка результата без дубликата, зависимая работа и закрытие.",
        "Следующие свободные версии app/immutable panel и Kit/role согласованы, protocol по совместимости DTO; upgrade не повторяет действия.",
        "Только выбранные модульные проверки; полный набор не объявлять пройденным. Живая ChatGPT и native Windows/Linux остаются NOT_RUN.",
        "Реальный immutable upgrade с Kit 1.10.4 / роли 13 проверен; только адресные скрипты Kit и staged immutable panel. Перед сборочной Kit-проверкой cache preflight."
      ],
      "parallel_safe": false,
      "expected_commit_message": "fix: проверить совместный сценарий и версии",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/incoming-obligations-and-sdk-recovery.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": [
          "CLOSED"
        ]
      },
      "task_brief": "Проверить совместный сценарий и версии. Одно адресное совместное доказательство вместо всей suite. Требования: Один выбранный real MCP/SDK/Kit fixture: исходный вход и Review, ошибки -32000, восстановление и обработка результата без дубликата, зависимая работа и закрытие. Следующие свободные версии app/immutable panel и Kit/role согласованы, protocol по совместимости DTO; upgrade не повторяет действия. Только выбранные модульные проверки; полный набор не объявлять пройденным. Живая ChatGPT и native Windows/Linux остаются NOT_RUN. Полностью соблюдать docs/planning/incoming-obligations-and-sdk-recovery.md и AGENTS.md. Никаких несогласованных UX/режимов/очередей. Donor, пользовательский 002_Test и рабочий профиль не менять. Проверки только назначенные: intake-sdk-scenario, kit-upgrade, architecture, chatgpt-plugin. До commit выполнить stage:chatgpt-plugin для актуального immutable HTML и cache preflight MCP перед check-package. Проверить fixture Kit 1.10.4 из sourceCommit v0.5.40. Выполнить также kit-package-targeted, kit-review-targeted, kit-roles-targeted, panel-resource-targeted."
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "incoming-obligations-and-sdk-recovery",
        "task_id": "DOCS",
        "role": "implementation"
      },
      "dependencies": [
        "INPUTS",
        "SDK",
        "CLOSED",
        "VERIFY"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/planning/incoming-obligations-and-sdk-recovery.md",
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/sdk-messaging.md",
        "docs/modules/user-choice.md",
        "docs/modules/current-actions.md",
        "docs/modules/desktop.md",
        "docs/modules/project-lifecycle.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/release.md",
        "packages/workflow-kit/docs/modules/workflow-kit-package.md",
        "packages/workflow-kit/docs/modules/orchestrated-plans.md",
        "docs/acceptance/sdk-messaging.md",
        "docs/modules/project-compatibility.md",
        "tests/fixtures/released-kit/README.md"
      ],
      "verification_ids": [],
      "id": "DOCS",
      "title": "Актуализация всех документов проекта",
      "why": "Перенести результат в действующие контракты до production build.",
      "acceptance_criteria": [
        "Обновлены только относящиеся контракты и версии; непроверенный финальный инцидент не выдаётся за исправление.",
        "Временная spec перенесена и удалена с точной Git blob ссылкой; каждый документ в бюджете 28000 байт.",
        "Адресные проверки и pending live/native отмечены; DOCS завершена до production build."
      ],
      "parallel_safe": false,
      "expected_commit_message": "docs: актуализация документов согласованного объёма",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/incoming-obligations-and-sdk-recovery.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": [
          "INPUTS",
          "SDK",
          "CLOSED",
          "VERIFY"
        ]
      },
      "task_brief": "Актуализация документов согласованного объёма. Перенести результат в действующие контракты до production build. Требования: Обновлены только относящиеся контракты и версии; непроверенный финальный инцидент не выдаётся за исправление. Временная spec перенесена и удалена с точной Git blob ссылкой; каждый документ в бюджете 28000 байт. Адресные проверки и pending live/native отмечены; DOCS завершена до production build. Полностью соблюдать docs/planning/incoming-obligations-and-sdk-recovery.md и AGENTS.md. Никаких несогласованных UX/режимов/очередей. Donor, пользовательский 002_Test и рабочий профиль не менять. Проверки только назначенные: схема и состав документационного коммита."
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "incoming-obligations-and-sdk-recovery",
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
      "acceptance_criteria": [
        "Перед каждой production/package проверкой cache preflight без симлинков, Python без bytecode.",
        "Три ОС после DOCS, семь assets, общий sourceCommit, manifest/SHA/size/composition/macOS подпись подтверждены."
      ],
      "parallel_safe": false,
      "expected_commit_message": "delivery: собрать macos windows linux",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/incoming-obligations-and-sdk-recovery.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": [
          "DOCS"
        ]
      },
      "task_brief": "Собрать macOS Windows Linux. Проверенный полный комплект из одного sourceCommit. Требования: Перед каждой production/package проверкой cache preflight без симлинков, Python без bytecode. Три ОС после DOCS, семь assets, общий sourceCommit, manifest/SHA/size/composition/macOS подпись подтверждены. Полностью соблюдать docs/planning/incoming-obligations-and-sdk-recovery.md и AGENTS.md. Никаких несогласованных UX/режимов/очередей. Donor, пользовательский 002_Test и рабочий профиль не менять. Проверки только назначенные: three-platform-release.",
      "verification_kind": "package"
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "incoming-obligations-and-sdk-recovery",
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
      "acceptance_criteria": [
        "Applications и checkout штатным installer: версии/manifest/подпись/rollback; без пересборки и переподписи.",
        "При BACKEND_RUNNING verified pending; не закрывать/не перезапускать приложение и backend, не менять donor."
      ],
      "parallel_safe": false,
      "expected_commit_message": "delivery: установить выпуск на этот mac",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/incoming-obligations-and-sdk-recovery.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": [
          "RELEASE",
          "DOCS"
        ]
      },
      "task_brief": "Установить выпуск на этот Mac. Поставить готовый комплект с rollback без остановки службы. Требования: Applications и checkout штатным installer: версии/manifest/подпись/rollback; без пересборки и переподписи. При BACKEND_RUNNING verified pending; не закрывать/не перезапускать приложение и backend, не менять donor. Полностью соблюдать docs/planning/incoming-obligations-and-sdk-recovery.md и AGENTS.md. Никаких несогласованных UX/режимов/очередей. Donor, пользовательский 002_Test и рабочий профиль не менять. Проверки только назначенные: release-installed.",
      "verification_kind": "installed"
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "incoming-obligations-and-sdk-recovery",
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
      "acceptance_criteria": [
        "Tag равен sourceCommit, семь публичных assets проверены по SHA/size, remote main и итоговый push подтверждены.",
        "Новая живая проверка и native Windows/Linux не объявляются пройденными; план остаётся READY_FOR_ACCEPTANCE до приёмки."
      ],
      "parallel_safe": false,
      "expected_commit_message": "delivery: опубликовать выпуск на github",
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/incoming-obligations-and-sdk-recovery.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": [
          "INSTALL",
          "DOCS"
        ]
      },
      "task_brief": "Опубликовать выпуск на GitHub. Публичная доставка и проверка remote main. Требования: Tag равен sourceCommit, семь публичных assets проверены по SHA/size, remote main и итоговый push подтверждены. Новая живая проверка и native Windows/Linux не объявляются пройденными; план остаётся READY_FOR_ACCEPTANCE до приёмки. Полностью соблюдать docs/planning/incoming-obligations-and-sdk-recovery.md и AGENTS.md. Никаких несогласованных UX/режимов/очередей. Donor, пользовательский 002_Test и рабочий профиль не менять. Проверки только назначенные: github-release.",
      "verification_kind": "package"
    }
  ],
  "blocked_reason": null,
  "user_decisions": [
    "Пользователь разрешил весь цикл после Claude Review до сборки трёх ОС, установки Mac и GitHub.",
    "Только обсуждённые исправления; никаких новых кнопок/режимов/панелей и неподтверждённого финального инцидента.",
    "Адресные тесты изменяемых модулей, расширение только по обнаруженной зависимости/риску.",
    {
      "id": "374a836f-a876-4577-b1b0-2ce4db1fd756",
      "text": "Прямое поручение пользователя 27.10.2026: подготовить спецификацию/ToDo, пройти ревью и выполнить до новых релизов/GitHub; только обсуждённые изменения и адресные тесты.",
      "recorded_at": "2026-10-27T15:39:41.134Z"
    }
  ],
  "parallel_allowed": false,
  "max_workers": 1,
  "execution_strategy": "sequential",
  "execution_reason": "Внешняя разработка Codex в текущем checkout, пересекающиеся source/контракты; модельное делегирование запрещено. Claude Review отдельно разрешён."
}
```
<!-- workflow-state:end -->

## Состояние

Execution Scope Status: ACTIVE
Delivery Status: IN_PROGRESS
Scope: incoming-obligations-and-sdk-recovery
Current Task: нет
Revision: 1274

## Цель

Не терять принятые входящие поручения при Review и SDK сбое; освобождать закрытую карточку; выпустить три ОС, установить Mac и опубликовать GitHub.

## Критерии приёмки

- Все неотменённые входящие сохраняют обязательство результата, Review не обрывает исходный запрос.
- Проверенное восстановление соединения ограниченно возобновляет сохранённое SDK уведомление без потери ID, дубликатов эффектов и возврата очереди приложения.
- Закрытая карточка свободна от старых задач/прогресса; parser и идентичность сохранены.
- Назначены только относящиеся тесты; полный комплект трёх ОС/установка/публичный release доказаны отдельно.

## Микрозадачи

Выполнение: sequential; разрешено: false; лимит: 1
Причина: Внешняя разработка Codex в текущем checkout, пересекающиеся source/контракты; модельное делегирование запрещено. Claude Review отдельно разрешён.

- [TODO] INPUTS: Сохранять обязательства по всем входящим поручениям — Ожидает
  - Git Commit: [PENDING] fix: сохранять обязательства по всем входящим поручениям
  - Reference: incoming-obligations-and-sdk-recovery / INPUTS / implementation
  - Файлы: packages/workflow-kit/src/lib/role-protocol.mjs, packages/workflow-kit/src/templates/PLAN.md, packages/workflow-kit/package.json, package-lock.json, src/control/workflow/plan-review.mjs, src/control/plugin/communication.mjs, src/control/plugin/startup-context.mjs, tools/codex-app-server-mcp/plugin.py, tests/role-protocol.test.mjs, tests/plan-review.test.mjs, tests/workflow-channel.test.mjs, packages/workflow-kit/src/lib/common.mjs, packages/workflow-kit/src/lib/installer.mjs, packages/workflow-kit/src/WORKFLOW.md, src/control/plugin/assignment-dialogue.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [TODO] SDK: Восстанавливать SDK уведомление после разрыва соединения — Ожидает
  - Git Commit: [PENDING] fix: восстанавливать sdk уведомление после разрыва соединения
  - Reference: incoming-obligations-and-sdk-recovery / SDK / implementation
  - Файлы: src/contracts/plugin-communication.mjs, src/control/plugin/communication.mjs, src/control/plugin/workflow-channel.mjs, src/control/plugin/assignment-dialogue.mjs, src/execution/plugin/communication-store.mjs, src/frontend/plugin/launch.mjs, src/frontend/plugin/panel.mjs, src/contracts/dialogue-view.mjs, src/backend/desktop-model.mjs, tools/codex-app-server-mcp/plugin.py, tests/workflow-channel.test.mjs, tests/plugin-communication.test.mjs, tests/plugin-communication-store.test.mjs, tests/chatgpt-plugin.test.mjs, tests/dialogue-delivery.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: INPUTS
- [TODO] CLOSED: Освобождать карточку после закрытия плана — Ожидает
  - Git Commit: [PENDING] fix: освобождать карточку после закрытия плана
  - Reference: incoming-obligations-and-sdk-recovery / CLOSED / implementation
  - Файлы: src/frontend/desktop/ui/sidebar.mjs, src/frontend/desktop/ui/index.html, src/backend/desktop-model.mjs, tests/sidebar.test.mjs, tests/workflow-plan.test.mjs, tests/backend-desktop-model.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: SDK
- [TODO] VERIFY: Проверить совместный сценарий и версии — Ожидает
  - Git Commit: [PENDING] fix: проверить совместный сценарий и версии
  - Reference: incoming-obligations-and-sdk-recovery / VERIFY / implementation
  - Файлы: package.json, package-lock.json, src/contracts/backend.mjs, tests/automatic-agent-dialogue.test.mjs, tests/fixtures/automatic-agent-dialogue.mjs, tests/workflow-kit-upgrade.test.mjs, tests/panel-resource-upgrade.test.mjs, tests/chatgpt-plugin.test.mjs, tests/fixtures/released-kit/kit-1.10.4.tar.gz, tests/fixtures/released-kit/manifest.json, tests/fixtures/released-kit/README.md
  - Параллельность: исключительное выполнение
  - Зависимости: CLOSED
- [TODO] DOCS: Актуализация всех документов проекта — Ожидает
  - Git Commit: [PENDING] docs: актуализация документов согласованного объёма
  - Reference: incoming-obligations-and-sdk-recovery / DOCS / implementation
  - Файлы: docs/planning/incoming-obligations-and-sdk-recovery.md, README.md, docs/architecture/OVERVIEW.md, docs/modules/sdk-messaging.md, docs/modules/user-choice.md, docs/modules/current-actions.md, docs/modules/desktop.md, docs/modules/project-lifecycle.md, docs/modules/chatgpt-plugin.md, docs/modules/release.md, packages/workflow-kit/docs/modules/workflow-kit-package.md, packages/workflow-kit/docs/modules/orchestrated-plans.md, docs/acceptance/sdk-messaging.md, docs/modules/project-compatibility.md, tests/fixtures/released-kit/README.md
  - Параллельность: исключительное выполнение
  - Зависимости: INPUTS, SDK, CLOSED, VERIFY
- [TODO] RELEASE: Собрать macOS Windows Linux — Ожидает
  - Git Commit: [PENDING] delivery: собрать macos windows linux
  - Reference: incoming-obligations-and-sdk-recovery / RELEASE / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: DOCS
- [TODO] INSTALL: Установить выпуск на этот Mac — Ожидает
  - Git Commit: [PENDING] delivery: установить выпуск на этот mac
  - Reference: incoming-obligations-and-sdk-recovery / INSTALL / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: RELEASE, DOCS
- [TODO] PUBLISH: Опубликовать выпуск на GitHub — Ожидает
  - Git Commit: [PENDING] delivery: опубликовать выпуск на github
  - Reference: incoming-obligations-and-sdk-recovery / PUBLISH / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: INSTALL, DOCS

## Context Pack For This Cycle

- docs/planning/incoming-obligations-and-sdk-recovery.md
- docs/architecture/OVERVIEW.md

Служебные состояния меняются только командами workflow. Приёмка не архивирует scope.
