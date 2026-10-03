// PROTOTYPE: hand-written fixtures. Wording comes from old Argo's Claude and Codex recordings, which are too short to replay whole.
import type { AgentCatalog, ChangedFile, FeedRow, Issue, IssueView, Project, Session, Shell, Subagent } from './types';

export const CATALOG: AgentCatalog[] = [
  {
    id: 'claude',
    name: 'Claude',
    installed: true,
    signedIn: true,
    modes: [
      { id: 'manual', name: 'Manual', icon: 'hand', tone: 'safe', description: 'Ask before making changes' },
      { id: 'accept-edits', name: 'Accept edits', icon: 'file-pen', tone: 'moderate', description: 'Edit files without asking' },
      { id: 'plan', name: 'Plan', icon: 'map', tone: 'planning', description: 'Explore and propose a plan first' },
      { id: 'auto', name: 'Auto', icon: 'sparkles', tone: 'moderate', description: 'Claude handles permission decisions' },
      { id: 'bypass', name: 'Bypass', icon: 'shield-off', tone: 'dangerous', description: 'Run without permission checks' },
    ],
    models: [
      { id: 'opus-5', name: 'Opus 5', efforts: ['Low', 'Medium', 'High', 'Extra high', 'Max'], images: true },
      { id: 'sonnet-5', name: 'Sonnet 5', efforts: ['Low', 'Medium', 'High'], images: true },
    ],
  },
  {
    id: 'codex',
    name: 'Codex',
    installed: true,
    signedIn: true,
    modes: [
      { id: 'ask-first', name: 'Ask first', icon: 'hand', tone: 'safe', description: 'Read only until you approve' },
      { id: 'plan', name: 'Plan', icon: 'map', tone: 'planning', description: 'Explore and propose a plan first' },
      { id: 'approve-safely', name: 'Approve safely', icon: 'shield-check', tone: 'moderate', description: 'Run safe commands, ask for the rest' },
      { id: 'full-access', name: 'Full access', icon: 'shield-off', tone: 'dangerous', description: 'Run anything, with network access' },
    ],
    models: [
      { id: 'gpt-6-astra', name: 'GPT-6-Astra', efforts: ['Low', 'Medium', 'High', 'Extra high', 'Ultra'], images: true },
      { id: 'gpt-6-sol', name: 'GPT-6-Sol', efforts: ['Low', 'Medium', 'High'], images: true },
      { id: 'gpt-5.5', name: 'GPT-5.5', efforts: ['Low', 'Medium', 'High'], images: false },
    ],
  },
];

const diffAdapters = [
  '@@ -41,9 +41,11 @@ export function createSessionMachine(',
  '   on: {',
  "-    'agent.exited': { target: 'idle' },",
  "+    'agent.exited': [",
  "+      { guard: 'turnOpen', target: 'failed' },",
  "+      { target: 'idle' },",
  '+    ],',
  '   },',
  ' ',
  '-  // The Turn ends when the process exits.',
  '+  // The Turn ends on the stop reason, not on process exit.',
];

const changedFiles: ChangedFile[] = [
  { path: 'packages/agents/claude/src/session-machine.ts', status: 'modified', added: 11, removed: 9, diff: diffAdapters },
  {
    path: 'packages/agents/claude/src/session-machine.test.ts',
    status: 'modified',
    added: 24,
    removed: 2,
    diff: ['@@ -88,2 +88,24 @@', "+  it('fails an open Turn when the CLI exits', async () => {", '+    const actor = start();', "+    actor.send({ type: 'agent.exited', code: 1 });", "+    expect(actor.getSnapshot().value).toBe('failed');", '+  });'],
  },
  {
    path: 'apps/client/src/feed/feed-inline-markdown.tsx',
    status: 'added',
    added: 27,
    removed: 0,
    diff: ['@@ -0,0 +1,27 @@', "+import { Text } from 'react-native';", '+', '+// Renders `code` and **bold** inside one line of Feed text.', '+export function FeedInlineMarkdown({ text }: { text: string }) {'],
  },
];

