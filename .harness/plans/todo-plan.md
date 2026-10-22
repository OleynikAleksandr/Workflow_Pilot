# Активный план — Workflow_Pilot

<!-- workflow-state:begin -->
```json
{
  "schema_version": 1,
  "plan_revision": 852,
  "project_id": "7411e192-943c-4529-bffb-3b081d9c242f",
  "project_name": "Workflow_Pilot",
  "scope_id": "recovery-status-interruptions",
  "execution_scope_status": "ACTIVE",
  "delivery_status": "IN_PROGRESS",
  "objective": "Два раздела: I — устранить дефекты startup S и отображения результатов живого теста; II — подготовить изолированные регрессии и безопасный сценарий прерываний O/E без выполнения живых сбоев.",
  "acceptance_criteria": [
    "Раздел I: штатный Claude Review не прерывается на 30/100 ходах, 15 минутах и четырёх раундах; настоящие ошибки и ручное прекращение остаются диагностируемыми без повторных эффектов.",
    "Раздел I: полностью прочитанный пакет S rev5 подтверждается при изменении соседнего плана до rev6; stale до первой выдачи, чужой адресат, отмена, неверные SHA/части и старый UNKNOWN по-прежнему отклоняются; повтор Send запрещён.",
    "Раздел I: UI не висит в pending после подтверждения, показывает объяснимые терминальные ошибки, отдельно результаты E и Kit-интеграции, реальные этапы доставки и фактические проверки DOCS.",
    "Раздел II: автоматические изолированные регрессии O1/O2/E1 и блокировки/сетевого UNKNOWN показывают продолжение без дублей и потери результатов; живое отключение сети, Stop и restart выполняет только пользователь позднее.",
    "Раздел II: пошаговый документ для живых испытаний с точками прерывания, предварительными условиями, доказательствами, правилами безопасности и таблицей PASS/FAIL/NOT_RUN готов.",
    "Вся реализация и проверки завершаются штатными задачами Kit, документация сверена, main чистый; выпуск и установка не выполняются без отдельного поручения, завершённый план остаётся READY_FOR_ACCEPTANCE."
  ],
  "approved_scope": {
    "functional_paths": [
      "packages/workflow-kit/src/cli.mjs",
      "packages/workflow-kit/src/lib/claude-review.mjs",
      "packages/workflow-kit/src/lib/plan-review.mjs",
      "packages/workflow-kit/src/lib/review-state.mjs",
      "packages/workflow-kit/src/lib/command-help.mjs",
      "packages/workflow-kit/src/lib/common.mjs",
      "packages/workflow-kit/src/lib/installer.mjs",
      "packages/workflow-kit/package.json",
      "package-lock.json",
      "packages/workflow-kit/scripts/check-plan-review-fixture.mjs",
      "tests/workflow-kit-upgrade.test.mjs",
      "tests/fixtures/released-kit/manifest.json",
      "tests/fixtures/released-kit/kit-1.9.3.tar.gz",
      "src/control/workflow/plan-review.mjs",
      "tests/plan-review.test.mjs",
      "src/control/plugin/startup-context.mjs",
      "src/control/workflow/dialogue-delivery.mjs",
      "src/control/context/context-session.mjs",
      "src/contracts/startup-view.mjs",
      "src/frontend/desktop/ui/sidebar.mjs",
      "src/frontend/desktop/ui/progress.mjs",
      "src/control/plugin/service.mjs",
      "src/control/plugin/workflow-channel.mjs",
      "src/control/plugin/assignment-dialogue.mjs",
      "src/frontend/plugin/panel.mjs",
      "src/backend/desktop-model.mjs",
      "src/control/workflow/coordination.mjs",
      "tests/startup-context.test.mjs",
      "tests/plugin-communication-store.test.mjs",
      "tests/dialogue-delivery.test.mjs",
      "tests/sidebar.test.mjs",
      "tests/context-session.test.mjs",
      "tests/panel-dialogue-view.test.mjs",
      "tests/backend-desktop-model.test.mjs",
      "tests/progress.test.mjs",
      "tests/parallel-execution-ui.test.mjs",
      "tests/workspace-session.test.mjs",
      "src/control/sessions/workspace-session.mjs",
      "tests/plugin-communication.test.mjs",
      "tests/automatic-agent-dialogue.test.mjs",
      "tests/fixtures/automatic-agent-dialogue.mjs",
      "tests/parallel-execution.test.mjs",
      "tests/settings-parallel-execution.test.mjs",
      "tests/session-opening-performance.test.mjs",
      "tests/fixtures/executor-background-startup.mjs",
      "tests/executor-background-startup.test.mjs"
    ],
    "documentation_paths": [
      "docs/planning/recovery-and-interruption-2026-10.md",
      "docs/planning/recovery-and-interruption-todo-draft.md",
      "packages/workflow-kit/README.md",
      "docs/acceptance/interruption-recovery.md",
      "README.md",
      "docs/architecture/OVERVIEW.md",
      "docs/modules/orchestrator-startup.md",
      "docs/modules/assignment-dialogue.md",
      "docs/modules/orchestrated-execution.md",
      "tests/fixtures/released-kit/README.md"
    ]
  },
  "baseline_commit": "d5e5f608133c75aba527e3aae15836765169ac41",
  "current_task_id": null,
  "context_pack": {
    "documents": [
      {
        "path": "docs/planning/recovery-and-interruption-2026-10.md",
        "required": true,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/planning/recovery-and-interruption-todo-draft.md",
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
        "scope_id": "recovery-status-interruptions",
        "task_id": "FIX-REVIEW",
        "role": "implementation"
      },
      "dependencies": [],
      "functional_paths": [
        "packages/workflow-kit/src/cli.mjs",
        "packages/workflow-kit/src/lib/claude-review.mjs",
        "packages/workflow-kit/src/lib/plan-review.mjs",
        "packages/workflow-kit/src/lib/review-state.mjs",
        "packages/workflow-kit/src/lib/command-help.mjs",
        "packages/workflow-kit/src/lib/common.mjs",
        "packages/workflow-kit/src/lib/installer.mjs",
        "packages/workflow-kit/package.json",
        "package-lock.json",
        "packages/workflow-kit/scripts/check-plan-review-fixture.mjs",
        "tests/workflow-kit-upgrade.test.mjs",
        "tests/fixtures/released-kit/manifest.json",
        "tests/fixtures/released-kit/kit-1.9.3.tar.gz",
        "src/control/workflow/plan-review.mjs",
        "tests/plan-review.test.mjs"
      ],
      "documentation_paths": [
        "packages/workflow-kit/README.md",
        "tests/fixtures/released-kit/README.md"
      ],
      "verification_ids": [
        "kit-check",
        "kit-assignments",
        "kit-upgrade",
        "plan-review-ui"
      ],
      "id": "FIX-REVIEW",
      "title": "I · Убрать пределы ходов и времени Claude Review",
      "why": "30 ходов прервали рецензию до вердикта, 100 ранее тоже не хватало; постоянный потолок 15 минут и четыре раунда являются аналогичными ограничениями.",
      "acceptance_criteria": [
        "В штатном Claude Review нет аргумента --max-turns, жёсткого таймера в 15 минут и ограничителя 4 раундов. Запуск не заканчивается только потому, что прошло более 100 ходов или 15 минут.",
        "Настоящие ошибки CLI, неверный JSON, ручное завершение, недоступность процесса и перезапуск не дают ложного approved и не теряют авторскую позицию/историю, не запускают второй процесс.",
        "Новая версия Kit и lockfile согласованы, installer поддерживает upgradeFrom 1.9.3, тестируется неизменяемый базис v0.5.23; до отдельного решения пользователя установленный .harness/kit остаётся старым.",
        "Неизменяемый kit-1.9.3.tar.gz собран из исходников точного sourceCommit выпуска 0.5.23 7279f9277cd03aa87c1bfad7a3ef00b9fb7ea97a, manifest хранит commit и SHA-256, тест upgrade извлекает 1.9.3 без несуществующего тега.",
        "В клиенте Review нет текста «Раунд N из 4». Прежние тесты REVIEW_TIMEOUT/REVIEW_ROUND_LIMIT заменены тестами реального CLI failure, restart/retry и старого max_rounds.",
        "Обновлены help и README Kit; изолированные фикстуры и обе проверки kit-check / kit-assignments проходят; .harness/kit меняет штатный installer."
      ],
      "expected_commit_message": "fix: убрать искусственные пределы Claude Review",
      "task_brief": "Первая задача раздела I. По секции I.0 спецификации и ToDo FIX-REVIEW убери обязательный max-turns, 15-минутный таймер, предел раундов. Не заменяй новым порогом. Повышение версии Kit с 1.9.3, common.mjs, package.json, lockfile, installer upgradeFrom.add('1.9.3'), UI без «Раунд N из 4». Создай закреплённый kit-1.9.3.tar.gz из точного Git commit выпуска 0.5.23 7279f9277cd03aa87c1bfad7a3ef00b9fb7ea97a, запиши SHA-256 и commit в manifest и добавь 1.9.3 в extract-list upgrade fixture. Замени старые REVIEW_TIMEOUT/REVIEW_ROUND_LIMIT тестами CLI failure, ESRCH, restart/retry same session, старого max_rounds и JSON. Не устанавливай Kit в этот checkout без отдельного решения пользователя. Запусти kit-check, kit-assignments, kit-upgrade, plan-review-ui, затем Kit commit.",
      "parallel_safe": false,
      "actual_files": [
        "package-lock.json",
        "packages/workflow-kit/README.md",
        "packages/workflow-kit/package.json",
        "packages/workflow-kit/scripts/check-plan-review-fixture.mjs",
        "packages/workflow-kit/src/cli.mjs",
        "packages/workflow-kit/src/lib/claude-review.mjs",
        "packages/workflow-kit/src/lib/command-help.mjs",
        "packages/workflow-kit/src/lib/common.mjs",
        "packages/workflow-kit/src/lib/installer.mjs",
        "packages/workflow-kit/src/lib/plan-review.mjs",
        "src/control/workflow/plan-review.mjs",
        "tests/fixtures/released-kit/README.md",
        "tests/fixtures/released-kit/kit-1.9.3.tar.gz",
        "tests/fixtures/released-kit/manifest.json",
        "tests/plan-review.test.mjs",
        "tests/workflow-kit-upgrade.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "recovery-status-interruptions",
        "task_id": "FIX-STARTUP",
        "role": "implementation"
      },
      "dependencies": [
        "FIX-REVIEW"
      ],
      "functional_paths": [
        "src/control/plugin/startup-context.mjs",
        "src/control/workflow/dialogue-delivery.mjs",
        "tests/startup-context.test.mjs",
        "tests/plugin-communication-store.test.mjs",
        "tests/dialogue-delivery.test.mjs",
        "tests/parallel-execution.test.mjs",
        "tests/settings-parallel-execution.test.mjs",
        "tests/session-opening-performance.test.mjs",
        "tests/fixtures/executor-background-startup.mjs",
        "tests/executor-background-startup.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "orchestrator-startup",
        "chatgpt-plugin",
        "unit-all"
      ],
      "id": "FIX-STARTUP",
      "title": "I · Startup S — подтвердить дочитанный снимок при изменении плана",
      "why": "Сессия S прочитала 3/3 частей, но соседняя интеграция сменила revision и startup_complete получила STALE_MESSAGE.",
      "acceptance_criteria": [
        "Изолированный файловый WAL: S получает part0 при rev5, другая задача меняет план до rev6, S читает оставшиеся части и startup_complete даёт complete=true; одно событие startup.complete и повтор idempotent.",
        "До первой выдачи stale отклоняется. После выдачи сохраняются запреты чужого binding, неверного SHA, неполных частей, superseded/удаления/отмены; S не получает grant; E/O и old SDK UNKNOWN защищены.",
        "Изменения минимальны, старое восстановление и изолированные регрессии MCP проходят. Не обращаться к реальным WAL или чатам."
      ],
      "expected_commit_message": "fix: подтверждать завершённое чтение startup S при изменении плана",
      "task_brief": "Раздел I. Исправь сохранённый startup model-pull S: после аутентифицированной первой выдачи допускай дочитывание и complete замороженного снимка независимо от ревизии соседнего плана. Не ослабляй проверку перед выдачей и защиту identity/request/digest/complete/read/superseded/remove, не меняй O/E, старый SDK и идемпотентность. Прочти полную спецификацию docs/planning/recovery-and-interruption-2026-10.md, секции 0/I.1, и реальные модули. Проверь on-disk WAL fixtures, stale до/после выдачи, отсутствие grant/повтора. Только перечисленные пути; task:start/Kit checked commit.",
      "parallel_safe": false,
      "actual_files": [
        "src/control/workflow/dialogue-delivery.mjs",
        "tests/dialogue-delivery.test.mjs",
        "tests/fixtures/executor-background-startup.mjs",
        "tests/parallel-execution.test.mjs",
        "tests/session-opening-performance.test.mjs",
        "tests/settings-parallel-execution.test.mjs",
        "tests/startup-context.test.mjs"
      ]
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "recovery-status-interruptions",
        "task_id": "FIX-STARTUP-UI",
        "role": "implementation"
      },
      "dependencies": [
        "FIX-STARTUP"
      ],
      "functional_paths": [
        "src/control/plugin/startup-context.mjs",
        "src/control/context/context-session.mjs",
        "src/contracts/startup-view.mjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/backend/desktop-model.mjs",
        "src/frontend/desktop/ui/progress.mjs",
        "src/control/plugin/service.mjs",
        "src/frontend/plugin/panel.mjs",
        "tests/startup-context.test.mjs",
        "tests/context-session.test.mjs",
        "tests/sidebar.test.mjs",
        "tests/panel-dialogue-view.test.mjs",
        "tests/backend-desktop-model.test.mjs",
        "tests/progress.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "orchestrator-startup",
        "startup-recovery",
        "chatgpt-plugin",
        "unit-all"
      ],
      "id": "FIX-STARTUP-UI",
      "title": "I · Startup UI — терминальные состояния и отсутствие вечного pending",
      "why": "Даже при полном чтении и при некоторых complete=true сохраняется поле delivery=pending, интерфейс отображает продолжающееся ожидание.",
      "acceptance_criteria": [
        "Для прочитанного и подтверждённого пакета UI показывает завершение даже при старом delivery=pending; completion не подменяется SDK accepted или DOM sent.",
        "При невозможном подтверждении показывается терминальная ошибка и безопасный путь создания свежего контекста, без бесконечного повторного чтения и неизвестного Send.",
        "Sidebar/панель/MCP проекции согласованы, O/E и legacy проходят адресные регрессии."
      ],
      "expected_commit_message": "fix: согласовать завершение startup и ошибки в UI",
      "task_brief": "Раздел I. После FIX-STARTUP устрани ложный pending для complete=true; reading X/N/complete/stale/error. Сверь desktop-model.mjs (принудительный startup-channel), progress.mjs и plugin/service.mjs (повторный startupOpen), desktop/sidebar/panel, не запускай повторный Send. Только указанные пути и отдельные fixtures, включая panel-dialogue-view, backend-desktop-model, progress. Запусти все checks, включая unit-all, затем commit Kit.",
      "parallel_safe": false
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "recovery-status-interruptions",
        "task_id": "FIX-PROGRESS",
        "role": "implementation"
      },
      "dependencies": [
        "FIX-STARTUP-UI"
      ],
      "functional_paths": [
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/frontend/plugin/panel.mjs",
        "src/backend/desktop-model.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/control/plugin/assignment-dialogue.mjs",
        "tests/sidebar.test.mjs",
        "tests/backend-desktop-model.test.mjs",
        "tests/parallel-execution-ui.test.mjs",
        "tests/workspace-session.test.mjs",
        "src/control/sessions/workspace-session.mjs",
        "tests/panel-dialogue-view.test.mjs",
        "tests/automatic-agent-dialogue.test.mjs",
        "tests/plugin-communication.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "startup-recovery",
        "prepared-flow-cycle",
        "chatgpt-plugin",
        "unit-all"
      ],
      "id": "FIX-PROGRESS",
      "title": "I · Прогресс — результаты исполнителей, интеграция, доставка и финал",
      "why": "В живом тесте 1/4 Kit при двух готовых E; pending назван доставкой, DOCS checks:[] смешиваются с приложением, ACTIVE неверно воспринимается как работа.",
      "acceptance_criteria": [
        "Отдельно отображаются основанные на receipt/checked commit результаты E и подтверждённые Kit интеграции main. Переход 2 получено/1 интегрировано → 2/2 → 4/4 корректно обновляется существующим backend/SSE.",
        "Указаны этапы prepared/authorized pending/SDK accepted/executor started без ложного «отправлено» до доставки. Исторические/неизвестные состояния не угадываются.",
        "DOCS checks:[] объясняется как отсутствие запуска application checks в Kit; READY_FOR_ACCEPTANCE с 4/4 выглядит как завершение с ожиданием приёмки, не как активная работа.",
        "Sequential/parallel/legacy не регрессируют; никаких новых scheduler/state-store."
      ],
      "expected_commit_message": "feat: показывать проверенные этапы прогресса и доставки",
      "task_brief": "Раздел I, секция I.3 спецификации. Kit DONE=интеграция, отдельный счётчик подтверждённых результатов E из checked receipts. Добавь в workflow-channel.mjs/assignment-dialogue.mjs правдивые стадии авторизации/ожидания/SDK/начала E, чтобы O не говорил «доставлено» при delivery:pending. Не меняй role-protocol без отдельной версии Kit. Контракт ожидаемой приёмки проверяй в backend-desktop-model, parallel-execution-ui, workspace-session tests; проекцию src/control/sessions/workspace-session.mjs меняй только при необходимости. DOCS checks:[] — отсутствие Kit application tests; READY_FOR_ACCEPTANCE=ожидание приёмки. Существующий SSE/UI, без model polling. Запусти все проверки, включая unit-all, затем Kit commit.",
      "parallel_safe": false
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "recovery-status-interruptions",
        "task_id": "TEST-REGRESSION",
        "role": "implementation"
      },
      "dependencies": [
        "FIX-STARTUP",
        "FIX-STARTUP-UI",
        "FIX-PROGRESS"
      ],
      "functional_paths": [
        "tests/automatic-agent-dialogue.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/plugin-communication-store.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all"
      ],
      "id": "TEST-REGRESSION",
      "title": "II · Автоматические фикстуры прерывания O/E",
      "why": "Успешная оркестрация не доказывает идемпотентность между acceptance и merge либо recovery после stop/сбоев.",
      "acceptance_criteria": [
        "Изолированная регрессия O1/O2: подтверждённый точный SHA до merge, имитированное прерывание/восстановление, ровно одна интеграция без дублирования acceptance/message; clean Kit ledger.",
        "Изолированная регрессия E1: checked commit до result, продолжение сохраняет SHA и не создаёт второй commit или назначение; E2 проверяет block_id и независимый DONE.",
        "NET/UNKNOWN проверен на уровне transport intent/receipt без настоящего отключения сети; повтор неизвестного Send запрещён, backend/fixtures не трогают рабочие профили."
      ],
      "expected_commit_message": "test: сценарии идемпотентного восстановления O и E",
      "task_brief": "Раздел II, секции II.1 и II.3 спецификации. Целевые tests в существующей fixture automatic-agent-dialogue и plugin WAL tests; O1/O2/E1/E2/UNKNOWN. Без production fault-injection API и реального network disable/kill. Проверить без дублей acceptance, integration, task, без изменений соседей. Если обнаружен реальный production-дефект, не ослаблять assertions: task:block, отдельное исправление через plan:extend; не править чужой продуктовый код в рамках этой задачи. Запусти unit-all и штатный Kit commit.",
      "parallel_safe": false
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "recovery-status-interruptions",
        "task_id": "TEST-PLAYBOOK",
        "role": "implementation"
      },
      "dependencies": [
        "TEST-REGRESSION"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/acceptance/interruption-recovery.md"
      ],
      "verification_ids": [],
      "id": "TEST-PLAYBOOK",
      "title": "II · Пошаговый протокол живых испытаний Stop, сеть, restart",
      "why": "Пользователь должен воспроизводимо проверять остановку O/E без риска для общих служб и отличать offline от Stop и backend restart.",
      "acceptance_criteria": [
        "Оформлена таблица O1/O2/E1/E2/NET/UI/RESTART: безопасные предусловия, точка прерывания, команды status/log/worktree, шаги Stop → Продолжай, ожидания и фиксация PASS/FAIL/NOT_RUN.",
        "Отдельная UTM/вторичная сеть вместо отключения сети у общего backend; backend restart только изолированного инстанса; запрет доступа к секретам и повторов UNKNOWN.",
        "Текст прямо различает выполненные автоматические тесты и ещё НЕ проведённые живые проверки."
      ],
      "expected_commit_message": "docs: сценарий живого испытания прерываний O и E",
      "task_brief": "Раздел II. Создай единственный docs/acceptance/interruption-recovery.md как практический протокол по матрице спецификации. Включи Stop/Продолжай для O/E, offline только второго клиента/UTM, отдельный тестовый backend для restart, проверку Kit/WAL/Git без секретов, критерии без дублей, FAIL/PASS/NOT_RUN. Живые операции не выполняй и не утверждай, что проверил их. Вписывай документацию в лимит 28000 байт, штатный docs commit/Kit.",
      "parallel_safe": false
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "recovery-status-interruptions",
        "task_id": "DOCS",
        "role": "implementation"
      },
      "dependencies": [
        "FIX-REVIEW",
        "FIX-STARTUP",
        "FIX-STARTUP-UI",
        "FIX-PROGRESS",
        "TEST-REGRESSION",
        "TEST-PLAYBOOK"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/orchestrator-startup.md",
        "docs/modules/assignment-dialogue.md",
        "docs/modules/orchestrated-execution.md",
        "packages/workflow-kit/README.md",
        "docs/acceptance/interruption-recovery.md",
        "tests/fixtures/released-kit/README.md"
      ],
      "verification_ids": [],
      "id": "DOCS",
      "title": "Актуализация всех документов проекта",
      "why": "В новой сессии должны быть доступны фактические контракты исправленного startup и UI, а не только проектная спецификация.",
      "acceptance_criteria": [
        "Сверить действующие README, OVERVIEW и затронутые docs/modules с реально интегрированными исходниками и тестами; править только устаревшее.",
        "Отразить отличие проверки документации checks:[] от application test evidence и оставить живую приёмку помеченной NOT_RUN.",
        "В main чистое рабочее дерево; DOCS не запускает автоматически полную suite. Ни сборка, ни установка, ни GitHub release не выполняются."
      ],
      "expected_commit_message": "docs: зафиксировать исправленный startup и подготовленные испытания",
      "task_brief": "Последняя задача, относится к разделу II. После FIX и TEST сверяй реальные коммиты и изменяй только устаревшие README, OVERVIEW и затронутые docs/modules. Не выдумывай живой PASS и не запускай release/build/install. Спецификация docs/planning/recovery-and-interruption-2026-10.md + канонический план достаточны для нового чата. Закрой DOCS штатным Kit commit и остановись на READY_FOR_ACCEPTANCE до приёмки пользователя.",
      "parallel_safe": false
    }
  ],
  "blocked_reason": null,
  "user_decisions": [
    {
      "id": "7423750a-b949-47ac-b2c2-ba7979aff151",
      "text": "21.10.2026 пользователь принял прежний план, поручил открыть единый новый план из двух разделов: исправления найденных дефектов и подготовка воспроизводимых прерываний оркестратора/исполнителей; в данном ходе только спецификация и ToDo, без реализации.",
      "recorded_at": "2026-10-21T16:58:49.644Z"
    }
  ],
  "parallel_allowed": false,
  "max_workers": 1,
  "execution_strategy": "sequential",
  "execution_reason": "Это связанная правка одного startup-контракта, общей проекции состояния и интерфейса; тесты опираются на исправления, документация — на проверенный код. Параллельность здесь не уменьшает зависимостей, зато создаёт конфликты записи. Публикация из независимого обсуждающего чата не должна выдавать себя за оркестратора."
}
```
<!-- workflow-state:end -->

