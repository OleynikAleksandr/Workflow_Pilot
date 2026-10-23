# Активный план — Workflow_Pilot

<!-- workflow-state:begin -->
```json
{
  "schema_version": 1,
  "plan_revision": 936,
  "project_id": "7411e192-943c-4529-bffb-3b081d9c242f",
  "project_name": "Workflow_Pilot",
  "scope_id": "work-progress-ui",
  "execution_scope_status": "ACTIVE",
  "delivery_status": "IN_PROGRESS",
  "objective": "Понятный ход работ: левый sidebar показывает управление и все задачи плана со стадиями в закреплённых зонах, правая панель Workflow Pilot — все текущие действия участников и историю в единой палитре приложения; выпуск 0.5.25 для трёх ОС опубликован.",
  "acceptance_criteria": [
    "Левый sidebar: строка сессии без текстов старта, со спиннером занятости; кнопки «Новая сессия» нет; карточка плана из закреплённого верха (название, этап со спиннером, «в main N из M»), прокручиваемого списка задач со стадиями в нынешних формулировках, режимом и временем и закреплённого низа (кнопка выполнения, блок проблемы с одним действием, подсказка приёмки, Review).",
    "Правая панель: шапка плана, «Сейчас» с отдельной строкой и временем на каждое одновременное действие всех участников (проблемы, действия, ожидания), свёрнутая «История» без закончившихся ожиданий и служебной механики, свёрнутая «Диагностика» со всеми прежними функциями.",
    "Панель и sidebar используют одни токены палитры sidebar приложения в светлой и тёмной темах; спиннеры учитывают reduced motion.",
    "Kit 1.9.5 записывает прогресс проверок коммита, приложение показывает «Kit проверяет коммит · проверка · N из M»; старый Kit без записи работает.",
    "Одна проекция хода работ в backend из существующих источников обслуживает native, HTTP-клиент и панель без нового scheduler или хранилища; одинаково на macOS, Windows и Linux.",
    "Сквозная регрессия сценария прототипа, большой план и electron-smoke проходят; документация актуальна; выпуск 0.5.25 собран из одного sourceCommit, установлен штатным installer и опубликован на GitHub; план остаётся READY_FOR_ACCEPTANCE до живой приёмки пользователем."
  ],
  "approved_scope": {
    "functional_paths": [
      "packages/workflow-kit/src/lib/git-hooks.mjs",
      "packages/workflow-kit/src/lib/transaction-state.mjs",
      "packages/workflow-kit/src/lib/transaction.mjs",
      "packages/workflow-kit/src/lib/recovery.mjs",
      "packages/workflow-kit/scripts/check-runtime-fixture.mjs",
      "packages/workflow-kit/package.json",
      "package-lock.json",
      "tests/workflow-kit-upgrade.test.mjs",
      "tests/fixtures/released-kit/manifest.json",
      "tests/fixtures/released-kit/kit-1.9.4.tar.gz",
      "src/contracts/work-progress.mjs",
      "src/contracts/dialogue-view.mjs",
      "src/control/workflow/command-activity.mjs",
      "src/control/workflow/execution-projection.mjs",
      "src/control/plugin/service.mjs",
      "src/backend/desktop-model.mjs",
      "tests/work-progress.test.mjs",
      "tests/command-activity.test.mjs",
      "tests/backend-desktop-model.test.mjs",
      "tests/plugin-communication.test.mjs",
      "src/contracts/palette.mjs",
      "src/frontend/desktop/ui/index.html",
      "src/frontend/desktop/ui/sidebar.mjs",
      "src/frontend/desktop/ui/progress.mjs",
      "tests/sidebar.test.mjs",
      "tests/progress.test.mjs",
      "tests/parallel-execution-ui.test.mjs",
      "tests/desktop-client.test.mjs",
      "tests/backend-native-pages.test.mjs",
      "src/frontend/plugin/index.html",
      "src/frontend/plugin/panel.mjs",
      "src/frontend/plugin/app.mjs",
      "src/frontend/plugin/launch.mjs",
      "scripts/stage-chatgpt-plugin.mjs",
      "tests/chatgpt-plugin.test.mjs",
      "tests/panel-dialogue-view.test.mjs",
      "tests/panel-resource-upgrade.test.mjs",
      "tests/work-progress-scenario.test.mjs",
      "tests/electron-smoke.mjs",
      "src/contracts/backend.mjs",
      "package.json",
      "release-manifest.json",
      "packages/workflow-kit/src/lib/common.mjs",
      "src/control/plugin/communication.mjs",
      "src/control/facade.mjs",
      "src/control/workflow/parallel-kit.mjs",
      "tests/parallel-execution.test.mjs",
      "src/frontend/desktop/application.mjs",
      "src/frontend/desktop/client.mjs",
      "src/frontend/web/index.html",
      "tests/parallel-execution-smoke-fixture.cjs",
      "tests/parallel-finalization.test.mjs",
      "packages/workflow-kit/src/lib/installer.mjs",
      "src/control/workflow/parallel-execution.mjs",
      "src/control/plugin/startup-context.mjs",
      "tests/startup-context.test.mjs",
      "packages/workflow-kit/src/lib/review-state.mjs",
      "packages/workflow-kit/scripts/check-plan-review-fixture.mjs",
      "tests/fixtures/released-kit/kit-1.9.5.tar.gz",
      "src/control/workflow/plan-review.mjs",
      "tests/plan-review.test.mjs",
      "packages/workflow-kit/src/lib/plan-review.mjs",
      "src/control/workflow/coordination.mjs"
    ],
    "documentation_paths": [
      "docs/planning/work-progress-ui.md",
      "README.md",
      "docs/architecture/OVERVIEW.md",
      "docs/modules/desktop.md",
      "docs/modules/chatgpt-plugin.md",
      "docs/modules/orchestrated-execution.md",
      "docs/modules/workflow-execution.md",
      "docs/modules/dialogue-timing.md",
      "docs/modules/orchestrator-startup.md",
      "docs/modules/release.md",
      "packages/workflow-kit/README.md",
      "tests/fixtures/released-kit/README.md",
      "docs/modules/assignment-dialogue.md",
      "docs/modules/assignment-dialogue-reliability.md",
      "docs/modules/automatic-agent-dialogue-acceptance.md",
      "docs/modules/chatgpt-plugin-acceptance.md",
      "docs/modules/project-compatibility.md",
      "docs/modules/plugin-communication-handoff.md"
    ]
  },
  "baseline_commit": "fa9ee6c4c0ea37166e982c2ac0c7b495def8e2db",
  "current_task_id": null,
  "context_pack": {
    "documents": [
      {
        "path": "docs/architecture/OVERVIEW.md",
        "required": true,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/modules/desktop.md",
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
        "scope_id": "work-progress-ui",
        "task_id": "T001",
        "role": "implementation"
      },
      "dependencies": [],
      "functional_paths": [
        "packages/workflow-kit/src/lib/git-hooks.mjs",
        "packages/workflow-kit/src/lib/transaction-state.mjs",
        "packages/workflow-kit/src/lib/transaction.mjs",
        "packages/workflow-kit/src/lib/recovery.mjs",
        "packages/workflow-kit/scripts/check-runtime-fixture.mjs",
        "packages/workflow-kit/package.json",
        "package-lock.json",
        "tests/workflow-kit-upgrade.test.mjs",
        "tests/fixtures/released-kit/manifest.json",
        "tests/fixtures/released-kit/kit-1.9.4.tar.gz",
        "packages/workflow-kit/src/lib/common.mjs",
        "packages/workflow-kit/src/lib/installer.mjs"
      ],
      "documentation_paths": [
        "tests/fixtures/released-kit/README.md"
      ],
      "verification_ids": [
        "kit-check",
        "kit-assignments",
        "kit-upgrade"
      ],
      "id": "T001",
      "title": "Записывать прогресс проверок коммита в Kit",
      "why": "Долгие проверки commit --task не должны выглядеть тишиной.",
      "acceptance_criteria": [
        "Во время проверок коммита Kit атомарно записывает в состояние транзакции задачу, текущую проверку, её номер, общее число и время начала проверки и прогона; запись очищается при завершении, отказе и отмене.",
        "Формат версионирован и ограничен по размеру; отсутствие записи — штатное состояние старого Kit; recovery и повтор commit не ломаются.",
        "Версия Kit 1.9.5 в package.json и src/lib/common.mjs; upgrade с 1.9.4 проверен на фиксированном архиве из sourceCommit 0.5.24, README архивов обновлён; полный Kit (kit-check и kit-assignments) проходит."
      ],
      "expected_commit_message": "feat: Записывать прогресс проверок коммита в Kit",
      "parallel_safe": false,
      "actual_files": [
        "package-lock.json",
        "packages/workflow-kit/package.json",
        "packages/workflow-kit/scripts/check-runtime-fixture.mjs",
        "packages/workflow-kit/src/lib/common.mjs",
        "packages/workflow-kit/src/lib/git-hooks.mjs",
        "packages/workflow-kit/src/lib/installer.mjs",
        "packages/workflow-kit/src/lib/transaction.mjs",
        "tests/fixtures/released-kit/README.md",
        "tests/fixtures/released-kit/kit-1.9.4.tar.gz",
        "tests/fixtures/released-kit/manifest.json",
        "tests/workflow-kit-upgrade.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "work-progress-ui",
        "task_id": "T002",
        "role": "implementation"
      },
      "dependencies": [
        "T001"
      ],
      "functional_paths": [
        "src/contracts/work-progress.mjs",
        "src/contracts/dialogue-view.mjs",
        "src/control/workflow/command-activity.mjs",
        "src/control/workflow/execution-projection.mjs",
        "src/control/plugin/service.mjs",
        "src/backend/desktop-model.mjs",
        "tests/work-progress.test.mjs",
        "tests/command-activity.test.mjs",
        "tests/backend-desktop-model.test.mjs",
        "tests/plugin-communication.test.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/facade.mjs",
        "src/control/workflow/parallel-kit.mjs",
        "tests/parallel-execution.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "src/control/workflow/parallel-execution.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "architecture",
        "orchestrator-startup"
      ],
      "id": "T002",
      "title": "Построить единую проекцию хода работ",
      "why": "Sidebar, HTTP-клиент и панель должны рисовать одно и то же состояние из одного источника.",
      "acceptance_criteria": [
        "workProgress проекта содержит этап, «в main N из M», задачи со стадиями нынешних функций, режимом и временем, текущие действия всех участников с видом действие/ожидание/проблема, ограниченную историю и одну проблему с действием.",
        "Источники только существующие: план Kit, execution.view, planActivity, assignmentStage/executorStatus, WAL сообщений и квитанций, command-activity с прогрессом Kit, интеграция, startup-прогресс; служебные ready/recovery/superseded, квитанции, yield и конец хода не становятся событиями истории.",
        "Словарь надписей в src/contracts без UUID, ID назначений и транспортных кодов; время действий — activityClock, время истории — из долговременных записей; после перезапуска история восстанавливается.",
        "workProgress доступен в снимке модели (native и HTTP через SSE) и в status view:panel и sync плагина всем участникам плана (O, E, S) с краткими превью без секретов; видимость сырых сообщений и назначений для E и S не меняется; wait просыпается при смене workProgress. Legacy sequential/parallel-планы поддержаны.",
        "Прогресс проверок Kit читается из git-dir того checkout, где идёт коммит: worktree исполнителя и main оркестратора или последовательного плана; transaction.json дочерних git-dir входит в наблюдаемые входы; отсутствие записи старого Kit — штатно.",
        "Данные панели несут накопленные таймеры работы и ожидания исполнителей для «Диагностики»."
      ],
      "expected_commit_message": "feat: Построить единую проекцию хода работ",
      "parallel_safe": false,
      "actual_files": [
        "src/backend/desktop-model.mjs",
        "src/contracts/work-progress.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/service.mjs",
        "src/control/workflow/command-activity.mjs",
        "src/control/workflow/parallel-execution.mjs",
        "src/control/workflow/parallel-kit.mjs",
        "tests/backend-desktop-model.test.mjs",
        "tests/command-activity.test.mjs",
        "tests/parallel-execution.test.mjs",
        "tests/plugin-communication.test.mjs",
        "tests/work-progress.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "work-progress-ui",
        "task_id": "T003",
        "role": "implementation"
      },
      "dependencies": [
        "T002"
      ],
      "functional_paths": [
        "src/contracts/palette.mjs",
        "src/frontend/desktop/ui/index.html",
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/frontend/desktop/ui/progress.mjs",
        "src/backend/desktop-model.mjs",
        "tests/sidebar.test.mjs",
        "tests/progress.test.mjs",
        "tests/parallel-execution-ui.test.mjs",
        "tests/desktop-client.test.mjs",
        "tests/backend-native-pages.test.mjs",
        "src/frontend/desktop/application.mjs",
        "src/frontend/desktop/client.mjs",
        "src/frontend/web/index.html"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "architecture",
        "plan-review-ui",
        "startup-recovery"
      ],
      "id": "T003",
      "title": "Перестроить левый sidebar под ход работ",
      "why": "Пользователь всегда видит задачи плана со стадиями и свои действия, а прокручивается только список задач.",
      "acceptance_criteria": [
        "Кнопка «Новая сессия» и её обработчик удалены; нормальный старт не пишется под карточкой сессии, занятость показана спиннером в строке дерева; ошибка старта с действием — в блоке проблемы с указанием меню проекта.",
        "Карточка плана: закреплённый верх (название, этап со спиннером, «в main N из M»), прокручиваемый список задач (значок, ID, полное название, стадия, режим, время; открытие чата исполнителя), закреплённый низ (одна кнопка выполнения, блок проблемы с одним действием, подсказка приёмки, Review); большой план не скрывает нижнюю зону; список прокручивается к проблеме или выполняемой задаче, не сбивая ручную прокрутку.",
        "agent-time, дубли plan-status/plan-note/execution-message, execution-stages, пустой execution-next-action и подсказка DOCS checks удалены; command-issues и восстановление доступны через блок проблемы; conversation-recovery, workspace-health, error-banner сохранены.",
        "Токены палитры — явные значения раздела 5 спецификации в модуле src/contracts/palette.mjs; sidebar вставляет <style> из модуля без расширения CSP, фон окна до показа (application.mjs, client.mjs, web/index.html) совпадает; native и HTTP-клиент одинаковы в светлой и тёмной темах."
      ],
      "expected_commit_message": "feat: Перестроить левый sidebar под ход работ",
      "parallel_safe": false,
      "actual_files": [
        "src/contracts/palette.mjs",
        "src/frontend/desktop/application.mjs",
        "src/frontend/desktop/client.mjs",
        "src/frontend/desktop/ui/index.html",
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/frontend/web/index.html",
        "tests/parallel-execution-ui.test.mjs",
        "tests/sidebar.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "work-progress-ui",
        "task_id": "T004",
        "role": "implementation"
      },
      "dependencies": [
        "T002",
        "T003"
      ],
      "functional_paths": [
        "src/frontend/plugin/index.html",
        "src/frontend/plugin/panel.mjs",
        "src/frontend/plugin/app.mjs",
        "src/frontend/plugin/launch.mjs",
        "src/contracts/palette.mjs",
        "scripts/stage-chatgpt-plugin.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/panel-dialogue-view.test.mjs",
        "tests/panel-resource-upgrade.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "chatgpt-plugin",
        "architecture"
      ],
      "id": "T004",
      "title": "Показать ход работ в панели Workflow Pilot",
      "why": "Панель показывает динамику всех участников понятно, а отладочные данные уходят в Диагностику.",
      "acceptance_criteria": [
        "Шапка: план, этап, «в main N из M», открытый чат; «Сейчас»: строка на каждое текущее действие всех участников со спиннером или знаком ожидания/проблемы и тикающим временем, порядок проблемы-действия-ожидания, сообщение в пути с обеих сторон, выделение своего участника.",
        "«История» свёрнута, свежие сверху, с правильным склонением числа, без закончившихся ожиданий и служебной механики; раскрытие не сбрасывается обновлениями.",
        "«Диагностика» свёрнута и сохраняет все прежние функции: привязку, legacy bind/enable, остановку отправки, SDK, roster, outbox, сообщения с UUID, журнал с фильтрами, экспорт и JSONL, build, таймеры работы и ожидания.",
        "Панель встраивает токены из src/contracts/palette.mjs, следует теме хоста, спиннеры учитывают reduced motion; «Сейчас» обновляется живо (пробуждение wait или ограниченный опрос status); ресурс плагина подготавливается и обновляется штатно."
      ],
      "expected_commit_message": "feat: Показать ход работ в панели Workflow Pilot",
      "parallel_safe": false,
      "actual_files": [
        "src/contracts/palette.mjs",
        "src/frontend/plugin/index.html",
        "src/frontend/plugin/launch.mjs",
        "src/frontend/plugin/panel.mjs",
        "tests/panel-dialogue-view.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "work-progress-ui",
        "task_id": "T005",
        "role": "implementation"
      },
      "dependencies": [
        "T003",
        "T004"
      ],
      "functional_paths": [
        "tests/work-progress-scenario.test.mjs",
        "tests/electron-smoke.mjs",
        "src/contracts/backend.mjs",
        "package.json",
        "package-lock.json",
        "tests/parallel-execution-smoke-fixture.cjs",
        "tests/parallel-finalization.test.mjs",
        "src/backend/desktop-model.mjs",
        "src/frontend/desktop/ui/index.html"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "electron-smoke",
        "prepared-flow-cycle",
        "kit-check",
        "kit-assignments"
      ],
      "id": "T005",
      "title": "Проверить ход работ сквозным сценарием",
      "why": "Подтвердить согласованность sidebar и панели на всём пути плана перед выпуском.",
      "acceptance_criteria": [
        "Изолированная регрессия проходит сценарий прототипа от старта сессии до ожидания приёмки, включая параллельную работу, вопрос, проверку коммита со счётчиком, слияние, проблему и завершение, и сверяет sidebar и панель на каждом шаге.",
        "Большой план проверяет закреплённые зоны и прокрутку; обе темы проверяют общие токены.",
        "electron-smoke актуализирован под новый интерфейс и проходит; версия приложения 0.5.25 и COMMUNICATION_BUILD обновлены."
      ],
      "expected_commit_message": "test: Проверить ход работ сквозным сценарием",
      "parallel_safe": false,
      "actual_files": [
        "package-lock.json",
        "package.json",
        "src/backend/desktop-model.mjs",
        "src/contracts/backend.mjs",
        "src/frontend/desktop/ui/index.html",
        "tests/electron-smoke.mjs",
        "tests/work-progress-scenario.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "work-progress-ui",
        "task_id": "DOCS",
        "role": "implementation"
      },
      "dependencies": [
        "T001",
        "T002",
        "T003",
        "T004",
        "T005"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/planning/work-progress-ui.md",
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/desktop.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/orchestrated-execution.md",
        "docs/modules/workflow-execution.md",
        "docs/modules/dialogue-timing.md",
        "docs/modules/orchestrator-startup.md",
        "docs/modules/release.md",
        "packages/workflow-kit/README.md",
        "tests/fixtures/released-kit/README.md",
        "docs/modules/assignment-dialogue.md",
        "docs/modules/assignment-dialogue-reliability.md",
        "docs/modules/automatic-agent-dialogue-acceptance.md",
        "docs/modules/chatgpt-plugin-acceptance.md",
        "docs/modules/project-compatibility.md",
        "docs/modules/plugin-communication-handoff.md"
      ],
      "verification_ids": [],
      "id": "DOCS",
      "title": "Актуализация всех документов проекта",
      "why": "Сохранить компактные актуальные контракты перед сборкой.",
      "acceptance_criteria": [
        "Модули описывают распределение sidebar/панель, проекцию workProgress, словарь, палитру и прогресс проверок Kit 1.9.5; действующий контракт перенесён из временной спецификации, спецификация удалена с точным Git blob для required context.",
        "Ограничения и ожидающая живая приёмка отмечены; документы не более 28000 байт UTF-8."
      ],
      "expected_commit_message": "docs: Актуализация всех документов проекта",
      "parallel_safe": false,
      "actual_files": [
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/assignment-dialogue-reliability.md",
        "docs/modules/assignment-dialogue.md",
        "docs/modules/automatic-agent-dialogue-acceptance.md",
        "docs/modules/chatgpt-plugin-acceptance.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/desktop.md",
        "docs/modules/dialogue-timing.md",
        "docs/modules/orchestrated-execution.md",
        "docs/modules/orchestrator-startup.md",
        "docs/modules/plugin-communication-handoff.md",
        "docs/modules/project-compatibility.md",
        "docs/modules/release.md",
        "docs/modules/workflow-execution.md",
        "docs/planning/work-progress-ui.md",
        "packages/workflow-kit/README.md"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "work-progress-ui",
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
      "title": "Собрать выпуск 0.5.25 для трёх ОС",
      "why": "Подготовить проверенный комплект macOS, Windows и Linux.",
      "verification_kind": "package",
      "acceptance_criteria": [
        "После DOCS собраны macOS arm64, Windows x64 и Linux x64 из одного sourceCommit; проверены состав, подпись, архивы, размеры и digests.",
        "Перед каждой production-сборкой проверены и удалены только Python-кэши tools/codex-app-server-mcp без перехода по симлинкам; строгая проверка extra-resource сохранена."
      ],
      "expected_commit_message": "release: Собрать выпуск 0.5.25 для трёх ОС",
      "parallel_safe": false,
      "actual_files": []
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "work-progress-ui",
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
      "title": "Установить выпуск 0.5.25",
      "why": "Доставить проверенную копию в Applications без вмешательства в работающую службу.",
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Штатный installer устанавливает готовый распакованный bundle в /Applications/Workflow Pilot.app без пересборки и переподписи; версия, manifest, подпись и откат проверены.",
        "Приложение и служба агентом не закрываются и не запускаются; установленный Kit 1.9.5 обновлён в этом checkout штатным installer."
      ],
      "expected_commit_message": "release: Установить выпуск 0.5.25",
      "parallel_safe": false,
      "actual_files": [
        "release-manifest.json"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "work-progress-ui",
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
      "title": "Опубликовать выпуск 0.5.25 на GitHub",
      "why": "Завершить поставку с честной границей живой приёмки.",
      "verification_kind": "package",
      "acceptance_criteria": [
        "GitHub Release v0.5.25 опубликован с тегом на sourceCommit, полным комплектом и проверенными digest и размерами; remote main подтверждён, пересборки нет.",
        "Пользователь получает статус установки и шаги живой проверки sidebar и панели; непроверенное вживую не объявлено принятым; scope не архивируется автоматически."
      ],
      "expected_commit_message": "release: Опубликовать выпуск 0.5.25 на GitHub",
      "parallel_safe": false,
      "actual_files": []
    },
    {
      "id": "FIX-LIVE-TEST",
      "title": "Исправить замечания живой проверки 0.5.25",
      "why": "Живая проверка 0.5.25: после закрытия плана панель бесконечно показывает «План завершается»; sidebar ложно пишет, что сессия не получила стартовый контекст; пока O готовит план, панель пишет «Сейчас ничего не выполняется».",
      "dependencies": [],
      "functional_paths": [
        "src/control/plugin/startup-context.mjs",
        "src/backend/desktop-model.mjs",
        "src/contracts/work-progress.mjs",
        "src/frontend/plugin/launch.mjs",
        "src/frontend/plugin/panel.mjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/contracts/backend.mjs",
        "package.json",
        "package-lock.json",
        "tests/startup-context.test.mjs",
        "tests/work-progress.test.mjs",
        "tests/work-progress-scenario.test.mjs",
        "tests/sidebar.test.mjs",
        "tests/panel-dialogue-view.test.mjs",
        "tests/backend-desktop-model.test.mjs",
        "tests/chatgpt-plugin.test.mjs"
      ],
      "documentation_paths": [
        "docs/modules/desktop.md"
      ],
      "verification_ids": [
        "unit-all",
        "orchestrator-startup",
        "startup-recovery",
        "chatgpt-plugin",
        "architecture",
        "electron-smoke"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Подтверждённый стартовый контекст остаётся подтверждённым после закрытия плана или участника: прогресс старта ищется по сохранённому сообщению, и sidebar/«Сейчас» не сообщают о потере или устаревании стартового контекста завершённой сессии.",
        "Пока план не создан, «Сейчас» показывает работу O над ответом со временем по состоянию страницы чата, а в паузе — ожидание сообщения пользователя; фаза без плана «Подготовка» только во время старта, иначе «Обсуждение плана».",
        "Отложенная очистка назначения показывается ожиданием с причиной (конец хода исполнителя или завершение команды) без вечного спиннера; после 15 минут — проблема с действием «Открыть чат» исполнителя.",
        "После закрытия плана панель, потерявшая участника, показывает итог «План закрыт, активных действий нет» без спиннера.",
        "Версия приложения 0.5.26 в package.json, package-lock.json и COMMUNICATION_APP_VERSION/BUILD; протокол панели 4 не меняется."
      ],
      "expected_commit_message": "fix: Исправить замечания живой проверки 0.5.25",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "work-progress-ui",
        "task_id": "FIX-LIVE-TEST",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "package-lock.json",
        "package.json",
        "src/backend/desktop-model.mjs",
        "src/contracts/backend.mjs",
        "src/contracts/work-progress.mjs",
        "src/control/plugin/startup-context.mjs",
        "src/frontend/plugin/launch.mjs",
        "src/frontend/plugin/panel.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/startup-context.test.mjs",
        "tests/work-progress-scenario.test.mjs",
        "tests/work-progress.test.mjs"
      ]
    },
    {
      "id": "DOCS-2",
      "title": "Актуализация всех документов проекта",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "work-progress-ui",
        "task_id": "DOCS-2",
        "role": "implementation",
        "iteration": 2
      },
      "why": "Перед выпуском сверить README, OVERVIEW и действующие контракты модулей с результатом; обновить устаревшее.",
      "dependencies": [
        "FIX-LIVE-TEST"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/architecture/OVERVIEW.md",
        "docs/modules/desktop.md",
        "README.md",
        "docs/modules/assignment-dialogue-reliability.md",
        "docs/modules/assignment-dialogue.md",
        "docs/modules/automatic-agent-dialogue-acceptance.md",
        "docs/modules/chatgpt-plugin-acceptance.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/dialogue-timing.md",
        "docs/modules/orchestrated-execution.md",
        "docs/modules/orchestrator-startup.md",
        "docs/modules/plugin-communication-handoff.md",
        "docs/modules/release.md"
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
        "docs/modules/assignment-dialogue-reliability.md",
        "docs/modules/assignment-dialogue.md",
        "docs/modules/automatic-agent-dialogue-acceptance.md",
        "docs/modules/chatgpt-plugin-acceptance.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/desktop.md",
        "docs/modules/dialogue-timing.md",
        "docs/modules/orchestrated-execution.md",
        "docs/modules/orchestrator-startup.md",
        "docs/modules/plugin-communication-handoff.md",
        "docs/modules/release.md"
      ]
    },
    {
      "id": "RELEASE-2",
      "title": "Собрать выпуск 0.5.26 для трёх ОС",
      "why": "Собрать выпуск 0.5.26 для трёх ОС",
      "dependencies": [
        "DOCS-2"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/modules/desktop.md"
      ],
      "verification_ids": [
        "three-platform-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "После DOCS-2 собраны macOS arm64, Windows x64 и Linux x64 из одного sourceCommit; перед production-сборкой удалены только Python-кэши tools/codex-app-server-mcp."
      ],
      "expected_commit_message": "release: Собрать выпуск 0.5.26 для трёх ОС",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "work-progress-ui",
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
      "title": "Установить выпуск 0.5.26",
      "why": "Установить выпуск 0.5.26",
      "dependencies": [
        "DOCS-2"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/modules/desktop.md"
      ],
      "verification_ids": [
        "release-installed"
      ],
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Штатный installer проверил версию, manifest, подпись и откат; приложение и служба агентом не закрываются и не запускаются."
      ],
      "expected_commit_message": "release: Установить выпуск 0.5.26",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "work-progress-ui",
        "task_id": "INSTALL-2",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": []
    },
    {
      "id": "PUBLISH-2",
      "title": "Опубликовать выпуск 0.5.26 на GitHub",
      "why": "Опубликовать выпуск 0.5.26 на GitHub",
      "dependencies": [
        "DOCS-2"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/modules/desktop.md"
      ],
      "verification_ids": [
        "github-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "GitHub Release v0.5.26 опубликован с тегом на sourceCommit, семью assets и сверенными digest и размерами; scope не архивируется автоматически."
      ],
      "expected_commit_message": "release: Опубликовать выпуск 0.5.26 на GitHub",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "work-progress-ui",
        "task_id": "PUBLISH-2",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": []
    },
    {
      "id": "FIX-UI-0526",
      "title": "Компактная карточка сессии и ожидание запуска плана",
      "why": "Живая проверка 0.5.26: карточка сессии оркестратора раскладывает название, Chat и меню в три колонки и растёт по высоте при сужении sidebar, повторяет состояние плана; в «Сейчас» готовый план показывается как «Сейчас ничего не выполняется».",
      "dependencies": [],
      "functional_paths": [
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/frontend/desktop/ui/index.html",
        "src/backend/desktop-model.mjs",
        "src/contracts/work-progress.mjs",
        "tests/sidebar.test.mjs",
        "tests/work-progress.test.mjs",
        "tests/work-progress-scenario.test.mjs",
        "tests/electron-smoke.mjs"
      ],
      "documentation_paths": [
        "docs/modules/desktop.md"
      ],
      "verification_ids": [
        "unit-all",
        "architecture",
        "electron-smoke"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Карточка сессии: название слева, справа одна колонка — меню «…» сверху и Chat/Work внизу, по центру друг под другом; одна строка сведений «ДД.ММ, ЧЧ:ММ · Оркестратор · N/M» (или «Обсуждение») без повторения состояния плана; высота строки не растёт при сужении sidebar.",
        "Готовый, ещё не запущенный план показывает в «Сейчас» ожидание: план ждёт проверки и запуска пользователем кнопкой «Начать выполнение плана», со временем ожидания."
      ],
      "expected_commit_message": "fix: Компактная карточка сессии и ожидание запуска плана",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "work-progress-ui",
        "task_id": "FIX-UI-0526",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "src/backend/desktop-model.mjs",
        "src/contracts/work-progress.mjs",
        "src/frontend/desktop/ui/index.html",
        "src/frontend/desktop/ui/sidebar.mjs",
        "tests/electron-smoke.mjs",
        "tests/sidebar.test.mjs",
        "tests/work-progress-scenario.test.mjs",
        "tests/work-progress.test.mjs"
      ]
    },
    {
      "id": "VERSION-0527",
      "title": "Поднять версию 0.5.27",
      "why": "Компактная карточка сессии и ожидание запуска плана выходят отдельным выпуском после живой проверки 0.5.26.",
      "dependencies": [],
      "functional_paths": [
        "src/contracts/backend.mjs",
        "package.json",
        "package-lock.json"
      ],
      "documentation_paths": [
        "docs/modules/desktop.md"
      ],
      "verification_ids": [
        "unit-all",
        "chatgpt-plugin"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Версия приложения 0.5.27 в package.json, package-lock.json и COMMUNICATION_APP_VERSION/BUILD; протокол панели 4 не меняется."
      ],
      "expected_commit_message": "chore: Поднять версию 0.5.27",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "work-progress-ui",
        "task_id": "VERSION-0527",
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
      "id": "DOCS-3",
      "title": "Актуализация всех документов проекта",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "work-progress-ui",
        "task_id": "DOCS-3",
        "role": "implementation",
        "iteration": 3
      },
      "why": "Перед выпуском сверить README, OVERVIEW и действующие контракты модулей с результатом; обновить устаревшее.",
      "dependencies": [
        "FIX-UI-0526",
        "VERSION-0527"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/architecture/OVERVIEW.md",
        "docs/modules/desktop.md",
        "README.md",
        "docs/modules/assignment-dialogue-reliability.md",
        "docs/modules/assignment-dialogue.md",
        "docs/modules/automatic-agent-dialogue-acceptance.md",
        "docs/modules/chatgpt-plugin-acceptance.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/dialogue-timing.md",
        "docs/modules/orchestrated-execution.md",
        "docs/modules/orchestrator-startup.md",
        "docs/modules/plugin-communication-handoff.md",
        "docs/modules/release.md"
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
        "docs/modules/assignment-dialogue-reliability.md",
        "docs/modules/assignment-dialogue.md",
        "docs/modules/automatic-agent-dialogue-acceptance.md",
        "docs/modules/chatgpt-plugin-acceptance.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/desktop.md",
        "docs/modules/dialogue-timing.md",
        "docs/modules/orchestrated-execution.md",
        "docs/modules/orchestrator-startup.md",
        "docs/modules/plugin-communication-handoff.md",
        "docs/modules/release.md"
      ]
    },
    {
      "id": "RELEASE-3",
      "title": "Собрать выпуск 0.5.27 для трёх ОС",
      "why": "Собрать выпуск 0.5.27 для трёх ОС",
      "dependencies": [
        "DOCS-3"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/modules/desktop.md"
      ],
      "verification_ids": [
        "three-platform-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "После DOCS собраны macOS arm64, Windows x64 и Linux x64 из одного sourceCommit; перед production-сборкой удалены только Python-кэши tools/codex-app-server-mcp."
      ],
      "expected_commit_message": "release: Собрать выпуск 0.5.27 для трёх ОС",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "work-progress-ui",
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
      "title": "Установить выпуск 0.5.27",
      "why": "Установить выпуск 0.5.27",
      "dependencies": [
        "DOCS-3"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/modules/desktop.md"
      ],
      "verification_ids": [
        "release-installed"
      ],
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Штатный installer проверил версию, manifest, подпись и откат; приложение и служба агентом не закрываются и не запускаются."
      ],
      "expected_commit_message": "release: Установить выпуск 0.5.27",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "work-progress-ui",
        "task_id": "INSTALL-3",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": []
    },
    {
      "id": "PUBLISH-3",
      "title": "Опубликовать выпуск 0.5.27 на GitHub",
      "why": "Опубликовать выпуск 0.5.27 на GitHub",
      "dependencies": [
        "DOCS-3"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/modules/desktop.md"
      ],
      "verification_ids": [
        "github-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "GitHub Release v0.5.27 опубликован с тегом на sourceCommit, семью assets и сверенными digest и размерами; scope не архивируется автоматически."
      ],
      "expected_commit_message": "release: Опубликовать выпуск 0.5.27 на GitHub",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "work-progress-ui",
        "task_id": "PUBLISH-3",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": []
    },
    {
      "id": "KIT-REVIEW-0527",
      "title": "Kit 1.9.6: Review по решению пользователя и блокировка после публикации",
      "why": "Живая проверка 0.5.27: пользователь включил Review во время обсуждения, публикация вернула REVIEW_REQUIRED, а оркестратор попросил выключить Review вместо прохождения ревью; переключатель меняется и после публикации плана.",
      "dependencies": [],
      "functional_paths": [
        "packages/workflow-kit/src/lib/review-state.mjs",
        "packages/workflow-kit/src/lib/common.mjs",
        "packages/workflow-kit/src/lib/installer.mjs",
        "packages/workflow-kit/package.json",
        "package-lock.json",
        "packages/workflow-kit/scripts/check-plan-review-fixture.mjs",
        "packages/workflow-kit/scripts/check-runtime-fixture.mjs",
        "tests/fixtures/released-kit/kit-1.9.5.tar.gz",
        "tests/fixtures/released-kit/manifest.json",
        "tests/workflow-kit-upgrade.test.mjs",
        "packages/workflow-kit/src/lib/plan-review.mjs"
      ],
      "documentation_paths": [
        "docs/modules/desktop.md",
        "tests/fixtures/released-kit/README.md"
      ],
      "verification_ids": [
        "kit-check",
        "kit-assignments",
        "kit-upgrade",
        "unit-all"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "REVIEW_REQUIRED и сводка Review в recovery говорят: положение переключателя в момент публикации — решение пользователя; при ON пройти review:prepare/run/respond/publish, не прося выключить Review.",
        "setReviewEnabled отказывает с REVIEW_LOCKED, пока план опубликован (execution_scope_status не NONE), и с REVIEW_BUSY во время RUNNING/PUBLISHING; выключение на PREPARED/AUTHOR_PENDING/AGREED/NEEDS_USER/STALE отменяет ревью (CANCELLED), после чего план публикуется обычным способом.",
        "Kit 1.9.6; обновление с выпущенного 1.9.5 проверено неизменяемым архивом."
      ],
      "expected_commit_message": "feat: Review по решению пользователя и блокировка после публикации",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "work-progress-ui",
        "task_id": "KIT-REVIEW-0527",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "package-lock.json",
        "packages/workflow-kit/package.json",
        "packages/workflow-kit/scripts/check-plan-review-fixture.mjs",
        "packages/workflow-kit/src/lib/common.mjs",
        "packages/workflow-kit/src/lib/installer.mjs",
        "packages/workflow-kit/src/lib/plan-review.mjs",
        "packages/workflow-kit/src/lib/review-state.mjs",
        "tests/fixtures/released-kit/README.md",
        "tests/fixtures/released-kit/kit-1.9.5.tar.gz",
        "tests/fixtures/released-kit/manifest.json",
        "tests/workflow-kit-upgrade.test.mjs"
      ]
    },
    {
      "id": "FIX-REVIEW-UI-0527",
      "title": "Кнопка Review неактивна после публикации плана и во время ревью",
      "why": "Переключатель Review в sidebar доступен всегда, хотя после публикации он уже ни на что не влияет, а во время ревью его выключение ломает запуск.",
      "dependencies": [],
      "functional_paths": [
        "src/control/workflow/plan-review.mjs",
        "src/backend/desktop-model.mjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "tests/plan-review.test.mjs",
        "tests/sidebar.test.mjs",
        "src/control/workflow/coordination.mjs"
      ],
      "documentation_paths": [
        "docs/modules/desktop.md"
      ],
      "verification_ids": [
        "plan-review-ui",
        "unit-all",
        "architecture",
        "electron-smoke"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "При опубликованном плане (ACTIVE/BLOCKED) кнопка Review неактивна с подсказкой «Review применяется к новому плану; текущий план уже опубликован»; во время RUNNING/PUBLISHING — неактивна с подсказкой «Идёт ревью»; после закрытия плана снова доступна.",
        "Backend не обходит запрет: отказ Kit возвращается действию как ошибка без изменения состояния."
      ],
      "expected_commit_message": "fix: Кнопка Review неактивна после публикации плана",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "work-progress-ui",
        "task_id": "FIX-REVIEW-UI-0527",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/plan-review.mjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "tests/plan-review.test.mjs",
        "tests/sidebar.test.mjs"
      ]
    },
    {
      "id": "VERSION-0528",
      "title": "Поднять версию 0.5.28",
      "why": "Сценарии Review выходят отдельным выпуском после живой проверки 0.5.27.",
      "dependencies": [],
      "functional_paths": [
        "src/contracts/backend.mjs",
        "package.json",
        "package-lock.json"
      ],
      "documentation_paths": [
        "docs/modules/desktop.md"
      ],
      "verification_ids": [
        "unit-all",
        "chatgpt-plugin"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Версия приложения 0.5.28 в package.json, package-lock.json и COMMUNICATION_APP_VERSION/BUILD; протокол панели 4 не меняется."
      ],
      "expected_commit_message": "chore: Поднять версию 0.5.28",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "work-progress-ui",
        "task_id": "VERSION-0528",
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
      "id": "DOCS-4",
      "title": "Актуализация всех документов проекта",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "work-progress-ui",
        "task_id": "DOCS-4",
        "role": "implementation",
        "iteration": 4
      },
      "why": "Перед выпуском сверить README, OVERVIEW и действующие контракты модулей с результатом; обновить устаревшее.",
      "dependencies": [
        "KIT-REVIEW-0527",
        "FIX-REVIEW-UI-0527",
        "VERSION-0528"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/architecture/OVERVIEW.md",
        "docs/modules/desktop.md",
        "tests/fixtures/released-kit/README.md"
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
      "title": "Собрать выпуск 0.5.28 для трёх ОС",
      "why": "Собрать выпуск 0.5.28 для трёх ОС",
      "dependencies": [
        "DOCS-4"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/modules/desktop.md"
      ],
      "verification_ids": [
        "three-platform-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "После DOCS собраны macOS arm64, Windows x64 и Linux x64 из одного sourceCommit; перед production-сборкой удалены только Python-кэши tools/codex-app-server-mcp."
      ],
      "expected_commit_message": "release: Собрать выпуск 0.5.28 для трёх ОС",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "work-progress-ui",
        "task_id": "RELEASE-4",
        "role": "implementation"
      },
      "parallel_safe": false
    },
    {
      "id": "INSTALL-4",
      "title": "Установить выпуск 0.5.28",
      "why": "Установить выпуск 0.5.28",
      "dependencies": [
        "DOCS-4"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/modules/desktop.md"
      ],
      "verification_ids": [
        "release-installed"
      ],
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Штатный installer проверил версию, manifest, подпись и откат; приложение и служба агентом не закрываются и не запускаются."
      ],
      "expected_commit_message": "release: Установить выпуск 0.5.28",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "work-progress-ui",
        "task_id": "INSTALL-4",
        "role": "implementation"
      },
      "parallel_safe": false
    },
    {
      "id": "PUBLISH-4",
      "title": "Опубликовать выпуск 0.5.28 на GitHub",
      "why": "Опубликовать выпуск 0.5.28 на GitHub",
      "dependencies": [
        "DOCS-4"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/modules/desktop.md"
      ],
      "verification_ids": [
        "github-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "GitHub Release v0.5.28 опубликован с тегом на sourceCommit, семью assets и сверенными digest и размерами; scope не архивируется автоматически."
      ],
      "expected_commit_message": "release: Опубликовать выпуск 0.5.28 на GitHub",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "work-progress-ui",
        "task_id": "PUBLISH-4",
        "role": "implementation"
      },
      "parallel_safe": false
    }
  ],
  "blocked_reason": null,
  "user_decisions": [
    {
      "id": "e21d7931-5a52-4057-912d-eea3e6331e97",
      "text": "Прямое поручение пользователя 22.10.2026: по согласованному прототипу «Ход работ Workflow Pilot» (версия 8) создать спецификацию и to-do-план реорганизации sidebar и панели в первую очередь, включить сборку выпусков трёх ОС и публикацию на GitHub. Приложение и фоновые службы закрывает пользователь; живую проверку интерфейса выполняет пользователь.",
      "recorded_at": "2026-10-22T16:25:32.702Z"
    }
  ],
  "parallel_allowed": false,
  "max_workers": 1,
  "execution_strategy": "sequential",
  "execution_reason": "AGENTS.md предписывает работать самостоятельно; план выполняет этот агент последовательно при закрытом приложении. Задачи связаны общей проекцией хода работ и словарём: Kit-прогресс нужен проекции, проекция — sidebar и панели, сквозная регрессия — всем трём."
}
```
<!-- workflow-state:end -->

