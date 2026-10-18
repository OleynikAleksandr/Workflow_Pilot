# Активный план — Workflow_Pilot

<!-- workflow-state:begin -->
```json
{
  "schema_version": 1,
  "plan_revision": 472,
  "project_id": "7411e192-943c-4529-bffb-3b081d9c242f",
  "project_name": "Workflow_Pilot",
  "scope_id": "workflow-pilot-native-startup-fixes",
  "execution_scope_status": "ACTIVE",
  "delivery_status": "IN_PROGRESS",
  "objective": "Workflow Pilot 0.5.2: восстановимый запуск плана, проверка старых операций до планирования, отсутствие дублей Dock и белой вспышки, актуальное представление Review.",
  "acceptance_criteria": [
    "Один видимый Workflow Pilot в штатном запуске macOS, один backend; новые дубли Dock/recent-apps не создаются.",
    "Первый показ и повторное открытие окна без светлой вспышки в тёмной теме, с работоспособным состоянием ожидания и ошибок.",
    "Строка и зелёная галочка о PUBLISHED скрыты, текущий Review и его ошибки остаются видимыми; review state не очищается.",
    "Закрытие окна не завершает backend, не перезагружает живые страницы; проверки, DOCS, три платформы, macOS installer и GitHub Release завершены с честным указанием pending ручной приёмки/установки.",
    "Нет зависшего pausing при неизвестной операции без активной работы; разбор доступен и восстановление не запускает задания автоматически.",
    "Проблемы прошлых операций разбираются до нового планирования; признанная история не блокирует новый scope. Живые writers общих файлов и новые ошибки текущего плана сохраняют предметную защиту.",
    "Совместимый Kit 1.8.2 включён в поставку 0.5.2; Electron/Node без обновления."
  ],
  "approved_scope": {
    "functional_paths": [
      "src/control/workflow/parallel-execution.mjs",
      "src/control/workflow/execution-control.mjs",
      "src/control/workflow/coordination.mjs",
      "src/control/workflow/command-activity.mjs",
      "src/control/workflow/parallel-kit.mjs",
      "src/control/projects/lifecycle.mjs",
      "src/backend/desktop-model.mjs",
      "src/frontend/desktop/ui/sidebar.mjs",
      "src/frontend/desktop/ui/index.html",
      "tests/parallel-execution.test.mjs",
      "tests/execution-control.test.mjs",
      "tests/command-activity.test.mjs",
      "tests/sidebar.test.mjs",
      "tests/orchestrated-execution.test.mjs",
      "tools/codex-app-server-mcp/server.py",
      "src/control/workflow/plan-review.mjs",
      "src/control/sessions/session-plans.mjs",
      "src/control/sessions/conversation-recovery.mjs",
      "packages/workflow-kit/src/lib/command-activity.mjs",
      "packages/workflow-kit/src/lib/actions.mjs",
      "packages/workflow-kit/src/lib/simple-workflow.mjs",
      "packages/workflow-kit/src/lib/plan-review.mjs",
      "packages/workflow-kit/src/lib/recovery.mjs",
      "packages/workflow-kit/src/lib/command-help.mjs",
      "packages/workflow-kit/package.json",
      "packages/workflow-kit/scripts/check-command-activity-fixture.mjs",
      "packages/workflow-kit/scripts/check-previous-upgrade-fixture.mjs",
      "packages/workflow-kit/scripts/check-plan-review-fixture.mjs",
      "package.json",
      "package-lock.json",
      "tests/codex-app-server-mcp.test.mjs",
      "tests/session-plans.test.mjs",
      "tests/plan-review.test.mjs",
      "scripts/check-workflow-kit-dependency.mjs",
      "scripts/check-workflow-kit-staging.mjs",
      "scripts/check-workflow-kit-archive.mjs",
      "src/main.mjs",
      "src/contracts/launch.mjs",
      "src/frontend/desktop/client.mjs",
      "src/backend/main.mjs",
      "src/backend/diagnostics.mjs",
      "resources/mac-permissions.plist",
      "tests/backend-launcher.test.mjs",
      "tests/backend-native-window.test.mjs",
      "tests/backend-upgrade.test.mjs",
      "tests/backend-owner-recovery.test.mjs",
      "tests/backend-diagnostics.test.mjs",
      "src/frontend/desktop/ui/browser-view.html",
      "src/frontend/desktop/ui/browser-view.mjs",
      "src/execution/browser/backend-host.mjs",
      "src/execution/browser/chatgpt-colors.mjs",
      "src/contracts/browser.mjs",
      "tests/native-startup-theme.test.mjs",
      "tests/backend-native-pages.test.mjs",
      "tests/desktop-client.test.mjs",
      "src/frontend/plugin/index.html",
      "tests/release-all.test.mjs",
      "tests/release-mac.test.mjs",
      "src/frontend/plugin/app.mjs",
      "release-manifest.json",
      "scripts/prepare-mac-toolchain.mjs",
      "scripts/release-mac.mjs",
      "scripts/release-package.mjs",
      "scripts/release-archive.mjs",
      "scripts/sign-mac-bundle.mjs",
      "src/control/projects/workspace-setup.mjs",
      "src/control/workflow/execution-projection.mjs",
      "packages/workflow-kit/src/lib/task-assignment.mjs",
      "packages/workflow-kit/scripts/check-task-assignment-fixture.mjs",
      "tests/mac-toolchain.test.mjs",
      "tests/sign-mac-bundle.test.mjs",
      "tests/parallel-execution-recovery.test.mjs",
      "tests/parallel-execution-ui.test.mjs"
    ],
    "documentation_paths": [
      "docs/acceptance/backend-independence.md",
      "README.md",
      "docs/architecture/OVERVIEW.md",
      "docs/modules/native-window.md",
      "docs/modules/backend.md",
      "docs/modules/desktop.md",
      "docs/modules/browser.md",
      "docs/modules/release.md",
      "docs/planning/native-startup-followup.md",
      "docs/modules/workflow-execution.md",
      "docs/modules/chatgpt-plugin.md",
      "docs/planning/plan-start-recovery.md",
      "packages/workflow-kit/src/templates/PLAN.md",
      "packages/workflow-kit/src/templates/SPEC.md",
      "packages/workflow-kit/src/templates/CONTINUE.md",
      "docs/modules/orchestrated-execution.md",
      "docs/modules/execution.md",
      "docs/modules/project-lifecycle.md"
    ]
  },
  "baseline_commit": "b17ed180c3871809e8f5d613ed128d24cf375cc4",
  "current_task_id": null,
  "context_pack": {
    "documents": [
      {
        "path": "docs/planning/native-startup-followup.md",
        "required": true,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/architecture/OVERVIEW.md",
        "required": true,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/planning/plan-start-recovery.md",
        "required": true,
        "revision": "WORKTREE"
      }
    ],
    "include_last_completed_task": false,
    "dependency_task_ids": []
  },
  "tasks": [
    {
      "id": "T000A",
      "title": "Устранить зависшую паузу и открыть разбор неизвестных операций",
      "why": "Устранить зависшую паузу и открыть разбор неизвестных операций",
      "dependencies": [],
      "functional_paths": [
        "src/control/workflow/parallel-execution.mjs",
        "src/control/workflow/execution-control.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/workflow/command-activity.mjs",
        "src/control/workflow/parallel-kit.mjs",
        "src/control/projects/lifecycle.mjs",
        "src/backend/desktop-model.mjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/frontend/desktop/ui/index.html",
        "tests/parallel-execution.test.mjs",
        "tests/execution-control.test.mjs",
        "tests/command-activity.test.mjs",
        "tests/sidebar.test.mjs",
        "tests/orchestrated-execution.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/plan-start-recovery.md"
      ],
      "verification_ids": [
        "unit-all",
        "architecture"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Неизвестная блокирующая операция при нуле исполнителей/интеграций приводит к paused, без зависшего pausing при раннем выходе или COMMAND_ACTIVE; активная работа сохраняет штатное завершение до паузы.",
        "Разбор конкретной операции доступен orchestrated/legacy, native/HTTP, обе темы; правильные projectId/id/digest, повторная проверка состояния и подтверждение. Живой процесс не признаётся завершённым и журнал не удаляется.",
        "После признания последней блокировки watcher убирает устаревшую причину и разрешает кнопку «Продолжить», без автоматического запуска или повторной отправки; остающаяся блокировка объясняется без цикла running→pausing.",
        "Unknown доказанно readOnly не считается writer; сохранена отдельная защита удаления. Изолированные тесты покрывают две записи, гонку подтверждения, живой PID, перезапуск и ноль назначений."
      ],
      "expected_commit_message": "feat: Устранить зависшую паузу и открыть разбор неизвестных операций",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-native-startup-fixes",
        "task_id": "T000A",
        "role": "implementation"
      },
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/plan-start-recovery.md",
            "required": true,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/modules/orchestrated-execution.md",
            "required": true,
            "revision": "WORKTREE"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      }
    },
    {
      "id": "T000B",
      "title": "Разбирать старые операции до планирования и отделить историю scope",
      "why": "Разбирать старые операции до планирования и отделить историю scope",
      "dependencies": [
        "T000A"
      ],
      "functional_paths": [
        "tools/codex-app-server-mcp/server.py",
        "src/control/workflow/command-activity.mjs",
        "src/control/workflow/parallel-kit.mjs",
        "src/control/workflow/parallel-execution.mjs",
        "src/control/workflow/plan-review.mjs",
        "src/control/sessions/session-plans.mjs",
        "src/control/sessions/conversation-recovery.mjs",
        "src/backend/desktop-model.mjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/frontend/desktop/ui/index.html",
        "packages/workflow-kit/src/lib/command-activity.mjs",
        "packages/workflow-kit/src/lib/actions.mjs",
        "packages/workflow-kit/src/lib/simple-workflow.mjs",
        "packages/workflow-kit/src/lib/plan-review.mjs",
        "packages/workflow-kit/src/lib/recovery.mjs",
        "packages/workflow-kit/src/lib/command-help.mjs",
        "packages/workflow-kit/package.json",
        "packages/workflow-kit/scripts/check-command-activity-fixture.mjs",
        "packages/workflow-kit/scripts/check-previous-upgrade-fixture.mjs",
        "packages/workflow-kit/scripts/check-plan-review-fixture.mjs",
        "package.json",
        "package-lock.json",
        "tests/command-activity.test.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/session-plans.test.mjs",
        "tests/plan-review.test.mjs",
        "tests/orchestrated-execution.test.mjs",
        "tests/parallel-execution.test.mjs",
        "tests/sidebar.test.mjs",
        "scripts/check-workflow-kit-dependency.mjs",
        "scripts/check-workflow-kit-staging.mjs",
        "scripts/check-workflow-kit-archive.mjs"
      ],
      "documentation_paths": [
        "docs/planning/plan-start-recovery.md",
        "packages/workflow-kit/src/templates/PLAN.md",
        "packages/workflow-kit/src/templates/SPEC.md",
        "packages/workflow-kit/src/templates/CONTINUE.md"
      ],
      "verification_ids": [
        "unit-all",
        "executor-channel",
        "kit-check",
        "architecture"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Новая запись фиксирует проверяемую identity проекта/scope в момент начала, явное отсутствие scope и назначение при наличии. Legacy не приписывается текущему плану по времени/чату; смена проекта в том же пути не перепривязывает историю.",
        "Незакрытые прежние операции видны до начала планирования в приложении/recovery и препятствуют plan:create/scope:create/review:prepare до разбора; одинаково при Review ON/OFF. Перед публикацией повторная проверка, неизвестный исход не становится completed.",
        "Завершённые и признанные исторические операции не блокируют и не показываются как ошибки нового плана. Живой или потенциально живой writer общих файлов остаётся препятствием независимо от scope; новые ошибки текущего плана сохраняют защиту и доступный разбор T000A.",
        "Собственная команда предварительной проверки исключается только по доказанной точной identity, не по всем PID/workspace; чужие параллельные операции, повреждённые записи и ошибки чтения не скрываются. Нет TTL-очистки, повторного выполнения или нового сервиса.",
        "Тесты покрывают OLD→NEW, legacy, NONE, текущий unknown, previous boot, живой writer прошлого scope, замену проекта, гонку prepare/publish, собственную команду и чужую одновременную. Существующие boot/deletion гарантии сохраняются.",
        "Поставляемый Kit получает совместимый patch 1.8.2 через исходники packages/workflow-kit; package/consumer/upgrade fixtures и lock согласованы, managed .harness/kit вручную не меняется. Версии Electron/Node не меняются, production build выполняется только в delivery."
      ],
      "expected_commit_message": "feat: Разбирать старые операции до планирования и отделить историю scope",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-native-startup-fixes",
        "task_id": "T000B",
        "role": "implementation"
      },
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/plan-start-recovery.md",
            "required": true,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/modules/orchestrated-execution.md",
            "required": true,
            "revision": "WORKTREE"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      }
    },
    {
      "id": "T000C",
      "title": "Включить npm в macOS-поставку и исправить статусы подготовки исполнителя",
      "why": "Включить npm в macOS-поставку и исправить статусы подготовки исполнителя",
      "dependencies": [
        "T000B"
      ],
      "functional_paths": [
        "scripts/prepare-mac-toolchain.mjs",
        "scripts/release-mac.mjs",
        "scripts/release-package.mjs",
        "scripts/release-archive.mjs",
        "scripts/sign-mac-bundle.mjs",
        "src/control/projects/workspace-setup.mjs",
        "src/control/workflow/execution-projection.mjs",
        "src/control/workflow/parallel-execution.mjs",
        "src/control/workflow/parallel-kit.mjs",
        "src/backend/desktop-model.mjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "packages/workflow-kit/src/lib/task-assignment.mjs",
        "packages/workflow-kit/scripts/check-task-assignment-fixture.mjs",
        "tests/mac-toolchain.test.mjs",
        "tests/release-mac.test.mjs",
        "tests/sign-mac-bundle.test.mjs",
        "tests/parallel-execution.test.mjs",
        "tests/parallel-execution-recovery.test.mjs",
        "tests/parallel-execution-ui.test.mjs",
        "tests/sidebar.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/plan-start-recovery.md"
      ],
      "verification_ids": [
        "unit-all",
        "release-tooling",
        "kit-check",
        "architecture"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Из уже закреплённого официального архива Node в macOS-комплект включён штатный npm с зависимостями/относительными bin-ссылками; проверка SHA256, права, лицензии, подпись и архивирование сохранены. Без нового менеджера окружений, глобальной установки, отдельной загрузки npm или зависимости от Homebrew.",
        "Изолированная проверка готового комплекта с минимальным GUI PATH и bundled Node/npm выполняет npm --version, npm ci и стандартный подготовительный скрипт локального fixture без сети и login shell; версии Node/Electron прежние, Windows/Linux не меняют штатное поведение.",
        "До создания сессии статус отражает подготовку/ошибку/готовность, не обещает назначенного исполнителя. Конкретная причина ENOENT/ненулевой exit сохраняется. Пункт открывает правильную сессию только после её появления; native/HTTP и обе темы согласованы.",
        "Повтор использует тот же assignment/worktree без дубля и повторного Send; успешная подготовка убирает старую ошибку. Пауза во время подготовки предотвращает запуск нового исполнителя, работающий продолжает штатно. Регрессии покрывают отсутствие npm, неуспешный ci, READY без сессии и появление сессии.",
        "Используются существующая подготовка и поля статуса; без новой службы/автомата/retry-цикла. Изменения Kit входят в уже согласованный patch 1.8.2; build/install пользовательского приложения выполняются только в delivery."
      ],
      "expected_commit_message": "feat: Включить npm в macOS-поставку и исправить статусы подготовки исполнителя",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-native-startup-fixes",
        "task_id": "T000C",
        "role": "implementation"
      },
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/plan-start-recovery.md",
            "required": true,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/modules/orchestrated-execution.md",
            "required": true,
            "revision": "WORKTREE"
          },
          {
            "path": "docs/modules/release.md",
            "required": true,
            "revision": "WORKTREE"
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      }
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-native-startup-fixes",
        "task_id": "T001",
        "role": "implementation"
      },
      "dependencies": [
        "T000A",
        "T000B",
        "T000C"
      ],
      "functional_paths": [
        "src/main.mjs",
        "src/contracts/launch.mjs",
        "src/frontend/desktop/client.mjs",
        "src/backend/main.mjs",
        "src/backend/diagnostics.mjs",
        "resources/mac-permissions.plist",
        "tests/backend-launcher.test.mjs",
        "tests/backend-native-window.test.mjs",
        "tests/backend-upgrade.test.mjs",
        "tests/backend-owner-recovery.test.mjs",
        "tests/backend-diagnostics.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "native-startup-dock",
        "architecture"
      ],
      "id": "T001",
      "title": "Устранить дубли Dock при запуске Workflow Pilot",
      "why": "Устранить дубли Dock при запуске Workflow Pilot",
      "verification_kind": "code",
      "acceptance_criteria": [
        "На macOS короткий launcher не становится отдельным видимым приложением; cold start использует LaunchServices для запуска packaged backend вместо прямого spawn второго GUI executable. Сначала использовать существующий системный путь openClient; никаких новых helper-bundle, launchd-служб и сторонних зависимостей.",
        "Единственный backend/профиль, проверка версии, одиночный и конкурентный запуск, activate/повторное открытие не создают вторую службу или окно; ошибочный или занятый профиль даёт прежнюю понятную ошибку.",
        "Открытое native-окно имеет один рабочий значок; закрытие/Cmd+Q закрывает окно, backend/MCP/туннель/страницы продолжают работу. Явная остановка draining сохранена; HTTP-клиент остаётся отдельным штатным окном. Linux/Windows не получают macOS-команды. При изменении LSUIElement явно восстановить regular для любого не-embedded окна: HTTP-клиента и fallback launcher при несовпадении версии/таймауте/занятом профиле; проверить политику, доступность меню и сообщения в обоих маршрутах.",
        "Fixtures не управляют пользовательским интерфейсом. Контракт выбора LaunchServices и ошибки проверены без запуска production UI; реальные Dock/recent-apps/coalition отмечены pending до проверки пользователя. Пользовательские Dock plist и закрепления не меняются."
      ],
      "expected_commit_message": "fix: Устранить дубли Dock при запуске Workflow Pilot",
      "parallel_safe": true,
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/native-startup-followup.md",
            "required": true
          },
          {
            "path": "docs/modules/native-window.md",
            "required": true
          },
          {
            "path": "docs/modules/backend.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      }
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-native-startup-fixes",
        "task_id": "T002",
        "role": "implementation"
      },
      "dependencies": [
        "T000B",
        "T000C"
      ],
      "functional_paths": [
        "src/control/workflow/plan-review.mjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "tests/plan-review.test.mjs",
        "tests/sidebar.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "plan-review-ui"
      ],
      "id": "T002",
      "title": "Убрать строку о публикации завершённого Review",
      "why": "Старая зелёная галочка и сообщение о публикации вводят в заблуждение после архивации плана.",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Для нормального PUBLISHED не отображается строка «Согласованный план опубликован», зелёная галочка и оставшийся номер раунда; скрывается весь пустой блок. Это относится к активному опубликованному плану, закрытому/архивированному и подготовке следующего плана.",
        "Review ON/OFF, состояние Kit и история публикаций не меняются; сообщения PREPARED/RUNNING/AUTHOR_PENDING/AGREED/NEEDS_USER/STALE/PUBLISHING и реальные ошибки, включая cleanup_error при PUBLISHED, остаются видимыми.",
        "Тестируется переход PUBLISHED→NONE/архив→PREPARED нового цикла, отсутствие пустой строки/галочки, сохранение ошибок и переключателя в светлой/тёмной теме. Исправление только в представлении, без очистки review state и без новых механизмов."
      ],
      "expected_commit_message": "fix: скрыть устаревшее сообщение о публикации Review",
      "parallel_safe": true,
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/native-startup-followup.md",
            "required": true
          },
          {
            "path": "docs/modules/desktop.md",
            "required": true
          },
          {
            "path": "docs/modules/workflow-execution.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      }
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-native-startup-fixes",
        "task_id": "T003",
        "role": "implementation"
      },
      "dependencies": [
        "T001",
        "T002"
      ],
      "functional_paths": [
        "src/frontend/desktop/client.mjs",
        "src/frontend/desktop/ui/index.html",
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/frontend/desktop/ui/browser-view.html",
        "src/frontend/desktop/ui/browser-view.mjs",
        "src/execution/browser/backend-host.mjs",
        "src/execution/browser/chatgpt-colors.mjs",
        "src/contracts/browser.mjs",
        "src/backend/main.mjs",
        "tests/native-startup-theme.test.mjs",
        "tests/backend-native-pages.test.mjs",
        "tests/backend-native-window.test.mjs",
        "tests/desktop-client.test.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "native-startup-theme",
        "architecture"
      ],
      "id": "T003",
      "title": "Убрать светлую вспышку перед диалогом",
      "why": "Убрать светлую вспышку перед диалогом",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Сохранённая тема применяется до первого показа native-окна; начальный snapshot также обновляет фон. До доступа к настройкам используется системная тема без сохранения её как пользовательского выбора. Фоны BaseWindow и WebContentsView согласованы; пользовательский фон ChatGPT учитывается.",
        "Окно показывает готовую оболочку/фон ожидания без промежуточного белого кадра в тёмной теме; страница появляется по сигналу готовности. Для BaseWindow не предполагается ready-to-show BrowserWindow; никаких фиксированных sleep и зависимости видимости от полной сетевой загрузки ChatGPT.",
        "Медленная/ошибочная/отменённая загрузка и недоступность backend оставляют доступное окно с понятным состоянием; закрытие при ожидании не открывает его вновь, таймеры и слушатели снимаются.",
        "Повторное открытие и смена сессии сохраняют webContents, историю, текущий ответ и ввод; скрытие/отложенный показ не блокирует наблюдателя, Send, recovery и выполнение плана. Светлая тема и HTTP-клиент без регрессий.",
        "Тесты проверяют порядок применения фона и показа, отсутствие лишней навигации, задержку/ошибку/закрытие; фактическое отсутствие вспышки в пользовательском окне остаётся пунктом ручной приёмки."
      ],
      "expected_commit_message": "fix: Убрать светлую вспышку перед диалогом",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/native-startup-followup.md",
            "required": true
          },
          {
            "path": "docs/modules/native-window.md",
            "required": true
          },
          {
            "path": "docs/modules/desktop.md",
            "required": true
          },
          {
            "path": "docs/modules/browser.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      }
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-native-startup-fixes",
        "task_id": "T004",
        "role": "implementation"
      },
      "dependencies": [
        "T003"
      ],
      "functional_paths": [
        "package.json",
        "package-lock.json",
        "src/frontend/plugin/index.html",
        "tests/backend-launcher.test.mjs",
        "tests/backend-native-window.test.mjs",
        "tests/native-startup-theme.test.mjs",
        "tests/release-all.test.mjs",
        "tests/release-mac.test.mjs",
        "tests/backend-upgrade.test.mjs",
        "src/frontend/plugin/app.mjs"
      ],
      "documentation_paths": [
        "docs/acceptance/backend-independence.md"
      ],
      "verification_ids": [
        "unit-all",
        "electron-smoke",
        "architecture",
        "release-tooling",
        "kit-check",
        "codex-tools-live",
        "executor-channel"
      ],
      "id": "T004",
      "title": "Проверить общий результат и подготовить версию 0.5.2",
      "why": "Проверить общий результат и подготовить версию 0.5.2",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Совместный сценарий запуска, закрытия/повторного открытия окна, темы, HTTP-клиента и статусов Review проверен в изоляции; итог включает число pass/fail и реальные ограничения.",
        "Версия приложения, lock-файла, подписи HTML панели и SDK App в src/frontend/plugin/app.mjs согласованы на 0.5.2; tests/backend-upgrade.test.mjs и остальные тесты с жёсткой текущей версией обновлены. Версии Electron/Node не меняются; поставляемый Kit согласован на 1.8.2 после T000B; production build пока не выполняется.",
        "Сценарий ручной проверки содержит cold/warm launch через Finder/Dock/Spotlight, один backend и отсутствие новых дубликатов recent-apps без чистки Dock; dark/light/custom chat background, медленная сеть, окно без проекта, смена сессии и закрытие во время загрузки. Ранее накопленные записи Dock отделяются от новых.",
        "Если общий прогон выявил дефект реализации, передать оркестратору точную причину для исправляющего назначения через plan:extend, не расширять эту задачу скрытой переработкой runtime.",
        "Проверен полный сценарий: исторические операции обнаруживаются до нового планирования (Review ON/OFF), признанная история не блокирует следующий scope, новые writers защищены, пауза завершается и разбор доступен; сборка содержит Kit 1.8.2."
      ],
      "expected_commit_message": "fix: Проверить общий результат и подготовить версию 0.5.2",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/native-startup-followup.md",
            "required": true
          },
          {
            "path": "docs/modules/native-window.md",
            "required": true
          },
          {
            "path": "docs/modules/release.md",
            "required": true
          },
          {
            "path": "docs/planning/plan-start-recovery.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      }
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-native-startup-fixes",
        "task_id": "DOCS",
        "role": "implementation"
      },
      "dependencies": [
        "T000A",
        "T000B",
        "T000C",
        "T001",
        "T002",
        "T003",
        "T004"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/native-window.md",
        "docs/modules/backend.md",
        "docs/modules/desktop.md",
        "docs/modules/browser.md",
        "docs/modules/release.md",
        "docs/acceptance/backend-independence.md",
        "docs/planning/native-startup-followup.md",
        "docs/modules/workflow-execution.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/planning/plan-start-recovery.md",
        "packages/workflow-kit/src/templates/PLAN.md",
        "packages/workflow-kit/src/templates/SPEC.md",
        "packages/workflow-kit/src/templates/CONTINUE.md",
        "docs/modules/orchestrated-execution.md",
        "docs/modules/execution.md",
        "docs/modules/project-lifecycle.md"
      ],
      "verification_ids": [],
      "id": "DOCS",
      "title": "Актуализация всех документов проекта",
      "why": "Актуализация всех документов проекта",
      "verification_kind": "code",
      "acceptance_criteria": [
        "До сборки сверены README/OVERVIEW и действующие контракты запуска, окна, browser и release; устаревшие текущие версии/пути в release.md исправлены на фактические.",
        "Существенные решения перенесены из спецификации в контракты, выполненная временная спецификация удалена без архивной копии; незавершённое сохранено. Required context удалённого файла имеет точный существующий Git blob; каждый документ <=28000 байт.",
        "Живая приёмка пользователя по плагину сохранена; новые Dock/визуальные сценарии не объявлены выполненными до подтверждения. Документационные проверки Kit пройдены.",
        "Инструкция текущей панели chatgpt-plugin.md соответствует 0.5.2; историческое подтверждение работы на 0.5.1 не переписывается.",
        "Контракты исполнения, оркестрации и жизненного цикла описывают проверку до планирования, принадлежность операций и восстановление; обе временные спецификации после переноса выполненного удалены с точными Git-ссылками. Поставляемый Kit 1.8.2 указан согласованно."
      ],
      "expected_commit_message": "fix: Актуализация всех документов проекта",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/native-startup-followup.md",
            "required": true
          },
          {
            "path": "docs/modules/native-window.md",
            "required": true
          },
          {
            "path": "docs/modules/release.md",
            "required": true
          },
          {
            "path": "docs/planning/plan-start-recovery.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      }
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-native-startup-fixes",
        "task_id": "T005",
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
      "id": "T005",
      "title": "Собрать общий выпуск Workflow Pilot 0.5.2",
      "why": "Собрать общий выпуск Workflow Pilot 0.5.2",
      "verification_kind": "package",
      "acceptance_criteria": [
        "Один штатный npm run build через проверку Kit после DOCS: macOS arm64, Windows x64, Linux x64 из одного sourceCommit; комплект .harness/runtime/releases/0.5.2 и ~/Downloads/WorkflowPilot-0.5.2 проверен.",
        "Состав, подпись macOS, версии, SHA256SUMS, manifest, archives и executable/symlinks сверены. Неполный выпуск запрещён, Windows/Linux native-tested не заявлять. Повтор delivery использует готовый проверенный комплект при совпадении базы."
      ],
      "expected_commit_message": "release: Собрать общий выпуск Workflow Pilot 0.5.2",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/native-startup-followup.md",
            "required": true
          },
          {
            "path": "docs/modules/release.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      }
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-native-startup-fixes",
        "task_id": "T006",
        "role": "implementation"
      },
      "dependencies": [
        "T005",
        "DOCS"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "release-installed"
      ],
      "id": "T006",
      "title": "Установить проверенный выпуск 0.5.2 на Mac",
      "why": "Установить проверенный выпуск 0.5.2 на Mac",
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Штатный installer устанавливает готовый macOS bundle в собственные копии проекта и /Applications/Workflow Pilot.app без пересборки/переподписи; проверены version/sourceCommit/manifest/signature и rollback.",
        "Работающий backend и открытые окна не закрывать и не перезапускать: при BACKEND_RUNNING оставить проверенный комплект pending, дать пользователю точную команду продолжения установки и не объявлять новую версию уже установленной/запущенной."
      ],
      "expected_commit_message": "release: Установить проверенный выпуск 0.5.2 на Mac",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/native-startup-followup.md",
            "required": true
          },
          {
            "path": "docs/modules/release.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      }
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-native-startup-fixes",
        "task_id": "T007",
        "role": "implementation"
      },
      "dependencies": [
        "T006",
        "DOCS"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "github-release"
      ],
      "id": "T007",
      "title": "Опубликовать GitHub Release 0.5.2",
      "why": "Опубликовать GitHub Release 0.5.2",
      "verification_kind": "package",
      "acceptance_criteria": [
        "Опубликовать штатным draft→assets→verify→publish в собственном OleynikAleksandr/Workflow_Pilot; тег v0.5.2 на manifest.sourceCommit, remote main и полный комплект assets проверены по size/digest.",
        "Никакой пересборки при публикации. Итог различает готовность выпуска, pending installation и ручную приёмку; план остаётся READY_FOR_ACCEPTANCE до прямого поручения пользователя о закрытии."
      ],
      "expected_commit_message": "release: Опубликовать GitHub Release 0.5.2",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/native-startup-followup.md",
            "required": true
          },
          {
            "path": "docs/modules/release.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      }
    }
  ],
  "blocked_reason": null,
  "user_decisions": [
    {
      "id": "startup-plan-request",
      "text": "18.10.2026 пользователь поручил подготовить план двух исправлений запуска, затем добавить удаление строки «Согласованный план опубликован» с зелёной галочкой. Плагин запуска чата сохраняется без развития; выполнение — штатной кнопкой плана.",
      "recorded_at": "2026-10-18T08:11:03.000Z"
    },
    {
      "id": "104c7c45-3d56-4229-ae64-71f301013965",
      "text": "Пользователь поручил подготовить спецификацию и to-do план двух исправлений запуска и дополнительно убрать строку «Согласованный план опубликован» с зелёной галочкой. Выполнение — только по кнопке пользователя.",
      "recorded_at": "2026-10-18T08:19:24.781Z"
    },
    {
      "id": "plan-start-recovery-20261018",
      "text": "Пользователь разрешил вручную признать старые операции и восстановить текущий запуск, затем добавить исправления первыми задачами. Исторические проблемы разбираются до нового планирования. Порядок T000A→T000B→параллельные T001/T002→T003→T004→DOCS→delivery; первые две последовательны из-за общих Control/UI и зависимости проверки от разбора. Снимок сессии и отдельные чаты/worktree сохранены. Дополнение ACTIVE через plan:extend; опубликованный Review не переоткрывается (Kit допускает prepare только NONE).",
      "recorded_at": "2026-10-18T08:34:45+00:00"
    }
  ],
  "parallel_allowed": true,
  "max_workers": 4,
  "execution_strategy": "orchestrated",
  "execution_reason": "T001 (Dock) и T002 (представление Review) имеют разные области записи и могут выполняться параллельно, максимум 4 исполнителя. T003 (первый показ) зависит от обеих: пересекается с T001 в client/backend и с T002 в sidebar. Затем общая проверка, DOCS и delivery последовательно. Каждый обычный пункт и DOCS — отдельный чат/worktree.",
  "execution_origin_session_id": "web-pilot-bbf8b37f-2aba-4758-ad41-e0441d81d25e",
  "release": true
}
```
<!-- workflow-state:end -->