const explore: Subagent = {
  id: 'sa1',
  name: 'Explore',
  state: 'done',
  model: 'haiku-4.5',
  seconds: 38,
  tokens: 18_400,
  prompt: 'Report each Agent adapter’s process ownership, with file paths.',
  rows: [
    { type: 'tool', id: 'sa1t1', kind: 'search', status: 'done', query: 'spawn(', path: 'packages/agents' },
    { type: 'tool', id: 'sa1t2', kind: 'read', status: 'done', path: 'packages/agents/claude/src/process.ts' },
    { type: 'tool', id: 'sa1t3', kind: 'read', status: 'done', path: 'packages/agents/codex/src/app-server.ts' },
    { type: 'message', id: 'sa1m', text: 'Claude spawns one CLI per Turn in `process.ts`. Codex keeps one app-server for the Session in `app-server.ts` and never sends `agent.exited` mid-Turn.' },
  ],
};

const liveSubagents: Subagent[] = [
  {
    id: 'ls1',
    name: 'Explore',
    state: 'running',
    model: 'haiku-4.5',
    seconds: 52,
    tokens: 9_800,
    prompt: 'Find every place the App applies a Feed append, and how it checks the offset.',
    rows: [
      { type: 'tool', id: 'ls1t1', kind: 'search', status: 'done', query: 'applyAppend', path: 'apps/client' },
      { type: 'tool', id: 'ls1t2', kind: 'read', status: 'done', path: 'apps/client/src/feed/feed-store.ts' },
      { type: 'thought', id: 'ls1th', title: 'Checking the offset guard', text: 'The store drops an append when `off` is past the field length, but never asks for the row again.', seconds: 4 },
      { type: 'tool', id: 'ls1t3', kind: 'read', status: 'running', path: 'apps/client/src/feed/use-feed.ts' },
    ],
  },
  {
    id: 'ls2',
    name: 'Test writer',
    state: 'running',
    model: 'sonnet-5',
    seconds: 31,
    tokens: 6_200,
    prompt: 'Write a projector test where two appends arrive in the wrong order.',
    rows: [
      { type: 'tool', id: 'ls2t1', kind: 'read', status: 'done', path: 'apps/server/src/feed/projector.test.ts' },
      { type: 'tool', id: 'ls2t2', kind: 'edit', status: 'running', path: 'apps/server/src/feed/projector.test.ts', diff: { added: 14, removed: 0, lines: ['@@ -40,0 +40,14 @@', "+  it('refetches a row when an append skips ahead', async () => {", '+    const feed = project([row(1), append(1, 12, "late")]);', "+    expect(feed.refetched).toEqual(['1']);", '+  });'] } },
    ],
  },
  {
    id: 'ls3',
    name: 'Explore',
    state: 'done',
    model: 'haiku-4.5',
    seconds: 19,
    tokens: 4_100,
    prompt: 'Which ADR covers how the Server streams Feed rows?',
    rows: [
      { type: 'tool', id: 'ls3t1', kind: 'search', status: 'done', query: 'Feed', path: 'docs/adr' },
      { type: 'message', id: 'ls3m', text: 'ADR 0006 covers the Feed stream: rows go out as ACP-style updates, and appends carry an offset.' },
    ],
  },
];

const liveShells: Shell[] = [
  {
    id: 'sh1',
    label: 'Feed tests in watch mode',
    command: 'pnpm --filter @repo/server test feed --watch',
    state: 'running',
    seconds: 64,
    output: [' RERUN  src/feed/projector.ts', ' ✓ appends text at the right offset', ' ✓ refetches a row on a gap', ' Tests  14 passed (14)', ' Waiting for file changes...'],
  },
  {
    id: 'sh2',
    command: 'pnpm --filter @repo/server typecheck',
    state: 'done',
    seconds: 7,
    output: ['> tsc --noEmit -p .', 'Done in 6.8s'],
  },
];

