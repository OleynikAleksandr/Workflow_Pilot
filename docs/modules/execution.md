# Execution: команды, файлы и службы

## Ответственность и потребители

Execution не владеет проектом, current plan, привязкой чата, Review или выполнением плана. Он выполняет физические операции и возвращает подтверждённый результат. Подготовка recovery осталась в SessionPlans/вызывающем слое; runtime больше не принимает sessionPlans и не имеет loadContext.

`src/execution/facade.mjs` — граница физических операций для Control. Bootstrap создаёт один ExecutionFacade, передаёт executeFile/files в WorkspaceSetup и SessionPlans и присоединяет выбранный runtime. ParallelKit использует тот же исполнитель SessionPlans. Создание/открытие проекта, context worker, настройки, проверка/выбор канала через прежние IPC теперь используют эти операции. Пользовательская семантика выполнения планов, Review и sequential/parallel не меняется.

| Реализация | Владелец |
| --- | --- |
| commands/service.mjs | transient desktop workers, stdin, process groups, результаты |
| files/adapter.mjs | чтение/запись JSON/текста, canonical path, digest, existence |
| runtime/service.mjs | подготовка Codex runtime, локальная готовность, выбор канала, login services |
| runtime/mcp-client.mjs | initialize/tools-list собственного MCP; вызовы инструментов здесь запрещены |
| runtime/windows.mjs | проверенный vendor payload, private Python, bundled Git |
| runtime/vps.mjs, vps-config.mjs | только свой SSH forward, явный маршрут и проверка владельца |
| platform/paths.mjs | пути/Node discovery для выбранной платформы |
| tools/codex-app-server-mcp | Python-исполнитель команд модели через Codex App Server, без модельных ходов |

Классы runtime сохранили исторические имена CodexAppServerRuntime, MacSelectedRuntime и MacRuntimeSwitcher для совместимости. Временные корневые runtime/platform/mcp/tunnel/ZIP мосты удалены; потребители используют текущие модули. [Linux runtime](linux.md) и screen/window adapter реализованы; [browser/session-runtime](browser.md) владеет техническими страницами.

## Контракт команд и файлов

Facade предоставляет конкретные методы, без универсального диспетчера:
- runCommand(file, args, options) → snapshot с operationId; writeCommandInput(id, text, {end}); waitCommand(id, yieldMs); stopCommand(id); commandSnapshot(id).
- executeFile(file, args, options, input?) — совместимость worker-вызовов: ждёт terminal result, возвращает stdout/stderr/operationId/outcome либо ошибку с теми же evidence. input идёт только в pipe и не хранится в records/argv/env.
- readText/readJson/writeJson/canonicalPath — абсолютные пути; ошибки FS сохраняют коды. writeJson создаёт private файл через временный файл и rename; exclusive:true использует wx. Временный файл удаляется в finally.
- ensureServices/inspectServices/startMcpOnly/selectChannel — операции выбранного runtime. lastStatus — копия, а не изменяемый внутренний объект.

Команда получает уникальный ID экземпляра; stdin и stop не принимают PID и не переназначают чужие операции. Состояния: running, success, error, cancel, UNKNOWN. success подтверждён exit 0, error — отказом запуска/завершения; cancel — запросом отмены и terminal evidence. Незнакомый/вытесненный из истории ID даёт UNKNOWN с exitCode:null, не успех. Для stdin/stop неизвестного ID — EXECUTION_SESSION_UNKNOWN; нет активного writable pipe — EXECUTION_STDIN_CLOSED. Ошибки ID/пути/владельца имеют отдельные коды.

CommandService использует Node spawn: на POSIX отдельная группа, на Windows остановка своей process tree через taskkill. После TERM действует ограниченное ожидание до KILL; snapshot остаётся running, пока close не подтвердит исход. stdout/stderr ограничены maxBuffer, ожидание одного опроса — 0..60000 мс. Хранятся до 128 завершённых snapshots; активные не вытесняются. Потерянное доказательство не восстанавливается по одному PID.

Execution живёт в [backend](backend.md): закрытие или падение клиента его не затрагивает. Остановка backend после draining (dispose модели) запрещает новые команды, останавливает собственных transient workers и освобождает таймеры. Login MCP/tunnel/VPS службы ни от закрытия окна, ни от остановки backend не останавливаются. Python AppServerClient отдельно владеет MCP-командами и их session IDs/process identity/terminal evidence; JS не заводит второй реестр этих процессов. Каталог/аргументы/ошибки MCP и codex-tools.lock.json сохранены. JS Execution не импортирует Control/Frontend/Kit; Python остаётся автономным tools-пакетом.

## Identity и подготовка

