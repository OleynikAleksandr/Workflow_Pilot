# Активный план — Workflow_Pilot

<!-- workflow-state:begin -->
```json
{
  "schema_version": 1,
  "plan_revision": 762,
  "project_id": "7411e192-943c-4529-bffb-3b081d9c242f",
  "project_name": "Workflow_Pilot",
  "scope_id": "restore-stable-release",
  "execution_scope_status": "ACTIVE",
  "delivery_status": "READY_FOR_ACCEPTANCE",
  "objective": "Выдать проверенный новый выпуск без PiP экспериментов на основе стабильной 0.5.12",
  "acceptance_criteria": [
    "0.5.17 без экспериментальных исходников и ресурсов, основной канал сохранён.",
    "Проверены три ОС из одного sourceCommit; штатная установка macOS либо проверенный pending без остановки службы."
  ],
  "approved_scope": {
    "functional_paths": [
      "package.json",
      "package-lock.json",
      "src/contracts/backend.mjs",
      "release-manifest.json"
    ],
    "documentation_paths": [
      "docs/planning/restore-stable-release.md",
      "README.md",
      "docs/architecture/OVERVIEW.md",
      "docs/modules/chatgpt-plugin.md",
      "docs/modules/release.md",
      "docs/modules/assignment-dialogue.md",
      "docs/modules/assignment-dialogue-reliability.md",
      "docs/modules/automatic-agent-dialogue-acceptance.md",
      "docs/modules/dialogue-timing.md",
      "docs/modules/orchestrated-execution.md",
      "docs/modules/chatgpt-plugin-acceptance.md",
      "docs/modules/plugin-communication-handoff.md",
      "docs/acceptance/orchestrated-execution.md"
    ]
  },
  "baseline_commit": "f4ca5a07ecdc0c604fa2c45d45636c2e5dafcf1e",
  "current_task_id": null,
  "context_pack": {
    "documents": [
      {
        "path": "docs/planning/restore-stable-release.md",
        "required": true,
        "revision": "acc0e778b2b0aa79de7c911be82df5a38f2d37ff"
      },
      {
        "path": "docs/modules/release.md",
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
        "scope_id": "restore-stable-release",
        "task_id": "VERSION",
        "role": "implementation"
      },
      "dependencies": [],
      "functional_paths": [
        "package.json",
        "package-lock.json",
        "src/contracts/backend.mjs"
      ],
      "documentation_paths": [],
      "verification_ids": [
        "chatgpt-plugin"
      ],
      "id": "VERSION",
      "title": "Согласовать версию 0.5.17 без PiP",
      "why": "Согласовать версию 0.5.17 без PiP",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Согласовать версию 0.5.17 без PiP согласно спецификации; фактические ограничения сохранены."
      ],
      "expected_commit_message": "chore: Согласовать версию 0.5.17 без PiP",
      "parallel_safe": false,
      "actual_files": [
        "package-lock.json",
        "package.json",
        "src/contracts/backend.mjs"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "restore-stable-release",
        "task_id": "DOCS",
        "role": "implementation"
      },
      "dependencies": [
        "VERSION"
      ],
      "functional_paths": [],
      "documentation_paths": [
        "docs/planning/restore-stable-release.md",
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/release.md",
        "docs/modules/assignment-dialogue.md",
        "docs/modules/assignment-dialogue-reliability.md",
        "docs/modules/automatic-agent-dialogue-acceptance.md",
        "docs/modules/dialogue-timing.md",
        "docs/modules/orchestrated-execution.md",
        "docs/modules/chatgpt-plugin-acceptance.md",
        "docs/modules/plugin-communication-handoff.md",
        "docs/acceptance/orchestrated-execution.md"
      ],
      "verification_ids": [],
      "id": "DOCS",
      "title": "Актуализация всех документов проекта",
      "why": "Актуализировать документацию стабильного выпуска",
      "verification_kind": "code",
      "acceptance_criteria": [
        "Актуализировать документацию стабильного выпуска согласно спецификации; фактические ограничения сохранены."
      ],
      "expected_commit_message": "docs: Актуализировать документацию стабильного выпуска",
      "parallel_safe": false,
      "actual_files": [
        "README.md",
        "docs/acceptance/orchestrated-execution.md",
        "docs/architecture/OVERVIEW.md",
        "docs/modules/assignment-dialogue-reliability.md",
        "docs/modules/assignment-dialogue.md",
        "docs/modules/automatic-agent-dialogue-acceptance.md",
        "docs/modules/chatgpt-plugin-acceptance.md",
        "docs/modules/chatgpt-plugin.md",
        "docs/modules/dialogue-timing.md",
        "docs/modules/orchestrated-execution.md",
        "docs/modules/plugin-communication-handoff.md",
        "docs/modules/release.md",
        "docs/planning/restore-stable-release.md"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "restore-stable-release",
        "task_id": "BUILD",
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
      "id": "BUILD",
      "title": "Собрать проверенный комплект 0.5.17 для трёх ОС",
      "why": "Собрать проверенный комплект 0.5.17 для трёх ОС",
      "verification_kind": "package",
      "acceptance_criteria": [
        "Собрать проверенный комплект 0.5.17 для трёх ОС согласно спецификации; фактические ограничения сохранены."
      ],
      "expected_commit_message": "chore: Собрать проверенный комплект 0.5.17 для трёх ОС",
      "parallel_safe": false,
      "actual_files": [
        "release-manifest.json"
      ]
    },
    {
      "implementation_status": "DONE",
      "commit_status": "DONE",
      "commit_ref": {
        "scope_id": "restore-stable-release",
        "task_id": "INSTALL",
        "role": "implementation"
      },
      "dependencies": [
        "BUILD",
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
      "title": "Установить готовый macOS комплект 0.5.17",
      "why": "Установить готовый macOS комплект 0.5.17",
      "verification_kind": "installed",
      "acceptance_criteria": [
        "Установить готовый macOS комплект 0.5.17 согласно спецификации; фактические ограничения сохранены."
      ],
      "expected_commit_message": "chore: Установить готовый macOS комплект 0.5.17",
      "parallel_safe": false,
      "actual_files": []
    }
  ],
  "blocked_reason": null,
  "user_decisions": [
    {
      "id": "34183606-ebb0-4e6f-b166-8dea1232f280",
      "text": "Пользователь 21.10.2026 поручил удалить эксперименты и собрать новый релиз для тестов.",
      "recorded_at": "2026-10-21T10:06:07.519Z"
    }
  ],
  "parallel_allowed": false,
  "max_workers": 1,
  "execution_strategy": "sequential",
  "execution_reason": "Продолжение разработки одним агентом по правилам проекта; последовательная поставка после очистки."
}
```
<!-- workflow-state:end -->

