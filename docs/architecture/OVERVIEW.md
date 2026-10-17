# Workflow Pilot

## Назначение и устройство

Workflow Pilot 0.4.0 — локальные проекты, планы Workflow Kit и сессии ChatGPT Web с собственным MCP-исполнителем и [плагином ChatGPT](../modules/chatgpt-plugin.md). Репозиторий https://github.com/OleynikAleksandr/Workflow_Pilot; [донор 0.6.115](../../PROVENANCE.md) заморожен. Сохранены AutoPlan/Review/sequential/parallel встроенного клиента для прежних планов. С 0.4.0 — [оркестрованное выполнение](../modules/orchestrated-execution.md): сессия без плана становится оркестратором, микрозадачи выполняют исполнители в своих worktree, план ведёт одна кнопка запуска и паузы.

С 0.2.0 приложение — два процесса на одном компьютере. [Backend](../modules/backend.md) — фоновая служба: Control, Execution, Kit, stores, модель Desktop, страницы ChatGPT (offscreen), MCP, туннель и мост плагина. Клиент — окно с панелями и интерактивным изображением страницы; он находит или запускает backend и работает через loopback API (bearer, Host/Origin, lease 10/45 с, журнал операций, SSE). Закрытие окна, Cmd+Q и падение клиента не останавливают работу; повторное открытие возвращает к той же странице без reload и повторного recovery. Явная остановка — через значок или меню клиента: draining до безопасной точки, без kill. Один диалог — одна живая страница в backend; продолжение того же диалога во втором браузере не штатно. С 0.3.0 [удалённый доступ](../modules/remote-access.md): шлюз backend на loopback, опубликованный Tailscale Serve только внутри сети пользователя, отдаёт тот же UI в Safari на iPad; устройство подтверждается кодом на компьютере и получает своё право управления.

| Слой | Процесс | Ответственность | Граница |
| --- | --- | --- | --- |
| Клиент | client | Окна, sidebar, изображение страницы, ввод, диалоги своего устройства | Только API backend и `src/contracts` |
| Backend host | backend | Identity/профиль, API, lease, события, остановка, значок, модель Desktop | ControlFacade, ExecutionFacade |
| Control | backend | Проекты, логические сессии, привязки, recovery, настройки, AutoPlan/Review/parallel | ExecutionFacade для физических операций; snapshots отделены от stores |
| Execution | backend | Команды/stdin, файлы, процессы, службы, страницы/observer/Send, представление страниц | Результаты, события и ошибки; без Control/Frontend/Kit |
| Workflow Kit | CLI | Единственный current plan, план оркестратора и транзакции checkout/worktree | CLI и пакет 1.8.0, продолжение формата 1.7.2–1.7.3 |

`src/main.mjs` выбирает режим (`src/contracts/launch.mjs`): обычный запуск — клиент, `--backend-host` — backend; in-process окно (`frontend/desktop/bootstrap.mjs`) осталось только smoke-стендом разработки и недоступно packaged-сборке. `src/backend` — host и API; `src/contracts` — сообщения и валидация; `src/frontend/client` — соединение и изображение страницы; packages/workflow-kit — Kit; tools/codex-app-server-mcp — Python MCP; resources — workers и staged ресурсы; scripts — поставка; src/frontend/plugin — автономная MCP App панель.

Control не импортирует Electron и не выполняет IO. Клиент не получает CDP, JavaScript, shell, stores и пути backend; IPC клиента — фиксированный allowlist с проверкой источника, передаваемый в backend как `ui.invoke`. Мутации требуют lease и записываются в журнал до эффекта; операции прошлого boot читаются как UNKNOWN и не повторяются. UNKNOWN запрещает повтор Send; recovery отправляется один раз; выбор проекта не меняет cwd фоновой сессии. Dependency-cruiser запрещает обход границ, циклы и доступ release-путей к in-process окну.

Публичные chatgpt-dom/composer/experience и pageScript сохранены. Динамические preload/HTML/observer/workers проверяются отдельно. Плагин использует тот же Control через приватный Execution-мост backend и работает без окна; внешняя сессия не запускает браузер или AutoPlan.

## Карта модулей

- [Backend и отдельный клиент](../modules/backend.md), [удалённый доступ через Tailscale](../modules/remote-access.md), [Desktop-клиент](../modules/desktop.md), [Browser: страницы и их представление](../modules/browser.md).
- [Control](../modules/control.md), [workflow coordination](../modules/workflow-execution.md), [оркестрованное выполнение](../modules/orchestrated-execution.md), [совместимость проектов и Kit](../modules/project-compatibility.md), [жизненный цикл проектов](../modules/project-lifecycle.md).
- [Execution](../modules/execution.md), [Linux runtime](../modules/linux.md), [первый запуск](../modules/first-run-onboarding.md).
- [Поставка](../modules/release.md), [приёмка 0.2.x](../acceptance/backend-independence.md), [приёмка доступа с iPad](../acceptance/remote-access.md), [приёмка оркестрации](../acceptance/orchestrated-execution.md), [приёмка миграции 0.1.x](../acceptance/migration-0.1.0.md).
- Невыпущенное: [следующие этапы backend](../planning/backend-independence-followup.md), [фазовое планирование](../planning/phased-plans-recovery-followup.md), [инструкции Review](../planning/review-instructions-followup.md).

## Запуск и проверка

Запуск и обновление — [README](../../README.md). Факт сборки задаёт manifest; установка в Applications обязательна, переключение на новую версию при работающей службе выполняет пользователь ([поставка](../modules/release.md)). Автоматические проверки — изолированные fixtures без модельных ходов; fixture не означает native-tested.

Подтверждено пользователем ранее: вход, туннель и контекст на Mac, панель плагина в Chat/Work, чёткость кадра транспорта backend на Retina и сохранение страницы при переподключении тестового клиента. Ожидают живой проверки: оркестрованное выполнение 0.4.0 с настоящими чатами ChatGPT ([сценарий](../acceptance/orchestrated-execution.md)); доступ с iPad через настоящий Tailscale и мобильную сеть (0.3.0); полный сценарий Mac (закрытие окна во время плана, reopen через Finder/Dock/Spotlight, значок, меню, clipboard, файлы, остановка), запуск нового чата из меню через плагин. Windows/Linux native и clean-install отложены. Доступен собственный Secure MCP Tunnel, VPS без собственного маршрута — setup-required. История спецификаций — в Git.