const architectureSubagents: Subagent[] = ['Server', 'Electron shell', 'Expo app', 'Agents', 'Feed', 'Git', 'Issues', 'Atlas', 'Settings', 'tRPC', 'Machines', 'Tests'].map((area, index) => ({
  id: `as${index}`,
  name: 'Explore',
  state: index === 7 ? 'failed' : 'done',
  model: 'haiku-4.5',
  seconds: 20 + index * 7,
  tokens: 8_000 + index * 1_300,
  prompt: `Map the ${area} code: entry points, main modules, and what it talks to.`,
  rows: index === 7 ? [{ type: 'notice', id: `as${index}n`, level: 'error', text: 'Stopped: no Atlas code yet.' }] : [{ type: 'tool', id: `as${index}t`, kind: 'list', status: 'done', path: '.' }, { type: 'message', id: `as${index}m`, text: `The ${area} code is mapped. Its entry point and modules are in the architecture notes.` }],
}));

const surveyFeed: FeedRow[] = [
  { type: 'user', id: 'u1', text: 'Survey the adapters, then fix the bug. The Session keeps showing Running after the CLI exits.' },
  { type: 'thought', id: 'th1', title: 'Finding where Running comes from', text: 'The list shows Running while the Session machine is in `turn`. If the CLI exits without a result line, nothing moves it out. I should read the machine and the adapter that watches the process.', seconds: 6 },
  { type: 'tool', id: 't1', kind: 'search', status: 'done', query: 'agent.exited', path: 'packages/agents', seconds: 1 },
  { type: 'tool', id: 't2', kind: 'read', status: 'done', path: 'packages/agents/claude/src/session-machine.ts', seconds: 1 },
  { type: 'tool', id: 't3', kind: 'read', status: 'done', path: 'packages/agents/codex/src/session-machine.ts', seconds: 1 },
  { type: 'tool', id: 't4', kind: 'list', status: 'done', path: 'packages/agents/claude/src', seconds: 1 },
  { type: 'message', id: 'm1', text: 'Both adapters treat process exit as the end of a Turn. I’ll ask a Subagent to map each adapter’s process ownership while I reproduce the bug.' },
  { type: 'subagent', id: explore.id, name: explore.name, state: 'done', prompt: explore.prompt, rows: explore.rows },
  { type: 'tool', id: 't5', kind: 'execute', status: 'failed', command: 'pnpm --filter @repo/agents test session-machine', exitCode: 1, seconds: 14, output: [' ✓ starts a Turn on send (4 ms)', ' ✓ ends a Turn on end_turn (3 ms)', ' ✗ fails an open Turn when the CLI exits (6 ms)', "   Expected: 'failed'", "   Received: 'idle'", '', ' Tests  1 failed | 22 passed (23)', ' Duration  1.42s'] },
  { type: 'tool', id: 't6', kind: 'edit', status: 'done', path: 'packages/agents/claude/src/session-machine.ts', diff: { added: 11, removed: 9, lines: diffAdapters } },
  { type: 'tool', id: 't7', kind: 'edit', status: 'done', path: 'packages/agents/claude/src/session-machine.test.ts', diff: { added: 24, removed: 2, lines: changedFiles[1]!.diff } },
  { type: 'tool', id: 't8', kind: 'execute', status: 'done', command: 'pnpm --filter @repo/agents test session-machine', exitCode: 0, seconds: 9, output: [' ✓ fails an open Turn when the CLI exits (5 ms)', '', ' Tests  23 passed (23)', ' Duration  1.38s'] },
  { type: 'compaction', id: 'c1', seconds: 12 },
  { type: 'tool', id: 't9', kind: 'edit', status: 'done', path: 'apps/client/src/feed/feed-inline-markdown.tsx', diff: { added: 27, removed: 0, created: true, lines: changedFiles[2]!.diff } },
  { type: 'tool', id: 't10', kind: 'execute', status: 'done', command: 'pnpm biome check packages/agents', exitCode: 0, seconds: 2, output: ['Checked 41 files in 38ms. No fixes applied.'] },
  { type: 'message', id: 'm2', text: 'Fixed. The Claude Session machine now fails an open Turn when the CLI exits before a stop reason, so the list shows **Failed** and not Running.\n\n- `session-machine.ts`: `agent.exited` checks `turnOpen` first.\n- Added a test for the exit-mid-Turn case; all 23 pass.\n\nCodex never hits this path, because its app-server outlives the Turn.' },
  { type: 'turn-end', id: 'te1', seconds: 134 },
  { type: 'user', id: 'u2', text: 'Now delete the old process watcher and its fixtures.' },
  { type: 'thought', id: 'th2', title: 'Removing the watcher', text: '`process-watcher.ts` is only imported by the old adapter. Its fixtures live under `mocks/cli/claude/fixtures/watcher/`.', seconds: 3 },
  { type: 'tool', id: 't11', kind: 'search', status: 'done', query: 'process-watcher', path: '.', seconds: 1 },
  { type: 'tool', id: 't12', kind: 'execute', status: 'running', description: 'Delete the old watcher and its fixtures', command: 'rm -r packages/agents/claude/src/process-watcher.ts mocks/cli/claude/fixtures/watcher' },
];

