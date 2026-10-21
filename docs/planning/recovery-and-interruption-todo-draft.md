# ToDo — recovery-status-interruptions

**СТАТУС: ПРОЕКТ НОВОГО ПЛАНА, ЕЩЁ НЕ ОПУБЛИКОВАН WORKFLOW KIT.**
Дата подготовки: 21.10.2026. Это вторая часть пакета
«спецификация + ToDo». Полный контракт, исходные факты, доказательства
ошибки и матрица прерываний находятся в
`docs/planning/recovery-and-interruption-2026-10.md`.

## Перед началом — новый чат без памяти

1. Рабочая папка: `/Users/oleksandroliinyk/VSCODE/Workflow_Pilot`.
   Прочесть **оба** документа; предыдущие диалоги не нужны.
2. Проверить `./scripts/workflow status`,
   `./scripts/workflow review:status`, `git status --short`,
   `git log -1`, а затем `AGENTS.md` и `.harness/kit/WORKFLOW.md`
   как машинные ограничения текущего checkout.
3. Старый scope `orchestrator-panel-startup` принят и закрыт
   Git-коммитом `cd62d1f` (17/17 DONE). **Не возвращать его.**
4. Новый scope: `recovery-status-interruptions`. Два раздела ниже
   объединяют **семь**, а не две микрозадачи. Пока Review
   `NEEDS_USER`, нельзя начинать задачи или вручную изменять
   управляемый `.harness/plans/todo-plan.md`.
5. Review включён. Первый запуск завершился
   `REVIEW_CLI_ERROR / error_max_turns` на 30 ходах без отзыва.
   21.10.2026 пользователь прямо разрешил **увеличить эти числа
   временно и повторить Review**: применить
   `review:resolve --action retry`, обновить подготовленные документы
   и нормализованный план, поднять лимиты до 1000 ходов / 7200000 мс
   исключительно для текущего запуска, затем вернуть штатные
   runtime-файлы и продолжить Review-протокол. Не объявлять технический
   повтор положительной рецензией и не обходить Review публикацией.
   Долговременное решение — FIX-REVIEW: убрать искусственные лимиты.
6. Форма предстоящей публикации существует локально в
   `.harness/runtime/review-input.json`, но это игнорируемый Git
   runtime, на него **нельзя полагаться** после нового запуска.
   Восстанавливать из двух документов; не удалять готовую спецификацию.
7. Сейчас реализацию, автоматических исполнителей, Stop, отключение
   сети, backend restart, build/install/release **не запускать**.
   После согласованной публикации план стартует только по следующему
   поручению пользователя/штатному запуску проекта.

## Параметры единого плана

Цель: исправить выявленные дефекты восстановления сессии S и
неоднозначности UI после успешного исполнения Test_07; затем
подготовить автоматические и пользовательские сценарии испытаний O/E
на прерывания. Не менять архитектуру Control/Execution/Frontend.

- `scope_id: recovery-status-interruptions`.
- Исходная версия: Workflow Pilot 0.5.23, Kit 1.9.3; тест-источник
  `Workflow_Pilot_Test_07`, 4/4 DONE, 14/14 PASS по отчёту,
  HEAD `826308d`. Не работать с этим живым тестовым репозиторием.
- Один план, разделы I → II. Выполнение **sequential**,
  `parallel_allowed=false, max_workers=1`: затронутые startup/UI
  файлы пересекаются, B зависит от исправлений. Не привязывать
  публикацию из S-чата к несуществующему O-session ID; если
  пользователь выберет orchestrated, новый O должен быть
  **подтверждён backend** и конфигурация изменена штатно.
- `release=false` по смыслу: **нет** delivery-задач на сборку,
  установку или GitHub Release. Для sequential-плана поле `release`
  не записывать в scope JSON (Kit его не допускает).
- Документ-источник required context_pack:
  `docs/planning/recovery-and-interruption-2026-10.md`.
  Не создавать отдельные файлы «исследование»/«история».
