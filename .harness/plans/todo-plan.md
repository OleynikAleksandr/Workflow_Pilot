# Активный план — Workflow_Pilot

<!-- workflow-state:begin -->
```json
{
  "schema_version": 1,
  "plan_revision": 575,
  "project_id": "7411e192-943c-4529-bffb-3b081d9c242f",
  "project_name": "Workflow_Pilot",
  "scope_id": "workflow-pilot-executor-lifecycle-fixes",
  "execution_scope_status": "ACTIVE",
  "delivery_status": "IN_PROGRESS",
  "objective": "Два исполнителя автоматически запускаются без конфликта службы и потери начатого чата; пользователь может убрать или удалить проект независимо от завершения плана.",
  "acceptance_criteria": [
    "Один Start готовит двух исполнителей, автоматически связывает панели и доставляет адресные задания без ручного вмешательства; конкурентная подготовка службы восстанавливается.",
    "Просмотр исполнителя до постоянного URL сохраняет текущую страницу и первоначальную отправку, не открывает пустой чат и не дублирует Send.",
    "Незавершённый/ошибочный план не запрещает убрать проект из приложения или подтвердить удаление репозитория и собственных worktree; связанные операции прекращаются без требования DONE.",
    "Сквозные fixtures, согласованный выпуск трёх ОС, штатная установка и GitHub проверены; реальная автономность и удаление принимаются пользователем отдельно."
  ],
  "approved_scope": {
    "functional_paths": [
      "src/execution/runtime/service.mjs",
      "src/execution/facade.mjs",
      "src/execution/platform/linux/runtime.mjs",
      "tools/codex-app-server-mcp/control.py",
      "src/control/context/context-session.mjs",
      "src/control/context/service.mjs",
      "src/control/context/context-cache.mjs",
      "tests/mac-runtime-switch.test.mjs",
      "tests/mcp-runtime.test.mjs",
      "tests/context-session.test.mjs",
      "tests/context-cache.test.mjs",
      "tests/windows-runtime.test.mjs",
      "tests/linux-runtime.test.mjs",
      "src/backend/desktop-model.mjs",
      "src/control/sessions/service.mjs",
      "src/control/sessions/workspace-session.mjs",
      "src/control/workflow/coordination.mjs",
      "src/execution/browser/session-runtime.mjs",
      "tests/backend-desktop-model.test.mjs",
      "tests/session-runtime.test.mjs",
      "tests/session-opening-performance.test.mjs",
      "tests/backend-native-pages.test.mjs",
      "tests/backend-browser-lifecycle.test.mjs",
      "tests/electron-smoke.mjs",
      "src/control/projects/workspace-deletion.mjs",
      "src/control/projects/lifecycle.mjs",
      "src/control/projects/project-state-cleanup.mjs",
      "src/control/projects/service.mjs",
      "src/control/workflow/parallel-execution.mjs",
      "src/control/workflow/execution-control.mjs",
      "src/control/workflow/command-activity.mjs",
      "src/control/plugin/communication.mjs",
      "src/control/plugin/enrollment.mjs",
      "src/control/settings/service.mjs",
      "src/backend/operations.mjs",
      "src/contracts/backend.mjs",
      "src/frontend/desktop/ui/archive.mjs",
      "src/frontend/desktop/ui/archive.html",
      "tests/workspace-deletion.test.mjs",
      "tests/project-state-cleanup.test.mjs",
      "tests/backend-lifecycle.test.mjs",
      "tests/plugin-communication.test.mjs",
      "src/control/workflow/execution-projection.mjs",
      "src/control/plugin/workflow-channel.mjs",
      "src/frontend/desktop/ui/sidebar.mjs",
      "tests/automatic-agent-dialogue.test.mjs",
      "tests/fixtures/automatic-agent-dialogue.mjs",
      "tests/executor-startup-lifecycle.test.mjs",
      "tests/parallel-execution-ui.test.mjs",
      "tests/sidebar.test.mjs",
      "tests/backend-end-to-end.test.mjs",
      "package.json",
      "package-lock.json",
      "tests/backend-upgrade.test.mjs",
      "tools/codex-app-server-mcp/plugin.py",
      "release-manifest.json",
      "src/control/sessions/session-plans.mjs",
      "tests/session-plans.test.mjs",
      "src/control/facade.mjs",
      "src/control/projects/workspace-setup.mjs",
      "src/control/workflow/parallel-kit.mjs",
      "src/execution/commands/service.mjs",
      "src/execution/runtime/project-commands.mjs",
      "tools/codex-app-server-mcp/server.py",
      "tests/execution-commands.test.mjs",
      "tests/project-command-removal.test.mjs",
      "tests/codex-app-server-mcp.test.mjs",
      "tests/parallel-execution-recovery.test.mjs",
      "src/backend/bootstrap.mjs",
      "tests/backend-bootstrap.test.mjs",
      "tests/execution-facade.test.mjs",
      "tests/parallel-execution-smoke-fixture.cjs",
      "tests/workflow-channel.test.mjs"
    ],
    "documentation_paths": [
      "docs/planning/executor-startup-and-removal.md",
      "README.md",
      "docs/architecture/OVERVIEW.md",
      "docs/modules/execution.md",
      "docs/modules/desktop.md",
      "docs/modules/backend.md",
      "docs/modules/browser.md",
      "docs/modules/orchestrated-execution.md",
      "docs/modules/workflow-execution.md",
      "docs/modules/project-lifecycle.md",
      "docs/modules/chatgpt-plugin.md",
      "docs/modules/automatic-agent-dialogue-acceptance.md",
      "docs/modules/release.md",
      "docs/planning/executor-readiness-recovery.md"
    ]
  },
  "baseline_commit": "61ddf89fd5827e0643136cd9fc3ed86dbcac21e5",
  "current_task_id": null,
  "context_pack": {
    "documents": [
      {
        "path": "docs/architecture/OVERVIEW.md",
        "required": true,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/planning/executor-startup-and-removal.md",
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
        "scope_id": "workflow-pilot-executor-lifecycle-fixes",
        "task_id": "T001",
        "role": "implementation"
      },
      "dependencies": [],
      "functional_paths": [
        "src/execution/runtime/service.mjs",
        "src/execution/facade.mjs",
        "src/execution/platform/linux/runtime.mjs",
        "tools/codex-app-server-mcp/control.py",
        "src/control/context/context-session.mjs",
        "src/control/context/service.mjs",
        "src/control/context/context-cache.mjs",
        "tests/mac-runtime-switch.test.mjs",
        "tests/mcp-runtime.test.mjs",
        "tests/context-session.test.mjs",
        "tests/context-cache.test.mjs",
        "tests/windows-runtime.test.mjs",
        "tests/linux-runtime.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "architecture"
      ],
      "id": "T001",
      "title": "Устранить конфликт подготовки общей службы",
      "why": "Два исполнителя должны дождаться общей готовности без отказа lifecycle lock.",
      "parallel_safe": false,
      "verification_kind": "code",
      "acceptance_criteria": [
        "Параллельные полные ensure, ensureMcpOnly и проверки состояния согласованы существующим runtime; два и пять потребителей не вызывают конкурирующие lifecycle-команды и лишние перезапуски.",
        "Внешняя временная блокировка имеет машинный код и ограниченное безопасное ожидание; ownership/исключительная блокировка сохранены, тайм-аут и настоящие ошибки различимы.",
        "Подготовка после временной занятости продолжается автоматически до первой отправки; Stop/смена поколения исключают поздний запуск, поздний прогрев не затирает отправку.",
        "Sending/sent/unknown, bootstrap и рабочие сообщения не воспроизводятся. Fixtures проверяют конкурентность, освобождение/тайм-аут и отмену на фактических платформенных путях без живых служб."
      ],
      "expected_commit_message": "fix: Устранить конфликт подготовки общей службы",
      "context_pack": {
        "documents": [
          {
            "path": "docs/modules/execution.md",
            "required": true
          }
        ]
      },
      "actual_files": [
        "src/control/context/context-session.mjs",
        "src/execution/runtime/service.mjs",
        "tests/context-session.test.mjs",
        "tests/mac-runtime-switch.test.mjs",
        "tools/codex-app-server-mcp/control.py"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-executor-lifecycle-fixes",
        "task_id": "T002",
        "role": "implementation"
      },
      "dependencies": [
        "T001"
      ],
      "functional_paths": [
        "src/backend/desktop-model.mjs",
        "src/control/sessions/service.mjs",
        "src/control/sessions/workspace-session.mjs",
        "src/control/context/context-session.mjs",
        "src/control/workflow/coordination.mjs",
        "src/execution/browser/session-runtime.mjs",
        "tests/backend-desktop-model.test.mjs",
        "tests/session-runtime.test.mjs",
        "tests/context-session.test.mjs",
        "tests/session-opening-performance.test.mjs",
        "tests/backend-native-pages.test.mjs",
        "tests/backend-browser-lifecycle.test.mjs",
        "tests/electron-smoke.mjs",
        "src/control/sessions/session-plans.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/session-plans.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "architecture",
        "electron-smoke"
      ],
      "id": "T002",
      "title": "Сохранять начатый разговор при выборе исполнителя",
      "why": "Открытие карточки не должно заменять работающий чат пустой страницей до сохранения URL.",
      "parallel_safe": false,
      "verification_kind": "code",
      "acceptance_criteria": [
        "Обычный выбор сессии и открытие из задачи показывают существующую backend-страницу во время подготовки, sending, busy и временного URL; отсутствие chatUrl не отправляет её на главную.",
        "Постоянный URL привязывается к исходной сессии/назначению; выбор не отменяет наблюдение, не теряет черновик и не дублирует первоначальный контекст.",
        "Restart/crash с неизвестным адресом не превращается в повтор Send; явная перезагрузка/новый чат, чужая identity и остановленный план имеют отдельные исходы.",
        "Регрессия проходит пользовательский обработчик выбора между отправкой и постоянным URL, повторные переключения и native/HTTP для O Chat/Work и Chat-исполнителей."
      ],
      "expected_commit_message": "fix: Сохранять начатый разговор при выборе исполнителя",
      "context_pack": {
        "documents": [
          {
            "path": "docs/modules/desktop.md",
            "required": true
          },
          {
            "path": "docs/modules/browser.md",
            "required": true
          }
        ]
      },
      "actual_files": [
        "src/backend/desktop-model.mjs",
        "src/control/sessions/service.mjs",
        "src/control/sessions/session-plans.mjs",
        "tests/electron-smoke.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/session-plans.test.mjs",
        "tests/session-runtime.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-executor-lifecycle-fixes",
        "task_id": "T003",
        "role": "implementation"
      },
      "dependencies": [
        "T002"
      ],
      "functional_paths": [
        "src/control/projects/workspace-deletion.mjs",
        "src/control/projects/lifecycle.mjs",
        "src/control/projects/project-state-cleanup.mjs",
        "src/control/projects/service.mjs",
        "src/control/sessions/workspace-session.mjs",
        "src/control/sessions/service.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/parallel-execution.mjs",
        "src/control/workflow/execution-control.mjs",
        "src/control/workflow/command-activity.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/enrollment.mjs",
        "src/control/settings/service.mjs",
        "src/execution/facade.mjs",
        "src/execution/runtime/service.mjs",
        "src/backend/desktop-model.mjs",
        "src/backend/operations.mjs",
        "src/contracts/backend.mjs",
        "src/frontend/desktop/ui/archive.mjs",
        "src/frontend/desktop/ui/archive.html",
        "tests/workspace-deletion.test.mjs",
        "tests/project-state-cleanup.test.mjs",
        "tests/backend-lifecycle.test.mjs",
        "tests/backend-desktop-model.test.mjs",
        "tests/plugin-communication.test.mjs",
        "tests/electron-smoke.mjs",
        "src/control/facade.mjs",
        "src/control/projects/workspace-setup.mjs",
        "src/control/workflow/parallel-kit.mjs",
        "src/execution/commands/service.mjs",
        "src/execution/runtime/project-commands.mjs",
        "tools/codex-app-server-mcp/server.py",
        "tests/execution-commands.test.mjs",
        "tests/project-command-removal.test.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/parallel-execution-recovery.test.mjs",
        "src/backend/bootstrap.mjs",
        "tests/backend-bootstrap.test.mjs",
        "tests/execution-facade.test.mjs",
        "tests/parallel-execution-smoke-fixture.cjs",
        "tests/workflow-channel.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "architecture",
        "electron-smoke",
        "executor-channel"
      ],
      "id": "T003",
      "title": "Удалять проекты с незавершёнными назначениями",
      "why": "Решение пользователя прекратить и удалить проект не требует выполнения ошибочного плана.",
      "parallel_safe": false,
      "verification_kind": "code",
      "acceptance_criteria": [
        "Preview и подтверждение доступны при незавершённом плане/назначении и dirty worktree. Убрать из списка сохраняет папки; Удалить с диска после подтверждения удаляет выбранный репозиторий и все подтверждённо принадлежащие worktree.",
        "Подтверждённое удаление адресно прекращает связанную работу/команды/серверы и отзывает связь; пользователь не должен завершать задачи или просить агента остановить session ID. Общая служба и соседние проекты продолжают работу.",
        "Удаление не подделывает DONE/INTEGRATED, UNKNOWN не повторяется; сохраняемый журнал намерения и recovery продолжают частичную очистку после restart, без ложного успеха.",
        "Очищены родитель/исполнители, executionControl и прочие настройки, watchers/cache, действующие регистрации и очереди проекта; поздний callback и последующий запуск не восстанавливают записи.",
        "Подтверждение показывает точные цели/потерю незакоммиченного; принадлежность, защита пути/симлинков/чужих процессов и повторная проверка identity сохранены. Реальная ошибка доступа объясняется конкретно, не требованием завершить план.",
        "Fixtures проходят действия архива для завершённого/застрявшего проекта, busy/dirty/unknown, пропавшего worktree, отмены подтверждения, подмены пути, частичного сбоя и restart; рабочий профиль не затрагивается."
      ],
      "expected_commit_message": "fix: Удалять проекты с незавершёнными назначениями",
      "context_pack": {
        "documents": [
          {
            "path": "docs/modules/project-lifecycle.md",
            "required": true
          },
          {
            "path": "docs/modules/backend.md",
            "required": true
          }
        ]
      },
      "actual_files": [
        "src/backend/bootstrap.mjs",
        "src/backend/desktop-model.mjs",
        "src/control/facade.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/enrollment.mjs",
        "src/control/projects/lifecycle.mjs",
        "src/control/projects/project-state-cleanup.mjs",
        "src/control/projects/service.mjs",
        "src/control/projects/workspace-deletion.mjs",
        "src/control/projects/workspace-setup.mjs",
        "src/control/sessions/workspace-session.mjs",
        "src/control/workflow/command-activity.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/parallel-execution.mjs",
        "src/execution/commands/service.mjs",
        "src/execution/facade.mjs",
        "src/frontend/desktop/ui/archive.html",
        "src/frontend/desktop/ui/archive.mjs",
        "tests/backend-bootstrap.test.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/electron-smoke.mjs",
        "tests/execution-facade.test.mjs",
        "tests/parallel-execution-recovery.test.mjs",
        "tests/parallel-execution-smoke-fixture.cjs",
        "tests/project-state-cleanup.test.mjs",
        "tests/workflow-channel.test.mjs",
        "tests/workspace-deletion.test.mjs",
        "tools/codex-app-server-mcp/server.py",
        "src/execution/runtime/project-commands.mjs",
        "tests/project-command-removal.test.mjs"
      ]
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-executor-lifecycle-fixes",
        "task_id": "T004",
        "role": "implementation"
      },
      "dependencies": [
        "T003"
      ],
      "functional_paths": [
        "src/control/workflow/execution-projection.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/plugin/workflow-channel.mjs",
        "src/backend/desktop-model.mjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/contracts/backend.mjs",
        "tests/automatic-agent-dialogue.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs",
        "tests/executor-startup-lifecycle.test.mjs",
        "tests/parallel-execution-ui.test.mjs",
        "tests/sidebar.test.mjs",
        "tests/backend-end-to-end.test.mjs",
        "tests/electron-smoke.mjs",
        "package.json",
        "package-lock.json",
        "tests/backend-upgrade.test.mjs",
        "tools/codex-app-server-mcp/plugin.py"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "architecture",
        "electron-smoke",
        "executor-channel",
        "chatgpt-plugin"
      ],
      "id": "T004",
      "title": "Проверить полный сценарий и подготовить исправленный выпуск",
      "why": "Проверить интеграцию найденных ошибок через пользовательские входы и согласовать следующий релиз.",
      "parallel_safe": false,
      "verification_kind": "code",
      "acceptance_criteria": [
        "Карточка различает подготовку службы, ожидание постоянного адреса, регистрацию, SDK/bind и рабочее уведомление; действующий bootstrap не описывается общей Паузой и ready страницы не означает готовность панели.",
        "Start двух новых исполнителей проходит настоящие runtime/Control/backend/SDK/MCP пути с подставленным физическим хостом/моделью; без ручных панелей, ID/Enable и рабочих DOM-дублей.",
        "Сквозной тест воспроизводит выбор во время временного URL, доставку в правильные разговоры, завершение и отдельное удаление застрявшего проекта без влияния на соседний.",
        "Следующий свободный номер проверен, app/backend/panel/MCP согласованы, URI HTML зависит от содержимого. Kit сохраняет 1.8.2; при необходимости его изменения до них уточнить план и назначить kit-check.",
        "Подготовлены повторные живые опыты: один Start без посещения исполнителей, выбор при создании разговора и удаление незавершённого проекта. Fixtures не выдаются за PASS ChatGPT."
      ],
      "expected_commit_message": "fix: Проверить полный сценарий и подготовить исправленный выпуск",
      "context_pack": {
        "documents": [
          {
            "path": "docs/modules/chatgpt-plugin.md",
            "required": true
          },
          {
            "path": "docs/modules/automatic-agent-dialogue-acceptance.md",
            "required": true
          }
        ]
      }
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-executor-lifecycle-fixes",
        "task_id": "DOCS",
        "role": "implementation"
      },
      "dependencies": [
        "T001",
        "T002",
        "T003",
        "T004"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/planning/executor-startup-and-removal.md",
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/execution.md",
        "docs/modules/desktop.md",
        "docs/modules/backend.md",
        "docs/modules/browser.md",
        "docs/modules/orchestrated-execution.md",
        "docs/modules/workflow-execution.md",
        "docs/modules/project-lifecycle.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/automatic-agent-dialogue-acceptance.md",
        "docs/modules/release.md",
        "docs/planning/executor-readiness-recovery.md"
      ],
      "verification_ids": [],
      "id": "DOCS",
      "title": "Актуализация всех документов проекта",
      "why": "Сохранить компактные актуальные контракты перед сборкой.",
      "parallel_safe": false,
      "verification_kind": "code",
      "acceptance_criteria": [
        "Документы описывают окончательную подготовку службы, сохранение живого чата, стадии запуска и удаление по решению пользователя без требования DONE.",
        "Действующий контракт перенесён из временной спецификации в модули; спецификация удалена с точным Git blob для required context. Невыполненное из смежных follow-up сохранено.",
        "Предыдущий S1 FAIL и новая ещё не выполненная приёмка различены; инструкции, ошибки и пользовательские действия согласованы, документы не более 28000 байт UTF-8."
      ],
      "expected_commit_message": "docs: Актуализация всех документов проекта",
      "context_pack": {
        "documents": []
      }
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-executor-lifecycle-fixes",
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
      "title": "Собрать единый исправленный выпуск",
      "why": "Подготовить проверенный комплект трёх ОС.",
      "parallel_safe": false,
      "verification_kind": "package",
      "acceptance_criteria": [
        "После DOCS собраны macOS arm64, Windows x64 и Linux x64 из одного sourceCommit; проверены состав, подпись, архивы, размеры и digests.",
        "Перед каждой production-сборкой проверены и удалены только Python-кэши tools/codex-app-server-mcp без перехода по симлинкам; строгая проверка extra-resource сохранена."
      ],
      "expected_commit_message": "release: Собрать единый исправленный выпуск",
      "context_pack": {
        "documents": [
          {
            "path": "docs/modules/release.md",
            "required": true
          }
        ]
      }
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-executor-lifecycle-fixes",
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
      "why": "Доставить проверенную копию в Applications без вмешательства в работающую службу.",
      "parallel_safe": false,
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Штатный installer устанавливает готовый распакованный bundle в собственные копии и /Applications/Workflow Pilot.app без пересборки/переподписи; версия, manifest, подпись и rollback проверены.",
        "Окна/служба не закрываются агентом; при работающем backend проверенный pending отличён от установленной активной версии, переключение делает пользователь."
      ],
      "expected_commit_message": "release: Установить готовый macOS-комплект",
      "context_pack": {
        "documents": [
          {
            "path": "docs/modules/release.md",
            "required": true
          }
        ]
      }
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-executor-lifecycle-fixes",
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
      "title": "Опубликовать выпуск и передать повторную проверку",
      "why": "Завершить поставку с честной границей живой приёмки.",
      "parallel_safe": false,
      "verification_kind": "package",
      "acceptance_criteria": [
        "Собственный GitHub Release опубликован с тегом на sourceCommit, полным комплектом и проверенными digest/размерами; remote main подтверждён, пересборки нет.",
        "Пользователь получает статус установки и три конкретных опыта: автоматический запуск, выбор исполнителя при создании чата и удаление незавершённого проекта. Непроверенные S1–S3 не объявлены PASS; scope не архивируется автоматически."
      ],
      "expected_commit_message": "release: Опубликовать выпуск и передать повторную проверку",
      "context_pack": {
        "documents": [
          {
            "path": "docs/modules/release.md",
            "required": true
          }
        ]
      }
    }
  ],
  "blocked_reason": null,
  "user_decisions": [
    {
      "id": "7151d2cf-82d2-4189-a46d-41b16b4a71c8",
      "text": "Прямые поручения пользователя 19.10.2026: закрыть прежний scope, открыть отдельный scope исправления найденных ошибок и включить возможность удаления незавершённых рабочих проектов. Здесь подготовлены спецификация и план для самостоятельной последовательной реализации; task:start, сборка и публикация сейчас не запускаются. Отдельное поручение убрать тестовый проект из приложения выполнено как обслуживание профиля, не как реализация этой задачи.",
      "recorded_at": "2026-10-19T12:58:24.471Z"
    }
  ],
  "parallel_allowed": false,
  "max_workers": 1,
  "execution_strategy": "sequential",
  "execution_reason": "Действующий AGENTS.md предписывает работать самостоятельно; сохраняется выбранная пользователем работа здесь одним агентом. Исправления затрагивают общие runtime/session/lifecycle-контракты, поэтому последовательны. Несколько исполнителей относятся только к продуктовым fixtures и живой приёмке."
}
```
<!-- workflow-state:end -->

