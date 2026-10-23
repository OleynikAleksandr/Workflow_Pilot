# Активный план — Workflow_Pilot

<!-- workflow-state:begin -->
```json
{
  "schema_version": 1,
  "plan_revision": 948,
  "project_id": "7411e192-943c-4529-bffb-3b081d9c242f",
  "project_name": "Workflow_Pilot",
  "scope_id": "review-publication-orchestrator",
  "execution_scope_status": "ACTIVE",
  "delivery_status": "IN_PROGRESS",
  "objective": "План, опубликованный через Review, всегда можно начать; отказ Kit при назначении не вешает паузу; в проекте один оркестратор с момента первой задачи до закрытия плана; выпуск 0.5.29 для трёх ОС опубликован.",
  "acceptance_criteria": [
    "Review-публикация с неполной конфигурацией отказывает до записи; опубликованный план начинается.",
    "Отказ Kit при назначении — пауза с причиной и «Продолжить», без вечного «Пауза…».",
    "Вторая сессия во время подготовки или выполнения плана — «Обсуждение»; Kit отвергает чужую публикацию.",
    "Выпуск 0.5.29 трёх ОС опубликован, установлен; живая приёмка — у пользователя."
  ],
  "approved_scope": {
    "functional_paths": [
      "package-lock.json",
      "package.json",
      "packages/workflow-kit/package.json",
      "packages/workflow-kit/scripts/check-plan-review-fixture.mjs",
      "packages/workflow-kit/scripts/check-runtime-fixture.mjs",
      "packages/workflow-kit/src/lib/actions.mjs",
      "packages/workflow-kit/src/lib/common.mjs",
      "packages/workflow-kit/src/lib/installer.mjs",
      "packages/workflow-kit/src/lib/plan-review.mjs",
      "packages/workflow-kit/src/lib/planning-owner.mjs",
      "packages/workflow-kit/src/lib/recovery.mjs",
      "packages/workflow-kit/src/lib/review-state.mjs",
      "packages/workflow-kit/src/lib/role-protocol.mjs",
      "packages/workflow-kit/src/lib/simple-workflow.mjs",
      "release-manifest.json",
      "src/backend/desktop-model.mjs",
      "src/contracts/backend.mjs",
      "src/control/plugin/communication.mjs",
      "src/control/sessions/workspace-session.mjs",
      "src/control/workflow/coordination.mjs",
      "src/control/workflow/parallel-execution.mjs",
      "src/control/workflow/parallel-kit.mjs",
      "src/frontend/desktop/ui/sidebar.mjs",
      "tests/chatgpt-plugin.test.mjs",
      "tests/fixtures/automatic-agent-dialogue.mjs",
      "tests/fixtures/released-kit/kit-1.9.6.tar.gz",
      "tests/fixtures/released-kit/manifest.json",
      "tests/orchestrated-execution.test.mjs",
      "tests/parallel-execution.test.mjs",
      "tests/session-roles.test.mjs",
      "tests/sidebar.test.mjs",
      "tests/workflow-channel.test.mjs",
      "tests/workflow-kit-upgrade.test.mjs",
      "tests/workspace-session.test.mjs",
      "tools/codex-app-server-mcp/plugin-ui.html"
    ],
    "documentation_paths": [
      "README.md",
      "docs/architecture/OVERVIEW.md",
      "docs/modules/chatgpt-plugin.md",
      "docs/modules/desktop.md",
      "docs/modules/orchestrated-execution.md",
      "docs/modules/orchestrator-startup.md",
      "docs/modules/project-compatibility.md",
      "docs/modules/release.md",
      "docs/modules/workflow-execution.md",
      "docs/planning/review-publication-and-orchestrator.md",
      "packages/workflow-kit/README.md",
      "packages/workflow-kit/docs/modules/orchestrated-plans.md",
      "packages/workflow-kit/docs/modules/workflow-kit-package.md",
      "tests/fixtures/released-kit/README.md"
    ]
  },
  "baseline_commit": "ae38af104ab1945784b958c88132eb41d0e219ae",
  "current_task_id": null,
  "context_pack": {
    "documents": [
      {
        "path": "docs/planning/review-publication-and-orchestrator.md",
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
        "scope_id": "review-publication-orchestrator",
        "task_id": "T001",
        "role": "implementation"
      },
      "dependencies": [],
      "functional_paths": [
        "packages/workflow-kit/src/lib/actions.mjs",
        "packages/workflow-kit/src/lib/plan-review.mjs",
        "packages/workflow-kit/src/lib/review-state.mjs",
        "packages/workflow-kit/src/lib/planning-owner.mjs",
        "packages/workflow-kit/src/lib/simple-workflow.mjs",
        "packages/workflow-kit/src/lib/recovery.mjs",
        "packages/workflow-kit/src/lib/role-protocol.mjs",
        "packages/workflow-kit/src/lib/common.mjs",
        "packages/workflow-kit/src/lib/installer.mjs",
        "packages/workflow-kit/package.json",
        "package-lock.json",
        "packages/workflow-kit/scripts/check-plan-review-fixture.mjs",
        "packages/workflow-kit/scripts/check-runtime-fixture.mjs",
        "tests/fixtures/released-kit/kit-1.9.6.tar.gz",
        "tests/fixtures/released-kit/manifest.json",
        "tests/workflow-kit-upgrade.test.mjs",
        "tests/workflow-channel.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/fixtures/automatic-agent-dialogue.mjs"
      ],
      "documentation_paths": [
        "tests/fixtures/released-kit/README.md"
      ],
      "verification_ids": [
        "kit-check",
        "kit-assignments",
        "kit-upgrade",
        "unit-all"
      ],
      "id": "T001",
      "title": "Kit 1.9.7: проверка конфигурации при Review и владелец планирования",
      "why": "Kit опубликовал через Review план с профилем DISCOVERY, который нельзя начать; Kit не знает, какая сессия уже готовит план.",
      "acceptance_criteria": [
        "config:apply с непустым stack ставит профиль DEVELOPMENT; review:prepare и публикация через Review проверяют каждую задачу тем же taskChecks, что plan:create, и отказывают до записи с прежним кодом и указанием исправления.",
        "Запись владельца .harness/runtime/planning-owner.json (Session ID, время, поколение, scope_id и plan_revision) создаётся compare-and-set через библиотеку Kit под блокировкой; archive её удаляет; запись, после которой план архивирован, недействительна.",
        "review:prepare и публикация orchestrated-плана с другим Session ID получают PLANNING_OWNED с именем владельца; recipient_mode manual освобождает только review:prepare от сверки recipient_session_id, публикация всегда сверяет execution_origin_session_id; проекты без записи не ограничены.",
        "Recovery O и S показывает владельца; текст роли обсуждения охватывает подготовку плана; ROLE_PROTOCOL_VERSION 7 со сверкой startup, шаблонов и MCP-описаний; Kit 1.9.7, обновление с выпущенного 1.9.6 проверено неизменяемым архивом. Проверки tests/workflow-channel.test.mjs, tests/chatgpt-plugin.test.mjs и tests/fixtures/automatic-agent-dialogue.mjs сравнивают с импортированным ROLE_PROTOCOL_VERSION, а не с литералом."
      ],
      "expected_commit_message": "feat: Kit проверяет конфигурацию при Review и знает владельца планирования",
      "parallel_safe": false
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "review-publication-orchestrator",
        "task_id": "T002",
        "role": "implementation"
      },
      "dependencies": [
        "T001"
      ],
      "functional_paths": [
        "src/control/workflow/parallel-kit.mjs",
        "src/control/workflow/parallel-execution.mjs",
        "src/control/workflow/coordination.mjs",
        "src/control/sessions/workspace-session.mjs",
        "src/control/plugin/communication.mjs",
        "src/backend/desktop-model.mjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/contracts/backend.mjs",
        "package.json",
        "tests/parallel-execution.test.mjs",
        "tests/orchestrated-execution.test.mjs",
        "tests/session-roles.test.mjs",
        "tests/workspace-session.test.mjs",
        "tests/sidebar.test.mjs",
        "tools/codex-app-server-mcp/plugin-ui.html",
        "package-lock.json"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "unit-all",
        "architecture",
        "electron-smoke",
        "orchestrator-startup"
      ],
      "id": "T002",
      "title": "Пауза после отказа Kit и единственный оркестратор в приложении",
      "why": "Отказ Kit при назначении превращался в неизвестный исход и вечную паузу; вторая сессия без плана получала метку оркестратора.",
      "acceptance_criteria": [
        "Структурированный отказ Kit (штатный выход с JSON WorkflowError, кроме кодов неизвестного исхода) при создании или чтении назначения даёт паузу escalation с текстом «Kit отказал в назначении <задача>: …» без статуса UNKNOWN; таймауты, сигналы, сбои ввода-вывода и неструктурированный вывод остаются unknown без повторного создания; WORKFLOW_LOCKED и повторяемые ошибки чтения повторяются.",
        "Назначение без сессии исполнителя и без идущего создания или восстановления страницы не держит паузу: она становится «Пауза» с «Продолжить»; при идущем создании пауза ждёт его конца.",
        "Первый пользовательский ход кандидата после подтверждённого старта делает его владельцем через Kit (повтор при WORKFLOW_LOCKED, только при установленном Kit не ниже 1.9.7); новые сессии и остальные кандидаты становятся «Обсуждением», роль участника в WAL — S, следующий ответ панели содержит roleUpdate('discussion'); в sidebar «Новая сессия» у кандидата, «Оркестратор» у владельца.",
        "Удаление или архив сессии-владельца снимают запись; «Назначить оркестратором» доступно и до публикации плана как явная передача; версия приложения 0.5.29, панель пересобрана (npm run stage:chatgpt-plugin) с build 0.5.29-communication-4, протокол панели 4."
      ],
      "expected_commit_message": "fix: Пауза после отказа Kit и единственный оркестратор",
      "parallel_safe": false
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "review-publication-orchestrator",
        "task_id": "DOCS",
        "role": "implementation"
      },
      "dependencies": [
        "T001",
        "T002"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/planning/review-publication-and-orchestrator.md",
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/desktop.md",
        "docs/modules/workflow-execution.md",
        "docs/modules/orchestrated-execution.md",
        "docs/modules/orchestrator-startup.md",
        "docs/modules/release.md",
        "docs/modules/project-compatibility.md",
        "packages/workflow-kit/README.md",
        "tests/fixtures/released-kit/README.md",
        "packages/workflow-kit/docs/modules/workflow-kit-package.md",
        "packages/workflow-kit/docs/modules/orchestrated-plans.md",
        "docs/modules/chatgpt-plugin.md"
      ],
      "verification_ids": [],
      "id": "DOCS",
      "title": "Актуализация всех документов проекта",
      "why": "Сохранить компактные актуальные контракты перед сборкой.",
      "acceptance_criteria": [
        "Модули описывают проверку конфигурации при Review, паузу после отказа Kit и владельца планирования; действующий контракт перенесён из временной спецификации, спецификация удалена.",
        "Версии 0.5.29 и Kit 1.9.7 в контрактах; ограничения и ожидающая живая приёмка отмечены; документы не более 28000 байт UTF-8."
      ],
      "expected_commit_message": "docs: Актуализация всех документов проекта",
      "parallel_safe": false
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "review-publication-orchestrator",
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
      "title": "Собрать выпуск 0.5.29 для трёх ОС",
      "why": "Подготовить проверенный комплект macOS, Windows и Linux.",
      "verification_kind": "package",
      "acceptance_criteria": [
        "После DOCS собраны macOS arm64, Windows x64 и Linux x64 из одного sourceCommit; перед production-сборкой удалены только Python-кэши tools/codex-app-server-mcp."
      ],
      "expected_commit_message": "release: Собрать выпуск 0.5.29 для трёх ОС",
      "parallel_safe": false
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "review-publication-orchestrator",
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
      "title": "Установить выпуск 0.5.29",
      "why": "Доставить проверенную копию в Applications.",
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Штатный installer проверил версию, manifest, подпись и откат; приложение и служба агентом не закрываются и не запускаются."
      ],
      "expected_commit_message": "release: Установить выпуск 0.5.29",
      "parallel_safe": false
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "review-publication-orchestrator",
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
      "title": "Опубликовать выпуск 0.5.29 на GitHub",
      "why": "Завершить поставку.",
      "verification_kind": "package",
      "acceptance_criteria": [
        "GitHub Release v0.5.29 опубликован с тегом на sourceCommit, семью assets и сверенными digest и размерами; scope не архивируется автоматически."
      ],
      "expected_commit_message": "release: Опубликовать выпуск 0.5.29 на GitHub",
      "parallel_safe": false
    }
  ],
  "blocked_reason": null,
  "user_decisions": [
    {
      "id": "dbddf36b-d822-4a0f-ae4f-fecd802fd445",
      "text": "Прямое поручение пользователя 23.10.2026: закрыть work-progress-ui и открыть новый план по найденным ошибкам заблокированного после Review плана и по смене подхода к оркестратору — оркестратор, получивший задачу пользователя, единственный в проекте, пока план не выполнен и не закрыт; выпуск, установка и публикация как раньше.",
      "recorded_at": "2026-10-23T12:34:55.142Z"
    }
  ],
  "parallel_allowed": false,
  "max_workers": 1,
  "execution_strategy": "sequential",
  "execution_reason": "AGENTS.md предписывает работать самостоятельно; план выполняет этот агент последовательно. T002 использует запись владельца и проверки Kit из T001."
}
```
<!-- workflow-state:end -->

