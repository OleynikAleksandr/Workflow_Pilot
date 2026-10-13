#!/usr/bin/env node
import { main } from './cli.mjs';
const result = await main(['install', ...process.argv.slice(2)]);
process.stdout.write(JSON.stringify(result.value, null, 2) + '\n');
process.exitCode = result.exitCode ?? 0;