- Задачи выполняются через `task:start ID`, затем проверенные
  изменения и `commit --task ID`; зависимые задачи — только после
  DONE предшественников. Завершение всей подготовки оставляет
  `READY_FOR_ACCEPTANCE`, без архивации.

## Раздел I. Устранить найденные ошибки

### FIX-REVIEW — убрать искусственные лимиты Claude Review

Зависимости: нет. Выполнить **первой** задачей после утверждения
нового плана, чтобы больше не понадобилось ручное увеличение чисел.

Файлы: `packages/workflow-kit/src/cli.mjs`,
`packages/workflow-kit/src/lib/claude-review.mjs`,
`packages/workflow-kit/src/lib/plan-review.mjs`,
`packages/workflow-kit/src/lib/review-state.mjs`,
`packages/workflow-kit/src/lib/command-help.mjs`,
`packages/workflow-kit/scripts/check-plan-review-fixture.mjs`,
`packages/workflow-kit/README.md`.
Установленная `.harness/kit` меняется только штатным installer;
не оставлять в ней временных ручных правок.

Проверки: **вместе** `kit-check` и `kit-assignments`.

Критерии: штатный Claude CLI работает без `--max-turns` и
жёсткого таймера 15 минут; число ходов и раундов не ограничено
произвольным числом. Наличие >100 ходов и >15 минут не вызывает
`NEEDS_USER` само по себе. Реальный сбой/ручной Stop/зависание
диагностируются и восстанавливаются без второго запуска или потери
review-позиции; JSON verdict по-прежнему проверяется.
Не добавлять новый watchdog и не ослаблять проверки.

Коммит: `fix: убрать искусственные пределы Claude Review`.

### FIX-STARTUP — сохранённый пакет S и изменившийся план

Зависимость: FIX-REVIEW.

Файлы: `src/control/plugin/startup-context.mjs`,
`src/control/workflow/dialogue-delivery.mjs`,
`tests/startup-context.test.mjs`,
`tests/plugin-communication-store.test.mjs`,
`tests/dialogue-delivery.test.mjs`.

Проверки Kit: `orchestrator-startup`, `chatgpt-plugin`.

Критерии: после part0 для S при rev5 и интеграции соседней задачи
до rev6 дочитывание 3/3 и `startup_complete` проходят,
`complete=true`, одно событие и идемпотентный повтор.
Сохраняются отказы stale **до** открытия, чужой identity,
удаления, superseded, неверного SHA и incomplete. Никакого grant S,
никаких повторных SDK Send при UNKNOWN. Старые O/E не регрессируют.
Только изолированные on-disk WAL fixtures, не реальные профили.

Коммит: `fix: подтверждать завершённое чтение startup S при изменении плана`.

### FIX-STARTUP-UI — завершение и терминальные ошибки

Зависимость: FIX-STARTUP.

Файлы: `src/control/plugin/startup-context.mjs`,
`src/control/context/context-session.mjs`,
`src/contracts/startup-view.mjs`,
`src/frontend/desktop/ui/sidebar.mjs`,
`src/frontend/plugin/panel.mjs`,
`tests/startup-context.test.mjs`,
`tests/context-session.test.mjs`,
`tests/sidebar.test.mjs`,
`tests/panel-dialogue-view.test.mjs`.

Проверки: `orchestrator-startup`, `startup-recovery`.

Критерии: UI/API различают pending/reading n/N/complete/stale/error;
`startup_complete=true` побеждает устаревшее
`delivery=pending`. Отказ завершает ожидание с безопасной
инструкцией, не создаёт вечного spinner и повторных сообщений.
SDK-accepted/DOM sent не подменяют receipt.

Коммит: `fix: согласовать завершение startup и ошибки в UI`.

### FIX-PROGRESS — два счётчика и достоверные стадии

Зависимость: FIX-STARTUP-UI.

Файлы: `src/frontend/desktop/ui/sidebar.mjs`,
`src/frontend/plugin/panel.mjs`,
`src/backend/desktop-model.mjs`,
`src/control/workflow/coordination.mjs`,
`tests/sidebar.test.mjs`,
`tests/panel-dialogue-view.test.mjs`,
`tests/automatic-agent-dialogue.test.mjs`.

