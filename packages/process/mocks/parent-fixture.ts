import { fileURLToPath } from 'node:url';
import { startChild } from '../src/index';

/*
 * A parent for lifetime tests: starts the child fixture in this process's group, as the e2e own Server does,
 * and reports the child's pid with its descendant's, then runs until killed.
 */
const child = startChild(
  {
    label: 'Fixture',
    entry: fileURLToPath(new URL('child-fixture.mjs', import.meta.url)),
    args: ['serve'],
  },
  { messages: true, group: 'caller' },
);

child.onMessage((message): void => {
  process.send?.({ child: child.pid, message });
});
