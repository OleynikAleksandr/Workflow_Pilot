# Workflow Pilot

Настольное приложение с локальными проектами и ChatGPT Web в одном окне. Перенос Project Web Pilot в самостоятельный продукт с разделением Control, Execution и Frontend. Происхождение: [PROVENANCE.md](PROVENANCE.md).

Текущая версия исходников: 0.1.0, ещё не опубликованный перенос. Сохранены AutoPlan, Review и последовательное/параллельное выполнение базы. Новая оркестрация с отдельным агентом на каждую микрозадачу относится к следующему этапу.

Для разработки на macOS arm64: Node 24.21.0, затем `npm ci` и `npm start`. Electron 44.5.1 закреплён lock-файлом. Новый профиль создаётся отдельно; вход в ChatGPT и настройку собственного туннеля пользователь выполняет в мастере. Приложение не наследует ключи/профиль/службы донора. Свой VPS-канал требует отдельной настройки маршрута; работающий донорский маршрут не перенастраивается.

Проверки: `npm test`, `npm run smoke`, `npm run check --prefix packages/workflow-kit`, `node --test tests/codex-app-server-mcp.test.mjs`, `npm run check:codex-tools`. `npm test` ограничен четырьмя параллельными процессами: это уменьшает конкуренцию файловых fixtures за ресурсы; assertions и таймауты сохранены. Electron smoke использует скрытые fixture-окна, временный профиль и поддельную страницу ChatGPT. Live executor fixtures используют локальный Codex App Server без модельных запросов и собственную Python-среду `.harness/runtime/test-python` (Python 3.13.9, зависимости из tools/codex-app-server-mcp/requirements.txt).

Windows x64 и Linux x64 Ubuntu 24.04 X11 войдут в первый общий выпуск; Linux-адаптер и сборка трёх платформ ещё в плане. Production build/install/publish выполняются только заключительными задачами Workflow Kit. Живую проверку интерфейса и VM выполняет пользователь.
