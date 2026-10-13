# Workflow Pilot 0.1.0 — платформы, проверки и поставка

Обязательная часть [спецификации](migration-0.1.0.md) первого выпуска.

## Платформы и первый запуск

| Платформа 0.1.0 | Пакет и проверка |
| --- | --- |
| macOS arm64 | .app и ZIP; первая живая проверка пользователем на его Mac |
| Windows x64 | Portable ZIP и нужные компоненты; затем UTM, с явной отметкой эмуляции на ARM |
| Ubuntu 24.04 LTS x64, X11 | Архив tar.gz с приложением и инструкцией; затем пользовательская Linux VM |

Linux ARM64, другие дистрибутивы и полный Wayland вне 0.1.0; X11 — ограничение первой версии. UTM на Apple Silicon проверяет x64 через эмуляцию, ARM64 VM не подходит. На Wayland явно показывать unsupported; захват XWayland не считать полным доступом.

T001 до копирования проверяет официальные Linux x64 assets Electron/Node/Codex/Python/uv/rg/Git/tunnel-client и поставку. Отсутствие обязательного asset — blocker с решением, не заглушка/latest. Смену закреплённой версии обосновать.

Windows vendor: https://github.com/OleynikAleksandr/Project-Web-Pilot/releases/download/v0.6.115/Windows-Codex-Local-2026-09-10.zip; SHA-256 `1f041488ad97d8abf1984fd3521afb8abe15f50b8df3d3e11f1cc4248e019d98` из donor src/windows-runtime.mjs. T001 сверяет asset/digest; несовпадение — остановка. Свой build-cache, только uv/tunnel-client/rg/MinGit, без старого сервера/runtime. Тот же архив/digest/историческое имя — отдельный asset 0.1.0. До публикации новый repo не источник самого себя. Donor releases/latest запрещён. Собственные env/marker/install: WORKFLOW_PILOT_* и .workflow-pilot-*; исключение — имя vendor-архива.

Linux runtime: снять ограничения control.py/startupSupported (сейчас darwin/win32); реализовать XDG/права/user-службы при login, process groups/stdin/terminal evidence, установку компонентов, оба канала, Chromium/preload/observer. Electron без root и обхода sandbox. Реальная проверка X11-наблюдения/снимков; управление вводом/окнами не добавлять. Каталог API, параметры и ошибки сохранить.

Onboarding сохраняет ChatGPT login/регистрацию, компоненты, туннель/ID, коннектор, проект, диагностику и существующие инструкции адреса/IP. Различать готовность страницы, служб, туннеля, подключения аккаунта, первого действия агента с файлом. Не обещать автоматический VPS-аккаунт или доступность функций OpenAI.

Вход, системные подтверждения, UI/VM проверяет пользователь; агент ими не управляет. Fixtures не ставят реальные службы. На каждой ОС проверить Unicode/пробелы, executable bits, регистр, отписки, restart.

## Закреплённые зависимости и ограничения

T001 (13.10.2026) сверил официальные assets, SHA-256 и лицензии; T009 загрузил шесть Linux-архивов и проверил их digest на Mac без запуска Linux-бинарников. Канонические URL/digest: `src/execution/platform/linux/toolchain.mjs`; Node 24.21.0, Codex 0.162.1, uv 0.9.13, CPython 3.13.9/build 20251120, rg 15.2.0, tunnel-client 0.0.14. Electron 44.5.1 Linux x64: SHA-256 `5bcd217611d6843ececd6c9e9c1fcd1da3ab066c43d8b1a9e4b44689a1fba6f5`. Latest и подмена отсутствующего asset запрещены; изменения версий требуют обоснования. Locks Codex и Python сохранены.

Windows vendor выше проверен: 86 242 347 байт, SHA совпал, CRC PASS, 34 записи. Извлекаются только четыре vendor ZIP: uv 0.12.12, tunnel-client 0.0.14, rg 15.2.0, MinGit 2.55.0.windows.5. Старые installer/server не запускаются. Официальные notices/source поставляет `stage-vendor-notices.mjs`; лицензии компонентов и происхождение описаны в [THIRD-PARTY](../../resources/THIRD-PARTY.md). Лицензия приложения MIT не заменяет лицензии vendor.

Linux Git — системный Ubuntu noble 2.43.x из подписанного apt, с фактической security revision в runtime manifest; T001 видел 1:2.43.0-1ubuntu7.3. Пользователь устанавливает Git/openssh-client/zenity; приложение не выполняет sudo. X11: mss 10.1.0, python-xlib 0.33 (заменяемый LGPLv2+ модуль с source archive), Pillow 11.3.0; mcp 1.28.1. Прямые и транзитивные Python wheels закреплены в requirements-linux.lock. Политика установки, XDG, systemd/user, отказ root/Wayland и ограничения GetImage — [Linux](../modules/linux.md).

VPS Ubuntu/glibc 2.39 использовался только для чтения доступности зависимостей; Xorg/Xwayland отсутствовали, ничего не устанавливалось. Это не desktop-проверка. Для Electron на VM отдельно проверяются loader/библиотеки GTK/NSS/GBM/ALSA/X11, sandbox и графический сеанс. UTM x64 ещё не создана/не проверена пользователем.

