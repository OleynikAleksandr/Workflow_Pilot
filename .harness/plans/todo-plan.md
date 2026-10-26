# Активный план — Workflow_Pilot

<!-- workflow-state:begin -->
```json
{
  "schema_version": 1,
  "plan_revision": 1158,
  "project_id": "7411e192-943c-4529-bffb-3b081d9c242f",
  "project_name": "Workflow_Pilot",
  "scope_id": "session-choice-and-delivery",
  "execution_scope_status": "ACTIVE",
  "delivery_status": "IN_PROGRESS",
  "objective": "Устранить повторную блокировку результатов после сохранённого выбора и давать сессии содержательное имя до создания плана.",
  "acceptance_criteria": [
    "EXEC003: нажатие и сохранение завершают выбор; его read освобождает очередь UI-события без ожидания ответа/таймера. Готовность следующего Send проверяется отдельно по существующим адресным событиям и барьерам.",
    "T001/T002 автоматически доходят до O read/acceptance/merge после длительного допланового выбора/Review, без ручного восстановления; совместимое старое gate не удерживает очередь.",
    "NAME001: явное содержательное имя текущей сессии появляется до плана и при обсуждении без плана, ручное имя и точная identity сохранены.",
    "Полный событийный сценарий и обе части Kit назначены; live/native pending не объявляется пройденным. Реализация/delivery не начаты публикацией плана."
  ],
  "approved_scope": {
    "functional_paths": [
      "src/control/workflow/user-choices.mjs",
      "src/control/plugin/workflow-channel.mjs",
      "src/control/plugin/communication.mjs",
      "src/control/workflow/dialogue-delivery.mjs",
      "src/control/workflow/coordination.mjs",
      "src/contracts/user-choice.mjs",
      "src/contracts/dialogue-view.mjs",
      "src/contracts/work-progress.mjs",
      "src/backend/desktop-model.mjs",
      "src/frontend/desktop/ui/current-actions.mjs",
      "tests/user-choices.test.mjs",
      "tests/user-choice-view.test.mjs",
      "tests/workflow-channel.test.mjs",
      "tests/dialogue-delivery.test.mjs",
      "tests/work-progress.test.mjs",
      "tests/backend-desktop-model.test.mjs",
      "tests/electron-smoke.mjs",
      "src/frontend/plugin/launch.mjs",
      "src/frontend/plugin/panel.mjs",
      "tests/chatgpt-plugin.test.mjs",
      "tools/codex-app-server-mcp/plugin.py",
      "src/execution/plugin/bridge.mjs",
      "src/control/plugin/service.mjs",
      "src/control/projects/service.mjs",
      "src/control/sessions/workspace-session.mjs",
      "src/control/plugin/startup-context.mjs",
      "packages/workflow-kit/src/lib/role-protocol.mjs",
      "packages/workflow-kit/src/templates/PLAN.md",
      "src/contracts/backend.mjs",
      "package-lock.json",
      "packages/workflow-kit/package.json",
      "packages/workflow-kit/src/lib/common.mjs",
      "tests/workspace-session.test.mjs",
      "tests/chatgpt-title.test.mjs",
      "tests/plugin-enrollment.test.mjs",
      "tests/codex-app-server-mcp.test.mjs",
      "tests/migration-compatibility.test.mjs",
      "src/control/context/context-session.mjs",
      "src/execution/facade.mjs",
      "packages/workflow-kit/src/lib/installer.mjs",
      "tests/automatic-agent-dialogue.test.mjs",
      "tests/fixtures/automatic-agent-dialogue.mjs",
      "tests/backend-api.test.mjs"
    ],
    "documentation_paths": [
      "docs/planning/session-choice-and-delivery.md",
      "README.md",
      "docs/architecture/OVERVIEW.md",
      "docs/modules/user-choice.md",
      "docs/modules/current-actions.md",
      "docs/modules/desktop.md",
      "docs/modules/chatgpt-plugin.md",
      "docs/modules/dialogue-timing.md",
      "docs/modules/assignment-dialogue-reliability.md",
      "docs/modules/orchestrator-startup.md",
      "docs/modules/project-compatibility.md",
      "packages/workflow-kit/README.md",
      "docs/acceptance/session-choice-and-delivery.md",
      "docs/planning/session-choice-release.md",
      "docs/modules/release.md"
    ]
  },
  "baseline_commit": "c79a5af4275efc169dab33547ce48853abc1a4c9",
  "current_task_id": null,
  "context_pack": {
    "documents": [
      {
        "path": "docs/planning/session-choice-and-delivery.md",
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
        "scope_id": "session-choice-and-delivery",
        "task_id": "CHOICE",
        "role": "implementation"
      },
      "dependencies": [],
      "functional_paths": [
        "src/control/workflow/user-choices.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "src/control/workflow/coordination.mjs",
        "src/contracts/user-choice.mjs",
        "src/contracts/dialogue-view.mjs",
        "src/contracts/work-progress.mjs",
        "src/backend/desktop-model.mjs",
        "src/frontend/desktop/ui/current-actions.mjs",
        "tests/user-choices.test.mjs",
        "tests/user-choice-view.test.mjs",
        "tests/workflow-channel.test.mjs",
        "tests/dialogue-delivery.test.mjs",
        "tests/work-progress.test.mjs",
        "tests/backend-desktop-model.test.mjs",
        "tests/electron-smoke.mjs",
        "src/frontend/plugin/launch.mjs",
        "src/frontend/plugin/panel.mjs",
        "tests/chatgpt-plugin.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "electron-smoke",
        "chatgpt-plugin",
        "architecture"
      ],
      "id": "CHOICE",
      "title": "Завершать выбор нажатием и освобождать очередь результатов",
      "why": "EXEC003 и ошибочный статус: убрать связь сохранённого решения с концом следующего ответа.",
      "acceptance_criteria": [
        "Все три варианта режима терминальны как решение после долговечной записи нажатия; CAS, ошибка записи/эффекта, один эффект и отдельные SDK/read квитанции сохранены. Ни user bubble, ни yield, ни конец ответа для выбора не требуются.",
        "После read user-choice/review-preference с legacy scope=null И текущим scope не удерживает first/choicePending/incoming/reserved/gate/settled/channelSettled и complete. Нет 120 probes/500ms idle для UI; reply_observed не подделан, unread/UNKNOWN и настоящие assignment/Kit transport gates сохранены.",
        "Адресные page/controller/command/queue/SDK события продолжают очередь после свежего допуска; busy, команды, пауза/Continue, ручной Stop, draft, identity/document и UNKNOWN сохраняются. Нет постоянного опроса и нового транспорта.",
        "Старое accepted/read состояние восстанавливается штатно без ручного WAL/повторного Send. После сохранения нет ожидания выбора; история одна, pending не объявляется прочитанным, настоящие причины ожидания видны.",
        "Реальные MCP-кнопки и runtime/command-watcher fixtures проверяют варианты, длительный ответ, единственное позднее событие, свободный чат без нового события, restart, соседний проект и отказы."
      ],
      "expected_commit_message": "fix: завершать выбор нажатием и освобождать очередь результатов",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/session-choice-and-delivery.md",
            "required": true
          },
          {
            "path": "docs/architecture/OVERVIEW.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "task_brief": "Подготовка 26.10.2026: реализация допускается только после отдельного поручения пользователя. Работать через Kit без делегирования, моделей, UI control, рабочего профиля и Test_003; donor заморожен. По разделу EXEC003 спецификации исправить весь путь кнопка → сохранённое решение → отдельная доставка → read → очередь. Не ограничиваться ремонтом таймера: UI-решение завершается записью, его сообщение освобождает очередь по read, а canSend/commands проверяются отдельно перед SDK. Аудит first/choicePending/reserved/progress/claim и восстановление старого gate обязательны. Проверки user-choice, workflow-channel, dialogue-delivery и настоящий renderer/адаптер. Обычный O/E read/yield/acceptance не менять. Обязателен аудит incoming, DialogueDelivery.settled/coordination.channelSettled и frontend user_choice_pending; scope-bound прочитанное UI-событие не мешает finalization/cleanup/complete, unread/UNKNOWN мешает по контракту."
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "session-choice-and-delivery",
        "task_id": "NAME",
        "role": "implementation"
      },
      "dependencies": [
        "CHOICE"
      ],
      "functional_paths": [
        "tools/codex-app-server-mcp/plugin.py",
        "src/execution/plugin/bridge.mjs",
        "src/control/plugin/service.mjs",
        "src/control/projects/service.mjs",
        "src/control/sessions/workspace-session.mjs",
        "src/backend/desktop-model.mjs",
        "src/control/plugin/startup-context.mjs",
        "packages/workflow-kit/src/lib/role-protocol.mjs",
        "packages/workflow-kit/src/templates/PLAN.md",
        "src/contracts/backend.mjs",
        "package-lock.json",
        "packages/workflow-kit/package.json",
        "packages/workflow-kit/src/lib/common.mjs",
        "tests/workspace-session.test.mjs",
        "tests/chatgpt-title.test.mjs",
        "tests/plugin-enrollment.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/electron-smoke.mjs",
        "tests/migration-compatibility.test.mjs",
        "src/control/context/context-session.mjs",
        "src/execution/facade.mjs",
        "packages/workflow-kit/src/lib/installer.mjs"
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
      "id": "NAME",
      "title": "Давать сессии содержательное имя до создания плана",
      "why": "NAME001: явное название темы в текущем ходе, включая обсуждение без плана.",
      "acceptance_criteria": [
        "workflow_session_set_title(title) через прежний Python MCP/bridge меняет только свою живую обычную Chat-сессию по host identity; произвольные ID/пути не принимаются, executor и чужая/удалённая привязка отклонены.",
        "Источник topic, нормализатор 80 символов/200 UTF-8 байт, manual>scope>topic>page, первая запись и повтор идемпотентны; поздний page/другой topic не портит имя. Имя меняется до плана и без его создания.",
        "Карточка точной сессии обновлена через backend/SSE независимо от выбора sidebar; restart и async-смена/удаление не подменяют адресата. Существующий ChatGPT-title sync переиспользован с отдельным подтверждением удалённого результата.",
        "Отдельный sessionTitle action старого bridge через backend/PluginProjects с host modelInput/participantTarget; startup context-session, canonical role/PLAN/recovery/MCP согласованы. Kit 1.10.2/role 11 и upgrade с 1.10.1; app/COMMUNICATION_APP_VERSION/BUILD остаются 0.5.35 до release. Нет повторного bootstrap, новых хода/ID/Enable.",
        "Настоящий Python MCP/bridge и renderer подтверждают early/no-plan, ручное/плановое имя, UTF-8, повторы/потерянный ответ, отказ записи, чужую identity, отсутствие capability старой сессии и late events.",
        "Новая версия читает старые данные; новый topic делает data downgrade в 0.5.35 несовместимым, что воспроизведено fixture без записи в профиль и описано как ограничение, не как проверенный rollback. Пользовательские данные сейчас не меняются."
      ],
      "expected_commit_message": "fix: давать сессии содержательное имя до создания плана",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/session-choice-and-delivery.md",
            "required": true
          },
          {
            "path": "docs/architecture/OVERVIEW.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "task_brief": "Подготовка 26.10.2026: реализация допускается только после отдельного поручения пользователя. Работать через Kit без делегирования, моделей, UI control, рабочего профиля и Test_003; donor заморожен. По NAME001 добавить один узкий MCP-вызов через существующий мост. Идентичность только свежая host metadata/registration/participantTarget. Переиспользовать ProjectsService/WorkspaceStore и title sync; topic отдельный от manual. Инструкция агенту именовать тему в первом содержательном ходе до mode-request/Review/плана; без извлечения произвольного текста DOM и без нового хода. Проверить реальные schema/discovery/startup инструкции, чтение старых записей и exact-session SSE. Перед проверками Kit с production-пакетом безопасно проверить Python caches; Python -B. Маршрут — отдельный sessionTitle callback bridge → backend → PluginProjects, не communication.*. Исходники Kit 1.10.2/role 11 с upgrade, приложение/BUILD 0.5.35. Topic несовместим со старым validator: тест и честное ограничение обратного data rollback, без пользовательского профиля."
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "session-choice-and-delivery",
        "task_id": "PROOF",
        "role": "implementation"
      },
      "dependencies": [
        "CHOICE",
        "NAME"
      ],
      "functional_paths": [
        "tests/automatic-agent-dialogue.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/workflow-channel.test.mjs",
        "tests/dialogue-delivery.test.mjs",
        "tests/user-choices.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/electron-smoke.mjs",
        "tests/backend-api.test.mjs"
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
      "title": "Проверить длительный цикл двух исполнителей после выбора",
      "why": "Устранение EXEC003 подтверждается продолжением до интеграций, а NAME001 — до плана.",
      "acceptance_criteria": [
        "Связный API/MCP/SDK/Kit/Git/Electron fixture: OFF→ON/read→раннее имя→кнопка orchestrated→долгая подготовка/2 Review→публикация→один Start→2E→2 result→O read/acceptance exact SHA→merge→T003→DOCS→cleanup/complete.",
        "Длительность превышает прежние 120 проверок по управляемым часам; нет реального многоминутного sleep. Позднее единственное событие и command completion без DOM продолжают очередь через реальный адаптер без ручного observed/правки receipts, повторного выбора или второго Start.",
        "Все три варианта режима, без/с user bubble, legacy gate, pending/unread, UNKNOWN, manual Stop/draft/commands, restart/Continue, скрытая панель, потеря/возврат SDK, late callback и соседний проект сохраняют один эффект.",
        "Обе части Kit и остальные назначенные checks пройдены. Живые ChatGPT/macOS/native Windows/Linux/iPad явно NOT_RUN; fixture не объявляется live proof. Найденный новый продуктовый дефект — отдельная задача до DOCS.",
        "Прочитанные user-choice/review-preference с scope текущего плана не блокируют settled/channelSettled и complete при reply_observed=false; unread/UNKNOWN и незакрытая acceptance transport-квитанция не теряют барьеров."
      ],
      "expected_commit_message": "fix: проверить длительный цикл двух исполнителей после выбора",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/session-choice-and-delivery.md",
            "required": true
          },
          {
            "path": "docs/architecture/OVERVIEW.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "task_brief": "Подготовка 26.10.2026: реализация допускается только после отдельного поручения пользователя. Работать через Kit без делегирования, моделей, UI control, рабочего профиля и Test_003; donor заморожен. Провести полный контрольный цикл и fault injection из спецификации на изолированных fixtures. Не заменять событийную проверку прямым вызовом обработчика; не читать пользовательский WAL в обязательном тесте. Подтвердить result/read/acceptance/merge/зависимую задачу/cleanup раздельно. Не расширять исходники продукта внутри тестовой задачи. Перед Kit production-check проверить caches по AGENTS; обе части Kit обязательны."
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "session-choice-and-delivery",
        "task_id": "DOCS",
        "role": "implementation"
      },
      "dependencies": [
        "CHOICE",
        "NAME",
        "PROOF"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/planning/session-choice-and-delivery.md",
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/user-choice.md",
        "docs/modules/current-actions.md",
        "docs/modules/desktop.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/dialogue-timing.md",
        "docs/modules/assignment-dialogue-reliability.md",
        "docs/modules/orchestrator-startup.md",
        "docs/modules/project-compatibility.md",
        "packages/workflow-kit/README.md",
        "docs/acceptance/session-choice-and-delivery.md",
        "docs/planning/session-choice-release.md",
        "docs/modules/release.md"
      ],
      "verification_ids": [],
      "id": "DOCS",
      "title": "Актуализация всех документов проекта",
      "why": "Зафиксировать реализованное, сохранить невыпущенные требования и live pending.",
      "acceptance_criteria": [
        "Перед выпуском 0.5.36 сверены README/OVERVIEW/действующие контракты реализованных исправлений; новые инструкции и версии согласованы.",
        "Реализованное из двух временных спецификаций перенесено в модули, спецификации удалены без архивных копий с exact Git blob для required-ссылок. Отложенные требования и живые NOT_RUN сохранены; data downgrade после topic честно описан.",
        "Каждый документ ≤28000 UTF-8 байт, playbook для новой версии отдельно от старой приёмки. DOCS перед RELEASE; checks:[] не выдаётся за тесты приложения."
      ],
      "expected_commit_message": "docs: актуализировать контракты выбора, названий и приёмки",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/session-choice-and-delivery.md",
            "required": true
          },
          {
            "path": "docs/architecture/OVERVIEW.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "task_brief": "Пользователь разрешил реализацию и выпуск 0.5.36: сверить CHOICE/NAME/PROOF/VERSION, обновить действующие контракты, перенести реализованное и удалить временные specs с exact Git blob в required-контексте. Сохранить отложенное и живые NOT_RUN. Данные/службу/профиль не менять. Откат bundle не объявлять data rollback после topic. DOCS предшествует production, каждый документ ≤28000 байт UTF-8."
    }
  ],
  "blocked_reason": null,
  "user_decisions": [
    {
      "id": "planning-only-20261026",
      "text": "Закрыть прежний план и подготовить новый по NAME001/EXEC003; реализацию и delivery сейчас не начинать."
    },
    {
      "id": "choice-click",
      "text": "Сохранённое нажатие завершает выбор. Не ждать конца следующего ответа и не заменять 120 большим числом или постоянным опросом."
    },
    {
      "id": "d79cc0c1-f693-42a2-bcfb-feef66ccce29",
      "text": "26.10.2026 пользователь поручил закрыть текущий завершённый план, подготовить и опубликовать новую спецификацию и to-do по замечаниям 0.5.35. Это согласование объёма, не поручение реализации или delivery.",
      "recorded_at": "2026-10-26T07:03:18.703Z"
    },
    {
      "id": "execute-release-0536",
      "text": "26.10.2026 пользователь поручил весь план без пауз до нового релиза GitHub; включены macOS/Windows/Linux, штатная установка на Mac без остановки службы. Разработка последовательная без делегирования.",
      "recorded_at": "2026-10-26T07:08:49.236135+00:00"
    }
  ],
  "scope_title": "Выбор пользователя, раннее имя и продолжение оркестрации",
  "parallel_allowed": false,
  "max_workers": 1,
  "execution_strategy": "sequential",
  "execution_reason": "Внешняя Codex-сессия планирует последовательную разработку без разрешения на модельное делегирование; очередь, наблюдения и общий MCP/проекция пересекаются. Независимые агенты не нужны."
}
```
<!-- workflow-state:end -->

