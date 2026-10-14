# Единая поставка Workflow Pilot

Общая поставка создаёт macOS arm64, Windows x64 и Linux x64 из одного sourceCommit. Для 0.1.4 порядок: открытие панели и актуальные сессии T024 → DOCS-7 → общая сборка T025 → установка T026. GitHub-публикация выполняется отдельно. Вход/туннель/контекст 0.1.1 и плагин Chat/Work 0.1.3 подтверждены пользователем на Mac; новый порядок открытия панели 0.1.4 требует живой проверки. Codex исключён из приёмки, Windows/Linux отложены. Правила переносимых Linux-ссылок и штатных ресурсов Electron macOS сохраняются.

## Матрица и состав

Выходы: `.harness/runtime/releases/<version>` и `~/Downloads/WorkflowPilot-<version>`; текущая версия исходников — 0.1.4. Перед записью проверяются цели и симлинки. Полный комплект допускает READY_FOR_ACCEPTANCE с явно указанными pending native/VM/clean проверками; отсутствие хотя бы одной платформы запрещает объявлять полный выпуск. Первую живую проверку пользователь выполняет на Mac, затем Windows x64 и Ubuntu x64 X11.

`npm run build` последовательно запускает macOS arm64, Windows x64 и Linux x64. Используются существующие Electron Packager, ASAR, системные ditto/tar. Linux-бинарники на Mac не запускаются. Ошибка/неизвестный исход платформы останавливает сборку; отдельный успешный пакет не считается выпуском.

Семь assets версии 0.1.4:

- Workflow-Pilot-0.1.4-macOS-arm64.zip
- Workflow-Pilot-0.1.4-Windows-x64.zip
- Workflow-Pilot-0.1.4-Linux-x64.tar.gz
- Windows-Codex-Local-2026-09-10.zip
- SHA256SUMS.txt
- INSTALL.txt
- release-manifest.json

Матрица задаётся в `scripts/release-package.mjs`; имена вычисляются из версии. Историческое имя Windows vendor-архива сохраняется намеренно. Его единственный сетевой источник — закреплённый asset v0.6.115 репозитория Project-Web-Pilot, SHA-256 `1f041488ad97d8abf1984fd3521afb8abe15f50b8df3d3e11f1cc4248e019d98`. Допускается только проверенный собственный cache/явно указанный файл с тем же digest. Donor runtime, latest и будущий Release нового проекта не используются. Из архива используются только vendor-компоненты и notices.

URL vendor: https://github.com/OleynikAleksandr/Project-Web-Pilot/releases/download/v0.6.115/Windows-Codex-Local-2026-09-10.zip. Проверенный размер — 86 242 347 байт; историческое имя сохраняется отдельным asset нового выпуска. Собственные env/install/marker имена используют WORKFLOW_PILOT_* и .workflow-pilot-*.

## Сборка и доказательства

Исходники, scripts, package/lock и packages/workflow-kit должны быть закоммичены. Сборка фиксирует HEAD, снимок исходников и хеши locks, затем повторно проверяет их перед завершением. Generated Kit/observer/notices и автономный plugin-ui.html подготавливаются из закреплённых источников. HTML плагина с лицензиями SDK и plugin.py входят в tools MCP всех платформ и сверяются по digest. Версии приложения, Node/Electron, Kit и sourceCommit общие для трёх пакетов.

stage-chatgpt-plugin вставляет JavaScript буквально через callback String.replace и до записи проверяет синтаксис. Regression запускает собранный HTML, возвращённый MCP, с handshake SDK и кнопками панели; совпадение digest само по себе не доказывает работоспособность UI.

Проверка пакетов сравнивает исходники и точный набор src, runtime package.json, обе копии Kit (ASAR dependency и внешний runtime), Python executor, HTML, preload, workers и observer. Запрещены вложенные .app, лишние корневые файлы, неожиданные внешние ресурсы и runtime/secret-пути. Подготовленные toolchain и упакованные копии сверяются. Windows проверяет PE и pinned vendor/Node; Linux — ELF x64, executable bits, payload hashes и файлы Electron. Каждый ZIP/tar.gz распаковывается во временный каталог и сравнивается со staging по содержимому, правам и внутренним симлинкам; выходящие за пакет ссылки запрещены.

Все архивы создаются во временном каталоге собственного `.harness/runtime`. Комплект получает окончательный путь `.harness/runtime/releases/<version>` только после полной проверки. Downloads заполняется через проверенный временный каталог и rename. Ошибка копирования не оставляет частично заполненную папку доставки. Существующий комплект не смешивается с новой сборкой; совпадающий sourceCommit/snapshot позволяет повторить доставку без пересборки. Неизвестный исход с оставшимся lock требует проверки, а не автоматического повторного запуска.