## Состояние

Execution Scope Status: ACTIVE
Delivery Status: IN_PROGRESS
Scope: work-progress-ui
Current Task: нет
Revision: 936

## Цель

Понятный ход работ: левый sidebar показывает управление и все задачи плана со стадиями в закреплённых зонах, правая панель Workflow Pilot — все текущие действия участников и историю в единой палитре приложения; выпуск 0.5.25 для трёх ОС опубликован.

## Критерии приёмки

- Левый sidebar: строка сессии без текстов старта, со спиннером занятости; кнопки «Новая сессия» нет; карточка плана из закреплённого верха (название, этап со спиннером, «в main N из M»), прокручиваемого списка задач со стадиями в нынешних формулировках, режимом и временем и закреплённого низа (кнопка выполнения, блок проблемы с одним действием, подсказка приёмки, Review).
- Правая панель: шапка плана, «Сейчас» с отдельной строкой и временем на каждое одновременное действие всех участников (проблемы, действия, ожидания), свёрнутая «История» без закончившихся ожиданий и служебной механики, свёрнутая «Диагностика» со всеми прежними функциями.
- Панель и sidebar используют одни токены палитры sidebar приложения в светлой и тёмной темах; спиннеры учитывают reduced motion.
- Kit 1.9.5 записывает прогресс проверок коммита, приложение показывает «Kit проверяет коммит · проверка · N из M»; старый Kit без записи работает.
- Одна проекция хода работ в backend из существующих источников обслуживает native, HTTP-клиент и панель без нового scheduler или хранилища; одинаково на macOS, Windows и Linux.
- Сквозная регрессия сценария прототипа, большой план и electron-smoke проходят; документация актуальна; выпуск 0.5.25 собран из одного sourceCommit, установлен штатным installer и опубликован на GitHub; план остаётся READY_FOR_ACCEPTANCE до живой приёмки пользователем.