const codexFeed: FeedRow[] = [
  { type: 'user', id: 'cu1', text: 'Run Codex check' },
  { type: 'message', id: 'cm1', text: 'I’ll inspect the repository’s available check/test commands, then run the most appropriate Codex check and report the result.' },
  { type: 'tool', id: 'ct1', kind: 'execute', status: 'done', readOnly: true, command: "pwd && rg --files -g '!*node_modules*' -g '!*.lock' | head -80", exitCode: 0, seconds: 1, output: ['/Users/x/project-codex'] },
  { type: 'tool', id: 'ct2', kind: 'list', status: 'done', path: '.', seconds: 1 },
  { type: 'thought', id: 'cth1', title: 'Checking for a test command', text: 'No package.json, pyproject.toml or Makefile. The repository is empty.', seconds: 4 },
  { type: 'message', id: 'cm2', text: 'The workspace is an empty Git repository with no source files, manifests, or test configuration, so there’s no project-specific test command to run. I’m doing the remaining repository-level sanity check now.' },
  { type: 'tool', id: 'ct3', kind: 'execute', status: 'done', command: 'git status --short --branch && git log -1 --oneline 2>/dev/null || true && git fsck --no-progress --full', exitCode: 0, seconds: 6, output: ['## No commits yet on main', 'xcodebuild: warning: unable to find utility "xctrace"', 'xcodebuild: warning: unable to find utility "xctrace"', 'xcodebuild: warning: unable to find utility "xctrace"', 'Checking object directories: done.', 'Checking connectivity: done.'] },
  { type: 'message', id: 'cm3', text: 'Codex check complete:\n\n- The repository is empty.\n- `main` is clean and unborn.\n- There are no commits.\n- `git fsck` found no integrity issues.' },
  { type: 'turn-end', id: 'cte1', seconds: 25 },
  { type: 'user', id: 'cu2', text: 'Continue the check' },
  { type: 'tool', id: 'ct4', kind: 'execute', status: 'failed', command: 'git status --short --branch && git log --oneline -5 && git branch -a', exitCode: 128, seconds: 1, output: ["fatal: your current branch 'main' does not have any commits yet"] },
  { type: 'notice', id: 'cn1', level: 'error', text: 'Codex stopped: the app-server closed the connection (exit 1).' },
];

