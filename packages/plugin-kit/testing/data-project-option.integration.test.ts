import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { dataFixture } from '../mocks/data-fixture';

// A page with no Project of its own reads for the Projects it names (ADR-0037).
it('reads a Query for the Project it names, in that Project’s folder, as separate entries', async () => {
  const fixture =
    await dataFixture(`import {Text,Stack,useData} from '@argo/plugin-kit';
  export function register(argo) {
    argo.pages.register('/', () => {
      const one = useData({api:'process',action:'run',argv:['query-fixture']}, {projectId:'one'});
      const two = useData({api:'process',action:'run',argv:['query-fixture']}, {projectId:'two'});
      return <Stack direction="column"><Text>{'one:' + (one.data?.stdout ?? 'empty')}</Text><Text>{'two:' + (two.data?.stdout ?? 'empty')}</Text></Stack>;
    });
  }`);

  const one = join(fixture.directory, 'one');
  const two = join(fixture.directory, 'two');
  await mkdir(one);
  await mkdir(two);
  const kit = await fixture.start({ projectPaths: { one, two } });
  const page = kit.page();

  await expect
    .poll(() => JSON.stringify(page.trees.at(-1)), { timeout: 10_000 })
    .toMatch(/one:\d.*two:\d/s);
  expect(
    (await fixture.requests()).map((line) => JSON.parse(line).cwd).sort(),
  ).toEqual([one, two]);
});

it('refuses a Query for a Project that is not registered, and runs nothing', async () => {
  const fixture =
    await dataFixture(`import {Text,useData} from '@argo/plugin-kit';
  export function register(argo) {
    argo.pages.register('/', () => {
      const { data, error } = useData({api:'process',action:'run',argv:['query-fixture']}, {projectId:'missing'});
      return <Text>{error ?? (data ? 'ran' : 'empty')}</Text>;
    });
  }`);

  const kit = await fixture.start({ projectPaths: { one: fixture.directory } });

  await kit.page().find('Refused: Project is unavailable');
  expect(await fixture.requests()).toEqual([]);
});

it('refuses a fetch that names a Project that is not registered', async () => {
  const fixture =
    await dataFixture(`import {Text,useEffect,useState} from '@argo/plugin-kit';
  export function register(argo) {
    argo.pages.register('/', () => {
      const [answer, setAnswer] = useState('waiting');
      useEffect(() => {
        argo.fetch('https://api.github.com/user', { account: 'api.github.com', projectId: 'missing' }).then(
          () => setAnswer('sent'), (error) => setAnswer(error.message));
      }, []);
      return <Text>{answer}</Text>;
    });
  }`, {}, [{ kind: 'fetch', host: 'api.github.com', reason: 'Fixture' }]);

  const kit = await fixture.start({ projectPaths: { one: fixture.directory } });

  const page = kit.page();

  await expect
    .poll(() => JSON.stringify(page.trees.at(-1)), { timeout: 10_000 })
    .toContain('Project is unavailable');
});