## Состояние

Execution Scope Status: ACTIVE
Delivery Status: IN_PROGRESS
Scope: workflow-pilot-executor-lifecycle-fixes
Current Task: нет
Revision: 575

## Цель

Два исполнителя автоматически запускаются без конфликта службы и потери начатого чата; пользователь может убрать или удалить проект независимо от завершения плана.

## Критерии приёмки

- Один Start готовит двух исполнителей, автоматически связывает панели и доставляет адресные задания без ручного вмешательства; конкурентная подготовка службы восстанавливается.
- Просмотр исполнителя до постоянного URL сохраняет текущую страницу и первоначальную отправку, не открывает пустой чат и не дублирует Send.
- Незавершённый/ошибочный план не запрещает убрать проект из приложения или подтвердить удаление репозитория и собственных worktree; связанные операции прекращаются без требования DONE.
- Сквозные fixtures, согласованный выпуск трёх ОС, штатная установка и GitHub проверены; реальная автономность и удаление принимаются пользователем отдельно.

## Микрозадачи

Выполнение: sequential; разрешено: false; лимит: 1
Причина: Действующий AGENTS.md предписывает работать самостоятельно; сохраняется выбранная пользователем работа здесь одним агентом. Исправления затрагивают общие runtime/session/lifecycle-контракты, поэтому последовательны. Несколько исполнителей относятся только к продуктовым fixtures и живой приёмке.

