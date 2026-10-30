import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { fixture, manifestFile, readManifest, run } from '../mocks/plugin-cli';

// Each test the command finds runs in a worker of its own, which a mounted page makes the slowest of them.
const workerTestLimitMs = 60_000;

it(
  'test runs a Plugin’s interaction test in its worker',
  async () => {
    const directory =
      await fixture(`import { Action, Screen, Text, useState } from '@argo/plugin-kit';

function Page() {
  const [tapped, setTapped] = useState(false);
  return (
    <Screen title="Tap" primaryAction={<Action key="tap" label="Tap me" icon="add" onPress={() => setTapped(true)} />}>
      <Text>{tapped ? 'Tapped' : 'Not tapped'}</Text>
    </Screen>
  );
}

export function register(argo) {
  argo.pages.register('/', Page);
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
    test('pressing Tap me', async ({ mount }) => {
      const page = await mount({ page: '/', surface: { platform: 'web' } });
      await page.find('Not tapped');
      await page.press('Tap me');
      assert.equal((await page.find('Tapped')).type, 'Text');
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
