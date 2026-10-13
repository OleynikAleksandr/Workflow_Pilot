# Происхождение Workflow Pilot

Исходная база: [Project Web Pilot](https://github.com/OleynikAleksandr/Project-Web-Pilot), commit `98a874236c3d5027e3be1de1faeae1d6c135f4c7`, релиз 0.6.115. Локальный донор: `/Users/oleksandroliinyk/VSCODE/Project Web Pilot`. Перенос T002 выполнен из Git blobs этого коммита, а не из изменяемой рабочей копии.

Исходные относительные пути сохранены: src/, tests/, packages/workflow-kit/, scripts/, resources/, tools/, package.json, package-lock.json, LICENSE, RUN_WINDOWS.cmd, BUILD_WINDOWS.cmd. Исключены три managed scripts/workflow*, уже установленные новым Kit. Перенесено 230 исходных файлов, затем выполнены документированные изменения identity и изоляции. Последующие перемещения доступны в Git нового проекта.

Автор исходной базы Oleksandr Oliinyk; MIT notices сохранены в LICENSE и packages/workflow-kit/LICENSE. Root package license исправлена с UNLICENSED на фактический MIT. Внешние компоненты сохраняют свои лицензии; источники и обязательные notices перечислены в docs/planning/migration-platforms.md.

Исключение только для тестовых зависимостей: исходная upgrade suite обращалась к четырём старым Git revisions донора. В tests/fixtures/released-kit сохранены архивы только кода Kit/лицензии из этих revisions, с manifest commit/SHA-256. Установленный Kit и пользовательское состояние не импортируются; tests больше не требуют чужой Git-истории.

Не переносились .git, .harness, .codex, донорские документы состояния, настройки подписи, cookies, профили, ключи, пользовательские проекты, node_modules, .venv, готовые приложения и сгенерированные ресурсы. Установленный Kit нового проекта и его план сохранены. packages/workflow-kit 1.7.2 пока побайтно соответствует донору; архитектурные изменения Kit принадлежат T007.

Windows vendor-архив остаётся отдельной закреплённой зависимостью v0.6.115 с проверяемым SHA-256; он не является импортом пользовательского runtime. Историческое имя архива сохранено. DOM-символы и формат session ID, которые являются совместимым публичным контрактом, сохраняются; имена пользовательских каталогов, служб и новых worktree принадлежат Workflow Pilot.
