# Активный план — Workflow_Pilot

<!-- workflow-state:begin -->
```json
{
  "schema_version": 1,
  "plan_revision": 451,
  "project_id": "7411e192-943c-4529-bffb-3b081d9c242f",
  "project_name": "Workflow_Pilot",
  "scope_id": "workflow-pilot-native-window",
  "execution_scope_status": "ACTIVE",
  "delivery_status": "IN_PROGRESS",
  "objective": "Выпуск 0.5.0: на Mac обычный запуск открывает встроенное окно фоновой службы с родным сайдбаром и настоящей страницей ChatGPT; HTTP-клиент остаётся для теста, iPad и будущего VPS",
  "acceptance_criteria": [
    "Выпуск 0.5.0: на Mac обычный запуск открывает встроенное окно фоновой службы с родным сайдбаром и настоящей страницей ChatGPT; HTTP-клиент остаётся для теста, iPad и будущего VPS"
  ],
  "approved_scope": {
    "functional_paths": [
      "src/execution/browser/backend-host.mjs",
      "src/execution/browser/presentation/host.mjs",
      "src/execution/facade.mjs",
      "src/backend/main.mjs",
      "tests/backend-native-pages.test.mjs",
      "tests/browser-presentation.test.mjs",
      "src/backend/native-window.mjs",
      "src/backend/desktop-model.mjs",
      "src/backend/remote-surface.mjs",
      "src/backend/operations.mjs",
      "src/frontend/desktop/chat-colors-window.mjs",
      "tests/backend-native-window.test.mjs",
      "src/contracts/launch.mjs",
      "src/frontend/desktop/client.mjs",
      "src/backend/status-menu.mjs",
      "tests/launch-mode.test.mjs",
      "tests/electron-smoke.mjs",
      "package.json",
      "package-lock.json",
      "src/frontend/plugin/index.html",
      "src/frontend/plugin/app.mjs",
      "tests/backend-upgrade.test.mjs",
      "release-manifest.json",
      "src/backend/lifecycle.mjs",
      "src/main.mjs",
      "tests/backend-browser-lifecycle.test.mjs",
      "src/contracts/backend.mjs"
    ],
    "documentation_paths": [
      "docs/planning/native-window.md",
      "README.md",
      "docs/architecture/OVERVIEW.md",
      "AGENTS.md",
      "docs/acceptance/backend-independence.md",
      "docs/modules/backend.md",
      "docs/modules/browser.md",
      "docs/modules/desktop.md",
      "docs/modules/native-window.md"
    ]
  },
  "baseline_commit": "ecca668d094231a3b9c1afbc42ac00890d6c530e",
  "current_task_id": null,
  "context_pack": {
    "documents": [
      {
        "path": "docs/planning/native-window.md",
        "required": true,
        "revision": "9cad16bb8c3fd585f755cb69220fe5ef25c08c62"
      },
      {
        "path": "docs/architecture/OVERVIEW.md",
        "required": true,
        "revision": "WORKTREE"
      },
      {
        "path": "docs/modules/native-window.md",
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
        "scope_id": "workflow-pilot-native-window",
        "task_id": "T001",
        "role": "implementation"
      },
      "dependencies": [],
      "functional_paths": [
        "src/execution/browser/backend-host.mjs",
        "src/execution/browser/presentation/host.mjs",
        "src/execution/facade.mjs",
        "src/backend/main.mjs",
        "tests/backend-native-pages.test.mjs",
        "tests/browser-presentation.test.mjs",
        "src/backend/lifecycle.mjs",
        "src/contracts/launch.mjs",
        "src/main.mjs",
        "tests/backend-browser-lifecycle.test.mjs",
        "tests/backend-upgrade.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/native-window.md"
      ],
      "verification_ids": [
        "unit-all",
        "architecture"
      ],
      "id": "T001",
      "title": "Страницы службы в режиме view",
      "why": "Встроенное окно показывает настоящий WebContentsView; offscreen-страницу показать нельзя.",
      "verification_kind": "code",
      "acceptance_criteria": [
        "BackendBrowserHost создаёт страницы в режиме view (WebContentsView в скрытом окне-хосте) на macOS и offscreen в остальных случаях; режим выбирается при старте службы",
        "Страница переносится в контейнер окна и обратно без перезагрузки; CDP и перехват выбора файлов сохраняются",
        "Fixture-служба в режиме view: страница fixture-чата в окне-хосте загружается, наблюдатель видит состояние, отправка проходит, кадры для HTTP-зрителя непустые, ввод доходит",
        "Если режим view не проходит любую из проверок, задача блокируется и решение возвращается пользователю"
      ],
      "expected_commit_message": "feat: Страницы службы в режиме view",
      "actual_files": [
        "docs/planning/native-window.md",
        "src/backend/lifecycle.mjs",
        "src/backend/main.mjs",
        "src/contracts/launch.mjs",
        "src/execution/browser/backend-host.mjs",
        "src/execution/browser/presentation/host.mjs",
        "src/main.mjs",
        "tests/backend-browser-lifecycle.test.mjs",
        "tests/backend-upgrade.test.mjs",
        "tests/backend-native-pages.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-native-window",
        "task_id": "T002",
        "role": "implementation"
      },
      "dependencies": [
        "T001"
      ],
      "functional_paths": [
        "src/backend/native-window.mjs",
        "src/backend/main.mjs",
        "src/backend/desktop-model.mjs",
        "src/backend/remote-surface.mjs",
        "src/backend/operations.mjs",
        "src/frontend/desktop/chat-colors-window.mjs",
        "tests/backend-native-window.test.mjs",
        "src/execution/browser/backend-host.mjs",
        "src/frontend/desktop/client.mjs",
        "src/main.mjs"
      ],
      "documentation_paths": [
        "docs/planning/native-window.md"
      ],
      "verification_ids": [
        "unit-all",
        "architecture"
      ],
      "id": "T002",
      "title": "Встроенное окно фоновой службы",
      "why": "Родной сайдбар и страница ChatGPT в одном окне без HTTP.",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Служба открывает окно с сайдбаром (ui/index.html, preload.cjs по пути ресурса) и выбранной страницей справа; границы модулей не нарушены",
        "Состояние публикуется встроенному окну и потоку событий; архив, цвета и выбор папки открываются у окна-инициатора",
        "Действия сайдбара идут через операции службы с allowlist, журналом и lease; встроенное окно и HTTP-клиент работают одновременно с передачей управления",
        "Закрытие окна (кнопка, Cmd+W, Cmd+Q окна) возвращает страницу в окно-хост и не останавливает службу; Dock-плитка только при открытом окне"
      ],
      "expected_commit_message": "feat: Встроенное окно фоновой службы",
      "actual_files": [
        "docs/planning/native-window.md",
        "src/backend/main.mjs",
        "src/execution/browser/backend-host.mjs",
        "src/frontend/desktop/client.mjs",
        "src/main.mjs",
        "tests/backend-native-window.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-native-window",
        "task_id": "T003",
        "role": "implementation"
      },
      "dependencies": [
        "T002"
      ],
      "functional_paths": [
        "src/contracts/launch.mjs",
        "src/frontend/desktop/client.mjs",
        "src/backend/main.mjs",
        "src/backend/status-menu.mjs",
        "src/backend/native-window.mjs",
        "tests/launch-mode.test.mjs",
        "tests/backend-native-window.test.mjs",
        "src/backend/operations.mjs",
        "src/contracts/backend.mjs",
        "src/main.mjs",
        "tests/backend-upgrade.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/native-window.md"
      ],
      "verification_ids": [
        "unit-all",
        "architecture"
      ],
      "id": "T003",
      "title": "Запуск встроенного окна и окно через HTTP",
      "why": "Обычный запуск открывает встроенное окно, HTTP-клиент — пунктом меню.",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Обычный запуск на Mac запускает службу при необходимости и открывает встроенное окно; процесс запуска завершается",
        "Работающая служба на повторный запуск, activate и пункт меню значка показывает своё окно, а не клиент",
        "Пункт «Окно через HTTP (тест)» в меню значка и меню окна запускает прежний клиент; на Linux обычный запуск открывает клиент как раньше"
      ],
      "expected_commit_message": "feat: Запуск встроенного окна и окно через HTTP",
      "actual_files": [
        "docs/planning/native-window.md",
        "src/backend/main.mjs",
        "src/backend/operations.mjs",
        "src/backend/status-menu.mjs",
        "src/contracts/backend.mjs",
        "src/contracts/launch.mjs",
        "src/frontend/desktop/client.mjs",
        "src/main.mjs",
        "tests/backend-native-window.test.mjs",
        "tests/backend-upgrade.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-native-window",
        "task_id": "T004",
        "role": "implementation"
      },
      "dependencies": [
        "T003"
      ],
      "functional_paths": [
        "tests/electron-smoke.mjs",
        "tests/backend-native-window.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/native-window.md"
      ],
      "verification_ids": [
        "unit-all",
        "electron-smoke",
        "kit-check",
        "architecture",
        "migration-compatibility"
      ],
      "id": "T004",
      "title": "Проверить оба режима вместе",
      "why": "Сквозная проверка перед выпуском.",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Встроенное окно и HTTP-клиент на одной fixture-службе: выбор сессии, отправка, закрытие окна во время работы, повторное открытие",
        "Ограничения и pending живой приёмки записаны в спецификацию"
      ],
      "expected_commit_message": "test: Проверить встроенное окно и HTTP-клиент",
      "actual_files": [
        "docs/planning/native-window.md",
        "tests/backend-native-window.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-native-window",
        "task_id": "T005",
        "role": "implementation"
      },
      "dependencies": [
        "T004"
      ],
      "functional_paths": [
        "package.json",
        "package-lock.json",
        "src/frontend/plugin/index.html",
        "src/frontend/plugin/app.mjs",
        "tests/backend-upgrade.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/native-window.md"
      ],
      "verification_ids": [
        "release-tooling",
        "unit-all"
      ],
      "id": "T005",
      "title": "Подготовить версию 0.5.0",
      "why": "Номер выпуска.",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Версия 0.5.0 в package/lock и панели плагина"
      ],
      "expected_commit_message": "feat: Подготовить версию 0.5.0",
      "actual_files": [
        "package.json",
        "package-lock.json",
        "src/frontend/plugin/index.html",
        "src/frontend/plugin/app.mjs",
        "tests/backend-upgrade.test.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-native-window",
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
        "docs/planning/native-window.md",
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "AGENTS.md",
        "docs/acceptance/backend-independence.md",
        "docs/modules/backend.md",
        "docs/modules/browser.md",
        "docs/modules/desktop.md",
        "docs/modules/native-window.md"
      ],
      "verification_ids": [],
      "id": "DOCS",
      "title": "Актуализация всех документов проекта",
      "why": "Сохранить актуальный контекст для следующего агента",
      "acceptance_criteria": [
        "Документы соответствуют результату"
      ],
      "expected_commit_message": "docs: актуализировать контекст проекта",
      "actual_files": [
        "AGENTS.md",
        "README.md",
        "docs/acceptance/backend-independence.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/backend.md",
        "docs/modules/browser.md",
        "docs/modules/desktop.md",
        "docs/planning/native-window.md",
        "docs/modules/native-window.md"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-native-window",
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
      "documentation_paths": [
        "docs/planning/native-window.md"
      ],
      "verification_ids": [
        "three-platform-release"
      ],
      "id": "T006",
      "title": "Собрать выпуск 0.5.0 трёх ОС",
      "why": "Комплект после DOCS.",
      "verification_kind": "package",
      "acceptance_criteria": [
        "Три ОС из одного sourceCommit после DOCS; manifest совпадает"
      ],
      "expected_commit_message": "release: Собрать выпуск 0.5.0 трёх ОС",
      "actual_files": [
        "release-manifest.json"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-native-window",
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
      "documentation_paths": [
        "docs/planning/native-window.md"
      ],
      "verification_ids": [
        "release-installed"
      ],
      "id": "T007",
      "title": "Установить 0.5.0 в Applications",
      "why": "Обновить приложение.",
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Установка готового комплекта без пересборки; при работающей службе — pending"
      ],
      "expected_commit_message": "release: Установить 0.5.0 в Applications",
      "actual_files": []
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-native-window",
        "task_id": "T008",
        "role": "implementation"
      },
      "dependencies": [
        "T007",
        "DOCS"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/native-window.md"
      ],
      "verification_ids": [
        "github-release"
      ],
      "id": "T008",
      "title": "Опубликовать GitHub Release 0.5.0",
      "why": "Опубликовать комплект.",
      "verification_kind": "package",
      "acceptance_criteria": [
        "Тег v0.5.0 на sourceCommit, assets сверены, remote main = HEAD"
      ],
      "expected_commit_message": "release: Опубликовать GitHub Release 0.5.0",
      "actual_files": []
    },
    {
      "id": "T009",
      "title": "Встроенное окно на всех трёх ОС",
      "why": "Выпуски macOS, Windows и Linux всегда одинаковы по интерфейсу.",
      "dependencies": [],
      "functional_paths": [
        "src/backend/main.mjs",
        "src/contracts/launch.mjs",
        "tests/backend-native-pages.test.mjs",
        "tests/backend-upgrade.test.mjs",
        "src/execution/browser/backend-host.mjs"
      ],
      "documentation_paths": [
        "docs/modules/native-window.md"
      ],
      "verification_ids": [
        "unit-all",
        "architecture"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Страницы службы в режиме view и встроенное окно на macOS, Windows и Linux; offscreen только по флагу разработки",
        "Обычный запуск на любой ОС открывает встроенное окно, «Окно через HTTP (тест)» — HTTP-клиент на всех трёх",
        "Мак-специфичное (Dock, activation policy) остаётся только на macOS"
      ],
      "expected_commit_message": "feat: Встроенное окно на всех трёх ОС",
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-native-window",
        "task_id": "T009",
        "role": "implementation"
      },
      "actual_files": [
        "docs/modules/native-window.md",
        "src/backend/main.mjs",
        "src/contracts/launch.mjs",
        "src/execution/browser/backend-host.mjs",
        "tests/backend-native-pages.test.mjs",
        "tests/backend-upgrade.test.mjs"
      ]
    },
    {
      "id": "T010",
      "title": "Подготовить версию 0.5.1",
      "why": "Номер выпуска.",
      "dependencies": [
        "T009"
      ],
      "functional_paths": [
        "package.json",
        "package-lock.json",
        "src/frontend/plugin/index.html",
        "src/frontend/plugin/app.mjs",
        "tests/backend-upgrade.test.mjs"
      ],
      "documentation_paths": [
        "docs/modules/native-window.md"
      ],
      "verification_ids": [
        "release-tooling",
        "unit-all"
      ],
      "verification_kind": "code",
      "acceptance_criteria": [
        "Версия 0.5.1 в package/lock и панели плагина"
      ],
      "expected_commit_message": "feat: Подготовить версию 0.5.1",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-native-window",
        "task_id": "T010",
        "role": "implementation"
      }
    },
    {
      "id": "DOCS-2",
      "title": "Актуализация всех документов проекта",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-native-window",
        "task_id": "DOCS-2",
        "role": "implementation",
        "iteration": 2
      },
      "why": "Перед выпуском сверить README, OVERVIEW и действующие контракты модулей с результатом; обновить устаревшее.",
      "dependencies": [
        "T009",
        "T010"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/architecture/OVERVIEW.md",
        "docs/modules/native-window.md"
      ],
      "acceptance_criteria": [
        "Документы описывают текущий результат, существенное из выпущенных рабочих спецификаций перенесено в контракты модулей; история остаётся в Git."
      ],
      "verification_ids": [],
      "expected_commit_message": "docs: актуализировать документацию проекта"
    },
    {
      "id": "T011",
      "title": "Собрать выпуск 0.5.1 трёх ОС",
      "why": "Комплект после DOCS.",
      "dependencies": [
        "T010",
        "DOCS-2"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/modules/native-window.md"
      ],
      "verification_ids": [
        "three-platform-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "Три ОС из одного sourceCommit после DOCS; manifest совпадает"
      ],
      "expected_commit_message": "release: Собрать выпуск 0.5.1 трёх ОС",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-native-window",
        "task_id": "T011",
        "role": "implementation"
      }
    },
    {
      "id": "T012",
      "title": "Установить 0.5.1 в Applications",
      "why": "Обновить приложение.",
      "dependencies": [
        "T011",
        "DOCS-2"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/modules/native-window.md"
      ],
      "verification_ids": [
        "release-installed"
      ],
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Установка готового комплекта без пересборки; при работающей службе — pending"
      ],
      "expected_commit_message": "release: Установить 0.5.1 в Applications",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-native-window",
        "task_id": "T012",
        "role": "implementation"
      }
    },
    {
      "id": "T013",
      "title": "Опубликовать GitHub Release 0.5.1",
      "why": "Опубликовать комплект.",
      "dependencies": [
        "T012",
        "DOCS-2"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/modules/native-window.md"
      ],
      "verification_ids": [
        "github-release"
      ],
      "verification_kind": "package",
      "acceptance_criteria": [
        "Тег v0.5.1 на sourceCommit, assets сверены, remote main = HEAD"
      ],
      "expected_commit_message": "release: Опубликовать GitHub Release 0.5.1",
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-native-window",
        "task_id": "T013",
        "role": "implementation"
      }
    }
  ],
  "blocked_reason": null,
  "user_decisions": [
    {
      "id": "ed58ba53-baf9-40e9-8a73-26a42de095ce",
      "text": "Пользователь поручил выполнить описанную задачу и план.",
      "recorded_at": "2026-10-17T17:12:15.167Z"
    }
  ]
}
```
<!-- workflow-state:end -->