## Микрозадачи

Выполнение: sequential; разрешено: false; лимит: 1
Причина: AGENTS.md предписывает работать самостоятельно; план выполняет этот агент последовательно при закрытом приложении. Задачи связаны общей проекцией хода работ и словарём: Kit-прогресс нужен проекции, проекция — sidebar и панели, сквозная регрессия — всем трём.

- [DONE] T001: Записывать прогресс проверок коммита в Kit — Завершено
  - Git Commit: [DONE] feat: Записывать прогресс проверок коммита в Kit
  - Reference: work-progress-ui / T001 / implementation
  - Файлы: packages/workflow-kit/src/lib/git-hooks.mjs, packages/workflow-kit/src/lib/transaction-state.mjs, packages/workflow-kit/src/lib/transaction.mjs, packages/workflow-kit/src/lib/recovery.mjs, packages/workflow-kit/scripts/check-runtime-fixture.mjs, packages/workflow-kit/package.json, package-lock.json, tests/workflow-kit-upgrade.test.mjs, tests/fixtures/released-kit/manifest.json, tests/fixtures/released-kit/kit-1.9.4.tar.gz, packages/workflow-kit/src/lib/common.mjs, packages/workflow-kit/src/lib/installer.mjs, tests/fixtures/released-kit/README.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] T002: Построить единую проекцию хода работ — Завершено
  - Git Commit: [DONE] feat: Построить единую проекцию хода работ
  - Reference: work-progress-ui / T002 / implementation
  - Файлы: src/contracts/work-progress.mjs, src/contracts/dialogue-view.mjs, src/control/workflow/command-activity.mjs, src/control/workflow/execution-projection.mjs, src/control/plugin/service.mjs, src/backend/desktop-model.mjs, tests/work-progress.test.mjs, tests/command-activity.test.mjs, tests/backend-desktop-model.test.mjs, tests/plugin-communication.test.mjs, src/control/plugin/communication.mjs, src/control/facade.mjs, src/control/workflow/parallel-kit.mjs, tests/parallel-execution.test.mjs, tests/chatgpt-plugin.test.mjs, src/control/workflow/parallel-execution.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: T001
