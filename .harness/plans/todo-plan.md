# Активный план — Workflow_Pilot

<!-- workflow-state:begin -->
```json
{
  "schema_version": 1,
  "plan_revision": 898,
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
      "src/control/workflow/parallel-execution.mjs"
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
        "path": "docs/planning/work-progress-ui.md",
        "required": true,
        "revision": "418b8c0ddb3cae6706ecdf3f5cf24ae6154a1616"
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
      "implementation_status": "TODO",
      "commit_status": "PENDING",
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
      "parallel_safe": false
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
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
Revision: 898

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
- [TODO] INSTALL: Установить выпуск 0.5.25 — Ожидает
  - Git Commit: [PENDING] release: Установить выпуск 0.5.25
  - Reference: work-progress-ui / INSTALL / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: RELEASE, DOCS
- [TODO] PUBLISH: Опубликовать выпуск 0.5.25 на GitHub — Ожидает
  - Git Commit: [PENDING] release: Опубликовать выпуск 0.5.25 на GitHub
  - Reference: work-progress-ui / PUBLISH / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: INSTALL, DOCS

## Context Pack For This Cycle

- docs/architecture/OVERVIEW.md
- docs/planning/work-progress-ui.md

Служебные состояния меняются только командами workflow. Приёмка не архивирует scope.
