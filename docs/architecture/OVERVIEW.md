# Workflow Pilot

Workflow Pilot 0.5.12 — локальные проекты, планы Workflow Kit 1.9.3 и ChatGPT Web (Chat/Work), собственный MCP-исполнитель и [панель диалога](../modules/chatgpt-plugin.md). Репозиторий: https://github.com/OleynikAleksandr/Workflow_Pilot. [Донор 0.6.115](../../PROVENANCE.md) заморожен; его профиль, cookies и службы не импортируются.

## Устройство

Backend — фоновая служба с Control, Execution, Kit, stores, страницами ChatGPT, MCP и туннелем. Закрытие клиента не останавливает работу; повторное открытие возвращает живую страницу без повторного recovery. Все три ОС используют встроенное окно службы с настоящей страницей; отдельный HTTP-клиент служит проверке и iPad через Tailscale. Один диалог — одна backend-страница; второй браузер того же разговора не штатный сценарий.

| Слой | Ответственность и граница |
| --- | --- |
| Frontend/client | Окно/sidebar/ввод, только backend API и contracts |
| Backend host | Identity/профиль/API, lease/SSE/журнал, модель Desktop и остановка |
| Control | Проекты/роли/контекст, Review и выполнение, проверка назначения и разрешения; IO только через ExecutionFacade |
| Execution | Процессы/файлы/службы/страницы/observer/приватный мост/WAL; без Control, Frontend и Kit |
| Kit CLI | Один current plan на checkout, назначения, сигналы, проверки и доказательства Git-интеграции |

`main.mjs` выбирает режим: встроенное окно, `--http-client` или `--backend-host`. In-process desktop — только dev smoke, packaged его не допускает. Control не импортирует Electron/fs/child_process; клиент не получает shell/CDP/stores. Allowlist IPC/API, проверка источника, bearer/Host/Origin, lease управления и журнал до эффекта сохраняются. UNKNOWN не разрешает повтор Send. Dependency-cruiser запрещает циклы и обход фасадов; публичные chatgpt-dom/composer/experience/pageScript сохранены. Источники Kit — packages/workflow-kit, Python MCP — tools/codex-app-server-mcp, UI плагина — src/frontend/plugin; staged resources генерируются.

## Выполнение и диалог

Во время планирования O сохраняет task_brief, после Start читает очередь уже доступных подготовок и авторизует несколько поручений одним ходом. Backend доставляет только явно разрешённый авторский пакет при готовности канала. Итог короткий по умолчанию; подтверждённый complete останавливает wait/sync панели. [Подготовка и завершение](../modules/assignment-dialogue.md).

Одна кнопка Start/Пауза/Continue и Review сохранены. Новые orchestrated-планы имеют dialogue_version=1: O выбирает задачи/контекст, ведёт уточнения и принимает конкретные результаты перед интеграцией. Backend создаёт допустимые назначения, доставляет сообщения и пробуждает агентов; Kit хранит план/proof, WAL — текст/receipts. Автоматического merge по READY в новом режиме нет.

O получает полный начальный DOM-recovery. E через DOM получает только обязательные правила/identity/приглашение панели, заканчивает bootstrap и ждёт task O. Одновременно O сохраняет выбранное поручение через prepare с dispatch_when_ready=true: это явное разрешение отправить неизменяемый текст после SDK/bind и физического конца bootstrap без отдельного ready-хода. Обычный prepare без флага остаётся черновиком. Вопрос/уточнение/решение/result/acceptance идут по каналу. Роли из одного role-protocol.mjs (версия 6); панель 0.5.12-communication-3, протокол 3. [Полная схема и обязанности](../modules/assignment-dialogue.md).

FIFO учитывает read, коррелированный yield и свежий физический конец хода без обязательного user bubble. Intent → идемпотентный Kit → WAL сохраняет эффект между сбоями. После вопроса следующий ответ не ждёт DONE. Неопределённый Send не повторяется. Закрытие окна сохраняет backend; restart требует одного Continue. Пауза запрещает новые назначения/пробуждения/интеграции, активный ход может сохранить outbox. DOCS/delivery/cleanup/итог и обработанные receipts предшествуют отключению связи.

