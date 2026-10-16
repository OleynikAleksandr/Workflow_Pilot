# Browser — страницы backend и их представление

## Ответственность и поведение

`src/execution/browser/` владеет техническими страницами, навигацией, первым открытием, observer/IPC, состоянием документа, отправкой текста и вложений. Здесь же DOM-селекторы, pageScript, цвета, прокрутка, фильтр инструментов и изменение заголовка. Привязка проекта к чату, подготовка recovery, решение о повторе, таймер работы агента и AutoPlan остаются вне браузера.

С 0.2.0 страницы живут в backend ([Backend](backend.md)). `BackendBrowserHost` (`src/execution/browser/backend-host.mjs`) владеет скрытыми offscreen-окнами страниц и popups, partition, observer, ожиданиями и cleanup. Зрители только наблюдают страницу по ключу: подключение, отключение и ноль зрителей не меняют срок жизни страницы, не вызывают release/dispose/recovery reset/cancel и не останавливают observer или AutoPlan. Crash renderer отличается от detach и отмечается отдельно. Прежний `DesktopBrowserHost` (`src/frontend/desktop/browser-host.mjs`, WebContentsView в окне) используется только in-process smoke-стендом разработки.

`src/control/sessions/service.mjs` координирует логические сессии. Это координатор ContextSession/ConversationRecovery: он получает порт через ExecutionFacade и не имеет доступа к WebContents, изменяемому источнику наблюдений или карте браузерных записей. Открытие прежнего чата не отправляет recovery повторно. Скрытие страницы не останавливает её работу и не меняет рабочую папку фоновой сессии.

## Контракт и порядок вызовов

Backend создаёт `BackendBrowserHost` и один раз вызывает `ExecutionFacade.attachBrowser({host, ipc})` (smoke-стенд — с `DesktopBrowserHost`). `openBrowserSession(id)` возвращает тот же порт для живого ID; после release новый вызов создаёт новую страницу. ID формируется координатором из workspace/session/assignment/task, но Execution не интерпретирует эти поля и не принимает stores или планы.

Порт предоставляет:

- `snapshot()` — отдельный объект `{id, loading, epoch, disposed, url, inFlight}`;
- `pageState.current/version`, `subscribe(listener)` и `waitForChange(version, options)` — копии сериализуемых наблюдений, без доступа к `accept/reset/listeners`;
- `composer.getURL/hasFilled/inspect/deliver/sendUserMessage/clearNewSessionDraft` и readonly `inFlight` — операции прежнего composer без ссылки на Chromium;
- `navigate(url, {reload, startup, isCurrent})` — навигацию с защитой от позднего результата; `startup` сохраняет существующую диагностику первого документа;
- `subscribe(listener)` — сериализуемые события navigation-start/loaded/navigated/error/crashed со snapshot и ошибкой `{code,message}`; возвращает отписку;
- `setDiagnostic(listener)` — прежние метаданные composer без текста сообщения; `release()` — адресное завершение страницы.

Callbacks `canContinue/onBeforeFill/onBeforeSend` являются локальными операциями допуска и сохранения checkpoint; они не входят в snapshots/события. Существующие результаты sent/deferred/cancelled/unknown и коды ошибок сохранены. После начала Send неопределённый исход не разрешает второй клик. Полный контекст и каждая часть вставляются один раз для данного request/document; ожидания работают от observer, существующая ограниченная проверка загрузки вложений сохранена, нового фонового polling нет.

Host создаёт страницу по ID и закрывает её только по запросу Execution. Координатор получает лишь `show(id)/hide()` — выбор страницы, которую показывают клиенты; представление доступно backend через `host.view(id)`, но не через запись сессии. Окно клиента и его декорации принадлежат `src/frontend/desktop/client.mjs`.

Перед release координатор отменяет ContextSession и завершает учёт времени. Execution помечает страницу закрытой, отменяет ожидания PageStateSource, снимает observer/IPC и lifecycle-подписки, закрывает своё представление. Запоздалый результат не оживляет страницу; повторный release старого порта не закрывает новый с тем же ID. `SESSION_RUNTIME_RELEASED` означает использование закрытого порта; crash и ошибки observer отменяют продуктовую операцию через события.

## Представление страницы клиенту

ChatGPT загружается только в backend; интерфейс ChatGPT не реконструируется. Транспорт выбран в T001 и подтверждён пользователем: Electron offscreen → PNG-кадры через аутентифицированный loopback API → отдельный клиент; ввод адресуется странице через Chromium DevTools Protocol (`src/execution/browser/presentation/{host,input,transport}.mjs`, клиент — `src/frontend/client/browser-view.mjs`). Собственного видеокодека и стороннего display server нет; Xpra (нет seamless-сервера на macOS) и noVNC (нужен VNC-сервер всего рабочего стола) отклонены.

Плотность кадра выбирается автоматически при создании страницы: максимальный `scaleFactor` дисплеев (`offscreen.deviceScaleFactor`), логический viewport не меняется. Кадр несёт `{browserSessionId, documentGeneration, frameSequence, logicalWidth/Height, pixelWidth/Height, scale}`; координаты клиента переводятся в логические CSS-пиксели (`clientPointToBrowser`), а не по размеру PNG. Пользователь подтвердил одинаковую чёткость текста кадра и UI клиента на Retina 2x.