## Состояние

Execution Scope Status: ACTIVE
Delivery Status: IN_PROGRESS
Scope: workflow-pilot-native-startup-fixes
Current Task: нет
Revision: 472

## Цель

Workflow Pilot 0.5.2: восстановимый запуск плана, проверка старых операций до планирования, отсутствие дублей Dock и белой вспышки, актуальное представление Review.

## Критерии приёмки

- Один видимый Workflow Pilot в штатном запуске macOS, один backend; новые дубли Dock/recent-apps не создаются.
- Первый показ и повторное открытие окна без светлой вспышки в тёмной теме, с работоспособным состоянием ожидания и ошибок.
- Строка и зелёная галочка о PUBLISHED скрыты, текущий Review и его ошибки остаются видимыми; review state не очищается.
- Закрытие окна не завершает backend, не перезагружает живые страницы; проверки, DOCS, три платформы, macOS installer и GitHub Release завершены с честным указанием pending ручной приёмки/установки.
- Нет зависшего pausing при неизвестной операции без активной работы; разбор доступен и восстановление не запускает задания автоматически.
- Проблемы прошлых операций разбираются до нового планирования; признанная история не блокирует новый scope. Живые writers общих файлов и новые ошибки текущего плана сохраняют предметную защиту.
- Совместимый Kit 1.8.2 включён в поставку 0.5.2; Electron/Node без обновления.

