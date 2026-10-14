# Приёмка архитектурного переноса 0.1.0

T011 завершена 13.10.2026 на коммите `1f734caff5144f97fe7ebd4b0ff46f30db660402`. Ниже сохранены фактические результаты её девяти gates, сверенные с evidence Kit перед DOCS. Файл `git rev-parse --git-path workflow-kit/last-verification.json` содержит последнюю операцию и впоследствии заменяется; он не является вечной ссылкой на T011. Это автоматическая проверка нового проекта, не native-приёмка трёх ОС. Последующий комплект 0.1.0 собран; актуальные факты сборки и подписи находятся в manifest, установка и публикация подтверждаются отдельными delivery-задачами.

14.10.2026 пользователь подтвердил в установленной 0.1.1 исправленный вход, подключение собственного туннеля/MCP, создание проекта и получение контекста агентом. Это не полная приёмка AutoPlan/Review/restart. Проверки Windows/Linux отложены: Ubuntu x64 в UTM на Apple Silicon оказалась слишком медленной для практического теста приложения.

Плагин T017 для 0.1.2 прошёл 834 теста (1 skipped), скрытый Electron smoke и архитектурную проверку на `8340a77c8f0c9ca4996669fc5f101a7ed4bfa92d`. Реальный FastMCP с изолированным Control проверяет контекст и привязку; Electron проверяет внешний сеанс без браузера/AutoPlan. Живая [матрица ChatGPT Desktop/Chat/Work/Codex](../modules/chatgpt-plugin.md) остаётся pending.

| Проверка T011 | Результат |
| --- | --- |
| unit-all | PASS: 820 успешно, 0 ошибок, 1 пропуск |
| electron-smoke | PASS: скрытые изолированные Electron fixtures |
| kit-check | PASS: все пакетные и lifecycle fixtures |
| executor-channel | PASS: 21 тест, без пропусков и модельных ходов |
| codex-tools-live | PASS: версия и закреплённые определения инструментов |
| architecture | PASS: 183 модуля / 708 зависимостей, 0 нарушений и циклов |
| migration-compatibility | PASS: 4 теста формата 1.7.2 |
| linux-platform | PASS: 11 fixtures на Mac, не native Linux |
| release-tooling | PASS: 23 теста, не production-сборка |

## Матрица сценариев

Файлы ниже находятся в tests/. Автоматическая часть всех строк — PASS по соответствующим gates T011; fixture не доказывает работу пользовательского аккаунта или VM.

| Сценарий | Автоматическое доказательство | Ручная часть |
| --- | --- | --- |
| Проект → Chat/Work → recovery → ответ | control-facade, context-session, session-runtime, chatgpt-composer; electron-smoke с настоящим Chromium и локальной страницей | Mac: проект и контекст 0.1.1 подтверждены; оба режима отдельно pending |
| Прежний чат, выбор другого проекта, cwd скрытой сессии, full-context once | conversation-recovery, workspace-session, context-session, session-opening-performance; smoke | Mac pending |
| AutoPlan ON/OFF, sequential/parallel, Stop/draft/UNKNOWN | auto-plan, project-auto-plan, parallel-execution, automation-send-state; smoke | Mac pending |
| Источник ready ≠ merge safe, writer, diagnostic, последовательная интеграция и final handoff once | parallel-finalization, parallel-execution-recovery, command-activity; реальные Git/Kit и изолированный HTTP writer в smoke | Mac pending |
| Review ON/OFF, recipient отдельно от origin, restart/no duplicate | plan-review, control-facade, settings-parallel-execution; kit-check | Mac pending |
| Команды/stdin/сервер, Stop/restart, terminal evidence и UNKNOWN | codex-app-server-mcp, execution-facade, command-activity; executor-channel | Mac, Windows/Linux native pending |
| Архив/удаление/Доктор, ребёнок/родитель/сосед, old boot/пропавший исполнитель | workspace-deletion, project-state-cleanup, project-doctor, command-activity; smoke | Mac pending |
| Проекты донора 1.7.2 NONE/ACTIVE/частично DONE | migration-compatibility, workflow-kit-upgrade и kit-check: identity/история/recovery; отказ чужой операции/незавершённой транзакции/неизвестной версии | Отдельная копия старого проекта pending |
| Два приложения, свои профили/службы, оба канала и занятые порты | product-identity, mac-runtime-switch, windows-runtime, vps-tunnel, codex-app-server-mcp, linux-runtime | Сосуществование native pending; собственный VPS setup-required |
| Первый запуск, повтор после ошибки, секреты, адрес/ID/коннектор | startup-readiness, startup-platform, startup-ui, tunnel-id-runtime, desktop-boundaries, linux-startup; smoke | Mac 0.1.1: вход и собственный туннель/MCP подтверждены; clean-install pending |
| Frontend/Control/Execution, IPC, освобождение подписок | execution-architecture, desktop-boundaries, control-facade, page-state; dependency-cruiser | Одно видимое окно проверяет пользователь |
| Linux XDG/права/регистр/Unicode/пробелы, process groups/systemd/X11 | linux-runtime, linux-startup; Python fixtures, ELF/payload digests без запуска Linux на Mac | Ubuntu 24.04 x64 X11 VM pending; Wayland unsupported |
| Три пакета, sourceCommit/manifest/assets, preload/HTML/workers/observer/Kit | release-all, release-mac, release-linux, sign-mac-bundle, windows-runtime; ASAR/архивные fixtures, исполняемые биты и rollback | T012 production; T013 установка; clean-install pending |
| Каталог инструментов и закреплённые определения Codex | executor-channel, codex-tools-live | Без модельных ходов; не подтверждает аккаунт ChatGPT |