## Состояние

Execution Scope Status: ACTIVE
Delivery Status: IN_PROGRESS
Scope: workflow-pilot-native-window
Current Task: нет
Revision: 451

## Цель

Выпуск 0.5.0: на Mac обычный запуск открывает встроенное окно фоновой службы с родным сайдбаром и настоящей страницей ChatGPT; HTTP-клиент остаётся для теста, iPad и будущего VPS

## Критерии приёмки

- Выпуск 0.5.0: на Mac обычный запуск открывает встроенное окно фоновой службы с родным сайдбаром и настоящей страницей ChatGPT; HTTP-клиент остаётся для теста, iPad и будущего VPS

## Микрозадачи

- [DONE] T001: Страницы службы в режиме view — Завершено
  - Git Commit: [DONE] feat: Страницы службы в режиме view
  - Reference: workflow-pilot-native-window / T001 / implementation
  - Файлы: src/execution/browser/backend-host.mjs, src/execution/browser/presentation/host.mjs, src/execution/facade.mjs, src/backend/main.mjs, tests/backend-native-pages.test.mjs, tests/browser-presentation.test.mjs, src/backend/lifecycle.mjs, src/contracts/launch.mjs, src/main.mjs, tests/backend-browser-lifecycle.test.mjs, tests/backend-upgrade.test.mjs, docs/planning/native-window.md