## Микрозадачи

Выполнение: orchestrated; разрешено: true; лимит: 4
Выпуск приложения: да
Причина: T001 (Dock) и T002 (представление Review) имеют разные области записи и могут выполняться параллельно, максимум 4 исполнителя. T003 (первый показ) зависит от обеих: пересекается с T001 в client/backend и с T002 в sidebar. Затем общая проверка, DOCS и delivery последовательно. Каждый обычный пункт и DOCS — отдельный чат/worktree.

- [TODO] T000A: Устранить зависшую паузу и открыть разбор неизвестных операций — Ожидает
  - Git Commit: [PENDING] feat: Устранить зависшую паузу и открыть разбор неизвестных операций
  - Reference: workflow-pilot-native-startup-fixes / T000A / implementation
  - Файлы: src/control/workflow/parallel-execution.mjs, src/control/workflow/execution-control.mjs, src/control/workflow/coordination.mjs, src/control/workflow/command-activity.mjs, src/control/workflow/parallel-kit.mjs, src/control/projects/lifecycle.mjs, src/backend/desktop-model.mjs, src/frontend/desktop/ui/sidebar.mjs, src/frontend/desktop/ui/index.html, tests/parallel-execution.test.mjs, tests/execution-control.test.mjs, tests/command-activity.test.mjs, tests/sidebar.test.mjs, tests/orchestrated-execution.test.mjs, docs/planning/plan-start-recovery.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [TODO] T000B: Разбирать старые операции до планирования и отделить историю scope — Ожидает
  - Git Commit: [PENDING] feat: Разбирать старые операции до планирования и отделить историю scope
  - Reference: workflow-pilot-native-startup-fixes / T000B / implementation
  - Файлы: tools/codex-app-server-mcp/server.py, src/control/workflow/command-activity.mjs, src/control/workflow/parallel-kit.mjs, src/control/workflow/parallel-execution.mjs, src/control/workflow/plan-review.mjs, src/control/sessions/session-plans.mjs, src/control/sessions/conversation-recovery.mjs, src/backend/desktop-model.mjs, src/frontend/desktop/ui/sidebar.mjs, src/frontend/desktop/ui/index.html, packages/workflow-kit/src/lib/command-activity.mjs, packages/workflow-kit/src/lib/actions.mjs, packages/workflow-kit/src/lib/simple-workflow.mjs, packages/workflow-kit/src/lib/plan-review.mjs, packages/workflow-kit/src/lib/recovery.mjs, packages/workflow-kit/src/lib/command-help.mjs, packages/workflow-kit/package.json, packages/workflow-kit/scripts/check-command-activity-fixture.mjs, packages/workflow-kit/scripts/check-previous-upgrade-fixture.mjs, packages/workflow-kit/scripts/check-plan-review-fixture.mjs, package.json, package-lock.json, tests/command-activity.test.mjs, tests/codex-app-server-mcp.test.mjs, tests/session-plans.test.mjs, tests/plan-review.test.mjs, tests/orchestrated-execution.test.mjs, tests/parallel-execution.test.mjs, tests/sidebar.test.mjs, scripts/check-workflow-kit-dependency.mjs, scripts/check-workflow-kit-staging.mjs, scripts/check-workflow-kit-archive.mjs, docs/planning/plan-start-recovery.md, packages/workflow-kit/src/templates/PLAN.md, packages/workflow-kit/src/templates/SPEC.md, packages/workflow-kit/src/templates/CONTINUE.md
  - Параллельность: исключительное выполнение
  - Зависимости: T000A
