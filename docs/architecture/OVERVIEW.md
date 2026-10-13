# Workflow Pilot

Самостоятельное Electron-приложение: локальные проекты и агенты через ChatGPT Web. Repo: https://github.com/OleynikAleksandr/Workflow_Pilot. Версия 0.1.0; донор Project Web Pilot 0.6.115 заморожен.

Control владеет проектами, сессиями, привязками, recovery, настройками и AutoPlan/Review/parallel. Kit 1.7.3 — единственный владелец плана/транзакций; продолжает проекты 1.7.2. Execution обслуживает команды/stdin, файлы, службы и браузер. Desktop bootstrap собирает зависимости; фиксированный защищённый IPC связывает UI с ControlFacade, BrowserHost размещает Chromium. Сохранено поведение 0.6.115; новая оркестрация — следующий этап.

Целевая поставка: macOS arm64, Windows x64, Ubuntu 24.04 x64/X11. Linux runtime/мастер и инструменты общей поставки реализованы; production-комплект и native/VM-приёмка впереди. Свои профиль/runtime/службы, без конфигурации донора. VPS без собственного route.json показывает setup-required; доступен Secure MCP Tunnel.

## Требования и модули

- [Перенос 0.1.0](../planning/migration-0.1.0.md), [платформы/поставка](../planning/migration-platforms.md), [следующий этап](../planning/orchestrated-execution-next.md).
- [Control](../modules/control.md), [Execution](../modules/execution.md), [Browser](../modules/browser.md), [Workflow](../modules/workflow-execution.md), [Desktop](../modules/desktop.md).
- [Совместимость проектов](../modules/project-compatibility.md), [первый запуск](../modules/first-run-onboarding.md), [жизненный цикл](../modules/project-lifecycle.md), [Linux](../modules/linux.md), [поставка](../modules/release.md).

## Проверка

Node 24.21.0/Electron 44.5.1: npm ci, npm start. npm test, npm run smoke и npm run check:architecture проверяют fixtures/границы/циклы. Python fixtures: .harness/runtime/test-python. Тестовые окна скрыты, clipboard изолирован. Build только после DOCS; живой UI/VM проверяет пользователь.
