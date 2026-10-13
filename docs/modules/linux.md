# Linux runtime и первый запуск

Цель выпуска — Ubuntu 24.04 LTS x64, обычный пользователь и сеанс «Ubuntu on Xorg». Linux runtime подключён в Desktop bootstrap к тем же Control, Chromium, preload, observer и командам, что другие платформы. Wayland (включая XWayland), root, другая архитектура/версия ОС и отсутствие DISPLAY дают явный отказ. Sandbox Electron не отключается. Production-поставка и native VM-приёмка ещё не выполнены.

## Компоненты и подготовка

Electron 44.5.1 Linux x64 закреплён вместе с остальными платформами; проверенный SHA-256 официального ZIP: `5bcd217611d6843ececd6c9e9c1fcd1da3ab066c43d8b1a9e4b44689a1fba6f5`. Версии не заменяются latest при недоступности asset. Git — системный Ubuntu noble 2.43.x с актуальной security revision из подписанного apt; фактическая версия фиксируется runtime, статическая сборка Git не создаётся. UTM x64 на ARM отмечается как эмуляция, ARM64 VM не подходит.

`scripts/prepare-linux-toolchain.mjs` получает шесть официальных архивов, сверяет SHA-256 до распаковки и создаёт `.harness/runtime/linux-tools/manifest.json`. Версии, URL и digest находятся в `execution/platform/linux/toolchain.mjs`: Node 24.21.0, Python 3.13.9, uv 0.9.13, Codex 0.162.1, rg 15.2.0, tunnel-client 0.0.14. Архивы и лицензии сохраняются в payload; Linux-бинарники при подготовке на Mac не запускаются. Инструменты общей упаковки реализованы и проверены fixtures; production-сборка выполняется в delivery-задаче после DOCS.

Мастер проверяет системные Python 3, Git, OpenSSH client, zenity и доступность systemd --user. Git/openssh-client/zenity устанавливает пользователь через Ubuntu; приложение не выполняет sudo. Bootstrap проверяет платформу, manifest, точный регистр ключей, границы путей, executable bits и хеш каждого файла, затем копирует комплект в собственный runtime. Виртуальная среда использует комплектный Python; `requirements-linux.lock` фиксирует транзитивные версии и hashes, uv принимает только бинарные wheels. Подмена Python автоматической загрузкой запрещена. Исходный список — `requirements-linux.in`; lock получен uv 0.9.13 для Python 3.13/x86_64-unknown-linux-gnu.

При первом запуске нужны сеть для Python wheels, ChatGPT и выбранного подключения. Пользователь сам входит/регистрируется в ChatGPT и добавляет коннектор «Workflow Pilot Local Linux». Наблюдение страницы подтверждает вход; успех подготовки не означает вход или работоспособный туннель. Ошибку можно исправить и повторить проверку мастера.

## Состояние и службы

Runtime: `${XDG_STATE_HOME:-~/.local/state}/WorkflowPilotCodexExecutor`; конфигурация собственного VPS: `${XDG_CONFIG_HOME:-~/.config}/workflow-pilot/vps/route.json` и `mcp-url`. Относительные XDG значения игнорируются. Каталоги runtime имеют режим 0700, ключ туннеля и unit — 0600. Symlink runtime/чужая служба не захватываются. Секреты не входят в unit, снимки UI или диагностические DTO.

`workflow-pilot-executor.service` устанавливается в пользовательский systemd/user. Он запускает `control.py selector-start`, связан с graphical-session.target и упорядочен после graphical-session-pre.target. DISPLAY/XAUTHORITY берутся из окружения user manager, обновляемого графическим входом; приложение импортирует актуальное окружение перед активацией. Старые значения не записываются в unit. Logout останавливает службу и её cgroup. Для диагностики пользователь может вызвать `systemctl --user status workflow-pilot-executor.service` и `journalctl --user -u workflow-pilot-executor.service`.

Control.py запускает настоящий Codex app-server без модельных запросов. Linux использует POSIX stdin, отдельные группы процессов и блокировки lifecycle. PID сопоставляется с boot ID, starttime и executable из /proc; zombie и старый boot не подтверждают живую команду. Существующие command ledger, terminal evidence, UNKNOWN и запрет повторного исполнения сохраняются. Bash — fallback оболочки Linux; macOS-пути не используются.

Secure MCP Tunnel использует собственные ID/ключ. Альтернативный VPS работает через /usr/bin/ssh и тот же supervisor; маршрут и адрес предоставляет пользователь отдельно. Без route.json остаётся видимое setup-required, доступен Secure MCP Tunnel. Конфигурация донора и его порт не принимаются; сервер пользователя не превращается в desktop.

## Наблюдение X11

`linux_desktop.py` предоставляет только список окон, снимок экрана/области и снимок выбранного окна. Список читает EWMH и геометрию Xlib; экран читает mss, окно — X11 GetImage с проверкой формата пикселей, кодирование выполняет Pillow. Для закрытого/свёрнутого окна, неподдерживаемого visual и неполного изображения возвращается ошибка. Снимок окна не подменяется снимком экрана; содержимое перекрытых областей X11 не гарантирует. Соединения закрываются. Управления мышью/клавиатурой/фокусом нет.

## Проверки и границы доказательств

`linux-runtime.test.mjs` и `linux-startup.test.mjs` проверяют XDG/Unicode/пробелы, права и повреждения payload, регистр manifest, restart, symlink/ownership, unit argv, ошибки подготовки, два канала, UI мастера и Python-адаптеры. Python fixture использует временные файлы и искусственный X server; реальные службы, SSH, tunnel и UI не запускаются. На Mac для неё нужна `.harness/runtime/test-python` с mcp 1.28.1 и Pillow 11.3.0 (дополнительные mss 10.1.0/python-xlib 0.33 позволяют проверять установленные API). Эти зависимости устанавливаются в тестовую venv, отдельно от runtime пользователя.

Все шесть официальных архивов загружены и SHA-256 проверены на Mac. Unit/architecture/Electron smoke проверяют код и скрытые изолированные Chromium fixtures, а не native Linux. Пользователь позднее проверяет в Ubuntu x64 VM: первый запуск Xorg, разрешения sandbox, вход ChatGPT, собственный туннель/коннектор, проект с Unicode/пробелами, команды/stdin/Stop, снимки X11, logout/login/reboot и явный отказ Wayland. Реальный VPS требуется только для отдельной проверки своего маршрута. До этой приёмки native Linux не объявляется подтверждённым.
