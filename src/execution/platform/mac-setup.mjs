import path from 'node:path';
import {executeFile as execute} from '../commands/service.mjs';
// Avoid /usr/bin/git on an unprepared Mac: the shim can launch a system dialog.
export async function inspectMacGit(run = execute) {
  try {
    const { stdout } = await run('/usr/bin/xcode-select', ['-p'], { timeout: 5000 });
    const developer = stdout.trim();
    if (!path.isAbsolute(developer)) return false;
    const result = await run('/usr/bin/git', ['--version'], { timeout: 5000 });
    return /^git version \d+\./.test(result.stdout.trim());
  } catch { return false; }
}
export async function installMacGit(run = execute) {
  try { await run('/usr/bin/xcode-select', ['--install'], { timeout: 10000 }); }
  catch { throw Object.assign(new Error('Не удалось открыть установку Apple.'), { publicMessage: 'Не удалось открыть установку Apple. Проверьте «Системные настройки → Основные → Обновление ПО» и повторите проверку.' }); }
  // xcode-select requests installation but does not guarantee foreground activation.
  // LaunchServices reuses the system helper; no AppleScript or accessibility consent.
  try {
    await run('/usr/bin/open', ['-a', '/System/Library/CoreServices/Install Command Line Developer Tools.app'], { timeout: 10000 });
  } catch {
    return { warning: 'Установка Apple запущена, но её окно не удалось вывести вперёд. Сверните Web Pilot жёлтой кнопкой и подтвердите установку. После завершения вернитесь и нажмите «Проверить и продолжить».' };
  }
  return { warning: null };
}

