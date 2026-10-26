# Запуск Chat и идентичность сессии

## Ответственность и поведение

Workflow Pilot 0.5.35 работает только с обычными ChatGPT Chat. Выбора Chat/Work и поддержки чтения старых Work-сессий нет. Первый проект, новый Chat, Doctor и фоновые исполнители используют один путь: короткая команда через `https://chatgpt.com/?q=…`, регистрация панели по приглашению, полный ролевой контекст через [MCP](orchestrator-startup.md). Открытие сохранённого разговора не создаёт новую команду.

Обязательная предпосылка Chromium — [официальное ChatGPT search](chatgpt-search-extension.md), автоматически проверенное и подключённое до первой страницы в собственной persistent session. Последующие страницы используют проверенный кэш. Установка расширения не подтверждает отправку и не разрешает повтор q.

DOM не вводит и не отправляет первое сообщение, не извлекает ID разговора, не определяет и не переключает режим. Сохраняются наблюдения входа, документа, занятости и черновика. Последующий диалог использует прежний SDK-канал. Внешние composer/DOM/pageScript-экспорты остаются совместимыми. Нет резервного Send через DOM/клавиатуру, приватных запросов ChatGPT или повтора неизвестного исхода.

Это протокол приложения поверх внешнего поведения ChatGPT. Пользователь подтвердил автоматическую первую отправку в Electron 0.5.32, после неё обнаружена зависимость выдачи контекста от отсутствующего переключателя. Исправленный полный запуск 0.5.33 требует отдельной [живой приёмки](../acceptance/chat-only-startup.md); изолированный HTTPS-host её не заменяет.

## Контракт и зависимости

### Единственный Chat и хранилище

WorkspaceSessions schema 8 не хранит у новых сессий `experience`/`availability`, у попыток — `modeConfirmed`/`modeViolation`. API/preload создания сессий не принимает выбор режима. DOM и PageState не возвращают experience, нет select-experience/expectedExperience, waiting-experience и режимных удержаний проектов, назначений и восстановления.

Обновление поддерживаемых Chat-записей v1–v7 сохраняет локальные ID, chatUrl, request/generation, приглашение/контекст, receipts, роли, время, назначения и журналы. До перезаписи остаётся точная `.vN-backup` копия. Устаревшие режимные поля удаляются, их флаги не предоставляют и не запрещают полномочия. Явно неподдерживаемые значения отклоняются общей `SESSIONS_INVALID` с сохранением исходного файла: их просмотра, конвертации в Chat и специального режима совместимости нет. Установка не очищает пользовательский профиль или данные.

Разрешённые внешние адреса: HTTPS `chatgpt.com` без credentials и чужого порта; корень, поддерживаемые `/c/<id>` и `/g/<id>/c/<id>`. Любой query `surface` и неподдерживаемые пути отклоняются общей проверкой URL. `WEB:`/`local-chatgpt:` распознаются отдельно как непостоянные адреса. В runtime нет классификатора Work. Публичные имена файлов chatgpt-experience остаются для внешних импортов, содержат URL helpers без режима.

Технические `workflow`, `worktree`, `workProgress` и namespace run_id `work:` — устойчивые сущности, не режим ChatGPT. Kit 1.10.2 сохраняет выбор sequential/orchestrated и прежние назначения; устаревшее поле session_experience не разрешает другой режим ChatGPT. Поставляемый runtime формируется из packages/workflow-kit; установленный Kit меняет только installer.

### Четыре разных идентификатора

| Значение | Назначение |
|---|---|
| Локальные workspace/sessionId | Владелец страницы и запуска до открытия ChatGPT |
| Тикет | Разрешение регистрации конкретной локальной сессии и назначения |
| Постоянный `/c/<id>` | Адрес повторного открытия сохранённого разговора |
| Metadata `openai/session` | Идентичность MCP-хоста для binding участника |

Публичный Chat ID не считается равным openai/session. Активная карточка, последний workspace, время ответа и совпадение локального ID не удостоверяют облачного получателя. Навигация и приглашение коррелируют с одной сохранённой попыткой; проверяются назначение, владелец, worktree и grant.

### Порядок запуска

