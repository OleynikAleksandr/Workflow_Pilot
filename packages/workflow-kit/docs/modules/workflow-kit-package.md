# Workflow Kit — контракт пакета

`@webpilot/workflow-kit` 1.7.2 (`packages/workflow-kit`, private, Node ≥22): один current plan на checkout/worktree, проверяемые коммиты, recovery и установка. [Назначения и интеграции](parallel-assignments.md); [доставка recovery](../../../../docs/modules/workflow-kit-recovery.md).

## Код
- `index.mjs` — `VERSION`, `WorkflowError`, `getRuntimeRoot()`, `currentPlanView`, `sessionPlanView`, пространства `actions`, `plan`, `sessionPlans`, `recovery`, `installer`. Exports: `.`, `./cli`, `./install`, `./lib/*`, `./schemas/*`, `./templates/*`, `./examples/*`, `./WORKFLOW.md`; bin `workflow`. Экспорты и lib-подпути сохраняются: их импортируют потребители.
- `src/cli.mjs` (команды), `src/install.mjs`, `src/lib/*.mjs` (модуль на подсистему; `simple-workflow` — plan:create).
- `src/WORKFLOW.md` (Workflow Core, справка), `src/templates/` (AGENTS, PLAN, SPEC, CONTINUE, STAGES, PROTOTYPE), `src/schemas/`, `src/examples/`.

## Поведение

### Источник и копии
- Единственный редактируемый исходник — `src/` (обычная задача плана); версия — `package.json` и `VERSION` в `src/lib/common.mjs`, совпадение проверяется. Версия повышается только при изменении пакета; установка в этот checkout — `install --update` в задаче плана. Третью копию исходника не создавать.
- `.harness/kit` — установленная копия, ею выполняются коммиты; вручную не правится, обновляется `install --update` отдельным шагом после проверок.
- `resources/workflow-kit` — копия `getRuntimeRoot()` от `npm run stage:workflow-kit` (pre-хуки start/test/smoke/build*), сверка файлов и SHA-256, вне Git; проверки — `scripts/check-workflow-kit-{dependency,staging}.mjs`.
- Второй потребитель подключает пакет отсюда (`file:` или `git subtree split`). Прежний репозиторий WorkflowKit — архив, не источник; его служебные файлы (`.harness`, `.codex`, AGENTS, `scripts/workflow*`) в пакет не входят.

### План и состояние
- Один checkout/worktree — один current plan `.harness/plans/todo-plan.md` (JSON workflow-state + проекция; ручная правка → PLAN_PROJECTION, исправляет repair). Новый chat продолжает его; Session ID план не выбирает. assignment:create создаёт подчинённое задание в worktree, локальное DONE требует проверенной интеграции в общий план.
- Scope: NONE (без задач, `archived_scope_id` закрытого) | ACTIVE | BLOCKED; `delivery_status`: IN_PROGRESS | READY_FOR_ACCEPTANCE; `verification_kind`: code | package | installed (два последних — delivery).
- `--session` — метаданные без действия; `--plan` ≠ текущему scope → `PLAN_NOT_CURRENT`; `plan:prepare/bind/adopt` → `COMMAND_REMOVED`. `currentPlanView(root)` → `{plan_id, plan_path, plan}`; `sessionPlanView(root, id)` — тот же план, `session_id`, `prepared: []`, `unassigned: []`.