- [DONE] T003: Перестроить левый sidebar под ход работ — Завершено
  - Git Commit: [DONE] feat: Перестроить левый sidebar под ход работ
  - Reference: work-progress-ui / T003 / implementation
  - Файлы: src/contracts/palette.mjs, src/frontend/desktop/ui/index.html, src/frontend/desktop/ui/sidebar.mjs, src/frontend/desktop/ui/progress.mjs, src/backend/desktop-model.mjs, tests/sidebar.test.mjs, tests/progress.test.mjs, tests/parallel-execution-ui.test.mjs, tests/desktop-client.test.mjs, tests/backend-native-pages.test.mjs, src/frontend/desktop/application.mjs, src/frontend/desktop/client.mjs, src/frontend/web/index.html
  - Параллельность: исключительное выполнение
  - Зависимости: T002
- [DONE] T004: Показать ход работ в панели Workflow Pilot — Завершено
  - Git Commit: [DONE] feat: Показать ход работ в панели Workflow Pilot
  - Reference: work-progress-ui / T004 / implementation
  - Файлы: src/frontend/plugin/index.html, src/frontend/plugin/panel.mjs, src/frontend/plugin/app.mjs, src/frontend/plugin/launch.mjs, src/contracts/palette.mjs, scripts/stage-chatgpt-plugin.mjs, tests/chatgpt-plugin.test.mjs, tests/panel-dialogue-view.test.mjs, tests/panel-resource-upgrade.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: T002, T003