1. Execution готовит расширение перед первой страницей ChatGPT. Если страница не корень нового Chat, openChatEntrypoint открывает чистый корень без q: наблюдение composer старого разговора не переносится на новый документ.
2. Read-only preflight этого webContents/documentId подтверждает signed-in, доступный редактор, отсутствие генерации и draftLength=0. Unknown, выход, неподходящий URL и непустой/неизвестный draft запрещают bootstrap. Пользовательский текст не очищается. Наличие переключателя режима не проверяется.
3. После проверки проекта и fingerprint recovery очередь WorkspaceSessions сохраняет attempt reserving с новым requestId/attemptGeneration, startupText и metadata пакета. prepareBootstrap резервирует приглашение с этой корреляцией; stageStartup сохраняет полный контекст по SHA в content store/WAL. Raw ticket живёт в памяти до формирования URL.
4. Перед эффектом повторно проверяются документ, вход, URL, draft, занятость, владелец, fingerprint, срок приглашения, пауза и архивирование. Сохраняются enrollmentRef={run_id,ticket_hash}, contextRef.message_id, sendStartedAtMs и принадлежность навигации. Изменение preflight/ошибка записи запрещает q и требует сверки отзыва.
5. composer.startChat/BrowserSessions.navigate с одноразовым bootstrapToken выполняет один loadURL. URL строится через encodeURIComponent; recovery, model, hints и temporary-chat не включаются.
6. Только долговечная регистрация текущего enrollmentRef/requestId/attemptGeneration выставляет sent и participant_id в sentEvidence. Успех loadURL, адрес, временный ID и старый участник этого не делают.
7. Первый panel() проверяет точного получателя и попытку, вход на свежем документе после навигации, принадлежность страницы, отсутствие отмены/паузы и актуальность пакета. Первая часть возвращается в startup_context без ожидания переключателя/iframe/SDK. Все части читаются через MCP и подтверждаются SHA; это ещё не выполнение или приёмка плана.
8. bindChat сохраняет постоянный URL при sent, accountConfirmed из свежего signed-in наблюдения и непрерывной принадлежности навигации. Уникальность адреса и запрет подмены сохраняются. Регистрация и URL допускаются в любом порядке.

Первая команда одинакова для всех ролей:

```text
Открой панель Workflow Pilot: один раз вызови workflow_pilot_panel с аргументами {"enrollment_ticket":"<TICKET>"}. Если вызов вернул ошибку или в ответе нет startup_context, сообщи точную причину и ничего не выдумывай; подтверждения хоста не обходи. Приглашение не публикуй и не сохраняй.
```

Тикет присутствует в URL, первом сообщении и аргументе инструмента; дополнительные копии в файлах/отчётах/других чатах запрещены. Формат randomBytes(32).toString('hex'), 64 hex, TTL первого использования 30 минут. Новый тикет не отзывает старый. Повтор того же binding идемпотентен, другой разговор получает BINDING. Без startup_context агент сообщает только известную причину.

### Готовность первой выдачи

DialogueDelivery ждёт существующий navigationTail и очередь store. RequestId и attemptGeneration должны точно совпасть. Для ещё не привязанной страницы требуются тот же id/incarnation/epoch/navigationOwner и отсутствие lost/conflict. Для сохранённого chatUrl текущий snapshot и наблюдение сверяются с этим URL. Требуется signed-in на новом post-navigation documentId.

Ранний вызов панели может до двух секунд ожидать изменения на существующем PageState-канале. Каждая итерация снова проверяет текущую попытку/проект; ожидание не создаёт новый q, тикет, отправку SDK или модельное уведомление. Причины раздельные: STARTUP_PAUSED, STARTUP_CANCELLED, STARTUP_LOGIN_REQUIRED, STARTUP_ADDRESS_UNCONFIRMED, STARTUP_NOT_READY. Внешний MCP может классифицировать их как INVALID_ARGUMENT, но безопасное сообщение сохраняет конкретную причину.

Только после готовности проверяется свежесть пакета; действительно заменённый/устаревший пакет отклоняется STALE_MESSAGE. Уже выданный снимок S имеет отдельное правило дочитывания того же SHA при новой ревизии плана ([startup](orchestrator-startup.md)). Не ослаблены binding, отмена, поколения, SHA или разрешения исполнения.

### Попытка и навигация

Attempt содержит bootstrapTransport=url-query, contextTransport=panel, request/generation, metadata/startupText, ссылки приглашения/контекста, времена, sentEvidence, addressCandidate, addressStatus=pending|confirmed|lost|conflict, accountConfirmed/loginLost и cancelState=none|requested|revoked|registered-stopped. Raw ticket, q и полный текст первой команды не сохраняются в attempt/UI.

patchAttempt сериализует CAS request/generation, применяя patch-фабрику к актуальному состоянию: позднее событие не затирает sent/отмену. Checkpoint использует flush файла, rename и sync каталога на POSIX; Windows — flush без POSIX directory sync. Это не общая транзакция с WAL и не гарантия всех аппаратных сбоев.

Один BrowserSessions-порт передаёт did-navigate-in-page, did-navigate, did-redirect-navigation: {type,url,isMainFrame,navigationKind,navigationSequence,navigationOwner,snapshot}. Сигнатуры соответствуют Electron 44.5.1. Snapshot содержит id/incarnation/epoch, sequence монотонен в record. Control фиксирует факты в navigationTail, snapshot наблюдения захватывается при receipt.

