# Активный план — Workflow_Pilot

<!-- workflow-state:begin -->
```json
{
  "schema_version": 1,
  "plan_revision": 508,
  "project_id": "7411e192-943c-4529-bffb-3b081d9c242f",
  "project_name": "Workflow_Pilot",
  "scope_id": "workflow-pilot-plugin-communication",
  "execution_scope_status": "ACTIVE",
  "delivery_status": "READY_FOR_ACCEPTANCE",
  "objective": "Подготовить существующую панель Workflow Pilot к внешнему эксперименту связи агентов: модификация, автоматические тесты, поставка и передача; приёмка по результатам пользователя.",
  "acceptance_criteria": [
    "Тот же плагин и подключение: новый UI связи, подтверждённая адресация, сохраняемые сообщения/Stop, однократная доставка и полный очищенный журнал.",
    "Автоматические тесты на настоящих SDK/MCP/staged HTML и изолированном хосте проходят; общий MCP/основные сайдбары не сломаны.",
    "Согласованный выпуск трёх платформ, штатная установка и handoff исследовательскому агенту через пользователя.",
    "P0/P1 выполняются только в другом workspace; техническое DONE не означает приёмки. Успех и закрытие зависят от результатов пользователя; исправления здесь через plan:extend."
  ],
  "approved_scope": {
    "functional_paths": [
      "src/frontend/plugin/app.mjs",
      "src/frontend/plugin/launch.mjs",
      "src/control/plugin/service.mjs",
      "src/control/plugin/communication.mjs",
      "src/control/facade.mjs",
      "src/execution/plugin/bridge.mjs",
      "src/execution/facade.mjs",
      "src/backend/desktop-model.mjs",
      "src/contracts/backend.mjs",
      "tools/codex-app-server-mcp/plugin.py",
      "tests/chatgpt-plugin.test.mjs",
      "tests/fixtures/plugin-server.py",
      "tests/codex-app-server-mcp.test.mjs",
      "tests/backend-end-to-end.test.mjs",
      "src/frontend/plugin/panel.mjs",
      "src/frontend/plugin/index.html",
      "src/execution/plugin/communication-store.mjs",
      "tests/plugin-communication.test.mjs",
      "tests/plugin-communication-store.test.mjs",
      "src/frontend/plugin/navigation-probe.mjs",
      "src/control/plugin/launch.mjs",
      "src/frontend/desktop/ui/sidebar.mjs",
      "src/frontend/desktop/client.mjs",
      "src/frontend/desktop/preload.cjs",
      "src/contracts/desktop.mjs",
      "src/backend/protocol.mjs",
      "scripts/stage-chatgpt-plugin.mjs",
      "tests/sidebar.test.mjs",
      "tests/electron-smoke.mjs",
      "tests/backend-protocol.test.mjs",
      "src/frontend/desktop/ui/index.html",
      "package.json",
      "package-lock.json",
      "release-manifest.json",
      "tests/backend-upgrade.test.mjs",
      "tools/codex-app-server-mcp/codex-tools.lock.json"
    ],
    "documentation_paths": [
      "docs/planning/plugin-communication-panel.md",
      "docs/modules/chatgpt-plugin.md",
      "docs/modules/plugin-communication-handoff.md",
      "docs/modules/chatgpt-plugin-acceptance.md",
      "README.md",
      "docs/architecture/OVERVIEW.md",
      "docs/modules/release.md",
      "docs/planning/native-startup-followup.md",
      "docs/planning/executor-readiness-recovery.md",
      "docs/planning/plan-start-recovery.md",
      "docs/modules/desktop.md",
      "docs/modules/control.md",
      "docs/planning/plugin-panel-recovery.md",
      "docs/planning/plugin-plan-lifetime.md"
    ]
  },
  "baseline_commit": "e9c0d92cab215e3761bcaa36d5e719cd6f854db5",
  "current_task_id": null,
  "context_pack": {
    "documents": [
      {
        "path": "docs/planning/plugin-communication-panel.md",
        "required": true,
        "revision": "048478b6a9dc37ea95f9105606bcbdc5165b35a4"
      },
      {
        "path": "docs/architecture/OVERVIEW.md",
        "required": true,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/planning/plugin-panel-recovery.md",
        "required": true,
        "revision": "723ae93f131b4e3b817a616413def73f032c4005"
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
        "scope_id": "workflow-pilot-plugin-communication",
        "task_id": "T001",
        "role": "implementation"
      },
      "dependencies": [],
      "functional_paths": [
        "src/frontend/plugin/app.mjs",
        "src/frontend/plugin/launch.mjs",
        "src/control/plugin/service.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/facade.mjs",
        "src/execution/plugin/bridge.mjs",
        "src/execution/facade.mjs",
        "src/backend/desktop-model.mjs",
        "src/contracts/backend.mjs",
        "tools/codex-app-server-mcp/plugin.py",
        "tests/chatgpt-plugin.test.mjs",
        "tests/fixtures/plugin-server.py",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/backend-end-to-end.test.mjs",
        "src/frontend/plugin/panel.mjs",
        "src/frontend/plugin/index.html"
      ],
      "documentation_paths": [
        "docs/modules/chatgpt-plugin.md"
      ],
      "verification_ids": [
        "unit-all",
        "architecture",
        "executor-channel"
      ],
      "id": "T001",
      "title": "Контракт и минимальный сквозной путь связи",
      "why": "Контракт и минимальный сквозной путь связи",
      "acceptance_criteria": [
        "Закреплены реальные схемы message.send target:active/send:true, capabilities и metadata модельных/app-only вызовов; отсутствующие возможности приводят к явному отказу.",
        "Подтверждение панели и модельного участника, повторная проверка адресата перед Send и отказ при недоказуемой привязке описаны и проверены на fixtures; выбор sidebar не адресует сообщения.",
        "Один probe через настоящий staged HTML, SDK, Python MCP и существующий мост до test host; join/enable/wait/claim/report/read, базовые события, без target:new и живых моделей.",
        "Сохранены имя/endpoint/UI URI и общий MCP-каталог исполнителя; данные не возвращают UI, annotations/visibility соответствуют эффектам; минимальная probe отменяется Stop.",
        "Контракт в chatgpt-plugin.md описывает границу Control/Execution/Frontend, ошибки, состояние и наблюдаемость; fixture не объявлен доказательством ChatGPT.",
        "Строгие assertions полного MCP-каталога и e2e панели без Desktop обновлены под новый контракт, без удаления контроля общего исполнителя."
      ],
      "expected_commit_message": "feat: Контракт и минимальный сквозной путь связи",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/plugin-communication-panel.md",
            "required": true,
            "revision": "048478b6a9dc37ea95f9105606bcbdc5165b35a4"
          },
          {
            "path": "docs/modules/chatgpt-plugin.md",
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
      "actual_files": [
        "docs/modules/chatgpt-plugin.md",
        "src/backend/desktop-model.mjs",
        "src/contracts/backend.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/service.mjs",
        "src/execution/plugin/bridge.mjs",
        "src/frontend/plugin/app.mjs",
        "src/frontend/plugin/index.html",
        "src/frontend/plugin/launch.mjs",
        "tests/backend-end-to-end.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tools/codex-app-server-mcp/plugin.py"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-plugin-communication",
        "task_id": "T002",
        "role": "implementation"
      },
      "dependencies": [
        "T001"
      ],
      "functional_paths": [
        "src/control/plugin/communication.mjs",
        "src/control/plugin/service.mjs",
        "src/execution/plugin/communication-store.mjs",
        "src/execution/plugin/bridge.mjs",
        "src/control/facade.mjs",
        "src/execution/facade.mjs",
        "src/backend/desktop-model.mjs",
        "src/contracts/backend.mjs",
        "tools/codex-app-server-mcp/plugin.py",
        "tests/plugin-communication.test.mjs",
        "tests/plugin-communication-store.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/fixtures/plugin-server.py",
        "tests/codex-app-server-mcp.test.mjs"
      ],
      "documentation_paths": [
        "docs/modules/chatgpt-plugin.md"
      ],
      "verification_ids": [
        "unit-all",
        "architecture",
        "executor-channel"
      ],
      "id": "T002",
      "title": "Сохраняемые сообщения, привязка, Stop и журнал",
      "why": "Сохраняемые сообщения, привязка, Stop и журнал",
      "acceptance_criteria": [
        "Изолированный файловый адаптер сохраняет очередь, read, исход доставки и Stop; источник истины и порядок записи исключают подтверждение несохранённого сообщения.",
        "Два участника и две панели: проверка отправителя/адресата, in_reply_to, идемпотентность и конфликт; одна доставка, чужое чтение отклонено.",
        "Enable ограничен сроком/generation, Stop сохраняется; restart требует новой привязки/включения, probe не воспроизводится; claimed/accepted/unknown не переотправляются.",
        "JSONL с seq/event_id и восстановлением; corrupted tail и пробелы обнаруживаются, ошибки диска не теряют подтверждённое молча; критическая ошибка блокирует Send.",
        "Экспорт выбранного run и телеметрия очищены от секретов; журнал различает intent/SDK/host/read и локальный/подтверждённый Stop, late report не отменяет read."
      ],
      "expected_commit_message": "feat: Сохраняемые сообщения, привязка, Stop и журнал",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/plugin-communication-panel.md",
            "required": true,
            "revision": "048478b6a9dc37ea95f9105606bcbdc5165b35a4"
          },
          {
            "path": "docs/modules/chatgpt-plugin.md",
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
      "actual_files": [
        "docs/modules/chatgpt-plugin.md",
        "src/backend/desktop-model.mjs",
        "src/contracts/backend.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/plugin/service.mjs",
        "src/execution/facade.mjs",
        "src/execution/plugin/communication-store.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/plugin-communication-store.test.mjs",
        "tests/plugin-communication.test.mjs",
        "tools/codex-app-server-mcp/plugin.py"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-plugin-communication",
        "task_id": "T003",
        "role": "implementation"
      },
      "dependencies": [
        "T002"
      ],
      "functional_paths": [
        "src/frontend/plugin/app.mjs",
        "src/frontend/plugin/panel.mjs",
        "src/frontend/plugin/launch.mjs",
        "src/frontend/plugin/index.html",
        "src/frontend/plugin/navigation-probe.mjs",
        "src/control/plugin/launch.mjs",
        "src/control/plugin/service.mjs",
        "src/control/facade.mjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/frontend/desktop/client.mjs",
        "src/frontend/desktop/preload.cjs",
        "src/contracts/desktop.mjs",
        "src/contracts/backend.mjs",
        "src/backend/desktop-model.mjs",
        "src/backend/protocol.mjs",
        "tools/codex-app-server-mcp/plugin.py",
        "scripts/stage-chatgpt-plugin.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/sidebar.test.mjs",
        "tests/electron-smoke.mjs",
        "tests/backend-protocol.test.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/backend-end-to-end.test.mjs",
        "src/frontend/desktop/ui/index.html",
        "src/execution/plugin/bridge.mjs"
      ],
      "documentation_paths": [
        "docs/modules/chatgpt-plugin.md"
      ],
      "verification_ids": [
        "unit-all",
        "architecture",
        "electron-smoke",
        "executor-channel"
      ],
      "id": "T003",
      "title": "Новая панель и удаление прежнего эксперимента",
      "why": "Новая панель и удаление прежнего эксперимента",
      "acceptance_criteria": [
        "В том же плагине русский UI обеих тем и размеров: участник/run/привязка/build_id, enable/Stop/срок, очередь, состояния, лента/фильтры/экспорт; никаких прежних экспериментальных кнопок.",
        "Один wait на экземпляр с повтором timeout и ограниченным backoff ошибок, отменой dispose; seq ленты без второй частой polling-петли, видимые пробелы и ошибки.",
        "SDK Send требует актуального адресата/разрешения; unsupported и unknown видны; старый HTML/протокол явно отвергается.",
        "После проверки потребителей удалены target:new/navigation-probe и адресный пункт Новый чат через плагин; основные sidebar, внешние сессии и исполнитель MCP сохранены.",
        "Настоящий SDK в HTML, доставленном MCP, проверен через пользовательские входы test host; mock не подменяет SDK и не обещает фоновый ChatGPT.",
        "Удалена мёртвая разметка/стиль plugin-launch-notice основного окна; строгий каталог MCP и backend-end-to-end соответствуют новой панели без поля projects."
      ],
      "expected_commit_message": "feat: Новая панель и удаление прежнего эксперимента",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/plugin-communication-panel.md",
            "required": true,
            "revision": "048478b6a9dc37ea95f9105606bcbdc5165b35a4"
          },
          {
            "path": "docs/modules/chatgpt-plugin.md",
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
      "actual_files": [
        "docs/modules/chatgpt-plugin.md",
        "src/backend/desktop-model.mjs",
        "src/backend/protocol.mjs",
        "src/contracts/backend.mjs",
        "src/contracts/desktop.mjs",
        "src/control/plugin/launch.mjs",
        "src/control/plugin/service.mjs",
        "src/execution/plugin/bridge.mjs",
        "src/frontend/desktop/client.mjs",
        "src/frontend/desktop/preload.cjs",
        "src/frontend/desktop/ui/index.html",
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/frontend/plugin/app.mjs",
        "src/frontend/plugin/index.html",
        "src/frontend/plugin/launch.mjs",
        "src/frontend/plugin/navigation-probe.mjs",
        "src/frontend/plugin/panel.mjs",
        "tests/backend-end-to-end.test.mjs",
        "tests/backend-protocol.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/electron-smoke.mjs",
        "tests/sidebar.test.mjs",
        "tools/codex-app-server-mcp/plugin.py"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-plugin-communication",
        "task_id": "T004",
        "role": "implementation"
      },
      "dependencies": [
        "T003"
      ],
      "functional_paths": [
        "src/frontend/plugin/app.mjs",
        "src/frontend/plugin/launch.mjs",
        "src/control/plugin/service.mjs",
        "src/control/plugin/communication.mjs",
        "src/control/facade.mjs",
        "src/execution/plugin/bridge.mjs",
        "src/execution/facade.mjs",
        "src/backend/desktop-model.mjs",
        "src/contracts/backend.mjs",
        "tools/codex-app-server-mcp/plugin.py",
        "tests/chatgpt-plugin.test.mjs",
        "tests/fixtures/plugin-server.py",
        "src/execution/plugin/communication-store.mjs",
        "tests/plugin-communication.test.mjs",
        "tests/plugin-communication-store.test.mjs",
        "src/frontend/plugin/panel.mjs",
        "src/frontend/plugin/index.html",
        "src/frontend/plugin/navigation-probe.mjs",
        "src/control/plugin/launch.mjs",
        "src/frontend/desktop/ui/sidebar.mjs",
        "src/frontend/desktop/client.mjs",
        "src/frontend/desktop/preload.cjs",
        "src/contracts/desktop.mjs",
        "src/backend/protocol.mjs",
        "scripts/stage-chatgpt-plugin.mjs",
        "tests/sidebar.test.mjs",
        "tests/electron-smoke.mjs",
        "tests/backend-protocol.test.mjs",
        "package.json",
        "package-lock.json",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/backend-end-to-end.test.mjs",
        "src/frontend/desktop/ui/index.html",
        "tests/backend-upgrade.test.mjs",
        "tools/codex-app-server-mcp/codex-tools.lock.json"
      ],
      "documentation_paths": [
        "docs/modules/chatgpt-plugin.md"
      ],
      "verification_ids": [
        "unit-all",
        "architecture",
        "electron-smoke",
        "executor-channel",
        "codex-tools-live"
      ],
      "id": "T004",
      "title": "Матрица ошибок, регрессии и версия 0.5.2",
      "why": "Матрица ошибок, регрессии и версия 0.5.2",
      "acceptance_criteria": [
        "Полный fixture question/answer/result конечен; проверены две панели, чужой/сменившийся контекст, Stop на границах Send, expiry/dispose, restart, диск, потерянный ответ/report, повреждённый хвост и экспорт.",
        "Нет слепых повторов, утечки секретов или записи в рабочие профили; все назначенные проверки проходят с фактическими pass/fail/skip и после интеграции в main.",
        "Версия package/lock/панели согласована 0.5.2 после проверки тегов; версия протокола/build_id выявляют кэш; при коллизии номер не перезаписывать, уточнить через оркестратора.",
        "Рабочие планы, Kit и donor не меняются; старые отложенные startup/readiness задачи не объявлены реализованными."
      ],
      "expected_commit_message": "feat: Матрица ошибок, регрессии и версия 0.5.2",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/plugin-communication-panel.md",
            "required": true,
            "revision": "048478b6a9dc37ea95f9105606bcbdc5165b35a4"
          },
          {
            "path": "docs/modules/chatgpt-plugin.md",
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
      "actual_files": [
        "docs/modules/chatgpt-plugin.md",
        "package-lock.json",
        "package.json",
        "scripts/stage-chatgpt-plugin.mjs",
        "src/contracts/backend.mjs",
        "src/control/plugin/communication.mjs",
        "src/frontend/plugin/app.mjs",
        "src/frontend/plugin/index.html",
        "src/frontend/plugin/launch.mjs",
        "tests/backend-upgrade.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/plugin-communication.test.mjs",
        "tools/codex-app-server-mcp/codex-tools.lock.json"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-plugin-communication",
        "task_id": "T005",
        "role": "implementation"
      },
      "dependencies": [
        "T004"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/modules/plugin-communication-handoff.md",
        "docs/modules/chatgpt-plugin-acceptance.md",
        "docs/modules/chatgpt-plugin.md"
      ],
      "verification_ids": [],
      "id": "T005",
      "title": "Инструкция передачи и запуска внешнего эксперимента",
      "why": "Инструкция передачи и запуска внешнего эксперимента",
      "acceptance_criteria": [
        "Создан handoff с фактическими именами/схемами MCP, join/enable/Stop/probe/read/export, версиями, ожидаемыми событиями и точными инструкциями P0/P1 без запуска.",
        "Все живые проверки выполняет другой агент в Workflow_Pilot_Plugin_Communication_Experiment; пользователь переносит результаты сюда; NOT_RUN не заменено на PASS по fixtures.",
        "Описаны ручная остановка службы, завершение pending-установки готового комплекта и проверка версии/backend/MCP/build_id, переоткрытие той же панели и диагностика старого каталога.",
        "Техническое DONE означает готовность к эксперименту; приёмка и закрытие только после результата от пользователя, дефекты идут в plan:extend здесь; никаких сообщений исследовательскому агенту."
      ],
      "expected_commit_message": "feat: Инструкция передачи и запуска внешнего эксперимента",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/plugin-communication-panel.md",
            "required": true,
            "revision": "048478b6a9dc37ea95f9105606bcbdc5165b35a4"
          },
          {
            "path": "docs/modules/chatgpt-plugin.md",
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
      "actual_files": [
        "docs/modules/chatgpt-plugin-acceptance.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/plugin-communication-handoff.md"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-plugin-communication",
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
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/chatgpt-plugin-acceptance.md",
        "docs/modules/plugin-communication-handoff.md",
        "docs/modules/release.md",
        "docs/planning/plugin-communication-panel.md",
        "docs/planning/native-startup-followup.md",
        "docs/planning/executor-readiness-recovery.md",
        "docs/planning/plan-start-recovery.md",
        "docs/modules/desktop.md",
        "docs/modules/control.md"
      ],
      "verification_ids": [],
      "id": "DOCS",
      "title": "Актуализация всех документов проекта",
      "why": "Актуализация всех документов проекта",
      "acceptance_criteria": [
        "README/OVERVIEW/контракт и поставка согласованы с результатом 0.5.2; старый target:new и устаревшие инструкции убраны.",
        "Действующие требования spec перенесены в контракты/handoff до удаления временной spec; внешняя приёмка остаётся pending, незавершённые требования сохранены.",
        "Отложенные startup/readiness требования сохранены без обещания их включения в 0.5.2; документы не разрастаются сверх 28000 байт.",
        "Обычные задачи завершены и интегрированы до sourceCommit сборки; никаких объявлений живого PASS.",
        "desktop.md и control.md больше не описывают удалённые Новый чат через плагин и PluginLaunch; сохраняют действующие внешние сессии и границы слоёв."
      ],
      "expected_commit_message": "docs: Актуализация всех документов проекта",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/plugin-communication-panel.md",
            "required": true,
            "revision": "048478b6a9dc37ea95f9105606bcbdc5165b35a4"
          },
          {
            "path": "docs/modules/chatgpt-plugin.md",
            "required": true
          },
          {
            "path": "docs/architecture/OVERVIEW.md",
            "required": true
          },
          {
            "path": "docs/modules/release.md",
            "required": true
          }
        ],
        "include_last_completed_task": false,
        "dependency_task_ids": []
      },
      "actual_files": [
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/control.md",
        "docs/modules/desktop.md",
        "docs/modules/release.md",
        "docs/planning/executor-readiness-recovery.md",
        "docs/planning/native-startup-followup.md",
        "docs/planning/plan-start-recovery.md",
        "docs/planning/plugin-communication-panel.md"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-plugin-communication",
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
      "title": "Собрать единый выпуск 0.5.2",
      "why": "Собрать единый выпуск 0.5.2",
      "acceptance_criteria": [
        "Штатная общая сборка после DOCS: macOS arm64/Windows x64/Linux x64 из одного sourceCommit, проверены состав/архивы/manifest/digests и согласованные HTML/MCP/backend.",
        "Сохранены подпись и лицензии, полный комплект доставлен в Downloads; отсутствующие native/live проверки не объявлены пройденными."
      ],
      "expected_commit_message": "release: Собрать единый выпуск 0.5.2",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/plugin-communication-panel.md",
            "required": true,
            "revision": "048478b6a9dc37ea95f9105606bcbdc5165b35a4"
          },
          {
            "path": "docs/modules/release.md",
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
      "verification_kind": "package",
      "actual_files": [
        "release-manifest.json"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-plugin-communication",
        "task_id": "INSTALL",
        "role": "implementation"
      },
      "dependencies": [
        "DOCS",
        "RELEASE"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "release-installed"
      ],
      "id": "INSTALL",
      "title": "Установить проверенный macOS-комплект",
      "why": "Установить проверенный macOS-комплект",
      "acceptance_criteria": [
        "Штатный installer готового комплекта без пересборки/переподписи: /Applications/Workflow Pilot.app и собственная копия, signature/sourceCommit/version/rollback.",
        "Не останавливать рабочую службу; BACKEND_RUNNING означает pending, пользователь получает точные действия завершения; не сообщать активную новую версию до проверки."
      ],
      "expected_commit_message": "release: Установить проверенный macOS-комплект",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/plugin-communication-panel.md",
            "required": true,
            "revision": "048478b6a9dc37ea95f9105606bcbdc5165b35a4"
          },
          {
            "path": "docs/modules/release.md",
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
      "verification_kind": "installed",
      "actual_files": []
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-plugin-communication",
        "task_id": "PUBLISH",
        "role": "implementation"
      },
      "dependencies": [
        "DOCS",
        "INSTALL"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "github-release"
      ],
      "id": "PUBLISH",
      "title": "Опубликовать проверенный выпуск",
      "why": "Опубликовать проверенный выпуск",
      "acceptance_criteria": [
        "Штатная публикация собственного GitHub Release, remote main, tag на manifest.sourceCommit, полный состав assets/size/digest, без пересборки.",
        "Итог пользователю: комплект/установка/pending, тесты и handoff; статус готово к эксперименту, приёмка ждёт его результатов, план не архивировать."
      ],
      "expected_commit_message": "release: Опубликовать проверенный выпуск",
      "parallel_safe": false,
      "context_pack": {
        "documents": [
          {
            "path": "docs/planning/plugin-communication-panel.md",
            "required": true,
            "revision": "048478b6a9dc37ea95f9105606bcbdc5165b35a4"
          },
          {
            "path": "docs/modules/release.md",
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
      "verification_kind": "package",
      "actual_files": []
    },
    {
      "id": "T006",
      "title": "Восстановление панели, устойчивый Stop и разрешение на 30 минут",
      "why": "Восстановление панели, устойчивый Stop и разрешение на 30 минут",
      "dependencies": [
        "PUBLISH"
      ],
      "functional_paths": [
        "src/frontend/plugin/app.mjs",
        "src/frontend/plugin/launch.mjs",
        "src/frontend/plugin/panel.mjs",
        "src/frontend/plugin/index.html",
        "src/control/plugin/communication.mjs",
        "src/contracts/backend.mjs",
        "tools/codex-app-server-mcp/plugin.py",
        "tests/plugin-communication.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/backend-upgrade.test.mjs",
        "package.json",
        "package-lock.json"
      ],
      "documentation_paths": [
        "docs/planning/plugin-panel-recovery.md"
      ],
      "verification_ids": [
        "unit-all",
        "architecture",
        "electron-smoke",
        "executor-channel"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Новый mount и pageshow восстанавливают собственные run/participant по свежей identity; несколько run требуют выбора, разрешение только по клику.",
        "30 минут согласованы в backend/HTML/MCP; истечение и ручной Stop проверены. Автоматический Stop устаревшего экземпляра не отзывает новое поколение, повторный Stop идемпотентен.",
        "Настоящий staged SDK/MCP проверяет pending после reopen, отсутствие дублей, смену контекста, ошибки и причины блокировки; общий каталог сохранён.",
        "Версия 0.5.3, без изменения Kit/донора/рабочего профиля и запуска живых опытов."
      ],
      "expected_commit_message": "feat: Восстановление панели, устойчивый Stop и разрешение на 30 минут",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-plugin-communication",
        "task_id": "T006",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": [
        "package-lock.json",
        "package.json",
        "src/contracts/backend.mjs",
        "src/control/plugin/communication.mjs",
        "src/frontend/plugin/app.mjs",
        "src/frontend/plugin/index.html",
        "src/frontend/plugin/launch.mjs",
        "src/frontend/plugin/panel.mjs",
        "tests/backend-upgrade.test.mjs",
        "tests/chatgpt-plugin.test.mjs",
        "tests/codex-app-server-mcp.test.mjs",
        "tests/plugin-communication.test.mjs",
        "tools/codex-app-server-mcp/plugin.py"
      ]
    },
    {
      "id": "DOCS-2",
      "title": "Актуализация всех документов проекта",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-plugin-communication",
        "task_id": "DOCS-2",
        "role": "implementation",
        "iteration": 2
      },
      "why": "Перед выпуском сверить README, OVERVIEW и действующие контракты модулей с результатом; обновить устаревшее.",
      "dependencies": [
        "T006"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/architecture/OVERVIEW.md",
        "docs/planning/plugin-panel-recovery.md",
        "docs/planning/plugin-plan-lifetime.md",
        "README.md",
        "docs/modules/chatgpt-plugin-acceptance.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/plugin-communication-handoff.md",
        "docs/modules/release.md"
      ],
      "acceptance_criteria": [
        "Документы описывают текущий результат, существенное из выпущенных рабочих спецификаций перенесено в контракты модулей; история остаётся в Git.",
        "Текущее восстановление и 30 минут отражены в контракте/инструкции; результаты 0.5.2 не подменяют приёмку 0.5.3. Согласованная связь до завершения плана сохранена как отложенное требование."
      ],
      "verification_ids": [],
      "expected_commit_message": "docs: актуализировать документацию проекта",
      "parallel_safe": false,
      "actual_files": [
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/chatgpt-plugin-acceptance.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/plugin-communication-handoff.md",
        "docs/modules/release.md",
        "docs/planning/plugin-panel-recovery.md",
        "docs/planning/plugin-plan-lifetime.md"
      ]
    },
    {
      "id": "RELEASE-2",
      "title": "Собрать единый выпуск 0.5.3",
      "why": "Собрать единый выпуск 0.5.3",
      "dependencies": [
        "T006",
        "DOCS-2"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/plugin-panel-recovery.md"
      ],
      "verification_ids": [
        "three-platform-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "После новой DOCS три платформы из одного sourceCommit, архивы/manifest/digests проверены, полный комплект в Downloads."
      ],
      "expected_commit_message": "release: Собрать единый выпуск 0.5.3",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-plugin-communication",
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
      "title": "Установить готовое macOS-приложение 0.5.3",
      "why": "Установить готовое macOS-приложение 0.5.3",
      "dependencies": [
        "RELEASE-2",
        "DOCS-2"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/plugin-panel-recovery.md"
      ],
      "verification_ids": [
        "release-installed"
      ],
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Штатный installer без пересборки; Applications и собственная копия проверены. При работающей службе оставить pending и сообщить пользователю."
      ],
      "expected_commit_message": "release: Установить готовое macOS-приложение 0.5.3",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-plugin-communication",
        "task_id": "INSTALL-2",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": []
    },
    {
      "id": "PUBLISH-2",
      "title": "Опубликовать проверенный выпуск 0.5.3",
      "why": "Опубликовать проверенный выпуск 0.5.3",
      "dependencies": [
        "INSTALL-2",
        "DOCS-2"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/plugin-panel-recovery.md"
      ],
      "verification_ids": [
        "github-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "Собственный GitHub Release, тег sourceCommit, все assets size/digest; итоговая передача пользователю, приёмка восстановления pending."
      ],
      "expected_commit_message": "release: Опубликовать проверенный выпуск 0.5.3",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-plugin-communication",
        "task_id": "PUBLISH-2",
        "role": "implementation"
      },
      "parallel_safe": false,
      "actual_files": []
    }
  ],
  "blocked_reason": null,
  "user_decisions": [
    {
      "id": "7187378d-328c-4d28-aa61-8335ebbb4c48",
      "text": "Пользователь поручил подготовить спецификацию и to-do модификации панели. Выполнение запускает кнопкой плана; живые эксперименты проводятся в другом workspace, результаты и исправления пользователь передаёт сюда.",
      "recorded_at": "2026-10-18T13:26:11.050Z"
    },
    {
      "id": "manual-execution-20261018",
      "recorded_at": "2026-10-18T13:57:38.601Z",
      "text": "Пользователь поручил отменить не начатую реализацию исполнителя T001, удалить его worktree, ветку и назначение, а весь согласованный план выполнить самостоятельно от начала до конца. Это исключение из оркестрованного режима для данного плана, не приёмка и не DONE. Живые P0/P1 остаются внешними."
    }
  ],
  "parallel_allowed": false,
  "max_workers": 1,
  "execution_strategy": "sequential",
  "execution_reason": "По прямому поручению пользователя 18.10.2026 один агент выполняет весь план в основном checkout без назначений. Прежний исполнитель отменён до реализации; объём, проверки, DOCS и поставка сохранены."
}
```
<!-- workflow-state:end -->

