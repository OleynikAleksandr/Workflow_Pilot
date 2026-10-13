import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { check, WorkflowError, hash, safePath, contextPath, textFile } from './common.mjs';
import { gitExecutable, processEnvironment } from './platform.mjs';

export function run(executable, args, cwd, options = {}) {
  const result = spawnSync(executable, args, { cwd, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 30000,
    windowsHide: true, ...options, env: processEnvironment(cwd, options.env) });
  if ((result.error || result.status !== 0) && !options.allowFailure) {
    throw new WorkflowError('COMMAND_FAILED', 'Команда завершилась с ошибкой: ' + executable + ' ' + args[0], {
      status: result.status, reason: result.error?.message, output: String(result.stderr ?? result.stdout ?? '').slice(-6000),
    });
  }
  return result;
}
export const git = (root, args, options) => run(gitExecutable(root), ['--literal-pathspecs', '-c', 'core.quotePath=false', '-c', 'diff.external=', '-c', 'diff.autoRefreshIndex=false', ...args], root, options);
export const output = (root, args, options) => git(root, args, options).stdout.trim();
// Commit hooks run checks sequentially. Their enclosing process must allow the
// whole configured budget, plus Git/validation overhead, not one check's limit.
export const commitTimeout = (checks = []) => Math.max(600000,
  checks.reduce((total, item) => total + (item.timeout_ms ?? 30000), 0) + 60000);
