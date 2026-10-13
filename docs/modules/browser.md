# Browser — Execution и размещение в Desktop

## Ответственность и поведение

`src/execution/browser/` владеет техническими страницами, навигацией, первым открытием, observer/IPC, состоянием документа, отправкой текста и вложений. Здесь же DOM-селекторы, pageScript, цвета, прокрутка, фильтр инструментов и изменение заголовка. Привязка проекта к чату, подготовка recovery, решение о повторе, таймер работы агента и AutoPlan остаются вне браузера.

`src/session-runtime.mjs` пока сохраняет прежнее размещение до T005. Это координатор ContextSession/ConversationRecovery: он получает порт через ExecutionFacade и не имеет доступа к WebContents, изменяемому источнику наблюдений или карте браузерных записей. Открытие прежнего чата не отправляет recovery повторно. Скрытие страницы не останавливает её работу и не меняет рабочую папку фоновой сессии.

## Контракт и порядок вызовов

Bootstrap создаёт `DesktopBrowserHost` и один раз вызывает `ExecutionFacade.attachBrowser({host, ipc})`. `openBrowserSession(id)` возвращает тот же порт для живого ID; после release новый вызов создаёт новую страницу. ID формируется координатором из workspace/session/assignment/task, но Execution не интерпретирует эти поля и не принимает stores или планы.

Порт предоставляет:

- `snapshot()` — отдельный объект `{id, loading, epoch, disposed, url, inFlight}`;
- `pageState.current/version`, `subscribe(listener)` и `waitForChange(version, options)` — копии сериализуемых наблюдений, без доступа к `accept/reset/listeners`;
- `composer.getURL/hasFilled/inspect/deliver/sendUserMessage/clearNewSessionDraft` и readonly `inFlight` — операции прежнего composer без ссылки на Chromium;
- `navigate(url, {reload, startup, isCurrent})` — навигацию с защитой от позднего результата; `startup` сохраняет существующую диагностику первого документа;
- `subscribe(listener)` — сериализуемые события navigation-start/loaded/navigated/error/crashed со snapshot и ошибкой `{code,message}`; возвращает отписку;
- `setDiagnostic(listener)` — прежние метаданные composer без текста сообщения; `release()` — адресное завершение страницы.

Callbacks `canContinue/onBeforeFill/onBeforeSend` являются локальными операциями допуска и сохранения checkpoint; они не входят в snapshots/события. Существующие результаты sent/deferred/cancelled/unknown и коды ошибок сохранены. После начала Send неопределённый исход не разрешает второй клик. Полный контекст и каждая часть вставляются один раз для данного request/document; ожидания работают от observer, существующая ограниченная проверка загрузки вложений сохранена, нового фонового polling нет.

Desktop host создаёт WebContentsView по ID, показывает/скрывает его в контейнере окна и закрывает только по запросу Execution. Координатор получает лишь `show(id)/hide()`; представление доступно bootstrap через `host.view(id)`, но не через запись сессии. Оконные декорации main остаются desktop-кодом до T008.

Перед release координатор отменяет ContextSession и завершает учёт времени. Execution помечает страницу закрытой, отменяет ожидания PageStateSource, снимает observer/IPC и lifecycle-подписки, закрывает своё представление. Запоздалый результат не оживляет страницу; повторный release старого порта не закрывает новый с тем же ID. `SESSION_RUNTIME_RELEASED` означает использование закрытого порта; crash и ошибки observer отменяют продуктовую операцию через события.

## Ресурсы и совместимость

Chromium sessionData находится в Workflow Pilot/browser, partition persist:workflow-pilot-chatgpt. Smoke использует временный профиль и непостоянный partition; donor cookies и внешние профили не импортируются.

Observer генерируется `stage:page-observer` из Execution/browser в `resources/chatgpt-page-observer-preload.cjs`, перед запуском/проверкой. Dev и packaged preload-пути сохранены. Проверка установленного пакета извлекает реализации из нового каталога. Старые внутренние browser/page-state мосты удалены. Корневые `chatgpt-dom.mjs`, `chatgpt-composer.mjs`, `chatgpt-experience.mjs` остаются публичными re-export входами Sidebar с прежними именами и pageScript; второй реализации в них нет. Сам Sidebar не меняется.

## Проверка

`npm test`: точная принадлежность скрытых сессий, копии событий, освобождение подписок/ожиданий, поздняя навигация, crash, полный контекст once и UNKNOWN no-retry через ExecutionFacade. `npm run smoke`: скрытый Electron fixture проходит пользовательские IPC/renderer-входы и проверяет настоящий sandbox preload, вложения и Chat/Work. `npm run check:architecture` запрещает импорт внутренних браузерных/desktop-модулей координатором и импорт продуктового слоя из Execution. Живой ChatGPT проверяет пользователь.