Принимаются только main-frame события своей попытки через normalizeChatUrl/isPendingChatGPTConversation. Временный URL не становится chatUrl. Неподдерживаемый URL отменяет запуск общей валидацией. Собственный navigation-start отменяет поколение контроллера, но не сохранённое разрешение dispatch: следующий tick продолжает attempt. Пользовательский переход, refresh/release, другая incarnation/epoch или неоднозначный адрес прекращают принадлежность. Lost/conflict не очищаются похожим поздним URL. Рестарт не угадывает потерянную корреляцию; поздний enroll подтверждает отправку, но не чужой адрес.

Низкоуровневый composer отдельно проверяет ожидаемый URL и documentId непосредственно перед Send. Чужая навигация оставляет draft и запрещает отправку; эта защита не зависит от режима.

### Отмена и два хранилища

Control сначала сохраняет cancelState=requested и запрещает действия. Затем communication.cancelStartup через mutate/WAL отзывает приглашение по ticket_hash и прекращает выдачу/ack этого request/generation. Проверяется сохранённый владелец; модель не может отзывать чужие приглашения.

Enroll проверяет revoked внутри транзакции до прежнего participant_id. Revoke первым даёт PLUGIN_COMMUNICATION_ENROLLMENT_REVOKED без создания участника. Enroll первым сохраняет binding/участника, итог отмены registered-stopped; новые чтения/ack запрещены, уже выданный текст и receipts остаются фактами. Отзыв использованного приглашения не освобождает назначение и не обходит BINDING.

Ошибка/потерянный ответ сохраняет cancel-pending до долговечного результата. Restart продолжает сверку без reserve/q. Prepared/reserving без recoverable raw ticket отзывается. Новый Chat создаётся отдельно; участник и журнал не стираются ради обхода неизвестности.

Panel/open/read_context/read_message/startup_complete и legacy SDK claim учитывают отмену. Stage того же request не возобновляет отменённый пакет. Начатый StartupContext неизменяем. Progress читает committed view до окончания WAL fsync: незаписанное complete не показывается.

### Восстановление и отображение

Остановка backend/архивирование проверяются перед dispatch и в canContinue. Ручное первое сообщение сохраняет manualStart и блокирует bootstrap до адреса; ожидание/restart не добавляют команду панели.

Перед refresh/recovery Execution проверяет текущий и целевой URL через searchParams.has('q'), включая пустое значение. Вместо reload загружается чистый CHATGPT_CHAT_ENTRYPOINT; правило действует без знания попытки в crash recovery, обычном обновлении и native shortcuts. Явная навигация снимает ожидающее восстановление. Control отдельно решает, можно ли открыть подтверждённый chatUrl. Без него остаётся чистый корень; sent не сбрасывается. ERR_ABORTED не считается доказанной неотправкой. Старые sent/UNKNOWN сохраняют транспорт и не переотправляются.

T1=60 секунд для адреса, T2=180 для регистрации отсчитываются от сохранённого sendStartedAtMs. T2 даёт unknown, поздний допустимый enroll может дать sent. Таймаут не доказывает неотправку и не разрешает повтор.

Общая startupLaunch/startupView разделяет подготовку, регистрацию, адрес, чтение X/N, complete и отмену. Свой сохранённый нормализованный chatUrl с sent/participant/account proof и совпадающим candidate не объявляется lost по старому attempt; currentUrl другого разговора даёт conflict, отсутствие свежего наблюдения — saved. URL не заменяет identity и не разрешает перепривязку. Chat URL/addressStatus сохраняются согласованно. Исторический complete сильнее delivery=pending, текущая отмена запрещает продолжение. Снимок новой ревизии остаётся stale без нового пакета. В [текущих действиях](current-actions.md) незавершённая передача/ошибка актуальна, успех с устойчивым ID/временем — в истории, без sidebar-карточки и выдуманной даты.

safeUrl оставляет только имена query. Не журналируются q, raw ticket, контекст или исходная ошибка loadURL; внутренний фактический URL не является диагностическим payload.

## Проверка

Назначенные проверки: startup-recovery, unit-all, architecture, electron-smoke, chatgpt-plugin, search-extension-native, release-tooling; полный Kit — kit-check и kit-assignments, обновление — kit-upgrade. Fixtures покрывают оба порядка enroll/URL, раннюю панель, lost response, точные pause/cancel/login/ownership/stale причины, SHA всех частей, оба порядка revoke/enroll, WAL, CAS, restart/unknown/crash/refresh без q replay, строгий URL и сохранение Chat identity при обновлении.

Настоящий изолированный Electron с официальным расширением и локальным HTTPS Chat без переключателя проходит первый проект и новый Chat через пользовательский IPC. Панель вызывается сразу, тест не ждёт режимного флага. Фоновые два/пять E и полный O/E/Kit/MCP/SDK цикл сохраняют независимость от выбранного окна и границы полномочий. Ни модель, ни рабочий профиль не используются. Реальный ChatGPT, root draft, host confirmations и native Windows/Linux проверяет пользователь отдельно.