Имена тестов в таблице означают *.test.mjs, кроме electron-smoke.mjs. Точное соответствие donor F01–F20/A01–A06 именованным regression cases проверяет parallel-execution-ui.test.mjs. Эти сценарии сохранены; отложенные исправления 0.6.113/114 и новая оркестрация не включены.

## Удалённые мосты и проверенные входы

Удалён 41 корневой re-export: их scripts/tests, включая динамический restart fixture, используют владельцев Control/Execution/contracts. В корне src остаются main и три публичных chatgpt-dom/composer/experience входа для внешнего Sidebar. Изменений внешнего Sidebar нет.

Удалён resources/runtime-control/windows-control.py, устаревший тест его автозапуска и его две проверки lifecycle. Текущие registry/autostart, stale PID/порт и отсутствие захвата донора проверяет codex-app-server-mcp.test.mjs и windows-runtime.test.mjs. Пакет явно отвергает старый lifecycle-файл. Отказы retireLegacy и совместимость форматов проектов сохранены.

Неиспользуемый installed-observer-fixture.cjs не имел вызывающего входа; действующие page-state/electron-smoke проверяют реальный observer, а release fixtures — его размещение. Удалён release-linux.mjs, дублировавший архивирование: единая production-матрица release-all использует release-archive, те же функции проверяет release-linux.test.mjs.

Перед удалением просмотрены tracked references, динамические import/path.join/new URL, npm/packager и ресурсы. Сохранены Desktop application/--smoke, preload обоих окон, HTML, staged observer, автономные workspace/doctor workers и внешние DOM/pageScript. Dependency-cruiser проверяет все исходники src, Kit, scripts, resources; исключены только generated observer и штатные копии Kit, отдельно проверяемые staging/package gates. Исключений циклов нет; доступ Frontend к Execution разрешён только конкретному bootstrap.

## Первая проверка на Mac — выполняет пользователь

До готового пакета можно запустить npm start из нового проекта; после T013 — собственный Workflow Pilot.app. Используйте отдельную тестовую папку с пробелами/кириллицей; реальные проекты донора не изменяйте.

1. Откройте приложение: одно окно, мастер и ChatGPT. Войдите самостоятельно. Подготовьте собственный Secure MCP Tunnel и коннектор; VPS без своего маршрута должен показывать необходимость настройки.
2. Создайте тестовый проект, Chat и Work. Отправьте стартовый контекст и получите ответ. Откройте прежний чат: полный контекст не отправляется второй раз.
3. Создайте второй проект, переключайтесь между ними и перезапустите приложение. Проверьте принадлежность чатов, сохранённую папку фонового исполнителя и настройки.
4. На небольшом тестовом плане проверьте AutoPlan/Review ON/OFF, sequential и parallel с двумя независимыми задачами. Stop и ручной черновик должны блокировать автоматическую отправку; итог возвращается один раз.
5. В тестовом проекте проверьте короткую команду, сервер, stdin и адресный Stop. После restart незавершённое/UNKNOWN не должно автоматически исчезнуть или повториться.
6. Откройте Доктор, архивируйте/восстановите сессию и удалите тестовый проект. Соседний проект и донор должны остаться нетронутыми. Старый проект проверяйте только на отдельной копии, без активной работы донора.

Для отчёта достаточно шага, ожидаемого/фактического результата и снимка без секретов. Windows x64 UTM, Ubuntu x64 X11 UTM и clean-install проходят позднее отдельно; эмуляцию на ARM указывать явно. Native/VM/clean остаются pending до пользовательских результатов.