- [TODO] T000C: Включить npm в macOS-поставку и исправить статусы подготовки исполнителя — Ожидает
  - Git Commit: [PENDING] feat: Включить npm в macOS-поставку и исправить статусы подготовки исполнителя
  - Reference: workflow-pilot-native-startup-fixes / T000C / implementation
  - Файлы: scripts/prepare-mac-toolchain.mjs, scripts/release-mac.mjs, scripts/release-package.mjs, scripts/release-archive.mjs, scripts/sign-mac-bundle.mjs, src/control/projects/workspace-setup.mjs, src/control/workflow/execution-projection.mjs, src/control/workflow/parallel-execution.mjs, src/control/workflow/parallel-kit.mjs, src/backend/desktop-model.mjs, src/frontend/desktop/ui/sidebar.mjs, packages/workflow-kit/src/lib/task-assignment.mjs, packages/workflow-kit/scripts/check-task-assignment-fixture.mjs, tests/mac-toolchain.test.mjs, tests/release-mac.test.mjs, tests/sign-mac-bundle.test.mjs, tests/parallel-execution.test.mjs, tests/parallel-execution-recovery.test.mjs, tests/parallel-execution-ui.test.mjs, tests/sidebar.test.mjs, docs/planning/plan-start-recovery.md
  - Параллельность: исключительное выполнение
  - Зависимости: T000B
