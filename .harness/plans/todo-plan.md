# Активный план — Workflow_Pilot

<!-- workflow-state:begin -->
```json
{
  "schema_version": 1,
  "plan_revision": 372,
  "project_id": "7411e192-943c-4529-bffb-3b081d9c242f",
  "project_name": "Workflow_Pilot",
  "scope_id": "workflow-pilot-0-4-6",
  "execution_scope_status": "ACTIVE",
  "delivery_status": "IN_PROGRESS",
  "objective": "Выпуск 0.4.6: строка списка проектов показывает название по горизонтали, «В архив» — компактная кнопка справа",
  "acceptance_criteria": [
    "Выпуск 0.4.6: строка списка проектов показывает название по горизонтали, «В архив» — компактная кнопка справа"
  ],
  "approved_scope": {
    "functional_paths": [
      "src/frontend/desktop/ui/index.html",
      "tests/electron-smoke.mjs",
      "package.json",
      "package-lock.json",
      "src/frontend/plugin/index.html",
      "src/frontend/plugin/app.mjs",
      "tests/backend-upgrade.test.mjs",
      "release-manifest.json"
    ],
    "documentation_paths": [
      "docs/planning/project-list-layout.md",
      "README.md",
      "docs/architecture/OVERVIEW.md"
    ]
  },
  "baseline_commit": "b43bedbdafe67cd2a957aba9412929899c2b19cc",
  "current_task_id": null,
  "context_pack": {
    "documents": [
      {
        "path": "docs/planning/project-list-layout.md",
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
        "scope_id": "workflow-pilot-0-4-6",
        "task_id": "T001",
        "role": "implementation"
      },
      "dependencies": [],
      "functional_paths": [
        "src/frontend/desktop/ui/index.html",
        "tests/electron-smoke.mjs"
      ],
      "documentation_paths": [
        "docs/planning/project-list-layout.md"
      ],
      "verification_ids": [
        "unit-all",
        "electron-smoke"
      ],
      "id": "T001",
      "title": "Раскладка строки списка проектов",
      "why": "Приёмка 0.4.5: названия проектов выводились вертикально.",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Название проекта занимает свободную ширину строки, «В архив» — по ширине текста; smoke проверяет раскладку на настоящей боковой панели"
      ],
      "expected_commit_message": "fix: Раскладка строки списка проектов",
      "actual_files": [
        "src/frontend/desktop/ui/index.html",
        "tests/electron-smoke.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "workflow-pilot-0-4-6",
        "task_id": "T002",
        "role": "implementation"
      },
      "dependencies": [
        "T001"
      ],
      "functional_paths": [
        "package.json",
        "package-lock.json",
        "src/frontend/plugin/index.html",
        "src/frontend/plugin/app.mjs",
        "tests/backend-upgrade.test.mjs"
      ],
      "documentation_paths": [
        "docs/planning/project-list-layout.md"
      ],
      "verification_ids": [
        "release-tooling",
        "unit-all"
      ],
      "id": "T002",
      "title": "Подготовить версию 0.4.6",
      "why": "Номер выпуска.",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Версия 0.4.6 в package/lock и панели плагина"
      ],
      "expected_commit_message": "feat: Подготовить версию 0.4.6",
      "actual_files": [
        "package.json",
        "package-lock.json",
        "src/frontend/plugin/index.html",
        "src/frontend/plugin/app.mjs",
        "tests/backend-upgrade.test.mjs"
      ]
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-0-4-6",
        "task_id": "DOCS",
        "role": "implementation"
      },
      "dependencies": [
        "T001",
        "T002"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/planning/project-list-layout.md",
        "README.md",
        "docs/architecture/OVERVIEW.md"
      ],
      "verification_ids": [],
      "id": "DOCS",
      "title": "Актуализация всех документов проекта",
      "why": "Сохранить актуальный контекст для следующего агента",
      "acceptance_criteria": [
        "Документы соответствуют результату"
      ],
      "expected_commit_message": "docs: актуализировать контекст проекта"
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-0-4-6",
        "task_id": "T003",
        "role": "implementation"
      },
      "dependencies": [
        "T002",
        "DOCS"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/project-list-layout.md"
      ],
      "verification_ids": [
        "three-platform-release"
      ],
      "id": "T003",
      "title": "Собрать выпуск 0.4.6 трёх ОС",
      "why": "Комплект после DOCS.",
      "verification_kind": "package",
      "acceptance_criteria": [
        "Три ОС из одного sourceCommit после DOCS; manifest совпадает"
      ],
      "expected_commit_message": "release: Собрать выпуск 0.4.6 трёх ОС"
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-0-4-6",
        "task_id": "T004",
        "role": "implementation"
      },
      "dependencies": [
        "T003",
        "DOCS"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/project-list-layout.md"
      ],
      "verification_ids": [
        "release-installed"
      ],
      "id": "T004",
      "title": "Установить 0.4.6 в Applications",
      "why": "Обновить приложение.",
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Установка готового комплекта без пересборки; при работающей службе — pending"
      ],
      "expected_commit_message": "release: Установить 0.4.6 в Applications"
    },
    {
      "implementation_status": "TODO",
      "commit_status": "PENDING",
      "commit_ref": {
        "scope_id": "workflow-pilot-0-4-6",
        "task_id": "T005",
        "role": "implementation"
      },
      "dependencies": [
        "T004",
        "DOCS"
      ],
      "functional_paths": [
        "release-manifest.json"
      ],
      "documentation_paths": [
        "docs/planning/project-list-layout.md"
      ],
      "verification_ids": [
        "github-release"
      ],
      "id": "T005",
      "title": "Опубликовать GitHub Release 0.4.6",
      "why": "Опубликовать комплект.",
      "verification_kind": "package",
      "acceptance_criteria": [
        "Тег v0.4.6 на sourceCommit, assets сверены, remote main = HEAD"
      ],
      "expected_commit_message": "release: Опубликовать GitHub Release 0.4.6"
    }
  ],
  "blocked_reason": null,
  "user_decisions": [
    {
      "id": "b32e79c4-54b2-4028-88fc-bcd72d210d70",
      "text": "Пользователь поручил выполнить описанную задачу и план.",
      "recorded_at": "2026-10-17T13:34:56.499Z"
    }
  ]
}
```
<!-- workflow-state:end -->