export const LIVE_SCRIPT: { activity: string; row: FeedRow }[] = [
  { activity: 'Reading files', row: { type: 'tool', id: 'l1', kind: 'read', status: 'running', path: 'apps/server/src/feed/projector.ts' } },
  { activity: 'Searching for row.append', row: { type: 'tool', id: 'l2', kind: 'search', status: 'running', query: 'row.append', path: 'apps/server' } },
  { activity: 'Thinking', row: { type: 'thought', id: 'l3', title: 'Checking the append offset', text: 'The App applies an append only if `off` equals its field length.', seconds: 3 } },
  { activity: 'Running pnpm test feed', row: { type: 'tool', id: 'l4', kind: 'execute', status: 'running', command: 'pnpm --filter @repo/server test feed', output: [' ✓ appends text at the right offset', ' ✓ refetches a row on a gap', ' Tests  14 passed (14)'] } },
  { activity: 'Editing projector.ts', row: { type: 'tool', id: 'l5', kind: 'edit', status: 'running', path: 'apps/server/src/feed/projector.ts', diff: { added: 6, removed: 2, lines: ['@@ -120,2 +120,6 @@', '-  emit(append)', '+  if (append.off !== length) {', '+    return refetch(row.id);', '+  }', '+  emit(append)'] } } },
  { activity: 'Writing', row: { type: 'message', id: 'l6', text: 'The projector now refetches a row when an append arrives at the wrong offset. I’m running the full Feed suite next.' } },
];

const liveFeed: FeedRow[] = [
  { type: 'user', id: 'lu1', text: 'Make the Feed projector refetch a row when an append arrives out of order, then run the Feed tests.' },
  { type: 'thought', id: 'lth1', title: 'Reading the projector', text: 'Start with `projector.ts` and the append path.', seconds: 2 },
];

const base = {
  unread: false,
  archived: false,
  checkout: 'worktree' as const,
  contextUsed: 0.19,
  plan: [],
  changedFiles: [],
  subagents: [] as Subagent[],
  shells: [] as Shell[],
  feed: [] as FeedRow[],
};

