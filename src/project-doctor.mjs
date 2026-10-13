import path from 'node:path';
import { execFile } from 'node:child_process';

// Runs independently of the ChatGPT page and MCP connection.
export class ProjectDoctor {
  constructor({ setup, ensureServices }) { this.setup = setup; this.ensureServices = ensureServices; this.running = false; }
  async worker(workspace) {
    const node = await this.setup.node();
    return new Promise((resolve, reject) => {
      const child = execFile(node, [path.join(this.setup.resourceDir, 'project-doctor-worker.mjs')], {
        env: this.setup.environment, timeout: 120000, maxBuffer: 2 * 1024 * 1024, encoding: 'utf8', windowsHide: true,
      }, (error, stdout) => {
        let report;
        try { report = JSON.parse(stdout); } catch { reject(Object.assign(new Error('Доктор не завершил проверку. Повторите запуск.'), { code: error?.code ?? 'DOCTOR_OUTPUT' })); return; }
        if (!report.ok) reject(Object.assign(new Error(report.message), { code: report.code, backupPath: report.backupPath }));
        else resolve(report);
      });
      child.stdin.on('error', () => {}); child.stdin.end(JSON.stringify({ action: 'repair', workspace }));
    });
  }
  async run(workspace, onProgress = () => {}) {
    if (this.running) throw new Error('Доктор уже работает.');
    this.running = true;
    let report = { workspace, repairs: [], checks: [], issues: [], projectReady: false, servicesReady: false, backupPath: null };
    const progress = phase => onProgress({ ...report, phase });
    try {
      progress('repairing'); report = { ...report, ...await this.worker(workspace) };
      if (report.issues.length) return report;
      progress('verifying');
      let health = await this.setup.preview({ mode: 'existing', workspace: report.workspace });
      if (health.action === 'reconnect') {
        health = await this.setup.apply(health.token);
        report.repairs.push('Восстановлены локальные команды проекта');
      }
      report.checks = health.checks ?? []; report.projectReady = health.ready;
      report.issues = health.issues ?? [];
      if (!health.ready) {
        if (!report.issues.length) report.issues.push({ path: 'Подготовка проекта', reason: health.action === 'upgrade' ? 'Нужно обновить комплект через обычное подключение проекта.' : 'Проект пока не прошёл все проверки открытия.' });
        return report;
      }
      progress('services');
      try { await this.ensureServices(); report.servicesReady = true; report.checks.push({ label: 'Локальные инструменты и подключение', ok: true }); }
      catch (error) { report.checks.push({ label: 'Локальные инструменты и подключение', ok: false }); report.issues.push({ path: 'Подключение', reason: error.message, code: error.code }); }
      return report;
    } catch (error) {
      report.backupPath = error.backupPath ?? report.backupPath;
      report.issues.push({ path: 'Доктор проекта', reason: error.message, code: error.code }); return report;
    } finally { this.running = false; }
  }
}
