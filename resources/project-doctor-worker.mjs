import fs from 'node:fs';
import { inspectProject, repairProject, publicReport } from './project-doctor/core.mjs';
try {
  const input = JSON.parse(fs.readFileSync(0, 'utf8'));
  if (!['inspect', 'repair'].includes(input.action)) throw new Error('Неизвестное действие доктора.');
  const report = input.action === 'repair' ? repairProject(input.workspace, input.fingerprint) : publicReport(inspectProject(input.workspace));
  process.stdout.write(JSON.stringify({ ok: true, ...report }) + '\n');
} catch (error) {
  process.stdout.write(JSON.stringify({ ok: false, code: error.code ?? 'DOCTOR_FAILED', message: error.message, backupPath: error.backupPath ?? null }) + '\n');
  process.exitCode = 1;
}
