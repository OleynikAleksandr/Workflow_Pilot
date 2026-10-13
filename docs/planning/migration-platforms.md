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

## Решения T001 по зависимостям, 13.10.2026

Официальные assets/SHASUMS ниже проверены без запуска Linux-бинарников на Mac. Сборщик проверяет SHA-256 до распаковки, создаёт собственные runtime/lock/manifest; замена отсутствующего asset на latest запрещена.

| Компонент Linux x64 | Закреплённая поставка и SHA-256 |
| --- | --- |
| Electron 44.5.1 | [electron-v44.5.1-linux-x64.zip](https://github.com/electron/electron/releases/download/v44.5.1/electron-v44.5.1-linux-x64.zip); `5bcd217611d6843ececd6c9e9c1fcd1da3ab066c43d8b1a9e4b44689a1fba6f5` |
| Node 24.21.0 | [node-v24.21.0-linux-x64.tar.xz](https://nodejs.org/dist/v24.21.0/node-v24.21.0-linux-x64.tar.xz); `fd8e59d5a511510f6a298afb548f18c7d2b1be404d8b4a27d94fbe49f56cb2d6` из официального [SHASUMS256.txt](https://nodejs.org/dist/v24.21.0/SHASUMS256.txt) |
| Codex App Server 0.162.1 | [codex-x86_64-unknown-linux-musl.tar.gz](https://github.com/openai/codex/releases/download/rust-v0.162.1/codex-x86_64-unknown-linux-musl.tar.gz); `86f268d81b898f3e144c5ecff2ad2fda2c5802e042d6195b72538fe0fa125057`; сохранить donor codex-tools.lock.json и его spec hashes |
| uv 0.9.13 | [uv-x86_64-unknown-linux-gnu.tar.gz](https://github.com/astral-sh/uv/releases/download/0.9.13/uv-x86_64-unknown-linux-gnu.tar.gz); `c45a44144bf23a2182e143227b4ad0bbe41a2bb7161a637c02e968906af53fd1` |
| CPython 3.13.9 / build 20251120 | [install_only_stripped, x86_64 GNU](https://github.com/astral-sh/python-build-standalone/releases/download/20251120/cpython-3.13.9%2B20251120-x86_64-unknown-linux-gnu-install_only_stripped.tar.gz); `1bc9a94ab2425fb6ae58e45f69cab61647759b57895649701390822d976fa923` |
| ripgrep 15.2.0 | [ripgrep-15.2.0-x86_64-unknown-linux-musl.tar.gz](https://github.com/BurntSushi/ripgrep/releases/download/15.2.0/ripgrep-15.2.0-x86_64-unknown-linux-musl.tar.gz); `33e15bcf1624b25cdd2a55813a47a2f95dbe126268203e76aa6a585d1e7b149c` |
| tunnel-client v0.0.14 | [tunnel-client-v0.0.14-linux-amd64.zip](https://github.com/openai/tunnel-client/releases/download/v0.0.14/tunnel-client-v0.0.14-linux-amd64.zip); `15bd17e805cad39d412199115bb9e10a978dd35258a114cdf25dd2ae6681c7d3` |
| Git | Системный Ubuntu noble Git 2.43.x из подписанного apt-репозитория; проверенная версия VPS `1:2.43.0-1ubuntu7.3`. Не создавать собственную статическую сборку и не замораживать security revision. В runtime manifest записывать фактическую версию; installer диагностирует отсутствие Git/openssh-client и предлагает явную установку системных пакетов |

Версии: Electron/Node/Codex прежние, uv как macOS toolchain 0.9.13. Python донор закреплял только до 3.13; Linux patch/build взят из [каталога uv 0.9.13](https://github.com/astral-sh/uv/blob/0.9.13/crates/uv-python/download-metadata.json), URL HTTP 200; обычный x86_64, не v2/v3/v4/free-threaded. rg 15.2.0/tunnel v0.0.14 совпадают с Windows vendor; latest v0.0.16 не использовать. T003/T009 заменяют незакреплённый macOS tunnel latest явной платформенной версией/именем архива.

Windows asset проверен в новом .harness/runtime/t001: 86 242 347 байт, SHA-256 совпал с release digest, CRC PASS. 34 записи, четыре вложенных ZIP (EXE не в корне), байты сверены с vendor/manifest.json: uv 0.12.12, tunnel v0.0.14, rg 15.2.0, MinGit v2.55.0.windows.5. Найдены uv.exe, tunnel-client.exe/cloudflared.exe, rg.exe, cmd/git.exe. Donor installer/server не запускались; извлекать только vendor payload/notices.

Лицензии: donor MIT; bundled LICENSE/NOTICE/Chromium notices Electron, Node, CPython и их компонентов; upstream/third-party notices Codex/tunnel-client; uv MIT/Apache-2.0; rg MIT/Unlicense; Git GPL/лицензии компонентов MinGit (сохранить LICENSE.txt/share/licenses). В Windows uv ZIP лицензий нет: добавить из тега 0.12.12, Linux uv — 0.9.13. T010 проверяет notices/source ссылки/архивы, T012 включает их с payload. Лицензия приложения не покрывает весь vendor.

### Linux X11 и реальные ограничения

Библиотеки: mss 10.1.0 — экран, python-xlib 0.33 — X11-дерево/EWMH/drawable GetImage, Pillow 11.3.0 — кодирование. [Исходник xlib](https://github.com/python-xlib/python-xlib/blob/0.33/Xlib/xobject/drawable.py) реализует query_tree/get_image; старая справка «not implemented» не контракт. Вводом/фокусом не управлять. Window capture читает drawable, не прямоугольник экрана. BadMatch/BadWindow, недоступное/свёрнутое окно, несовместимый формат — явные ошибки; ограничения перекрытых областей фиксировать, полный захват не обещать.

На [PyPI](https://pypi.org/) проверены mcp 1.28.1 (MIT, Python >=3.10), mss 10.1.0 (MIT, >=3.9), xlib 0.33 (LGPLv2+), Pillow 11.3.0 (MIT-CMU, >=3.9): portable wheels первых трёх, cp313 manylinux x86_64 Pillow, без пользовательской компиляции прямых зависимостей. T009 фиксирует транзитивные зависимости/hashes в Linux lock. Xlib — заменяемый модуль с лицензией/source archive. Marker Pillow win32 расширить на Linux; psutil 7.2.2 остаётся Windows, Linux использует штатные process API.

VPS подтвердил Ubuntu glibc 2.39, Git 2.43.0 и apt libx11-6/libxext6/libxcb1/libnss3/libgtk-3-0t64/libgbm1/libasound2t64; полноту зависимостей проверяют loader/startup T009/T012 на desktop VM. Xorg/Xwayland не найдены, ничего не устанавливалось. Capture требует X11/DISPLAY/разрешённый XAUTHORITY; отсутствие доступа и Wayland — unsupported, не пустой успех. User-служба после login получает графическое окружение, GUI runtime не root.

UTM x64 VM ещё не создана/не проверена пользователем. Assets доступны, но Linux не доказан до T009 (setup/control/startup, XDG/services, проверенный native payload, screen/window adapter), T010/T012 (упаковка/notices) и живой проверки.

| Наблюдение | Baseline или регрессия; решение |
| --- | --- |
| 0.6.115 повторяет 0.6.112; исправления 0.6.113/0.6.114 отсутствуют | Известная база; не возвращать изменения молча и не считать их отсутствие регрессией |
| Донор отвергает Linux, формирует darwin tunnel URL, использует ~/Library | Ограничение базы, но незавершённый обязательный scope нового 0.1.0; реализовать в T009 до выпуска |
| Новый VPS route ещё не выделен, 17842 занят донорским каналом | Ожидаемое setup-required; запрещено считать готовым или захватывать канал; Secure Tunnel остаётся рабочим путём |
| Не открывается старый проект, теряется recovery/AutoPlan/Review, ломается динамический ресурс | Регрессия; исправить и повторить соответствующую проверку до поставки |
| Wayland, ARM64 Linux, чистая установка, пользовательская UTM проверка | Вне заявленной платформы либо pending-приёмка; не маркировать PASS по unit fixture |

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
