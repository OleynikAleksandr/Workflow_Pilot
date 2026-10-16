# План оркестратора

Workflow Kit 1.8.0 поддерживает `execution_strategy: "orchestrated"` — план, который ведёт сессия-оркестратор Workflow Pilot. Остальные правила плана — [контракт пакета](workflow-kit-package.md); назначения и интеграции — [назначения](parallel-assignments.md). Код: `plan.mjs`, `actions.mjs`, `validate.mjs`, `task-assignment.mjs`, `task-integration.mjs`, `integration-proof.mjs`, `signals.mjs`, `recovery.mjs`.

## План

- Полный набор `parallel_allowed`, `max_workers`, `execution_strategy`, `execution_reason`, а также обязательные `execution_origin_session_id` (Session ID оркестратора из recovery; иначе `PLAN_EXECUTION_ORIGIN`) и `release: boolean` (меняет ли план выпускаемое приложение). `release` в других стратегиях запрещён.
- `parallel_safe: true` — задача может работать одновременно с другими; допустим только при `parallel_allowed: true` и `max_workers > 1`. `false` — последовательная задача. Прежние sequential/parallel-планы проверяются как раньше.
- DOCS добавляется всегда, в том числе без выпуска и при plan:extend: новые задачи встают перед ней, после последней DOCS допустимы только delivery-задачи (`DOCUMENTATION_FINAL_TASK`).
- `release: true` требует `delivery_tail` в `.harness/workflow.json` — упорядоченный список `{verification_ids, verification_kind: package|installed}` с настроенными проверками (`CONFIG_SCHEMA`). Delivery-задачи после DOCS обязаны повторять его состав и порядок: без настройки `DELIVERY_TAIL_REQUIRED`, иначе `DELIVERY_TAIL_MISMATCH`. `release: false` запрещает delivery-задачи (`DELIVERY_TAIL`).
- DONE обычной задачи и DOCS требует роли `integration` с operation_id и source_commit; DONE delivery-задачи — `implementation`.
- `context_pack` задачи принимают plan:create, review:prepare, plan:extend и task:update; task:update заменяет его только у ещё не начатой задачи.

## Выполнение

- В main обычные задачи и DOCS не начинаются (`ORCHESTRATED_MAIN_READ_ONLY`): их выполняют исполнители через назначения в своих worktree, включая `parallel_safe: false`.
- Барьер: назначение последовательной задачи выдаётся, когда все предыдущие задачи DONE и нет незавершённых назначений; параллельная задача не обгоняет незавершённую последовательную (`ASSIGNMENT_BARRIER`). Лимит одновременных назначений — `max_workers`. Delivery-задача не назначается (`ASSIGNMENT_TASK`).
- task:start delivery-задачи в main допускается, когда все остальные задачи DONE, нет незавершённых назначений и интеграция свободна (`DELIVERY_NOT_READY`). Её коммит — однородительский implementation поверх merge-коммитов.
- Worktree без назначенных проверок (например, DOCS) не требует npm ci.
- После подтверждённого INTEGRATED Kit в той же операции удаляет worktree (`git worktree remove` без force) и влитую ветку (`git branch -d`). Отказ удаления не отменяет интеграцию: назначение получает `cleanup.status: PENDING`. `assignment:cleanup` в main удаляет оставшееся только для INTEGRATED, остальное перечисляет; `only_main: true` — остался один main. Для прежних parallel-планов worktree и ветки не удаляются.
- Если интеграция DOCS удаляет документ, указанный в context_pack с ревизией WORKTREE, общий план закрепляет ревизию коммита до слияния; recovery main не ссылается на удалённый файл. Закреплённые ревизии не меняют контракт назначения.

## Сигналы

Команды пишут запись в `<git-common-dir>/workflow-kit/signals.jsonl` без коммита, в том числе из worktree; повтор с тем же `--signal-id` или тем же содержанием не дублирует запись.

- `task:block --task ID --reason` — исполнитель не может завершить начатую задачу; задача и файлы остаются, worktree не удаляется.
- `assignment:message --id ID --text` — оркестратор отвечает исполнителю незавершённого назначения; снимает блокировку задачи.
- `plan:escalate --reason` — оркестратор не может устранить сбой; приложение ставит выполнение на паузу.

Блокировка действует, пока задача не DONE или назначение не получило ответ. `status` показывает `blocked_tasks`.

## Recovery по ролям

`recover --role orchestrator|discussion|executor` (и `--format packet`) — роль передаёт приложение:

- orchestrator и discussion — полный recovery с блоком роли; discussion не создаёт и не меняет план, документы создаёт только по просьбе пользователя в `.workflow-temp/`.
- executor — только в worktree назначения: идентичность, Workflow Core, PROTOTYPE, проектная часть AGENTS, задача и документы её context_pack; документы плана, список docs/planning, Review и решения пользователя не передаются.
- Без роли — прежний recovery. Для orchestrated-плана в main recovery показывает исполнителей, очистку и заблокированные задачи, а продолжение не предлагает task:start обычных задач.

`.workflow-temp/` входит в управляемую секцию `.gitignore`; install --update дополняет её, ручная правка секции останавливает обновление (`MODIFIED_INTEGRATION`).

## Проверки

`check-parallel-plan-fixture` — схема, DOCS, хвост, роли коммитов, context_pack во всех формах. `check-orchestrated-execution-fixture` — настоящие Git worktree: запрет main, барьер, delivery после всего, сигналы, recovery трёх ролей, удаление worktree с игнорируемым node_modules, отказ удаления заблокированного worktree и итоговая очистка, закрепление ревизии при DOCS. `check-previous-upgrade-fixture` — обновление секции `.gitignore` и остановка при её ручной правке.
