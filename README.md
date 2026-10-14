# Workflow Pilot

Настольное приложение: локальные проекты, планы и сессии ChatGPT Web в одном окне. Chat и Work используют веб-аккаунт ChatGPT; локальные файлы и команды доступны через собственный MCP-исполнитель, без модельных запросов к OpenAI API.

## Версия и готовность

Версия исходников 0.1.1, Electron 44.5.1, Node 24.21.0, Workflow Kit 1.7.3. Исправлен мастер первого входа: распознавание профиля и личной навигации, отдельная проверка входа без перезагрузки, диагностика признаков аккаунта и состояния мастера. Автоматические проверки пройдены; вход в актуальный ChatGPT и native/VM/clean-install проверяет пользователь. Фактический состав готового комплекта подтверждает `release-manifest.json`; GitHub-публикация выполняется отдельно.

Сохранены AutoPlan, Review и sequential/parallel базы 0.6.115. [Новая оркестрация](docs/planning/orchestrated-execution-next.md) относится к отдельному следующему этапу. [Происхождение и лицензия](PROVENANCE.md).

| Платформа первого выпуска | Формат | Статус |
| --- | --- | --- |
| macOS arm64 | .app / ZIP | Реализация и fixtures проверены; живой UI pending |
| Windows x64 | Portable ZIP | Реализация и fixtures проверены; native/UTM pending |
| Ubuntu 24.04 LTS x64, X11 | tar.gz | Runtime и упаковка проверены fixtures; native/UTM pending |

ARM64 Linux, другие дистрибутивы и Wayland не поддерживаются в 0.1.1. UTM x64 на Apple Silicon — эмуляция; ARM64 VM не заменяет её.

## Разработка и первый запуск

На macOS arm64 установите Node 24.21.0 и Git, затем из корня проекта:

```bash
npm ci
npm start
```

Prestart подготавливает Kit и observer. Окно использует собственный профиль. Пройдите [мастер](docs/modules/first-run-onboarding.md): самостоятельный вход/регистрация ChatGPT, подготовка компьютера, свой Secure MCP Tunnel и коннектор. VPS требует отдельного собственного маршрута; без него отображается необходимость настройки. Ключи, cookies и службы донора не импортируются.

Для существующего проекта выберите папку, проверьте предложение Kit, создайте новую Chat/Work-сессию и отправьте recovery. Прежде прекратите исполнение этого же плана в другом приложении. [Совместимость старых проектов](docs/modules/project-compatibility.md).

Готовый комплект находится в `~/Downloads/WorkflowPilot-<version>`. Распакуйте пакет своей платформы и следуйте INSTALL.txt. После каждого выпуска штатный installer обновляет `/Applications/Workflow Pilot.app` и собственную копию в корне проекта без пересборки. Полностью завершите ранее открытое приложение и запустите новую копию из Applications; автоматического перезапуска нет. Проверка установки описана в [контракте поставки](docs/modules/release.md); Linux-зависимости и ограничения — в [Linux runtime](docs/modules/linux.md).

## Проверки

```bash
npm test
npm run smoke
npm run check:architecture
npm run check --prefix packages/workflow-kit
node --test tests/codex-app-server-mcp.test.mjs
npm run check:codex-tools
```

Unit suite использует четыре процесса. Smoke запускает скрытые изолированные Chromium fixtures с локальной страницей ChatGPT. Executor fixtures используют настоящий Codex App Server без модельных ходов; Python-среда тестов — .harness/runtime/test-python (Python 3.13.9, requirements.txt; для Linux fixtures также mss/python-xlib). Проверки не заменяют действия пользователя в аккаунте, native VM и clean-install.

[Результаты девяти gates и сценарий первой проверки Mac](docs/acceptance/migration-0.1.0.md). [Архитектура и карта модулей](docs/architecture/OVERVIEW.md).

Сборка: npm run build, только в назначенной delivery-задаче после DOCS. Обязательны все три платформы из одной базы; подпись выбирается явно. Частичный комплект не публикуется.