| Наблюдение | Статус и решение |
| --- | --- |
| 0.6.115 повторяет 0.6.112 без 0.6.113/114 | Известная база, изменения молча не возвращаются |
| Донор не поддерживал Linux | Реализация T009, fixtures PASS отдельно от pending native VM |
| Новый VPS route не выделен, 17842 занят донором | Ожидаемое setup-required, свой Secure Tunnel; донор не захватывается |
| Потеря старого проекта/recovery/AutoPlan/Review/ресурса | Блокирующая регрессия, исправление до поставки |
| Wayland / Linux ARM64 | Вне поддержки 0.1.0 |
| Native Windows/Linux и clean-install | Pending пользовательской приёмки |

## Проверки и приёмка

Сохранить unit-all (`npm test`), electron-smoke (`npm run smoke`), kit-check, executor-channel, codex-tools-live. Smoke использует ChatGPT fixture без модели. По блокам — точечные тесты, весь набор — T002/T011; успешные прогоны без причины не повторять.

Проверять identity/сосуществование, фасады/импорты, старые проекты, Linux runtime, три пакета и отказы границ. Для анализа зависимостей рассмотреть dependency-cruiser/Knip, не писать анализатор. Не удалять по отчёту динамические входы/IPC/pageScript/workers/HTML/preload/внешние экспорты/ресурсы. Web Pilot Sidebar не менять.

| Сценарий | Доказательство |
| --- | --- |
| Проект → Chat/Work → полный recovery → ответ | Integration fixture плюс ручная проверка ChatGPT на Mac |
| Открытие прежнего чата; смена проекта | Нет повторного контекста, cwd фоновой сессии неизменен |
| AutoPlan ON/OFF, sequential, parallel | Регрессия поведения базы; исключительные задачи, конфликты, безопасная интеграция, final handoff |
| Review ON/OFF | Явный получатель, сохранённая позиция автора, отсутствие повторной отправки |
| Команда/сервер и restart | Адресная остановка, terminal evidence, UNKNOWN не списывается автоматически |
| Архив/удаление/Доктор | Identity, дети/worktree, старый boot ID, отсутствующий исполнитель, соседний проект не затронут |
| Проект из донора | Fixture реального формата 1.7.2: ACTIVE, DONE, NONE, безопасный upgrade, recovery и продолжение |
| Два приложения и два канала | Свои профили/службы; конфликт маршрута виден; нет захвата службы донора |
| Первый запуск | По подсказкам до проекта; ошибки/повтор, секреты не попадают в экспорт |
| Пакеты | Исполняемые файлы, workers/preload/HTML/observer/Kit на месте, исходники соответствуют sourceCommit |

Раздельно фиксировать pass/fail/ограничения автоматических, live macOS/ChatGPT, Windows UTM, Linux UTM и clean-install проверок. Пользователь проверяет Mac → Windows → Linux; clean-install и нюансы onboarding — после релиза. Мастер и Linux-пакет обязательны. Основной сценарий исправить до готовности; неблокирующее согласованное применение — следующий раунд.

## Поставка

Подготовка build/check — до DOCS. `npm run build` обязан собрать три ОС; ошибка оставляет выпуск незавершённым. Форматы — выше; версия 0.1.0, общие locks/sourceCommit. Разные хосты допустимы, одна платформа не полный выпуск.

macOS: собственная identity; локальному прототипу разрешена ad hoc подпись с отметкой о разрешениях. Сертификат не выбирать/копировать автоматически; явный выбор пользователя закрепить в новом локальном конфиге/проверках. Донорскую подпись не менять, ключи не создавать/экспортировать; notarization не требуется.

Manifest: OS/arch, version/sourceCommit, имя/размер/SHA-256 каждого asset, связь с исходниками, зависимости/Kit, подпись, native/VM/clean статусы. Число assets донора (шесть) не норматив; Linux содержит реализацию, не только Electron.

T012 создаёт tracked release-manifest.json как побайтовую копию manifest комплекта, вне source snapshot и собственного хеша. Digest staging/Downloads/root/GitHub asset одинаков. T013/T014 не дописывают manifest: install/publish evidence — в Kit. Поздняя приёмка не меняет исторический manifest. Он допустим как единственный функциональный путь delivery без изменения байтов.

После DOCS: delivery build через Kit → установка готовой macOS-копии в два новых пути без пересборки → GitHub Release/сверка комплекта. Пути: `~/Downloads/WorkflowPilot-0.1.0/`, `.harness/runtime/releases/0.1.0/`. Проверять цели/симлинки/состав до записи. В архиве только runtime; не вкладывать рекурсивно корневой app/разработку.

Новый repo: fast-forward, без donor force-with-lease; v0.1.0 на manifest.sourceCommit. Draft → сверка всех assets → публикация. Main может включать delivery-коммиты, тег — исходники сборки. После push сверить main/tag/assets. Изменение исходников требует пересборки всего комплекта, платформы не смешивать.

До явной приёмки — READY_FOR_ACCEPTANCE. Native Windows/Linux/clean-install могут быть pending при первом полном выпуске, явно в manifest/Release, без заявления проверенной поддержки. Отсутствие пакета любой ОС запрещает полный выпуск.
