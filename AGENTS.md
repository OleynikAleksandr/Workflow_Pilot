
<!-- workflow-kit:begin -->
# Project Workflow Kit

Получите recovery текущего проекта: `./scripts/workflow recover --format text` (Windows PowerShell/CMD: `./scripts/workflow.cmd recover --format text`). Если recovery уже доставлен клиентом, используйте его.
<!-- workflow-kit:end -->

# Правила Workflow Pilot

Рабочая папка: /Users/oleksandroliinyk/VSCODE/Workflow_Pilot. Выполнять текущий план через Workflow Kit: task:start → изменения → commit --task → проверка status. Один отчёт на завершённую микрозадачу. Файлы managed-секции и установленного Kit меняет только installer; packages/workflow-kit — исходный код продукта.

Донор /Users/oleksandroliinyk/VSCODE/Project Web Pilot заморожен. Не менять его файлы, приложение, профиль, службы и подпись; не импортировать ключи/cookies/runtime и не запускать там тесты с записью. Никакого автоматического захвата legacy-служб. Собственная identity обязательна до запуска.

Сохранять поведение 0.6.115, включая AutoPlan/Review/sequential/parallel. Новая оркестрация описана отдельно и не входит в 0.1.0. Control/Execution/Frontend выделяются по одному блоку; не создавать пустые фасады или универсальный диспетчер ради схемы. Использовать проверенные библиотеки. Внешние DOM-экспорты сохранять.

Работать самостоятельно; модельные агенты/codex exec запрещены без прямого поручения. Исключение: Claude Review через Kit, когда Review ON. Пользователь заранее подтвердил необходимые решения внутри этого плана; открытые вопросы переносить после первого GitHub Release. Серверная конфигурация VPS в текущий scope не входит.

Не управлять мышью, клавиатурой и окнами компьютера. Живые проверки выполняет пользователь. Автоматические проверки используют изолированные fixtures; не запускать команды модели. Долгие команды выполнять без &/nohup, опрашивать выданный session ID.

Поиск через rg, текстовые правки через apply_patch; не перечитывать текст после успешного патча ради подтверждения. Все документы кроме .harness/plans/todo-plan.md не более 28000 байт UTF-8. DOCS предшествует production build; полный выпуск macOS/Windows/Linux из одного sourceCommit. Отмечать фактические ограничения и pending-приёмку.