## Состояние

Execution Scope Status: ACTIVE
Delivery Status: IN_PROGRESS
Scope: workflow-pilot-0-4-6
Current Task: нет
Revision: 372

## Цель

Выпуск 0.4.6: строка списка проектов показывает название по горизонтали, «В архив» — компактная кнопка справа

## Критерии приёмки

- Выпуск 0.4.6: строка списка проектов показывает название по горизонтали, «В архив» — компактная кнопка справа

## Микрозадачи

- [DONE] T001: Раскладка строки списка проектов — Завершено
  - Git Commit: [DONE] fix: Раскладка строки списка проектов
  - Reference: workflow-pilot-0-4-6 / T001 / implementation
  - Файлы: src/frontend/desktop/ui/index.html, tests/electron-smoke.mjs, docs/planning/project-list-layout.md
- [DONE] T002: Подготовить версию 0.4.6 — Завершено
  - Git Commit: [DONE] feat: Подготовить версию 0.4.6
  - Reference: workflow-pilot-0-4-6 / T002 / implementation
  - Файлы: package.json, package-lock.json, src/frontend/plugin/index.html, src/frontend/plugin/app.mjs, tests/backend-upgrade.test.mjs, docs/planning/project-list-layout.md
- [TODO] DOCS: Актуализация всех документов проекта — Ожидает
  - Git Commit: [PENDING] docs: актуализировать контекст проекта
  - Reference: workflow-pilot-0-4-6 / DOCS / implementation
  - Файлы: docs/planning/project-list-layout.md, README.md, docs/architecture/OVERVIEW.md
- [TODO] T003: Собрать выпуск 0.4.6 трёх ОС — Ожидает
  - Git Commit: [PENDING] release: Собрать выпуск 0.4.6 трёх ОС
  - Reference: workflow-pilot-0-4-6 / T003 / implementation
  - Файлы: release-manifest.json, docs/planning/project-list-layout.md
- [TODO] T004: Установить 0.4.6 в Applications — Ожидает
  - Git Commit: [PENDING] release: Установить 0.4.6 в Applications
  - Reference: workflow-pilot-0-4-6 / T004 / implementation
  - Файлы: release-manifest.json, docs/planning/project-list-layout.md
- [TODO] T005: Опубликовать GitHub Release 0.4.6 — Ожидает
  - Git Commit: [PENDING] release: Опубликовать GitHub Release 0.4.6
  - Reference: workflow-pilot-0-4-6 / T005 / implementation
  - Файлы: release-manifest.json, docs/planning/project-list-layout.md

## Context Pack For This Cycle

- docs/planning/project-list-layout.md
- docs/architecture/OVERVIEW.md

Служебные состояния меняются только командами workflow. Приёмка не архивирует scope.