| Маршрут `/v1/browser/*` | Контракт |
| --- | --- |
| `GET pages` | Страницы и popups backend, выбранная страница |
| `POST viewers`, `DELETE viewers/<id>` | Подключение/отключение зрителя; отключение отпускает зажатый им ввод |
| `GET frame?viewer&after` | PNG с заголовком `x-browser-frame`; ожидание нового кадра до 1 с, иначе 204 |
| `POST input` | `{viewerId, input}`: pointer/wheel/key/text/composition с browserSessionId, documentGeneration, sequence, leaseGeneration |
| `POST viewport` | Размер 320–4096 задаёт только управляющий клиент; наблюдатели масштабируют кадры |
| `POST clipboard/selection`, `POST clipboard/paste` | Выделение страницы (фиксированный скрипт в изолированном мире) и вставка текста до 60 КБ по явному действию |
| `transfers`, `transfers/<id>`, `transfers/<id>/attach`, `choosers/cancel` | Загрузка файла клиента частями и прикрепление к перехваченному выбору; скачивание |

Ввод другого документа отвергается `BROWSER_DOCUMENT_CHANGED`, повтор или старый sequence — `BROWSER_INPUT_REPLAY`, старый lease — `BACKEND_LEASE_STALE`; поздний ввод никогда не попадает на другую страницу. При разрыве, отключении зрителя или смене lease зажатые клавиши и кнопки отпускаются, ввод не переигрывается. Указатель, удержание, прокрутка, клавиатура, русский и составной ввод (`Input.imeSetComposition`), меню и выделение проходят через CDP без фокусировки окна ОС.

Выбор файла страницы перехватывается (`Page.setInterceptFileChooserDialog`) с момента создания страницы, нативный диалог в backend не открывается. Клиент получает событие `file-chooser`, показывает диалог своего устройства, передаёт файл до 32 МБ по transferId и прикрепляет его после полной передачи; устаревший выбор — `BROWSER_CHOOSER_STALE`. Скачивание сохраняется во временный приватный каталог backend, клиент получает `download-ready` и сохраняет файл через свой диалог. Popups и авторизация — скрытые окна backend (только https/about:blank), клиент показывает их отдельным окном просмотра; видимое серверное окно не нужно. Branch/Delete/Retry передаются странице без новой политики.

## Ресурсы и совместимость

Chromium sessionData находится в Workflow Pilot/browser, partition persist:workflow-pilot-chatgpt. Smoke использует временный профиль и непостоянный partition; donor cookies и внешние профили не импортируются.

Observer генерируется `stage:page-observer` из Execution/browser в `resources/chatgpt-page-observer-preload.cjs`, перед запуском/проверкой. Dev и packaged preload-пути сохранены. Проверка установленного пакета извлекает реализации из нового каталога. Старые внутренние browser/page-state мосты удалены. Корневые `chatgpt-dom.mjs`, `chatgpt-composer.mjs`, `chatgpt-experience.mjs` остаются публичными re-export входами Sidebar с прежними именами и pageScript; второй реализации в них нет. Сам Sidebar не меняется.

DOM-адаптер `account()` возвращает `login` и `loginEvidence`: фиксированную причину и булевы признаки профиля, входа, личной истории/проекта и редактора. `normalizePageObservation` отбрасывает посторонние поля доказательства. Селекторы и доступные имена профиля проверяются только вне сообщений; запасное подтверждение требует редактор и обе категории личной навигации. Наблюдение aria-label/aria-labelledby/title/href/role позволяет распознавать позднее появление признаков без polling. Вызовы account API и чтение токенов для проверки входа не используются.

Диагностика первого запуска сохраняет отдельные события `account-observation`, `startup-state`, `account-check`, `page-observer-error`. Последние состояния включаются в отчёт независимо от окна последних событий, с временными метками. Переход на новый документ сбрасывает последнее доказательство аккаунта. Передаются только допустимые причины, булевы признаки и поколение; исходные имена, тексты, атрибуты и личные URL в новые записи не копируются. Проверку неизвестного входа пользователь может повторить без навигации; UI-контракт описан в [первом запуске](first-run-onboarding.md).

## Проверка

`npm test`: `browser-presentation` (Electron e2e на fixture-странице: меню, русский и составной ввод, выделение, clipboard, файлы, popup, поколения и lease), `backend-browser-lifecycle` (detach, reconnect без reload, AutoPlan при нуле зрителей, crash), `backend-browser-prototype` (протокол T001: отдельный процесс клиента, Retina-плотность); точная принадлежность скрытых сессий, копии событий, освобождение подписок/ожиданий, поздняя навигация, crash, полный контекст once и UNKNOWN no-retry через ExecutionFacade. `npm run smoke`: скрытый Electron fixture проходит пользовательские IPC/renderer-входы и проверяет настоящий sandbox preload, вложения и Chat/Work. `npm run check:architecture` запрещает импорт внутренних браузерных/desktop-модулей координатором и импорт продуктового слоя из Execution. Живой ChatGPT, меню ответов, физическую клавиатуру/IME и настоящую авторизацию проверяет пользователь. Изменение состава мониторов после создания страницы плотность кадра не пересчитывает (отложено).