### Команды
`./scripts/workflow <команда>` (Windows — `./scripts/workflow.cmd`), `--help` — форма. Изменяющие команды держат `<git-dir>/workflow-kit/operation.lock` (`WORKFLOW_LOCKED`; после сбоя сам не снимается). `--expected-revision` обязателен для plan:apply/extend, task:update, plan:carryover, project:rename (`EXPECTED_REVISION_REQUIRED`; расхождение — `REVISION_CHANGED`/`REVISION_CONFLICT`).
- `status`, `validate`, `recover --format text|json|packet`, `plan:view`.
- `plan:create --input` при NONE (`SCOPE_EXISTS`): `spec` (существующий файл, `SPEC_REQUIRED`), задачи, стек, checks. Функциональному scope нужны required OVERVIEW и required `docs/planning|modules/*.md` (`MODULE_CONTEXT_REQUIRED`).
- `task:start ID` — до любых правок задачи; зависимости DONE (`DEPENDENCY_PENDING`). Функциональные (не `.md`) файлы требуют профиль DEVELOPMENT (`STACK_NOT_CONFIGURED`) и проверку (`NOT_CONFIGURED`); delivery — проверку того же kind с `evidence` (`VERIFICATION_KIND`).
- `commit --task ID [--files JSON]`: без списка — изменения после task:start, кроме `.harness/` и приватных путей; прежние правки, изменённые снова, → `EXISTING_EDITS_CHANGED`; явный приватный путь → `PRIVATE_CONTEXT`, `.harness/` → `MANAGED_FILE`. Невошедшее — в `excluded_changes`.
- `plan:extend --input` (`spec`, `tasks`, `dependencies`), только ACTIVE (`SCOPE_LIFECYCLE`): DONE не меняются и не переставляются; новая задача — в конец или `before` перед ещё не начатой задачей того же вида (обычная/delivery, не DOCS), которая получает зависимость от новой; зависимость на задачу ниже → `TASK_ORDER`; ID `DOCS*` зарезервированы (`TASK_ID_CONFLICT`).
- `task:update` добавляет files/checks/acceptance; `plan:apply` не меняет статусы и DONE (`MANAGED_FIELDS`, `COMPLETED_TASK_IMMUTABLE`); `config:apply` — полный файл конфигурации.
- `project:rename --name` — имя в плане, recovery и путях hooks manifest одним коммитом kit-update; без активной задачи (`TASK_ACTIVE`), ≤ 100 символов (`PROJECT_NAME`); повтор без изменений — без коммита; папку не переименовывает.
- `repair --dry-run` → `repair_id` → `--apply` (завершить/повторить транзакцию, восстановить проекцию, отложить DOCS) или `--cancel` (отменить неподтверждённую подготовку). Журнал вручную не удалять.

### Опциональный Review
`lib/plan-review` и `lib/claude-review`: prepare/run/respond/status/acknowledge/resolve/cancel/publish, gate новых plan:create/scope:create при ON, очистка на task:start. Политика и цикл — один `.harness/runtime/plan-review/state.json`; по умолчанию OFF без зависимости от Claude. Долгий процесс запускается вне operation.lock. Recovery содержит политику, получателя, стадию и инструкции сохранения позиции, не отзывы.

Prepare требует явного получателя либо manual; respond сохраняет позицию каждого успешного отзыва, включая approved. Gate проверяет пару, позиции и согласие либо явное resolve publish. Решения остаются в spec/критериях, пользовательское разрешение — в user_decisions. OFF возвращает обычный путь. Входы, ошибки и исключения — [Review](../../../../docs/modules/plan-review.md).

### Коммит и Git
- Каждый коммит — транзакция Kit (`<git-dir>/workflow-kit/transaction.json`) с trailers `Workflow-Scope`, `Workflow-Task`, `Workflow-Role`, `Workflow-Transaction`, у implementation — `Workflow-Iteration` (нет — 1). Коммит без журнала → `MANAGED_COMMIT_REQUIRED`; hooks не обходить, `--no-verify` запрещён.
- pre-commit (`validateStaged`) до тестов сверяет index с кандидатом, размер документов и пути служебной роли (`SERVICE_SCOPE`; archive, carryover, repair — только план).
- Отказ проверки → `COMMIT_FAILED`: план и index возвращаются, правки остаются, повторяется названная команда; при чужом вмешательстве журнал остаётся для `repair`.
- `resolveReferences`: у задачи один коммит нужной iteration, один родитель, файлы в пределах задачи, коммиты зависимостей — предки (`AMBIGUOUS_COMMIT`, `HISTORY_NOT_LINEAR`, `PLAN_COMMIT_MISMATCH`, `COMMIT_SCOPE_MISMATCH`, `DEPENDENCY_ORDER`).
- Git вызывается с `-c diff.autoRefreshIndex=false`, иначе `git diff` переписывает stat-cache index и меняет отпечаток кандидата. Изменение файла подтверждается `git hash-object`, иначе index, обновлённый Git другой среды (VM), делает изменёнными все файлы и даёт ложный `PRIVATE_CONTEXT`.
- Приватные пути (сегменты `.env`, `auth`, `credentials`, `secret(s)` с расширением или без, `id_rsa`, `id_ed25519`, `node_modules`, `.codex`, `.git`; `*.pem|key|p12`; `.harness/runtime/`) в контекст и автоматический выбор не входят.