## Состояние

Execution Scope Status: ACTIVE
Delivery Status: READY_FOR_ACCEPTANCE
Scope: restore-stable-release
Current Task: нет
Revision: 762

## Цель

Выдать проверенный новый выпуск без PiP экспериментов на основе стабильной 0.5.12

## Критерии приёмки

- 0.5.17 без экспериментальных исходников и ресурсов, основной канал сохранён.
- Проверены три ОС из одного sourceCommit; штатная установка macOS либо проверенный pending без остановки службы.

## Микрозадачи

Выполнение: sequential; разрешено: false; лимит: 1
Причина: Продолжение разработки одним агентом по правилам проекта; последовательная поставка после очистки.

- [DONE] VERSION: Согласовать версию 0.5.17 без PiP — Завершено
  - Git Commit: [DONE] chore: Согласовать версию 0.5.17 без PiP
  - Reference: restore-stable-release / VERSION / implementation
  - Файлы: package.json, package-lock.json, src/contracts/backend.mjs
  - Параллельность: исключительное выполнение
  - Зависимости: нет
- [DONE] DOCS: Актуализация всех документов проекта — Завершено
  - Git Commit: [DONE] docs: Актуализировать документацию стабильного выпуска
  - Reference: restore-stable-release / DOCS / implementation
  - Файлы: docs/planning/restore-stable-release.md, README.md, docs/architecture/OVERVIEW.md, docs/modules/chatgpt-plugin.md, docs/modules/release.md, docs/modules/assignment-dialogue.md, docs/modules/assignment-dialogue-reliability.md, docs/modules/automatic-agent-dialogue-acceptance.md, docs/modules/dialogue-timing.md, docs/modules/orchestrated-execution.md, docs/modules/chatgpt-plugin-acceptance.md, docs/modules/plugin-communication-handoff.md, docs/acceptance/orchestrated-execution.md
  - Параллельность: исключительное выполнение
  - Зависимости: VERSION
- [DONE] BUILD: Собрать проверенный комплект 0.5.17 для трёх ОС — Завершено
  - Git Commit: [DONE] chore: Собрать проверенный комплект 0.5.17 для трёх ОС
  - Reference: restore-stable-release / BUILD / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: DOCS
- [DONE] INSTALL: Установить готовый macOS комплект 0.5.17 — Завершено
  - Git Commit: [DONE] chore: Установить готовый macOS комплект 0.5.17
  - Reference: restore-stable-release / INSTALL / implementation
  - Файлы: release-manifest.json
  - Параллельность: исключительное выполнение
  - Зависимости: BUILD, DOCS

## Context Pack For This Cycle

- docs/planning/restore-stable-release.md
- docs/modules/release.md
- docs/architecture/OVERVIEW.md

Служебные состояния меняются только командами workflow. Приёмка не архивирует scope.
