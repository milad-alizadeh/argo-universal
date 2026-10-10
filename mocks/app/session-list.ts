import type {
  AgentsListOutput,
  ProjectsListOutput,
  SessionInfo,
  SessionListOutput,
} from '@repo/contracts';

const exampleProjectPath = '/projects/example';

const activityAt = Date.parse('2026-10-05T12:00:00.000Z');

export const projectsList: ProjectsListOutput = [
  {
    id: 'project-1',
    name: 'Example Project',
    path: exampleProjectPath,
    createdAt: activityAt - 60_000,
    checkoutChoice: { type: 'worktree', baseBranch: 'main' },
  },
];

export const agentsList: AgentsListOutput = [
  {
    agent: 'agent-one',
    label: 'First Agent',
    availability: 'available',
    logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 94 94"><path d="M18.7657 62.4437L37.1822 52.1167L37.4857 51.2122L37.1822 50.7085H36.2715L33.1852 50.5208L22.6615 50.2391L13.5545 49.8636L4.70044 49.3942L2.47428 48.9248L0.399902 46.1553L0.602281 44.794L2.47428 43.5266L5.15579 43.7613L11.0754 44.1837L19.98 44.794L26.4055 45.1695L35.9679 46.1553H37.4857L37.6881 45.545L37.1822 45.1695L36.7774 44.794L27.5692 38.5508L17.6021 31.9791L12.3908 28.1769L9.60812 26.2524L8.19147 24.4686L7.58433 20.5256L10.1141 17.7091L13.5545 17.9438L14.4146 18.1785L17.9056 20.8542L25.343 26.6279L35.0572 33.7629L36.4739 34.9364L37.0443 34.5514L37.1316 34.2792L36.4739 33.1996L31.212 23.6706L25.596 13.9539L23.0663 9.91695L22.4086 7.52296C22.1538 6.51831 22.0038 5.68714 22.0038 4.65957L24.8877 0.716544L26.5067 0.200195L30.4025 0.716544L32.0215 2.12477L34.4501 7.66379L38.3458 16.3478L44.4172 28.1769L46.188 31.6975L47.1493 34.9364L47.5035 35.9222H48.1106V35.3589L48.6166 28.6933L49.5273 20.5256L50.438 10.0108L50.7415 7.05356L52.2088 3.48605L55.1433 1.56148L57.42 2.64112L59.292 5.31674L59.039 7.05356L57.926 14.2824L55.7504 25.5952L54.3337 33.1996H55.1433L56.1046 32.2138L59.9497 27.1442L66.3752 19.0704L69.2085 15.8784L72.5478 12.3579L74.6728 10.668H78.7203L81.6548 15.0804L80.3394 19.6337L76.1906 24.8911L72.7502 29.3504L67.8172 35.9595L64.7562 41.2734L65.0307 41.7118L65.7681 41.6489L76.8989 39.255L82.9197 38.1753L90.1041 36.9549L93.3422 38.457L93.6963 40.006L92.4315 43.151L84.7411 45.0287L75.7353 46.8594L62.3244 50.0164L62.1759 50.1358L62.3512 50.3958L68.399 50.9432L70.9794 51.084H77.3037L89.0922 51.9759L92.1785 53.9944L93.9999 56.4822L93.6963 58.4068L88.9404 60.8008L82.5655 59.2987L67.6401 55.7312L62.5301 54.4638H61.8217V54.8862L66.0717 59.064L73.9139 66.1051L83.6786 75.2116L84.1845 77.4648L82.9197 79.2485L81.6042 79.0608L73.0032 72.5829L69.6639 69.6726L62.1759 63.3356H61.67V63.9928L63.3902 66.5276L72.5478 80.2812L73.0032 84.5059L72.3454 85.8672L69.9675 86.7121L67.3871 86.2427L61.9735 78.6852L56.4587 70.2359L52.0064 62.6315L51.4687 62.971L48.8189 91.2654L47.6047 92.7206L44.7714 93.8002L42.3934 92.0164L41.1286 89.1061L42.3934 83.3324L43.9113 75.8219L45.1255 69.8604L46.2386 62.4437L46.9184 59.9661L46.8583 59.8003L46.3153 59.8916L40.7238 67.5603L32.2239 79.0608L25.4948 86.2427L23.8758 86.8999L21.0931 85.4447L21.3461 82.863L22.9145 80.5629L32.2239 68.7338L37.8399 61.3641L41.4594 57.1337L41.4242 56.5218L41.2244 56.5048L16.489 72.6299L12.0873 73.1932L10.1647 71.4094L10.4176 68.4991L11.3283 67.5603L18.7657 62.4437Z" fill="#D97757"/></svg>',
    configOptions: [],
  },
  {
    agent: 'agent-two',
    label: 'Second Agent',
    availability: 'available',
    logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="118.557 119.958 484.139 479.818"><path d="M304.246 294.611V249.028C304.246 245.189 305.687 242.309 309.044 240.392L400.692 187.612C413.167 180.415 428.042 177.058 443.394 177.058C500.971 177.058 537.44 221.682 537.44 269.182C537.44 272.54 537.44 276.379 536.959 280.218L441.954 224.558C436.197 221.201 430.437 221.201 424.68 224.558L304.246 294.611ZM518.245 472.145V363.224C518.245 356.505 515.364 351.707 509.608 348.349L389.174 278.296L428.519 255.743C431.877 253.826 434.757 253.826 438.115 255.743L529.762 308.523C556.154 323.879 573.905 356.505 573.905 388.171C573.905 424.636 552.315 458.225 518.245 472.141V472.145ZM275.937 376.182L236.592 353.152C233.235 351.235 231.794 348.354 231.794 344.515V238.956C231.794 187.617 271.139 148.749 324.4 148.749C344.555 148.749 363.264 155.468 379.102 167.463L284.578 222.164C278.822 225.521 275.942 230.319 275.942 237.039V376.186L275.937 376.182ZM360.626 425.122L304.246 393.455V326.283L360.626 294.616L417.002 326.283V393.455L360.626 425.122ZM396.852 570.989C376.698 570.989 357.989 564.27 342.151 552.276L436.674 497.574C442.431 494.217 445.311 489.419 445.311 482.699V343.552L485.138 366.582C488.495 368.499 489.936 371.379 489.936 375.219V480.778C489.936 532.117 450.109 570.985 396.852 570.985V570.989ZM283.134 463.99L191.486 411.211C165.094 395.854 147.343 363.229 147.343 331.562C147.343 294.616 169.415 261.509 203.48 247.593V356.991C203.48 363.71 206.361 368.508 212.117 371.866L332.074 441.437L292.729 463.99C289.372 465.907 286.491 465.907 283.134 463.99ZM277.859 542.68C223.639 542.68 183.813 501.895 183.813 451.514C183.813 447.675 184.294 443.836 184.771 439.997L279.295 494.698C285.051 498.056 290.812 498.056 296.568 494.698L417.002 425.127V470.71C417.002 474.549 415.562 477.429 412.204 479.346L320.557 532.126C308.081 539.323 293.206 542.68 277.854 542.68H277.859ZM396.852 599.776C454.911 599.776 503.37 558.513 514.41 503.812C568.149 489.896 602.696 439.515 602.696 388.176C602.696 354.587 588.303 321.962 562.392 298.45C564.791 288.373 566.231 278.296 566.231 268.224C566.231 199.611 510.571 148.267 446.274 148.267C433.322 148.267 420.846 150.184 408.37 154.505C386.775 133.392 357.026 119.958 324.4 119.958C266.342 119.958 217.883 161.22 206.843 215.921C153.104 229.837 118.557 280.218 118.557 331.557C118.557 365.146 132.95 397.771 158.861 421.283C156.462 431.36 155.022 441.437 155.022 451.51C155.022 520.123 210.682 571.466 274.978 571.466C287.931 571.466 300.407 569.549 312.883 565.228C334.473 586.341 364.222 599.776 396.852 599.776Z" fill="currentColor"/></svg>',
    configOptions: [],
  },
];

