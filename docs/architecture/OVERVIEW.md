# Workflow Pilot

Workflow Pilot 0.1.5 — локальные проекты со встроенным ChatGPT Web и [плагином ChatGPT](../modules/chatgpt-plugin.md). Репозиторий https://github.com/OleynikAleksandr/Workflow_Pilot; [донор 0.6.115](../../PROVENANCE.md) заморожен. Сохранены AutoPlan/Review/sequential/parallel встроенного клиента. Новая оркестрация отложена.

Три платформы собираются из одного sourceCommit. Порядок DOCS → сборка → установка и отдельная публикация — в [поставке](../modules/release.md).

## Границы и владельцы

| Слой | Ответственность | Граница |
| --- | --- | --- |
| Frontend/Desktop | Окно, sidebar, preload/IPC, отображение и ввод | ControlFacade; bootstrap собирает зависимости, BrowserHost размещает Chromium |
| Control | Проекты, логические сессии, привязки, recovery, настройки, AutoPlan/Review/parallel | ExecutionFacade для физических операций; snapshots отделены от stores |
| Execution | Команды/stdin, файлы, процессы, службы, технические страницы/observer/Send | Результаты, события и ошибки; без Control/Frontend/Kit |
| Workflow Kit | Единственный current plan и транзакции checkout/worktree | CLI и пакет 1.7.3, продолжение формата 1.7.2 |

src/main.mjs запускает Desktop bootstrap — точку композиции Control/Execution. src/contracts содержит сообщения и валидацию; packages/workflow-kit — Kit; tools/codex-app-server-mcp — Python MCP; resources — workers и staged ресурсы; scripts — поставка. src/frontend/plugin содержит автономную MCP App панель.

Control не импортирует Electron и не выполняет IO; renderer использует фиксированный IPC с проверкой источника. Snapshots сериализуемы и не раскрывают stores. Dependency-cruiser запрещает обход границ и циклы.

UNKNOWN запрещает повтор Send. Recovery отправляется один раз; выбор проекта не меняет cwd фоновой сессии. Освобождение страниц снимает подписки.

Публичные chatgpt-dom/composer/experience и pageScript сохранены. Динамические preload/HTML/observer/workers проверяются отдельно. Плагин использует тот же Control через приватный Execution-мост; внешняя сессия не запускает браузер или AutoPlan.

## Карта модулей

- [Control](../modules/control.md), [workflow coordination](../modules/workflow-execution.md), [совместимость проектов и Kit](../modules/project-compatibility.md).
- [Execution](../modules/execution.md), [Browser](../modules/browser.md), [Linux runtime](../modules/linux.md).
- [Desktop](../modules/desktop.md), [первый запуск](../modules/first-run-onboarding.md), [жизненный цикл проектов](../modules/project-lifecycle.md).
- [Поставка](../modules/release.md), [приёмка и ручной сценарий](../acceptance/migration-0.1.0.md), [невыполненный следующий этап](../planning/orchestrated-execution-next.md).

## Готовность и продолжение

Вход, туннель и контекст на Mac, быстрое открытие и обновление панели 0.1.4 в Chat/Work подтверждены пользователем. На iPad/iPhone пользователь также открыл плагин в родных приложениях: он занимает основной экран, диалог показан карточкой. В 0.1.5 отдельный диагностический раздел сравнивает пять способов открытия введённой ссылки на прежний диалог; успех API не считается подтверждением перехода. Список сессий пока не обеспечивает навигацию, автоматического получения URL нет. Тест исполняет ресурс через MCP; живые переходы pending. Codex не входит в приёмку. Windows/Linux и clean-install отложены. Доступен собственный Secure MCP Tunnel, VPS без собственного маршрута — setup-required.

Запуск — [README](../../README.md). Факт сборки задаёт manifest; установка в Applications обязательна, перезапускает пользователь. Fixture не означает native-tested. История спецификаций остаётся в Git.