## Состояние

Execution Scope Status: ACTIVE
Delivery Status: READY_FOR_ACCEPTANCE
Scope: workflow-pilot-plugin-communication
Current Task: нет
Revision: 508

## Цель

Подготовить существующую панель Workflow Pilot к внешнему эксперименту связи агентов: модификация, автоматические тесты, поставка и передача; приёмка по результатам пользователя.

## Критерии приёмки

- Тот же плагин и подключение: новый UI связи, подтверждённая адресация, сохраняемые сообщения/Stop, однократная доставка и полный очищенный журнал.
- Автоматические тесты на настоящих SDK/MCP/staged HTML и изолированном хосте проходят; общий MCP/основные сайдбары не сломаны.
- Согласованный выпуск трёх платформ, штатная установка и handoff исследовательскому агенту через пользователя.
- P0/P1 выполняются только в другом workspace; техническое DONE не означает приёмки. Успех и закрытие зависят от результатов пользователя; исправления здесь через plan:extend.

## Микрозадачи

Выполнение: sequential; разрешено: false; лимит: 1
Причина: По прямому поручению пользователя 18.10.2026 один агент выполняет весь план в основном checkout без назначений. Прежний исполнитель отменён до реализации; объём, проверки, DOCS и поставка сохранены.

- [DONE] T001: Контракт и минимальный сквозной путь связи — Завершено
  - Git Commit: [DONE] feat: Контракт и минимальный сквозной путь связи
  - Reference: workflow-pilot-plugin-communication / T001 / implementation
  - Файлы: src/frontend/plugin/app.mjs, src/frontend/plugin/launch.mjs, src/control/plugin/service.mjs, src/control/plugin/communication.mjs, src/control/facade.mjs, src/execution/plugin/bridge.mjs, src/execution/facade.mjs, src/backend/desktop-model.mjs, src/contracts/backend.mjs, tools/codex-app-server-mcp/plugin.py, tests/chatgpt-plugin.test.mjs, tests/fixtures/plugin-server.py, tests/codex-app-server-mcp.test.mjs, tests/backend-end-to-end.test.mjs, src/frontend/plugin/panel.mjs, src/frontend/plugin/index.html, docs/modules/chatgpt-plugin.md
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] T002: Сохраняемые сообщения, привязка, Stop и журнал — Завершено
  - Git Commit: [DONE] feat: Сохраняемые сообщения, привязка, Stop и журнал
  - Reference: workflow-pilot-plugin-communication / T002 / implementation
  - Файлы: src/control/plugin/communication.mjs, src/control/plugin/service.mjs, src/execution/plugin/communication-store.mjs, src/execution/plugin/bridge.mjs, src/control/facade.mjs, src/execution/facade.mjs, src/backend/desktop-model.mjs, src/contracts/backend.mjs, tools/codex-app-server-mcp/plugin.py, tests/plugin-communication.test.mjs, tests/plugin-communication-store.test.mjs, tests/chatgpt-plugin.test.mjs, tests/fixtures/plugin-server.py, tests/codex-app-server-mcp.test.mjs, docs/modules/chatgpt-plugin.md
  - Параллельность: исключительное выполнение
  - Зависимости: T001