const baseSession: SessionInfo = {
  sessionId: 'session-idle',
  projectId: 'project-1',
  agent: 'agent-one',
  parentSessionId: null,
  cwd: exampleProjectPath,
  status: 'idle',
  title: 'Finished work',
  titleSource: 'agent',
  activity: 'The change is ready to review.',
  activityAt,
  checkout: { type: 'main', path: exampleProjectPath, branch: 'main' },
  plan: null,
  subagents: { running: 0, total: 0 },
  shells: { running: 0, total: 0 },
  archivedAt: null,
  issue: null,
  pullRequest: null,
  createdAt: activityAt - 60_000,
  updatedAt: activityAt,
};

export const sessionRows = {
  needsInput: {
    ...baseSession,
    sessionId: 'session-needs-input',
    status: 'needs_input',
    title: 'Review the proposed change',
    activity: 'Allow the command to run?',
  },
  running: {
    ...baseSession,
    sessionId: 'session-running',
    status: 'running',
    title: 'Build the settings screen',
    activity: 'Running the tests',
  },
  failed: {
    ...baseSession,
    sessionId: 'session-failed',
    status: 'failed',
    title: 'Fix the failing build',
    activity: 'The build failed.',
  },
  unread: {
    ...baseSession,
    sessionId: 'session-unread',
    status: 'unread',
    title: 'New results to review',
    activity: 'I found the cause of the failure.',
  },
  idle: baseSession,
  longTitle: {
    ...baseSession,
    sessionId: 'session-long-title',
    titleSource: 'prompt',
    title:
      'Investigate why the Session list stops receiving live updates after the phone reconnects and verify that every App catches up with the latest Feed activity',
  },
  withPlan: {
    ...baseSession,
    sessionId: 'session-plan',
    status: 'running',
    title: 'Implement the agreed Plan',
    plan: { done: 2, total: 5 },
    activity: 'Implementing the next step',
  },
  withSubagents: {
    ...baseSession,
    sessionId: 'session-subagents',
    status: 'running',
    title: 'Review with Subagents',
    subagents: { running: 2, total: 3 },
    activity: 'Waiting for the reviews',
  },
  withShells: {
    ...baseSession,
    sessionId: 'session-shells',
    status: 'running',
    title: 'Watch the development server',
    shells: { running: 1, total: 2 },
    activity: 'Checking the development server',
  },
  archived: {
    ...baseSession,
    sessionId: 'session-archived',
    titleSource: 'user',
    title: 'Archived work',
    archivedAt: activityAt,
    checkout: {
      type: 'worktree',
      path: '/checkouts/archived',
      branch: 'feature',
    },
    cwd: '/checkouts/archived',
  },
} satisfies Record<string, SessionInfo>;

// Each Agent has all row variations, so stories can check parity without naming vendors.
export const activeSessions: SessionListOutput = {
  sessions: agentsList.flatMap(({ agent }): SessionInfo[] =>
    Object.values(sessionRows)
      .filter((row): boolean => row.archivedAt === null)
      .map((row): typeof row => ({
        ...row,
        agent,
        sessionId: `${agent}:${row.sessionId}`,
      })),
  ),
  nextCursor: null,
};
export const archivedSessions: SessionListOutput = {
  sessions: [sessionRows.archived],
  nextCursor: null,
};
