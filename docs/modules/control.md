# Control — проекты, сессии и контекст

Bootstrap создаёт ControlFacade с Execution, однократно вызывает configureProjects/attachSessions/configureWorkflow. Повтор отклоняется CONTROL_ALREADY_CONFIGURED, CONTROL_SESSIONS_ALREADY_ATTACHED или CONTROL_WORKFLOW_ALREADY_CONFIGURED. Desktop использует явные операции фасада; внутренние data, mutationTail, tickets, Map не доступны.

ProjectsService владеет WorkspaceSessions и очередью записи. select/newSession/bindChat/snapshot/whenIdle предоставляют операции и отделённые снимки. Setup.preview возвращает token, apply перепроверяет входы. Doctor, readiness, deletion и lifecycle находятся в Control/projects. Проекты и логические сессии принадлежат Control; один current plan checkout принадлежит Kit. SessionPlans вызывает установленный Kit; ContextService проверяет recovery и кеширует по актуальным входам. Отдельного плана чата нет.

Ключ сессии включает workspace/sessionId/assignmentId/taskId. Scoped store отклоняет чужой адрес; смена видимого проекта не меняет фонового владельца. Контекст отправляется однократно, UNKNOWN запрещает автоматический повтор; restart сохраняет привязки. Исходы Send — в [Browser](browser.md).

Control не импортирует Electron, fs, child_process. IO проходит через ExecutionFacade/FileAdapter; страницы, Send и подписки — Execution/browser. Control/sessions/service владеет ContextSession, ConversationRecovery, таймером и ручной привязкой. Desktop предоставляет presentation/browser host. AutoPlan/Review/parallel — Control/workflow, настройки — Control/settings, onboarding — Control/startup. Architecture gate запрещает обход фасадов и циклы; attachSessions — внутренний порт, не публичный IPC.

createPlugin использует тот же ProjectsService через приватный Execution-мост существующего MCP. Внешняя сессия хранит хеш идентификатора разговора, не запускает браузер и AutoPlan. Контракт и ограничения — [плагин ChatGPT](chatgpt-plugin.md).

control-facade.test проверяет владение, restart, detached snapshots, UNKNOWN и откат записи. chatgpt-plugin.test проверяет UI→MCP→Control. Electron smoke проходит реальные IPC на изолированных fixtures, включая удаление и внешнюю сессию. Живую приёмку выполняет пользователь.
