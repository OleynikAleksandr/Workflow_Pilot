# Запуск Chat и идентичность сессии

## Ответственность и поведение

Workflow Pilot 0.6.5 работает только с обычными ChatGPT Chat. Выбора Chat/Work и поддержки чтения старых Work-сессий нет. Первый проект, новый Chat, Doctor и фоновые исполнители используют один путь: короткая команда, введённая доверенным CDP-вводом в проверенный корень нового Chat (с 0.6.4; до этого — адрес `?q=`), регистрация панели по приглашению, полный ролевой контекст через [MCP](orchestrator-startup.md). Открытие сохранённого разговора не создаёт новую команду.

Обязательная предпосылка Chromium — [официальное ChatGPT search](chatgpt-search-extension.md), автоматически проверенное и подключённое до первой страницы в собственной persistent session. Последующие страницы используют проверенный кэш. Установка расширения не подтверждает отправку и не разрешает повтор старта.

Скрипт страницы не вводит и не отправляет первое сообщение (composer только ставит фокус; текст и Enter приходят через CDP), не извлекает ID разговора, не определяет и не переключает режим. Сохраняются наблюдения входа, документа, занятости и черновика. Последующий диалог использует [постоянный SDK](sdk-messaging.md) без ожидания свободного чата. Внешние composer/DOM/pageScript-экспорты остаются совместимыми. Нет DOM-клика Send, второго пути отправки, приватных запросов ChatGPT или повтора неизвестного исхода; первая команда — ровно один доверенный Enter (решение пользователя 30.10.2026).

Это протокол приложения поверх внешнего поведения ChatGPT; изолированный HTTPS-host не заменяет [живую приёмку](../acceptance/chat-only-startup.md).

## Контракт и зависимости

### Единственный Chat и хранилище

WorkspaceSessions schema 9 не хранит у сессий `experience`/`availability`, у попыток — `modeConfirmed`/`modeViolation`; API, DOM и PageState не знают выбора режима и режимных удержаний.

Обновление Chat-записей v1–v7 сохраняет локальные ID, chatUrl, request/generation, приглашение/контекст, receipts, роли, время, назначения и журналы; до перезаписи остаётся точная `.vN-backup` копия. Устаревшие режимные поля удаляются и не дают полномочий. Неподдерживаемые значения отклоняются `SESSIONS_INVALID` с сохранением исходного файла. Установка не очищает профиль или данные.

Разрешённые внешние адреса: HTTPS `chatgpt.com` без credentials и чужого порта; корень, `/c/<id>` и `/g/<id>/c/<id>`. Query `surface` и другие пути отклоняются общей проверкой URL; `WEB:`/`local-chatgpt:` — непостоянные адреса. Файлы chatgpt-experience содержат URL helpers без режима.

Технические `workflow`, `worktree`, `workProgress` и namespace run_id `work:` — сущности, не режим ChatGPT. Поставляемый runtime формируется из packages/workflow-kit; установленный Kit меняет только installer.

### Четыре разных идентификатора

| Значение | Назначение |
|---|---|
| Локальные workspace/sessionId | Владелец страницы и запуска до открытия ChatGPT |
| Тикет | Разрешение регистрации конкретной локальной сессии и назначения |
| Постоянный `/c/<id>` | Адрес повторного открытия сохранённого разговора |
| Metadata `openai/session` | Идентичность MCP-хоста для binding участника |

Публичный Chat ID не равен openai/session. Активная карточка, последний workspace, время ответа и совпадение локального ID не удостоверяют облачного получателя; навигация и приглашение коррелируют с одной сохранённой попыткой.

### Порядок запуска

