const listFields = 'number,title,state,labels,assignees,url';

const issueFields = `${listFields},body`;

const githubErrorMessages = [
  [/not found|enoent|no such file/i, 'GitHub CLI (gh) is not installed.'],
  [
    /not logged in|not authenticated|authentication failed|run gh auth login/i,
    'Sign in to GitHub with gh auth login.',
  ],
];

export const githubError = (error) => {
  const detail = errorDetail(error);

  return matchingErrorMessage(detail) ?? detail;
};

function errorDetail(error) {
  return error instanceof Error ? error.message : String(error);
}

function matchingErrorMessage(detail) {
  return githubErrorMessages.find(([pattern]) => pattern.test(detail))?.[1];
}

// The Tracker talks to GitHub only through the Server-owned `argo` API.
export function createGitHubTracker(argo, repository) {
  return {
    authStatus: () => run(argo, ['gh', 'auth', 'status']),
    listIssues: () => listIssues(argo, repository),
    getIssue: (number) => getIssue(argo, repository, number),
  };
}

async function listIssues(argo, repository) {
  const [open, closed] = await Promise.all(
    ['open', 'closed'].map((state) =>
      run(argo, listCommand(repository, state)),
    ),
  );

  return [
    ...mapIssueList(parseJson(open, 'GitHub open issue list')),
    ...mapIssueList(parseJson(closed, 'GitHub closed issue list')),
  ];
}

const listCommand = (repository, state) => [
  'gh',
  'issue',
  'list',
  '--repo',
  repository,
  '--state',
  state,
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

export function githubRepositoryFromOrigin(originUrl) {
  if (typeof originUrl !== 'string') return null;

  return githubRepositoryFromMatch(originUrl);
}

function githubRepositoryFromMatch(originUrl) {
  const match =
    /^(?:git@github\.com:|https:\/\/github\.com\/|ssh:\/\/(?:git@)?github\.com\/)([^/?#]+)\/([^/?#]+?)(?:\.git)?\/?$/i.exec(
      originUrl,
    );

  const [, owner, name] = match ?? [];

  return validRepositoryParts(owner, name);
}

function validRepositoryParts(owner, name) {
  if (hasInvalidRepositoryParts(owner, name)) return null;

  return `${owner}/${name}`;
}

function hasInvalidRepositoryParts(owner, name) {
  const validOwner = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(
    owner ?? '',
  );

  const validName = /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name ?? '');

  return ![owner, name, validOwner, validName].every(Boolean);
}
