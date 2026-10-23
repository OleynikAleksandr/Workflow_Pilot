# Единая поставка Workflow Pilot

Версия 0.5.29. Порядок: DOCS → RELEASE → INSTALL → PUBLISH; 0.5.29 публикуется по прямому поручению пользователя в плане review-publication-orchestrator (замечания живой проверки 0.5.28). macOS arm64, Windows x64 и Ubuntu x64 X11 собираются из одного sourceCommit. Каждый пакет содержит клиент, backend и MCP; helper-bundle нет, тестовые флаги запрещены. Codex исключён из приёмки. Native Windows/Linux, VM и clean-install остаются pending; сначала пользователь проверяет Mac.

## Комплект

0.5.29: Kit 1.9.7 — проверка задач при Review-публикации, отказ назначения до ветки, владелец планирования; пауза `refused` и один оркестратор с первой задачи. 0.5.28 по живой проверке 0.5.27: сценарии Review и Kit 1.9.6 — положение переключателя в момент публикации решает, нужно ли ревью, выключение до публикации отменяет незавершённое ревью, во время ревью и после публикации переключатель заблокирован. 0.5.27 по живой проверке 0.5.26: компактная карточка сессии (меню над Chat/Work в одной колонке, одна строка «дата · роль · прогресс», постоянная высота) и ожидание запуска готового плана в «Сейчас». 0.5.26 исправляет замечания живой проверки 0.5.25: подтверждённый старт закрытой сессии не считается потерянным, ответ O до плана виден в «Сейчас», отложенная очистка назначения показывается ожиданием с причиной, панель закрытого плана показывает итог без спиннера; Kit не меняется (1.9.5). С 0.5.25 комплект включает понятный ход работ (единая проекция `workProgress`, новый sidebar и панель, общая палитра) и Kit 1.9.5 с прогрессом проверок коммита; `electron-smoke` снова входит в выпускные проверки. С 0.5.23 комплект включает единый старт O/E/обычного чата через MCP независимо от плана: первая часть в ответе панели, остальные и квитанция полного чтения в том же ходе. DOM-вложения отключены, прежний генератор сохранён отдельным модулем. Старые отправленные/UNKNOWN попытки не повторяются; неотправленные черновики сохраняются с отказом. Отмена подготовки и принудительная остановка сохранены; PiP отсутствует. 0.5.24 добавляет дочитывание пакета S, снятие удержания Kit, проверяемый прогресс, стадии доставки O и Kit 1.9.4 с Review без неявных пределов. Адресные startup/context/sidebar, MCP/SDK, полный fixture с двумя E и DOCS и архитектура проверены; новые живые старты всех ролей и native Windows/Linux ожидают приёмки.

Выходы: `.harness/runtime/releases/<version>` и `~/Downloads/WorkflowPilot-<version>`. Цели и симлинки проверяются до записи. Без любой платформы полный выпуск запрещён.

Матрица — `scripts/release-package.mjs`; семь assets:

- `Workflow-Pilot-<version>-macOS-arm64.zip`
- `Workflow-Pilot-<version>-Windows-x64.zip`
- `Workflow-Pilot-<version>-Linux-x64.tar.gz`
- `Windows-Codex-Local-2026-09-10.zip`
- `SHA256SUMS.txt`, `INSTALL.txt`, `release-manifest.json`

