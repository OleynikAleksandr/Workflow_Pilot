# Workflow Pilot

Workflow Pilot 0.5.6 — локальные проекты, планы Workflow Kit 1.8.2 и ChatGPT Web (Chat/Work), собственный MCP-исполнитель и [панель диалога](../modules/chatgpt-plugin.md). Репозиторий: https://github.com/OleynikAleksandr/Workflow_Pilot. [Донор 0.6.115](../../PROVENANCE.md) заморожен; его профиль, cookies и службы не импортируются.

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

У любого плана одна кнопка Start/Пауза/Continue и Review. Новые orchestrated-планы выполняются назначениями в worktree: O обсуждает/публикует, E выполняют задачи, Kit проверяет интеграции, O завершает delivery/cleanup/итог. Начатые sequential/parallel сохраняют прежний маршрут и ту же кнопку.

В 0.5.6 startup через DOM передаёт полное recovery и приглашение открыть панель. O/E регистрируют существующие локальные сессии без ручного join/ID/Enable. Публикация не запускает план. Start разрешает текущий scope и последующие назначения; SDK/bind и завершённый bootstrap предшествуют рабочему сообщению.

DialogueDelivery связывает прежний scheduler с долговечной очередью PluginCommunication, без второго плана. Рабочие поручения, блокировки/решения, интеграции и итог идут через SDK; DOM сохраняет bootstrap и прежний Review/legacy, скрытого fallback нет. Свежая identity/назначение, observer busy/draft и FIFO защищают адресацию. Accepted, read, завершённый ход и DONE различаются. Ролевые инструкции — один role-protocol.mjs Kit; решения относятся к точному block_id. Протокол панели 2, build 0.5.6-communication-2.

Закрытие окна не отзывает допуск, restart требует одного Continue. Ручной Stop прекращает отправки всего плана; UNKNOWN не повторяется. Финальные интеграции/delivery/cleanup и ответ предшествуют отключению канала, ручной archive не требуется. Поддержка хостом новой панели и SDK проверяется отдельно: живой WebContentsView её не доказывает.

URI панели определяется SHA-256 полного HTML; MCP объявляет и отдаёт неизменяемый снимок. Обновление каталога и свежий вызов выбирают новый ресурс; старый результат в истории не считается обновлённой панелью. Подробности — [контракт ресурса](../modules/chatgpt-plugin.md#ресурс-панели-и-обновление).

## Карта модулей

- [Плагин/канал](../modules/chatgpt-plugin.md), [приёмка S1–S3](../modules/automatic-agent-dialogue-acceptance.md), [матрица](../modules/chatgpt-plugin-acceptance.md), [legacy P0/P1](../modules/plugin-communication-handoff.md).
- [Backend](../modules/backend.md), [Desktop](../modules/desktop.md), [встроенное окно](../modules/native-window.md), [Browser](../modules/browser.md), [iPad/Tailscale](../modules/remote-access.md).
- [Control](../modules/control.md), [workflow coordination](../modules/workflow-execution.md), [оркестрация](../modules/orchestrated-execution.md), [совместимость Kit](../modules/project-compatibility.md), [жизненный цикл проектов](../modules/project-lifecycle.md).
- [Execution](../modules/execution.md), [Linux runtime](../modules/linux.md), [первый запуск](../modules/first-run-onboarding.md), [поставка](../modules/release.md).
- Приёмка: [служба](../acceptance/backend-independence.md), [iPad](../acceptance/remote-access.md), [оркестрация](../acceptance/orchestrated-execution.md), [миграция](../acceptance/migration-0.1.0.md).
- Отложено: [backend](../planning/backend-independence-followup.md), [фазовое планирование](../planning/phased-plans-recovery-followup.md), [Review](../planning/review-instructions-followup.md). Остальные невыпущенные требования — docs/planning.

## Проверка и готовность

Запуск/установка — [README](../../README.md); состав — release-manifest.json. Installer обновляет Applications готовым bundle, при работающей службе оставляет проверенный pending; переключает версию пользователь.

Автоматические проверки используют изолированные SDK/MCP/Kit/Git/Electron fixtures без модельных ходов и рабочих профилей. S1–S3 настоящего ChatGPT — NOT_RUN. Пользователь ранее подтвердил вход/туннель/контекст, панели Chat/Work, Retina-кадр, переподключение и вставку текста; сообщил об обмене прежней пары O/E при закрытом интерфейсе и живых службах. Build заключительного опыта отдельно не снят; это не приёмка новых назначений.

Pending: полная macOS-служба/Finder/Dock/Spotlight/меню/clipboard/файлы, оркестрация/архив/восстановление E/to-do с настоящими чатами, встроенное/HTTP-окно, iPad через реальный Tailscale/мобильную сеть. Native Windows/Linux, UTM и clean-install отложены. Secure MCP Tunnel собственный; VPS без собственного маршрута — setup-required. История выпусков хранится в Git.