Терминальная acceptance требует read/yield/физического конца E и подтверждения backend в Kit до удаления worktree. DOCS после проверенных интеграций может запускаться при продолжающемся текстовом ответе O; итог O может обрабатываться до последних acceptance E. Ранняя cleanup остаётся PENDING и автоматически продолжается. Complete требует cleanup DONE, конца итогового O, чистого main и отсутствия команд; restart сохраняет завершение. Sidebar показывает стадию, причину и наблюдаемое время, отличает 3/3 интеграции от complete. После него явно ожидается приёмка пользователя; архив проекта её не заменяет и не предупреждает об остановке уже завершённого плана.

Новые фоновое readiness и статус каждого E проверяются без выбора sidebar. URI панели — SHA-256 полного HTML, MCP обслуживает неизменяемый snapshot; старый iframe не обновляется от переустановки. Рабочие проекты/профили тестами не меняются. Старые планы сохраняют контракт; переход активного 0.5.7 — [явная миграция в паузе](../modules/assignment-dialogue-reliability.md#переход-старого-плана). Удаление незавершённого проекта сохраняет адресную остановку, журнал очистки и защиту соседей.

## Карта модулей

- [Плагин/канал](../modules/chatgpt-plugin.md), [приёмка A–D](../modules/automatic-agent-dialogue-acceptance.md), [матрица](../modules/chatgpt-plugin-acceptance.md), [legacy P0/P1](../modules/plugin-communication-handoff.md).
- [Тайминги и сокращение ожиданий](../modules/dialogue-timing.md): очередь, Kit, панель, SDK и наблюдаемые стадии без предположений о скрытом рассуждении модели.
- [Backend](../modules/backend.md), [Desktop](../modules/desktop.md), [встроенное окно](../modules/native-window.md), [Browser](../modules/browser.md), [iPad/Tailscale](../modules/remote-access.md).
- [Control](../modules/control.md), [workflow coordination](../modules/workflow-execution.md), [оркестрация](../modules/orchestrated-execution.md), [совместимость Kit](../modules/project-compatibility.md), [жизненный цикл проектов](../modules/project-lifecycle.md).
- [Execution](../modules/execution.md), [Linux runtime](../modules/linux.md), [первый запуск](../modules/first-run-onboarding.md), [поставка](../modules/release.md).
- Приёмка: [служба](../acceptance/backend-independence.md), [iPad](../acceptance/remote-access.md), [оркестрация](../acceptance/orchestrated-execution.md), [миграция](../acceptance/migration-0.1.0.md).
- Отложено: [backend](../planning/backend-independence-followup.md), [фазовое планирование](../planning/phased-plans-recovery-followup.md), [Review](../planning/review-instructions-followup.md). Остальные невыпущенные требования — docs/planning.

## Проверка и готовность

Запуск/установка — [README](../../README.md); состав — release-manifest.json. Installer обновляет Applications готовым bundle, при работающей службе оставляет проверенный pending; переключает версию пользователь.

Автоматические проверки используют изолированные HTTP API/runtime/SDK/MCP/Kit/Git/Electron fixtures без модельных ходов и рабочих профилей. Включают два и пять E, авторизацию до binding и отправку после него без лишнего ready-хода, многоходовую блокировку, result/revision/acceptance/интеграции, перекрытие DOCS и финализации, раннюю cleanup и complete. В живом контрольном 0.5.10 подтверждены три интеграции, очистка и complete; новые оптимизации 0.5.12 ожидают живого измерения. A–D 0.5.12 — NOT_RUN. [Подробная граница доказательств](../modules/automatic-agent-dialogue-acceptance.md).

Pending: полная macOS-служба/Finder/Dock/Spotlight/меню/clipboard/файлы, оркестрация/архив/восстановление E/to-do с настоящими чатами, встроенное/HTTP-окно, iPad через реальный Tailscale/мобильную сеть. Native Windows/Linux, UTM и clean-install отложены. Secure MCP Tunnel собственный; VPS без собственного маршрута — setup-required. История выпусков хранится в Git.
