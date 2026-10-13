#!/usr/bin/env node
import { main } from '../.harness/kit/cli.mjs';
const r = await main();
process.stdout.write(r.json ? JSON.stringify(r.value, null, 2) + '\n' : r.value + '\n');
process.exitCode = r.exitCode ?? 0;