### DOCS, delivery и раунды
- Решение пользователя: build/package/sign/notarize/release/publish (и публикация исходников) — только в явно названной delivery-задаче.
- DOCS (`DOCS`, `DOCS-2`, …; «Актуализация всех документов проекта») Kit создаёт, только когда в незавершённом хвосте есть delivery. Порядок: работа → DOCS → delivery; DOCS включает OVERVIEW, без функциональных файлов, зависит от обычной работы раунда, delivery — от DOCS своего раунда (`DOCUMENTATION_FINAL_TASK`).
- Новый раунд с выпуском получает `DOCS-N` с `commit_ref.iteration = N`; завершённые DOCS и delivery не переоткрываются и сохраняют зависимости; опубликованный тег не переиспользуется. Правка без выпуска добавляется без DOCS.
- Задачи, добавленные во время активной DOCS, откладывают её; её незакоммиченные документы переходят первой выполнимой новой задаче.
- Все DONE → READY_FOR_ACCEPTANCE, не закрытие; новое поручение до архивирования — `plan:extend`. Задачи после последнего выпуска recovery показывает блоком «ИЗМЕНЕНИЯ ПОСЛЕ ВЫПУСКА».
- pre-push: незавершённая транзакция → `TRANSACTION_PENDING`; последняя DOCS не-NONE плана не DONE → `DOCS_BEFORE_PUSH` (иначе результат уходит раньше документации); required-проверки `stage: push` → `PUSH_CHECK_FAILED`. План без DOCS и NONE push не блокируют.

### Документы и docs:commit
- Единственный норматив размера — `budget.document_bytes` (по умолчанию 28000 байт UTF-8): документы агента, README, любой изменённый `.md`/`.markdown` (и Kit) и каждая часть recovery с оформлением. Основание: 30000 байт плотного русского текста читались целиком, при 40000 вывод ChatGPT терял середину; `exec_command` режет после 32000 байт. Не читается за вызов — пользователь понижает значение.
- Проверяется blob из index для всех ролей, кроме точного `.harness/plans/todo-plan.md`. Превышение → `DOCUMENT_TOO_LARGE` (путь, байты, предел, команда повтора), правки сохраняются, документ делят по содержанию. Удалённый или нетронутый большой документ не блокирует; при первой правке его делят. Код не ограничивается.
- `docs:commit --files '[…]' --message "…"`: `.md` вне `.harness/` (`DOCUMENTATION_PATHS`) при NONE или ACTIVE без текущей задачи (`TASK_ACTIVE`); проверяются схема, состав, размер, транзакция, suite приложения не запускается. Kit-секция `AGENTS.md`/`AGENTS.override.md` в index побайтно = HEAD (`MODIFIED_INTEGRATION`); её меняет только установщик.

### Закрытие плана
- `archive --scope ID --approval-note "…"` — только по прямому поручению пользователя, означающему приёмку (`USER_CLOSE_REQUIRED`); все задачи DONE (`SCOPE_UNFINISHED`), чистое дерево (`DIRTY_WORKTREE`). Остаётся NONE-план с `archived_scope_id`; закрытый — `git show <closing-SHA>^:.harness/plans/todo-plan.md`. Архивных копий нет.
- `plan:carryover --input {scope, id, approval_note[, objective]}` — по отдельному поручению (`USER_CLOSE_REQUIRED`), чистое дерево, без активной задачи: незавершённые задачи (критерии, проверки, context_pack, взаимные зависимости) — новый current plan с `carryover.source_commit` прежнего; один коммит, повтор после успеха безопасен.

### Recovery
Сборщик детерминированно читает источники; модели и пересказов нет.
- Состав: идентичность (проект, scope, worktree, plan, HEAD) → Workflow Core → PROTOTYPE → проектная часть `AGENTS.override.md`/`AGENTS.md` без Kit-секции → факты среды → «ФОРМЫ ПО ЗАПРОСУ» → цель, решения пользователя → все задачи → изменения после выпуска → прошлый план (NONE) → `docs/planning` (путь, заголовок, байты) → required-документы → пути изменений и посторонних правок → транзакция → evidence → продолжение → полнота. В строке полноты «Включено» `AGENTS.md` указывается, только если его проектная часть непуста и передана.
- Карточка задачи: заголовок, зачем, статусы, зависимости, критерии, SHA и `git show`, файлы с точными добавлениями/исключениями, проверки. JSON плана и тексты diff не передаются: коммиты и диффы агент читает по ссылкам.
- NONE: `archived_scope_id`, коммит закрытия (подтверждён trailers, `CONTEXT_ARCHIVE`), строки «id — заголовок — статусы — SHA», ссылки на его спецификации на ревизии родителя закрытия; проект без прошлого плана — норма.
- Формы PLAN/SPEC, CONTINUE, STAGES — через `plan:create`/`plan:extend`/`task:start --help`, не в пакете: ChatGPT показывает модели около 10000 токенов одного результата инструмента.
- Evidence — только текущей транзакции или коммитов плана; отсутствие evidence ≠ PASSED.

