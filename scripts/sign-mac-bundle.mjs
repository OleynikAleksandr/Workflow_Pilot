import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { sign } from '@electron/osx-sign';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BUNDLE_ID = 'com.oleynik.WorkflowPilot';
const APP = 'Workflow Pilot.app';
const run = (command, args) => execFileSync(command, args, { encoding: 'utf8', timeout: 120000 });
const fail = (code, message) => Object.assign(new Error(message), { code });

export async function resolveMacSigning({
  root = ROOT, identity,
  platform = process.platform, execute = run,
} = {}) {
  if (platform !== 'darwin') throw fail('MAC_SIGNING_PLATFORM', 'Подпись macOS требует macOS.');
  if (identity === undefined) {
    const config = path.join(root, '.harness/runtime/mac-signing.json');
    let stat;
    try { stat = await fs.lstat(config); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      throw fail('MAC_SIGNING_IDENTITY_REQUIRED',
        'Выберите сертификат Apple Development: задайте WORKFLOW_PILOT_MAC_SIGNING_IDENTITY (SHA-1 сертификата) или identity в .harness/runtime/mac-signing.json.');
    }
    if (!stat.isFile() || stat.isSymbolicLink()) {
      throw fail('MAC_SIGNING_CONFIG_INVALID', 'Конфигурация подписи должна быть обычным локальным файлом.');
    }
    try { identity = JSON.parse(await fs.readFile(config, 'utf8'))?.identity; }
    catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      throw fail('MAC_SIGNING_CONFIG_INVALID', 'Некорректный JSON конфигурации подписи.');
    }
  }
  if (typeof identity !== 'string' || !/^[a-fA-F0-9]{40}$/.test(identity)) {
    throw fail('MAC_SIGNING_IDENTITY_REQUIRED', 'Укажите точный SHA-1 выбранного сертификата Apple Development (40 шестнадцатеричных символов).');
  }
  const hash = identity.toUpperCase();
  const output = execute('/usr/bin/security', ['find-identity', '-v', '-p', 'codesigning']);
  const identities = [...output.matchAll(/^\s*\d+\)\s+([a-fA-F0-9]{40})\s+"([^"]+)"\s*$/gm)]
    .filter(match => match[1].toUpperCase() === hash);
  const names = [...new Set(identities.map(match => match[2]))];
  if (names.length !== 1) {
    throw fail('MAC_SIGNING_IDENTITY_UNKNOWN', 'Выбранный сертификат отсутствует среди действительных signing identities в Keychain.');
  }
  if (!names[0].startsWith('Apple Development: ')) {
    throw fail('MAC_SIGNING_IDENTITY_TYPE', 'Для локальной подписи выберите сертификат Apple Development.');
  }
  return { identity: hash, name: names[0] };
}

export async function signMacBundle({
  root = ROOT, app, identity,
  platform = process.platform, execute = run, signBundle = sign,
} = {}) {
  root = path.resolve(root);
  const selected = await resolveMacSigning({ root, identity, platform, execute });
  app = path.resolve(app ?? path.join(root, '.harness/runtime/build/Workflow Pilot-darwin-arm64', APP));
  const stat = await fs.lstat(app);
  if (!stat.isDirectory() || stat.isSymbolicLink() || !app.endsWith('.app')) {
    throw fail('MAC_SIGNING_BUNDLE_INVALID', 'Подписываемая сборка должна быть обычной папкой .app.');
  }
  const plist = path.join(app, 'Contents/Info.plist');
  const field = key => execute('/usr/libexec/PlistBuddy', ['-c', 'Print :' + key, plist]).trim();
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
  if (field('CFBundleIdentifier') !== BUNDLE_ID) {
    throw fail('MAC_SIGNING_BUNDLE_INVALID', 'У сборки неверный bundle identifier.');
  }
  if (field('CFBundleShortVersionString') !== pkg.version) {
    throw fail('MAC_SIGNING_BUNDLE_INVALID', 'Версия сборки не совпадает с package.json.');
  }
  const vendorTools = path.join(app, 'Contents/Resources/mac-tools');
  await signBundle({
    app, identity: selected.identity, platform: 'darwin', type: 'development',
    version: pkg.devDependencies.electron, identityValidation: true,
    preAutoEntitlements: false, preEmbedProvisioningProfile: false, strictVerify: true,
    // Keep the verified upstream Node/uv binaries and pinned hashes unchanged; the app seals these resources.
    ignore: file => file === vendorTools || file.startsWith(vendorTools + path.sep),
    // Local development signing uses Electron's normal entitlements, without notarization.
    optionsForFile: () => ({ hardenedRuntime: false, timestamp: 'none' }),
  });
  return { app, bundleId: BUNDLE_ID, version: pkg.version, ...selected };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 1 || args[0] !== '--check')) {
    throw new Error('Использование: node scripts/sign-mac-bundle.mjs [--check]');
  }
  const selection = { identity: process.env.WORKFLOW_PILOT_MAC_SIGNING_IDENTITY };
  const result = args[0] === '--check' ? await resolveMacSigning(selection) : await signMacBundle(selection);
  if (args[0] !== '--check') {
    const receipt = path.join(ROOT, '.harness/runtime/mac-signing-receipt.json');
    await fs.mkdir(path.dirname(receipt), { recursive: true });
    await fs.writeFile(receipt, JSON.stringify(result, null, 2) + '\n');
  }
  console.log(JSON.stringify(result, null, 2));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