export function makeSessions(): Session[] {
  return withProjects([
    {
      ...base,
      id: 'survey',
      title: 'Session stays Running after CLI exit',
      agent: 'claude',
      state: 'needs_input',
      activity: 'Wants to run rm -r packages/agents/claude/src/process-watcher.ts',
      updatedAt: '2m',
      mode: 'manual',
      model: 'opus-5',
      effort: 'High',
      branch: 'argo/session-running-fix',
      contextUsed: 0.42,
      feed: surveyFeed,
      changedFiles,
      subagents: [explore],
      plan: [
        { text: 'Survey the adapters', status: 'completed' },
        { text: 'Reproduce the bug in a test', status: 'completed' },
        { text: 'Fix the Session machine', status: 'completed' },
        { text: 'Remove the old process watcher', status: 'in_progress' },
        { text: 'Run the full check', status: 'pending' },
      ],
      request: {
        kind: 'permission',
        toolCallId: 't12',
        title: 'Allow Claude to run this command?',
        detail: 'rm -r packages/agents/claude/src/process-watcher.ts mocks/cli/claude/fixtures/watcher',
      },
    },
    {
      ...base,
      id: 'live',
      title: 'Refetch out-of-order Feed appends',
      agent: 'claude',
      state: 'running',
      unread: true,
      activity: 'Reading files',
      updatedAt: 'now',
      mode: 'accept-edits',
      model: 'opus-5',
      effort: 'Medium',
      branch: 'argo/feed-append-gap',
      feed: liveFeed,
      turnStartedAt: Date.now() - 41_000,
      subagents: liveSubagents,
      shells: liveShells,
      plan: [
        { text: 'Find the append path', status: 'completed' },
        { text: 'Refetch on a gap', status: 'in_progress' },
        { text: 'Run the Feed tests', status: 'pending' },
      ],
    },
    {
      ...base,
      id: 'ink',
      title: 'Session row status dots',
      agent: 'claude',
      state: 'needs_input',
      activity: 'Asked: Which ink?',
      updatedAt: '9m',
      mode: 'auto',
      model: 'sonnet-5',
      effort: 'Medium',
      branch: 'argo/row-dots',
      feed: [
        { type: 'user', id: 'iu1', text: 'Draw the status dots on the Session row.' },
        { type: 'tool', id: 'it1', kind: 'read', status: 'done', path: 'apps/client/src/sessions/session-row.tsx' },
        { type: 'tool', id: 'it2', kind: 'read', status: 'done', path: 'tooling/uniwind/theme.css' },
        { type: 'message', id: 'im1', text: 'The row has room for a dot under the Agent logo. Before I pick colours I need one decision from you.' },
      ],
      plan: [
        { text: 'Read the rail', status: 'completed' },
        { text: 'Draw the dots', status: 'in_progress' },
        { text: 'Count the running', status: 'pending' },
        { text: 'Check the ceiling', status: 'pending' },
      ],
      request: { kind: 'elicitation', question: 'Which ink?', options: ['Black — the house default', 'Blue'] },
    },
    {
      ...base,
      id: 'plan',
      title: 'Archive deletes the worktree',
      agent: 'codex',
      state: 'needs_input',
      activity: 'Proposed a plan',
      updatedAt: '14m',
      mode: 'plan',
      model: 'gpt-6-astra',
      effort: 'High',
      branch: 'argo/archive-worktree',
      feed: [
        { type: 'user', id: 'pu1', text: 'Plan how archiving a Session removes its worktree but keeps the branch.' },
        { type: 'tool', id: 'pt1', kind: 'execute', status: 'done', readOnly: true, command: 'rg -n "worktree remove" packages/git', exitCode: 0, output: ['packages/git/src/worktree.ts:52:  await git(["worktree", "remove", path])'] },
        { type: 'tool', id: 'pt2', kind: 'read', status: 'done', path: 'packages/git/src/worktree.ts' },
        { type: 'tool', id: 'pt3', kind: 'read', status: 'done', path: 'docs/adr/0008-a-session-owns-its-checkout.md' },
      ],
      request: {
        kind: 'plan',
        title: 'Archive a Session',
        steps: ['Check `git status --porcelain` in the Checkout and warn only on uncommitted files.', 'Archive at once and show a 3 second toast with Undo.', 'After the toast, run `git worktree remove` and keep the branch.', 'Make the archived Feed read-only.'],
      },
    },
    {
      ...base,
      id: 'codex',
      title: 'Run Codex check',
      agent: 'codex',
      state: 'failed',
      activity: 'Codex stopped: the app-server closed the connection',
      updatedAt: '1h',
      mode: 'approve-safely',
      model: 'gpt-6-astra',
      effort: 'Medium',
      branch: 'argo/codex-check',
      feed: codexFeed,
    },
    {
      ...base,
      id: 'trpc',
      title: 'tRPC vs plain HTTP',
      agent: 'claude',
      state: 'idle',
      unread: true,
      activity: 'Compared tRPC subscriptions with SSE',
      updatedAt: '2h',
      mode: 'manual',
      model: 'opus-5',
      effort: 'Medium',
      branch: 'main',
      checkout: 'main',
      feed: [
        { type: 'user', id: 'tu1', text: 'tRPC vs plain HTTP for the Server API?' },
        { type: 'message', id: 'tm1', text: 'Keep tRPC. The App already gets typed procedures and subscriptions from one router, and `wsLink` gives the Feed its stream without a second protocol.' },
      ],
    },
    {
      ...base,
      id: 'arch',
      title: 'Argo-universal project architecture',
      agent: 'claude',
      state: 'idle',
      activity: 'SendUserFile',
      updatedAt: '13h',
      mode: 'plan',
      model: 'opus-5',
      effort: 'Extra high',
      branch: 'argo/architecture',
      subagents: architectureSubagents,
      feed: [{ type: 'user', id: 'au1', text: 'Draw the project architecture.' }, { type: 'message', id: 'am1', text: 'Here is the architecture: one Expo app, an Electron shell, and a local Server.' }],
    },
    {
      ...base,
      id: 'onboarding',
      title: 'Implement #3116 onboarding text and empty states',
      agent: 'codex',
      state: 'idle',
      activity: 'Reviewing original issue scope',
      updatedAt: '3h',
      mode: 'approve-safely',
      model: 'gpt-6-sol',
      effort: 'Medium',
      branch: 'argo/onboarding',
      feed: [{ type: 'user', id: 'ou1', text: 'Implement #3116 onboarding text and empty states.' }],
    },
    {
      ...base,
      id: 'old',
      title: 'Argo Desktop daemon migration plan',
      agent: 'claude',
      state: 'idle',
      archived: true,
      activity: 'Wrote the migration plan',
      updatedAt: '19h',
      mode: 'plan',
      model: 'opus-5',
      effort: 'High',
      branch: 'argo/daemon-plan',
      feed: [{ type: 'user', id: 'ol1', text: 'Plan the daemon migration.' }, { type: 'message', id: 'olm', text: 'The plan is in `docs/plans/daemon.md`.' }],
    },
  ]);
}