## Состояние

Execution Scope Status: ACTIVE
Delivery Status: IN_PROGRESS
Scope: session-choice-and-delivery
Current Task: нет
Revision: 1158

## Цель

Устранить повторную блокировку результатов после сохранённого выбора и давать сессии содержательное имя до создания плана.

## Критерии приёмки

- EXEC003: нажатие и сохранение завершают выбор; его read освобождает очередь UI-события без ожидания ответа/таймера. Готовность следующего Send проверяется отдельно по существующим адресным событиям и барьерам.
- T001/T002 автоматически доходят до O read/acceptance/merge после длительного допланового выбора/Review, без ручного восстановления; совместимое старое gate не удерживает очередь.
- NAME001: явное содержательное имя текущей сессии появляется до плана и при обсуждении без плана, ручное имя и точная identity сохранены.
- Полный событийный сценарий и обе части Kit назначены; live/native pending не объявляется пройденным. Реализация/delivery не начаты публикацией плана.

## Микрозадачи

Выполнение: sequential; разрешено: false; лимит: 1
Причина: Внешняя Codex-сессия планирует последовательную разработку без разрешения на модельное делегирование; очередь, наблюдения и общий MCP/проекция пересекаются. Независимые агенты не нужны.

- [TODO] CHOICE: Завершать выбор нажатием и освобождать очередь результатов — Ожидает
  - Git Commit: [PENDING] fix: завершать выбор нажатием и освобождать очередь результатов
  - Reference: session-choice-and-delivery / CHOICE / implementation
  - Файлы: src/control/workflow/user-choices.mjs, src/control/plugin/workflow-channel.mjs, src/control/plugin/communication.mjs, src/control/workflow/dialogue-delivery.mjs, src/control/workflow/coordination.mjs, src/contracts/user-choice.mjs, src/contracts/dialogue-view.mjs, src/contracts/work-progress.mjs, src/backend/desktop-model.mjs, src/frontend/desktop/ui/current-actions.mjs, tests/user-choices.test.mjs, tests/user-choice-view.test.mjs, tests/workflow-channel.test.mjs, tests/dialogue-delivery.test.mjs, tests/work-progress.test.mjs, tests/backend-desktop-model.test.mjs, tests/electron-smoke.mjs, src/frontend/plugin/launch.mjs, src/frontend/plugin/panel.mjs, tests/chatgpt-plugin.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [TODO] NAME: Давать сессии содержательное имя до создания плана — Ожидает
  - Git Commit: [PENDING] fix: давать сессии содержательное имя до создания плана
  - Reference: session-choice-and-delivery / NAME / implementation
  - Файлы: tools/codex-app-server-mcp/plugin.py, src/execution/plugin/bridge.mjs, src/control/plugin/service.mjs, src/control/projects/service.mjs, src/control/sessions/workspace-session.mjs, src/backend/desktop-model.mjs, src/control/plugin/startup-context.mjs, packages/workflow-kit/src/lib/role-protocol.mjs, packages/workflow-kit/src/templates/PLAN.md, src/contracts/backend.mjs, package-lock.json, packages/workflow-kit/package.json, packages/workflow-kit/src/lib/common.mjs, tests/workspace-session.test.mjs, tests/chatgpt-title.test.mjs, tests/plugin-enrollment.test.mjs, tests/chatgpt-plugin.test.mjs, tests/codex-app-server-mcp.test.mjs, tests/electron-smoke.mjs, tests/migration-compatibility.test.mjs, src/control/context/context-session.mjs, src/execution/facade.mjs, packages/workflow-kit/src/lib/installer.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: CHOICE