- [DONE] T003: Новая панель и удаление прежнего эксперимента — Завершено
  - Git Commit: [DONE] feat: Новая панель и удаление прежнего эксперимента
  - Reference: workflow-pilot-plugin-communication / T003 / implementation
  - Файлы: src/frontend/plugin/app.mjs, src/frontend/plugin/panel.mjs, src/frontend/plugin/launch.mjs, src/frontend/plugin/index.html, src/frontend/plugin/navigation-probe.mjs, src/control/plugin/launch.mjs, src/control/plugin/service.mjs, src/control/facade.mjs, src/frontend/desktop/ui/sidebar.mjs, src/frontend/desktop/client.mjs, src/frontend/desktop/preload.cjs, src/contracts/desktop.mjs, src/contracts/backend.mjs, src/backend/desktop-model.mjs, src/backend/protocol.mjs, tools/codex-app-server-mcp/plugin.py, scripts/stage-chatgpt-plugin.mjs, tests/chatgpt-plugin.test.mjs, tests/sidebar.test.mjs, tests/electron-smoke.mjs, tests/backend-protocol.test.mjs, tests/codex-app-server-mcp.test.mjs, tests/backend-end-to-end.test.mjs, src/frontend/desktop/ui/index.html, src/execution/plugin/bridge.mjs, docs/modules/chatgpt-plugin.md
  - Параллельность: исключительное выполнение
  - Зависимости: T002
