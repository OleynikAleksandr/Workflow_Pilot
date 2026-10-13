# Происхождение Workflow Pilot

Исходная база: [Project Web Pilot](https://github.com/OleynikAleksandr/Project-Web-Pilot), commit `98a874236c3d5027e3be1de1faeae1d6c135f4c7`, релиз 0.6.115. Локальный донор: `/Users/oleksandroliinyk/VSCODE/Project Web Pilot`. Перенос T002 выполнен из Git blobs этого коммита, а не из изменяемой рабочей копии.

При первоначальном копировании были сохранены относительные пути: src/, tests/, packages/workflow-kit/, scripts/, resources/, tools/, package.json, package-lock.json, LICENSE, RUN_WINDOWS.cmd, BUILD_WINDOWS.cmd. Исключены три managed scripts/workflow*, уже установленные новым Kit. Перенесено 230 исходных файлов, затем выполнены документированные изменения identity и изоляции. Последующие перемещения доступны в Git нового проекта.

Автор исходной базы Oleksandr Oliinyk; MIT notices сохранены в LICENSE и packages/workflow-kit/LICENSE. Root package license исправлена с UNLICENSED на фактический MIT. Внешние компоненты сохраняют свои лицензии; источники и обязательные notices перечислены в [THIRD-PARTY](resources/THIRD-PARTY.md), правила комплектования — в [поставке](docs/modules/release.md).

Для тестовых зависимостей исходная upgrade suite обращалась к четырём старым Git revisions донора. В tests/fixtures/released-kit сохранены архивы только кода Kit/лицензии из этих revisions, с manifest commit/SHA-256. Пятый архив фиксирует перенесённый Kit 1.7.2 до его переработки, из коммита нового репозитория; источник указан отдельно в manifest. Установленный Kit и пользовательское состояние не импортируются; tests больше не требуют чужой Git-истории.

Автор новых коммитов: Oleksandr Oliinyk, 31826606+OleynikAleksandr@users.noreply.github.com. Placeholder-авторы запрещены; историю до dcb2703c8a766d9f1cf7030f6fc69a8af1c8e9be включительно не переписывать. Перед публикацией проверяются авторы новых коммитов.

Не переносились .git, .harness, .codex, донорские документы состояния, настройки подписи, cookies, профили, ключи, пользовательские проекты, node_modules, .venv, готовые приложения и сгенерированные ресурсы. Установленный Kit нового проекта и его план сохранены. Исходный Kit 1.7.2 переработан в 1.7.3: циклы разделены по ответственности, сохранены публичные контракты и продолжение старых проектов. Текущее устройство — [совместимость Kit](docs/modules/project-compatibility.md).

Windows vendor-архив остаётся отдельной закреплённой зависимостью v0.6.115 с проверяемым SHA-256; он не является импортом пользовательского runtime. Историческое имя архива сохранено. DOM-символы и формат session ID, которые являются совместимым публичным контрактом, сохраняются; имена пользовательских каталогов, служб и новых worktree принадлежат Workflow Pilot.