Свои state: WorkflowPilotCodexExecutor, env WORKFLOW_PILOT_*, MCP/tunnel preferred порты 18852/18853 с проверкой владельца и исходным подбором свободного порта. macOS label com.oleynik.WorkflowPilotCodexExecutor; Windows — собственный Run entry. Перед копированием/управлением runtime отвергаются symlink state/source/runtime/private. Новый продукт не принимает retireLegacy; совместимые retirement exports только возвращают LEGACY_RUNTIME_FORBIDDEN. adopt_legacy_tunnel всегда False без чтения ключей.

macOS tunnel-client закреплён на v0.0.14, официальный GitHub tag и SHA256SUMS проверяются перед распаковкой; поиска latest и копирования чужого PATH/runtime нет. Проверены Darwin arm64 и amd64 assets. Основной arm64 ZIP: SHA-256 b540493c5bdbcdbb755700c8e2e16597e28b1569e425007e0f73111047bd6a64. Windows vendor asset/digest прежние, извлекаются только vendor tools. Поставка notices и locks описана в [контракте выпуска](release.md); версии и SHA Linux закреплены в src/execution/platform/linux/toolchain.mjs.

## VPS: явная локальная настройка

Новый маршрут на сервере должен быть подготовлен отдельно в vps-server. Эта задача сервер, SSH keys и работающий донорский канал не меняет. После подготовки локально задаются:

`~/.config/workflow-pilot/vps/route.json`:
```json
{"schema_version":1,"product":"workflow-pilot","ssh_host":"workflow-pilot-vps","remote_port":18842}
```

18842 — кандидат, не доказательство выделенного сервером маршрута. Alias может иметь суффикс workflow-pilot-vps-…; он должен существовать в ~/.ssh/config без RemoteForward. Серверный endpoint записывается отдельно в `~/.config/workflow-pilot/vps/mcp-url` (HTTPS /mcp/<secret>/mcp, права 0600). URL маскируется в состоянии; полный адрес доступен только прежней операции копирования. Python использует тот же route.json; WORKFLOW_PILOT_VPS_CONFIG допустим для изолированного окружения.

Без route.json — setup-required и никаких запусков. Чужой product/alias, порт 17842, недопустимый порт — VPS_ROUTE_INVALID. Отсутствующий alias или RemoteForward не захватываются. Forward всегда 127.0.0.1:<remote_port> → 127.0.0.1:<actual_mcp_port>. macOS проверяет собственный label/argv старого plist до замены/bootout; чужая служба даёт VPS_OWNER_CONFLICT. Windows проверяет process identity и сохраняет route в owned service record. ready требует живого SSH, правильного маршрута/порта и корректного connector URL.

Secure Tunnel и VPS остаются переключаемыми. Ошибка VPS не ломает Secure Tunnel; переключение на неподготовленный VPS отклоняется. Никаких догадок об общем 17842 или перенастройки сервера.

Плагин использует execution/plugin/bridge.mjs для классифицированных действий MCP-моста и communication-store.mjs для WAL/контекста с fsync/hash. Execution не назначает роли, не читает Kit и не решает, когда продолжать план: это Control. Observer и журнал команд дают ему готовность адресата. Рабочие уведомления отправляет SDK, DOM сохраняет первый bootstrap и прежние маршруты. Корреляция block_id, продолжение и парковка блокировки при паузе принадлежат [Control/Kit](orchestrated-execution.md).

## Проверки и границы

`npm run check:architecture` использует dependency-cruiser 18.6.0 (официальные правила: https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md). Проверяются Execution→product, Control→Frontend/Electron, доступ к Execution через facade, leaf contracts, разрешимость импортов и новые циклы. Отдельный fixture намеренно вводит запрещённый импорт и цикл и требует отказа анализатора.

Точка композиции продукта — backend (`src/backend/main.mjs` с `bootstrap.mjs` и моделью Desktop); `frontend/desktop/bootstrap.mjs` собирает ту же композицию только для in-process smoke; main лишь выбирает режим запуска. Циклы запрещены во всём графе без исключений. Generated resources/workflow-kit, observer и установленный .harness/kit не анализируются повторно: проверяются canonical источники, staging и фактический состав пакетов. Удалённый legacy Windows lifecycle-файл в пакете запрещён.

Гейты: unit-all, executor-channel, architecture. Дополнительно Electron smoke проверяет прежние IPC/project→session→context после переключения потребителей. Новые тесты проверяют stdin/точный ID/cancel/UNKNOWN, private IO, runtime symlink, явный VPS route/конфликт и отсутствие вмешательства в донора. Все fixtures изолированы; Python-среда .harness/runtime/test-python, без реальных служб/модельных вызовов. Живые UI/Windows/Linux проверки выполняет пользователь отдельно.