- [DONE] T005: Проверить ход работ сквозным сценарием — Завершено
  - Git Commit: [DONE] test: Проверить ход работ сквозным сценарием
  - Reference: work-progress-ui / T005 / implementation
  - Файлы: tests/work-progress-scenario.test.mjs, tests/electron-smoke.mjs, src/contracts/backend.mjs, package.json, package-lock.json, tests/parallel-execution-smoke-fixture.cjs, tests/parallel-finalization.test.mjs, src/backend/desktop-model.mjs, src/frontend/desktop/ui/index.html
  - Параллельность: исключительное выполнение
  - Зависимости: T003, T004
- [DONE] DOCS: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: Актуализация всех документов проекта
  - Reference: work-progress-ui / DOCS / implementation
  - Файлы: docs/planning/work-progress-ui.md, README.md, docs/architecture/OVERVIEW.md, docs/modules/desktop.md, docs/modules/chatgpt-plugin.md, docs/modules/orchestrated-execution.md, docs/modules/workflow-execution.md, docs/modules/dialogue-timing.md, docs/modules/orchestrator-startup.md, docs/modules/release.md, packages/workflow-kit/README.md, tests/fixtures/released-kit/README.md, docs/modules/assignment-dialogue.md, docs/modules/assignment-dialogue-reliability.md, docs/modules/automatic-agent-dialogue-acceptance.md, docs/modules/chatgpt-plugin-acceptance.md, docs/modules/project-compatibility.md, docs/modules/plugin-communication-handoff.md
  - Параллельность: исключительное выполнение
  - Зависимости: T001, T002, T003, T004, T005
