# Активный план — Workflow_Pilot

<!-- workflow-state:begin -->
```json
{
  "schema_version": 1,
  "plan_revision": 1262,
  "project_id": "7411e192-943c-4529-bffb-3b081d9c242f",
  "project_name": "Workflow_Pilot",
  "scope_id": "attention-and-closed-plan",
  "execution_scope_status": "ACTIVE",
  "delivery_status": "IN_PROGRESS",
  "objective": "Устранить ложные пользовательские тревоги и ошибку отображения закрытого плана; выпустить три ОС, установить Mac и опубликовать GitHub.",
  "acceptance_criteria": [
    "Внутренние ожидания нейтральны; оранжевое только для необходимого пользовательского действия с инструкцией, без дубликатов.",
    "Корректный закрытый план читается целиком, JSON fences не ломают карточку; факт закрытия не отменяется ошибкой отображения.",
    "Проверенные три ОС, установка или verified pending на Mac, публичный GitHub release."
  ],
  "approved_scope": {
    "functional_paths": [
      "package-lock.json",
      "package.json",
      "release-manifest.json",
      "src/backend/desktop-model.mjs",
      "src/contracts/backend.mjs",
      "src/contracts/dialogue-view.mjs",
      "src/contracts/work-progress.mjs",
      "src/contracts/workflow-plan.mjs",
      "src/control/projects/workspace-deletion.mjs",
      "src/control/projects/workspace-readiness.mjs",
      "src/control/sessions/session-plans.mjs",
      "src/control/sessions/workspace-session.mjs",
      "src/control/workflow/execution-projection.mjs",
      "src/control/workflow/plan-continuation-state.mjs",
      "src/frontend/desktop/ui/current-actions.mjs",
      "src/frontend/desktop/ui/sidebar.mjs",
      "src/frontend/plugin/panel.mjs",
      "tests/automatic-agent-dialogue.test.mjs",
      "tests/backend-desktop-model.test.mjs",
      "tests/chatgpt-plugin.test.mjs",
      "tests/electron-smoke.mjs",
      "tests/fixtures/automatic-agent-dialogue.mjs",
      "tests/panel-dialogue-view.test.mjs",
      "tests/progress.test.mjs",
      "tests/session-plans.test.mjs",
      "tests/sidebar.test.mjs",
      "tests/user-choice-view.test.mjs",
      "tests/workflow-plan.test.mjs",
      "tests/workspace-deletion.test.mjs",
      "tests/workspace-readiness.test.mjs",
      "tests/workspace-session.test.mjs",
      "src/control/workflow/parallel-execution.mjs",
      "tests/parallel-execution.test.mjs",
      "tests/parallel-execution-ui.test.mjs",
      "src/frontend/desktop/ui/index.html",
      "resources/workspace-setup-worker.mjs",
      "tests/workspace-setup.test.mjs",
      "tests/parallel-finalization.test.mjs",
      "tests/work-progress-scenario.test.mjs",
      "tests/fixtures/current-actions-layout.mjs"
    ],
    "documentation_paths": [
      "README.md",
      "docs/architecture/OVERVIEW.md",
      "docs/modules/chatgpt-plugin.md",
      "docs/modules/current-actions.md",
      "docs/modules/desktop.md",
      "docs/modules/project-lifecycle.md",
      "docs/modules/release.md",
      "docs/planning/attention-and-closed-plan.md",
      "docs/modules/orchestrated-execution.md",
      "docs/modules/user-choice.md",
      "docs/modules/sdk-messaging.md"
    ]
  },
  "baseline_commit": "0efc8f46b07646ab27a1a56c1d8cbd0eba74a102",
  "current_task_id": null,
  "context_pack": {
    "documents": [
      {
        "path": "docs/planning/attention-and-closed-plan.md",
        "required": true,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/modules/current-actions.md",
        "required": false,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/modules/sdk-messaging.md",
        "required": false,
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
        "scope_id": "attention-and-closed-plan",
        "task_id": "ATTENTION",
        "role": "implementation"
      },
      "dependencies": [],
      "functional_paths": [
        "src/contracts/work-progress.mjs",
        "src/contracts/dialogue-view.mjs",
        "src/backend/desktop-model.mjs",
        "src/control/workflow/execution-projection.mjs",
        "src/control/projects/workspace-readiness.mjs",
        "src/frontend/desktop/ui/current-actions.mjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/frontend/plugin/panel.mjs",
        "tests/progress.test.mjs",
        "tests/panel-dialogue-view.test.mjs",
        "tests/backend-desktop-model.test.mjs",
        "tests/sidebar.test.mjs",
        "tests/user-choice-view.test.mjs",
        "tests/workspace-readiness.test.mjs",
        "src/control/workflow/parallel-execution.mjs",
        "tests/parallel-execution.test.mjs",
        "tests/parallel-execution-ui.test.mjs",
        "src/frontend/desktop/ui/index.html",
        "tests/parallel-finalization.test.mjs",
        "tests/work-progress-scenario.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "architecture"
      ],
      "id": "ATTENTION",
      "title": "Показывать тревогу только при необходимом действии пользователя",
      "why": "Отделить внутреннее ожидание, решение агента и настоящий пользовательский шаг без изменения транспортной очереди.",
      "verification_kind": "code",
      "acceptance_criteria": [
        "READINESS_BUSY, ожидание O/cleanup и автоматическое восстановление нейтральны; время и технический error сами не создают тревогу.",
        "Оранжевая карточка только для подтверждённого действия пользователя с причиной и исполнимой инструкцией; реальные отказы не скрыты.",
        "Одна карточка в основной панели; now/sidebar не дублируют тревогу; Review и штатные кнопки сохранены.",
        "SDK очередь, grant, Stop, read/acceptance и жизненный цикл не изменены.",
        "Классификация источника attention в parallel-execution, разметка index.html и регрессии его проекции входят в область; техническую блокировку не снимать."
      ],
      "expected_commit_message": "fix: показывать тревогу только при необходимом действии пользователя",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/attention-and-closed-plan.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "task_brief": "Показывать тревогу только при необходимом действии пользователя. Отделить внутреннее ожидание, решение агента и настоящий пользовательский шаг без изменения транспортной очереди. Требования: READINESS_BUSY, ожидание O/cleanup и автоматическое восстановление нейтральны; время и технический error сами не создают тревогу. Оранжевая карточка только для подтверждённого действия пользователя с причиной и исполнимой инструкцией; реальные отказы не скрыты. Одна карточка в основной панели; now/sidebar не дублируют тревогу; Review и штатные кнопки сохранены. SDK очередь, grant, Stop, read/acceptance и жизненный цикл не изменены. Полностью соблюдать docs/planning/attention-and-closed-plan.md и постоянные ограничения AGENTS.md. Не изменять donor, рабочий профиль и пользовательский 001_Test. Проверки: unit-all, architecture. Классификация источника attention в parallel-execution, разметка index.html и регрессии его проекции входят в область; техническую блокировку не снимать.",
      "actual_files": [
        "src/backend/desktop-model.mjs",
        "src/contracts/dialogue-view.mjs",
        "src/contracts/work-progress.mjs",
        "src/control/workflow/execution-projection.mjs",
        "src/control/workflow/parallel-execution.mjs",
        "src/frontend/desktop/ui/current-actions.mjs",
        "src/frontend/desktop/ui/index.html",
        "src/frontend/desktop/ui/sidebar.mjs",
        "tests/panel-dialogue-view.test.mjs",
        "tests/parallel-execution-ui.test.mjs",
        "tests/parallel-execution.test.mjs",
        "tests/parallel-finalization.test.mjs",
        "tests/sidebar.test.mjs",
        "tests/work-progress-scenario.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "attention-and-closed-plan",
        "task_id": "CLOSED",
        "role": "implementation"
      },
      "dependencies": [
        "ATTENTION"
      ],
      "functional_paths": [
        "src/contracts/workflow-plan.mjs",
        "src/backend/desktop-model.mjs",
        "src/control/sessions/session-plans.mjs",
        "src/control/sessions/workspace-session.mjs",
        "src/control/workflow/plan-continuation-state.mjs",
        "src/control/projects/workspace-deletion.mjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "tests/workflow-plan.test.mjs",
        "tests/backend-desktop-model.test.mjs",
        "tests/session-plans.test.mjs",
        "tests/workspace-session.test.mjs",
        "tests/workspace-deletion.test.mjs",
        "tests/sidebar.test.mjs",
        "resources/workspace-setup-worker.mjs",
        "tests/workspace-setup.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "architecture"
      ],
      "id": "CLOSED",
      "title": "Корректно читать и показывать завершённый план",
      "why": "Устранить преждевременный обрыв JSON на Markdown fences и безопасно проецировать архивное состояние.",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Разбирается целый однозначный блок с внутренними fences/экранированием, повреждённый JSON не принимается. Все уязвимые потребители исправлены без нарушения границ слоёв.",
        "Изолированный Git archive fixture подтверждает закрытие, название и реальные статусы четырёх задач; исключение из 001_Test воспроизводится до исправления.",
        "Кэш принадлежит project/workspace/scope/commit; поздние ответы чужого workspace отвергаются. Ошибка чтения не отменяет закрытие, безопасная диагностика отделена от нейтрального UI.",
        "Недоступный Git и восстановление, новый план, restart и неверная схема покрыты. Изменения Kit/installer при необходимости требуют расширить область/проверки до правок.",
        "Исправить также fallback SESSION_REQUIRED в resources/workspace-setup-worker.mjs с tests/workspace-setup.test.mjs; worker не импортирует src."
      ],
      "expected_commit_message": "fix: корректно читать и показывать завершённый план",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/attention-and-closed-plan.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": [
          "ATTENTION"
        ]
      },
      "task_brief": "Корректно читать и показывать завершённый план. Устранить преждевременный обрыв JSON на Markdown fences и безопасно проецировать архивное состояние. Требования: Разбирается целый однозначный блок с внутренними fences/экранированием, повреждённый JSON не принимается. Все уязвимые потребители исправлены без нарушения границ слоёв. Изолированный Git archive fixture подтверждает закрытие, название и реальные статусы четырёх задач; исключение из 001_Test воспроизводится до исправления. Кэш принадлежит project/workspace/scope/commit; поздние ответы чужого workspace отвергаются. Ошибка чтения не отменяет закрытие, безопасная диагностика отделена от нейтрального UI. Недоступный Git и восстановление, новый план, restart и неверная схема покрыты. Изменения Kit/installer при необходимости требуют расширить область/проверки до правок. Полностью соблюдать docs/planning/attention-and-closed-plan.md и постоянные ограничения AGENTS.md. Не изменять donor, рабочий профиль и пользовательский 001_Test. Проверки: unit-all, architecture. Исправить также fallback SESSION_REQUIRED в resources/workspace-setup-worker.mjs с tests/workspace-setup.test.mjs; worker не импортирует src.",
      "actual_files": [
        "resources/workspace-setup-worker.mjs",
        "src/backend/desktop-model.mjs",
        "src/contracts/workflow-plan.mjs",
        "src/control/projects/workspace-deletion.mjs",
        "src/control/sessions/session-plans.mjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "tests/session-plans.test.mjs",
        "tests/sidebar.test.mjs",
        "tests/workflow-plan.test.mjs",
        "tests/workspace-setup.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "attention-and-closed-plan",
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
        "tests/electron-smoke.mjs",
        "tests/automatic-agent-dialogue.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/backend-desktop-model.test.mjs",
        "tests/sidebar.test.mjs",
        "tests/progress.test.mjs",
        "tests/panel-dialogue-view.test.mjs",
        "src/contracts/workflow-plan.mjs",
        "src/backend/desktop-model.mjs",
        "src/frontend/desktop/ui/current-actions.mjs",
        "tests/workflow-plan.test.mjs",
        "src/contracts/dialogue-view.mjs",
        "tests/fixtures/current-actions-layout.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "architecture",
        "electron-smoke",
        "kit-check",
        "kit-assignments"
      ],
      "id": "VERIFY",
      "title": "Проверить сценарии и согласовать версии выпуска",
      "why": "Закрепить пользовательский путь и негативные случаи; обновить app/panel и при необходимости protocol.",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Полный путь backend→панель/sidebar проверен для краткого и длительного ожидания, настоящего действия, закрытия и перезагрузки; нет ложного оранжевого и повторных действий.",
        "Новая свободная возрастающая версия app и immutable panel; несовместимый DTO повышает protocol. Kit/role меняются лишь при изменении их контракта с отдельной upgrade проверкой.",
        "Автоматические fixtures не выдаются за живую ChatGPT или native Windows/Linux приёмку.",
        "Не более двух фоновых чтений недоступного исторического блока; новый явный выбор сессии допускает повтор без бесконечного polling. Загрузка истории не теряет известное закрытие.",
        "При активном пользовательском выборе другая карточка внимания не дублирует оранжевый акцент; остальные рабочие задачи видны нейтрально.",
        "Нейтральное READINESS_BUSY не выводит технический призыв «Повторите проверку»; исходная ошибка доступна диагностике."
      ],
      "expected_commit_message": "fix: проверить сценарии и согласовать версии выпуска",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/attention-and-closed-plan.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": [
          "CLOSED"
        ]
      },
      "task_brief": "Проверить сценарии и согласовать версии выпуска. Закрепить пользовательский путь и негативные случаи; обновить app/panel и при необходимости protocol. Требования: Полный путь backend→панель/sidebar проверен для краткого и длительного ожидания, настоящего действия, закрытия и перезагрузки; нет ложного оранжевого и повторных действий. Новая свободная возрастающая версия app и immutable panel; несовместимый DTO повышает protocol. Kit/role меняются лишь при изменении их контракта с отдельной upgrade проверкой. Автоматические fixtures не выдаются за живую ChatGPT или native Windows/Linux приёмку. Полностью соблюдать docs/planning/attention-and-closed-plan.md и постоянные ограничения AGENTS.md. Не изменять donor, рабочий профиль и пользовательский 001_Test. Проверки: unit-all, architecture, electron-smoke, kit-check, kit-assignments.",
      "actual_files": [
        "package-lock.json",
        "package.json",
        "src/backend/desktop-model.mjs",
        "src/contracts/backend.mjs",
        "src/contracts/dialogue-view.mjs",
        "src/contracts/workflow-plan.mjs",
        "src/frontend/desktop/ui/current-actions.mjs",
        "tests/electron-smoke.mjs",
        "tests/fixtures/current-actions-layout.mjs",
        "tests/panel-dialogue-view.test.mjs",
        "tests/workflow-plan.test.mjs"
      ]
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "attention-and-closed-plan",
        "task_id": "DOCS",
        "role": "implementation"
      },
      "dependencies": [
        "ATTENTION",
        "CLOSED",
        "VERIFY"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/planning/attention-and-closed-plan.md",
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/current-actions.md",
        "docs/modules/desktop.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/project-lifecycle.md",
        "docs/modules/release.md",
        "docs/modules/orchestrated-execution.md",
        "docs/modules/user-choice.md",
        "docs/modules/sdk-messaging.md"
      ],
      "verification_ids": [],
      "id": "DOCS",
      "title": "Актуализация всех документов проекта",
      "why": "Перенести выпущенный контракт в модули, сохранить свидетельства живой приёмки предыдущего выпуска.",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Действующие документы согласованы с результатом и новой версией, прежние противоречивые правила внимания устранены.",
        "Временная spec удалена после переноса с точной Git blob ссылкой; каждый документ в бюджете 28000 байт.",
        "DOCS завершена до любой production сборки; pending live/native явно обозначены.",
        "Согласовать orchestrated-execution, user-choice и sdk-messaging с единым правилом пользовательского внимания."
      ],
      "expected_commit_message": "docs: актуализировать действующие документы",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/attention-and-closed-plan.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": [
          "ATTENTION",
          "CLOSED",
          "VERIFY"
        ]
      },
      "task_brief": "Актуализировать действующие документы. Перенести выпущенный контракт в модули, сохранить свидетельства живой приёмки предыдущего выпуска. Требования: Действующие документы согласованы с результатом и новой версией, прежние противоречивые правила внимания устранены. Временная spec удалена после переноса с точной Git blob ссылкой; каждый документ в бюджете 28000 байт. DOCS завершена до любой production сборки; pending live/native явно обозначены. Полностью соблюдать docs/planning/attention-and-closed-plan.md и постоянные ограничения AGENTS.md. Не изменять donor, рабочий профиль и пользовательский 001_Test. Проверки: схема и состав документационного коммита. Согласовать orchestrated-execution, user-choice и sdk-messaging с единым правилом пользовательского внимания."
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "attention-and-closed-plan",
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
      "title": "Собрать macOS Windows и Linux",
      "why": "Получить полный проверенный комплект из одного sourceCommit.",
      "verification_kind": "package",
      "acceptance_criteria": [
        "Cache preflight без симлинков перед каждой production/package сборкой, Python без bytecode.",
        "Три ОС из одного sourceCommit после DOCS, семь assets, SHA/size/composition и подпись macOS проверены."
      ],
      "expected_commit_message": "delivery: собрать macos windows и linux",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/attention-and-closed-plan.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": [
          "DOCS"
        ]
      },
      "task_brief": "Собрать macOS Windows и Linux. Получить полный проверенный комплект из одного sourceCommit. Требования: Cache preflight без симлинков перед каждой production/package сборкой, Python без bytecode. Три ОС из одного sourceCommit после DOCS, семь assets, SHA/size/composition и подпись macOS проверены. Полностью соблюдать docs/planning/attention-and-closed-plan.md и постоянные ограничения AGENTS.md. Не изменять donor, рабочий профиль и пользовательский 001_Test. Проверки: three-platform-release."
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "attention-and-closed-plan",
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
      "title": "Установить готовый выпуск на этот Mac",
      "why": "Поставить проверенное готовое приложение без пересборки и остановки службы.",
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Штатный installer проверяет Applications и checkout, версии/manifest/подпись и rollback.",
        "При работающей службе verified pending, без stop/restart; установленное и ожидающее состояния честно различены."
      ],
      "expected_commit_message": "delivery: установить готовый выпуск на этот mac",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/attention-and-closed-plan.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": [
          "RELEASE",
          "DOCS"
        ]
      },
      "task_brief": "Установить готовый выпуск на этот Mac. Поставить проверенное готовое приложение без пересборки и остановки службы. Требования: Штатный installer проверяет Applications и checkout, версии/manifest/подпись и rollback. При работающей службе verified pending, без stop/restart; установленное и ожидающее состояния честно различены. Полностью соблюдать docs/planning/attention-and-closed-plan.md и постоянные ограничения AGENTS.md. Не изменять donor, рабочий профиль и пользовательский 001_Test. Проверки: release-installed."
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "attention-and-closed-plan",
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
      "title": "Опубликовать полный выпуск на GitHub",
      "why": "Проверить публичный release и доставку всех assets.",
      "verification_kind": "package",
      "acceptance_criteria": [
        "Tag соответствует sourceCommit, полный комплект проверен по SHA/size; GitHub release опубликован, remote main и итоговый push подтверждены.",
        "Живая приёмка новой версии и native Windows/Linux не объявляются выполненными без факта."
      ],
      "expected_commit_message": "delivery: опубликовать полный выпуск на github",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/attention-and-closed-plan.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": [
          "INSTALL",
          "DOCS"
        ]
      },
      "task_brief": "Опубликовать полный выпуск на GitHub. Проверить публичный release и доставку всех assets. Требования: Tag соответствует sourceCommit, полный комплект проверен по SHA/size; GitHub release опубликован, remote main и итоговый push подтверждены. Живая приёмка новой версии и native Windows/Linux не объявляются выполненными без факта. Полностью соблюдать docs/planning/attention-and-closed-plan.md и постоянные ограничения AGENTS.md. Не изменять donor, рабочий профиль и пользовательский 001_Test. Проверки: github-release."
    }
  ],
  "blocked_reason": null,
  "user_decisions": [
    {
      "id": "20b66b6d-6617-4e13-9d45-a55314def3a0",
      "text": "Пользователь поручил подготовить спецификацию и новый ToDo, согласовать с ревьюером и включить delivery. Публикация плана не запускает реализацию.",
      "recorded_at": "2026-10-27T09:40:16.196Z"
    }
  ],
  "parallel_allowed": false,
  "max_workers": 1,
  "execution_strategy": "sequential",
  "execution_reason": "Внешняя разработка Codex в текущем checkout. Общие backend/UI проекции пересекаются; модельное делегирование запрещено. Claude Review отдельно разрешён."
}
```
<!-- workflow-state:end -->