Windows vendor: только [закреплённый asset v0.6.115](https://github.com/OleynikAleksandr/Project-Web-Pilot/releases/download/v0.6.115/Windows-Codex-Local-2026-09-10.zip), размер 86242347, SHA-256 `1f041488ad97d8abf1984fd3521afb8abe15f50b8df3d3e11f1cc4248e019d98`, либо собственный cache/явный файл с тем же digest. Историческое имя сохранено; берутся лишь vendor-компоненты/notices. Donor runtime, latest и будущий Release запрещены. Собственные имена — WORKFLOW_PILOT_* и .workflow-pilot-*.

## Сборка и проверка

Все исходники, scripts, package/lock и Kit закоммичены. HEAD, source snapshot и hashes locks сверяются до и после сборки. `npm run build` готовит общие Kit/observer/plugin/notices, затем параллельно пакует три ОС через Electron Packager/ASAR и ditto/tar. `--ignore-scripts` исключает повторную запись ресурсов; отдельный `TMPDIR` каждой платформы — `.harness/runtime/packager-tmp/<platform>`. CLI `--tmpdir` не используется: теряет следующие `--extra-resource`. Ошибка/UNKNOWN любой ОС запрещает выпуск после завершения остальных. Linux-бинарники на Mac не запускаются.

Версии приложения, Electron/Node, Kit и sourceCommit общие. Python executor и staged HTML с лицензиями входят в MCP всех пакетов. `stage-chatgpt-plugin` вставляет JS через callback String.replace и проверяет синтаксис до записи. `check-plugin-resource.mjs` при staging и проверке каждого пакета сверяет версию package/backend, build/protocol в HTML, видимый build и compiled script; совпадение одних файловых hashes недостаточно. URI вычисляется из полного HTML; [MCP сохраняет неизменяемый снимок](chatgpt-plugin.md#ресурс-панели-и-обновление). Реальный HTML/MCP/SDK проверяется fixture: digest не доказывает работу UI. Схемы Codex 0.163.0 совпадают по hash с 0.162.1; поставляемый Linux Codex — 0.162.1, буквальный version_matches может быть false.

Строгая сверка: src, runtime package.json, обе копии Kit (ASAR и внешняя), Python/HTML/preload/workers/observer, toolchain. Запрещены вложенные .app, лишние файлы/ресурсы и runtime/secret-пути. Windows: PE, pinned vendor/Node. Linux: ELF x64, права, hashes, Electron. Каждый архив распаковывается и сравнивается со staging по содержимому, правам и симлинкам; выходящие за пакет ссылки запрещены.

Linux toolchain копируется `copy-linux-toolchain.mjs` после Packager с сохранением текста ссылок: обычный extraResource 20.3 делает их абсолютными. Проверки состава/SHA/прав до и после копирования обязательны; fixture проверяет ссылку без исходной папки и после tar.gz. macOS `*.lproj`/`electron.icns` должны точно совпадать по именам, типам и содержимому с закреплённым `node_modules/electron/dist/Electron.app`, включая установку. `default_app.asar` исключён.

Лицензии payload сохраняются. `stage-vendor-notices.mjs` добавляет проверенные по SHA тексты uv/Codex и LGPL/source python-xlib; остальные — `resources/THIRD-PARTY.md`. Лицензия приложения их не заменяет.

Архивы готовятся во временном `.harness/runtime`; окончательные release и Downloads создаются через проверенный временный каталог и rename. Частичная доставка и смешивание комплектов запрещены. Равные sourceCommit/snapshot допускают повтор доставки без сборки. Оставшийся lock при UNKNOWN требует разбора.

Перед каждой production-сборкой, включая повтор/проверку Kit, удалить только проверенные сгенерированные __pycache__, .pyc/.pyo из tools/codex-app-server-mcp без перехода по симлинкам. Исходники/runtime/профили не затрагивать. Python — с -B/PYTHONDONTWRITEBYTECODE=1; .gitignore не исключает extra-resource.

## Manifest

Schema 2: version/sourceCommit, sources/locks, Electron/Node/Kit, macOS signature, три OS/arch, размеры/SHA архивов, vendor, INSTALL/SHA256SUMS. Native/VM/clean флаги false до отдельной приёмки; fixture их не повышает.

Корневой tracked manifest — точная копия комплекта; исключён из source snapshot/собственного hash. SHA256SUMS содержит три пакета и vendor; manifest — hashes SHA256SUMS и INSTALL. Его digest одинаков в staging, Downloads, корне и GitHub.

Замена требует роста версии, проверки полного прежнего комплекта и равенства прежнего manifest. Иной состав той же версии, откат, повреждение или симлинк запрещены. Старые release/Downloads сохраняются. Новый manifest заменяется атомарно после проверки доставки; установка/публикация/приёмка его не меняют, evidence сохраняется в Kit.

## Подпись и установка

Явный SHA-1 Apple Development через WORKFLOW_PILOT_MAC_SIGNING_IDENTITY или собственный `.harness/runtime/mac-signing.json`. Нет автовыбора Keychain/конфигурации донора. Development без notarization не гарантирует отсутствие Gatekeeper на другом Mac.

`build:mac` готовит и подписывает только staging; `release-mac.mjs` создаёт проверенный ZIP без общей доставки. INSTALL вызывает `node scripts/check-installed-release.mjs --install`. Проверка без аргументов требует установленную новую версию, отвергая pending. Назначенная проверка `--delivery` допускает подтверждённый pending: связывает receipt с manifest/двумя целями, сверяет новый bundle и неизменные подпись/содержимое/identity старого. Результат различает installed/pending; запуск новой службы он не подтверждает.

Цели — собственные `Workflow Pilot.app` в проекте и `/Applications`. Готовые Contents копируются без сборки/переподписи. Identity внешнего каталога сохраняется; прежние Contents — в backup-slot каждой цели, ошибка проверки возвращает их. Symlink, чужая identity и посторонние файлы запрещены. Обновление последовательное; отказ второй копии не отменяет первую. Повтор использует тот же комплект. Preflight записывается до установки, также при отсутствии приложения.

Installer не закрывает, не останавливает и не запускает приложение/службу. При backend из целевого bundle готовая копия остаётся в pending-слоте (`BACKEND_RUNNING`). Пользователь дожидается безопасной точки, останавливает службу через значок/меню, повторяет установку и открывает новую версию. Закрытия окна с 0.2.0 недостаточно; 0.1.6 нужно полностью завершить. Клиент другой версии только объясняет переход ([backend](backend.md)).

## Публикация и приёмка

PUBLISH: собственный OleynikAleksandr/Workflow_Pilot, fast-forward main, draft → семь assets → сверка → публикация. Проверяющий script ничего не публикует: сверяет origin, remote main == local HEAD, v<version> == manifest.sourceCommit, draft/prerelease=false и все имена/размеры/digests. Delivery-коммиты могут быть позже sourceCommit; тег остаётся на исходниках сборки.

Fixtures проверяют состав трёх ОС, повреждение/копирование/manifest/UNKNOWN, ELF/права/Unicode/симлинки, подпись, rollback и неизменность manifest при GitHub-проверке. Native/clean остаются pending. Ubuntu требует X11 и штатный sandbox, без root/Wayland/обхода sandbox.
