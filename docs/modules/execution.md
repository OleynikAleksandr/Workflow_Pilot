# Execution — текущая база

Исполнитель tools/codex-app-server-mcp работает через локальный Codex App Server без модельных ходов. Исходные команды, stdin, файлы, observation и terminal evidence сохраняются. Runtime пока связывается через src/mac-runtime-switch.mjs, mcp-runtime.mjs, windows-runtime.mjs и vps-tunnel.mjs; фасад выделяет T003.

Состояние: WorkflowPilotCodexExecutor; env WORKFLOW_PILOT_*; свои preferred MCP/tunnel порты 18852/18853 с исходным подбором свободного порта и проверкой владельца. macOS служба com.oleynik.WorkflowPilotCodexExecutor. Автоматическое наследование старого туннеля и retireLegacy при старте отключены. Исторические retirement helper-функции пока сохранены с fixture-тестами и не вызываются bootstrap; T003 удалит ненужную поддержку старого продукта.

VPS: alias workflow-pilot-vps, служба com.oleynik.workflow-pilot-vps, конфиг ~/.config/workflow-pilot/vps/mcp-url, кандидат loopback 18842. Это не выделенный сервером маршрут: без собственного Host/config канал показывает необходимость настройки. Донорские 17842 и служба не меняются. Серверные работы отдельно.

Тестовая Python-среда внутри .harness/runtime/test-python, без установки реальных служб. Linux adapter относится к T009.
