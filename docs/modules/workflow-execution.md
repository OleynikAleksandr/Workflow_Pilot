# Workflow execution — текущая база

AutoPlan, Review и parallel coordinator перенесены без изменения продуктового алгоритма. Новый профиль не наследует сохранённые пользовательские настройки донора. Одна current plan на checkout/worktree, исходная адресация review recipient и execution origin сохраняется.

Новые worktree и quarantine используют .workflow-pilot-worktrees и .workflow-pilot-delete-. Донорские проекты открываются по исходному формату Kit; перенос регистра локальных проектов не выполняется. Два приложения не должны исполнять один план одновременно.

packages/workflow-kit остаётся базовой 1.7.2; resources/workflow-kit генерируется staging. Installed .harness/kit нового проекта не заменён копированием. Перенос coordinator — T006, устранение циклов Kit и compatibility fixture — T007. Будущая оркестрация описана в ../planning/orchestrated-execution-next.md и сейчас не включается.
