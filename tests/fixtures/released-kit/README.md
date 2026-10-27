# Исторические upgrade fixtures

Архивы сохраняют выпущенные версии Kit из точных Git-коммитов, включая Kit 1.9.3 из sourceCommit выпуска Workflow Pilot 0.5.23 (`7279f9277cd03aa87c1bfad7a3ef00b9fb7ea97a`) Kit 1.9.4 из sourceCommit выпуска 0.5.24 (`00a0a64d81efe24ad8da76d249f494ecd3f99757`) Kit 1.9.5 из sourceCommit выпуска 0.5.27 (`305d6c8acf8f739f0aa670a8c15f90e72bbe3853`) Kit 1.9.6 из sourceCommit выпуска 0.5.28 (`6c5f996d1c60b16f81b1c569307fd8d4765a8a05`) и Kit 1.9.7 из sourceCommit выпуска 0.5.29 (`0cb25d783e28e3a48e3ec1c9bbd4b58c6d8a1972`). Эти архивы построены из Git tree без привязки к несуществующему тегу. Они содержат только код Kit и LICENSE; не содержат планов, настроек, секретов или runtime пользователя. Это тестовые данные, не установленный .harness нового проекта и не часть приложения.

Kit 1.10.4 взят из sourceCommit v0.5.40 (`c0bafac56d4c45a1f4c87ec090d0c252a3bef3dc`), роль 13; fixture проверяет переход без повторения действий.

manifest.json фиксирует repo, исходный ref, commit, версию и SHA-256. Проверка digest обязательна перед распаковкой в одноразовый fixture. История и теги донора в новый Git не импортируются. MIT LICENSE сохранён внутри каждого архива.