## Состояние

Execution Scope Status: ACTIVE
Delivery Status: IN_PROGRESS
Scope: recovery-status-interruptions
Current Task: нет
Revision: 852

## Цель

Два раздела: I — устранить дефекты startup S и отображения результатов живого теста; II — подготовить изолированные регрессии и безопасный сценарий прерываний O/E без выполнения живых сбоев.

## Критерии приёмки

- Раздел I: штатный Claude Review не прерывается на 30/100 ходах, 15 минутах и четырёх раундах; настоящие ошибки и ручное прекращение остаются диагностируемыми без повторных эффектов.
- Раздел I: полностью прочитанный пакет S rev5 подтверждается при изменении соседнего плана до rev6; stale до первой выдачи, чужой адресат, отмена, неверные SHA/части и старый UNKNOWN по-прежнему отклоняются; повтор Send запрещён.
- Раздел I: UI не висит в pending после подтверждения, показывает объяснимые терминальные ошибки, отдельно результаты E и Kit-интеграции, реальные этапы доставки и фактические проверки DOCS.
- Раздел II: автоматические изолированные регрессии O1/O2/E1 и блокировки/сетевого UNKNOWN показывают продолжение без дублей и потери результатов; живое отключение сети, Stop и restart выполняет только пользователь позднее.
- Раздел II: пошаговый документ для живых испытаний с точками прерывания, предварительными условиями, доказательствами, правилами безопасности и таблицей PASS/FAIL/NOT_RUN готов.
- Вся реализация и проверки завершаются штатными задачами Kit, документация сверена, main чистый; выпуск и установка не выполняются без отдельного поручения, завершённый план остаётся READY_FOR_ACCEPTANCE.