- [DONE] T002: Встроенное окно фоновой службы — Завершено
  - Git Commit: [DONE] feat: Встроенное окно фоновой службы
  - Reference: workflow-pilot-native-window / T002 / implementation
  - Файлы: src/backend/native-window.mjs, src/backend/main.mjs, src/backend/desktop-model.mjs, src/backend/remote-surface.mjs, src/backend/operations.mjs, src/frontend/desktop/chat-colors-window.mjs, tests/backend-native-window.test.mjs, src/execution/browser/backend-host.mjs, src/frontend/desktop/client.mjs, src/main.mjs, docs/planning/native-window.md
- [DONE] T003: Запуск встроенного окна и окно через HTTP — Завершено
  - Git Commit: [DONE] feat: Запуск встроенного окна и окно через HTTP
  - Reference: workflow-pilot-native-window / T003 / implementation
  - Файлы: src/contracts/launch.mjs, src/frontend/desktop/client.mjs, src/backend/main.mjs, src/backend/status-menu.mjs, src/backend/native-window.mjs, tests/launch-mode.test.mjs, tests/backend-native-window.test.mjs, src/backend/operations.mjs, src/contracts/backend.mjs, src/main.mjs, tests/backend-upgrade.test.mjs, docs/planning/native-window.md
- [DONE] T004: Проверить оба режима вместе — Завершено
  - Git Commit: [DONE] test: Проверить встроенное окно и HTTP-клиент
  - Reference: workflow-pilot-native-window / T004 / implementation
  - Файлы: tests/electron-smoke.mjs, tests/backend-native-window.test.mjs, docs/planning/native-window.md