- [DONE] RELEASE: Собрать выпуск 0.5.25 для трёх ОС — Завершено
  - Git Commit: [DONE] release: Собрать выпуск 0.5.25 для трёх ОС
  - Reference: work-progress-ui / RELEASE / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: DOCS
- [DONE] INSTALL: Установить выпуск 0.5.25 — Завершено
  - Git Commit: [DONE] release: Установить выпуск 0.5.25
  - Reference: work-progress-ui / INSTALL / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: RELEASE, DOCS
- [DONE] PUBLISH: Опубликовать выпуск 0.5.25 на GitHub — Завершено
  - Git Commit: [DONE] release: Опубликовать выпуск 0.5.25 на GitHub
  - Reference: work-progress-ui / PUBLISH / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: INSTALL, DOCS
- [DONE] FIX-LIVE-TEST: Исправить замечания живой проверки 0.5.25 — Завершено
  - Git Commit: [DONE] fix: Исправить замечания живой проверки 0.5.25
  - Reference: work-progress-ui / FIX-LIVE-TEST / implementation
  - Файлы: src/control/plugin/startup-context.mjs, src/backend/desktop-model.mjs, src/contracts/work-progress.mjs, src/frontend/plugin/launch.mjs, src/frontend/plugin/panel.mjs, src/frontend/desktop/ui/sidebar.mjs, src/contracts/backend.mjs, package.json, package-lock.json, tests/startup-context.test.mjs, tests/work-progress.test.mjs, tests/work-progress-scenario.test.mjs, tests/sidebar.test.mjs, tests/panel-dialogue-view.test.mjs, tests/backend-desktop-model.test.mjs, tests/chatgpt-plugin.test.mjs, docs/modules/desktop.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] DOCS-2: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: актуализировать документацию проекта
  - Reference: work-progress-ui / DOCS-2 / implementation
  - Файлы: docs/architecture/OVERVIEW.md, docs/modules/desktop.md, README.md, docs/modules/assignment-dialogue-reliability.md, docs/modules/assignment-dialogue.md, docs/modules/automatic-agent-dialogue-acceptance.md, docs/modules/chatgpt-plugin-acceptance.md, docs/modules/chatgpt-plugin.md, docs/modules/dialogue-timing.md, docs/modules/orchestrated-execution.md, docs/modules/orchestrator-startup.md, docs/modules/plugin-communication-handoff.md, docs/modules/release.md
  - Параллельность: исключительное выполнение
  - Зависимости: FIX-LIVE-TEST