- [DONE] T004: Матрица ошибок, регрессии и версия 0.5.2 — Завершено
  - Git Commit: [DONE] feat: Матрица ошибок, регрессии и версия 0.5.2
  - Reference: workflow-pilot-plugin-communication / T004 / implementation
  - Файлы: src/frontend/plugin/app.mjs, src/frontend/plugin/launch.mjs, src/control/plugin/service.mjs, src/control/plugin/communication.mjs, src/control/facade.mjs, src/execution/plugin/bridge.mjs, src/execution/facade.mjs, src/backend/desktop-model.mjs, src/contracts/backend.mjs, tools/codex-app-server-mcp/plugin.py, tests/chatgpt-plugin.test.mjs, tests/fixtures/plugin-server.py, src/execution/plugin/communication-store.mjs, tests/plugin-communication.test.mjs, tests/plugin-communication-store.test.mjs, src/frontend/plugin/panel.mjs, src/frontend/plugin/index.html, src/frontend/plugin/navigation-probe.mjs, src/control/plugin/launch.mjs, src/frontend/desktop/ui/sidebar.mjs, src/frontend/desktop/client.mjs, src/frontend/desktop/preload.cjs, src/contracts/desktop.mjs, src/backend/protocol.mjs, scripts/stage-chatgpt-plugin.mjs, tests/sidebar.test.mjs, tests/electron-smoke.mjs, tests/backend-protocol.test.mjs, package.json, package-lock.json, tests/codex-app-server-mcp.test.mjs, tests/backend-end-to-end.test.mjs, src/frontend/desktop/ui/index.html, tests/backend-upgrade.test.mjs, tools/codex-app-server-mcp/codex-tools.lock.json, docs/modules/chatgpt-plugin.md
  - Параллельность: исключительное выполнение
  - Зависимости: T003