- [TODO] PROOF: Проверить длительный цикл двух исполнителей после выбора — Ожидает
  - Git Commit: [PENDING] fix: проверить длительный цикл двух исполнителей после выбора
  - Reference: session-choice-and-delivery / PROOF / implementation
  - Файлы: tests/automatic-agent-dialogue.test.mjs, tests/fixtures/automatic-agent-dialogue.mjs, tests/workflow-channel.test.mjs, tests/dialogue-delivery.test.mjs, tests/user-choices.test.mjs, tests/chatgpt-plugin.test.mjs, tests/electron-smoke.mjs, tests/backend-api.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: CHOICE, NAME
- [TODO] DOCS: Актуализация всех документов проекта — Ожидает
  - Git Commit: [PENDING] docs: актуализировать контракты выбора, названий и приёмки
  - Reference: session-choice-and-delivery / DOCS / implementation
  - Файлы: docs/planning/session-choice-and-delivery.md, README.md, docs/architecture/OVERVIEW.md, docs/modules/user-choice.md, docs/modules/current-actions.md, docs/modules/desktop.md, docs/modules/chatgpt-plugin.md, docs/modules/dialogue-timing.md, docs/modules/assignment-dialogue-reliability.md, docs/modules/orchestrator-startup.md, docs/modules/project-compatibility.md, packages/workflow-kit/README.md, docs/acceptance/session-choice-and-delivery.md, docs/planning/session-choice-release.md, docs/modules/release.md
  - Параллельность: исключительное выполнение
  - Зависимости: CHOICE, NAME, PROOF

## Context Pack For This Cycle

- docs/planning/session-choice-and-delivery.md
- docs/architecture/OVERVIEW.md

Служебные состояния меняются только командами workflow. Приёмка не архивирует scope.
