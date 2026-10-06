import { writeFileSync } from 'node:fs';
import { mockClis } from '../mocks/cli/index.ts';

const title = Object.values(mockClis)
  .map((cli) => cli.recordedTitle?.())
  .find((title) => title !== undefined);
if (title === undefined) throw new Error('Missing recorded Agent title');
writeFileSync(
  new URL('../packages/api/mocks/session-title.json', import.meta.url),
  `${JSON.stringify({ title }, null, 2)}\n`,
);