Лицензии сохраняются внутри исходных payload. `stage-vendor-notices.mjs` добавляет проверенные SHA-256 тексты uv/Codex и LGPL/source archive python-xlib; ссылки и расположение остальных notices перечислены в `resources/THIRD-PARTY.md`. Лицензия приложения не подменяет лицензии компонентов.

Linux toolchain копирует `scripts/copy-linux-toolchain.mjs` после Electron Packager, до проверки пакета. Штатный `extraResource` Packager 20.3 использует `fs.cp` без `verbatimSymlinks` и превращает относительные ссылки в абсолютные пути источника. Отдельный шаг сохраняет текст ссылок, проверяет SHA-256/права/состав до и после копирования и отклоняет выходящие за пакет ссылки. Fixture проверяет работу ссылки после удаления исходной папки и распаковку tar.gz; удаление проверок ссылок не допускается.

Штатные macOS `*.lproj` и `electron.icns` разрешены только при совпадении с ресурсами закреплённого `node_modules/electron/dist/Electron.app`: проверяются имена, типы и содержимое. Пропавшие, повреждённые и дополнительные локализации отклоняются. Upstream `default_app.asar` в готовое приложение не включается. Общая проверка используется и при последующей установке готового комплекта.

## Manifest

Manifest schemaVersion 2 содержит version/sourceCommit, source snapshot, locks, Electron/Node/Kit, macOS signature, три платформы OS/arch, размеры/SHA-256 архивов, vendor-архив и записи INSTALL/SHA256SUMS. Native/VM/clean-install флаги остаются false до фактической отдельной приёмки; fixture не повышает их.

Общая сборка создаёт корневой tracked `release-manifest.json` побайтовым копированием manifest комплекта. Он исключён из source snapshot и собственного хеша, чтобы не возникало циклического digest. SHA256SUMS перечисляет три пакета и vendor; manifest содержит hashes SHA256SUMS и INSTALL. Digest самого manifest сверяют между staging, Downloads, корнем и GitHub asset.

При следующей версии корневой manifest заменяется только после проверки сохранённого полного комплекта предыдущей версии и побайтового совпадения с его manifest. Версия должна увеличиться; другой состав той же версии, откат номера, неизвестный/повреждённый предыдущий комплект или симлинк дают отказ. Предыдущие release/Downloads-каталоги сохраняются. Новая доставка проверяется до атомарной замены корневого manifest; сбой не меняет прежний manifest.

T013/T014 не изменяют manifest. Проверки выводят отдельное evidence для Kit; поздняя установка/публикация/живая приёмка не переписывает исторический состав выпуска.

## Подпись и установка

Сертификат нового продукта выбирается явно: WORKFLOW_PILOT_MAC_SIGNING_IDENTITY либо собственный `.harness/runtime/mac-signing.json`, точный SHA-1 Apple Development. Автовыбора из Keychain нет; конфигурация донора не копируется. Это локальная development-подпись без notarization, не обещание отсутствия Gatekeeper на другом Mac.

`build:mac` подготавливает, упаковывает и подписывает только staging. `release-mac.mjs` создаёт отдельный проверенный ZIP без установки/доставки общего комплекта. После каждого готового общего выпуска установка обязательна: T013 вызывает `node scripts/check-installed-release.mjs --install`, затем тот же script без аргументов проверяет установленное. `/Applications/Workflow Pilot.app` всегда обновляется готовой распакованной копией нового проверенного комплекта. Пользователь полностью завершает прежний процесс и запускает новую версию; installer не перезапускает приложение.

Устанавливаются только собственные `Workflow Pilot.app` в корне проекта и `/Applications`. Готовые Contents копируются без пересборки/переподписи. Внешний каталог существующего приложения сохраняет identity; старая Contents хранится в одном backup-slot на цель. Ошибка проверки новой копии возвращает старую Contents. Symlink, чужая identity или посторонние файлы цели дают отказ. Обновление двух копий последовательное: успешная первая копия не отменяется из-за отказа второй; повторное действие использует тот же готовый комплект. Preflight записывается перед установкой, включая случай, когда своего приложения ещё нет.

## GitHub и приёмка

T014 публикует в OleynikAleksandr/Workflow_Pilot штатным fast-forward процессом: draft → загрузка семи assets → сверка → публикация. Проверяющий script сам ничего не публикует. Он проверяет собственный origin, remote main == local HEAD, tag v<version> == manifest.sourceCommit, отсутствие draft/prerelease и все размеры/digest. Main может включать более поздние delivery-коммиты; тег остаётся на исходниках сборки.

Fixtures проверяют нормальный комплект, пропавшую платформу, повреждение архива, ошибку копирования, несовпадающий manifest, UNKNOWN, ресурсы трёх layouts, ELF/права/Unicode/симлинки, явную подпись, rollback и неизменность manifest при проверке GitHub. Native Linux/Windows и чистая VM не объявляются проверенными. Ubuntu требует X11 и штатный sandbox; root/Wayland/обход sandbox не являются способом запуска.