- [DONE] T005: Подготовить версию 0.5.0 — Завершено
  - Git Commit: [DONE] feat: Подготовить версию 0.5.0
  - Reference: workflow-pilot-native-window / T005 / implementation
  - Файлы: package.json, package-lock.json, src/frontend/plugin/index.html, src/frontend/plugin/app.mjs, tests/backend-upgrade.test.mjs, docs/planning/native-window.md
- [DONE] DOCS: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: актуализировать контекст проекта
  - Reference: workflow-pilot-native-window / DOCS / implementation
  - Файлы: docs/planning/native-window.md, README.md, docs/architecture/OVERVIEW.md, AGENTS.md, docs/acceptance/backend-independence.md, docs/modules/backend.md, docs/modules/browser.md, docs/modules/desktop.md, docs/modules/native-window.md
- [DONE] T006: Собрать выпуск 0.5.0 трёх ОС — Завершено
  - Git Commit: [DONE] release: Собрать выпуск 0.5.0 трёх ОС
  - Reference: workflow-pilot-native-window / T006 / implementation
  - Файлы: release-manifest.json, docs/planning/native-window.md
- [DONE] T007: Установить 0.5.0 в Applications — Завершено
  - Git Commit: [DONE] release: Установить 0.5.0 в Applications
  - Reference: workflow-pilot-native-window / T007 / implementation
  - Файлы: release-manifest.json, docs/planning/native-window.md
