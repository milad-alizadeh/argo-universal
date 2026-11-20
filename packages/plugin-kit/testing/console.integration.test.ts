import { expect, it } from 'vitest';
import { dataFixture } from '../mocks/data-fixture';

it('redacts a Secret in console output and caps the size and rate of messages', async () => {
  const fixture = await dataFixture(
    `export function register(argo) {
      argo.operations.register('keep', async () => {
        const secret = 'stored-console-token';
        await argo.secrets.set('token', secret);
        console.log(secret.repeat(1000));
        console.info(await argo.secrets.get('token'));
        for (let i = 0; i < 100; i++) console.debug('burst');
      });
    }`,
    {
      operations: [
        {
          name: 'keep',
          label: 'Keep a Secret',
          description: 'Stores and reads the test Secret.',
          tier: 'act',
          policy: 'allow',
          params: {},
        },
      ],
    },
  );

  const kit = await fixture.start();

  await kit.operations.run({ name: 'keep' });

  const log = await kit.log();
  expect(log).toContain('console.info [secret]');
  expect(log).not.toContain('stored-console-token');
  expect(log.match(/console\.debug burst/g)?.length).toBe(19);
  expect(log).not.toContain('console.log');
});
