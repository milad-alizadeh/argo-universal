export const writerTurnCases = [
  {
    sessionId: 'session-1',
    expected: [
      { ids: ['session-1'], running: true, subagents: 0 },
      { ids: ['session-1'], running: false, subagents: 0 },
    ],
  },
  {
    sessionId: 'child-1',
    expected: [
      { ids: ['child-1', 'session-1'], running: false, subagents: 1 },
      { ids: ['child-1', 'session-1'], running: false, subagents: 0 },
    ],
  },
];