## Состояние

Execution Scope Status: ACTIVE
Delivery Status: IN_PROGRESS
Scope: attention-and-closed-plan
Current Task: нет
Revision: 1262

## Цель

Устранить ложные пользовательские тревоги и ошибку отображения закрытого плана; выпустить три ОС, установить Mac и опубликовать GitHub.

## Критерии приёмки

- Внутренние ожидания нейтральны; оранжевое только для необходимого пользовательского действия с инструкцией, без дубликатов.
- Корректный закрытый план читается целиком, JSON fences не ломают карточку; факт закрытия не отменяется ошибкой отображения.
- Проверенные три ОС, установка или verified pending на Mac, публичный GitHub release.

## Микрозадачи

Выполнение: sequential; разрешено: false; лимит: 1
Причина: Внешняя разработка Codex в текущем checkout. Общие backend/UI проекции пересекаются; модельное делегирование запрещено. Claude Review отдельно разрешён.

- [DONE] ATTENTION: Показывать тревогу только при необходимом действии пользователя — Завершено
  - Git Commit: [DONE] fix: показывать тревогу только при необходимом действии пользователя
  - Reference: attention-and-closed-plan / ATTENTION / implementation
  - Файлы: src/contracts/work-progress.mjs, src/contracts/dialogue-view.mjs, src/backend/desktop-model.mjs, src/control/workflow/execution-projection.mjs, src/control/projects/workspace-readiness.mjs, src/frontend/desktop/ui/current-actions.mjs, src/frontend/desktop/ui/sidebar.mjs, src/frontend/plugin/panel.mjs, tests/progress.test.mjs, tests/panel-dialogue-view.test.mjs, tests/backend-desktop-model.test.mjs, tests/sidebar.test.mjs, tests/user-choice-view.test.mjs, tests/workspace-readiness.test.mjs, src/control/workflow/parallel-execution.mjs, tests/parallel-execution.test.mjs, tests/parallel-execution-ui.test.mjs, src/frontend/desktop/ui/index.html, tests/parallel-finalization.test.mjs, tests/work-progress-scenario.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] CLOSED: Корректно читать и показывать завершённый план — Завершено
  - Git Commit: [DONE] fix: корректно читать и показывать завершённый план
  - Reference: attention-and-closed-plan / CLOSED / implementation
  - Файлы: src/contracts/workflow-plan.mjs, src/backend/desktop-model.mjs, src/control/sessions/session-plans.mjs, src/control/sessions/workspace-session.mjs, src/control/workflow/plan-continuation-state.mjs, src/control/projects/workspace-deletion.mjs, src/frontend/desktop/ui/sidebar.mjs, tests/workflow-plan.test.mjs, tests/backend-desktop-model.test.mjs, tests/session-plans.test.mjs, tests/workspace-session.test.mjs, tests/workspace-deletion.test.mjs, tests/sidebar.test.mjs, resources/workspace-setup-worker.mjs, tests/workspace-setup.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: ATTENTION