export function repoRoot(cwd) {
  const r = git(cwd, ['rev-parse', '--show-toplevel'], { allowFailure: true });
  check(r.status === 0, 'NOT_GIT_REPOSITORY', 'Выберите папку Git-проекта.', { cwd });
  return fs.realpathSync(r.stdout.trim());
}
export function gitPath(root, name) { return output(root, ['rev-parse', '--path-format=absolute', '--git-path', name]); }
// Custom --git-path names may resolve to the common directory in a linked tree.
// Locks, journals and evidence belong to the individual Git administrative dir.
export const localPath = (root, name) => path.join(output(root, ['rev-parse', '--absolute-git-dir']), 'workflow-kit', name);
export function head(root) {
  const r = git(root, ['rev-parse', '--verify', 'HEAD'], { allowFailure: true });
  return r.status === 0 ? r.stdout.trim() : null;
}
export const splitZ = value => value.split('\0').filter(Boolean);
// Worktree changes by content. Git also lists a file whose bytes equal the index when only its stat data differ:
// another Git refreshed the index from a different view of the same folder (a VM mount, another user or OS),
// a backup restored the file, or it was touched. These commands never refresh the index (it is part of the
// commit candidate), so such an entry is confirmed by hashing the file. Before 1.5.6 every tracked file could
// appear changed, and the first private one (.codex/hooks.json) stopped commit --task with PRIVATE_CONTEXT.
function worktreeChanges(root) {
  const fields = splitZ(git(root, ['diff', '--no-ext-diff', '--no-textconv', '--no-renames', '--raw', '--no-abbrev', '-z']).stdout);
  const changed = [], unconfirmed = [];
  for (let i = 0; i + 1 < fields.length; i += 2) {
    const [oldMode, newMode, id, , status] = fields[i].slice(1).split(' ');
    const entry = { file: fields[i + 1], id, link: oldMode === '120000' };
    // Deletions, mode and type changes, conflicts and submodules are changes by themselves.
    if (status === 'M' && oldMode === newMode && /^(100|120)/.test(oldMode)) unconfirmed.push(entry); else changed.push(entry.file);
  }
  const files = unconfirmed.filter(entry => !entry.link);
  for (let i = 0; i < files.length; i += 100) {
    const chunk = files.slice(i, i + 100);
    // hash-object applies the same clean filters and line-ending rules as git add.
    const result = git(root, ['hash-object', '--', ...chunk.map(entry => entry.file)], { allowFailure: true });
    const ids = result.status === 0 ? result.stdout.split('\n').filter(Boolean) : [];
    chunk.forEach((entry, index) => { if (ids.length !== chunk.length || ids[index] !== entry.id) changed.push(entry.file); });
  }
  for (const entry of unconfirmed.filter(entry => entry.link)) {
    let target = null; try { target = fs.readlinkSync(path.join(root, entry.file)); } catch { /* replaced meanwhile: a change */ }
    const result = target === null ? null : git(root, ['hash-object', '--no-filters', '--stdin'], { input: target, allowFailure: true });
    if (result?.status !== 0 || result.stdout.trim() !== entry.id) changed.push(entry.file);
  }
  return [...new Set(changed)].sort();
}
export function paths(root, mode = 'worktree') {
  if (mode === 'untracked') return splitZ(git(root, ['ls-files', '--others', '--exclude-standard', '-z']).stdout);
  if (mode === 'tracked') return splitZ(git(root, ['ls-files', '-z']).stdout);
  if (mode === 'staged') return splitZ(git(root, ['diff', '--no-ext-diff', '--no-textconv', '--no-renames', '--name-only', '-z', '--cached']).stdout);
  return worktreeChanges(root);
}
export function allChanges(root) { return [...new Set([...paths(root, 'staged'), ...paths(root), ...paths(root, 'untracked')])].sort(); }
export function fileFingerprint(root, p) {
  const file = safePath(root, p);
  if (!fs.existsSync(file)) return 'DELETED';
  const st = fs.lstatSync(file);
  check(st.isFile(), 'UNSUPPORTED_FILE', 'Ожидается обычный файл: ' + p);
  check(st.size <= 16 * 1024 * 1024, 'FILE_TOO_LARGE', 'Файл слишком велик для контрольного снимка: ' + p);
  return hash(Buffer.concat([Buffer.from(String(st.mode & 0o777) + '\n'), fs.readFileSync(file)]));
}
export function snapshot(root, relevant = []) {
  const conflicts = splitZ(git(root, ['diff', '--name-only', '--diff-filter=U', '-z']).stdout);
  check(conflicts.length === 0, 'MERGE_CONFLICT', 'Сначала разрешите конфликты слияния.', { paths: conflicts });
  const staged = paths(root, 'staged'); const unstaged = paths(root); const untracked = paths(root, 'untracked');
  const index = gitPath(root, 'index');
  const files = {};
  for (const p of [...new Set(relevant)].sort()) files[p] = fileFingerprint(root, p);
  const data = { head: head(root), branch: output(root, ['symbolic-ref', '--short', '-q', 'HEAD'], { allowFailure: true }),
    index: fs.existsSync(index) ? hash(fs.readFileSync(index)) : null, staged, unstaged, untracked, files };
  return { ...data, fingerprint: hash(JSON.stringify(data)) };
}
export function diff(root, mode, selected) {
  if (!selected.length) return '';
  return git(root, ['diff', '--no-ext-diff', '--no-textconv', '--no-renames', '--no-color', ...(mode === 'staged' ? ['--cached'] : []), '--', ...selected]).stdout;
}
export function commitPaths(root, sha) {
  return splitZ(git(root, ['diff-tree', '--root', '--no-commit-id', '--name-only', '-r', '--no-renames', '-z', sha]).stdout);
}
// Exact commit revisions only; historical symlinks and private paths never become text sources.
export function documentText(root, document, { optional = false, referenceOnly = false } = {}) {
  const { path: file, revision = 'WORKTREE' } = document;
  contextPath(root, file);
  if (revision === 'WORKTREE') {
    if (optional && !fs.existsSync(path.join(root, file))) return null;
    if (referenceOnly) {
      check(fs.lstatSync(path.join(root,file)).isFile(), 'UNSUPPORTED_FILE', 'Ожидается обычный файл: ' + file);
      return '';
    }
    return textFile(root, file);
  }
  check(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(revision), 'CONTEXT_REVISION', 'Нужен точный SHA коммита: ' + revision);
  const type = git(root, ['cat-file', '-t', revision], {allowFailure:true});
  if (optional && type.status !== 0) return null;
  check(type.status === 0 && type.stdout.trim() === 'commit', 'CONTEXT_REVISION', 'Коммит контекста отсутствует: ' + revision);
  const entry = git(root, ['ls-tree', '-z', revision, '--', file]).stdout;
  if (optional && !entry) return null;
  check(entry, 'MISSING_FILE', 'Отсутствует документ: ' + revision + ':' + file);
  check(/^100[0-7]{3} blob /.test(entry), 'UNSUPPORTED_FILE', 'Исторический документ должен быть обычным файлом: ' + file);
  if (referenceOnly) return '';
  const oid = entry.slice(0, entry.indexOf('\t')).split(' ')[2];
  check(Number(git(root, ['cat-file','-s',oid]).stdout) <= 1024 * 1024, 'FILE_TOO_LARGE', 'Документ Git слишком велик: ' + file);
  const bytes = git(root, ['cat-file','blob',oid], {encoding:null}).stdout;
  check(!bytes.includes(0), 'BINARY_CONTEXT', 'Бинарный файл нельзя включить как текст: ' + file);
  return new TextDecoder('utf-8', {fatal:true}).decode(bytes);
}
export function isAncestor(root, from, to = 'HEAD') {
  return git(root, ['merge-base', '--is-ancestor', from, to], { allowFailure: true }).status === 0;
}
export function areAncestors(root, from, to) {
  const commits = [...new Set(from)];
  if (!commits.length) return true;
  if (commits.length === 1) return isAncestor(root, commits[0], to);
  // Git performs the graph walk, including merges and replacement refs.
  const result = git(root, ['rev-list', '--max-count=1', ...commits, '--not', to, '--'], { allowFailure: true });
  return result.status === 0 && result.stdout.trim() === '';
}
export function commitHistory(root, baseline, tip = 'HEAD') {
  if (!head(root)) return [];
  if (baseline) check(isAncestor(root, baseline, tip), 'BASELINE_MISMATCH', 'Baseline не принадлежит текущей истории.');
  const raw = git(root, ['log', '-z', '--format=%H%x00%P%x00%B%x00%(trailers:only,unfold)', baseline ? baseline + '..' + tip : tip]).stdout;
  const fields = raw.split('\0');
  if (fields.at(-1) === '') fields.pop();
  check(fields.length % 4 === 0, 'HISTORY_FORMAT', 'Git вернул неполную историю коммитов.');
  const history = [];
  for (let i = 0; i < fields.length; i += 4) {
    const [sha, parents, body, formatted] = fields.slice(i, i + 4);
    // Pretty trailers ignore the patch divider, whereas --parse stops there.
    // Keep Git's legacy interpretation for this uncommon commit-message form.
    const parsed = (/(?:^|\n)---/.test(body)
      ? git(root, ['interpret-trailers', '--parse'], { input: body }).stdout : formatted).trim();
    const trailers = {};
    for (const line of parsed.split('\n').filter(Boolean)) {
      const colon = line.indexOf(':'); if (colon < 0) continue;
      const key = line.slice(0, colon); (trailers[key] ??= []).push(line.slice(colon + 1).trim());
    }
    history.push({ sha, parents: parents.split(' ').filter(Boolean), body, trailers });
  }
  return history;
}
export function ensureIdleGit(root) {
  for (const name of ['MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'rebase-merge', 'rebase-apply']) {
    check(!fs.existsSync(gitPath(root, name)), 'GIT_OPERATION_ACTIVE', 'Завершите текущую Git-операцию: ' + name);
  }
}
export function identityReady(root) {
  return git(root, ['var', 'GIT_AUTHOR_IDENT'], { allowFailure: true }).status === 0;
}