## Микрозадачи

Выполнение: sequential; разрешено: false; лимит: 1
Причина: Это связанная правка одного startup-контракта, общей проекции состояния и интерфейса; тесты опираются на исправления, документация — на проверенный код. Параллельность здесь не уменьшает зависимостей, зато создаёт конфликты записи. Публикация из независимого обсуждающего чата не должна выдавать себя за оркестратора.

- [DONE] FIX-REVIEW: I · Убрать пределы ходов и времени Claude Review — Завершено
  - Git Commit: [DONE] fix: убрать искусственные пределы Claude Review
  - Reference: recovery-status-interruptions / FIX-REVIEW / implementation
  - Файлы: packages/workflow-kit/src/cli.mjs, packages/workflow-kit/src/lib/claude-review.mjs, packages/workflow-kit/src/lib/plan-review.mjs, packages/workflow-kit/src/lib/review-state.mjs, packages/workflow-kit/src/lib/command-help.mjs, packages/workflow-kit/src/lib/common.mjs, packages/workflow-kit/src/lib/installer.mjs, packages/workflow-kit/package.json, package-lock.json, packages/workflow-kit/scripts/check-plan-review-fixture.mjs, tests/workflow-kit-upgrade.test.mjs, tests/fixtures/released-kit/manifest.json, tests/fixtures/released-kit/kit-1.9.3.tar.gz, src/control/workflow/plan-review.mjs, tests/plan-review.test.mjs, packages/workflow-kit/README.md, tests/fixtures/released-kit/README.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] FIX-STARTUP: I · Startup S — подтвердить дочитанный снимок при изменении плана — Завершено
  - Git Commit: [DONE] fix: подтверждать завершённое чтение startup S при изменении плана
  - Reference: recovery-status-interruptions / FIX-STARTUP / implementation
  - Файлы: src/control/plugin/startup-context.mjs, src/control/workflow/dialogue-delivery.mjs, tests/startup-context.test.mjs, tests/plugin-communication-store.test.mjs, tests/dialogue-delivery.test.mjs, tests/parallel-execution.test.mjs, tests/settings-parallel-execution.test.mjs, tests/session-opening-performance.test.mjs, tests/fixtures/executor-background-startup.mjs, tests/executor-background-startup.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: FIX-REVIEW