export const PROJECTS: Project[] = [
  { name: 'argo-universal', path: '~/Developer/argo-universal', repository: { host: 'GitHub', slug: 'milad-alizadeh/argo-universal' }, tracker: { kind: 'linear', team: 'Argo Universal' } },
  { name: 'argo', path: '~/Developer/argo', repository: { host: 'GitHub', slug: 'milad-alizadeh/argo' }, tracker: { kind: 'github' } },
  { name: 'website', path: '~/Developer/website', repository: { host: 'GitLab', slug: 'milad/website' }, tracker: null },
];

// Folders the Server finds under ~/Developer, for Add Project.
export const FOLDERS: { name: string; path: string; git: boolean; repository: Project['repository'] }[] = [
  { name: 'bento', path: '~/Developer/bento', git: true, repository: { host: 'GitHub', slug: 'milad-alizadeh/bento' } },
  { name: 'bubblewap', path: '~/Developer/bubblewap', git: true, repository: null },
  { name: 'dotfiles', path: '~/Developer/dotfiles', git: true, repository: { host: 'GitHub', slug: 'milad-alizadeh/dotfiles' } },
  { name: 'notes', path: '~/Developer/notes', git: false, repository: null },
];

export const LINEAR_TEAMS = ['Argo Universal', 'Website', 'Mobile'];

const SESSION_PROJECT: Record<string, string> = { survey: 'argo-universal', live: 'argo-universal', ink: 'argo', plan: 'argo-universal', codex: 'website', trpc: 'argo-universal', arch: 'argo', onboarding: 'website', old: 'argo' };

function withProjects(sessions: Omit<Session, 'project'>[]): Session[] {
  return sessions.map((s) => ({ ...s, project: SESSION_PROJECT[s.id] ?? 'argo-universal' }));
}

