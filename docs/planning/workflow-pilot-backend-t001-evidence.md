# T001 — протокол выбора транспорта (15.10.2026)

Статус: экспериментальная рекомендация, **не пользовательская приёмка**. База: macOS arm64, Electron 44.5.1, Node 24.21.0. Выпуск 0.1.6 не изменён, донор не затронут.

## Исходный lifecycle и граница

- `src/frontend/desktop/bootstrap.mjs` настраивает userData/sessionData и создаёт Execution/Control.
- `src/frontend/desktop/application.mjs` владеет главным окном и контейнером Chromium. `closed` освобождает AutoPlan, Review, координатор, страницы, runtime/bridge и завершает приложение. `window-all-closed` также приводит к `app.quit()`.
- `src/frontend/desktop/browser-host.mjs` владеет отображением `WebContentsView`; `src/execution/browser/session-runtime.mjs` — записями страниц, observer и композитором. `src/execution/facade.mjs` вызывает dispose браузера и мостов.
- `src/execution/plugin/bridge.mjs` — локальный аутентифицированный HTTP-мост, сейчас принадлежит жизненному циклу Desktop. Удаление одного `app.quit()` не даёт независимого backend.

## Готовые решения и цена интеграции

| Вариант | Лицензия | macOS backend | Windows/Linux | Что пришлось бы поставлять |
| --- | --- | --- | --- | --- |
| Electron offscreen + Chromium DevTools Protocol | Electron MIT | Встроен в используемый Electron; эксперимент macOS прошёл | Electron работает на трёх ОС, но этот сценарий там не проверен | Собственный узкий протокол кадров и ввода, обработка файлов/clipboard/popups, без своего видеокодека и стороннего display server |
| Xpra + HTML5 | Xpra GPLv2+, HTML5-клиент MPL-2.0 | Xpra seamless-сервер на macOS **недоступен**; shadow показывает существующий рабочий стол | На Linux seamless; прочие серверные режимы ограничены | Отдельные сервер, клиент, зависимости и интеграция окна/файлов; не годится для основной Mac-топологии |
| noVNC | MPL-2.0 | Только клиент; ему требуется VNC-сервер | Аналогично на всех ОС | VNC display server, WebSocket-proxy и интеграция clipboard/файлов; риск вернуть весь desktop вместо страницы |

Сверены: https://github.com/electron/electron, https://www.electronjs.org/docs/latest/tutorial/offscreen-rendering, https://www.electronjs.org/docs/latest/api/web-contents, https://github.com/Xpra-org/xpra, https://xpra-org.github.io/xpra/Usage/Seamless.html, https://github.com/Xpra-org/xpra/blob/master/docs/Usage/Clients.md, https://github.com/novnc/noVNC. Никакие Xpra/noVNC компоненты не устанавливались.

**Предлагаемый транспорт:** Electron offscreen → кадры PNG через локальный аутентифицированный API → отдельный frontend; адресный ввод в backend через Chromium DevTools Protocol. PNG — стандартный формат, не самописный кодек. В T005/T006 проверить необходимость сжатия/dirty frames и перейти к оптимальному готовому способу доставки, если PNG не обеспечит комфорт. Это рекомендация для пользовательской проверки, **не выбранный окончательно продуктовый транспорт**.

## Воспроизводимое свидетельство

Код: `tests/backend-browser-prototype.test.mjs` и `tests/fixtures/backend-browser-*` (HTML, Node/Electron .mjs, один sandbox preload .cjs). Временные профили, одноразовый токен/порт, окно backend `show:false`, клиентский Electron в **другом процессе** и собственном профиле. Автотест не использует реальные ChatGPT, MCP, личный clipboard, системную автоматизацию или окно пользователя.