## Состояние

Execution Scope Status: ACTIVE
Delivery Status: IN_PROGRESS
Scope: review-publication-orchestrator
Current Task: нет
Revision: 948

## Цель

План, опубликованный через Review, всегда можно начать; отказ Kit при назначении не вешает паузу; в проекте один оркестратор с момента первой задачи до закрытия плана; выпуск 0.5.29 для трёх ОС опубликован.

## Критерии приёмки

- Review-публикация с неполной конфигурацией отказывает до записи; опубликованный план начинается.
- Отказ Kit при назначении — пауза с причиной и «Продолжить», без вечного «Пауза…».
- Вторая сессия во время подготовки или выполнения плана — «Обсуждение»; Kit отвергает чужую публикацию.
- Выпуск 0.5.29 трёх ОС опубликован, установлен; живая приёмка — у пользователя.

## Микрозадачи

Выполнение: sequential; разрешено: false; лимит: 1
Причина: AGENTS.md предписывает работать самостоятельно; план выполняет этот агент последовательно. T002 использует запись владельца и проверки Kit из T001.

- [TODO] T001: Kit 1.9.7: проверка конфигурации при Review и владелец планирования — Ожидает
  - Git Commit: [PENDING] feat: Kit проверяет конфигурацию при Review и знает владельца планирования
  - Reference: review-publication-orchestrator / T001 / implementation
  - Файлы: packages/workflow-kit/src/lib/actions.mjs, packages/workflow-kit/src/lib/plan-review.mjs, packages/workflow-kit/src/lib/review-state.mjs, packages/workflow-kit/src/lib/planning-owner.mjs, packages/workflow-kit/src/lib/simple-workflow.mjs, packages/workflow-kit/src/lib/recovery.mjs, packages/workflow-kit/src/lib/role-protocol.mjs, packages/workflow-kit/src/lib/common.mjs, packages/workflow-kit/src/lib/installer.mjs, packages/workflow-kit/package.json, package-lock.json, packages/workflow-kit/scripts/check-plan-review-fixture.mjs, packages/workflow-kit/scripts/check-runtime-fixture.mjs, tests/fixtures/released-kit/kit-1.9.6.tar.gz, tests/fixtures/released-kit/manifest.json, tests/workflow-kit-upgrade.test.mjs, tests/workflow-channel.test.mjs, tests/chatgpt-plugin.test.mjs, tests/fixtures/automatic-agent-dialogue.mjs, tests/fixtures/released-kit/README.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [TODO] T002: Пауза после отказа Kit и единственный оркестратор в приложении — Ожидает
  - Git Commit: [PENDING] fix: Пауза после отказа Kit и единственный оркестратор
  - Reference: review-publication-orchestrator / T002 / implementation
  - Файлы: src/control/workflow/parallel-kit.mjs, src/control/workflow/parallel-execution.mjs, src/control/workflow/coordination.mjs, src/control/sessions/workspace-session.mjs, src/control/plugin/communication.mjs, src/backend/desktop-model.mjs, src/frontend/desktop/ui/sidebar.mjs, src/contracts/backend.mjs, package.json, tests/parallel-execution.test.mjs, tests/orchestrated-execution.test.mjs, tests/session-roles.test.mjs, tests/workspace-session.test.mjs, tests/sidebar.test.mjs, tools/codex-app-server-mcp/plugin-ui.html, package-lock.json
  - Параллельность: исключительное выполнение
  - Зависимости: T001
