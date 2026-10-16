# Third-party components

Workflow Pilot's MIT license does not replace the licenses of bundled components.
Original licenses/notices are retained in the Electron distribution and component
archives. Additional pinned texts and the replaceable python-xlib source archive
are in resources/vendor-notices; manifest.json records their upstream URL/hash.

| Component | Version/source | Notices |
| --- | --- | --- |
| Electron/Chromium | https://github.com/electron/electron/tree/v44.5.1 | LICENSE and LICENSES.chromium.html in each distribution |
| Node | https://nodejs.org/dist/v24.21.0/ | LICENSE in the Node payload |
| CPython | https://github.com/python/cpython/tree/v3.13.9 | python/lib/python3.13/LICENSE.txt and retained bundled dependency licenses |
| Python standalone build | https://github.com/astral-sh/python-build-standalone/releases/tag/20251120 | Original archive contents retained |
| uv | https://github.com/astral-sh/uv/tree/0.9.13 (macOS/Linux); https://github.com/astral-sh/uv/tree/0.12.12 (Windows) | MIT/Apache-2.0 texts in vendor-notices |
| Codex | https://github.com/openai/codex/tree/rust-v0.162.1 | Apache-2.0 LICENSE and NOTICE in vendor-notices |
| tunnel-client | https://github.com/openai/tunnel-client/tree/v0.0.14 | Original LICENSE/NOTICE |
| ripgrep | https://github.com/BurntSushi/ripgrep/tree/15.2.0 | MIT/Unlicense/COPYING in archive |
| MinGit | https://github.com/git-for-windows/git/releases/tag/v2.55.0.windows.5 | GPL and dependency licenses in vendor archive; corresponding source available at the release |
| python-xlib | https://github.com/python-xlib/python-xlib/tree/0.33 | LGPLv2+, license and exact unmodified source archive in vendor-notices; normal replaceable Python module |
| qrcode-svg | https://github.com/papnkukn/qrcode-svg (npm 1.1.0, QR code of the remote access address) | MIT LICENSE in app.asar node_modules/qrcode-svg |
| mcp/Pillow/mss and dependencies | tools/codex-app-server-mcp/requirements-linux.lock | Installed wheels retain their dist-info/licenses; hashes pin installation |

The historical Windows-Codex-Local-2026-09-10.zip is an unchanged, verified
vendor carrier. Workflow Pilot uses only its uv/tunnel-client/ripgrep/MinGit
archives and notices, never its old server or installer.