- [TODO] T001: Устранить дубли Dock при запуске Workflow Pilot — Ожидает
  - Git Commit: [PENDING] fix: Устранить дубли Dock при запуске Workflow Pilot
  - Reference: workflow-pilot-native-startup-fixes / T001 / implementation
  - Файлы: src/main.mjs, src/contracts/launch.mjs, src/frontend/desktop/client.mjs, src/backend/main.mjs, src/backend/diagnostics.mjs, resources/mac-permissions.plist, tests/backend-launcher.test.mjs, tests/backend-native-window.test.mjs, tests/backend-upgrade.test.mjs, tests/backend-owner-recovery.test.mjs, tests/backend-diagnostics.test.mjs
  - Параллельность: допустима при непересекающихся областях
  - Зависимости: T000A, T000B, T000C
- [TODO] T002: Убрать строку о публикации завершённого Review — Ожидает
  - Git Commit: [PENDING] fix: скрыть устаревшее сообщение о публикации Review
  - Reference: workflow-pilot-native-startup-fixes / T002 / implementation
  - Файлы: src/control/workflow/plan-review.mjs, src/frontend/desktop/ui/sidebar.mjs, tests/plan-review.test.mjs, tests/sidebar.test.mjs
  - Параллельность: допустима при непересекающихся областях
  - Зависимости: T000B, T000C