- [DONE] T008: Опубликовать GitHub Release 0.5.0 — Завершено
  - Git Commit: [DONE] release: Опубликовать GitHub Release 0.5.0
  - Reference: workflow-pilot-native-window / T008 / implementation
  - Файлы: release-manifest.json, docs/planning/native-window.md
- [DONE] T009: Встроенное окно на всех трёх ОС — Завершено
  - Git Commit: [DONE] feat: Встроенное окно на всех трёх ОС
  - Reference: workflow-pilot-native-window / T009 / implementation
  - Файлы: src/backend/main.mjs, src/contracts/launch.mjs, tests/backend-native-pages.test.mjs, tests/backend-upgrade.test.mjs, src/execution/browser/backend-host.mjs, docs/modules/native-window.md
- [TODO] T010: Подготовить версию 0.5.1 — Ожидает
  - Git Commit: [PENDING] feat: Подготовить версию 0.5.1
  - Reference: workflow-pilot-native-window / T010 / implementation
  - Файлы: package.json, package-lock.json, src/frontend/plugin/index.html, src/frontend/plugin/app.mjs, tests/backend-upgrade.test.mjs, docs/modules/native-window.md
- [TODO] DOCS-2: Актуализация всех документов проекта — Ожидает
  - Git Commit: [PENDING] docs: актуализировать документацию проекта
  - Reference: workflow-pilot-native-window / DOCS-2 / implementation
  - Файлы: docs/architecture/OVERVIEW.md, docs/modules/native-window.md
- [TODO] T011: Собрать выпуск 0.5.1 трёх ОС — Ожидает
  - Git Commit: [PENDING] release: Собрать выпуск 0.5.1 трёх ОС
  - Reference: workflow-pilot-native-window / T011 / implementation
  - Файлы: release-manifest.json, docs/modules/native-window.md
- [TODO] T012: Установить 0.5.1 в Applications — Ожидает
  - Git Commit: [PENDING] release: Установить 0.5.1 в Applications
  - Reference: workflow-pilot-native-window / T012 / implementation
  - Файлы: release-manifest.json, docs/modules/native-window.md
- [TODO] T013: Опубликовать GitHub Release 0.5.1 — Ожидает
  - Git Commit: [PENDING] release: Опубликовать GitHub Release 0.5.1
  - Reference: workflow-pilot-native-window / T013 / implementation
  - Файлы: release-manifest.json, docs/modules/native-window.md

## Context Pack For This Cycle

- docs/planning/native-window.md
- docs/architecture/OVERVIEW.md
- docs/modules/native-window.md

Служебные состояния меняются только командами workflow. Приёмка не архивирует scope.
