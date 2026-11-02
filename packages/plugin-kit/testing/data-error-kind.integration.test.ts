import { expect, it } from 'vitest';
import { dataFixture } from '../mocks/data-fixture';

const wait = { timeout: 10_000 };

// A page that shows why each read could not answer, as a signal and not the failure's words.
const kindsPage = `import { Stack, Text, useData } from '@argo/plugin-kit';
export function register(argo) {
  argo.pages.register('/', () => {
    const noAccount = useData({api:'fetch',url:'https://a.example/',method:'GET',account:'a.example'});
    const refused = useData({api:'fetch',url:'https://undeclared.example/',method:'GET'});
    const failed = useData({api:'fetch',url:'https://no-such-host.invalid/',method:'GET'});
    return <Stack direction="column">
      <Text>{'no-account:' + noAccount.errorKind}</Text>
      <Text>{'refused:' + refused.errorKind}</Text>
      <Text>{'failed:' + failed.errorKind}</Text>
    </Stack>;
  });
}`;

it('says why a read could not answer: no Account, refused, or failed', async () => {
  const fixture = await dataFixture(kindsPage, {}, [
    { kind: 'fetch', host: 'a.example', reason: 'A read.' },
    { kind: 'fetch', host: 'no-such-host.invalid', reason: 'A read.' },
  ]);

  const kit = await fixture.start({ projectPaths: { one: fixture.directory } });
  const page = kit.page('/', undefined, 'one');

  await expect
    .poll(() => JSON.stringify(page.trees.at(-1)), wait)
    .toMatch(/no-account:no-account.*refused:refused.*failed:failed/s);
}, 30_000);

it('lets `accounts.get` name a Project, and refuses one that is not registered', async () => {
  const fixture = await dataFixture(
    `import { Text, useEffect, useState } from '@argo/plugin-kit';
    export function register(argo) {
      argo.pages.register('/', () => {
        const [shown, show] = useState('waiting');
        useEffect(() => {
          argo.accounts.get('a.example', { projectId: 'missing' })
            .then(() => show('answered'), () => show('refused'));
        }, []);
        return <Text>{shown}</Text>;
      });
    }`,
  );

  const kit = await fixture.start({ projectPaths: { one: fixture.directory } });
  const page = kit.page('/', undefined, 'one');

  await expect.poll(() => page.findText('refused'), wait).toBeDefined();
}, 30_000);
