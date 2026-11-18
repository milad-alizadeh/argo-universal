import { sessionRows } from '@repo/mocks/app';
import { idleSession, type SessionRowFixture } from './session-row-fixtures';

// The Turn ended with Todos left and nothing running.
export const todosLeftSession = {
  logo: idleSession.logo,
  session: {
    ...sessionRows.idle,
    title: 'Trim the Feed recordings',
    activity: 'Stopped before the last two steps',
    plan: { done: 3, total: 5 },
  },
  age: '25m',
} satisfies SessionRowFixture;

// The Turn ended with Todos left while a Background Task still runs.
export const backgroundWorkSession = {
  logo: idleSession.logo,
  session: {
    ...todosLeftSession.session,
    title: 'Fix the complexity finding',
    activity: 'Waiting on pnpm verify',
    shells: { running: 1, total: 1 },
  },
  age: '1m',
} satisfies SessionRowFixture;