- [TODO] FIX-STARTUP-UI: I · Startup UI — терминальные состояния и отсутствие вечного pending — Ожидает
  - Git Commit: [PENDING] fix: согласовать завершение startup и ошибки в UI
  - Reference: recovery-status-interruptions / FIX-STARTUP-UI / implementation
  - Файлы: src/control/plugin/startup-context.mjs, src/control/context/context-session.mjs, src/contracts/startup-view.mjs, src/frontend/desktop/ui/sidebar.mjs, src/backend/desktop-model.mjs, src/frontend/desktop/ui/progress.mjs, src/control/plugin/service.mjs, src/frontend/plugin/panel.mjs, tests/startup-context.test.mjs, tests/context-session.test.mjs, tests/sidebar.test.mjs, tests/panel-dialogue-view.test.mjs, tests/backend-desktop-model.test.mjs, tests/progress.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: FIX-STARTUP
- [TODO] FIX-PROGRESS: I · Прогресс — результаты исполнителей, интеграция, доставка и финал — Ожидает
  - Git Commit: [PENDING] feat: показывать проверенные этапы прогресса и доставки
  - Reference: recovery-status-interruptions / FIX-PROGRESS / implementation
  - Файлы: src/frontend/desktop/ui/sidebar.mjs, src/frontend/plugin/panel.mjs, src/backend/desktop-model.mjs, src/control/workflow/coordination.mjs, src/control/plugin/workflow-channel.mjs, src/control/plugin/assignment-dialogue.mjs, tests/sidebar.test.mjs, tests/backend-desktop-model.test.mjs, tests/parallel-execution-ui.test.mjs, tests/workspace-session.test.mjs, src/control/sessions/workspace-session.mjs, tests/panel-dialogue-view.test.mjs, tests/automatic-agent-dialogue.test.mjs, tests/plugin-communication.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: FIX-STARTUP-UI