- [DONE] T001: Устранить конфликт подготовки общей службы — Завершено
  - Git Commit: [DONE] fix: Устранить конфликт подготовки общей службы
  - Reference: workflow-pilot-executor-lifecycle-fixes / T001 / implementation
  - Файлы: src/execution/runtime/service.mjs, src/execution/facade.mjs, src/execution/platform/linux/runtime.mjs, tools/codex-app-server-mcp/control.py, src/control/context/context-session.mjs, src/control/context/service.mjs, src/control/context/context-cache.mjs, tests/mac-runtime-switch.test.mjs, tests/mcp-runtime.test.mjs, tests/context-session.test.mjs, tests/context-cache.test.mjs, tests/windows-runtime.test.mjs, tests/linux-runtime.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] T002: Сохранять начатый разговор при выборе исполнителя — Завершено
  - Git Commit: [DONE] fix: Сохранять начатый разговор при выборе исполнителя
  - Reference: workflow-pilot-executor-lifecycle-fixes / T002 / implementation
  - Файлы: src/backend/desktop-model.mjs, src/control/sessions/service.mjs, src/control/sessions/workspace-session.mjs, src/control/context/context-session.mjs, src/control/workflow/coordination.mjs, src/execution/browser/session-runtime.mjs, tests/backend-desktop-model.test.mjs, tests/session-runtime.test.mjs, tests/context-session.test.mjs, tests/session-opening-performance.test.mjs, tests/backend-native-pages.test.mjs, tests/backend-browser-lifecycle.test.mjs, tests/electron-smoke.mjs, src/control/sessions/session-plans.mjs, tests/fixtures/automatic-agent-dialogue.mjs, tests/session-plans.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: T001
