import {spawnSync} from 'node:child_process';
import {stageChatgptPlugin} from './stage-chatgpt-plugin.mjs';

await stageChatgptPlugin();
const result = spawnSync(process.execPath, ['--test', 'tests/pip-probe.test.mjs'],
  {stdio: 'inherit', env: {...process.env, PYTHONDONTWRITEBYTECODE: '1'}});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
