import { writeFileSync } from 'node:fs';
import { mockClis } from '../mocks/cli/index.ts';

const title = Object.values(mockClis)
  .flatMap((cli): string[] =>
    cli.recordedTitle === null ? [] : [cli.recordedTitle()],
  )
  .at(0);
if (title === undefined) throw new Error('Missing recorded Agent title');
writeFileSync(
  new URL('../packages/api/mocks/session-title.json', import.meta.url),
  `${JSON.stringify({ title }, null, 2)}\n`,
);