- [DONE] T005: Инструкция передачи и запуска внешнего эксперимента — Завершено
  - Git Commit: [DONE] feat: Инструкция передачи и запуска внешнего эксперимента
  - Reference: workflow-pilot-plugin-communication / T005 / implementation
  - Файлы: docs/modules/plugin-communication-handoff.md, docs/modules/chatgpt-plugin-acceptance.md, docs/modules/chatgpt-plugin.md
  - Параллельность: исключительное выполнение
  - Зависимости: T004
- [DONE] DOCS: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: Актуализация всех документов проекта
  - Reference: workflow-pilot-plugin-communication / DOCS / implementation
  - Файлы: README.md, docs/architecture/OVERVIEW.md, docs/modules/chatgpt-plugin.md, docs/modules/chatgpt-plugin-acceptance.md, docs/modules/plugin-communication-handoff.md, docs/modules/release.md, docs/planning/plugin-communication-panel.md, docs/planning/native-startup-followup.md, docs/planning/executor-readiness-recovery.md, docs/planning/plan-start-recovery.md, docs/modules/desktop.md, docs/modules/control.md
  - Параллельность: исключительное выполнение
  - Зависимости: T001, T002, T003, T004, T005
- [DONE] RELEASE: Собрать единый выпуск 0.5.2 — Завершено
  - Git Commit: [DONE] release: Собрать единый выпуск 0.5.2
  - Reference: workflow-pilot-plugin-communication / RELEASE / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: DOCS