- [TODO] TEST-REGRESSION: II · Автоматические фикстуры прерывания O/E — Ожидает
  - Git Commit: [PENDING] test: сценарии идемпотентного восстановления O и E
  - Reference: recovery-status-interruptions / TEST-REGRESSION / implementation
  - Файлы: tests/automatic-agent-dialogue.test.mjs, tests/fixtures/automatic-agent-dialogue.mjs, tests/plugin-communication-store.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: FIX-STARTUP, FIX-STARTUP-UI, FIX-PROGRESS
- [TODO] TEST-PLAYBOOK: II · Пошаговый протокол живых испытаний Stop, сеть, restart — Ожидает
  - Git Commit: [PENDING] docs: сценарий живого испытания прерываний O и E
  - Reference: recovery-status-interruptions / TEST-PLAYBOOK / implementation
  - Файлы: docs/acceptance/interruption-recovery.md
  - Параллельность: исключительное выполнение
  - Зависимости: TEST-REGRESSION
- [TODO] DOCS: Актуализация всех документов проекта — Ожидает
  - Git Commit: [PENDING] docs: зафиксировать исправленный startup и подготовленные испытания
  - Reference: recovery-status-interruptions / DOCS / implementation
  - Файлы: README.md, docs/architecture/OVERVIEW.md, docs/modules/orchestrator-startup.md, docs/modules/assignment-dialogue.md, docs/modules/orchestrated-execution.md, packages/workflow-kit/README.md, docs/acceptance/interruption-recovery.md, tests/fixtures/released-kit/README.md
  - Параллельность: исключительное выполнение
  - Зависимости: FIX-REVIEW, FIX-STARTUP, FIX-STARTUP-UI, FIX-PROGRESS, TEST-REGRESSION, TEST-PLAYBOOK

## Context Pack For This Cycle

- docs/planning/recovery-and-interruption-2026-10.md
- docs/planning/recovery-and-interruption-todo-draft.md
- docs/architecture/OVERVIEW.md

Служебные состояния меняются только командами workflow. Приёмка не архивирует scope.
