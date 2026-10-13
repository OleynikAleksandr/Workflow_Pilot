# Browser — текущая база

В T002 браузерные session-runtime, chatgpt-dom/composer/experience, observer и page-state сохраняют исходную логику. Публичные DOM-экспорты/pageScript совместимы с внешним Sidebar. Технические символы страниц не переименовывать как бренд.

Новый Chromium sessionData хранится в Workflow Pilot/browser, partition persist:workflow-pilot-chatgpt. В smoke профиль временный, partition непостоянный. Donor cookies не импортируются. Observer генерируется stage:page-observer и не хранится в Git. Выделение Execution/browser и host-контракта — T004; прежняя защита от повторной отправки после UNKNOWN сохраняется.
