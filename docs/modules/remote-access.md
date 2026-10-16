# Удалённый доступ через Tailscale

## Ответственность и поведение

С 0.3.0 интерфейс Workflow Pilot открывается в Safari на iPad (или в другом браузере) из любой точки интернета и работает с тем же [backend](backend.md) на компьютере: те же проекты, страницы ChatGPT, AutoPlan и Review. Транспорт — личная сеть Tailscale пользователя: Tailscale Serve публикует шлюз только внутри tailnet по HTTPS (`https://<компьютер>.<сеть>.ts.net`). Funnel, публичный адрес и проброс портов не используются. Доступ выключен по умолчанию и включается явно на компьютере; выбор сохраняется между перезапусками службы.

| Часть | Код | Ответственность |
| --- | --- | --- |
| Шлюз | `src/backend/remote-gateway.mjs` | Loopback-порт (кандидат 18854), проверки, проксирование к тем же маршрутам API, раздача веб-клиента |
| Устройства | `src/backend/remote-devices.mjs` | Пара по коду, токены, список, отзыв |
| Контроллер | `src/backend/remote-access.mjs` | Проверка Tailscale, своя запись Serve, запрет сна, сохранение выбора, QR-код |
| Tailscale CLI | `src/execution/runtime/tailscale.mjs` | Поиск CLI трёх ОС, `status --json`, `serve status --json`, `serve --bg --https=443 …` / `off` |
| Веб-клиент | `src/frontend/web/{index.html,app.mjs,ipc.js,touch-input.mjs}` | Оболочка Safari, тот же UI, изображение страницы, сенсорный ввод |
| Контракт | `src/contracts/remote.mjs` | Имена, пределы, коды |

**Защита.** Каждый запрос шлюза проходит три слоя. (1) Шлюз слушает только `127.0.0.1`; Tailscale Serve проксирует к нему. (2) Заголовок `Tailscale-User-Login` равен владельцу, определённому при включении; Serve сам выставляет его и удаляет клиентские копии. (3) Запросы API требуют подтверждённого устройства (cookie `wp_device`, `HttpOnly; Secure; SameSite=Strict`, токен хранится хешем). Host — `127.0.0.1:<порт>`, `localhost:<порт>` или имя `*.ts.net`; изменяющий запрос требует Origin `https://<имя>.ts.net`. Локальный процесс может подделать заголовок слоя 2, но не устройство. Удалённое устройство получает тот же allowlist операций, что окно Mac; CDP, JavaScript, shell и пути backend недоступны.

**Устройство и право управления.** Шлюз сам назначает устройству его `clientId` (`remote-…`) и подменяет им `args.clientId` в `control.*`. Мутации, ввод, вставка, файлы и viewport устройства требуют, чтобы держателем lease было это устройство (номер поколения из чужого события не помогает); viewer принадлежит создавшему его устройству. Управление передаётся явно, как между окнами Mac. Подтверждать и отключать устройства можно только на компьютере (`REMOTE_LOCAL_ONLY` для удалённого инициатора).

**Пара.** Страница на iPad запрашивает пару (`POST /remote/pair`, 6 попыток в минуту) и показывает 6-значный код на 5 минут. Компьютер показывает запрос с тем же кодом в окне (боковая панель) и в меню значка. После подтверждения страница один раз получает cookie (`GET /remote/pair/<id>`), затем запрос исчезает. Отказ виден на iPad. Отзыв устройства принудительно снимает его lease, отсоединяет viewers и закрывает его потоки событий.

**Оконные команды.** `ui.open-archive`, `close-archive`, `open-colors` адресуются инициатору (держателю lease), `focus` и `layout` — окнам Mac, тема — всем; передаются событием SSE `command` вне последовательности. Действие на iPad не открывает окна на Mac: архив и цвета открываются внутри страницы. Нативный диалог выбора папки для удалённого инициатора запрещён (`REMOTE_PATH_INPUT_REQUIRED`): веб-клиент спрашивает полный путь к папке на компьютере, backend проверяет абсолютный путь существующей папки и продолжает обычную проверку setup.