- [DONE] T003: Удалять проекты с незавершёнными назначениями — Завершено
  - Git Commit: [DONE] fix: Удалять проекты с незавершёнными назначениями
  - Reference: workflow-pilot-executor-lifecycle-fixes / T003 / implementation
  - Файлы: src/control/projects/workspace-deletion.mjs, src/control/projects/lifecycle.mjs, src/control/projects/project-state-cleanup.mjs, src/control/projects/service.mjs, src/control/sessions/workspace-session.mjs, src/control/sessions/service.mjs, src/control/workflow/coordination.mjs, src/control/workflow/parallel-execution.mjs, src/control/workflow/execution-control.mjs, src/control/workflow/command-activity.mjs, src/control/plugin/communication.mjs, src/control/plugin/enrollment.mjs, src/control/settings/service.mjs, src/execution/facade.mjs, src/execution/runtime/service.mjs, src/backend/desktop-model.mjs, src/backend/operations.mjs, src/contracts/backend.mjs, src/frontend/desktop/ui/archive.mjs, src/frontend/desktop/ui/archive.html, tests/workspace-deletion.test.mjs, tests/project-state-cleanup.test.mjs, tests/backend-lifecycle.test.mjs, tests/backend-desktop-model.test.mjs, tests/plugin-communication.test.mjs, tests/electron-smoke.mjs, src/control/facade.mjs, src/control/projects/workspace-setup.mjs, src/control/workflow/parallel-kit.mjs, src/execution/commands/service.mjs, src/execution/runtime/project-commands.mjs, tools/codex-app-server-mcp/server.py, tests/execution-commands.test.mjs, tests/project-command-removal.test.mjs, tests/codex-app-server-mcp.test.mjs, tests/parallel-execution-recovery.test.mjs, src/backend/bootstrap.mjs, tests/backend-bootstrap.test.mjs, tests/execution-facade.test.mjs, tests/parallel-execution-smoke-fixture.cjs, tests/workflow-channel.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: T002
