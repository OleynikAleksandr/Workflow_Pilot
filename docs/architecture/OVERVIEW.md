# Краткая архитектура Workflow Pilot

## Назначение и текущее состояние

Workflow Pilot — самостоятельное настольное приложение для управления проектами и работой с агентами через ChatGPT Web. Репозиторий: https://github.com/OleynikAleksandr/Workflow_Pilot.

Перенесена база 0.1.0 с собственной identity и Kit 1.7.3 с поддержкой продолжения проектов 1.7.2. ExecutionFacade обслуживает команды, stdin, файлы, службы и браузерные сессии. Execution/browser владеет страницами, observer и отправкой; Desktop размещает страницы через host. Control владеет проектами, логическими сессиями, привязками, recovery, настройками и координацией AutoPlan/Review/parallel. Frontend расположен в frontend/desktop; bootstrap собирает зависимости, защищённый IPC предоставляет фиксированные возможности Control. Первый общий выпуск: macOS arm64, Windows x64, Ubuntu 24.04 LTS x64 (X11); Linux и полный комплект ещё в работе. Донор Project Web Pilot 0.6.115 заморожен.

## Планируемое устройство

Control владеет проектами, сессиями, привязками и продуктовой координацией; Workflow Kit остаётся владельцем current plan и транзакций. Execution выполняет команды, операции с файлами, ведёт службы и браузер. Frontend показывает состояние и передаёт действия через ControlFacade. Desktop bootstrap собирает конкретные зависимости.

AutoPlan, Review, sequential/parallel и оба канала подключения сохраняются в первом выпуске. Новая логика оркестратора — отдельный следующий этап.

## Карта требований и будущих контрактов

- [Перенос 0.1.0](../planning/migration-0.1.0.md): границы, происхождение, структура, платформы, приёмка и поставка.
- [Платформы и поставка](../planning/migration-platforms.md): обязательная часть требований первого выпуска.
- [Следующий этап выполнения](../planning/orchestrated-execution-next.md): оркестратор и отдельный агент для каждой микрозадачи.
- Текущее размещение и границы: [Control](../modules/control.md), [Execution](../modules/execution.md), [Browser](../modules/browser.md), [Workflow](../modules/workflow-execution.md), [Desktop](../modules/desktop.md).
- [Совместимость проектов](../modules/project-compatibility.md): зависимости Kit, обновление 1.7.2 и продолжение без импорта app-state.
- [Первый запуск](../modules/first-run-onboarding.md) и [жизненный цикл проектов](../modules/project-lifecycle.md): настройки, собственные подключения, архив и безопасное удаление.

## Запуск и проверка

Node 24.21.0, Electron 44.5.1: npm ci и npm start. Собственные профиль/runtime/службы не наследуют донора; VPS требует явного route.json (см. Execution). npm test и npm run smoke проверяют fixtures; npm run check:architecture — границы и циклы. Python для executor fixtures: .harness/runtime/test-python. Build выполняется после DOCS и готовности трёх платформ. Реальный UI/VM проверяет пользователь; автоматические окна скрыты, системный clipboard не используется.
