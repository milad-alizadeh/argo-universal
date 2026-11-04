import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { fixture, manifestFile, readManifest, run } from '../mocks/plugin-cli';

// Each test the command finds runs in a worker of its own, which a drawn page makes the slowest of them.
const workerTestLimitMs = 60_000;

it(
  'test runs a Plugin’s interaction test in its worker',
  async () => {
    const directory =
      await fixture(`import { Action, Screen, Text } from '@argo/plugin-kit';

export function register(argo) {
  argo.pages.define('/', {
    state: { tapped: false },
    load: () => null,
    render: (_data, to, { state }) => (
      <Screen title="Tap" primaryAction={<Action key="tap" label="Tap me" icon="add" onPress={to.set({ tapped: true })} />}>
        <Text>{state.tapped ? 'Tapped' : 'Not tapped'}</Text>
      </Screen>
    ),
  });
}
`);

    // The fixture draws one page of its own, so it keeps none of the example's contributions.
    await writeFile(
      join(directory, manifestFile),
      JSON.stringify({
        ...(await readManifest(directory)),
        contributes: { nav: [] },
      }),
    );

    await writeFile(
      join(directory, 'tap.test.ts'),
      `
    import assert from 'node:assert/strict';
    import { test } from '@argo/plugin-kit/testing';
    test('pressing Tap me', async ({ pages }) => {
      const page = await pages.open({ path: '/' });
      page.find('Not tapped');
      await page.press('Tap me');
      assert.equal(page.find('Tapped').type, 'Text');
    });
  `,
    );

    expect(await run('test', directory, workerTestLimitMs)).toMatchObject({
      code: 0,
      output: expect.stringContaining('PASS pressing Tap me'),
    });
  },
  workerTestLimitMs + 10_000,
);