#### Документы контекста
- `context_pack.documents` плана и текущей (иначе следующей) задачи: `{path, required, revision}`; revision — `WORKTREE` (по умолчанию) или точный SHA коммита (blob из Git с проверкой пути, типа и UTF-8). Дедупликация по (path, revision), required побеждает. `heading_path` принимается, документ передаётся целиком. Устаревшее `dependency_task_ids` принимается, диффы не добавляет.
- required — целиком; optional — проверяемая ссылка. `docs/MODULES.md` и `docs/DOCUMENTATION_INDEX.md` — всегда ссылкой с ревизией и размером (`LEGACY_REFERENCE_ONLY`). Нет required-файла или blob → `MISSING_FILE`/`CONTEXT_REVISION`.
- Kit добавляет required OVERVIEW в каждый план (NONE без него → `PROJECT_CONTEXT_REQUIRED`); README в обязательный набор не входит.
- Операция, удаляющая required WORKTREE-документ, проверяет его blob в `before_head` и тем же коммитом закрепляет ссылки на эту ревизию; нет blob (создан и удалён без коммита) или удаление вне выбранных файлов → `MISSING_FILE` без изменения плана и index.

#### Части и пределы
- Документы и задачи целы, пока помещаются; большая единица делится: заголовок → абзац → строка → символ UTF-8, без потерь и повторов. Документ больше предела помечается «разделить при следующей правке» и recovery не блокирует.
- Часть (`WORKFLOW RECOVERY — часть i/n`, фрагменты `--- ИСТОЧНИК: <источник> @ <ревизия> / k/m ---`) ≤ `document_bytes`. Пакет ≤ min(`hard_bytes`, 180000) байт и ≤ 7 частей, иначе `CONTEXT_TOO_LARGE` с 12 крупнейшими источниками, без усечения. 7 — отдельный предел проверенного транспорта: восьмая часть отклоняется и ниже 180000 байт.
- `parts[]`: `index`, `total`, `text`, `bytes`, `characters`, `sha256`, `sources[]` (`source`, `revision`, `part`, `total`, точный `content`); сцепление фрагментов восстанавливает текст. Псевдотокенов нет.

#### Фасад и свежесть
- `recover(root)` — пакет `completeness: COMPLETE` или ошибка; `contextPacket(root)` (`recover --format packet`): `inline-context-v1`, `context`, `context_bytes`, `context_sha256`, `parts`, `size`, `budget`, `head`, `facts`.
- Сборка сверяет HEAD, план, конфигурацию, журнал и ключ входов до и после: первое расхождение — повтор, второе — `CONCURRENT_CHANGE`.
- `inspectionInputs(root).key` — хеш содержимого (не времени) плана, конфигурации, manifest с его файлами, hooks, README/AGENTS/OVERVIEW, `docs/planning`, документов и файлов задач, `.harness/kit`, runtime, index, refs, `git status`; node/git — по identity, размеру и времени. Повторная правка dirty-файла задачи меняет ключ; посторонние файлы — только путь и статус. Legacy-планы в ключ не входят; большой current plan → `CONTEXT_TOO_LARGE`.
- SessionStart hook отдаёт тот же текст с `DELIVERY-MARKER`, `hook:ack` отмечает получение; `auto_compact_status` всегда AUTO_COMPACT_UNVERIFIED.

### Установка и обновление
- `install --project <abs> [--mode new] [--dry-run]`: new — пустая папка (`FOLDER_NOT_EMPTY`); без Git — `git init -b main`. Создаёт `.harness/kit/**`, `scripts/workflow{,.mjs,.cmd}`, `.harness/workflow.json` (`document_bytes` 28000, `hard_bytes` 180000), NONE-план, Kit-секцию AGENTS, README и OVERVIEW при отсутствии, секции `.gitignore`/`.gitattributes`, SessionStart в `.codex/hooks.json`, git hooks, manifest. Занятые пути не перезаписываются (`INSTALL_CONFLICT`); `--expected-fingerprint` → `PREVIEW_CHANGED`. Нет автора Git (задаётся `--git-name`/`--git-email`) или есть исходные изменения — коммит ждёт `install:commit`. Та же версия — reconnect (hooks, runtime).
- Runtime: macOS/Linux — Node ≥ 22 из `/opt/homebrew/bin` или `/usr/local/bin`, иначе копия в `.harness/runtime/node`; Windows — `.harness/runtime/node.exe`, MinGit из `WORKFLOW_GIT_HOME` в `.harness/runtime/git` (иначе системный Git).
- install --update поддерживает upgradeFrom: 1.1.0–1.3.0, 1.4.0–1.4.13, 1.5.0–1.5.6, 1.6.0–1.6.4, 1.7.0–1.7.1. Неизвестная версия/изменённый owned-файл → UNSUPPORTED_MIGRATION. До записи проверяет plan, Git, identity, index и пути; активное назначение/интеграция запрещает upgrade. Backup — .harness/runtime/kit-upgrade-<id>/. Legacy tracked-пути удаляются только при равенстве HEAD/index/worktree; NONE получает required OVERVIEW. Один kit-update сохраняет активный план. [Контракт](parallel-assignments.md).
- Упразднённые документы и индекс установщик не восстанавливает (миграция документации — отдельная работа); `soft_tokens`/`hard_tokens` принимаются, но не ограничивают.
- `inspect`, `doctor` ничего не меняют; `remove --dry-run` → `--apply <remove_id>` — только при NONE без транзакции (`ACTIVE_SCOPE`), изменённое сохраняется.

