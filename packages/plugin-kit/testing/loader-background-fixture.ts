import type { PluginTest } from '@argo/plugin-kit/testing';
import type {
  Contributions,
  DataFixture,
} from '@repo/engine/mocks/data-fixture';
import { z } from 'zod';

export const completedLine = 'background pass completed';

/*
 * A background page (ADR-0050): its Loader runs the fixture for the Project it is given and sets a badge
 * from the answer; `extra` adds to the fixture's argv, so a test can ask it to hang.
 */
export const backgroundPage = (extra = '', timeout = ''): string => `
import { Text } from '@argo/plugin-kit';
export function register(argo) {
  argo.pages.define('/', {
    load: async ({ context: { projectId } }) => {
      const run = await argo.process.run(['query-fixture', projectId ?? 'none'${extra}]${timeout});
      await argo.nav.badge('inbox', Number(run.stdout));
      return run.stdout;
    },
    render: (count) => <Text>{count}</Text>,
  });
}`;

export const background = (interval = 300000): Contributions => ({
  nav: [{ id: 'inbox', title: 'Inbox', path: '/' }],
  background: { path: '/', interval },
});

export async function completed(kit: PluginTest): Promise<number> {
  return (await kit.log())
    .split('\n')
    .filter((line) => line.includes(completedLine)).length;
}

const Request = z.object({ args: z.array(z.string()) });

// The Project id each pass gave the fixture, in the order the passes ran.
export async function projectsAsked(fixture: DataFixture): Promise<unknown[]> {
  return (await fixture.requests()).map(
    (line) => Request.parse(JSON.parse(line)).args[0],
  );
}
