# Форма продолжения — plan:extend

Процесс раундов задан Workflow Core. Запиши в `.harness/runtime/changes.json` только новые задачи:

```json
{"spec":"docs/planning/navigation.md","tasks":[{"id":"T002","title":"Исправить навигацию","files":["src/main.mjs"],"checks":["navigation"],"acceptance":["Enter открывает введённый адрес"]}]}
```

Вызов: `./scripts/workflow plan:extend --input .harness/runtime/changes.json --expected-revision N`, где N — свежая revision из status.

Поля задачи: обязательны title и files; необязательны id, why, checks, dependencies, acceptance, commit, verification_kind, before. `spec` находится на верхнем уровне, не внутри задачи; это существующий документ docs/planning/ или docs/modules/.

`"before":"T003"` вставляет задачу перед T003 и добавляет ей зависимость от новой. Дополнение зависимостей существующей задачи: `"dependencies":{"T004":["T002"]}` на верхнем уровне. DOCS ведёт Kit.

Уточнение контракта задачи: `task:update --task T002 --input changes.json --expected-revision N`, вход `{"checks":["navigation"],"acceptance":["Enter открывает адрес"]}`. files/checks/acceptance добавляются.

Выбор файлов для коммита: `commit --task T002 --input files.json`, вход `{"files":["src/main.mjs","package.json"]}`. Фактический состав и работу с чужими правками описывает PROTOTYPE.

Перенос незавершённой работы: `plan:carryover --input carryover.json --expected-revision N`, вход `{"scope":"old-scope","id":"new-scope","approval_note":"Прямое поручение пользователя"}`; objective необязателен. Условия закрытия и история определены Workflow Core.