- [TODO] DOCS: Актуализация всех документов проекта — Ожидает
  - Git Commit: [PENDING] docs: Актуализация всех документов проекта
  - Reference: review-publication-orchestrator / DOCS / implementation
  - Файлы: docs/planning/review-publication-and-orchestrator.md, README.md, docs/architecture/OVERVIEW.md, docs/modules/desktop.md, docs/modules/workflow-execution.md, docs/modules/orchestrated-execution.md, docs/modules/orchestrator-startup.md, docs/modules/release.md, docs/modules/project-compatibility.md, packages/workflow-kit/README.md, tests/fixtures/released-kit/README.md, packages/workflow-kit/docs/modules/workflow-kit-package.md, packages/workflow-kit/docs/modules/orchestrated-plans.md, docs/modules/chatgpt-plugin.md
  - Параллельность: исключительное выполнение
  - Зависимости: T001, T002
- [TODO] RELEASE: Собрать выпуск 0.5.29 для трёх ОС — Ожидает
  - Git Commit: [PENDING] release: Собрать выпуск 0.5.29 для трёх ОС
  - Reference: review-publication-orchestrator / RELEASE / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: DOCS
- [TODO] INSTALL: Установить выпуск 0.5.29 — Ожидает
  - Git Commit: [PENDING] release: Установить выпуск 0.5.29
  - Reference: review-publication-orchestrator / INSTALL / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: RELEASE, DOCS
- [TODO] PUBLISH: Опубликовать выпуск 0.5.29 на GitHub — Ожидает
  - Git Commit: [PENDING] release: Опубликовать выпуск 0.5.29 на GitHub
  - Reference: review-publication-orchestrator / PUBLISH / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: INSTALL, DOCS

## Context Pack For This Cycle

- docs/planning/review-publication-and-orchestrator.md
- docs/architecture/OVERVIEW.md

Служебные состояния меняются только командами workflow. Приёмка не архивирует scope.
