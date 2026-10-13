# Control — текущая база

T002 сохраняет donor src/workspace-session.mjs, session-plans.mjs, context-session.mjs, context-inputs.mjs и context-cache.mjs с их тестами. Проект, сессия и контекст работают по исходным контрактам; UI-связи пока находятся в main.mjs.

Проекты принадлежат WorkspaceSessions, current plan — Kit; чат не владеет планом. Смена видимого проекта не меняет cwd фоновой сессии. Формат донорских session ID сохраняется. Физическое IO ещё в исходных модулях; перенос за Execution и ControlFacade выполняется T003–T005, пустой фасад в T002 не добавляется.
