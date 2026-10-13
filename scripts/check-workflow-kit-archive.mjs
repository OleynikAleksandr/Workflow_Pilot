// Check workflow-kit-archive: the former WorkflowKit repository is archived on GitHub (read-only),
// its README opens with the pointer to packages/workflow-kit of this repository, and its main branch
// ends with the last commit made before archiving. The local folder of that repository is not touched.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const FORMER_REPOSITORY = 'OleynikAleksandr/WorkflowKit';
// The README commit of the plan of that repository, pushed before archiving (T009 of release 0.6.96).
export const LAST_COMMIT = '217c4a34739a44de2ea517ff459c20dd2e525e33';
export const NEW_HOME = 'https://github.com/OleynikAleksandr/Project-Web-Pilot/tree/main/packages/workflow-kit';

function githubToken() {
  const output = execFileSync('git', ['credential', 'fill'], { input: 'protocol=https\nhost=github.com\n\n', encoding: 'utf8', timeout: 10000 });
  const values = Object.fromEntries(output.trim().split(/\r?\n/).map(line => {
    const index = line.indexOf('=');
    return index < 0 ? [line, ''] : [line.slice(0, index), line.slice(index + 1)];
  }));
  if (!values.password) throw new Error('GitHub credential helper did not return a token');
  return values.password;
}

async function github(pathname, accept = 'application/vnd.github+json') {
  const response = await fetch('https://api.github.com' + pathname, { headers: { Authorization: 'Bearer ' + githubToken(),
    Accept: accept, 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'Project-Web-Pilot-release-check' } });
  const text = await response.text();
  if (!response.ok) throw new Error(`GitHub API ${response.status} for ${pathname}: ${text.slice(0, 200)}`);
  return accept.endsWith('raw') ? text : JSON.parse(text);
}

export async function checkWorkflowKitArchive() {
  const repository = await github('/repos/' + FORMER_REPOSITORY);
  assert.equal(repository.archived, true, 'the former repository must be archived (read-only)');
  const head = await github(`/repos/${FORMER_REPOSITORY}/commits/${repository.default_branch}`);
  assert.equal(head.sha, LAST_COMMIT, 'the main branch ends with the pointer commit');
  const readme = await github(`/repos/${FORMER_REPOSITORY}/readme?ref=${LAST_COMMIT}`, 'application/vnd.github.raw');
  const first = readme.split('\n')[0];
  assert.ok(first.includes(NEW_HOME) && first.includes('packages/workflow-kit'), 'the first README line points to the new home: ' + first);
  return { repository: FORMER_REPOSITORY, archived: true, defaultBranch: repository.default_branch, lastCommit: head.sha,
    lastCommitDate: head.commit?.committer?.date ?? null, readmeFirstLine: first };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  checkWorkflowKitArchive().then(result => process.stdout.write(JSON.stringify(result, null, 2) + '\n'))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