export const ISSUES: Issue[] = [
  { id: 'AU-20', number: 'AU-20', project: 'argo-universal', title: 'Crash when pasting a large image', status: 'Triage', category: 'triage', body: 'Pasting a 12 MB screenshot into the composer crashes the iOS App.', sessionIds: [] },
  { id: 'AU-14', number: 'AU-14', project: 'argo-universal', title: 'Session stays Running after the CLI exits', status: 'In Progress', category: 'started', cycle: 12, milestone: 'Universal app', body: 'When the Claude CLI exits before a stop reason, the Session list keeps showing Running. The Session machine should fail the open Turn.', sessionIds: ['survey'] },
  { id: 'AU-15', number: 'AU-15', project: 'argo-universal', title: 'Refetch out-of-order Feed appends', status: 'In Progress', category: 'started', cycle: 12, milestone: 'Universal app', body: 'The App applies an append only if its offset equals the field length. On a gap it should refetch the row.', sessionIds: ['live'] },
  { id: 'AU-16', number: 'AU-16', project: 'argo-universal', title: 'Archive deletes the worktree', status: 'In Review', category: 'started', cycle: 12, body: 'Archive deletes the worktree and keeps the branch. Warn only when there are uncommitted files.', sessionIds: ['plan'] },
  { id: 'AU-17', number: 'AU-17', project: 'argo-universal', title: 'Spec 0003: universal Session UI', status: 'Todo', category: 'todo', cycle: 13, milestone: 'Universal app', body: 'Write the spec from the prototype findings.', sessionIds: [] },
  { id: 'AU-18', number: 'AU-18', project: 'argo-universal', title: 'Push a notification when a Session needs input', status: 'Backlog', category: 'backlog', milestone: 'Remote access', body: 'The phone should hear about Needs input while the App is closed.', sessionIds: [] },
  { id: 'AU-19', number: 'AU-19', project: 'argo-universal', title: 'Reach the Server away from home', status: 'Backlog', category: 'backlog', milestone: 'Remote access', body: 'Pick how a phone reaches the Server outside the local network.', sessionIds: [] },
  { id: 'AU-12', number: 'AU-12', project: 'argo-universal', title: 'Spec 0001: Electron launch', status: 'Done', category: 'done', cycle: 11, body: 'The Electron shell starts the Server and opens the App.', sessionIds: [] },
  { id: 'argo-3', number: '#3', project: 'argo', title: 'Session row status dots', status: 'Open', category: 'todo', milestone: 'v1.4', body: 'Pick the ink for the status dots in the Session row.', sessionIds: ['ink'] },
  { id: 'argo-5', number: '#5', project: 'argo', title: 'Clean up worktrees on archive', status: 'Open', category: 'todo', milestone: 'v1.4', body: 'Archived Sessions leave their worktrees behind.', sessionIds: [] },
  { id: 'argo-4', number: '#4', project: 'argo', title: 'Project architecture overview', status: 'Closed', category: 'done', body: 'Document how the Server, App and Electron shell fit together.', sessionIds: ['arch'] },
  { id: 'argo-2', number: '#2', project: 'argo', title: 'Port the old Feed renderer', status: 'Closed as not planned', category: 'cancelled', body: 'The universal app replaces it.', sessionIds: [] },
];

export const BRANCHES = ['main', 'argo/session-running-fix', 'argo/feed-append-gap', 'release/1.4', 'argo/row-dots', 'argo/archive-worktree', 'spec-0002-retry'];

const isOpen = (issue: Issue) => issue.category !== 'done' && issue.category !== 'cancelled';

// Each tracker Integration registers its own views; the UI draws whatever comes back. Only "All open" spans Projects.
export const ALL_OPEN: IssueView = { id: 'all', project: null, name: 'All open', match: isOpen };

export function viewsFor(project: Project): IssueView[] {
  const own = (match: (issue: Issue) => boolean) => (issue: Issue) => issue.project === project.name && match(issue);
  const milestones = [...new Set(ISSUES.filter((i) => i.project === project.name && i.milestone).map((i) => i.milestone!))];
  const milestoneViews = milestones.map((name) => ({ id: `${project.name}.m.${name}`, project: project.name, name, group: 'Milestones', match: own((i) => i.milestone === name) }));
  if (project.tracker?.kind === 'linear') {
    const cycles = [...new Set(ISSUES.filter((i) => i.project === project.name && i.cycle).map((i) => i.cycle!))].sort().slice(-2);
    return [
      { id: `${project.name}.triage`, project: project.name, name: 'Triage', match: own((i) => i.category === 'triage') },
      { id: `${project.name}.backlog`, project: project.name, name: 'Backlog', match: own((i) => i.category === 'backlog') },
      ...cycles.map((cycle, index) => ({ id: `${project.name}.c.${cycle}`, project: project.name, name: `Cycle ${cycle}`, group: 'Cycles', detail: index ? 'next' : 'current', match: own((i) => i.cycle === cycle) })),
      ...milestoneViews,
    ];
  }
  if (project.tracker?.kind === 'github') {
    return [
      { id: `${project.name}.open`, project: project.name, name: 'Open', match: own(isOpen) },
      { id: `${project.name}.closed`, project: project.name, name: 'Closed', match: own((i) => !isOpen(i)) },
      ...milestoneViews,
    ];
  }
  return [];
}