### Потребители
`getRuntimeRoot()` — самодостаточный `src/`, потребитель копирует его. Web Pilot: worker подготовки — `installer` (`inspectWithDiagnostics`, `install`, `upgradeFrom`), `inspection-inputs`, `common`, `installation-files`, `git`; Доктор проекта — `installation-files`, `common`, `git`, `plan`, `validate`, `transaction`; recovery — CLI проекта (`recover --format packet`), кеш по ключу входов.

## Решения и запреты
Одно правило — один источник: Workflow Core — процесс; PROTOTYPE — выполнение задачи; Kit-секция AGENTS — recovery; проектная часть AGENTS — ограничения; Web Pilot — транспорт. PLAN/PROTOTYPE/WORKFLOW требуют смысловой декомпозиции по результатам, зависимостям, контрактам, пересечениям, риску, проверкам и цене координации, без норм строк/файлов/задач. Финальное поручение основной сессии завершает Kit-интеграции и проверку main, не архивирует план и не останавливает предпросмотр. Долгую команду продолжают по её session ID; отдельный фон не заменяет чтение результата. Общий timeout commit/integration — максимум 10 минут и суммы timeout_ms проверок + 60 с; лимит каждой проверки сохраняется.

Не возвращать:
- выбор плана по chat/session, `plan:prepare/bind/adopt`, реестр, базу или облачное хранилище планов, session-router, второй формат recovery, слияние legacy-планов;
- архивные копии планов, DOCS без выпуска, файл-пересказ recovery или TODO рядом с current plan;
- диффы зависимостей в recovery, выбор раздела по `heading_path`, формы в стартовом пакете, псевдотокены и символьные нормативы;
- закреплённые версию, число файлов и SHA Kit в скриптах приложения; публикацию в npm, registry, daemon, БД, WebSocket, update service;
- модельный классификатор, модельный API, обязательные кнопки режимов.

## Проверки
- `kit-check` (`npm run check --prefix packages/workflow-kit`): `check-package` (identity, exports, версия, состав `npm pack`), `check-consumer-contract` (`file:`/tarball без исходника, runtime = `src`), `check-runtime-fixture` (установка, recovery, rename, DOCS-N, pre-push, `before`, legacy-миграция, синтетическая 1.4.13) с `check-document-fixture` (28000/28001, index ≠ worktree, роли, docs:commit) и `check-project-recovery-fixture` (копия Web Pilot с исходниками Kit до/после нормализации: ≤ 144000 байт — запас ≥ 20% без сокращения плана, повышения бюджета и потери обязательного контекста — и ≤ 7 частей, задачи целы), `check-carryover-fixture`, `check-plan-review-fixture` (публикация, CLI, OFF, очистка).
- unit-all: tests/workflow-kit-{recovery,source,upgrade}.test.mjs; upgrade с реальных 1.5.6 и 1.6.4: task:start → kit-update → commit новым runtime → следующая задача. kit-check также включает check-parallel-execution-fixture с Git worktree, npm-зависимостью и конфликтом. Проверки взаимно не заменяются.
- Пользователь: живой ChatGPT, native Windows (`workflow.cmd`, PowerShell-hook, MinGit); fixtures на Mac их не заменяют, для 1.6.x не подтверждены.

## Открыто
- Поддержка upgradeFrom шире динамического покрытия: проверены синтетическая 1.4.13, выпущенные 1.5.6/1.6.4, Review 1.6.3 и parallel handoff после обновления выпущенной 1.7.0.
- Hot-swap bridge Web Pilot ↔ Kit — только операции current plan, без session-маршрутизации; не реализован.
- Не поручено: удалить разовую проверку `workflow-kit-archive` из `.harness/workflow.json`.
