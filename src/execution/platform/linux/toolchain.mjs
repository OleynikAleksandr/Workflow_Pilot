// Versions and upstream archive digests verified in migration-platforms.md.
export const LINUX_ASSETS = Object.freeze([
  {id:'node',version:'24.21.0',url:'https://nodejs.org/dist/v24.21.0/node-v24.21.0-linux-x64.tar.xz',sha256:'fd8e59d5a511510f6a298afb548f18c7d2b1be404d8b4a27d94fbe49f56cb2d6',binary:'node'},
  {id:'uv',version:'0.9.13',url:'https://github.com/astral-sh/uv/releases/download/0.9.13/uv-x86_64-unknown-linux-gnu.tar.gz',sha256:'c45a44144bf23a2182e143227b4ad0bbe41a2bb7161a637c02e968906af53fd1',binary:'uv'},
  {id:'python',version:'3.13.9',url:'https://github.com/astral-sh/python-build-standalone/releases/download/20251120/cpython-3.13.9%2B20251120-x86_64-unknown-linux-gnu-install_only_stripped.tar.gz',sha256:'1bc9a94ab2425fb6ae58e45f69cab61647759b57895649701390822d976fa923',binary:'python3.13'},
  {id:'codex',version:'0.162.1',url:'https://github.com/openai/codex/releases/download/rust-v0.162.1/codex-x86_64-unknown-linux-musl.tar.gz',sha256:'86f268d81b898f3e144c5ecff2ad2fda2c5802e042d6195b72538fe0fa125057',binary:'codex-x86_64-unknown-linux-musl'},
  {id:'rg',version:'15.2.0',url:'https://github.com/BurntSushi/ripgrep/releases/download/15.2.0/ripgrep-15.2.0-x86_64-unknown-linux-musl.tar.gz',sha256:'33e15bcf1624b25cdd2a55813a47a2f95dbe126268203e76aa6a585d1e7b149c',binary:'rg'},
  {id:'tunnel_client',version:'v0.0.14',url:'https://github.com/openai/tunnel-client/releases/download/v0.0.14/tunnel-client-v0.0.14-linux-amd64.zip',sha256:'15bd17e805cad39d412199115bb9e10a978dd35258a114cdf25dd2ae6681c7d3',binary:'tunnel-client'},
]);