1. Execution готовит расширение перед первой страницей ChatGPT. Если страница не корень нового Chat, openChatEntrypoint открывает чистый корень: наблюдение composer старого разговора не переносится на новый документ.
2. Read-only preflight этого webContents/documentId подтверждает signed-in, доступный редактор, отсутствие генерации и draftLength=0. Unknown, выход, неподходящий URL и непустой/неизвестный draft запрещают bootstrap. Пользовательский текст не очищается; единственное исключение — восстановленная стартовая команда (ниже). Наличие переключателя режима не проверяется.
3. После проверки проекта и fingerprint recovery очередь WorkspaceSessions сохраняет attempt reserving с новым requestId/attemptGeneration, startupText и metadata пакета. prepareBootstrap резервирует приглашение с этой корреляцией; stageStartup сохраняет полный контекст по SHA в content store/WAL. Raw ticket живёт в памяти до ввода.
4. Перед эффектом повторно проверяются документ, вход, URL, draft (восстановленная команда снова очищается), занятость, владелец, fingerprint, срок приглашения, пауза и архивирование. Сохраняются enrollmentRef={run_id,ticket_hash}, contextRef.message_id, sendStartedAtMs и принадлежность навигации. Изменение preflight/ошибка записи запрещает ввод и требует сверки отзыва.
5. `composer.submitStartup` (runtime-порт с одноразовым токеном) вводит команду в тот же документ без навигации и без смены epoch: CDP-ввод ниже.
6. Только долговечная регистрация текущего enrollmentRef/requestId/attemptGeneration выставляет sent и participant_id в sentEvidence. Нажатие Enter, адрес, временный ID и старый участник этого не делают.
7. Первый panel() проверяет точного получателя и попытку, вход на документе старта, принадлежность страницы, отсутствие отмены/паузы и актуальность пакета. Первая часть возвращается в startup_context без ожидания переключателя/iframe/SDK. Все части читаются через MCP и подтверждаются SHA; это ещё не выполнение или приёмка плана.
8. bindChat сохраняет постоянный URL при sent, accountConfirmed из свежего signed-in наблюдения и непрерывной принадлежности навигации. После привязки адрес подтверждает страницу сам, и Control снимает владельца стартовой навигации этой попытки (`endStartupNavigation(requestId)`: тот же токен, без навигации, epoch и событий); иначе [перезагрузка свежести](shared-conversation.md) фоновой страницы отклонялась бы навсегда (исправлено в 0.6.2). Уникальность адреса и запрет подмены сохраняются. Регистрация и URL допускаются в любом порядке.