- [TODO] T004: Проверить полный сценарий и подготовить исправленный выпуск — Ожидает
  - Git Commit: [PENDING] fix: Проверить полный сценарий и подготовить исправленный выпуск
  - Reference: workflow-pilot-executor-lifecycle-fixes / T004 / implementation
  - Файлы: src/control/workflow/execution-projection.mjs, src/control/workflow/coordination.mjs, src/control/plugin/workflow-channel.mjs, src/backend/desktop-model.mjs, src/frontend/desktop/ui/sidebar.mjs, src/contracts/backend.mjs, tests/automatic-agent-dialogue.test.mjs, tests/fixtures/automatic-agent-dialogue.mjs, tests/executor-startup-lifecycle.test.mjs, tests/parallel-execution-ui.test.mjs, tests/sidebar.test.mjs, tests/backend-end-to-end.test.mjs, tests/electron-smoke.mjs, package.json, package-lock.json, tests/backend-upgrade.test.mjs, tools/codex-app-server-mcp/plugin.py
  - Параллельность: исключительное выполнение
  - Зависимости: T003
- [TODO] DOCS: Актуализация всех документов проекта — Ожидает
  - Git Commit: [PENDING] docs: Актуализация всех документов проекта
  - Reference: workflow-pilot-executor-lifecycle-fixes / DOCS / implementation
  - Файлы: docs/planning/executor-startup-and-removal.md, README.md, docs/architecture/OVERVIEW.md, docs/modules/execution.md, docs/modules/desktop.md, docs/modules/backend.md, docs/modules/browser.md, docs/modules/orchestrated-execution.md, docs/modules/workflow-execution.md, docs/modules/project-lifecycle.md, docs/modules/chatgpt-plugin.md, docs/modules/automatic-agent-dialogue-acceptance.md, docs/modules/release.md, docs/planning/executor-readiness-recovery.md
  - Параллельность: исключительное выполнение
  - Зависимости: T001, T002, T003, T004
- [TODO] RELEASE: Собрать единый исправленный выпуск — Ожидает
  - Git Commit: [PENDING] release: Собрать единый исправленный выпуск
  - Reference: workflow-pilot-executor-lifecycle-fixes / RELEASE / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: DOCS
- [TODO] INSTALL: Установить готовый macOS-комплект — Ожидает
  - Git Commit: [PENDING] release: Установить готовый macOS-комплект
  - Reference: workflow-pilot-executor-lifecycle-fixes / INSTALL / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: RELEASE, DOCS
- [TODO] PUBLISH: Опубликовать выпуск и передать повторную проверку — Ожидает
  - Git Commit: [PENDING] release: Опубликовать выпуск и передать повторную проверку
  - Reference: workflow-pilot-executor-lifecycle-fixes / PUBLISH / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: INSTALL, DOCS

## Context Pack For This Cycle

- docs/architecture/OVERVIEW.md
- docs/planning/executor-startup-and-removal.md

Служебные состояния меняются только командами workflow. Приёмка не архивирует scope.