Проверки: `startup-recovery`, `prepared-flow-cycle`,
`chatgpt-plugin`.

Критерии: одновременно `результаты исполнителей X/N` (только
подтверждённые commit/result) и `интегрировано Y/N` (Kit main);
пример X=2, Y=1 корректен. Статусы подготовлено → авторизовано/
ожидает → принято SDK → E начал работу не смешиваются.
`checks:[]` DOCS означает отсутствие Kit application-check,
а не PASS/FAIL; `ACTIVE/READY_FOR_ACCEPTANCE` + DONE означает
ожидание пользователя, не продолжающуюся работу. Обновление
штатной моделью backend/SSE без нового scheduler/polling.

Коммит: `feat: показывать проверенные этапы прогресса и доставки`.

## Раздел II. Подготовить испытания прерываний

### TEST-REGRESSION — автоматические проверки O/E

Зависимости: FIX-STARTUP, FIX-STARTUP-UI, FIX-PROGRESS.

Файлы: `tests/automatic-agent-dialogue.test.mjs`,
`tests/fixtures/automatic-agent-dialogue.mjs`,
`tests/plugin-communication-store.test.mjs`.

Проверка: `unit-all`.

Проверяемые сценарии (полные шаги — раздел II спецификации):
**O1** Stop O после acceptance SHA до merge; **O2** восстановление
из сохранённого состояния между acceptance/merge; **E1** E после
commit до result; **E2** блокирующий вопрос одного E при DONE другого;
**NET/UNKNOWN** — неопределённый transport Send без дубликатов.
Fixtures моделируют безопасные контрольные точки, не убивают
production backend и не отключают реальную сеть.
Инварианты: одна интеграция, сохранённый SHA, нет повторной
приёмки, нет второго task/worktree, нет потери DONE или
побочного эффекта для соседнего проекта.

Коммит: `test: сценарии идемпотентного восстановления O и E`.

### TEST-PLAYBOOK — инструкция для живого теста

Зависимость: TEST-REGRESSION.

Файл: `docs/acceptance/interruption-recovery.md`.
Проверки: только документальная транзакция, `verification_ids=[]`.

Критерии: матрица O1/O2/E1/E2/NET/UI/RESTART содержит точку
прерывания, ручную кнопку Stop → «Продолжай», обратимое отключение
сети **второго** клиента/UTM, restart только изолированного
backend с другой identity, команды status/Git/WAL без секретов,
ожидаемый результат и отметку PASS/FAIL/NOT_RUN.
Это **подготовка**, живые прерывания сами по себе не проводятся.

Коммит: `docs: сценарий живого испытания прерываний O и E`.

### DOCS — актуализация действующей документации

Зависимости: все пять предшествующих задач.

Файлы: `README.md`, `docs/architecture/OVERVIEW.md`,
`docs/modules/orchestrator-startup.md`,
`docs/modules/assignment-dialogue.md`,
`docs/modules/orchestrated-execution.md`.

Проверки: `verification_ids=[]` (не запускать полную suite
автоматически при одних документационных изменениях).

Критерии: проверить фактический интегрированный код и новые
fixtures, обновить только устаревшие утверждения, не выдавать
автоматические регрессии за живую приёмку; документы не более
28000 байт. Рабочее дерево чистое, нет build/install/release.

Коммит: `docs: зафиксировать исправленный startup и подготовленные испытания`.

## Финальная граница готовности

Доказаны изменения и fixture-проверки, подготовлен живой сценарий,
все семь задач имеют Kit DONE. Отдельные реальные Stop/NET/restart
по-прежнему `NOT_RUN` до ручного запуска пользователем. Отсутствие
живых прерываний не маскировать как PASS.

Новый план после согласования должен появиться именно в
`.harness/plans/todo-plan.md`, а этот черновик использовать
только как восстанавливаемый источник. В новой сессии проверять
публикацию через `./scripts/workflow status`, а не считать её
произошедшей по наличию этого файла.