- [DONE] RELEASE-2: Собрать выпуск 0.5.26 для трёх ОС — Завершено
  - Git Commit: [DONE] release: Собрать выпуск 0.5.26 для трёх ОС
  - Reference: work-progress-ui / RELEASE-2 / implementation
  - Файлы: release-manifest.json, docs/modules/desktop.md
  - Параллельность: исключительное выполнение
  - Зависимости: DOCS-2
- [DONE] INSTALL-2: Установить выпуск 0.5.26 — Завершено
  - Git Commit: [DONE] release: Установить выпуск 0.5.26
  - Reference: work-progress-ui / INSTALL-2 / implementation
  - Файлы: release-manifest.json, docs/modules/desktop.md
  - Параллельность: исключительное выполнение
  - Зависимости: DOCS-2
- [DONE] PUBLISH-2: Опубликовать выпуск 0.5.26 на GitHub — Завершено
  - Git Commit: [DONE] release: Опубликовать выпуск 0.5.26 на GitHub
  - Reference: work-progress-ui / PUBLISH-2 / implementation
  - Файлы: release-manifest.json, docs/modules/desktop.md
  - Параллельность: исключительное выполнение
  - Зависимости: DOCS-2
- [DONE] FIX-UI-0526: Компактная карточка сессии и ожидание запуска плана — Завершено
  - Git Commit: [DONE] fix: Компактная карточка сессии и ожидание запуска плана
  - Reference: work-progress-ui / FIX-UI-0526 / implementation
  - Файлы: src/frontend/desktop/ui/sidebar.mjs, src/frontend/desktop/ui/index.html, src/backend/desktop-model.mjs, src/contracts/work-progress.mjs, tests/sidebar.test.mjs, tests/work-progress.test.mjs, tests/work-progress-scenario.test.mjs, tests/electron-smoke.mjs, docs/modules/desktop.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] VERSION-0527: Поднять версию 0.5.27 — Завершено
  - Git Commit: [DONE] chore: Поднять версию 0.5.27
  - Reference: work-progress-ui / VERSION-0527 / implementation
  - Файлы: src/contracts/backend.mjs, package.json, package-lock.json, docs/modules/desktop.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] DOCS-3: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: актуализировать документацию проекта
  - Reference: work-progress-ui / DOCS-3 / implementation
  - Файлы: docs/architecture/OVERVIEW.md, docs/modules/desktop.md, README.md, docs/modules/assignment-dialogue-reliability.md, docs/modules/assignment-dialogue.md, docs/modules/automatic-agent-dialogue-acceptance.md, docs/modules/chatgpt-plugin-acceptance.md, docs/modules/chatgpt-plugin.md, docs/modules/dialogue-timing.md, docs/modules/orchestrated-execution.md, docs/modules/orchestrator-startup.md, docs/modules/plugin-communication-handoff.md, docs/modules/release.md
  - Параллельность: исключительное выполнение
  - Зависимости: FIX-UI-0526, VERSION-0527
