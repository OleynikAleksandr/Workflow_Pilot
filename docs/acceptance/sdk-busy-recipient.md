# Полная приёмка SDK с занятым получателем

[Контракт](../modules/sdk-busy-delivery.md), Workflow Pilot 0.5.37. Цель — установить внешнее поведение настоящего ChatGPT при двух уведомлениях занятому O и завершить весь план, а не только получить SDK accepted. Fixtures проверяют приложение/протокол, но не поведение ChatGPT. Публикация разрешена только после указанного ниже живого GO. До него комплект остаётся локальным проверочным; глобальное включение burst не разрешено.

## Базис и установка

Сохранённая база: release 0.5.36, BASE_COMMIT `2b98a5a0745a7f85c103ec9b88ca2dd7d2b1bbe5`, BASE_SOURCE_COMMIT `b24b82b21208622e61ef7ab80e6ce3e5266d0fe8`, SHA256 manifest `6e32d95e700d1e5cf93fc25a971b979a1261b0a48f0d6e6adb39b5cd4815cd84`. Полные комплекты: `.harness/runtime/releases/0.5.36` и `/Users/oleksandroliinyk/Downloads/WorkflowPilot-0.5.36`; [GitHub](https://github.com/OleynikAleksandr/Workflow_Pilot/releases/tag/v0.5.36). Архивы/подпись/две собственные Mac-копии проверены до изменения продукта; доказательство — `sdk-busy-baseline-verification.json` в runtime. Пользовательский положительный отчёт прежнего контрольного плана не заменяет новый off-контроль на точной проверяемой сборке.

DOCS предшествует production build. Один новый возрастающий номер, sourceCommit и полный комплект macOS arm64 / Windows x64 / Linux x64; семь assets, точные source/locks/SHA/composition/signature. Перед каждой production-командой, включая сборочную проверку Kit, проверить и удалить только сгенерированные Python caches по AGENTS, без перехода по симлинкам; Python запускать с -B. Полный Kit включает **kit-check и kit-assignments**, также kit-upgrade.

INSTALL использует готовый подписанный bundle через `node scripts/check-installed-release.mjs --install`, без сборки/переподписи. При работающей службе verified pending допустим только как доставка. Пользователь сам в безопасной точке останавливает службу и переключает версию; агент не закрывает окно и не управляет UI/службой. Повтор installer доставляет тот же комплект. Затем сверить фактические backend/build/protocol/Kit/SDK и новый immutable resource URI: старый iframe не обновляется от замены bundle. `release-installed` доказывает установку, не live GO. Native Windows/Linux/iPad/clean-install остаются NOT_RUN до собственной проверки.

## Матрица

| Прогон | Условия |
| --- | --- |
| OFF | Полный обычный цикл на той же сборке, без профиля/experiment events и регрессий |
| C1 | Новый полный план, tool-wait, два SDK внутри реального hold |
| C2 | Новый полный план, generation вне диагностического tool, подтверждённая граница исходной работы |
| C3 | Третий независимый полный burst одного основного вида; O скрыт/свёрнут, без посещения E |
| C4 | После предварительного GO C1–C3 и OFF — полный read-only-command с единственной точной probe |

Каждый burst использует новую реальную пару результатов и уникальный case ID; все отчёты относятся к одному experiment_id/build/sourceCommit/manifest. Один Start на план; случайный Continue, повтор старого Send или ручное вмешательство не превращают прогон в GO. Прерывания/рестарты исследуются отдельными fault-сценариями, сохраняя исход UNKNOWN. Hidden/no-E-visits подтверждает пользователь: это не вывод из наличия коммитов.

## Контрольный план и порядок действий

1. Пользователь создаёт отдельный тестовый workspace и Chat обычным приложением. Donor, development checkout, рабочие профили и реальные проекты для fixtures не используются. Проверить автоматический q/ticket/panel/context receipt, раннее содержательное имя сессии и отсутствие ручных join/ID/Enable.
2. Задать небольшой проверяемый проект: T001 и T002 независимы и parallel_safe; T003 зависит от обеих интеграций; DOCS зависит от всех обычных задач. У каждой задачи реальные проверки. O заранее сохраняет prepared_task/context всех этапов. Review принадлежит пользователю: агент получает актуальное положение, проводит требуемые раунды и публикует согласованный план. UI показывает реальные раунды/историю и один выбор.
3. Для OFF профиль отсутствует либо подготовлен off. Для burst **после публикации, до Start** разработчик запускает локальный подготовительный скрипт. Workspace задаётся явно; собственные project/scope определяются автоматически. Модель/панель не включают опыт.

```sh
node /Users/oleksandroliinyk/VSCODE/Workflow_Pilot/scripts/prepare-sdk-busy-experiment.mjs --workspace "/absolute/test-workspace" --test-workspace --experiment sdk-busy-0537 --case c1-tool --busy-kind tool-wait
```

`--scope` при необходимости ограничивает конкретный опубликованный scope; `--tasks T001,T002` задаёт собственные task IDs, не chat IDs. Подготовка возвращает проверенный профиль со свежим activation_id. Для off — та же явная команда с `--off`.

4. Нажать Start один раз. Оба E автоматически создаются, получают согласованные задания без нового сочинения O после Start, выполняют проверки, коммитят и отправляют checked result. Не посещать E для запуска или доставки. Для burst дождаться серверного состояния case=holding после двух result; один read-only status для диагностики допустим, циклом модель очередь не опрашивает. Сам status не читает тело выбранных unread result.
5. У O заранее выбрана конечная содержательная контрольная работа с наблюдаемым завершением. Если он уже закончил прежний ответ, пользователь задаёт её отдельным тестовым сообщением в том же плане; повторный Start не нужен. Уведомления нельзя просить игнорировать или искусственно откладывать, E не просят задержать result до окончания текста.
6. C1: O вызывает `workflow_delivery_experiment_hold` со своим case, обычно 15000 мс. Нужны два настоящих последовательных SDK-вызова и их outcomes во время hold; сам инструмент не блокирует backend. Вернувшийся nonce сопровождает resume checkpoint после завершения контрольной работы. C2/C3 generation: checkpoint begin, затем настоящая конечная работа без shell/нового hold. Только свежий candidate наблюдателя разрешает попытки; транскрипт должен отличить генерацию от ожидания tool. После исходной работы — resume с тем же nonce, в конце final. Скрытое reasoning, произвольный счёт символов и предположение «похоже закончил» не являются границей.
7. Полученные уведомления O обрабатывает штатно: read_message, полный контекст, yield, проверка diff/доказательств и acceptance **точного** SHA до каждой интеграции. Не заставлять читать после искусственной паузы ради QUEUED_OBSERVED. Если read произошёл внутри прежнего хода, это полезный MID_TURN, а не успешная очередь.
8. Подтвердить release T003 после обеих интеграций, DOCS, все терминальные acceptance E с read/yield/transport_closed, удаление worktree только после них, cleanup.only_main=true, чистый main, отсутствие команд и durable complete. Не останавливаться на 4/4 или READY_FOR_ACCEPTANCE. Приёмка/архив плана — отдельные действия пользователя.
9. Сохранить полный export и частные evidence; дождаться отправки локального telemetry buffer. При первой потере, чужом адресате, дублировании или UNKNOWN остановить новые измерительные отправки и сохранить исход; старые result/Send не повторять ради PASS.

Для C4 предварительный aggregate должен дать preliminary_go=true. Сохранить его точные байты, затем в новом тестовом плане:

```sh
node /Users/oleksandroliinyk/VSCODE/Workflow_Pilot/scripts/prepare-sdk-busy-experiment.mjs --workspace "/absolute/command-test" --test-workspace --experiment sdk-busy-0537 --case c4-command --busy-kind read-only-command --preliminary-go "/absolute/preliminary-go.json"
```

Checkpoint begin выдаёт фиксированный cmd собственного Python. Не менять executable/argv/nonce/duration, не запускать дополнительную команду и не выдавать произвольному shell read-only допуск. После фактического завершения probe — resume с тем же nonce. Если окружение не подтверждает процесс или требует недоступного подтверждения, C4 остаётся NOT_RUN/INCONCLUSIVE; его не обходят другой командой.

## Набор evidence

На каждый прогон — неизменяемая локальная папка. Разработчик собирает машинные ID из backend/Kit; пользователь их вручную не переписывает. Не публиковать сырой разговор, профиль, credentials или WAL в GitHub. Анализатор читает файлы, не управляет приложением.

- `baseline-info.json`: version=0.5.36, sourceCommit и manifest_sha256 из базиса выше; путь/результат исходной проверки сохранить рядом.
- `release-manifest.json`: точные байты проверяемого комплекта.
- `experiment-info.json`: schema=1, evidence_kind=`live|fixture|unverified`, mode=`off|sdk-busy-burst`, experiment_id, case_id/busy_kind для burst, build_id, sourceCommit, manifest_sha256, project_id, scope_id, recipient_session_id, protocol_version=5, resource_uri вида `ui://workflow-pilot/panel-<64 hex>.html`, sdk_versions с ext_apps/mcp_extensions/mcp; hidden_no_executor_visits по фактическому пользовательскому свидетельству. Версии сверяются с текущим backend/MCP, не названием скачанного ZIP.
- `export-pages.json`: все неизменённые ответы communication.export от cursor 0 до одного through_seq. Каждая страница содержит jsonl, after_seq (следующий cursor), through_seq, complete и summary с page_from, visibility=whole-run, build/protocol/SDK. Нельзя брать только последние 100 событий.
- Альтернатива реального экспорта панели: `communication.jsonl` — весь скачанный JSONL; `export-summary.json` — сводка того же snapshot с complete=true, through_seq, whole-run/build/protocol/sdk_versions и полным pages=[{after_seq:начальный_cursor,through_seq:конечный_cursor},...]. Пагинация должна непрерывно покрыть 0..through_seq. Недостающая сводка не выдумывается.
- `work-proof.json` и явно сохранённый относящийся фрагмент транскрипта: контрольная работа, nonce и фактические границы хода. Это независимое свидетельство пользователя/наблюдения, а не утверждение модели, что очередь работает.
- `cycle-proof.json` и полный read-only экспорт Kit/Git/команд: источники, acceptance, интеграции и cleanup. UI-счётчик не заменяет этот файл.

Минимальный work-proof для burst:

```json
{
  "evidence_file": "original-work.txt",
  "evidence_sha256": "SHA256 точных байтов",
  "nonce": "nonce hold/begin",
  "preserved": true,
  "original_turn_id": "наблюдённый исходный ход",
  "end_event_seq": 123,
  "panel_clock": {"panel_instance_id": "из журнала", "verified": true, "offset_ms": 0},
  "reads": [{"message_id": "реальный result", "turn_id": "наблюдённый ход чтения", "evidence_verified": true}]
}
```

reads содержит оба result. end_event_seq ссылается на resume своего nonce, связанный с реально законченным исходным заданием. panel_clock.verified требует проверенной связи часов; offset_ms переводит client_time в часы backend. Нулевая поправка не подставляется по предположению. При изменении часов/неизвестной погрешности, пересечении границы или отсутствии наблюдаемого turn нельзя выставить verified=true. Для generation дополнительно `generation_interval:{verified:true}` после независимой проверки, что оба SDK попали в реальную генерацию вне tool; candidate сам по себе этого не доказывает. Для C4 нужны command_hash и command_id из единственной закреплённой probe. Для OFF старой занятой работы нет: work-proof может быть `{}`, но полный cycle proof обязателен.

Cycle-proof — только ссылка и digest:

```json
{"evidence_file":"kit-git-export.json","evidence_sha256":"SHA256 точных байтов"}
```

Содержимое `kit-git-export.json` формируется из **фактических** read-only данных, не из желаемого результата:

- schema=1; plan.tasks — все задачи с id и commit_status.
- assignments — для каждой task_id: integration_commit, transport_closed, dialogue.result={message_id,source_commit}, dialogue.acceptance={message_id,source_commit}. Источники — сохранённые Kit records; данные извлекаются до удаления нужных артефактов.
- git={head,status_porcelain,worktrees,commits}. commits содержит полный необходимый граф {sha,parents,task_id,role}. role=integration задаётся по настоящему Kit commit reference; у дочернего checked commit role=implementation. Одинаковый task ID у source и merge не считается двумя интеграциями. Граф должен доказывать достижимость source от своей интеграции, а интеграции — от HEAD; для каждой задачи ровно один integration effect.
- cleanup — фактический ответ с only_main=true,pending=[]; commands — снимок command-activity с завершёнными состояниями. Чистота Git определяется пустым status_porcelain и единственным worktree.

Анализатор сам сверяет граф и точные source/accepted SHA, DONE минимум четырёх разных задач, terminal read/yield/assignment.transport_closed в полном журнале и plan.permission complete. Поле full_cycle не берётся из произвольного входного флага. Hash подтверждает сохранённые байты, а не правдивость самостоятельно сочинённых records: аналитик обязан сверить их с оригинальными Git/Kit/командными источниками. Транскрипт и свидетельство hidden остаются отдельно обозначенными человеческими доказательствами.

## Анализ и решение

```sh
node scripts/analyze-sdk-busy-experiment.mjs "/absolute/evidence-c1" > "/absolute/c1-analysis.json"
node scripts/analyze-sdk-busy-experiment.mjs "/absolute/evidence-c1" --markdown > "/absolute/c1-analysis.md"
node scripts/analyze-sdk-busy-experiment.mjs --aggregate "/absolute/off-analysis.json" "/absolute/c1-analysis.json" "/absolute/c2-analysis.json" "/absolute/c3-analysis.json" > "/absolute/preliminary-go.json"
```

После C4 агрегировать те же OFF/C1/C2/C3 и C4. Контрольный off-analysis получается тем же анализатором из mode=off и полных proofs; полагается на computed full_cycle, а не ручной PASS. Aggregate требует evidence_kind=live и одинаковые build/sourceCommit/manifest/experiment, уникальные case IDs, три основных случая обоих видов и один hidden, затем C4 с digest предварительного GO.

| Класс | Установлено |
| --- | --- |
| QUEUED_OBSERVED | Оба приняты во время занятости; исходная работа сохранена, read в следующем наблюдённом ходе, каждый эффект один |
| MID_TURN | Read/обработка внутри прежнего хода; сохранность работы фиксируется отдельно |
| SDK_DEFERRED | Promise разрешился после прежней занятости; быстрый burst не доказан |
| REJECTED | Явный отказ |
| UNKNOWN | Исход отправки неизвестен; поздний callback/read не стирает исторический UNKNOWN измерения |
| ACCEPTED_UNREAD | SDK принял, read не подтверждён |
| INCONCLUSIVE | Недостаточны границы/часы/identity/пагинация/пара, ранний model-pull, invalidated, gap или повтор Start |

Для обоих result сохраняются event refs, sdk/read/effect/late факты; для burst — отдельный итог. Разные классы не сворачиваются в QUEUED_OBSERVED. Read calls — число read.requested, а не число применений результата. 120 секунд ограничивают доставку; многоминутные T003/DOCS не обрезают full cycle.

**GO:** OFF без регрессий, C1–C3 и C4 каждый QUEUED_OBSERVED, исходная работа сохранена, точные acceptance/один эффект/интеграции, полный terminal/cleanup/complete, полный экспорт с совместимым ресурсом. Отдельный успех выполнения при неизвестной очереди не даёт GO. MID_TURN/SDK_DEFERRED требуют отдельного решения пользователя по дизайну. FAIL/UNKNOWN/потери/дубликаты/чужая identity — NO-GO; INCONCLUSIVE устраняется улучшением измерения с новой парой, без повторения старого Send.

INSTALL не DONE до этого evidence. PUBLISH после GO: тот же проверенный комплект без rebuild, собственный GitHub, draft → семь assets → сверка → публикация; tag на manifest.sourceCommit, после последнего push remote main равен итоговому HEAD. Ошибка проверки draft останавливает публикацию. Полный план остаётся READY_FOR_ACCEPTANCE; архив — только после прямой приёмки пользователя.

## Возврат при неудаче

Новые измерительные отправки отключить; сохранить журналы, старые intent/unknown и оба комплекта. Не добиваться PASS повтором. Не закрывать INSTALL/PUBLISH как успешные. Через Kit добавить условные задачи возврата/согласованный carryover, сохраняя DONE и evidence; не выполнять эту ветку заранее на успешном пути.

Быстрый off возвращает обычный допуск, но не заменяет бинарник. Проверенный пакет 0.5.36 сохранён; одной передачи его Downloads текущему check-installed-release недостаточно: верхняя проверка связана с package/version/canonical manifest/source snapshot. Не подменять manifest/package для обхода. Сам reader WAL побайтно равен 0.5.36; изолированная проверка новых необязательных полей не писала данные и не продолжала опыт. Это не обещание безопасного возобновления активного эксперимента старым Control.

Надёжный штатный путь: отдельные задачи обратных продуктовых/тестовых патчей опыта от новых коммитов к старым, сохраняя независимые исправления 0.5.36. История/текущий managed plan не откатываются вслепую вместе с Git-коммитом. Нельзя reset --hard, force-push, git clean или массово восстанавливать дерево. Новый DOCS-раунд, возрастающий номер с поведением 0.5.36, регрессии/обе части Kit, общий комплект трёх ОС, штатная установка и off-контроль. Прямое восстановление готового 0.5.36 bundle и совместимых данных допустимо только после отдельной проверки этого delivery-пути. Пользовательское безопасное переключение службы сохраняется; donor не затрагивается.

## Автоматические доказательства и пределы

Изолированные tests проверяют typed Python MCP → authenticated bridge → WAL/export, hold вне очереди, generation candidate/nonce, точный inline Python вне ASAR, команды/read-only services, лимит двух/две панели, ранний read/model-pull/повторное вооружение, неизвестный исход/restart/lease/remount/late Promise и семь классов анализа. Полный API/MCP/SDK/Kit/Git fixture проводит раннее имя, Review, один Start, два настоящих checked SHA при busy, принятие/интеграции, T003/DOCS, terminal receipts и cleanup/complete. Рендерерный long-ticket fixture отдельно проверяет renew/late callback; 89 секунд backend проверены управляемыми часами. Fixtures не исполняют модельные команды и не меняют рабочий профиль.

Фактические проверки и коммиты — в текущем плане/Kit evidence; DOCS имеет checks:[] и не приписывает себе запуск тестов приложения. Живое состояние определяется INSTALL evidence. Native Windows/Linux/iPad, чистая установка и особенности реального host iframe не повышаются в PASS по результатам упаковки или JSDOM.