- [DONE] INSTALL: Установить проверенный macOS-комплект — Завершено
  - Git Commit: [DONE] release: Установить проверенный macOS-комплект
  - Reference: workflow-pilot-plugin-communication / INSTALL / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: DOCS, RELEASE
- [DONE] PUBLISH: Опубликовать проверенный выпуск — Завершено
  - Git Commit: [DONE] release: Опубликовать проверенный выпуск
  - Reference: workflow-pilot-plugin-communication / PUBLISH / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: DOCS, INSTALL
- [DONE] T006: Восстановление панели, устойчивый Stop и разрешение на 30 минут — Завершено
  - Git Commit: [DONE] feat: Восстановление панели, устойчивый Stop и разрешение на 30 минут
  - Reference: workflow-pilot-plugin-communication / T006 / implementation
  - Файлы: src/frontend/plugin/app.mjs, src/frontend/plugin/launch.mjs, src/frontend/plugin/panel.mjs, src/frontend/plugin/index.html, src/control/plugin/communication.mjs, src/contracts/backend.mjs, tools/codex-app-server-mcp/plugin.py, tests/plugin-communication.test.mjs, tests/chatgpt-plugin.test.mjs, tests/codex-app-server-mcp.test.mjs, tests/backend-upgrade.test.mjs, package.json, package-lock.json, docs/planning/plugin-panel-recovery.md
  - Параллельность: исключительное выполнение
  - Зависимости: PUBLISH