- [DONE] VERIFY: Проверить сценарии и согласовать версии выпуска — Завершено
  - Git Commit: [DONE] fix: проверить сценарии и согласовать версии выпуска
  - Reference: attention-and-closed-plan / VERIFY / implementation
  - Файлы: package.json, package-lock.json, src/contracts/backend.mjs, tests/electron-smoke.mjs, tests/automatic-agent-dialogue.test.mjs, tests/fixtures/automatic-agent-dialogue.mjs, tests/chatgpt-plugin.test.mjs, tests/backend-desktop-model.test.mjs, tests/sidebar.test.mjs, tests/progress.test.mjs, tests/panel-dialogue-view.test.mjs, src/contracts/workflow-plan.mjs, src/backend/desktop-model.mjs, src/frontend/desktop/ui/current-actions.mjs, tests/workflow-plan.test.mjs, src/contracts/dialogue-view.mjs, tests/fixtures/current-actions-layout.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: CLOSED
- [TODO] DOCS: Актуализация всех документов проекта — Ожидает
  - Git Commit: [PENDING] docs: актуализировать действующие документы
  - Reference: attention-and-closed-plan / DOCS / implementation
  - Файлы: docs/planning/attention-and-closed-plan.md, README.md, docs/architecture/OVERVIEW.md, docs/modules/current-actions.md, docs/modules/desktop.md, docs/modules/chatgpt-plugin.md, docs/modules/project-lifecycle.md, docs/modules/release.md, docs/modules/orchestrated-execution.md, docs/modules/user-choice.md, docs/modules/sdk-messaging.md
  - Параллельность: исключительное выполнение
  - Зависимости: ATTENTION, CLOSED, VERIFY
- [TODO] RELEASE: Собрать macOS Windows и Linux — Ожидает
  - Git Commit: [PENDING] delivery: собрать macos windows и linux
  - Reference: attention-and-closed-plan / RELEASE / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: DOCS
- [TODO] INSTALL: Установить готовый выпуск на этот Mac — Ожидает
  - Git Commit: [PENDING] delivery: установить готовый выпуск на этот mac
  - Reference: attention-and-closed-plan / INSTALL / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: RELEASE, DOCS
- [TODO] PUBLISH: Опубликовать полный выпуск на GitHub — Ожидает
  - Git Commit: [PENDING] delivery: опубликовать полный выпуск на github
  - Reference: attention-and-closed-plan / PUBLISH / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: INSTALL, DOCS

## Context Pack For This Cycle

- docs/planning/attention-and-closed-plan.md
- docs/modules/current-actions.md
- docs/modules/sdk-messaging.md
- docs/architecture/OVERVIEW.md

Служебные состояния меняются только командами workflow. Приёмка не архивирует scope.