- [DONE] RELEASE-3: Собрать выпуск 0.5.27 для трёх ОС — Завершено
  - Git Commit: [DONE] release: Собрать выпуск 0.5.27 для трёх ОС
  - Reference: work-progress-ui / RELEASE-3 / implementation
  - Файлы: release-manifest.json, docs/modules/desktop.md
  - Параллельность: исключительное выполнение
  - Зависимости: DOCS-3
- [DONE] INSTALL-3: Установить выпуск 0.5.27 — Завершено
  - Git Commit: [DONE] release: Установить выпуск 0.5.27
  - Reference: work-progress-ui / INSTALL-3 / implementation
  - Файлы: release-manifest.json, docs/modules/desktop.md
  - Параллельность: исключительное выполнение
  - Зависимости: DOCS-3
- [DONE] PUBLISH-3: Опубликовать выпуск 0.5.27 на GitHub — Завершено
  - Git Commit: [DONE] release: Опубликовать выпуск 0.5.27 на GitHub
  - Reference: work-progress-ui / PUBLISH-3 / implementation
  - Файлы: release-manifest.json, docs/modules/desktop.md
  - Параллельность: исключительное выполнение
  - Зависимости: DOCS-3
- [DONE] KIT-REVIEW-0527: Kit 1.9.6: Review по решению пользователя и блокировка после публикации — Завершено
  - Git Commit: [DONE] feat: Review по решению пользователя и блокировка после публикации
  - Reference: work-progress-ui / KIT-REVIEW-0527 / implementation
  - Файлы: packages/workflow-kit/src/lib/review-state.mjs, packages/workflow-kit/src/lib/common.mjs, packages/workflow-kit/src/lib/installer.mjs, packages/workflow-kit/package.json, package-lock.json, packages/workflow-kit/scripts/check-plan-review-fixture.mjs, packages/workflow-kit/scripts/check-runtime-fixture.mjs, tests/fixtures/released-kit/kit-1.9.5.tar.gz, tests/fixtures/released-kit/manifest.json, tests/workflow-kit-upgrade.test.mjs, packages/workflow-kit/src/lib/plan-review.mjs, docs/modules/desktop.md, tests/fixtures/released-kit/README.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] FIX-REVIEW-UI-0527: Кнопка Review неактивна после публикации плана и во время ревью — Завершено
  - Git Commit: [DONE] fix: Кнопка Review неактивна после публикации плана
  - Reference: work-progress-ui / FIX-REVIEW-UI-0527 / implementation
  - Файлы: src/control/workflow/plan-review.mjs, src/backend/desktop-model.mjs, src/frontend/desktop/ui/sidebar.mjs, tests/plan-review.test.mjs, tests/sidebar.test.mjs, src/control/workflow/coordination.mjs, docs/modules/desktop.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] VERSION-0528: Поднять версию 0.5.28 — Завершено
  - Git Commit: [DONE] chore: Поднять версию 0.5.28
  - Reference: work-progress-ui / VERSION-0528 / implementation
  - Файлы: src/contracts/backend.mjs, package.json, package-lock.json, docs/modules/desktop.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [TODO] DOCS-4: Актуализация всех документов проекта — Ожидает
  - Git Commit: [PENDING] docs: актуализировать документацию проекта
  - Reference: work-progress-ui / DOCS-4 / implementation
  - Файлы: docs/architecture/OVERVIEW.md, docs/modules/desktop.md, tests/fixtures/released-kit/README.md
  - Параллельность: исключительное выполнение
  - Зависимости: KIT-REVIEW-0527, FIX-REVIEW-UI-0527, VERSION-0528
- [TODO] RELEASE-4: Собрать выпуск 0.5.28 для трёх ОС — Ожидает
  - Git Commit: [PENDING] release: Собрать выпуск 0.5.28 для трёх ОС
  - Reference: work-progress-ui / RELEASE-4 / implementation
  - Файлы: release-manifest.json, docs/modules/desktop.md
  - Параллельность: исключительное выполнение
  - Зависимости: DOCS-4
- [TODO] INSTALL-4: Установить выпуск 0.5.28 — Ожидает
  - Git Commit: [PENDING] release: Установить выпуск 0.5.28
  - Reference: work-progress-ui / INSTALL-4 / implementation
  - Файлы: release-manifest.json, docs/modules/desktop.md
  - Параллельность: исключительное выполнение
  - Зависимости: DOCS-4
- [TODO] PUBLISH-4: Опубликовать выпуск 0.5.28 на GitHub — Ожидает
  - Git Commit: [PENDING] release: Опубликовать выпуск 0.5.28 на GitHub
  - Reference: work-progress-ui / PUBLISH-4 / implementation
  - Файлы: release-manifest.json, docs/modules/desktop.md
  - Параллельность: исключительное выполнение
  - Зависимости: DOCS-4

## Context Pack For This Cycle

- docs/architecture/OVERVIEW.md
- docs/modules/desktop.md

Служебные состояния меняются только командами workflow. Приёмка не архивирует scope.
