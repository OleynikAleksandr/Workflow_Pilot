# Приёмка: независимый backend Workflow Pilot 0.2.x

Состояние на выпуск 0.2.1 (до живой приёмки 0.2.1). Контракт — [Backend](../modules/backend.md). Автоматические доказательства — изолированные fixtures на macOS arm64: временные профили, локальная fixture-страница вместо ChatGPT, без модельных ходов и без управления окнами пользователя. Fixture не заменяет живой ChatGPT, Windows и Linux.

## Критерии A01–A14

| ID | Результат | Доказательство | Статус |
| --- | --- | --- | --- |
| A01 | Один backend, безопасный конкурентный запуск | `backend-launcher` (два launcher, устаревший descriptor), `backend-lifecycle` (второй backend отказывается), `backend-end-to-end` | pass (fixture); живой запуск из Finder — pending manual |
| A02 | Закрытие/kill клиента сохраняет страницу, состояние, работу и MCP/bridge | `desktop-client`, `backend-end-to-end` (SIGKILL клиента), `chatgpt-plugin` (мост backend без клиента) | pass (fixture); живой ChatGPT — pending manual |
| A03 | Reconnect к той же странице/операции без reload/recovery/Send | `backend-browser-lifecycle`, `backend-end-to-end` (тот же bootId и operationId), `backend-reconnect` | pass (fixture) |
| A04 | Независимый API-клиент без preload | `backend-api`, `backend-end-to-end` | pass |
| A05 | Fixture-цепочка продолжается без клиента | `backend-browser-lifecycle` (AutoPlan отправляет следующие шаги при нуле зрителей) | pass (fixture уровня сессий); живой план с Kit — pending manual |
| A06 | Два клиента, один writer, старое поколение отклонено | `backend-reconnect` | pass |
| A07 | Пропуск событий/restart/reconnect без повторов | `backend-api` (журнал, UNKNOWN, boot generation), `backend-protocol` (resync), `backend-reconnect` | pass |
| A08 | Меню, русский и составной ввод, выделение, clipboard, файлы | `browser-presentation` (Electron e2e на fixture-странице) | pass (fixture); меню ответов ChatGPT и физическая клавиатура/IME — pending manual |
| A09 | Popups/авторизация без видимого окна; ноль зрителей | `browser-presentation` (popup), `backend-browser-lifecycle` | pass (fixture); настоящая авторизация — pending manual |
| A10 | MCP и plugin list/open/connect без клиента | `chatgpt-plugin` (мост backend, list/open, потеря backend), `backend-end-to-end` (MCP панель) | pass list/open; connect с реальным контекстом Kit через backend — pending manual |
| A11 | Stop ждёт безопасной точки, без kill, подтверждение | `backend-shutdown` (draining, отмена, повтор, выход и освобождение профиля), `backend-end-to-end` | pass (fixture); значок в строке меню — pending manual |
| A12 | Upgrade, занятый профиль/порт, старый descriptor, несовместимость, отказ записи | `backend-upgrade` (профиль 0.1.6, установщик, блокировка, режим запуска), `backend-owner-recovery`, `backend-lifecycle` (повреждённые stores, Kit journal) | pass (fixture); отказ записи диска не моделировался — pending |
| A13 | Auth/Origin/Host, границы файлов, очереди, медленный клиент | `backend-api`, `browser-presentation` (transfers), `backend-protocol` | pass |
| A14 | Три пакета одного sourceCommit с backend/client | `release-tooling` (fixtures); факт сборки — `release-manifest.json` | pending до общей сборки 0.2.0; Windows/Linux native — pending |

## Известные ограничения

- In-process окно Desktop осталось только как smoke-стенд модели для разработки: релиз до него не доходит (`launchMode`, правило архитектуры `release-paths-never-reach-in-process-window`). Перенос 2000-строчного smoke на клиент/backend — отдельная задача.
- `initializeBackendServices` — минимальная композиция для headless-тестов API; продукт использует модель Desktop.
- macOS: activate/reopen в одном bundle, отдельный helper не создан. Reopen через Finder/Dock/Spotlight, отсутствие лишней Dock-иконки и значок проверяет пользователь.
- Windows и Linux нативно не проверены; без системного tray статус и остановка — в меню клиента.
- Проверки не используют настоящий ChatGPT.
- Отложенные этапы и технический долг — [backend-independence-followup](../planning/backend-independence-followup.md).

## Первая живая проверка 0.2.0 (16.10.2026) и исправления 0.2.1

Пользователь запустил установленную 0.2.0. Найдено: окно в режиме «наблюдение» при отсутствии другого окна; изображение «Подключение к Workflow Pilot…» и `RENDER_PROCESS_GONE` — renderer страниц backend дважды завершались извне (`killed`, exit 15) вместе с GPU/utility helper, страница не восстанавливалась; переключение сессий большого проекта давало `BACKEND_MESSAGE_SIZE`; появлялись лишние плитки Dock (backend как Foreground и клиент, открытый backend). После остановки службы и повторного запуска работа восстановилась. Изолированные эксперименты: выход и SIGTERM клиента, запуск через LaunchServices и popup страницы renderer не убивают и тип backend не меняют; источник внешнего завершения не установлен.

0.2.1: автоматическая перезагрузка страницы после гибели renderer (без повторной отправки), устойчивое право управления, компактный результат `ui.invoke`, удержание backend в accessory и открытие клиента через LaunchServices, журналы `diagnostics/backend-events.jsonl` и `client-events.jsonl`. Проверено fixtures: `backend-api`, `backend-reconnect`, `backend-browser-lifecycle` (в том числе Electron e2e), `backend-diagnostics`, полный unit-all, smoke, architecture. Живое подтверждение — по сценарию ниже; при повторе проблемы приложите эти два журнала.

## Сценарий пользователя на Mac

Запуск из исходников: `npm start` (клиент сам поднимет фоновую службу). После установки выпуска — `/Applications/Workflow Pilot.app`: перед первым запуском 0.2.x полностью завершите 0.1.6, а перед новой версией 0.2.x остановите фоновую службу. В Dock должна быть одна плитка Workflow Pilot. Используется ваш настоящий профиль.

1. Откройте проект и сессию с тестовым планом, нажмите «Начать выполнение плана».
2. Пока агент работает, закройте окно (Cmd+Q, пункт «Закрыть окно (работа продолжится в фоне)»). В строке меню виден значок «Фоновая служба работает».
3. Подождите, затем откройте Workflow Pilot через Dock, Finder или Spotlight. Ожидается тот же разговор без перезагрузки, работа продолжилась, лишней иконки фоновой службы в Dock нет.
4. В изображении ChatGPT: меню ответа и разговора, подсказки, прокрутка, ввод по-русски, выделение текста и Cmd+C (текст в вашем буфере), Cmd+V в поле ввода.
5. Вложение: скрепка ChatGPT открывает диалог вашего Mac, файл появляется в сообщении. Скачивание файла из ответа открывает диалог сохранения.
6. Окна входа или помощи ChatGPT открываются отдельным окном просмотра.
7. Аварийный клиент: принудительно завершите окно в «Мониторинге системы», откройте снова — тот же разговор и работа.
8. Остановка: значок → «Остановить фоновую службу…» во время ответа. Видна причина ожидания; «Отменить остановку» возвращает работу. Повторная остановка завершает службу после ответа, значок исчезает, окно показывает «нет связи».