- [TODO] T003: Убрать светлую вспышку перед диалогом — Ожидает
  - Git Commit: [PENDING] fix: Убрать светлую вспышку перед диалогом
  - Reference: workflow-pilot-native-startup-fixes / T003 / implementation
  - Файлы: src/frontend/desktop/client.mjs, src/frontend/desktop/ui/index.html, src/frontend/desktop/ui/sidebar.mjs, src/frontend/desktop/ui/browser-view.html, src/frontend/desktop/ui/browser-view.mjs, src/execution/browser/backend-host.mjs, src/execution/browser/chatgpt-colors.mjs, src/contracts/browser.mjs, src/backend/main.mjs, tests/native-startup-theme.test.mjs, tests/backend-native-pages.test.mjs, tests/backend-native-window.test.mjs, tests/desktop-client.test.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: T001, T002
- [TODO] T004: Проверить общий результат и подготовить версию 0.5.2 — Ожидает
  - Git Commit: [PENDING] fix: Проверить общий результат и подготовить версию 0.5.2
  - Reference: workflow-pilot-native-startup-fixes / T004 / implementation
  - Файлы: package.json, package-lock.json, src/frontend/plugin/index.html, tests/backend-launcher.test.mjs, tests/backend-native-window.test.mjs, tests/native-startup-theme.test.mjs, tests/release-all.test.mjs, tests/release-mac.test.mjs, tests/backend-upgrade.test.mjs, src/frontend/plugin/app.mjs, docs/acceptance/backend-independence.md
  - Параллельность: исключительное выполнение
  - Зависимости: T003
