# Workflow Pilot

Самостоятельное Electron-приложение: локальные проекты и ChatGPT Web в одном окне. Репозиторий https://github.com/OleynikAleksandr/Workflow_Pilot; версия 0.1.0. Происхождение — [Project Web Pilot 0.6.115](../../PROVENANCE.md), донор заморожен. Сохранены AutoPlan/Review/sequential/parallel; новая оркестрация и отдельный плагин ChatGPT Web не входят в этот выпуск.

Общая поставка проверяет три платформы из одной исходной базы. Linux toolchain копируется с сохранением относительных ссылок отдельно от extraResource Electron Packager; тест подтверждает независимость пакета от папки сборки. Контракт и порядок DOCS → общий выпуск → установка → публикация описаны в [поставке](../modules/release.md).

## Границы и владельцы

| Слой | Ответственность | Граница |
| --- | --- | --- |
| Frontend/Desktop | Окно, sidebar, preload/IPC, отображение и ввод | ControlFacade; bootstrap собирает зависимости, BrowserHost размещает Chromium |
| Control | Проекты, логические сессии, привязки, recovery, настройки, AutoPlan/Review/parallel | ExecutionFacade для физических операций; snapshots отделены от stores |
| Execution | Команды/stdin, файлы, процессы, службы, технические страницы/observer/Send | Результаты, события и ошибки; без Control/Frontend/Kit |
| Workflow Kit | Единственный current plan и транзакции checkout/worktree | CLI и пакет 1.7.3, продолжение формата 1.7.2 |

src/main.mjs только запускает Desktop bootstrap. Реализации расположены в src/control, src/execution, src/frontend/desktop; src/contracts содержит сообщения, ошибки и валидацию. Kit — packages/workflow-kit; автономный Python executor — tools/codex-app-server-mcp; workers и staged ресурсы — resources; разработка/поставка — scripts.

Control не импортирует Electron/Frontend и не выполняет физическое IO. Renderer использует только локальный UI/contracts и фиксированный IPC; источник IPC проверяется до действия. Нет универсального диспетчера, общей шины, второго реестра планов или скрытого polling. Внутрипроцессные порты могут иметь callbacks; публичные snapshots/события сериализуемы и не раскрывают stores/Map/Electron.

Успех, ошибка, отмена и UNKNOWN различимы. Потеря связи не подтверждает завершение, UNKNOWN не разрешает повтор Send. Полный recovery отправляется один раз; выбор видимого проекта не меняет cwd фоновой сессии. Освобождение страниц снимает подписки и ожидания.

Временные корневые мосты удалены. Три публичных chatgpt-dom/composer/experience входа и pageScript сохранены для внешнего Sidebar. Динамические preload/HTML/observer/workers проверяются отдельно от статического графа. Dependency-cruiser запрещает циклы без исключений; конкретный desktop/bootstrap — единственная точка композиции Control и Execution.

## Карта модулей

- [Control](../modules/control.md), [workflow coordination](../modules/workflow-execution.md), [совместимость проектов и Kit](../modules/project-compatibility.md).
- [Execution](../modules/execution.md), [Browser](../modules/browser.md), [Linux runtime](../modules/linux.md).
- [Desktop](../modules/desktop.md), [первый запуск](../modules/first-run-onboarding.md), [жизненный цикл проектов](../modules/project-lifecycle.md).
- [Поставка](../modules/release.md), [приёмка и ручной сценарий](../acceptance/migration-0.1.0.md), [невыполненный следующий этап](../planning/orchestrated-execution-next.md).

## Готовность и продолжение

Linux runtime/мастер и общая поставка macOS arm64, Windows x64, Ubuntu 24.04 x64/X11 реализованы; девять gates T011 прошли. Production build/install/publish и native/VM/clean-install приёмка остаются отдельными шагами. Собственные профиль/runtime/службы обязательны; VPS без собственного маршрута показывает setup-required, доступен свой Secure MCP Tunnel. Сервер VPS не используется как desktop.

Запуск и команды — [README](../../README.md). Работа идёт через Kit; DOCS предшествует build. Сборка всех платформ использует один sourceCommit и неизменяемый manifest; fixture не означает native-tested. История удалённых спецификаций доступна в Git, required-ссылки закрепляет Kit.
