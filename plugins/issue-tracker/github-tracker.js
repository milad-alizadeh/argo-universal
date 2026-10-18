const listFields = 'number,title,state,labels,assignees,url';

const issueFields = `${listFields},body`;

// The Tracker talks to GitHub only through the Server-owned `argo` API.
export function createGitHubTracker(argo) {
  return {
    authStatus: () => run(argo, ['gh', 'auth', 'status']),
    listIssues: ({ repository }) => listIssues(argo, repository),
    getIssue: ({ repository, number }) => getIssue(argo, repository, number),
    setStatus: (input) => setStatus(argo, input),
  };
}

async function listIssues(argo, repository) {
  const output = await run(argo, listCommand(repository));

  return mapIssueList(parseJson(output, 'GitHub issue list'));
}

const listCommand = (repository) => [
  'gh',
  'issue',
  'list',
  '--repo',
  repository,
  '--state',
  'all',
  '--limit',
  '50',
  '--json',
  listFields,
];

function mapIssueList(issues) {
  if (!Array.isArray(issues))
    throw new Error('GitHub returned an invalid Issue list.');

  return issues.map(mapIssue);
}

async function getIssue(argo, repository, number) {
  const output = await run(argo, [
    'gh',
    'issue',
    'view',
    issueNumber(number),
    '--repo',
    repository,
    '--json',
    issueFields,
  ]);

  return mapIssue(parseJson(output, 'GitHub Issue'));
}

async function setStatus(argo, { repository, number, status }) {
  const action = statusAction(status);
  await run(argo, [
    'gh',
    'issue',
    action,
    issueNumber(number),
    '--repo',
    repository,
  ]);
}

function statusAction(status) {
  if (status === 'open') return 'reopen';

  if (status === 'closed') return 'close';

  throw new Error(`Unsupported Issue status: ${status}`);
}

async function run(argo, argv) {
  const result = await argo.process.run(argv);

  rejectIncomplete(argv, result);
  rejectFailure(argv, result);

  return result.stdout;
}

function rejectIncomplete(argv, result) {
  if (result.timedOut) throw new Error(`gh ${argv[1]} timed out.`);

  if (result.truncated)
    throw new Error(`gh ${argv[1]} exceeded the output cap.`);
}

function rejectFailure(argv, result) {
  if (result.exitCode === 0) return;

  const detail = result.stderr.trim();
  throw new Error(detail || `gh ${argv[1]} exited with ${result.exitCode}.`);
}

function parseJson(output, description) {
  try {
    return JSON.parse(output);
  } catch {
    throw new Error(`${description} was not valid JSON.`);
  }
}

function mapIssue(issue) {
  if (!validIssue(issue)) throw new Error('GitHub returned an invalid Issue.');

  return {
    number: issue.number,
    title: issue.title,
    status: issue.state.toLowerCase(),
    body: typeof issue.body === 'string' ? issue.body : '',
    url: issue.url,
    labels: names(issue.labels),
    assignees: names(issue.assignees, 'login'),
  };
}

const issueChecks = [
  (issue) => Number.isInteger(issue.number),
  (issue) => typeof issue.title === 'string',
  (issue) => ['OPEN', 'CLOSED'].includes(issue.state),
  (issue) =>
    typeof issue.url === 'string' &&
    issue.url.startsWith('https://github.com/'),
];

function validIssue(issue) {
  return Boolean(issue && issueChecks.every((check) => check(issue)));
}

function names(values, key = 'name') {
  if (!Array.isArray(values)) return [];

  return values.flatMap((value) =>
    value && typeof value[key] === 'string' ? [value[key]] : [],
  );
}

function issueNumber(number) {
  if (!Number.isSafeInteger(number) || number < 1)
    throw new Error('Issue number must be a positive integer.');

  return String(number);
}