**Веб-клиент.** Оболочка (`/app/frontend/web/index.html`) показывает панель проектов в iframe с тем же UI (`src/frontend/desktop/ui`). Шлюз отдаёт UI-страницы с `connect-src 'self'` и подключает `ipc.js` и неизменённые preload-файлы окна Mac (`/app/preload/{local,archive,colors}.js`), где `ipcRenderer` заменён вызовами веб-приложения: второй реализации UI нет. Раздаются только `frontend/web`, `frontend/desktop/ui`, `frontend/client`, `contracts`; обход путей и скрытые файлы отклоняются; CSP запрещает сторонние источники. Изображение страницы — сжатые кадры (JPEG 70, плотность ≤ 2 по `devicePixelRatio`); касание — клик, перемещение пальца — прокрутка, долгое нажатие — меню; экранная и аппаратная клавиатура через скрытое поле (текст, клавиши правки, composition) отправляются строго по порядку. Буфер обмена — кнопками «Копировать» и «Вставить». Выбор файла для ChatGPT и сохранение скачанного — кнопками (Safari требует касания). Popups ChatGPT — слой внутри страницы. Viewport задаёт управляющее устройство.

**Включение.** Контроллер проверяет по порядку: Tailscale установлен (`TAILSCALE_NOT_INSTALLED`), запущен и выполнен вход (`TAILSCALE_LOGGED_OUT`), разрешены HTTPS-сертификаты (`TAILSCALE_HTTPS_DISABLED`). Затем включает шлюз с владельцем и именем из `status --json`, добавляет свою запись Serve на HTTPS 443 и сохраняет выбор. Чужая запись Serve на 443 даёт `TAILSCALE_SERVE_CONFLICT` и не перезаписывается; `serve reset` не используется. При включённом доступе действует `powerSaveBlocker` (`prevent-app-suspension`); закрытая крышка без питания остаётся ограничением. Выключение снимает только свою запись Serve и закрывает шлюз.

## Контракт и зависимости

- Шлюз: `createRemoteGateway({route, devices, sourceDir})` → `enable({owner, dnsName})`, `disable()`, `status()`. Маршруты: `/` → оболочка; `/app/*` → статика; `/remote/pair`, `/remote/pair/<id>`, `/remote/session` (устройство и его `clientId`); `/v1/*` → `createApiRoute` из `server.mjs` с контекстом `{clientId, deviceId}`.
- Операции: `submit(command, {clientId})`; `leaseHolder()`, `revokeLease(clientId)`. Представление: `route(req,res,url,{clientId})`, `detachClient(clientId)`; кадр `GET /v1/browser/frame?viewer&after&format=jpeg&quality=30..95&maxScale=0..5`.
- События: `open(..., {clientId, remote})`, `uiCommand(type, data, {to})`, `closeClient(clientId)`, `localClients`. `BackendConnection({origin, clientId})` — режим веб-клиента (cookie вместо bearer); `/v1/events?client=` сообщает адресата команд.
- Каналы окна: `pilot:remote-approve`, `pilot:remote-reject`, `pilot:remote-revoke`, `pilot:remote-access` (`refresh`, `enable`, `disable`, `open-download`, `open-admin`). Состояние `remoteAccess`: `enabled`, `tailscale`, `serve`, `address`, `qr`, `pairings`, `devices`, `error`.
- Коды: `REMOTE_DISABLED`, `REMOTE_OWNER_MISMATCH`, `REMOTE_HOST_INVALID`, `REMOTE_ORIGIN_INVALID`, `REMOTE_DEVICE_REQUIRED`, `REMOTE_PAIRING_EXPIRED`, `REMOTE_RATE_LIMIT`, `REMOTE_LOCAL_ONLY`, `REMOTE_PATH_INPUT_REQUIRED`, `TAILSCALE_*`.
- Хранение: `<профиль>/remote/devices.json` и `remote.json` (0600). Журнал `backend-events.jsonl` получает события пары, подтверждения, отзыва и включения без токенов. QR-код строит `qrcode-svg` (MIT, [список компонентов](../../resources/THIRD-PARTY.md)).

## Проверка

`backend-remote-gateway` (владелец, Origin, устройство, подмена clientId, наблюдатель с чужим поколением, viewer, статика и обход путей), `backend-remote-devices` (пара, однократная выдача cookie, хеш токена, отказ, отзыв со снятием lease и закрытием потоков, лимит), `remote-serve-probe` (поведение Serve на тестовом прокси), `remote-access-setup` (CLI трёх ОС, порядок проверок, своя запись Serve, конфликт, запрет сна, восстановление), `web-client` и `web-browser-view` (jsdom: мост preload, ввод), `web-client-electron` (Chromium: пара, тот же UI, JPEG-кадры, архив только на устройстве), `browser-presentation` (JPEG меньше PNG), `remote-end-to-end` (включение → пара → управление → обрыв → отзыв). Живая проверка с настоящим Tailscale, Safari на iPad и мобильной сетью — [сценарий приёмки](../acceptance/remote-access.md).