- [TODO] DOCS: Актуализация всех документов проекта — Ожидает
  - Git Commit: [PENDING] fix: Актуализация всех документов проекта
  - Reference: workflow-pilot-native-startup-fixes / DOCS / implementation
  - Файлы: README.md, docs/architecture/OVERVIEW.md, docs/modules/native-window.md, docs/modules/backend.md, docs/modules/desktop.md, docs/modules/browser.md, docs/modules/release.md, docs/acceptance/backend-independence.md, docs/planning/native-startup-followup.md, docs/modules/workflow-execution.md, docs/modules/chatgpt-plugin.md, docs/planning/plan-start-recovery.md, packages/workflow-kit/src/templates/PLAN.md, packages/workflow-kit/src/templates/SPEC.md, packages/workflow-kit/src/templates/CONTINUE.md, docs/modules/orchestrated-execution.md, docs/modules/execution.md, docs/modules/project-lifecycle.md
  - Параллельность: исключительное выполнение
  - Зависимости: T000A, T000B, T000C, T001, T002, T003, T004
- [TODO] T005: Собрать общий выпуск Workflow Pilot 0.5.2 — Ожидает
  - Git Commit: [PENDING] release: Собрать общий выпуск Workflow Pilot 0.5.2
  - Reference: workflow-pilot-native-startup-fixes / T005 / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: DOCS
- [TODO] T006: Установить проверенный выпуск 0.5.2 на Mac — Ожидает
  - Git Commit: [PENDING] release: Установить проверенный выпуск 0.5.2 на Mac
  - Reference: workflow-pilot-native-startup-fixes / T006 / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: T005, DOCS
- [TODO] T007: Опубликовать GitHub Release 0.5.2 — Ожидает
  - Git Commit: [PENDING] release: Опубликовать GitHub Release 0.5.2
  - Reference: workflow-pilot-native-startup-fixes / T007 / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: T006, DOCS

## Context Pack For This Cycle

- docs/planning/native-startup-followup.md
- docs/architecture/OVERVIEW.md
- docs/planning/plan-start-recovery.md

Служебные состояния меняются только командами workflow. Приёмка не архивирует scope.