- [DONE] DOCS-2: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: актуализировать документацию проекта
  - Reference: workflow-pilot-plugin-communication / DOCS-2 / implementation
  - Файлы: docs/architecture/OVERVIEW.md, docs/planning/plugin-panel-recovery.md, docs/planning/plugin-plan-lifetime.md, README.md, docs/modules/chatgpt-plugin-acceptance.md, docs/modules/chatgpt-plugin.md, docs/modules/plugin-communication-handoff.md, docs/modules/release.md
  - Параллельность: исключительное выполнение
  - Зависимости: T006
- [DONE] RELEASE-2: Собрать единый выпуск 0.5.3 — Завершено
  - Git Commit: [DONE] release: Собрать единый выпуск 0.5.3
  - Reference: workflow-pilot-plugin-communication / RELEASE-2 / implementation
  - Файлы: release-manifest.json, docs/planning/plugin-panel-recovery.md
  - Параллельность: исключительное выполнение
  - Зависимости: T006, DOCS-2
- [DONE] INSTALL-2: Установить готовое macOS-приложение 0.5.3 — Завершено
  - Git Commit: [DONE] release: Установить готовое macOS-приложение 0.5.3
  - Reference: workflow-pilot-plugin-communication / INSTALL-2 / implementation
  - Файлы: release-manifest.json, docs/planning/plugin-panel-recovery.md
  - Параллельность: исключительное выполнение
  - Зависимости: RELEASE-2, DOCS-2
- [DONE] PUBLISH-2: Опубликовать проверенный выпуск 0.5.3 — Завершено
  - Git Commit: [DONE] release: Опубликовать проверенный выпуск 0.5.3
  - Reference: workflow-pilot-plugin-communication / PUBLISH-2 / implementation
  - Файлы: release-manifest.json, docs/planning/plugin-panel-recovery.md
  - Параллельность: исключительное выполнение
  - Зависимости: INSTALL-2, DOCS-2

## Context Pack For This Cycle

- docs/planning/plugin-communication-panel.md
- docs/architecture/OVERVIEW.md
- docs/planning/plugin-panel-recovery.md

Служебные состояния меняются только командами workflow. Приёмка не архивирует scope.