**CDP-ввод (0.6.4).** Автоотправка `?q=` при загрузке новой страницы давала сбои три выпуска подряд, поэтому команда вводится в уже проверенный документ через общий CDP-канал страницы (`webContents.debugger`), как ввод пользователя. `ChatGPTComposer.submitStartup` включает `Emulation.setFocusEmulationEnabled` (фоновой странице не нужен фокус окна ОС), действием `focus-startup` ставит фокус в поле того же documentId (корень, нет сообщений, поле пусто), `Input.insertText` вставляет команду и ждёт точного совпадения текста (`draftMatches`), доступного Send и отсутствия генерации. Только затем runtime принимает токен (`navigationOwner=requestId`, один раз: `BOOTSTRAP_ALREADY_DISPATCHED`), и уходит один Enter (`Input.dispatchKeyEvent` keyDown `\r`/keyUp через `PageInput`). Runtime пропускает в `before-input-event` ровно свой Enter (счётчик `ownEnter`); любой другой ввод (в том числе iPad/HTTP через тот же CDP) или навигация до Enter меняет версию подготовки, и попытка возвращает `not-sent`, после Enter — снимает владельца. `not-sent` до Enter: composer удаляет только свою точную команду, Control отзывает приглашение и один раз стартует заново (`start-not-sent`), если старт не остановлен паузой, остановкой службы или потерей страницы (тогда `preflight-changed`). Ошибка после начала Enter — `STARTUP_SEND_UNKNOWN`, повтора нет. Подтверждение входа принимается на том же документе. [Спецификация](https://github.com/OleynikAleksandr/Workflow_Pilot/blob/d5ffd6ca16396ebe18d871a0cb5e9fd0f7e01942/docs/planning/cdp-startup-input.md).

Первая команда одинакова для всех ролей:

```text
Открой панель Workflow Pilot: один раз вызови workflow_pilot_panel с аргументами {"enrollment_ticket":"<TICKET>"}. Если вызов вернул ошибку или в ответе нет startup_context, сообщи точную причину и ничего не выдумывай; подтверждения хоста не обходи. Приглашение не публикуй и не сохраняй.
```

С 0.6.1 текст формирует общий контракт `startupCommand(ticket)` (`src/contracts/context.mjs`); тот же шаблон распознаёт команду в поле ввода.

**Восстановленная стартовая команда (0.6.1).** ChatGPT сохраняет текст поля нового чата в профиле и восстанавливает его в следующих новых чатах (общий persistent profile), поэтому новый Chat мог открыться с чужой командой и ждать `waiting-draft`. Перед решением о черновике и повторно перед вводом `ContextSession` вызывает `clearNewSessionDraft({startupOnly:true})`: на корне `/` без сообщений и на том же documentId поле очищается, только если текст с точностью до пробелов равен шаблону с одним тикетом из 64 hex; текст страницу не покидает. Любой другой текст, включая команду с добавлением, — пользовательский: не стирается, исполнитель показывает «В новом чате исполнителя черновик · откройте чат и очистите поле». Существующий разговор не очищается. [Спецификация](https://github.com/OleynikAleksandr/Workflow_Pilot/blob/ba0990b6625645022f562913e8ceb200f7d0e578/docs/planning/restored-startup-draft.md).

**Неотправленная команда (0.6.3).** ChatGPT иногда оставляет команду локальной: сообщение видно в `/c/local-chatgpt:…`, сразу выводится «Учетная запись сменилась. Отправьте сообщение еще раз», текст возвращается в поле, запрос отправки не уходит. Доказанная неотправка: попытка без регистрации, без привязанного адреса и без наблюдавшегося настоящего адреса, не меньше 30 с (`START_NOT_SENT_MS`) от отправки, тот же документ навигации (incarnation/epoch), временный адрес (или корень, в поле которого осталась своя точная команда — она очищается), генерации нет; ContextSession проверяет это по таймеру. Тогда попытка отменяется с `start-not-sent`, приглашение отзывается, и только при `revoked` Control снимает владельца отозванной попытки и выполняет один новый старт той же сессии с новым приглашением из чистого корня (`startupRetry.count`, `MAX_START_RETRIES=1`; прерванный перезапуском повтор продолжается). `registered-stopped` и второй сбой — фаза `start-not-sent` с оранжевой причиной. Нажатий кнопок и DOM Send нет. [Спецификация](https://github.com/OleynikAleksandr/Workflow_Pilot/blob/c01c93019c5784d9518e0ac5bc53a18ebcf10583/docs/planning/start-not-sent-retry.md).

Тикет присутствует в поле ввода, первом сообщении и аргументе инструмента; дополнительные копии в файлах/отчётах/других чатах запрещены. Формат randomBytes(32).toString('hex'), 64 hex, TTL первого использования 30 минут. Новый тикет не отзывает старый. Повтор того же binding идемпотентен, другой разговор получает BINDING. Без startup_context агент сообщает только известную причину.

### Готовность первой выдачи

DialogueDelivery ждёт существующий navigationTail и очередь store. RequestId и attemptGeneration должны точно совпасть. Для ещё не привязанной страницы требуются тот же id/incarnation/epoch/navigationOwner и отсутствие lost/conflict. Для сохранённого chatUrl текущий snapshot и наблюдение сверяются с этим URL. Требуется signed-in на документе старта (`composer-input`) или на новом post-navigation documentId (`url-query` прежних версий).

Ранний вызов панели может до двух секунд ожидать изменения на существующем PageState-канале. Каждая итерация снова проверяет текущую попытку/проект; ожидание не создаёт новый старт, тикет, отправку SDK или модельное уведомление. Причины раздельные: STARTUP_PAUSED, STARTUP_CANCELLED, STARTUP_LOGIN_REQUIRED, STARTUP_ADDRESS_UNCONFIRMED, STARTUP_NOT_READY. Внешний MCP может классифицировать их как INVALID_ARGUMENT, но безопасное сообщение сохраняет конкретную причину.

Только после готовности проверяется свежесть пакета; действительно заменённый/устаревший пакет отклоняется STALE_MESSAGE. Уже выданный снимок S имеет отдельное правило дочитывания того же SHA при новой ревизии плана ([startup](orchestrator-startup.md)). Не ослаблены binding, отмена, поколения, SHA или разрешения исполнения.

### Попытка и навигация

Attempt содержит bootstrapTransport=composer-input (`url-query` — попытки прежних версий, только сверка), contextTransport=panel, request/generation, metadata/startupText, ссылки приглашения/контекста, времена, sentEvidence, addressCandidate, addressStatus=pending|confirmed|lost|conflict, accountConfirmed/loginLost и cancelState=none|requested|revoked|registered-stopped. Raw ticket и полный текст первой команды не сохраняются в attempt/UI.

patchAttempt сериализует CAS request/generation, применяя patch-фабрику к актуальному состоянию: позднее событие не затирает sent/отмену. Checkpoint использует flush файла, rename и sync каталога на POSIX; Windows — flush без POSIX directory sync. Это не общая транзакция с WAL и не гарантия всех аппаратных сбоев.

Один BrowserSessions-порт передаёт did-navigate-in-page, did-navigate, did-redirect-navigation: {type,url,isMainFrame,navigationKind,navigationSequence,navigationOwner,snapshot} (Electron 44.5.1); snapshot содержит id/incarnation/epoch, sequence монотонен. Control фиксирует факты в navigationTail.

Принимаются только main-frame события своей попытки через normalizeChatUrl/isPendingChatGPTConversation. Временный URL не становится chatUrl. Неподдерживаемый URL отменяет запуск общей валидацией. Собственный navigation-start отменяет поколение контроллера, но не сохранённое разрешение dispatch: следующий tick продолжает attempt. Пользовательский переход, refresh/release, другая incarnation/epoch или неоднозначный адрес прекращают принадлежность. Lost/conflict не очищаются похожим поздним URL. Рестарт не угадывает потерянную корреляцию; поздний enroll подтверждает отправку, но не чужой адрес.

Низкоуровневый composer отдельно проверяет ожидаемый URL и documentId непосредственно перед Send. Чужая навигация оставляет draft и запрещает отправку; эта защита не зависит от режима.

### Отмена и два хранилища

Control сначала сохраняет cancelState=requested и запрещает действия. Затем communication.cancelStartup через mutate/WAL отзывает приглашение по ticket_hash и прекращает выдачу/ack этого request/generation. Проверяется сохранённый владелец; модель не может отзывать чужие приглашения.

Enroll проверяет revoked внутри транзакции до прежнего participant_id. Revoke первым даёт PLUGIN_COMMUNICATION_ENROLLMENT_REVOKED без создания участника. Enroll первым сохраняет binding/участника, итог отмены registered-stopped; новые чтения/ack запрещены, уже выданный текст и receipts остаются фактами. Отзыв использованного приглашения не освобождает назначение и не обходит BINDING.

Ошибка/потерянный ответ сохраняет cancel-pending до долговечного результата. Restart продолжает сверку без reserve/ввода. Prepared/reserving без recoverable raw ticket отзывается. Новый Chat создаётся отдельно; участник и журнал не стираются ради обхода неизвестности.

Panel/open/read_context/read_message/startup_complete и legacy SDK claim учитывают отмену. Начатый StartupContext неизменяем; progress не показывает незаписанное complete.

### Восстановление и отображение

Остановка backend/архивирование проверяются перед dispatch и в canContinue. Ручное первое сообщение сохраняет manualStart и блокирует bootstrap до адреса; ожидание/restart не добавляют команду панели.

q-адрес никогда не загружается: `navigate` заменяет его чистым корнем. Перед refresh/recovery Execution проверяет текущий и целевой URL через searchParams.has('q'), включая пустое значение. Вместо reload загружается чистый CHATGPT_CHAT_ENTRYPOINT; правило действует без знания попытки в crash recovery, обычном обновлении и native shortcuts. Явная навигация снимает ожидающее восстановление. Control отдельно решает, можно ли открыть подтверждённый chatUrl. Без него остаётся чистый корень; sent не сбрасывается. ERR_ABORTED не считается доказанной неотправкой. Старые sent/UNKNOWN сохраняют транспорт и не переотправляются.

T1=60 секунд для адреса, T2=180 для регистрации отсчитываются от сохранённого sendStartedAtMs. T2 даёт unknown, поздний допустимый enroll может дать sent. Таймаут не доказывает неотправку и не разрешает повтор.

Общая startupLaunch/startupView разделяет подготовку, регистрацию, адрес, чтение X/N, complete и отмену. Свой сохранённый chatUrl с sent/participant/account proof и совпадающим candidate не объявляется lost; currentUrl другого разговора даёт conflict, без свежего наблюдения — saved. URL не заменяет identity. Исторический complete сильнее delivery=pending, текущая отмена запрещает продолжение. В [текущих действиях](current-actions.md) незавершённая передача/ошибка актуальна, успех — в истории.

safeUrl оставляет только имена query. Не журналируются query, raw ticket, контекст или исходная ошибка loadURL; внутренний фактический URL не является диагностическим payload.

## Проверка

Назначенные проверки: startup-recovery, orchestrator-startup, background-startup, unit-all, architecture, electron-smoke, chatgpt-plugin, search-extension-native, release-tooling; полный Kit — kit-check и kit-assignments. Fixtures покрывают оба порядка enroll/URL, раннюю панель, lost response, причины pause/cancel/login/ownership/stale, SHA частей, revoke/enroll, WAL, CAS, restart/unknown/crash/refresh без повтора, строгий URL, восстановленную команду и пользовательский черновик. CDP-ввод: composer вводит, проверяет и отправляет одним Enter, не жмёт Enter без точной проверки, текущего документа или CDP, ошибка после Enter — unknown; runtime — один Enter на токен, свой Enter не снимает владельца, чужой ввод/навигация до Enter отменяют; ContextSession — повтор неудачного ввода и корня с оставшейся командой; настоящий Electron (`background-startup`, smoke, `search-extension-native`) стартует скрытые страницы доверенным Enter без `?q=`. Живая проверка 0.6.4 (стартовый агент и исполнители на настоящем ChatGPT) — NOT_RUN.

Настоящий изолированный Electron с официальным расширением и локальным HTTPS Chat (доверенный Enter отправляет поле) проходит первый проект и новый Chat через пользовательский IPC. Панель вызывается сразу, тест не ждёт режимного флага. Фоновые два/пять E и полный O/E/Kit/MCP/SDK цикл сохраняют независимость от выбранного окна и границы полномочий. Ни модель, ни рабочий профиль не используются. Реальный ChatGPT, root draft, host confirmations и native Windows/Linux проверяет пользователь отдельно.