- Отдельный Node-клиент заполняет черновик и завершается; новый процесс получает тот же `fixtureBootId`, увеличившийся счётчик и сохранившийся текст. HTTP без авторизации получает 403.
- Другой процесс Electron получает PNG backend, декодирует его в собственном Chromium (900×700), рендерит кадр и посылает клик по координатам пикселя через preload/IPC/API. Меню на прежней серверной странице действительно меняет состояние. Серверное окно невидимо и не сфокусировано.
- CDP `Input.insertText` вводит кириллицу, `Input.dispatchMouseEvent` нажимает реальные элементы fixture; `Input.imeSetComposition` вызывает `compositionstart/update/end`. Это **не** подтверждает удобство физической клавиатуры или всех IME.
- Popup `window.open()` создаётся при невидимом серверном окне, перехватывается и закрывается. Не проверен полный внешний OAuth/popups.
- Файл из тестового HTTP-запроса создаётся только внутри одноразового профиля и назначается настоящему `<input type=file>` через CDP. `will-download` скачивает Blob в временный файл, содержимое проверено. **Живой перенос файла с пользовательского устройства в отдельный клиент и обратно не завершён**.
- Пример одного прогона: PNG 29 983 байта; 5 последовательных localhost full-frame ответов 5,9/16,1/16,9/17,0/16,9 мс; CDP `insertText` 1,3 мс. Это **не FPS, не человеческая задержка и не гарантированные пределы**. При отсутствии клиента таймер продолжает работу; CPU main-процесса в одном тесте 0–0,43 %, **без renderer/GPU**. Потребление всей системы и длительная нагрузка не измерены.

## macOS topology (решение для проектирования, требуется подтверждение)

Предпочтителен отдельный подписанный **backend helper с собственной identity** внутри поставки: frontend/launcher `.app` открывается через Finder/LaunchServices и подключается к уже живому helper; helper не имеет Dock-иконки, имеет собственный lock/profile и поддерживает системный значок. Frontend/launcher закрывается независимо от helper. При двойном открытии — handshake, **не второй владелец профиля**. T009/T011 проверяют реальное reopen, упаковку nested code, подпись, права и возможность обновления при живом процессе. Альтернатива `activate/reopen` в одном bundle допустима только если проходит тот же kill-frontend и повторное открытие; пока не продемонстрирована. Нельзя считать тестовые бинарники готовым подписанным helper.

Источники: https://www.electronjs.org/docs/latest/api/app, https://developer.apple.com/documentation/bundleresources/placing-content-in-a-bundle, https://developer.apple.com/library/archive/technotes/tn2206/.

## Ручная проверка пользователем — обязательна перед T002

Тест `node --test tests/backend-browser-prototype.test.mjs` не открывает пользовательские окна. Для **отдельной живой оценки** пользователь может в одном терминале запустить `./node_modules/.bin/electron tests/fixtures/backend-browser-probe.mjs`, дождаться строки `{"ready":true,…,"port":N,"token":"…"}`; во втором терминале выполнить `./node_modules/.bin/electron tests/fixtures/backend-browser-viewer.mjs N TOKEN --show`. Клик по изображению и кнопка ввода действуют через backend; кнопка «Обновить кадр» обновляет снимок, а не сессию. Кнопки clipboard выполняют явное чтение/запись системного буфера **только по клику пользователя**; TXT upload выбирает файл клиентского устройства, download спрашивает путь через системный диалог. Для остановки в первом терминале отправить `{"op":"stop"}` и Enter. Токен только тестовый, не публиковать его. Это диагностика, не встроенный интерфейс Workflow Pilot 0.1.6.

Проверить вручную читаемость мелкого текста, задержку набора/клика, фокусировку, native clipboard, файл клиента и поведение окна при закрытии/повторном запуске viewer. **Пока не подтверждены живой проверкой:** clipboard, полный составной ввод пользователя, клиентские file-dialog/upload/download, полноценный popup/auth, Linux/Windows/native и подписанная macOS topology. После завершения T001 поставить план в BLOCKED до явного user_decision о транспорте и качестве; зависимые задачи не запускаются.
